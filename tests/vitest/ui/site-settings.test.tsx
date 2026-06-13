// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearContentTypesCache } from "../../../core/admin/services/contentTypesClient";
import { clearPagesCache } from "../../../core/admin/services/pagesClient";
import { primeRedactedSettingsCache } from "../../../core/admin/services/settingsCache";
import { clearSiteSettingsCache } from "../../../core/admin/services/siteSettingsClient";
import { SiteSettingsPage } from "../../../core/admin/ui/site/SiteSettingsPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
      clearPagesCache();
      clearContentTypesCache();
    },
  };
};

const setCacheValue = (
  storage: ReturnType<typeof createLocalStorage>,
  key: string,
  value: unknown
) => {
  storage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
};

const rawSiteSettingsPayload = (overrides: Record<string, unknown> = {}) => ({
  "site.name": "Coderso",
  "site.locale": "en",
  "site.publicBaseUrl": "https://coderso.test",
  "site.adminBaseUrl": "https://admin.coderso.test",
  "site.adminPath": "/admin",
  "site.adminRedirectEnabled": false,
  "site.homepageId": "page-home",
  "site.notFoundPageId": "page-404",
  "site.previewEnabled": true,
  "site.cacheTtlSeconds": 30,
  "site.contentRoutes": [],
  ...overrides,
});

const pageSummary = (id: string, title: string) => ({
  id,
  title,
  slug: `/${id}`,
  status: "published",
  updatedAt: "2026-06-02T00:00:00.000Z",
  author: null,
});

const contentTypeSummary = (id: string, slug: string) => ({
  id,
  name: slug,
  slug,
  schema: { type: "object", additionalProperties: false, properties: {} },
  status: "published",
  createdAt: "2026-06-02T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
});

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flushEffects = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const waitForAutoSaveDelay = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 900));
  });
};

const findButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button: ${label}`);
  return button as HTMLButtonElement;
};

const openCacheSection = (container: HTMLElement) => {
  React.act(() => {
    findButton(container, "Cache settings").click();
  });
};

const getCacheTtlInput = (container: HTMLElement) => {
  const input = Array.from(container.querySelectorAll("input")).find(
    (item) => item.getAttribute("type") === "number"
  );
  if (!input) throw new Error("missing cache ttl input");
  return input as HTMLInputElement;
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const clickButton = async (container: HTMLElement | ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const installSettingsFetch = (settings: () => Record<string, unknown>) => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/settings")) {
      return new Response(JSON.stringify(settings()), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.endsWith("/pages")) {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }
    if (url.endsWith("/content-types")) {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } });
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
};

test("SiteSettingsPage renders section navigation and actions", () => {
  const html = renderAdminUi(<SiteSettingsPage />);

  expect(html).toContain("Base URLs");
  expect(html).toContain("Homepage");
  expect(html).toContain("404");
  expect(html).toContain("Preview access");
  expect(html).toContain("Content routes");
  expect(html).toContain("Cache settings");
  expect(html).toContain("Performance");
  expect(html).toContain("Save changes");
  expect(html).toContain("View homepage");
  expect(html).toContain("Auto-save settings across all screens");
});

test("SiteSettingsPage no longer renders the Site shell section (moved to Menus, TASK-458-01)", () => {
  const html = renderAdminUi(<SiteSettingsPage />);

  expect(html).not.toContain("Site shell");
  expect(html).not.toContain("Global navigation menu and footer template");
  expect(html).not.toContain("data-site-shell-card");
});

test("SiteSettingsPage uses fresh cached selector resources on mount", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installSettingsFetch(() => rawSiteSettingsPayload());

  try {
    primeRedactedSettingsCache(rawSiteSettingsPayload());
    setCacheValue(storage, cacheKeys.pagesList, [pageSummary("page-home", "Home")]);
    setCacheValue(storage, cacheKeys.contentTypesList, [contentTypeSummary("ct-posts", "posts")]);

    const view = mount(
      <AdminRouterProvider initialPath="/admin/settings/site">
        <SiteSettingsPage />
      </AdminRouterProvider>
    );
    await flushEffects();

    const paths = fetchMock.calls.map((call) => String(call.input));
    expect(paths.filter((path) => path.endsWith("/pages"))).toHaveLength(0);
    expect(paths.filter((path) => path.endsWith("/content-types"))).toHaveLength(0);
    expect(paths.filter((path) => path.endsWith("/settings"))).toHaveLength(1);
    // Menus/page-templates selector loads moved to the Menus-surface
    // SiteShellDialog (TASK-458-01); this page must not request them at all.
    expect(paths.filter((path) => path.endsWith("/menus"))).toHaveLength(0);
    expect(paths.filter((path) => path.endsWith("/page-templates"))).toHaveLength(0);
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("SiteSettingsPage applies clean settings cache refreshes", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  let cacheTtlSeconds = 30;
  const fetchMock = installSettingsFetch(() =>
    rawSiteSettingsPayload({ "site.cacheTtlSeconds": cacheTtlSeconds })
  );

  try {
    primeRedactedSettingsCache(rawSiteSettingsPayload({ "site.cacheTtlSeconds": 30 }));
    setCacheValue(storage, cacheKeys.pagesList, [pageSummary("page-home", "Home")]);
    setCacheValue(storage, cacheKeys.contentTypesList, []);

    const view = mount(
      <AdminRouterProvider initialPath="/admin/settings/site">
        <SiteSettingsPage />
      </AdminRouterProvider>
    );
    await flushEffects();
    openCacheSection(view.container);
    expect(getCacheTtlInput(view.container).value).toBe("30");

    cacheTtlSeconds = 90;
    primeRedactedSettingsCache(rawSiteSettingsPayload({ "site.cacheTtlSeconds": cacheTtlSeconds }));
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.settingsRedacted, action: "update" });
    });
    await flushEffects();

    expect(getCacheTtlInput(view.container).value).toBe("90");
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("SiteSettingsPage does not overwrite dirty drafts on settings cache refresh", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  let cacheTtlSeconds = 30;
  const fetchMock = installSettingsFetch(() =>
    rawSiteSettingsPayload({ "site.cacheTtlSeconds": cacheTtlSeconds })
  );

  try {
    primeRedactedSettingsCache(rawSiteSettingsPayload({ "site.cacheTtlSeconds": 30 }));
    setCacheValue(storage, cacheKeys.pagesList, [pageSummary("page-home", "Home")]);
    setCacheValue(storage, cacheKeys.contentTypesList, []);

    const view = mount(
      <AdminRouterProvider initialPath="/admin/settings/site">
        <SiteSettingsPage />
      </AdminRouterProvider>
    );
    await flushEffects();
    openCacheSection(view.container);
    const input = getCacheTtlInput(view.container);

    React.act(() => {
      setInputValue(input, "45");
    });
    await flushEffects();
    expect(getCacheTtlInput(view.container).value).toBe("45");

    cacheTtlSeconds = 90;
    primeRedactedSettingsCache(rawSiteSettingsPayload({ "site.cacheTtlSeconds": cacheTtlSeconds }));
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.settingsRedacted, action: "update" });
    });
    await flushEffects();

    expect(getCacheTtlInput(view.container).value).toBe("45");
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("SiteSettingsPage requires review before risky routing saves", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installSettingsFetch(() => rawSiteSettingsPayload());

  try {
    storage.setItem("coderso.settings.autosave", "true");
    primeRedactedSettingsCache(rawSiteSettingsPayload());
    setCacheValue(storage, cacheKeys.pagesList, [pageSummary("page-home", "Home")]);
    setCacheValue(storage, cacheKeys.contentTypesList, []);

    const view = mount(
      <AdminRouterProvider initialPath="/admin/settings/site">
        <SiteSettingsPage />
      </AdminRouterProvider>
    );
    await flushEffects();

    const adminPathInput = view.container.querySelector("#admin-path") as HTMLInputElement | null;
    if (!adminPathInput) throw new Error("missing admin path input");
    React.act(() => {
      setInputValue(adminPathInput, "/cms");
    });
    await flushEffects();

    await clickButton(view.container, "Save changes");
    expect(document.body.textContent).toContain("Review site routing changes");
    expect(document.body.textContent).toContain("Admin access path");
    expect(
      fetchMock.calls.filter(
        (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
      )
    ).toHaveLength(0);

    await clickButton(document.body, "Cancel");
    expect(
      fetchMock.calls.filter(
        (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
      )
    ).toHaveLength(0);

    await clickButton(view.container, "Save changes");
    await clickButton(document.body, "Apply site changes");
    await flushEffects();

    const patchCalls = fetchMock.calls.filter(
      (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(1);
    const patchBody = JSON.parse(String(patchCalls[0]?.init?.body)) as Record<string, unknown>;
    expect(patchBody).toMatchObject({
      "site.adminPath": "/cms",
    });
    // The site shell keys are owned by the Menus-surface SiteShellDialog
    // (TASK-458-01); the page-wide save must not write them anymore.
    expect(Object.keys(patchBody)).not.toContain("site.navigationMenuId");
    expect(Object.keys(patchBody)).not.toContain("site.footerTemplateId");
    await waitForAutoSaveDelay();
    expect(
      fetchMock.calls.filter(
        (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
      )
    ).toHaveLength(1);
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});
