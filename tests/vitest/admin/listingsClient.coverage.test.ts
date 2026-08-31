import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  apiRequest,
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  broadcastCacheEvent,
  resetLocalCache,
  primeLocalCache,
  readLocalCacheValue,
} = vi.hoisted(() => {
  const localCacheStore = new Map<string, unknown>();
  return {
    apiRequest: vi.fn(),
    readLocalCache: vi.fn(),
    writeLocalCache: vi.fn(),
    clearLocalCache: vi.fn(),
    broadcastCacheEvent: vi.fn(),
    resetLocalCache: () => {
      localCacheStore.clear();
    },
    primeLocalCache: (key: string, value: unknown) => {
      localCacheStore.set(key, value);
    },
    readLocalCacheValue: (key: string) => localCacheStore.get(key) ?? null,
  };
});

vi.mock("@/services/apiClient", () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  getCsrfToken: vi.fn(() => Promise.resolve("csrf-token")),
  isApiClientError: (error: unknown) => error instanceof Error && error.name === "ApiClientError",
}));

vi.mock("@/utils/storageCache", () => ({
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  createMemoryBackedLocalCache: () => ({
    read: readLocalCache,
    write: writeLocalCache,
    clear: clearLocalCache,
  }),
}));

vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent }));

import {
  clearListingQueriesCache,
  clearListingTemplatesCache,
  createListingQuery,
  createListingTemplate,
  deleteListingQuery,
  deleteListingTemplate,
  getCachedListingQueries,
  getCachedListingQuery,
  getCachedListingTemplate,
  getCachedListingTemplates,
  getListingQuery,
  getListingQueryCached,
  getListingTemplate,
  getListingTemplateCached,
  listListingQueries,
  listListingQueriesCached,
  listListingTemplates,
  listListingTemplatesCached,
  previewListingFilters,
  previewListingQuery,
  previewPublicSearch,
  updateListingQuery,
  updateListingTemplate,
} from "../../../core/admin/services/listingsClient";
import type { ListingQueryPayload } from "../../../core/admin/services/listingsClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const query = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "query-1",
  name: "Recent entries",
  description: null,
  query: {
    source: "entries",
    sourceConfig: { contentTypeId: "post", includeDrafts: false },
    filters: [],
    sort: [{ field: "createdAt", dir: "desc" }],
    pagination: { limit: 10, offset: 0 },
    fields: ["title", "slug"],
  } satisfies ListingQueryPayload,
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const template = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "template-1",
  name: "Grid cards",
  slug: "grid-cards",
  description: null,
  layout: "grid",
  config: {
    fields: [],
    itemActions: [],
    emptyState: { title: "Nothing yet", description: null, ctaLabel: null, ctaHref: null },
    style: { columns: 3, gap: "md", cardVariant: "default" },
  },
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const json = (init: Record<string, unknown>) => ({
  headers: { "Content-Type": "application/json" },
  ...init,
});

beforeEach(() => {
  vi.resetAllMocks();
  resetLocalCache();
  readLocalCache.mockImplementation(
    (key: string, _ttlMs: number, validate?: (value: unknown) => boolean) => {
      const value = readLocalCacheValue(key);
      if (value === null) return null;
      if (validate && !validate(value)) return null;
      return value;
    }
  );
  writeLocalCache.mockImplementation((key: string, value: unknown) => {
    primeLocalCache(key, value);
  });
  clearLocalCache.mockImplementation((key: string) => {
    primeLocalCache(key, undefined);
  });
  clearListingQueriesCache();
  clearListingTemplatesCache();
});

describe("cached getters and clear helpers", () => {
  test("getCachedListingQueries hydrates from local cache and returns null on miss", () => {
    expect(getCachedListingQueries()).toBeNull();
    writeLocalCache(cacheKeys.listingQueriesList, [query()]);
    expect(getCachedListingQueries()).toEqual([query()]);
    expect(getCachedListingQueries()).toEqual([query()]);
  });

  test("getCachedListingQuery reads the detail cache", () => {
    expect(getCachedListingQuery("query-1")).toBeNull();
    writeLocalCache(cacheKeys.listingQueryDetail("query-1"), query());
    expect(getCachedListingQuery("query-1")).toEqual(query());
  });

  test("clearListingQueriesCache drops the in-memory state", () => {
    writeLocalCache(cacheKeys.listingQueriesList, [query()]);
    getCachedListingQueries();
    clearListingQueriesCache();
    expect(getCachedListingQueries()).toBeNull();
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.listingQueriesList);
  });

  test("getCachedListingTemplates hydrates from local cache and returns null on miss", () => {
    expect(getCachedListingTemplates()).toBeNull();
    writeLocalCache(cacheKeys.listingTemplatesList, [template()]);
    expect(getCachedListingTemplates()).toEqual([template()]);
    expect(getCachedListingTemplates()).toEqual([template()]);
  });

  test("getCachedListingTemplate reads the detail cache", () => {
    expect(getCachedListingTemplate("template-1")).toBeNull();
    writeLocalCache(cacheKeys.listingTemplateDetail("template-1"), template());
    expect(getCachedListingTemplate("template-1")).toEqual(template());
  });

  test("clearListingTemplatesCache drops the in-memory state", () => {
    writeLocalCache(cacheKeys.listingTemplatesList, [template()]);
    getCachedListingTemplates();
    clearListingTemplatesCache();
    expect(getCachedListingTemplates()).toBeNull();
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.listingTemplatesList);
  });
});

describe("listing queries", () => {
  test("listListingQueries issues GET and defaults missing items", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listListingQueries()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/listings/queries", { method: "GET" });

    apiRequest.mockResolvedValueOnce({ items: [query()] });
    await expect(listListingQueries()).resolves.toEqual([query()]);
  });

  test("listListingQueriesCached hits cache, in-flight and fetch paths", async () => {
    writeLocalCache(cacheKeys.listingQueriesList, [query()]);
    await expect(listListingQueriesCached()).resolves.toEqual([query()]);
    expect(apiRequest).not.toHaveBeenCalled();
    clearListingQueriesCache();

    apiRequest.mockResolvedValueOnce({ items: [query()] });
    const first = listListingQueriesCached();
    const second = listListingQueriesCached();
    await expect(Promise.all([first, second])).resolves.toEqual([[query()], [query()]]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.listingQueriesList, [query()]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.listingQueryDetail("query-1"), query());
  });

  test("listListingQueriesCached honors force and re-fetches", async () => {
    writeLocalCache(cacheKeys.listingQueriesList, [query({ name: "Stale" })]);
    apiRequest.mockResolvedValueOnce({ items: [query({ name: "Fresh" })] });
    await expect(listListingQueriesCached({ force: true })).resolves.toEqual([
      query({ name: "Fresh" }),
    ]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.listingQueriesList, [
      query({ name: "Fresh" }),
    ]);
  });

  test("getListingQuery fetches a single record", async () => {
    apiRequest.mockResolvedValueOnce(query());
    await expect(getListingQuery("query-1")).resolves.toEqual(query());
    expect(apiRequest).toHaveBeenCalledWith("/listings/queries/query-1", { method: "GET" });
  });

  test("getListingQueryCached reads the detail cache and upserts on fetch", async () => {
    writeLocalCache(cacheKeys.listingQueryDetail("query-1"), query({ name: "Cached" }));
    await expect(getListingQueryCached("query-1")).resolves.toEqual(query({ name: "Cached" }));
    expect(apiRequest).not.toHaveBeenCalled();

    apiRequest.mockResolvedValueOnce(query({ name: "Remote" }));
    await expect(getListingQueryCached("query-1", { force: true })).resolves.toEqual(
      query({ name: "Remote" })
    );
    expect(getCachedListingQueries()).toEqual([query({ name: "Remote" })]);
  });

  test("getListingQueryCached falls back to the list on fetch failure", async () => {
    apiRequest.mockRejectedValueOnce({ code: "listing_query_not_found", status: 404 });
    apiRequest.mockResolvedValueOnce({ items: [query(), query({ id: "query-2" })] });
    await expect(getListingQueryCached("query-2")).resolves.toEqual(query({ id: "query-2" }));
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.listingQueryDetail("query-2"),
      query({ id: "query-2" })
    );

    apiRequest.mockRejectedValueOnce({ code: "listing_query_not_found", status: 404 });
    apiRequest.mockResolvedValueOnce({ items: [query()] });
    await expect(getListingQueryCached("query-404")).resolves.toBeNull();
  });

  test("createListingQuery posts with CSRF, upserts and broadcasts", async () => {
    const created = query();
    apiRequest.mockResolvedValueOnce(created);
    await createListingQuery({ name: "Recent entries", query: query().query });
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/queries",
      json({
        method: "POST",
        body: JSON.stringify({ name: "Recent entries", query: query().query }),
      }),
      { withCsrf: true }
    );
    expect(getCachedListingQueries()).toEqual([created]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.listingQueriesList,
      action: "update",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.listingQueryDetail(created.id),
      action: "update",
    });
  });

  test("updateListingQuery patches, merges into the cached list and broadcasts", async () => {
    writeLocalCache(cacheKeys.listingQueriesList, [query({ name: "Old" })]);
    const updated = query({ name: "New" });
    apiRequest.mockResolvedValueOnce(updated);
    await updateListingQuery("query-1", { name: "New" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/queries/query-1",
      json({ method: "PATCH", body: JSON.stringify({ name: "New" }) }),
      { withCsrf: true }
    );
    expect(getCachedListingQueries()).toEqual([updated]);
    expect(getCachedListingQuery("query-1")).toEqual(updated);
  });

  test("deleteListingQuery removes entry, clears detail and broadcasts", async () => {
    writeLocalCache(cacheKeys.listingQueriesList, [query(), query({ id: "query-2" })]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteListingQuery("query-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/queries/query-1",
      { method: "DELETE" },
      { withCsrf: true }
    );
    expect(getCachedListingQueries()).toEqual([query({ id: "query-2" })]);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.listingQueryDetail("query-1"));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.listingQueriesList,
      action: "invalidate",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.listingQueryDetail("query-1"),
      action: "invalidate",
    });
  });

  test("previewListingQuery posts the payload with CSRF", async () => {
    const preview = { source: "entries", total: 4, limit: 10, offset: 0, rows: [] };
    apiRequest.mockResolvedValueOnce(preview);
    await expect(previewListingQuery(query().query)).resolves.toEqual(preview);
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/queries/preview",
      json({ method: "POST", body: JSON.stringify(query().query) }),
      { withCsrf: true }
    );
  });

  test("previewListingFilters posts the payload with CSRF", async () => {
    const preview = {
      listingQueryId: "query-1",
      total: 2,
      limit: 10,
      offset: 0,
      rows: [],
      rejectedTokens: [],
      appliedFilters: [],
      appliedSort: [],
      page: null,
      searchQuery: null,
    };
    apiRequest.mockResolvedValueOnce(preview);
    await expect(
      previewListingFilters({ listingQueryId: "query-1", queryString: "abc" })
    ).resolves.toEqual(preview);
    expect(apiRequest).toHaveBeenCalledWith(
      "/filters/preview",
      json({
        method: "POST",
        body: JSON.stringify({ listingQueryId: "query-1", queryString: "abc" }),
      }),
      { withCsrf: true }
    );
  });
});

describe("public search preview", () => {
  test("previewPublicSearch builds params for q only", async () => {
    const result = { query: "about", sources: [], items: [] };
    apiRequest.mockResolvedValueOnce(result);
    await expect(previewPublicSearch({ q: "about" })).resolves.toEqual(result);
    expect(apiRequest).toHaveBeenCalledWith("/search/public-preview?q=about", { method: "GET" });
  });

  test("previewPublicSearch includes limit and sources when valid", async () => {
    const result = { query: "about", sources: ["pages"], items: [] };
    apiRequest.mockResolvedValueOnce(result);
    await expect(
      previewPublicSearch({ q: "about", limit: 7.9, sources: ["pages", "entries"] })
    ).resolves.toEqual(result);
    expect(apiRequest).toHaveBeenCalledWith(
      "/search/public-preview?q=about&limit=7&sources=pages%2Centries",
      { method: "GET" }
    );
  });

  test("previewPublicSearch skips invalid limit and empty sources", async () => {
    const result = { query: "about", sources: [], items: [] };
    apiRequest.mockResolvedValueOnce(result);
    await expect(previewPublicSearch({ q: "about", limit: 0, sources: [] })).resolves.toEqual(
      result
    );
    expect(apiRequest).toHaveBeenCalledWith("/search/public-preview?q=about", { method: "GET" });

    apiRequest.mockResolvedValueOnce(result);
    await expect(
      previewPublicSearch({ q: "about", limit: Number.NaN, sources: undefined })
    ).resolves.toEqual(result);
    expect(apiRequest).toHaveBeenCalledWith("/search/public-preview?q=about", { method: "GET" });
  });
});

describe("listing templates", () => {
  test("listListingTemplates issues GET and defaults missing items", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listListingTemplates()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/listings/templates", { method: "GET" });
  });

  test("listListingTemplatesCached hits cache, in-flight and fetch paths", async () => {
    writeLocalCache(cacheKeys.listingTemplatesList, [template()]);
    await expect(listListingTemplatesCached()).resolves.toEqual([template()]);
    expect(apiRequest).not.toHaveBeenCalled();
    clearListingTemplatesCache();

    apiRequest.mockResolvedValueOnce({ items: [template()] });
    const first = listListingTemplatesCached();
    const second = listListingTemplatesCached();
    await expect(Promise.all([first, second])).resolves.toEqual([[template()], [template()]]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.listingTemplatesList, [template()]);
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.listingTemplateDetail("template-1"),
      template()
    );

    apiRequest.mockResolvedValueOnce({ items: [template({ name: "Fresh" })] });
    await expect(listListingTemplatesCached({ force: true })).resolves.toEqual([
      template({ name: "Fresh" }),
    ]);
  });

  test("getListingTemplate fetches a single record", async () => {
    apiRequest.mockResolvedValueOnce(template());
    await expect(getListingTemplate("template-1")).resolves.toEqual(template());
    expect(apiRequest).toHaveBeenCalledWith("/listings/templates/template-1", { method: "GET" });
  });

  test("getListingTemplateCached reads the detail cache and upserts on fetch", async () => {
    writeLocalCache(cacheKeys.listingTemplateDetail("template-1"), template({ name: "Cached" }));
    await expect(getListingTemplateCached("template-1")).resolves.toEqual(
      template({ name: "Cached" })
    );
    expect(apiRequest).not.toHaveBeenCalled();

    apiRequest.mockResolvedValueOnce(template({ name: "Remote" }));
    await expect(getListingTemplateCached("template-1", { force: true })).resolves.toEqual(
      template({ name: "Remote" })
    );
    expect(getCachedListingTemplates()).toEqual([template({ name: "Remote" })]);
  });

  test("getListingTemplateCached falls back to the list on fetch failure", async () => {
    apiRequest.mockRejectedValueOnce({ code: "listing_template_not_found", status: 404 });
    apiRequest.mockResolvedValueOnce({ items: [template(), template({ id: "template-2" })] });
    await expect(getListingTemplateCached("template-2")).resolves.toEqual(
      template({ id: "template-2" })
    );
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.listingTemplateDetail("template-2"),
      template({ id: "template-2" })
    );

    apiRequest.mockRejectedValueOnce({ code: "listing_template_not_found", status: 404 });
    apiRequest.mockResolvedValueOnce({ items: [template()] });
    await expect(getListingTemplateCached("template-404")).resolves.toBeNull();
  });

  test("createListingTemplate posts with CSRF, upserts and broadcasts", async () => {
    const created = template();
    apiRequest.mockResolvedValueOnce(created);
    await createListingTemplate({ name: "Grid cards" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/templates",
      json({ method: "POST", body: JSON.stringify({ name: "Grid cards" }) }),
      { withCsrf: true }
    );
    expect(getCachedListingTemplates()).toEqual([created]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.listingTemplatesList,
      action: "update",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.listingTemplateDetail(created.id),
      action: "update",
    });
  });

  test("updateListingTemplate patches, merges into the cached list and broadcasts", async () => {
    writeLocalCache(cacheKeys.listingTemplatesList, [template({ name: "Old" })]);
    const updated = template({ name: "New" });
    apiRequest.mockResolvedValueOnce(updated);
    await updateListingTemplate("template-1", { name: "New" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/templates/template-1",
      json({ method: "PATCH", body: JSON.stringify({ name: "New" }) }),
      { withCsrf: true }
    );
    expect(getCachedListingTemplates()).toEqual([updated]);
    expect(getCachedListingTemplate("template-1")).toEqual(updated);
  });

  test("deleteListingTemplate removes entry, clears detail and broadcasts", async () => {
    writeLocalCache(cacheKeys.listingTemplatesList, [template(), template({ id: "template-2" })]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteListingTemplate("template-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/listings/templates/template-1",
      { method: "DELETE" },
      { withCsrf: true }
    );
    expect(getCachedListingTemplates()).toEqual([template({ id: "template-2" })]);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.listingTemplateDetail("template-1"));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.listingTemplatesList,
      action: "invalidate",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.listingTemplateDetail("template-1"),
      action: "invalidate",
    });
  });
});
