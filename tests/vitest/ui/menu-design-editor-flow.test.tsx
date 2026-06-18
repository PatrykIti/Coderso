// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { PageDetail } from "../../../core/admin/services/pagesClient";
import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import type { MenuAppearance } from "../../../core/services/menus/normalizeMenuAppearance";

/**
 * Menu design editor flow (TASK-458-03): the shared PageEditor hosted by the
 * menu host — restricted palette (button/image only, no section inserts),
 * hidden preview affordance, live SiteHeaderNav canvas chrome, appearance
 * floating panel writes, and extras/appearance persistence through the menu
 * client. A control render with the default page host proves the palette
 * and preview behavior of the global editor is unaffected.
 */

type MenuRecord = {
  id: string;
  name: string;
  location: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  settings: Record<string, unknown> | null;
};

const menusClientState = vi.hoisted(() => {
  const buildMenu = (): MenuRecord => ({
    id: "menu-1",
    name: "Main menu",
    location: "primary",
    status: "draft",
    publishedAt: null,
    createdAt: "2026-06-12T09:00:00.000Z",
    settings: null,
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
    menu: buildMenu(),
    items: buildItems(),
    updateCalls: [] as Array<Record<string, unknown>>,
    applyUpdate(input: {
      name?: string;
      status?: "draft" | "published";
      appearance?: MenuAppearance | null;
      extras?: unknown[] | null;
    }) {
      if (input.appearance !== undefined || input.extras !== undefined) {
        const envelope: Record<string, unknown> = {
          ...(state.menu.settings ?? {}),
        };
        if (input.appearance !== undefined) {
          if (input.appearance === null) delete envelope.appearance;
          else envelope.appearance = input.appearance;
        }
        if (input.extras !== undefined) {
          if (!input.extras || input.extras.length === 0) delete envelope.extras;
          else envelope.extras = input.extras;
        }
        state.menu = {
          ...state.menu,
          settings: Object.keys(envelope).length > 0 ? envelope : null,
        };
      }
      if (input.name !== undefined) state.menu = { ...state.menu, name: input.name };
      if (input.status !== undefined) {
        state.menu = {
          ...state.menu,
          status: input.status,
          publishedAt: input.status === "published" ? "2026-06-12T10:00:00.000Z" : null,
        };
      }
      return { ...state.menu };
    },
    getCachedMenuDetail: vi.fn(() => null),
    getMenuWithItemsCached: vi.fn(async () => ({ menu: { ...state.menu }, items: state.items })),
    updateMenu: vi.fn(async (_menuId: string, input: Record<string, unknown>) => {
      state.updateCalls.push(input);
      return state.applyUpdate(input);
    }),
    publishMenu: vi.fn(async () => state.applyUpdate({ status: "published" })),
    reset() {
      state.menu = buildMenu();
      state.items = buildItems();
      state.updateCalls = [];
      state.getCachedMenuDetail.mockClear();
      state.getMenuWithItemsCached.mockClear();
      state.updateMenu.mockClear();
      state.publishMenu.mockClear();
    },
  };
  return state;
});

const pagesClientState = vi.hoisted(() => {
  const state = {
    previewPage: vi.fn(async (pageId: string) => ({
      previewUrl: `https://preview.test/${pageId}`,
    })),
    updatePage: vi.fn(async (id: string, payload: { data?: Record<string, unknown> }) => ({
      id,
      title: "Homepage",
      slug: "homepage",
      status: "draft",
      currentData: payload.data ?? {},
      updatedAt: "2026-06-12T09:00:00.000Z",
    })),
    reset() {
      state.previewPage.mockClear();
      state.updatePage.mockClear();
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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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
    className,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
    "aria-label"?: string;
    className?: string;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  ),
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
  previewPage: pagesClientState.previewPage,
  publishPage: vi.fn(async () => ({ ok: true })),
  restorePageRevision: vi.fn(async () => ({ page: null })),
  updatePage: pagesClientState.updatePage,
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
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const clickSelector = (container: ParentNode, selector: string) => {
  const element = container.querySelector(selector);
  expect(element).toBeTruthy();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const getCommandGroupTitles = (container: ParentNode) =>
  Array.from(container.querySelectorAll('[id="page-editor-command-results"] p.mb-2')).map(
    (entry) => entry.textContent
  );

const getCommandEntryLabels = (container: ParentNode) =>
  Array.from(
    container.querySelectorAll(
      '[id="page-editor-command-results"] button span.block.text-sm.font-semibold'
    )
  ).map((entry) => entry.textContent);

const openExtrasPalette = (container: ParentNode) => {
  // The empty single-column extras section renders the canvas "Add the
  // first block" insert affordance, which opens the command palette.
  clickButton(container, "Add the first block");
};

const setSliderValue = (container: ParentNode, label: string, value: string) => {
  const slider = container.querySelector(
    `input[type="range"][data-page-editor-slider="${label}"]`
  ) as HTMLInputElement | null;
  expect(slider).toBeTruthy();
  React.act(() => {
    if (!slider) return;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    valueSetter?.call(slider, value);
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    slider.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const createPageHostDocument = (): PageDocumentV2 => ({
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
});

const createPageHostDetail = (): PageDetail => ({
  id: "page-1",
  title: "Homepage",
  slug: "homepage",
  status: "draft",
  currentData: createPageHostDocument() as unknown as Record<string, unknown>,
  updatedAt: "2026-06-12T09:00:00.000Z",
});

beforeEach(() => {
  menusClientState.reset();
  pagesClientState.reset();
  navigateState.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("menu host restricts every insert entry point to button/image and hides section inserts", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  expect(menusClientState.getMenuWithItemsCached).toHaveBeenCalledWith("menu-1", {
    force: true,
  });
  // The live shell preview renders this menu's items.
  const chrome = container.querySelector('[data-menu-design-canvas-chrome="true"]');
  expect(chrome).toBeTruthy();
  expect(chrome?.textContent).toContain("Home");
  expect(chrome?.textContent).toContain("About us");
  expect(chrome?.querySelector("style")?.textContent).toContain("site-header-inner");

  // No section-insert affordances for a host with an empty sections palette.
  expect(findButton(container, "Add section")).toBeUndefined();

  // Ghost tile (pre-targeted insert) opens the palette: blocks only.
  openExtrasPalette(container);
  expect(getCommandGroupTitles(container)).toEqual(["Blocks"]);
  expect(getCommandEntryLabels(container)).toEqual(["Button", "Image"]);

  // Picking Button inserts it into the extras section AND the live chrome slot.
  clickButton(container, "Button");
  await flush();
  expect(
    container.querySelector('[data-menu-design-canvas-chrome="true"] [data-site-nav-extras="true"]')
  ).toBeTruthy();

  // Save persists extras (no appearance touched -> cleared/legacy null).
  clickButton(container, "Save");
  await flush();
  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(1);
  const payload = menusClientState.updateCalls[0] as {
    appearance: unknown;
    extras: Array<{ type: string }>;
  };
  expect(payload.appearance).toBeNull();
  expect(payload.extras.map((block) => block.type)).toEqual(["button"]);

  cleanup();
});

test("menu host hides the preview affordance and publish rides the menu flow", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  const topbar = container.querySelector('[data-editor-topbar="true"]');
  expect(topbar).toBeTruthy();
  expect(findButton(topbar as ParentNode, "Preview")).toBeUndefined();
  expect(findButton(topbar as ParentNode, "Save")).toBeTruthy();
  expect(findButton(topbar as ParentNode, "Publish")).toBeTruthy();

  // Publish with unsaved edits: drafts persist first (updateMenu), then the
  // status flip rides publishMenu — the existing menu flow.
  openExtrasPalette(container);
  clickButton(container, "Image");
  await flush();
  clickButton(container, "Publish");
  await flush();
  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(1);
  expect(menusClientState.publishMenu).toHaveBeenCalledTimes(1);
  expect(menusClientState.menu.status).toBe("published");
  const payload = menusClientState.updateCalls[0] as { extras: Array<{ type: string }> };
  expect(payload.extras.map((block) => block.type)).toEqual(["image"]);

  cleanup();
});

test("appearance floating panel writes through the shared primitives into the menu draft", async () => {
  const { container, cleanup } = mount(<MenuDesignEditorPage menuId="menu-1" />);
  await flush();

  // The host appearance panel is the default active floating panel.
  const panel = container.querySelector('[data-menu-appearance-panel="true"]');
  expect(panel).toBeTruthy();
  expect(
    container.querySelector('[data-page-editor-toolbar-panel="host-appearance"]')
  ).toBeTruthy();

  // Transparent is a first-class swatch write.
  clickSelector(container, 'button[aria-label="Link color: Transparent"]');
  // Segmented control writes the stored enum token.
  clickSelector(
    container,
    '[role="group"][aria-label="Alignment"] [data-page-editor-segmented-option="center"]'
  );
  // Slider writes a clamped number.
  setSliderValue(container, "Item gap", "12");
  // Toggle writes a real boolean.
  clickSelector(container, 'button[role="switch"][aria-label="Sticky header"]');

  // The live canvas chrome restyles from the draft appearance.
  const chromeCss = container.querySelector(
    '[data-menu-design-canvas-chrome="true"] style'
  )?.textContent;
  expect(chromeCss).toContain("gap:12px");
  expect(chromeCss).toContain("position:sticky");

  clickButton(container, "Save");
  await flush();
  expect(menusClientState.updateMenu).toHaveBeenCalledTimes(1);
  const payload = menusClientState.updateCalls[0] as { appearance: MenuAppearance };
  expect(payload.appearance).toEqual({
    linkColor: "transparent",
    alignment: "center",
    itemGap: 12,
    sticky: true,
  });

  cleanup();
});

test("a host palette can only narrow the global catalog: gated sections stay gated", async () => {
  const detail = createPageHostDetail();
  // A palette that LISTS the gated navigation section plus hero: only hero
  // may surface — the palette intersects the globally insertable options and
  // can never widen past the capability tables.
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
  expect(getCommandGroupTitles(container)).toEqual(["Sections", "Blocks"]);
  expect(getCommandEntryLabels(container)).toEqual(["Hero", "Heading"]);

  cleanup();
});

test("the default page host keeps the full palette and the preview affordance", async () => {
  const { container, cleanup } = mount(
    <PageEditor pageId="page-1" initialPage={createPageHostDetail()} />
  );
  await flush();

  // Preview stays available for hosts that provide preview issuance.
  const topbar = container.querySelector('[data-editor-topbar="true"]');
  expect(findButton(topbar as ParentNode, "Preview")).toBeTruthy();

  // Section inserts stay available and the palette keeps the full catalog.
  clickButton(container, "Add section");
  const groupTitles = getCommandGroupTitles(container);
  expect(groupTitles).toContain("Sections");
  expect(groupTitles).toContain("Blocks");
  const labels = getCommandEntryLabels(container);
  expect(labels).toContain("Hero");
  expect(labels).toContain("Heading");
  expect(labels).toContain("Button");
  expect(labels.length).toBeGreaterThan(10);
  // The gated navigation section stays out of the global palette too.
  expect(labels).not.toContain("Navigation");

  cleanup();
});
