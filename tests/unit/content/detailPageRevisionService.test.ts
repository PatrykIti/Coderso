// Two-tier unit suite for the detail-page revision leaf (TASK-551-06-L02).
//
// Airtight legs run against a non-routable DATABASE_URL with the service's
// module-bound `db` routed at a driver-accurate in-memory postgres.js fake, so
// a green run proves the exercised paths issued at most the asserted number of
// statements: every input/cursor rejection fires before the read, the summary
// page selects the six declared columns (the stored `document` never crosses
// the list boundary), and a keyset cursor minted for another parent fails
// closed before any query runs.
//
// Real-database legs (list ordering, the point read's full document, and the
// restore/discard transactions) register through `testIfDb` on the
// owner-injected `task551-db-test` map below and skip when the map is absent,
// exactly like tests/unit/search/searchHistoryService.test.ts. The document
// service is imported for SETUP ONLY; every asserted behavior is the leaf's.

import { afterAll, afterEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";

import { drizzle } from "drizzle-orm/postgres-js";

import type {
  DetailPageRevisionListInput,
  DetailPageRevisionRecord,
  DetailPageRevisionSummaryRecord,
} from "../../../core/services/content/detailPageRevisionService";

/**
 * Presence-only gate for TASK-551-11's owner-injected `task551-db-test` map
 * (exact-own child fixture map `TASK551_FIXTURE_DATABASE_URL`/`_NAME`/
 * `_SENTINEL` plus fixed OS keys, with no inherited environment). The map is
 * injected only by the owner, so its presence -- never its values -- decides
 * whether the real database may be dialed. Canonical form of
 * tests/integration/server/task551AppendHeavyRetention.test.ts.
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

// Named gate: exactly the real-database legs register through `test.skipIf` on
// the owner map above; every validation/projection leg is pure.
const testIfDb = test.skipIf(!OWNER_DB_TEST_MAP_PRESENT);

/** Unique per-run marker prefixing every seeded name, slug, and email. */
const MARKER = `task551-06l02-unit-detailrevs-${randomUUID()}`;

type ClientModule = typeof import("../../../core/db/client");
type SchemaModule = typeof import("../../../core/db/schema");
type ServiceModule = typeof import("../../../core/services/content/detailPageRevisionService");
type DocumentServiceModule =
  typeof import("../../../core/services/content/detailPageDocumentService");
type TypeServiceModule = typeof import("../../../core/services/content/typeService");
type ScopeDigestModule = typeof import("../../../core/services/database/revisionAllocation");

/**
 * The database client binds its pools when the module evaluates, so the owner
 * override must exist before that import and the whole DB-touching graph is
 * therefore loaded lazily. Without the owner map the graph still has to
 * evaluate for the DB-free legs, so the mandate's non-routable probe URL is
 * installed as a load-time sentinel: postgres.js connects lazily and every
 * dialing leg is gated behind `OWNER_DB_TEST_MAP_PRESENT`, so the sentinel is
 * never queried.
 */
const DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY = "task551DatabaseClientRuntimeOverrideForTests";
const MODULE_LOAD_SENTINEL_DATABASE_URL = "postgresql://127.0.0.1:1/none";

/**
 * The service binds its `db` when it evaluates, so the read legs below
 * re-register the client module through `mock.module` with a proxy whose
 * target is swappable per leg: the real pool for the owner-map legs, the
 * in-memory driver fake for the bounded-read legs. Outside a swap window the
 * proxy forwards to the real pool so the shared `bun test` lanes keep the
 * production client.
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
async function withSwappableDatabase<T>(
  replacement: ClientModule["db"],
  run: () => Promise<T>
): Promise<T> {
  const production = swappableDatabase as ClientModule["db"];
  swappableDatabase = replacement;
  try {
    return await run();
  } finally {
    swappableDatabase = production;
  }
}

let client: ClientModule;
let schemaModule: SchemaModule;
let db: ClientModule["db"];
let service: ServiceModule;
let documentService: DocumentServiceModule;
let typeService: TypeServiceModule;
let revisionScopeDigest: ScopeDigestModule["revisionScopeDigest"];

const loadModules = async (): Promise<ServiceModule> => {
  if (service) return service;
  (globalThis as Record<string, unknown>)[DATABASE_CLIENT_RUNTIME_OVERRIDE_KEY] = {
    databaseUrl: OWNER_FIXTURE_DATABASE_URL ?? MODULE_LOAD_SENTINEL_DATABASE_URL,
  };
  client = (await import("../../../core/db/client")) as ClientModule;
  schemaModule = (await import("../../../core/db/schema")) as SchemaModule;
  db = client.db;
  // Re-register the client module after the real bindings are captured and
  // before any service evaluates, so every service's `db` is the swappable
  // proxy that defaults to the real pool.
  installSwappableDatabaseModule(client);
  service =
    (await import("../../../core/services/content/detailPageRevisionService")) as ServiceModule;
  documentService =
    (await import("../../../core/services/content/detailPageDocumentService")) as DocumentServiceModule;
  typeService = (await import("../../../core/services/content/typeService")) as TypeServiceModule;
  ({ revisionScopeDigest } =
    (await import("../../../core/services/database/revisionAllocation")) as ScopeDigestModule);
  return service;
};

afterAll(async () => {
  if (!client) return;
  client.setDatabaseClientRuntimeForTests(null);
});

// --- Owner-map leg fixtures -------------------------------------------------

const trackedDetailPageIds = new Set<string>();
const trackedContentTypeIds = new Set<string>();
const trackedUserIds = new Set<string>();

afterEach(async () => {
  if (!OWNER_DB_TEST_MAP_PRESENT || !schemaModule) return;
  const { contentTypes, detailPageDocuments, users } = schemaModule;
  if (trackedDetailPageIds.size > 0) {
    // detail_page_revisions.detail_page_id cascades on document delete.
    await db
      .delete(detailPageDocuments)
      .where(inArray(detailPageDocuments.id, [...trackedDetailPageIds]));
  }
  trackedDetailPageIds.clear();
  for (const id of trackedContentTypeIds) {
    await typeService.deleteContentType(id).catch(async () => {
      await db.delete(contentTypes).where(eq(contentTypes.id, id));
    });
  }
  trackedContentTypeIds.clear();
  if (trackedUserIds.size > 0) {
    await db.delete(users).where(inArray(users.id, [...trackedUserIds]));
  }
  trackedUserIds.clear();
});

const detailPageSchema = {
  type: "object",
  additionalProperties: false,
  properties: { headline: { type: "string", xFieldType: "text" } },
};

const documentInput = (contentTypeId: string, contentTypeSlug: string, name: string) => ({
  schemaVersion: 2,
  name,
  contentTypeId,
  contentTypeSlug,
  status: "draft" as const,
  titlePattern: "{{ title }}",
  settings: { template: "detail", layout: {} },
  sections: [
    {
      id: "hero-section",
      type: "content",
      variant: "default",
      layout: {
        columns: 1,
        align: "start",
        justify: "start",
        maxWidth: 1080,
        stackVertical: false,
      },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
      spacing: { paddingTop: 64, paddingBottom: 64, paddingLeft: 40, paddingRight: 40, gap: 24 },
      visibility: { visible: true, authOnly: false, anchor: null, startsAt: null, endsAt: null },
      responsive: {},
      blocks: [{ id: "hero-heading", type: "heading", props: { text: name } }],
    },
  ],
  bindings: [],
});

type DetailPageFixture = {
  actorId: string;
  contentTypeSlug: string;
  contentTypeId: string;
  detailPageId: string;
};

/** Seeds one disposable user + content type + draft detail page per leg. */
const seedDetailPageFixture = async (label: string): Promise<DetailPageFixture> => {
  const [actor] = await db
    .insert(schemaModule.users)
    .values({
      email: `${MARKER}-${label}@example.test`,
      passwordHash: "test-only-password-hash",
      status: "active",
    })
    .returning({ id: schemaModule.users.id });
  if (!actor) throw new Error("detail_revision_actor_missing");
  trackedUserIds.add(actor.id);
  const contentType = await typeService.createContentType({
    name: `${MARKER}-${label}`,
    slug: `${MARKER}-${label}`,
    schema: detailPageSchema,
  });
  trackedContentTypeIds.add(contentType.id);
  const created = await documentService.createDetailPageDraftDocument({
    document: documentInput(contentType.id, contentType.slug, `${MARKER}-${label}`),
  });
  trackedDetailPageIds.add(created.record.id);
  return {
    actorId: actor.id,
    contentTypeSlug: contentType.slug,
    contentTypeId: contentType.id,
    detailPageId: created.record.id,
  };
};

/**
 * Three revisions for one parent through the real map: an autosave (v1), a
 * publish (v2), and a second autosave (v3) — autosave replaces only its own
 * kind, so all three rows stay distinct.
 */
const seedThreeRevisions = async (fixture: DetailPageFixture, labelA: string, labelB: string) => {
  const first = await documentService.autosaveDetailPageDocument(
    fixture.detailPageId,
    {
      document: documentInput(
        fixture.contentTypeId,
        fixture.contentTypeSlug,
        `${MARKER}-${labelA}`
      ),
    },
    fixture.actorId
  );
  await documentService.publishDetailPageDocument(fixture.detailPageId, fixture.actorId);
  const second = await documentService.autosaveDetailPageDocument(
    fixture.detailPageId,
    {
      document: documentInput(
        fixture.contentTypeId,
        fixture.contentTypeSlug,
        `${MARKER}-${labelB}`
      ),
    },
    fixture.actorId
  );
  return { firstAutosaveId: first.revision.id, secondAutosaveId: second.revision.id };
};

// --- Driver-accurate stub executor (DB-free read legs) ----------------------

type StubRevisionRow = Readonly<{
  id: string;
  detailPageId: string;
  version: number;
  kind: "autosave" | "publish";
  document: unknown;
  createdAt: Date;
  createdBy: string | null;
}>;

/** postgres.js hands drizzle zone-less timestamp literals; mirror the wire format. */
const wireTimestamp = (value: Date): string => value.toISOString().slice(0, 19).replace("T", " ");

/**
 * The composite keyset disjunct binds `."id" < $n`; the plain parent filter
 * never does (the ORDER BY spells `."id" desc`, without a comparison), so this
 * fragment separates a continuation page from a first page.
 */
const KEYSET_ID_PREDICATE_FRAGMENT = '."id" < ';

/**
 * Driver-accurate fake for the leaf's two reads: real drizzle builds the real
 * statements against this fake and nothing dials. The fake serves the seeded
 * rows in `(version DESC, id DESC)` order, honors the keyset boundary when the
 * statement carries one, and emits positional values in the exact column order
 * each select shape requests (summary: six columns; point read: the full row
 * including `document`).
 */
const makeRevisionReadStub = (
  seedRows: readonly StubRevisionRow[],
  options: { trailingSummaryValue?: unknown } = {}
): { statements: { sql: string; params: unknown[] }[]; stubDb: ClientModule["db"] } => {
  const statements: { sql: string; params: unknown[] }[] = [];
  const fakeClient = {
    options: { parsers: {}, serializers: {} },
    unsafe(sqlText: string, params: unknown[]) {
      statements.push({ sql: sqlText, params: [...params] });
      const carriesDocument = sqlText.includes('"document"');
      const boundary = sqlText.includes(KEYSET_ID_PREDICATE_FRAGMENT)
        ? {
            // A continuation page binds [parent, version(lt), version(eq),
            // id(lt), limit+1]: the boundary pair brackets the trailing LIMIT
            // bind.
            version: params[1] as number,
            id: params[params.length - 2] as string,
          }
        : null;
      const survivors = boundary
        ? seedRows.filter(
            (row) =>
              row.version < boundary.version ||
              (row.version === boundary.version && row.id < boundary.id)
          )
        : [...seedRows];
      const ordered = survivors.sort(
        (left, right) =>
          right.version - left.version || (left.id < right.id ? 1 : left.id > right.id ? -1 : 0)
      );
      const values = ordered.map((row) => {
        const createdAt = wireTimestamp(row.createdAt);
        if (carriesDocument) {
          // Full-row select order: document sits between kind and created_at.
          return [
            row.id,
            row.detailPageId,
            row.version,
            row.kind,
            row.document,
            createdAt,
            row.createdBy,
          ];
        }
        const summary = [row.id, row.detailPageId, row.version, row.kind, createdAt, row.createdBy];
        return options.trailingSummaryValue === undefined
          ? summary
          : [...summary, options.trailingSummaryValue];
      });
      return { values: async () => values };
    },
  };
  return {
    statements,
    stubDb: drizzle(fakeClient as never, { schema: schemaModule }) as ClientModule["db"],
  };
};

/** A stub-backed page read plus the statement ledger the stub recorded. */
const stubbedPage = async (
  rows: readonly StubRevisionRow[],
  input?: DetailPageRevisionListInput
) => {
  await loadModules();
  const { statements, stubDb } = makeRevisionReadStub(rows);
  const page = await withSwappableDatabase(stubDb, () =>
    service.listDetailPageRevisions(rows[0]?.detailPageId ?? randomUUID(), input)
  );
  return { page, statements };
};

let stubVersion = 0;

/**
 * A stored-shape v2 document: the point read normalizes it exactly like a row
 * read from the database, so the stub seeds real documents rather than bags.
 */
const stubDocument = (name: string) => ({
  ...documentInput(randomUUID(), "stub-detail-slug", name),
  id: randomUUID(),
});

const stubRow = (overrides: Partial<StubRevisionRow> = {}): StubRevisionRow => {
  stubVersion += 1;
  return {
    id: randomUUID(),
    detailPageId: randomUUID(),
    version: stubVersion,
    kind: stubVersion % 2 === 0 ? "publish" : "autosave",
    document: stubDocument(`stub-document-${stubVersion}`),
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, stubVersion)),
    createdBy: null,
    ...overrides,
  };
};

const seededRows = (count: number, detailPageId = randomUUID()): StubRevisionRow[] =>
  Array.from({ length: count }, () => stubRow({ detailPageId }));

/** The cursor codec's base64url wrapper, mirrored for hand-built payloads. */
const encodeCursorPayload = (payload: unknown): string =>
  btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const decodeCursorPayload = (cursor: string): { id: string; scope: string; version: number } => {
  const padded = cursor.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return JSON.parse(atob(`${padded}${padding}`));
};

const listInput = (value: unknown): DetailPageRevisionListInput =>
  value as DetailPageRevisionListInput;

const FOREIGN_SCOPE = `revision:entry:v1:${"f".repeat(64)}`;

/**
 * One rejection leg: the stable code surfaces and the counting stub stays at
 * zero statements, proving the failure happened before any query.
 */
const expectZeroStatementRejection = async (
  detailPageId: string,
  input: unknown,
  code: string
): Promise<void> => {
  await loadModules();
  const { statements, stubDb } = makeRevisionReadStub([]);
  let caught: unknown = null;
  await withSwappableDatabase(stubDb, async () => {
    try {
      await service.listDetailPageRevisions(detailPageId, listInput(input));
    } catch (error) {
      caught = error;
    }
  });
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error | null)?.message).toBe(code);
  expect(statements).toHaveLength(0);
};

const SUMMARY_ITEM_KEYS = ["createdAt", "createdBy", "detailPageId", "id", "kind", "version"];

// --- Airtight input contract ------------------------------------------------

describe("listDetailPageRevisions input contract (airtight)", () => {
  test("rejects non-object and array input", async () => {
    const parent = randomUUID();
    await expectZeroStatementRejection(parent, null, "detail_page_revision_input_invalid");
    await expectZeroStatementRejection(parent, "page", "detail_page_revision_input_invalid");
    await expectZeroStatementRejection(parent, 42, "detail_page_revision_input_invalid");
    await expectZeroStatementRejection(parent, [], "detail_page_revision_input_invalid");
  });

  test("rejects unknown input keys", async () => {
    const parent = randomUUID();
    await expectZeroStatementRejection(
      parent,
      { sort: "desc" },
      "detail_page_revision_input_invalid"
    );
    await expectZeroStatementRejection(
      parent,
      { limit: 10, kind: "autosave" },
      "detail_page_revision_input_invalid"
    );
    await expectZeroStatementRejection(
      parent,
      { cursor: "x", limit: 5, order: "asc" },
      "detail_page_revision_input_invalid"
    );
  });

  test("rejects non-integer and sub-one limits", async () => {
    const parent = randomUUID();
    for (const limit of [0, -1, 2.5, Number.NaN, "50"]) {
      await expectZeroStatementRejection(parent, { limit }, "detail_page_revision_limit_invalid");
    }
  });

  test("rejects empty and non-string cursors", async () => {
    const parent = randomUUID();
    await expectZeroStatementRejection(
      parent,
      { cursor: "" },
      "detail_page_revision_cursor_invalid"
    );
    await expectZeroStatementRejection(
      parent,
      { cursor: 42 },
      "detail_page_revision_cursor_invalid"
    );
  });
});

// --- Airtight bounded read through the stub executor ------------------------

describe("listDetailPageRevisions bounded read (airtight stub executor)", () => {
  test("serves the closed envelope with six-column items and never the document", async () => {
    const rows = seededRows(3);
    const { page, statements } = await stubbedPage(rows);
    expect(Object.keys(page).sort()).toEqual(["hasMore", "items", "nextCursor"]);
    expect(page.items).toHaveLength(3);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
    for (const item of page.items) {
      expect(Object.keys(item).sort()).toEqual(SUMMARY_ITEM_KEYS);
      expect(Object.keys(item)).not.toContain("document");
      expect(item.detailPageId).toBe(rows[0]?.detailPageId);
      expect(item.createdAt).toBeInstanceOf(Date);
    }
    expect(JSON.stringify(page.items)).not.toContain("stub-document-");
    // One bounded statement: parent filter, keyset order, default LIMIT + 1.
    expect(statements).toHaveLength(1);
    const { sql, params } = statements[0]!;
    expect(sql).toContain('from "detail_page_revisions"');
    expect(sql).toContain('order by "detail_page_revisions"."version" desc');
    expect(sql).toContain('"detail_page_revisions"."id" desc');
    expect(sql).not.toContain('"document"');
    expect(params[0]).toBe(rows[0]?.detailPageId);
    expect(params.at(-1)).toBe(51);
  });

  test("keeps a seeded document payload out of the summary projection", async () => {
    await loadModules();
    const rows = seededRows(2);
    // Even when the wire hands back a trailing document-shaped value, the
    // six-column projection must drop it.
    const { statements, stubDb } = makeRevisionReadStub(rows, {
      trailingSummaryValue: { document: { payload: "document-body-marker" } },
    });
    const page = await withSwappableDatabase(stubDb, () =>
      service.listDetailPageRevisions(rows[0]?.detailPageId ?? randomUUID())
    );
    expect(page.items).toHaveLength(2);
    for (const item of page.items) {
      expect(Object.keys(item).sort()).toEqual(SUMMARY_ITEM_KEYS);
      expect(Object.keys(item)).not.toContain("document");
    }
    expect(JSON.stringify(page)).not.toContain("document-body-marker");
    expect(statements).toHaveLength(1);
  });

  test("orders by version desc then id desc", async () => {
    const parent = randomUUID();
    const tieLeft = stubRow({ detailPageId: parent, version: 2 });
    const tieRight = stubRow({ detailPageId: parent, version: 2 });
    const bottom = stubRow({ detailPageId: parent, version: 1 });
    const [lowerId, higherId] = [tieLeft.id, tieRight.id].sort();
    const { page, statements } = await stubbedPage([tieLeft, tieRight, bottom]);
    expect(page.items.map((item) => item.version)).toEqual([2, 2, 1]);
    expect(page.items.map((item) => item.id)).toEqual([higherId, lowerId, bottom.id]);
    expect(statements).toHaveLength(1);
  });

  test("honors an explicit caller limit and mints the continuation token", async () => {
    const rows = seededRows(5);
    const parent = rows[0]?.detailPageId ?? "";
    const { page, statements } = await stubbedPage(rows, { limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).not.toBeNull();
    expect(statements).toHaveLength(1);
    expect(statements[0]!.params.at(-1)).toBe(3);
    // The token describes the page's last row plus the family scope — never a
    // raw parent id.
    const payload = decodeCursorPayload(page.nextCursor!);
    expect(Object.keys(payload).sort()).toEqual(["id", "scope", "version"]);
    expect(payload.version).toBe(page.items[1]?.version);
    expect(payload.id).toBe(page.items[1]?.id);
    expect(payload.scope).toBe(revisionScopeDigest("detail_page", parent));
    expect(JSON.stringify(payload)).not.toContain(parent);
  });

  test("defaults the page size to 50", async () => {
    const rows = seededRows(60);
    const { page, statements } = await stubbedPage(rows);
    expect(page.items).toHaveLength(50);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).not.toBeNull();
    expect(statements).toHaveLength(1);
    expect(statements[0]!.params.at(-1)).toBe(51);
  });

  test("caps any requested limit at 100", async () => {
    const rows = seededRows(120);
    for (const requested of [{ limit: 100 }, { limit: 250 }]) {
      const { page, statements } = await stubbedPage(rows, requested);
      expect(page.items).toHaveLength(100);
      expect(page.hasMore).toBe(true);
      expect(statements).toHaveLength(1);
      expect(statements[0]!.params.at(-1)).toBe(101);
    }
  });

  test("round-trips the keyset cursor through gap-free continuation pages", async () => {
    const rows = seededRows(5);
    const parent = rows[0]?.detailPageId ?? "";
    const seen: string[] = [];
    let cursor: string | null = null;
    let pageCount = 0;
    for (;;) {
      const { page, statements } = await stubbedPage(rows, {
        cursor: cursor ?? undefined,
        limit: 2,
      });
      expect(statements).toHaveLength(1);
      expect(statements[0]!.params[0]).toBe(parent);
      expect(page.items.length).toBeLessThanOrEqual(2);
      for (const item of page.items) seen.push(item.id);
      pageCount += 1;
      cursor = page.nextCursor;
      if (!cursor) break;
      expect(pageCount).toBeLessThanOrEqual(10);
    }
    expect(pageCount).toBe(3); // 2 + 2 + 1
    expect(new Set(seen).size).toBe(5);
    expect(seen).toEqual([...rows].sort((a, b) => b.version - a.version).map((row) => row.id));
  });

  test("rejects a foreign-parent cursor before any statement", async () => {
    await loadModules();
    const foreignRows = seededRows(2);
    const foreign = await stubbedPage(foreignRows, { limit: 1 });
    expect(foreign.page.hasMore).toBe(true);
    const foreignCursor = foreign.page.nextCursor!;
    expect(decodeCursorPayload(foreignCursor).scope).toBe(
      revisionScopeDigest("detail_page", foreignRows[0]?.detailPageId ?? "")
    );
    await expectZeroStatementRejection(
      randomUUID(),
      { cursor: foreignCursor },
      "detail_page_revision_cursor_scope_mismatch"
    );
  });

  test("rejects malformed cursor payloads before any statement", async () => {
    const parent = randomUUID();
    const malformed = [
      "not-a-cursor",
      encodeCursorPayload("not json"),
      encodeCursorPayload({}),
      encodeCursorPayload({ scope: revisionScopeDigest("detail_page", parent), version: 1 }),
      encodeCursorPayload({ id: "row", scope: revisionScopeDigest("detail_page", parent) }),
      encodeCursorPayload({
        id: "row",
        scope: revisionScopeDigest("detail_page", parent),
        version: 0,
      }),
      encodeCursorPayload({
        id: "row",
        scope: FOREIGN_SCOPE,
        version: 1,
        extra: true,
      }),
      "a".repeat(501),
    ];
    for (const cursor of malformed) {
      await expectZeroStatementRejection(parent, { cursor }, "detail_page_revision_cursor_invalid");
    }
    // A well-formed payload scoped to another family fails closed on scope.
    await expectZeroStatementRejection(
      parent,
      { cursor: encodeCursorPayload({ id: "row", scope: FOREIGN_SCOPE, version: 1 }) },
      "detail_page_revision_cursor_scope_mismatch"
    );
  });

  test("getDetailPageRevision is the only operation that returns the document", async () => {
    await loadModules();
    const seededDocument = stubDocument("stub-document-point-read");
    const row = stubRow({
      kind: "autosave",
      createdBy: randomUUID(),
      document: seededDocument,
    });
    const { statements, stubDb } = makeRevisionReadStub([row]);
    const record = await withSwappableDatabase(stubDb, () =>
      service.getDetailPageRevision(row.detailPageId, row.id)
    );
    expect(record.id).toBe(row.id);
    expect(record.detailPageId).toBe(row.detailPageId);
    expect(record.version).toBe(row.version);
    expect(record.kind).toBe("autosave");
    expect(record.createdBy).toBe(row.createdBy);
    expect(record.createdAt).toBeInstanceOf(Date);
    expect(Object.keys(record)).toContain("document");
    expect(record.document).toMatchObject({
      name: "stub-document-point-read",
      contentTypeSlug: "stub-detail-slug",
    });
    expect(statements).toHaveLength(1);
    const { sql, params } = statements[0]!;
    expect(sql).toContain('"document"');
    expect(params.slice(0, 2)).toEqual([row.detailPageId, row.id]);
    expect(params.at(-1)).toBe(1);
    expect(sql).toMatch(/limit \$\d+$/);

    // An unknown sibling id resolves to the stable not-found code.
    const empty = makeRevisionReadStub([]);
    await expect(
      withSwappableDatabase(empty.stubDb, () =>
        service.getDetailPageRevision(row.detailPageId, randomUUID())
      )
    ).rejects.toThrow("detail_page_revision_not_found");
    expect(empty.statements).toHaveLength(1);
  });
});

// --- Pure summary projection ------------------------------------------------

describe("summarizeDetailPageRevisionRecord (pure)", () => {
  test("projects a full revision record onto the six declared columns", async () => {
    const { summarizeDetailPageRevisionRecord } = await loadModules();
    const createdAt = new Date(Date.UTC(2026, 0, 1, 12, 30));
    const record: DetailPageRevisionRecord = {
      id: randomUUID(),
      detailPageId: randomUUID(),
      version: 7,
      kind: "autosave",
      document: {
        payload: "document-body-marker",
      } as unknown as DetailPageRevisionRecord["document"],
      createdAt,
      createdBy: randomUUID(),
    };
    const summary = summarizeDetailPageRevisionRecord(record);
    expect(summary).toEqual({
      id: record.id,
      detailPageId: record.detailPageId,
      version: 7,
      kind: "autosave",
      createdAt,
      createdBy: record.createdBy,
    });
    expect(Object.keys(summary).sort()).toEqual(SUMMARY_ITEM_KEYS);
    expect(Object.keys(summary)).not.toContain("document");
    expect(JSON.stringify(summary)).not.toContain("document-body-marker");
  });

  test("passes an already-summarized record through unchanged", async () => {
    const { summarizeDetailPageRevisionRecord } = await loadModules();
    const summary: DetailPageRevisionSummaryRecord = {
      id: randomUUID(),
      detailPageId: randomUUID(),
      version: 2,
      kind: "publish",
      createdAt: new Date(Date.UTC(2026, 0, 2, 8, 0)),
      createdBy: null,
    };
    const summarized = summarizeDetailPageRevisionRecord(summary);
    expect(summarized).toEqual(summary);
    expect(summarized).not.toBe(summary);
  });
});

// --- Real-database legs (owner-injected task551-db-test map) ----------------

describe("detail-page revision leaf against the owner fixture database", () => {
  testIfDb("lists real revisions newest-first and reads one full document", async () => {
    await loadModules();
    const fixture = await seedDetailPageFixture("list");
    const { firstAutosaveId, secondAutosaveId } = await seedThreeRevisions(
      fixture,
      "autosave-one",
      "autosave-two"
    );

    const page = await service.listDetailPageRevisions(fixture.detailPageId);
    expect(Object.keys(page).sort()).toEqual(["hasMore", "items", "nextCursor"]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
    expect(page.items.map((item) => item.version)).toEqual([3, 2, 1]);
    expect(page.items.map((item) => item.kind)).toEqual(["autosave", "publish", "autosave"]);
    expect(page.items[0]?.id).toBe(secondAutosaveId);
    expect(page.items[2]?.id).toBe(firstAutosaveId);
    for (const item of page.items) {
      expect(Object.keys(item).sort()).toEqual(SUMMARY_ITEM_KEYS);
      expect(Object.keys(item)).not.toContain("document");
      expect(item.detailPageId).toBe(fixture.detailPageId);
      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.createdBy).toBe(fixture.actorId);
    }
    // The v1 autosave body never crosses the summary boundary.
    expect(JSON.stringify(page.items)).not.toContain(`${MARKER}-autosave-one`);

    // The point read is the only operation that returns the full document.
    const full = await service.getDetailPageRevision(fixture.detailPageId, secondAutosaveId);
    expect(full).toMatchObject({ id: secondAutosaveId, version: 3, kind: "autosave" });
    expect(Object.keys(full)).toContain("document");
    expect(full.document).toMatchObject({ name: `${MARKER}-autosave-two` });
    await expect(service.getDetailPageRevision(fixture.detailPageId, randomUUID())).rejects.toThrow(
      "detail_page_revision_not_found"
    );
  });

  testIfDb(
    "pages real revisions by keyset cursor and fails closed on a foreign cursor",
    async () => {
      await loadModules();
      const fixture = await seedDetailPageFixture("pages");
      const foreign = await seedDetailPageFixture("foreign");
      await seedThreeRevisions(fixture, "page-a", "page-b");
      await documentService.autosaveDetailPageDocument(
        foreign.detailPageId,
        {
          document: documentInput(
            foreign.contentTypeId,
            foreign.contentTypeSlug,
            `${MARKER}-foreign`
          ),
        },
        foreign.actorId
      );
      await documentService.publishDetailPageDocument(foreign.detailPageId, foreign.actorId);

      const pageOne = await service.listDetailPageRevisions(fixture.detailPageId, { limit: 2 });
      expect(pageOne.items.map((item) => item.version)).toEqual([3, 2]);
      expect(pageOne.hasMore).toBe(true);
      expect(pageOne.nextCursor).not.toBeNull();
      const payload = decodeCursorPayload(pageOne.nextCursor!);
      expect(Object.keys(payload).sort()).toEqual(["id", "scope", "version"]);
      expect(payload.scope).toBe(revisionScopeDigest("detail_page", fixture.detailPageId));
      expect(payload.version).toBe(2);
      expect(payload.id).toBe(pageOne.items[1]?.id);

      const pageTwo = await service.listDetailPageRevisions(fixture.detailPageId, {
        cursor: pageOne.nextCursor!,
        limit: 2,
      });
      expect(pageTwo.items.map((item) => item.version)).toEqual([1]);
      expect(pageTwo.hasMore).toBe(false);
      expect(pageTwo.nextCursor).toBeNull();
      expect(new Set([...pageOne.items, ...pageTwo.items].map((item) => item.id)).size).toBe(3);

      const foreignPage = await service.listDetailPageRevisions(foreign.detailPageId, { limit: 1 });
      expect(foreignPage.hasMore).toBe(true);
      await expect(
        service.listDetailPageRevisions(fixture.detailPageId, { cursor: foreignPage.nextCursor! })
      ).rejects.toThrow("detail_page_revision_cursor_scope_mismatch");
      await expect(
        service.listDetailPageRevisions(fixture.detailPageId, { cursor: "not-a-cursor" })
      ).rejects.toThrow("detail_page_revision_cursor_invalid");
    }
  );

  testIfDb("restores and discards one owned detail Page autosave revision atomically", async () => {
    await loadModules();
    const fixture = await seedDetailPageFixture("roundtrip");
    const autosave = await documentService.autosaveDetailPageDocument(
      fixture.detailPageId,
      {
        document: documentInput(
          fixture.contentTypeId,
          fixture.contentTypeSlug,
          `${MARKER}-saved-revision`
        ),
      },
      fixture.actorId
    );
    await documentService.updateDetailPageDraftDocument(fixture.detailPageId, {
      document: documentInput(
        fixture.contentTypeId,
        fixture.contentTypeSlug,
        `${MARKER}-current-draft`
      ),
    });

    const restored = await service.restoreDetailPageRevision(
      fixture.detailPageId,
      autosave.revision.id
    );
    expect(restored.restored).toBe(true);
    expect(restored.revision).toMatchObject({ id: autosave.revision.id, kind: "autosave" });
    expect(restored.detailPage).toMatchObject({
      id: fixture.detailPageId,
      name: `${MARKER}-saved-revision`,
      status: "draft",
    });
    expect(await documentService.getDetailPageDocument(fixture.detailPageId)).toMatchObject({
      currentDocument: { name: `${MARKER}-saved-revision`, status: "draft" },
    });
    // The second restore is a no-op: the snapshot is already current.
    expect(
      (await service.restoreDetailPageRevision(fixture.detailPageId, autosave.revision.id)).restored
    ).toBe(false);

    const discarded = await service.discardDetailPageAutosaveRevision(
      fixture.detailPageId,
      autosave.revision.id
    );
    expect(discarded).toMatchObject({ id: autosave.revision.id, kind: "autosave" });
    const remaining = await service.listDetailPageRevisions(fixture.detailPageId);
    expect(remaining.items).toEqual([]);
    expect(remaining.hasMore).toBe(false);
    expect(remaining.nextCursor).toBeNull();
  });

  testIfDb(
    "never discards publish revisions or revisions owned by another detail Page",
    async () => {
      await loadModules();
      const first = await seedDetailPageFixture("guards-first");
      const second = await seedDetailPageFixture("guards-second");
      await documentService.publishDetailPageDocument(first.detailPageId, first.actorId);
      const [published] = await db
        .select({ id: schemaModule.detailPageRevisions.id })
        .from(schemaModule.detailPageRevisions)
        .where(eq(schemaModule.detailPageRevisions.detailPageId, first.detailPageId));
      if (!published) throw new Error("publish_revision_missing");

      await expect(
        service.discardDetailPageAutosaveRevision(first.detailPageId, published.id)
      ).rejects.toThrow("detail_page_revision_delete_forbidden");
      await expect(
        service.restoreDetailPageRevision(second.detailPageId, published.id)
      ).rejects.toThrow("detail_page_revision_not_found");
      await expect(
        service.discardDetailPageAutosaveRevision(second.detailPageId, published.id)
      ).rejects.toThrow("detail_page_revision_not_found");

      const page = await service.listDetailPageRevisions(first.detailPageId);
      expect(page.items).toHaveLength(1);
      expect(page.items[0]?.id).toBe(published.id);
      expect(page.items[0]?.kind).toBe("publish");
    }
  );
});
