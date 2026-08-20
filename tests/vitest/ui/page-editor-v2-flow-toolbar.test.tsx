// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  activeSurfaceState,
  clickButton,
  clickButtonByLabel,
  clickSelector,
  collectionClientsState,
  createDocument,
  createPage,
  findButton,
  findSegmentedGroup,
  flush,
  formsClientState,
  mount,
  pageEditorFlowMockFactories,
  pageEditorState,
  previewDialogState,
  siteSettingsState,
  toastState,
} from "./pageEditorFlowTestUtils";

import { PageEditor, resolveToolbarTargetLabel } from "../../../core/admin/ui/pages/PageEditor";

import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  editorCanvasCtaButtonClass,
  editorDarkButtonClass,
  editorDarkGhostButtonClass,
  editorPanelButtonClass,
  editorPanelGhostButtonClass,
  editorPanelSegmentTrackClass,
} from "../../../core/admin/ui/pages/editorControls/controlChrome";

vi.mock("sonner", () => pageEditorFlowMockFactories.sonner);
vi.mock("@/components/ui/alert", () => pageEditorFlowMockFactories.alert);
vi.mock("@/components/ui/button", () => pageEditorFlowMockFactories.button);
vi.mock("@/ui/shared/ConfirmActionDialog", () => pageEditorFlowMockFactories.confirmDialog);
vi.mock("@/components/ui/sheet", () => pageEditorFlowMockFactories.sheet);
vi.mock("@/services/apiClient", () => pageEditorFlowMockFactories.apiClient);
vi.mock("@/services/cachePolicy", () => pageEditorFlowMockFactories.cachePolicy);
vi.mock("@/services/settingsClient", () => pageEditorFlowMockFactories.settingsClient);
vi.mock("@/services/pagesClient", () => pageEditorFlowMockFactories.pagesClient);
vi.mock("@/ui/layouts/EditorShell", () => pageEditorFlowMockFactories.editorShell);
vi.mock(
  "@/ui/assistant/activeSurfaceContext",
  () => pageEditorFlowMockFactories.activeSurfaceContext
);
vi.mock("@/utils/cacheBus", () => pageEditorFlowMockFactories.cacheBus);
vi.mock("@/services/mediaClient", () => pageEditorFlowMockFactories.mediaClient);
vi.mock("@/services/formsClient", () => pageEditorFlowMockFactories.formsClient);
vi.mock("@/services/contentTypesClient", () => pageEditorFlowMockFactories.contentTypesClient);
vi.mock("@/services/entriesClient", () => pageEditorFlowMockFactories.entriesClient);
vi.mock("@/services/listingsClient", () => pageEditorFlowMockFactories.listingsClient);
vi.mock("@/ui/media/MediaPicker", () => pageEditorFlowMockFactories.mediaPicker);
vi.mock(
  "@/ui/preview/RuntimePreviewDialog",
  () => pageEditorFlowMockFactories.runtimePreviewDialog
);

beforeEach(() => {
  pageEditorState.reset();
  activeSurfaceState.reset();
  previewDialogState.reset();
  toastState.success.mockClear();
  toastState.error.mockClear();
  siteSettingsState.reset();
  formsClientState.reset();
  collectionClientsState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

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

test("PageEditor per-gap insert zones open the palette pre-targeted and insert at the gap index", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // The persistent top-of-canvas button stays alongside the per-gap zones.
    expect(findButton(view.container, "Add section")).toBeTruthy();
    // One section renders a gap above (0) and below (1).
    expect(view.container.querySelector('[data-page-editor-section-gap="0"]')).toBeTruthy();
    expect(view.container.querySelector('[data-page-editor-section-gap="1"]')).toBeTruthy();

    // Insert at the gap ABOVE the existing hero section.
    clickButtonByLabel(view.container, "Add section at position 1");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    clickButton(view.container, "FAQ");
    await flush();

    // Insert at the trailing gap (now index 2) below the last section.
    clickButtonByLabel(view.container, "Add section at position 3");
    await flush();
    clickButton(view.container, "CTA");
    await flush();

    // The top button still appends (gap pre-targeting resets between opens).
    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Content");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections.map((section) => section.type)).toEqual([
      "faq",
      "hero",
      "cta",
      "content",
    ]);
    expect(savedDocument.sections[1]?.id).toBe("sec-hero");
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
