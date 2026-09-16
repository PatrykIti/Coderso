// TASK-551-06-L02 — unit suite for `core/services/pages/revisionService.ts`
// (bun lane). Two registers, mirroring tests/unit/search/searchHistoryService.test.ts
// and tests/integration/server/task551AppendHeavyRetention.test.ts:
//
// 1. Pure airtight legs. They pass green under the airtight form
//    `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null
//    test tests/unit/pages/revisionService.test.ts` while touching no database:
//    input validation, envelope shape, the 100/101 cap boundary, cursor
//    fail-closed scope handling, prune delegation, and the autosave statement
//    budgets route the service's module-bound `db` at a driver-accurate
//    postgres.js fake (RowList `count`, never `rowCount`) over real drizzle, so
//    each leg builds the real SQL text and counts real statement attempts. A
//    statement a leg did not script throws `unexpected_statement_executed`.
//
// 2. Real-database legs run ONLY under TASK-551-11's owner-injected
//    `task551-db-test` map: the presence gate below decides whether the real
//    database may be dialed — never its values — and no ambient `DATABASE_URL`
//    is probed anywhere (the previous `canConnect()` probe is gone). Every DB
//    leg seeds rows carrying this run's unique marker and asserts only on those
//    marker rows. The 50-concurrent autosave burst lives in the integration
//    suite, deliberately not here.

import { afterAll, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";

import type {
  PageRevisionListInput,
  PageRevisionPruneResult,
  PageRevisionSummary,
  RevisionPage,
  Tx,
} from "../../../core/services/pages/revisionService";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map
 * (`TASK551_FIXTURE_DATABASE_URL`, `_NAME`, `_SENTINEL`). The map is injected
 * only by the owner, so its presence -- never its values -- decides whether the
 * real database may be dialed. Under the airtight local form no key is set, so
 * the real-database legs skip by name instead of dialing an ambient URL.
 */
const OWNER_DB_TEST_MAP_PRESENT = [
  process.env.TASK551_FIXTURE_DATABASE_URL,
  process.env.TASK551_FIXTURE_DATABASE_NAME,
  process.env.TASK551_FIXTURE_DATABASE_SENTINEL,
].every((value) => typeof value === "string" && value.length > 0);

// Named gate: exactly the real-database legs register through `test.skipIf` on
// the owner map above; every other leg below is pure.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

const OWNER_FIXTURE_DATABASE_URL: string | null = process.env.TASK551_FIXTURE_DATABASE_URL ?? null;

type ClientModule = typeof import("../../../core/db/client");
type SchemaModule = typeof import("../../../core/db/schema");
type ServiceModule = typeof import("../../../core/services/pages/revisionService");
type RevisionAllocationModule = typeof import("../../../core/services/database/revisionAllocation");
type RetentionPolicyModule = typeof import("../../../core/services/maintenance/retentionPolicy");
type PageServiceModule = typeof import("../../../core/services/pages/pageService");
type PageDocumentV2Module = typeof import("../../../core/services/pages/pageDocumentV2");

/**
 * The database client binds its pools when the module evaluates, so the owner
 * override must exist before that import and the whole DB-touching graph is
 * loaded lazily. Without the owner map the graph still has to evaluate for the
 * DB-free legs, so the non-routable sentinel URL is installed as a load-time
 * placeholder: postgres.js connects lazily and every dialing leg is gated
 * behind `OWNER_DB_TEST_MAP_PRESENT`, so the sentinel is never queried.
 */
const DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY = "task551DatabaseClientRuntimeOverrideForTests";
const MODULE_LOAD_SENTINEL_DATABASE_URL = "postgresql://127.0.0.1:1/none";

/**
 * The service binds its `db` when it evaluates, so the read/write legs below
 * re-register the client module through `mock.module` with a proxy whose target
 * is swappable per leg: the real pool for the owner-map legs, the in-memory
 * driver fake for the bounded-read legs. `mock.module` copies the factory
 * result once, so the proxy (not a getter) is what keeps the binding live, and
 * outside a swap window it forwards to the real pool so the shared lanes keep
 * the production client.
 */
let swappableDatabase: ClientModule["db"] | null = null;

const SWAPPABLE_DATABASE = new Proxy({} as ClientModule["db"], {
  get: (_target, property) => {
    const current = swappableDatabase as ClientModule["db"];
    const value = Reflect.get(current, property, current);
    return typeof value === "function" ? value.bind(current) : value;
  },
  set: (_target, property, value) => {
    const current = swappableDatabase as ClientModule["db"];
    Reflect.set(current, property, value);
    return true;
  },
});

/** Registers the swappable client module once, before the service evaluates. */
const installSwappableDatabaseModule = (realClient: ClientModule): void => {
  swappableDatabase = realClient.db;
  mock.module("../../../core/db/client", () => ({ ...realClient, db: SWAPPABLE_DATABASE }));
};

/** Routes the service's module-bound `db` at `replacement` for one leg. */
async function withSwappableDatabase<T>(replacement: ClientModule["db"], run: () => Promise<T>) {
  const production = swappableDatabase as ClientModule["db"];
  swappableDatabase = replacement;
  try {
    return await run();
  } finally {
    swappableDatabase = production;
  }
}

type LoadedModules = {
  service: ServiceModule;
  schema: SchemaModule;
  client: ClientModule;
  db: ClientModule["db"];
  revisionScopeDigest: RevisionAllocationModule["revisionScopeDigest"];
  resolveRetentionBatchSize: RetentionPolicyModule["resolveRetentionBatchSize"];
  resolveRetentionDryRun: RetentionPolicyModule["resolveRetentionDryRun"];
  createPage: PageServiceModule["createPage"];
  normalizeStoredPageDocumentV2ForRead: PageDocumentV2Module["normalizeStoredPageDocumentV2ForRead"];
};

let modules: LoadedModules | null = null;

const loadModules = async (): Promise<LoadedModules> => {
  if (modules) return modules;
  (globalThis as Record<string, unknown>)[DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY] = {
    databaseUrl: OWNER_FIXTURE_DATABASE_URL ?? MODULE_LOAD_SENTINEL_DATABASE_URL,
  };
  const client = (await import("../../../core/db/client")) as ClientModule;
  const schema = (await import("../../../core/db/schema")) as SchemaModule;
  const db = client.db;
  // Re-register the client module after the real bindings are captured and
  // before the service evaluates, so the service's `db` is the swappable proxy
  // that defaults to the real pool.
  installSwappableDatabaseModule(client);
  const service = (await import("../../../core/services/pages/revisionService")) as ServiceModule;
  const revisionAllocation =
    (await import("../../../core/services/database/revisionAllocation")) as RevisionAllocationModule;
  const retentionPolicy =
    (await import("../../../core/services/maintenance/retentionPolicy")) as RetentionPolicyModule;
  const pageService =
    (await import("../../../core/services/pages/pageService")) as PageServiceModule;
  const pageDocumentV2 =
    (await import("../../../core/services/pages/pageDocumentV2")) as PageDocumentV2Module;
  modules = {
    service,
    schema,
    client,
    db,
    revisionScopeDigest: revisionAllocation.revisionScopeDigest,
    resolveRetentionBatchSize: retentionPolicy.resolveRetentionBatchSize,
    resolveRetentionDryRun: retentionPolicy.resolveRetentionDryRun,
    createPage: pageService.createPage,
    normalizeStoredPageDocumentV2ForRead: pageDocumentV2.normalizeStoredPageDocumentV2ForRead,
  };
  return modules;
};

afterAll(async () => {
  if (!modules) return;
  if (OWNER_DB_TEST_MAP_PRESENT) {
    const { db, schema } = modules;
    const pageIds = [...dbLegPageIds];
    const userIds = [...dbLegUserIds];
    if (pageIds.length > 0) {
      await db.delete(schema.pageRevisions).where(inArray(schema.pageRevisions.pageId, pageIds));
      await db.delete(schema.pages).where(inArray(schema.pages.id, pageIds));
    }
    if (userIds.length > 0) {
      await db.delete(schema.users).where(inArray(schema.users.id, userIds));
    }
  }
  modules.client.setDatabaseClientRuntimeForTests(null);
});

// --- Driver-accurate statement stub ----------------------------------------

type StubResultSet = unknown[][];
type StubHandler = { match: RegExp; results: StubResultSet[] };

/**
 * postgres.js hands back a `RowList` (an array carrying a `count` row total)
 * plus a thenable whose `.values()` yields tuples in array mode; the fake
 * reproduces exactly that shape — `count`, never `rowCount`.
 */
const pendingQueryStub = (tuples: StubResultSet) => {
  const rowList = Object.assign([...tuples], { count: tuples.length, command: "" });
  const pending = Promise.resolve(rowList) as Promise<typeof rowList> & {
    values: () => Promise<StubResultSet>;
  };
  pending.values = async () => tuples;
  return pending;
};

const makeStubDb = (handlers: StubHandler[]) => {
  const statements: { sql: string; params: unknown[] }[] = [];
  const callIndex = new Map<StubHandler, number>();
  const client = {
    options: { parsers: {}, serializers: {} },
    unsafe(sqlText: string, params: unknown[]) {
      const handler = handlers.find((candidate) => candidate.match.test(sqlText));
      if (!handler) throw new Error(`unexpected_statement_executed: ${sqlText}`);
      const index = callIndex.get(handler) ?? 0;
      callIndex.set(handler, index + 1);
      const last = handler.results.length - 1;
      const tuples = handler.results[Math.min(index, last)];
      if (!tuples) throw new Error(`stub_exhausted: ${sqlText}`);
      statements.push({ sql: sqlText, params: [...params] });
      return pendingQueryStub(tuples);
    },
  };
  // Real drizzle over the fake client: the real SQL text is built, only the
  // wire is faked. `loadModules` has always run by the time a leg stubs.
  const stubDb = drizzle(client as never, { schema: modules?.schema }) as ClientModule["db"];
  return { statements, stubDb };
};

const asTx = (stubDb: ClientModule["db"]): Tx => stubDb as unknown as Tx;

/** DB-leg ownership ledgers: cleanup removes only this run's marker rows. */
const dbLegPageIds = new Set<string>();
const dbLegUserIds = new Set<string>();

/** Statement shapes only the scripted service queries can produce. */
const RX = {
  advisoryLock: /pg_advisory_xact_lock/,
  // Single-table selects project unprefixed columns: the latest-autosave read
  // alone carries kind,data,created_at,created_by; the probe selects version.
  latestAutosave: /"kind", "data", "created_at", "created_by" from/,
  nextVersion: /"version" from "page_revisions"/,
  insertRevision: /^insert into "page_revisions"/,
  deleteRevision: /^delete from "page_revisions"/,
  listSelect: /->> 'title'/,
  pointRead: /left join "users" on /,
  pruneCandidates: /for update skip locked/,
} as const;

// --- Fixtures --------------------------------------------------------------

const PAGE_ID = "3f6d2a58-9c1e-4b7a-9d2f-5c8b1e7a4d10";
const OTHER_PAGE_ID = "8b1e4c7a-2d3f-4a5b-9c6d-1e0f2a3b4c5d";
const USER_ID = "1f0c4d3e-8f2a-4c1b-9a7e-1b2c3d4e5f60";
const AUTHOR_ID = "22222222-2222-4222-8222-222222222222";
const LATEST_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const CREATED_ID = "a1b2c3d4-0000-4000-8000-000000000002";
const CANDIDATE_ID = "a1b2c3d4-0000-4000-8000-000000000003";

/** Zone-less `timestamp` wire format, exactly as postgres.js hands it over. */
const wireTs = (hour: number) => `2026-05-01 ${String(hour).padStart(2, "0")}:00:00`;

/** Pages are v2-only; the marker text is the revision identity in every leg. */
const buildPageData = (text: string) => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections: [
    {
      id: "sec_content",
      type: "content",
      name: "Content",
      variant: "default",
      layout: { columns: 1, align: "start", justify: "start", maxWidth: 960 },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
      spacing: {
        paddingTop: 48,
        paddingBottom: 48,
        paddingLeft: 32,
        paddingRight: 32,
        gap: 24,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: null,
        startsAt: null,
        endsAt: null,
      },
      responsive: {},
      blocks: [
        {
          id: "blk_text",
          type: "text",
          props: { text, format: "plain", align: "left" },
          visibility: { visible: true },
        },
      ],
    },
  ],
});

const snapshotOf = (title: string, slug: string, text: string) => ({
  title,
  slug,
  data: buildPageData(text),
});

/** One list row tuple, in the exact 11-column projection order of the list. */
const listRow = (pageId: string, version: number, withAuthor: boolean): unknown[] => [
  `a1b2c3d4-0000-4000-8000-${String(version).padStart(12, "0")}`,
  pageId,
  version,
  version % 2 === 0 ? "publish" : "autosave",
  `Title ${version}`,
  `/slug-${version}`,
  wireTs(10 + (version % 10)),
  withAuthor ? AUTHOR_ID : null,
  withAuthor ? AUTHOR_ID : null,
  withAuthor ? "Ada Lovelace" : null,
  withAuthor ? "ada@example.com" : null,
];

const listRows = (count: number, pageId: string): StubResultSet =>
  Array.from({ length: count }, (_item, index) => listRow(pageId, count - index, index === 0));

const latestAutosaveResult = (pageId: string, data: unknown): StubResultSet => [
  [LATEST_ID, pageId, 4, "autosave", data, wireTs(9), USER_ID],
];

const insertReturningResult = (pageId: string, version: number, data: unknown): StubResultSet => [
  [CREATED_ID, pageId, version, "autosave", data, wireTs(10), USER_ID],
];

const pointReadAuthor = ["Ada Lovelace", "ada@example.com", null] as const;

const pointReadResult = (pageId: string, data: unknown): StubResultSet => [
  [LATEST_ID, pageId, 4, "autosave", data, wireTs(9), USER_ID, ...pointReadAuthor],
];

/** Mirrors the service's base64url cursor codec for fail-closed probes. */
const encodeCursor = (payload: { scope: string; version: number; id: string }): string =>
  btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

// --- Pure leg helpers ------------------------------------------------------

const runList = async (input: PageRevisionListInput | undefined, handlers: StubHandler[]) => {
  const { service } = await loadModules();
  const { stubDb, statements } = makeStubDb(handlers);
  const envelope = await withSwappableDatabase(stubDb, () =>
    input === undefined ? service.listRevisions(PAGE_ID) : service.listRevisions(PAGE_ID, input)
  );
  return { envelope, statements };
};

const LIST_HANDLER = (rows: StubResultSet): StubHandler[] => [
  { match: RX.listSelect, results: [rows] },
];

const expectZeroStatementRejection = async (input: unknown, code: string): Promise<void> => {
  const { service } = await loadModules();
  const { stubDb, statements } = makeStubDb([]);
  let caught: unknown = null;
  await withSwappableDatabase(stubDb, async () => {
    try {
      await service.listRevisions(PAGE_ID, input as PageRevisionListInput);
    } catch (error) {
      caught = error;
    }
  });
  expect((caught as Error | null)?.message).toBe(code);
  // The rejection must precede any SQL: the empty stub would have thrown
  // `unexpected_statement_executed` otherwise.
  expect(statements).toEqual([]);
};

// ---------------------------------------------------------------------------
// Pure airtight legs
// ---------------------------------------------------------------------------

describe("revisionService pure airtight legs", () => {
  test("normalizePageRevisionSnapshot maps full snapshots, bare documents, and blank scalars", async () => {
    const { service, normalizeStoredPageDocumentV2ForRead } = await loadModules();
    const full = service.normalizePageRevisionSnapshot(
      snapshotOf("  Full ", " /full ", "Full copy")
    );
    expect(full.title).toBe("Full");
    expect(full.slug).toBe("/full");
    expect(full.data).toEqual(normalizeStoredPageDocumentV2ForRead(buildPageData("Full copy")));

    const bare = service.normalizePageRevisionSnapshot(buildPageData("Bare copy"));
    expect(bare.title).toBeNull();
    expect(bare.slug).toBeNull();
    expect(bare.data).toEqual(normalizeStoredPageDocumentV2ForRead(buildPageData("Bare copy")));

    const blank = service.normalizePageRevisionSnapshot({ title: "   ", slug: "", data: null });
    expect(blank.title).toBeNull();
    expect(blank.slug).toBeNull();
  });

  test("rejects invalid list input and limits with the exact codes before any SQL", async () => {
    const cases: [unknown, string][] = [
      [{ per: 1 }, "page_revision_list_input_invalid"],
      [{ cursor: "x", limit: 5, kind: "autosave" }, "page_revision_list_input_invalid"],
      [null, "page_revision_list_input_invalid"],
      [42, "page_revision_list_input_invalid"],
      [["cursor"], "page_revision_list_input_invalid"],
      [{ cursor: 5 }, "page_revision_list_input_invalid"],
      [{ limit: 0 }, "page_revision_limit_invalid"],
      [{ limit: -1 }, "page_revision_limit_invalid"],
      [{ limit: 1.5 }, "page_revision_limit_invalid"],
      [{ limit: Number.NaN }, "page_revision_limit_invalid"],
      [{ limit: Number.POSITIVE_INFINITY }, "page_revision_limit_invalid"],
      [{ limit: "50" }, "page_revision_limit_invalid"],
    ];
    for (const [input, code] of cases) {
      await expectZeroStatementRejection(input, code);
    }
  });

  test("emits the bounded envelope shape with summaries only (no data, no reason)", async () => {
    const { envelope, statements } = await runList(
      { limit: 2 },
      LIST_HANDLER(listRows(3, PAGE_ID))
    );
    // The annotated assignment pins the exact readonly three-key envelope type.
    const pinned: RevisionPage<PageRevisionSummary> = envelope;
    expect(Object.keys(pinned).sort()).toEqual(["hasMore", "items", "nextCursor"]);
    expect(pinned.items).toHaveLength(2);
    expect(pinned.hasMore).toBe(true);
    expect(Object.keys(pinned.items[0]).sort()).toEqual([
      "createdAt",
      "createdBy",
      "id",
      "kind",
      "pageId",
      "slug",
      "title",
      "version",
    ]);
    expect("data" in pinned.items[0]).toBe(false);
    expect("document" in pinned.items[0]).toBe(false);
    expect("reason" in pinned.items[0]).toBe(false);
    // Newest first, `data` never leaves the database, author shape preserved.
    expect(pinned.items[0]).toMatchObject({
      id: "a1b2c3d4-0000-4000-8000-000000000003",
      pageId: PAGE_ID,
      version: 3,
      kind: "autosave",
      title: "Title 3",
      slug: "/slug-3",
      createdBy: { id: AUTHOR_ID, name: "Ada Lovelace", email: "ada@example.com" },
    });
    expect(pinned.items[1]).toMatchObject({
      version: 2,
      kind: "publish",
      createdBy: null,
    });
    expect(pinned.items[0].createdAt.toISOString()).toBe("2026-05-01T13:00:00.000Z");
    expect(statements).toHaveLength(1);
  });

  test("extracts title and slug in SQL and never transfers the data column", async () => {
    const { statements } = await runList({ limit: 2 }, LIST_HANDLER(listRows(3, PAGE_ID)));
    const { sql } = statements[0];
    expect(sql).toContain('from "page_revisions"');
    expect(sql).toContain('left join "users" on ');
    // Exactly the two bounded scalar extractions, never a bare data projection.
    const dataFragments = sql.match(/"page_revisions"\."data"[^,]*/g) ?? [];
    expect(dataFragments).toHaveLength(2);
    for (const fragment of dataFragments) {
      expect(fragment.startsWith(`"page_revisions"."data" ->> '`)).toBe(true);
    }
    expect(sql).toContain(`"page_revisions"."data" ->> 'title'`);
    expect(sql).toContain(`"page_revisions"."data" ->> 'slug'`);
    expect(sql).toContain('order by "page_revisions"."version" desc, "page_revisions"."id" desc');
  });

  test("caps at 100 items from at most 101 fetched rows", async () => {
    const { envelope, statements } = await runList(
      { limit: 100 },
      LIST_HANDLER(listRows(101, PAGE_ID))
    );
    expect(envelope.items).toHaveLength(100);
    expect(envelope.hasMore).toBe(true);
    expect(statements).toHaveLength(1);
    const fetchCap = Number(statements[0].params.at(-1));
    expect(fetchCap).toBeLessThanOrEqual(101);
    expect(fetchCap).toBe(101);
    // The boundary derives only from the last RETURNED row (the 100th item).
    const payload = JSON.parse(
      atob(envelope.nextCursor!.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { scope: string; version: number; id: string };
    expect(payload.id).toBe(envelope.items[99].id);
    expect(payload.version).toBe(envelope.items[99].version);
  });

  test("defaults the limit to 50 and normalizes over-cap requests to the 100 hard cap", async () => {
    const rows = listRows(101, PAGE_ID);
    const defaulted = await runList(undefined, LIST_HANDLER(rows));
    expect(defaulted.envelope.items).toHaveLength(50);
    expect(defaulted.envelope.hasMore).toBe(true);
    expect(defaulted.statements).toHaveLength(1);
    expect(Number(defaulted.statements[0].params.at(-1))).toBe(51);

    const overCap = await runList({ limit: 101 }, LIST_HANDLER(rows));
    expect(overCap.envelope.items).toHaveLength(100);
    expect(overCap.envelope.hasMore).toBe(true);
    expect(Number(overCap.statements[0].params.at(-1))).toBe(101);

    // An exhausted page carries no boundary; an empty one carries no items.
    const exhausted = await runList({ limit: 100 }, LIST_HANDLER(listRows(100, PAGE_ID)));
    expect(exhausted.envelope.hasMore).toBe(false);
    expect(exhausted.envelope.nextCursor).toBeNull();
    const empty = await runList({ limit: 100 }, LIST_HANDLER([]));
    expect(empty.envelope).toEqual({ items: [], nextCursor: null, hasMore: false });
  });

  test("fails closed on foreign, malformed, and structurally invalid cursors (zero SQL)", async () => {
    const { revisionScopeDigest } = await loadModules();
    const foreign = encodeCursor({
      scope: revisionScopeDigest("page", OTHER_PAGE_ID),
      version: 3,
      id: LATEST_ID,
    });
    const foreignFamily = encodeCursor({
      scope: revisionScopeDigest("detail_page", PAGE_ID),
      version: 3,
      id: LATEST_ID,
    });
    const malformed = ["not-a-cursor", "a".repeat(501), btoa("[]"), foreign, foreignFamily];
    const structurallyInvalid = [0, 1.5].map((version) =>
      encodeCursor({ scope: "revision:page:v1:abc", version, id: LATEST_ID })
    );
    const emptyId = encodeCursor({ scope: "revision:page:v1:abc", version: 2, id: "" });
    for (const cursor of [...malformed, ...structurallyInvalid, emptyId]) {
      await expectZeroStatementRejection({ cursor }, "page_revision_cursor_invalid");
    }
  });

  test("accepts a same-scope cursor and binds the keyset boundary in one statement", async () => {
    const { revisionScopeDigest } = await loadModules();
    const scope = revisionScopeDigest("page", PAGE_ID);
    const cursor = encodeCursor({ scope, version: 9, id: LATEST_ID });
    const { envelope, statements } = await runList(
      { cursor, limit: 5 },
      LIST_HANDLER(listRows(3, PAGE_ID))
    );
    expect(envelope.items).toHaveLength(3);
    expect(envelope.hasMore).toBe(false);
    expect(envelope.nextCursor).toBeNull();
    expect(statements).toHaveLength(1);
    const { sql, params } = statements[0];
    expect(sql).toContain(`"page_revisions"."page_id" = $1`);
    expect(params[0]).toBe(PAGE_ID);
    // Keyset predicate: strictly after (version, id) — the cursor payload binds.
    expect(params).toContain(9);
    expect(params).toContain(LATEST_ID);
    expect(sql).toMatch(/limit \$\d+$/);

    // An empty cursor string is the absent cursor, never a decode failure.
    const blank = await runList({ cursor: "" }, LIST_HANDLER(listRows(3, PAGE_ID)));
    expect(blank.envelope.items).toHaveLength(3);
    expect(blank.envelope.nextCursor).toBeNull();
    expect(blank.statements).toHaveLength(1);
    expect(blank.statements[0].params.at(-1)).toBe(51);
  });

  test("point read is the only operation returning full data and binds both predicates", async () => {
    const { service, normalizeStoredPageDocumentV2ForRead } = await loadModules();
    const stored = snapshotOf("Full", "/full", "Point copy");
    const { stubDb, statements } = makeStubDb([
      { match: RX.pointRead, results: [pointReadResult(PAGE_ID, stored)] },
    ]);
    const record = await withSwappableDatabase(stubDb, () =>
      service.getPageRevision(PAGE_ID, LATEST_ID)
    );
    expect(record).toMatchObject({
      id: LATEST_ID,
      pageId: PAGE_ID,
      version: 4,
      kind: "autosave",
      title: "Full",
      createdBy: { id: USER_ID, name: "Ada Lovelace", email: "ada@example.com" },
    });
    expect(record?.data).toEqual(normalizeStoredPageDocumentV2ForRead(buildPageData("Point copy")));
    expect(statements).toHaveLength(1);
    const { sql, params } = statements[0];
    expect(sql).toContain(`"page_revisions"."page_id" = $1`);
    expect(sql).toContain(`"page_revisions"."id" = $2`);
    expect(params.slice(0, 2)).toEqual([PAGE_ID, LATEST_ID]);
    expect(sql).toMatch(/limit \$\d+$/);

    const { stubDb: emptyDb } = makeStubDb([{ match: RX.pointRead, results: [[]] }]);
    const missing = await withSwappableDatabase(emptyDb, () =>
      service.getPageRevision(PAGE_ID, CREATED_ID)
    );
    expect(missing).toBeNull();
  });

  test("autosave reuse performs exactly 2 statements with zero writes", async () => {
    const { service } = await loadModules();
    const stored = snapshotOf("Autosave A", "/autosave-a", "Identical copy");
    const { stubDb, statements } = makeStubDb([
      { match: RX.advisoryLock, results: [[[null]]] },
      { match: RX.latestAutosave, results: [latestAutosaveResult(PAGE_ID, stored)] },
    ]);
    const result = await service.createOrReplaceAutosaveRevisionTx(
      asTx(stubDb),
      PAGE_ID,
      stored,
      USER_ID
    );
    expect(result.reusedRevision).toBe(true);
    expect(result.revision).toMatchObject({ id: LATEST_ID, version: 4, kind: "autosave" });
    expect(statements).toHaveLength(2);
    expect(statements[0].sql).toMatch(RX.advisoryLock);
    const latest = statements[1];
    expect(latest.sql).toContain('from "page_revisions"');
    expect(latest.sql).toContain(
      'order by "page_revisions"."version" desc, "page_revisions"."id" desc'
    );
    expect(latest.sql).toMatch(/limit \$\d+$/);
    expect(latest.params.at(-1)).toBe(1);
    // Zero insert, zero delete: one parent lock plus one projected read.
    expect(statements.some((entry) => RX.insertRevision.test(entry.sql))).toBe(false);
    expect(statements.some((entry) => RX.deleteRevision.test(entry.sql))).toBe(false);
  });

  test("autosave replacement stays within 6 statements and deletes only the exact predecessor", async () => {
    const { service } = await loadModules();
    const previous = snapshotOf("Autosave A", "/autosave-a", "Older copy");
    const created = snapshotOf("Autosave B", "/autosave-b", "Newer copy");
    const { stubDb, statements } = makeStubDb([
      { match: RX.advisoryLock, results: [[[null]]] },
      { match: RX.latestAutosave, results: [latestAutosaveResult(PAGE_ID, previous)] },
      { match: RX.nextVersion, results: [[[9]]] },
      { match: RX.insertRevision, results: [insertReturningResult(PAGE_ID, 10, created)] },
      { match: RX.deleteRevision, results: [[]] },
    ]);
    const result = await service.createOrReplaceAutosaveRevisionTx(
      asTx(stubDb),
      PAGE_ID,
      created,
      USER_ID
    );
    expect(result.reusedRevision).toBe(false);
    expect(result.revision).toMatchObject({ id: CREATED_ID, version: 10, kind: "autosave" });
    // lock + latest read + re-entrant lock + next-version read + insert + delete
    expect(statements.length).toBeLessThanOrEqual(6);
    expect(statements).toHaveLength(6);
    const deleteStatement = statements.find((entry) => RX.deleteRevision.test(entry.sql));
    expect(deleteStatement).toBeDefined();
    const { sql, params } = deleteStatement!;
    expect(sql).toContain('delete from "page_revisions"');
    // Exact predecessor only: id = previous AND page_id AND kind='autosave'
    // AND id <> created — never an ID list, the new row, or another parent.
    expect(sql).toMatch(/"id" = \$\d+/);
    expect(sql).toMatch(/"page_id" = \$\d+/);
    expect(sql).toMatch(/"kind" = \$\d+/);
    expect(sql).toMatch(/"id" <> \$\d+/);
    expect(sql).not.toMatch(/ in \(/);
    expect(params).toEqual([LATEST_ID, PAGE_ID, "autosave", CREATED_ID]);
    expect(statements.filter((entry) => RX.insertRevision.test(entry.sql))).toHaveLength(1);
  });

  test("first autosave for an empty parent allocates within the budget and never deletes", async () => {
    const { service } = await loadModules();
    const created = snapshotOf("Autosave A", "/autosave-a", "First copy");
    const { stubDb, statements } = makeStubDb([
      { match: RX.advisoryLock, results: [[[null]]] },
      { match: RX.latestAutosave, results: [[]] },
      { match: RX.nextVersion, results: [[[4]]] },
      { match: RX.insertRevision, results: [insertReturningResult(PAGE_ID, 5, created)] },
      { match: RX.deleteRevision, results: [[]] },
    ]);
    const result = await service.createOrReplaceAutosaveRevisionTx(
      asTx(stubDb),
      PAGE_ID,
      created,
      USER_ID
    );
    expect(result.reusedRevision).toBe(false);
    expect(result.revision.version).toBe(5);
    expect(statements.length).toBeLessThanOrEqual(6);
    // lock + latest read + re-entrant lock + next-version read + insert
    expect(statements).toHaveLength(5);
    expect(statements.some((entry) => RX.deleteRevision.test(entry.sql))).toBe(false);
    const insert = statements.find((entry) => RX.insertRevision.test(entry.sql))!;
    expect(insert.params).toContain(5);
  });

  test("pruneRevisionsTx returns exact zeros for invalid retention before any SQL", async () => {
    const { service } = await loadModules();
    const { stubDb, statements } = makeStubDb([]);
    for (const retention of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, -Number.MAX_VALUE]) {
      const result: PageRevisionPruneResult = await service.pruneRevisionsTx(
        asTx(stubDb),
        PAGE_ID,
        retention
      );
      expect(result).toEqual({ matched: 0, deleted: 0 });
    }
    expect(statements).toEqual([]);
  });

  test("pruneRevisionsTx delegates to the bounded per-parent service with the floored keep-newest policy", async () => {
    const { service, resolveRetentionBatchSize } = await loadModules();
    const batchSize = resolveRetentionBatchSize(process.env);
    const { stubDb, statements } = makeStubDb([
      { match: RX.pruneCandidates, results: [[[CANDIDATE_ID]], []] },
      { match: RX.deleteRevision, results: [[[CANDIDATE_ID]]] },
    ]);
    // 7.9 floors to keepNewestPerParent=7 — never rounded, never clamped.
    const result: PageRevisionPruneResult = await service.pruneRevisionsTx(
      asTx(stubDb),
      PAGE_ID,
      7.9
    );
    expect(result).toEqual({ matched: 1, deleted: 1 });
    const candidates = statements[0]!;
    const remove = statements[1]!;
    const drained = statements[2]!;
    expect(candidates.sql).toContain('from "page_revisions"');
    expect(candidates.sql).toMatch(/for update skip locked$/);
    expect(candidates.sql).toContain('order by "page_revisions"."version" asc');
    // Family scoping: the parent predicate is page_id, and only this parent.
    expect(candidates.sql).toContain(`"page_id" = $1`);
    expect(candidates.params[0]).toBe(PAGE_ID);
    // The keep-newest floor probe carries the floored retention twice (LIMIT
    // bound and count comparison), and the batch budget closes the statement.
    expect(candidates.params).toContain(7);
    expect(candidates.params.at(-1)).toBe(batchSize);
    expect(candidates.sql).toContain("newer_rows");
    // The published anchor survives the prune even when history outgrows it.
    expect(candidates.sql).toContain("not exists");
    expect(candidates.sql).toContain("= 'publish'");
    expect(remove.sql).toMatch(/^delete from "page_revisions"/);
    expect(remove.sql).toContain('returning "id"');
    expect(remove.params).toEqual([CANDIDATE_ID]);
    // One zero batch proves the drain stops instead of spinning.
    expect(drained.sql).toMatch(/for update skip locked$/);
    expect(statements).toHaveLength(3);

    // Retention 1 maps to the tightest keep-newest floor, and a drained family
    // costs exactly one bounded candidate read.
    const tight = makeStubDb([{ match: RX.pruneCandidates, results: [[]] }]);
    const tightResult: PageRevisionPruneResult = await service.pruneRevisionsTx(
      asTx(tight.stubDb),
      PAGE_ID,
      1
    );
    expect(tightResult).toEqual({ matched: 0, deleted: 0 });
    expect(tight.statements).toHaveLength(1);
    expect(tight.statements[0].params).toContain(1);
  });
});

// ---------------------------------------------------------------------------
// Real-database legs (owner-injected task551-db-test map only)
// ---------------------------------------------------------------------------

describe("revisionService real-database legs (requires the owner-injected task551-db-test map)", () => {
  /** Unique per-run marker; every DB-leg row and cleanup delete carries it. */
  const RUN = `task551-06l02-unit-revservices-${randomUUID()}`;

  const seedActor = async (): Promise<string> => {
    const { db, schema } = await loadModules();
    const [actor] = await db
      .insert(schema.users)
      .values({
        email: `revsvc-${randomUUID()}@example.com`,
        passwordHash: "test-only-password-hash",
        name: `Revision service ${RUN.slice(0, 32)}`,
        status: "active",
      })
      .returning({ id: schema.users.id });
    if (!actor) throw new Error("revision_service_actor_missing");
    dbLegUserIds.add(actor.id);
    return actor.id;
  };

  const seedPage = async (title: string) => {
    const { createPage } = await loadModules();
    const page = await createPage({
      title,
      slug: `revsvc-${randomUUID()}`,
      data: buildPageData("Seeded copy"),
    });
    dbLegPageIds.add(page.id);
    return page;
  };

  const survivorVersions = async (pageId: string): Promise<number[]> => {
    const { db, schema } = await loadModules();
    const rows = await db
      .select({ version: schema.pageRevisions.version })
      .from(schema.pageRevisions)
      .where(eq(schema.pageRevisions.pageId, pageId))
      .orderBy(schema.pageRevisions.version);
    return rows.map((row) => row.version);
  };

  testIfDb(
    "round-trips create, autosave, bounded list, and point read on the owner fixture",
    async () => {
      const { service, revisionScopeDigest } = await loadModules();
      const actorId = await seedActor();
      const page = await seedPage(`${RUN} roundtrip`);

      const rev1 = await service.createRevision(
        page.id,
        snapshotOf("Rev one", "/rev-one", "Step one"),
        actorId
      );
      const rev2 = await service.createRevision(
        page.id,
        snapshotOf("Rev two", "/rev-two", "Step two"),
        actorId
      );
      expect(rev1.version).toBe(1);
      expect(rev2.version).toBe(2);
      expect(rev1.kind).toBe("publish");

      const autosave = await service.createOrReplaceAutosaveRevision(
        page.id,
        snapshotOf("Autosave A", "/autosave-a", "Autosave copy"),
        actorId
      );
      expect(autosave.reusedRevision).toBe(false);
      expect(autosave.revision.kind).toBe("autosave");
      expect(autosave.revision.version).toBe(3);

      // An identical snapshot reuses the same row with zero insert and zero
      // delete — the monotonic version sequence proves no allocation happened.
      const reused = await service.createOrReplaceAutosaveRevision(
        page.id,
        snapshotOf("Autosave A", "/autosave-a", "Autosave copy"),
        actorId
      );
      expect(reused.reusedRevision).toBe(true);
      expect(reused.revision.id).toBe(autosave.revision.id);

      const only = await service.listRevisions(page.id);
      expect(Object.keys(only).sort()).toEqual(["hasMore", "items", "nextCursor"]);
      expect(only.items).toHaveLength(3);
      expect(only.hasMore).toBe(false);
      expect(only.nextCursor).toBeNull();
      expect(Object.keys(only.items[0]).sort()).toEqual([
        "createdAt",
        "createdBy",
        "id",
        "kind",
        "pageId",
        "slug",
        "title",
        "version",
      ]);
      expect("data" in only.items[0]).toBe(false);
      // title/slug reach the summary through the bounded `->>` extraction.
      expect(only.items[0]).toMatchObject({
        id: autosave.revision.id,
        version: 3,
        kind: "autosave",
        title: "Autosave A",
        slug: "/autosave-a",
      });

      // Keyset pagination through the real cursor codec, one item per page.
      const firstPage = await service.listRevisions(page.id, { limit: 1 });
      expect(firstPage.items).toHaveLength(1);
      expect(firstPage.hasMore).toBe(true);
      const payload = JSON.parse(
        atob(firstPage.nextCursor!.replace(/-/g, "+").replace(/_/g, "/"))
      ) as { scope: string; version: number; id: string };
      expect(payload.scope).toBe(revisionScopeDigest("page", page.id));
      expect(payload.id).toBe(autosave.revision.id);
      const secondPage = await service.listRevisions(page.id, {
        cursor: firstPage.nextCursor!,
        limit: 1,
      });
      expect(secondPage.items.map((item) => item.id)).toEqual([rev2.id]);
      const thirdPage = await service.listRevisions(page.id, {
        cursor: secondPage.nextCursor!,
        limit: 5,
      });
      expect(thirdPage.items.map((item) => item.id)).toEqual([rev1.id]);
      expect(thirdPage.hasMore).toBe(false);
      expect(thirdPage.nextCursor).toBeNull();

      // A cursor minted for another parent never yields this parent's rows.
      await expect(
        service.listRevisions(OTHER_PAGE_ID, { cursor: firstPage.nextCursor! })
      ).rejects.toThrow("page_revision_cursor_invalid");

      // The same-parent point read is the only full-data operation.
      const point = await service.getPageRevision(page.id, rev1.id);
      expect(point).toMatchObject({ id: rev1.id, version: 1, title: "Rev one", slug: "/rev-one" });
      expect(point?.data).toMatchObject({
        schemaVersion: 2,
        sections: [
          expect.objectContaining({
            blocks: [
              expect.objectContaining({ props: expect.objectContaining({ text: "Step one" }) }),
            ],
          }),
        ],
      });
      expect(await service.getPageRevision(randomUUID(), rev1.id)).toBeNull();
    },
    240_000
  );

  testIfDb(
    "prunes only outside the keep-newest floor and no-ops on invalid retention",
    async () => {
      const { db, schema, service, resolveRetentionDryRun } = await loadModules();
      // The typed dry-run override has no request-path key; a dry-run
      // environment would zero every delete below, so pin it before asserting.
      expect(resolveRetentionDryRun(process.env)).toBe(false);
      const actorId = await seedActor();
      const page = await seedPage(`${RUN} prune`);
      const ancient = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
      await db.insert(schema.pageRevisions).values(
        [1, 2, 3].map((version) => ({
          pageId: page.id,
          version,
          kind: "autosave" as const,
          data: { title: `${RUN} v${version}`, slug: `/revsvc-v${version}`, data: {} },
          createdAt: ancient,
          createdBy: actorId,
        }))
      );

      // retention 2 keeps the newest two; only version 1 is both older than the
      // age cutoff and outside the floor.
      const pruned = await db.transaction((tx) => service.pruneRevisionsTx(tx, page.id, 2));
      expect(pruned).toEqual({ matched: 1, deleted: 1 });
      expect(await survivorVersions(page.id)).toEqual([2, 3]);

      // Retention below 1 is a guarded no-op: no rows move, no statements run.
      const noOp = await db.transaction((tx) => service.pruneRevisionsTx(tx, page.id, 0));
      expect(noOp).toEqual({ matched: 0, deleted: 0 });
      expect(await survivorVersions(page.id)).toEqual([2, 3]);
    },
    240_000
  );
});
