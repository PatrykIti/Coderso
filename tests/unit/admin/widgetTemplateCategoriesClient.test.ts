import { expect, test } from "bun:test";

import {
  createWidgetTemplateCategory,
  deleteWidgetTemplateCategory,
  listWidgetTemplateCategories,
  updateWidgetTemplateCategory,
} from "../../../core/admin/services/widgetTemplateCategoriesClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("listWidgetTemplateCategories hits /widget-template-categories", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listWidgetTemplateCategories();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/widget-template-categories");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createWidgetTemplateCategory posts payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "cat1", name: "Footer" });
  };

  try {
    resetCsrfToken();
    await createWidgetTemplateCategory({ name: "Footer" });
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/widget-template-categories");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateWidgetTemplateCategory patches payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "cat1", name: "Footer" });
  };

  try {
    resetCsrfToken();
    await updateWidgetTemplateCategory("cat1", { name: "Footer" });
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/widget-template-categories/cat1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteWidgetTemplateCategory deletes category", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await deleteWidgetTemplateCategory("cat1");
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/widget-template-categories/cat1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
