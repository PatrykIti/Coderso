import { expect, test } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import {
  clearPopupsCache,
  createPopup,
  listPopups,
  listPopupsCached,
  updatePopupStatus,
} from "../../../core/admin/services/popupsClient";

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

test("listPopups hits GET /popups", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearPopupsCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listPopups();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/popups");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
    clearPopupsCache();
  }
});

test("createPopup uses CSRF and posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearPopupsCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "popup-1",
      name: "Welcome popup",
      slug: "welcome-popup",
      status: "draft",
      trigger: { type: "time_delay", delaySeconds: 3 },
      targeting: { includePaths: [], excludePaths: [], audience: "all" },
      frequency: { strategy: "session_once", cooldownMinutes: null },
      content: {
        title: "Hello",
        body: "Body",
        templateId: null,
        ctaLabel: null,
        ctaHref: null,
      },
      settings: { placement: "center", dismissible: true, showOverlay: true },
      createdAt: "2026-02-19T00:00:00.000Z",
      updatedAt: "2026-02-19T00:00:00.000Z",
      publishedAt: null,
    });
  };

  try {
    resetCsrfToken();
    await createPopup({
      name: "Welcome popup",
      trigger: { type: "time_delay", delaySeconds: 3 },
      targeting: { includePaths: [], excludePaths: [], audience: "all" },
      frequency: { strategy: "session_once", cooldownMinutes: null },
      content: {
        title: "Hello",
        body: "Body",
        templateId: null,
        ctaLabel: null,
        ctaHref: null,
      },
      settings: { placement: "center", dismissible: true, showOverlay: true },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/popups");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
    clearPopupsCache();
  }
});

test("listPopupsCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearPopupsCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.popupsList,
      JSON.stringify({
        value: [
          {
            id: "popup-1",
            name: "Cached popup",
            slug: "cached-popup",
            status: "draft",
            trigger: { type: "time_delay", delaySeconds: 3 },
            targeting: { includePaths: [], excludePaths: [], audience: "all" },
            frequency: { strategy: "session_once", cooldownMinutes: null },
            content: {
              title: "Hello",
              body: "Body",
              templateId: null,
              ctaLabel: null,
              ctaHref: null,
            },
            settings: { placement: "center", dismissible: true, showOverlay: true },
            createdAt: "2026-02-19T00:00:00.000Z",
            updatedAt: "2026-02-19T00:00:00.000Z",
            publishedAt: null,
          },
        ],
        savedAt: Date.now(),
      })
    );

    const items = await listPopupsCached();
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("Cached popup");
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearPopupsCache();
  }
});

test("updatePopupStatus patches status route", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearPopupsCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "popup-1",
      name: "Welcome popup",
      slug: "welcome-popup",
      status: "published",
      trigger: { type: "time_delay", delaySeconds: 3 },
      targeting: { includePaths: [], excludePaths: [], audience: "all" },
      frequency: { strategy: "session_once", cooldownMinutes: null },
      content: { title: null, body: null, templateId: null, ctaLabel: null, ctaHref: null },
      settings: { placement: "center", dismissible: true, showOverlay: true },
      createdAt: "2026-02-19T00:00:00.000Z",
      updatedAt: "2026-02-19T00:00:00.000Z",
      publishedAt: "2026-02-19T00:00:00.000Z",
    });
  };

  try {
    resetCsrfToken();
    await updatePopupStatus("popup-1", "published");

    expect(calls[1]?.input).toBe("/admin/api/popups/popup-1/status");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
    clearPopupsCache();
  }
});
