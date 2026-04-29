// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { MenuWithItems } from "../../../core/admin/services/menusClient";
import type { PageSummary } from "../../../core/admin/services/pagesClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { MenuEditorPage } from "../../../core/admin/ui/menus/MenuEditorPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const menuDetail: MenuWithItems = {
  menu: {
    id: "menu-1",
    name: "Main Navigation",
    location: "primary",
    status: "published",
    publishedAt: "2026-04-22T00:00:00.000Z",
    createdAt: "2026-04-22T00:00:00.000Z",
  },
  items: [],
};

const menuEditorCacheState = vi.hoisted(() => ({
  cachedMenuDetail: null as MenuWithItems | null,
  cachedPages: null as PageSummary[] | null,
}));

const updateMenuMock = vi.fn();
const replaceMenuItemsMock = vi.fn();
const getMenuWithItemsCachedMock = vi.fn();
const listPagesCachedMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/services/menusClient", async () => {
  const actual = await vi.importActual<typeof import("../../../core/admin/services/menusClient")>(
    "../../../core/admin/services/menusClient"
  );
  return {
    ...actual,
    getCachedMenuDetail: () => menuEditorCacheState.cachedMenuDetail,
    getMenuWithItemsCached: (...args: unknown[]) => getMenuWithItemsCachedMock(...args),
    replaceMenuItems: (...args: unknown[]) => replaceMenuItemsMock(...args),
    updateMenu: (...args: unknown[]) => updateMenuMock(...args),
  };
});

vi.mock("@/services/pagesClient", async () => {
  const actual = await vi.importActual<typeof import("../../../core/admin/services/pagesClient")>(
    "../../../core/admin/services/pagesClient"
  );
  return {
    ...actual,
    getCachedPages: () => menuEditorCacheState.cachedPages,
    listPagesCached: (...args: unknown[]) => listPagesCachedMock(...args),
  };
});

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

vi.mock("@/utils/cacheRefresh", () => ({
  resolveCacheRefreshBackground: ({
    explicitBackground,
    hasHydrated,
  }: {
    explicitBackground?: boolean;
    hasHydrated: boolean;
  }) => explicitBackground ?? hasHydrated,
}));

vi.mock("@/ui/menus/MenuTree", () => ({
  MenuTree: () => <div>Menu tree</div>,
}));

vi.mock("@/ui/menus/MenuItemDrawer", () => ({
  MenuItemDrawer: () => <div>Menu item drawer</div>,
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const mount = (path = "/admin/menus/menu-1") => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <MenuEditorPage />
      </AdminRouterProvider>
    );
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

beforeEach(() => {
  menuEditorCacheState.cachedMenuDetail = menuDetail;
  menuEditorCacheState.cachedPages = [];
  getMenuWithItemsCachedMock.mockReset();
  listPagesCachedMock.mockReset();
  updateMenuMock.mockReset();
  replaceMenuItemsMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();

  getMenuWithItemsCachedMock.mockResolvedValue(menuDetail);
  listPagesCachedMock.mockResolvedValue([]);
  updateMenuMock.mockResolvedValue(menuDetail.menu);
  replaceMenuItemsMock.mockResolvedValue({ ok: true });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: true,
      media: "(min-width: 1024px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

test("MenuEditorPage renders editor-side location guidance", async () => {
  const view = mount();

  try {
    await flush();
    expect(view.container.textContent).toContain("Theme slot identifier such as");
    expect(view.container.textContent).toContain("Back to menus");
  } finally {
    view.cleanup();
  }
});

test("MenuEditorPage clears foreground loading when pages cache exists without menu detail cache", async () => {
  const newMenuDetail: MenuWithItems = {
    menu: {
      ...menuDetail.menu,
      id: "menu-new",
      name: "test2",
      location: null,
      status: "draft",
      publishedAt: null,
    },
    items: [],
  };
  menuEditorCacheState.cachedMenuDetail = null;
  menuEditorCacheState.cachedPages = [];
  getMenuWithItemsCachedMock.mockResolvedValueOnce(newMenuDetail);

  const view = mount("/admin/menus/menu-new");

  try {
    expect(view.container.textContent).toContain("Loading menu settings");

    await flush();
    await flush();

    expect(getMenuWithItemsCachedMock).toHaveBeenCalledWith("menu-new", {
      force: false,
    });
    expect(view.container.textContent).toContain("test2");
    expect(view.container.textContent).toContain("Location");
    expect(view.container.textContent).toContain("Menu Structure");
    expect(view.container.textContent).toContain("No items yet. Add your first link.");
    expect(view.container.textContent).not.toContain("Loading menu settings");
  } finally {
    view.cleanup();
  }
});

test("MenuEditorPage shows success feedback after saving metadata", async () => {
  const view = mount();

  try {
    await flush();
    const nameInput = view.container.querySelector('input[placeholder="Main Menu"]');

    await act(async () => {
      setInputValue(nameInput, "Primary Nav");
    });

    await act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Save changes"))
        ?.click();
      await Promise.resolve();
    });

    expect(updateMenuMock).toHaveBeenCalledWith("menu-1", {
      name: "Primary Nav",
      location: "primary",
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Menu saved.");
  } finally {
    view.cleanup();
  }
});

test("MenuEditorPage shows failure feedback when save fails", async () => {
  updateMenuMock.mockRejectedValueOnce(new Error("boom"));
  const view = mount();

  try {
    await flush();
    const nameInput = view.container.querySelector('input[placeholder="Main Menu"]');

    await act(async () => {
      setInputValue(nameInput, "Broken Nav");
    });

    await act(async () => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Save changes"))
        ?.click();
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Failed to save menu changes.");
    expect(toastErrorMock).toHaveBeenCalledWith("Failed to save menu changes.");
  } finally {
    view.cleanup();
  }
});
