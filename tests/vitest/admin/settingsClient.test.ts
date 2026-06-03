import { expect, test } from "vitest";

import {
  clearSettingsCache,
  findUnsafeRedactedSettingsCachePaths,
  getCachedRedactedSettings,
  getSettingsCached,
  getSecuritySettings,
  getSetting,
  getSettings,
  getStorageSettings,
  updateSecuritySettings,
  updateSettings,
  updateStorageSettings,
} from "../../../core/admin/services/settingsClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { subscribeCacheEvents, type CacheEvent } from "../../../core/admin/utils/cacheBus";

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
      clearSettingsCache();
    },
  };
};

const readCacheValue = (storage: ReturnType<typeof createLocalStorage>, key: string) => {
  const raw = storage.getItem(key);
  return raw ? (JSON.parse(raw) as { value: unknown }).value : null;
};

const settingsPayload = (overrides: Record<string, unknown> = {}) => ({
  "site.name": "Coderso",
  "site.locale": "en",
  "site.publicBaseUrl": "https://coderso.test",
  "site.adminBaseUrl": "https://admin.coderso.test",
  "site.adminPath": "/admin",
  "site.adminRedirectEnabled": false,
  "site.homepageId": "home-1",
  "site.notFoundPageId": "404-1",
  "site.previewEnabled": true,
  "site.cacheTtlSeconds": 30,
  "site.contentRoutes": [
    {
      type: "posts",
      listPath: "/blog",
      detailPath: "/blog/:slug",
      enabled: true,
    },
  ],
  "auth.sessionTtlDays": 14,
  "auth.resetTtlMinutes": 60,
  "setup.completed": true,
  "assistant.enabled": true,
  "assistant.defaultMode": "docs-only",
  "assistant.docs.reindexOnBoot": false,
  "assistant.launcher.avatarEnabled": false,
  "assistant.launcher.avatarAsset": null,
  "assistant.llm.enabled": false,
  "assistant.llm.provider": "none",
  "assistant.llm.model": "google/gemma",
  "assistant.llm.maxInputTokens": 8192,
  "assistant.llm.maxOutputTokens": 2048,
  "assistant.llm.timeoutMs": 20000,
  "assistant.quotas.requestsPerMinute": 20,
  "assistant.quotas.requestsPerDay": 1000,
  "security.botProtection.enabled": true,
  "security.botProtection.siteKey": "public-site-key",
  "security.botProtection.secretKey.configured": true,
  "security.passwordPepperConfigured": true,
  ...overrides,
});

test("getStorageSettings hits GET /settings/storage", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      driver: "local",
      local: { dir: null },
      s3: { accessKey: { configured: false }, secretKey: { configured: false } },
      azure: { key: { configured: false }, connectionString: { configured: false } },
    });
  };

  try {
    await getStorageSettings();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/settings/storage");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateStorageSettings uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      driver: "local",
      local: { dir: null },
      s3: { accessKey: { configured: false }, secretKey: { configured: false } },
      azure: { key: { configured: false }, connectionString: { configured: false } },
    });
  };

  try {
    resetCsrfToken();
    await updateStorageSettings({ driver: "local" });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/settings/storage");
    expect(calls[1]?.init?.method).toBe("PATCH");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSettings hits GET /settings", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ "site.name": "Coderso", "site.locale": "en" });
  };

  try {
    await getSettings();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/settings");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSettingsCached stores only the redacted allowlist", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(
      settingsPayload({
        "smtp.password": "smtp-secret",
        "integrations.crm.apiKey": "crm-secret",
        "storage.s3.accessKey": "s3-access-key",
        "security.botProtection.secretKey": "raw-secret",
      })
    );
  };

  try {
    clearSettingsCache();
    await expect(getSettingsCached()).resolves.toMatchObject({
      "site.name": "Coderso",
      "assistant.llm.maxInputTokens": 8192,
    });
    expect(calls).toHaveLength(1);

    const cached = readCacheValue(storage, cacheKeys.settingsRedacted);
    expect(cached).toBeTruthy();
    expect(findUnsafeRedactedSettingsCachePaths(cached)).toEqual([]);
    const serialized = JSON.stringify(cached);
    expect(serialized).not.toContain("smtp-secret");
    expect(serialized).not.toContain("crm-secret");
    expect(serialized).not.toContain("s3-access-key");
    expect(serialized).not.toContain("raw-secret");
    expect(serialized).not.toContain("public-site-key");
    expect(getCachedRedactedSettings()?.securityConfigured).toEqual({
      botProtectionEnabled: true,
      botProtectionPublicConfigured: true,
      botProtectionConfigured: true,
      pepperConfigured: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("getSettingsCached returns a fresh redacted cache without fetch", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(settingsPayload({ "site.name": "Cached Site" }));
  };

  try {
    clearSettingsCache();
    await getSettingsCached();
    expect(calls).toHaveLength(1);

    globalThis.fetch = async (input, init) => {
      calls.push({ input, init });
      return jsonResponse(settingsPayload({ "site.name": "Unexpected Fetch" }));
    };

    await expect(getSettingsCached()).resolves.toMatchObject({
      "site.name": "Cached Site",
    });
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("getSecuritySettings hits GET /settings/security", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      csrf: { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 30 },
    });
  };

  try {
    await getSecuritySettings();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/settings/security");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSetting hits GET /settings/:key", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ key: "site.name", value: "Coderso" });
  };

  try {
    await getSetting("site.name");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/settings/site.name");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateSettings uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({ "site.name": "Coderso", "site.locale": "en" });
  };

  try {
    resetCsrfToken();
    await updateSettings({ "site.name": "Coderso" });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/settings");
    expect(calls[1]?.init?.method).toBe("PATCH");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateSettings primes redacted cache and broadcasts", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const events: CacheEvent[] = [];
  const unsubscribe = subscribeCacheEvents((event) => events.push(event));

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(settingsPayload({ "site.name": "Updated Site" }));
  };

  try {
    resetCsrfToken();
    clearSettingsCache();
    await updateSettings({ "site.name": "Updated Site" });

    expect(calls[1]?.input).toBe("/admin/api/settings");
    expect(readCacheValue(storage, cacheKeys.settingsRedacted)).toMatchObject({
      general: { siteName: "Updated Site" },
    });
    expect(events.some((event) => event.key === cacheKeys.settingsRedacted)).toBe(true);
    expect(
      events.some((event) => event.key === cacheKeys.settingsRedacted && event.action === "update")
    ).toBe(true);
  } finally {
    unsubscribe();
    resetCsrfToken();
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("updateSecuritySettings uses CSRF and PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      csrf: { enabled: false, headerName: "x-csrf-token", tokenTtlMinutes: 30 },
    });
  };

  try {
    resetCsrfToken();
    await updateSecuritySettings({ csrf: { enabled: false } });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/settings/security");
    expect(calls[1]?.init?.method).toBe("PATCH");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("updateSecuritySettings patches only redacted configured flags", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/settings") && init?.method === "GET") {
      return jsonResponse(settingsPayload());
    }
    return jsonResponse({
      csrf: { enabled: true, headerName: "x-csrf-token", tokenTtlMinutes: 30 },
      botProtection: {
        enabled: true,
        provider: "recaptcha_v3",
        siteKey: "new-public-site-key",
        secretKey: { configured: true },
        thresholds: { login: 0.5, reset: 0.5, publicWrite: 0.5 },
        enforceOnLocalhost: false,
      },
      passwordPepperConfigured: true,
    });
  };

  try {
    resetCsrfToken();
    clearSettingsCache();
    await getSettingsCached();
    await updateSecuritySettings({ botProtection: { siteKey: "new-public-site-key" } });

    const cached = readCacheValue(storage, cacheKeys.settingsRedacted);
    expect(cached).toMatchObject({
      securityConfigured: {
        botProtectionEnabled: true,
        botProtectionPublicConfigured: true,
        botProtectionConfigured: true,
        pepperConfigured: true,
      },
    });
    expect(findUnsafeRedactedSettingsCachePaths(cached)).toEqual([]);
    expect(JSON.stringify(cached)).not.toContain("new-public-site-key");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});
