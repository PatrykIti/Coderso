// @vitest-environment happy-dom
//
// TASK-105-08-04: ScreenAuthoringCanvas render/interaction coverage — rail
// panel switching (insert/layers/inspect/settings), section-only vs block
// selection routing to the section/block inspectors, the block action cluster,
// the command palette (open/filter/run/Escape/Enter), the canvas empty message,
// the section CRUD affordances, nested layer nodes (children + slots), and the
// canvas click-to-clear selection behavior.

import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  clickByAccessibleName,
  clickBySelector,
  mountScreenAuthoringCanvas,
} from "./support/screenAuthoringCanvasHarness";
import type {
  ScreenBlockV1,
  ScreenDocumentV1,
  ScreenFieldBinding,
} from "../../../core/services/customScreens/customScreenContracts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const headingBlock = (overrides: Partial<ScreenBlockV1> = {}): ScreenBlockV1 => ({
  id: "block-h1",
  type: "heading",
  label: "Title",
  data: { text: "Hello world", label: "Title" },
  style: { width: "auto", align: "start" },
  ...overrides,
});

const textBlock = (overrides: Partial<ScreenBlockV1> = {}): ScreenBlockV1 => ({
  id: "block-t1",
  type: "text",
  label: "Body",
  data: { content: "Supporting text" },
  ...overrides,
});

const documentWithSections = (): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [
    {
      id: "sec-1",
      type: "section",
      label: "Hero",
      data: {},
      blocks: [headingBlock(), textBlock()],
    },
    {
      id: "sec-2",
      type: "section",
      label: "Details",
      data: {},
      blocks: [],
    },
  ],
});

const emptyDocument = (): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [],
});

const nestedDocument = (): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [
    {
      id: "sec-1",
      type: "section",
      label: "Nested",
      data: {},
      blocks: [
        {
          id: "group-1",
          type: "field-group",
          label: "Group",
          data: { title: "Group", description: "desc" },
          children: [headingBlock({ id: "child-1", label: "Child" })],
          slots: {
            main: [
              textBlock({
                id: "slot-1",
                label: "Slot Text",
                data: { content: "Supporting text", label: "Slot Text" },
              }),
            ],
          },
        },
      ],
    },
  ],
});

const bindings: ScreenFieldBinding[] = [
  {
    id: "b-1",
    blockId: "block-h1",
    propPath: "text",
    source: "entry",
    field: "title",
    mode: "read",
  },
];

const mounts: Array<{ cleanup: () => void }> = [];
afterEach(() => {
  while (mounts.length > 0) {
    const mount = mounts.pop();
    mount?.cleanup();
  }
  document.body.innerHTML = "";
});

const mount = (options: Parameters<typeof mountScreenAuthoringCanvas>[0]) => {
  const handlers = {
    onAddSection: vi.fn(),
    onRenameSection: vi.fn(),
    onMoveSection: vi.fn(),
    onDeleteSection: vi.fn(),
    onAddBlock: vi.fn(),
    onSetInsertPoint: vi.fn(),
    onDragMove: vi.fn(),
    onPatchBlock: vi.fn(),
    onPatchBlockData: vi.fn(),
    onPatchSection: vi.fn(),
    onPatchBinding: vi.fn(),
    onMove: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
  };
  const mounted = mountScreenAuthoringCanvas(options, handlers);
  mounts.push(mounted);
  return { ...mounted, handlers };
};

describe("ScreenAuthoringCanvas", () => {
  test("seeds the Insert rail with the full palette chip grid", () => {
    const { container } = mount({ document: documentWithSections() });
    const library = container.querySelector('[data-screen-block-library="true"]');
    expect(library).not.toBeNull();
    expect(library?.textContent).toContain("Screen Blocks");
    for (const label of [
      "Heading",
      "Text",
      "Field",
      "Stat",
      "Divider",
      "Image",
      "Related list",
      "Tabs",
      "Button",
    ]) {
      expect(library?.textContent).toContain(label);
    }
  });

  test("a palette chip add switches the rail to the inspect body", () => {
    const { container, handlers } = mount({ document: documentWithSections() });
    const chip = Array.from(container.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim() === "Heading"
    );
    expect(chip).toBeDefined();
    React.act(() => chip!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(handlers.onAddBlock).toHaveBeenCalledWith("heading", undefined);
    // No block selected yet: the inspect body falls through to the section
    // inspector's empty prompt.
    expect(container.textContent).toContain(
      "Select a section on the canvas to edit its column layout."
    );
  });

  test("the rail head offers the command palette search when no block is selected", () => {
    const { container } = mount({ document: documentWithSections() });
    const openButton = container.querySelector('button[aria-label="Open command palette"]');
    expect(openButton).not.toBeNull();
    expect(container.querySelector('button[aria-label="Move selected block up"]')).toBeNull();
    clickByAccessibleName(container, "Open command palette");
    const palette = document.body.querySelector('[data-authoring-command-palette="true"]');
    expect(palette).not.toBeNull();
    expect(palette?.textContent).toContain("Two columns");
    expect(palette?.textContent).toContain("Add section");
  });

  test("the command palette filters to a query and runs the first match on Enter", () => {
    const { container, handlers } = mount({ document: documentWithSections() });
    clickByAccessibleName(container, "Open command palette");
    const input = document.body.querySelector(
      '[data-authoring-command-palette="true"] input'
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    React.act(() => {
      input!.focus();
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input!), "value")?.set;
      setter?.call(input!, "column");
      input!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const filteredPalette = document.body.querySelector('[data-authoring-command-palette="true"]');
    expect(filteredPalette?.textContent).toContain("Two columns");
    expect(filteredPalette?.textContent).not.toContain("Heading");
    React.act(() => {
      input!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(handlers.onAddBlock).toHaveBeenCalledWith("columns", undefined);
    expect(document.body.querySelector('[data-authoring-command-palette="true"]')).toBeNull();
  });

  test("Escape closes the command palette without running a command", () => {
    const { container, handlers } = mount({ document: documentWithSections() });
    clickByAccessibleName(container, "Open command palette");
    const input = document.body.querySelector(
      '[data-authoring-command-palette="true"] input'
    ) as HTMLInputElement | null;
    React.act(() => {
      input!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(document.body.querySelector('[data-authoring-command-palette="true"]')).toBeNull();
    expect(handlers.onAddBlock).not.toHaveBeenCalled();
  });

  test("the Layers rail renders section and block nodes and a section click routes to the section inspector", () => {
    const { container, controller } = mount({ document: documentWithSections() });
    clickByAccessibleName(container, "Layers");
    const sectionNode = container.querySelector(
      '[data-authoring-layer-node="sec-1"][data-authoring-layer-kind="section"]'
    );
    const blockNode = container.querySelector(
      '[data-authoring-layer-node="block-h1"][data-authoring-layer-kind="block"]'
    );
    expect(sectionNode).not.toBeNull();
    expect(blockNode).not.toBeNull();
    expect(container.textContent).toContain("Select sections and blocks on the canvas.");
    React.act(() => {
      sectionNode!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(controller.current?.state.selectedSectionId).toBe("sec-1");
    expect(container.querySelector('[data-screen-section-layout-group="true"]')).not.toBeNull();
    expect(container.textContent).toContain("Column gap (px)");
  });

  test("a layers block click resolves the owning section and shows the block inspector", () => {
    const { container, handlers } = mount({ document: documentWithSections(), bindings });
    clickByAccessibleName(container, "Layers");
    const blockNode = container.querySelector(
      '[data-authoring-layer-node="block-h1"][data-authoring-layer-kind="block"]'
    ) as HTMLElement | null;
    React.act(() => {
      blockNode!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector('[data-screen-bound-field="true"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Move selected block up"]')).not.toBeNull();
    expect(handlers.onMove).not.toHaveBeenCalled();
  });

  test("the selected block action cluster drives move, duplicate, and delete", () => {
    const { container, handlers } = mount({
      document: documentWithSections(),
      bindings,
      initialSelectedBlockId: "block-h1",
    });
    clickByAccessibleName(container, "Move selected block up");
    clickByAccessibleName(container, "Move selected block down");
    clickByAccessibleName(container, "Duplicate selected block");
    clickByAccessibleName(container, "Delete selected block");
    expect(handlers.onMove).toHaveBeenNthCalledWith(1, "block-h1", "up");
    expect(handlers.onMove).toHaveBeenNthCalledWith(2, "block-h1", "down");
    expect(handlers.onDuplicate).toHaveBeenCalledWith("block-h1");
    expect(handlers.onDelete).toHaveBeenCalledWith("block-h1");
  });

  test("the head shows the selected block label and type chip", () => {
    const { container } = mount({
      document: documentWithSections(),
      bindings,
      initialSelectedBlockId: "block-h1",
    });
    const head = container.querySelector('[data-screen-rail-head="true"]');
    expect(head?.textContent).toContain("Title");
    expect(head?.textContent).toContain("heading");
  });

  test("a canvas click clears the block and section selection", () => {
    const { container, controller } = mount({ document: documentWithSections(), bindings });
    // Select a block through the canvas first so the rail body is the inspector,
    // then a scroller click must clear both selections.
    const selectBlock = container.querySelector('[data-screen-select-block="block-h1"]');
    React.act(() => {
      selectBlock!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const scroller = container.querySelector('[data-screen-editor-canvas-scroller="true"]');
    React.act(() => {
      scroller!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(controller.current?.state.selectedBlockId).toBeNull();
    expect(controller.current?.state.selectedSectionId).toBeNull();
    // With no selection the inspect body falls back to the section prompt and
    // the head restores the command search button.
    expect(container.textContent).toContain(
      "Select a section on the canvas to edit its column layout."
    );
    expect(container.querySelector('button[aria-label="Open command palette"]')).not.toBeNull();
  });

  test("the canvas select section button selects the section through the renderer", () => {
    const { container, controller } = mount({ document: documentWithSections() });
    const selectSection = container.querySelector('[data-screen-select-section="sec-1"]');
    React.act(() => {
      selectSection!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(controller.current?.state.selectedSectionId).toBe("sec-1");
    expect(controller.current?.state.selectedBlockId).toBeNull();
  });

  test("the canvas select block button selects the block and forces the inspect panel", () => {
    const { container, controller } = mount({ document: documentWithSections(), bindings });
    const selectBlock = container.querySelector('[data-screen-select-block="block-h1"]');
    React.act(() => {
      selectBlock!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(controller.current?.state.selectedBlockId).toBe("block-h1");
    expect(container.querySelector('[data-screen-bound-field="true"]')).not.toBeNull();
  });

  test("a selected section reveals rename, move, and delete controls in the renderer", () => {
    const { container, handlers } = mount({
      document: documentWithSections(),
      initialSelectedSectionId: "sec-1",
    });
    const rename = container.querySelector(
      '[data-screen-section-rename="true"]'
    ) as HTMLInputElement | null;
    expect(rename).not.toBeNull();
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(rename!), "value")?.set;
      setter?.call(rename!, "New hero");
      rename!.dispatchEvent(new Event("input", { bubbles: true }));
      rename!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(handlers.onRenameSection).toHaveBeenCalledWith("sec-1", "New hero");
    clickBySelector(container, '[data-screen-section-move-up="true"]');
    clickBySelector(container, '[data-screen-section-move-down="true"]');
    clickBySelector(container, '[data-screen-section-delete="true"]');
    expect(handlers.onMoveSection).toHaveBeenCalledWith("sec-1", "up");
    expect(handlers.onMoveSection).toHaveBeenCalledWith("sec-1", "down");
    expect(handlers.onDeleteSection).toHaveBeenCalledWith("sec-1");
  });

  test("the dashed Add section affordance creates a section without clearing selection", () => {
    const { container, handlers, controller } = mount({
      document: documentWithSections(),
      initialSelectedSectionId: "sec-1",
    });
    clickBySelector(container, '[data-screen-add-section="true"]');
    expect(handlers.onAddSection).toHaveBeenCalledTimes(1);
    expect(controller.current?.state.selectedSectionId).toBe("sec-1");
  });

  test("an empty document renders the builder empty message and empty layers state", () => {
    const { container } = mount({ document: emptyDocument() });
    expect(container.textContent).toContain(
      "Use Insert or the command palette to add screen blocks."
    );
    clickByAccessibleName(container, "Layers");
    expect(container.textContent).toContain("Nothing on the canvas yet.");
  });

  test("a settings panel slot adds a Settings rail that swaps the body", () => {
    const { container } = mount({
      document: documentWithSections(),
      settingsPanel: <div data-settings-panel="true">Screen settings</div>,
    });
    const settingsRail = container.querySelector('[data-screen-toolbar-panel="settings"]');
    expect(settingsRail).not.toBeNull();
    React.act(() => {
      settingsRail!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(container.querySelector('[data-settings-panel="true"]')).not.toBeNull();
    expect(container.querySelector('[data-screen-block-library="true"]')).toBeNull();
  });

  test("nested children and slot blocks render prefixed layer nodes and resolve selection", () => {
    const { container, controller } = mount({
      document: nestedDocument(),
      initialSelectedBlockId: "slot-1",
      bindings,
    });
    clickByAccessibleName(container, "Layers");
    const slotNode = container.querySelector(
      '[data-authoring-layer-node="slot-1"][data-authoring-layer-kind="block"]'
    );
    const childNode = container.querySelector(
      '[data-authoring-layer-node="child-1"][data-authoring-layer-kind="block"]'
    );
    expect(slotNode?.textContent).toContain("main:");
    expect(childNode).not.toBeNull();
    // Selecting the slot layer node forces the inspect body; the resolved
    // selected block shows the block inspector for the slot block.
    React.act(() => {
      slotNode!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(controller.current?.state.selectedBlockId).toBe("slot-1");
    // The slot block is a text block: the inspector shows the Text control.
    expect(container.querySelector('textarea[placeholder="Paragraph text"]')).not.toBeNull();
    expect(container.querySelector('[data-screen-rail-head="true"]')?.textContent).toContain(
      "Slot Text"
    );
  });

  test("the command palette Add section command creates a section", () => {
    const { container, handlers } = mount({ document: documentWithSections() });
    clickByAccessibleName(container, "Open command palette");
    const addSectionCommand = Array.from(
      document.body.querySelectorAll('[data-authoring-command-palette="true"] button')
    ).find((candidate) => candidate.textContent?.includes("Add section"));
    expect(addSectionCommand).toBeDefined();
    React.act(() => {
      addSectionCommand!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(handlers.onAddSection).toHaveBeenCalledTimes(1);
  });

  test("a section layout commit through the section inspector patches the section", () => {
    const { container, handlers } = mount({
      document: documentWithSections(),
      initialSelectedSectionId: "sec-1",
    });
    // The Inspect rail is enabled for a section-only selection; it routes the
    // body to the section inspector.
    clickByAccessibleName(container, "Inspect");
    const gap = container.querySelector(
      '[data-screen-section-gap="true"]'
    ) as HTMLInputElement | null;
    expect(gap).not.toBeNull();
    React.act(() => {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(gap!), "value")?.set;
      setter?.call(gap!, "24");
      gap!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(handlers.onPatchSection).toHaveBeenCalledTimes(1);
    expect(handlers.onPatchSection.mock.calls[0][0]).toBe("sec-1");
    expect(handlers.onPatchSection.mock.calls[0][1]).toEqual(
      expect.objectContaining({ style: expect.objectContaining({ columnGap: 24 }) })
    );
  });

  test("a container block with slots arms a slot-end insert point from the picker", () => {
    const { container, handlers } = mount({ document: nestedDocument(), bindings });
    clickByAccessibleName(container, "Layers");
    const groupNode = container.querySelector(
      '[data-authoring-layer-node="group-1"][data-authoring-layer-kind="block"]'
    ) as HTMLElement | null;
    React.act(() => {
      groupNode!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const trigger = container.querySelector(
      '[data-screen-insert-into="true"]'
    ) as HTMLElement | null;
    expect(trigger).not.toBeNull();
    React.act(() => {
      trigger!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    const option = Array.from(document.body.querySelectorAll('[role="option"]')).find(
      (item) => item.textContent?.trim() === "main"
    ) as HTMLElement | undefined;
    expect(option).toBeDefined();
    React.act(() => {
      option!.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
      option!.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 }));
      option!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(handlers.onSetInsertPoint).toHaveBeenCalledWith({
      kind: "slot-end",
      sectionId: "sec-1",
      parentId: "group-1",
      slotId: "main",
    });
  });

  test("the preview notice renders above the authored canvas", () => {
    const { container } = mount({
      document: documentWithSections(),
      previewNotice: <p data-preview-notice="true">Preview notice</p>,
    });
    expect(container.querySelector('[data-preview-notice="true"]')).not.toBeNull();
  });

  test("the settings rail stays hidden when no settings panel is supplied", () => {
    const { container } = mount({ document: documentWithSections() });
    expect(container.querySelector('[data-screen-toolbar-panel="settings"]')).toBeNull();
  });

  test("the insert rail retains the palette when re-selected after inspect", () => {
    const { container } = mount({
      document: documentWithSections(),
      bindings,
      initialSelectedBlockId: "block-h1",
    });
    clickByAccessibleName(container, "Insert");
    expect(container.querySelector('[data-screen-block-library="true"]')).not.toBeNull();
    expect(container.querySelector('[data-screen-bound-field="true"]')).toBeNull();
  });
});
