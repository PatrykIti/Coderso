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

import {
  createDefaultMenuBlock,
  createDefaultMenuDocumentV2,
  menuBlockTypes,
  normalizeMenuDocumentV2ForWrite,
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
  responsive?: { mobile?: { visibility?: { visible?: boolean } } };
};
type SavedMenuDocument = {
  sections: Array<{
    layout: Record<string, unknown>;
    responsive?: {
      mobile?: { layout?: Record<string, unknown>; navProps?: Record<string, unknown> };
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

test("tablet edit writes the BASE and the badge reads 'base' (tablet deferred)", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  switchDevice(container, "Tablet");
  expect(findMenuResponsiveField(container, "Vertical padding").dataset.menuResponsiveField).toBe(
    "base"
  );
  expect(
    findMenuResponsiveField(container, "Vertical padding").querySelector(
      '[data-menu-responsive-badge="base"]'
    )?.textContent
  ).toBe("Base");
  setSliderValue(container, "Vertical padding", "18");
  clickButton(container, "Save");
  await flush();

  const document = readLastSavedDocument();
  expect(document?.sections[0]?.layout.paddingY).toBe(18);
  expect(JSON.stringify(document)).not.toContain('"responsive"');

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

  // No Reset affordance on Desktop (base scope).
  expect(container.querySelector('[data-menu-responsive-reset="Horizontal padding"]')).toBeNull();

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

test("canvas scope cue reads 'Mobile (overrides)' / 'Tablet (base)' / 'Desktop (base)'", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const contextPill = () => container.querySelector("[data-page-editor-canvas-context]");
  expect(contextPill()?.textContent).toBe("Desktop (base)");
  switchDevice(container, "Tablet");
  expect(contextPill()?.textContent).toBe("Tablet (base)");
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
