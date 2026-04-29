import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import {
  buildListingExecutionPlan,
  executeListingQuery,
  parseListingQuery,
  parseListingQueryCreateInput,
  parseListingQueryUpdateInput,
} from "../../../core/services/content/queryBuilderService";

type ListingQueryFixture = {
  source: string;
  sourceConfig: Record<string, unknown>;
  filters: Array<{ field: string; op: string; value?: unknown }>;
  sort: Array<{ field: string; dir: string }>;
  pagination: { limit: number; offset: number };
  fields: string[];
};

const buildEntriesQuery = (): ListingQueryFixture => ({
  source: "entries",
  sourceConfig: {
    contentTypeId: "  type-post  ",
    includeDrafts: true,
  },
  filters: [{ field: "status", op: "eq", value: "  published  " }],
  sort: [{ field: "publishedAt", dir: "desc" }],
  pagination: { limit: 12, offset: 0 },
  fields: ["id", "slug", "title"],
});

const expectApiErrorCode = (run: () => unknown, expectedCode: string) => {
  let captured: unknown;
  try {
    run();
  } catch (error) {
    captured = error;
  }

  expect(captured).toBeInstanceOf(ApiError);
  if (captured instanceof ApiError) {
    expect(captured.code).toBe(expectedCode);
  }
};

const expectAsyncApiErrorCode = async (
  run: () => Promise<unknown>,
  expectedCode: string
) => {
  let captured: unknown;
  try {
    await run();
  } catch (error) {
    captured = error;
  }

  expect(captured).toBeInstanceOf(ApiError);
  if (captured instanceof ApiError) {
    expect(captured.code).toBe(expectedCode);
  }
};

test("parseListingQuery normalizes values and source config", () => {
  const parsed = parseListingQuery(buildEntriesQuery());
  expect(parsed.sourceConfig.contentTypeId).toBe("type-post");
  expect(parsed.filters[0]?.value).toBe("published");
});

test("parseListingQuery rejects entries source without contentTypeId", () => {
  const query = buildEntriesQuery();
  query.sourceConfig.contentTypeId = "   ";
  expectApiErrorCode(() => parseListingQuery(query), "listing_query_invalid_source_config");
});

test("parseListingQuery rejects taxonomyId for entries source", () => {
  const query = buildEntriesQuery();
  query.sourceConfig = { ...query.sourceConfig, taxonomyId: "tax-1" };
  expectApiErrorCode(() => parseListingQuery(query), "listing_query_invalid_source_config");
});

test("parseListingQuery rejects includeDrafts for users source", () => {
  const query = buildEntriesQuery();
  query.source = "users";
  query.sourceConfig = { includeDrafts: true };
  expectApiErrorCode(() => parseListingQuery(query), "listing_query_invalid_source_config");
});

test("parseListingQuery rejects unsafe field segments", () => {
  const query = buildEntriesQuery();
  query.fields = ["id", "__proto__.polluted"];
  expectApiErrorCode(() => parseListingQuery(query), "listing_query_invalid_field");
});

test("executeListingQuery guards projection paths against prototype pollution", async () => {
  const query = buildEntriesQuery();
  query.fields = ["__proto__.polluted"];

  await expectAsyncApiErrorCode(
    () =>
      executeListingQuery(query, {
        rowsResolver: async () => [{ id: "entry-1", title: "Entry" }],
      }),
    "listing_query_invalid_field"
  );

  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});

test("executeListingQuery still projects safe nested fields", async () => {
  const query = buildEntriesQuery();
  query.fields = ["data.seo.title"];

  const result = await executeListingQuery(query, {
    rowsResolver: async () => [
      { id: "entry-1", status: "published", data: { seo: { title: "SEO title" } } },
    ],
  });

  expect(result.rows).toEqual([{ id: "entry-1", data: { seo: { title: "SEO title" } } }]);
});

test("parseListingQuery rejects value for exists operator", () => {
  const query = buildEntriesQuery();
  query.filters = [{ field: "seo.description", op: "exists", value: true }];
  expectApiErrorCode(() => parseListingQuery(query), "listing_query_invalid_filter_value");
});

test("parseListingQuery rejects invalid between payload", () => {
  const query = buildEntriesQuery();
  query.filters = [{ field: "price", op: "between", value: [10] }];
  expectApiErrorCode(() => parseListingQuery(query), "listing_query_invalid_filter_value");
});

test("parseListingQueryCreateInput trims name and normalizes blank description", () => {
  const parsed = parseListingQueryCreateInput({
    name: "  Homepage listing  ",
    description: "   ",
    query: buildEntriesQuery(),
  });

  expect(parsed.name).toBe("Homepage listing");
  expect(parsed.description).toBeNull();
  expect(parsed.query.source).toBe("entries");
});

test("parseListingQueryCreateInput rejects whitespace-only name", () => {
  expectApiErrorCode(
    () =>
      parseListingQueryCreateInput({
        name: "    ",
        query: buildEntriesQuery(),
      }),
    "listing_query_invalid_name"
  );
});

test("parseListingQueryUpdateInput rejects whitespace-only name", () => {
  expectApiErrorCode(() => parseListingQueryUpdateInput({ name: "   " }), "listing_query_invalid_name");
});

test("parseListingQueryUpdateInput normalizes description and query", () => {
  const parsed = parseListingQueryUpdateInput({
    description: "   ",
    query: buildEntriesQuery(),
  });

  expect(parsed.description).toBeNull();
  expect(parsed.query?.sourceConfig.contentTypeId).toBe("type-post");
});

test("parseListingQueryUpdateInput rejects empty payload", () => {
  expectApiErrorCode(() => parseListingQueryUpdateInput({}), "listing_query_invalid");
});

test("buildListingExecutionPlan adds deterministic id sort and field projection", () => {
  const plan = buildListingExecutionPlan({
    source: "users",
    sourceConfig: {},
    filters: [],
    sort: [{ field: "updatedAt", dir: "desc" }],
    pagination: { limit: 10, offset: 0 },
    fields: ["name"],
  });

  expect(plan.fields[0]).toBe("id");
  expect(plan.sort.at(-1)).toEqual({ field: "id", dir: "asc" });
});

test("buildListingExecutionPlan rejects fields not allowed for source", () => {
  expectApiErrorCode(
    () =>
      buildListingExecutionPlan({
        source: "users",
        sourceConfig: {},
        filters: [{ field: "data.secret", op: "exists" }],
        sort: [],
        pagination: { limit: 10, offset: 0 },
        fields: ["name"],
      }),
    "listing_query_field_not_allowed"
  );
});

test("executeListingQuery applies filters and deterministic sorting", async () => {
  const now = new Date("2026-02-18T10:00:00.000Z");
  const rows = [
    { id: "b", title: "Second", status: "published", updatedAt: now },
    { id: "a", title: "First", status: "published", updatedAt: now },
    { id: "c", title: "Draft", status: "draft", updatedAt: new Date("2026-02-17T10:00:00.000Z") },
  ];

  const result = await executeListingQuery(
    {
      source: "entries",
      sourceConfig: { contentTypeId: "type-post" },
      filters: [{ field: "status", op: "eq", value: "published" }],
      sort: [{ field: "updatedAt", dir: "desc" }],
      pagination: { limit: 10, offset: 0 },
      fields: ["title", "updatedAt"],
    },
    {
      rowsResolver: async () => rows,
    }
  );

  expect(result.total).toBe(2);
  expect(result.rows.map((row) => row.id)).toEqual(["a", "b"]);
  expect(result.rows[0]).toEqual({
    id: "a",
    title: "First",
    updatedAt: now,
  });
});

test("executeListingQuery supports array in-filter and pagination", async () => {
  const rows = [
    { id: "1", title: "One", tags: ["release", "news"], updatedAt: new Date("2026-02-18T10:00:00.000Z") },
    { id: "2", title: "Two", tags: ["tips"], updatedAt: new Date("2026-02-17T10:00:00.000Z") },
    { id: "3", title: "Three", tags: ["release"], updatedAt: new Date("2026-02-16T10:00:00.000Z") },
  ];

  const result = await executeListingQuery(
    {
      source: "entries",
      sourceConfig: { contentTypeId: "type-post" },
      filters: [{ field: "tags", op: "in", value: ["release"] }],
      sort: [{ field: "updatedAt", dir: "desc" }],
      pagination: { limit: 1, offset: 1 },
      fields: ["title"],
    },
    {
      rowsResolver: async () => rows,
    }
  );

  expect(result.total).toBe(2);
  expect(result.rows).toEqual([{ id: "3", title: "Three" }]);
});
