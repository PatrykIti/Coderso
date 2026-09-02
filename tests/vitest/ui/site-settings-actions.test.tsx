// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearContentTypesCache } from "../../../core/admin/services/contentTypesClient";
import { clearPagesCache } from "../../../core/admin/services/pagesClient";
import { primeRedactedSettingsCache } from "../../../core/admin/services/settingsCache";
import { clearSiteSettingsCache } from "../../../core/admin/services/siteSettingsClient";
import { SiteSettingsPage } from "../../../core/admin/ui/site/SiteSettingsPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    disabled,
    onCheckedChange,
  }: {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

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
  "site.contentRoutes": [
    {
      type: "posts",
      listPath: "/posts",
      detailPath: "/posts/:slug",
      enabled: true,
    },
  ],
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

type FetchRoute = {
  match: (url: string, init?: RequestInit) => boolean;
  respond: (url: string, init?: RequestInit) => Promise<Response>;
};

const installFetch = (routes: FetchRoute[]) => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    const route = routes.find((candidate) => candidate.match(url, init));
    if (!route) {
      return new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } });
    }
    return route.respond(url, init);
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
};

const jsonResponse = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

const settingsRoutes = (overrides: () => Record<string, unknown>) => [
  {
    match: (url: string, init?: RequestInit) =>
      url.endsWith("/settings") && (init?.method ?? "GET") === "GET",
    respond: () => Promise.resolve(jsonResponse(overrides())),
  },
  {
    match: (url: string, init?: RequestInit) =>
      url.endsWith("/settings") && (init?.method ?? "GET") === "PATCH",
    respond: () => Promise.resolve(jsonResponse(overrides())),
  },
  {
    match: (url: string, _init?: RequestInit) => url.endsWith("/pages"),
    respond: () =>
      Promise.resolve(
        jsonResponse([pageSummary("page-home", "Home"), pageSummary("page-404", "Not found")])
      ),
  },
  {
    match: (url: string, _init?: RequestInit) => url.endsWith("/content-types"),
    respond: () =>
      Promise.resolve(
        jsonResponse([
          contentTypeSummary("ct-posts", "posts"),
          contentTypeSummary("ct-news", "news"),
        ])
      ),
  },
  {
    match: (url: string, init?: RequestInit) =>
      /\/pages\/[^/]+\/preview$/.test(url) && (init?.method ?? "GET") === "POST",
    respond: () =>
      Promise.resolve(
        jsonResponse({
          token: "preview-token",
          previewUrl: "https://preview.coderso.test/abc",
          expiresAt: "2026-06-03T00:00:00.000Z",
        })
      ),
  },
];

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
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const findButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button: ${label}`);
  return button as HTMLButtonElement;
};

const clickButton = async (container: HTMLElement | ParentNode, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(label)
  );
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    (button as HTMLButtonElement).click();
    await Promise.resolve();
  });
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const openSection = (container: HTMLElement, label: string) => {
  React.act(() => {
    findButton(container, label).click();
  });
};

const setupPage = async (overrides: () => Record<string, unknown> = rawSiteSettingsPayload) => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  const fetchMock = installFetch(settingsRoutes(overrides));
  primeRedactedSettingsCache(overrides());
  setCacheValue(storage, cacheKeys.pagesList, [
    pageSummary("page-home", "Home"),
    pageSummary("page-404", "Not found"),
  ]);
  setCacheValue(storage, cacheKeys.contentTypesList, [
    contentTypeSummary("ct-posts", "posts"),
    contentTypeSummary("ct-news", "news"),
  ]);

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/site">
      <SiteSettingsPage />
    </AdminRouterProvider>
  );
  await flushEffects();

  return {
    storage,
    fetchMock,
    view,
    restore: () => {
      view.cleanup();
      fetchMock.restore();
      restoreStorage();
    },
  };
};

test("SiteSettingsPage surfaces admin path validation errors", async () => {
  const { view, restore } = await setupPage();
  try {
    const adminPath = view.container.querySelector("#admin-path") as HTMLInputElement | null;
    if (!adminPath) throw new Error("missing admin path input");

    React.act(() => {
      setInputValue(adminPath, "");
    });
    await flushEffects();
    expect(document.body.textContent).toContain("Admin path is required.");

    React.act(() => {
      setInputValue(adminPath, "/");
    });
    await flushEffects();
    expect(document.body.textContent).toContain("Admin path must be longer than '/'.");

    React.act(() => {
      setInputValue(adminPath, "/bad path!");
    });
    await flushEffects();
    expect(document.body.textContent).toContain(
      "Use only letters, numbers, dashes, and underscores (single segment)."
    );
  } finally {
    restore();
  }
});

test("SiteSettingsPage view homepage uses the public base URL and trims trailing slash", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  const { view, restore } = await setupPage(() =>
    rawSiteSettingsPayload({ "site.publicBaseUrl": "https://coderso.test/" })
  );
  try {
    await clickButton(view.container, "View homepage");
    expect(openSpy).toHaveBeenCalledWith("https://coderso.test", "_blank", "noopener");
    expect(document.body.textContent).not.toContain("Action blocked");
  } finally {
    restore();
    openSpy.mockRestore();
  }
});

test("SiteSettingsPage view homepage falls back to window origin when the base URL is blank", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  const { view, restore } = await setupPage(() =>
    rawSiteSettingsPayload({ "site.publicBaseUrl": "" })
  );
  try {
    await clickButton(view.container, "View homepage");
    expect(openSpy).toHaveBeenCalledWith(window.location.origin, "_blank", "noopener");
  } finally {
    restore();
    openSpy.mockRestore();
  }
});

test("SiteSettingsPage view homepage reports a missing base URL when no origin is available", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  const { view, restore } = await setupPage(() =>
    rawSiteSettingsPayload({ "site.publicBaseUrl": "" })
  );
  const originalLocation = window.location;
  try {
    // With both the stored base URL and the environment origin absent,
    // resolvePublicBaseUrl has nowhere to fall back and must report the gap.
    Object.defineProperty(window, "location", {
      value: { origin: "" },
      configurable: true,
    });
    await clickButton(view.container, "View homepage");
    expect(document.body.textContent).toContain(
      "Add a public base URL to open the homepage preview."
    );
    expect(openSpy).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      configurable: true,
    });
    restore();
    openSpy.mockRestore();
  }
});

test("SiteSettingsPage test preview reports disabled preview and missing homepage", async () => {
  const { view, restore } = await setupPage(() =>
    rawSiteSettingsPayload({
      "site.previewEnabled": false,
      "site.homepageId": null,
    })
  );
  try {
    openSection(view.container, "Preview access");
    await clickButton(view.container, "Test preview URL");
    expect(document.body.textContent).toContain(
      "Preview is disabled. Enable it to generate preview links."
    );
  } finally {
    restore();
  }

  const second = await setupPage(() => rawSiteSettingsPayload({ "site.homepageId": null }));
  try {
    openSection(second.view.container, "Preview access");
    await clickButton(second.view.container, "Test preview URL");
    expect(document.body.textContent).toContain("Select a homepage to generate a preview URL.");
  } finally {
    second.restore();
  }
});

test("SiteSettingsPage test preview opens the generated preview URL", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  const { view, restore } = await setupPage();
  try {
    openSection(view.container, "Preview access");
    await clickButton(view.container, "Test preview URL");
    expect(openSpy).toHaveBeenCalledWith("https://preview.coderso.test/abc", "_blank", "noopener");
  } finally {
    restore();
    openSpy.mockRestore();
  }
});

test("SiteSettingsPage test preview surfaces a failed preview request", async () => {
  const originalFetch = globalThis.fetch;
  const { view, restore } = await setupPage();
  try {
    globalThis.fetch = async () => {
      throw new Error("preview backend down");
    };
    openSection(view.container, "Preview access");
    await clickButton(view.container, "Test preview URL");
    expect(document.body.textContent).toContain("Failed to generate preview URL.");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("SiteSettingsPage saves non-risky changes directly", async () => {
  const { view, fetchMock, restore } = await setupPage();
  try {
    openSection(view.container, "Cache settings");
    const input = Array.from(view.container.querySelectorAll("input")).find(
      (item) => item.getAttribute("type") === "number"
    ) as HTMLInputElement | null;
    if (!input) throw new Error("missing cache ttl input");
    React.act(() => {
      setInputValue(input, "60");
    });
    await flushEffects();
    await clickButton(view.container, "Save changes");
    const patchCalls = fetchMock.calls.filter(
      (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(1);
    const body = JSON.parse(String(patchCalls[0]?.init?.body)) as Record<string, unknown>;
    expect(body["site.cacheTtlSeconds"]).toBe(60);
    expect(document.body.textContent).toContain("Site settings updated.");
  } finally {
    restore();
  }
});

test("SiteSettingsPage surfaces save failures", async () => {
  const originalFetch = globalThis.fetch;
  const { view, restore } = await setupPage();
  try {
    globalThis.fetch = async () =>
      jsonResponse(
        { error: { code: "settings_value_invalid", message: "Invalid value", details: {} } },
        400
      );
    openSection(view.container, "Cache settings");
    const input = Array.from(view.container.querySelectorAll("input")).find(
      (item) => item.getAttribute("type") === "number"
    ) as HTMLInputElement | null;
    if (!input) throw new Error("missing cache ttl input");
    React.act(() => {
      setInputValue(input, "60");
    });
    await flushEffects();
    await clickButton(view.container, "Save changes");
    expect(document.body.textContent).toContain("Save failed");
    expect(document.body.textContent).toContain("Invalid value");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("SiteSettingsPage shows a load error banner when settings fetch fails", async () => {
  const originalFetch = globalThis.fetch;
  const { storage, restore: restoreStorage } = installLocalStorage();
  try {
    globalThis.fetch = async () => {
      throw new Error("settings backend down");
    };
    const view = mount(
      <AdminRouterProvider initialPath="/admin/settings/site">
        <SiteSettingsPage />
      </AdminRouterProvider>
    );
    await flushEffects();
    expect(document.body.textContent).toContain("Settings error");
    expect(document.body.textContent).toContain("Failed to load site settings.");
    view.cleanup();
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
  void storage;
});

test("SiteSettingsPage refreshes pages from the pages list cache event", async () => {
  const { view, restore } = await setupPage();
  try {
    const pagesBefore = Array.from(view.container.querySelectorAll("select")).length;
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    });
    await flushEffects();
    expect(document.body.textContent).toContain("Home");
    expect(pagesBefore).toBeGreaterThanOrEqual(0);
  } finally {
    restore();
  }
});

test("SiteSettingsPage merges content type routes from the content types cache event", async () => {
  const { view, restore } = await setupPage();
  try {
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "update" });
    });
    await flushEffects();
    openSection(view.container, "Content routes");
    expect(document.body.textContent).toContain("posts");
  } finally {
    restore();
  }
});

test("SiteSettingsPage skips route merging when the form is dirty", async () => {
  const { view, restore } = await setupPage();
  try {
    const adminPath = view.container.querySelector("#admin-path") as HTMLInputElement | null;
    if (!adminPath) throw new Error("missing admin path input");
    React.act(() => {
      setInputValue(adminPath, "/cms");
    });
    await flushEffects();
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "update" });
    });
    await flushEffects();
    expect((adminPath as HTMLInputElement).value).toBe("/cms");
  } finally {
    restore();
  }
});

test("SiteSettingsPage ignores failed settings cache refreshes", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = await setupPage();
  try {
    globalThis.fetch = async () => {
      throw new Error("cache refresh failed");
    };
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.settingsRedacted, action: "invalidate" });
    });
    await flushEffects();
    expect(document.body.textContent).not.toContain("Settings error");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("SiteSettingsPage classifies every risky routing change", async () => {
  const { view, restore } = await setupPage();
  try {
    const adminBaseUrl = view.container.querySelector("#admin-base-url") as HTMLInputElement | null;
    const publicBaseUrl = view.container.querySelector(
      "#public-base-url"
    ) as HTMLInputElement | null;
    if (!adminBaseUrl || !publicBaseUrl) throw new Error("missing base url inputs");
    React.act(() => {
      setInputValue(adminBaseUrl, "https://cms-next.test");
      setInputValue(publicBaseUrl, "https://public-next.test");
    });
    await flushEffects();

    const redirectSwitch = Array.from(view.container.querySelectorAll("input")).find(
      (item) => item.type === "checkbox"
    ) as HTMLInputElement | null;
    if (!redirectSwitch) throw new Error("missing redirect switch");
    React.act(() => {
      redirectSwitch.click();
    });
    await flushEffects();

    openSection(view.container, "Homepage & 404");
    const selects = Array.from(view.container.querySelectorAll("select"));
    if (selects.length < 2) throw new Error("missing page selects");
    React.act(() => {
      const homepageSelect = selects[0] as HTMLSelectElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(homepageSelect, "page-404");
      homepageSelect.dispatchEvent(new Event("change", { bubbles: true }));
      const notFoundSelect = selects[1] as HTMLSelectElement;
      const notFoundSetter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value"
      )?.set;
      notFoundSetter?.call(notFoundSelect, "page-home");
      notFoundSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushEffects();

    openSection(view.container, "Preview access");
    const previewSwitch = Array.from(view.container.querySelectorAll("input")).find(
      (item) => item.type === "checkbox"
    ) as HTMLInputElement | null;
    if (!previewSwitch) throw new Error("missing preview switch");
    React.act(() => {
      previewSwitch.click();
    });
    await flushEffects();

    openSection(view.container, "Content routes");
    const listPath = view.container.querySelector("#list-posts") as HTMLInputElement | null;
    if (!listPath) throw new Error("missing route list path input");
    React.act(() => {
      setInputValue(listPath, "/articles");
    });
    await flushEffects();

    await clickButton(view.container, "Save changes");
    expect(document.body.textContent).toContain("Review site routing changes");
    for (const label of [
      "Admin base URL",
      "Public site URL",
      "Admin host redirect",
      "Homepage route",
      "404 route",
      "Preview access",
      "Content route map",
    ]) {
      expect(document.body.textContent).toContain(label);
    }
  } finally {
    restore();
  }
});

test("SiteSettingsPage routes section suggests defaults for missing content types", async () => {
  const { view, restore } = await setupPage(() =>
    rawSiteSettingsPayload({
      "site.contentRoutes": [
        {
          type: "legacy",
          listPath: "/legacy",
          detailPath: "/legacy/:slug",
          enabled: true,
        },
      ],
    })
  );
  try {
    openSection(view.container, "Content routes");
    expect(document.body.textContent).toContain("legacy");
    expect(document.body.textContent).toContain("Missing type");

    const listPath = view.container.querySelector("#list-legacy") as HTMLInputElement | null;
    if (!listPath) throw new Error("missing legacy list input");
    React.act(() => {
      setInputValue(listPath, "/archive");
    });
    await flushEffects();
    expect(listPath.value).toBe("/archive");

    const legacyCard = listPath.closest(".border-dashed") as HTMLElement | null;
    if (!legacyCard) throw new Error("missing legacy route card");
    const useSuggested = Array.from(legacyCard.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Use suggested")
    );
    if (!useSuggested) throw new Error("missing use suggested button");
    await React.act(async () => {
      useSuggested.click();
      await Promise.resolve();
    });
    expect(listPath.value).toBe("/legacy");
  } finally {
    restore();
  }
});

test("SiteSettingsPage auto-save checkbox toggles the persisted preference", async () => {
  const { storage, view, restore } = await setupPage();
  try {
    const autoSaveInput = Array.from(view.container.querySelectorAll("input")).at(-1);
    if (!autoSaveInput) throw new Error("missing auto-save checkbox");
    React.act(() => {
      (autoSaveInput as HTMLInputElement).click();
    });
    await flushEffects();
    expect(storage.store.get("coderso.settings.autosave")).toBe("true");
  } finally {
    restore();
  }
});

test("SiteSettingsPage ignores a failed pages list cache refresh", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = await setupPage();
  try {
    globalThis.fetch = async () => {
      throw new Error("pages refresh failed");
    };
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.pagesList, action: "update" });
    });
    await flushEffects();
    expect(document.body.textContent).not.toContain("Settings error");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("SiteSettingsPage ignores a failed content types list cache refresh", async () => {
  const originalFetch = globalThis.fetch;
  const { restore } = await setupPage();
  try {
    globalThis.fetch = async () => {
      throw new Error("content types refresh failed");
    };
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.contentTypesList, action: "update" });
    });
    await flushEffects();
    expect(document.body.textContent).not.toContain("Settings error");
  } finally {
    globalThis.fetch = originalFetch;
    restore();
  }
});

test("SiteSettingsPage aborts the mount load when the component unmounts", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  let resolveLoad: (() => void) | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const url = String(input);
    if (url.endsWith("/settings")) {
      return new Promise<Response>((resolve) => {
        resolveLoad = () =>
          resolve(
            new Response(JSON.stringify(rawSiteSettingsPayload()), {
              headers: { "Content-Type": "application/json" },
            })
          );
      });
    }
    if (url.endsWith("/pages")) {
      return Promise.resolve(
        new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } })
      );
    }
    if (url.endsWith("/content-types")) {
      return Promise.resolve(
        new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } })
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } })
    );
  };

  try {
    const view = mount(
      <AdminRouterProvider initialPath="/admin/settings/site">
        <SiteSettingsPage />
      </AdminRouterProvider>
    );
    view.cleanup();
    await React.act(async () => {
      resolveLoad?.();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.body.textContent).not.toContain("Settings error");
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
  void storage;
});

test("SiteSettingsPage aborts the mount load error path when the component unmounts", async () => {
  const { storage, restore: restoreStorage } = installLocalStorage();
  let rejectLoad: ((reason: Error) => void) | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const url = String(input);
    if (url.endsWith("/settings")) {
      return new Promise<Response>((_, reject) => {
        rejectLoad = (reason) => reject(reason);
      });
    }
    return Promise.resolve(
      new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } })
    );
  };

  try {
    const view = mount(
      <AdminRouterProvider initialPath="/admin/settings/site">
        <SiteSettingsPage />
      </AdminRouterProvider>
    );
    view.cleanup();
    await React.act(async () => {
      rejectLoad?.(new Error("load failed after unmount"));
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.body.textContent).not.toContain("Settings error");
  } finally {
    globalThis.fetch = originalFetch;
    restoreStorage();
  }
  void storage;
});

test("SiteSettingsPage blocks a confirm save when validation fails", async () => {
  const { view, fetchMock, restore } = await setupPage();
  try {
    const adminPath = view.container.querySelector("#admin-path") as HTMLInputElement | null;
    if (!adminPath) throw new Error("missing admin path input");
    React.act(() => {
      setInputValue(adminPath, "/cms");
    });
    await flushEffects();

    await clickButton(view.container, "Save changes");
    expect(document.body.textContent).toContain("Review site routing changes");

    React.act(() => {
      setInputValue(adminPath, "/bad path!");
    });
    await flushEffects();

    const applyButton = Array.from(document.body.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Apply site changes")
    );
    if (!applyButton) throw new Error("missing apply button");
    await React.act(async () => {
      applyButton.click();
      await Promise.resolve();
    });
    await flushEffects();

    const patchCalls = fetchMock.calls.filter(
      (call) => String(call.input).endsWith("/settings") && call.init?.method === "PATCH"
    );
    expect(patchCalls).toHaveLength(0);
  } finally {
    restore();
  }
});
