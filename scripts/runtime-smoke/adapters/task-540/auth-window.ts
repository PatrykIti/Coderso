import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { assertExactKeys, isPlainObject } from "../../contracts";
import {
  WorkerProtocolError,
  type PlainJsonObject,
  type PlainJsonValue,
  type WorkerOperationDefinition,
  type WorkerOperationDescriptor,
} from "../../workers/contracts";

const SECURITY_SETTINGS_KEY = "security.settings";
const FAST_WINDOW_SECONDS = 5;
const MINIMUM_AUTH_REQUESTS = 10;

export const TASK540_AUTH_PREPARE_DESCRIPTOR: WorkerOperationDescriptor = Object.freeze({
  operationId: "task-540/auth-window/prepare-fast",
  profileId: "database",
  inputSchemaId: "empty-input-v1",
  outputSchemaId: "task-540-auth-prepare-v1",
  sourceSha256: createHash("sha256").update("task-540/auth-window/prepare-fast/v1").digest("hex"),
  retryClass: "mutation",
  maxInputBytes: 4_096,
  maxOutputBytes: 4_096,
});

export const TASK540_AUTH_RESTORE_DESCRIPTOR: WorkerOperationDescriptor = Object.freeze({
  operationId: "task-540/auth-window/restore",
  profileId: "database",
  inputSchemaId: "empty-input-v1",
  outputSchemaId: "task-540-auth-restore-v1",
  sourceSha256: createHash("sha256").update("task-540/auth-window/restore/v1").digest("hex"),
  retryClass: "mutation",
  maxInputBytes: 4_096,
  maxOutputBytes: 4_096,
});

interface SettingsSnapshot {
  readonly exists: boolean;
  readonly value: unknown;
  readonly updatedAt: Date | null;
}

interface DatabaseModules {
  readonly db: typeof import("../../../../core/db/client").db;
  readonly settings: typeof import("../../../../core/db/schema").settings;
  readonly getSecuritySettings: typeof import("../../../../core/services/settings/securitySettings").getSecuritySettings;
  readonly resetSecuritySettingsCache: typeof import("../../../../core/services/settings/securitySettings").resetSecuritySettingsCache;
  readonly setSecuritySettings: typeof import("../../../../core/services/settings/securitySettings").setSecuritySettings;
}

function emptyInput(value: unknown): PlainJsonObject {
  if (!isPlainObject(value)) throw new WorkerProtocolError("auth window input is invalid");
  assertExactKeys(value, [], "auth window input");
  return value as PlainJsonObject;
}

function prepareOutput(value: unknown): PlainJsonValue {
  if (!isPlainObject(value)) throw new WorkerProtocolError("auth window output is invalid");
  assertExactKeys(value, ["prepared", "windowSeconds", "priorRowPresent"], "auth window output");
  if (
    value.prepared !== true ||
    value.windowSeconds !== FAST_WINDOW_SECONDS ||
    typeof value.priorRowPresent !== "boolean"
  ) {
    throw new WorkerProtocolError("auth window prepare proof drifted");
  }
  return value as PlainJsonValue;
}

function restoreOutput(value: unknown): PlainJsonValue {
  if (!isPlainObject(value)) throw new WorkerProtocolError("auth restore output is invalid");
  assertExactKeys(value, ["restored"], "auth restore output");
  if (value.restored !== true) throw new WorkerProtocolError("auth window restore proof drifted");
  return value as PlainJsonValue;
}

async function loadDatabaseModules(): Promise<DatabaseModules> {
  const [clientModule, schemaModule, settingsModule] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
    import("../../../../core/services/settings/securitySettings"),
  ]);
  return {
    db: clientModule.db,
    settings: schemaModule.settings,
    getSecuritySettings: settingsModule.getSecuritySettings,
    resetSecuritySettingsCache: settingsModule.resetSecuritySettingsCache,
    setSecuritySettings: settingsModule.setSecuritySettings,
  };
}

export class Task540AuthWindowController {
  #modules: DatabaseModules | null = null;
  #snapshot: SettingsSnapshot | null = null;
  #prepared = false;
  #restored = false;

  definitions(): readonly WorkerOperationDefinition[] {
    return Object.freeze([
      {
        ...TASK540_AUTH_PREPARE_DESCRIPTOR,
        validateInput: emptyInput,
        validateOutput: prepareOutput,
        execute: () => this.prepareFast(),
      },
      {
        ...TASK540_AUTH_RESTORE_DESCRIPTOR,
        validateInput: emptyInput,
        validateOutput: restoreOutput,
        execute: () => this.restore(),
      },
    ]);
  }

  isRestored(): boolean {
    return this.#snapshot === null || this.#restored;
  }

  async prepareFast(): Promise<PlainJsonValue> {
    if (this.#prepared || this.#snapshot !== null) {
      throw new WorkerProtocolError("auth window was prepared more than once");
    }
    const modules = await this.#databaseModules();
    const rows = await modules.db
      .select({ value: modules.settings.value, updatedAt: modules.settings.updatedAt })
      .from(modules.settings)
      .where(eq(modules.settings.key, SECURITY_SETTINGS_KEY))
      .limit(2);
    if (rows.length > 1) throw new WorkerProtocolError("auth settings cardinality drifted");
    const row = rows[0];
    this.#snapshot = Object.freeze({
      exists: row !== undefined,
      value: row?.value ?? null,
      updatedAt: row?.updatedAt ?? null,
    });
    modules.resetSecuritySettingsCache();
    const current = await modules.getSecuritySettings();
    const auth = current.rateLimit.buckets.auth;
    if (!current.rateLimit.enabled || auth.maxRequests < MINIMUM_AUTH_REQUESTS) {
      throw new WorkerProtocolError("auth settings are outside the TASK-540 contract");
    }
    this.#prepared = true;
    try {
      await modules.setSecuritySettings({
        rateLimit: { buckets: { auth: { windowSeconds: FAST_WINDOW_SECONDS } } },
      });
      modules.resetSecuritySettingsCache();
      const after = await modules.getSecuritySettings();
      if (after.rateLimit.buckets.auth.windowSeconds !== FAST_WINDOW_SECONDS) {
        throw new WorkerProtocolError("fast auth window did not persist");
      }
    } catch (error) {
      try {
        await this.restore();
      } catch {
        throw new WorkerProtocolError("fast auth window failed and could not restore", {
          cause: error,
        });
      }
      throw error;
    }
    return Object.freeze({
      prepared: true,
      windowSeconds: FAST_WINDOW_SECONDS,
      priorRowPresent: this.#snapshot.exists,
    });
  }

  async restore(): Promise<PlainJsonValue> {
    if (!this.#prepared || this.#snapshot === null || this.#restored) {
      throw new WorkerProtocolError("auth window restore authority is absent");
    }
    const modules = await this.#databaseModules();
    const snapshot = this.#snapshot;
    await modules.db.transaction(async (transaction) => {
      if (!snapshot.exists) {
        await transaction
          .delete(modules.settings)
          .where(eq(modules.settings.key, SECURITY_SETTINGS_KEY));
        return;
      }
      if (snapshot.updatedAt === null) {
        throw new WorkerProtocolError("auth settings timestamp is absent");
      }
      await transaction
        .insert(modules.settings)
        .values({
          key: SECURITY_SETTINGS_KEY,
          value: snapshot.value,
          updatedAt: snapshot.updatedAt,
        })
        .onConflictDoUpdate({
          target: modules.settings.key,
          set: { value: snapshot.value, updatedAt: snapshot.updatedAt },
        });
    });
    modules.resetSecuritySettingsCache();
    const restoredRows = await modules.db
      .select({ value: modules.settings.value, updatedAt: modules.settings.updatedAt })
      .from(modules.settings)
      .where(eq(modules.settings.key, SECURITY_SETTINGS_KEY))
      .limit(2);
    const exact = snapshot.exists
      ? restoredRows.length === 1 &&
        JSON.stringify(restoredRows[0]?.value) === JSON.stringify(snapshot.value) &&
        restoredRows[0]?.updatedAt.getTime() === snapshot.updatedAt?.getTime()
      : restoredRows.length === 0;
    if (!exact) throw new WorkerProtocolError("auth settings exact restore failed");
    this.#restored = true;
    return Object.freeze({ restored: true });
  }

  async closeDatabaseIfOwned(): Promise<void> {
    if (this.#modules === null) return;
    await this.#modules.db.$client.end({ timeout: 5 });
  }

  async #databaseModules(): Promise<DatabaseModules> {
    this.#modules ??= await loadDatabaseModules();
    return this.#modules;
  }
}
