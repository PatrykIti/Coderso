// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";

import {
  harnessState,
  createPage,
  createDocument,
  mount,
  flush,
  clickButton,
  clickButtonByLabel,
  clickSelector,
  changeField,
  findResponsiveField,
  findSegmentedGroup,
  clickSegmentedOption,
  setToggleField,
  setSliderField,
  clickResponsiveReset,
  findEditorSectionContent,
  findEditorBlock,
  lastSavedDocument,
} from "./pageEditorV2FlowHarness";

const { pageEditorState, activeSurfaceState } = harnessState;

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import {
  createPageBlockV2,
  createPageSectionV2,
  PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

const openResponsivePanel = (container: ParentNode) => {
  clickButtonByLabel(container, "Responsive panel");
  const panel = container.querySelector('[data-page-editor-toolbar-panel="responsive"]');
  expect(panel).toBeTruthy();
  return panel as HTMLElement;
};

test("PageEditor content edits are block-type-aware and breakpoint-aware", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    changeField(view.container, "Primary text", "Mobile headline");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const heading = savedDocument.sections[0]?.blocks[0];

    expect(heading?.props).toMatchObject({ text: "Welcome to Coderso", level: "h1" });
    expect(heading?.props).not.toHaveProperty("label");
    expect(heading?.responsive?.mobile?.props).toEqual({ text: "Mobile headline" });
  } finally {
    view.cleanup();
  }
});

test("PageEditor marks and resets section responsive overrides per field", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Columns", "2");
    setSliderField(view.container, "Max width", "900");
    await flush();

    const columnsField = findResponsiveField(view.container, "Columns");
    expect(columnsField.dataset.pageEditorResponsiveField).toBe("override");
    expect(findResponsiveField(view.container, "Max width").dataset.pageEditorResponsiveField).toBe(
      "override"
    );
    expect(
      view.container
        .querySelector('[data-page-editor-section="hero"]')
        ?.getAttribute("data-page-editor-responsive-target")
    ).toBe("override");

    // The override badge and per-control reset affordance carry tooltip
    // metadata and an accessible reset-to-inherited name.
    const overrideBadge = columnsField.querySelector(
      '[data-page-editor-responsive-badge="override"]'
    );
    expect(overrideBadge?.textContent).toBe("Override");
    expect(overrideBadge?.getAttribute("data-slot")).toBe("tooltip-trigger");
    const resetButton = columnsField.querySelector(
      'button[aria-label="Reset Columns to inherited"]'
    );
    expect(resetButton?.getAttribute("data-slot")).toBe("tooltip-trigger");
    expect(resetButton?.textContent).toContain("Reset");

    clickResponsiveReset(view.container, "Columns");
    await flush();

    const resetColumnsField = findResponsiveField(view.container, "Columns");
    expect(resetColumnsField.dataset.pageEditorResponsiveField).toBe("inherited");
    expect(
      resetColumnsField.querySelector('[data-page-editor-responsive-badge="inherited"]')
        ?.textContent
    ).toBe("Inherited");
    expect(
      resetColumnsField.querySelector('button[aria-label="Reset Columns to inherited"]')
    ).toBeNull();
    expect(findResponsiveField(view.container, "Max width").dataset.pageEditorResponsiveField).toBe(
      "override"
    );

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.responsive.mobile?.layout).toEqual({ maxWidth: 900 });
  } finally {
    view.cleanup();
  }
});

test("PageEditor hidden sections render editor ghost state while saving visibility", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButtonByLabel(view.container, "Visibility panel");
    setToggleField(view.container, "Visible", false);
    await flush();

    const section = view.container.querySelector('[data-page-editor-section="hero"]');
    expect(section?.getAttribute("data-page-editor-visibility")).toBe("hidden");
    expect(section?.textContent).toContain("Hidden");
    expect(findEditorSectionContent(view.container, "sec-hero").textContent).toContain(
      "Welcome to Coderso"
    );

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.visibility.visible).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("PageEditor hidden blocks render selectable ghost state while saving visibility", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    clickButtonByLabel(view.container, "Visibility panel");
    setToggleField(view.container, "Visible", false);
    await flush();

    const block = findEditorBlock(view.container, "blk-copy");
    expect(block.dataset.pageEditorVisibility).toBe("hidden");
    expect(block.dataset.selected).toBe("true");
    expect(block.querySelector("[data-page-editor-hidden-block-ghost]")).toBeTruthy();
    expect(block.querySelector("p")).toBeNull();

    React.act(() => {
      block.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: "blk-copy",
      selectedBlockPath: "sections.0.blocks.1",
    });

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedBlock = savedDocument.sections[0]?.blocks.find((block) => block.id === "blk-copy");
    expect(savedBlock?.visibility.visible).toBe(false);
  } finally {
    view.cleanup();
  }
});

test("PageEditor marks and resets selected block responsive overrides per field", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    changeField(view.container, "Primary text", "Mobile headline");
    await flush();

    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-heading"]')
        ?.getAttribute("data-page-editor-responsive-target")
    ).toBe("override");
    expect(
      findResponsiveField(view.container, "Primary text").dataset.pageEditorResponsiveField
    ).toBe("override");

    clickResponsiveReset(view.container, "Primary text");
    await flush();

    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-heading"]')
        ?.getAttribute("data-page-editor-responsive-target")
    ).toBe("inherited");
    expect(
      findResponsiveField(view.container, "Primary text").dataset.pageEditorResponsiveField
    ).toBe("inherited");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.responsive).toBeUndefined();
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

// --- TASK-539-03-L03 contract scenarios: gallery and divider controls stay
// --- base-owned while a narrower breakpoint is active. ---

test("PageEditor gallery controls stay base-owned while tablet is active", async () => {
  const galleryPage = () =>
    createPage({
      currentData: createDocument({
        sections: [
          createPageSectionV2("hero", {
            id: "sec-gallery",
            name: "Gallery",
            variant: "centered",
            blocks: [
              createPageBlockV2("gallery", {
                id: "blk-gallery",
                props: {
                  items: [{ src: "/a.jpg", alt: "Alpha", caption: "" }],
                  layout: "grid",
                  filterable: true,
                  filterCategories: ["work"],
                },
                responsive: { tablet: { style: { opacity: 0.5 } } },
              }),
            ],
          }),
        ],
      }),
    });
  pageEditorState.cachedPage = galleryPage();
  pageEditorState.currentPage = galleryPage();
  const view = mount(<PageEditor pageId="page-1" initialPage={galleryPage()} />);

  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-gallery"]');
    await flush();
    clickButtonByLabel(view.container, "Tablet");
    await flush();

    const itemsField = findResponsiveField(view.container, "Gallery items");
    expect(itemsField?.getAttribute("data-page-editor-responsive-field")).toBe("inherited");
    expect(itemsField?.querySelector('[data-page-editor-responsive-badge="base"]')).toBeTruthy();
    expect(itemsField?.querySelector("[data-page-editor-responsive-reset]")).toBeNull();
    const filterableField = findResponsiveField(view.container, "Filterable");
    expect(filterableField?.getAttribute("data-page-editor-responsive-field")).toBe("inherited");
    expect(
      filterableField?.querySelector('[data-page-editor-responsive-badge="base"]')
    ).toBeTruthy();
    expect(filterableField?.querySelector("[data-page-editor-responsive-reset]")).toBeNull();

    setToggleField(view.container, "Filterable", false);
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const saved = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;
    const gallery = saved.sections[0]?.blocks.find((block) => block.id === "blk-gallery");
    expect(gallery?.props.filterable).toBe(false);
    // The deliberate tablet edit updates the base document and leaves the
    // pre-existing tablet override object byte-identical (no responsive
    // gallery key is ever written).
    expect(gallery?.responsive?.tablet).toEqual({ style: { opacity: 0.5 } });
  } finally {
    view.cleanup();
  }
});

test("PageEditor divider controls stay base-owned while mobile is active", async () => {
  const dividerPage = () =>
    createPage({
      currentData: createDocument({
        sections: [
          createPageSectionV2("hero", {
            id: "sec-divider",
            name: "Divider",
            variant: "centered",
            blocks: [
              createPageBlockV2("divider", {
                id: "blk-divider",
                props: {
                  tone: "neutral",
                  thickness: 1,
                  gradient: true,
                  width: 120,
                  align: "center",
                },
                responsive: { mobile: { style: { opacity: 0.4 } } },
              }),
            ],
          }),
        ],
      }),
    });
  pageEditorState.cachedPage = dividerPage();
  pageEditorState.currentPage = dividerPage();
  const view = mount(<PageEditor pageId="page-1" initialPage={dividerPage()} />);

  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-divider"]');
    await flush();
    clickButtonByLabel(view.container, "Mobile");
    await flush();

    const thicknessField = findResponsiveField(view.container, "Thickness");
    expect(thicknessField?.getAttribute("data-page-editor-responsive-field")).toBe("inherited");
    expect(
      thicknessField?.querySelector('[data-page-editor-responsive-badge="base"]')
    ).toBeTruthy();
    expect(thicknessField?.querySelector("[data-page-editor-responsive-reset]")).toBeNull();

    clickButtonByLabel(view.container, "Style panel");
    await flush();
    const gradientField = findResponsiveField(view.container, "Gradient rule");
    expect(gradientField?.querySelector('[data-page-editor-responsive-badge="base"]')).toBeTruthy();
    const widthField = findResponsiveField(view.container, "Rule length");
    expect(widthField).toBeTruthy();
    expect(widthField?.querySelector("[data-page-editor-responsive-reset]")).toBeNull();
    const alignField = findResponsiveField(view.container, "Rule align");
    expect(alignField?.querySelector('[data-page-editor-responsive-badge="base"]')).toBeTruthy();

    clickSegmentedOption(view.container, "Rule align", "right");
    setSliderField(view.container, "Rule length", "200");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const saved = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;
    const divider = saved.sections[0]?.blocks.find((block) => block.id === "blk-divider");
    expect(divider?.props.align).toBe("right");
    expect(divider?.props.width).toBe(200);
    expect(divider?.responsive?.mobile).toEqual({ style: { opacity: 0.4 } });
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
