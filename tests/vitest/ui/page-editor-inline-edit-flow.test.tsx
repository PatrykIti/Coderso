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

test("PageEditor canvas dblclick enters inline edit and typing plus blur updates the panel field", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    // Without a selection, double-click stays idle: single click only selects.
    const idleRegion = findInlineEditRegion(view.container, "blk-heading", "text");
    expect(idleRegion.getAttribute("data-page-editor-inline-edit")).toBe("idle");
    expect(idleRegion.getAttribute("contenteditable")).toBeNull();
    dblClickElement(idleRegion);
    await flush();
    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("idle");

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const activeRegion = findInlineEditRegion(view.container, "blk-heading", "text");
    expect(activeRegion.getAttribute("data-page-editor-inline-edit")).toBe("active");
    expect(activeRegion.getAttribute("contenteditable")).toBe("true");
    expect(document.activeElement).toBe(activeRegion);

    setInlineRegionText(activeRegion, "Inline headline");
    blurElement(activeRegion);
    await flush();

    // Panel and canvas re-render from the same document state: no refetch.
    expect(findFieldControl(view.container, "Primary text").value).toBe("Inline headline");
    expect(
      view.container.querySelector('[data-page-editor-block-id="blk-heading"]')?.textContent
    ).toContain("Inline headline");
    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("idle");
    expect(view.container.textContent).toContain("Unsaved");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props).toMatchObject({
      text: "Inline headline",
      level: "h1",
    });
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edit commits on Escape and keeps the block selected", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-copy", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-copy", "text");
    setInlineRegionText(region, "Escape committed copy");
    dispatchElementKey(region, "Escape");
    await flush();

    const committedRegion = findInlineEditRegion(view.container, "blk-copy", "text");
    expect(committedRegion.getAttribute("data-page-editor-inline-edit")).toBe("idle");
    expect(committedRegion.textContent).toBe("Escape committed copy");
    expect(findFieldControl(view.container, "Primary text").value).toBe("Escape committed copy");

    // Escape inside the region commits only: block stays selected, toolbar open.
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-copy"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("PageEditor single-line inline edit commits on Enter without inserting newlines", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    setInlineRegionText(region, "Enter committed headline");
    dispatchElementKey(region, "Enter");
    await flush();

    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("idle");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props.text).toBe("Enter committed headline");
  } finally {
    view.cleanup();
  }
});

test("PageEditor Enter on a selected block opens inline edit on its first text target", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dispatchDocumentKey("Enter");
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    expect(region.getAttribute("data-page-editor-inline-edit")).toBe("active");
    expect(region.getAttribute("contenteditable")).toBe("true");
    expect(document.activeElement).toBe(region);

    setInlineRegionText(region, "Keyboard entered headline");
    blurElement(region);
    await flush();
    expect(findFieldControl(view.container, "Primary text").value).toBe(
      "Keyboard entered headline"
    );
  } finally {
    view.cleanup();
  }
});

test("PageEditor suppresses Delete, Backspace, and Ctrl+K hotkeys while inline editing", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    dispatchElementKey(region, "Delete");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Delete selected block"]')
    ).toBeNull();

    dispatchElementKey(region, "Backspace");
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Delete selected block"]')
    ).toBeNull();

    dispatchElementKey(region, "k", { ctrlKey: true });
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeNull();

    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("active");
  } finally {
    view.cleanup();
  }
});

test("PageEditor never renders contentEditable for image, divider, or spacer blocks", async () => {
  const mediaPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-media",
          name: "Media",
          blocks: [
            createPageBlockV2("image", {
              id: "blk-image",
              props: { src: "https://cdn.test/a.jpg", alt: "Alt", caption: "Caption" },
            }),
            createPageBlockV2("divider", { id: "blk-divider" }),
            createPageBlockV2("spacer", { id: "blk-spacer" }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = mediaPage;
  pageEditorState.currentPage = mediaPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={mediaPage} />);

  try {
    await flush();

    for (const blockId of ["blk-image", "blk-divider", "blk-spacer"]) {
      clickSelector(view.container, `[data-page-editor-block-id="${blockId}"]`);
      await flush();

      const frame = findEditorBlock(view.container, blockId);
      expect(frame.querySelector("[contenteditable]")).toBeNull();
      expect(frame.querySelector("[data-page-editor-inline-edit]")).toBeNull();

      dispatchDocumentKey("Enter");
      await flush();
      expect(view.container.querySelector('[data-page-editor-inline-edit="active"]')).toBeNull();
      expect(view.container.querySelector("[contenteditable='true']")).toBeNull();
    }
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edit blur without changes is a no-op for dirty state", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    blurElement(region);
    await flush();

    expect(
      findInlineEditRegion(view.container, "blk-heading", "text").getAttribute(
        "data-page-editor-inline-edit"
      )
    ).toBe("idle");
    expect(view.container.textContent).not.toContain("Unsaved");
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edit commits sanitized plain text and never writes markup", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-copy", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-copy", "text");
    React.act(() => {
      region.innerHTML = "Pasted <b>rich</b> content";
    });
    blurElement(region);
    await flush();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const committed = savedDocument.sections[0]?.blocks[1]?.props.text;
    expect(committed).toBe("Pasted rich content");
    expect(String(committed)).not.toContain("<");
  } finally {
    view.cleanup();
  }
});

test("PageEditor rich inline edit preserves sanitized markup and updates the panel field", async () => {
  const richPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-rich-inline",
          name: "Rich inline",
          blocks: [
            createPageBlockV2("text", {
              id: "blk-rich-inline",
              props: {
                text: "<p>Existing <strong>rich</strong> copy</p>",
                format: "rich",
                align: "left",
              },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = richPage;
  pageEditorState.currentPage = richPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={richPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-rich-inline"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-rich-inline", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-rich-inline", "text");
    expect(region.getAttribute("data-page-editor-inline-edit")).toBe("active");
    expect(region.querySelector("strong")?.textContent).toBe("rich");

    setInlineRegionHtml(
      region,
      '<p>Edited <strong>rich</strong> <a href="/safe" onclick="alert(1)">safe</a><script>alert(1)</script></p>'
    );
    blurElement(region);
    await flush();

    const expected =
      '<p>Edited <strong>rich</strong> <a href="/safe" rel="nofollow noreferrer">safe</a></p>';
    expect(findFieldControl(view.container, "Primary text").value).toBe(expected);
    expect(
      view.container.querySelector('[data-page-editor-block-id="blk-rich-inline"] strong')
        ?.textContent
    ).toBe("rich");
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-rich-inline"] a')
        ?.getAttribute("href")
    ).toBe("/safe");
    expect(view.container.textContent).not.toContain("alert(1)");

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props.text).toBe(expected);
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edit commit follows moved blocks by id and skips deleted blocks", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-copy"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-copy", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-copy", "text");
    setInlineRegionText(region, "Moved inline copy");
    // Programmatic click does not blur, so the block moves while still editing.
    clickButtonByLabel(view.container, "Move block up");
    await flush();

    const movedRegion = findInlineEditRegion(view.container, "blk-copy", "text");
    expect(movedRegion.getAttribute("data-page-editor-inline-edit")).toBe("active");
    blurElement(movedRegion);
    await flush();

    clickButton(view.container, "Save");
    await flush();
    let savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    let savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.id).toBe("blk-copy");
    expect(savedDocument.sections[0]?.blocks[0]?.props.text).toBe("Moved inline copy");
    expect(savedDocument.sections[0]?.blocks[1]?.props.text).toBe("Welcome to Coderso");

    // Delete the heading while an inline edit on it is still open: the commit
    // path must fail closed on the missing block id and never write.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();
    const headingRegion = findInlineEditRegion(view.container, "blk-heading", "text");
    setInlineRegionText(headingRegion, "Half typed heading");
    clickButtonByLabel(view.container, "Delete block");
    await flush();
    clickButton(view.container, "Delete block");
    await flush();

    clickButton(view.container, "Save");
    await flush();
    savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.id)).toEqual(["blk-copy"]);
    expect(JSON.stringify(savedDocument)).not.toContain("Half typed heading");
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edits write device-scoped overrides off desktop", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const mobileButton = view.container.querySelector('button[aria-label="Mobile"]');
    React.act(() => {
      mobileButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-heading", "text"));
    await flush();

    const region = findInlineEditRegion(view.container, "blk-heading", "text");
    setInlineRegionText(region, "Mobile inline headline");
    blurElement(region);
    await flush();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const heading = savedDocument.sections[0]?.blocks[0];
    expect(heading?.props).toMatchObject({ text: "Welcome to Coderso", level: "h1" });
    expect(heading?.responsive?.mobile?.props).toEqual({ text: "Mobile inline headline" });
  } finally {
    view.cleanup();
  }
});

test("PageEditor inline edits list items and statistic fields through their prop paths", async () => {
  const richPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-rich",
          name: "Rich",
          blocks: [
            createPageBlockV2("list", {
              id: "blk-list",
              props: { items: ["First", "Second"], ordered: false },
            }),
            createPageBlockV2("statistic", {
              id: "blk-stat",
              props: { value: "42", label: "Answers", caption: "" },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = richPage;
  pageEditorState.currentPage = richPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={richPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-list"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-list", "items.1"));
    await flush();
    const itemRegion = findInlineEditRegion(view.container, "blk-list", "items.1");
    expect(itemRegion.getAttribute("data-page-editor-inline-edit")).toBe("active");
    setInlineRegionText(itemRegion, "Second updated");
    blurElement(itemRegion);
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-stat"]');
    await flush();
    dblClickElement(findInlineEditRegion(view.container, "blk-stat", "value"));
    await flush();
    const valueRegion = findInlineEditRegion(view.container, "blk-stat", "value");
    setInlineRegionText(valueRegion, "1337");
    blurElement(valueRegion);
    await flush();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[0]?.props.items).toEqual(["First", "Second updated"]);
    expect(savedDocument.sections[0]?.blocks[1]?.props).toMatchObject({
      value: "1337",
      label: "Answers",
    });
  } finally {
    view.cleanup();
  }
});

// --- TASK-425: Responsive panel content, hide/stack toggles, override list ---
