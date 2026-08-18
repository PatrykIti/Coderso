// TASK-573: query-shape suite for the narrow gated-route visibility probes.
//
// Bun-free Vitest lane. The production module is imported with a fully mocked
// `core/db/client` (the firstRunService/customScreenService pattern) so this
// suite never opens a DB connection, plus mocked heavy loader modules whose
// spies prove the narrow probes never invoke the wide SEO/taxonomy reads.
import { afterEach, describe, expect, it, vi } from "vitest";
import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core/dialect";

const mockDb = vi.hoisted(() => {
  const state = {
    selectArg: null as unknown,
    fromArg: null as unknown,
    whereArg: null as unknown,
    limitArg: null as unknown,
    rows: [] as Array<Record<string, unknown>>,
    leftJoinCalls: 0,
  };

  const makeLimited = () => ({
    limit: vi.fn(async (n: number) => {
      state.limitArg = n;
      return state.rows;
    }),
  });

  const makeWhere = () => ({
    where: vi.fn((predicate: unknown) => {
      state.whereArg = predicate;
      return makeLimited();
    }),
  });

  const makeFrom = () => ({
    from: vi.fn((table: unknown) => {
      state.fromArg = table;
      const builder = makeWhere();
      // Mirrors the wide reads' author join so an accidental join call is
      // observable; the narrow probes must never reach it.
      return {
        ...builder,
        leftJoin: vi.fn(() => {
          state.leftJoinCalls += 1;
          return builder;
        }),
      };
    }),
  });

  return {
    state,
    reset() {
      state.selectArg = null;
      state.fromArg = null;
      state.whereArg = null;
      state.limitArg = null;
      state.rows = [];
      state.leftJoinCalls = 0;
    },
    db: {
      select: vi.fn((projection: unknown) => {
        state.selectArg = projection;
        return makeFrom();
      }),
    },
  };
});

// Heavy loaders the wide `getEntry`/`getEntryBySlug` reads call but the narrow
// probes must never invoke: the SEO document read and the taxonomy read.
const heavyLoaders = vi.hoisted(() => ({
  getSeoDocumentByTarget: vi.fn(),
  getEntryTaxonomies: vi.fn(),
}));

vi.mock("../../../core/db/client", () => ({ db: mockDb.db }));
vi.mock("../../../core/services/seo/seoService", () => ({
  getSeoDocumentByTarget: heavyLoaders.getSeoDocumentByTarget,
}));
vi.mock("../../../core/services/content/taxonomyService", () => ({
  getEntryTaxonomies: heavyLoaders.getEntryTaxonomies,
}));

import { contentEntries } from "../../../core/db/schema";
import {
  getEntryVisibilityById,
  getEntryVisibilityBySlug,
} from "../../../core/services/content/entryReadService";

afterEach(() => {
  mockDb.reset();
  vi.clearAllMocks();
});

// Columns the wide entry reads project that the narrow probe must never select.
const wideEntryColumns = [
  "typeId",
  "authorId",
  "title",
  "slug",
  "status",
  "hasPassword",
  "tags",
  "data",
  "publishedAt",
  "scheduledAt",
  "createdAt",
  "updatedAt",
  "authorName",
  "authorEmail",
  "authorEmailEncrypted",
];

const projectionRecord = (): Record<string, unknown> =>
  mockDb.state.selectArg as Record<string, unknown>;

const expectNarrowProjection = () => {
  const projection = projectionRecord();
  expect(Object.keys(projection)).toEqual(["id", "visibility"]);
  for (const column of wideEntryColumns) {
    expect(projection).not.toHaveProperty(column);
  }
};

const expectNoHeavyLoaders = () => {
  expect(mockDb.state.leftJoinCalls).toBe(0);
  expect(heavyLoaders.getSeoDocumentByTarget).not.toHaveBeenCalled();
  expect(heavyLoaders.getEntryTaxonomies).not.toHaveBeenCalled();
};

const compilePredicate = (predicate: unknown): { sql: string; params: unknown[] } =>
  new PgDialect().sqlToQuery(predicate as SQL);

describe("getEntryVisibilityById", () => {
  it("selects only id/visibility, stays joined-query free, and returns the row", async () => {
    mockDb.state.rows = [{ id: "entry-1", visibility: "private" }];

    const result = await getEntryVisibilityById("entry-1");

    expect(result).toEqual({ id: "entry-1", visibility: "private" });
    expectNarrowProjection();
    expect(mockDb.state.fromArg).toBe(contentEntries);
    expect(mockDb.state.limitArg).toBe(1);
    expectNoHeavyLoaders();
  });

  it("returns null when no entry matches", async () => {
    mockDb.state.rows = [];

    expect(await getEntryVisibilityById("missing")).toBeNull();
    expectNarrowProjection();
    expect(mockDb.state.limitArg).toBe(1);
    expectNoHeavyLoaders();
  });
});

describe("getEntryVisibilityBySlug", () => {
  it("keeps the (typeId, slug) scope in the WHERE predicate", async () => {
    mockDb.state.rows = [{ id: "entry-2", visibility: "password" }];

    const result = await getEntryVisibilityBySlug("type-9", "my-slug");

    expect(result).toEqual({ id: "entry-2", visibility: "password" });
    expectNarrowProjection();
    expect(mockDb.state.fromArg).toBe(contentEntries);
    expect(mockDb.state.limitArg).toBe(1);
    expectNoHeavyLoaders();

    // Entry slugs are unique only per type, so a slug-only predicate could
    // match a different type's entry; both columns must be ANDed into WHERE.
    const compiled = compilePredicate(mockDb.state.whereArg);
    expect(compiled.sql).toContain('"content_entries"."type_id" = $1');
    expect(compiled.sql).toContain('"content_entries"."slug" = $2');
    expect(compiled.params).toEqual(["type-9", "my-slug"]);
  });

  it("returns null when no entry matches the scoped predicate", async () => {
    mockDb.state.rows = [];

    expect(await getEntryVisibilityBySlug("type-9", "no-such-slug")).toBeNull();
    expectNarrowProjection();
    expect(mockDb.state.limitArg).toBe(1);
    expectNoHeavyLoaders();
  });
});
