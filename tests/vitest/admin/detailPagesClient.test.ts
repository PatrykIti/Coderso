import { afterEach, expect, test } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import {
  autosaveDetailPage,
  clearDetailPagesCache,
  createDetailPage,
  deleteDetailPage,
  discardDetailPageRevision,
  getDetailPageCached,
  getCachedDetailPage,
  getCachedDetailPages,
  listDetailPageRevisions,
  listDetailPages,
  listDetailPagesCached,
  previewDetailPage,
  publishDetailPage,
  restoreDetailPageRevision,
  unpublishDetailPage,
  updateDetailPage,
  type DetailPageRecord,
} from "../../../core/admin/services/detailPagesClient";
import { subscribeCacheEvents, type CacheEvent } from "../../../core/admin/utils/cacheBus";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

const installLocalStorage = () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  return {
    storage,
    restore: () => {
      if (originalLocal === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
      }
      clearDetailPagesCache();
    },
  };
};

const installFetch = (
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return handler(input, init);
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
};

const setCacheValue = (
  storage: ReturnType<typeof createLocalStorage>,
  key: string,
  value: unknown
) => {
  storage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
};

const readCacheValue = (storage: ReturnType<typeof createLocalStorage>, key: string) => {
  const raw = storage.getItem(key);
  return raw ? (JSON.parse(raw) as { value: unknown }).value : null;
};

const detailPageDocument = (overrides: Partial<DetailPageDocument> = {}): DetailPageDocument => ({
  schemaVersion: 1,
  id: "detail-page-products",
  name: "Products detail",
  contentTypeId: "ct-products",
  contentTypeSlug: "products",
  status: "draft",
  titlePattern: "{title}",
  settings: {
    template: "default",
    layout: {
      wrapper: {
        container: "full",
        padding: { top: "none", bottom: "none" },
        background: {
          color: "transparent",
          image: null,
          media: { type: "none", source: "external", src: null },
        },
      },
      sections: {
        gap: "none",
        defaults: {
          container: "default",
          padding: { top: "xl", bottom: "xl" },
          margin: { top: "none", bottom: "none" },
        },
      },
      applyDefaultsToNewBlocks: false,
    },
  },
  blocks: [],
  bindings: [],
  ...overrides,
});

const detailPageRecord = (overrides: Partial<DetailPageRecord> = {}): DetailPageRecord => {
  const id = overrides.id ?? "detail-page-products";
  const contentTypeId = overrides.contentTypeId ?? "ct-products";
  const contentTypeSlug = overrides.contentTypeSlug ?? "products";
  const name = overrides.name ?? "Products detail";
  const status = overrides.status ?? "draft";
  return {
    id,
    contentTypeId,
    contentTypeSlug,
    name,
    status,
    currentDocument:
      overrides.currentDocument ??
      detailPageDocument({
        id,
        contentTypeId,
        contentTypeSlug,
        name,
        status,
      }),
    publishedDocument: null,
    createdAt: "2026-05-10T10:00:00.000Z",
    updatedAt: "2026-05-10T10:00:00.000Z",
    publishedAt: null,
    authorId: null,
    ...overrides,
  };
};

afterEach(() => {
  resetCsrfToken();
  clearDetailPagesCache();
});

test("listDetailPages hits filtered admin endpoint", async () => {
  const fetchMock = installFetch(async () => jsonResponse({ items: [detailPageRecord()] }));

  try {
    const result = await listDetailPages({ contentTypeId: " ct-products " });

    expect(result).toEqual([detailPageRecord()]);
    expect(fetchMock.calls).toHaveLength(1);
    expect(fetchMock.calls[0]?.input).toBe("/admin/api/detail-pages?contentTypeId=ct-products");
    expect(fetchMock.calls[0]?.init?.method).toBe("GET");
  } finally {
    fetchMock.restore();
  }
});

test("listDetailPagesCached and getDetailPageCached read scoped local caches", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch(async () => jsonResponse({ items: [] }));
  const cached = detailPageRecord({ id: "detail-page-cached", name: "Cached detail" });

  try {
    clearDetailPagesCache();
    setCacheValue(storage, cacheKeys.detailPagesListByContentType("ct-products"), [cached]);
    setCacheValue(storage, cacheKeys.detailPageDetail("detail-page-cached"), cached);

    expect(await listDetailPagesCached({ contentTypeId: "ct-products" })).toEqual([cached]);
    expect(await getDetailPageCached("detail-page-cached")).toEqual(cached);
    expect(fetchMock.calls).toHaveLength(0);
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("listDetailPagesCached dedupes in-flight scoped reads and primes detail caches", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const firstResponseHandle: { resolve?: (response: Response) => void } = {};
  const firstResponse = new Promise<Response>((resolve) => {
    firstResponseHandle.resolve = resolve;
  });
  const fetchMock = installFetch(async () => firstResponse);

  try {
    clearDetailPagesCache();
    const first = listDetailPagesCached({ contentTypeId: "ct-products" });
    const second = listDetailPagesCached({ contentTypeId: "ct-products" });
    expect(fetchMock.calls).toHaveLength(1);

    firstResponseHandle.resolve?.(
      jsonResponse({
        items: [detailPageRecord({ id: "detail-page-network", name: "Network detail" })],
      })
    );

    expect(await first).toEqual([
      detailPageRecord({ id: "detail-page-network", name: "Network detail" }),
    ]);
    expect(await second).toEqual([
      detailPageRecord({ id: "detail-page-network", name: "Network detail" }),
    ]);
    expect(readCacheValue(storage, cacheKeys.detailPagesListByContentType("ct-products"))).toEqual([
      detailPageRecord({ id: "detail-page-network", name: "Network detail" }),
    ]);
    expect(readCacheValue(storage, cacheKeys.detailPageDetail("detail-page-network"))).toEqual(
      detailPageRecord({ id: "detail-page-network", name: "Network detail" })
    );
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("detail page create, update, and delete synchronize caches and cache bus", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));
  const existing = detailPageRecord({ id: "detail-page-existing", name: "Existing detail" });
  const created = detailPageRecord({ id: "detail-page-created", name: "Created detail" });
  const updated = detailPageRecord({
    id: "detail-page-created",
    name: "Updated detail",
    updatedAt: "2026-05-10T11:00:00.000Z",
  });
  const fetchMock = installFetch(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (url === "/admin/api/detail-pages" && init?.method === "POST") {
      return jsonResponse(created);
    }
    if (url === "/admin/api/detail-pages/detail-page-created" && init?.method === "PATCH") {
      return jsonResponse(updated);
    }
    if (url === "/admin/api/detail-pages/detail-page-created" && init?.method === "DELETE") {
      return jsonResponse({ ok: true });
    }
    return jsonResponse({}, 404);
  });

  try {
    resetCsrfToken();
    clearDetailPagesCache();
    setCacheValue(storage, cacheKeys.detailPagesList, [existing]);
    setCacheValue(storage, cacheKeys.detailPagesListByContentType("ct-products"), [existing]);
    setCacheValue(storage, cacheKeys.detailPageDetail(existing.id), existing);

    await createDetailPage(created.currentDocument);
    expect(getCachedDetailPage("detail-page-created")).toEqual(created);
    expect(getCachedDetailPages()).toEqual([created, existing]);
    expect(getCachedDetailPages("ct-products")).toEqual([created, existing]);

    await updateDetailPage("detail-page-created", updated.currentDocument);
    expect(getCachedDetailPage("detail-page-created")).toEqual(updated);
    expect(getCachedDetailPages("ct-products")?.[0]?.name).toBe("Updated detail");

    await deleteDetailPage("detail-page-created", { contentTypeId: "ct-products" });
    expect(getCachedDetailPage("detail-page-created")).toBeNull();
    expect(getCachedDetailPages("ct-products")).toEqual([existing]);

    const csrfHeaders = fetchMock.calls
      .filter((call) => !String(call.input).endsWith("/auth/csrf"))
      .map((call) => new Headers(call.init?.headers).get("X-CSRF-Token"));
    expect(csrfHeaders).toEqual(["csrf-token", "csrf-token", "csrf-token"]);

    const eventPairs = events.map((event) => `${event.action}:${event.key}`);
    expect(eventPairs).toEqual(
      expect.arrayContaining([
        `update:${cacheKeys.detailPagesList}`,
        `update:${cacheKeys.detailPagesListByContentType("ct-products")}`,
        `update:${cacheKeys.detailPageDetail("detail-page-created")}`,
        `invalidate:${cacheKeys.detailPagesList}`,
        `invalidate:${cacheKeys.detailPagesListByContentType("ct-products")}`,
        `invalidate:${cacheKeys.detailPageDetail("detail-page-created")}`,
      ])
    );
  } finally {
    unsubscribe();
    fetchMock.restore();
    restoreStorage();
  }
});

test("detail page lifecycle and revision helpers use canonical endpoints", async () => {
  const fetchMock = installFetch(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/preview")) {
      return jsonResponse({
        token: "preview-token",
        previewUrl: "/preview?type=detail-page&token=preview-token",
        expiresAt: "2026-05-10T11:00:00.000Z",
      });
    }
    if (url.endsWith("/autosave")) {
      return jsonResponse({
        savedAt: "2026-05-10T11:00:00.000Z",
        reusedRevision: false,
        revision: {
          id: "rev-1",
          detailPageId: "detail-page-products",
          version: 2,
          kind: "autosave",
          createdAt: "2026-05-10T11:00:00.000Z",
          createdBy: null,
        },
      });
    }
    if (url.endsWith("/revisions/rev-1/restore")) {
      return jsonResponse({
        ok: true,
        restored: true,
        revision: {
          id: "rev-1",
          detailPageId: "detail-page-products",
          version: 2,
          kind: "autosave",
          createdAt: "2026-05-10T11:00:00.000Z",
          createdBy: null,
        },
        detailPage: {
          id: "detail-page-products",
          contentTypeId: "ct-products",
          name: "Products detail",
          status: "draft",
          updatedAt: "2026-05-10T11:00:00.000Z",
          publishedAt: null,
        },
      });
    }
    if (url.endsWith("/revisions")) return jsonResponse([]);
    return jsonResponse({ ok: true });
  });

  try {
    resetCsrfToken();

    await previewDetailPage("detail-page-products", {
      sampleEntryId: "entry-1",
      ttlMinutes: 15,
    });
    await publishDetailPage("detail-page-products", "ct-products");
    await unpublishDetailPage("detail-page-products", "ct-products");
    await autosaveDetailPage("detail-page-products", detailPageDocument());
    await listDetailPageRevisions("detail-page-products");
    await restoreDetailPageRevision("detail-page-products", "rev-1", "ct-products");
    await discardDetailPageRevision("detail-page-products", "rev-1");

    const inputs = fetchMock.calls.map((call) => String(call.input));
    expect(inputs).toEqual(
      expect.arrayContaining([
        "/admin/api/detail-pages/detail-page-products/preview",
        "/admin/api/detail-pages/detail-page-products/publish",
        "/admin/api/detail-pages/detail-page-products/unpublish",
        "/admin/api/detail-pages/detail-page-products/autosave",
        "/admin/api/detail-pages/detail-page-products/revisions",
        "/admin/api/detail-pages/detail-page-products/revisions/rev-1/restore",
      ])
    );
    expect(inputs).toContain("/admin/api/detail-pages/detail-page-products/revisions/rev-1");
    const previewCall = fetchMock.calls.find((call) => String(call.input).endsWith("/preview"));
    expect(JSON.parse(previewCall?.init?.body as string)).toEqual({
      sampleEntryId: "entry-1",
      ttlMinutes: 15,
    });
    const csrfMethods = fetchMock.calls
      .filter((call) => !String(call.input).endsWith("/auth/csrf"))
      .filter((call) => call.init?.method !== "GET")
      .map((call) => new Headers(call.init?.headers).get("X-CSRF-Token"));
    expect(csrfMethods.every((token) => token === "csrf-token")).toBe(true);
  } finally {
    fetchMock.restore();
  }
});
