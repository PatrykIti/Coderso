import { expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import postgres from "postgres";

import {
  buildSiteCacheKey,
  clearSiteCache,
  configureSiteCache,
  getSiteCacheEntry,
  setSiteCacheEntry,
} from "../../../core/site/cache/siteCache";

export type SqlClient = ReturnType<typeof postgres>;
export type ReservedSql = Awaited<ReturnType<SqlClient["reserve"]>>;
type PostgresJsonValue = Parameters<SqlClient["json"]>[0];
export type Uuid = ReturnType<typeof randomUUID>;
export type Direction = "writer-first" | "delete-first";

export type RawSettingState =
  Readonly<{ present: false }> | Readonly<{ present: true; value: unknown; updatedAt: Date }>;

export type RaceContext = {
  rootId: Uuid;
  referenceId: Uuid;
  ownerId: Uuid;
  auxiliaryId: Uuid;
  actionId: Uuid;
  termId: Uuid;
  revisionId: Uuid;
  actorId: Uuid;
  scope: string;
  rootSlug: string;
  nextSlug: string;
  priorRoutes?: RawSettingState;
};

export type RaceDescriptor = Readonly<{
  label: string;
  waiterTable: string;
  setup(client: SqlClient, context: RaceContext): Promise<void>;
  lockAndWriteReference(tx: ReservedSql, context: RaceContext): Promise<unknown>;
  lockAndDeleteOrRename(tx: ReservedSql, context: RaceContext): Promise<unknown>;
  runGuardedMutation(context: RaceContext): Promise<unknown>;
  runReferenceWriter(context: RaceContext): Promise<unknown>;
  guardedError: string;
  writerError: string;
  readState(client: SqlClient, context: RaceContext): Promise<readonly number[]>;
  writerFirstState: readonly number[];
  deleteFirstState: readonly number[];
}>;

export type LockProof = Readonly<{
  holderPid: number;
  waiterPid: number;
  waitingMode: string;
  blockerMode: string;
}>;

type OperationOutcome =
  Readonly<{ ok: true; value: unknown }> | Readonly<{ ok: false; error: unknown }>;

type CountRow = Readonly<Record<string, unknown>>;
export type CountQuery = PromiseLike<readonly CountRow[]>;

const LOCK_PROOF_ATTEMPTS = 10_000;

export const readCounts = async (...queries: readonly CountQuery[]): Promise<readonly number[]> => {
  const results = await Promise.all(queries);
  return results.map((rows) => Number(rows[0]?.count ?? -1));
};

export const requireLockedRow = (rows: readonly unknown[]): void => {
  if (rows.length !== 1) throw new Error("native_fk_race_fixture_missing");
};

const makeContext = (): RaceContext => {
  const scope = randomUUID().replaceAll("-", "");
  return {
    rootId: randomUUID(),
    referenceId: randomUUID(),
    ownerId: randomUUID(),
    auxiliaryId: randomUUID(),
    actionId: randomUUID(),
    termId: randomUUID(),
    revisionId: randomUUID(),
    actorId: randomUUID(),
    scope,
    rootSlug: `race-${scope}`,
    nextSlug: `race-next-${scope}`,
  };
};

const ownedIds = (context: RaceContext): Uuid[] => [
  context.rootId,
  context.referenceId,
  context.ownerId,
  context.auxiliaryId,
  context.actionId,
  context.termId,
  context.revisionId,
  context.actorId,
];

const requireDatabaseUrl = (): string => {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("native_fk_race_database_url_missing");
  return value;
};

const settleOperation = (operation: Promise<unknown>): Promise<OperationOutcome> =>
  operation.then(
    (value) => ({ ok: true, value }),
    (error: unknown) => ({ ok: false, error })
  );

const normalizeStatement = (value: string): string =>
  value.trim().replaceAll(/\s+/g, " ").toLowerCase();

const waitForLockProof = async (
  inspector: SqlClient,
  holderPid: number,
  waiterTable: string,
  waiterLockClause: "for update" | "for key share"
): Promise<LockProof> => {
  type ProofRow = {
    waiter_pid: number;
    statement: string;
    wait_event_type: string;
    blocking_pids: number[];
    waiting_mode: string;
    blocker_mode: string;
    blocker_pid: number;
  };
  for (let attempt = 0; attempt < LOCK_PROOF_ATTEMPTS; attempt += 1) {
    const rows = await inspector<ProofRow[]>`
      select waiter.pid::int as waiter_pid, waiter.query as statement,
        waiter.wait_event_type, pg_blocking_pids(waiter.pid)::int[] as blocking_pids,
        waiting_lock.mode as waiting_mode, blocker_lock.mode as blocker_mode,
        blocker_lock.pid::int as blocker_pid
      from pg_stat_activity as waiter
      join pg_locks as waiting_lock on waiting_lock.pid = waiter.pid
        and waiting_lock.locktype = 'transactionid' and waiting_lock.granted = false
      join pg_locks as blocker_lock on blocker_lock.pid = ${holderPid}
        and blocker_lock.locktype = 'transactionid' and blocker_lock.granted = true
        and blocker_lock.transactionid = waiting_lock.transactionid
      where waiter.datname = current_database() and waiter.wait_event_type = 'Lock'
        and ${holderPid} = any(pg_blocking_pids(waiter.pid))
    `;
    const proof = rows.find((row) => {
      const statement = normalizeStatement(row.statement);
      return (
        row.blocker_pid === holderPid &&
        row.waiter_pid !== holderPid &&
        row.wait_event_type === "Lock" &&
        row.blocking_pids.includes(holderPid) &&
        statement.includes(`from "${waiterTable}"`) &&
        statement.includes(waiterLockClause)
      );
    });
    if (proof) {
      return {
        holderPid,
        waiterPid: proof.waiter_pid,
        waitingMode: proof.waiting_mode,
        blockerMode: proof.blocker_mode,
      };
    }
  }
  throw new Error("native_fk_race_lock_proof_missing");
};

const assertCauseFreeError = (value: unknown, code: string): void => {
  expect(value).toBeInstanceOf(Error);
  const error = value as Error;
  expect(error.message).toBe(code);
  expect(error.cause).toBeUndefined();
};

const assertNoAuditEffect = async (client: SqlClient, context: RaceContext): Promise<void> => {
  const [row] = await client<{ count: number }[]>`
    select count(*)::int as count from audit_logs
    where actor_id = ${context.actorId}::uuid or target_id in (
      ${context.rootId}, ${context.referenceId}, ${context.ownerId},
      ${context.auxiliaryId}, ${context.actionId}, ${context.termId}
    )
  `;
  expect(row?.count).toBe(0);
};

const restorePriorRoutes = async (client: SqlClient, context: RaceContext): Promise<void> => {
  if (context.priorRoutes === undefined) return;
  if (!context.priorRoutes.present) {
    await client`delete from settings where key = 'site.contentRoutes'`;
    return;
  }
  await client`
    insert into settings (key, value, updated_at)
    values ('site.contentRoutes', ${client.json(context.priorRoutes.value as PostgresJsonValue)}, ${context.priorRoutes.updatedAt})
    on conflict (key) do update
    set value = excluded.value, updated_at = excluded.updated_at
  `;
};

const cleanupOwnedRows = async (client: SqlClient, context: RaceContext): Promise<void> => {
  const ids = ownedIds(context);
  const failures: unknown[] = [];
  const cleanup = async (operation: () => Promise<unknown>): Promise<void> => {
    try {
      await operation();
    } catch (error) {
      failures.push(error);
    }
  };
  const operations: Array<() => Promise<unknown>> = [
    () =>
      client`delete from custom_screen_entry_presentation_overrides where screen_id = any(${client.array(ids)}::uuid[]) or entry_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from content_term_assignments where entry_id = any(${client.array(ids)}::uuid[]) or term_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from form_action_runs where id = any(${client.array(ids)}::uuid[]) or form_id = any(${client.array(ids)}::uuid[]) or action_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from form_submissions where id = any(${client.array(ids)}::uuid[]) or form_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from form_actions where id = any(${client.array(ids)}::uuid[]) or form_id = any(${client.array(ids)}::uuid[])`,
    () => client`delete from form_fields where form_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from menu_items where id = any(${client.array(ids)}::uuid[]) or menu_id = any(${client.array(ids)}::uuid[]) or page_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from theme_routes where id = any(${client.array(ids)}::uuid[]) or profile_id = any(${client.array(ids)}::uuid[]) or page_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from detail_page_revisions where detail_page_id = any(${client.array(ids)}::uuid[])`,
    () => client`delete from content_revisions where entry_id = any(${client.array(ids)}::uuid[])`,
    () => client`delete from page_revisions where page_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from detail_page_documents where id = any(${client.array(ids)}::uuid[]) or content_type_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from custom_screens where id = any(${client.array(ids)}::uuid[]) or content_type_id = any(${client.array(ids)}::uuid[])`,
    () => client`delete from listing_queries where id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from content_terms where id = any(${client.array(ids)}::uuid[]) or taxonomy_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from content_taxonomies where id = any(${client.array(ids)}::uuid[]) or type_id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from content_entries where id = any(${client.array(ids)}::uuid[]) or type_id = any(${client.array(ids)}::uuid[])`,
    () => client`delete from menus where id = any(${client.array(ids)}::uuid[])`,
    () => client`delete from theme_profiles where id = any(${client.array(ids)}::uuid[])`,
    () => client`delete from forms where id = any(${client.array(ids)}::uuid[])`,
    () => client`delete from pages where id = any(${client.array(ids)}::uuid[])`,
    () => restorePriorRoutes(client, context),
    () => client`delete from content_types where id = any(${client.array(ids)}::uuid[])`,
    () =>
      client`delete from audit_logs where actor_id = any(${client.array(ids)}::uuid[]) or target_id = any(${client.array(ids)}::text[])`,
  ];
  for (const operation of operations) await cleanup(operation);
  if (failures.length > 0) throw new AggregateError(failures, "native_fk_race_cleanup_failed");
};

const verifyOwnedCleanup = async (client: SqlClient, context: RaceContext): Promise<void> => {
  const ids = ownedIds(context);
  const [remaining] = await client<{ present: boolean }[]>`
    select (
      exists(select 1 from pages where id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from forms where id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from content_types where id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from content_entries where id = any(${client.array(ids)}::uuid[]) or type_id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from custom_screens where id = any(${client.array(ids)}::uuid[]) or content_type_id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from content_taxonomies where id = any(${client.array(ids)}::uuid[]) or type_id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from detail_page_documents where id = any(${client.array(ids)}::uuid[]) or content_type_id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from listing_queries where id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from menu_items where id = any(${client.array(ids)}::uuid[]) or menu_id = any(${client.array(ids)}::uuid[]) or page_id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from theme_routes where id = any(${client.array(ids)}::uuid[]) or profile_id = any(${client.array(ids)}::uuid[]) or page_id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from form_submissions where id = any(${client.array(ids)}::uuid[]) or form_id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from form_action_runs where id = any(${client.array(ids)}::uuid[]) or form_id = any(${client.array(ids)}::uuid[]) or action_id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from content_term_assignments where entry_id = any(${client.array(ids)}::uuid[]) or term_id = any(${client.array(ids)}::uuid[])) or
      exists(select 1 from custom_screen_entry_presentation_overrides where entry_id = any(${client.array(ids)}::uuid[]) or screen_id = any(${client.array(ids)}::uuid[]))
    ) as present
  `;
  if (remaining?.present) throw new Error("native_fk_race_cleanup_failed");
  if (context.priorRoutes !== undefined) {
    const [row] = await client<{ value: unknown; updated_at: Date }[]>`
      select value, updated_at from settings where key = 'site.contentRoutes'
    `;
    const restored = row
      ? { present: true as const, value: row.value, updatedAt: row.updated_at }
      : { present: false as const };
    if (!isDeepStrictEqual(restored, context.priorRoutes)) {
      throw new Error("native_fk_race_settings_cleanup_failed");
    }
  }
  const [marker] = await client<{ count: number }[]>`
    select count(*)::int as count from solution_kit_install_runs
    where options ? 'nativeCmsWriterFenceV1'
  `;
  expect(marker?.count).toBe(0);
};

export const runRace = async (
  descriptor: RaceDescriptor,
  direction: Direction
): Promise<LockProof> => {
  const context = makeContext();
  const databaseUrl = requireDatabaseUrl();
  const admin = postgres(databaseUrl, { max: 1 });
  const holderClient = postgres(databaseUrl, { max: 1 });
  const inspector = postgres(databaseUrl, { max: 1 });
  let holder: ReservedSql | null = null;
  let transactionOpen = false;
  let operation: Promise<OperationOutcome> | null = null;
  let proof: LockProof | null = null;
  let primaryError: unknown = null;
  const cleanupErrors: unknown[] = [];
  const cacheKey = buildSiteCacheKey(`race-${context.scope}`, `/${descriptor.label}`);

  try {
    await descriptor.setup(admin, context);
    configureSiteCache(300);
    setSiteCacheEntry(cacheKey, "native-fk-race-sentinel", 300);
    holder = await holderClient.reserve();
    await holder`begin`;
    transactionOpen = true;
    const [pidRow] = await holder<{ pid: number }[]>`select pg_backend_pid()::int as pid`;
    if (!pidRow || !Number.isSafeInteger(pidRow.pid)) {
      throw new Error("native_fk_race_holder_pid_invalid");
    }
    if (direction === "writer-first") {
      await descriptor.lockAndWriteReference(holder, context);
    } else {
      await descriptor.lockAndDeleteOrRename(holder, context);
    }
    operation = settleOperation(
      Promise.resolve().then(() =>
        direction === "writer-first"
          ? descriptor.runGuardedMutation(context)
          : descriptor.runReferenceWriter(context)
      )
    );
    proof = await waitForLockProof(
      inspector,
      pidRow.pid,
      descriptor.waiterTable,
      direction === "writer-first" ? "for update" : "for key share"
    );
    await holder`commit`;
    transactionOpen = false;
    const outcome = await operation;
    if (outcome.ok) {
      throw new Error(
        `native_fk_race_operation_unexpectedly_succeeded:${descriptor.label}:${direction}`
      );
    }
    assertCauseFreeError(
      outcome.error,
      direction === "writer-first" ? descriptor.guardedError : descriptor.writerError
    );
    const finalState = await descriptor.readState(admin, context);
    expect(finalState).toEqual(
      direction === "writer-first" ? descriptor.writerFirstState : descriptor.deleteFirstState
    );
    expect(getSiteCacheEntry(cacheKey)).toBe("native-fk-race-sentinel");
    await assertNoAuditEffect(admin, context);
  } catch (error) {
    primaryError = error;
  }

  if (transactionOpen && holder) {
    try {
      await holder`rollback`;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (operation) {
    try {
      await operation;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (holder) {
    try {
      await holder.release();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  for (const client of [holderClient, inspector]) {
    try {
      await client.end();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  try {
    await cleanupOwnedRows(admin, context);
    await verifyOwnedCleanup(admin, context);
  } catch (error) {
    cleanupErrors.push(error);
  }
  clearSiteCache();
  try {
    await admin.end();
  } catch (error) {
    cleanupErrors.push(error);
  }

  if (primaryError || cleanupErrors.length > 0 || !proof) {
    throw new AggregateError(
      [...(primaryError ? [primaryError] : []), ...cleanupErrors],
      "native_fk_race_failed"
    );
  }
  return proof;
};
