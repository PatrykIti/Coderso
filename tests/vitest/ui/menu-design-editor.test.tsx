// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { PageDetail } from "../../../core/admin/services/pagesClient";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

/**
 * MenuDesignEditor flow (TASK-499-03): the Design tab flipped OFF the legacy
 * PageEditor menu host (dark bottom-panel chrome + appearance/extras adapter)
 * ONTO a THIN editor over the shared `CanvasEditor` builder shell editing
 * `menuDocumentV2` directly. Covers: shell (not legacy dark) render, fresh vs
 * legacy seeding without writing, select→panel→edit→dirty→Save/Publish, the
 * add/remove/reorder composer, read-only nav-items binding, and the
 * useReducer-atom Undo/Redo. A page-host palette regression proves the retired
 * `mode==="menu"` chrome did not disturb the page editor's palette narrowing.
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
  const buildItems = () => [
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
      id: "item-about",
      label: "About us",
      href: null,
      pageId: "page-about",
      parentId: null,
      orderIndex: 1,
      children: [],
    },
  ];
  const state = {
    cachedSettings: null as MenuSettings,
    items: buildItems(),
    updateCalls: [] as Array<Record<string, unknown>>,
    publishCalls: [] as string[],
    getCachedMenuDetail: vi.fn((_id: string) =>
      state.cachedSettings === null && state.forceNoCache
        ? null
        : { menu: buildMenu(state.cachedSettings), items: state.items }
    ),
    getMenuWithItemsCached: vi.fn(async () => ({
      menu: buildMenu(state.cachedSettings),
      items: state.items,
    })),
    updateMenu: vi.fn(async (_menuId: string, input: Record<string, unknown>) => {
      state.updateCalls.push(input);
      return buildMenu(state.cachedSettings);
    }),
    publishMenu: vi.fn(async (menuId: string) => {
      state.publishCalls.push(menuId);
      return buildMenu(state.cachedSettings);
    }),
    forceNoCache: true,
    setLegacy(settings: MenuSettings) {
      state.cachedSettings = settings;
      state.forceNoCache = false;
    },
    reset() {
      state.cachedSettings = null;
      state.forceNoCache = true;
      state.items = buildItems();
      state.updateCalls = [];
      state.publishCalls = [];
      state.getCachedMenuDetail.mockClear();
      state.getMenuWithItemsCached.mockClear();
      state.updateMenu.mockClear();
      state.publishMenu.mockClear();
    },
  };
  return state;
});

const navigateState = vi.hoisted(() => ({
  calls: [] as string[],
  reset() {
    navigateState.calls = [];
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    "aria-pressed": ariaPressed,
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
        aria-pressed={ariaPressed as boolean | undefined}
        className={className}
        {...dataProps}
      >
        {children}
      </button>
    );
  },
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({ open }: { open: boolean }) => (open ? <div role="dialog" /> : null),
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
  isSessionExpiredApiError: () => false,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    pageDetail: (id: string) => `pages:detail:${id}`,
    menuDetail: (id: string) => `menus:detail:${id}`,
    settingsRedacted: "settings:redacted",
  },
  cacheTtlMs: { list: 300_000, detail: 300_000 },
}));

vi.mock("@/services/settingsClient", () => ({
  getCachedSettings: () => null,
  getSettingsCached: async () => ({}),
}));

vi.mock("@/services/menusClient", () => ({
  getCachedMenuDetail: menusClientState.getCachedMenuDetail,
  getMenuWithItemsCached: menusClientState.getMenuWithItemsCached,
  publishMenu: menusClientState.publishMenu,
  updateMenu: menusClientState.updateMenu,
}));

vi.mock("@/services/pagesClient", () => ({
  autosavePage: vi.fn(async () => ({ ok: true })),
  discardPageRevision: vi.fn(async () => undefined),
  getCachedPageDetail: vi.fn(() => null),
  getPageCached: vi.fn(async () => null),
  listPageRevisions: vi.fn(async () => []),
  listPagesCached: vi.fn(async () => [
    {
      id: "page-about",
      title: "About",
      slug: "/about",
      status: "published",
      updatedAt: "2026-06-12T09:00:00.000Z",
    },
  ]),
  previewPage: vi.fn(async (pageId: string) => ({ previewUrl: `https://preview.test/${pageId}` })),
  publishPage: vi.fn(async () => ({ ok: true })),
  restorePageRevision: vi.fn(async () => ({ page: null })),
  updatePage: vi.fn(async (id: string, payload: { data?: Record<string, unknown> }) => ({
    id,
    title: "Homepage",
    slug: "homepage",
    status: "draft",
    currentData: payload.data ?? {},
    updatedAt: "2026-06-12T09:00:00.000Z",
  })),
}));

vi.mock("@/services/pageTemplatesClient", () => ({
  getCachedPageTemplateDetail: vi.fn(() => null),
  getPageTemplateCached: vi.fn(async () => null),
  listPageTemplatesCached: vi.fn(async () => []),
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    breadcrumbs,
    topbarActions,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    topbarActions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <div data-editor-topbar="true">{topbarActions}</div>
      <main>{children}</main>
    </div>
  ),
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: vi.fn(),
  setActiveAssistantSurfaceContext: vi.fn(),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn(() => () => undefined),
  broadcastCacheEvent: vi.fn(),
}));

vi.mock("@/services/mediaClient", () => ({
  getCachedMedia: () => [],
  listMediaCached: async () => [],
}));

vi.mock("@/services/formsClient", () => ({
  getCachedForms: () => null,
  listFormsCached: vi.fn(async () => []),
  getFormDetailCached: vi.fn(async () => null),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => null,
  listContentTypesCached: vi.fn(async () => []),
}));

vi.mock("@/services/entriesClient", () => ({
  listEntriesCached: vi.fn(async () => []),
}));

vi.mock("@/services/listingsClient", () => ({
  getCachedListingQueries: () => null,
  getCachedListingTemplates: () => null,
  listListingQueriesCached: vi.fn(async () => []),
  listListingTemplatesCached: vi.fn(async () => []),
}));

vi.mock("@/ui/media/MediaPicker", () => ({
  MediaPicker: () => <div data-shared-media-picker="true" />,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({ open }: { open: boolean }) =>
    open ? <div data-runtime-preview-dialog="true" /> : null,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (path: string) => {
      navigateState.calls.push(path);
    },
    path: "/admin/menus/menu-1/design",
  }),
  useOptionalAdminRouter: () => null,
}));

import { MenuDesignEditorPage } from "../../../core/admin/ui/menus/MenuDesignEditorPage";
import { PageEditor, type PageEditorHost } from "../../../core/admin/ui/pages/PageEditor";

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
    await Promise.resolve();
    await Promise.resolve();
  });
};

const findButton = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(text)
  );

const clickButton = (container: ParentNode, text: string) => {
  const button = findButton(container, text);
  expect(button, `button "${text}"`).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickSelector = (container: ParentNode, selector: string) => {
  const element = container.querySelector(selector);
  expect(element, selector).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

const readSavedDocument = () => {
  const call = menusClientState.updateCalls.find((input) => "document" in input) as
    | {
        document: {
          sections: Array<{ blocks: Array<{ type: string; props: Record<string, unknown> }> }>;
        };
      }
    | undefined;
  return call?.document;
};

beforeEach(() => {
  menusClientState.reset();
  navigateState.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("renders the shared CanvasEditor builder shell, not the legacy dark panel", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // The shared shell card + sub-toolbar title (Pages-identical chrome).
  expect(container.querySelector(".bg-card.shadow-card")).toBeTruthy();
  expect(container.textContent).toContain("Menu builder");
  expect(container.querySelector('[data-menu-design-canvas-scroller="true"]')).toBeTruthy();
  // NO legacy dark bottom panel.
  expect(container.querySelector('[class*="bg-slate-950"]')).toBeNull();
  expect(container.innerHTML).not.toContain("bg-slate-950");

  cleanup();
});

test("a fresh (empty) menu seeds createDefaultMenuDocumentV2 without writing", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Default document: menu-bar ⊃ brand / nav-items / cta-button.
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items", "Button"]);
  // Seed-only: nothing persisted until an explicit Save.
  expect(menusClientState.updateMenu).not.toHaveBeenCalled();

  cleanup();
});

test("a legacy menu seeds buildMenuDocumentV2FromLegacy (appearance + extras) without writing", async () => {
  menusClientState.setLegacy({
    appearance: { surfaceColor: "#101010", itemGap: 20 },
    extras: [createPageBlockV2("button")],
  });

  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Legacy adapter: nav-items (from appearance) + cta-button (button extra); NO brand.
  expect(getBlockRowLabels(container)).toEqual(["Navigation items", "Button"]);
  expect(menusClientState.updateMenu).not.toHaveBeenCalled();

  cleanup();
});

test("nav-items binds the live published item tree read-only (never persists item data)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const canvas = container.querySelector('[data-menu-document-canvas="true"]');
  expect(canvas?.textContent).toContain("Home");
  expect(canvas?.textContent).toContain("About us");

  clickButton(container, "Save");
  await flush();
  const document = readSavedDocument();
  const navBlock = document?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(navBlock).toBeTruthy();
  // The bound item labels never leak into the persisted nav-items props.
  expect(JSON.stringify(navBlock?.props)).not.toContain("About us");

  cleanup();
});

test("selecting a block opens its panel; editing marks dirty and Save/Publish ride updateMenu", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Empty selection = the menu-bar panel (blocks list + add rail).
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();

  // Selecting nav-items swaps to its per-block control panel.
  selectBlockRow(container, "Navigation items");
  expect(container.querySelector('[data-menu-block-panel="nav-items"]')).toBeTruthy();

  // Editing a control marks the draft dirty.
  expect(container.textContent).not.toContain("Unsaved");
  setSliderValue(container, "Item gap", "12");
  expect(container.textContent).toContain("Unsaved");

  // Save patches menuDocumentV2 through updateMenu({document}).
  clickButton(container, "Save");
  await flush();
  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(1);
  const document = readSavedDocument();
  const navBlock = document?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(navBlock?.props.itemGap).toBe(12);

  // Publish persists the draft first, then flips status.
  clickButton(container, "Publish");
  await flush();
  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(2);
  expect(menusClientState.publishMenu).toHaveBeenCalledTimes(1);

  cleanup();
});

test("the composer adds, removes, and reorders menu-bar blocks through updateMenu", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Add a divider from the add-block rail.
  clickSelector(container, '[data-menu-add-block="divider"]');
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items", "Button", "Divider"]);

  // Reorder: move the divider up one position.
  clickSelector(container, 'button[aria-label="Move Divider up"]');
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items", "Divider", "Button"]);

  // Remove the divider.
  clickSelector(container, 'button[aria-label="Remove Divider"]');
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items", "Button"]);

  // Every mutation marked the draft dirty and round-trips through updateMenu.
  clickButton(container, "Save");
  await flush();
  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(1);
  const document = readSavedDocument();
  expect(document?.sections[0]?.blocks.map((block) => block.type)).toEqual([
    "brand",
    "nav-items",
    "cta-button",
  ]);

  cleanup();
});

test("removing the selected block clears the stale selection", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  selectBlockRow(container, "Button");
  expect(container.querySelector('[data-menu-block-panel="cta-button"]')).toBeTruthy();

  // The per-block Remove deletes it AND drops back to the menu-bar panel.
  clickSelector(container, 'button[aria-label="Remove block"]');
  expect(container.querySelector('[data-menu-block-panel="cta-button"]')).toBeNull();
  expect(container.querySelector('[data-menu-bar-panel="true"]')).toBeTruthy();
  expect(getBlockRowLabels(container)).toEqual(["Brand", "Navigation items"]);

  cleanup();
});

test("Undo/Redo is a bounded history atom wired to the toolbar", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const undo = container.querySelector('button[aria-label="Undo"]') as HTMLButtonElement;
  const redo = container.querySelector('button[aria-label="Redo"]') as HTMLButtonElement;
  // Empty history: Undo + Redo disabled.
  expect(undo.disabled).toBe(true);
  expect(redo.disabled).toBe(true);

  // An edit pushes a snapshot: Undo enabled, Redo still empty.
  clickSelector(container, '[data-menu-add-block="divider"]');
  expect(getBlockRowLabels(container)).toHaveLength(4);
  expect(undo.disabled).toBe(false);
  expect(redo.disabled).toBe(true);

  // Undo restores the prior document; Redo re-applies it.
  clickSelector(container, 'button[aria-label="Undo"]');
  expect(getBlockRowLabels(container)).toHaveLength(3);
  const redoAfterUndo = container.querySelector('button[aria-label="Redo"]') as HTMLButtonElement;
  expect(redoAfterUndo.disabled).toBe(false);
  clickSelector(container, 'button[aria-label="Redo"]');
  expect(getBlockRowLabels(container)).toHaveLength(4);

  // A fresh edit clears the redo stack.
  clickSelector(container, 'button[aria-label="Undo"]');
  clickSelector(container, '[data-menu-add-block="spacer"]');
  const redoAfterFreshEdit = container.querySelector(
    'button[aria-label="Redo"]'
  ) as HTMLButtonElement;
  expect(redoAfterFreshEdit.disabled).toBe(true);

  cleanup();
});

test("page-host palette regression: a host palette can only narrow the global catalog", async () => {
  // The retired mode==="menu" chrome must not disturb the page editor's
  // host-palette narrowing: a palette LISTING the gated navigation section plus
  // hero surfaces ONLY hero — it intersects the insertable options, never widens.
  const detail: PageDetail = {
    id: "page-1",
    title: "Homepage",
    slug: "homepage",
    status: "draft",
    currentData: {
      schemaVersion: 2,
      breakpoints: ["desktop", "tablet", "mobile"],
      seo: {},
      settings: { template: "page-v2", showInNav: true },
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Welcome", level: "h1", align: "center" },
            }),
          ],
        }),
      ],
    } as unknown as Record<string, unknown>,
    updatedAt: "2026-06-12T09:00:00.000Z",
  };
  const host: PageEditorHost = {
    mode: "page",
    resourceLabel: "Pages",
    settingsLabel: "Page settings",
    previewTitle: "Page preview",
    loadFailedMessage: "Failed to load page.",
    assistantSurface: false,
    palette: { sections: ["navigation", "hero"], blocks: ["heading"] },
    detailCacheKey: (id) => `pages:detail:${id}`,
    getCachedDetail: () => detail,
    loadDetail: async () => detail,
    saveDocument: async () => detail,
  };

  const { container, cleanup } = mount(
    <PageEditor pageId="page-1" initialPage={detail} host={host} />
  );
  await flush();

  clickButton(container, "Add section");
  const groupTitles = Array.from(
    container.querySelectorAll('[id="page-editor-command-results"] p.mb-2')
  ).map((entry) => entry.textContent);
  const entryLabels = Array.from(
    container.querySelectorAll(
      '[id="page-editor-command-results"] button span.block.text-sm.font-semibold'
    )
  ).map((entry) => entry.textContent);
  expect(groupTitles).toEqual(["Sections", "Blocks"]);
  expect(entryLabels).toEqual(["Hero", "Heading"]);

  cleanup();
});
