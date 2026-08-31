import { expect, test } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { primeRedactedSettingsCache } from "../../../core/admin/services/settingsCache";
import {
  clearSiteSettingsCache,
  getCachedSiteSettings,
  getSiteSettingsCached,
  getSiteSettings,
  resolveContentSlugDisplay,
  resolveContentSlugRouteContext,
  resolvePostSlugDisplay,
  resolvePostSlugRouteContext,
  updateSiteSettings,
} from "../../../core/admin/services/siteSettingsClient";

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
      clearSiteSettingsCache();
    },
  };
};

const readCacheValue = (storage: ReturnType<typeof createLocalStorage>, key: string) => {
  const raw = storage.getItem(key);
  return raw ? (JSON.parse(raw) as { value: unknown }).value : null;
};

const rawSiteSettingsPayload = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

test("getSiteSettings normalizes raw settings payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      "site.adminBaseUrl": "   ",
      "site.publicBaseUrl": " https://coderso.test ",
      "site.adminPath": 42,
      "site.adminRedirectEnabled": "yes",
      "site.homepageId": " homepage ",
      "site.notFoundPageId": null,
      "site.previewEnabled": "no",
      "site.cacheTtlSeconds": -4,
      "site.contentRoutes": [
        {
          type: "posts",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: false,
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
        {
          type: "pages",
          listPath: "/pages",
        },
        "bad-record",
      ],
    });
  };

  try {
    await expect(getSiteSettings()).resolves.toEqual({
      adminBaseUrl: null,
      publicBaseUrl: "https://coderso.test",
      adminPath: "/admin",
      adminRedirectEnabled: false,
      homepageId: "homepage",
      notFoundPageId: null,
      navigationMenuId: null,
      footerTemplateId: null,
      previewEnabled: true,
      cacheTtlSeconds: 0,
      contentRoutes: [
        {
          type: "posts",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: false,
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      ],
    });
    expect(calls[0]?.input).toBe("/admin/api/settings");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSiteSettingsCached hydrates from redacted cache without fetch", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(rawSiteSettingsPayload({ "site.adminPath": "/unexpected" }));
  };

  try {
    clearSiteSettingsCache();
    primeRedactedSettingsCache(rawSiteSettingsPayload({ "site.adminPath": "/cached" }));

    await expect(getSiteSettingsCached()).resolves.toMatchObject({
      adminPath: "/cached",
      publicBaseUrl: "https://coderso.test",
      contentRoutes: [
        {
          type: "posts",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
        },
      ],
    });
    expect(getCachedSiteSettings()?.adminPath).toBe("/cached");
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("getSiteSettingsCached discards malformed redacted cache and fetches", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(rawSiteSettingsPayload({ "site.adminPath": "/fresh" }));
  };

  try {
    clearSiteSettingsCache();
    storage.setItem(
      cacheKeys.settingsRedacted,
      JSON.stringify({
        savedAt: Date.now(),
        value: {
          schemaVersion: 1,
          secretToken: "bad",
        },
      })
    );

    await expect(getSiteSettingsCached()).resolves.toMatchObject({
      adminPath: "/fresh",
    });
    expect(calls).toHaveLength(1);
    expect(readCacheValue(storage, cacheKeys.settingsRedacted)).toMatchObject({
      site: { adminPath: "/fresh" },
    });
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("updateSiteSettings patches normalized payload with csrf token", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }

    return jsonResponse({
      "site.adminBaseUrl": "https://admin.coderso.test",
      "site.publicBaseUrl": "https://public.coderso.test",
      "site.adminPath": "/cms",
      "site.adminRedirectEnabled": true,
      "site.homepageId": "home-1",
      "site.notFoundPageId": "404-1",
      "site.previewEnabled": false,
      "site.cacheTtlSeconds": 91.4,
      "site.contentRoutes": [
        {
          type: "posts",
          listPath: "/news",
          detailPath: "/news/:slug",
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      ],
    });
  };

  try {
    resetCsrfToken();
    await expect(
      updateSiteSettings({
        publicBaseUrl: " https://public.coderso.test ",
        adminBaseUrl: " ",
        adminPath: "/cms",
        adminRedirectEnabled: true,
        homepageId: " home-1 ",
        notFoundPageId: null,
        previewEnabled: false,
        cacheTtlSeconds: 91.4,
        contentRoutes: [
          {
            type: "posts",
            listPath: "/news",
            detailPath: "/news/:slug",
            enabled: true,
            detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
          },
        ],
      })
    ).resolves.toEqual({
      adminBaseUrl: "https://admin.coderso.test",
      publicBaseUrl: "https://public.coderso.test",
      adminPath: "/cms",
      adminRedirectEnabled: true,
      homepageId: "home-1",
      notFoundPageId: "404-1",
      navigationMenuId: null,
      footerTemplateId: null,
      previewEnabled: false,
      cacheTtlSeconds: 91,
      contentRoutes: [
        {
          type: "posts",
          listPath: "/news",
          detailPath: "/news/:slug",
          enabled: true,
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      ],
    });

    expect(calls[1]?.input).toBe("/admin/api/settings");
    expect(calls[1]?.init?.method).toBe("PATCH");
    expect(new Headers(calls[1]?.init?.headers).get("X-CSRF-Token")).toBe("csrf-token");
    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      "site.publicBaseUrl": "https://public.coderso.test",
      "site.adminBaseUrl": null,
      "site.adminPath": "/cms",
      "site.adminRedirectEnabled": true,
      "site.homepageId": "home-1",
      "site.notFoundPageId": null,
      "site.previewEnabled": false,
      "site.cacheTtlSeconds": 91.4,
      "site.contentRoutes": [
        {
          type: "posts",
          listPath: "/news",
          detailPath: "/news/:slug",
          enabled: true,
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      ],
    });
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("updateSiteSettings omits undefined fields and keeps explicit string values", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }

    return jsonResponse({});
  };

  try {
    resetCsrfToken();
    await updateSiteSettings({
      adminPath: "/backoffice",
      homepageId: undefined,
      notFoundPageId: undefined,
    });

    expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
      "site.adminPath": "/backoffice",
    });
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("updateSiteSettings primes redacted settings cache", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }

    return jsonResponse(
      rawSiteSettingsPayload({
        "site.adminPath": "/cms",
        "site.publicBaseUrl": "https://public.coderso.test",
        "security.botProtection.secretKey": "raw-secret",
      })
    );
  };

  try {
    resetCsrfToken();
    clearSiteSettingsCache();
    await updateSiteSettings({ adminPath: "/cms" });

    expect(calls[1]?.input).toBe("/admin/api/settings");
    expect(readCacheValue(storage, cacheKeys.settingsRedacted)).toMatchObject({
      site: {
        adminPath: "/cms",
        publicBaseUrl: "https://public.coderso.test",
      },
    });
    expect(JSON.stringify(readCacheValue(storage, cacheKeys.settingsRedacted))).not.toContain(
      "raw-secret"
    );
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("post slug helpers derive concrete and fallback route hints", () => {
  const context = resolvePostSlugRouteContext({
    publicBaseUrl: "https://coderso.test",
    contentRoutes: [
      {
        type: "posts",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
      },
    ],
  });

  expect(resolvePostSlugDisplay(context, "launch-post")).toEqual({
    label: "Public URL",
    value: "https://coderso.test/blog/launch-post",
    concrete: true,
  });

  expect(
    resolvePostSlugDisplay(
      {
        publicBaseUrl: null,
        detailPathPattern: "/blog/:slug",
      },
      "launch-post"
    )
  ).toEqual({
    label: "Route hint",
    value: "/blog/launch-post",
    concrete: false,
  });

  expect(
    resolvePostSlugDisplay(
      {
        publicBaseUrl: "https://coderso.test",
        detailPathPattern: "/blog/:id",
      },
      "launch-post"
    )
  ).toEqual({
    label: "Route hint",
    value: "https://coderso.test/blog/:id",
    concrete: false,
  });
});

test("content slug helpers derive generic content route hints", () => {
  const context = resolveContentSlugRouteContext(
    {
      publicBaseUrl: "https://coderso.test",
      contentRoutes: [
        {
          type: "articles",
          listPath: "/articles",
          detailPath: "/articles/:slug",
          enabled: true,
        },
      ],
    },
    "articles"
  );

  expect(context).toEqual({
    publicBaseUrl: "https://coderso.test",
    contentTypeSlug: "articles",
    detailPathPattern: "/articles/:slug",
    routeEnabled: true,
  });
  expect(resolveContentSlugDisplay(context, "hello-world")).toEqual({
    label: "Public URL",
    value: "https://coderso.test/articles/hello-world",
    concrete: true,
  });

  const fallback = resolveContentSlugRouteContext(
    {
      publicBaseUrl: null,
      contentRoutes: [],
    },
    "projects"
  );
  expect(resolveContentSlugDisplay(fallback, "alpha")).toEqual({
    label: "Route hint",
    value: "/projects/alpha",
    concrete: false,
  });
});

test("post slug helpers join relative patterns with a slash separator", () => {
  expect(
    resolvePostSlugDisplay(
      { publicBaseUrl: "https://coderso.test", detailPathPattern: "posts/:slug" },
      "launch-post"
    )
  ).toEqual({
    label: "Public URL",
    value: "https://coderso.test/posts/launch-post",
    concrete: true,
  });
});

test("updateSiteSettings sends navigation and footer template ids", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    if (String(input).endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(rawSiteSettingsPayload());
  };

  try {
    resetCsrfToken();
    await updateSiteSettings({ navigationMenuId: "menu-9", footerTemplateId: "tpl-9" });
    const patch = calls.find((call) => String(call.input).endsWith("/settings"));
    const body = JSON.parse(String(patch?.init?.body)) as Record<string, unknown>;
    expect(body["site.navigationMenuId"]).toBe("menu-9");
    expect(body["site.footerTemplateId"]).toBe("tpl-9");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getSiteSettingsCached discards redacted caches with invalid assistant or security sections", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input) => {
    calls.push({ input });
    return jsonResponse(rawSiteSettingsPayload({ "site.adminPath": "/fresh" }));
  };

  const validRedacted = () => ({
    schemaVersion: 1,
    general: {
      siteName: "Coderso",
      siteLocale: "en",
      publicBaseUrl: "https://coderso.test",
    },
    runtime: { authSessionTtlDays: 14, authResetTtlMinutes: 60, setupCompleted: false },
    assistant: {
      enabled: false,
      defaultMode: "docs-only",
      docsReindexOnBoot: false,
      launcherAvatarEnabled: false,
      launcherAvatarAsset: null,
      llmEnabled: false,
      llmProvider: "none",
      llmModel: "",
      llmInputLimit: 12000,
      llmOutputLimit: 1200,
      llmTimeoutMs: 30000,
      quotaRequestsPerMinute: 20,
      quotaRequestsPerDay: 500,
    },
    site: {
      adminBaseUrl: null,
      publicBaseUrl: "https://coderso.test",
      adminPath: "/stale",
      adminRedirectEnabled: false,
      homepageId: null,
      notFoundPageId: null,
      navigationMenuId: null,
      footerTemplateId: null,
      previewEnabled: true,
      cacheTtlSeconds: 30,
      contentRoutes: [],
    },
    securityConfigured: {
      botProtectionEnabled: false,
      botProtectionPublicConfigured: false,
      botProtectionConfigured: false,
      pepperConfigured: false,
    },
  });

  type SettingsSeed = Record<string, unknown> & {
    assistant: Record<string, unknown>;
    securityConfigured: Record<string, unknown>;
  };
  const seeds: Array<(value: SettingsSeed) => SettingsSeed> = [
    (value) => ({ ...value, assistant: { ...value.assistant, rogueKey: 1 } }),
    (value) => ({ ...value, assistant: { ...value.assistant, defaultMode: "wizard" } }),
    (value) => ({ ...value, assistant: { ...value.assistant, llmProvider: "google" } }),
    (value) => ({ ...value, securityConfigured: { ...value.securityConfigured, rogueKey: true } }),
  ];

  try {
    clearSiteSettingsCache();
    for (const mutate of seeds) {
      const baseline = calls.length;
      storage.setItem(
        cacheKeys.settingsRedacted,
        JSON.stringify({ savedAt: Date.now(), value: mutate(validRedacted()) })
      );
      await expect(getSiteSettingsCached()).resolves.toMatchObject({ adminPath: "/fresh" });
      expect(calls.length).toBe(baseline + 1);
      clearSiteSettingsCache();
    }
  } finally {
    clearSiteSettingsCache();
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
});

test("getCachedSiteSettings storageFirst reads the storage envelope over memory", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  try {
    clearSiteSettingsCache();
    storage.setItem(
      cacheKeys.settingsRedacted,
      JSON.stringify({
        savedAt: Date.now(),
        value: {
          schemaVersion: 1,
          general: {
            siteName: "Coderso",
            siteLocale: "en",
            publicBaseUrl: "https://coderso.test",
          },
          runtime: { authSessionTtlDays: 14, authResetTtlMinutes: 60, setupCompleted: false },
          assistant: {
            enabled: false,
            defaultMode: "docs-only",
            docsReindexOnBoot: false,
            launcherAvatarEnabled: false,
            launcherAvatarAsset: null,
            llmEnabled: false,
            llmProvider: "none",
            llmModel: "",
            llmInputLimit: 12000,
            llmOutputLimit: 1200,
            llmTimeoutMs: 30000,
            quotaRequestsPerMinute: 20,
            quotaRequestsPerDay: 500,
          },
          site: {
            adminBaseUrl: null,
            publicBaseUrl: "https://coderso.test",
            adminPath: "/storage-first",
            adminRedirectEnabled: false,
            homepageId: null,
            notFoundPageId: null,
            navigationMenuId: null,
            footerTemplateId: null,
            previewEnabled: true,
            cacheTtlSeconds: 30,
            contentRoutes: [],
          },
          securityConfigured: {
            botProtectionEnabled: false,
            botProtectionPublicConfigured: false,
            botProtectionConfigured: false,
            pepperConfigured: false,
          },
        },
      })
    );
    expect(getCachedSiteSettings({ storageFirst: true })?.adminPath).toBe("/storage-first");
  } finally {
    clearSiteSettingsCache();
    restoreStorage();
  }
});
