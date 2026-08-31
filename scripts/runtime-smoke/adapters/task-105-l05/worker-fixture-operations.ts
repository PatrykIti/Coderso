import { eq, inArray, sql } from "drizzle-orm";

import { SmokeError, assertExactKeys } from "../../contracts";
import type {
  PlainJsonObject,
  PlainJsonValue,
  WorkerOperationContext,
  WorkerOperationDefinition,
  WorkerOperationDescriptor,
} from "../../workers/contracts";
import { writeAdminSessionStorageState } from "../../browser/admin-auth";
import type { Task105L05SettingRowIdentity } from "./settings-lease";
import { TASK105_L05_LEASED_SETTING_KEYS } from "./settings-lease";
import {
  applyTask105L05Settings,
  beginTask105L05SiteShellClaim,
  claimTask105L05SiteShell,
  initializeTask105L05RecoveryReceipt,
  restoreTask105L05Settings,
  transitionTask105L05RecoveryReceipt,
} from "./recovery-db";
import {
  validateTask105L05RecoveryAuthority,
  type Task105L05ReceiptPhase,
  type Task105L05RecoveryAuthority,
} from "./recovery-receipt";
import {
  TASK105_L05_CANONICAL_PERMISSIONS,
  createTask105L05Fixture,
  task105L05RoleName,
  task105L05UserEmail,
  type FixtureRoleIdentity,
  type Task105L05FixturePage,
} from "./fixture";

/**
 * Worker-local fixture and settings handlers. The registry module supplies the
 * closed descriptors, keeping this DB-bearing implementation below the module
 * size limit and preventing private fixture records from crossing the frame.
 */

export interface Task105L05FixtureWorkerDescriptors {
  readonly install: WorkerOperationDescriptor;
  readonly settingsApply: WorkerOperationDescriptor;
  readonly settingsRestore: WorkerOperationDescriptor;
}

type DbTransaction = Parameters<
  Parameters<typeof import("../../../../core/db/client").db.transaction>[0]
>[0];

interface Task105L05CoreHandles {
  readonly db: typeof import("../../../../core/db/client").db;
  readonly acquireNativeCmsWriterFence: (tx: DbTransaction) => Promise<void>;
  readonly settings: typeof import("../../../../core/db/schema").settings;
}

async function task105L05Core(): Promise<Task105L05CoreHandles> {
  const [{ db }, { acquireNativeCmsWriterFence }, schema] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/nativeCmsWriterFence"),
    import("../../../../core/db/schema"),
  ]);
  return Object.freeze({ db, acquireNativeCmsWriterFence, settings: schema.settings });
}

function plainObject(value: unknown, label: string): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new SmokeError("smoke_output_invalid", `${label} is not a plain object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
  label: string,
  maximum = 4096
): string {
  const value = record[key];
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum ||
    value.includes("\0")
  ) {
    throw new SmokeError("smoke_output_invalid", `${label}.${key} is invalid`);
  }
  return value;
}

function lockSettingsTable(core: Task105L05CoreHandles, tx: DbTransaction): Promise<unknown> {
  return tx.execute(sql`LOCK TABLE ${core.settings} IN SHARE ROW EXCLUSIVE MODE`);
}

function readOwnedRows(
  core: Task105L05CoreHandles,
  tx: DbTransaction,
  keys: readonly string[]
): Promise<ReadonlyMap<string, Task105L05SettingRowIdentity>> {
  return tx
    .select({
      key: core.settings.key,
      updatedAt: sql<string>`${core.settings.updatedAt}::text`.as("updated_at"),
      valueJson: sql<string>`${core.settings.value}::text`.as("value_json"),
      xmin: sql<string>`xmin::text`.as("xmin"),
    })
    .from(core.settings)
    .where(inArray(core.settings.key, keys))
    .for("update")
    .then((rows) => {
      const output = new Map<string, Task105L05SettingRowIdentity>();
      for (const row of rows) {
        if (typeof row.key !== "string" || !keys.includes(row.key)) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 settings row is invalid");
        }
        output.set(
          row.key,
          Object.freeze({
            key: row.key,
            valueJson: row.valueJson,
            updatedAt: row.updatedAt,
            xmin: row.xmin,
          })
        );
      }
      return output;
    });
}

/** Reads current raw identities for legacy unit-only lease seams. */
export async function listRuntimeSmokeSettingRows(
  keys: readonly string[]
): Promise<ReadonlyMap<string, Task105L05SettingRowIdentity>> {
  if (keys.length === 0) return new Map();
  const core = await task105L05Core();
  return core.db.transaction(async (tx) => {
    await core.acquireNativeCmsWriterFence(tx);
    await lockSettingsTable(core, tx);
    return readOwnedRows(core, tx, keys);
  });
}

/** Writes one raw JSON value behind the native writer fence for legacy unit seams. */
export async function writeRuntimeSmokeSettingRow(
  key: string,
  valueJson: string
): Promise<Task105L05SettingRowIdentity> {
  if (
    typeof key !== "string" ||
    key.length === 0 ||
    typeof valueJson !== "string" ||
    valueJson.length === 0
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 settings write input is invalid");
  }
  let value: unknown;
  try {
    value = JSON.parse(valueJson) as unknown;
  } catch {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 settings value is invalid JSON");
  }
  const core = await task105L05Core();
  return core.db.transaction(async (tx) => {
    await core.acquireNativeCmsWriterFence(tx);
    await lockSettingsTable(core, tx);
    await tx
      .insert(core.settings)
      .values({ key, updatedAt: sql`clock_timestamp()`, value })
      .onConflictDoUpdate({
        target: core.settings.key,
        set: { updatedAt: sql`clock_timestamp()`, value },
      });
    const row = (await readOwnedRows(core, tx, [key])).get(key);
    if (row === undefined)
      throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 settings write did not persist");
    return row;
  });
}

/** Deletes an absent-baseline row only after an exact identity comparison. */
export async function deleteRuntimeSmokeSettingRow(input: {
  readonly key: string;
  readonly expected: Task105L05SettingRowIdentity;
}): Promise<void> {
  const core = await task105L05Core();
  await core.db.transaction(async (tx) => {
    await core.acquireNativeCmsWriterFence(tx);
    await lockSettingsTable(core, tx);
    const actual = (await readOwnedRows(core, tx, [input.key])).get(input.key);
    if (
      actual === undefined ||
      actual.key !== input.expected.key ||
      actual.valueJson !== input.expected.valueJson ||
      actual.updatedAt !== input.expected.updatedAt ||
      actual.xmin !== input.expected.xmin
    ) {
      throw new SmokeError(
        "smoke_cleanup_failed",
        "TASK-105 L05 settings deletion ownership drifted"
      );
    }
    await tx.delete(core.settings).where(eq(core.settings.key, input.key));
  });
}

export interface Task105L05InstallInput extends PlainJsonObject {
  readonly authority: Task105L05RecoveryAuthority;
  readonly session: string;
  readonly workspacePath: string;
  readonly storageStatePath: string;
  readonly adminBase: string;
  readonly expectedAdminPath: string;
}

export function validateTask105L05InstallInput(value: unknown): Task105L05InstallInput {
  const record = plainObject(value, "TASK-105 L05 install input");
  assertExactKeys(
    record,
    ["authority", "session", "workspacePath", "storageStatePath", "adminBase", "expectedAdminPath"],
    "TASK-105 L05 install input"
  );
  const authority = validateTask105L05RecoveryAuthority(record.authority);
  const session = requiredString(record, "session", "TASK-105 L05 install input", 48);
  const workspacePath = requiredString(record, "workspacePath", "TASK-105 L05 install input");
  const storageStatePath = requiredString(record, "storageStatePath", "TASK-105 L05 install input");
  const adminBase = requiredString(record, "adminBase", "TASK-105 L05 install input", 128);
  const expectedAdminPath = requiredString(
    record,
    "expectedAdminPath",
    "TASK-105 L05 install input",
    128
  );
  if (
    session !== authority.session ||
    !/^[a-z0-9][a-z0-9_-]{2,47}$/u.test(session) ||
    adminBase !== expectedAdminPath ||
    adminBase !== `/${session}-admin`
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 install authority is invalid");
  }
  return Object.freeze({
    authority,
    session,
    workspacePath,
    storageStatePath,
    adminBase,
    expectedAdminPath,
  });
}

/** Browser-safe fixture facts. Session token and hash are private receipt-only data. */
export interface Task105L05InstallOutput extends PlainJsonObject {
  readonly roleId: string;
  readonly userId: string;
  readonly permissions: readonly string[];
  readonly userRoleLink: { readonly userId: string; readonly roleId: string };
  readonly fixturePage: {
    readonly id: string;
    readonly title: string;
    readonly slug: string;
    readonly relativePath: string;
  };
  readonly storageStatePath: string;
}

export function validateTask105L05InstallOutput(value: unknown): Task105L05InstallOutput {
  const record = plainObject(value, "TASK-105 L05 install output");
  assertExactKeys(
    record,
    ["roleId", "userId", "permissions", "userRoleLink", "fixturePage", "storageStatePath"],
    "TASK-105 L05 install output"
  );
  const roleId = requiredString(record, "roleId", "TASK-105 L05 install output");
  const userId = requiredString(record, "userId", "TASK-105 L05 install output");
  const storageStatePath = requiredString(
    record,
    "storageStatePath",
    "TASK-105 L05 install output"
  );
  const permissions = record.permissions;
  if (
    !Array.isArray(permissions) ||
    permissions.length !== TASK105_L05_CANONICAL_PERMISSIONS.length ||
    permissions.some((permission, index) => permission !== TASK105_L05_CANONICAL_PERMISSIONS[index])
  ) {
    throw new SmokeError(
      "smoke_output_invalid",
      "TASK-105 L05 install output permissions are invalid"
    );
  }
  const link = plainObject(record.userRoleLink, "TASK-105 L05 install output link");
  assertExactKeys(link, ["userId", "roleId"], "TASK-105 L05 install output link");
  if (link.userId !== userId || link.roleId !== roleId) {
    throw new SmokeError(
      "smoke_output_invalid",
      "TASK-105 L05 install output link identity drifted"
    );
  }
  const page = plainObject(record.fixturePage, "TASK-105 L05 install fixture page");
  assertExactKeys(
    page,
    ["id", "title", "slug", "relativePath"],
    "TASK-105 L05 install fixture page"
  );
  const pageId = requiredString(page, "id", "TASK-105 L05 install fixture page");
  const title = requiredString(page, "title", "TASK-105 L05 install fixture page");
  const slug = requiredString(page, "slug", "TASK-105 L05 install fixture page");
  const relativePath = requiredString(page, "relativePath", "TASK-105 L05 install fixture page");
  const session = title.replace(/^TASK-105 L05 homepage /u, "");
  if (
    !/^[a-z0-9][a-z0-9_-]{2,47}$/u.test(session) ||
    title !== `TASK-105 L05 homepage ${session}` ||
    slug !== `task-105-l05-${session}-home` ||
    relativePath !== `/${slug}` ||
    relativePath.includes("?") ||
    relativePath.includes("#") ||
    pageId === roleId ||
    pageId === userId ||
    roleId === userId
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 install output identity is invalid");
  }
  return Object.freeze({
    roleId,
    userId,
    permissions: Object.freeze([...permissions]) as readonly string[],
    userRoleLink: Object.freeze({ userId, roleId }),
    fixturePage: Object.freeze({ id: pageId, title, slug, relativePath }),
    storageStatePath,
  });
}

async function proveFixtureAbsent(input: {
  readonly roleName: string;
  readonly email: string;
}): Promise<void> {
  const [{ db }, schema, { hashEmail }] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/schema"),
    import("../../../../core/services/security/piiEmail"),
  ]);
  const emailHash = hashEmail(input.email);
  const [roleHit, userHit] = await Promise.all([
    db
      .select({ marker: sql<number>`1` })
      .from(schema.roles)
      .where(eq(schema.roles.name, input.roleName))
      .limit(1),
    db
      .select({ marker: sql<number>`1` })
      .from(schema.users)
      .where(eq(schema.users.emailHash, emailHash))
      .limit(1),
  ]);
  if (roleHit.length > 0 || userHit.length > 0) {
    throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 fixture identity is not absent");
  }
}

async function createPublishedHomepage(input: {
  readonly session: string;
  readonly userId: string;
}): Promise<Task105L05FixturePage> {
  const pages = await import("../../../../core/services/pages/pageService");
  const slug = `task-105-l05-${input.session}-home`;
  const title = `TASK-105 L05 homepage ${input.session}`;
  const created = await pages.createPage({
    title,
    slug,
    data: { schemaVersion: 2, sections: [] },
    authorId: input.userId,
  });
  if (!created?.id)
    throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 homepage creation failed");
  const published = await pages.publishPage(created.id, input.userId);
  if (!published?.id)
    throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 homepage publish failed");
  return Object.freeze({ id: published.id, title, slug, relativePath: `/${slug}` });
}

async function transitionFixtureCheckpoint(input: {
  readonly authority: Task105L05RecoveryAuthority;
  readonly receipt: { phase: Task105L05ReceiptPhase; version: number };
  readonly nextPhase: Task105L05ReceiptPhase;
  readonly fixture: Readonly<Record<string, string>>;
}): Promise<Awaited<ReturnType<typeof transitionTask105L05RecoveryReceipt>>> {
  return transitionTask105L05RecoveryReceipt({
    authority: input.authority,
    expectedPhase: input.receipt.phase,
    expectedVersion: input.receipt.version,
    nextPhase: input.nextPhase,
    patch: Object.freeze({ fixture: Object.freeze({ ...input.fixture }) }),
  });
}

export async function executeTask105L05Install(
  input: Task105L05InstallInput
): Promise<Task105L05InstallOutput> {
  const authority = validateTask105L05RecoveryAuthority(input.authority);
  let receipt = await initializeTask105L05RecoveryReceipt({ authority });
  const tokenCapture: { token: string | null } = { token: null };
  try {
    const result = await createTask105L05Fixture({
      session: input.session,
      deps: {
        assertAbsent: proveFixtureAbsent,
        onRoleCreated: async (role: FixtureRoleIdentity) => {
          receipt = await transitionFixtureCheckpoint({
            authority,
            receipt,
            nextPhase: "fixture-installing",
            fixture: {
              roleId: role.roleId,
              roleDescription: role.roleDescription,
              roleXmin: role.roleXmin,
            },
          });
        },
        onUserCreated: async (userId) => {
          receipt = await transitionFixtureCheckpoint({
            authority,
            receipt,
            nextPhase: "fixture-installing",
            fixture: { userId },
          });
        },
        onSessionCreated: async ({ sessionId, tokenHash }) => {
          receipt = await transitionFixtureCheckpoint({
            authority,
            receipt,
            nextPhase: "fixture-installing",
            fixture: { sessionId, tokenHash },
          });
        },
        onPageCreated: async (fixturePageId) => {
          receipt = await transitionFixtureCheckpoint({
            authority,
            receipt,
            nextPhase: "fixture-installed",
            fixture: { fixturePageId },
          });
        },
        createSessionForUser: async (sessionInput) => {
          const sessions = await import("../../../../core/services/auth/sessionService");
          const created = await sessions.createSession(sessionInput);
          tokenCapture.token = created.token;
          return Object.freeze({
            sessionId: created.session.id,
            tokenHash: sessions.hashSessionToken(created.token),
          });
        },
        createPublishedPage: createPublishedHomepage,
      },
    });
    const sessionToken = tokenCapture.token;
    if (typeof sessionToken !== "string" || sessionToken.length === 0) {
      throw new SmokeError(
        "smoke_cleanup_failed",
        "TASK-105 L05 fixture session creation did not complete"
      );
    }
    await writeAdminSessionStorageState({
      adminUrl: `http://127.0.0.1:5173${input.adminBase}`,
      expectedAdminPath: input.expectedAdminPath,
      workspace: input.workspacePath,
      storageStatePath: input.storageStatePath,
      sessionValue: sessionToken,
    });
    return validateTask105L05InstallOutput({
      roleId: result.facts.roleId,
      userId: result.facts.userId,
      permissions: [...result.facts.permissions],
      userRoleLink: { ...result.facts.userRoleLink },
      fixturePage: { ...result.fixturePage },
      storageStatePath: input.storageStatePath,
    });
  } finally {
    // The token has either been written directly to the no-follow private
    // storage state or the operation failed. It never enters a worker result.
    tokenCapture.token = null;
  }
}

type Task105L05SettingsApplyInput =
  | (Readonly<{
      readonly authority: Task105L05RecoveryAuthority;
      readonly operation: "apply";
      readonly rows: readonly Readonly<{ readonly key: string; readonly valueJson: string }>[];
    }> &
      PlainJsonObject)
  | (Readonly<{
      readonly authority: Task105L05RecoveryAuthority;
      readonly operation: "site-shell-intent";
    }> &
      PlainJsonObject)
  | (Readonly<{
      readonly authority: Task105L05RecoveryAuthority;
      readonly operation: "site-shell-claim";
      readonly navigationMenuId: string;
    }> &
      PlainJsonObject);

export function validateTask105L05SettingsApplyInput(value: unknown): Task105L05SettingsApplyInput {
  const record = plainObject(value, "TASK-105 L05 settings apply input");
  const operation = record.operation;
  if (operation === "apply") {
    assertExactKeys(
      record,
      ["authority", "operation", "rows"],
      "TASK-105 L05 settings apply input"
    );
    const authority = validateTask105L05RecoveryAuthority(record.authority);
    if (!Array.isArray(record.rows))
      throw new SmokeError("smoke_output_invalid", "TASK-105 L05 settings apply rows are invalid");
    const rows = record.rows.map((raw) => {
      const row = plainObject(raw, "TASK-105 L05 settings apply row");
      assertExactKeys(row, ["key", "valueJson"], "TASK-105 L05 settings apply row");
      return Object.freeze({
        key: requiredString(row, "key", "TASK-105 L05 settings apply row", 128),
        valueJson: requiredString(row, "valueJson", "TASK-105 L05 settings apply row", 32 * 1024),
      });
    });
    return Object.freeze({ authority, operation, rows: Object.freeze(rows) });
  }
  if (operation === "site-shell-intent") {
    assertExactKeys(record, ["authority", "operation"], "TASK-105 L05 settings intent input");
    return Object.freeze({
      authority: validateTask105L05RecoveryAuthority(record.authority),
      operation,
    });
  }
  if (operation === "site-shell-claim") {
    assertExactKeys(
      record,
      ["authority", "operation", "navigationMenuId"],
      "TASK-105 L05 settings claim input"
    );
    return Object.freeze({
      authority: validateTask105L05RecoveryAuthority(record.authority),
      operation,
      navigationMenuId: requiredString(
        record,
        "navigationMenuId",
        "TASK-105 L05 settings claim input"
      ),
    });
  }
  throw new SmokeError("smoke_output_invalid", "TASK-105 L05 settings operation is invalid");
}

type Task105L05SettingsApplyOutput =
  | Readonly<{ readonly applied: true }>
  | Readonly<{ readonly prepared: true }>
  | Readonly<{ readonly claimed: true }>;

export function validateTask105L05SettingsApplyOutput(
  value: unknown
): Task105L05SettingsApplyOutput {
  const record = plainObject(value, "TASK-105 L05 settings apply output");
  const keys = Object.keys(record);
  if (keys.length !== 1)
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 settings apply output is invalid");
  if (record.applied === true) return Object.freeze({ applied: true });
  if (record.prepared === true) return Object.freeze({ prepared: true });
  if (record.claimed === true) return Object.freeze({ claimed: true });
  throw new SmokeError("smoke_output_invalid", "TASK-105 L05 settings apply output is invalid");
}

async function executeTask105L05SettingsApply(
  input: Task105L05SettingsApplyInput
): Promise<Task105L05SettingsApplyOutput> {
  if (input.operation === "apply") return applyTask105L05Settings(input);
  if (input.operation === "site-shell-intent")
    return beginTask105L05SiteShellClaim(input.authority);
  return claimTask105L05SiteShell(input);
}

interface Task105L05SettingsRestoreInput extends PlainJsonObject {
  readonly authority: Task105L05RecoveryAuthority;
}

export function validateTask105L05SettingsRestoreInput(
  value: unknown
): Task105L05SettingsRestoreInput {
  const record = plainObject(value, "TASK-105 L05 settings restore input");
  assertExactKeys(record, ["authority"], "TASK-105 L05 settings restore input");
  return Object.freeze({ authority: validateTask105L05RecoveryAuthority(record.authority) });
}

function validateTask105L05SettingsRestoreOutput(
  value: unknown
): Readonly<{ readonly restored: true }> {
  const record = plainObject(value, "TASK-105 L05 settings restore output");
  assertExactKeys(record, ["restored"], "TASK-105 L05 settings restore output");
  if (record.restored !== true)
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 settings restore output is invalid");
  return Object.freeze({ restored: true });
}

async function executeTask105L05SettingsRestore(
  input: Task105L05SettingsRestoreInput
): Promise<Readonly<{ readonly restored: true }>> {
  return restoreTask105L05Settings(input.authority);
}

function definition<TInput extends PlainJsonObject, TOutput extends PlainJsonValue>(
  descriptor: WorkerOperationDescriptor,
  validateInput: (value: unknown) => TInput,
  validateOutput: (value: unknown) => TOutput,
  execute: (input: TInput) => Promise<TOutput>
): WorkerOperationDefinition<TInput, TOutput> {
  return Object.freeze({
    ...descriptor,
    validateInput,
    validateOutput,
    execute: (input: TInput, _context: WorkerOperationContext) => execute(input),
  });
}

export function createTask105L05FixtureWorkerDefinitions(
  descriptors: Task105L05FixtureWorkerDescriptors
): readonly WorkerOperationDefinition[] {
  return Object.freeze([
    definition(
      descriptors.install,
      validateTask105L05InstallInput,
      validateTask105L05InstallOutput,
      executeTask105L05Install
    ),
    definition(
      descriptors.settingsApply,
      validateTask105L05SettingsApplyInput,
      validateTask105L05SettingsApplyOutput,
      executeTask105L05SettingsApply
    ),
    definition(
      descriptors.settingsRestore,
      validateTask105L05SettingsRestoreInput,
      validateTask105L05SettingsRestoreOutput,
      executeTask105L05SettingsRestore
    ),
  ]);
}

export const TASK105_L05_WORKER_FIXTURE_CANARY = Object.freeze({
  roleName: task105L05RoleName,
  userEmail: task105L05UserEmail,
  leasedKeys: TASK105_L05_LEASED_SETTING_KEYS,
});
