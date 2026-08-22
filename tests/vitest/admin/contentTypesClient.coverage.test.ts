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
  createMemoryBackedLocalCache: (config: {
    key: string;
    ttlMs: number;
    validate?: (value: unknown) => boolean;
  }) => ({
    read: () => {
      const value = readLocalCacheValue(config.key);
      if (value === null) return null;
      if (config.validate && !config.validate(value)) return null;
      return value;
    },
    write: (value: unknown) => {
      writeLocalCache(config.key, value);
    },
    clear: () => {
      clearLocalCache(config.key);
    },
  }),
}));

vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent }));

import {
  clearContentTypesCache,
  clearContentTypeCollectionWorkspaceCache,
  getCachedContentTypeCollectionWorkspace,
  getContentTypeBySlug,
  getContentTypeCached,
  getContentTypeCollectionWorkspaceCached,
  listContentTypesCached,
  deleteContentType,
  type ContentTypeSummary,
} from "../../../core/admin/services/contentTypesClient";
import { cacheKeys, cacheTtlMs } from "../../../core/admin/services/cachePolicy";

const contentTypeSummary = (id: string, name: string): ContentTypeSummary => ({
  id,
  name,
  slug: id,
  status: "published",
  schema: { type: "object", additionalProperties: false, properties: {} },
  createdAt: "2026-02-14T00:00:00.000Z",
  updatedAt: "2026-02-14T00:00:00.000Z",
});

const workspaceSummary = () => ({
  contentType: {
    id: "ct-1",
    name: "Products",
    slug: "products",
    status: "published",
    fieldCount: 3,
    updatedAt: "2026-05-10T08:00:00.000Z",
  },
  canonical: {
    contentRoute: {
      type: "products",
      listPath: "/products",
      detailPath: "/products/:slug",
      enabled: true,
      detailPageId: "detail-products",
    },
    detailPage: {
      id: "detail-products",
      label: "Product Detail",
      status: "published",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    listPage: {
      id: "page-products",
      label: "Products",
      slug: "products",
      status: "published",
      role: "canonical-list-page",
      compositionKey: "products",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    listingQuery: {
      id: "query-products",
      label: "Products Query",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    listingTemplate: {
      id: "template-products",
      label: "Product Grid",
      slug: "product-grid",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
    adminScreen: {
      id: "screen-products",
      label: "Products Admin",
      status: "active",
      role: "canonical-admin-screen",
      compositionKey: "products",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
  },
  linkedSecondary: {
    pages: [],
    adminScreens: [],
  },
  unresolved: [],
  candidates: {
    detailPages: [],
    pages: [],
    listingQueries: [],
    listingTemplates: [],
    adminScreens: [],
  },
});

beforeEach(() => {
  vi.resetAllMocks();
  resetLocalCache();
  clearContentTypesCache();
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
});

describe("resolved config defaults", () => {
  test("resolveDraftsEnabled honors an explicit false and defaults otherwise", async () => {
    const { resolveDraftsEnabled, resolveVersioning } =
      await import("../../../core/admin/services/contentTypesClient");
    expect(resolveDraftsEnabled(undefined)).toBe(true);
    expect(resolveDraftsEnabled({})).toBe(true);
    expect(resolveDraftsEnabled({ draftsEnabled: false })).toBe(false);
    expect(resolveVersioning(undefined)).toBe(false);
    expect(resolveVersioning({})).toBe(false);
    expect(resolveVersioning({ versioning: true })).toBe(true);
  });
});

describe("listContentTypesCached in-flight dedupe", () => {
  test("shares a single pending request", async () => {
    let resolveRequest!: (value: ContentTypeSummary[]) => void;
    apiRequest.mockImplementationOnce(
      () =>
        new Promise<ContentTypeSummary[]>((resolve) => {
          resolveRequest = resolve;
        })
    );
    const first = listContentTypesCached();
    const second = listContentTypesCached();
    resolveRequest([contentTypeSummary("ct-1", "Products")]);
    await expect(first).resolves.toEqual([contentTypeSummary("ct-1", "Products")]);
    await expect(second).resolves.toEqual([contentTypeSummary("ct-1", "Products")]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});

describe("getContentTypeCached fetch fallback", () => {
  test("fetches and upserts when detail and list caches are empty", async () => {
    const summary = contentTypeSummary("ct-1", "Products");
    apiRequest.mockResolvedValueOnce(summary);
    await expect(getContentTypeCached("ct-1")).resolves.toEqual(summary);
    expect(apiRequest).toHaveBeenCalledWith("/content-types/ct-1", { method: "GET" });
    // Upsert wrote both the list cache and the detail cache.
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.contentTypesList, [summary]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.contentTypeDetail("ct-1"), summary);
  });

  test("drops an invalid cached detail value", async () => {
    primeLocalCache(cacheKeys.contentTypeDetail("ct-1"), 0);
    const summary = contentTypeSummary("ct-1", "Products");
    apiRequest.mockResolvedValueOnce(summary);
    await expect(getContentTypeCached("ct-1")).resolves.toEqual(summary);
    expect(apiRequest).toHaveBeenCalled();
  });

  test("falls back to the cached list when the detail cache misses", async () => {
    primeLocalCache(cacheKeys.contentTypesList, [contentTypeSummary("ct-1", "Products")]);
    const result = await getContentTypeCached("ct-1");
    expect(result?.id).toBe("ct-1");
    expect(apiRequest).not.toHaveBeenCalled();
  });
});

describe("getContentTypeBySlug", () => {
  test("finds a type by slug", async () => {
    primeLocalCache(cacheKeys.contentTypesList, [contentTypeSummary("products", "Products")]);
    await expect(getContentTypeBySlug("products")).resolves.toMatchObject({ slug: "products" });
  });

  test("returns null when no type matches", async () => {
    primeLocalCache(cacheKeys.contentTypesList, [contentTypeSummary("products", "Products")]);
    await expect(getContentTypeBySlug("missing")).resolves.toBeNull();
  });
});

describe("content type collection workspace cache", () => {
  test("fetches a workspace and caches it", async () => {
    const summary = workspaceSummary();
    apiRequest.mockResolvedValueOnce(summary);
    const result = await getContentTypeCollectionWorkspaceCached("ct-1");
    expect(result).toEqual(summary);
    expect(apiRequest).toHaveBeenCalledWith("/content-types/ct-1/collection-workspace", {
      method: "GET",
    });
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.contentTypeCollectionWorkspace("ct-1"),
      summary
    );
    // A second call now hits the cache.
    await expect(getContentTypeCollectionWorkspaceCached("ct-1")).resolves.toEqual(summary);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("dedupes in-flight workspace requests", async () => {
    let resolveRequest!: (value: unknown) => void;
    apiRequest.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );
    const summary = workspaceSummary();
    const first = getContentTypeCollectionWorkspaceCached("ct-1");
    const second = getContentTypeCollectionWorkspaceCached("ct-1");
    resolveRequest(summary);
    await expect(first).resolves.toEqual(summary);
    await expect(second).resolves.toEqual(summary);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("force refetches even when cached", async () => {
    apiRequest.mockResolvedValueOnce(workspaceSummary());
    await getContentTypeCollectionWorkspaceCached("ct-1");
    const summary = workspaceSummary();
    apiRequest.mockResolvedValueOnce(summary);
    await expect(getContentTypeCollectionWorkspaceCached("ct-1", { force: true })).resolves.toEqual(
      summary
    );
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  test("clearContentTypeCollectionWorkspaceCache drops the memory cache", async () => {
    apiRequest.mockResolvedValueOnce(workspaceSummary());
    await getContentTypeCollectionWorkspaceCached("ct-1");
    clearContentTypeCollectionWorkspaceCache("ct-1");
    apiRequest.mockResolvedValueOnce(workspaceSummary());
    await getContentTypeCollectionWorkspaceCached("ct-1");
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  test("clearContentTypeCollectionWorkspaceCache clears localStorage when no memory cache", () => {
    clearContentTypeCollectionWorkspaceCache("ct-9");
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.contentTypeCollectionWorkspace("ct-9"));
  });
});

describe("workspace summary validators", () => {
  const readWorkspace = (summary: unknown) => {
    primeLocalCache(cacheKeys.contentTypeCollectionWorkspace("ct-1"), summary);
    return getCachedContentTypeCollectionWorkspace("ct-1");
  };

  test("accepts a valid workspace summary", () => {
    expect(readWorkspace(workspaceSummary())).toEqual(workspaceSummary());
  });

  const invalidVariants: Array<[string, (summary: Record<string, unknown>) => void]> = [
    ["non-record top level", (s) => Object.assign(s, { extra: true })],
    [
      "invalid contentRoute",
      (s) => {
        s.canonical = { ...(s.canonical as Record<string, unknown>), contentRoute: { type: 7 } };
      },
    ],
    [
      "invalid canonical detailPage",
      (s) => {
        s.canonical = { ...(s.canonical as Record<string, unknown>), detailPage: { id: 7 } };
      },
    ],
    [
      "invalid canonical listPage",
      (s) => {
        s.canonical = { ...(s.canonical as Record<string, unknown>), listPage: { id: 7 } };
      },
    ],
    [
      "invalid canonical listingQuery",
      (s) => {
        s.canonical = { ...(s.canonical as Record<string, unknown>), listingQuery: { id: 7 } };
      },
    ],
    [
      "invalid canonical listingTemplate",
      (s) => {
        s.canonical = { ...(s.canonical as Record<string, unknown>), listingTemplate: { id: 7 } };
      },
    ],
    [
      "invalid canonical adminScreen",
      (s) => {
        s.canonical = { ...(s.canonical as Record<string, unknown>), adminScreen: { id: 7 } };
      },
    ],
    [
      "invalid canonical shape",
      (s) => {
        s.canonical = "nope";
      },
    ],
    [
      "invalid linkedSecondary pages",
      (s) => {
        s.linkedSecondary = {
          ...(s.linkedSecondary as Record<string, unknown>),
          pages: [{ id: 7 }],
        };
      },
    ],
    [
      "linkedSecondary with extra keys",
      (s) => {
        s.linkedSecondary = { ...(s.linkedSecondary as Record<string, unknown>), extra: true };
      },
    ],
    [
      "invalid linkedSecondary adminScreens",
      (s) => {
        s.linkedSecondary = {
          ...(s.linkedSecondary as Record<string, unknown>),
          adminScreens: [{ id: 7 }],
        };
      },
    ],
    [
      "invalid unresolved member",
      (s) => {
        s.unresolved = [{ resource: "nope", reason: "missing_content_route" }];
      },
    ],
    [
      "unresolved not an array",
      (s) => {
        s.unresolved = "nope";
      },
    ],
    [
      "invalid candidates shape",
      (s) => {
        s.candidates = "nope";
      },
    ],
    [
      "invalid candidates detailPages",
      (s) => {
        s.candidates = { ...(s.candidates as Record<string, unknown>), detailPages: [{ id: 7 }] };
      },
    ],
    [
      "invalid candidates pages",
      (s) => {
        s.candidates = { ...(s.candidates as Record<string, unknown>), pages: [{ id: 7 }] };
      },
    ],
    [
      "invalid candidates listingQueries",
      (s) => {
        s.candidates = {
          ...(s.candidates as Record<string, unknown>),
          listingQueries: [{ id: 7 }],
        };
      },
    ],
    [
      "invalid candidates listingTemplates",
      (s) => {
        s.candidates = {
          ...(s.candidates as Record<string, unknown>),
          listingTemplates: [{ id: 7 }],
        };
      },
    ],
    [
      "invalid candidates adminScreens",
      (s) => {
        s.candidates = { ...(s.candidates as Record<string, unknown>), adminScreens: [{ id: 7 }] };
      },
    ],
    [
      "invalid contentType id",
      (s) => {
        s.contentType = { ...(s.contentType as Record<string, unknown>), id: 7 };
      },
    ],
    [
      "invalid contentType keys",
      (s) => {
        s.contentType = { ...(s.contentType as Record<string, unknown>), extra: true };
      },
    ],
  ];

  for (const [label, mutate] of invalidVariants) {
    test(`rejects ${label}`, () => {
      const summary = workspaceSummary() as unknown as Record<string, unknown>;
      mutate(summary);
      expect(readWorkspace(summary)).toBeNull();
    });
  }

  test("rejects invalid unresolved resource and reason", () => {
    const summary = workspaceSummary();
    expect(
      readWorkspace({ ...summary, unresolved: [{ resource: "contentRoute", reason: "nope" }] })
    ).toBeNull();
    expect(
      readWorkspace({
        ...summary,
        unresolved: [{ resource: "contentRoute", reason: "missing_content_route", extra: 1 }],
      })
    ).toBeNull();
  });
});

describe("deleteContentType cache removal", () => {
  test("removes the type from a cached list and its detail caches", async () => {
    primeLocalCache(cacheKeys.contentTypesList, [
      contentTypeSummary("ct-1", "One"),
      contentTypeSummary("ct-2", "Two"),
    ]);
    primeLocalCache(cacheKeys.contentTypeDetail("ct-1"), contentTypeSummary("ct-1", "One"));
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteContentType("ct-1");
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.contentTypesList, [
      contentTypeSummary("ct-2", "Two"),
    ]);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.contentTypeDetail("ct-1"));
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.contentTypeCollectionWorkspace("ct-1"));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.contentTypesList,
      action: "invalidate",
    });
  });
});

describe("getContentTypeCollectionWorkspace fetch path assertions", () => {
  test("requests the encoded route", async () => {
    apiRequest.mockResolvedValueOnce(workspaceSummary());
    await getContentTypeCollectionWorkspaceCached("my type");
    expect(apiRequest).toHaveBeenCalledWith("/content-types/my%20type/collection-workspace", {
      method: "GET",
    });
  });
});
