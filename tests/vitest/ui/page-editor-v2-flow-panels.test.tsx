// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  activeSurfaceState,
  clickButton,
  clickButtonByLabel,
  clickSegmentedOption,
  clickSelector,
  collectionClientsState,
  createDocument,
  createPage,
  findColorSwatchGroup,
  findEditorBlock,
  findEditorSectionContent,
  findSegmentedGroup,
  flush,
  formsClientState,
  mount,
  pageEditorFlowMockFactories,
  pageEditorState,
  previewDialogState,
  setSliderField,
  siteSettingsState,
  toastState,
} from "./pageEditorFlowTestUtils";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

import {
  createPageBlockV2,
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";

import { toPageTypographyCssVariableMap } from "../../../core/ui/theme/tokenCss";

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

const lastSavedDocument = (): PageDocumentV2 =>
  pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;

test("PageEditor inserts a collection block, binds type/query/template through scoped comboboxes, previews entries inert, and clears the query on type change", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  const comboboxTrigger = (label: string) =>
    view.container.querySelector(`button[data-page-editor-combobox-trigger="${label}"]`);
  const openCombobox = async (label: string) => {
    const trigger = comboboxTrigger(label);
    expect(trigger).toBeTruthy();
    React.act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
  };
  const readOptionValues = () =>
    Array.from(view.container.querySelectorAll("[data-page-editor-combobox-option]")).map(
      (option) => option.getAttribute("data-page-editor-combobox-option")
    );
  const pickOption = async (value: string) => {
    clickSelector(view.container, `[data-page-editor-combobox-option="${value}"] button`);
    await flush();
    await flush();
  };

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Collection");
    await flush();

    // Default props: contentTypeId null -> the canvas shows the pick-a-type
    // empty state (the fail-closed authoring entry point).
    const canvasCollectionBlock = view.container.querySelector(
      '[data-page-editor-block="collection"]'
    );
    expect(canvasCollectionBlock).toBeTruthy();
    expect(canvasCollectionBlock?.textContent).toContain(
      "Pick a content type in the Content panel to preview entries here."
    );

    // The Content panel renders the three comboboxes plus the limit slider
    // (bounded-number upgrade of the unified owner clamp 1..24, TASK-459-03).
    expect(comboboxTrigger("Content type")?.textContent).toContain("Pick a content type");
    expect(comboboxTrigger("Saved query")?.textContent).toContain("Pick a saved query");
    expect(comboboxTrigger("Listing template")?.textContent).toContain("Pick a listing template");
    const limitSlider = view.container.querySelector<HTMLInputElement>(
      'input[data-page-editor-slider="Limit"]'
    );
    expect(limitSlider).toBeTruthy();
    expect(limitSlider?.min).toBe("1");
    expect(limitSlider?.max).toBe("24");
    // TASK-459-03 visitor pagination controls ride the same panel: the mode
    // strip and the page-size slider with the same owner clamp.
    const pageSizeSlider = view.container.querySelector<HTMLInputElement>(
      'input[data-page-editor-slider="Page size"]'
    );
    expect(pageSizeSlider).toBeTruthy();
    expect(pageSizeSlider?.min).toBe("1");
    expect(pageSizeSlider?.max).toBe("24");

    // With no content type picked, the scoped saved-query source is honestly
    // empty: only the "None" row of the nullable schema remains.
    await openCombobox("Saved query");
    expect(readOptionValues()).toEqual(["none"]);
    await openCombobox("Saved query"); // close again

    // Pick the content type through the dynamic combobox (id -> name).
    await openCombobox("Content type");
    expect(collectionClientsState.listContentTypes).toHaveBeenCalled();
    expect(readOptionValues()).toEqual(["none", "ct-services", "ct-projects"]);
    await pickOption("ct-services");

    // Canvas preview: the shared content-list markup fed by the cached
    // clients, inert (pointer events off); published entries only, limit
    // respected by the runtime-parity mapper.
    expect(collectionClientsState.listEntries).toHaveBeenCalledWith("services");
    const preview = view.container.querySelector('[data-page-editor-collection-preview="inert"]');
    expect(preview).toBeTruthy();
    expect(preview?.textContent).toContain("Site audit");
    expect(preview?.textContent).toContain("Care plan");
    expect(preview?.textContent).not.toContain("Unpublished service");
    expect(comboboxTrigger("Content type")?.textContent).toContain("Services");

    // The saved-query combobox is now scoped to the picked content type.
    await openCombobox("Saved query");
    expect(readOptionValues()).toEqual(["none", "query-services"]);
    await pickOption("query-services");
    expect(comboboxTrigger("Saved query")?.textContent).toContain("Featured services");

    // Listing template picker resolves through the cached listings client.
    await openCombobox("Listing template");
    expect(readOptionValues()).toEqual(["none", "tpl-grid"]);
    await pickOption("tpl-grid");
    expect(comboboxTrigger("Listing template")?.textContent).toContain("Service grid");

    // Switching the content type clears the scoped saved query in the same
    // write: queries belong to one content type and must never dangle.
    await openCombobox("Content type");
    await pickOption("ct-projects");
    expect(comboboxTrigger("Saved query")?.textContent).toContain("Pick a saved query");
    await openCombobox("Saved query");
    expect(readOptionValues()).toEqual(["none", "query-projects"]);
    await openCombobox("Saved query"); // close again

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedCollectionBlock = savedDocument.sections[0]?.blocks.at(-1);
    expect(savedCollectionBlock).toMatchObject({
      type: "collection",
      props: {
        contentTypeId: "ct-projects",
        queryId: null,
        limit: 6,
        templateId: "tpl-grid",
      },
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor section variant control is type-scoped and base-only", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    clickButtonByLabel(view.container, "Layout panel");
    const variantControl = view.container.querySelector(
      '[data-page-editor-section-variant-control="base"]'
    );
    expect(variantControl).toBeTruthy();
    // The variant preset renders segmented pills, never a native select.
    expect(variantControl?.querySelector("select")).toBeNull();
    expect(
      Array.from(
        variantControl?.querySelectorAll<HTMLButtonElement>(
          "[data-page-editor-segmented-option]"
        ) ?? []
      ).map((button) => button.dataset.pageEditorSegmentedOption)
    ).toEqual(["default", "split", "centered", "full-width"]);

    clickSegmentedOption(view.container, "Variant", "split");
    await flush();

    const content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.className).toContain("page-section-template-hero-split");
    expect(content.className).toContain("grid-cols-2");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.variant).toBe("split");
    expect(savedDocument.sections[0]?.responsive.mobile).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor hero and button inspector panels render dedicated widgets with no native selects", async () => {
  const buttonPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero",
          name: "Hero",
          variant: "centered",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-button",
              props: { label: "Go", href: "/go", target: "self", variant: "primary", size: "md" },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = buttonPage;
  pageEditorState.currentPage = buttonPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={buttonPage} />);

  try {
    await flush();

    const panelEl = () => {
      const panel = view.container.querySelector("[data-page-editor-toolbar-panel]");
      expect(panel).toBeTruthy();
      return panel as HTMLElement;
    };
    const countWidgets = (kind: string) =>
      panelEl().querySelectorAll(`[data-page-editor-control="${kind}"]`).length;

    // Section panels (hero selected, no block selection).
    clickButtonByLabel(view.container, "Layout panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(panelEl().querySelectorAll('input[type="number"]')).toHaveLength(0);
    expect(countWidgets("segmented")).toBeGreaterThan(0); // columns, align, justify, variant
    expect(countWidgets("slider-stepper")).toBeGreaterThan(0); // max width

    clickButtonByLabel(view.container, "Style panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(panelEl().querySelectorAll('input[type="number"]')).toHaveLength(0);
    expect(countWidgets("color-swatch")).toBeGreaterThan(0); // accent
    expect(countWidgets("slider")).toBeGreaterThan(0); // radius
    expect(countWidgets("segmented")).toBeGreaterThan(0); // shadow

    clickButtonByLabel(view.container, "Background panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(countWidgets("segmented")).toBeGreaterThan(0); // background type
    expect(countWidgets("color-swatch")).toBeGreaterThan(0); // background color
    expect(countWidgets("media")).toBeGreaterThan(0); // background image

    clickButtonByLabel(view.container, "Spacing panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(panelEl().querySelectorAll('input[type="number"]')).toHaveLength(0);
    expect(countWidgets("slider-stepper")).toBeGreaterThan(0); // paddings, gap

    clickButtonByLabel(view.container, "Visibility panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(countWidgets("toggle")).toBeGreaterThan(0); // visible, auth only, date range

    // The Responsive panel renders its dedicated control content (TASK-425):
    // the breakpoint-state readout, per-breakpoint hide toggles, and the
    // section vertical-layout toggle — all role="switch" widgets, no natives.
    clickButtonByLabel(view.container, "Responsive panel");
    expect(panelEl().querySelector("[data-page-editor-responsive-target-state]")).toBeTruthy();
    expect(countWidgets("toggle")).toBe(4); // hide desktop/tablet/mobile + stack vertically
    expect(panelEl().querySelectorAll('[role="switch"]')).toHaveLength(4);
    expect(panelEl().querySelector("[data-page-editor-responsive-override-list]")).toBeTruthy();
    expect(panelEl().querySelectorAll("input, select")).toHaveLength(0);

    // Button block panels.
    clickSelector(view.container, '[data-page-editor-block-id="blk-button"]');
    await flush();
    clickButtonByLabel(view.container, "Content panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(countWidgets("segmented")).toBeGreaterThan(0); // target, variant, size
    expect(countWidgets("text")).toBeGreaterThan(0); // label and href stay free-form text

    clickButtonByLabel(view.container, "Style panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(panelEl().querySelectorAll('input[type="number"]')).toHaveLength(0);
    expect(countWidgets("color-swatch")).toBeGreaterThan(0); // text color, border color
    expect(countWidgets("slider")).toBeGreaterThan(0); // opacity, radius
    expect(countWidgets("segmented")).toBeGreaterThan(0); // shadow

    clickButtonByLabel(view.container, "Visibility panel");
    expect(panelEl().querySelectorAll("select")).toHaveLength(0);
    expect(countWidgets("toggle")).toBeGreaterThan(0); // visible
  } finally {
    view.cleanup();
  }
});

test("PageEditor typography panel appears only for text-capable block selections", async () => {
  const mixedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-typo-matrix",
          name: "Typography matrix",
          blocks: [
            createPageBlockV2("heading", { id: "blk-h" }),
            createPageBlockV2("text", { id: "blk-t" }),
            createPageBlockV2("button", { id: "blk-b" }),
            createPageBlockV2("quote", { id: "blk-q", props: { text: "Quoted", cite: "" } }),
            createPageBlockV2("statistic", { id: "blk-s" }),
            createPageBlockV2("list", { id: "blk-l", props: { items: ["One"], ordered: false } }),
            createPageBlockV2("card", { id: "blk-c" }),
            createPageBlockV2("image", { id: "blk-i" }),
            createPageBlockV2("divider", { id: "blk-d" }),
            createPageBlockV2("spacer", { id: "blk-sp" }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = mixedPage;
  pageEditorState.currentPage = mixedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={mixedPage} />);

  try {
    await flush();

    const typographyButton = () =>
      view.container.querySelector('button[aria-label="Typography panel"]');

    // Section selections never expose the Typography panel (no consolidated
    // section text surface by owner contract).
    expect(typographyButton()).toBeNull();

    for (const blockId of ["blk-h", "blk-t", "blk-b", "blk-q", "blk-s", "blk-l", "blk-c"]) {
      clickSelector(view.container, `[data-page-editor-block-id="${blockId}"]`);
      await flush();
      expect(typographyButton(), blockId).toBeTruthy();
    }

    for (const blockId of ["blk-i", "blk-d", "blk-sp"]) {
      clickSelector(view.container, `[data-page-editor-block-id="${blockId}"]`);
      await flush();
      expect(typographyButton(), blockId).toBeNull();
    }

    // An open Typography panel closes when the selection moves to a target
    // that does not support it, instead of rendering invalid controls.
    clickSelector(view.container, '[data-page-editor-block-id="blk-h"]');
    await flush();
    clickButtonByLabel(view.container, "Typography panel");
    expect(
      view.container.querySelector('[data-page-editor-toolbar-panel="typography"]')
    ).toBeTruthy();
    clickSelector(view.container, '[data-page-editor-block-id="blk-i"]');
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-toolbar-panel="typography"]')
    ).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor typography panel renders dedicated widgets, paints the text node, and saves token values", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    clickButtonByLabel(view.container, "Typography panel");

    const panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    expect(panel).toBeTruthy();

    // Dedicated widgets only: no native selects, no native number inputs. The
    // ONLY raw text input allowed in the typography panel is the TASK-532 fluid
    // font-size control (a free-text clamp()/rem CSS length has no dedicated
    // widget); every other control is a dedicated widget.
    expect(panel.querySelectorAll("select")).toHaveLength(0);
    expect(panel.querySelectorAll('input[type="number"]')).toHaveLength(0);
    const textControls = panel.querySelectorAll('[data-page-editor-control="text"]');
    expect(textControls).toHaveLength(1);
    expect(textControls[0]?.textContent).toContain("Fluid size");
    for (const label of [
      "Font family",
      "Font size",
      "Font weight",
      "Text align",
      "Text transform",
    ]) {
      expect(findSegmentedGroup(panel, label)).toBeTruthy();
    }
    for (const label of ["Line height", "Letter spacing"]) {
      expect(
        panel.querySelector(`[data-page-editor-slider-stepper="${label}"]`),
        label
      ).toBeTruthy();
    }

    clickSegmentedOption(panel, "Font family", "display");
    clickSegmentedOption(panel, "Font size", "2xl");
    clickSegmentedOption(panel, "Font weight", "bold");
    clickSegmentedOption(panel, "Text align", "right");
    setSliderField(view.container, "Line height", "1.4");
    setSliderField(view.container, "Letter spacing", "2");
    await flush();

    // The canvas paints the values inline on the same heading node the front
    // renders, beating the baked level classes.
    const heading = findEditorBlock(view.container, "blk-heading").querySelector(
      "h1"
    ) as HTMLElement;
    expect(heading).toBeTruthy();
    expect(heading.style.fontFamily).toContain("var(--font-display");
    expect(heading.style.fontWeight).toBe("700");
    expect(heading.style.lineHeight).toBe("1.4");
    expect(heading.style.letterSpacing).toBe("2px");
    expect(heading.className).toContain("text-right");
    // happy-dom's CSS validator drops `var()` values for font-size, so the
    // inline font-size paint is asserted by the shared-renderer suite
    // (page-renderer-v2.test.tsx) which covers the same node markup; here the
    // stored token is asserted through the save payload below.

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedBlock = savedDocument.sections[0]?.blocks.find(
      (block) => block.id === "blk-heading"
    );
    // Token values persist in the schema-owned style fields.
    expect(savedBlock?.style).toMatchObject({
      fontFamily: "display",
      fontSize: "2xl",
      fontWeight: "bold",
      lineHeight: 1.4,
      letterSpacing: 2,
    });
    // The relocated Text align presentation keeps the legacy stored path:
    // heading text alignment stays in props.align, not style.align.
    expect(savedBlock?.props.align).toBe("right");
    expect(savedBlock?.style?.align).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor typography Text align edited on tablet writes a tablet props override, not the base", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Smoke repro (phase2 anomaly #1): select the heading, switch the canvas
    // device to Tablet, then set Text align — the edit must create a
    // responsive.tablet props override exactly like Font size does, never a
    // base write.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    clickButtonByLabel(view.container, "Tablet");
    await flush();
    clickButtonByLabel(view.container, "Typography panel");

    let panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    expect(panel).toBeTruthy();
    const alignFieldOf = (root: HTMLElement) =>
      findSegmentedGroup(root, "Text align").closest(
        "[data-page-editor-responsive-field]"
      ) as HTMLElement;
    expect(alignFieldOf(panel).getAttribute("data-page-editor-responsive-field")).toBe("inherited");

    // The exact smoke gesture: the base align IS "center", and the operator
    // clicks "center" on tablet. The explicit choice must PIN the inherited
    // value as a tablet override (the same gesture on Font size created one),
    // never no-op and never write the base.
    clickSegmentedOption(panel, "Text align", "center");
    await flush();

    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    let alignField = alignFieldOf(panel);
    // Badge flips Inherited -> Override and exposes the reset affordance.
    expect(alignField.getAttribute("data-page-editor-responsive-field")).toBe("override");
    expect(alignField.querySelector('[data-page-editor-responsive-badge="override"]')).toBeTruthy();
    expect(
      alignField.querySelector('button[aria-label="Reset Text align to inherited"]')
    ).toBeTruthy();

    clickButton(view.container, "Save");
    await flush();
    let saved = lastSavedDocument();
    let heading = saved.sections[0]?.blocks[0];
    // Base align untouched; the tablet override container carries the edit.
    expect(heading?.props.align).toBe("center");
    expect(heading?.responsive?.tablet?.props).toEqual({ align: "center" });

    // Reset restores inheritance and removes the override container.
    clickSelector(view.container, 'button[aria-label="Reset Text align to inherited"]');
    await flush();
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    heading = saved.sections[0]?.blocks[0];
    expect(heading?.props.align).toBe("center");
    expect(heading?.responsive?.tablet).toBeUndefined();

    // A diverging value follows the same device-scoped props container.
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    clickSegmentedOption(panel, "Text align", "left");
    await flush();
    panel = view.container.querySelector(
      '[data-page-editor-toolbar-panel="typography"]'
    ) as HTMLElement;
    alignField = alignFieldOf(panel);
    expect(alignField.getAttribute("data-page-editor-responsive-field")).toBe("override");
    clickButton(view.container, "Save");
    await flush();
    saved = lastSavedDocument();
    heading = saved.sections[0]?.blocks[0];
    expect(heading?.props.align).toBe("center");
    expect(heading?.responsive?.tablet?.props).toEqual({ align: "left" });
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas frame anchors site typography token variables for WYSIWYG parity with the front", async () => {
  // No cached/fetched settings: the canvas must carry the documented
  // DEFAULT_TOKENS fallbacks so `var(--text-*)` resolves the same values the
  // front emits for a default token set — never the admin-theme `--text-*`
  // scale painted on the admin `:root`.
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const frame = view.container.querySelector(
      '[data-page-editor-canvas-frame="true"]'
    ) as HTMLElement;
    expect(frame).toBeTruthy();
    // TASK-495-03 P1a: the frame is an adaptive `bg-card` surface (the dark-mode
    // fix) — never the hardcoded `bg-white` slab that stayed bright in dark mode.
    expect(frame.className).toContain("bg-card");
    expect(frame.className).not.toContain("bg-white");
    for (const [variable, value] of Object.entries(
      toPageTypographyCssVariableMap(DEFAULT_TOKENS)
    )) {
      expect(frame.style.getPropertyValue(variable), variable).toBe(value);
    }
    expect(frame.style.getPropertyValue("--text-2xs")).toBe("0.625rem");
    expect(frame.style.getPropertyValue("--text-xs")).toBe("0.75rem");
    expect(frame.style.getPropertyValue("--text-sm")).toBe("0.875rem");
    expect(frame.style.getPropertyValue("--text-5xl")).toBe("3rem");
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas frame paints the resolved site design.tokens typography over the defaults", async () => {
  siteSettingsState.settings = {
    "design.tokens": {
      typography: { xs: "0.8rem", sm: "1.125rem", "5xl": "3.5rem" },
    },
  };
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const frame = view.container.querySelector(
      '[data-page-editor-canvas-frame="true"]'
    ) as HTMLElement;
    expect(frame.style.getPropertyValue("--text-xs")).toBe("0.8rem");
    expect(frame.style.getPropertyValue("--text-sm")).toBe("1.125rem");
    expect(frame.style.getPropertyValue("--text-5xl")).toBe("3.5rem");
    // Untouched tokens keep the DEFAULT_TOKENS anchor.
    expect(frame.style.getPropertyValue("--text-2xs")).toBe("0.625rem");
    expect(frame.style.getPropertyValue("--text-md")).toBe("1rem");
    expect(frame.style.getPropertyValue("--font-sans")).toBe(DEFAULT_TOKENS.typography.sans);
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas + block color swatches reflect the live site neutral tokens (TASK-477-02)", async () => {
  siteSettingsState.settings = {
    "design.tokens": {
      neutrals: { bg: "#abcdef" },
    },
  };
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Part A: the canvas frame now carries the site neutral var so neutral block
    // colors are WYSIWYG in-editor; brand vars are NOT re-emitted (chrome-safe).
    const frame = view.container.querySelector(
      '[data-page-editor-canvas-frame="true"]'
    ) as HTMLElement;
    expect(frame.style.getPropertyValue("--color-bg")).toBe("#abcdef");
    expect(frame.style.getPropertyValue("--color-primary")).toBe("");

    // Part B: the block color swatch previews the resolved site token (#abcdef),
    // threaded from the hook through the palette context — not the DEFAULT token.
    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    clickButtonByLabel(view.container, "Style panel");
    const bgSwatch = findColorSwatchGroup(view.container, "Text color").querySelector(
      '[data-page-editor-color-swatch="bg"]'
    ) as HTMLElement | null;
    expect(bgSwatch).toBeTruthy();
    const style = bgSwatch?.getAttribute("style") ?? "";
    expect(style.includes("#abcdef") || style.includes("rgb(171, 205, 239)")).toBe(true);
  } finally {
    view.cleanup();
  }
});
