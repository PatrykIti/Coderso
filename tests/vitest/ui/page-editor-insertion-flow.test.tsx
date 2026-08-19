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
