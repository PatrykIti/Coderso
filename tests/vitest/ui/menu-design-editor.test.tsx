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
 *
 * TASK-501-03 (per-device overrides) coverage: device-forked appearance writes
 * (Mobile ⇒ sparse `responsive.mobile`, Desktop/Tablet ⇒ flat base), resolved
 * panel display vs BASE-record badge detection, explicit Reset + prune,
 * orientation SegmentedControl, per-block visibility forking, flat content
 * writes, undo/redo across forks, and the canvas scope cue. All writes are
 * asserted via the PATCHed `updateMenu` document, never internal state.
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

const settingsState = vi.hoisted(() => ({
  payload: null as Record<string, unknown> | null,
  reset() {
    settingsState.payload = null;
  },
}));

vi.mock("@/services/settingsClient", () => ({
  getCachedSettings: () => settingsState.payload,
  getSettingsCached: async () => settingsState.payload ?? {},
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

import {
  createDefaultMenuBlock,
  createDefaultMenuDocumentV2,
  menuBlockTypes,
  normalizeMenuDocumentV2ForWrite,
  MENU_BRAND_TEXT_MAX_LENGTH,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";
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
  settingsState.reset();
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

// --- TASK-501-03: device-forked controls, badges, Reset, visibility ----------

type SavedMenuBlock = {
  id: string;
  type: string;
  props: Record<string, unknown>;
  visibility?: { visible?: boolean };
  responsive?: {
    tablet?: { visibility?: { visible?: boolean } };
    mobile?: { visibility?: { visible?: boolean } };
  };
};
type SavedMenuSectionOverride = {
  layout?: Record<string, unknown>;
  navProps?: Record<string, unknown>;
};
type SavedMenuDocument = {
  sections: Array<{
    layout: Record<string, unknown>;
    responsive?: {
      tablet?: SavedMenuSectionOverride;
      mobile?: SavedMenuSectionOverride;
    };
    blocks: SavedMenuBlock[];
  }>;
};

/** Last PATCHed document (the suite's readSavedDocument reads the FIRST). */
const readLastSavedDocument = () =>
  (menusClientState.updateCalls.at(-1) as { document?: SavedMenuDocument } | undefined)?.document;

const switchDevice = (container: ParentNode, label: "Desktop" | "Tablet" | "Mobile") =>
  clickSelector(container, `button[aria-label="${label}"]`);

const findMenuResponsiveField = (container: ParentNode, labelText: string) => {
  const field = Array.from(container.querySelectorAll("[data-menu-responsive-field]")).find(
    (entry) =>
      entry.querySelector(`[aria-label="${labelText}"]`) ||
      Array.from(entry.querySelectorAll("label, span")).some(
        (node) => node.textContent === labelText
      )
  );
  expect(field, `responsive field "${labelText}"`).toBeTruthy();
  return field as HTMLElement;
};

const clickSegmented = (container: ParentNode, label: string, option: string) => {
  const group = Array.from(
    container.querySelectorAll('[data-page-editor-control="segmented"] [role="group"]')
  ).find((entry) => entry.getAttribute("aria-label") === label);
  expect(group, `segmented group "${label}"`).toBeTruthy();
  const button = group?.querySelector(`[data-page-editor-segmented-option="${option}"]`);
  expect(button, `segmented option "${option}"`).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setToggle = (container: ParentNode, label: string, next: boolean) => {
  const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
    (entry) => entry.getAttribute("aria-label") === label
  );
  expect(toggle, `toggle "${label}"`).toBeTruthy();
  if (toggle?.getAttribute("aria-checked") === String(next)) return;
  React.act(() => {
    toggle?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setInputValue = (container: ParentNode, ariaLabel: string, value: string) => {
  const input = container.querySelector(
    `input[aria-label="${ariaLabel}"]`
  ) as HTMLInputElement | null;
  expect(input, `input "${ariaLabel}"`).toBeTruthy();
  React.act(() => {
    if (!input) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const sliderValue = (container: ParentNode, label: string) =>
  (container.querySelector(`input[data-page-editor-slider="${label}"]`) as HTMLInputElement | null)
    ?.value;

/** Seed a stored document draft into the cached menu settings. */
const seedDocument = (mutate?: (doc: MenuDocumentV2) => void) => {
  const doc = createDefaultMenuDocumentV2();
  mutate?.(doc);
  menusClientState.setLegacy({ document: doc });
  return doc;
};

test("desktop edit writes the BASE layout (no responsive member) and the badge reads 'base'", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "base"
  );
  setSliderValue(container, "Vertical padding", "20");
  clickButton(container, "Save");
  await flush();

  const document = readLastSavedDocument();
  expect(document?.sections[0]?.layout.paddingY).toBe(20);
  expect(document?.sections[0]?.responsive).toBeUndefined();
  expect(JSON.stringify(document)).not.toContain('"responsive"');

  cleanup();
});

test("mobile edit writes a SPARSE responsive.mobile.layout override; the base stays untouched", async () => {
  // Event-handler-only writes: act-wrapped renders must produce no warning spew
  // (no setState-in-effect anywhere on the device-forked paths).
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  switchDevice(container, "Mobile");
  setSliderValue(container, "Vertical padding", "24");
  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "override"
  );
  clickButton(container, "Save");
  await flush();

  const document = readLastSavedDocument();
  const section = document?.sections[0];
  // Sparse: ONLY the edited key, base record untouched (no own undefined key).
  expect(Object.prototype.hasOwnProperty.call(section?.layout ?? {}, "paddingY")).toBe(false);
  expect(section?.responsive?.mobile?.layout).toEqual({ paddingY: 24 });
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();

  cleanup();
});

test("tablet is a real override breakpoint: forked write + Override badge + working Reset (502-04)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  switchDevice(container, "Tablet");
  // TASK-502-04: tablet is now a REAL override breakpoint — an un-overridden
  // field reads "inherited" on Tablet (badge/Reset generalized off the
  // mobile-only predicate), and the edit writes the sparse tablet record.
  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "inherited"
  );
  setSliderValue(container, "Vertical padding", "18");
  const field = findMenuResponsiveField(container, "Vertical padding");
  expect(field.dataset.menuResponsiveField).toBe("override");
  expect(field.querySelector('[data-menu-responsive-badge="override"]')?.textContent).toBe(
    "Override"
  );
  clickButton(container, "Save");
  await flush();

  const document = readLastSavedDocument();
  const section = document?.sections[0];
  // NEW model contract: the Tablet edit writes its OWN sparse record; the base
  // layout is untouched and NO mobile record materializes.
  expect(Object.prototype.hasOwnProperty.call(section?.layout ?? {}, "paddingY")).toBe(false);
  expect(section?.responsive?.tablet?.layout).toEqual({ paddingY: 18 });
  expect(section?.responsive?.mobile).toBeUndefined();

  // Reset removes the tablet override + prunes back to the legacy shape.
  clickSelector(container, '[data-menu-responsive-reset="Vertical padding"]');
  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "inherited"
  );
  clickButton(container, "Save");
  await flush();
  expect(JSON.stringify(readLastSavedDocument())).not.toContain('"responsive"');

  cleanup();
});

test("panel shows RESOLVED values while badges compare against the BASE record", async () => {
  seedDocument((doc) => {
    doc.sections[0]!.layout = { paddingX: 8 };
    doc.sections[0]!.responsive = { mobile: { layout: { paddingX: 24 } } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Desktop: base value displayed, every badge "base".
  expect(sliderValue(container, "Horizontal padding")).toBe("8");
  expect(findMenuResponsiveField(container, "Horizontal padding").dataset.menuResponsiveField).toBe(
    "base"
  );

  // Mobile: the RESOLVED override value displayed, override badge from the
  // BASE-record read; an un-overridden sibling reads "inherited".
  switchDevice(container, "Mobile");
  expect(sliderValue(container, "Horizontal padding")).toBe("24");
  const overriddenField = findMenuResponsiveField(container, "Horizontal padding");
  expect(overriddenField.dataset.menuResponsiveField).toBe("override");
  expect(
    overriddenField.querySelector('[data-menu-responsive-badge="override"]')?.textContent
  ).toBe("Override");
  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "inherited"
  );

  cleanup();
});

test("Reset removes the override, prunes empty records, and re-inherits the desktop value", async () => {
  seedDocument((doc) => {
    doc.sections[0]!.layout = { paddingX: 8 };
    doc.sections[0]!.responsive = { mobile: { layout: { paddingX: 24 } } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // TASK-506-04 F1: Desktop now shows the BASE Reset-to-default when the base
  // record carries a value (this assertion flip is OWNED by 506-04, not a 504
  // regression). The device (mobile) Reset behaviour below is unchanged.
  const desktopReset = container.querySelector('[data-menu-responsive-reset="Horizontal padding"]');
  expect(desktopReset?.getAttribute("data-menu-responsive-reset-kind")).toBe("base");
  expect(desktopReset?.getAttribute("aria-label")).toBe("Reset Horizontal padding to default");
  expect(desktopReset?.textContent).toContain("Reset to default");

  switchDevice(container, "Mobile");
  clickSelector(container, '[data-menu-responsive-reset="Horizontal padding"]');

  // Re-inherits live: badge flips, base value re-displayed, button gone.
  const field = findMenuResponsiveField(container, "Horizontal padding");
  expect(field.dataset.menuResponsiveField).toBe("inherited");
  expect(sliderValue(container, "Horizontal padding")).toBe("8");
  expect(container.querySelector('[data-menu-responsive-reset="Horizontal padding"]')).toBeNull();

  clickButton(container, "Save");
  await flush();
  const document = readLastSavedDocument();
  expect(document?.sections[0]?.layout).toEqual({ paddingX: 8 });
  // Empty mobile/responsive records pruned back to the legacy shape.
  expect(JSON.stringify(document)).not.toContain('"responsive"');

  cleanup();
});

test("fontWeight 'Theme' deletes the key on BOTH device paths (delete-on-undefined, no undefined residue)", async () => {
  // Mobile: with an override present, "Theme" deletes the override leaf,
  // prunes empties, and re-inherits (same net effect as Reset for the key).
  seedDocument((doc) => {
    doc.sections[0]!.responsive = { mobile: { navProps: { fontWeight: 600 } } };
  });
  const mobileView = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(mobileView.container, "Mobile");
  selectBlockRow(mobileView.container, "Navigation items");
  expect(
    findMenuResponsiveField(mobileView.container, "Font weight").dataset.menuResponsiveField
  ).toBe("override");
  clickSegmented(mobileView.container, "Font weight", "inherit");
  const fontField = findMenuResponsiveField(mobileView.container, "Font weight");
  expect(fontField.dataset.menuResponsiveField).toBe("inherited");
  expect(
    mobileView.container.querySelector('[data-menu-responsive-reset="Font weight"]')
  ).toBeNull();
  // Undo restores the pre-"Theme" document (override present again).
  clickSelector(mobileView.container, 'button[aria-label="Undo"]');
  expect(
    findMenuResponsiveField(mobileView.container, "Font weight").dataset.menuResponsiveField
  ).toBe("override");
  clickSelector(mobileView.container, 'button[aria-label="Redo"]');
  clickButton(mobileView.container, "Save");
  await flush();
  const mobileSaved = readLastSavedDocument();
  expect(JSON.stringify(mobileSaved)).not.toContain('"responsive"');
  const savedNav = mobileSaved?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(Object.prototype.hasOwnProperty.call(savedNav?.props ?? {}, "fontWeight")).toBe(false);
  mobileView.cleanup();

  // Desktop: "Theme" deletes the BASE key exactly like the previous flat
  // writer — no own undefined key left in the nav-items props.
  menusClientState.reset();
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((block) => block.type === "nav-items");
    if (nav && nav.type === "nav-items") nav.props = { fontWeight: 600 };
  });
  const desktopView = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(desktopView.container, "Navigation items");
  clickSegmented(desktopView.container, "Font weight", "inherit");
  clickButton(desktopView.container, "Save");
  await flush();
  const desktopSaved = readLastSavedDocument();
  const desktopNav = desktopSaved?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(Object.prototype.hasOwnProperty.call(desktopNav?.props ?? {}, "fontWeight")).toBe(false);
  desktopView.cleanup();
});

test("orientation SegmentedControl: resolved default 'horizontal'; desktop writes base props, mobile writes the override", async () => {
  // Desktop: default selection performs NO write; picking Vertical writes the
  // nav-items base props.
  const desktopView = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(desktopView.container, "Navigation items");
  const horizontal = desktopView.container.querySelector(
    '[data-page-editor-segmented-option="horizontal"]'
  );
  expect(horizontal?.getAttribute("aria-pressed")).toBe("true");
  expect(desktopView.container.textContent).not.toContain("Unsaved");
  clickSegmented(desktopView.container, "Orientation", "vertical");
  clickButton(desktopView.container, "Save");
  await flush();
  const desktopSaved = readLastSavedDocument();
  const desktopNav = desktopSaved?.sections[0]?.blocks.find((block) => block.type === "nav-items");
  expect(desktopNav?.props.orientation).toBe("vertical");
  expect(JSON.stringify(desktopSaved)).not.toContain('"responsive"');
  desktopView.cleanup();

  // Mobile: the same control writes the sparse navProps override instead.
  menusClientState.reset();
  const mobileView = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(mobileView.container, "Mobile");
  selectBlockRow(mobileView.container, "Navigation items");
  clickSegmented(mobileView.container, "Orientation", "vertical");
  clickButton(mobileView.container, "Save");
  await flush();
  const mobileSaved = readLastSavedDocument();
  const mobileSection = mobileSaved?.sections[0];
  const mobileNav = mobileSection?.blocks.find((block) => block.type === "nav-items");
  expect(Object.prototype.hasOwnProperty.call(mobileNav?.props ?? {}, "orientation")).toBe(false);
  expect(mobileSection?.responsive?.mobile?.navProps).toEqual({ orientation: "vertical" });
  mobileView.cleanup();
});

test("per-block visibility forks by device: flat leaf toggle on Desktop, override toggle on Mobile, hidden-row indicator", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Desktop: native blocks get NO visibility toggle…
  selectBlockRow(container, "Brand");
  expect(
    Array.from(container.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === "Visible"
    )
  ).toBeUndefined();
  // …leaf blocks get the FLAT toggle (writes the flat visibility slot).
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]'); // deselect
  selectBlockRow(container, "Button");
  setToggle(container, "Visible", false);
  clickButton(container, "Save");
  await flush();
  const flatSaved = readLastSavedDocument();
  const flatCta = flatSaved?.sections[0]?.blocks.find((block) => block.type === "cta-button");
  expect(flatCta?.visibility?.visible).toBe(false);
  expect(JSON.stringify(flatSaved)).not.toContain('"responsive"');

  // Mobile: EVERY block type gets the override toggle (native included)…
  switchDevice(container, "Mobile");
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]'); // deselect
  selectBlockRow(container, "Brand");
  expect(
    Array.from(container.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === "Visible on mobile"
    )
  ).toBeTruthy();
  // …and composes show-only-on-mobile: flat visible:false + mobile true.
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]'); // deselect
  selectBlockRow(container, "Button");
  setToggle(container, "Visible on mobile", true);
  const visibilityField = findMenuResponsiveField(container, "Visible on mobile");
  expect(visibilityField.dataset.menuResponsiveField).toBe("override");
  clickButton(container, "Save");
  await flush();
  const overrideSaved = readLastSavedDocument();
  const overrideCta = overrideSaved?.sections[0]?.blocks.find(
    (block) => block.type === "cta-button"
  );
  expect(overrideCta?.visibility?.visible).toBe(false); // flat slot untouched
  expect(overrideCta?.responsive?.mobile?.visibility).toEqual({ visible: true });

  // Reset clears the block record (pruned) and re-inherits the flat value.
  clickSelector(container, '[data-menu-responsive-reset="Visible on mobile"]');
  clickButton(container, "Save");
  await flush();
  const resetSaved = readLastSavedDocument();
  expect(JSON.stringify(resetSaved)).not.toContain('"responsive"');

  // Blocks-list discoverability: the (now) mobile-hidden Button is flagged.
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]');
  const hidden = container.querySelector("[data-menu-block-hidden]");
  expect(hidden).toBeTruthy();
  expect(hidden?.getAttribute("aria-label")).toBe("Hidden on Mobile");

  cleanup();
});

test("content writes stay FLAT and badge-less on Mobile (cta label)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  switchDevice(container, "Mobile");
  selectBlockRow(container, "Button");
  const labelInput = container.querySelector('input[aria-label="Button label"]');
  // Device-invariant content controls are NOT wrapped in the responsive shell.
  expect(labelInput?.closest("[data-menu-responsive-field]")).toBeNull();
  setInputValue(container, "Button label", "Buy now");
  clickButton(container, "Save");
  await flush();

  const document = readLastSavedDocument();
  const cta = document?.sections[0]?.blocks.find((block) => block.type === "cta-button");
  expect(cta?.props.label).toBe("Buy now");
  expect(JSON.stringify(document)).not.toContain('"responsive"');

  cleanup();
});

test("nav appearance writes target the FIRST nav-items block regardless of selection (normative)", async () => {
  seedDocument((doc) => {
    doc.sections[0]!.blocks.push({ id: "blk-nav-2", type: "nav-items", props: { itemGap: 40 } });
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Select the SECOND nav-items row.
  const navRows = Array.from(container.querySelectorAll("[data-menu-block-row]")).filter((row) =>
    Array.from(row.querySelectorAll("button")).some(
      (button) =>
        !button.getAttribute("aria-label") && button.textContent?.trim() === "Navigation items"
    )
  );
  expect(navRows).toHaveLength(2);
  const secondSelect = Array.from(navRows[1]!.querySelectorAll("button")).find(
    (button) => !button.getAttribute("aria-label")
  );
  React.act(() => {
    secondSelect?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  // Desktop edit mutates the FIRST nav block's props; the second stays intact.
  setSliderValue(container, "Item gap", "30");
  clickButton(container, "Save");
  await flush();
  const desktopSaved = readLastSavedDocument();
  const desktopNavBlocks =
    desktopSaved?.sections[0]?.blocks.filter((block) => block.type === "nav-items") ?? [];
  expect(desktopNavBlocks[0]?.props.itemGap).toBe(30);
  expect(desktopNavBlocks[1]?.props).toEqual({ itemGap: 40 });

  // Mobile edit writes the SECTION override; the second block still intact.
  switchDevice(container, "Mobile");
  setSliderValue(container, "Item gap", "26");
  clickButton(container, "Save");
  await flush();
  const mobileSaved = readLastSavedDocument();
  expect(mobileSaved?.sections[0]?.responsive?.mobile?.navProps).toEqual({ itemGap: 26 });
  const mobileNavBlocks =
    mobileSaved?.sections[0]?.blocks.filter((block) => block.type === "nav-items") ?? [];
  expect(mobileNavBlocks[1]?.props).toEqual({ itemGap: 40 });

  cleanup();
});

test("undo/redo works across device-forked writes (no responsive residue after undo)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  switchDevice(container, "Mobile");
  setSliderValue(container, "Vertical padding", "24");
  clickSelector(container, 'button[aria-label="Undo"]');
  clickButton(container, "Save");
  await flush();
  expect(JSON.stringify(readLastSavedDocument())).not.toContain('"responsive"');

  clickSelector(container, 'button[aria-label="Redo"]');
  clickButton(container, "Save");
  await flush();
  expect(readLastSavedDocument()?.sections[0]?.responsive?.mobile?.layout).toEqual({
    paddingY: 24,
  });

  cleanup();
});

test("canvas scope cue reads 'Mobile (overrides)' / 'Tablet (overrides)' / 'Desktop (base)'", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const contextPill = () => container.querySelector("[data-page-editor-canvas-context]");
  expect(contextPill()?.textContent).toBe("Desktop (base)");
  // TASK-502-04: tablet is now a real override breakpoint.
  switchDevice(container, "Tablet");
  expect(contextPill()?.textContent).toBe("Tablet (overrides)");
  switchDevice(container, "Mobile");
  expect(contextPill()?.textContent).toBe("Mobile (overrides)");
  expect(contextPill()?.getAttribute("data-page-editor-canvas-context")).toBe("mobile");

  cleanup();
});

test("leaf-list divergence guard: exactly cta-button/divider/spacer accept flat visibility (schema truth)", () => {
  // The editor inlines the three leaf types for the Desktop flat toggle
  // (MENU_LEAF_BLOCK_TYPES is module-private); this pins the inline list to
  // schema truth — a new leaf/native type fails here until the editor's
  // MenuBlockPanel leaf check is updated.
  const base = createDefaultMenuDocumentV2();
  const section = base.sections[0]!;
  const acceptingTypes = menuBlockTypes.filter((type) => {
    const block: Record<string, unknown> = {
      ...createDefaultMenuBlock(type),
      visibility: { visible: false },
    };
    const candidate = {
      schemaVersion: base.schemaVersion,
      sections: [
        { id: section.id, type: section.type, name: section.name, layout: {}, blocks: [block] },
      ],
    };
    try {
      normalizeMenuDocumentV2ForWrite(candidate);
      return true;
    } catch {
      return false;
    }
  });
  expect(acceptingTypes).toEqual(["cta-button", "divider", "spacer"]);
});

// --- TASK-502-04: canvas WYSIWYG, ghost, brand, cta, device scoping ----------

const canvasFrame = (container: ParentNode) =>
  container.querySelector('[data-menu-document-canvas="true"]') as HTMLElement;
const canvasBlock = (container: ParentNode, id: string) =>
  container.querySelector(`[data-menu-block-id="${id}"]`) as HTMLElement | null;
const ctaBlockId = (doc: MenuDocumentV2) =>
  doc.sections[0]!.blocks.find((block) => block.type === "cta-button")!.id;

test("canvas frame paints all seven --color-* from settings overrides; swatch previews + admin-pinned ring", async () => {
  settingsState.payload = {
    "design.tokens": { colors: { secondary: "#654321" }, neutrals: { bg: "#abcdef" } },
  };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const frame = canvasFrame(container);
  // WYSIWYG: the seven brand+neutral vars are painted inline on the frame ROOT.
  expect(frame.style.getPropertyValue("--color-secondary")).toBe("#654321");
  expect(frame.style.getPropertyValue("--color-bg")).toBe("#abcdef");
  for (const name of [
    "--color-primary",
    "--color-secondary",
    "--color-accent",
    "--color-bg",
    "--color-surface",
    "--color-border",
    "--color-text",
  ]) {
    expect(frame.style.getPropertyValue(name).length, name).toBeGreaterThan(0);
  }

  // Every ColorSwatchControl gets the SITE palette: the secondary swatch preview
  // renders the overridden site hex (not the DEFAULT_TOKENS #0f766e).
  const secondarySwatch = container.querySelector(
    '[data-page-editor-color-swatch="secondary"]'
  ) as HTMLElement | null;
  expect(secondarySwatch?.style.backgroundColor).toBe("#654321");

  // Chrome-safety regression pin: the selection ring is admin-pinned, NOT
  // ring-primary (which would recolor to the SITE primary once the frame paints).
  selectBlockRow(container, "Brand");
  const selected = canvasFrame(container).querySelector('[data-menu-block-selected="true"]');
  expect(selected?.className).toContain("ring-[color:var(--admin-input-ring");
  expect(selected?.className).not.toContain("ring-primary");

  cleanup();
});

test("canvas ghost: flat-hidden, override-hidden, and visible-on-neither blocks dim to a selectable Hidden badge", async () => {
  const doc = seedDocument((d) => {
    const cta = d.sections[0]!.blocks.find((b) => b.type === "cta-button")!;
    (cta as { visibility?: unknown }).visibility = { visible: false }; // flat hide
  });
  const ctaId = ctaBlockId(doc);
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Desktop: the flat-hidden cta renders as a ghost (NOT skipped) + Hidden badge.
  const ghost = canvasBlock(container, ctaId);
  expect(ghost?.getAttribute("data-menu-block-ghost")).toBe("true");
  expect(ghost?.querySelector('[data-menu-block-hidden-badge="true"]')?.textContent).toBe("Hidden");

  // …and STAYS selectable: clicking the ghost selects it.
  React.act(() => {
    ghost?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(canvasBlock(container, ctaId)?.getAttribute("data-menu-block-selected")).toBe("true");

  // Defense-in-depth: a stray dual hide-rule <style> placed BEFORE the canvas
  // force-show cannot display:none the ghost (later source order wins the tie).
  React.act(() => {
    canvasFrame(container).insertAdjacentHTML(
      "afterbegin",
      `<style>[data-menu-document-canvas="true"] [data-menu-block-id="${ctaId}"],[data-menu-document-canvas="true"] [data-block-id="${ctaId}"]{display:none}</style>`
    );
  });
  expect(getComputedStyle(canvasBlock(container, ctaId)!).display).not.toBe("none");

  cleanup();
});

test("canvas ghost tracks the device: mobile-only override hides only on Mobile", async () => {
  const doc = seedDocument((d) => {
    const cta = d.sections[0]!.blocks.find((b) => b.type === "cta-button")!;
    (cta as { responsive?: unknown }).responsive = { mobile: { visibility: { visible: false } } };
  });
  const ctaId = ctaBlockId(doc);
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // Desktop: visible (no ghost).
  expect(canvasBlock(container, ctaId)?.getAttribute("data-menu-block-ghost")).toBeNull();
  switchDevice(container, "Mobile");
  // Mobile: the override hides it ⇒ ghost.
  expect(canvasBlock(container, ctaId)?.getAttribute("data-menu-block-ghost")).toBe("true");

  cleanup();
});

test("brand text: text-mode-only Input (maxLength), writes props.text, empty deletes the key, canvas chain never shows menu name", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  selectBlockRow(container, "Brand");
  const input = () =>
    container.querySelector('input[aria-label="Brand text"]') as HTMLInputElement | null;
  expect(input()).toBeTruthy();
  expect(input()?.maxLength).toBe(MENU_BRAND_TEXT_MAX_LENGTH);

  // Image mode hides the Brand text input.
  clickSegmented(container, "Mode", "image");
  expect(container.querySelector('input[aria-label="Brand text"]')).toBeNull();
  clickSegmented(container, "Mode", "text");

  // Typing writes props.text; the canvas brand anchor renders it.
  setInputValue(container, "Brand text", "Acme Co");
  clickButton(container, "Save");
  await flush();
  const typedBrand = readLastSavedDocument()?.sections[0]?.blocks.find((b) => b.type === "brand");
  expect(typedBrand?.props.text).toBe("Acme Co");
  expect(canvasFrame(container).querySelector(".site-header-brand")?.textContent).toBe("Acme Co");

  // Clearing DELETES the key (sparse) — the doc round-trips textless.
  setInputValue(container, "Brand text", "");
  clickButton(container, "Save");
  await flush();
  const clearedBrand = readLastSavedDocument()?.sections[0]?.blocks.find((b) => b.type === "brand");
  expect(Object.prototype.hasOwnProperty.call(clearedBrand?.props ?? {}, "text")).toBe(false);

  // With no text and no site name, the canvas shows the placeholder — NEVER the
  // menu name ("Main menu").
  expect(canvasFrame(container).querySelector(".site-header-brand")?.textContent).toBe("Site name");
  expect(canvasFrame(container).querySelector(".site-header-brand")?.textContent).not.toBe(
    "Main menu"
  );

  cleanup();
});

test("brand canvas falls back to the real site name when no brand text is set", async () => {
  settingsState.payload = { "site.name": "Live Site Name" };
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  expect(canvasFrame(container).querySelector(".site-header-brand")?.textContent).toBe(
    "Live Site Name"
  );
  cleanup();
});

test("device-scoped controls: Mobile menu is Mobile-only, Dropdown direction is Desktop/Tablet-only, both write the BASE", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  const hasControl = (label: string) =>
    Array.from(container.querySelectorAll('[role="group"]')).some(
      (group) => group.getAttribute("aria-label") === label
    );

  // Desktop: Dropdown direction present, Mobile menu absent.
  expect(hasControl("Dropdown direction")).toBe(true);
  expect(hasControl("Mobile menu")).toBe(false);
  // Neither device-defining control renders a responsive badge/Reset.
  expect(container.querySelector('[data-menu-responsive-reset="Dropdown direction"]')).toBeNull();

  // Editing Dropdown direction on Desktop writes the BASE (no responsive record).
  clickSegmented(container, "Dropdown direction", "top");
  clickButton(container, "Save");
  await flush();
  let saved = readLastSavedDocument();
  let nav = saved?.sections[0]?.blocks.find((b) => b.type === "nav-items");
  expect(nav?.props.dropdownDirection).toBe("top");
  expect(JSON.stringify(saved)).not.toContain('"responsive"');

  // Tablet: still Desktop/Tablet-only control.
  switchDevice(container, "Tablet");
  expect(hasControl("Dropdown direction")).toBe(true);
  expect(hasControl("Mobile menu")).toBe(false);

  // Mobile: Mobile menu present, Dropdown direction absent; editing writes BASE.
  switchDevice(container, "Mobile");
  expect(hasControl("Mobile menu")).toBe(true);
  expect(hasControl("Dropdown direction")).toBe(false);
  clickSegmented(container, "Mobile menu", "inline");
  clickButton(container, "Save");
  await flush();
  saved = readLastSavedDocument();
  nav = saved?.sections[0]?.blocks.find((b) => b.type === "nav-items");
  expect(nav?.props.mobileMode).toBe("inline");
  // Base write — NO mobileMode/dropdownDirection in any responsive record.
  expect(JSON.stringify(saved?.sections[0]?.responsive ?? {})).not.toContain("mobileMode");
  expect(JSON.stringify(saved?.sections[0]?.responsive ?? {})).not.toContain("dropdownDirection");

  cleanup();
});

test("tablet visibility fork writes responsive.tablet.visibility for a native block", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Tablet");
  selectBlockRow(container, "Brand"); // native block — no flat toggle on Desktop
  setToggle(container, "Visible on tablet", false);
  clickButton(container, "Save");
  await flush();
  const saved = readLastSavedDocument();
  const brand = saved?.sections[0]?.blocks.find((b) => b.type === "brand");
  expect(brand?.responsive?.tablet?.visibility).toEqual({ visible: false });
  expect(brand?.responsive?.mobile).toBeUndefined();
  cleanup();
});

test("cta Size + Open-in-new-tab write props and visibly change the canvas preview; preview click selects without navigating", async () => {
  const doc = seedDocument();
  const ctaId = ctaBlockId(doc);
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // The canvas renders the REAL button leaf (page renderer), default size md.
  const ctaAnchor = () => canvasBlock(container, ctaId)?.querySelector("a") as HTMLElement | null;
  expect(ctaAnchor()?.className).toContain("px-5 py-3"); // md
  expect(ctaAnchor()?.getAttribute("target")).toBeNull();

  selectBlockRow(container, "Button");
  clickSegmented(container, "Size", "lg");
  setToggle(container, "Open in new tab", true);

  // Visible effect on canvas (not just control presence).
  expect(ctaAnchor()?.className).toContain("px-6 py-4"); // lg
  expect(ctaAnchor()?.getAttribute("target")).toBe("_blank");

  clickButton(container, "Save");
  await flush();
  const cta = readLastSavedDocument()?.sections[0]?.blocks.find((b) => b.type === "cta-button");
  expect(cta?.props.size).toBe("lg");
  expect(cta?.props.target).toBe("blank");

  // Clicking the cta preview SELECTS the block (no navigation away).
  const href = window.location.href;
  React.act(() => {
    ctaAnchor()?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  expect(window.location.href).toBe(href);
  expect(canvasBlock(container, ctaId)?.getAttribute("data-menu-block-selected")).toBe("true");

  cleanup();
});

test("divider canvas preview renders the real leaf frame (data-block-id) — the '—' literal is gone; inspector copy mentions the separator", async () => {
  const doc = seedDocument((d) => {
    d.sections[0]!.blocks.push(createDefaultMenuBlock("divider"));
  });
  const dividerId = doc.sections[0]!.blocks.find((b) => b.type === "divider")!.id;
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const dividerBlock = canvasBlock(container, dividerId);
  expect(dividerBlock?.querySelector("[data-block-id]")).toBeTruthy();
  expect(dividerBlock?.textContent).not.toContain("—");

  selectBlockRow(container, "Divider");
  expect(container.textContent).toContain("vertical separator");

  cleanup();
});

test("spacer canvas preview KEEPS the fixed-24px selectable stub (no PageBlockFrame)", async () => {
  const doc = seedDocument((d) => {
    d.sections[0]!.blocks.push(createDefaultMenuBlock("spacer"));
  });
  const spacerId = doc.sections[0]!.blocks.find((b) => b.type === "spacer")!.id;
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const spacerBlock = canvasBlock(container, spacerId);
  const stub = spacerBlock?.querySelector("span[aria-hidden='true']") as HTMLElement | null;
  expect(stub?.style.width).toBe("24px");
  expect(spacerBlock?.querySelector("[data-block-id]")).toBeNull(); // NOT a real leaf frame

  React.act(() => {
    spacerBlock?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(canvasBlock(container, spacerId)?.getAttribute("data-menu-block-selected")).toBe("true");

  cleanup();
});

test("recursive NavItemsPreview renders grandchildren inside .site-nav-sublist .site-nav-sublist; parent label once", async () => {
  menusClientState.items = [
    {
      id: "grp",
      label: "Products",
      href: "#",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [
        {
          id: "sub",
          label: "Software",
          href: "#",
          pageId: null,
          parentId: "grp",
          orderIndex: 0,
          children: [
            {
              id: "leaf",
              label: "CMS",
              href: "/cms",
              pageId: null,
              parentId: "sub",
              orderIndex: 0,
              children: [],
            },
          ],
        },
      ],
    },
  ] as unknown as typeof menusClientState.items;
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const frame = canvasFrame(container);
  const grandchild = frame.querySelector(".site-nav-sublist .site-nav-sublist a");
  expect(grandchild?.textContent).toBe("CMS");
  const productsCount = Array.from(frame.querySelectorAll(".site-nav-link")).filter(
    (node) => node.textContent === "Products"
  ).length;
  expect(productsCount).toBe(1);

  cleanup();
});

// --- TASK-504-04: brand style, per-level styling, cheap wins, B1/B2 ----------

const hasGroup = (container: ParentNode, label: string) =>
  Array.from(container.querySelectorAll('[role="group"]')).some(
    (group) => group.getAttribute("aria-label") === label
  );

/** Click the first non-transparent palette swatch inside a color-swatch group. */
const clickFirstSwatch = (container: ParentNode, groupLabel: string) => {
  const group = Array.from(container.querySelectorAll('[role="group"]')).find(
    (entry) =>
      entry.getAttribute("aria-label") === groupLabel &&
      entry.closest('[data-page-editor-control="color-swatch"]')
  );
  expect(group, `swatch group "${groupLabel}"`).toBeTruthy();
  const swatch = Array.from(group!.querySelectorAll("[data-page-editor-color-swatch]")).find(
    (button) => button.getAttribute("data-page-editor-color-swatch") !== "transparent"
  );
  expect(swatch, `a palette swatch in "${groupLabel}"`).toBeTruthy();
  React.act(() => {
    swatch?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const brandBlock = (doc?: SavedMenuDocument) =>
  doc?.sections[0]?.blocks.find((b) => b.type === "brand") as
    | (SavedMenuBlock & {
        responsive?: {
          tablet?: { style?: Record<string, unknown> };
          mobile?: { style?: Record<string, unknown> };
        };
      })
    | undefined;
const navBlock = (doc?: SavedMenuDocument) =>
  doc?.sections[0]?.blocks.find((b) => b.type === "nav-items") as SavedMenuBlock | undefined;

test("brand style controls are mode-gated and write props.style (base, sparse)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");

  // Text mode ⇒ typography controls present; image-only controls absent.
  expect(hasGroup(container, "Brand font weight")).toBe(true);
  expect(sliderValue(container, "Brand font size")).toBeTruthy();
  expect(sliderValue(container, "Logo height")).toBeUndefined();

  // Switch to image ⇒ typography controls disappear, image controls appear.
  clickSegmented(container, "Mode", "image");
  expect(hasGroup(container, "Brand font weight")).toBe(false);
  expect(sliderValue(container, "Brand font size")).toBeUndefined();
  expect(sliderValue(container, "Logo height")).toBeTruthy();
  expect(sliderValue(container, "Logo max width")).toBeTruthy();
  clickSegmented(container, "Mode", "text");

  // A base write lands ONLY the touched key in brand.props.style.
  setSliderValue(container, "Brand font size", "30");
  clickButton(container, "Save");
  await flush();
  const brand = brandBlock(readLastSavedDocument());
  expect(brand?.props.style).toEqual({ fontSize: 30 });
  expect(readLastSavedDocument()?.sections[0]?.responsive).toBeUndefined();

  cleanup();
});

test("brand font weight 'Theme' DELETES style.fontWeight (prunes empty style)", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.props.style = { fontWeight: 600 };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");

  clickSegmented(container, "Brand font weight", "inherit");
  clickButton(container, "Save");
  await flush();
  const brand = brandBlock(readLastSavedDocument());
  expect(Object.prototype.hasOwnProperty.call(brand?.props ?? {}, "style")).toBe(false);

  cleanup();
});

test("Level SegmentedControl rebinds the nav control set to levelStyles[N]", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Level 0 = the existing nav base (Orientation present, no container heading).
  expect(hasGroup(container, "Orientation")).toBe(true);
  expect(container.textContent).not.toContain("Dropdown container");

  // Level 1 ⇒ the level control set (base scalars gone, container controls in).
  clickSegmented(container, "Nesting level", "1");
  expect(hasGroup(container, "Orientation")).toBe(false);
  expect(container.textContent).toContain("Dropdown container");
  setSliderValue(container, "Font size", "20");
  clickButton(container, "Save");
  await flush();
  let nav = navBlock(readLastSavedDocument());
  expect((nav?.props.levelStyles as Record<string, { fontSize?: number }>)?.[1]?.fontSize).toBe(20);
  // The level write never touches the base scalar.
  expect(nav?.props.fontSize).toBeUndefined();

  // Level 2 writes levelStyles[2], never levelStyles[1].
  clickSegmented(container, "Nesting level", "2");
  setSliderValue(container, "Corner radius", "12");
  clickButton(container, "Save");
  await flush();
  nav = navBlock(readLastSavedDocument());
  expect((nav?.props.levelStyles as Record<string, { radius?: number }>)?.[2]?.radius).toBe(12);

  cleanup();
});

test("NavLevelInheritBadge tracks per-field override ('This level' vs 'Inherits level 0')", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.levelStyles = { 1: { linkColor: "#ff0000" } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  const overridden = findMenuResponsiveField(container, "Link color").querySelector(
    "[data-menu-level-field]"
  );
  expect(overridden?.getAttribute("data-menu-level-field")).toBe("override");
  expect(overridden?.textContent).toBe("This level");

  const inherited = findMenuResponsiveField(container, "Font size").querySelector(
    "[data-menu-level-field]"
  );
  expect(inherited?.getAttribute("data-menu-level-field")).toBe("inherited");
  expect(inherited?.textContent).toBe("Inherits level 0");

  cleanup();
});

test("device-forked brand style write ⇒ responsive.mobile.style (Override badge)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Brand");

  setSliderValue(container, "Brand font size", "28");
  clickButton(container, "Save");
  await flush();
  const brand = brandBlock(readLastSavedDocument());
  expect(brand?.responsive?.mobile?.style).toEqual({ fontSize: 28 });
  expect(brand?.props.style).toBeUndefined();
  expect(
    findMenuResponsiveField(container, "Brand font size").querySelector(
      '[data-menu-responsive-badge="override"]'
    )
  ).toBeTruthy();

  cleanup();
});

test("device-forked level write ⇒ responsive.mobile.navProps.levelStyles[1]", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  setSliderValue(container, "Font size", "22");
  clickButton(container, "Save");
  await flush();
  const override = readLastSavedDocument()?.sections[0]?.responsive?.mobile?.navProps
    ?.levelStyles as Record<string, { fontSize?: number }> | undefined;
  expect(override?.[1]?.fontSize).toBe(22);
  // Base props untouched (mobile did NOT inherit into the base).
  expect(navBlock(readLastSavedDocument())?.props.levelStyles).toBeUndefined();

  cleanup();
});

test("Reset prunes the stored brand-style responsive record verbatim", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.responsive = { mobile: { style: { fontSize: 28 } } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Brand");

  clickSelector(container, '[data-menu-responsive-reset="Brand font size"]');
  clickButton(container, "Save");
  await flush();
  const brand = brandBlock(readLastSavedDocument());
  expect(brand?.responsive).toBeUndefined();
  expect(JSON.stringify(readLastSavedDocument())).not.toContain('"responsive"');

  cleanup();
});

test("cheap-win level-0 controls: Link padding/radius + 'Hover text' distinct from 'Hover background'", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Two DISTINCT hover controls.
  expect(hasGroup(container, "Hover text")).toBe(true);
  expect(hasGroup(container, "Hover background")).toBe(true);
  // Per-link padding + radius sliders present.
  expect(sliderValue(container, "Link padding X")).toBeTruthy();
  expect(sliderValue(container, "Link padding Y")).toBeTruthy();
  expect(sliderValue(container, "Link radius")).toBeTruthy();

  setSliderValue(container, "Link padding X", "20");
  clickButton(container, "Save");
  await flush();
  const nav = navBlock(readLastSavedDocument());
  expect(nav?.props.linkPaddingX).toBe(20);
  // Untouched hover-text default OMITS the key (present-only, sparse).
  expect(Object.prototype.hasOwnProperty.call(nav?.props ?? {}, "linkHoverTextColor")).toBe(false);

  // Setting a hover-text color writes linkHoverTextColor (distinct from linkHoverColor).
  clickFirstSwatch(container, "Hover text");
  clickButton(container, "Save");
  await flush();
  expect(navBlock(readLastSavedDocument())?.props.linkHoverTextColor).toBeTruthy();

  cleanup();
});

test("canvas force-open threads the selected level (cumulative) into the preview CSS", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  const styleText = () => canvasFrame(container).querySelector("style")?.textContent ?? "";

  // Level 0 ⇒ NO force-open rule (byte-identical preview).
  expect(styleText()).not.toContain(
    ".site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;opacity:1;transform:none}"
  );

  // Level 1 ⇒ depth-1 sim-open only.
  clickSegmented(container, "Nesting level", "1");
  expect(styleText()).toContain(
    ".site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;opacity:1;transform:none}"
  );
  expect(styleText()).not.toContain(
    ".site-nav-sublist .site-nav-sublist{display:grid;opacity:1;transform:none}"
  );

  // Level 2 ⇒ CUMULATIVE (depth 1 AND depth 2 open).
  clickSegmented(container, "Nesting level", "2");
  expect(styleText()).toContain(
    ".site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;opacity:1;transform:none}"
  );
  expect(styleText()).toContain(
    ".site-nav-sublist .site-nav-sublist{display:grid;opacity:1;transform:none}"
  );

  cleanup();
});

test("brand IMAGE mode renders a real <img> (resolved src) on the canvas, stamped with data-menu-block-id (B1)", async () => {
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") {
      brand.props.mode = "image";
      brand.props.image = { src: "https://cdn.test/logo.png", alt: "Acme logo" };
    }
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const anchor = canvasFrame(container).querySelector(".site-header-brand") as HTMLElement;
  const img = anchor.querySelector("img");
  expect(img?.getAttribute("src")).toBe("https://cdn.test/logo.png");
  expect(anchor.textContent).not.toContain("Logo");
  // §3 stamp: the rule reaches the <a> (and its <img>).
  expect(anchor.getAttribute("data-menu-block-id")).toBeTruthy();

  cleanup();
});

test("brand image mode with NO logo falls back to text (no broken <img>)", async () => {
  settingsState.payload = { "site.name": "Fallback Site" };
  seedDocument((doc) => {
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.props.mode = "image";
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const anchor = canvasFrame(container).querySelector(".site-header-brand") as HTMLElement;
  expect(anchor.querySelector("img")).toBeNull();
  expect(anchor.textContent).toBe("Fallback Site");

  cleanup();
});

test("nav font-size UNSET shows the inherited value (16), distinct from an explicit 15 (B2)", async () => {
  const first = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(first.container, "Navigation items");
  // Unset ⇒ shows 16 (the theme-inherited size) + an "Inherited" hint.
  expect(sliderValue(first.container, "Font size")).toBe("16");
  expect(first.container.querySelector('[data-menu-font-size-inherited="true"]')).toBeTruthy();
  first.cleanup();

  menusClientState.reset();
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.fontSize = 15;
  });
  const second = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(second.container, "Navigation items");
  // Explicit 15 ⇒ shows 15, NO inherited hint.
  expect(sliderValue(second.container, "Font size")).toBe("15");
  expect(second.container.querySelector('[data-menu-font-size-inherited="true"]')).toBeNull();
  second.cleanup();
});

test("no setState-in-effect: brand/level/device flows emit no React act/update warnings", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Brand");
  clickSegmented(container, "Mode", "image");
  clickSegmented(container, "Mode", "text");
  setSliderValue(container, "Brand font size", "24");
  switchDevice(container, "Mobile");
  // Deselect (canvas scroller) so the block rows return, then pick nav-items.
  clickSelector(container, '[data-menu-design-canvas-scroller="true"]');
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");
  clickSegmented(container, "Nesting level", "0");
  await flush();

  const warnings = errorSpy.mock.calls
    .map((call) => String(call[0]))
    .filter((message) => /not wrapped in act|state update|Warning:/i.test(message));
  expect(warnings).toEqual([]);
  errorSpy.mockRestore();
  cleanup();
});

// --- TASK-506-04: F1 base Reset, F2 default hint, B1–B5 modern controls -------

const findReset = (container: ParentNode, label: string) =>
  container.querySelector(`[data-menu-responsive-reset="${label}"]`);
const findHint = (container: ParentNode, key: string) =>
  container.querySelector(`[data-menu-control-default-hint="${key}"]`);
const sliderReadout = (container: ParentNode, label: string) =>
  container
    .querySelector(`input[data-page-editor-slider="${label}"]`)
    ?.closest('[data-page-editor-control="slider"]')
    ?.querySelector("output")?.textContent;
const seededNavChrome = (doc?: SavedMenuDocument) =>
  navBlock(doc)?.props.navChrome as Record<string, unknown> | undefined;
const seededLevelStyles = (doc?: SavedMenuDocument) =>
  navBlock(doc)?.props.levelStyles as Record<string, Record<string, unknown>> | undefined;

test("F1 base Reset renders on a DESKTOP-BASE per-level field and clears it byte-clean", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.levelStyles = { 1: { linkColor: "#ff0000" } };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  const reset = findReset(container, "Link color");
  expect(reset?.getAttribute("data-menu-responsive-reset-kind")).toBe("base");
  expect(reset?.getAttribute("aria-label")).toBe("Reset Link color to default");
  expect(reset?.textContent).toContain("Reset to default");

  clickSelector(container, '[data-menu-responsive-reset="Link color"]');
  clickButton(container, "Save");
  await flush();
  // The emptied level record prunes back to the legacy no-levelStyles shape.
  expect(navBlock(readLastSavedDocument())?.props.levelStyles).toBeUndefined();

  cleanup();
});

test("F1 base Reset clears a level-0 navChrome field (Pill radius) to byte-clean", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.navChrome = { navPillRadius: 12 };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  const reset = findReset(container, "Pill radius");
  expect(reset?.getAttribute("data-menu-responsive-reset-kind")).toBe("base");
  clickSelector(container, '[data-menu-responsive-reset="Pill radius"]');
  clickButton(container, "Save");
  await flush();
  expect(seededNavChrome(readLastSavedDocument())).toBeUndefined();

  cleanup();
});

test("F1 base Reset clears a nav-base scalar and a brand field; absent when unset", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.linkPaddingX = 20;
    const brand = doc.sections[0]!.blocks.find((b) => b.type === "brand");
    if (brand?.type === "brand") brand.props.style = { fontSize: 28 };
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Authored base scalar ⇒ base Reset; an unset sibling ⇒ no Reset at all.
  expect(
    findReset(container, "Link padding X")?.getAttribute("data-menu-responsive-reset-kind")
  ).toBe("base");
  expect(findReset(container, "Link radius")).toBeNull();
  clickSelector(container, '[data-menu-responsive-reset="Link padding X"]');

  clickSelector(container, '[data-menu-design-canvas-scroller="true"]'); // deselect
  selectBlockRow(container, "Brand");
  expect(
    findReset(container, "Brand font size")?.getAttribute("data-menu-responsive-reset-kind")
  ).toBe("base");
  clickSelector(container, '[data-menu-responsive-reset="Brand font size"]');
  clickButton(container, "Save");
  await flush();
  const saved = readLastSavedDocument();
  expect(Object.prototype.hasOwnProperty.call(navBlock(saved)?.props ?? {}, "linkPaddingX")).toBe(
    false
  );
  expect(Object.prototype.hasOwnProperty.call(brandBlock(saved)?.props ?? {}, "style")).toBe(false);

  cleanup();
});

test("F1 on tablet/mobile still shows the device Reset (kind override), never the base branch", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");
  setSliderValue(container, "Link padding X", "10");
  const reset = findReset(container, "Link padding X");
  expect(reset?.getAttribute("data-menu-responsive-reset-kind")).toBe("override");

  cleanup();
});

test("F2 hint shows the RESOLVED default (Inherits level 0) + slider thumb, not range.min", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.fontSize = 18;
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  // Level-1 fontSize is unset ⇒ inherits the level-0 base (18), NOT range.min (10).
  expect(findHint(container, "fontSize")?.textContent).toContain("Inherits level 0");
  expect(sliderValue(container, "Font size")).toBe("18");

  // Setting the own record hides the hint.
  setSliderValue(container, "Font size", "22");
  expect(findHint(container, "fontSize")).toBeNull();

  cleanup();
});

test("F2 hint shows a theme/base default at level 0 and disappears once set", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  expect(findHint(container, "itemGap")?.textContent).toContain("Default");
  setSliderValue(container, "Item gap", "14");
  expect(findHint(container, "itemGap")).toBeNull();

  cleanup();
});

test("F2 nav-base link sliders: unset thumb shows the RESOLVED default (12/8/6), never range.min (0)", async () => {
  // Fresh doc: linkPaddingX/Y/radius are all UNSET. The thumb must sit at the
  // resolved theme default (MENU_SHELL_DEFAULT_LINK_PX/PY/RADIUS = 12/8/6), matching
  // the F2 hint rendered below, NOT the misleading NAV_LINK_NUMBER_RANGES min (0).
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  expect(sliderValue(container, "Link padding X")).toBe("12");
  expect(sliderValue(container, "Link padding Y")).toBe("8");
  expect(sliderValue(container, "Link radius")).toBe("6");
  // The hint below each corroborates the same resolved default.
  expect(findHint(container, "linkPaddingX")?.textContent).toContain("Default 12px");
  expect(findHint(container, "linkPaddingY")?.textContent).toContain("Default 8px");
  expect(findHint(container, "linkRadius")?.textContent).toContain("Default 6px");

  cleanup();
});

test("F2 isSet trap: a Desktop base value must NOT suppress the Mobile 'Inherited from desktop' hint", async () => {
  seedDocument((doc) => {
    const nav = doc.sections[0]!.blocks.find((b) => b.type === "nav-items");
    if (nav?.type === "nav-items") nav.props.linkPaddingX = 20;
  });
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");

  // Desktop base = 20, no mobile override ⇒ the hint MUST still render (isSet uses
  // the override reader ALONE, not `hasBaseValue || override`).
  expect(findHint(container, "linkPaddingX")?.textContent).toContain("Inherited from desktop");

  cleanup();
});

test("B1–B5 controls write the Desktop BASE per level (with correct level gating)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");

  // Level 0: pill + caret present, flyoutAnimation + container padding + placement absent.
  expect(container.querySelector('input[data-page-editor-slider="Pill radius"]')).toBeTruthy();
  expect(hasGroup(container, "Flyout animation")).toBe(false);
  expect(
    container.querySelector('input[data-page-editor-slider="Container padding X"]')
  ).toBeNull();
  expect(hasGroup(container, "Submenu placement")).toBe(false);
  setSliderValue(container, "Pill radius", "16");
  clickSegmented(container, "Show caret", "off");

  // Level 1: flyoutAnimation + container padding present, pill absent, placement absent.
  clickSegmented(container, "Nesting level", "1");
  expect(container.querySelector('input[data-page-editor-slider="Pill radius"]')).toBeNull();
  expect(hasGroup(container, "Flyout animation")).toBe(true);
  expect(
    container.querySelector('input[data-page-editor-slider="Container padding X"]')
  ).toBeTruthy();
  expect(hasGroup(container, "Submenu placement")).toBe(false);
  clickSegmented(container, "Item divider", "on");
  clickSegmented(container, "Divider style", "dashed");
  clickSegmented(container, "Indicator", "underline");
  clickSegmented(container, "Flyout animation", "fade");
  setSliderValue(container, "Container padding X", "10");
  // transitionMs uses the "ms" unit.
  expect(sliderReadout(container, "Transition")?.endsWith("ms")).toBe(true);

  // Level 2: submenu placement present (level-2 only).
  clickSegmented(container, "Nesting level", "2");
  expect(hasGroup(container, "Submenu placement")).toBe(true);
  clickSegmented(container, "Submenu placement", "bottom");

  clickButton(container, "Save");
  await flush();
  const saved = readLastSavedDocument();
  expect(seededNavChrome(saved)).toMatchObject({ navPillRadius: 16, showCaret: false });
  const levels = seededLevelStyles(saved)!;
  expect(levels[1]).toMatchObject({
    itemDividerShow: true,
    itemDividerStyle: "dashed",
    indicator: "underline",
    flyoutAnimation: "fade",
    containerPaddingX: 10,
  });
  expect(levels[2]).toMatchObject({ submenuPlacement: "bottom" });

  cleanup();
});

test("B-controls fork per device (Mobile ⇒ sparse override) and the Default sentinel clears", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  switchDevice(container, "Mobile");
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "1");

  clickSegmented(container, "Indicator", "overline");
  clickButton(container, "Save");
  await flush();
  const override = (
    readLastSavedDocument()?.sections[0]?.responsive?.mobile?.navProps as
      | { levelStyles?: Record<string, Record<string, unknown>> }
      | undefined
  )?.levelStyles;
  expect(override?.[1]).toEqual({ indicator: "overline" });
  // Base props untouched by the mobile fork.
  expect(navBlock(readLastSavedDocument())?.props.levelStyles).toBeUndefined();

  // The "Default" sentinel clears the field ⇒ present-only zero bytes (record pruned).
  clickSegmented(container, "Indicator", "inherit");
  clickButton(container, "Save");
  await flush();
  expect(readLastSavedDocument()?.sections[0]?.responsive).toBeUndefined();

  cleanup();
});

test("canvas force-open threads the selected level so the styled sublist is revealed", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();
  selectBlockRow(container, "Navigation items");
  clickSegmented(container, "Nesting level", "2");

  const style = canvasFrame(container).querySelector("style")?.textContent ?? "";
  // 506-02's previewForceOpenLevel opens AND neutralizes the level-2 sublist so
  // the fade/slide flyout is visible on canvas.
  expect(style).toContain(
    ".site-nav-sublist .site-nav-sublist{display:grid;opacity:1;transform:none}"
  );

  cleanup();
});
