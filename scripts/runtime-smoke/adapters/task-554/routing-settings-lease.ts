import { asc, inArray, sql } from "drizzle-orm";

import { db } from "../../../../core/db/client";
import { acquireNativeCmsWriterFence } from "../../../../core/db/nativeCmsWriterFence";
import { settings } from "../../../../core/db/schema";
import { invalidateSiteShellCachesForKeys } from "../../../../core/services/settings/settingsService";
import { SmokeError } from "../../contracts";

export const TASK554_ROUTING_SETTING_KEYS = Object.freeze([
  "site.adminPath",
  "site.adminBaseUrl",
  "site.publicBaseUrl",
] as const);

export type Task554RoutingSettingKey = (typeof TASK554_ROUTING_SETTING_KEYS)[number];

/**
 * PostgreSQL's canonical text forms stay private to the worker lease. They
 * preserve JSONB representation and timestamp microseconds across restoration.
 */
export type Task554RoutingSettingRecord = Readonly<{
  readonly key: Task554RoutingSettingKey;
  readonly updatedAt: string;
  readonly valueJson: string;
}>;

export type Task554RoutingSettingsOwnedRecord = Readonly<{
  readonly record: Task554RoutingSettingRecord;
  readonly version: string;
}>;

export type Task554RoutingSettingsSnapshot = Readonly<
  Record<Task554RoutingSettingKey, Task554RoutingSettingRecord | null>
>;

export type Task554RoutingSettingsLeaseState = Readonly<{
  readonly owned: Readonly<Record<Task554RoutingSettingKey, Task554RoutingSettingsOwnedRecord>>;
  readonly snapshot: Task554RoutingSettingsSnapshot;
}>;

export interface Task554RoutingSettingsPersistence {
  applyTargets(): Promise<Task554RoutingSettingsLeaseState>;
  invalidate(): void;
  restoreIfOwned(state: Task554RoutingSettingsLeaseState): Promise<void>;
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Task554RoutingSettingRow = Readonly<{
  readonly key: string;
  readonly updatedAt: string;
  readonly valueJson: string;
  readonly version?: string;
}>;

const TASK554_ROUTING_TARGETS: Readonly<Record<Task554RoutingSettingKey, string>> = Object.freeze({
  "site.adminPath": JSON.stringify("/admin"),
  "site.adminBaseUrl": "null",
  "site.publicBaseUrl": "null",
});

function isRoutingSettingKey(value: string): value is Task554RoutingSettingKey {
  return (TASK554_ROUTING_SETTING_KEYS as readonly string[]).includes(value);
}

function freezeRecord(input: Task554RoutingSettingRow): Task554RoutingSettingRecord {
  if (
    !isRoutingSettingKey(input.key) ||
    typeof input.valueJson !== "string" ||
    input.valueJson.length === 0 ||
    typeof input.updatedAt !== "string" ||
    input.updatedAt.length === 0
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-554 routing setting row is invalid");
  }
  return Object.freeze({
    key: input.key,
    updatedAt: input.updatedAt,
    valueJson: input.valueJson,
  });
}

function recordMatches(
  current: Task554RoutingSettingRecord | null,
  expected: Task554RoutingSettingRecord
): boolean {
  return (
    current !== null &&
    current.key === expected.key &&
    current.updatedAt === expected.updatedAt &&
    current.valueJson === expected.valueJson
  );
}

function ownedRecordMatches(
  current: Task554RoutingSettingsOwnedRecord | null,
  expected: Task554RoutingSettingsOwnedRecord
): boolean {
  return (
    current !== null &&
    current.version === expected.version &&
    recordMatches(current.record, expected.record)
  );
}

function snapshotMatches(
  current: Task554RoutingSettingsSnapshot,
  expected: Task554RoutingSettingsSnapshot
): boolean {
  return TASK554_ROUTING_SETTING_KEYS.every((key) => {
    const currentRecord = current[key];
    const expectedRecord = expected[key];
    return (
      (currentRecord === null && expectedRecord === null) ||
      (currentRecord !== null &&
        expectedRecord !== null &&
        recordMatches(currentRecord, expectedRecord))
    );
  });
}

function freezeSnapshot(rows: readonly Task554RoutingSettingRow[]): Task554RoutingSettingsSnapshot {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  if (byKey.size !== rows.length || rows.some((row) => !isRoutingSettingKey(row.key))) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-554 routing setting rows are invalid");
  }
  return Object.freeze(
    Object.fromEntries(
      TASK554_ROUTING_SETTING_KEYS.map((key) => {
        const row = byKey.get(key);
        return [key, row === undefined ? null : freezeRecord(row)];
      })
    ) as Record<Task554RoutingSettingKey, Task554RoutingSettingRecord | null>
  );
}

function requireCompleteOwnedRecords(
  rows: readonly Task554RoutingSettingRow[]
): Readonly<Record<Task554RoutingSettingKey, Task554RoutingSettingsOwnedRecord>> {
  const snapshot = freezeSnapshot(rows);
  const versions = new Map(rows.map((row) => [row.key, row.version]));
  if (
    TASK554_ROUTING_SETTING_KEYS.some(
      (key) => snapshot[key] === null || typeof versions.get(key) !== "string" || !versions.get(key)
    )
  ) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-554 routing targets are incomplete");
  }
  return Object.freeze(
    Object.fromEntries(
      TASK554_ROUTING_SETTING_KEYS.map(
        (key) =>
          [key, Object.freeze({ record: snapshot[key]!, version: versions.get(key)! })] as const
      )
    ) as Record<Task554RoutingSettingKey, Task554RoutingSettingsOwnedRecord>
  );
}

async function readRoutingSettingsForUpdate(
  tx: DbTransaction
): Promise<readonly Task554RoutingSettingRow[]> {
  return await tx
    .select({
      key: settings.key,
      updatedAt: sql<string>`${settings.updatedAt}::text`.as("updated_at"),
      valueJson: sql<string>`${settings.value}::text`.as("value_json"),
      version: sql<string>`xmin::text`.as("version"),
    })
    .from(settings)
    .where(inArray(settings.key, TASK554_ROUTING_SETTING_KEYS))
    .orderBy(asc(settings.key))
    .for("update");
}

async function lockRoutingSettingsTable(tx: DbTransaction): Promise<void> {
  await tx.execute(sql`LOCK TABLE ${settings} IN SHARE ROW EXCLUSIVE MODE`);
}

async function writeSnapshotRecords(
  tx: DbTransaction,
  records: readonly Task554RoutingSettingRecord[]
): Promise<void> {
  if (records.length === 0) return;
  await tx
    .insert(settings)
    .values(
      records.map((record) => ({
        key: record.key,
        updatedAt: sql`${record.updatedAt}::timestamp`,
        value: sql`${record.valueJson}::jsonb`,
      }))
    )
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        updatedAt: sql`excluded.updated_at`,
        value: sql`excluded.value`,
      },
    });
}

async function writeRoutingTargets(tx: DbTransaction): Promise<void> {
  await tx
    .insert(settings)
    .values(
      TASK554_ROUTING_SETTING_KEYS.map((key) => ({
        key,
        updatedAt: sql`clock_timestamp()`,
        value: sql`${TASK554_ROUTING_TARGETS[key]}::jsonb`,
      }))
    )
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        updatedAt: sql`excluded.updated_at`,
        value: sql`excluded.value`,
      },
    });
}

export class Task554DatabaseRoutingSettingsPersistence implements Task554RoutingSettingsPersistence {
  async applyTargets(): Promise<Task554RoutingSettingsLeaseState> {
    return await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await lockRoutingSettingsTable(tx);
        const snapshot = freezeSnapshot(await readRoutingSettingsForUpdate(tx));
        await writeRoutingTargets(tx);
        const owned = requireCompleteOwnedRecords(await readRoutingSettingsForUpdate(tx));
        return Object.freeze({ snapshot, owned });
      },
      { isolationLevel: "read committed" }
    );
  }

  invalidate(): void {
    invalidateSiteShellCachesForKeys(TASK554_ROUTING_SETTING_KEYS);
  }

  async restoreIfOwned(state: Task554RoutingSettingsLeaseState): Promise<void> {
    await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await lockRoutingSettingsTable(tx);
        const currentRows = await readRoutingSettingsForUpdate(tx);
        let currentOwned: Readonly<
          Record<Task554RoutingSettingKey, Task554RoutingSettingsOwnedRecord>
        >;
        try {
          currentOwned = requireCompleteOwnedRecords(currentRows);
        } catch {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-554 routing setting ownership drifted"
          );
        }
        if (
          TASK554_ROUTING_SETTING_KEYS.some(
            (key) => !ownedRecordMatches(currentOwned[key], state.owned[key])
          )
        ) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-554 routing setting ownership drifted"
          );
        }
        await writeSnapshotRecords(
          tx,
          TASK554_ROUTING_SETTING_KEYS.flatMap((key) => {
            const baseline = state.snapshot[key];
            return baseline === null ? [] : [baseline];
          })
        );
        const absentKeys = TASK554_ROUTING_SETTING_KEYS.filter(
          (key) => state.snapshot[key] === null
        );
        if (absentKeys.length > 0) {
          await tx.delete(settings).where(inArray(settings.key, absentKeys));
        }
        const restored = freezeSnapshot(await readRoutingSettingsForUpdate(tx));
        if (!snapshotMatches(restored, state.snapshot)) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-554 routing setting restoration proof failed"
          );
        }
      },
      { isolationLevel: "read committed" }
    );
  }
}

export class Task554RoutingSettingsLease {
  #active = false;
  #applyPromise: Promise<void> | null = null;
  #restored = false;
  #restorePromise: Promise<void> | null = null;
  #state: Task554RoutingSettingsLeaseState | null = null;

  constructor(private readonly persistence: Task554RoutingSettingsPersistence) {}

  get active(): boolean {
    return this.#active;
  }

  get restored(): boolean {
    return this.#restored;
  }

  get wasApplied(): boolean {
    return this.#state !== null;
  }

  async apply(): Promise<void> {
    if (this.#applyPromise !== null || this.#state !== null || this.#restored) {
      throw new SmokeError(
        "smoke_output_invalid",
        "TASK-554 routing settings lease cannot be replayed"
      );
    }
    this.#applyPromise = this.#applyOnce();
    await this.#applyPromise;
  }

  async #applyOnce(): Promise<void> {
    this.#state = await this.persistence.applyTargets();
    this.#active = true;
    this.persistence.invalidate();
  }

  async restore(): Promise<void> {
    if (this.#applyPromise !== null) {
      try {
        await this.#applyPromise;
      } catch {
        if (!this.#active) return;
      }
    }
    if (!this.#active) {
      if (this.#restorePromise !== null) await this.#restorePromise;
      return;
    }
    this.#restorePromise ??= this.#restoreOnce();
    await this.#restorePromise;
  }

  async #restoreOnce(): Promise<void> {
    const state = this.#state;
    if (state === null) {
      throw new SmokeError("smoke_cleanup_failed", "TASK-554 routing settings lease is absent");
    }
    await this.persistence.restoreIfOwned(state);
    this.#active = false;
    this.#restored = true;
    this.persistence.invalidate();
  }
}
