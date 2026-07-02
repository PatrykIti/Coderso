// TASK-500-02: insertion targeting ops (pure, Bun-free). Shape LOCKED by
// TASK-500-05 §2 — addScreenBlockAt for all four ScreenInsertTarget kinds
// (clamp + fail-soft), moveScreenBlockTo (same-id move, cycle guard, same-list
// removal-first decrement), findScreenBlockLocation (stable pre-order), the
// binding invariant through the V4 write gate, and the non-destructive
// addScreenBlock legacy shim the Bun-lane assistant caller depends on.
import { describe, expect, test } from "vitest";

import {
  addScreenBlock,
  addScreenBlockAt,
  collectScreenBlockIds,
  findScreenBlockLocation,
  moveScreenBlockTo,
  type ScreenInsertTarget,
} from "../../../core/services/customScreens/screenDocumentOps";
import {
  normalizeCustomScreenEditorViewDefinitionV4,
  type ScreenBlockV1,
  type ScreenDocumentV1,
} from "../../../core/services/customScreens/customScreenSchemas";

const textBlock = (id: string): ScreenBlockV1 => ({
  id,
  type: "text",
  data: { label: id },
});

// section-1: [text-top, group-1(field-group content: [columns-1(columns left:
// [left-1] right: [])])]; section-2: [meta-1, meta-2]. columns-1 nests INSIDE
// group-1.content — arbitrary-depth targets are exercised against it.
const makeDocument = (): ScreenDocumentV1 => ({
  schemaVersion: 1,
  sections: [
    {
      id: "section-1",
      type: "section",
      label: "Details",
      data: { title: "Details" },
      blocks: [
        textBlock("text-top"),
        {
          id: "group-1",
          type: "field-group",
          data: { title: "Group" },
          slots: {
            content: [
              {
                id: "columns-1",
                type: "columns",
                data: { label: "Columns", columns: 2 },
                slots: { left: [textBlock("left-1")], right: [] },
              },
            ],
          },
        },
      ],
    },
    {
      id: "section-2",
      type: "section",
      label: "Meta",
      data: { title: "Meta" },
      blocks: [textBlock("meta-1"), textBlock("meta-2")],
    },
  ],
});

const sectionBlockIds = (document: ScreenDocumentV1, sectionId: string) =>
  document.sections.find((section) => section.id === sectionId)?.blocks.map((block) => block.id);

const slotBlockIds = (document: ScreenDocumentV1, parentId: string, slotId: string) => {
  const find = (blocks: ScreenBlockV1[]): ScreenBlockV1 | null => {
    for (const block of blocks) {
      if (block.id === parentId) return block;
      if (block.slots) {
        for (const items of Object.values(block.slots)) {
          const match = find(items);
          if (match) return match;
        }
      }
      if (block.children) {
        const match = find(block.children);
        if (match) return match;
      }
    }
    return null;
  };
  for (const section of document.sections) {
    const match = find(section.blocks);
    if (match) return match.slots?.[slotId]?.map((block) => block.id);
  }
  return undefined;
};

describe("addScreenBlockAt", () => {
  test("section-end appends to the NAMED section (not sections[0]), other sections untouched", () => {
    const document = makeDocument();
    const next = addScreenBlockAt(document, textBlock("new-1"), {
      kind: "section-end",
      sectionId: "section-2",
    });

    expect(sectionBlockIds(next, "section-2")).toEqual(["meta-1", "meta-2", "new-1"]);
    expect(next.sections[0]).toEqual(document.sections[0]);
    // Pure: the input document is not mutated.
    expect(sectionBlockIds(document, "section-2")).toEqual(["meta-1", "meta-2"]);
  });

  test("section-index splices at the index; >len clamps to end, <0 clamps to start, NaN → end", () => {
    const document = makeDocument();

    const middle = addScreenBlockAt(document, textBlock("mid"), {
      kind: "section-index",
      sectionId: "section-2",
      index: 1,
    });
    expect(sectionBlockIds(middle, "section-2")).toEqual(["meta-1", "mid", "meta-2"]);

    const beyond = addScreenBlockAt(document, textBlock("end"), {
      kind: "section-index",
      sectionId: "section-2",
      index: 99,
    });
    expect(sectionBlockIds(beyond, "section-2")).toEqual(["meta-1", "meta-2", "end"]);

    const negative = addScreenBlockAt(document, textBlock("start"), {
      kind: "section-index",
      sectionId: "section-2",
      index: -5,
    });
    expect(sectionBlockIds(negative, "section-2")).toEqual(["start", "meta-1", "meta-2"]);

    const nan = addScreenBlockAt(document, textBlock("nan"), {
      kind: "section-index",
      sectionId: "section-2",
      index: Number.NaN,
    });
    expect(sectionBlockIds(nan, "section-2")).toEqual(["meta-1", "meta-2", "nan"]);
  });

  test("slot-end appends into a nested slot at ARBITRARY depth (columns.left inside field-group.content)", () => {
    const document = makeDocument();
    const next = addScreenBlockAt(document, textBlock("deep"), {
      kind: "slot-end",
      sectionId: "section-1",
      parentId: "columns-1",
      slotId: "left",
    });
    expect(slotBlockIds(next, "columns-1", "left")).toEqual(["left-1", "deep"]);
    // Sibling slot and the outer content slot are untouched.
    expect(slotBlockIds(next, "columns-1", "right")).toEqual([]);
    expect(slotBlockIds(next, "group-1", "content")).toEqual(["columns-1"]);
  });

  test("slot kinds resolve the parent GLOBALLY — a mismatched sectionId still lands in the right slot", () => {
    const document = makeDocument();
    const next = addScreenBlockAt(document, textBlock("forgiven"), {
      kind: "slot-end",
      sectionId: "section-2", // wrong on purpose; parentId lives in section-1
      parentId: "columns-1",
      slotId: "right",
    });
    expect(slotBlockIds(next, "columns-1", "right")).toEqual(["forgiven"]);
  });

  test("slot-index splices at the slot index with the same clamp behavior", () => {
    const document = makeDocument();

    const atStart = addScreenBlockAt(document, textBlock("first"), {
      kind: "slot-index",
      sectionId: "section-1",
      parentId: "columns-1",
      slotId: "left",
      index: 0,
    });
    expect(slotBlockIds(atStart, "columns-1", "left")).toEqual(["first", "left-1"]);

    const clamped = addScreenBlockAt(document, textBlock("clamped"), {
      kind: "slot-index",
      sectionId: "section-1",
      parentId: "columns-1",
      slotId: "left",
      index: 42,
    });
    expect(slotBlockIds(clamped, "columns-1", "left")).toEqual(["left-1", "clamped"]);
  });

  test("FAIL-SOFT: unknown sectionId / parentId / slotId lands at the FIRST section's end, never throws", () => {
    const document = makeDocument();

    const unknownSection = addScreenBlockAt(document, textBlock("a"), {
      kind: "section-end",
      sectionId: "missing-section",
    });
    expect(sectionBlockIds(unknownSection, "section-1")).toEqual(["text-top", "group-1", "a"]);

    const unknownParent = addScreenBlockAt(document, textBlock("b"), {
      kind: "slot-end",
      sectionId: "section-1",
      parentId: "missing-parent",
      slotId: "content",
    });
    expect(sectionBlockIds(unknownParent, "section-1")).toEqual(["text-top", "group-1", "b"]);

    const unknownSlot = addScreenBlockAt(document, textBlock("c"), {
      kind: "slot-index",
      sectionId: "section-1",
      parentId: "columns-1",
      slotId: "missing-slot",
      index: 0,
    });
    expect(sectionBlockIds(unknownSlot, "section-1")).toEqual(["text-top", "group-1", "c"]);
  });

  test("empty document: ensureSectionForInsert re-seeds a section before the fail-soft fallback", () => {
    const empty: ScreenDocumentV1 = { schemaVersion: 1, sections: [] };
    const next = addScreenBlockAt(empty, textBlock("seeded"), {
      kind: "section-end",
      sectionId: "missing",
    });
    expect(next.sections).toHaveLength(1);
    expect(next.sections[0]?.blocks.map((block) => block.id)).toEqual(["seeded"]);
  });
});

describe("moveScreenBlockTo", () => {
  test("cross-section move into a slot at depth preserves the SAME block id + subtree (move, not clone)", () => {
    const document = makeDocument();
    const next = moveScreenBlockTo(document, "meta-1", {
      kind: "slot-end",
      sectionId: "section-1",
      parentId: "columns-1",
      slotId: "right",
    });
    expect(sectionBlockIds(next, "section-2")).toEqual(["meta-2"]);
    expect(slotBlockIds(next, "columns-1", "right")).toEqual(["meta-1"]);
  });

  test("moving a CONTAINER keeps its whole subtree ids intact", () => {
    const document = makeDocument();
    const before = new Set(
      collectScreenBlockIds(document.sections[0]!.blocks[1]!) // group-1 subtree
    );
    const next = moveScreenBlockTo(document, "group-1", {
      kind: "section-index",
      sectionId: "section-2",
      index: 1,
    });
    expect(sectionBlockIds(next, "section-1")).toEqual(["text-top"]);
    expect(sectionBlockIds(next, "section-2")).toEqual(["meta-1", "group-1", "meta-2"]);
    const moved = next.sections[1]!.blocks[1]!;
    expect(new Set(collectScreenBlockIds(moved))).toEqual(before);
  });

  test("CYCLE GUARD: moving a container into its own descendant slot returns the ORIGINAL document", () => {
    const document = makeDocument();
    // columns-1 is inside group-1's subtree — refuse the self-nesting drop.
    const next = moveScreenBlockTo(document, "group-1", {
      kind: "slot-end",
      sectionId: "section-1",
      parentId: "columns-1",
      slotId: "right",
    });
    expect(next).toBe(document); // referential equality: host can === to skip dirty

    const selfTarget = moveScreenBlockTo(document, "group-1", {
      kind: "slot-index",
      sectionId: "section-1",
      parentId: "group-1",
      slotId: "content",
      index: 0,
    });
    expect(selfTarget).toBe(document);
  });

  test("unknown blockId is a no-op returning the ORIGINAL document", () => {
    const document = makeDocument();
    expect(
      moveScreenBlockTo(document, "missing-block", {
        kind: "section-end",
        sectionId: "section-2",
      })
    ).toBe(document);
  });

  test("same-list DOWNWARD move (middle of the list) lands 1:1 via the removal-first decrement", () => {
    // clampIndex would mask an off-by-one at the END of the list, so this is a
    // MIDDLE move: [a,b,c,d,e], drag `a` onto the gap BEFORE `d` (pre-removal
    // index 3) — the op decrements to 2 after removal → [b,c,a,d,e].
    const document: ScreenDocumentV1 = {
      schemaVersion: 1,
      sections: [
        {
          id: "section-1",
          type: "section",
          label: "List",
          data: { title: "List" },
          blocks: ["a", "b", "c", "d", "e"].map(textBlock),
        },
      ],
    };
    const down = moveScreenBlockTo(document, "a", {
      kind: "section-index",
      sectionId: "section-1",
      index: 3,
    });
    expect(sectionBlockIds(down, "section-1")).toEqual(["b", "c", "a", "d", "e"]);

    // UPWARD same-list move: no decrement (origin index is NOT before the target).
    const up = moveScreenBlockTo(document, "e", {
      kind: "section-index",
      sectionId: "section-1",
      index: 1,
    });
    expect(sectionBlockIds(up, "section-1")).toEqual(["a", "e", "b", "c", "d"]);
  });

  test("same-SLOT-list downward move decrements too (sameSiblingList slot branch)", () => {
    const document: ScreenDocumentV1 = {
      schemaVersion: 1,
      sections: [
        {
          id: "section-1",
          type: "section",
          label: "List",
          data: { title: "List" },
          blocks: [
            {
              id: "group-1",
              type: "field-group",
              data: { title: "Group" },
              slots: { content: ["x", "y", "z"].map(textBlock) },
            },
          ],
        },
      ],
    };
    const next = moveScreenBlockTo(document, "x", {
      kind: "slot-index",
      sectionId: "section-1",
      parentId: "group-1",
      slotId: "content",
      index: 2,
    });
    expect(slotBlockIds(next, "group-1", "content")).toEqual(["y", "x", "z"]);
  });

  test("binding invariant: a binding keyed by the moved block id survives the V4 write gate", () => {
    const document = makeDocument();
    const moved = moveScreenBlockTo(document, "meta-1", {
      kind: "slot-end",
      sectionId: "section-1",
      parentId: "columns-1",
      slotId: "right",
    });
    const bindings = [
      {
        id: "meta-1-value",
        blockId: "meta-1",
        propPath: "value",
        source: "entry",
        field: "title",
        mode: "read",
      },
    ];
    // The move preserved the id, so the strict write normalizer does NOT throw
    // (bindings→blockId invariant holds with no binding rewrite).
    const normalized = normalizeCustomScreenEditorViewDefinitionV4({
      document: moved,
      bindings,
      saveMode: "entry",
      interactionMode: "inline",
    });
    expect(normalized.bindings[0]?.blockId).toBe("meta-1");
  });
});

describe("findScreenBlockLocation", () => {
  test("resolves top-level, slot-nested, and deeply-nested locations (stable pre-order)", () => {
    const document = makeDocument();
    expect(findScreenBlockLocation(document, "text-top")).toEqual({
      sectionId: "section-1",
      parentId: null,
      slotId: null,
      index: 0,
    });
    expect(findScreenBlockLocation(document, "columns-1")).toEqual({
      sectionId: "section-1",
      parentId: "group-1",
      slotId: "content",
      index: 0,
    });
    expect(findScreenBlockLocation(document, "left-1")).toEqual({
      sectionId: "section-1",
      parentId: "columns-1",
      slotId: "left",
      index: 0,
    });
    expect(findScreenBlockLocation(document, "meta-2")).toEqual({
      sectionId: "section-2",
      parentId: null,
      slotId: null,
      index: 1,
    });
  });

  test("children[] nest as parentId + slotId:null; missing id → null", () => {
    const document: ScreenDocumentV1 = {
      schemaVersion: 1,
      sections: [
        {
          id: "section-1",
          type: "section",
          label: "List",
          data: { title: "List" },
          blocks: [
            {
              id: "parent-1",
              type: "legacy-widget",
              data: {},
              children: [textBlock("child-1")],
            },
          ],
        },
      ],
    };
    expect(findScreenBlockLocation(document, "child-1")).toEqual({
      sectionId: "section-1",
      parentId: "parent-1",
      slotId: null,
      index: 0,
    });
    expect(findScreenBlockLocation(document, "missing")).toBeNull();
  });
});

describe("addScreenBlock legacy shim (non-destructive)", () => {
  test("no target appends to the FIRST section's end via the new op (legacy default)", () => {
    const document = makeDocument();
    const next = addScreenBlock(document, textBlock("legacy"));
    expect(sectionBlockIds(next, "section-1")).toEqual(["text-top", "group-1", "legacy"]);

    // Empty doc re-seeds a section (ensureSectionForInsert path).
    const empty: ScreenDocumentV1 = { schemaVersion: 1, sections: [] };
    const seeded = addScreenBlock(empty, textBlock("seeded"));
    expect(seeded.sections[0]?.blocks.map((block) => block.id)).toEqual(["seeded"]);
  });

  test("{parentId, slotId} target appends into the slot (existing behavior)", () => {
    const document = makeDocument();
    const next = addScreenBlock(document, textBlock("in-slot"), {
      parentId: "columns-1",
      slotId: "left",
    });
    expect(slotBlockIds(next, "columns-1", "left")).toEqual(["left-1", "in-slot"]);
  });

  test("LEGACY semantics preserved: unknown parentId leaves the tree structurally unchanged (assistant conflict contract) and an absent slot key is CREATED", () => {
    const document = makeDocument();
    // The Bun-lane assistant (buildCustomScreenBlockAddPreview) detects a missing
    // target via isDeepStrictEqual — the shim must NOT fail-soft into sections[0].
    const unknownParent = addScreenBlock(document, textBlock("dropped"), {
      parentId: "missing-parent",
      slotId: "content",
    });
    expect(unknownParent).toEqual(document);

    const createdSlot = addScreenBlock(document, textBlock("extra"), {
      parentId: "group-1",
      slotId: "extra",
    });
    expect(slotBlockIds(createdSlot, "group-1", "extra")).toEqual(["extra"]);
  });
});
