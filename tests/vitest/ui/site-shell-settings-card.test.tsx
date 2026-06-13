// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { ApiClientError } from "../../../core/admin/services/apiClient";
import { type MenuSummary } from "../../../core/admin/services/menusClient";
import { type PageTemplateSummary } from "../../../core/admin/services/pageTemplatesClient";
import {
  clearSiteSettingsCache,
  updateSiteSettings,
} from "../../../core/admin/services/siteSettingsClient";
import {
  SiteShellCard,
  buildSiteShellMenuOptions,
  buildSiteShellTemplateOptions,
  resolveSiteShellFieldErrors,
} from "../../../core/admin/ui/site/SiteShellCard";

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
    },
  };
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
    return new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } });
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
};

test("buildSiteShellMenuOptions lists published menus plus the unpublished current selection", () => {
  const menus = [
    menuSummary("menu-published", "Main menu"),
    menuSummary("menu-draft", "Draft menu", "draft"),
  ];

  const published = buildSiteShellMenuOptions(menus, null);
  expect(published).toEqual([{ value: "menu-published", label: "Main menu", published: true }]);

  const withDraftSelection = buildSiteShellMenuOptions(menus, "menu-draft");
  expect(withDraftSelection).toEqual([
    { value: "menu-published", label: "Main menu", published: true },
    { value: "menu-draft", label: "Draft menu", published: false },
  ]);

  const withMissingSelection = buildSiteShellMenuOptions(menus, "menu-gone");
  expect(withMissingSelection[1]).toEqual({
    value: "menu-gone",
    label: "Unknown menu",
    published: false,
  });
});

test("buildSiteShellTemplateOptions lists published templates plus the unpublished current selection", () => {
  const templates = [
    templateSummary("template-published", "Footer columns"),
    templateSummary("template-draft", "Draft footer", "draft"),
  ];

  expect(buildSiteShellTemplateOptions(templates, null)).toEqual([
    { value: "template-published", label: "Footer columns", published: true },
  ]);
  expect(buildSiteShellTemplateOptions(templates, "template-draft")).toEqual([
    { value: "template-published", label: "Footer columns", published: true },
    { value: "template-draft", label: "Draft footer", published: false },
  ]);
});

test("resolveSiteShellFieldErrors maps site_shell_* route errors onto the matching picker", () => {
  expect(
    resolveSiteShellFieldErrors(
      new ApiClientError("site_shell_menu_not_found", "Navigation menu not found", 400)
    ).navigationMenuId
  ).toContain("menu no longer exists");
  expect(
    resolveSiteShellFieldErrors(
      new ApiClientError("site_shell_template_not_found", "Footer template not found", 400)
    ).footerTemplateId
  ).toContain("template no longer exists");
  expect(
    resolveSiteShellFieldErrors(new ApiClientError("settings_value_invalid", "Invalid", 400))
  ).toEqual({});
  expect(resolveSiteShellFieldErrors(new Error("boom"))).toEqual({});
});

test("SiteShellCard renders pickers, helper text, and inline validation errors", () => {
  const html = renderAdminUi(
    <SiteShellCard
      values={{ navigationMenuId: "menu-published", footerTemplateId: null }}
      menus={[menuSummary("menu-published", "Main menu")]}
      templates={[templateSummary("template-published", "Footer columns")]}
      errors={{ navigationMenuId: "This menu no longer exists. Pick another menu or None." }}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("Site shell");
  expect(html).toContain("Navigation menu");
  expect(html).toContain("Footer template");
  expect(html).toContain("Only published menus and published page templates render publicly");
  expect(html).toContain('data-site-shell-error="navigation-menu"');
  expect(html).toContain("This menu no longer exists. Pick another menu or None.");
});

test("SiteShellCard links to Menus and Page Templates when nothing is published", () => {
  const html = renderAdminUi(
    <SiteShellCard
      values={{ navigationMenuId: null, footerTemplateId: null }}
      menus={[menuSummary("menu-draft", "Draft menu", "draft")]}
      templates={[]}
      onChange={() => undefined}
    />
  );

  expect(html).toContain("No published menus yet.");
  expect(html).toContain("No published page templates yet.");
  expect(html).toContain("/admin/menus");
  expect(html).toContain("/admin/advanced/page-templates");
});

test("updateSiteSettings writes the site shell keys through the settings PATCH payload", async () => {
  const { restore: restoreStorage } = installLocalStorage();
  const fetchMock = installSettingsFetch(() =>
    rawSiteSettingsPayload({
      "site.navigationMenuId": "menu-next",
      "site.footerTemplateId": null,
    })
  );

  try {
    const updated = await updateSiteSettings({
      navigationMenuId: " menu-next ",
      footerTemplateId: null,
    });

    const patchCalls = fetchMock.calls.filter(
      (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(1);
    expect(JSON.parse(String(patchCalls[0]?.init?.body))).toEqual({
      "site.navigationMenuId": "menu-next",
      "site.footerTemplateId": null,
    });
    expect(updated.navigationMenuId).toBe("menu-next");
    expect(updated.footerTemplateId).toBeNull();
  } finally {
    fetchMock.restore();
    restoreStorage();
  }
});
