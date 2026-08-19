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

test("PageEditor floating toolbar labels selection, switches one panel, collapses, and right-docks (builder chrome)", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    let toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.getAttribute("aria-label")).toBe("Hero tools");
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("false");

    // Owner finding #3: two-row head structure. Row 1 = identity + editing
    // scope pill on the left with the right-aligned action cluster; row 2 =
    // the panel category icons on their own line so they never collide with
    // the scope pill.
    const headRow = toolbar?.querySelector('[data-page-editor-toolbar-row="head"]');
    const panelsRow = toolbar?.querySelector('[data-page-editor-toolbar-row="panels"]');
    expect(headRow).toBeTruthy();
    expect(panelsRow).toBeTruthy();
    expect(headRow?.querySelector("[data-page-editor-editing-scope]")).toBeTruthy();
    expect(headRow?.querySelector("[data-page-editor-toolbar-icon]")).toBeNull();
    expect(panelsRow?.querySelector("[data-page-editor-editing-scope]")).toBeNull();
    const panelIcons = Array.from(
      toolbar?.querySelectorAll("[data-page-editor-toolbar-icon]") ?? []
    );
    expect(panelIcons.length).toBeGreaterThan(0);
    for (const icon of panelIcons) {
      expect(icon.closest('[data-page-editor-toolbar-row="panels"]')).toBe(panelsRow);
    }
    const actionCluster = headRow?.querySelector('[data-page-editor-toolbar-actions="true"]');
    expect(actionCluster).toBeTruthy();
    expect(actionCluster?.className).toContain("ml-auto");
    for (const label of [
      "Collapse toolbar",
      "Move section up",
      "Move section down",
      "Duplicate section",
      "Delete section",
    ]) {
      expect(actionCluster?.querySelector(`button[aria-label="${label}"]`)).toBeTruthy();
    }
    expect(panelsRow?.querySelector('button[aria-label="Duplicate section"]')).toBeNull();

    expect(view.container.querySelectorAll("[data-page-editor-toolbar-panel]")).toHaveLength(1);
    expect(
      view.container
        .querySelector("[data-page-editor-toolbar-panel]")
        ?.getAttribute("data-page-editor-toolbar-panel")
    ).toBe("content");

    clickButtonByLabel(view.container, "Style panel");
    await flush();
    expect(view.container.querySelectorAll("[data-page-editor-toolbar-panel]")).toHaveLength(1);
    expect(
      view.container
        .querySelector("[data-page-editor-toolbar-panel]")
        ?.getAttribute("data-page-editor-toolbar-panel")
    ).toBe("style");

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    toolbar = view.container.querySelector('[data-page-editor-floating-toolbar="true"]');
    // Type display name only — block content ("Existing page copy.") must not
    // leak into the toolbar aria text (TASK-451-02-L01 label contract).
    expect(toolbar?.getAttribute("aria-label")).toBe("Text tools");

    clickButtonByLabel(view.container, "Collapse toolbar");
    await flush();
    toolbar = view.container.querySelector('[data-page-editor-floating-toolbar="true"]');
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("true");
    expect(view.container.querySelector("[data-page-editor-toolbar-panel]")).toBeNull();
    // Collapsed: the panels row disappears entirely; the action cluster keeps
    // only the expand control.
    expect(toolbar?.querySelector('[data-page-editor-toolbar-row="panels"]')).toBeNull();
    const collapsedActions = toolbar?.querySelector('[data-page-editor-toolbar-actions="true"]');
    expect(collapsedActions?.querySelector('button[aria-label="Expand toolbar"]')).toBeTruthy();
    expect(collapsedActions?.querySelector('button[aria-label="Duplicate block"]')).toBeNull();
    expect(collapsedActions?.querySelector('button[aria-label="Delete block"]')).toBeNull();

    clickButtonByLabel(view.container, "Expand toolbar");
    await flush();
    toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.getAttribute("data-page-editor-toolbar-collapsed")).toBe("false");

    // TASK-495-02: the builder chrome (page host) right-docks the panel — it is
    // NOT draggable. The legacy bottom-center draggable panel (drag handle +
    // data-page-editor-toolbar-dragging + transform) is exercised only on the
    // menu host (see menu-design-editor-flow.test.tsx). Assert the right-dock
    // position classes and that no drag affordances are present here.
    toolbar = view.container.querySelector(
      '[data-page-editor-floating-toolbar="true"]'
    ) as HTMLElement | null;
    expect(toolbar?.className).toContain("right-4");
    expect(toolbar?.className).toContain("top-4");
    // TASK-495-03 P3a: the builder rail is narrowed to the proto 280px width.
    expect(toolbar?.className).toContain("w-[min(280px,calc(100%-2rem))]");
    expect(toolbar?.className).not.toContain("w-[min(340px,calc(100%-2rem))]");
    expect(toolbar?.className).not.toContain("bottom-6");
    expect(toolbar?.className).not.toContain("left-1/2");
    expect(toolbar?.style.transform).toBe("");
    expect(toolbar?.hasAttribute("data-page-editor-toolbar-dragging")).toBe(false);
    expect(view.container.querySelector('button[aria-label="Drag toolbar"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor builder wraps the sub-toolbar and canvas region in one separated card (TASK-495-03 P2a)", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // The dotted canvas region sits inside ONE rounded/bordered/shadowed card
    // (proto CanvasEditor card — CanvasEditor.tsx:53).
    const scroller = view.container.querySelector(
      '[data-page-editor-canvas-scroller="true"]'
    ) as HTMLElement;
    expect(scroller).toBeTruthy();
    const canvasCard = scroller.closest(".rounded-2xl.border.bg-card.shadow-card");
    expect(canvasCard).toBeTruthy();

    // The page-builder sub-toolbar ("Page builder") shares that SAME card
    // ancestor — the chrome bar + the canvas are blended into one card.
    const builderLabel = Array.from(view.container.querySelectorAll("span")).find(
      (el) => el.textContent === "Page builder"
    );
    expect(builderLabel).toBeTruthy();
    expect(builderLabel?.closest(".rounded-2xl.border.bg-card.shadow-card")).toBe(canvasCard);
  } finally {
    view.cleanup();
  }
});

test("PageEditor builder panel buttons and canvas CTAs use the shared non-inverting chrome", async () => {
  const chromePage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          variant: "centered",
          // External background URL (not in the media library) so the
          // Background panel renders the clearable readout.
          style: {
            background: "#ffffff",
            backgroundType: "image",
            backgroundImage: "https://cdn.example.com/external-bg.png",
            accent: "#0d9488",
            radius: 0,
            shadow: "none",
          },
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Welcome to Coderso", level: "h1", align: "center" },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = chromePage;
  pageEditorState.currentPage = chromePage;
  const view = mount(<PageEditor pageId="page-1" initialPage={chromePage} />);

  try {
    await flush();

    // Canvas CTAs use the explicit neutral light chrome (always-white canvas)
    // instead of admin-theme outline variables that can invert.
    const addSection = findButton(view.container, "Add section");
    expect(addSection?.className).toContain(editorCanvasCtaButtonClass);
    const gapCta = view.container.querySelector('button[aria-label="Add section at position 1"]');
    expect(gapCta?.className).toContain(editorCanvasCtaButtonClass);

    // Mode-agnostic CONSTANT-value (shape) checks — the dark constants stay LIVE
    // (the menu branch renders them), and the light siblings now back the
    // builder rail. Owner finding #4 contract: idle subtle fill, hover only a
    // slightly lighter fill — never the inverted white-bg/black-text jump.
    expect(editorDarkButtonClass).toContain("bg-white/10");
    expect(editorDarkButtonClass).toContain("hover:bg-white/20");
    expect(editorDarkGhostButtonClass).toContain("text-slate-200");
    expect(editorDarkGhostButtonClass).toContain("hover:bg-white/10");
    expect(editorPanelButtonClass).toContain("bg-muted");
    expect(editorPanelGhostButtonClass).toContain("text-muted-foreground");
    expect(editorCanvasCtaButtonClass).toContain("bg-card");
    expect(editorCanvasCtaButtonClass).toContain("hover:bg-muted");

    // TASK-495-02: the page host is now the light builder rail. "Add block"
    // inside the (default-open) Content panel carries the LIGHT panel chrome.
    const addBlock = findButton(view.container, "Add block");
    expect(addBlock?.className).toContain(editorPanelButtonClass);

    // The Background panel's external URL readout "Clear" carries the light
    // ghost chrome on the builder rail (the in-file ToolbarMediaUrlField).
    clickButtonByLabel(view.container, "Background panel");
    await flush();
    const externalReadout = view.container.querySelector(
      '[data-page-editor-media-external="Background image"]'
    );
    expect(externalReadout).toBeTruthy();
    expect(externalReadout?.querySelector("button")?.className).toContain(
      editorPanelGhostButtonClass
    );

    // INTEGRATION-level non-button relight guard (TASK-495-02): a NON-button
    // registry control rendered through the real page-host rail must carry the
    // LIGHT token via the EditorControlToneContext path (NO explicit `tone`
    // prop — the per-primitive test covers the explicit-prop case). The
    // Background panel's "Background type" SegmentedControl track resolves
    // `tone="light"` from the rail provider, so it carries
    // `editorPanelSegmentTrackClass` and NEVER the dark `bg-white/10`. Guards
    // the "silent button-only" regression where a registry control stops
    // consuming the tone context yet every button assertion stays green.
    const bgTypeTrack = findSegmentedGroup(view.container, "Background type");
    expect(bgTypeTrack.className).toContain(editorPanelSegmentTrackClass);
    expect(bgTypeTrack.className).not.toContain("bg-white/10");
  } finally {
    view.cleanup();
  }
});

test("PageEditor builder chrome renders the in-content PageHeader and page-builder sub-toolbar (TASK-495-02)", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // PageHeader actions in order: Page settings → History → Preview → Save
    // draft → Publish.
    const buttonTexts = Array.from(view.container.querySelectorAll("button")).map(
      (button) => button.textContent ?? ""
    );
    const indexOfText = (label: string) => buttonTexts.findIndex((text) => text.includes(label));
    const settingsIdx = indexOfText("Page settings");
    const historyIdx = indexOfText("History");
    const previewIdx = indexOfText("Preview");
    const saveDraftIdx = indexOfText("Save draft");
    const publishIdx = indexOfText("Publish");
    expect(settingsIdx).toBeGreaterThanOrEqual(0);
    expect(historyIdx).toBeGreaterThan(settingsIdx);
    expect(previewIdx).toBeGreaterThan(historyIdx);
    expect(saveDraftIdx).toBeGreaterThan(previewIdx);
    expect(publishIdx).toBeGreaterThan(saveDraftIdx);

    // Save relabeled to "Save draft"; Publish carries the Rocket icon.
    const publishButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      (button.textContent ?? "").includes("Publish")
    );
    expect(publishButton?.querySelector("svg")?.getAttribute("class")).toContain("lucide-rocket");

    // The DeviceSwitcher relocated into the sub-toolbar (top-bar {actions} are
    // drained — the topbar-slot drainage is asserted in menu-design-editor-flow).
    // Exactly ONE device switcher group renders (no duplicate in a drained top
    // bar): one button per device, by accessible name.
    expect(view.container.querySelectorAll('button[aria-label="Desktop"]').length).toBe(1);
    expect(view.container.querySelector('button[aria-label="Tablet"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Mobile"]')).toBeTruthy();

    // Sub-toolbar: "Page builder" label + relocated controls.
    expect(view.container.textContent).toContain("Page builder");
    expect(view.container.querySelector('button[aria-label="Undo"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Redo"]')).toBeTruthy();
    // Panel toggle, open by default (label "Hide panel"). Its aria-pressed
    // state is asserted with the real Button in page-editor.test.tsx.
    const panelToggle = view.container.querySelector('button[aria-label="Hide panel"]');
    expect(panelToggle).toBeTruthy();

    // The page host provides publish, so NO "Save only" capability badge.
    const badges = Array.from(view.container.querySelectorAll('[data-slot="badge"]'));
    expect(badges.some((badge) => (badge.textContent ?? "").includes("Save only"))).toBe(false);

    // Hide the panel: the toggle flips and the reopen chip appears top-right.
    // (After hiding, both the sub-toolbar toggle and the chip carry
    // aria-label="Show panel"; the chip is the absolutely-positioned one.)
    clickButtonByLabel(view.container, "Hide panel");
    await flush();
    const reopenChip = Array.from(
      view.container.querySelectorAll('button[aria-label="Show panel"]')
    ).find((button) => button.className.includes("right-4") && button.className.includes("top-4"));
    expect(reopenChip).toBeTruthy();
    expect(reopenChip?.className).not.toContain("bottom-6");
    expect(reopenChip?.className).not.toContain("left-1/2");
  } finally {
    view.cleanup();
  }
});

test("resolveToolbarTargetLabel resolves type display names and never block content", () => {
  expect(resolveToolbarTargetLabel({ kind: "block", type: "text" })).toBe("Text");
  expect(resolveToolbarTargetLabel({ kind: "block", type: "statistic" })).toBe("Statistic");
  expect(resolveToolbarTargetLabel({ kind: "block", type: "quote" })).toBe("Quote");
  expect(resolveToolbarTargetLabel({ kind: "section", type: "hero" })).toBe("Hero");
  expect(
    resolveToolbarTargetLabel(
      { kind: "section", type: "feature-grid" },
      {
        fallbackToTypeName: true,
      }
    )
  ).toBe("Feature grid");
  expect(resolveToolbarTargetLabel(null)).toBe("Page");
});

test("PageEditor toolbar aria labels use type names for text, statistic, and quote blocks", async () => {
  pageEditorState.cachedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          blocks: [
            createPageBlockV2("text", {
              id: "blk-text",
              props: { text: "Write the section copy here.", format: "plain" },
            }),
            createPageBlockV2("statistic", {
              id: "blk-stat",
              props: { value: "0" },
            }),
            createPageBlockV2("quote", {
              id: "blk-quote",
              props: { text: "Customer praise quote." },
            }),
          ],
        }),
      ],
    }),
  });
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const toolbarLabel = () =>
      view.container
        .querySelector('[data-page-editor-floating-toolbar="true"]')
        ?.getAttribute("aria-label");

    clickSelector(view.container, '[data-page-editor-section="hero"]');
    await flush();
    expect(toolbarLabel()).toBe("Hero tools");

    const expectations: Array<[string, string]> = [
      ["blk-text", "Text tools"],
      ["blk-stat", "Statistic tools"],
      ["blk-quote", "Quote tools"],
    ];
    for (const [blockId, expected] of expectations) {
      clickSelector(view.container, `[data-page-editor-block-id="${blockId}"]`);
      await flush();
      expect(toolbarLabel()).toBe(expected);
    }

    // Placeholder/user copy never leaks into the toolbar aria text.
    expect(toolbarLabel()).not.toContain("Customer praise quote.");
    const toolbar = view.container.querySelector('[data-page-editor-floating-toolbar="true"]');
    expect(toolbar?.getAttribute("aria-label")).not.toContain("Write the section copy here.");
    expect(toolbar?.getAttribute("aria-label")).not.toBe("0 tools");
  } finally {
    view.cleanup();
  }
});

test("PageEditor toolbar panel icons expose metadata tooltips and toggle a single subpanel", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Every category icon renders through the shared tooltip component with a
    // metadata-driven accessible name; no ad hoc `title` strings remain.
    const panelLabels = [
      "Layout panel",
      "Content panel",
      "Style panel",
      "Background panel",
      "Spacing panel",
      "Responsive panel",
      "Visibility panel",
    ];
    for (const label of panelLabels) {
      const button = view.container.querySelector(`button[aria-label="${label}"]`);
      expect(button).toBeTruthy();
      expect(button?.getAttribute("data-slot")).toBe("tooltip-trigger");
      expect(button?.hasAttribute("title")).toBe(false);
    }
    // TASK-495-02 added a header "Hide options panel" close button in place of
    // the legacy drag handle; TASK-500-03 removed that redundant closer again —
    // the sub-toolbar Hide/Show toggle is the sole hide surface. The surviving
    // head-row actions are still ToolbarIconButton tooltip-triggers.
    for (const label of ["Collapse toolbar", "Duplicate section"]) {
      expect(
        view.container.querySelector(`button[aria-label="${label}"]`)?.getAttribute("data-slot")
      ).toBe("tooltip-trigger");
    }
    // The removed TASK-500-03 closer must not resurface.
    expect(view.container.querySelector('button[aria-label="Hide options panel"]')).toBeNull();

    // Focus (keyboard hover) reveals the metadata description in the tooltip.
    const layoutButton = view.container.querySelector('button[aria-label="Layout panel"]');
    React.act(() => {
      (layoutButton as HTMLButtonElement).focus();
      layoutButton?.dispatchEvent(new FocusEvent("focus"));
    });
    await flush();
    const tooltipContent = document.querySelector('[data-slot="tooltip-content"]');
    expect(tooltipContent?.textContent).toContain(
      "Variant, columns, alignment, and max width presets."
    );

    // Content opens by default and only one subpanel exists at a time.
    expect(view.container.querySelectorAll("[data-page-editor-toolbar-panel]")).toHaveLength(1);
    const panelExpanded = (label: string) =>
      view.container.querySelector(`button[aria-label="${label}"]`)?.getAttribute("aria-expanded");
    expect(panelExpanded("Content panel")).toBe("true");
    expect(panelExpanded("Layout panel")).toBe("false");

    // Clicking the active icon closes its subpanel.
    clickButtonByLabel(view.container, "Content panel");
    await flush();
    expect(view.container.querySelector("[data-page-editor-toolbar-panel]")).toBeNull();
    expect(panelExpanded("Content panel")).toBe("false");

    // Clicking another icon opens exactly one subpanel for that category.
    clickButtonByLabel(view.container, "Visibility panel");
    await flush();
    expect(view.container.querySelectorAll("[data-page-editor-toolbar-panel]")).toHaveLength(1);
    expect(
      view.container
        .querySelector("[data-page-editor-toolbar-panel]")
        ?.getAttribute("data-page-editor-toolbar-panel")
    ).toBe("visibility");
    expect(panelExpanded("Visibility panel")).toBe("true");
  } finally {
    view.cleanup();
  }
});

test("PageEditor subpanel stays viewport-bounded with a sticky header and close action", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButtonByLabel(view.container, "Layout panel");
    await flush();

    const subpanel = view.container.querySelector('[data-page-editor-subpanel="viewport-safe"]');
    expect(subpanel).toBeTruthy();
    expect(subpanel?.className).toContain("max-h-[min(72vh,calc(100dvh-8rem))]");
    expect(subpanel?.className).toContain("overflow-hidden");

    const header = subpanel?.querySelector('[data-page-editor-subpanel-header="true"]');
    expect(header?.className).toContain("shrink-0");
    expect(header?.textContent).toContain("Layout");
    expect(header?.textContent).toContain("Variant, columns, alignment, and max width presets.");

    const scrollBody = subpanel?.querySelector('[data-page-editor-subpanel-scroll="true"]');
    expect(scrollBody?.className).toContain("overflow-y-auto");
    expect(scrollBody?.querySelectorAll("[data-page-editor-control]").length).toBeGreaterThan(0);

    // The close action lives in the sticky header, outside the scroll body.
    const closeButton = subpanel?.querySelector('button[aria-label="Close panel"]');
    expect(closeButton).toBeTruthy();
    expect(header?.contains(closeButton ?? null)).toBe(true);
    expect(scrollBody?.contains(closeButton ?? null)).toBe(false);

    clickButtonByLabel(view.container, "Close panel");
    await flush();
    expect(view.container.querySelector("[data-page-editor-toolbar-panel]")).toBeNull();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("PageEditor shortcuts open and close overlays, clear selection, and ignore editable fields", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    dispatchDocumentKey("k", { ctrlKey: true });
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    const commandDialog = view.container.querySelector(
      '[data-page-editor-command-dialog="viewport-safe"]'
    );
    expect(commandDialog?.className).toContain("max-h-[calc(100dvh_-_8rem)]");
    expect(commandDialog?.className).toContain("overflow-hidden");
    const commandResults = view.container.querySelector(
      '[data-page-editor-command-results-scroll="true"]'
    );
    expect(commandResults).toBeTruthy();
    expect(commandResults?.className).toContain("overflow-y-auto");
    const closeButton = Array.from(commandDialog?.querySelectorAll("button") ?? []).find(
      (button) => button.textContent?.trim() === "Close"
    );
    expect(closeButton?.parentElement?.className).toContain("shrink-0");
    expect(commandResults?.contains(closeButton ?? null)).toBe(false);

    const commandSearch = view.container.querySelector(
      'input[aria-label="Search sections and blocks"]'
    );
    expect(
      view.container.querySelector('[data-page-editor-command-active="true"] span')?.textContent
    ).toBe("Hero");
    dispatchElementKey(commandSearch, "ArrowDown");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-command-active="true"] span')?.textContent
    ).toBe("Content");
    dispatchElementKey(commandSearch, "Enter");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();
    expect(view.container.textContent).toContain("content section");

    dispatchDocumentKey("k", { ctrlKey: true });
    await flush();
    const reopenedCommandSearch = view.container.querySelector(
      'input[aria-label="Search sections and blocks"]'
    );
    dispatchElementKey(reopenedCommandSearch, "Escape");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();

    const field = findFieldControl(view.container, "Primary text");
    React.act(() => {
      field.focus();
    });
    dispatchElementKey(field, "k", { ctrlKey: true });
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();
    dispatchElementKey(field, "Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();

    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor duplicate and delete shortcuts target the selected block through confirmation", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dispatchDocumentKey("d", { metaKey: true });
    await flush();
    dispatchDocumentKey("Delete");
    await flush();

    expect(
      view.container.querySelector('[role="dialog"][aria-label="Delete selected block"]')
    ).toBeTruthy();
    clickButton(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.type)).toEqual([
      "heading",
      "text",
    ]);
    expect(savedDocument.sections[0]?.blocks[1]?.id).toBe("blk-copy");
  } finally {
    view.cleanup();
  }
});

test("PageEditor selected block actions insert, move, duplicate, and delete only that block", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Button");
    await flush();
    clickButtonByLabel(view.container, "Move block up");
    await flush();
    clickButtonByLabel(view.container, "Duplicate block");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    let savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    let savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.type)).toEqual([
      "heading",
      "button",
      "button",
      "text",
    ]);
    expect(savedDocument.sections[0]?.blocks[1]?.id).not.toBe(
      savedDocument.sections[0]?.blocks[2]?.id
    );

    clickButtonByLabel(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.type)).toEqual([
      "heading",
      "button",
      "text",
    ]);
    expect(savedDocument.sections[0]?.blocks[2]?.id).toBe("blk-copy");
  } finally {
    view.cleanup();
  }
});

test("PageEditor reserves right-rail padding on the canvas scroller while a selection is active (builder chrome)", async () => {
  // TASK-495-02: the builder chrome (page host) docks the panel into a light
  // right rail, so the canvas reserves RIGHT padding (not bottom clearance) so
  // the centered frame is not occluded by the overlay. The legacy bottom
  // clearance (ResizeObserver + --page-editor-toolbar-clearance) is retained
  // for the menu host only.
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const scroller = view.container.querySelector(
      '[data-page-editor-canvas-scroller="true"]'
    ) as HTMLElement;
    expect(scroller).toBeTruthy();

    // The editor auto-selects the first section, so the right rail is visible
    // and right padding is reserved from the start.
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
    expect(scroller.style.paddingRight).toBe("300px");
    // The builder branch never sets the legacy bottom-clearance var.
    expect(scroller.style.paddingBottom).toBe("");
    expect(scroller.style.getPropertyValue("--page-editor-toolbar-clearance")).toBe("");

    // Escape clears the selection: the rail unmounts and the padding is
    // released with it.
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeFalsy();
    expect(scroller.style.paddingRight).toBe("");

    // Selecting a block restores the right padding.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    expect(scroller.style.paddingRight).toBe("300px");
  } finally {
    view.cleanup();
  }
});

// ---------------------------------------------------------------------------
// TASK-521-05-L01/L02 — compact page-settings side panel relocation + Effects.
// (Uses the shared flow harness above; the default page host has no
// `renderSettings`, so the compact panel — not the full-height Sheet — is the
// settings surface.)
// ---------------------------------------------------------------------------
