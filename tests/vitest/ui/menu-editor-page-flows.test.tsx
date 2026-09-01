// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { MenuWithItems } from "../../../core/admin/services/menusClient";
import type { PageSummary } from "../../../core/admin/services/pagesClient";
import { ApiClientError } from "../../../core/admin/services/apiClient";
import { MenuEditorPage } from "../../../core/admin/ui/menus/MenuEditorPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type MenusClient = typeof import("../../../core/admin/services/menusClient");
type UpdateMenuInput = Parameters<MenusClient["updateMenu"]>[1];
type UpdateMenuResult = Awaited<ReturnType<MenusClient["updateMenu"]>>;
type ReplaceMenuItemsPayload = Parameters<MenusClient["replaceMenuItems"]>[1];
type ReplaceMenuItemsResult = Awaited<ReturnType<MenusClient["replaceMenuItems"]>>;

const apiState = vi.hoisted(() => {
  const detail: MenuWithItems = {
    menu: {
      id: "menu-1",
      name: "Main Navigation",
      location: "primary",
      status: "published",
      publishedAt: "2026-04-22T00:00:00.000Z",
      createdAt: "2026-04-22T00:00:00.000Z",
    },
    items: [
      {
        id: "home",
        label: "Home",
        href: "/",
        pageId: null,
        parentId: null,
        orderIndex: 0,
        children: [],
      },
      {
        id: "products",
        label: "Products",
        href: "/products",
        pageId: null,
        parentId: null,
        orderIndex: 1,
        children: [
          {
            id: "shirts",
            label: "Shirts",
            href: "/products/shirts",
            pageId: null,
            parentId: "products",
            orderIndex: 0,
            children: [
              {
                id: "tee",
                label: "Tee",
                href: "/products/shirts/tee",
                pageId: null,
                parentId: "shirts",
                orderIndex: 0,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };
  return {
    detail,
    cachedDetail: detail as MenuWithItems | null,
    cachedPages: [] as PageSummary[],
    loadResult: null as MenuWithItems | null | Error | "reject-plain" | "pending",
    listResult: "" as "" | "reject",
    updateCalls: [] as UpdateMenuInput[],
    replaceCalls: [] as Array<{ menuId: string; payload: ReplaceMenuItemsPayload }>,
  };
});

const cacheBusState = vi.hoisted(() => ({
  subscribers: [] as Array<(event: { key: string; action: string }) => void>,
}));

const navState = vi.hoisted(() => ({
  calls: [] as string[],
  path: "/admin/menus/menu-1",
}));

const toastState = vi.hoisted(() => ({
  successCalls: [] as string[],
  errorCalls: [] as string[],
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => {
      navState.calls.push(href);
    },
    path: navState.path,
  }),
  useOptionalAdminRouter: () => null,
  AdminRouterProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/services/menusClient", async () => {
  const actual = await vi.importActual<typeof import("../../../core/admin/services/menusClient")>(
    "../../../core/admin/services/menusClient"
  );
  return {
    ...actual,
    getCachedMenuDetail: () => apiState.cachedDetail,
    getMenuWithItemsCached: async () => {
      const result = apiState.loadResult;
      if (result === null || result === "reject-plain" || result === "pending") {
        if (result === "reject-plain") throw new Error("boom");
        if (result === "pending") return new Promise<MenuWithItems>(() => {});
        return null;
      }
      if (result instanceof Error) throw result;
      return result;
    },
    updateMenu: async (_menuId: string, input: UpdateMenuInput): Promise<UpdateMenuResult> => {
      apiState.updateCalls.push(input);
      const current = apiState.loadResult;
      if (
        (input.status === "draft" || input.status === "published") &&
        current !== null &&
        typeof current === "object" &&
        !(current instanceof Error) &&
        "menu" in current
      ) {
        const status: MenuWithItems["menu"]["status"] = input.status;
        const next: MenuWithItems = {
          ...current,
          menu: { ...current.menu, status },
        };
        apiState.loadResult = next;
        apiState.cachedDetail = next;
      }
      return apiState.cachedDetail?.menu ?? apiState.detail.menu;
    },
    replaceMenuItems: async (
      menuId: string,
      payload: ReplaceMenuItemsPayload
    ): Promise<ReplaceMenuItemsResult> => {
      apiState.replaceCalls.push({ menuId, payload });
      return { ok: true };
    },
  };
});

vi.mock("@/services/pagesClient", async () => {
  const actual = await vi.importActual<typeof import("../../../core/admin/services/pagesClient")>(
    "../../../core/admin/services/pagesClient"
  );
  return {
    ...actual,
    getCachedPages: () => apiState.cachedPages,
    listPagesCached: async () => {
      if (apiState.listResult === "reject") throw new Error("pages boom");
      return apiState.cachedPages;
    },
  };
});

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string; action: string }) => void) => {
    cacheBusState.subscribers.push(handler);
    return () => {
      cacheBusState.subscribers = cacheBusState.subscribers.filter((entry) => entry !== handler);
    };
  },
  broadcastCacheEvent: vi.fn(),
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

vi.mock("@/components/ui/select", () => {
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) {
          return flattenText((child.props as { children?: React.ReactNode }).children);
        }
        return "";
      })
      .join("")
      .trim();
  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      const props = child.props as { value?: string; children?: React.ReactNode };
      if (typeof props.value === "string") {
        return [{ value: props.value, label: flattenText(props.children) }];
      }
      return collectOptions(props.children);
    });
  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children }: { children: React.ReactNode; value: string }) => <>{children}</>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => {
      toastState.successCalls.push(message);
    },
    error: (message: string) => {
      toastState.errorCalls.push(message);
    },
  },
}));

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<MenuEditorPage />);
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

const flush = async () => {
  await React.act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
};

const clickButton = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(label)
  );
  expect(button, `button "${label}"`).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickAsync = async (container: HTMLElement, label: string) => {
  clickButton(container, label);
  await flush();
};

const setInputValue = (input: HTMLInputElement | null | undefined, value: string) => {
  expect(input).not.toBeNull();
  React.act(() => {
    if (!input) return;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const inputByPlaceholder = (container: ParentNode, placeholder: string) =>
  Array.from(container.querySelectorAll<HTMLInputElement>("input")).find(
    (input) => input.placeholder === placeholder
  ) ?? null;

const emitCacheEvent = (key: string) => {
  for (const handler of cacheBusState.subscribers) {
    React.act(() => handler({ key, action: "set" }));
  }
};

const treeRowLabels = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-menu-row-id]")).map((row) =>
    row.getAttribute("data-menu-row-id")
  );

const selectTreeItem = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (node) => node.getAttribute("aria-label") === `Open menu item details for ${label}`
  );
  expect(button, `row button "${label}"`).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const selectAsync = async (container: HTMLElement, label: string) => {
  selectTreeItem(container, label);
  await flush();
};

const setSmallScreen = () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(min-width: 1280px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
};

const parentSelectOf = (container: ParentNode) =>
  Array.from(container.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
    Array.from(select.querySelectorAll("option")).some(
      (option) => option.textContent === "No Parent (Top Level)"
    )
  ) ?? null;

const withoutCrypto = () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
  return () => {
    if (original) Object.defineProperty(globalThis, "crypto", original);
    else delete (globalThis as Record<string, unknown>).crypto;
  };
};

beforeEach(() => {
  apiState.cachedDetail = apiState.detail;
  apiState.cachedPages = [];
  apiState.loadResult = apiState.detail;
  apiState.listResult = "";
  apiState.updateCalls = [];
  apiState.replaceCalls = [];
  cacheBusState.subscribers = [];
  navState.calls = [];
  navState.path = "/admin/menus/menu-1";
  toastState.successCalls = [];
  toastState.errorCalls = [];
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 1280px)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("the dashed add affordance inserts a custom link and counts it", async () => {
  const restore = withoutCrypto();
  const view = mount();
  try {
    await flush();
    expect(view.container.textContent).toContain("4 items");
    await clickAsync(view.container, "Add menu item");
    expect(treeRowLabels(view.container)).toHaveLength(5);
    expect(view.container.textContent).toContain("Custom link");
    expect(view.container.textContent).toContain("5 items");
  } finally {
    restore();
    view.cleanup();
  }
});

test("the add rail inserts a Button item", async () => {
  const view = mount();
  try {
    await flush();
    await clickAsync(view.container, "Button");
    expect(view.container.textContent).toContain("5 items");
    expect(view.container.textContent).toContain("Button");
  } finally {
    view.cleanup();
  }
});

test("editing a custom link label and URL persists the href payload on save", async () => {
  const view = mount();
  try {
    await flush();
    await clickAsync(view.container, "Add menu item");

    const labelInput = inputByPlaceholder(view.container, "Menu label");
    setInputValue(labelInput, "Contact");
    const urlInput = inputByPlaceholder(view.container, "https://");
    setInputValue(urlInput, "/contact");

    await clickAsync(view.container, "Save changes");
    expect(apiState.replaceCalls.length).toBe(1);
    const payload = apiState.replaceCalls[0].payload as Array<{
      id: string;
      href: string;
      label: string;
    }>;
    const added = payload.find((item) => item.label === "Contact");
    expect(added?.href).toBe("/contact");
    expect(toastState.successCalls).toContain("Menu saved.");
  } finally {
    view.cleanup();
  }
});

test("an invalid item blocks save with a validation error", async () => {
  const view = mount();
  try {
    await flush();
    await clickAsync(view.container, "Add menu item");
    // Custom link starts with an empty URL -> fails the page-or-URL contract.
    await clickAsync(view.container, "Save changes");
    expect(view.container.textContent).toContain(
      "Each menu item must link to a page or a custom URL."
    );
    expect(apiState.replaceCalls.length).toBe(0);
  } finally {
    view.cleanup();
  }
});

test("an API load failure surfaces the API message", async () => {
  apiState.loadResult = new ApiClientError("menus_load_failed", "Layout service is down.", 503);
  const view = mount();
  try {
    await flush();
    expect(view.container.textContent).toContain("Layout service is down.");
  } finally {
    view.cleanup();
  }
});

test("a plain load failure falls back to the generic message", async () => {
  apiState.loadResult = "reject-plain";
  const view = mount();
  try {
    await flush();
    expect(view.container.textContent).toContain("Failed to load menu.");
  } finally {
    view.cleanup();
  }
});

test("a missing menu shows the back action and returns to the menu list", async () => {
  apiState.loadResult = null;
  const view = mount();
  try {
    await flush();
    expect(view.container.textContent).toContain("Menu not found.");
    await clickAsync(view.container, "Back to menus");
    expect(navState.calls).toContain("/menus");
  } finally {
    view.cleanup();
  }
});

test("a cache event while unsaved marks the remote update pending", async () => {
  const view = mount();
  try {
    await flush();
    await clickAsync(view.container, "Add menu item");
    emitCacheEvent("menus:detail:menu-1");
    await flush();
    expect(view.container.textContent).toContain("Updated in another tab");
    // Refresh loads the latest version despite the local draft.
    await clickAsync(view.container, "Refresh");
    await flush();
    expect(view.container.textContent).not.toContain("Updated in another tab");
  } finally {
    view.cleanup();
  }
});

test("a menu-detail cache event reloads the menu through the subscription", async () => {
  const view = mount();
  try {
    await flush();
    emitCacheEvent("menus:detail:menu-1");
    await flush();
    expect(view.container.textContent).toContain("Main Navigation");
  } finally {
    view.cleanup();
  }
});

test("a pages-list cache event refreshes the cached page list", async () => {
  apiState.cachedPages = [
    {
      id: "page-about",
      title: "About",
      slug: "/about",
      status: "published",
      updatedAt: "2026-04-22T00:00:00.000Z",
      author: null,
    },
  ];
  const view = mount();
  try {
    await flush();
    emitCacheEvent("pages:list");
    await flush();
    // The Pages rail becomes enabled once the list has entries.
    const pagesRail = Array.from(view.container.querySelectorAll("button")).find((node) =>
      node.textContent?.includes("Pages")
    );
    expect(pagesRail?.hasAttribute("disabled")).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("selecting a tree row opens the inline inspector", async () => {
  const view = mount();
  try {
    await flush();
    await selectAsync(view.container, "Home");
    expect(view.container.textContent).toContain("Item settings");
    expect(inputByPlaceholder(view.container, "Menu label")?.value).toBe("Home");
  } finally {
    view.cleanup();
  }
});

test("renaming an item propagates to the tree and marks dirty", async () => {
  const view = mount();
  try {
    await flush();
    await selectAsync(view.container, "Home");
    setInputValue(inputByPlaceholder(view.container, "Menu label"), "Start");
    await flush();
    const homeRowAfter = view.container.querySelector('[data-menu-row-id="home"]');
    expect(homeRowAfter?.textContent).toContain("Start");
    expect(view.container.textContent).toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});

test("reparenting an item via the inspector reindexes its order", async () => {
  const view = mount();
  try {
    await flush();
    await selectAsync(view.container, "Home");
    await clickAsync(view.container, "Advanced");
    const parentSelect = parentSelectOf(view.container);
    expect(parentSelect).not.toBeNull();
    React.act(() => {
      if (!parentSelect) return;
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
      setter?.call(parentSelect, "products");
      parentSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();
    await clickAsync(view.container, "Save changes");
    const payload = apiState.replaceCalls[0].payload as Array<{
      id: string;
      parentId: string | null;
      orderIndex: number;
    }>;
    expect(payload.find((item) => item.id === "home")?.parentId).toBe("products");
    expect(payload.find((item) => item.id === "home")?.orderIndex).toBe(1);
  } finally {
    view.cleanup();
  }
});

test("deleting a nested item removes its descendants from the draft", async () => {
  const view = mount();
  try {
    await flush();
    await selectAsync(view.container, "Products");
    await clickAsync(view.container, "Remove item");
    expect(document.body.textContent).toContain("Delete item");
    await clickAsync(document.body, "Delete item");
    await flush();
    expect(treeRowLabels(view.container)).toEqual(["home"]);
    expect(view.container.textContent).toContain("1 item");
  } finally {
    view.cleanup();
  }
});

test("cancelling the delete dialog clears the pending deletion", async () => {
  const view = mount();
  try {
    await flush();
    await selectAsync(view.container, "Home");
    await clickAsync(view.container, "Remove item");
    await clickAsync(document.body, "Cancel");
    expect(document.body.textContent).not.toContain("Delete item");
    // The draft is untouched.
    expect(treeRowLabels(view.container)).toEqual(["home", "products", "shirts", "tee"]);
  } finally {
    view.cleanup();
  }
});

test("keyboard reorder marks the draft dirty and persists the order", async () => {
  const view = mount();
  try {
    await flush();
    const moveDown = Array.from(view.container.querySelectorAll("button")).find(
      (node) => node.getAttribute("aria-label") === "Move down Home"
    );
    expect(moveDown).not.toBeNull();
    React.act(() => {
      moveDown?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(view.container.textContent).toContain("Unsaved changes");
    await clickAsync(view.container, "Save changes");
    const payload = apiState.replaceCalls[0].payload as Array<{ id: string; orderIndex: number }>;
    expect(payload.find((item) => item.id === "home")?.orderIndex).toBe(1);
    expect(payload.find((item) => item.id === "products")?.orderIndex).toBe(0);
  } finally {
    view.cleanup();
  }
});

test("discard restores the original items and clears dirty state", async () => {
  const view = mount();
  try {
    await flush();
    await clickAsync(view.container, "Add menu item");
    expect(view.container.textContent).toContain("5 items");
    await clickAsync(view.container, "Discard");
    expect(view.container.textContent).toContain("4 items");
    expect(view.container.textContent).not.toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});

test("changing the theme location persists a metadata patch", async () => {
  const view = mount();
  try {
    await flush();
    const locationInput = Array.from(
      view.container.querySelectorAll<HTMLInputElement>("input")
    ).find((input) => input.value === "primary");
    setInputValue(locationInput, "footer");
    await clickAsync(view.container, "Save changes");
    expect(apiState.updateCalls).toContainEqual({ location: "footer" });
    expect(apiState.replaceCalls.length).toBe(0);
  } finally {
    view.cleanup();
  }
});

test("the Design button navigates to the menu design route", async () => {
  const view = mount();
  try {
    await flush();
    await clickAsync(view.container, "Design");
    expect(navState.calls).toContain("/menus/menu-1/design");
  } finally {
    view.cleanup();
  }
});

test("publishing and moving to draft persist the status transition", async () => {
  const draft = {
    ...apiState.detail,
    menu: { ...apiState.detail.menu, status: "draft" as const, publishedAt: null },
  };
  apiState.cachedDetail = draft;
  apiState.loadResult = draft;
  const view = mount();
  try {
    await flush();
    await clickAsync(view.container, "Add menu item");
    setInputValue(inputByPlaceholder(view.container, "Menu label"), "Contact");
    setInputValue(inputByPlaceholder(view.container, "https://"), "/contact");
    await clickAsync(view.container, "Publish");
    expect(apiState.updateCalls).toContainEqual({ status: "published" });
    expect(toastState.successCalls).toContain("Menu published.");

    await clickAsync(view.container, "Move to Draft");
    expect(apiState.updateCalls).toContainEqual({ status: "draft" });
    expect(toastState.successCalls).toContain("Menu moved to draft.");
  } finally {
    view.cleanup();
  }
});

test("small screens open the details sheet on select and via the Details button", async () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(min-width: 1280px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  const view = mount();
  try {
    await flush();
    await selectAsync(view.container, "Home");
    // The Sheet mirror of the inspector opens automatically on small screens.
    expect(document.body.textContent).toContain("Item settings");

    await clickAsync(view.container, "Details");
    expect(document.body.textContent).toContain("Item settings");
  } finally {
    view.cleanup();
  }
});

test("a validation error on small screens reopens the details sheet", async () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(min-width: 1280px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  const view = mount();
  try {
    await flush();
    await clickAsync(view.container, "Add menu item");
    // The invalid custom-link item is active; saving fails validation and
    // reopens the sheet on small screens.
    await clickAsync(view.container, "Save changes");
    expect(view.container.textContent).toContain(
      "Each menu item must link to a page or a custom URL."
    );
    expect(document.body.textContent).toContain("Item settings");
  } finally {
    view.cleanup();
  }
});

test("a cache-event reload that resolves null clears the menu and tree", async () => {
  const view = mount();
  try {
    await flush();
    expect(treeRowLabels(view.container)).toHaveLength(4);
    apiState.loadResult = null;
    emitCacheEvent("menus:detail:menu-1");
    await flush();
    expect(view.container.textContent).toContain("Menu not found.");
    expect(treeRowLabels(view.container)).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("a cache-event reload that fails with an API message surfaces it", async () => {
  const view = mount();
  try {
    await flush();
    apiState.loadResult = new ApiClientError("menus_load_failed", "Layout service is down.", 503);
    emitCacheEvent("menus:detail:menu-1");
    await flush();
    expect(view.container.textContent).toContain("Layout service is down.");
    expect(treeRowLabels(view.container)).toHaveLength(4);
  } finally {
    view.cleanup();
  }
});

test("a cache-event reload that fails generically falls back to the generic message", async () => {
  const view = mount();
  try {
    await flush();
    apiState.loadResult = "reject-plain";
    emitCacheEvent("menus:detail:menu-1");
    await flush();
    expect(view.container.textContent).toContain("Failed to load menu items.");
  } finally {
    view.cleanup();
  }
});

test("a pages-list refresh that fails is swallowed without crashing", async () => {
  const view = mount();
  try {
    await flush();
    apiState.listResult = "reject";
    emitCacheEvent("pages:list");
    await flush();
    expect(view.container.textContent).toContain("Main Navigation");
    expect(treeRowLabels(view.container)).toHaveLength(4);
  } finally {
    view.cleanup();
  }
});

test("pressing Enter on a tree row opens the inline inspector", async () => {
  const view = mount();
  try {
    await flush();
    const rowButton = Array.from(view.container.querySelectorAll("button")).find(
      (node) => node.getAttribute("aria-label") === "Open menu item details for Home"
    );
    expect(rowButton).not.toBeNull();
    React.act(() => {
      rowButton?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await flush();
    expect(view.container.textContent).toContain("Item settings");
    expect(inputByPlaceholder(view.container, "Menu label")?.value).toBe("Home");
  } finally {
    view.cleanup();
  }
});

test("small screens open the details sheet from the row pencil button", async () => {
  setSmallScreen();
  const view = mount();
  try {
    await flush();
    const pencil = Array.from(view.container.querySelectorAll("button")).find(
      (node) => node.getAttribute("aria-label") === "Open details for Home"
    );
    expect(pencil).not.toBeNull();
    React.act(() => {
      pencil?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(document.body.textContent).toContain("Item settings");
  } finally {
    view.cleanup();
  }
});

test("the row trash button opens the delete dialog directly", async () => {
  const view = mount();
  try {
    await flush();
    const trash = Array.from(view.container.querySelectorAll("button")).find(
      (node) => node.getAttribute("aria-label") === "Delete Home"
    );
    expect(trash).not.toBeNull();
    React.act(() => {
      trash?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(document.body.textContent).toContain("Delete item");
  } finally {
    view.cleanup();
  }
});

test("the details sheet closes through its close button", async () => {
  setSmallScreen();
  const view = mount();
  try {
    await flush();
    await selectAsync(view.container, "Home");
    // The inspector renders inline AND inside the sheet on small screens, so
    // verify the Radix sheet itself: open content before, unmounted after.
    expect(
      document.body.querySelector('[data-slot="sheet-content"]')?.getAttribute("data-state")
    ).toBe("open");
    const closeButton = document.body.querySelector<HTMLElement>('[data-slot="sheet-close"]');
    expect(closeButton).not.toBeNull();
    React.act(() => {
      closeButton?.click();
    });
    await flush();
    expect(document.body.querySelector('[data-slot="sheet-content"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("toggling open-in-new-tab propagates settings and persists on save", async () => {
  const view = mount();
  try {
    await flush();
    await selectAsync(view.container, "Home");
    const toggle = view.container.querySelector('[data-slot="switch"]');
    expect(toggle).not.toBeNull();
    React.act(() => {
      toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(view.container.textContent).toContain("Unsaved changes");
    await clickAsync(view.container, "Save changes");
    const payload = apiState.replaceCalls[0].payload as Array<{
      id: string;
      settings: { openInNewTab?: boolean };
    }>;
    expect(payload.find((entry) => entry.id === "home")?.settings.openInNewTab).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("an in-flight reload after a failed load shows the choose-a-menu back action", async () => {
  apiState.cachedDetail = null;
  apiState.loadResult = "reject-plain";
  const view = mount();
  try {
    await flush();
    expect(view.container.textContent).toContain("Failed to load menu.");
    apiState.loadResult = "pending";
    emitCacheEvent("menus:detail:menu-1");
    await flush();
    expect(view.container.textContent).toContain(
      "Choose a menu from the Menus list before editing its structure."
    );
    // The last "Back to menus" button belongs to the choose-a-menu block.
    const backButtons = Array.from(view.container.querySelectorAll("button")).filter((node) =>
      node.textContent?.trim().includes("Back to menus")
    );
    React.act(() => {
      backButtons.at(-1)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(navState.calls).toContain("/menus");
  } finally {
    view.cleanup();
  }
});
