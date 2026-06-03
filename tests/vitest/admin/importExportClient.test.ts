import { expect, test } from "vitest";

import {
  exportConfig,
  getCachedImportHistory,
  importConfig,
  patchImportHistoryItem,
  previewImport,
  upsertImportHistoryItem,
  writeImportHistoryCache,
} from "../../../core/admin/services/importExportClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { subscribeCacheEvents, type CacheEvent } from "../../../core/admin/utils/cacheBus";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("exportConfig hits GET /tools/export", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ version: 1, exportedAt: "now" });
  };

  try {
    await exportConfig();
    expect(calls[0]?.input).toBe("/admin/api/tools/export");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("exportConfig serializes target and include options", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ version: 1, exportedAt: "now" });
  };

  try {
    await exportConfig({
      target: "menus",
      include: ["menus", "menu-items"],
    });
    expect(calls[0]?.input).toBe("/admin/api/tools/export?target=menus&include=menus%2Cmenu-items");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("previewImport uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      summary: {
        settings: 0,
        menus: 0,
        menuItems: 0,
        themeProfiles: 0,
        themeRoutes: 0,
        adminThemeTemplates: 0,
        adminThemeProfiles: 0,
        redirects: 0,
        warnings: [],
      },
    });
  };

  try {
    resetCsrfToken();
    await previewImport({
      version: 1,
      exportedAt: "now",
      settings: {},
      menus: [],
      themeProfiles: [],
      adminThemes: { templates: [], profiles: [] },
      redirects: [],
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/tools/import/preview");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("importConfig uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      summary: {
        settings: 0,
        menus: 0,
        menuItems: 0,
        themeProfiles: 0,
        themeRoutes: 0,
        adminThemeTemplates: 0,
        adminThemeProfiles: 0,
        redirects: 0,
        warnings: [],
      },
    });
  };

  try {
    resetCsrfToken();
    await importConfig({
      version: 1,
      exportedAt: "now",
      settings: {},
      menus: [],
      themeProfiles: [],
      adminThemes: { templates: [], profiles: [] },
      redirects: [],
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/tools/import");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("importConfig invalidates only caches touched by bundle scope", async () => {
  const originalFetch = globalThis.fetch;
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      summary: {
        settings: 0,
        menus: 0,
        menuItems: 0,
        themeProfiles: 0,
        themeRoutes: 0,
        adminThemeTemplates: 0,
        adminThemeProfiles: 0,
        redirects: 1,
        warnings: [],
      },
    });
  };

  try {
    resetCsrfToken();
    await importConfig({
      version: 1,
      exportedAt: "now",
      scope: { target: "redirects", include: ["redirects"] },
      settings: {},
      menus: [],
      themeProfiles: [],
      adminThemes: { templates: [], profiles: [] },
      redirects: [
        {
          fromPath: "/old",
          toPath: "/new",
          statusCode: 301,
          enabled: true,
        },
      ],
    });

    expect(events.map((event) => event.key)).toContain(cacheKeys.redirectsList);
    expect(events.map((event) => event.key)).not.toContain(cacheKeys.menusList);
    expect(events.map((event) => event.key)).not.toContain(cacheKeys.adminThemeTemplatesList);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
  }
});

test("import history cache stores preview and apply progress states", () => {
  writeImportHistoryCache([]);
  upsertImportHistoryItem({
    id: "import-1",
    fileName: "bundle.json",
    type: "JSON bundle",
    sizeBytes: 128,
    status: "preview-ready",
    progress: 65,
    createdAt: "2026-06-01T00:00:00.000Z",
    completedAt: null,
    failureReason: null,
    summary: null,
  });

  expect(getCachedImportHistory()?.[0]?.status).toBe("preview-ready");
  patchImportHistoryItem("import-1", {
    status: "applied",
    progress: 100,
    completedAt: "2026-06-01T00:01:00.000Z",
  });
  expect(getCachedImportHistory()?.[0]).toMatchObject({
    status: "applied",
    progress: 100,
  });
});
