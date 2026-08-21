// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { MenuItemNode } from "@/services/menusClient";

/**
 * MenuDesignEditor revalidation contract (TASK-542-03-L03):
 *
 * - the synchronous menu-detail cache paints the initial document, and the
 *   editor ALWAYS force-revalidates (`{ force: true }`) in the background;
 * - a remote authoritative payload hydrates a CLEAN editor live but NEVER
 *   clobbers a dirty local draft (a remote-update notice is shown instead);
 * - Keep editing preserves the draft; Reload discards it and applies the
 *   authoritative payload;
 * - the cache event broadcast by OUR OWN save/publish is skipped (no
 *   redundant force loop);
 * - a background failure shows a retryable message without clearing the
 *   cache/draft;
 * - the canvas binds the SHARED public projection (hidden subtrees and dead
 *   leaves are dropped);
 * - a dirty editor blocks Structure/navigation until cancel/confirm.
 */

type MenuSettings = Record<string, unknown> | null;

const menusClientState = vi.hoisted(() => {
  const buildMenu = (settings: MenuSettings) => ({
    id: "menu-1",
    name: "Main menu",
    location: "primary",
    status: "draft" as const,
    publishedAt: null,
    createdAt: "2026-06-12T09:00:00.000Z",
    settings,
  });
  const defaultItems = (): MenuItemNode[] => [
    {
      id: "item-home",
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [],
    },
  ];
  const state = {
    cachedSettings: null as MenuSettings,
    forcedSettings: null as MenuSettings,
    items: defaultItems(),
    updateCalls: [] as Array<Record<string, unknown>>,
    publishCalls: [] as string[],
    forceCalls: [] as Array<{ id: string; force: boolean }>,
    getCachedMenuDetail: vi.fn((_id: string) =>
      state.cachedSettings === null
        ? null
        : { menu: buildMenu(state.cachedSettings), items: state.items }
    ),
    getMenuWithItemsCached: vi.fn(async (id: string, options?: { force?: boolean }) => {
      state.forceCalls.push({ id, force: Boolean(options?.force) });
      return { menu: buildMenu(state.forcedSettings), items: state.items };
    }),
    updateMenu: vi.fn(async (_menuId: string, input: Record<string, unknown>) => {
      state.updateCalls.push(input);
      return buildMenu(state.forcedSettings);
    }),
    publishMenu: vi.fn(async (menuId: string) => {
      state.publishCalls.push(menuId);
      return buildMenu(state.forcedSettings);
    }),
    reset() {
      state.cachedSettings = null;
      state.forcedSettings = null;
      state.items = defaultItems();
      state.updateCalls = [];
      state.publishCalls = [];
      state.forceCalls = [];
      state.getCachedMenuDetail.mockClear();
      state.getMenuWithItemsCached.mockClear();
      state.updateMenu.mockClear();
      state.publishMenu.mockClear();
    },
  };
  return state;
});

const cacheBusState = vi.hoisted(() => ({
  handler: null as null | ((event: { key: string; action: string }, origin?: string) => void),
  reset() {
    cacheBusState.handler = null;
  },
}));

const routerState = vi.hoisted(() => ({
  blockers: new Set<(href: string) => boolean>(),
  calls: [] as string[],
  navigate(path: string, options?: { skipBlockers?: boolean }) {
    if (!options?.skipBlockers) {
      for (const blocker of routerState.blockers) {
        if (!blocker(path)) return;
      }
    }
    routerState.calls.push(path);
  },
  registerBlocker(blocker: (href: string) => boolean) {
    routerState.blockers.add(blocker);
    return () => {
      routerState.blockers.delete(blocker);
    };
  },
  reset() {
    routerState.blockers.clear();
    routerState.calls = [];
  },
}));

const navigateState = vi.hoisted(() => ({
  calls: [] as string[],
  reset() {
    navigateState.calls = [];
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => (
    <div data-remote-notice="true">{children}</div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    title,
    "aria-label": ariaLabel,
    className,
    ...rest
  }: Record<string, unknown> & {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
    className?: string;
  }) => {
    const dataProps = Object.fromEntries(
      Object.entries(rest).filter(([key]) => key.startsWith("data-"))
    );
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel as string | undefined}
        className={className}
        {...dataProps}
      >
        {children}
      </button>
    );
  },
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    onConfirm?: () => void;
    onOpenChange?: (open: boolean) => void;
  }) =>
    open ? (
      <div role="dialog" data-dirty-dialog="true">
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Cancel
        </button>
        <button type="button" data-confirm-discard="true" onClick={onConfirm}>
          Discard
        </button>
      </div>
    ) : null,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
  isSessionExpiredApiError: () => false,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    pageDetail: (id: string) => `pages:detail:${id}`,
    menuDetail: (id: string) => `menus:detail:${id}`,
    pagesList: "pages:list",
    settingsRedacted: "settings:redacted",
  },
  cacheTtlMs: { list: 300_000, detail: 300_000 },
}));

vi.mock("@/services/menusClient", () => ({
  getCachedMenuDetail: menusClientState.getCachedMenuDetail,
  getMenuWithItemsCached: menusClientState.getMenuWithItemsCached,
  publishMenu: menusClientState.publishMenu,
  updateMenu: menusClientState.updateMenu,
}));

vi.mock("@/services/pagesClient", () => ({
  listPagesCached: vi.fn(async () => [
    {
      id: "page-about",
      title: "About",
      slug: "/about",
      status: "published",
      updatedAt: "2026-06-12T09:00:00.000Z",
    },
  ]),
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    breadcrumbs,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <main>{children}</main>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn((handler: unknown) => {
    cacheBusState.handler = handler as typeof cacheBusState.handler;
    return () => {
      cacheBusState.handler = null;
    };
  }),
  broadcastCacheEvent: vi.fn(),
}));

vi.mock("@/services/mediaClient", () => ({
  getCachedMedia: () => [],
  listMediaCached: async () => [],
}));

vi.mock("@/services/settingsClient", () => ({
  getCachedSettings: () => null,
  getSettingsCached: async () => ({}),
}));

vi.mock("@/ui/contexts/AdminBasePathContext", () => ({
  useAdminBasePath: () => "/admin",
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: routerState.navigate,
    path: "/admin/menus/menu-1/design",
  }),
  useOptionalAdminRouter: () => ({
    navigate: routerState.navigate,
    path: "/admin/menus/menu-1/design",
    registerBlocker: routerState.registerBlocker,
  }),
}));

import {
  createDefaultMenuDocumentV2,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";
import { MenuDesignEditorPage } from "../../../core/admin/ui/menus/MenuDesignEditorPage";

// A stored menu document restricted to the DEFAULT cta-button block. Built from
// the default document so it round-trips the fail-closed stored-read resolver
// (a hand-authored leaf without style/visibility would degrade the whole doc).
const menuDocumentWithOnlyCta = (): MenuDocumentV2 => {
  const doc = createDefaultMenuDocumentV2();
  const bar = doc.sections[0];
  const cta = bar.blocks.find((block) => block.type === "cta-button") ?? bar.blocks[0];
  return {
    schemaVersion: doc.schemaVersion,
    sections: [{ ...bar, blocks: [cta] }],
  };
};

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

const flush = async () => {
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const emitCacheEvent = (key: string) => {
  React.act(() => {
    cacheBusState.handler?.({ key, action: "update" }, "remote");
  });
};

const getBlockRowLabels = (container: ParentNode) =>
  Array.from(container.querySelectorAll("[data-menu-block-row]")).map((row) =>
    Array.from(row.querySelectorAll("button"))
      .find((button) => !button.getAttribute("aria-label"))
      ?.textContent?.trim()
  );

const selectBlockRow = (container: ParentNode, label: string) => {
  const row = Array.from(container.querySelectorAll("[data-menu-block-row]")).find((node) =>
    Array.from(node.querySelectorAll("button")).some(
      (button) => !button.getAttribute("aria-label") && button.textContent?.trim() === label
    )
  );
  expect(row, `block row "${label}"`).toBeTruthy();
  const selectButton = Array.from(row!.querySelectorAll("button")).find(
    (button) => !button.getAttribute("aria-label")
  );
  React.act(() => {
    selectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setSliderValue = (container: ParentNode, label: string, value: string) => {
  const slider = container.querySelector(
    `input[type="range"][data-page-editor-slider="${label}"]`
  ) as HTMLInputElement | null;
  expect(slider, `slider "${label}"`).toBeTruthy();
  React.act(() => {
    if (!slider) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(slider, value);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButton = (container: ParentNode, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(text)
  );
  expect(button, `button "${text}"`).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const makeDirty = (container: ParentNode) => {
  selectBlockRow(container, "Navigation items");
  setSliderValue(container, "Item gap", "12");
  expect(container.textContent).toContain("Unsaved");
};

beforeEach(() => {
  menusClientState.reset();
  cacheBusState.reset();
  routerState.reset();
  navigateState.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("mount ALWAYS force-revalidates the authoritative payload (never TTL-pinned)", async () => {
  menusClientState.forcedSettings = {
    document: createDefaultMenuDocumentV2(),
  };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // The background revalidation requested the authoritative payload with force.
  expect(menusClientState.getMenuWithItemsCached).toHaveBeenCalledWith("menu-1", { force: true });
  expect(menusClientState.forceCalls.some((call) => call.force)).toBe(true);

  cleanup();
});

test("a stale warm-cache snapshot is replaced by the forced fetch when clean", async () => {
  // Warm cache paints a LEGACY appearance-only menu ([Navigation items]).
  menusClientState.cachedSettings = { appearance: { itemGap: 12 } };
  // The authoritative fetch carries a stored document (brand + nav + cta).
  menusClientState.forcedSettings = { document: createDefaultMenuDocumentV2() };

  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // The forced authoritative document replaced the stale warm-cache seed.
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items", "Button"]);
  expect(menusClientState.updateMenu).not.toHaveBeenCalled();

  cleanup();
});

test("a remote update while CLEAN hydrates live and shows no notice", async () => {
  menusClientState.forcedSettings = { document: createDefaultMenuDocumentV2() };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  expect(container.querySelector('[data-remote-notice="true"]')).toBeNull();

  // A fresh authoritative payload arrives from another surface.
  menusClientState.forcedSettings = { document: menuDocumentWithOnlyCta() };
  emitCacheEvent("menus:detail:menu-1");
  await flush();

  expect(getBlockRowLabels(container)).toEqual(["Button"]);
  expect(container.querySelector('[data-remote-notice="true"]')).toBeNull();

  cleanup();
});

test("a remote update while DIRTY never clobbers the draft; the notice appears", async () => {
  menusClientState.forcedSettings = { document: createDefaultMenuDocumentV2() };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  makeDirty(container);

  // A remote change arrives while the author has unsaved edits.
  menusClientState.forcedSettings = { document: menuDocumentWithOnlyCta() };
  emitCacheEvent("menus:detail:menu-1");
  await flush();

  // The local draft (Item gap 12 on the selected nav panel) is untouched and
  // the notice shows. The per-block panel replaces the block list while a block
  // is selected, so the draft is asserted through the panel's slider value.
  expect(container.querySelector('[data-remote-notice="true"]')).toBeTruthy();
  expect(container.textContent).toContain("Unsaved");
  expect(
    (container.querySelector('[data-page-editor-slider="Item gap"]') as HTMLInputElement | null)
      ?.value
  ).toBe("12");

  cleanup();
});

test("Keep editing preserves the draft and dismisses the notice", async () => {
  menusClientState.forcedSettings = { document: createDefaultMenuDocumentV2() };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  makeDirty(container);

  menusClientState.forcedSettings = null;
  emitCacheEvent("menus:detail:menu-1");
  await flush();
  expect(container.querySelector('[data-remote-notice="true"]')).toBeTruthy();

  clickButton(container, "Keep editing");
  await flush();

  expect(container.querySelector('[data-remote-notice="true"]')).toBeNull();
  expect(container.textContent).toContain("Unsaved");
  expect(getBlockRowLabels(container)).toContain("Navigation items");

  cleanup();
});

test("Reload discards the draft and applies the authoritative payload", async () => {
  menusClientState.forcedSettings = { document: createDefaultMenuDocumentV2() };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  makeDirty(container);

  const remoteDoc = menuDocumentWithOnlyCta();
  menusClientState.forcedSettings = { document: remoteDoc };
  emitCacheEvent("menus:detail:menu-1");
  await flush();
  expect(container.querySelector('[data-remote-notice="true"]')).toBeTruthy();

  clickButton(container, "Reload");
  await flush();

  // The draft is discarded; the authoritative document now renders.
  expect(container.querySelector('[data-remote-notice="true"]')).toBeNull();
  expect(container.textContent).not.toContain("Unsaved");
  expect(getBlockRowLabels(container)).toEqual(["Button"]);

  cleanup();
});

test("the cache event from OUR OWN save is skipped (no redundant force loop)", async () => {
  menusClientState.forcedSettings = { document: createDefaultMenuDocumentV2() };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  const forceCallsAfterMount = menusClientState.forceCalls.length;

  makeDirty(container);
  clickButton(container, "Save");
  // updateMenu broadcasts the menuDetail event synchronously while the
  // mutation is in flight — the subscription must skip it.
  emitCacheEvent("menus:detail:menu-1");
  await flush();

  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(1);
  expect(menusClientState.forceCalls.length).toBe(forceCallsAfterMount);
  // Save cleared the draft.
  expect(container.textContent).not.toContain("Unsaved");

  cleanup();
});

test("a background force failure shows a retryable error without clearing cache/draft", async () => {
  menusClientState.forcedSettings = { document: createDefaultMenuDocumentV2() };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  makeDirty(container);

  // A message-less failure exercises the retryable FALLBACK text (an Error with
  // a message would surface the raw driver message instead).
  menusClientState.getMenuWithItemsCached.mockRejectedValueOnce(new Error());
  emitCacheEvent("menus:detail:menu-1");
  await flush();

  expect(container.textContent).toContain("Failed to refresh menu.");
  // The draft survives the failed revalidation (Item gap stays 12 on the
  // selected nav panel).
  expect(container.textContent).toContain("Unsaved");
  expect(
    (container.querySelector('[data-page-editor-slider="Item gap"]') as HTMLInputElement | null)
      ?.value
  ).toBe("12");

  cleanup();
});

test("the canvas binds the SHARED public projection (hidden + dead leaves dropped)", async () => {
  menusClientState.forcedSettings = { document: createDefaultMenuDocumentV2() };
  menusClientState.items = [
    {
      id: "item-home",
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [],
    },
    {
      id: "item-secret",
      label: "Members only",
      href: "/members",
      pageId: null,
      parentId: null,
      orderIndex: 1,
      children: [],
      settings: { visibility: "logged_in" },
    },
    {
      id: "item-dead",
      label: "Dead leaf",
      href: null,
      pageId: null,
      parentId: null,
      orderIndex: 2,
      children: [],
    },
  ];

  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const canvas = container.querySelector('[data-menu-document-canvas="true"]');
  expect(canvas?.textContent).toContain("Home");
  expect(canvas?.textContent).not.toContain("Members only");
  expect(canvas?.textContent).not.toContain("Dead leaf");

  cleanup();
});

test("a dirty editor blocks Structure navigation; cancel preserves, confirm discards once", async () => {
  menusClientState.forcedSettings = { document: createDefaultMenuDocumentV2() };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  makeDirty(container);

  // Structure click is intercepted by the shared dirty blocker.
  clickButton(container, "Structure");
  await flush();
  expect(container.querySelector('[data-dirty-dialog="true"]')).toBeTruthy();
  expect(routerState.calls).toEqual([]);

  // Cancel path: the dialog closes, the draft survives, no navigation.
  clickButton(container, "Cancel");
  await flush();
  expect(routerState.calls).toEqual([]);
  expect(container.textContent).toContain("Unsaved");
  expect(container.querySelector('[data-dirty-dialog="true"]')).toBeNull();

  // Navigate again and confirm discard: draft cleared, navigation proceeds.
  // The dialog's Discard is clicked by selector because the toolbar ALSO renders
  // a Discard button that appears earlier in the DOM.
  clickButton(container, "Structure");
  await flush();
  expect(container.querySelector('[data-dirty-dialog="true"]')).toBeTruthy();
  const confirmDiscard = container.querySelector(
    '[data-confirm-discard="true"]'
  ) as HTMLButtonElement | null;
  expect(confirmDiscard).toBeTruthy();
  React.act(() => {
    confirmDiscard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
  expect(container.textContent).not.toContain("Unsaved");
  expect(routerState.calls).toContain("/menus/menu-1");

  cleanup();
});
