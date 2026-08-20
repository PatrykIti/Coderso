// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  activeSurfaceState,
  changeField,
  clickButton,
  clickButtonByLabel,
  clickResponsiveReset,
  clickSelector,
  collectPageBlockIds,
  collectionClientsState,
  createDocument,
  createPage,
  findButton,
  findResponsiveField,
  flush,
  formsClientState,
  getCommandGroupButtons,
  mount,
  pageEditorBlockLabels,
  pageEditorFlowMockFactories,
  pageEditorSectionLabels,
  pageEditorState,
  previewDialogState,
  siteSettingsState,
  toastState,
} from "./pageEditorFlowTestUtils";

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";

import {
  createPageBlockV2,
  createPageSectionV2,
  pageBlockCapabilities,
  pageBlockTypes,
  pageSectionCapabilities,
  pageSectionTypes,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import { editorCanvasCtaButtonClass } from "../../../core/admin/ui/pages/editorControls/controlChrome";

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

test("PageEditor empty section placeholder opens the block inserter", async () => {
  const emptyPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-empty",
          name: "Empty section",
          blocks: [],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = emptyPage;
  pageEditorState.currentPage = emptyPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={emptyPage} />);

  try {
    await flush();

    // Empty-state CTA keeps the dashed affordance on the shared canvas chrome.
    const firstBlockCta = findButton(view.container, "Add the first block");
    expect(firstBlockCta?.className).toContain(editorCanvasCtaButtonClass);
    expect(firstBlockCta?.className).toContain("border-dashed");

    clickButton(view.container, "Add the first block");
    await flush();

    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    expect(view.container.textContent).toContain("Blocks");
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

test("PageEditor block selection updates layers and assistant context", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();

    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: "blk-copy",
    });

    clickButton(view.container, "Layers");
    await flush();
    clickSelector(view.container, '[data-page-editor-layer-block-id="blk-heading"]');
    await flush();

    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: "blk-heading",
      selectedBlockPath: "sections.0.blocks.0",
    });

    clickSelector(view.container, '[data-page-editor-layer-section-id="sec-hero"]');
    await flush();

    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockId: null,
      selectedBlockPath: null,
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor selected block content edits patch the selected block only", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    changeField(view.container, "Primary text", "Updated selected copy");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const heading = savedDocument.sections[0]?.blocks[0];
    const copy = savedDocument.sections[0]?.blocks[1];

    expect(heading?.props).toMatchObject({ text: "Welcome to Coderso", level: "h1" });
    expect(copy?.props).toMatchObject({ text: "Updated selected copy", format: "plain" });
  } finally {
    view.cleanup();
  }
});

test("PageEditor creates a section with the chosen block when no selection is active", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-canvas-scroller="true"]');
    await flush();
    clickButton(view.container, "Add section");
    await flush();
    clickButton(view.container, "Button");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const insertedSection = savedDocument.sections[1];

    expect(insertedSection?.type).toBe("content");
    expect(insertedSection?.blocks).toHaveLength(1);
    expect(insertedSection?.blocks[0]?.type).toBe("button");
  } finally {
    view.cleanup();
  }
});

test("PageEditor block inserter follows owner insertable block capabilities", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();

    const blockButtons = getCommandGroupButtons(view.container, "Blocks");
    const blockButtonLabels = new Set(
      blockButtons.map((button) => button.querySelector("span")?.textContent ?? "")
    );
    for (const type of pageBlockTypes) {
      const hasButton = blockButtonLabels.has(pageEditorBlockLabels[type]);
      if (pageBlockCapabilities[type].editorInsertable) {
        expect(hasButton).toBe(true);
      } else {
        expect(pageBlockCapabilities[type].reason).toBeTruthy();
        expect(hasButton).toBe(false);
      }
    }
  } finally {
    view.cleanup();
  }
});

test("PageEditor inserts and edits nested layout block slots from Layers", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Columns");
    await flush();

    clickButton(view.container, "Layers");
    await flush();
    expect(
      view.container.querySelector('[data-page-editor-layer-block-path="root:2"]')
    ).toBeTruthy();

    clickButtonByLabel(view.container, "Add block to Column 1");
    await flush();
    clickButton(view.container, "Heading");
    await flush();

    const nestedCanvasBlock = view.container.querySelector(
      '[data-page-editor-block-path="root:2/column:1:0"]'
    );
    expect(nestedCanvasBlock).toBeTruthy();
    expect(nestedCanvasBlock?.getAttribute("data-page-editor-block-depth")).toBe("2");
    expect(nestedCanvasBlock?.getAttribute("data-page-editor-block-slot-key")).toBe("column:1");
    React.act(() => {
      nestedCanvasBlock?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    const nestedRow = view.container.querySelector(
      '[data-page-editor-layer-block-path="root:2/column:1:0"]'
    );
    expect(nestedRow).toBeTruthy();

    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-hero",
      selectedBlockPath: "sections.0.blocks.2.slots.column:1.0",
    });
    expect(activeSurfaceState.contexts.at(-1)?.selectedBlockId).toMatch(/^blk_/);

    changeField(view.container, "Primary text", "Nested slot heading");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const columnsBlock = savedDocument.sections[0]?.blocks[2];
    expect(columnsBlock).toMatchObject({ type: "columns" });
    expect(columnsBlock?.slots?.["column:1"]?.[0]).toMatchObject({
      type: "heading",
      props: { text: "Nested slot heading" },
    });
    expect(columnsBlock?.slots?.["column:2"]).toBeUndefined();
  } finally {
    view.cleanup();
  }
});

test("PageEditor moves nested blocks between slots and duplicates sections with fresh nested ids", async () => {
  const nestedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-nested",
          name: "Nested section",
          blocks: [
            createPageBlockV2("columns", {
              id: "blk-columns",
              props: { count: 2, gap: 24, distribution: "equal" },
              slots: {
                "column:1": [
                  createPageBlockV2("heading", {
                    id: "blk-left",
                    props: { text: "Left nested", level: "h2", align: "left" },
                  }),
                ],
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = nestedPage;
  pageEditorState.currentPage = nestedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={nestedPage} />);

  try {
    await flush();

    clickButton(view.container, "Layers");
    await flush();
    clickSelector(view.container, '[data-page-editor-layer-block-path="root:0/column:1:0"]');
    await flush();
    clickButtonByLabel(view.container, "Move selected block to Column 2");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    let savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    let savedDocument = savedPayload?.data as PageDocumentV2;
    let columnsBlock = savedDocument.sections[0]?.blocks[0];
    expect(columnsBlock?.slots?.["column:1"]).toEqual([]);
    expect(columnsBlock?.slots?.["column:2"]?.[0]).toMatchObject({
      id: "blk-left",
      props: { text: "Left nested" },
    });

    clickSelector(view.container, '[data-page-editor-layer-section-id="sec-nested"]');
    await flush();
    clickButtonByLabel(view.container, "Duplicate section");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections).toHaveLength(2);
    const allBlockIds = savedDocument.sections.flatMap((section) =>
      collectPageBlockIds(section.blocks)
    );
    expect(new Set(allBlockIds).size).toBe(allBlockIds.length);
    expect(savedDocument.sections[1]?.blocks[0]?.slots?.["column:2"]?.[0]?.id).not.toBe("blk-left");
  } finally {
    view.cleanup();
  }
});

test("PageEditor disables slot moves that would exceed nested subtree depth", async () => {
  const nestedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-depth-gate",
          name: "Depth gate",
          blocks: [
            createPageBlockV2("group", {
              id: "blk-source-owner",
              props: { direction: "column", wrap: false, gap: 16 },
              slots: {
                children: [
                  createPageBlockV2("heading", {
                    id: "blk-source-child",
                    props: { text: "Source child", level: "h2", align: "left" },
                  }),
                ],
              },
            }),
            createPageBlockV2("group", {
              id: "blk-target-depth-1",
              props: { direction: "column", wrap: false, gap: 16 },
              slots: {
                children: [
                  createPageBlockV2("group", {
                    id: "blk-target-depth-2",
                    props: { direction: "column", wrap: false, gap: 16 },
                    slots: {
                      children: [
                        createPageBlockV2("group", {
                          id: "blk-target-depth-3",
                          props: { direction: "column", wrap: false, gap: 16 },
                        }),
                      ],
                    },
                  }),
                ],
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = nestedPage;
  pageEditorState.currentPage = nestedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={nestedPage} />);

  try {
    await flush();

    clickButton(view.container, "Layers");
    await flush();
    clickSelector(view.container, '[data-page-editor-layer-block-path="root:0"]');
    await flush();

    const tooDeepSlot = view.container.querySelector(
      '[data-page-editor-layer-slot-owner-path="root:1/children:0/children:0"][data-page-editor-layer-slot-key="children"]'
    );
    const moveButton = tooDeepSlot?.querySelector(
      'button[title="Move selected block to Children"]'
    ) as HTMLButtonElement | null;

    expect(moveButton).toBeTruthy();
    expect(moveButton?.disabled).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("PageEditor section inserter follows owner insertable section capabilities", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();

    const sectionButtons = getCommandGroupButtons(view.container, "Sections");
    const sectionButtonLabels = new Set(
      sectionButtons.map((button) => button.querySelector("span")?.textContent ?? "")
    );
    for (const type of pageSectionTypes) {
      const hasButton = sectionButtonLabels.has(pageEditorSectionLabels[type]);
      if (pageSectionCapabilities[type].insertable) {
        expect(hasButton).toBe(true);
      } else {
        expect(pageSectionCapabilities[type].reason).toBeTruthy();
        expect(hasButton).toBe(false);
      }
    }
  } finally {
    view.cleanup();
  }
});

test("PageEditor command palette catalog is frozen to 11 sections plus 20 blocks with gated titles absent", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add section");
    await flush();

    // Read the per-button title node (first span), never dialog innerText:
    // gated words like "collection"/"embed" legitimately appear in entry
    // description copy and would produce substring false positives.
    const readEntryTitles = (groupTitle: string) =>
      getCommandGroupButtons(view.container, groupTitle).map(
        (button) => button.querySelector("span")?.textContent ?? ""
      );
    const sectionPaletteTitles = readEntryTitles("Sections");
    const blockPaletteTitles = readEntryTitles("Blocks");

    expect(sectionPaletteTitles).toEqual([
      "Hero",
      "Content",
      "Feature grid",
      "Media split",
      "Timeline",
      "Gallery",
      "Comparison",
      "FAQ",
      "Testimonials",
      "CTA",
      "Custom",
    ]);
    // TASK-456 amendment: "Form" joined the block palette; TASK-457
    // amendment: "Collection" joined it; TASK-459-02 amendment: "Filters";
    // TASK-471-04 amendment: native "Badge" block; TASK-521-04 amendment:
    // the animated "Icon" block (implements the formerly-placeholder icon block).
    // TASK-522-01 amendment: the "Custom SVG" block (sanitized inline SVG).
    // TASK-534 amendment: "Gallery" (filter controls shipped) + the "Switcher"
    // and "Scroll hint" declarative-interactivity blocks.
    expect(blockPaletteTitles).toEqual([
      "Heading",
      "Text",
      "Badge",
      "Button",
      "Image",
      "Video",
      "Gallery",
      "Form",
      "List",
      "Card",
      "Collection",
      "Filters",
      "Divider",
      "Spacer",
      "Statistic",
      "Icon",
      "Quote",
      "Container",
      "Columns",
      "Group",
      "Custom SVG",
      "Switcher",
      "Scroll hint",
    ]);
    expect(sectionPaletteTitles.length + blockPaletteTitles.length).toBe(34);

    expect(sectionPaletteTitles).not.toContain("Template");
    expect(sectionPaletteTitles).not.toContain("Navigation");
    // The collection SECTION stays gated: a listing layout is a section
    // composed with the now-insertable collection BLOCK (composite-first).
    expect(sectionPaletteTitles).not.toContain("Collection");
    expect(sectionPaletteTitles).not.toContain("Filters");
    // The lead-form SECTION stays gated: a lead-form layout is a section
    // composed with the now-insertable form BLOCK (composite-first rule).
    expect(sectionPaletteTitles).not.toContain("Lead form");
    expect(sectionPaletteTitles).not.toContain("Embed");

    // TASK-534: "Gallery" is now in the block palette (filter controls shipped).
    expect(blockPaletteTitles).toContain("Gallery");
    expect(blockPaletteTitles).not.toContain("Embed");

    // TASK-521-04: the icon block is now a real, insertable runtime renderer
    // (animated inline-SVG glyph) — it is reachable from authoring via the palette.
    expect(blockPaletteTitles).toContain("Icon");
    expect(pageBlockCapabilities.icon.insertable).toBe(true);
    expect(pageBlockCapabilities.icon.editorInsertable).toBe(true);
    expect(pageBlockCapabilities.icon.runtimeRenderer).toBe("real");
  } finally {
    view.cleanup();
  }
});

test("PageEditor inserts a form block, picks a form through the combobox, previews it inert, and saves the formId", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    clickButton(view.container, "Form");
    await flush();

    // Default props: formId null -> the canvas shows the pick-a-form state.
    const canvasFormBlock = view.container.querySelector('[data-page-editor-block="form"]');
    expect(canvasFormBlock).toBeTruthy();
    expect(canvasFormBlock?.textContent).toContain(
      "Pick a form in the Content panel to preview it here."
    );

    // The Content panel renders the dynamic combobox with options resolved
    // from the cached admin forms client (id -> name).
    const trigger = view.container.querySelector(
      'button[data-page-editor-combobox-trigger="Form"]'
    );
    expect(trigger).toBeTruthy();
    expect(trigger?.textContent).toContain("Pick a form");
    React.act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(formsClientState.listForms).toHaveBeenCalled();

    const optionValues = Array.from(
      view.container.querySelectorAll("[data-page-editor-combobox-option]")
    ).map((option) => option.getAttribute("data-page-editor-combobox-option"));
    // Nullable schema (formId: null) surfaces the explicit "None" row.
    expect(optionValues).toEqual(["none", "form-contact", "form-quote"]);

    clickSelector(view.container, '[data-page-editor-combobox-option="form-contact"] button');
    await flush();
    await flush();

    // Canvas preview: the shared form markup, inert (disabled fieldset) and
    // fed by the cached form detail; the trigger now shows the form name.
    expect(formsClientState.detailRequests).toContain("form-contact");
    const preview = view.container.querySelector('[data-page-editor-form-preview="inert"]');
    expect(preview).toBeTruthy();
    expect(preview?.hasAttribute("disabled")).toBe(true);
    expect(preview?.textContent).toContain("Email address");
    expect(
      view.container.querySelector('button[data-page-editor-combobox-trigger="Form"]')?.textContent
    ).toContain("Contact");

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedFormBlock = savedDocument.sections[0]?.blocks.at(-1);
    expect(savedFormBlock).toMatchObject({
      type: "form",
      props: { formId: "form-contact", title: "" },
    });
  } finally {
    view.cleanup();
  }
});
