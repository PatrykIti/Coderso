import { expect, test } from "bun:test";

import {
  clearFormsCache,
  createForm,
  getFormDetailCached,
  listFormActionsCached,
  listForms,
  listFormsCached,
  retryFormActionRun,
  updateFormActions,
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
      submissionAccess: "internal",
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/forms");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
    const body = JSON.parse(calls[1]?.init?.body as string);
    expect(body.name).toBe("Contact form");
    expect(body.successMessage).toBe("Thanks!");
    expect(body.successRedirectUrl).toBe("/thank-you");
    expect(body.submissionAccess).toBe("internal");
    expect(body.settings.layoutMode).toBe("single");
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
        submissionAccess: "public",
        settings: {
          layoutMode: "single",
          saveProgress: false,
          stepTitles: [],
          preset: "custom",
          automationRetry: {
            enabled: false,
            maxAttempts: 1,
            baseDelayMs: 300,
            maxDelayMs: 2000,
          },
        },
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
        submissionAccess: "public",
        settings: {
          layoutMode: "single",
          saveProgress: false,
          stepTitles: [],
          preset: "custom",
          automationRetry: {
            enabled: false,
            maxAttempts: 1,
            baseDelayMs: 300,
            maxDelayMs: 2000,
          },
        },
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

test("listFormActionsCached reads from local storage", async () => {
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
    const cached = [
      {
        id: "action-1",
        formId: "form-1",
        type: "success_message",
        label: "Success message",
        enabled: true,
        continueOnError: true,
        condition: { operator: "always" },
        config: { message: "Thanks!" },
        orderIndex: 0,
        createdAt: "2026-02-18T00:00:00.000Z",
        updatedAt: "2026-02-18T00:00:00.000Z",
      },
    ];
    storage.setItem(
      cacheKeys.formActions("form-1"),
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listFormActionsCached("form-1");
    expect(result).toEqual(cached);
    expect(calls.length).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("updateFormActions posts payload with csrf token", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse([]);
  };

  try {
    resetCsrfToken();
    await updateFormActions("form-1", [
      {
        type: "success_message",
        config: { message: "Thanks!" },
      },
    ]);

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/forms/form-1/actions");
    expect(calls[1]?.init?.method).toBe("PUT");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retryFormActionRun posts retry request", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      run: { id: "run-1", formId: "form-1" },
      result: { successMessage: null, redirectUrl: null, runs: [] },
    });
  };

  try {
    resetCsrfToken();
    const response = await retryFormActionRun("run-1");
    expect(calls[1]?.input).toBe("/admin/api/forms/action-runs/run-1/retry");
    expect(response?.run?.id).toBe("run-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
