import { expect, test } from "vitest";

import {
  clearPagesCache,
  deletePage,
  getCachedPages,
  getPageCached,
  previewPage,
  updatePage,
} from "../../../core/admin/services/pagesClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

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

const resetCaches = () => {
  clearPagesCache();
};

const setCacheValue = (
  storage: ReturnType<typeof createLocalStorage>,
  key: string,
  value: unknown
) => {
  storage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
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
      resetCaches();
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

const pageSummary = (
  overrides: Partial<{
    id: string;
    title: string;
    slug: string;
    status: "draft" | "published" | "scheduled" | "archived";
    updatedAt: string;
    author: null;
  }> = {}
) => ({
  id: overrides.id ?? "page-1",
  title: overrides.title ?? "Home",
  slug: overrides.slug ?? "/",
  status: overrides.status ?? "draft",
  updatedAt: overrides.updatedAt ?? "2026-02-14T00:00:00.000Z",
  author: overrides.author ?? null,
});

const pageDetail = (
  overrides: Partial<{
    id: string;
    title: string;
    slug: string;
    status: "draft" | "published" | "scheduled" | "archived";
    currentData: Record<string, unknown>;
    updatedAt: string;
    author: null;
  }> = {}
) => ({
  id: overrides.id ?? "page-1",
  title: overrides.title ?? "Home",
  slug: overrides.slug ?? "/",
  status: overrides.status ?? "draft",
  updatedAt: overrides.updatedAt ?? "2026-02-14T00:00:00.000Z",
  currentData: overrides.currentData ?? { blocks: [] },
  ...(Object.prototype.hasOwnProperty.call(overrides, "author")
    ? { author: overrides.author ?? null }
    : {}),
});

test("page mutations keep author fields, unshift new authorful pages, and prune deleted pages", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url === "/admin/api/pages/page-9" && init?.method === "PATCH") {
      return jsonResponse(
        pageDetail({
          id: "page-9",
          title: "Renamed",
          slug: "/new",
          author: null,
          currentData: { blocks: [] },
        })
      );
    }
    if (url === "/admin/api/pages/page-9") {
      return jsonResponse(
        pageDetail({
          id: "page-9",
          title: "New page",
          slug: "/new",
          author: null,
          currentData: { blocks: [] },
        })
      );
    }
    if (url === "/admin/api/pages/page-1") {
      return jsonResponse({ ok: true });
    }
    throw new Error(`unexpected fetch ${url}`);
  });

  try {
    resetCaches();
    setCacheValue(storage, cacheKeys.pagesList, [pageSummary({ id: "page-1" })]);

    // getPageCached merges a NEW authorful detail as the first list entry.
    const fetched = await getPageCached("page-9");
    expect(fetched.id).toBe("page-9");
    expect(getCachedPages()?.[0]?.id).toBe("page-9");
    expect(getCachedPages()).toHaveLength(2);

    // updatePage merges an authorful detail into the existing list row.
    await updatePage("page-9", { title: "Renamed" });
    expect(getCachedPages()?.find((page) => page.id === "page-9")?.title).toBe("Renamed");
    expect(getCachedPages()?.find((page) => page.id === "page-9")?.author).toBeNull();

    // deletePage prunes the cached list.
    await deletePage("page-1");
    expect(getCachedPages()?.find((page) => page.id === "page-1")).toBeUndefined();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("previewPage normalizes probe metadata for relative, malformed, and invalid probes", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  const responses = [
    jsonResponse({
      token: "tok-1",
      previewUrl: "/preview/1",
      expiresAt: "2026-01-01T00:00:00.000Z",
      probe: { ok: true, status: 200, targetLabel: "/p?token=abc&device=mobile" },
    }),
    jsonResponse({
      token: "tok-2",
      previewUrl: "/preview/2",
      expiresAt: "2026-01-02T00:00:00.000Z",
      probe: { ok: false, reason: "unreachable", status: 502, targetLabel: "http://[?token=abc" },
    }),
    jsonResponse({
      token: "tok-3",
      previewUrl: "/preview/3",
      expiresAt: "2026-01-03T00:00:00.000Z",
      probe: { ok: "yes" },
    }),
  ];
  const fetchMock = installFetch(async () => responses.shift() ?? jsonResponse({}));

  try {
    resetCaches();

    const relative = await previewPage("page-1", { probe: true });
    expect(relative.probe).toEqual({ ok: true, status: 200, targetLabel: "/p" });

    const malformed = await previewPage("page-1", { probe: true });
    expect(malformed.probe).toEqual({
      ok: false,
      reason: "unreachable",
      status: 502,
      targetLabel: "http://[?token=<redacted>",
    });

    const invalid = await previewPage("page-1", { probe: true });
    expect(invalid.probe).toBeUndefined();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});
