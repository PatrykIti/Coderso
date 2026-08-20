// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";

import {
  harnessState,
  createPage,
  createDocument,
  mount,
  flush,
  findButton,
  clickButton,
  clickButtonByLabel,
  dispatchDocumentKey,
  clickSelector,
  getCommandGroupButtons,
  clickSegmentedOption,
} from "./pageEditorV2FlowHarness";

const { pageEditorState, activeSurfaceState } = harnessState;

import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import {
  createPageBlockV2,
  createPageSectionV2,
  PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import { PageSectionRender } from "../../../core/services/pages/pageRendererV2";
import { renderToStaticMarkup } from "react-dom/server";

const canvasBlockIdOrder = (container: ParentNode, sectionId: string) =>
  Array.from(
    container.querySelectorAll(`[data-section-id="${sectionId}"] [data-page-editor-block-id]`)
  ).map((element) => element.getAttribute("data-page-editor-block-id"));

const clickPaletteBlock = (container: ParentNode, label: string) => {
  const button = getCommandGroupButtons(container, "Blocks").find((entry) =>
    entry.textContent?.includes(label)
  );
  expect(button).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const createDefaultHeroPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero-default",
          name: "Hero",
          variant: "default",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-hero-heading",
              props: { text: "Build with Coderso", level: "h1", align: "center" },
            }),
            createPageBlockV2("text", {
              id: "blk-hero-copy",
              props: {
                text: "Compose sections and atomic blocks directly on the canvas.",
                format: "plain",
                align: "center",
              },
            }),
            createPageBlockV2("button", {
              id: "blk-hero-cta",
              props: {
                label: "Primary action",
                href: "/",
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

const createTwoColumnPage = () =>
  createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-grid",
          name: "Grid",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1100 },
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-left",
              props: { text: "Left heading", level: "h2", align: "left" },
            }),
            createPageBlockV2("text", {
              id: "blk-right",
              props: { text: "Right copy.", format: "plain", align: "left" },
            }),
          ],
        }),
      ],
    }),
  });

test("PageEditor empty multi-column section paints one ghost tile per column and tiles append through the palette", async () => {
  const gridPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-grid",
          name: "Grid",
          layout: { columns: 3, align: "start", justify: "start", maxWidth: 1100 },
          blocks: [],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = gridPage;
  pageEditorState.currentPage = gridPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={gridPage} />);

  try {
    await flush();

    // Owner finding #5: empty 3-column section paints exactly three tiles.
    const emptyTiles = view.container.querySelectorAll('[data-page-editor-ghost="section-column"]');
    expect(emptyTiles).toHaveLength(3);
    expect(view.container.querySelector('button[aria-label="Add block to column 1"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Add block to column 3"]')).toBeTruthy();
    expect(findButton(view.container, "Add the first block")).toBeFalsy();

    // Round 3: the column-1 tile inserts WITH the column assignment, so the
    // block is pinned to column 1 instead of relying on auto-flow.
    clickSelector(view.container, 'button[aria-label="Add block to column 1"]');
    await flush();
    clickPaletteBlock(view.container, "Heading");
    await flush();

    expect(view.container.querySelector('[data-page-editor-block-path="root:0"]')).toBeTruthy();
    // Per-column composition is now active: EVERY column keeps its own
    // persistent add tile — a compact append tile under the filled column 1
    // stack, full-size tiles in the still-empty columns 2 and 3.
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="section-column"]')
    ).toHaveLength(2);
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="section-column-append"]')
    ).toHaveLength(1);
    const wrapperColumns = view.container.querySelectorAll("[data-page-section-column]");
    expect(wrapperColumns).toHaveLength(3);

    // Column 3 starts empty and fills independently of columns 1 and 2.
    clickSelector(view.container, 'button[aria-label="Add block to column 3"]');
    await flush();
    clickPaletteBlock(view.container, "Text");
    await flush();

    expect(view.container.querySelector('[data-page-editor-block-path="root:1"]')).toBeTruthy();
    const columnThree = view.container.querySelector('[data-page-section-column="3"]');
    expect(columnThree?.querySelector('[data-page-editor-block="text"]')).toBeTruthy();
    expect(
      view.container
        .querySelector('[data-page-section-column="2"]')
        ?.querySelector("[data-page-editor-block]")
    ).toBeFalsy();

    clickButton(view.container, "Save");
    await flush();

    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.type)).toEqual([
      "heading",
      "text",
    ]);
    expect(savedDocument.sections[0]?.blocks.map((block) => block.style?.column)).toEqual([1, 3]);
  } finally {
    view.cleanup();
  }
});

test("PageEditor multi-column left/right assign the block's column and up/down reorder within the column stack", async () => {
  const gridPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-grid",
          name: "Grid",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1100 },
          blocks: ["blk-b1", "blk-b2", "blk-b3", "blk-b4"].map((id, index) =>
            createPageBlockV2("heading", {
              id,
              props: { text: `Block ${index + 1}`, level: "h2", align: "left" },
            })
          ),
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = gridPage;
  pageEditorState.currentPage = gridPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={gridPage} />);

  try {
    await flush();

    // Auto-flow mode: every column keeps a persistent add tile.
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="section-column-append"]')
    ).toHaveLength(2);

    clickSelector(view.container, '[data-page-editor-block-id="blk-b1"]');
    await flush();

    expect(view.container.querySelector('button[aria-label="Move block left"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block right"]')).toBeTruthy();

    // Right = SET column 2 on blk-b1 (owner finding #5 round 3): the block
    // moves into the column 2 stack while every sibling keeps its auto-flow
    // cell (blk-b3 stays alone in column 1). DOM order is column-grouped.
    clickButtonByLabel(view.container, "Move block right");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b3",
      "blk-b1",
      "blk-b2",
      "blk-b4",
    ]);

    // Down = swap with the next block of the SAME column stack (blk-b2).
    clickButtonByLabel(view.container, "Move block down");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b3",
      "blk-b2",
      "blk-b1",
      "blk-b4",
    ]);

    // Up = back to the top of the column 2 stack.
    clickButtonByLabel(view.container, "Move block up");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b3",
      "blk-b1",
      "blk-b2",
      "blk-b4",
    ]);

    // Stack-edge move is a strict no-op, never a clamp.
    clickButtonByLabel(view.container, "Move block up");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b3",
      "blk-b1",
      "blk-b2",
      "blk-b4",
    ]);

    // Left = assign back to column 1; blk-b1 interleaves by list order.
    clickButtonByLabel(view.container, "Move block left");
    await flush();
    expect(canvasBlockIdOrder(view.container, "sec-grid")).toEqual([
      "blk-b1",
      "blk-b3",
      "blk-b2",
      "blk-b4",
    ]);

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks.map((block) => block.id)).toEqual([
      "blk-b1",
      "blk-b2",
      "blk-b3",
      "blk-b4",
    ]);
    // The vertical reorder pinned every block, so the composition is explicit.
    expect(savedDocument.sections[0]?.blocks.map((block) => block.style?.column)).toEqual([
      1, 2, 1, 2,
    ]);
  } finally {
    view.cleanup();
  }
});

test("PageEditor switching a section to two columns keeps existing blocks together in column 1", async () => {
  const heroPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("hero", {
          id: "sec-hero-columns",
          name: "Hero",
          layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-hero-heading",
              props: { text: "Welcome", level: "h1", align: "left" },
            }),
            createPageBlockV2("text", {
              id: "blk-hero-copy",
              props: { text: "Hero copy.", format: "plain", align: "left" },
            }),
            createPageBlockV2("button", {
              id: "blk-hero-cta",
              props: { label: "Start", href: "/", target: "self", variant: "primary", size: "md" },
            }),
          ],
        }),
      ],
    }),
  });
  pageEditorState.cachedPage = heroPage;
  pageEditorState.currentPage = heroPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={heroPage} />);

  try {
    await flush();

    // Owner finding #5 (round 3) bridge: switching 1 -> 2 columns pins every
    // existing block to column 1 in the same write — the hero heading, copy,
    // and button stay stacked together instead of scattering across cells.
    clickSelector(view.container, '[data-section-id="sec-hero-columns"]');
    await flush();
    clickButtonByLabel(view.container, "Layout panel");
    clickSegmentedOption(view.container, "Columns", "2");
    await flush();

    const columnOne = view.container.querySelector(
      '[data-page-section-column-owner="sec-hero-columns"][data-page-section-column="1"]'
    );
    expect(columnOne).toBeTruthy();
    expect(
      Array.from(columnOne!.querySelectorAll("[data-page-editor-block-id]")).map((element) =>
        element.getAttribute("data-page-editor-block-id")
      )
    ).toEqual(["blk-hero-heading", "blk-hero-copy", "blk-hero-cta"]);

    // Column 2 starts empty with its own persistent add tile.
    const columnTwo = view.container.querySelector(
      '[data-page-section-column-owner="sec-hero-columns"][data-page-section-column="2"]'
    );
    expect(columnTwo?.querySelector("[data-page-editor-block-id]")).toBeFalsy();
    expect(columnTwo?.querySelector('button[aria-label="Add block to column 2"]')).toBeTruthy();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.layout.columns).toBe(2);
    expect(savedDocument.sections[0]?.blocks.map((block) => block.style?.column)).toEqual([
      1, 1, 1,
    ]);
  } finally {
    view.cleanup();
  }
});

test("PageEditor hides left/right movers in single-column contexts and up/down inside row groups", async () => {
  const mixedPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-mixed",
          name: "Mixed",
          blocks: [
            createPageBlockV2("heading", {
              id: "blk-single",
              props: { text: "Single column", level: "h2", align: "left" },
            }),
            createPageBlockV2("group", {
              id: "blk-row",
              props: { direction: "row", wrap: false, gap: 16 },
              slots: {
                children: [
                  createPageBlockV2("button", {
                    id: "blk-row-first",
                    props: {
                      label: "First",
                      href: "/a",
                      target: "self",
                      variant: "primary",
                      size: "md",
                    },
                  }),
                  createPageBlockV2("button", {
                    id: "blk-row-second",
                    props: {
                      label: "Second",
                      href: "/b",
                      target: "self",
                      variant: "primary",
                      size: "md",
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
  pageEditorState.cachedPage = mixedPage;
  pageEditorState.currentPage = mixedPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={mixedPage} />);

  try {
    await flush();

    // Single-column section root: vertical movers only.
    clickSelector(view.container, '[data-page-editor-block-id="blk-single"]');
    await flush();
    expect(view.container.querySelector('button[aria-label="Move block up"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block left"]')).toBeFalsy();
    expect(view.container.querySelector('button[aria-label="Move block right"]')).toBeFalsy();

    // Row-direction group child: horizontal movers only (a single row has no
    // vertical axis).
    clickSelector(view.container, '[data-page-editor-block-id="blk-row-first"]');
    await flush();
    expect(view.container.querySelector('button[aria-label="Move block left"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block right"]')).toBeTruthy();
    expect(view.container.querySelector('button[aria-label="Move block up"]')).toBeFalsy();
    expect(view.container.querySelector('button[aria-label="Move block down"]')).toBeFalsy();

    clickButtonByLabel(view.container, "Move block right");
    await flush();
    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    expect(savedDocument.sections[0]?.blocks[1]?.slots?.children?.map((child) => child.id)).toEqual(
      ["blk-row-second", "blk-row-first"]
    );
  } finally {
    view.cleanup();
  }
});

test("PageEditor Add block beside wraps the selection into a row group, then appends inside it", async () => {
  const ctaPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-cta",
          name: "CTA",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-cta",
              props: {
                label: "Primary action",
                href: "/",
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
  pageEditorState.cachedPage = ctaPage;
  pageEditorState.currentPage = ctaPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={ctaPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-cta"]');
    await flush();
    clickButtonByLabel(view.container, "Add block beside");
    await flush();
    clickPaletteBlock(view.container, "Button");
    await flush();

    // Non-destructive wrap: the original block keeps its id/props as the row
    // group's first child; the new block lands beside it and gets selected.
    const wrappedFirst = view.container.querySelector(
      '[data-page-editor-block-path="root:0/children:0"]'
    );
    const insertedSecond = view.container.querySelector(
      '[data-page-editor-block-path="root:0/children:1"]'
    );
    expect(wrappedFirst?.getAttribute("data-page-editor-block-id")).toBe("blk-cta");
    expect(insertedSecond?.getAttribute("data-page-editor-block")).toBe("button");
    expect(insertedSecond?.getAttribute("data-selected")).toBe("true");

    // Canvas renders both buttons side by side inside the row-group slot.
    const rowSlot = view.container.querySelector('[data-page-block-slot="children"]');
    expect(rowSlot?.className).toContain("flex-row");
    expect(rowSlot?.querySelectorAll("[data-page-editor-block-id]")).toHaveLength(2);

    // Add beside again with the row group as parent: append, never re-wrap.
    clickButtonByLabel(view.container, "Add block beside");
    await flush();
    clickPaletteBlock(view.container, "Button");
    await flush();

    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const rootBlocks = savedDocument.sections[0]?.blocks ?? [];
    expect(rootBlocks).toHaveLength(1);
    expect(rootBlocks[0]).toMatchObject({
      type: "group",
      props: { direction: "row", wrap: false, gap: 16 },
    });
    const children = rootBlocks[0]?.slots?.children ?? [];
    expect(children.map((child) => child.type)).toEqual(["button", "button", "button"]);
    expect(children[0]?.id).toBe("blk-cta");
    expect(children[0]?.props.label).toBe("Primary action");

    // The Layers panel surfaces the same action for the selected block.
    clickButton(view.container, "Layers");
    await flush();
    expect(
      view.container.querySelectorAll('button[aria-label="Add block beside"]').length
    ).toBeGreaterThanOrEqual(2);
  } finally {
    view.cleanup();
  }
});

test("PageEditor cancelling the Add block beside palette never wraps or dirties the document", async () => {
  const ctaPage = createPage({
    currentData: createDocument({
      sections: [
        createPageSectionV2("content", {
          id: "sec-cta",
          name: "CTA",
          blocks: [
            createPageBlockV2("button", {
              id: "blk-cta",
              props: {
                label: "Primary action",
                href: "/",
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
  pageEditorState.cachedPage = ctaPage;
  pageEditorState.currentPage = ctaPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={ctaPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-cta"]');
    await flush();
    clickButtonByLabel(view.container, "Add block beside");
    await flush();
    clickButton(view.container, "Close");
    await flush();

    expect(
      view.container
        .querySelector('[data-page-editor-block-path="root:0"]')
        ?.getAttribute("data-page-editor-block")
    ).toBe("button");
    // No document write happened, so the dirty-state badge must stay absent.
    expect(view.container.textContent).not.toContain("Unsaved");

    // A later plain insert must not consume the stale beside target.
    clickButtonByLabel(view.container, "Add block beside");
    await flush();
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-block-slot="children"]')).toBeFalsy();
  } finally {
    view.cleanup();
  }
});

test("PageEditor default hero button selection surfaces Add block beside in the toolbar AND as a canvas handle", async () => {
  const heroPage = createDefaultHeroPage();
  pageEditorState.cachedPage = heroPage;
  pageEditorState.currentPage = heroPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={heroPage} />);

  try {
    await flush();

    // No block selected (section-level selection): neither the toolbar action
    // nor the canvas handle render.
    expect(view.container.querySelector('button[aria-label="Add block beside"]')).toBeFalsy();
    expect(view.container.querySelector('[data-page-editor-ghost="add-block-beside"]')).toBeFalsy();

    clickSelector(view.container, '[data-page-editor-block-id="blk-hero-cta"]');
    await flush();

    // The toolbar action is present and ENABLED in the head-row action cluster.
    const toolbarBeside = view.container.querySelector(
      '[data-page-editor-toolbar-actions="true"] button[aria-label="Add block beside"]'
    ) as HTMLButtonElement | null;
    expect(toolbarBeside).toBeTruthy();
    expect(toolbarBeside?.disabled).toBe(false);

    // The canvas renders the compact ghost "+" handle inside the selected
    // block's frame — the discoverable on-canvas mirror of the same action.
    const handle = view.container.querySelector(
      'button[data-page-editor-ghost="add-block-beside"]'
    ) as HTMLButtonElement | null;
    expect(handle).toBeTruthy();
    expect(handle?.getAttribute("aria-label")).toBe("Add block beside");
    expect(handle?.closest('[data-page-editor-block-id="blk-hero-cta"]')).toBeTruthy();

    // Activating the handle opens the palette pre-targeted beside the button;
    // picking a block wraps the selection into a row group and selects the
    // new block (same contract as the toolbar action).
    clickSelector(view.container, 'button[data-page-editor-ghost="add-block-beside"]');
    await flush();
    clickPaletteBlock(view.container, "Button");
    await flush();

    const wrappedFirst = view.container.querySelector(
      '[data-page-editor-block-path="root:2/children:0"]'
    );
    const insertedSecond = view.container.querySelector(
      '[data-page-editor-block-path="root:2/children:1"]'
    );
    expect(wrappedFirst?.getAttribute("data-page-editor-block-id")).toBe("blk-hero-cta");
    expect(insertedSecond?.getAttribute("data-page-editor-block")).toBe("button");
    expect(insertedSecond?.getAttribute("data-selected")).toBe("true");

    // Exactly one handle: it follows the (new) selection, never duplicates.
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="add-block-beside"]')
    ).toHaveLength(1);
    expect(
      view.container
        .querySelector('[data-page-editor-ghost="add-block-beside"]')
        ?.closest('[data-page-editor-block-path="root:2/children:1"]')
    ).toBeTruthy();

    // The published front HTML of the persisted document stays free of the
    // canvas handle (and of any editor ghost chrome).
    clickButton(view.container, "Save");
    await flush();
    const savedPayload = pageEditorState.updatePage.mock.calls.at(-1)?.[1];
    const savedDocument = savedPayload?.data as PageDocumentV2;
    const front = renderToStaticMarkup(<PageSectionRender section={savedDocument.sections[0]!} />);
    expect(front).not.toContain("data-page-editor-ghost");
    expect(front).not.toContain("Add block beside");
    // The row group renders both buttons on the front.
    expect(front.match(/<a\s/g) ?? []).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("PageEditor canvas beside handle clears with the selection and respects action validity", async () => {
  const heroPage = createDefaultHeroPage();
  pageEditorState.cachedPage = heroPage;
  pageEditorState.currentPage = heroPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={heroPage} />);

  try {
    await flush();

    clickSelector(view.container, '[data-page-editor-block-id="blk-hero-cta"]');
    await flush();
    expect(
      view.container.querySelectorAll('[data-page-editor-ghost="add-block-beside"]')
    ).toHaveLength(1);

    // Escape clears the block selection back to the section: both the toolbar
    // action and the canvas handle disappear.
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('button[aria-label="Add block beside"]')).toBeFalsy();
    expect(view.container.querySelector('[data-page-editor-ghost="add-block-beside"]')).toBeFalsy();
  } finally {
    view.cleanup();
  }
});

// --- Round-3 friction A: single-click flow while another block is selected ---

test("PageEditor first click acts while another block is selected: ghost tile inserts, other block takes selection", async () => {
  const gridPage = createTwoColumnPage();
  pageEditorState.cachedPage = gridPage;
  pageEditorState.currentPage = gridPage;
  const view = mount(<PageEditor pageId="page-1" initialPage={gridPage} />);

  try {
    await flush();

    // A block is selected and the floating toolbar (expanded panel) is open.
    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-left"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();

    // The FIRST click on a column ghost tile opens the pre-targeted palette —
    // no Escape/deselect step in between.
    clickSelector(view.container, 'button[aria-label="Add block to column 2"]');
    await flush();
    expect(
      view.container.querySelector('[role="dialog"][aria-label="Command palette"]')
    ).toBeTruthy();
    clickPaletteBlock(view.container, "Quote");
    await flush();

    const inserted = view.container.querySelector('[data-page-editor-block="quote"]');
    expect(inserted).toBeTruthy();
    expect(inserted?.closest('[data-page-section-column="2"]')).toBeTruthy();

    // Re-select the first block; a single click on ANOTHER block hands the
    // selection over directly, without a prior deselect.
    clickSelector(view.container, '[data-page-editor-block-id="blk-left"]');
    await flush();
    clickSelector(view.container, '[data-page-editor-block-id="blk-right"]');
    await flush();
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-right"]')
        ?.getAttribute("data-selected")
    ).toBe("true");
    expect(
      view.container
        .querySelector('[data-page-editor-block-id="blk-left"]')
        ?.getAttribute("data-selected")
    ).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("PageEditor reserves right-rail padding on the canvas scroller while a selection is active (builder chrome)", async () => {
  // TASK-495-02: the builder chrome (page host) docks the panel into a light
  // right rail, so the canvas reserves RIGHT padding (not bottom clearance) so
  // the centered frame is not occluded by the overlay. The legacy bottom
  // clearance (ResizeObserver + --page-editor-toolbar-clearance) is retained
  // for the menu host only.
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    const scroller = view.container.querySelector(
      '[data-page-editor-canvas-scroller="true"]'
    ) as HTMLElement;
    expect(scroller).toBeTruthy();

    // The editor auto-selects the first section, so the right rail is visible
    // and right padding is reserved from the start.
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeTruthy();
    expect(scroller.className).toContain("sm:pr-[300px] lg:pr-[300px]");
    // The builder branch never sets the legacy bottom-clearance var.
    expect(scroller.style.paddingBottom).toBe("");
    expect(scroller.style.getPropertyValue("--page-editor-toolbar-clearance")).toBe("");

    // Escape clears the selection: the rail unmounts and the padding is
    // released with it.
    dispatchDocumentKey("Escape");
    await flush();
    expect(view.container.querySelector('[data-page-editor-floating-toolbar="true"]')).toBeFalsy();
    expect(scroller.className).not.toContain("sm:pr-[300px] lg:pr-[300px]");

    // Selecting a block restores the right padding.
    clickSelector(view.container, '[data-page-editor-block-id="blk-heading"]');
    await flush();
    expect(scroller.className).toContain("sm:pr-[300px] lg:pr-[300px]");
  } finally {
    view.cleanup();
  }
});

// ---------------------------------------------------------------------------

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
// TASK-521-05-L01/L02 — compact page-settings side panel relocation + Effects.
// (Uses the shared flow harness above; the default page host has no
// `renderSettings`, so the compact panel — not the full-height Sheet — is the
// settings surface.)
// ---------------------------------------------------------------------------
