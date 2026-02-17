import { expect, test } from "bun:test";

import {
  activateAdminThemeProfile,
  clearAdminThemeProfilesCache,
  clearAdminThemeTemplatesCache,
  createAdminThemeProfile,
  createAdminThemeTemplate,
  deleteAdminThemeTemplate,
  listAdminThemeProfiles,
  listAdminThemeProfilesCached,
  listAdminThemeTemplates,
  listAdminThemeTemplatesCached,
  updateAdminThemeProfile,
  updateAdminThemeTemplate,
} from "../../../core/admin/services/adminThemeClient";
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
  clearAdminThemeTemplatesCache();
  clearAdminThemeProfilesCache();
};

const sampleTokens = {
  base: { bg: "#fff", surface: "#fff", text: "#000", border: "#ddd" },
  buttons: {
    primary: { bg: "#000", text: "#fff", hoverBg: "#111", hoverText: "#fff" },
    secondary: { bg: "#111", text: "#fff", hoverBg: "#222", hoverText: "#fff" },
    outline: { border: "#ddd", text: "#000", hoverBg: "#eee", hoverText: "#000" },
    ghost: { hoverBg: "#eee", hoverText: "#000" },
  },
  inputs: { bg: "#fff", border: "#ddd", text: "#000", placeholder: "#999", focusRing: "#000" },
  sidebar: { bg: "#fff", text: "#666", activeBg: "#eee", activeText: "#000", hoverBg: "#f5f5f5" },
  topbar: { bg: "#fff", text: "#666", border: "#ddd" },
  card: { bg: "#fff", border: "#ddd" },
  state: { success: "#0f0", warning: "#ff0", danger: "#f00" },
};

test("listAdminThemeTemplates hits GET /admin-theme-templates", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listAdminThemeTemplates();
    expect(calls[0]?.input).toBe("/admin/api/admin-theme-templates");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listAdminThemeTemplatesCached reads from local storage", async () => {
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
    resetCaches();
    const cached = [
      {
        id: "template-1",
        name: "Default",
        description: null,
        tokens: sampleTokens,
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    storage.setItem(
      cacheKeys.adminThemeTemplatesList,
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listAdminThemeTemplatesCached();
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

test("createAdminThemeTemplate uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "template-1" });
  };

  try {
    resetCsrfToken();
    await createAdminThemeTemplate({
      name: "Default",
      tokens: sampleTokens,
    });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-theme-templates");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateAdminThemeTemplate uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "template-1" });
  };

  try {
    resetCsrfToken();
    await updateAdminThemeTemplate("template-1", { name: "Updated" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-theme-templates/template-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteAdminThemeTemplate uses CSRF and DELETE", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await deleteAdminThemeTemplate("template-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-theme-templates/template-1");
    expect(calls[1]?.init?.method).toBe("DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listAdminThemeProfiles hits GET /admin-theme-profiles", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listAdminThemeProfiles();
    expect(calls[0]?.input).toBe("/admin/api/admin-theme-profiles");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listAdminThemeProfilesCached reads from local storage", async () => {
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
    resetCaches();
    const cached = [
      {
        id: "profile-1",
        name: "Default",
        description: null,
        templateId: "template-1",
        isActive: true,
        createdAt: "2026-02-14T00:00:00.000Z",
        updatedAt: "2026-02-14T00:00:00.000Z",
      },
    ];
    storage.setItem(
      cacheKeys.adminThemeProfilesList,
      JSON.stringify({ value: cached, savedAt: Date.now() })
    );

    const result = await listAdminThemeProfilesCached();
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

test("createAdminThemeProfile uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "profile-1" });
  };

  try {
    resetCsrfToken();
    await createAdminThemeProfile({ name: "Default", templateId: "template-1" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-theme-profiles");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateAdminThemeProfile uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ id: "profile-1" });
  };

  try {
    resetCsrfToken();
    await updateAdminThemeProfile("profile-1", { name: "Updated" });
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-theme-profiles/profile-1");
    expect(calls[1]?.init?.method).toBe("PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("activateAdminThemeProfile uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ ok: true });
  };

  try {
    resetCsrfToken();
    await activateAdminThemeProfile("profile-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/admin-theme-profiles/profile-1/activate");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
