// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  activeSurfaceState,
  changeField,
  clickButton,
  clickButtonByLabel,
  clickColorSwatch,
  clickResponsiveReset,
  clickSegmentedOption,
  clickSelector,
  collectionClientsState,
  commitColorHex,
  createDocument,
  createPage,
  findColorSwatchGroup,
  findEditorBlock,
  findEditorSectionContent,
  findResponsiveField,
  findSegmentedGroup,
  flush,
  formsClientState,
  mount,
  pageEditorFlowMockFactories,
  pageEditorState,
  previewDialogState,
  selectMediaAsset,
  setSliderField,
  setToggleField,
  siteSettingsState,
  toastState,
} from "./pageEditorFlowTestUtils";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

import {
  createPageSectionV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

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
    expect(block.style.opacity).toBe("0.5");
    expect(block.style.borderRadius).toBe("18px");
    expect(block.style.boxShadow).toBe("0 14px 40px rgba(15, 23, 42, 0.12)");
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

test("PageEditor undo redo and session clipboard duplicate selected blocks", async () => {
  window.sessionStorage.clear();
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();

    clickButtonByLabel(view.container, "Style panel");
    clickColorSwatch(view.container, "Text color", "primary");
    await flush();

    clickButtonByLabel(view.container, "Undo");
    clickButtonByLabel(view.container, "Redo");
    await flush();

    clickButtonByLabel(view.container, "Copy selection");
    await flush();
    expect(window.sessionStorage.getItem("coderso.pageEditor.clipboard")).toContain(
      "coderso/page-fragment@v1"
    );

    clickButtonByLabel(view.container, "Paste");
    await flush();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const blocks = savedDocument.sections[0]?.blocks ?? [];
    expect(blocks).toHaveLength(3);
    expect(blocks[1]?.id).toBe("blk-copy");
    expect(blocks[1]?.style?.textColor).toBe("var(--color-primary)");
    expect(blocks[2]?.id).not.toBe("blk-copy");
    expect(blocks[2]?.type).toBe("text");
    expect(blocks[2]?.props.text).toBe("Existing page copy.");
    expect(blocks[2]?.style?.textColor).toBe("var(--color-primary)");
  } finally {
    view.cleanup();
    window.sessionStorage.clear();
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
    expect(block.style.color).toBe("");
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
