import { expect, test } from "vitest";

import {
  clearPageTemplatesCache,
  createPageTemplate,
  deletePageTemplate,
  duplicatePageTemplate,
  getPageTemplateCached,
  listPageTemplates,
  listPageTemplatesCached,
  previewPageTemplate,
  updatePageTemplate,
} from "../../../core/admin/services/pageTemplatesClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { subscribeCacheEvents, type CacheEvent } from "../../../core/admin/utils/cacheBus";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

const templateSummary = {
  id: "tpl-1",
  name: "Landing stack",
  slug: "landing-stack",
  description: null,
  category: "marketing",
  status: "draft" as const,
  sectionsCount: 2,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const templateDetail = {
  ...templateSummary,
  document: { schemaVersion: 2, sections: [] },
};

test("listPageTemplates hits /page-templates", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listPageTemplates();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/page-templates");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createPageTemplate posts with CSRF and broadcasts cache updates", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => {
    events.push(event);
  });

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(templateDetail);
  };

  try {
    resetCsrfToken();
    clearPageTemplatesCache();
    await createPageTemplate({
      name: "Landing stack",
      document: { schemaVersion: 2, sections: [] },
    });
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/page-templates");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(events.map((event) => `${event.key}:${event.action}`)).toEqual(
      expect.arrayContaining([
        `${cacheKeys.pageTemplatesList}:update`,
        `${cacheKeys.pageTemplateDetail("tpl-1")}:update`,
      ])
    );
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    clearPageTemplatesCache();
  }
});

test("updatePageTemplate patches payload with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(templateDetail);
  };

  try {
    resetCsrfToken();
    await updatePageTemplate("tpl-1", { name: "Updated" });
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/page-templates/tpl-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
    clearPageTemplatesCache();
  }
});

test("duplicatePageTemplate posts duplicate action", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ...templateDetail, id: "tpl-copy" });
  };

  try {
    resetCsrfToken();
    await duplicatePageTemplate("tpl-1");
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/page-templates/tpl-1/duplicate");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBe("{}");
  } finally {
    globalThis.fetch = originalFetch;
    clearPageTemplatesCache();
  }
});

test("deletePageTemplate removes cache entries and broadcasts invalidation", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => {
    events.push(event);
  });

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await deletePageTemplate("tpl-1");
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/page-templates/tpl-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
    expect(events.map((event) => `${event.key}:${event.action}`)).toEqual(
      expect.arrayContaining([
        `${cacheKeys.pageTemplatesList}:invalidate`,
        `${cacheKeys.pageTemplateDetail("tpl-1")}:invalidate`,
      ])
    );
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    clearPageTemplatesCache();
  }
});

test("previewPageTemplate posts to the preview endpoint with CSRF", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      token: "preview-token",
      previewUrl: "/preview?type=page-template&token=preview-token",
      expiresAt: "2026-06-01T01:00:00.000Z",
      sectionsCount: 2,
    });
  };

  try {
    resetCsrfToken();
    const result = await previewPageTemplate("tpl-1", { ttlMinutes: 30 });
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/page-templates/tpl-1/preview");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBe(JSON.stringify({ ttlMinutes: 30 }));
    expect(result?.token).toBe("preview-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listPageTemplatesCached reads from local storage without refetching", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    clearPageTemplatesCache();
    storage.setItem(
      cacheKeys.pageTemplatesList,
      JSON.stringify({ value: [templateSummary], savedAt: Date.now() })
    );

    const result = await listPageTemplatesCached();
    expect(result).toEqual([templateSummary]);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearPageTemplatesCache();
  }
});

test("getPageTemplateCached reads detail from local storage without refetching", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(templateDetail);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    clearPageTemplatesCache();
    storage.setItem(
      cacheKeys.pageTemplateDetail("tpl-1"),
      JSON.stringify({ value: templateDetail, savedAt: Date.now() })
    );

    const result = await getPageTemplateCached("tpl-1");
    expect(result?.id).toBe("tpl-1");
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearPageTemplatesCache();
  }
});
