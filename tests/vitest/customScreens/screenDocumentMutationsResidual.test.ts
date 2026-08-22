import { expect, test } from "vitest";

import type { ScreenBlockV1 } from "../../../core/services/customScreens/customScreenContracts";
import {
  duplicateScreenBlock,
  duplicateScreenBlockWithIdMap,
  moveScreenBlockTo,
  updateScreenBlock,
} from "../../../core/services/customScreens/screenDocumentMutations";

const makeDocument = (blocks: ScreenBlockV1[]) => ({
  schemaVersion: 1 as const,
  sections: [{ id: "section-1", type: "section" as const, data: {}, blocks }],
});

test("updateScreenBlock returns the same block for a non-matching id", () => {
  const document = makeDocument([{ id: "block-1", type: "text", data: { label: "a" } }]);
  const result = updateScreenBlock(document, "missing", { label: "b" });
  expect(result.sections[0]?.blocks[0]?.data).toEqual({ label: "a" });
});

test("updateScreenBlock applies a function patch", () => {
  const document = makeDocument([{ id: "block-1", type: "text", data: { label: "a" } }]);
  const result = updateScreenBlock(document, "block-1", (block) => ({
    ...block,
    data: { label: `${(block.data as { label: string }).label}-updated` },
  }));
  expect(result.sections[0]?.blocks[0]?.data).toEqual({ label: "a-updated" });
});

test("updateScreenBlock applies an object patch merged with existing data", () => {
  const document = makeDocument([{ id: "block-1", type: "text", data: { label: "a" } }]);
  const result = updateScreenBlock(document, "block-1", {
    data: { label: "b" },
  });
  expect(result.sections[0]?.blocks[0]?.data).toEqual({ label: "b" });
});

test("duplicateScreenBlockWithIdMap clones a parent and its children", () => {
  const document = makeDocument([
    {
      id: "parent-1",
      type: "field-group",
      data: { title: "Group" },
      children: [{ id: "child-1", type: "text", data: { label: "Child" } }],
    },
  ]);

  const {
    document: next,
    idMap,
    duplicatedBlockId,
  } = duplicateScreenBlockWithIdMap(document, "parent-1");

  expect(duplicatedBlockId).toBe(idMap.get("parent-1"));
  const blocks = next.sections[0]?.blocks ?? [];
  expect(blocks).toHaveLength(2);
  expect(blocks[1]?.id).toBe(duplicatedBlockId);
  expect(blocks[1]?.children).toHaveLength(1);
  expect(blocks[1]?.children?.[0]?.id).toBe(idMap.get("child-1"));
});

test("duplicateScreenBlock returns the duplicated document", () => {
  const document = makeDocument([{ id: "block-1", type: "text", data: {} }]);
  const result = duplicateScreenBlock(document, "block-1");
  expect((result.sections[0]?.blocks ?? []).map((block) => block.id)).toEqual([
    "block-1",
    expect.any(String),
  ]);
});

test("moveScreenBlockTo moves a nested block to a section target without index adjustment", () => {
  const document = makeDocument([
    {
      id: "group-1",
      type: "field-group",
      data: { title: "Group" },
      children: [{ id: "child-1", type: "text", data: {} }],
    },
  ]);

  const result = moveScreenBlockTo(document, "child-1", {
    kind: "section-index",
    sectionId: "section-1",
    index: 0,
  });

  const blocks = result.sections[0]?.blocks ?? [];
  expect(blocks[0]?.id).toBe("child-1");
  expect(blocks[1]?.id).toBe("group-1");
  expect(blocks[1]?.children).toHaveLength(0);
});
