import { expect, test } from "bun:test";

import {
  clearFormsCache,
  createForm,
  getFormDetailCached,
  listForms,
  listFormsCached,
} from "../../../core/admin/services/formsClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

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

const resetCaches = () => {
  clearFormsCache();
};

test("listForms hits GET /forms", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };

  try {
    await listForms();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/forms");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createForm uses CSRF and posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "form-1" });
  };

  try {
    resetCsrfToken();
    await createForm({
      name: "Contact form",
      status: "draft",
      successMessage: "Thanks!",
      successRedirectUrl: "/thank-you",
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/forms");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.name).toBe("Contact form");
    expect(body.successMessage).toBe("Thanks!");
    expect(body.successRedirectUrl).toBe("/thank-you");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listFormsCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse([]);
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    const cached = [
      {
        id: "form-1",
        name: "Contact",
        slug: "contact",
        status: "draft" as const,
        description: null,
        successMessage: null,
        successRedirectUrl: null,
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    storage.setItem(
      cacheKeys.formsList,
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listFormsCached();
    expect(result).toEqual(cached);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});

test("getFormDetailCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const storage = createLocalStorage();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({});
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    resetCaches();
    const cached = {
      form: {
        id: "form-2",
        name: "Support",
        slug: "support",
        status: "draft" as const,
        description: "Help desk",
        successMessage: null,
        successRedirectUrl: null,
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
      fields: [],
    };
    storage.setItem(
      cacheKeys.formDetail("form-2"),
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await getFormDetailCached("form-2");
    expect(result?.form.id).toBe("form-2");
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    resetCaches();
  }
});
