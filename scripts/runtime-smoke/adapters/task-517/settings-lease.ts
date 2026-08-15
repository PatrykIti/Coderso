import { eq, sql } from "drizzle-orm";

import { db } from "../../../../core/db/client";
import { acquireNativeCmsWriterFence } from "../../../../core/db/nativeCmsWriterFence";
import { settings } from "../../../../core/db/schema";
import { invalidateSiteShellCachesForKeys } from "../../../../core/services/settings/settingsService";
import { SmokeError } from "../../contracts";

/**
 * Task-517 owns exactly two setting keys: `site.contentRoutes` (the leased
 * content route that exposes the smoke detail/list URLs) and
 * `site.cacheTtlSeconds` (the ambient value is 0, which disables the site
 * render cache the cached-render scenario depends on; the suite raises it to
 * 300 while active). The lease snapshots both rows (or their absence) in one
 * locked transaction, writes the smoke values, and restores the exact
 * snapshots only while the owned rows are byte-identical (xmin + value).
 * State lives on the lease instance inside the worker process, so
 * install/cleanup/prove share one owner without a persistent recovery
 * receipt row.
 */
export const TASK517_CONTENT_ROUTES_KEY = "site.contentRoutes" as const;
export const TASK517_CACHE_TTL_KEY = "site.cacheTtlSeconds" as const;
export const TASK517_CACHE_TTL_SECONDS = 300 as const;

export type Task517SettingRecord = Readonly<{
  readonly key: string;
  readonly updatedAt: string;
  readonly valueJson: string;
}>;

export type Task517SettingOwnedRecord = Readonly<{
  readonly record: Task517SettingRecord;
  readonly version: string;
}>;

export type Task517SettingSnapshot = Readonly<{
  readonly routes: Task517SettingRecord | null;
  readonly cacheTtl: Task517SettingRecord | null;
}>;

export type Task517SettingOwned = Readonly<{
  readonly routes: Task517SettingOwnedRecord;
  readonly cacheTtl: Task517SettingOwnedRecord;
}>;

export type Task517ContentRoutesLeaseState = Readonly<{
  readonly snapshot: Task517SettingSnapshot;
  readonly owned: Task517SettingOwned;
}>;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type SettingRow = Readonly<{
  readonly key: string;
  readonly updatedAt: string;
  readonly valueJson: string;
  readonly version?: string;
}>;

const ROUTE_VALUE = (typeSlug: string, listPath: string, detailPath: string): string =>
  JSON.stringify([
    {
      type: typeSlug,
      listPath,
      detailPath,
      enabled: true,
    },
  ]);

const CACHE_TTL_VALUE = (ttlSeconds: number): string => JSON.stringify(ttlSeconds);

async function lockSettingsTable(tx: DbTransaction): Promise<void> {
  await tx.execute(sql`LOCK TABLE ${settings} IN SHARE ROW EXCLUSIVE MODE`);
}

async function readSettingForUpdate(tx: DbTransaction, key: string): Promise<SettingRow | null> {
  const [row] = await tx
    .select({
      key: settings.key,
      updatedAt: sql<string>`${settings.updatedAt}::text`.as("updated_at"),
      valueJson: sql<string>`${settings.value}::text`.as("value_json"),
      version: sql<string>`xmin::text`.as("version"),
    })
    .from(settings)
    .where(eq(settings.key, key))
    .for("update");
  if (row === undefined) return null;
  if (
    row.key !== key ||
    typeof row.updatedAt !== "string" ||
    typeof row.valueJson !== "string" ||
    typeof row.version !== "string" ||
    row.version.length === 0
  ) {
    throw new SmokeError("smoke_cleanup_failed", `TASK-517 ${key} row is invalid`);
  }
  return Object.freeze({
    key: row.key,
    updatedAt: row.updatedAt,
    valueJson: row.valueJson,
    version: row.version,
  });
}

function freezeRecord(row: SettingRow): Task517SettingRecord {
  return Object.freeze({
    key: row.key,
    updatedAt: row.updatedAt,
    valueJson: row.valueJson,
  });
}

function freezeOwned(row: SettingRow): Task517SettingOwnedRecord {
  return Object.freeze({ record: freezeRecord(row), version: row.version! });
}

function ownedRecordMatches(
  current: Task517SettingOwnedRecord,
  expected: Task517SettingOwnedRecord
): boolean {
  return (
    current.version === expected.version &&
    current.record.updatedAt === expected.record.updatedAt &&
    current.record.valueJson === expected.record.valueJson
  );
}

async function writeSettingRecord(tx: DbTransaction, record: Task517SettingRecord): Promise<void> {
  await tx
    .insert(settings)
    .values({
      key: record.key,
      updatedAt: sql`${record.updatedAt}::timestamp`,
      value: sql`${record.valueJson}::jsonb`,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        updatedAt: sql`excluded.updated_at`,
        value: sql`excluded.value`,
      },
    });
}

async function writeSettingValue(
  tx: DbTransaction,
  key: string,
  valueJson: string,
  updatedAt: ReturnType<typeof sql>
): Promise<void> {
  await tx
    .insert(settings)
    .values({
      key,
      updatedAt,
      value: sql`${valueJson}::jsonb`,
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        updatedAt: sql`excluded.updated_at`,
        value: sql`excluded.value`,
      },
    });
}

export class Task517ContentRoutesLease {
  #state: Task517ContentRoutesLeaseState | null = null;

  isActive(): boolean {
    return this.#state !== null;
  }

  state(): Task517ContentRoutesLeaseState | null {
    return this.#state;
  }

  async apply(
    typeSlug: string,
    listPath: string,
    detailPath: string,
    cacheTtlSeconds: number
  ): Promise<void> {
    if (this.#state !== null) {
      throw new SmokeError("smoke_argument_invalid", "TASK-517 settings lease already active");
    }
    if (!Number.isInteger(cacheTtlSeconds) || cacheTtlSeconds <= 0) {
      throw new SmokeError("smoke_argument_invalid", "TASK-517 cache TTL is invalid");
    }
    const routeValue = ROUTE_VALUE(typeSlug, listPath, detailPath);
    const cacheTtlValue = CACHE_TTL_VALUE(cacheTtlSeconds);
    await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await lockSettingsTable(tx);
        const routesSnapshotRow = await readSettingForUpdate(tx, TASK517_CONTENT_ROUTES_KEY);
        const cacheTtlSnapshotRow = await readSettingForUpdate(tx, TASK517_CACHE_TTL_KEY);
        await writeSettingValue(tx, TASK517_CONTENT_ROUTES_KEY, routeValue, sql`clock_timestamp()`);
        await writeSettingValue(tx, TASK517_CACHE_TTL_KEY, cacheTtlValue, sql`clock_timestamp()`);
        const routesOwnedRow = await readSettingForUpdate(tx, TASK517_CONTENT_ROUTES_KEY);
        const cacheTtlOwnedRow = await readSettingForUpdate(tx, TASK517_CACHE_TTL_KEY);
        if (routesOwnedRow === null) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-517 contentRoutes write vanished");
        }
        if (cacheTtlOwnedRow === null) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-517 cacheTtl write vanished");
        }
        const routesOwned = freezeOwned(routesOwnedRow);
        const cacheTtlOwned = freezeOwned(cacheTtlOwnedRow);
        if (
          routesOwned.record.valueJson !== routeValue ||
          cacheTtlOwned.record.valueJson !== cacheTtlValue
        ) {
          throw new SmokeError("smoke_cleanup_failed", "TASK-517 settings ownership drifted");
        }
        this.#state = Object.freeze({
          snapshot: Object.freeze({
            routes: routesSnapshotRow === null ? null : freezeRecord(routesSnapshotRow),
            cacheTtl: cacheTtlSnapshotRow === null ? null : freezeRecord(cacheTtlSnapshotRow),
          }),
          owned: Object.freeze({ routes: routesOwned, cacheTtl: cacheTtlOwned }),
        });
      },
      { isolationLevel: "read committed" }
    );
    invalidateSiteShellCachesForKeys([TASK517_CONTENT_ROUTES_KEY, TASK517_CACHE_TTL_KEY]);
  }

  async restore(): Promise<"absent" | "restored"> {
    if (this.#state === null) return "absent" as const;
    const state = this.#state;
    await db.transaction(
      async (tx) => {
        await acquireNativeCmsWriterFence(tx);
        await lockSettingsTable(tx);
        const routesCurrent = await readSettingForUpdate(tx, TASK517_CONTENT_ROUTES_KEY);
        const cacheTtlCurrent = await readSettingForUpdate(tx, TASK517_CACHE_TTL_KEY);
        if (routesCurrent === null) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-517 contentRoutes ownership drifted (row absent)"
          );
        }
        if (cacheTtlCurrent === null) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-517 cacheTtl ownership drifted (row absent)"
          );
        }
        if (
          !ownedRecordMatches(freezeOwned(routesCurrent), state.owned.routes) ||
          !ownedRecordMatches(freezeOwned(cacheTtlCurrent), state.owned.cacheTtl)
        ) {
          throw new SmokeError(
            "smoke_cleanup_failed",
            "TASK-517 settings ownership drifted (row changed)"
          );
        }
        for (const [key, snapshot] of [
          [TASK517_CONTENT_ROUTES_KEY, state.snapshot.routes] as const,
          [TASK517_CACHE_TTL_KEY, state.snapshot.cacheTtl] as const,
        ]) {
          if (snapshot === null) {
            await tx.delete(settings).where(eq(settings.key, key));
            const after = await readSettingForUpdate(tx, key);
            if (after !== null) {
              throw new SmokeError("smoke_cleanup_failed", `TASK-517 ${key} restore left a row`);
            }
          } else {
            await writeSettingRecord(tx, snapshot);
            const after = await readSettingForUpdate(tx, key);
            if (after === null || after.valueJson !== snapshot.valueJson) {
              throw new SmokeError(
                "smoke_cleanup_failed",
                `TASK-517 ${key} snapshot restore failed`
              );
            }
          }
        }
        this.#state = null;
      },
      { isolationLevel: "read committed" }
    );
    invalidateSiteShellCachesForKeys([TASK517_CONTENT_ROUTES_KEY, TASK517_CACHE_TTL_KEY]);
    return "restored" as const;
  }

  invalidate(): void {
    invalidateSiteShellCachesForKeys([TASK517_CONTENT_ROUTES_KEY, TASK517_CACHE_TTL_KEY]);
  }
}
