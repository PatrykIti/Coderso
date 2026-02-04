import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import { BlockList } from "../../../core/admin/ui/pages/builder/BlockList";
import {
  appendSlotBlock,
  createBlock,
  duplicateBlock,
  findBlockById,
  insertBlockAfterId,
  moveBlockIntoSlot,
  reorderBlocks,
  reorderBlocksAtPath,
} from "../../../core/admin/ui/pages/builder/blockUtils";
import type { Block } from "../../../core/admin/ui/pages/builder/types";

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
