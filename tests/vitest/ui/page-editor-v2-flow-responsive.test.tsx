// @vitest-environment happy-dom

import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  activeSurfaceState,
  clickButton,
  clickButtonByLabel,
  clickSelector,
  collectionClientsState,
  createDocument,
  createPage,
  findColorSwatchGroup,
  findEditorSectionContent,
  findSegmentedGroup,
  flush,
  formsClientState,
  mediaLibraryState,
  mount,
  pageEditorFlowMockFactories,
  pageEditorState,
  previewDialogState,
  setToggleField,
  siteSettingsState,
  toastState,
} from "./pageEditorFlowTestUtils";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

import {
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  getPageEditorControlsForTarget,
  type PageEditorControlDefinition,
  type PageEditorControlPanel,
} from "../../../core/services/pages/pageEditorControlRegistry";

import { resolvePageEditorControlUiModel } from "../../../core/services/pages/pageEditorControlUiModel";

import { getPageBlockRenderDefault } from "../../../core/services/pages/pageBlockRenderDefaults";

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

const openResponsivePanel = (container: ParentNode) => {
  clickButtonByLabel(container, "Responsive panel");
  const panel = container.querySelector('[data-page-editor-toolbar-panel="responsive"]');
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
};

const lastSavedDocument = (): PageDocumentV2 =>
  pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;

test("PageEditor Responsive panel hide toggles write per-breakpoint visibility and reset restores inheritance", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const panel = openResponsivePanel(view.container);
    // All three per-breakpoint hide toggles render as real switches.
    const switches = Array.from(panel.querySelectorAll('[role="switch"]')).map((node) =>
      node.getAttribute("aria-label")
    );
    expect(switches).toEqual([
      "Hide on desktop",
      "Hide on tablet",
      "Hide on mobile",
      "Stack vertically",
    ]);
    expect(
      panel
        .querySelector('[data-page-editor-responsive-hide="desktop"]')
        ?.getAttribute("data-page-editor-responsive-hide-state")
    ).toBe("base");
    expect(
      panel
        .querySelector('[data-page-editor-responsive-hide="mobile"]')
        ?.getAttribute("data-page-editor-responsive-hide-state")
    ).toBe("inherited");

    // Hide on mobile writes the EXISTING responsive.mobile.visibility.visible
    // override path while the active canvas device stays desktop.
    setToggleField(panel, "Hide on mobile", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    let saved = lastSavedDocument();
    expect(saved.sections[0]?.visibility.visible).toBe(true);
    expect(saved.sections[0]?.responsive.mobile?.visibility).toEqual({ visible: false });

    // The toggle row now reports an override and exposes the reset action.
    const mobileRow = view.container.querySelector(
      '[data-page-editor-responsive-hide="mobile"]'
    ) as HTMLElement;
    expect(mobileRow.getAttribute("data-page-editor-responsive-hide-state")).toBe("override");
    clickSelector(mobileRow, 'button[aria-label="Reset Hide on mobile to inherited"]');
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    expect(saved.sections[0]?.responsive.mobile).toBeUndefined();

    // Hide on desktop writes the BASE visibility, not an override container.
    const refreshedPanel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    setToggleField(refreshedPanel, "Hide on desktop", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    expect(saved.sections[0]?.visibility.visible).toBe(false);
    expect(saved.sections[0]?.responsive.tablet).toBeUndefined();
    expect(saved.sections[0]?.responsive.mobile).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor Responsive panel stack toggle writes layout.stackVertical per device and the override list resets it", async () => {
  const twoColumnPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          variant: "centered",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Welcome to Coderso", level: "h1", align: "center" },
            }),
            createPageBlockV2("text", {
              id: "blk-copy",
              props: { text: "Existing page copy.", format: "plain", align: "center" },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = twoColumnPage;
  pageEditorState.currentPage = twoColumnPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={twoColumnPage} />);

  try {
    await flush();
    expect(findEditorSectionContent(view.container, "sec-hero").className).toContain("grid-cols-2");

    // Desktop context writes the base field.
    let panel = openResponsivePanel(view.container);
    expect(
      panel.querySelector('[data-page-editor-responsive-override-list="desktop"]')?.textContent
    ).toContain("Desktop is the base");
    setToggleField(panel, "Stack vertically", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    let saved = lastSavedDocument();
    expect(saved.sections[0]?.layout.stackVertical).toBe(true);
    expect(saved.sections[0]?.responsive.mobile).toBeUndefined();
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    setToggleField(panel, "Stack vertically", false);
    await flush();

    // Mobile context writes the responsive.mobile.layout override.
    clickButtonByLabel(view.container, "Mobile");
    await flush();
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    setToggleField(panel, "Stack vertically", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    expect(saved.sections[0]?.layout.stackVertical).toBe(false);
    expect(saved.sections[0]?.responsive.mobile?.layout).toEqual({ stackVertical: true });

    // The canvas section grid visibly stacks at the mobile context.
    const stackedContent = findEditorSectionContent(view.container, "sec-hero");
    expect(stackedContent.className).toContain("grid-cols-1");
    expect(stackedContent.className).not.toContain("grid-cols-2");

    // The per-field override list shows the override entry with a reset action.
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    const entry = panel.querySelector(
      '[data-page-editor-override-entry="section.layout.stackVertical"]'
    ) as HTMLElement;
    expect(entry.getAttribute("data-page-editor-override-state")).toBe("override");
    expect(
      panel.querySelectorAll('[data-page-editor-override-state="inherited"]').length
    ).toBeGreaterThan(0);
    clickSelector(entry, '[data-page-editor-override-reset="section.layout.stackVertical"]');
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    expect(saved.sections[0]?.responsive.mobile).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor Responsive panel targets the selected block and projects its override list", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    const panel = openResponsivePanel(view.container);
    expect(
      panel
        .querySelector("[data-page-editor-responsive-panel]")
        ?.getAttribute("data-page-editor-responsive-panel")
    ).toBe("block");
    // Block targets expose the hide toggles but no section stacking surface.
    const switches = Array.from(panel.querySelectorAll('[role="switch"]')).map((node) =>
      node.getAttribute("aria-label")
    );
    expect(switches).toEqual(["Hide on desktop", "Hide on tablet", "Hide on mobile"]);

    setToggleField(panel, "Hide on tablet", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();
    const saved = lastSavedDocument();
    const heading = saved.sections[0]?.blocks[0];
    expect(heading?.visibility.visible).toBe(true);
    expect(heading?.responsive?.tablet?.visibility).toEqual({ visible: false });

    // The override list projects block fields at the tablet context.
    clickButtonByLabel(view.container, "Tablet");
    await flush();
    const tabletPanel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="responsive"]'
    ) as HTMLElement;
    const visibilityEntry = tabletPanel.querySelector(
      '[data-page-editor-override-entry="block.visibility.visible"]'
    );
    expect(visibilityEntry?.getAttribute("data-page-editor-override-state")).toBe("override");
    expect(
      tabletPanel
        .querySelector('[data-page-editor-override-entry="block.heading.props.text"]')
        ?.getAttribute("data-page-editor-override-state")
    ).toBe("inherited");
  } finally {
    view.cleanup();
  }
});

test("PageEditor breakpoint switcher shows labels with width readouts and the editing-scope pill follows the device", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Visible labels + canonical px readouts on the switcher (not icon-only).
    for (const [label, width] of [
      ["Desktop", "1080"],
      ["Tablet", "744"],
      ["Mobile", "390"],
    ] as const) {
      const button = view.container.querySelector(`button[aria-label="${label}"]`);
      expect(button?.textContent).toContain(label);
      expect(button?.textContent).toContain(width);
    }

    // Canvas context bar and the floating-panel scope pill share the readout.
    expect(
      view.container.querySelector('[data-page-editor-canvas-context="desktop"]')?.textContent
    ).toBe("Desktop · 1080px · base view");
    expect(
      view.container.querySelector('[data-page-editor-editing-scope="desktop"]')?.textContent
    ).toBe("Editing: Desktop · 1080px (base)");

    clickButtonByLabel(view.container, "Mobile");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-canvas-context="mobile"]')?.textContent
    ).toBe("Mobile · 390px · override context");
    expect(
      view.container.querySelector('[data-page-editor-editing-scope="mobile"]')?.textContent
    ).toBe("Editing: Mobile · 390px (overrides)");
  } finally {
    view.cleanup();
  }
});

/**
 * Effective-value display contract (TASK-449 owner bug #9, round 3): every
 * floating-panel control must PRESENT the document's effective value for the
 * active breakpoint — the stored value, the effective render default from
 * `pageBlockRenderDefaults` when unset (what the renderer actually paints:
 * baked text classes, grid-stretch frame width), the registry schema fallback
 * next, and an honest empty state (no active option / slider at minimum) only
 * when no single effective rendered value exists. The helpers below are
 * shared by the targeted tests and the full panel sweep.
 */

const floatingPanelButtonLabels: Partial<Record<PageEditorControlPanel, string>> = {
  layout: "Layout panel",
  content: "Content panel",
  typography: "Typography panel",
  style: "Style panel",
  spacing: "Spacing panel",
  background: "Background panel",
  responsive: "Responsive panel",
  visibility: "Visibility panel",
};

const openFloatingPanel = async (container: ParentNode, panel: PageEditorControlPanel) => {
  if (container.querySelector(`[data-page-editor-toolbar-panel="${panel}"]`)) return;
  clickButtonByLabel(container, floatingPanelButtonLabels[panel] ?? `${panel} panel`);
  await flush();
};

/** Reads the value a rendered floating-panel control currently presents. */
const readControlDisplayValue = (
  container: ParentNode,
  control: PageEditorControlDefinition
): string => {
  const model = resolvePageEditorControlUiModel(control);
  if (model.kind === "segmented") {
    const group = findSegmentedGroup(container, control.label);
    const active = group.querySelector(
      '[data-page-editor-segmented-option][aria-pressed="true"]'
    ) as HTMLElement | null;
    return active?.dataset.pageEditorSegmentedOption ?? "";
  }
  if (model.kind === "select") {
    const select = Array.from(container.querySelectorAll('[data-page-editor-control="select"]'))
      .find((entry) => entry.textContent?.includes(control.label))
      ?.querySelector("select");
    expect(select, control.id).toBeTruthy();
    return (select as HTMLSelectElement).value;
  }
  if (model.kind === "slider" || model.kind === "sliderStepper") {
    const slider = container.querySelector(
      `input[type="range"][data-page-editor-slider="${control.label}"]`
    );
    expect(slider, control.id).toBeTruthy();
    return (slider as HTMLInputElement).value;
  }
  if (model.kind === "toggle") {
    const toggle = Array.from(container.querySelectorAll('[role="switch"]')).find(
      (entry) => entry.getAttribute("aria-label") === control.label
    );
    expect(toggle, control.id).toBeTruthy();
    return toggle?.getAttribute("aria-checked") === "true" ? "yes" : "no";
  }
  if (model.kind === "swatch") {
    const group = findColorSwatchGroup(container, control.label);
    const transparent = group.querySelector('[data-page-editor-color-swatch="transparent"]');
    if (transparent?.getAttribute("aria-pressed") === "true") return "";
    const hex = group.querySelector(`input[data-page-editor-color-hex="${control.label}"]`);
    expect(hex, control.id).toBeTruthy();
    return (hex as HTMLInputElement).value;
  }
  if (model.kind === "media") {
    const host = container.querySelector(
      `[data-page-editor-media-control="${control.label}"] [data-media-picker-value]`
    );
    expect(host, control.id).toBeTruthy();
    return host?.getAttribute("data-media-picker-value") ?? "";
  }
  const field = Array.from(container.querySelectorAll('[data-page-editor-control="text"]'))
    .find((entry) => entry.textContent?.includes(control.label))
    ?.querySelector("input");
  expect(field, control.id).toBeTruthy();
  return (field as HTMLInputElement).value;
};

const readDocumentPath = (source: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>(
    (current, key) =>
      current && typeof current === "object" && !Array.isArray(current)
        ? (current as Record<string, unknown>)[key]
        : undefined,
    source
  );

/**
 * The expected display: the document's stored value at the control path,
 * falling back to the effective render default (`pageBlockRenderDefaults`,
 * for block targets), then to the registry schema default, with the
 * per-widget honest empty states (no pressed option, slider at clamp
 * minimum, transparent swatch for null colors).
 */
const expectedControlDisplayValue = (
  target: unknown,
  control: PageEditorControlDefinition,
  renderDefault?: string | number
): string => {
  const stored = readDocumentPath(target, control.path);
  const model = resolvePageEditorControlUiModel(control);
  if (model.kind === "toggle") {
    const effective = typeof stored === "boolean" ? stored : control.fallback === true;
    return effective ? "yes" : "no";
  }
  if (model.kind === "slider" || model.kind === "sliderStepper") {
    const effective =
      typeof stored === "number"
        ? stored
        : typeof renderDefault === "number"
          ? renderDefault
          : typeof control.fallback === "number"
            ? control.fallback
            : model.min;
    return String(Math.min(model.max, Math.max(model.min, effective)));
  }
  if (model.kind === "swatch") return typeof stored === "string" ? stored : "";
  if (model.kind === "media") {
    if (typeof stored !== "string" || stored.length === 0) return "";
    return mediaLibraryState.items.find((item) => item.url === stored)?.id ?? "";
  }
  if (typeof stored === "string") return stored;
  if (typeof stored === "number" || typeof stored === "boolean") return String(stored);
  if (typeof renderDefault === "string") return renderDefault;
  return typeof control.fallback === "string" ? control.fallback : "";
};

test("PageEditor floating panel marks the stored heading level and shows effective render defaults", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  const pressedOption = (label: string) =>
    (
      findSegmentedGroup(view.container, label).querySelector(
        '[data-page-editor-segmented-option][aria-pressed="true"]'
      ) as HTMLElement | null
    )?.dataset.pageEditorSegmentedOption;

  try {
    await flush();

    // Stored level h1 must be the pressed Level option (owner bug #9).
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    await openFloatingPanel(view.container, "content");
    expect(pressedOption("Level")).toBe("h1");

    // Unset opacity renders fully opaque: the slider must present the schema
    // default 1, never the zero-value lie.
    await openFloatingPanel(view.container, "style");
    const opacity = view.container.querySelector(
      'input[type="range"][data-page-editor-slider="Opacity"]'
    ) as HTMLInputElement;
    expect(opacity.value).toBe("1");
    expect(
      opacity.closest('[data-page-editor-control="slider"]')?.querySelector("output")?.textContent
    ).toBe("1");
    // Unset radius/shadow display their schema defaults.
    expect(
      (
        view.container.querySelector(
          'input[type="range"][data-page-editor-slider="Radius"]'
        ) as HTMLInputElement
      ).value
    ).toBe("0");
    expect(pressedOption("Shadow")).toBe("none");

    // Owner finding #9 (round 3): unset block width/align display the
    // EFFECTIVE RENDERED default as active — the grid-stretch frame spans the
    // full column ("full") and the content text flows left ("left").
    await openFloatingPanel(view.container, "layout");
    expect(pressedOption("Width")).toBe("full");
    expect(pressedOption("Align")).toBe("left");

    // Unset typography tokens display the h1's baked styling as active:
    // sans page font, text-5xl, font-semibold, leading-tight (1.25).
    await openFloatingPanel(view.container, "typography");
    expect(pressedOption("Font family")).toBe("sans");
    expect(pressedOption("Font size")).toBe("5xl");
    expect(pressedOption("Font weight")).toBe("semibold");
    expect(
      (
        view.container.querySelector(
          'input[type="range"][data-page-editor-slider="Line height"]'
        ) as HTMLInputElement
      ).value
    ).toBe("1.25");
    // The hero-starter heading STORES props.align center: Text align must
    // present the stored value, not a render default.
    expect(pressedOption("Text align")).toBe("center");
  } finally {
    view.cleanup();
  }
});

test("PageEditor floating panel presents stored values and tablet overrides per breakpoint", async () => {
  const page = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-heading",
              props: { text: "Breakpoint heading", level: "h1", align: "center" },
              style: { opacity: 0.4 },
              responsive: {
                tablet: { props: { level: "h3" }, style: { opacity: 0.6 } },
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();

    const pressedLevel = () =>
      (
        findSegmentedGroup(view.container, "Level").querySelector(
          '[data-page-editor-segmented-option][aria-pressed="true"]'
        ) as HTMLElement | null
      )?.dataset.pageEditorSegmentedOption;
    const opacityValue = () =>
      (
        view.container.querySelector(
          'input[type="range"][data-page-editor-slider="Opacity"]'
        ) as HTMLInputElement
      ).value;

    // Desktop presents the base values.
    await openFloatingPanel(view.container, "content");
    expect(pressedLevel()).toBe("h1");
    await openFloatingPanel(view.container, "style");
    expect(opacityValue()).toBe("0.4");

    // Tablet presents the override values.
    clickButtonByLabel(view.container, "Tablet");
    await flush();
    expect(opacityValue()).toBe("0.6");
    await openFloatingPanel(view.container, "content");
    expect(pressedLevel()).toBe("h3");

    // Mobile has no override: it presents the inherited base values.
    clickButtonByLabel(view.container, "Mobile");
    await flush();
    expect(pressedLevel()).toBe("h1");
    await openFloatingPanel(view.container, "style");
    expect(opacityValue()).toBe("0.4");

    // Back on desktop the base values are untouched.
    clickButtonByLabel(view.container, "Desktop");
    await flush();
    expect(opacityValue()).toBe("0.4");
    await openFloatingPanel(view.container, "content");
    expect(pressedLevel()).toBe("h1");
  } finally {
    view.cleanup();
  }
});

test("PageEditor floating-panel sweep: every rendered control presents the document's effective value", async () => {
  const sweepSection = createPageSectionV2("hero", {
    id: "sec-sweep",
    name: "Sweep hero",
    variant: "centered",
    layout: { columns: 2, align: "center", justify: "between", maxWidth: 960 },
    style: {
      background: "#fef3c7",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#123456",
      radius: 12,
      shadow: "md",
    },
    spacing: { paddingTop: 32, paddingBottom: 48, paddingLeft: 24, paddingRight: 16, gap: 12 },
    blocks: [
      createPageBlockV2("text", {
        id: "blk-sweep",
        props: { text: "Sweep copy.", format: "plain", align: "center" },
        style: {
          width: "full",
          textColor: "#123456",
          opacity: 0.4,
          padding: { top: 8 },
          fontWeight: "bold",
          letterSpacing: 1.5,
        },
      }),
    ],
  });
  const page = createPage({
    currentData: createDocument({ sections: [sweepSection] }),
  });
  pageEditorState.cachedPage = page;
  pageEditorState.currentPage = page;
  const view = mount(<PageEditor pageId="page-1" initialPage={page} />);

  try {
    await flush();

    const sweptControlIds: string[] = [];
    const sweepTarget = async (
      target: unknown,
      controls: readonly PageEditorControlDefinition[],
      panels: readonly PageEditorControlPanel[],
      block?: PageBlockV2
    ) => {
      for (const panel of panels) {
        await openFloatingPanel(view.container, panel);
        const visibleControls = controls
          .filter((entry) => entry.panel === panel)
          .filter(
            (entry) =>
              entry.id !== "block.style.backgroundImage" || block?.style?.backgroundType === "image"
          );
        for (const control of visibleControls) {
          expect(readControlDisplayValue(view.container, control), control.id).toBe(
            expectedControlDisplayValue(
              target,
              control,
              block ? getPageBlockRenderDefault(block, control.path) : undefined
            )
          );
          sweptControlIds.push(control.id);
        }
      }
    };

    // Section sweep: the first section is selected by default.
    await sweepTarget(
      sweepSection,
      getPageEditorControlsForTarget({ kind: "section", type: "hero" }),
      ["layout", "style", "background", "spacing", "visibility", "responsive"]
    );

    // Block sweep: a text block with a partial style (stored + unset fields).
    // Unset fields with a baked render default (width/align/typography) must
    // display it; stored fields must beat it (owner finding #9 round 3).
    clickSelector(view.container, '[data-page-editor-block-id="blk-sweep"]');
    await flush();
    await sweepTarget(
      sweepSection.blocks[0],
      getPageEditorControlsForTarget({ kind: "block", type: "text" }),
      ["content", "typography", "layout", "style", "background", "spacing", "visibility"],
      sweepSection.blocks[0]
    );

    // The sweep must have exercised the full registry surface of both targets.
    expect(sweptControlIds.length).toBeGreaterThanOrEqual(40);
    expect(new Set(sweptControlIds).size).toBe(sweptControlIds.length);
  } finally {
    view.cleanup();
  }
});

// --- Multi-column canvas authoring UX (owner findings #5 #6 #7 #8) ---
