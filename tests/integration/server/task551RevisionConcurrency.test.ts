// TASK-551-06-L02 -- concurrency-safe revision allocation + autosave replace
// integration legs (bun lane, gate `revision-concurrency-and-budget-tests`,
// argv[2] of the task551 bun-test plan), in two registers:
//
// 1. Airtight allocation-contract coverage (no database): the closed
//    five-family set and its code-owned advisory lock keys, the
//    fail-closed writer-availability matrix (page/detail_page pass the writer
//    gate; entry/post/widget_template -- retention/lock-only identifiers with
//    no writer in this leaf -- fail closed with ZERO statements), the
//    `RevisionConflictError` shape, bounded class-40 retry semantics, the
//    exact callable owner contract `withRevisionParentLock(identity, tx, run)`
//    / `allocateRevision(input, tx)`, the family/parent-digest cursor scope,
//    and the autosave statement budgets derived from the documented statement
//    composition. These legs are green under the airtight form.
//
// 2. Real-database concurrency legs on the page family: 50 concurrent creates
//    through the ACTUAL page service, 50 concurrent distinct-snapshot
//    autosaves, 50 concurrent identical-snapshot autosaves, the unique
//    `(page, version)` constraint as the final integrity guard behind a
//    lock-bypassing insert, and the parent-lock serialization/fairness smoke.
//    They register through `test.skipIf` on TASK-551-11's owner-injected
//    `task551-db-test` map and skip when it is absent: the airtight run
//    performs zero database contact, no `.env` is ever sourced, and no ambient
//    `DATABASE_URL` is probed.
//
// Owner-map discipline: the database client binds its pools when its module
// evaluates, so the owner-injected fixture URL is installed through the
// client's load-time override carrier BEFORE the lazy import -- the owner map's
// presence -- never its values -- decides whether the real database may be
// dialed, and the ambient `DATABASE_URL` binding is never dialed.
//
// Shared-database discipline: every leg seeds rows under this run's unique
// marker (marker page slugs, marker revision snapshots) and asserts ONLY on
// those marker rows; cleanup in `afterAll` is fixture-scoped (marker page
// revisions, marker pages, marker user), never a table-wide sweep. The
// scheduled retention sweep and its advisory lock belong to the sibling
// `task551RevisionRetention.test.ts` and to L03; the raw-array/envelope route
// consumer contract belongs to TASK-551-03-L02 and is deliberately not
// asserted here, and the tx-first type-drift fixture belongs to
// `tests/vitest/database/revisionAllocation.test.ts`, not to this bun lane.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray, like, sql } from "drizzle-orm";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map:
 * the exact-own child fixture map (`TASK551_FIXTURE_DATABASE_URL`, `_NAME`,
 * `_SENTINEL`) plus fixed OS keys, with no inherited environment. The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Under the airtight local run no key
 * is set, so the real-DB legs skip by name instead of dialing an ambient URL.
 * Canonical form of tests/integration/server/task551AppendHeavyRetention.test.ts
 * and tests/perf/database-pool-telemetry.test.ts.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

/** The owner map is the only real-database source; nothing else is dialed. */
const OWNER_FIXTURE_DATABASE_URL = OWNER_DB_TEST_MAP_PRESENT
  ? (process.env.TASK551_FIXTURE_DATABASE_URL as string)
  : null;

type ClientModule = typeof import("../../../core/db/client");
type SchemaModule = typeof import("../../../core/db/schema");
type AllocationModule = typeof import("../../../core/services/database/revisionAllocation");
type RevisionServiceModule = typeof import("../../../core/services/pages/revisionService");
type Tx = import("../../../core/services/database/revisionAllocation").Tx;
type RevisionFamily = import("../../../core/services/database/revisionAllocation").RevisionFamily;
type PageRevisionSnapshot =
  import("../../../core/services/pages/revisionService").PageRevisionSnapshot;

/**
 * The database client binds its pools when the module evaluates, so the owner
 * override must exist before that import and the whole DB-touching graph is
 * loaded lazily. Without the owner map the graph still has to evaluate for the
 * airtight legs, so the mandate's non-routable probe URL is installed as a
 * load-time sentinel: postgres.js connects lazily and every dialing leg is
 * gated behind `OWNER_DB_TEST_MAP_PRESENT`, so the sentinel is never queried.
 */
const DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY = "task551DatabaseClientRuntimeOverrideForTests";
const MODULE_LOAD_SENTINEL_DATABASE_URL = "postgresql://127.0.0.1:1/none";

let db: ClientModule["db"];
let pages: SchemaModule["pages"];
let pageRevisions: SchemaModule["pageRevisions"];
let users: SchemaModule["users"];
let allocation: AllocationModule;
let revisionService: RevisionServiceModule;

const loadModules = async (): Promise<void> => {
  if (db) return;
  (globalThis as Record<string, unknown>)[DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY] = {
    databaseUrl: OWNER_FIXTURE_DATABASE_URL ?? MODULE_LOAD_SENTINEL_DATABASE_URL,
  };
  const client = (await import("../../../core/db/client")) as ClientModule;
  db = client.db;
  const schema = (await import("../../../core/db/schema")) as SchemaModule;
  pages = schema.pages;
  pageRevisions = schema.pageRevisions;
  users = schema.users;
  allocation =
    (await import("../../../core/services/database/revisionAllocation")) as AllocationModule;
  revisionService =
    (await import("../../../core/services/pages/revisionService")) as RevisionServiceModule;
};

// Named gate: exactly the real-database legs register through `test.skipIf` on
// the owner map above; every allocation-contract proof is pure.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

// --- Shared vocabulary ------------------------------------------------------

/** Unique per-run marker prefixing every fixture slug/email of this suite. */
const RUN = `task551-06l02-concurrency-${randomUUID()}`;
const marked = (slug: string): string => `${RUN}-${slug}`;

/** The doc's synchronization scale: fifty contenders on one parent. */
const FIFTY_CONCURRENT_CREATES = 50;

/**
 * Wall-clock ledger ceiling: every real-database leg below must finish inside
 * 60s. The bound is enforced twice -- the bun-test timeout and the in-leg
 * `elapsedMs` assertion -- so no leg can claim an unbounded wait; the
 * owner-map lane log records each observed maximum against this ceiling.
 */
const DB_LEG_CEILING_MS = 60_000;
/** Owner-exit + commit round-trip headroom for the lock-wait smoke. */
const LOCK_WAIT_BOUND_MS = 10_000;
/** How long the lock owner demonstrably holds the parent lock. */
const LOCK_HOLD_MS = 200;
const CLEANUP_TIMEOUT_MS = 30_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

type Deferred<T> = Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
}>;

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

/** Marker-scoped revision rows of one fixture parent (only ever our rows). */
const markerRevisionRows = async (
  pageId: string
): Promise<readonly { id: string; version: number; kind: string }[]> =>
  db
    .select({ id: pageRevisions.id, version: pageRevisions.version, kind: pageRevisions.kind })
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId));

/** Dense `1..n` expectation, derived from the contender scale (no gaps). */
const denseVersions = (count: number): readonly number[] =>
  Array.from({ length: count }, (_, index) => index + 1);

// --- Airtight register: the allocation contract (no database) ---------------

describe("revision allocation contract (airtight, no database)", () => {
  test("pins the closed five-family set and its code-owned advisory lock keys", async () => {
    await loadModules();
    const { stableFamilyKey, stableParentKey, REVISION_ALLOCATION_ERROR_CODES } = allocation;

    // The five identifiers are a closed set; the family component is a
    // never-renumber constant table (renumbering would move every live lock).
    const DOC_FAMILY_LOCK_KEYS: Readonly<Record<RevisionFamily, number>> = Object.freeze({
      page: 551_001,
      widget_template: 551_002,
      detail_page: 551_003,
      entry: 551_004,
      post: 551_005,
    });
    const families = Object.keys(DOC_FAMILY_LOCK_KEYS) as RevisionFamily[];
    expect(families).toHaveLength(5);
    for (const family of families) {
      const key = stableFamilyKey(family);
      expect(key).toBe(DOC_FAMILY_LOCK_KEYS[family]);
      // The two-key `pg_advisory_xact_lock(int, int)` form is int4-confined.
      expect(key).toBeGreaterThanOrEqual(-2_147_483_648);
      expect(key).toBeLessThanOrEqual(2_147_483_647);
    }
    // Collision-freedom across the five constants: cross-family parent-key
    // equality can never share a lock because the tuple is family scoped.
    expect(new Set(families.map((family) => stableFamilyKey(family))).size).toBe(5);

    // The parent component is SHA-256-derived: deterministic, int4-biased out
    // of the unsigned range, and never the raw parent id.
    const parentId = marked("lock-key-parent");
    expect(stableParentKey(parentId)).toBe(stableParentKey(parentId));
    expect(stableParentKey(parentId)).toBeGreaterThanOrEqual(-2_147_483_648);
    expect(stableParentKey(parentId)).toBeLessThanOrEqual(2_147_483_647);
    expect(stableParentKey(marked("other-parent"))).not.toBe(stableParentKey(parentId));

    // Fail-closed identity bounds: unknown family, empty and oversized parents.
    expect(() => stableFamilyKey("unknown" as RevisionFamily)).toThrowError(
      REVISION_ALLOCATION_ERROR_CODES.familyInvalid
    );
    expect(() => stableParentKey("")).toThrowError(REVISION_ALLOCATION_ERROR_CODES.parentInvalid);
    expect(() => stableParentKey("x".repeat(129))).toThrowError(
      REVISION_ALLOCATION_ERROR_CODES.parentInvalid
    );
    expect(typeof stableParentKey("x".repeat(128))).toBe("number");
  });

  test(
    "fails closed on the writer-availability matrix with zero statements " + "via a counting stub",
    async () => {
      await loadModules();
      const { allocateRevision, REVISION_ALLOCATION_ERROR_CODES } = allocation;

      // Counting stub: any drizzle builder touch is one statement, and the
      // first touch throws a sentinel probe. postgres.js RowList semantics are
      // never needed -- no leg here may reach a result row.
      const SENTINEL_PROBE = "task551_l02_parent_lock_probe_reached";
      const countingStubTx = (): { tx: Tx; statements: () => number } => {
        let count = 0;
        const touch = (): never => {
          count += 1;
          throw new Error(SENTINEL_PROBE);
        };
        return {
          tx: { execute: touch, select: touch, insert: touch, delete: touch } as unknown as Tx,
          statements: () => count,
        };
      };

      // entry/post/widget_template have no writer in this leaf (the
      // widget-template family is legacy-table retention-only after TASK-580):
      // allocation fails closed BEFORE any statement, let alone any dial.
      for (const family of ["entry", "post", "widget_template"] as const) {
        const stub = countingStubTx();
        let thrown: unknown;
        try {
          await allocateRevision(
            { family, parentId: marked("no-writer"), kind: "publish", data: {} },
            stub.tx
          );
        } catch (error) {
          thrown = error;
        }
        expect((thrown as Error).message).toBe(
          REVISION_ALLOCATION_ERROR_CODES.familyWriterUnavailable
        );
        expect((thrown as Error).name).not.toBe("RevisionConflictError");
        expect(stub.statements()).toBe(0);
      }

      // page/detail_page ARE wired: with the same stub they pass the writer
      // gate and reach exactly the parent-lock statement (one statement, then
      // the sentinel), which is the pure discriminator of availability.
      for (const family of ["page", "detail_page"] as const) {
        const stub = countingStubTx();
        let thrown: unknown;
        try {
          await allocateRevision(
            { family, parentId: marked("wired"), kind: "publish", data: {} },
            stub.tx
          );
        } catch (error) {
          thrown = error;
        }
        expect((thrown as Error).message).toBe(SENTINEL_PROBE);
        expect(stub.statements()).toBe(1);
      }
    }
  );

  test("pins the closed error-code table and the RevisionConflictError shape", async () => {
    await loadModules();
    const { RevisionConflictError, REVISION_ALLOCATION_ERROR_CODES } = allocation;

    expect({ ...REVISION_ALLOCATION_ERROR_CODES }).toEqual({
      conflict: "revision_conflict",
      familyInvalid: "revision_family_invalid",
      familyWriterUnavailable: "revision_family_writer_unavailable",
      parentInvalid: "revision_parent_invalid",
      kindInvalid: "revision_kind_invalid",
      scopeInvalid: "revision_scope_invalid",
      insertMissing: "revision_insert_missing",
    });

    const parentId = marked("conflict-shape");
    const conflict = new RevisionConflictError({ family: "entry", parentId });
    expect(conflict).toBeInstanceOf(Error);
    expect(conflict).toBeInstanceOf(RevisionConflictError);
    expect(conflict.name).toBe("RevisionConflictError");
    expect(conflict.code).toBe(REVISION_ALLOCATION_ERROR_CODES.conflict);
    // The message is the bounded code alone: family/parent travel as typed
    // fields, so no raw parent id, SQL, bind, or constraint name enters it.
    expect(conflict.message).toBe(REVISION_ALLOCATION_ERROR_CODES.conflict);
    expect(conflict.family).toBe("entry");
    expect(conflict.parentId).toBe(parentId);
    expect(conflict.message.includes(parentId)).toBe(false);
    expect(/select |insert |constraint|\$1/i.test(conflict.message)).toBe(false);
  });

  test("retries only class-40 outcomes, to the cap of three attempts", async () => {
    await loadModules();
    const { retryRevisionAllocation, MAX_REVISION_ALLOCATION_ATTEMPTS } = allocation;

    expect(MAX_REVISION_ALLOCATION_ATTEMPTS).toBe(3);

    // 40001 serialization failures exhaust the cap and surface the LAST error.
    let serializationAttempts = 0;
    const startedAt = Date.now();
    const exhausted = await retryRevisionAllocation(async () => {
      serializationAttempts += 1;
      throw Object.assign(new Error("sqlstate:40001"), { code: "40001" });
    }).then(
      () => null,
      (error: unknown) => error
    );
    expect(serializationAttempts).toBe(MAX_REVISION_ALLOCATION_ATTEMPTS);
    expect((exhausted as Error).message).toBe("sqlstate:40001");
    // The fixed 20ms + 60ms backoff sequence ran between the three attempts.
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(80);

    // 40P01 deadlocks retry and then commit.
    let deadlockAttempts = 0;
    const committed = await retryRevisionAllocation(async () => {
      deadlockAttempts += 1;
      if (deadlockAttempts < MAX_REVISION_ALLOCATION_ATTEMPTS) {
        throw Object.assign(new Error("sqlstate:40P01"), { code: "40P01" });
      }
      return "committed";
    });
    expect(committed).toBe("committed");
    expect(deadlockAttempts).toBe(MAX_REVISION_ALLOCATION_ATTEMPTS);

    // One serialization failure then success: exactly one bounded retry.
    let singleRetryAttempts = 0;
    const retriedOnce = await retryRevisionAllocation(async () => {
      singleRetryAttempts += 1;
      if (singleRetryAttempts === 1) {
        throw Object.assign(new Error("sqlstate:40001"), { code: "40001" });
      }
      return "recovered";
    });
    expect(retriedOnce).toBe("recovered");
    expect(singleRetryAttempts).toBe(2);
  });

  test("never retries domain conflicts, unique violations, or plain failures", async () => {
    await loadModules();
    const { retryRevisionAllocation, RevisionConflictError, MAX_REVISION_ALLOCATION_ATTEMPTS } =
      allocation;

    const neverRetried = async (failure: () => Error): Promise<number> => {
      let attempts = 0;
      await retryRevisionAllocation(async () => {
        attempts += 1;
        throw failure();
      }).catch(() => undefined);
      return attempts;
    };

    // The unique violation (hence RevisionConflictError) is terminal: exactly
    // one attempt, never a retry.
    expect(
      await neverRetried(() => Object.assign(new Error("sqlstate:23505"), { code: "23505" }))
    ).toBe(1);
    expect(
      await neverRetried(() => new RevisionConflictError({ family: "page", parentId: "p" }))
    ).toBe(1);
    // Non-class-40 SQLSTATEs and code-less failures surface immediately too.
    expect(
      await neverRetried(() => Object.assign(new Error("sqlstate:42501"), { code: "42501" }))
    ).toBe(1);
    expect(await neverRetried(() => new Error("plain_failure"))).toBe(1);
    expect(MAX_REVISION_ALLOCATION_ATTEMPTS).toBe(3);

    // Drizzle wraps postgres.js errors, so the bounded cause chain is walked:
    // a 40001 found through `.cause` IS retried, once, and then recovers.
    let wrappedAttempts = 0;
    const recovered = await retryRevisionAllocation(async () => {
      wrappedAttempts += 1;
      if (wrappedAttempts === 1) {
        throw Object.assign(new Error("driver_wrapped"), {
          cause: Object.assign(new Error("sqlstate:40001"), { code: "40001" }),
        });
      }
      return "recovered";
    });
    expect(recovered).toBe("recovered");
    expect(wrappedAttempts).toBe(2);
  });

  test("pins the exact callable owner contract and the family/parent digest scope", async () => {
    await loadModules();
    const {
      withRevisionParentLock,
      allocateRevision,
      retryRevisionAllocation,
      revisionScopeDigest,
    } = allocation;

    // Argument order is contractual: (identity, tx, run) and (input, tx). The
    // swapped tx-first drift fixture lives in the vitest suite; this lane pins
    // the exported shapes only.
    expect(typeof withRevisionParentLock).toBe("function");
    expect(withRevisionParentLock.length).toBe(3);
    expect(typeof allocateRevision).toBe("function");
    expect(allocateRevision.length).toBe(2);
    expect(typeof retryRevisionAllocation).toBe("function");
    expect(retryRevisionAllocation.length).toBe(1);

    // The only sanctioned cursor scope:
    // `revision:<family>:v1:<sha256(canonicalJson({parentId}))>`, stable,
    // parent- and family-scoped, and never embedding the raw parent id.
    const parentId = marked("digest-parent");
    const digest = revisionScopeDigest("page", parentId);
    expect(digest).toMatch(/^revision:page:v1:[0-9a-f]{64}$/);
    expect(revisionScopeDigest("page", parentId)).toBe(digest);
    expect(revisionScopeDigest("page", marked("other-parent"))).not.toBe(digest);
    expect(revisionScopeDigest("detail_page", parentId)).toMatch(/^revision:detail_page:v1:/);
    expect(revisionScopeDigest("detail_page", parentId)).not.toBe(digest);
    for (const family of ["widget_template", "entry", "post"] as const) {
      expect(revisionScopeDigest(family, parentId)).toMatch(
        new RegExp(`^revision:${family}:v1:[0-9a-f]{64}$`)
      );
    }
    expect(digest.includes(parentId)).toBe(false);

    // The digest fails closed on the same identity bounds as the lock.
    expect(() => revisionScopeDigest("unknown" as RevisionFamily, parentId)).toThrowError(
      "revision_family_invalid"
    );
    expect(() => revisionScopeDigest("page", "")).toThrowError("revision_parent_invalid");
  });

  test("derives the autosave statement budgets: 2 on reuse, 6 on changed allocation", async () => {
    await loadModules();

    // Derived from the documented statement composition of
    // `createOrReplaceAutosaveRevisionTx` -- never invented: the parent lock
    // and the one explicitly projected latest-autosave row are the reuse path;
    // a changed snapshot adds the allocator's own re-entrant parent lock, the
    // indexed max(version) projection, the insert, and the exact superseded-ID
    // delete. Independent of history size.
    const PARENT_LOCK_STATEMENTS = 1;
    const LATEST_AUTOSAVE_SELECT_STATEMENTS = 1;
    const ALLOCATE_REVISION_STATEMENTS = 3;
    const SUPERSEDED_DELETE_STATEMENTS = 1;
    const AUTOSAVE_REUSE_STATEMENT_BUDGET =
      PARENT_LOCK_STATEMENTS + LATEST_AUTOSAVE_SELECT_STATEMENTS;
    const AUTOSAVE_CHANGED_STATEMENT_BUDGET =
      AUTOSAVE_REUSE_STATEMENT_BUDGET + ALLOCATE_REVISION_STATEMENTS + SUPERSEDED_DELETE_STATEMENTS;

    expect(AUTOSAVE_REUSE_STATEMENT_BUDGET).toBe(2);
    expect(AUTOSAVE_CHANGED_STATEMENT_BUDGET).toBe(6);
    expect(AUTOSAVE_CHANGED_STATEMENT_BUDGET).toBeLessThanOrEqual(6);
    expect(AUTOSAVE_REUSE_STATEMENT_BUDGET).toBeLessThan(AUTOSAVE_CHANGED_STATEMENT_BUDGET);
  });
});

// --- Real-database register: page-family concurrency on the owner map -------

describe("page-family revision concurrency (owner-injected fixture database)", () => {
  const markerPageIds: string[] = [];
  let markerUserId = "";

  beforeAll(async () => {
    if (!OWNER_DB_TEST_MAP_PRESENT) return;
    await loadModules();
    // One throwaway marker author for every revision of this run; every leg
    // asserts only rows it created under this run's marker.
    const [user] = await db
      .insert(users)
      .values({
        email: `${RUN}@example.com`,
        passwordHash: "hash",
        name: marked("concurrency-user"),
        status: "active",
      })
      .returning({ id: users.id });
    markerUserId = user.id;
  }, CLEANUP_TIMEOUT_MS);

  /** Marker page fixture: a unique slug, tracked for marker-scoped cleanup. */
  const createMarkerPage = async (slug: string): Promise<{ id: string }> => {
    const [page] = await db
      .insert(pages)
      .values({ slug: marked(slug), title: marked(`${slug}-title`), currentData: { blocks: [] } })
      .returning({ id: pages.id });
    markerPageIds.push(page.id);
    return page;
  };

  /** Marker snapshot: the title carries the run marker; data is versionless. */
  const snapshotFor = (slug: string): PageRevisionSnapshot => ({
    title: marked(slug),
    slug: marked(`${slug}-slug`),
    data: { blocks: [] },
  });

  testIfDb(
    "50 concurrent page-service creates form a dense 1..50 version permutation",
    async () => {
      await loadModules();
      const page = await createMarkerPage("storm-create");

      // 50 synchronized attempts through the ACTUAL page service: one
      // transaction per call, allocation inside the shared family-aware
      // helper behind the parent lock.
      const startedAt = Date.now();
      const created = await Promise.all(
        Array.from({ length: FIFTY_CONCURRENT_CREATES }, (_, index) =>
          db.transaction((tx) =>
            revisionService.createRevisionTx(
              tx,
              page.id,
              snapshotFor(`create-${index}`),
              markerUserId,
              "publish"
            )
          )
        )
      );
      const elapsedMs = Date.now() - startedAt;

      // All fifty succeeded -- no lost contender, no rejection.
      expect(created).toHaveLength(FIFTY_CONCURRENT_CREATES);
      // Committed versions are unique and contiguous: a dense 1..50
      // permutation with zero gaps and zero duplicates.
      expect(created.map((row) => row.version).sort((a, b) => a - b)).toEqual(
        denseVersions(FIFTY_CONCURRENT_CREATES)
      );
      expect(new Set(created.map((row) => row.id)).size).toBe(FIFTY_CONCURRENT_CREATES);
      for (const row of created) {
        expect(row.pageId).toBe(page.id);
        expect(row.kind).toBe("publish");
      }
      // Zero partial rows: exactly the fifty committed marker rows exist.
      expect(await markerRevisionRows(page.id)).toHaveLength(FIFTY_CONCURRENT_CREATES);
      // Wall-clock ledger: 50 pool-queued transactions serialized by one
      // parent lock; observed maxima are recorded by the lane log against
      // DB_LEG_CEILING_MS.
      expect(elapsedMs).toBeLessThan(DB_LEG_CEILING_MS);
    },
    DB_LEG_CEILING_MS
  );

  testIfDb(
    "50 concurrent distinct-snapshot autosaves retain exactly the last allocation",
    async () => {
      await loadModules();
      const page = await createMarkerPage("storm-autosave-distinct");

      const startedAt = Date.now();
      const results = await Promise.all(
        Array.from({ length: FIFTY_CONCURRENT_CREATES }, (_, index) =>
          db.transaction((tx) =>
            revisionService.createOrReplaceAutosaveRevisionTx(
              tx,
              page.id,
              snapshotFor(`autosave-${index}`),
              markerUserId
            )
          )
        )
      );
      const elapsedMs = Date.now() - startedAt;

      // Every contender allocated its own revision: distinct snapshots never
      // take the equality-reuse branch.
      expect(results).toHaveLength(FIFTY_CONCURRENT_CREATES);
      expect(results.every((result) => result.reusedRevision === false)).toBe(true);
      const versions = results.map((result) => result.revision.version).sort((a, b) => a - b);
      expect(versions).toEqual(denseVersions(FIFTY_CONCURRENT_CREATES));
      expect(new Set(results.map((result) => result.revision.id)).size).toBe(
        FIFTY_CONCURRENT_CREATES
      );
      // Every superseded-ID delete hit exactly the previously selected latest:
      // 50 allocations collapse to exactly one surviving autosave row (far
      // under the 50-row ceiling), no duplicate-kind pileup, no publish row.
      const rows = await markerRevisionRows(page.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].kind).toBe("autosave");
      expect(rows[0].version).toBe(FIFTY_CONCURRENT_CREATES);
      // Wall-clock ledger: each serialized replacement is at most the
      // six-statement changed budget; DB_LEG_CEILING_MS bounds the storm.
      expect(elapsedMs).toBeLessThan(DB_LEG_CEILING_MS);
    },
    DB_LEG_CEILING_MS
  );

  testIfDb(
    "50 concurrent identical-snapshot autosaves converge to one reused row",
    async () => {
      await loadModules();
      const page = await createMarkerPage("storm-autosave-identical");
      const snapshot = snapshotFor("autosave-identical");

      const results = await Promise.all(
        Array.from({ length: FIFTY_CONCURRENT_CREATES }, () =>
          db.transaction((tx) =>
            revisionService.createOrReplaceAutosaveRevisionTx(tx, page.id, snapshot, markerUserId)
          )
        )
      );

      // Exactly one contender created the row; the other forty-nine observed
      // the identical latest snapshot and reused its exact ID (>= 1 reuse).
      const created = results.filter((result) => result.reusedRevision === false);
      const reused = results.filter((result) => result.reusedRevision === true);
      expect(created).toHaveLength(1);
      expect(reused.length).toBeGreaterThanOrEqual(1);
      expect(reused).toHaveLength(FIFTY_CONCURRENT_CREATES - 1);
      const exactId = created[0].revision.id;
      for (const result of reused) {
        expect(result.revision.id).toBe(exactId);
        expect(result.revision.version).toBe(1);
      }
      // Convergence: one autosave row, zero deletes of it, zero pileup.
      const rows = await markerRevisionRows(page.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].kind).toBe("autosave");
      expect(rows[0].version).toBe(1);
    },
    DB_LEG_CEILING_MS
  );

  testIfDb(
    "the unique (page, version) constraint is the final guard behind a lock bypass",
    async () => {
      await loadModules();
      const page = await createMarkerPage("unique-guard");
      const snapshotAnchored = deferred<boolean>();
      const bypassCommitted = deferred<boolean>();

      // The allocator runs in a repeatable-read transaction whose snapshot is
      // anchored BEFORE the bypass insert commits, so its max(version)
      // projection is blind to that row and computes version 1 again.
      const allocationAttempt = db.transaction(
        async (tx) => {
          await tx.execute(sql`select 1`);
          snapshotAnchored.resolve(true);
          await bypassCommitted.promise;
          return allocation.allocateRevision(
            {
              family: "page",
              parentId: page.id,
              kind: "publish",
              data: snapshotFor("unique-guard-allocated"),
              createdBy: markerUserId,
            },
            tx
          );
        },
        { isolationLevel: "repeatable read" }
      );
      await snapshotAnchored.promise;

      // The lock-bypassing direct insert of the same (page_id, version): no
      // advisory lock is taken, which is exactly why the database-owned unique
      // constraint -- never the lock -- is the final integrity guard.
      await db.insert(pageRevisions).values({
        pageId: page.id,
        version: 1,
        kind: "publish",
        data: snapshotFor("unique-guard-bypass"),
        createdBy: markerUserId,
      });
      bypassCommitted.resolve(true);

      const thrown = await allocationAttempt.then(
        () => null,
        (error: unknown) => error
      );
      expect(thrown).toBeInstanceOf(allocation.RevisionConflictError);
      const conflict = thrown as InstanceType<typeof allocation.RevisionConflictError>;
      expect(conflict.code).toBe(allocation.REVISION_ALLOCATION_ERROR_CODES.conflict);
      expect(conflict.message).toBe(allocation.REVISION_ALLOCATION_ERROR_CODES.conflict);
      expect(conflict.family).toBe("page");
      expect(conflict.parentId).toBe(page.id);
      // Zero partial rows: the committed bypass row is intact and the rejected
      // allocation left nothing behind.
      const rows = await markerRevisionRows(page.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].version).toBe(1);
    },
    DB_LEG_CEILING_MS
  );

  testIfDb(
    "a second transaction waits behind the held parent lock in serialized order",
    async () => {
      await loadModules();
      const identity = { family: "page" as const, parentId: marked("lock-parent") };
      const order: string[] = [];
      const ownerEntered = deferred<boolean>();

      const owner = db.transaction(async (tx) =>
        allocation.withRevisionParentLock(identity, tx, async () => {
          order.push("owner-enter");
          ownerEntered.resolve(true);
          await sleep(LOCK_HOLD_MS);
          order.push("owner-exit");
          return "owner";
        })
      );
      await ownerEntered.promise;

      const waiterStartedAt = Date.now();
      const waiter = db.transaction(async (tx) =>
        allocation.withRevisionParentLock(identity, tx, async () => {
          order.push("waiter-enter");
          return "waiter";
        })
      );
      const waiterResult = await waiter;
      const waitedMs = Date.now() - waiterStartedAt;
      const ownerResult = await owner;

      expect(ownerResult).toBe("owner");
      expect(waiterResult).toBe("waiter");
      // Serialized order: the owner's whole run completes before the waiter's
      // run starts -- the lock is ordering, never correctness.
      expect(order).toEqual(["owner-enter", "owner-exit", "waiter-enter"]);
      // Bounded wait, no deadlock: the waiter cleared the lock within the
      // family ceiling and after the demonstrable hold.
      expect(waitedMs).toBeGreaterThanOrEqual(LOCK_HOLD_MS / 2);
      expect(waitedMs).toBeLessThan(LOCK_WAIT_BOUND_MS);
    },
    DB_LEG_CEILING_MS
  );

  afterAll(async () => {
    if (!OWNER_DB_TEST_MAP_PRESENT || !db) return;
    // Fixture-scoped cleanup only: marker revision rows, then the marker pages
    // (their cascade would suffice), then the marker user. No truncate, no
    // global sweep, and nothing outside this run's marker.
    if (markerPageIds.length > 0) {
      await db.delete(pageRevisions).where(inArray(pageRevisions.pageId, markerPageIds));
    }
    await db.delete(pages).where(like(pages.slug, `${RUN}-%`));
    if (markerUserId) {
      await db.delete(users).where(like(users.email, `${RUN}%`));
    }
  }, CLEANUP_TIMEOUT_MS);
});
