import { expect, test } from "vitest";

import {
  computeListingFacetMetrics,
  parseListingRuntimeOverrides,
  resolveListingRuntimeOverrides,
} from "../../../core/services/search/filterEngine";
import {
  buildListingRuntimeParamName,
  buildFacetSortToken,
  normalizeListingFacetConfigs,
  listingRuntimeTokens,
} from "../../../core/services/search/filterContract";
import type { ListingQuery } from "../../../core/services/content/listingQueryContract";

const baseUsersQuery: ListingQuery = {
  source: "users",
  sourceConfig: {},
  filters: [],
  sort: [{ field: "updatedAt", dir: "desc" }],
  pagination: { limit: 10, offset: 0 },
  fields: ["id", "name", "email", "status", "updatedAt", "roleIds"],
};

test("parseListingRuntimeOverrides reads valid runtime tokens", () => {
  const params = new URLSearchParams();
  params.set(buildListingRuntimeParamName("query-1", "status.eq"), "active");
  params.set(buildListingRuntimeParamName("query-1", "roleIds.in"), "admin,editor");
  params.set(
    buildListingRuntimeParamName("query-1", listingRuntimeTokens.sort),
    buildFacetSortToken("updatedAt", "asc")
  );
  params.set(buildListingRuntimeParamName("query-1", listingRuntimeTokens.page), "2");
  params.set(buildListingRuntimeParamName("query-1", listingRuntimeTokens.search), "john");
  params.set(buildListingRuntimeParamName("query-1", "invalid-token"), "x");

  const draft = parseListingRuntimeOverrides(params, "query-1");

  expect(draft.listingQueryId).toBe("query-1");
  expect(draft.filters).toHaveLength(2);
  expect(draft.sort).toEqual({
    field: "updatedAt",
    dir: "asc",
    token: listingRuntimeTokens.sort,
  });
  expect(draft.page).toBe(2);
  expect(draft.searchQuery).toBe("john");
  expect(draft.rejectedTokens).toContain("invalid-token");
});

test("parseListingRuntimeOverrides canonicalizes safe runtime aliases", () => {
  const params = new URLSearchParams();
  params.set("rooms", "3,4");
  params.set("sort", buildFacetSortToken("updatedAt", "asc"));
  params.set("q", "loft");
  params.set("page", "2");
  params.set(buildListingRuntimeParamName("query-1", "status.eq"), "active");
  params.set(buildListingRuntimeParamName("query-1", "data.rooms.in"), "5");

  const draft = parseListingRuntimeOverrides(params, "query-1", {
    rooms: "data.rooms.in",
    sort: listingRuntimeTokens.sort,
    q: listingRuntimeTokens.search,
    page: listingRuntimeTokens.page,
  });

  expect(draft.filters).toEqual(
    expect.arrayContaining([
      { field: "status", op: "eq", value: "active", token: "status.eq" },
      { field: "data.rooms", op: "in", value: [5], token: "data.rooms.in" },
    ])
  );
  expect(draft.sort).toEqual({
    field: "updatedAt",
    dir: "asc",
    token: listingRuntimeTokens.sort,
  });
  expect(draft.searchQuery).toBe("loft");
  expect(draft.page).toBe(2);
});

test("resolveListingRuntimeOverrides applies safe runtime filters and rejects invalid ones", () => {
  const params = new URLSearchParams();
  params.set(buildListingRuntimeParamName("query-1", "status.eq"), "active");
  params.set(buildListingRuntimeParamName("query-1", "unknown.eq"), "x");
  params.set(buildListingRuntimeParamName("query-1", listingRuntimeTokens.page), "3");

  const draft = parseListingRuntimeOverrides(params, "query-1");
  const resolved = resolveListingRuntimeOverrides(baseUsersQuery, draft);

  expect(resolved.appliedFilters).toEqual(
    expect.arrayContaining([{ field: "status", op: "eq", value: "active" }])
  );
  expect(resolved.rejectedTokens).toContain("unknown.eq");
  expect(resolved.page).toBe(3);
  expect(resolved.query.pagination.offset).toBe(20);
});

test("computeListingFacetMetrics calculates counts, ranges, and sort active states", () => {
  const facets = normalizeListingFacetConfigs([
    {
      id: "status",
      kind: "checkbox",
      label: "Status",
      field: "status",
      op: "in",
      options: [
        { value: "active", label: "Active" },
        { value: "invited", label: "Invited" },
      ],
    },
    {
      id: "score",
      kind: "range",
      label: "Score",
      field: "score",
      op: "between",
    },
    {
      id: "sort",
      kind: "sort",
      label: "Sort",
      sortOptions: [
        {
          value: "updated-desc",
          label: "Newest",
          field: "updatedAt",
          dir: "desc",
        },
      ],
    },
  ]);

  const params = new URLSearchParams();
  params.set(buildListingRuntimeParamName("query-1", "status.in"), "active");
  params.set(buildListingRuntimeParamName("query-1", "score.between"), "10,20");
  params.set(
    buildListingRuntimeParamName("query-1", listingRuntimeTokens.sort),
    buildFacetSortToken("updatedAt", "desc")
  );
  const draft = parseListingRuntimeOverrides(params, "query-1");

  const metrics = computeListingFacetMetrics(
    [
      { status: "active", score: 15, updatedAt: "2026-02-10T12:00:00.000Z" },
      { status: "active", score: 25, updatedAt: "2026-02-11T12:00:00.000Z" },
      { status: "invited", score: 5, updatedAt: "2026-02-09T12:00:00.000Z" },
    ],
    facets,
    draft
  );

  const statusMetric = metrics.find((metric) => metric.id === "status");
  expect(statusMetric?.options.find((option) => option.value === "active")?.count).toBe(2);
  expect(statusMetric?.options.find((option) => option.value === "active")?.active).toBe(true);

  const scoreMetric = metrics.find((metric) => metric.id === "score");
  expect(scoreMetric?.range?.min).toBe(5);
  expect(scoreMetric?.range?.max).toBe(25);
  expect(scoreMetric?.range?.active).toEqual([10, 20]);

  const sortMetric = metrics.find((metric) => metric.id === "sort");
  expect(sortMetric?.options[0]?.value).toBe("updatedAt:desc");
  expect(sortMetric?.options[0]?.active).toBe(true);
});
