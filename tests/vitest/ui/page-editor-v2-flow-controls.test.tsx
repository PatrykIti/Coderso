// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  activeSurfaceState,
  changeField,
  changeInputByAriaLabel,
  clickButton,
  clickButtonByLabel,
  clickSegmentedOption,
  clickSelector,
  collectionClientsState,
  createDocument,
  createPage,
  dispatchDocumentKey,
  dispatchElementKey,
  findFieldControl,
  flush,
  formsClientState,
  getCommandGroupButtons,
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
  createPageBlockV2,
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

test("PageEditor button content edits write button props only", async () => {
  const buttonPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("cta", {
          id: "sec-button",
          name: "Button CTA",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-button",
              props: {
                label: "Old label",
                href: "/old",
                target: "self",
                variant: "primary",
                size: "md",
              },
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

    changeField(view.container, "Primary text", "Start now");
    changeField(view.container, "Button URL", "/start");
    clickSegmentedOption(view.container, "Target", "blank");
    clickSegmentedOption(view.container, "Variant", "secondary");
    clickSegmentedOption(view.container, "Size", "lg");
    await flush();
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const button = savedDocument.sections[0]?.blocks[0];

    expect(button?.props).toMatchObject({
      label: "Start now",
      href: "/start",
      target: "blank",
      variant: "secondary",
      size: "lg",
    });
    expect(button?.props).not.toHaveProperty("text");
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas button anchors select blocks without navigating", async () => {
  const buttonPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("cta", {
          id: "sec-button",
          name: "Button CTA",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-button",
              props: {
                label: "Open link",
                href: "/old",
                target: "self",
                variant: "primary",
                size: "md",
              },
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

    const anchor = view.container.querySelector(
      '[data-page-editor-block-id="blk-button"] a[href="/old"]'
    );
    expect(anchor).toBeTruthy();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    let dispatchResult = true;
    React.act(() => {
      dispatchResult = anchor?.dispatchEvent(click) ?? true;
    });
    await flush();

    expect(dispatchResult).toBe(false);
    expect(click.defaultPrevented).toBe(true);
    expect(activeSurfaceState.contexts.at(-1)).toMatchObject({
      kind: "page",
      selectedSectionId: "sec-button",
      selectedBlockId: "blk-button",
    });
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
test("PageEditor save keeps a freshly inserted empty list block in the document", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    clickButton(view.container, "Add block");
    await flush();
    const listEntry = getCommandGroupButtons(view.container, "Blocks").find(
      (button) => button.querySelector("span")?.textContent === "List"
    );
    expect(listEntry).toBeTruthy();
    React.act(() => {
      listEntry?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    // Save immediately, before the author types any items.
    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const savedList = savedDocument.sections
      .flatMap((section) => section.blocks)
      .find((block) => block.type === "list");
    expect(savedList?.props).toMatchObject({ items: [], ordered: false });
  } finally {
    view.cleanup();
  }
});

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
