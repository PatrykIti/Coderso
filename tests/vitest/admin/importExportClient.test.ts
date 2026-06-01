import { expect, test } from "vitest";

import {
  exportConfig,
  importConfig,
  previewImport,
} from "../../../core/admin/services/importExportClient";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";

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
