import { expect, test } from "bun:test";

import { resolveListingFiltersRuntimeData } from "../../../core/services/search/listingRuntimeService";
import type { ListingQueryRecord } from "../../../core/services/content/listingQueriesService";

const listingQuery: ListingQueryRecord = {
  id: "listing-query-1",
  name: "Users",
  description: null,
  query: {
    source: "users",
    sourceConfig: {},
    filters: [],
    sort: [{ field: "updatedAt", dir: "desc" }],
    pagination: { limit: 10, offset: 0 },
    fields: ["id", "name", "status", "updatedAt", "score"],
  },
  createdAt: new Date("2026-02-01T10:00:00.000Z"),
  updatedAt: new Date("2026-02-01T10:00:00.000Z"),
};

test("resolveListingFiltersRuntimeData returns empty payload without query", async () => {
  const result = await resolveListingFiltersRuntimeData({
    listingQueryId: "",
    facets: [],
    preview: false,
  });

  expect(result.listingQueryId).toBe("");
  expect(result.metrics).toEqual([]);
  expect(result.total).toBe(0);
});

test("resolveListingFiltersRuntimeData returns error when query is missing", async () => {
  const result = await resolveListingFiltersRuntimeData(
    {
      listingQueryId: "missing-query",
      facets: [],
      preview: false,
    },
    {
      getListingQueryById: async () => null,
      executeListing: async () => ({
        source: "users",
        total: 0,
        limit: 10,
        offset: 0,
        rows: [],
      }),
    }
  );

  expect(result.error).toBe("Selected listing query no longer exists.");
  expect(result.metrics).toEqual([]);
});

test("resolveListingFiltersRuntimeData computes metrics from runtime rows", async () => {
  const result = await resolveListingFiltersRuntimeData(
    {
      listingQueryId: "listing-query-1",
      facets: [
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
      ],
      preview: false,
      runtimeSearchParams: new URLSearchParams({
        "lq.listing-query-1.status.in": "active",
      }),
    },
    {
      getListingQueryById: async () => listingQuery,
      executeListing: async () => ({
        source: "users",
        total: 2,
        limit: 10,
        offset: 0,
        rows: [
          { id: "u1", status: "active", updatedAt: "2026-02-10T10:00:00.000Z" },
          { id: "u2", status: "invited", updatedAt: "2026-02-11T10:00:00.000Z" },
        ],
      }),
    }
  );

  expect(result.error).toBeUndefined();
  expect(result.total).toBe(2);
  expect(result.metrics).toHaveLength(1);
  expect(result.metrics[0]?.options.find((option) => option.value === "active")?.active).toBe(
    true
  );
});
