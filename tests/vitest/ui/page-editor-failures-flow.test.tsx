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

test("PageEditor surfaces bounded autosave errors", async () => {
  vi.useFakeTimers();
  pageEditorState.autosavePage.mockRejectedValueOnce({
    kind: "api",
    message: "Autosave rejected",
  });
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
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Autosave paused");
    expect(view.container.textContent).toContain("Autosave rejected");
  } finally {
    view.cleanup();
    vi.useRealTimers();
  }
});

test("PageEditor surfaces recoverable autosave drafts after mount revalidation", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(pageEditorState.listPageRevisions).toHaveBeenCalledWith("page-1");
    expect(view.container.textContent).toContain("Recover draft version");
    expect(view.container.textContent).toContain("Restore draft");
    expect(view.container.textContent).toContain("Discard draft");

    clickButton(view.container, "Keep current");
    await flush();

    expect(view.container.textContent).not.toContain("Recover draft version");
    expect(pageEditorState.restorePageRevision).not.toHaveBeenCalled();
    expect(pageEditorState.discardPageRevision).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("PageEditor ignores non-recoverable autosave candidates", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-old",
      pageId: "page-1",
      version: 1,
      kind: "autosave",
      title: "Old draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T08:50:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-same",
      pageId: "page-1",
      version: 2,
      kind: "autosave",
      title: "Same draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:00:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-invalid",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Invalid draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "not-a-date",
      createdBy: null,
    },
  ];
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    expect(view.container.textContent).not.toContain("Recover draft version");
  } finally {
    view.cleanup();
  }
});

test("PageEditor recoverable autosave prompt restores and discards through revision actions", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  const restoreView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );

  try {
    await flush();
    clickButton(restoreView.container, "Restore draft");
    await flush();

    expect(pageEditorState.restorePageRevision).toHaveBeenCalledWith("page-1", "rev-autosave");
    expect(restoreView.container.textContent).toContain("Restored rev-autosave");
    expect(restoreView.container.textContent).not.toContain("Recover draft version");
  } finally {
    restoreView.cleanup();
  }

  pageEditorState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  const discardView = mount(
    <PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />
  );

  try {
    await flush();
    clickButton(discardView.container, "Discard draft");
    await flush();

    expect(pageEditorState.discardPageRevision).toHaveBeenCalledWith("page-1", "rev-autosave");
    expect(discardView.container.textContent).not.toContain("Recover draft version");
  } finally {
    discardView.cleanup();
  }
});

test("PageEditor recoverable autosave blocks navigation without deleting the revision", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-autosave",
      pageId: "page-1",
      version: 3,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:10:00.000Z",
      createdBy: null,
    },
  ];
  window.history.replaceState({}, "", "/admin/pages/page-1");
  const view = mount(
    <AdminRouterProvider initialPath="/admin/pages/page-1">
      <PageEditorNavigationHarness />
    </AdminRouterProvider>
  );

  try {
    await flush();
    expect(view.container.textContent).toContain("Recover draft version");

    clickButton(view.container, "Go pages");
    await flush();

    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages/page-1"
    );
    expect(document.body.textContent).toContain(
      "A saved draft version is available. Cancel to recover it, or continue and leave it in history."
    );

    clickButton(document.body, "Discard and continue");
    await flush();

    expect(pageEditorState.discardPageRevision).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-testid="admin-path"]')?.textContent).toBe(
      "/admin/pages"
    );
  } finally {
    view.cleanup();
  }
});
