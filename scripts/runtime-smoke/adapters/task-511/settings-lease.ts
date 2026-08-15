import { inArray, sql } from "drizzle-orm";

import { SmokeError } from "../../contracts";
import type { SettingKey } from "../../../../core/services/settings/settingsService";

/**
 * TASK-511 owned settings lease.
 *
 * The backup smoke needs the admin SPA console-clean and free of auth
 * throttling:
 * - The assistant launcher avatar keys are leased for the same reason as the
 *   shared runtime-smoke lease: the ambient value points at a dead CDN host
 *   and the browser proofs fail on ANY console error.
 * - The `security.settings` key is leased with `rateLimit.enabled` forced to
 *   `false` so the many admin API calls of the backup flows can never trip a
 *   burst limit against the shared database.
 *
 * Unlike the shared routing lease this module does NOT touch `site.adminPath`:
 * TASK-511 must derive admin URLs from the ambient DB value (the operator
 * chose `/admin-panel`), so the suite never rewrites routing settings.
 *
 * Ownership is proven by the post-apply row versions (xmin), and restoration
 * fails closed on drift instead of clobbering a concurrent writer. The
 * `security.settings` target is derived from the snapshot (only the
 * rate-limit flag is merged in), so restoration is byte-exact.
 *
 * The suite import graph stays DB-free (the pure A lane runs without
 * `DATABASE_URL`), so core database modules are loaded lazily inside the
 * call paths, never at module scope.
 */

export const TASK511_LEASED_SETTING_KEYS = Object.freeze([
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
  "security.settings",
] as const);

const TASK511_SHELL_INVALIDATION_KEYS = Object.freeze([
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
] as const) satisfies readonly SettingKey[];

export type Task511LeasedSettingKey = (typeof TASK511_LEASED_SETTING_KEYS)[number];

export type Task511SettingRecord = Readonly<{
  readonly key: Task511LeasedSettingKey;
  readonly updatedAt: string;
  readonly valueJson: string;
  readonly version: string;
}>;

export type Task511SettingSnapshot = Readonly<
  Record<Task511LeasedSettingKey, Task511SettingRecord | null>
>;

export type Task511OwnedSettingRecords = Readonly<
  Record<Task511LeasedSettingKey, Task511SettingRecord>
>;

type DbTransaction = Parameters<
  Parameters<typeof import("../../../../core/db/client").db.transaction>[0]
>[0];

interface Task511LeaseCoreHandles {
  readonly acquireNativeCmsWriterFence: (tx: DbTransaction) => Promise<void>;
  readonly db: typeof import("../../../../core/db/client").db;
  readonly invalidateSiteShellCachesForKeys: (keys: Iterable<SettingKey>) => void;
  readonly settings: typeof import("../../../../core/db/schema").settings;
}

async function task511LeaseCore(): Promise<Task511LeaseCoreHandles> {
  const [
    { db },
    { acquireNativeCmsWriterFence },
    { settings },
    { invalidateSiteShellCachesForKeys },
  ] = await Promise.all([
    import("../../../../core/db/client"),
    import("../../../../core/db/nativeCmsWriterFence"),
    import("../../../../core/db/schema"),
    import("../../../../core/services/settings/settingsService"),
  ]);
  return Object.freeze({
    acquireNativeCmsWriterFence,
    db,
    invalidateSiteShellCachesForKeys,
    settings,
  });
}

function cleanupFailure(message: string): never {
  throw new SmokeError("smoke_cleanup_failed", message);
}

function isLeasedSettingKey(value: string): value is Task511LeasedSettingKey {
  return (TASK511_LEASED_SETTING_KEYS as readonly string[]).includes(value);
}

function freezeSnapshot(rows: readonly Task511SettingRecord[]): Task511SettingSnapshot {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  if (byKey.size !== rows.length || rows.some((row) => !isLeasedSettingKey(row.key))) {
    cleanupFailure("task-511 leased setting rows are invalid");
  }
  return Object.freeze(
    Object.fromEntries(
      TASK511_LEASED_SETTING_KEYS.map((key) => {
        const row = byKey.get(key);
        return [key, row === undefined ? null : row];
      })
    ) as Task511SettingSnapshot
  );
}

function requireCompleteOwnedRecords(
  rows: readonly Task511SettingRecord[]
): Task511OwnedSettingRecords {
  const snapshot = freezeSnapshot(rows);
  if (TASK511_LEASED_SETTING_KEYS.some((key) => snapshot[key] === null)) {
    cleanupFailure("task-511 leased setting targets are incomplete");
  }
  return Object.freeze(
    Object.fromEntries(
      TASK511_LEASED_SETTING_KEYS.map((key) => [key, snapshot[key]!])
    ) as Task511OwnedSettingRecords
  );
}

function recordMatches(
  current: Task511SettingRecord | null,
  expected: Task511SettingRecord
): boolean {
  return (
    current !== null &&
    current.key === expected.key &&
    current.updatedAt === expected.updatedAt &&
    current.valueJson === expected.valueJson
  );
}

function ownedMatches(
  current: Task511OwnedSettingRecords,
  expected: Task511OwnedSettingRecords
): boolean {
  return TASK511_LEASED_SETTING_KEYS.every((key) => {
    const currentRecord = current[key];
    const expectedRecord = expected[key];
    return (
      currentRecord !== null &&
      expectedRecord !== null &&
      currentRecord.version === expectedRecord.version &&
      recordMatches(currentRecord, expectedRecord)
    );
  });
}

function snapshotMatches(
  current: Task511SettingSnapshot,
  expected: Task511SettingSnapshot
): boolean {
  return TASK511_LEASED_SETTING_KEYS.every((key) => {
    const currentRecord = current[key];
    const expectedRecord = expected[key];
    return (
      (currentRecord === null && expectedRecord === null) ||
      (currentRecord !== null &&
        expectedRecord !== null &&
        currentRecord.key === expectedRecord.key &&
        currentRecord.updatedAt === expectedRecord.updatedAt &&
        currentRecord.valueJson === expectedRecord.valueJson)
    );
  });
}

type Task511SettingRow = Readonly<{
  readonly key: string;
  readonly updatedAt: string;
  readonly valueJson: string;
  readonly version: string;
}>;

function normalizeSettingRows(rows: readonly Task511SettingRow[]): readonly Task511SettingRecord[] {
  return rows.map((row) => {
    if (!isLeasedSettingKey(row.key)) {
      cleanupFailure("task-511 leased setting row is invalid");
    }
    return Object.freeze({
      key: row.key,
      updatedAt: row.updatedAt,
      valueJson: row.valueJson,
      version: row.version,
    });
  });
}

async function readLeasedSettingsForUpdate(
  core: Task511LeaseCoreHandles,
  tx: DbTransaction
): Promise<readonly Task511SettingRecord[]> {
  const rows = await tx
    .select({
      key: core.settings.key,
      updatedAt: sql<string>`${core.settings.updatedAt}::text`.as("updated_at"),
      valueJson: sql<string>`${core.settings.value}::text`.as("value_json"),
      version: sql<string>`xmin::text`.as("version"),
    })
    .from(core.settings)
    .where(inArray(core.settings.key, TASK511_LEASED_SETTING_KEYS))
    .orderBy(sql`${core.settings.key}`)
    .for("update");
  return normalizeSettingRows(rows);
}

async function lockSettingsTable(core: Task511LeaseCoreHandles, tx: DbTransaction): Promise<void> {
  await tx.execute(sql`LOCK TABLE ${core.settings} IN SHARE ROW EXCLUSIVE MODE`);
}

function securityTarget(snapshot: Task511SettingRecord | null): string {
  let base: Record<string, unknown> = {};
  if (snapshot !== null) {
    try {
      const parsed = JSON.parse(snapshot.valueJson) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        base = { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      cleanupFailure("task-511 leased security settings are not valid JSON");
    }
  }
  const rateLimit = base.rateLimit;
  const rateLimitRecord =
    rateLimit !== null && typeof rateLimit === "object" && !Array.isArray(rateLimit)
      ? { ...(rateLimit as Record<string, unknown>) }
      : {};
  rateLimitRecord.enabled = false;
  base.rateLimit = rateLimitRecord;
  return JSON.stringify(base);
}

async function writeLeaseTargets(
  core: Task511LeaseCoreHandles,
  tx: DbTransaction,
  snapshot: Task511SettingSnapshot
): Promise<void> {
  const targets: Readonly<Record<Task511LeasedSettingKey, string>> = Object.freeze({
    "assistant.launcher.avatarEnabled": "false",
    "assistant.launcher.avatarAsset": JSON.stringify(""),
    "security.settings": securityTarget(snapshot["security.settings"] ?? null),
  });
  await tx
    .insert(core.settings)
    .values(
      TASK511_LEASED_SETTING_KEYS.map((key) => ({
        key,
        updatedAt: sql`clock_timestamp()`,
        value: sql`${targets[key]}::jsonb`,
      }))
    )
    .onConflictDoUpdate({
      target: core.settings.key,
      set: {
        updatedAt: sql`excluded.updated_at`,
        value: sql`excluded.value`,
      },
    });
}

async function writeSnapshotRecords(
  core: Task511LeaseCoreHandles,
  tx: DbTransaction,
  snapshot: Task511SettingSnapshot
): Promise<void> {
  const present = TASK511_LEASED_SETTING_KEYS.filter(
    (key) => snapshot[key] !== null
  ) as readonly Task511LeasedSettingKey[];
  const absent = TASK511_LEASED_SETTING_KEYS.filter(
    (key) => snapshot[key] === null
  ) as readonly Task511LeasedSettingKey[];
  if (present.length > 0) {
    await tx
      .insert(core.settings)
      .values(
        present.map((key) => {
          const record = snapshot[key]!;
          return {
            key,
            updatedAt: sql`${record.updatedAt}::timestamptz`,
            value: sql`${record.valueJson}::jsonb`,
          };
        })
      )
      .onConflictDoUpdate({
        target: core.settings.key,
        set: {
          updatedAt: sql`excluded.updated_at`,
          value: sql`excluded.value`,
        },
      });
  }
  if (absent.length > 0) {
    await tx.delete(core.settings).where(inArray(core.settings.key, absent));
  }
}

export class Task511SettingsLease {
  #snapshot: Task511SettingSnapshot | null = null;
  #owned: Task511OwnedSettingRecords | null = null;
  #applied = false;

  async apply(): Promise<void> {
    const core = await task511LeaseCore();
    await core.db.transaction(async (tx) => {
      await core.acquireNativeCmsWriterFence(tx);
      await lockSettingsTable(core, tx);
      const rows = await readLeasedSettingsForUpdate(core, tx);
      const snapshot = freezeSnapshot(rows);
      await writeLeaseTargets(core, tx, snapshot);
      const appliedRows = await readLeasedSettingsForUpdate(core, tx);
      this.#owned = requireCompleteOwnedRecords(appliedRows);
      this.#snapshot = snapshot;
      this.#applied = true;
    });
    core.invalidateSiteShellCachesForKeys(TASK511_SHELL_INVALIDATION_KEYS);
  }

  async restore(): Promise<void> {
    if (!this.#applied || this.#snapshot === null || this.#owned === null) return;
    const core = await task511LeaseCore();
    await core.db.transaction(async (tx) => {
      await core.acquireNativeCmsWriterFence(tx);
      await lockSettingsTable(core, tx);
      const current = await readLeasedSettingsForUpdate(core, tx);
      if (!ownedMatches(requireCompleteOwnedRecords(current), this.#owned!)) {
        cleanupFailure("task-511 leased settings were changed during the run");
      }
      await writeSnapshotRecords(core, tx, this.#snapshot!);
      const restored = await readLeasedSettingsForUpdate(core, tx);
      if (!snapshotMatches(freezeSnapshot(restored), this.#snapshot!)) {
        cleanupFailure("task-511 leased settings restoration drifted");
      }
    });
    core.invalidateSiteShellCachesForKeys(TASK511_SHELL_INVALIDATION_KEYS);
  }

  async verify(): Promise<boolean> {
    if (!this.#applied || this.#snapshot === null) return false;
    const core = await task511LeaseCore();
    const rows = await core.db
      .select({
        key: core.settings.key,
        updatedAt: sql<string>`${core.settings.updatedAt}::text`.as("updated_at"),
        valueJson: sql<string>`${core.settings.value}::text`.as("value_json"),
        version: sql<string>`xmin::text`.as("version"),
      })
      .from(core.settings)
      .where(inArray(core.settings.key, TASK511_LEASED_SETTING_KEYS))
      .orderBy(sql`${core.settings.key}`);
    return snapshotMatches(freezeSnapshot(normalizeSettingRows(rows)), this.#snapshot);
  }
}
