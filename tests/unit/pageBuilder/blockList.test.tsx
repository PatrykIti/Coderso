import { afterEach, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

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
const repeatableDefinition: WidgetDefinition<{ headline: string }> = {
  type: "layout-columns",
  title: "Layout Columns",
  description: "Layout",
  category: "layout",
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
  const html = renderToString(
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
