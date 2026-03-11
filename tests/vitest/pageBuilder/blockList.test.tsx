// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import { BlockList } from "../../../core/admin/ui/pages/builder/BlockList";
import {
  addRepeatableSlotInstance,
  appendSlotBlock,
  createBlock,
  duplicateBlock,
  findBlockById,
  insertBlockAfterId,
  moveBlockIntoSlot,
  removeRepeatableSlotInstance,
  reorderBlocks,
  reorderBlocksAtPath,
} from "../../../core/admin/ui/pages/builder/blockUtils";
import type { Block } from "../../../core/admin/ui/pages/builder/types";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import type { WidgetDefinition } from "../../../core/widgets/types";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("../../../core/widgets/renderers/widgetRenderer", () => ({
  WidgetRenderer: ({ block }: { block: { id: string; type: string } }) => (
    <div data-widget-renderer={block.id}>{block.type}</div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockToolbar", () => ({
  BlockToolbar: () => <div data-block-toolbar="true" />,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const blockA: Block = {
  ...createBlock("hero"),
  id: "a",
  variant: "centered",
};
const blockB: Block = {
  ...createBlock("newsletter"),
  id: "b",
  variant: "inline",
};

const Dummy = () => null;
const fixedSlotDefinition: WidgetDefinition<{ headline: string }> = {
  type: "slot-layout",
  title: "Slot Layout",
  description: "Fixed slots",
  category: "layout",
  complexity: "atomic",
  audience: "advanced",
  module: "layout",
  variants: [{ id: "default", label: "Default" }],
  slots: [{ id: "main", label: "Main" }],
  schema: {
    type: "object",
    required: ["headline"],
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
    },
  },
  defaults: { headline: "Layout" },
  editor: { wizard: Dummy, visual: Dummy, advanced: Dummy },
  render: Dummy,
};
const repeatableDefinition: WidgetDefinition<{ headline: string }> = {
  type: "layout-columns",
  title: "Layout Columns",
  description: "Layout",
  category: "layout",
  complexity: "atomic",
  audience: "advanced",
  module: "layout",
  variants: [{ id: "equal", label: "Equal" }],
  slots: [
    { id: "column", label: "Column", kind: "repeatable", minItems: 1, maxItems: 2 },
  ],
  schema: {
    type: "object",
    required: ["headline"],
    additionalProperties: false,
    properties: {
      headline: { type: "string" },
    },
  },
  defaults: { headline: "Columns" },
  editor: { wizard: Dummy, visual: Dummy, advanced: Dummy },
  render: Dummy,
};

afterEach(() => {
  clearWidgets();
});

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const normalizeText = (node: Element | null) =>
  node?.textContent?.replace(/\s+/g, " ").trim() ?? "";

const getBlockRow = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("div[role='button']")).find(
    (element): element is HTMLDivElement =>
      element instanceof HTMLDivElement && normalizeText(element).includes(label)
  ) ?? null;

const getSlotContainer = (container: HTMLElement, label: string) => {
  const marker = Array.from(container.querySelectorAll("span")).find(
    (element) => normalizeText(element) === label
  );
  const slotContainer = marker?.parentElement?.parentElement;
  return slotContainer instanceof HTMLDivElement ? slotContainer : null;
};

const createDataTransfer = (initial: Record<string, string> = {}) => {
  const store = new Map(Object.entries(initial));
  return {
    effectAllowed: "move",
    setData: (key: string, value: string) => {
      store.set(key, value);
    },
    getData: (key: string) => store.get(key) ?? "",
  };
};

const dispatchDragEvent = (
  node: Element,
  type: "dragstart" | "dragover" | "drop" | "dragend",
  dataTransfer = createDataTransfer()
) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  act(() => {
    node.dispatchEvent(event);
  });
  return dataTransfer;
};

test("reorderBlocks moves items", () => {
  const reordered = reorderBlocks([blockA, blockB], 0, 1);
  expect(reordered[0].id).toBe("b");
  expect(reordered[1].id).toBe("a");
});

test("duplicateBlock inserts clone", () => {
  const duplicated = duplicateBlock([blockA, blockB], "a");
  expect(duplicated).toHaveLength(3);
  expect(duplicated[1].type).toBe("hero");
});

test("appendSlotBlock nests blocks in default slot", () => {
  const parent: Block = {
    ...createBlock("hero"),
    id: "parent",
    slots: { default: [] },
  };
  const child: Block = { ...createBlock("timeline"), id: "child" };
  const nested = appendSlotBlock([parent], "parent", "default", child);
  expect(nested[0].slots?.default).toHaveLength(1);
  expect(findBlockById(nested, "child")?.id).toBe("child");
});

test("insertBlockAfterId inserts after nested block", () => {
  const childA: Block = { ...createBlock("hero"), id: "child-a" };
  const parent: Block = {
    ...createBlock("hero"),
    id: "parent",
    slots: { default: [childA] },
  };
  const childB: Block = { ...createBlock("newsletter"), id: "child-b" };
  const nested = insertBlockAfterId([parent], "child-a", childB);
  const slotItems = nested[0].slots?.default ?? [];
  expect(slotItems[1]?.id).toBe("child-b");
});

test("reorderBlocksAtPath reorders nested children", () => {
  const childA: Block = { ...createBlock("hero"), id: "child-a" };
  const childB: Block = { ...createBlock("newsletter"), id: "child-b" };
  const parent: Block = {
    ...createBlock("hero"),
    id: "parent",
    slots: { default: [childA, childB] },
  };
  const reordered = reorderBlocksAtPath([parent], [{ index: 0, slotId: "default" }], 0, 1);
  const slotItems = reordered[0].slots?.default ?? [];
  expect(slotItems[0]?.id).toBe("child-b");
});

test("BlockList renders widget labels", () => {
  const html = renderAdminUi(
    <BlockList
      blocks={[blockA, blockB]}
      selectedId={"a"}
      onSelect={() => {}}
      onMove={() => {}}
      onDuplicate={() => {}}
      onDelete={() => {}}
    />
  );

  expect(html).toContain("Hero");
  expect(html).toContain("Newsletter");
  expect(html).toContain("bg-muted/5");
  expect(html).toContain("border-t");
});

test("BlockList renders default-slot fallback for empty legacy children", () => {
  const legacyParent: Block = {
    ...createBlock("hero"),
    id: "legacy-parent",
    type: "legacy-container",
    children: [],
    slots: undefined,
  };

  const html = renderAdminUi(
    <BlockList
      blocks={[legacyParent]}
      selectedId={null}
      onSelect={() => {}}
      onMove={() => {}}
      onDuplicate={() => {}}
      onDelete={() => {}}
    />
  );

  expect(html).toContain("legacy-container");
  expect(html).toContain("Unknown widget type");
  expect(html).toContain("Default slot");
  expect(html).toContain("Empty slot.");
});

test("BlockList selects from the keyboard and ignores drops from another list token", () => {
  const onSelect = vi.fn();
  const onMove = vi.fn();
  const view = mount(
    <BlockList
      blocks={[blockA, blockB]}
      selectedId={null}
      onSelect={onSelect}
      onMove={onMove}
      onDuplicate={() => {}}
      onDelete={() => {}}
    />
  );

  try {
    const heroRow = getBlockRow(view.container, "Hero");
    const newsletterRow = getBlockRow(view.container, "Newsletter");

    expect(heroRow).not.toBeNull();
    expect(newsletterRow).not.toBeNull();

    act(() => {
      heroRow?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
    });

    expect(onSelect).toHaveBeenCalledWith("a");

    const dragTransfer = dispatchDragEvent(heroRow!, "dragstart");
    expect(dragTransfer.getData("text/plain")).toBe("root:0");
    expect(dragTransfer.getData("block-id")).toBe("a");

    dispatchDragEvent(newsletterRow!, "dragover");
    expect(newsletterRow?.className).toContain("border-primary/40");

    dispatchDragEvent(
      newsletterRow!,
      "drop",
      createDataTransfer({ "text/plain": "0:default:0" })
    );

    expect(onMove).not.toHaveBeenCalled();
    expect(newsletterRow?.className).not.toContain("border-primary/40");
  } finally {
    view.cleanup();
  }
});

test("BlockList forwards slot insert and move-to-slot drops", () => {
  registerWidget(fixedSlotDefinition);
  const onInsert = vi.fn();
  const onMoveToSlot = vi.fn();
  const parent: Block = {
    ...createBlock("slot-layout"),
    id: "slot-parent",
  };
  const view = mount(
    <BlockList
      blocks={[parent]}
      selectedId={null}
      onSelect={() => {}}
      onMove={() => {}}
      onDuplicate={() => {}}
      onDelete={() => {}}
      onInsert={onInsert}
      onMoveToSlot={onMoveToSlot}
    />
  );

  try {
    const slotContainer = getSlotContainer(view.container, "Main");
    expect(slotContainer).not.toBeNull();
    expect(normalizeText(slotContainer)).toContain("Empty slot.");

    dispatchDragEvent(
      slotContainer!,
      "drop",
      createDataTransfer({ "widget-type": "newsletter" })
    );
    expect(onInsert).toHaveBeenCalledWith("slot-parent", "main", "newsletter");

    dispatchDragEvent(
      slotContainer!,
      "drop",
      createDataTransfer({ "block-id": "child-block" })
    );
    expect(onMoveToSlot).toHaveBeenCalledWith("child-block", "slot-parent", "main");
  } finally {
    view.cleanup();
  }
});

test("moveBlockIntoSlot moves block under target slot", () => {
  const parent: Block = {
    ...createBlock("hero"),
    id: "parent",
    slots: { main: [] },
  };
  const child: Block = { ...createBlock("newsletter"), id: "child" };
  const moved = moveBlockIntoSlot([parent, child], "child", "parent", "main");
  expect(moved).toHaveLength(1);
  expect(moved[0].slots?.main?.[0]?.id).toBe("child");
});

test("createBlock initializes repeatable slots from minimum", () => {
  const block = createBlock(repeatableDefinition);
  expect(block.slots?.["column:1"]).toEqual([]);
});

test("repeatable slot helpers enforce min and max limits", () => {
  registerWidget(repeatableDefinition);
  const parent: Block = { ...createBlock("layout-columns"), id: "parent" };
  const withSecondSlot = addRepeatableSlotInstance([parent], "parent", "column");
  expect(withSecondSlot[0]?.slots?.["column:2"]).toEqual([]);

  const blockedByMax = addRepeatableSlotInstance(withSecondSlot, "parent", "column");
  expect(blockedByMax[0]?.slots?.["column:3"]).toBeUndefined();

  const removedFirst = removeRepeatableSlotInstance(
    blockedByMax,
    "parent",
    "column:1"
  );
  expect(removedFirst[0]?.slots?.["column:1"]).toBeUndefined();
  expect(removedFirst[0]?.slots?.["column:2"]).toEqual([]);

  const blockedByMin = removeRepeatableSlotInstance(
    removedFirst,
    "parent",
    "column:2"
  );
  expect(blockedByMin[0]?.slots?.["column:2"]).toEqual([]);
});

test("grid columns supports nested insert and reorder per repeatable column slot", () => {
  const parent: Block = { ...createBlock("grid-columns"), id: "grid-parent" };
  const childA: Block = { ...createBlock("hero"), id: "grid-child-a" };
  const childB: Block = { ...createBlock("newsletter"), id: "grid-child-b" };

  const withChildren = appendSlotBlock(
    appendSlotBlock([parent], "grid-parent", "column:1", childA),
    "grid-parent",
    "column:1",
    childB
  );

  const reordered = reorderBlocksAtPath(
    withChildren,
    [{ index: 0, slotId: "column:1" }],
    0,
    1
  );
  expect(reordered[0]?.slots?.["column:1"]?.[0]?.id).toBe("grid-child-b");
  expect(reordered[0]?.slots?.["column:1"]?.[1]?.id).toBe("grid-child-a");

  const moved = moveBlockIntoSlot(
    reordered,
    "grid-child-a",
    "grid-parent",
    "column:2"
  );
  expect(moved[0]?.slots?.["column:1"]?.[0]?.id).toBe("grid-child-b");
  expect(moved[0]?.slots?.["column:2"]?.[0]?.id).toBe("grid-child-a");
});
