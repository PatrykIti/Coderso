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

test("PageEditor previews, publishes, updates settings, and manages revisions with v2 payloads", async () => {
  pageEditorState.revisions = [
    {
      id: "rev-1",
      pageId: "page-1",
      version: 1,
      kind: "autosave",
      title: "Draft",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T08:50:00.000Z",
      createdBy: null,
    },
    {
      id: "rev-2",
      pageId: "page-1",
      version: 2,
      kind: "publish",
      title: "Published",
      slug: "homepage",
      data: createDocument(),
      createdAt: "2026-03-08T09:20:00.000Z",
      createdBy: null,
    },
  ];
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      warnings: ["page_has_unsaved_changes"],
    });

    clickButton(view.container, "Preview");
    await flush();
    expect(pageEditorState.updatePage.mock.invocationCallOrder[0]).toBeLessThan(
      pageEditorState.previewPage.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
    const previewSyncPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    expect(previewSyncPayload?.data).toMatchObject({
      schemaVersion: 2,
      sections: [{ id: "sec-hero", type: "hero" }, { type: "content" }],
    });
    expect(pageEditorState.previewPage).toHaveBeenCalledWith("page-1", {
      ttlMinutes: 15,
      probe: true,
    });
    expect(previewDialogState.latest).toMatchObject({
      open: true,
      title: "Page preview",
      subtitle: "Runtime preview of the saved draft (read-only, site theme).",
      canPreview: true,
      previewUrl: "https://preview.test/page-1",
      device: "desktop",
      fixPreviewTargetLabel: "Retry preview",
    });
    // The unavailable placeholder exposes a retry affordance that re-runs the
    // preview issuance flow instead of leaving a dead end.
    const previewCallsBeforeRetry = pageEditorState.previewPage.mock.calls.length;
    const latestDialogProps = previewDialogState.latest as {
      onFixPreviewTarget?: () => void;
    };
    expect(typeof latestDialogProps.onFixPreviewTarget).toBe("function");
    await React.act(async () => {
      latestDialogProps.onFixPreviewTarget?.();
      await Promise.resolve();
    });
    await flush();
    expect(pageEditorState.previewPage.mock.calls.length).toBe(previewCallsBeforeRetry + 1);

    clickButton(view.container, "Page settings");
    await flush();
    changeField(view.container, "Title", "Landing Page");
    changeField(view.container, "Slug", "landing");
    changeField(view.container, "Show in navigation", "no");
    changeField(view.container, "Revision retention", "25");
    clickButton(view.container, "Save settings");
    await flush();

    const settingsPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    expect(settingsPayload).toMatchObject({
      title: "Landing Page",
      slug: "/landing",
      data: {
        schemaVersion: 2,
        settings: {
          showInNav: false,
          revisionRetention: 25,
        },
      },
    });

    clickButton(view.container, "History");
    await flush();
    expect(view.container.textContent).toContain("Draft version");
    expect(view.container.textContent).toContain("Version 2");
    clickButton(view.container, "Discard");
    await flush();
    expect(pageEditorState.discardPageRevision).toHaveBeenCalledWith("page-1", "rev-1");
    clickButton(view.container, "Restore");
    await flush();
    expect(pageEditorState.restorePageRevision).toHaveBeenCalledWith("page-1", "rev-1");
    expect(view.container.textContent).toContain("Restored rev-1");

    clickButton(view.container, "Publish");
    await flush();
    expect(pageEditorState.publishPage.mock.calls.at(-1)?.[1]).toMatchObject({
      schemaVersion: 2,
      sections: expect.any(Array),
    });
  } finally {
    view.cleanup();
  }
});

test("Publish persists unsaved sections through the draft-save path so an editor reload keeps them", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      warnings: ["page_has_unsaved_changes"],
    });

    clickButton(view.container, "Publish");
    await flush();

    // Draft/published coherence: the unsaved document is saved through the
    // same draft-save path as Save/Preview, strictly before publishing.
    expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
    expect(pageEditorState.updatePage.mock.invocationCallOrder[0]).toBeLessThan(
      pageEditorState.publishPage.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER
    );
    const savedDocument = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as
      PageDocumentV2 | undefined;
    expect(savedDocument?.sections.map((section) => section.type)).toEqual(["hero", "content"]);
    const publishedDocument = pageEditorState.publishPage.mock.calls.at(-1)?.[1] as
      PageDocumentV2 | undefined;
    expect(publishedDocument?.sections.map((section) => section.type)).toEqual(["hero", "content"]);

    // The dirty flag is cleared by the draft save, not by publish.
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({ warnings: [] });
    expect(toastState.success).toHaveBeenCalledWith("Page published.");
  } finally {
    view.cleanup();
  }

  // Owner gesture: reload the editor. The stored draft is whatever the save
  // produced, so the canvas must still contain the published section.
  expect(pageEditorState.cachedPage?.status).toBe("published");
  const reloaded = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    expect(readCanvasSectionTypes(reloaded.container)).toEqual(["hero", "content"]);
  } finally {
    reloaded.cleanup();
  }
});

test("Publish failure after a successful draft save keeps the saved draft and shows the publish error", async () => {
  pageEditorState.publishPage.mockRejectedValueOnce(new Error("publish_failed"));
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    clickButton(view.container, "Publish");
    await flush();

    // The draft save committed before the publish failure...
    expect(pageEditorState.updatePage).toHaveBeenCalledTimes(1);
    const savedDocument = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as
      PageDocumentV2 | undefined;
    expect(savedDocument?.sections.map((section) => section.type)).toEqual(["hero", "content"]);

    // ...the publish failure is surfaced (no silent state)...
    expect(view.container.textContent).toContain("Failed to publish page.");
    expect(toastState.error).toHaveBeenCalledWith("Failed to publish page.");
    expect(toastState.success).not.toHaveBeenCalledWith("Page published.");

    // ...and the saved draft is kept: no unsaved-changes warning, canvas intact.
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({ warnings: [] });
    expect(readCanvasSectionTypes(view.container)).toEqual(["hero", "content"]);
  } finally {
    view.cleanup();
  }

  // The saved draft also survives an editor reload even though publish failed.
  expect(pageEditorState.cachedPage?.status).toBe("draft");
  const reloaded = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    expect(readCanvasSectionTypes(reloaded.container)).toEqual(["hero", "content"]);
  } finally {
    reloaded.cleanup();
  }
});

test("Publish aborts when the pre-publish draft save fails and keeps the unsaved state visible", async () => {
  pageEditorState.updatePage.mockRejectedValueOnce(new Error("save_failed"));
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    clickButton(view.container, "Publish");
    await flush();

    // Failure ordering: the published site never gets ahead of a draft that
    // could not be persisted.
    expect(pageEditorState.publishPage).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Failed to save draft.");
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      warnings: ["page_has_unsaved_changes"],
    });
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: page settings open in the COMPACT rail panel (not a Sheet) with all fields + Effects", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    // Not the full-height drawer: the mocked Sheet renders "sheet:right".
    expect(view.container.textContent).not.toContain("sheet:right");
    const labelTexts = Array.from(panel.querySelectorAll("label")).map((l) => l.textContent ?? "");
    expect(labelTexts.some((t) => t.includes("Title"))).toBe(true);
    expect(labelTexts.some((t) => t.includes("Slug"))).toBe(true);
    expect(labelTexts.some((t) => t.includes("Show in navigation"))).toBe(true);
    expect(labelTexts.some((t) => t.includes("Revision retention"))).toBe(true);
    expect(panel.querySelector('[data-page-editor-effects-section="true"]')).toBeTruthy();
    expect(findButton(panel, "Save settings")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: Title + Slug + Show-in-nav + Revision-retention persist through the explicit Save", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    changeField(panel, "Title", "Renamed Page");
    changeField(panel, "Slug", "/renamed");
    changeField(panel, "Show in navigation", "no");
    changeField(panel, "Revision retention", "25");
    clickButton(panel, "Save settings");
    await flush();
    expect(pageEditorState.updatePage).toHaveBeenCalled();
    const call = pageEditorState.updatePage.mock.calls.at(-1);
    expect(call?.[1]).toMatchObject({ title: "Renamed Page", slug: "/renamed" });
    const savedSettings = (call?.[1] as { data: PageDocumentV2 }).data.settings;
    expect(savedSettings.showInNav).toBe(false);
    expect(savedSettings.revisionRetention).toBe(25);
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: Effects toggle + size edit the live draft and persist on a normal Save draft", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    setToggleField(panel, "Cursor spotlight", true);
    setSliderField(panel, "Spotlight size", "600");
    clickButton(view.container, "Save draft");
    await flush();
    const call = pageEditorState.updatePage.mock.calls.at(-1);
    const effects = (call?.[1] as { data: PageDocumentV2 }).data.settings.effects;
    expect(effects?.cursorSpotlight).toBe(true);
    expect(effects?.spotlightSize).toBe(600);
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: disabling spotlight drops settings.effects (present-only)", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    setToggleField(panel, "Cursor spotlight", true);
    setToggleField(panel, "Cursor spotlight", false);
    clickButton(view.container, "Save draft");
    await flush();
    const call = pageEditorState.updatePage.mock.calls.at(-1);
    expect((call?.[1] as { data: PageDocumentV2 }).data.settings.effects).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("TASK-534: Grain overlay toggle writes settings.effects.noiseOverlay present-only", async () => {
  const view = mount(<PageEditor pageId="page-1" />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    // On ⇒ noiseOverlay:true persists (independent of the spotlight toggle).
    setToggleField(panel, "Grain overlay", true);
    clickButton(view.container, "Save draft");
    await flush();
    let call = pageEditorState.updatePage.mock.calls.at(-1);
    expect((call?.[1] as { data: PageDocumentV2 }).data.settings.effects?.noiseOverlay).toBe(true);
    // Off ⇒ the key is dropped; with no other effect the whole object is stripped.
    setToggleField(panel, "Grain overlay", false);
    clickButton(view.container, "Save draft");
    await flush();
    call = pageEditorState.updatePage.mock.calls.at(-1);
    expect((call?.[1] as { data: PageDocumentV2 }).data.settings.effects).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("TASK-521-05: reload rehydrates the Effects controls from saved settings.effects", async () => {
  pageEditorState.cachedPage = createPage({
    currentData: createDocument({
      settings: {
        template: "page-v2",
        showInNav: true,
        revisionRetention: 10,
        effects: { cursorSpotlight: true, spotlightSize: 500 },
      },
    }),
  });
  pageEditorState.currentPage = pageEditorState.cachedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);
  try {
    await flush();
    const panel = openPageSettingsPanel(view.container);
    const toggle = Array.from(panel.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === "Cursor spotlight"
    );
    expect(toggle?.getAttribute("aria-checked")).toBe("true");
    const range = panel.querySelector(
      'input[type="range"][data-page-editor-slider="Spotlight size"]'
    ) as HTMLInputElement | null;
    expect(range?.value).toBe("500");
  } finally {
    view.cleanup();
  }
});
