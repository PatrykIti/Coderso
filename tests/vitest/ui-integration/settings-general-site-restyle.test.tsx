// @vitest-environment happy-dom
//
// TASK-479-28-L07: General + Site settings restyle (L02). Proves the
// SettingsSection grouping renders, the General save/dirty contract still calls
// onSave with edited values, and the Site homepage/posts selects populate from
// the REAL pages/content-types caches (not the prototype's mock literals).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearContentTypesCache } from "../../../core/admin/services/contentTypesClient";
import { clearPagesCache } from "../../../core/admin/services/pagesClient";
import { primeRedactedSettingsCache } from "../../../core/admin/services/settingsCache";
import { clearSiteSettingsCache } from "../../../core/admin/services/siteSettingsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { GeneralSettingsPage } from "../../../core/admin/ui/settings/GeneralSettingsPage";
import { SiteSettingsPage } from "../../../core/admin/ui/site/SiteSettingsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const clickButton = async (root: ParentNode, label: string) => {
  const button = Array.from(root.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

// --- Site cache priming (mirrors site-settings.test) -----------------------
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

let restoreLocal: (() => void) | null = null;

const installLocalStorage = () => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  restoreLocal = () => {
    if (original === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = original;
    }
    clearSiteSettingsCache();
    clearPagesCache();
    clearContentTypesCache();
  };
  return storage;
};

const setCacheValue = (
  storage: ReturnType<typeof createLocalStorage>,
  key: string,
  value: unknown
) => {
  storage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
};

const rawSiteSettingsPayload = () => ({
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
});

const pageSummary = (id: string, title: string) => ({
  id,
  title,
  slug: `/${id}`,
  status: "published",
  updatedAt: "2026-06-02T00:00:00.000Z",
  author: null,
});

const installFetch = () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/settings")) {
      return new Response(JSON.stringify(rawSiteSettingsPayload()), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.endsWith("/pages")) {
      return new Response(JSON.stringify([pageSummary("page-home", "Cache Home Page")]), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
  };
  return () => {
    globalThis.fetch = original;
  };
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  restoreLocal?.();
  restoreLocal = null;
});

test("General renders SettingsSection groups over the real branding fields", () => {
  const html = renderAdminUi(
    <GeneralSettingsPage values={{ siteName: "Acme", siteLocale: "en" }} onSave={vi.fn()} />,
    { path: "/admin/settings/general" }
  );

  expect(html).toContain("Site Identity");
  expect(html).toContain("Branding");
  expect(html).toContain("Save changes");
  expect(html).toContain("Auto-save settings across all screens");
});

test("General edit flips dirty and Save calls onSave with the edited values", async () => {
  const onSave = vi.fn(async () => undefined);
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/general">
      <GeneralSettingsPage values={{ siteName: "Acme", siteLocale: "en" }} onSave={onSave} />
    </AdminRouterProvider>
  );

  try {
    const input = view.container.querySelector("#site-name") as HTMLInputElement | null;
    if (!input) throw new Error("missing site-name input");

    React.act(() => {
      setInputValue(input, "Acme Studio");
    });
    await flushEffects();

    await clickButton(view.container, "Save changes");
    await flushEffects();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ siteName: "Acme Studio", siteLocale: "en" })
    );
  } finally {
    view.cleanup();
  }
});

test("Site homepage select populates from the real pages cache (not mock literals)", async () => {
  const storage = installLocalStorage();
  const restoreFetch = installFetch();

  try {
    primeRedactedSettingsCache(rawSiteSettingsPayload());
    setCacheValue(storage, cacheKeys.pagesList, [pageSummary("page-home", "Cache Home Page")]);
    setCacheValue(storage, cacheKeys.contentTypesList, []);

    const view = mount(
      <AdminRouterProvider initialPath="/admin/settings/site">
        <SiteSettingsPage />
      </AdminRouterProvider>
    );
    await flushEffects();

    // Reveal the Homepage & 404 section, then assert the option comes from the
    // real cached page — and that the prototype's mock literals are absent.
    await clickButton(view.container, "Homepage & 404");
    await flushEffects();

    expect(view.container.textContent).toContain("Cache Home Page");
    expect(view.container.textContent).not.toContain("Welcome page");
    expect(view.container.textContent).not.toContain("Landing");
    view.cleanup();
  } finally {
    restoreFetch();
  }
});
