/**
 * TASK-551-06-L02 revision budget surface (bun lane), pure-modules only: the
 * bounded page revision list (default 50 / cap 100, `LIMIT + 1` = at most 101
 * DB rows, at most 100 items, at most 2 SQL statements -- implemented in one),
 * the autosave replace budgets (exactly 2 statements on equality reuse, at most
 * 6 on a changed allocation, independent of history size), L01's batch bounds
 * as the retention leaf inherits them (batch 500 / hard max 2,000; batches 10 /
 * max 100; never more than 2,000 deletes per batch), the frozen `2036-01-01`
 * cutoff semantics (strict `<`, boundary row retained), and the 100,000-row
 * scale-profile arithmetic of the five revision families in TASK-551-01.
 *
 * Statement accounting is driver-accurate without a database: `toSQL()` for the
 * list, a counting stub `Tx` for the autosave flow. The three real-PostgreSQL
 * legs register through `test.skipIf` on TASK-551-11's owner-injected
 * `task551-db-test` map (the canonical presence-only gate of
 * tests/perf/database-pool-telemetry.test.ts): without that map -- i.e. under
 * the airtight run (`env DATABASE_URL='postgresql://127.0.0.1:1/none' bun
 * --env-file=/dev/null test tests/perf/database-revision-budgets.test.ts`) --
 * they skip by name rather than dial an ambient URL. No `.env` source is ever
 * loaded, no map value is read or printed (only key presence, once), the legs
 * seed only this run's marker rows, the family retention pass runs on an
 * executor scoped to this run's marker parents, and captured statement text
 * stays in memory as derived counts and limit parameters, never printed,
 * logged, or embedded in an expectation message.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, test } from "bun:test";
import { and, desc, eq, getTableName, inArray, like, lt, or, sql, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Sql } from "postgres";

import { db } from "../../core/db/client";
import { pageRevisions, pages, users } from "../../core/db/schema";
import {
  revisionScopeDigest,
  stableFamilyKey,
  type RevisionFamily,
} from "../../core/services/database/revisionAllocation";
import {
  createOrReplaceAutosaveRevisionTx,
  listRevisions,
  type Tx,
} from "../../core/services/pages/revisionService";
import {
  RETENTION_BATCH_SIZE_DEFAULT,
  RETENTION_BATCH_SIZE_MAX,
  RETENTION_MAX_BATCHES_PER_RUN_DEFAULT,
  RETENTION_MAX_BATCHES_PER_RUN_MAX,
  RetentionPolicyError,
  computeRetentionCutoff,
  isEligibleForRetentionCutoff,
  resolveRetentionBatchSize,
  resolveRetentionMaxBatchesPerRun,
  resolveRetentionRuntimeOptions,
} from "../../core/services/maintenance/retentionPolicy";
import {
  REVISION_RETENTION_DEFAULT_KEEP_NEWEST_PER_PARENT,
  REVISION_RETENTION_DEFAULT_MAX_AGE_DAYS,
  REVISION_RETENTION_FAMILY_ORDER,
  isRevisionRetentionFamily,
  normalizeRevisionRetentionPolicy,
  runRevisionFamilyRetention,
  type RevisionRetentionExecutor,
  type RevisionRetentionPolicyInput,
} from "../../core/services/content/revisionRetentionService";
import {
  TASK551_RETENTION_BATCH_PINS,
  TASK551_RETENTION_CLOCK_MS,
  TASK551_SCALE_COUNTS,
  type FixtureFamily,
  type ScaleProfile,
} from "./fixtures/task551DatabaseScale";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map,
 * transcribed from tests/perf/database-pool-telemetry.test.ts: only the map's
 * presence -- never its values -- may authorize dialing the real database.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

/** Closed failure codes of this leaf; no driver detail, URL or statement text. */
const BUDGET_TEST_CODES = {
  stubLimitNotOne: "task551_l06l02_stub_limit_not_one",
  stubLockMissing: "task551_l06l02_stub_lock_missing",
  stubTableUnexpected: "task551_l06l02_stub_table_unexpected",
  seedMissing: "task551_l06l02_seed_missing",
} as const;

/** The frozen TASK-551-01-L02 retention clock, pinned to its literal source. */
const FROZEN_CLOCK_ISO = "2036-01-01T00:00:00.000Z";
const FROZEN_NOW = new Date(TASK551_RETENTION_CLOCK_MS);
/** Suite-side ceiling for one retention batch's deletes (contract L306). */
const SUITE_MAX_DELETES_PER_BATCH = 2_000;

/** Reads one worktree source file verbatim for exact-text budget pins. */
const readSource = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const REVISION_SERVICE_SOURCE = readSource("../../core/services/pages/revisionService.ts");
const RETENTION_SERVICE_SOURCE = readSource(
  "../../core/services/content/revisionRetentionService.ts"
);

/** Inclusive-exclusive source slice between two exact source anchors. */
const sourceSlice = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error("task551_l06l02_source_anchor_missing");
  return source.slice(from, to);
};

const countOccurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

/** Reads the failure reason of a leaf policy rejection without rethrowing. */
const policyReasonOf = (attempt: () => unknown): string => {
  try {
    attempt();
  } catch (error) {
    return (error as RetentionPolicyError).reason;
  }
  return "";
};

// --- Page revision list budget (pure legs: compiled query + fail-closed input) ---

const LIST_PAGE_ID = "1f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b";

/** The list read compiled against the real tables, mirrored from `listRevisions`
 * (the source leg below pins the mirror to the body, so drift fails here). */
const compileListQuery = (limit: number, cursor: { version: number; id: string } | null) =>
  db
    .select({
      id: pageRevisions.id,
      pageId: pageRevisions.pageId,
      version: pageRevisions.version,
      kind: pageRevisions.kind,
      title: sql<string | null>`${pageRevisions.data} ->> 'title'`,
      slug: sql<string | null>`${pageRevisions.data} ->> 'slug'`,
      createdAt: pageRevisions.createdAt,
      createdById: pageRevisions.createdBy,
      authorId: users.id,
      authorName: users.name,
      authorEmail: users.email,
    })
    .from(pageRevisions)
    .leftJoin(users, eq(pageRevisions.createdBy, users.id))
    .where(
      and(
        eq(pageRevisions.pageId, LIST_PAGE_ID),
        cursor
          ? (or(
              lt(pageRevisions.version, cursor.version),
              and(eq(pageRevisions.version, cursor.version), lt(pageRevisions.id, cursor.id))
            ) ?? sql`false`)
          : undefined
      )
    )
    .orderBy(desc(pageRevisions.version), desc(pageRevisions.id))
    .limit(limit + 1)
    .toSQL();

/** The projection list of one compiled list statement, between select and from. */
const projectionOf = (statement: string): string =>
  statement.slice(statement.indexOf("select ") + "select ".length, statement.indexOf(" from "));

describe("page revision list budget (pure legs)", () => {
  test("one bounded SELECT: LIMIT + 1, keyset order, no snapshot transfer", () => {
    const compiled = compileListQuery(100, null);
    const projection = projectionOf(compiled.sql);
    expect(compiled.sql.startsWith("select ")).toBe(true);
    expect(countOccurrences(compiled.sql.toLowerCase(), "select")).toBe(1);
    expect(compiled.sql.includes(";")).toBe(false);
    expect(compiled.sql).toContain(
      'order by "page_revisions"."version" desc, "page_revisions"."id" desc limit $'
    );
    expect(compiled.sql).toContain(
      'left join "users" on "page_revisions"."created_by" = "users"."id"'
    );
    // Bounded JSON scalar extraction only: every reference to the snapshot
    // column inside the projection is a `->> ` extraction of one scalar, so
    // the full `data` document never leaves the database.
    expect(countOccurrences(projection, '"page_revisions"."data"')).toBe(2);
    expect(countOccurrences(projection, '"page_revisions"."data" ->> \'')).toBe(2);
    expect(projection).toContain('"page_revisions"."page_id"');
    expect(projection).toContain('"users"."email"');
    // LIMIT + 1 semantics: the default reads 51 rows, the cap reads 101.
    expect(compileListQuery(50, null).params.at(-1)).toBe(51);
    expect(compileListQuery(100, null).params.at(-1)).toBe(101);
    // The keyset predicate is strictly after the boundary tuple.
    const cursor = compileListQuery(100, { version: 7, id: LIST_PAGE_ID });
    expect(cursor.params.at(-1)).toBe(101);
    expect(cursor.sql).toContain('"page_revisions"."page_id" = $1 and (');
    expect(cursor.sql).toContain('"page_revisions"."version" < $2');
    expect(cursor.sql).toContain('"page_revisions"."version" = $3');
    expect(cursor.sql).toContain('"page_revisions"."id" < $4');
    expect(cursor.params.slice(0, 4)).toEqual([LIST_PAGE_ID, 7, 7, LIST_PAGE_ID]);
  });

  test("the service body pins the 50/100 limits and a single-statement list", () => {
    const source = REVISION_SERVICE_SOURCE;
    expect(source).toContain("const DEFAULT_PAGE_REVISION_LIST_LIMIT = 50;");
    expect(source).toContain("const MAX_PAGE_REVISION_LIST_LIMIT = 100;");
    const body = sourceSlice(
      source,
      "export async function listRevisions(",
      "const hasMore = rows.length > query.limit;"
    );
    expect(countOccurrences(body, "await db")).toBe(1);
    expect(body).toContain(".limit(query.limit + 1);");
    expect(body).toContain("orderBy(desc(pageRevisions.version), desc(pageRevisions.id))");
    expect(body).toContain("leftJoin(users, eq(pageRevisions.createdBy, users.id))");
    expect(body).toContain("pageRevisions.data} ->> 'title'");
    expect(body).toContain("pageRevisions.data} ->> 'slug'");
    expect(countOccurrences(body, "pageRevisions.data,")).toBe(0);
  });

  test("invalid list input fails closed before any dial (green dead URL)", async () => {
    const invalid = async (input: unknown, code: string): Promise<void> => {
      let thrown: unknown;
      try {
        await listRevisions(LIST_PAGE_ID, input as never);
      } catch (error) {
        thrown = error;
      }
      expect((thrown as Error)?.message).toBe(code);
    };
    const foreignScope = revisionScopeDigest("page", "2f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b");
    const foreignCursor = Buffer.from(
      JSON.stringify({ scope: foreignScope, version: 3, id: LIST_PAGE_ID })
    ).toString("base64url");
    for (const [input, code] of [
      [{ limit: 0 }, "page_revision_limit_invalid"],
      [{ limit: 1.5 }, "page_revision_limit_invalid"],
      [{ limit: Number.NaN }, "page_revision_limit_invalid"],
      [{ limit: "50" }, "page_revision_limit_invalid"],
      [{ unknown: true }, "page_revision_list_input_invalid"],
      ["not-an-object", "page_revision_list_input_invalid"],
      [{ cursor: "not-a-cursor" }, "page_revision_cursor_invalid"],
      // A validly encoded cursor issued for another page fails its scope check.
      [{ cursor: foreignCursor }, "page_revision_cursor_invalid"],
    ] as const) {
      await invalid(input, code);
    }
  });
});

// --- Autosave statement budgets (pure legs over a counting stub Tx) ---

const STUB_PAGE_ID = "3f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b";
const STUB_PREVIOUS_ID = "4f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b";
const STUB_CREATED_ID = "5f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b";
const STUB_USER_ID = "6f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b";
const STUB_SLUG = "task551-06l02-budgets-stub";

type StubStatementKind =
  | "parent_lock"
  | "latest_autosave_read"
  | "next_version_read"
  | "insert_revision"
  | "delete_superseded";

type StubHistory = {
  /** Newest autosave the history holds; `null` means the parent has none. */
  latest: { id: string; version: number; title: string } | null;
  /** Highest allocated version of the parent, i.e. the history's size. */
  newestVersion: number;
};

const REUSE_KINDS: readonly StubStatementKind[] = ["parent_lock", "latest_autosave_read"];
const CHANGED_KINDS: readonly StubStatementKind[] = [
  "parent_lock",
  "latest_autosave_read",
  "parent_lock",
  "next_version_read",
  "insert_revision",
  "delete_superseded",
];

/**
 * Driver-accurate counting stub over the exact `Tx` surface the autosave flow
 * touches (`execute`, `select`, `insert`, `delete`): every awaited chain
 * records one coarse statement kind. The latest-autosave read resolves from
 * `history.latest` alone -- history size is a stub input, never a query --
 * which makes the accounting literally independent of the claimed history.
 */
const autosaveStubTx = (history: StubHistory) => {
  const kinds: StubStatementKind[] = [];
  let latestReads = 0;
  let deleteWhere: SQL | undefined;
  const dialect = new PgDialect();

  const chain = (kind: StubStatementKind): Record<string, unknown> => {
    const link: Record<string, unknown> = {
      from: () => link,
      where: () => link,
      orderBy: () => link,
      // Both budget reads are `LIMIT 1` at the source; anything else is a
      // regression the stub refuses to bless.
      limit: (value: number) => {
        if (value !== 1) throw new Error(BUDGET_TEST_CODES.stubLimitNotOne);
        return link;
      },
    };
    link.then = (
      onFulfilled: (rows: unknown[]) => unknown,
      onRejected: (error: unknown) => unknown
    ) => {
      kinds.push(kind);
      if (kind !== "latest_autosave_read") {
        return Promise.resolve([{ version: history.newestVersion }]).then(onFulfilled, onRejected);
      }
      latestReads += 1;
      const latest = history.latest;
      const row = latest && {
        id: latest.id,
        pageId: STUB_PAGE_ID,
        version: latest.version,
        kind: "autosave",
        data: { title: latest.title, slug: STUB_SLUG, data: {} },
        createdAt: new Date(0),
        createdBy: null,
      };
      return Promise.resolve(row ? [row] : []).then(onFulfilled, onRejected);
    };
    return link;
  };

  const requireRevisionTable = (table: unknown): void => {
    if (getTableName(table as never) !== "page_revisions") {
      throw new Error(BUDGET_TEST_CODES.stubTableUnexpected);
    }
  };

  const tx = {
    // The parent advisory lock is the flow's first statement, every time.
    execute: (query: SQL) => {
      kinds.push("parent_lock");
      if (!dialect.sqlToQuery(query).sql.includes("pg_advisory_xact_lock")) {
        throw new Error(BUDGET_TEST_CODES.stubLockMissing);
      }
      return Promise.resolve([]);
    },
    select: (projection: Record<string, unknown>) => {
      const keys = Object.keys(projection);
      return chain(
        keys.length === 1 && keys[0] === "version" ? "next_version_read" : "latest_autosave_read"
      );
    },
    insert: (table: unknown) => {
      requireRevisionTable(table);
      return {
        values: (payload: Record<string, unknown>) => ({
          returning: () => {
            kinds.push("insert_revision");
            return Promise.resolve([{ id: STUB_CREATED_ID, ...payload, createdAt: new Date(0) }]);
          },
        }),
      };
    },
    delete: (table: unknown) => {
      requireRevisionTable(table);
      return {
        where: (clause: SQL) => {
          kinds.push("delete_superseded");
          deleteWhere = clause;
          return Promise.resolve([]);
        },
      };
    },
  } as unknown as Tx;

  return {
    tx,
    kinds: (): StubStatementKind[] => [...kinds],
    latestReads: (): number => latestReads,
    deleteWhere: (): SQL | undefined => deleteWhere,
  };
};

/** One autosave call through the real service function against the stub. */
const driveAutosave = async (history: StubHistory, title: string) => {
  const stub = autosaveStubTx(history);
  const result = await createOrReplaceAutosaveRevisionTx(
    stub.tx,
    STUB_PAGE_ID,
    { title, slug: STUB_SLUG, data: {} },
    STUB_USER_ID
  );
  return {
    kinds: stub.kinds(),
    latestReads: stub.latestReads(),
    deleteWhere: stub.deleteWhere(),
    reusedRevision: result.reusedRevision,
    revisionId: result.revision.id,
    revisionVersion: result.revision.version,
  };
};

/** A parent holding `size` revisions whose newest autosave is `autosave-a`. */
const historyOfSize = (size: number): StubHistory => ({
  latest: size === 0 ? null : { id: STUB_PREVIOUS_ID, version: size, title: "autosave-a" },
  newestVersion: size,
});

describe("autosave statement budgets (pure legs over a counting stub tx)", () => {
  test.each([0, 1, 30, 100_000])(
    "the budget is independent of history size: %i pre-existing revisions",
    async (historySize) => {
      const history = historyOfSize(historySize);
      const changed = await driveAutosave(history, "autosave-b");
      const reused = await driveAutosave(history, "autosave-a");
      expect(changed.kinds).toEqual(historySize === 0 ? CHANGED_KINDS.slice(0, 5) : CHANGED_KINDS);
      expect(changed.kinds.length).toBeLessThanOrEqual(6);
      expect(changed.latestReads).toBe(1);
      if (historySize === 0) {
        // No predecessor: neither drive can reuse, nothing is deleted, and the
        // first version is allocated on both paths.
        expect(changed.deleteWhere).toBeUndefined();
        expect(changed.revisionVersion).toBe(1);
        expect(reused.kinds).toEqual(CHANGED_KINDS.slice(0, 5));
        expect(reused.reusedRevision).toBe(false);
        expect(reused.revisionVersion).toBe(1);
        return;
      }
      expect(reused.kinds).toEqual(REUSE_KINDS);
      expect(reused.kinds.length).toBeLessThanOrEqual(2);
      expect(reused.latestReads).toBe(1);
      // Reuse re-serves the exact latest row; the replacement bumps one version.
      expect(reused.reusedRevision).toBe(true);
      expect(reused.revisionId).toBe(STUB_PREVIOUS_ID);
      expect(reused.revisionVersion).toBe(historySize);
      expect(changed.reusedRevision).toBe(false);
      expect(changed.revisionVersion).toBe(historySize + 1);
      if (historySize !== 30) return;
      // The delete addresses the exact previously selected ID with the contract
      // predicates -- never an ID list, the new row, or older legacy history.
      const compiled = new PgDialect().sqlToQuery(changed.deleteWhere!);
      expect(compiled.sql).toBe(
        '("page_revisions"."id" = $1 and "page_revisions"."page_id" = $2 and ' +
          '"page_revisions"."kind" = $3 and "page_revisions"."id" <> $4)'
      );
      expect(compiled.params).toEqual([
        STUB_PREVIOUS_ID,
        STUB_PAGE_ID,
        "autosave",
        STUB_CREATED_ID,
      ]);
    }
  );

  test("the autosave body pins its own budget and exact-predecessor delete at the source", () => {
    const source = REVISION_SERVICE_SOURCE;
    expect(source).toContain("Statement budget: <=2 on reuse, <=6 on replacement");
    const body = sourceSlice(
      source,
      "export async function createOrReplaceAutosaveRevisionTx(",
      'return { revision: mapAllocatedRevisionRow(created, "autosave"), reusedRevision: false };'
    );
    expect(countOccurrences(body, "await tx")).toBe(2);
    expect(countOccurrences(body, "await allocateRevision(")).toBe(1);
    expect(body).toContain(
      'withRevisionParentLock({ family: "page", parentId: pageId }, tx, async () => {'
    );
    expect(body).toContain("orderBy(desc(pageRevisions.version), desc(pageRevisions.id))");
    expect(body).toContain(".limit(1);");
    expect(countOccurrences(body, 'eq(pageRevisions.kind, "autosave")')).toBe(2);
    expect(body).toContain("ne(pageRevisions.id, createdId)");
    // The lock identity is the family-scoped constant pair, never a raw UUID.
    expect(stableFamilyKey("page")).toBe(551_001);
  });
});

// --- Retention batch bounds (L01 resolvers + the revision leaf normalizer) ---

describe("retention batch bounds (L01 resolvers + leaf normalizer)", () => {
  test("defaults are 500 rows in 10 batches and the leaf normalizer inherits them", () => {
    expect(Object.values(resolveRetentionRuntimeOptions({}))).toEqual([500, 10, false]);
    expect(resolveRetentionBatchSize({})).toBe(TASK551_RETENTION_BATCH_PINS.defaultBatch);
    expect(resolveRetentionMaxBatchesPerRun({})).toBe(10);
    for (const family of REVISION_RETENTION_FAMILY_ORDER) {
      const policy = normalizeRevisionRetentionPolicy(family, { now: FROZEN_NOW }, {});
      expect([policy.batchSize, policy.maxBatchesPerRun, policy.dryRun]).toEqual([500, 10, false]);
      expect([policy.maxAgeDays, policy.keepNewestPerParent]).toEqual([180, 50]);
      expect(Object.isFrozen(policy)).toBe(true);
    }
  });

  test("the batch and batch-count knobs reject instead of clamping at their bounds", () => {
    expect(resolveRetentionBatchSize({ RETENTION_BATCH_SIZE: "2000" })).toBe(2_000);
    expect(resolveRetentionMaxBatchesPerRun({ RETENTION_MAX_BATCHES_PER_RUN: "100" })).toBe(100);
    for (const rejected of ["2001", "0", "-1", "01", "1.0", " 500", "500 ", "abc", "1e3"]) {
      expect(() => resolveRetentionBatchSize({ RETENTION_BATCH_SIZE: rejected })).toThrow(
        RetentionPolicyError
      );
    }
    expect(() =>
      resolveRetentionMaxBatchesPerRun({ RETENTION_MAX_BATCHES_PER_RUN: "101" })
    ).toThrow(RetentionPolicyError);
    expect(policyReasonOf(() => resolveRetentionBatchSize({ RETENTION_BATCH_SIZE: "2001" }))).toBe(
      "batch_size_invalid"
    );
  });

  test.each(TASK551_RETENTION_BATCH_PINS.edges)(
    "typed leaf policy batch edge %i behaves exactly as its ceiling position demands",
    (edge) => {
      const normalize = normalizeRevisionRetentionPolicy;
      if (edge === 2_001) {
        expect(policyReasonOf(() => normalize("page", { batchSize: edge }, {}))).toBe(
          "policy_batch_size_invalid"
        );
      } else {
        const policy = normalize("page", { batchSize: edge, maxBatchesPerRun: 100 }, {});
        expect([policy.batchSize, policy.maxBatchesPerRun]).toEqual([edge, 100]);
      }
    }
  );

  test("the revision policy bounds and family tags fail closed outside their closed sets", () => {
    const normalize = normalizeRevisionRetentionPolicy;
    expect([
      REVISION_RETENTION_DEFAULT_MAX_AGE_DAYS,
      REVISION_RETENTION_DEFAULT_KEEP_NEWEST_PER_PARENT,
    ]).toEqual([180, 50]);
    for (const [input, reason] of [
      [{ maxAgeDays: 29 }, "policy_age_invalid"],
      [{ maxAgeDays: 2_556 }, "policy_age_invalid"],
      [{ keepNewestPerParent: 0 }, "policy_keep_newest_invalid"],
      [{ keepNewestPerParent: 501 }, "policy_keep_newest_invalid"],
      [{ maxBatchesPerRun: 101 }, "policy_max_batches_invalid"],
      [{ dryRun: "true" }, "policy_dry_run_invalid"],
      // A family tag inside a re-fed policy can never redirect the pass.
      [{ family: "post" }, "family_unknown"],
    ] as const) {
      // The table intentionally mixes well-typed knobs with malformed values
      // the normalizer must reject; the widening cast only feeds the invalid
      // bytes in, it never weakens the asserted reason.
      const candidate = input as unknown as RevisionRetentionPolicyInput;
      expect(policyReasonOf(() => normalize("page", { ...candidate, now: FROZEN_NOW }, {}))).toBe(
        reason
      );
    }
    // Unknown families never normalize into a policy.
    expect(() => normalize("widget" as never, undefined, {})).toThrow(RetentionPolicyError);
    expect(isRevisionRetentionFamily("page")).toBe(true);
    expect(isRevisionRetentionFamily("nope")).toBe(false);
  });

  test("the delete-per-batch ceiling agrees across suite, production and fixture", () => {
    const source = RETENTION_SERVICE_SOURCE;
    expect(SUITE_MAX_DELETES_PER_BATCH).toBe(RETENTION_BATCH_SIZE_MAX);
    expect(SUITE_MAX_DELETES_PER_BATCH).toBe(TASK551_RETENTION_BATCH_PINS.maxBatch);
    expect(REVISION_RETENTION_FAMILY_ORDER.join()).toBe(
      "page,widget_template,detail_page,entry,post"
    );
    // Every batch deletes at most the candidate read's LIMIT, so the ceiling
    // holds by construction: the candidate read is the only LIMIT in the drain
    // and the delete addresses exactly the selected ids.
    expect(countOccurrences(source, ".limit(limit)")).toBe(1);
    expect(source).toContain('.for("update", { skipLocked: true })');
    expect(source).toContain("inArray(spec.idColumn, [...ids])");
    expect(source).toContain(".returning({ id: spec.idColumn })");
    expect(source).toContain("while (batches < policy.maxBatchesPerRun)");
    expect(source).toContain("if (outcome.matched === 0 || outcome.deleted === 0) break;");
    expect(source).toContain("lt(spec.createdAtColumn, cutoff)");
  });

  test("the fixture clock is frozen and the strict cutoff keeps the boundary row", () => {
    expect(TASK551_RETENTION_CLOCK_MS).toBe(Date.parse(FROZEN_CLOCK_ISO));
    for (const age of [30, REVISION_RETENTION_DEFAULT_MAX_AGE_DAYS]) {
      const cutoff = computeRetentionCutoff(FROZEN_NOW, age);
      expect(cutoff.getTime()).toBe(TASK551_RETENTION_CLOCK_MS - age * 86_400_000);
      // Strict `<`: a row exactly at the cutoff is retained, one millisecond
      // older is eligible.
      expect(isEligibleForRetentionCutoff(cutoff, cutoff)).toBe(false);
      expect(isEligibleForRetentionCutoff(new Date(cutoff.getTime() - 1), cutoff)).toBe(true);
    }
    // The leaf delegates the cutoff to L01 and compares with a strict `lt`.
    expect(RETENTION_SERVICE_SOURCE).toContain(
      "computeRetentionCutoff(policy.now, policy.maxAgeDays)"
    );
  });
});

// --- 100,000-row scale profiles (fixture arithmetic, no database) ---

/** The five revision families and their fixture families, in contract order. */
const REVISION_FAMILY_POPULATIONS = [
  { family: "page", fixture: "pageRevisions" },
  { family: "widget_template", fixture: "widgetTemplateRevisions" },
  { family: "detail_page", fixture: "detailPageRevisions" },
  { family: "entry", fixture: "contentRevisions" },
  { family: "post", fixture: "postRevisions" },
] as const satisfies readonly { family: RevisionFamily; fixture: FixtureFamily }[];

describe("100,000-row scale-profile budgets (fixture arithmetic, no database)", () => {
  test("every revision family's fixture population fits one run at the reviewed knobs", () => {
    for (const { family, fixture } of REVISION_FAMILY_POPULATIONS) {
      expect(isRevisionRetentionFamily(family)).toBe(true);
      const population = TASK551_SCALE_COUNTS[fixture];
      expect(population).toEqual({ small: 2_000, large: 100_000 });
      // One default run drains the whole small profile: 10 batches of 500.
      expect(population.small).toBeLessThanOrEqual(
        RETENTION_BATCH_SIZE_DEFAULT * RETENTION_MAX_BATCHES_PER_RUN_DEFAULT
      );
      // One max-knob run drains the whole 100k profile: 100 batches of 2,000.
      expect(population.large).toBeLessThanOrEqual(
        SUITE_MAX_DELETES_PER_BATCH * RETENTION_MAX_BATCHES_PER_RUN_MAX
      );
    }
  });

  test("the 100k family drain arithmetic resolves to whole bounded runs", () => {
    const large = TASK551_SCALE_COUNTS.pageRevisions.large;
    expect(large).toBe(100_000);
    // At the default knobs: 100,000 = 20 runs x 10 batches x 500 deletes.
    expect(large / (RETENTION_BATCH_SIZE_DEFAULT * RETENTION_MAX_BATCHES_PER_RUN_DEFAULT)).toBe(20);
    // At the ceiling knobs: 100,000 = 50 batches of 2,000, inside one run.
    expect(large / SUITE_MAX_DELETES_PER_BATCH).toBe(50);
    expect(large / SUITE_MAX_DELETES_PER_BATCH).toBeLessThanOrEqual(
      RETENTION_MAX_BATCHES_PER_RUN_MAX
    );
    // The bounded list read never materializes the family: 101 rows and 100
    // items are 0.101% of the 100k population, on every read, forever.
    expect(large / 101).toBeGreaterThan(990);
    // Small profile: 2,000 rows over the builder's 100 parents is 20 versions
    // per parent, under the 50-row keep-newest floor -- so the count floor
    // alone retains 100% of the small-profile family, whatever the ages are.
    const versionsPerParentSmall = TASK551_SCALE_COUNTS.pageRevisions.small / 100;
    expect(versionsPerParentSmall).toBe(20);
    expect(versionsPerParentSmall).toBeLessThan(REVISION_RETENTION_DEFAULT_KEEP_NEWEST_PER_PARENT);
    // Every fixture population of every family and profile is a safe integer.
    for (const profile of ["small", "large"] as const satisfies readonly ScaleProfile[]) {
      for (const { fixture } of REVISION_FAMILY_POPULATIONS) {
        expect(Number.isSafeInteger(TASK551_SCALE_COUNTS[fixture][profile])).toBe(true);
      }
    }
  });
});

// --- Real-PostgreSQL budget legs (needs the owner-injected task551-db-test map) ---

describe("revision budgets on real PostgreSQL (requires the owner-injected task551-db-test map)", () => {
  /** This run's unique marker; every seeded row and cleanup predicate uses it. */
  const RUN = `task551-06l02-budgets-${randomUUID()}`;
  const DAY_MS = 86_400_000;

  afterAll(async () => {
    if (!OWNER_DB_TEST_MAP_PRESENT) return;
    // Fixture-scoped cleanup only: marker pages (whose cascades own the seeded
    // revisions) plus this run's marker user. No truncate, no global sweep.
    await db.delete(pages).where(like(pages.slug, `${RUN}%`));
    await db.delete(users).where(like(users.email, `${RUN}%`));
  });

  const seedMarkerUser = async (): Promise<string> => {
    const [user] = await db
      .insert(users)
      .values({ email: `${RUN}@fixture.invalid`, passwordHash: `${RUN}-hash`, name: RUN })
      .returning({ id: users.id });
    if (!user) throw new Error(BUDGET_TEST_CODES.seedMissing);
    return user.id;
  };

  const seedMarkerPage = async (suffix: string, authorId: string | null): Promise<string> => {
    const [page] = await db
      .insert(pages)
      .values({
        slug: `${RUN}-${suffix}`,
        title: `${RUN} ${suffix}`,
        status: "draft",
        authorId,
        currentData: {},
      })
      .returning({ id: pages.id });
    if (!page) throw new Error(BUDGET_TEST_CODES.seedMissing);
    return page.id;
  };

  type SeedRevision = {
    version: number;
    kind: "publish" | "autosave";
    title: string;
    createdAt: Date;
  };

  const rev = (
    version: number,
    title: string,
    createdAt: Date,
    kind: "publish" | "autosave" = "publish"
  ): SeedRevision => ({ version, kind, title, createdAt });

  /** A run of `count` publishes starting at version `first`, aged to `at`. */
  const segment = (count: number, first: number, label: string, at: Date): SeedRevision[] =>
    Array.from({ length: count }, (_, index) => rev(first + index, `${label} ${index + 1}`, at));

  const seedRevisions = async (pageId: string, rows: readonly SeedRevision[]): Promise<void> => {
    for (let start = 0; start < rows.length; start += 100) {
      await db.insert(pageRevisions).values(
        rows.slice(start, start + 100).map((row) => ({
          pageId,
          version: row.version,
          kind: row.kind,
          data: { title: row.title, slug: RUN, data: {} },
          createdAt: row.createdAt,
        }))
      );
    }
  };

  const countRevisions = async (pageId: string, kind?: "publish" | "autosave"): Promise<number> => {
    const rows = await db
      .select({ id: pageRevisions.id })
      .from(pageRevisions)
      .where(
        kind === undefined
          ? eq(pageRevisions.pageId, pageId)
          : and(eq(pageRevisions.pageId, pageId), eq(pageRevisions.kind, kind))
      );
    return rows.length;
  };

  type DriverCounts = {
    outer: () => number;
    inner: () => number;
    lastOuter: () => { head: string; limitParam: number | null };
  };

  /**
   * Counts issued queries at the driver seam (`client.unsafe` per pooled
   * statement, `client.begin`'s transaction client per in-transaction one),
   * restores both wrappers in `finally`, and keeps only derived projections
   * (first word, LIMIT parameter) so no statement text or bind can leak.
   */
  const withCountedDriver = async <T>(run: (counts: DriverCounts) => Promise<T>): Promise<T> => {
    const client = (db as unknown as { $client: Sql }).$client;
    const originalUnsafe = client.unsafe;
    const originalBegin = client.begin;
    let outer = 0;
    let inner = 0;
    let last = { head: "", limitParam: null as number | null };
    // postgres.js types `unsafe`/`begin` generically; the wrappers are only
    // re-typed back to the properties' own signatures, never re-interpreted.
    client.unsafe = ((...args: Parameters<Sql["unsafe"]>) => {
      outer += 1;
      const text = String(args[0]).trim();
      const params = (args[1] ?? []) as unknown[];
      const limitParam = /\slimit\s+\$\d+$/i.test(` ${text}`) ? Number(params.at(-1)) : null;
      last = { head: text.slice(0, 6).toLowerCase(), limitParam };
      return originalUnsafe.apply(client, args);
    }) as unknown as typeof client.unsafe;
    const beginCaller = originalBegin as unknown as (
      this: Sql,
      callback: (tx: Sql) => unknown,
      ...rest: unknown[]
    ) => unknown;
    client.begin = (async (callback: (tx: Sql) => unknown, ...rest: unknown[]) =>
      beginCaller.call(
        client,
        async (tx: Sql) => {
          const txUnsafe = tx.unsafe;
          tx.unsafe = ((...args: Parameters<Sql["unsafe"]>) => {
            inner += 1;
            return txUnsafe.apply(tx, args);
          }) as unknown as typeof tx.unsafe;
          try {
            return await callback(tx);
          } finally {
            tx.unsafe = txUnsafe;
          }
        },
        ...rest
      )) as unknown as typeof client.begin;
    try {
      return await run({ outer: () => outer, inner: () => inner, lastOuter: () => last });
    } finally {
      client.unsafe = originalUnsafe;
      client.begin = originalBegin;
    }
  };

  testIfDb(
    "list stays on one bounded statement: 100 items, hasMore, LIMIT 101 over 105 revisions",
    async () => {
      const authorId = await seedMarkerUser();
      const pageId = await seedMarkerPage("list", authorId);
      // Ordering is by version, so one shared createdAt is enough for 105 rows.
      await seedRevisions(pageId, segment(105, 1, "v", FROZEN_NOW));
      await withCountedDriver(async (counts) => {
        const started = counts.outer();
        // Default list: 50 items behind a 51-row read.
        const defaults = await listRevisions(pageId);
        expect(counts.outer() - started).toBe(1);
        expect([counts.lastOuter().head, counts.lastOuter().limitParam]).toEqual(["select", 51]);
        expect(defaults.items).toHaveLength(50);
        expect(defaults.hasMore).toBe(true);
        // Cap list: 100 items behind a 101-row read; one more page remains.
        const first = await listRevisions(pageId, { limit: 100 });
        expect(counts.outer() - started).toBe(2);
        expect(counts.lastOuter().limitParam).toBe(101);
        expect(first.items).toHaveLength(100);
        expect(first.hasMore).toBe(true);
        // Newest first, and a summary envelope only: no `data` snapshot rides.
        expect([first.items.at(0)?.version, first.items.at(-1)?.version]).toEqual([105, 6]);
        expect(
          Object.keys(first.items[0] ?? {})
            .sort()
            .join()
        ).toBe("createdAt,createdBy,id,kind,pageId,slug,title,version");
        // The cursor resumes strictly after the boundary in one more statement.
        const second = await listRevisions(pageId, { limit: 100, cursor: first.nextCursor! });
        expect(counts.outer() - started).toBe(3);
        expect(counts.lastOuter().limitParam).toBe(101);
        expect(second.items).toHaveLength(5);
        expect(second.hasMore).toBe(false);
        expect(second.nextCursor).toBeNull();
      });
    }
  );

  testIfDb(
    "autosave spends at most six statements over 30 legacy revisions and reuses in two",
    async () => {
      const authorId = await seedMarkerUser();
      const pageId = await seedMarkerPage("autosave", authorId);
      const aged = new Date(TASK551_RETENTION_CLOCK_MS - 90 * DAY_MS);
      await seedRevisions(pageId, [
        ...segment(29, 1, "publish", aged),
        rev(30, "autosave-a", aged, "autosave"),
      ]);
      await withCountedDriver(async (counts) => {
        const autosave = async (title: string) =>
          db.transaction((tx) =>
            createOrReplaceAutosaveRevisionTx(tx, pageId, { title, slug: RUN, data: {} }, authorId)
          );
        // Changed path: indexed latest-autosave read + parent-locked allocation
        // + exact-predecessor delete -- six statements at any history size.
        const changedStart = counts.inner();
        const changed = await autosave("autosave-b");
        expect([changed.reusedRevision, changed.revision.version]).toEqual([false, 31]);
        expect(counts.inner() - changedStart).toBe(6);
        // Equality path: the identical snapshot reuses the exact row in two.
        const reuseStart = counts.inner();
        const reused = await autosave("autosave-b");
        expect([reused.reusedRevision, reused.revision.id]).toEqual([true, changed.revision.id]);
        expect(counts.inner() - reuseStart).toBe(2);
      });
      // Outside the counter: the legacy history survived the request path.
      expect(await countRevisions(pageId)).toBe(30);
      expect(await countRevisions(pageId, "publish")).toBe(29);
      expect(await countRevisions(pageId, "autosave")).toBe(1);
    }
  );

  testIfDb(
    "one bounded family retention pass batches past the batch size and never exceeds the ceiling",
    async () => {
      const pageId = await seedMarkerPage("retention", null);
      const otherPageId = await seedMarkerPage("retention-other", null);
      const cutoff = computeRetentionCutoff(FROZEN_NOW, 30);
      const old = new Date(cutoff.getTime() - 170 * DAY_MS);
      // 560 revisions on one parent: 505 strictly older than the cutoff, 5
      // exactly at it (retained by strict `<`), newest 50 held by the floor.
      await seedRevisions(pageId, [
        ...segment(505, 1, "old", old),
        ...segment(5, 506, "boundary", cutoff),
        ...segment(50, 511, "floor", old),
      ]);
      await seedRevisions(otherPageId, segment(3, 1, "other", old));
      // Shared-database discipline: the injected executor scopes the family's
      // candidate read to this run's marker parents (the id-bounded deletes
      // follow it), and the returning-observer records each batch's size.
      const batchSizes: number[] = [];
      const executor = {
        select: db.select.bind(db),
        execute: db.execute.bind(db),
        delete: (table: never) => {
          const builder = db.delete(table);
          const originalReturning = builder.returning.bind(builder);
          builder.returning = ((...args: unknown[]) => {
            const query = originalReturning(...(args as Parameters<typeof builder.returning>));
            const originalThen = query.then.bind(query);
            query.then = ((
              onFulfilled?: (rows: unknown) => unknown,
              onRejected?: (error: unknown) => unknown
            ) =>
              originalThen((rows: unknown) => {
                batchSizes.push(Array.isArray(rows) ? rows.length : -1);
                return onFulfilled?.(rows);
              }, onRejected)) as typeof query.then;
            return query;
          }) as typeof builder.returning;
          return builder;
        },
      } as unknown as RevisionRetentionExecutor;
      const scope = (table: unknown) =>
        getTableName(table as never) === "page_revisions"
          ? inArray(pageRevisions.pageId, [pageId, otherPageId])
          : sql`false`;
      const selectCandidates = executor.select;
      executor.select = ((...args: unknown[]) => {
        const builder = selectCandidates(...(args as Parameters<typeof db.select>));
        const sourceFrom = builder.from.bind(builder);
        builder.from = ((table: never) => {
          const query = sourceFrom(table);
          const sourceWhere = query.where.bind(query);
          query.where = ((clause: SQL) =>
            sourceWhere(and(clause, scope(table)))) as typeof query.where;
          return query;
        }) as typeof builder.from;
        return builder;
      }) as typeof executor.select;

      const policy = {
        family: "page" as const,
        enabled: true,
        dryRun: false,
        maxAgeDays: 30,
        keepNewestPerParent: 50,
        batchSize: 500,
        maxBatchesPerRun: 10,
        now: FROZEN_NOW,
      };
      // Dry-run observes the same bounded candidate read and deletes nothing.
      const probe = await runRevisionFamilyRetention("page", executor, {
        policy: { ...policy, dryRun: true },
      });
      expect(probe.dryRun && probe.deleted === 0).toBe(true);
      expect([probe.batches, probe.matched]).toEqual([1, 505]);
      expect([batchSizes.length, await countRevisions(pageId)]).toEqual([0, 560]);
      // The real pass: batch one fills the 500-row batch, batch two takes the
      // remaining five, the third read is empty and ends the drain.
      const ledger = await runRevisionFamilyRetention("page", executor, { policy });
      expect([ledger.family, ledger.enabled, ledger.dryRun]).toEqual(["page", true, false]);
      expect(ledger.batches).toBeGreaterThanOrEqual(2);
      expect([ledger.matched, ledger.deleted]).toEqual([505, 505]);
      expect(batchSizes).toEqual([500, 5]);
      for (const size of batchSizes) expect(size).toBeLessThanOrEqual(SUITE_MAX_DELETES_PER_BATCH);
      // Ledger agreement, preservation anchors, and idempotent convergence.
      expect(batchSizes.reduce((sum, size) => sum + size, 0)).toBe(ledger.deleted);
      expect(await countRevisions(pageId)).toBe(55);
      expect(await countRevisions(otherPageId)).toBe(3);
      const converged = await runRevisionFamilyRetention("page", executor, { policy });
      expect([converged.batches, converged.matched, converged.deleted]).toEqual([1, 0, 0]);
      expect(await countRevisions(pageId)).toBe(55);
    }
  );
});
