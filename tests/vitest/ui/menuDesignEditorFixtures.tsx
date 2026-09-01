// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, vi } from "vitest";

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
type MenusClient = typeof import("../../../core/admin/services/menusClient");
type MenuUpdateInput = Parameters<MenusClient["updateMenu"]>[1];

const menusClientState = vi.hoisted(() => {
  const buildMenu = (
    settings: MenuSettings,
    status: MenuSummary["status"] = "draft"
  ): MenuSummary => ({
    id: "menu-1",
    name: "Main menu",
    location: "primary",
    status,
    publishedAt: null,
    createdAt: "2026-06-12T09:00:00.000Z",
    settings,
  });
  const buildItems = (): MenuItemNode[] => [
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
    updateCalls: [] as MenuUpdateInput[],
    publishCalls: [] as string[],
    getCachedMenuDetail: vi.fn((_id: string): MenuWithItems | null =>
      state.cachedSettings === null && state.forceNoCache
        ? null
        : { menu: buildMenu(state.cachedSettings), items: state.items }
    ),
    getMenuWithItemsCached: vi.fn(async (): Promise<MenuWithItems | null> => {
      if (state.failMenuLoad) throw state.failMenuLoad;
      if (state.nullDetail) return null;
      return {
        menu: buildMenu(state.cachedSettings),
        items: state.items,
      };
    }),
    updateMenu: vi.fn(async (_menuId: string, input: MenuUpdateInput): Promise<MenuSummary> => {
      state.updateCalls.push(input);
      if (state.updateError) throw state.updateError;
      return buildMenu(state.cachedSettings, input.status);
    }),
    publishMenu: vi.fn(async (menuId: string): Promise<MenuSummary> => {
      state.publishCalls.push(menuId);
      if (state.publishError) throw state.publishError;
      return buildMenu(state.cachedSettings, "published");
    }),
    forceNoCache: true,
    failMenuLoad: null as Error | null,
    nullDetail: false,
    updateError: null as unknown | null,
    publishError: null as unknown | null,
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
      state.failMenuLoad = null;
      state.nullDetail = false;
      state.updateError = null;
      state.publishError = null;
      state.getCachedMenuDetail.mockClear();
      state.getMenuWithItemsCached.mockClear();
      state.updateMenu.mockClear();
      state.publishMenu.mockClear();
    },
  };
  return state;
});

const cacheBusState = vi.hoisted(() => {
  const handlers: Array<(event: { key: string }) => void> = [];
  return {
    handlers,
    subscribe(handler: (event: { key: string }) => void) {
      handlers.push(handler);
      return () => undefined;
    },
    emit(key: string) {
      for (const handler of handlers) {
        handler({ key });
      }
    },
    reset() {
      handlers.length = 0;
    },
  };
});

const mediaState = vi.hoisted(() => {
  const buildMediaItems = (): MediaRecord[] => [
    {
      id: "asset-logo",
      key: "media/logo.svg",
      url: "/media/logo.svg",
      type: "image",
      mimeType: "image/svg+xml",
      size: 1024,
      alt: "Logo",
      createdAt: "2026-06-12T09:00:00.000Z",
    },
  ];
  const items = buildMediaItems();
  return {
    items,
    cached: [] as MediaRecord[] | null,
    reset() {
      items.splice(0, items.length, ...buildMediaItems());
      mediaState.cached = [];
    },
  };
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

vi.mock("@/services/apiClient", async () =>
  vi.importActual<typeof import("../../../core/admin/services/apiClient")>(
    "../../../core/admin/services/apiClient"
  )
);

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
  subscribeCacheEvents: cacheBusState.subscribe,
  broadcastCacheEvent: vi.fn(),
}));

vi.mock("@/services/mediaClient", () => ({
  getCachedMedia: () => mediaState.cached,
  listMediaCached: async () => mediaState.items,
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
  MediaPicker: ({
    value,
    onChange,
  }: {
    value: unknown;
    onChange: (value: MediaPickerSelectionValue) => void;
  }) => (
    <div data-shared-media-picker="true" data-media-picker-value={String(value ?? "")}>
      <button type="button" data-menu-media-pick="true" onClick={() => onChange("asset-logo")}>
        Pick media
      </button>
      <button type="button" data-menu-media-clear="true" onClick={() => onChange(null)}>
        Clear media
      </button>
    </div>
  ),
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
  createDefaultMenuDocumentV2,
  type MenuDocumentV2,
  type NavLevelStyles,
} from "../../../core/services/menus/menuDocumentV2";
import type {
  MenuItemNode,
  MenuSummary,
  MenuWithItems,
} from "../../../core/admin/services/menusClient";
import type { MediaRecord } from "../../../core/admin/services/mediaClient";
import type { MediaPickerSelectionValue } from "../../../core/admin/ui/media/mediaPickerValue";
import { loadFullTimelineIcons } from "../../../core/services/renderContracts/timelineIcons";

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
  cacheBusState.reset();
  mediaState.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
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
  navProps?: Record<string, unknown> & { levelStyles?: NavLevelStyles };
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

// --- TASK-502-04: canvas WYSIWYG, ghost, brand, cta, device scoping ----------

const canvasFrame = (container: ParentNode) =>
  container.querySelector('[data-menu-document-canvas="true"]') as HTMLElement;
const canvasBlock = (container: ParentNode, id: string) =>
  container.querySelector(`[data-menu-block-id="${id}"]`) as HTMLElement | null;
const ctaBlockId = (doc: MenuDocumentV2) =>
  doc.sections[0]!.blocks.find((block) => block.type === "cta-button")!.id;

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
  navBlock(doc)?.props.levelStyles as NavLevelStyles | undefined;

// ---------------------------------------------------------------------------
// TASK-508-04 — R1(b) link alignment, R3a/R3b nav-global direction + mode,
// R2 level-0 canvas force-open. Every control writes a validated enum token or
// `undefined` (clear); a seed→display round-trip catches the fail-closed READ trap.
// ---------------------------------------------------------------------------

const segmentedOption = (container: ParentNode, label: string, option: string) => {
  const group = Array.from(
    container.querySelectorAll('[data-page-editor-control="segmented"] [role="group"]')
  ).find((entry) => entry.getAttribute("aria-label") === label);
  return group?.querySelector(`[data-page-editor-segmented-option="${option}"]`) ?? null;
};

// --- TASK-520-03: menu-bar scrolled/radius/shadow + brand icon/combo ----------

/** Force the full lucide set to load (the picker + canvas dynamic-import it). The
 *  dynamic-import resolution + the resulting setState are awaited INSIDE act so no
 *  stray "update not wrapped in act" warning escapes. */
const flushIcons = async () => {
  await React.act(async () => {
    await loadFullTimelineIcons();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

export {
  brandBlock,
  cacheBusState,
  canvasBlock,
  canvasFrame,
  clickButton,
  clickFirstSwatch,
  clickSegmented,
  clickSelector,
  ctaBlockId,
  findButton,
  findHint,
  findMenuResponsiveField,
  findReset,
  flush,
  flushIcons,
  getBlockRowLabels,
  hasGroup,
  mediaState,
  menusClientState,
  mount,
  navigateState,
  navBlock,
  readLastSavedDocument,
  readSavedDocument,
  seededLevelStyles,
  seededNavChrome,
  seedDocument,
  segmentedOption,
  selectBlockRow,
  setInputValue,
  setSliderValue,
  setToggle,
  settingsState,
  sliderReadout,
  sliderValue,
  switchDevice,
};
