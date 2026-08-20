// @vitest-environment happy-dom

import React from "react";
import { expect, test, vi } from "vitest";

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
  changeInputByAriaLabel,
  findResponsiveField,
  findSegmentedGroup,
  clickSegmentedOption,
  findColorSwatchGroup,
  clickColorSwatch,
  setToggleField,
  setSliderField,
  commitColorHex,
  selectMediaAsset,
  findEditorSectionContent,
  findEditorBlock,
} from "./pageEditorV2FlowHarness";

const { pageEditorState, mediaLibraryState } = harnessState;

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import {
  createPageBlockV2,
  createPageSectionV2,
  PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

test("PageEditor section registry controls update visible canvas style and saved data", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Columns", "3");
    clickSegmentedOption(view.container, "Justify", "between");
    await flush();

    let content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.dataset.pageSectionLayoutMode).toBe("canvas-device");
    expect(content.className).toContain("grid-cols-3");
    expect(content.className).not.toContain("md:grid-cols-3");
    expect(content.className).toContain("justify-between");

    clickButtonByLabel(view.container, "Style panel");
    clickSegmentedOption(view.container, "Shadow", "lg");
    await flush();

    content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.style.boxShadow).toBe("0 22px 60px rgba(15, 23, 42, 0.16)");

    clickButtonByLabel(view.container, "Background panel");
    clickSegmentedOption(view.container, "Background type", "image");
    selectMediaAsset(view.container, "Background image", "asset-hero");
    await flush();

    content = findEditorSectionContent(view.container, "sec-hero");
    expect(content.style.backgroundImage).toContain("/hero.jpg");

    clickButtonByLabel(view.container, "Visibility panel");
    setToggleField(view.container, "Auth only", true);
    changeField(view.container, "Anchor", "hero-top");
    setToggleField(view.container, "Date range", true);
    await flush();
    changeField(view.container, "Starts at", "2026-06-10T10:00:00Z");
    changeField(view.container, "Ends at", "2026-06-11T10:00:00Z");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const section = savedDocument.sections[0];
    expect(section?.layout).toMatchObject({ columns: 3, justify: "between" });
    expect(section?.style).toMatchObject({
      shadow: "lg",
      backgroundType: "image",
      backgroundImage: "/hero.jpg",
    });
    expect(section?.visibility).toMatchObject({
      authOnly: true,
      anchor: "hero-top",
      startsAt: "2026-06-10T10:00:00Z",
      endsAt: "2026-06-11T10:00:00Z",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor keeps universal section controls for stored non-insertable sections", async () => {
  const navigationPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("navigation", {
          id: "sec-navigation",
          name: "Navigation",
          blocks: [],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = navigationPage;
  pageEditorState.currentPage = navigationPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={navigationPage} />);

  try {
    await flush();

    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Justify", "between");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.type).toBe("navigation");
    expect(savedDocument.sections[0]?.layout.justify).toBe("between");
  } finally {
    view.cleanup();
  }
});

test("PageEditor block style controls update visible canvas style and saved data", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();

    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Width", "full");
    clickSegmentedOption(view.container, "Align", "center");
    await flush();

    clickButtonByLabel(view.container, "Style panel");
    commitColorHex(view.container, "Text color", "#123456");
    setSliderField(view.container, "Opacity", "0.5");
    setSliderField(view.container, "Radius", "18");
    clickSegmentedOption(view.container, "Shadow", "md");
    commitColorHex(view.container, "Border color", "#334155");
    await flush();

    clickButtonByLabel(view.container, "Background panel");
    clickSegmentedOption(view.container, "Background type", "color");
    commitColorHex(view.container, "Background", "#fef3c7");
    await flush();

    clickButtonByLabel(view.container, "Spacing panel");
    setSliderField(view.container, "Padding top", "12");
    setSliderField(view.container, "Padding right", "14");
    setSliderField(view.container, "Margin bottom", "10");
    await flush();

    const block = findEditorBlock(view.container, "blk-copy");
    expect(block.className).toContain("w-fit");
    expect(block.classList.contains("w-full")).toBe(false);
    expect(block.className).toContain("justify-self-center");
    expect(block.className).toContain("mx-auto");
    expect(block.style.getPropertyValue("--coderso-block-text")).toBe("#123456");
    expect(block.style.getPropertyValue("--coderso-block-surface")).toBe("#fef3c7");
    // TASK-481-01-L01 content scope: brand visual style keys live on the
    // inner [data-page-editor-content] wrapper, not the block frame.
    const blockContent = block.querySelector('[data-page-editor-content="true"]') as HTMLElement;
    expect(blockContent).toBeTruthy();
    expect(blockContent.style.opacity).toBe("0.5");
    expect(blockContent.style.borderRadius).toBe("18px");
    expect(blockContent.style.boxShadow).toBe("0 14px 40px rgba(15, 23, 42, 0.12)");
    expect(block.style.padding).toBe("12px 14px 0px 0px");
    expect(block.style.marginBottom).toBe("10px");
    expect(block.style.marginLeft).toBe("auto");
    expect(block.style.marginRight).toBe("auto");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedBlock = savedDocument.sections[0]?.blocks.find((block) => block.id === "blk-copy");
    expect(savedBlock?.style).toMatchObject({
      width: "full",
      align: "center",
      textColor: "#123456",
      background: "#fef3c7",
      backgroundType: "color",
      opacity: 0.5,
      radius: 18,
      shadow: "md",
      borderColor: "#334155",
      padding: { top: 12, right: 14 },
      margin: { bottom: 10 },
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor background panel edits block gradients and background images", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();

    clickButtonByLabel(view.container, "Background panel");
    clickSegmentedOption(view.container, "Background type", "gradient");
    await flush();
    setSliderField(view.container, "Angle", "90");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    let savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    let savedDocument = savedPayload?.data as PageDocumentV2;
    let savedBlock = savedDocument.sections[0]?.blocks.find((block) => block.id === "blk-copy");
    expect(savedBlock?.style?.backgroundType).toBe("gradient");
    expect(savedBlock?.style?.background).toBe(
      "linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%)"
    );

    if (
      !view.container.querySelector(
        '[data-page-editor-control="segmented"] [role="group"][aria-label="Background type"]'
      )
    ) {
      clickButtonByLabel(view.container, "Background panel");
    }
    clickSegmentedOption(view.container, "Background type", "image");
    await flush();
    selectMediaAsset(view.container, "Background image", "asset-hero");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    savedDocument = savedPayload?.data as PageDocumentV2;
    savedBlock = savedDocument.sections[0]?.blocks.find((block) => block.id === "blk-copy");
    expect(savedBlock?.style).toMatchObject({
      backgroundType: "image",
      backgroundImage: "/hero.jpg",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor wide segmented option sets scroll inside their panel cell", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Section Layout panel: Align/Justify strips must scroll horizontally
    // instead of widening the auto-fit grid cell over the neighbor column.
    clickButtonByLabel(view.container, "Layout panel");
    for (const label of ["Align", "Justify"]) {
      const group = findSegmentedGroup(view.container, label);
      expect(group.className, label).toContain("overflow-x-auto");
      expect(group.className, label).toContain("flex-nowrap");
      expect(group.className, label).toContain("snap-x");
      const cell = group.closest("[data-page-editor-responsive-field]");
      expect(cell?.className, label).toContain("min-w-0");
    }

    // Heading Content panel: the Level set (h1-h6) renders as the same
    // scrollable segmented strip with every option reachable.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    clickButtonByLabel(view.container, "Content panel");
    const level = findSegmentedGroup(view.container, "Level");
    expect(
      Array.from(level.querySelectorAll("[data-page-editor-segmented-option]")).map(
        (option) => (option as HTMLElement).dataset.pageEditorSegmentedOption
      )
    ).toEqual(["h1", "h2", "h3", "h4", "h5", "h6"]);
    expect(level.className).toContain("overflow-x-auto");
    expect(level.className).toContain("flex-nowrap");
    expect(level.closest("[data-page-editor-responsive-field]")?.className).toContain("min-w-0");
    for (const option of Array.from(
      level.querySelectorAll<HTMLButtonElement>("[data-page-editor-segmented-option]")
    )) {
      expect(option.className).toContain("shrink-0");
      expect(option.className).toContain("snap-start");
    }
  } finally {
    view.cleanup();
  }
});

test("PageEditor transparent swatch clears stored block colors but stays off for sections", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Base section colors are non-nullable in pageDocumentV2, so section
    // color controls must not offer the transparent swatch.
    clickButtonByLabel(view.container, "Style panel");
    expect(
      findColorSwatchGroup(view.container, "Accent").querySelector(
        '[data-page-editor-color-swatch="transparent"]'
      )
    ).toBeNull();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    commitColorHex(view.container, "Text color", "#123456");
    await flush();
    expect(
      findEditorBlock(view.container, "blk-copy").style.getPropertyValue("--coderso-block-text")
    ).toBe("#123456");

    clickColorSwatch(view.container, "Text color", "transparent");
    await flush();

    const block = findEditorBlock(view.container, "blk-copy");
    expect(block.style.getPropertyValue("--coderso-block-text")).toBe("");
    // TASK-481-01-L01 content scope: `color` lives on the inner content
    // wrapper, so the frame-level read is vacuous; assert the wrapper's
    // style.color (the frame custom prop is asserted above).
    const blockContent = block.querySelector('[data-page-editor-content="true"]') as HTMLElement;
    expect(blockContent).toBeTruthy();
    expect(blockContent.style.color).toBe("");
    expect(
      findColorSwatchGroup(view.container, "Text color")
        .querySelector('[data-page-editor-color-swatch="transparent"]')
        ?.getAttribute("aria-pressed")
    ).toBe("true");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedBlock = savedDocument.sections[0]?.blocks.find((entry) => entry.id === "blk-copy");
    // The cleared color is stored as the explicit null the normalizer keeps.
    expect(savedBlock?.style?.textColor).toBeNull();
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

test("PageEditor image controls round-trip selected block props", async () => {
  const imagePage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-image",
          name: "Image section",
          blocks: [
            createPageBlockV2("image", {
              id: "blk-image",
              props: {
                assetId: null,
                src: "/old.jpg",
                alt: "Old alt",
                caption: "Old caption",
                fit: "cover",
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = imagePage;
  pageEditorState.currentPage = imagePage;
  const view = mount(<PageEditor pageId="page-1" initialPage={imagePage} />);

  try {
    await flush();

    selectMediaAsset(view.container, "Source", "asset-hero");
    await flush();
    changeField(view.container, "Alt text", "Hero image");
    changeField(view.container, "Caption", "Hero caption");
    clickSegmentedOption(view.container, "Fit", "contain");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const image = savedDocument.sections[0]?.blocks[0];

    expect(image?.props).toMatchObject({
      src: "/hero.jpg",
      alt: "Hero image",
      caption: "Hero caption",
      fit: "contain",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor list controls round-trip items and ordered mode", async () => {
  const listPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-list",
          name: "List section",
          blocks: [
            createPageBlockV2("list", {
              id: "blk-list",
              props: { items: ["Old"], ordered: false },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = listPage;
  pageEditorState.currentPage = listPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={listPage} />);

  try {
    await flush();

    // Structured items rows (client-readiness FIX 1): edit the existing row,
    // add a second plain row and a third row carrying a link target.
    changeInputByAriaLabel(view.container, "Item 1 label", "Discovery");
    clickButton(view.container, "Add item");
    await flush();
    changeInputByAriaLabel(view.container, "Item 2 label", "Build");
    clickButton(view.container, "Add item");
    await flush();
    changeInputByAriaLabel(view.container, "Item 3 label", "Launch");
    changeInputByAriaLabel(view.container, "Item 3 link URL", "/launch");
    setToggleField(view.container, "Ordered", true);
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const list = savedDocument.sections[0]?.blocks[0];

    // Stored shapes are exact: plain rows stay strings, the linked row stores
    // the `{ label, href }` link-item contract the renderer turns into <a>.
    expect(list?.props).toMatchObject({
      items: ["Discovery", "Build", { label: "Launch", href: "/launch" }],
      ordered: true,
    });
  } finally {
    view.cleanup();
  }
});

// TASK-442-01-L01 empty-list persistence pin at the editor flow layer: the
// audited UX trap was a freshly inserted (still empty) list vanishing from the
// saved document. Schema-layer pins live in page-document-v2-block-roundtrip;
// this pin proves the editor save payload keeps the default `items: []` block.

test("PageEditor card, statistic, quote, divider, and spacer controls round-trip", async () => {
  const mixedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-mixed",
          name: "Mixed blocks",
          blocks: [
            createPageBlockV2("card", {
              id: "blk-card",
              props: { title: "Old card", text: "Old body", image: null, href: null },
            }),
            createPageBlockV2("statistic", {
              id: "blk-stat",
              props: { value: "1", label: "Old metric", caption: "Old caption" },
            }),
            createPageBlockV2("quote", {
              id: "blk-quote",
              props: { text: "Old quote", cite: "Old cite" },
            }),
            createPageBlockV2("divider", {
              id: "blk-divider",
              props: { tone: "neutral", thickness: 1 },
            }),
            createPageBlockV2("spacer", {
              id: "blk-spacer",
              props: { size: 32 },
            }),
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

    clickSelector(view.container, '[data-page-editor-block-id="blk-card"]');
    await flush();
    changeField(view.container, "Title", "Launch card");
    changeField(view.container, "Body", "Launch body");
    selectMediaAsset(view.container, "Image", "asset-card");
    changeField(view.container, "Link URL", "/card");
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-stat"]');
    await flush();
    changeField(view.container, "Value", "42");
    changeField(view.container, "Label", "Deployments");
    changeField(view.container, "Caption", "This month");
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-quote"]');
    await flush();
    changeField(view.container, "Quote", "Ship the smallest useful thing.");
    changeField(view.container, "Cite", "Coderso");
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-divider"]');
    await flush();
    clickSegmentedOption(view.container, "Tone", "accent");
    setSliderField(view.container, "Thickness", "4");
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-spacer"]');
    await flush();
    setSliderField(view.container, "Size", "72");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const [card, statistic, quote, divider, spacer] = savedDocument.sections[0]?.blocks ?? [];

    expect(card?.props).toMatchObject({
      title: "Launch card",
      text: "Launch body",
      image: "/card.jpg",
      href: "/card",
    });
    expect(statistic?.props).toMatchObject({
      value: "42",
      label: "Deployments",
      caption: "This month",
    });
    expect(quote?.props).toMatchObject({
      text: "Ship the smallest useful thing.",
      cite: "Coderso",
    });
    expect(divider?.props).toMatchObject({ tone: "accent", thickness: 4 });
    expect(spacer?.props).toMatchObject({ size: 72 });
  } finally {
    view.cleanup();
  }
});

// --- TASK-539-03-L03 contract scenarios: media scope isolation, URL
// --- boundaries, and focused-mount toolbar targeting. ---

const primaryTextField = (container: ParentNode) =>
  Array.from(container.querySelectorAll('label[data-page-editor-control="text"]')).find((entry) =>
    entry.textContent?.includes("Primary text")
  );

test("PageEditor media URL picks are scoped to the selected block (equal-URL isolation)", async () => {
  const page = () =>
    createPage({
      currentData: createDocument({
        sections: [
          createPageSectionV2("hero", {
            id: "sec-hero",
            name: "Hero",
            variant: "centered",
            blocks: [
              createPageBlockV2("image", {
                id: "blk-a",
                props: { src: "/card.jpg", alt: "", fit: "cover" },
              }),
              createPageBlockV2("image", {
                id: "blk-b",
                props: { src: "/card.jpg", alt: "", fit: "cover" },
              }),
            ],
          }),
        ],
      }),
    });
  pageEditorState.cachedPage = page();
  pageEditorState.currentPage = page();
  const view = mount(<PageEditor pageId="page-1" initialPage={page()} />);

  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-a"]');
    await flush();
    expect(
      findResponsiveField(view.container, "Source")?.querySelector(
        '[data-page-editor-media-control="Source"]'
      )
    ).toBeTruthy();
    selectMediaAsset(view.container, "Source", "asset-hero");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    let saved = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;
    expect(saved.sections[0]?.blocks[0]?.props.src).toBe("/hero.jpg");
    expect(saved.sections[0]?.blocks[1]?.props.src).toBe("/card.jpg");

    // The second target holds the SAME stored URL; picking a matching library
    // asset must commit to this target only (scope isolation by block id).
    clickSelector(view.container, '[data-page-editor-block-id="blk-b"]');
    await flush();
    selectMediaAsset(view.container, "Source", "asset-card");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    saved = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;
    expect(saved.sections[0]?.blocks[0]?.props.src).toBe("/hero.jpg");
    expect(saved.sections[0]?.blocks[1]?.props.src).toBe("/card.jpg");
  } finally {
    view.cleanup();
  }
});

test("PageEditor gallery rows keep surviving identity when an earlier row is removed", async () => {
  const page = () =>
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
                  items: [
                    { src: "/a.jpg", alt: "Alpha", caption: "" },
                    { src: "/b.jpg", alt: "Beta", caption: "" },
                  ],
                  layout: "grid",
                },
              }),
            ],
          }),
        ],
      }),
    });
  pageEditorState.cachedPage = page();
  pageEditorState.currentPage = page();
  const view = mount(<PageEditor pageId="page-1" initialPage={page()} />);

  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-gallery"]');
    await flush();
    clickButtonByLabel(view.container, "Remove gallery item 1");
    await flush();
    // The surviving row slides into index 0 but keeps its immutable identity.
    expect(
      (view.container.querySelector('input[aria-label="Gallery item 1 alt"]') as HTMLInputElement)
        ?.value
    ).toBe("Beta");
    changeInputByAriaLabel(view.container, "Gallery item 1 alt", "Beta edited");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const saved = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;
    const rows = saved.sections[0]?.blocks.find((block) => block.id === "blk-gallery")?.props.items;
    expect(rows).toEqual([{ src: "/b.jpg", alt: "Beta edited", caption: "" }]);
  } finally {
    view.cleanup();
  }
});

test("PageEditor gallery source pins the 2,048/2,049 URL boundary", async () => {
  const url2048 = "/" + "a".repeat(2047);
  const make = () =>
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
                props: { items: [{ src: url2048, alt: "", caption: "" }], layout: "grid" },
              }),
            ],
          }),
        ],
      }),
    });
  pageEditorState.cachedPage = make();
  pageEditorState.currentPage = make();
  const originalItems = mediaLibraryState.items;
  mediaLibraryState.items = [
    ...originalItems,
    { id: "asset-2048", url: "/" + "b".repeat(2047), type: "image", mimeType: "image/jpeg" },
    { id: "asset-2049", url: "/" + "c".repeat(2048), type: "image", mimeType: "image/jpeg" },
  ];
  vi.useFakeTimers();
  pageEditorState.updatePage.mockClear();
  pageEditorState.autosavePage.mockClear();
  const view = mount(<PageEditor pageId="page-1" initialPage={make()} />);

  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-gallery"]');
    await flush();

    // A stored 2048-char source renders byte-identical (never truncated).
    const readout = view.container.querySelector(
      '[data-page-editor-media-external="Gallery item 1 source"]'
    );
    expect(readout?.textContent?.includes(url2048)).toBe(true);

    // Exactly 2,048 resolves one canonical row commit and nothing else.
    selectMediaAsset(view.container, "Gallery item 1 source", "asset-2048");
    await flush();
    clickButton(view.container, "Save");
    await flush();
    expect(pageEditorState.updatePage.mock.calls.length).toBe(1);
    let saved = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;
    let row = (saved.sections[0]?.blocks.find((block) => block.id === "blk-gallery")?.props as
      | { items?: Array<{ src?: string }> }
      | undefined)?.items?.[0];
    expect(row?.src).toBe("/" + "b".repeat(2047));
    await React.act(async () => {
      vi.advanceTimersByTime(1600);
      await Promise.resolve();
    });
    expect(pageEditorState.autosavePage.mock.calls.length).toBe(0);

    // 2,049 is non-mutating: no commit, no dirty, no autosave, no truncation.
    selectMediaAsset(view.container, "Gallery item 1 source", "asset-2049");
    await flush();
    await React.act(async () => {
      vi.advanceTimersByTime(1600);
      await Promise.resolve();
    });
    expect(pageEditorState.updatePage.mock.calls.length).toBe(1);
    expect(pageEditorState.autosavePage.mock.calls.length).toBe(0);
    const picker = view.container.querySelector(
      '[data-page-editor-media-control="Gallery item 1 source"] [data-media-picker-value]'
    );
    expect(picker?.getAttribute("data-media-picker-value")).toBe("asset-2048");
    saved = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;
    row = (saved.sections[0]?.blocks.find((block) => block.id === "blk-gallery")?.props as
      | { items?: Array<{ src?: string }> }
      | undefined)?.items?.[0];
    expect(row?.src).toBe("/" + "b".repeat(2047));
  } finally {
    mediaLibraryState.items = originalItems;
    view.cleanup();
    vi.useRealTimers();
  }
});

test("PageEditor focused-mount fallback targets the first root block", async () => {
  const heading = () =>
    createPageBlockV2("heading", {
      id: "blk-heading",
      props: { text: "Welcome", level: "h1", align: "center" },
    });
  const sec = () =>
    createPageSectionV2("hero", {
      id: "sec-hero",
      name: "Hero",
      variant: "centered",
      blocks: [heading()],
    });
  pageEditorState.cachedPage = createPage({ currentData: createDocument({ sections: [sec()] }) });
  pageEditorState.currentPage = createPage({ currentData: createDocument({ sections: [sec()] }) });
  const view = mount(
    <PageEditor
      pageId="page-1"
      initialPage={createPage({ currentData: createDocument({ sections: [sec()] }) })}
    />
  );

  try {
    await flush();
    // No selection: the content panel targets the first root block [{index:0}].
    const field = primaryTextField(view.container);
    expect(field?.querySelector("input")?.value).toBe("Welcome");
    changeField(view.container, "Primary text", "Edited heading");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const saved = pageEditorState.updatePage.mock.calls.at(-1)?.[1]?.data as PageDocumentV2;
    expect(saved.sections[0]?.blocks[0]?.props.text).toBe("Edited heading");
    expect(saved.sections[0]?.blocks[0]?.id).toBe("blk-heading");
  } finally {
    view.cleanup();
  }
});

test("PageEditor stale selection path and empty section render no block controls", async () => {
  const heading = () =>
    createPageBlockV2("heading", {
      id: "blk-heading",
      props: { text: "Welcome", level: "h1", align: "center" },
    });
  const sec = () =>
    createPageSectionV2("hero", {
      id: "sec-hero",
      name: "Hero",
      variant: "centered",
      blocks: [heading()],
    });
  pageEditorState.cachedPage = createPage({ currentData: createDocument({ sections: [sec()] }) });
  pageEditorState.currentPage = createPage({ currentData: createDocument({ sections: [sec()] }) });
  const view = mount(
    <PageEditor
      pageId="page-1"
      initialPage={createPage({ currentData: createDocument({ sections: [sec()] }) })}
    />
  );

  try {
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    clickButtonByLabel(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Delete block");
    await flush();
    // The section now has no root blocks; the stale [{index:0}] path cannot
    // resolve in either view, so no block registry control renders and no
    // write or dirty transition is possible.
    expect(primaryTextField(view.container)).toBeUndefined();
    expect(view.container.querySelector('[data-page-editor-control="gallery-items"]')).toBeNull();
    expect(pageEditorState.updatePage.mock.calls.length).toBe(0);
  } finally {
    view.cleanup();
  }
});
