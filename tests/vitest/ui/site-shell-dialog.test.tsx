// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearMenusCache, type MenuSummary } from "../../../core/admin/services/menusClient";
import {
  clearPageTemplatesCache,
  type PageTemplateSummary,
} from "../../../core/admin/services/pageTemplatesClient";
import { clearSiteSettingsCache } from "../../../core/admin/services/siteSettingsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SiteShellDialog } from "../../../core/admin/ui/menus/SiteShellDialog";

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
  clearSiteSettingsCache();
  clearMenusCache();
  clearPageTemplatesCache();
  return {
    storage,
    restore: () => {
      if (originalLocal === undefined) {
        delete (globalThis as { localStorage?: unknown }).localStorage;
      } else {
        (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
      }
      clearSiteSettingsCache();
      clearMenusCache();
      clearPageTemplatesCache();
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
  "site.homepageId": null,
  "site.notFoundPageId": null,
  "site.navigationMenuId": "menu-published",
  "site.footerTemplateId": "template-published",
  "site.previewEnabled": true,
  "site.cacheTtlSeconds": 30,
  "site.contentRoutes": [],
  ...overrides,
});

const menuSummary = (
  id: string,
  name: string,
  status: MenuSummary["status"] = "published"
): MenuSummary => ({
  id,
  name,
  location: null,
  status,
  publishedAt: status === "published" ? "2026-06-10T00:00:00.000Z" : null,
  createdAt: "2026-06-01T00:00:00.000Z",
});

const templateSummary = (
  id: string,
  name: string,
  status: PageTemplateSummary["status"] = "published"
): PageTemplateSummary => ({
  id,
  name,
  slug: id,
  description: null,
  category: null,
  status,
  sectionsCount: 1,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z",
});

type FetchBehavior = {
  settings?: () => Record<string, unknown>;
  menus?: () => MenuSummary[];
  templates?: () => PageTemplateSummary[];
  failSettingsGet?: () => boolean;
  patchResponse?: () => Response;
};

const installFetch = (behavior: FetchBehavior = {}) => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/settings") && init?.method === "PATCH") {
      if (behavior.patchResponse) return behavior.patchResponse();
      return new Response(JSON.stringify((behavior.settings ?? rawSiteSettingsPayload)()), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.endsWith("/settings")) {
      if (behavior.failSettingsGet?.()) {
        return new Response(
          JSON.stringify({ error: { code: "internal", message: "Settings exploded" } }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify((behavior.settings ?? rawSiteSettingsPayload)()), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.endsWith("/menus")) {
      return new Response(JSON.stringify(behavior.menus?.() ?? []), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.endsWith("/page-templates")) {
      return new Response(JSON.stringify({ items: behavior.templates?.() ?? [] }), {
        headers: { "Content-Type": "application/json" },
      });
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

const clickButton = async (scope: ParentNode, label: string) => {
  const button = Array.from(scope.querySelectorAll("button")).find(
    (item) => item.textContent?.trim() === label
  );
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

const findButton = (scope: ParentNode, label: string) => {
  const button = Array.from(scope.querySelectorAll("button")).find(
    (item) => item.textContent?.trim() === label
  );
  if (!button) throw new Error(`missing button: ${label}`);
  return button as HTMLButtonElement;
};

const mountOpenDialog = (onOpenChange: (open: boolean) => void = () => undefined) =>
  mount(
    <AdminRouterProvider initialPath="/admin/menus">
      <SiteShellDialog open onOpenChange={onOpenChange} />
    </AdminRouterProvider>
  );

test("SiteShellDialog loads its own settings, menus, and templates on open", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch({
    menus: () => [menuSummary("menu-published", "Main menu")],
    templates: () => [templateSummary("template-published", "Footer columns")],
  });

  try {
    const view = mountOpenDialog();
    await flushEffects();

    const paths = fetchMock.calls.map((call) => String(call.input));
    expect(paths.filter((path) => path.endsWith("/settings"))).toHaveLength(1);
    expect(paths.filter((path) => path.endsWith("/menus"))).toHaveLength(1);
    expect(paths.filter((path) => path.endsWith("/page-templates"))).toHaveLength(1);

    expect(document.body.querySelector('[data-site-shell-dialog="true"]')).not.toBeNull();
    expect(document.body.querySelector('[data-site-shell-card="true"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Navigation menu");
    expect(document.body.textContent).toContain("Footer template");
    expect(findButton(document.body, "Save changes").disabled).toBe(false);
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("SiteShellDialog hydrates from cached clients without refetching options", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch();

  try {
    setCacheValue(storage, cacheKeys.menusList, [menuSummary("menu-published", "Main menu")]);
    setCacheValue(storage, cacheKeys.pageTemplatesList, [
      templateSummary("template-published", "Footer columns"),
    ]);

    const view = mountOpenDialog();
    await flushEffects();

    const paths = fetchMock.calls.map((call) => String(call.input));
    expect(paths.filter((path) => path.endsWith("/menus"))).toHaveLength(0);
    expect(paths.filter((path) => path.endsWith("/page-templates"))).toHaveLength(0);
    expect(paths.filter((path) => path.endsWith("/settings"))).toHaveLength(1);
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("SiteShellDialog saves a scoped partial PATCH with exactly the two shell keys", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch({
    menus: () => [menuSummary("menu-published", "Main menu")],
    templates: () => [templateSummary("template-published", "Footer columns")],
  });
  const openChanges: boolean[] = [];

  try {
    const view = mountOpenDialog((open) => openChanges.push(open));
    await flushEffects();

    await clickButton(document.body, "Save changes");
    await flushEffects();

    const patchCalls = fetchMock.calls.filter(
      (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(1);
    expect(JSON.parse(String(patchCalls[0]?.init?.body))).toEqual({
      "site.navigationMenuId": "menu-published",
      "site.footerTemplateId": "template-published",
    });
    expect(openChanges).toEqual([false]);
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("SiteShellDialog maps site_shell_* save errors onto the matching picker and stays open", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch({
    menus: () => [menuSummary("menu-published", "Main menu")],
    templates: () => [templateSummary("template-published", "Footer columns")],
    patchResponse: () =>
      new Response(
        JSON.stringify({
          error: { code: "site_shell_menu_not_found", message: "Menu not found" },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
  });
  const openChanges: boolean[] = [];

  try {
    const view = mountOpenDialog((open) => openChanges.push(open));
    await flushEffects();

    await clickButton(document.body, "Save changes");
    await flushEffects();

    expect(openChanges).toEqual([]);
    expect(
      document.body.querySelector('[data-site-shell-error="navigation-menu"]')?.textContent
    ).toContain("menu no longer exists");
    expect(document.body.querySelector('[data-site-shell-dialog-error="save"]')).toBeNull();
    expect(findButton(document.body, "Save changes").disabled).toBe(false);
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("SiteShellDialog surfaces unknown save errors as a dialog-level alert", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch({
    menus: () => [menuSummary("menu-published", "Main menu")],
    templates: () => [templateSummary("template-published", "Footer columns")],
    patchResponse: () =>
      new Response(JSON.stringify({ error: { code: "internal", message: "Save exploded" } }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
  });

  try {
    const view = mountOpenDialog();
    await flushEffects();

    await clickButton(document.body, "Save changes");
    await flushEffects();

    expect(document.body.querySelector('[data-site-shell-dialog-error="save"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Save exploded");
    expect(document.body.querySelector('[data-site-shell-card="true"]')).not.toBeNull();
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("SiteShellDialog shows a retry state on load failure and recovers on retry", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  let failLoad = true;
  const fetchMock = installFetch({
    menus: () => [menuSummary("menu-published", "Main menu")],
    templates: () => [templateSummary("template-published", "Footer columns")],
    failSettingsGet: () => failLoad,
  });

  try {
    const view = mountOpenDialog();
    await flushEffects();

    expect(document.body.querySelector('[data-site-shell-dialog-error="load"]')).not.toBeNull();
    expect(document.body.querySelector('[data-site-shell-card="true"]')).toBeNull();
    expect(findButton(document.body, "Save changes").disabled).toBe(true);

    failLoad = false;
    await clickButton(document.body, "Retry");
    await flushEffects();

    expect(document.body.querySelector('[data-site-shell-dialog-error="load"]')).toBeNull();
    expect(document.body.querySelector('[data-site-shell-card="true"]')).not.toBeNull();
    expect(findButton(document.body, "Save changes").disabled).toBe(false);
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});

test("SiteShellDialog renders nothing while closed and loads nothing", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch();

  try {
    const view = mount(
      <AdminRouterProvider initialPath="/admin/menus">
        <SiteShellDialog open={false} onOpenChange={() => undefined} />
      </AdminRouterProvider>
    );
    await flushEffects();

    expect(fetchMock.calls).toHaveLength(0);
    expect(document.body.querySelector('[data-site-shell-dialog="true"]')).toBeNull();
    view.cleanup();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});
