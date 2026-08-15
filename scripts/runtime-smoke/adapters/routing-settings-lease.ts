import { asc, inArray, isNotNull, sql } from "drizzle-orm";

import { SmokeError } from "../contracts";
import type { SettingKey } from "../../../core/services/settings/settingsService";

/**
 * Shared runtime-smoke routing-settings lease (extracted from the task-540
 * suite, now also owned by task-547).
 *
 * The runtime-smoke suites expect the shared dev host on the canonical `/admin`
 * base path, but the ambient DB `site.adminPath` is operator-chosen (today
 * `/admin-panel`). The dev host resolves the admin path from the DB:
 * `core/server/utils/adminPath.ts` (`resolveAdminPath()` reads
 * `getSetting("site.adminPath")`), consumed by `core/server/middleware/hostPolicy.ts`
 * and mirrored by `core/vite.config.ts`. A suite must apply its owned routing
 * targets BEFORE the host spawns and restore the exact ambient snapshot
 * afterwards. `site.homepageId` is leased too: the front health probe hits `/`
 * and the ambient value can point at a deleted page, so the lease pins it to an
 * existing published page for the run.
 *
 * The assistant launcher avatar keys are leased for the same reason: the admin
 * SPA loads the launcher avatar unconditionally, the ambient value points at
 * `https://cdn.example.com/assistant-avatar.png` (a host that has no DNS
 * record anywhere), and the suite's browser proofs fail on ANY console error.
 * Disabling the avatar for the run keeps the SPA console-clean without
 * changing the ambient product configuration permanently.
 *
 * This is the simplified snapshot-restore variant of the task-554 lease: no
 * recovery receipt, no HMAC, no multi-run replay. Ownership is proven by the
 * post-apply row versions (xmin), and restoration fails closed on drift instead
 * of clobbering a concurrent writer.
 *
 * The suite import graph must stay DB-free (the pure A lane runs without
 * `DATABASE_URL`), so core database modules are loaded lazily inside the
 * call paths, never at module scope.
 */

export const ROUTING_SMOKE_LEASED_SETTING_KEYS = Object.freeze([
  "site.adminPath",
  "site.adminBaseUrl",
  "site.publicBaseUrl",
  "site.homepageId",
  "assistant.launcher.avatarEnabled",
  "assistant.launcher.avatarAsset",
] as const);

export type RuntimeSmokeLeasedSettingKey = (typeof ROUTING_SMOKE_LEASED_SETTING_KEYS)[number];

/**
 * PostgreSQL's canonical text forms stay private to the lease. They preserve
 * JSONB representation and timestamp microseconds across restoration.
 */
export type RuntimeSmokeRoutingSettingRecord = Readonly<{
  readonly key: RuntimeSmokeLeasedSettingKey;
  readonly updatedAt: string;
  readonly valueJson: string;
}>;

export type RuntimeSmokeRoutingSettingsOwnedRecord = Readonly<{
  readonly record: RuntimeSmokeRoutingSettingRecord;
  readonly version: string;
}>;

export type RuntimeSmokeRoutingSettingsSnapshot = Readonly<
  Record<RuntimeSmokeLeasedSettingKey, RuntimeSmokeRoutingSettingRecord | null>
>;

type RuntimeSmokeRoutingSettingsState = Readonly<{
  readonly owned: Readonly<
    Record<RuntimeSmokeLeasedSettingKey, RuntimeSmokeRoutingSettingsOwnedRecord>
  >;
  readonly snapshot: RuntimeSmokeRoutingSettingsSnapshot;
}>;

const ROUTING_SMOKE_LEASED_TARGETS: Readonly<
  Record<Exclude<RuntimeSmokeLeasedSettingKey, "site.homepageId">, string>
> = Object.freeze({
  "site.adminPath": JSON.stringify("/admin"),
  "site.adminBaseUrl": "null",
  "site.publicBaseUrl": "null",
  "assistant.launcher.avatarEnabled": "false",
  "assistant.launcher.avatarAsset": JSON.stringify(""),
});

type DbTransaction = Parameters<
  Parameters<typeof import("../../../core/db/client").db.transaction>[0]
>[0];

type RuntimeSmokeRoutingSettingRow = Readonly<{
  readonly key: string;
  readonly updatedAt: string;
  readonly valueJson: string;
  readonly version?: string;
}>;

interface RuntimeSmokeRoutingCoreHandles {
  readonly acquireNativeCmsWriterFence: (tx: DbTransaction) => Promise<void>;
  readonly db: typeof import("../../../core/db/client").db;
  readonly invalidateSiteShellCachesForKeys: (keys: Iterable<SettingKey>) => void;
  readonly pages: typeof import("../../../core/db/schema").pages;
  readonly settings: typeof import("../../../core/db/schema").settings;
}

async function runtimeSmokeRoutingCore(): Promise<RuntimeSmokeRoutingCoreHandles> {
  const [
    { db },
    { acquireNativeCmsWriterFence },
    { pages, settings },
    { invalidateSiteShellCachesForKeys },
  ] = await Promise.all([
    import("../../../core/db/client"),
    import("../../../core/db/nativeCmsWriterFence"),
    import("../../../core/db/schema"),
    import("../../../core/services/settings/settingsService"),
  ]);
  return Object.freeze({
    acquireNativeCmsWriterFence,
    db,
    invalidateSiteShellCachesForKeys,
    pages,
    settings,
  });
}

function cleanupFailure(message: string): never {
  throw new SmokeError("smoke_cleanup_failed", message);
}

function isLeasedSettingKey(value: string): value is RuntimeSmokeLeasedSettingKey {
  return (ROUTING_SMOKE_LEASED_SETTING_KEYS as readonly string[]).includes(value);
}

function freezeRecord(input: RuntimeSmokeRoutingSettingRow): RuntimeSmokeRoutingSettingRecord {
  if (
    !isLeasedSettingKey(input.key) ||
    typeof input.valueJson !== "string" ||
    input.valueJson.length === 0 ||
    typeof input.updatedAt !== "string" ||
    input.updatedAt.length === 0
  ) {
    throw new SmokeError("smoke_cleanup_failed", "runtime-smoke routing setting row is invalid");
  }
  return Object.freeze({
    key: input.key,
    updatedAt: input.updatedAt,
    valueJson: input.valueJson,
  });
}

function freezeSnapshot(
  rows: readonly RuntimeSmokeRoutingSettingRow[]
): RuntimeSmokeRoutingSettingsSnapshot {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  if (byKey.size !== rows.length || rows.some((row) => !isLeasedSettingKey(row.key))) {
    throw new SmokeError("smoke_cleanup_failed", "runtime-smoke routing setting rows are invalid");
  }
  return Object.freeze(
    Object.fromEntries(
      ROUTING_SMOKE_LEASED_SETTING_KEYS.map((key) => {
        const row = byKey.get(key);
        return [key, row === undefined ? null : freezeRecord(row)];
      })
    ) as Record<RuntimeSmokeLeasedSettingKey, RuntimeSmokeRoutingSettingRecord | null>
  );
}

function requireCompleteOwnedRecords(
  rows: readonly RuntimeSmokeRoutingSettingRow[]
): Readonly<Record<RuntimeSmokeLeasedSettingKey, RuntimeSmokeRoutingSettingsOwnedRecord>> {
  const snapshot = freezeSnapshot(rows);
  const versions = new Map(rows.map((row) => [row.key, row.version]));
  if (
    ROUTING_SMOKE_LEASED_SETTING_KEYS.some(
      (key) => snapshot[key] === null || typeof versions.get(key) !== "string" || !versions.get(key)
    )
  ) {
    throw new SmokeError("smoke_cleanup_failed", "runtime-smoke routing targets are incomplete");
  }
  return Object.freeze(
    Object.fromEntries(
      ROUTING_SMOKE_LEASED_SETTING_KEYS.map(
        (key) =>
          [key, Object.freeze({ record: snapshot[key]!, version: versions.get(key)! })] as const
      )
    ) as Record<RuntimeSmokeLeasedSettingKey, RuntimeSmokeRoutingSettingsOwnedRecord>
  );
}

function recordMatches(
  current: RuntimeSmokeRoutingSettingRecord | null,
  expected: RuntimeSmokeRoutingSettingRecord
): boolean {
  return (
    current !== null &&
    current.key === expected.key &&
    current.updatedAt === expected.updatedAt &&
    current.valueJson === expected.valueJson
  );
}

function ownedRecordMatches(
  current: RuntimeSmokeRoutingSettingsOwnedRecord | null,
  expected: RuntimeSmokeRoutingSettingsOwnedRecord
): boolean {
  return (
    current !== null &&
    current.version === expected.version &&
    recordMatches(current.record, expected.record)
  );
}

function snapshotMatches(
  current: RuntimeSmokeRoutingSettingsSnapshot,
  expected: RuntimeSmokeRoutingSettingsSnapshot
): boolean {
  return ROUTING_SMOKE_LEASED_SETTING_KEYS.every((key) => {
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

async function readRoutingSettingsForUpdate(
  core: RuntimeSmokeRoutingCoreHandles,
  tx: DbTransaction
): Promise<readonly RuntimeSmokeRoutingSettingRow[]> {
  return await tx
    .select({
      key: core.settings.key,
      updatedAt: sql<string>`${core.settings.updatedAt}::text`.as("updated_at"),
      valueJson: sql<string>`${core.settings.value}::text`.as("value_json"),
      version: sql<string>`xmin::text`.as("version"),
    })
    .from(core.settings)
    .where(inArray(core.settings.key, ROUTING_SMOKE_LEASED_SETTING_KEYS))
    .orderBy(asc(core.settings.key))
    .for("update");
}

async function lockRoutingSettingsTable(
  core: RuntimeSmokeRoutingCoreHandles,
  tx: DbTransaction
): Promise<void> {
  await tx.execute(sql`LOCK TABLE ${core.settings} IN SHARE ROW EXCLUSIVE MODE`);
}

async function resolveRuntimeSmokeHomepageId(
  core: RuntimeSmokeRoutingCoreHandles,
  tx: DbTransaction
): Promise<string> {
  const rows = await tx
    .select({ id: core.pages.id })
    .from(core.pages)
    .where(isNotNull(core.pages.publishedData))
    .orderBy(asc(core.pages.id))
    .limit(1);
  if (rows.length !== 1 || typeof rows[0]?.id !== "string" || !rows[0].id) {
    cleanupFailure("runtime-smoke published homepage target is unavailable");
  }
  return rows[0]!.id;
}

async function writeRoutingTargets(
  core: RuntimeSmokeRoutingCoreHandles,
  tx: DbTransaction,
  homepageId: string
): Promise<void> {
  const targetJson: Readonly<Record<RuntimeSmokeLeasedSettingKey, string>> = Object.freeze({
    ...ROUTING_SMOKE_LEASED_TARGETS,
    "site.homepageId": JSON.stringify(homepageId),
  });
  await tx
    .insert(core.settings)
    .values(
      ROUTING_SMOKE_LEASED_SETTING_KEYS.map((key) => ({
        key,
        updatedAt: sql`clock_timestamp()`,
        value: sql`${targetJson[key]}::jsonb`,
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
  core: RuntimeSmokeRoutingCoreHandles,
  tx: DbTransaction,
  records: readonly RuntimeSmokeRoutingSettingRecord[]
): Promise<void> {
  if (records.length === 0) return;
  await tx
    .insert(core.settings)
    .values(
      records.map((record) => ({
        key: record.key,
        updatedAt: sql`${record.updatedAt}::timestamp`,
        value: sql`${record.valueJson}::jsonb`,
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

async function applyRuntimeSmokeRoutingTargets(): Promise<RuntimeSmokeRoutingSettingsState> {
  const core = await runtimeSmokeRoutingCore();
  return await core.db.transaction(
    async (tx) => {
      await core.acquireNativeCmsWriterFence(tx);
      await lockRoutingSettingsTable(core, tx);
      const snapshot = freezeSnapshot(await readRoutingSettingsForUpdate(core, tx));
      const homepageId = await resolveRuntimeSmokeHomepageId(core, tx);
      await writeRoutingTargets(core, tx, homepageId);
      const owned = requireCompleteOwnedRecords(await readRoutingSettingsForUpdate(core, tx));
      return Object.freeze({ snapshot, owned });
    },
    { isolationLevel: "read committed" }
  );
}

async function restoreRuntimeSmokeRoutingSettings(
  snapshot: RuntimeSmokeRoutingSettingsSnapshot,
  owned: Readonly<Record<RuntimeSmokeLeasedSettingKey, RuntimeSmokeRoutingSettingsOwnedRecord>>
): Promise<void> {
  const core = await runtimeSmokeRoutingCore();
  await core.db.transaction(
    async (tx) => {
      await core.acquireNativeCmsWriterFence(tx);
      await lockRoutingSettingsTable(core, tx);
      let currentOwned: Readonly<
        Record<RuntimeSmokeLeasedSettingKey, RuntimeSmokeRoutingSettingsOwnedRecord>
      >;
      try {
        currentOwned = requireCompleteOwnedRecords(await readRoutingSettingsForUpdate(core, tx));
      } catch {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "runtime-smoke routing setting ownership drifted"
        );
      }
      if (
        ROUTING_SMOKE_LEASED_SETTING_KEYS.some(
          (key) => !ownedRecordMatches(currentOwned[key], owned[key])
        )
      ) {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "runtime-smoke routing setting ownership drifted"
        );
      }
      await writeSnapshotRecords(
        core,
        tx,
        ROUTING_SMOKE_LEASED_SETTING_KEYS.flatMap((key) => {
          const baseline = snapshot[key];
          return baseline === null ? [] : [baseline];
        })
      );
      const absentKeys = ROUTING_SMOKE_LEASED_SETTING_KEYS.filter((key) => snapshot[key] === null);
      if (absentKeys.length > 0) {
        await tx.delete(core.settings).where(inArray(core.settings.key, absentKeys));
      }
      const restored = freezeSnapshot(await readRoutingSettingsForUpdate(core, tx));
      if (!snapshotMatches(restored, snapshot)) {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "runtime-smoke routing setting restoration proof failed"
        );
      }
    },
    { isolationLevel: "read committed" }
  );
}

async function invalidateRuntimeSmokeRoutingCaches(): Promise<void> {
  const core = await runtimeSmokeRoutingCore();
  core.invalidateSiteShellCachesForKeys(ROUTING_SMOKE_LEASED_SETTING_KEYS);
}

export class RuntimeSmokeRoutingSettingsLease {
  #active = false;
  #applyPromise: Promise<void> | null = null;
  #owned: Readonly<
    Record<RuntimeSmokeLeasedSettingKey, RuntimeSmokeRoutingSettingsOwnedRecord>
  > | null = null;
  #restored = false;
  #restorePromise: Promise<void> | null = null;
  #snapshot: RuntimeSmokeRoutingSettingsSnapshot | null = null;

  get active(): boolean {
    return this.#active;
  }

  get restored(): boolean {
    return this.#restored;
  }

  async apply(): Promise<void> {
    if (this.#applyPromise !== null || this.#restored) {
      throw new SmokeError(
        "smoke_output_invalid",
        "runtime-smoke routing settings lease cannot be replayed"
      );
    }
    this.#applyPromise = this.#applyOnce();
    await this.#applyPromise;
  }

  async #applyOnce(): Promise<void> {
    const state = await applyRuntimeSmokeRoutingTargets();
    this.#snapshot = state.snapshot;
    this.#owned = state.owned;
    this.#active = true;
    await invalidateRuntimeSmokeRoutingCaches();
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
    if (this.#snapshot === null || this.#owned === null) {
      throw new SmokeError(
        "smoke_cleanup_failed",
        "runtime-smoke routing settings snapshot is absent"
      );
    }
    await restoreRuntimeSmokeRoutingSettings(this.#snapshot, this.#owned);
    this.#active = false;
    this.#restored = true;
    await invalidateRuntimeSmokeRoutingCaches();
  }
}
