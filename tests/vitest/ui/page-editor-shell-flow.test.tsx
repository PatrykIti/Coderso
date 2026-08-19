// @vitest-environment happy-dom

import {
  PageEditorNavigationHarness,
  activeSurfaceState,
  changeField,
  changeInputByAriaLabel,
  clickButton,
  clickButtonByLabel,
  clickColorSwatch,
  clickResponsiveReset,
  clickSegmentedOption,
  clickSelector,
  collectPageBlockIds,
  collectionClientsState,
  commitColorHex,
  createDocument,
  createPage,
  dispatchDocumentKey,
  dispatchElementKey,
  findButton,
  findColorSwatchGroup,
  findEditorBlock,
  findEditorSectionContent,
  findFieldControl,
  findResponsiveField,
  findSegmentedGroup,
  flush,
  formsClientState,
  getCommandGroupButtons,
  mediaLibraryState,
  mount,
  pageEditorBlockLabels,
  pageEditorSectionLabels,
  pageEditorState,
  previewDialogState,
  selectMediaAsset,
  setSliderField,
  setToggleField,
  siteSettingsState,
  toastState,
} from "./pageEditorV2Fixtures";

import {
  blurElement,
  canvasBlockIdOrder,
  clickPaletteBlock,
  createDefaultHeroPage,
  createTwoColumnPage,
  dblClickElement,
  expectedControlDisplayValue,
  findInlineEditRegion,
  floatingPanelButtonLabels,
  lastSavedDocument,
  openFloatingPanel,
  openPageSettingsPanel,
  openResponsivePanel,
  readCanvasSectionTypes,
  readControlDisplayValue,
  readDocumentPath,
  setInlineRegionHtml,
  setInlineRegionText,
} from "./pageEditorV2Helpers";

import React from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { PageEditor, resolveToolbarTargetLabel } from "../../../core/admin/ui/pages/PageEditor";
import {
  AdminRouterProvider,
  useAdminRouter,
} from "../../../core/admin/ui/contexts/AdminRouterContext";
import type { PageDetail, PageRevision } from "../../../core/admin/services/pagesClient";
import {
  createPageBlockV2,
  createPageSectionV2,
  pageBlockCapabilities,
  pageBlockTypes,
  pageSectionCapabilities,
  pageSectionTypes,
  type PageBlockV2,
  type PageBlockType,
  type PageDocumentV2,
  type PageSectionType,
} from "../../../core/services/pages/pageDocumentV2";
import {
  getPageEditorControlsForTarget,
  type PageEditorControlDefinition,
  type PageEditorControlPanel,
} from "../../../core/services/pages/pageEditorControlRegistry";
import {
  editorCanvasCtaButtonClass,
  editorDarkButtonClass,
  editorDarkGhostButtonClass,
  editorPanelButtonClass,
  editorPanelGhostButtonClass,
  editorPanelSegmentTrackClass,
} from "../../../core/admin/ui/pages/editorControls/controlChrome";
import { resolvePageEditorControlUiModel } from "../../../core/services/pages/pageEditorControlUiModel";
import { getPageBlockRenderDefault } from "../../../core/services/pages/pageBlockRenderDefaults";
import { PageSectionRender } from "../../../core/services/pages/pageRendererV2";
import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";
import { toPageTypographyCssVariableMap } from "../../../core/ui/theme/tokenCss";

test("PageEditor loads v2 documents, subscribes to cache updates, and exposes section context", async () => {
  pageEditorState.cachedPage = null;
  pageEditorState.currentPage = createPage();
  const view = mount(<PageEditor pageId="page-1" />);

  try {
    await flush();

    expect(pageEditorState.getPageCached).toHaveBeenCalledWith("page-1", { force: true });
    expect(view.container.textContent).toContain("Welcome to Coderso");
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: null,
    });

    pageEditorState.cachedPage = createPage({
      updatedAt: "2026-03-08T09:05:00.000Z",
      currentData: createDocument({
        sections: [
          createPageSectionV2("content", {
            id: "sec-remote",
            name: "Remote Update",
            blocks: [
              createPageBlockV2("heading", {
                id: "blk-remote",
                props: { text: "Remote headline", level: "h2", align: "left" },
              }),
            ],
          }),
        ],
      }),
    });

    React.act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });

    expect(view.container.textContent).toContain("Remote headline");
  } finally {
    view.cleanup();
  }
});

test("PageEditor ignores stale pageDetail cache events instead of wiping the loaded document", async () => {
  pageEditorState.cachedPage = null;
  pageEditorState.currentPage = createPage();
  const view = mount(<PageEditor pageId="page-1" />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Welcome to Coderso");

    // Older cached record with an empty document (the TASK-449/TASK-442 audit
    // data-loss path): must NOT replace the newer loaded document.
    pageEditorState.cachedPage = createPage({
      updatedAt: "2026-03-08T08:00:00.000Z",
      currentData: createDocument({ sections: [] }),
    });
    React.act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    expect(view.container.textContent).toContain("Welcome to Coderso");

    // Same-timestamp replays are also ignored (no rehydration churn).
    pageEditorState.cachedPage = createPage({
      currentData: createDocument({ sections: [] }),
    });
    React.act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    expect(view.container.textContent).toContain("Welcome to Coderso");

    // Unparsable timestamps fail closed.
    pageEditorState.cachedPage = createPage({
      updatedAt: "not-a-date",
      currentData: createDocument({ sections: [] }),
    });
    React.act(() => {
      pageEditorState.triggerCacheEvent("page-detail:page-1");
    });
    expect(view.container.textContent).toContain("Welcome to Coderso");
  } finally {
    view.cleanup();
  }
});

test("PageEditor treats initial cached detail as provisional and applies forced fresh detail", async () => {
  pageEditorState.cachedPage = createPage({
    updatedAt: "2026-03-08T09:00:00.000Z",
    currentData: createDocument({ sections: [] }),
  });
  pageEditorState.currentPage = createPage({
    updatedAt: "2026-03-08T09:05:00.000Z",
  });
  const view = mount(<PageEditor pageId="page-1" />);

  try {
    expect(view.container.textContent).toContain("This page has no sections yet.");
    expect(view.container.textContent).not.toContain("Welcome to Coderso");

    await flush();

    expect(pageEditorState.getPageCached).toHaveBeenCalledWith("page-1", { force: true });
    expect(view.container.textContent).toContain("Welcome to Coderso");
  } finally {
    view.cleanup();
  }
});

test("PageEditor rejects non-newer forced detail for timestamp-authoritative hosts", async () => {
  const candidates = [
    createPage({
      updatedAt: "2026-03-08T08:00:00.000Z",
      currentData: createDocument({ sections: [] }),
    }),
    createPage({
      updatedAt: "2026-03-08T09:00:00.000Z",
      currentData: createDocument({ sections: [] }),
    }),
    createPage({
      updatedAt: "not-a-date",
      currentData: createDocument({ sections: [] }),
    }),
  ];

  for (const candidate of candidates) {
    pageEditorState.reset();
    pageEditorState.cachedPage = createPage({ updatedAt: "2026-03-08T09:00:00.000Z" });
    pageEditorState.currentPage = candidate;
    const view = mount(<PageEditor pageId="page-1" />);

    try {
      await flush();
      expect(view.container.textContent).toContain("Welcome to Coderso");
      expect(view.container.textContent).not.toContain("This page has no sections yet.");
    } finally {
      view.cleanup();
    }
  }
});

test("PageEditor forced revalidation never overwrites dirty local edits", async () => {
  let resolveLoad: (detail: PageDetail | null) => void = () => undefined;
  pageEditorState.getPageCached.mockImplementationOnce(
    () =>
      new Promise<PageDetail | null>((resolve) => {
        resolveLoad = resolve;
      })
  );
  pageEditorState.cachedPage = createPage({
    updatedAt: "2026-03-08T09:00:00.000Z",
  });
  const freshEmpty = createPage({
    updatedAt: "2026-03-08T09:05:00.000Z",
    currentData: createDocument({ sections: [] }),
  });
  const view = mount(<PageEditor pageId="page-1" />);

  try {
    expect(view.container.textContent).toContain("Welcome to Coderso");

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "FAQ");
    await flush();
    expect(view.container.textContent).toContain("faq section");

    await React.act(async () => {
      resolveLoad(freshEmpty);
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();

    expect(view.container.textContent).toContain("Welcome to Coderso");
    expect(view.container.textContent).toContain("faq section");
    expect(view.container.textContent).not.toContain("This page has no sections yet.");
  } finally {
    view.cleanup();
  }
});

test("PageEditor dirty state blocks SPA, popstate, and hard navigation until confirmed", async () => {
  window.history.replaceState({}, "", "/admin/pages/page-1");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/pages/page-1">
      <PageEditorNavigationHarness />
    </AdminRouterProvider>
  );

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    const unloadEvent = new Event("beforeunload", { cancelable: true });
    expect(window.dispatchEvent(unloadEvent)).toBe(false);
    expect(unloadEvent.defaultPrevented).toBe(true);

    window.history.replaceState({}, "", "/admin/pages");
    React.act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await flush();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages/page-1"
    );
    expect(window.location.pathname).toBe("/admin/pages/page-1");
    expect(document.body.textContent).toContain(
      "Cancel to keep editing, or discard local changes and continue."
    );

    clickButton(document.body, "Cancel");
    await flush();

    clickButton(view.container, "Go pages");
    await flush();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages/page-1"
    );
    expect(document.body.textContent).toContain(
      "Cancel to keep editing, or discard local changes and continue."
    );

    clickButton(document.body, "Discard and continue");
    await flush();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages"
    );
    expect(window.location.pathname).toBe("/admin/pages");
  } finally {
    view.cleanup();
  }
});

test("PageEditor adds sections and atomic blocks, stores responsive overrides, and saves v2 data", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "FAQ");
    await flush();

    expect(view.container.textContent).toContain("faq section");
    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Divider");
    await flush();

    clickSelector(view.container, '[data-page-editor-section="faq"]');
    await flush();
    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Columns", "2");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    expect(savedPayload?.data).toMatchObject({
      schemaVersion: 2,
      sections: [
        { id: "sec-hero", type: "hero" },
        {
          type: "faq",
          responsive: {
            mobile: {
              layout: {
                columns: 2,
              },
            },
          },
        },
      ],
    });
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[1]?.blocks.some((block) => block.type === "divider")).toBe(true);
    expect(savedDocument).not.toHaveProperty("blocks");
  } finally {
    view.cleanup();
  }
});

test("PageEditor autosaves dirty v2 section data", async () => {
  vi.useFakeTimers();
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "CTA");
    await flush();

    await React.act(async () => {
      vi.advanceTimersByTime(1600);
      await Promise.resolve();
    });

    expect(pageEditorState.autosavePage).toHaveBeenCalledWith("page-1", {
      data: expect.objectContaining({
        schemaVersion: 2,
        sections: expect.arrayContaining([expect.objectContaining({ type: "cta" })]),
      }),
    });
  } finally {
    view.cleanup();
    vi.useRealTimers();
  }
});

test("PageEditor save keeps a freshly inserted empty list block in the document", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    const listEntry = getCommandGroupButtons(view.container, "Blocks").find(
      (button) => button.querySelector("span")?.textContent === "List"
    );
    expect(listEntry).toBeTruthy();
    React.act(() => {
      listEntry?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    // Save immediately, before the author types any items.
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedList = savedDocument.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.type === "list");
    expect(savedList?.props).toMatchObject({ items: [], ordered: false });
  } finally {
    view.cleanup();
  }
});

test("PageEditor resets legacy widget page data to an empty v2 document before saving", async () => {
  const legacyPage = createPage({
    currentData: {
      blocks: [{ id: "legacy-hero", type: "hero", props: { title: "Legacy" } }],
    },
  });
  pageEditorState.cachedPage = legacyPage;
  pageEditorState.currentPage = legacyPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={legacyPage} />);

  try {
    await flush();

    expect(view.container.textContent).toContain("This page has no sections yet.");
    clickButton(view.container, "Save");
    await flush();

    expect(pageEditorState.updatePage.mock.calls.at(-1)?.[1].data).toEqual({
      schemaVersion: 2,
      breakpoints: ["desktop", "tablet", "mobile"],
      seo: {},
      settings: {
        template: "page-v2",
        showInNav: true,
      },
      sections: [],
    });
  } finally {
    view.cleanup();
  }
});
