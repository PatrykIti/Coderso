import { describe, expect, test } from "vitest";

import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  createPageBlockV2,
  createPageSectionV2,
  type PageBlockSlotKey,
  type PageBlockV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  deletePageBlockAtPath,
  duplicatePageBlockAtPath,
  duplicatePageBlockTreeWithNewIds,
  getDefaultPageBlockInsertTarget,
  getPageBlockAdjacentColumnMoveTarget,
  getPageBlockAtPath,
  getPageBlockBesideInsertStatus,
  getPageBlockContainerLayout,
  getPageBlockEditorSlotKeys,
  getPageBlockInsertTargetStatus,
  getPageBlockListAtPath,
  getPageBlockSiblingMoveTarget,
  insertPageBlockAtTarget,
  insertPageBlockBeside,
  movePageBlockToTarget,
  movePageSectionBlockToAdjacentColumn,
  movePageSectionBlockWithinColumn,
  serializePageBlockPath,
  updatePageBlockAtPath,
  type PageBlockPath,
} from "../../../core/services/pages/pageBlockPaths";

const heading = (id: string, text = id) =>
  createPageBlockV2("heading", {
    id,
    props: { text, level: "h2", align: "left" },
  });

const group = (id: string, children: PageBlockV2[] = []) =>
  createPageBlockV2("group", {
    id,
    props: { direction: "column", wrap: false, gap: 16 },
    slots: children.length > 0 ? { children } : undefined,
  });

const columns = (id = "blk-columns") =>
  createPageBlockV2("columns", {
    id,
    props: { count: 2, gap: 24, distribution: "equal" },
    slots: {
      "column:1": [heading("blk-left", "Left")],
      "column:2": [group("blk-group", [heading("blk-nested", "Nested")])],
    },
  });

const buildSection = (): PageSectionV2 =>
  createPageSectionV2("content", {
    id: "sec-content",
    name: "Content",
    blocks: [
      columns(),
      createPageBlockV2("text", {
        id: "blk-copy",
        props: { text: "Copy", format: "plain", align: "left" },
      }),
    ],
  });

const collectBlockIds = (blocks: readonly PageBlockV2[]): string[] =>
  blocks.flatMap((block) => [
    block.id,
    ...Object.values(block.slots ?? {}).flatMap((children) => collectBlockIds(children ?? [])),
  ]);

describe("page block paths", () => {
  test("serializes, reads, and updates nested blocks by section-scoped path", () => {
    const section = buildSection();
    const nestedPath: PageBlockPath = [
      { index: 0 },
      { slotKey: "column:2", index: 0 },
      { slotKey: "children", index: 0 },
    ];

    expect(serializePageBlockPath(nestedPath)).toBe("root:0/column:2:0/children:0");
    expect(getPageBlockAtPath(section, nestedPath)?.id).toBe("blk-nested");

    const result = updatePageBlockAtPath(section, nestedPath, (block) => ({
      ...block,
      props: { ...block.props, text: "Updated nested heading" },
    }));

    expect(result.status).toBe("ok");
    expect(getPageBlockAtPath(result.section, nestedPath)?.props.text).toBe(
      "Updated nested heading"
    );
    expect(getPageBlockAtPath(section, nestedPath)?.props.text).toBe("Nested");
  });

  test("inserts into allowed slots and rejects unsupported, full, or over-depth targets", () => {
    const section = buildSection();
    const target = {
      listPath: { ownerPath: [{ index: 0 }] as PageBlockPath, slotKey: "column:1" as const },
      index: 1,
    };
    const inserted = insertPageBlockAtTarget(section, target, heading("blk-inserted"));

    expect(inserted.status).toBe("ok");
    expect(inserted.path ? serializePageBlockPath(inserted.path) : null).toBe("root:0/column:1:1");
    expect(getPageBlockListAtPath(inserted.section, target.listPath)).toMatchObject({
      status: "ok",
      blocks: [
        expect.objectContaining({ id: "blk-left" }),
        expect.objectContaining({ id: "blk-inserted" }),
      ],
    });

    const unsupported = insertPageBlockAtTarget(
      section,
      {
        listPath: { ownerPath: [{ index: 1 }] as PageBlockPath, slotKey: "children" },
      },
      heading("blk-nope")
    );
    expect(unsupported.status).toBe("unsupported-slot");

    const fullChildren = Array.from({ length: PAGE_BLOCK_MAX_CHILDREN_PER_SLOT }, (_, index) =>
      heading(`blk-full-${index}`)
    );
    const fullSection = createPageSectionV2("content", {
      blocks: [group("blk-full-owner", fullChildren)],
    });
    const full = insertPageBlockAtTarget(
      fullSection,
      {
        listPath: { ownerPath: [{ index: 0 }] as PageBlockPath, slotKey: "children" },
      },
      heading("blk-overflow")
    );
    expect(full.status).toBe("max-children-exceeded");

    const deepSection = createPageSectionV2("content", {
      blocks: [
        group("blk-depth-1", [
          group("blk-depth-2", [group("blk-depth-3", [group("blk-depth-4")])]),
        ]),
      ],
    });
    const overDepth = insertPageBlockAtTarget(
      deepSection,
      {
        listPath: {
          ownerPath: [
            { index: 0 },
            { slotKey: "children", index: 0 },
            { slotKey: "children", index: 0 },
            { slotKey: "children", index: 0 },
          ] as PageBlockPath,
          slotKey: "children",
        },
      },
      heading("blk-too-deep")
    );
    expect(overDepth.status).toBe("max-depth-exceeded");
    expect(
      getPageBlockInsertTargetStatus(
        deepSection,
        {
          listPath: {
            ownerPath: [
              { index: 0 },
              { slotKey: "children", index: 0 },
              { slotKey: "children", index: 0 },
            ] as PageBlockPath,
            slotKey: "children",
          },
        },
        group("blk-too-tall", [heading("blk-too-tall-child")])
      )
    ).toBe("max-depth-exceeded");
  });

  test("moves blocks between slots and rejects moving an owner into its descendant", () => {
    const section = buildSection();
    const sourcePath: PageBlockPath = [{ index: 0 }, { slotKey: "column:1", index: 0 }];
    const moved = movePageBlockToTarget(section, sourcePath, {
      listPath: { ownerPath: [{ index: 0 }] as PageBlockPath, slotKey: "column:2" },
      index: 1,
    });

    expect(moved.status).toBe("ok");
    expect(moved.path ? serializePageBlockPath(moved.path) : null).toBe("root:0/column:2:1");
    expect(
      getPageBlockListAtPath(moved.section, {
        ownerPath: [{ index: 0 }] as PageBlockPath,
        slotKey: "column:1",
      })
    ).toMatchObject({ status: "ok", blocks: [] });
    expect(
      getPageBlockAtPath(moved.section, [{ index: 0 }, { slotKey: "column:2", index: 1 }])?.id
    ).toBe("blk-left");

    const selfDescendant = movePageBlockToTarget(section, [{ index: 0 }], {
      listPath: {
        ownerPath: [{ index: 0 }, { slotKey: "column:2", index: 0 }] as PageBlockPath,
        slotKey: "children",
      },
    });
    expect(selfDescendant.status).toBe("self-descendant");
  });

  test("duplicates nested subtrees with fresh ids", () => {
    const section = buildSection();
    const groupPath: PageBlockPath = [{ index: 0 }, { slotKey: "column:2", index: 0 }];
    const duplicated = duplicatePageBlockAtPath(section, groupPath);

    expect(duplicated.status).toBe("ok");
    const originalIds = collectBlockIds(section.blocks);
    const duplicatedIds = collectBlockIds(duplicated.section.blocks);
    expect(new Set(duplicatedIds).size).toBe(duplicatedIds.length);
    expect(duplicatedIds.filter((id) => originalIds.includes(id))).toEqual(originalIds);

    const copiedGroup = getPageBlockAtPath(duplicated.section, [
      { index: 0 },
      { slotKey: "column:2", index: 1 },
    ]);
    expect(copiedGroup?.id).not.toBe("blk-group");
    expect(copiedGroup?.slots?.children?.[0]?.id).not.toBe("blk-nested");

    const copiedTree = duplicatePageBlockTreeWithNewIds(columns("blk-section-copy-source"));
    const copiedTreeIds = collectBlockIds([copiedTree]);
    expect(new Set(copiedTreeIds).size).toBe(copiedTreeIds.length);
    expect(copiedTreeIds).not.toContain("blk-section-copy-source");
    expect(copiedTreeIds).not.toContain("blk-left");
  });

  test("deletes nested blocks with stable fallback selection and derives editor slot keys", () => {
    const section = buildSection();
    const deleted = deletePageBlockAtPath(section, [
      { index: 0 },
      { slotKey: "column:2", index: 0 },
      { slotKey: "children", index: 0 },
    ]);

    expect(deleted.status).toBe("ok");
    expect(deleted.fallbackPath ? serializePageBlockPath(deleted.fallbackPath) : null).toBe(
      "root:0/column:2:0"
    );
    expect(
      getPageBlockAtPath(deleted.section, [
        { index: 0 },
        { slotKey: "column:2", index: 0 },
        { slotKey: "children", index: 0 },
      ])
    ).toBeNull();

    const twoColumnBlock = getPageBlockAtPath(section, [{ index: 0 }]);
    expect(twoColumnBlock ? getPageBlockEditorSlotKeys(twoColumnBlock) : []).toEqual([
      "column:1",
      "column:2",
    ] satisfies PageBlockSlotKey[]);

    const selectedLayoutTarget = getDefaultPageBlockInsertTarget(section, [{ index: 0 }]);
    expect(selectedLayoutTarget.listPath.slotKey).toBe("column:1");
  });
});

describe("multi-column container layout (owner finding #6)", () => {
  const rowGroup = (id: string, children: PageBlockV2[]) =>
    createPageBlockV2("group", {
      id,
      props: { direction: "row", wrap: false, gap: 16 },
      slots: { children },
    });

  test("resolves grid, row, and stack container kinds per the rendered geometry", () => {
    const gridSection = createPageSectionV2("content", {
      layout: { columns: 3, align: "start", justify: "start", maxWidth: 1100 },
      blocks: [heading("blk-a"), heading("blk-b")],
    });
    expect(getPageBlockContainerLayout(gridSection, [{ index: 0 }])).toEqual({
      kind: "grid",
      columns: 3,
    });

    const stackedSection = createPageSectionV2("content", {
      layout: { columns: 3, align: "start", justify: "start", maxWidth: 1100, stackVertical: true },
      blocks: [heading("blk-a")],
    });
    expect(getPageBlockContainerLayout(stackedSection, [{ index: 0 }])).toEqual({ kind: "stack" });

    const singleColumnSection = createPageSectionV2("content", {
      blocks: [heading("blk-a")],
    });
    expect(getPageBlockContainerLayout(singleColumnSection, [{ index: 0 }])).toEqual({
      kind: "stack",
    });

    const nestedSection = createPageSectionV2("content", {
      blocks: [rowGroup("blk-row", [heading("blk-in-row")]), columns("blk-cols")],
    });
    expect(
      getPageBlockContainerLayout(nestedSection, [{ index: 0 }, { slotKey: "children", index: 0 }])
    ).toEqual({ kind: "row" });
    // Columns-block slot row: the slot itself stacks vertically while
    // left/right travel across the adjacent active slots.
    expect(
      getPageBlockContainerLayout(nestedSection, [{ index: 1 }, { slotKey: "column:1", index: 0 }])
    ).toEqual({ kind: "columns-slot", slotKeys: ["column:1", "column:2"], slotIndex: 0 });

    const columnGroupSection = createPageSectionV2("content", {
      blocks: [group("blk-column-group", [heading("blk-in-column-group")])],
    });
    expect(
      getPageBlockContainerLayout(columnGroupSection, [
        { index: 0 },
        { slotKey: "children", index: 0 },
      ])
    ).toEqual({ kind: "stack" });
  });

  test("adjacent column move targets land in the next slot and stop at the edges", () => {
    const section = createPageSectionV2("content", {
      blocks: [columns("blk-cols")],
    });
    const leftChildPath: PageBlockPath = [{ index: 0 }, { slotKey: "column:1", index: 0 }];

    const rightTarget = getPageBlockAdjacentColumnMoveTarget(section, leftChildPath, 1);
    expect(rightTarget).toMatchObject({
      listPath: { slotKey: "column:2" },
      index: 0,
    });
    expect(getPageBlockAdjacentColumnMoveTarget(section, leftChildPath, -1)).toBeNull();

    const moved = movePageBlockToTarget(section, leftChildPath, rightTarget!);
    expect(moved.status).toBe("ok");
    expect(moved.path ? serializePageBlockPath(moved.path) : null).toBe("root:0/column:2:0");
    expect(
      getPageBlockListAtPath(moved.section, {
        ownerPath: [{ index: 0 }] as PageBlockPath,
        slotKey: "column:2",
      })
    ).toMatchObject({
      status: "ok",
      blocks: [
        expect.objectContaining({ id: "blk-left" }),
        expect.objectContaining({ id: "blk-group" }),
      ],
    });

    // Non-columns containers never produce an adjacent-column target.
    const rowSection = createPageSectionV2("content", {
      blocks: [rowGroup("blk-row", [heading("blk-in-row")])],
    });
    expect(
      getPageBlockAdjacentColumnMoveTarget(
        rowSection,
        [{ index: 0 }, { slotKey: "children", index: 0 }],
        1
      )
    ).toBeNull();
  });

  test("sibling move targets accept arbitrary signed offsets for grid row moves", () => {
    expect(getPageBlockSiblingMoveTarget([{ index: 4 }], -3)).toMatchObject({ index: 1 });
    expect(getPageBlockSiblingMoveTarget([{ index: 1 }], 3)).toMatchObject({ index: 4 });
    expect(getPageBlockSiblingMoveTarget([{ index: 1 }], 0)).toBeNull();
    expect(getPageBlockSiblingMoveTarget([{ index: 1 }], 1.5)).toBeNull();
  });
});

describe("insert block beside (owner finding #7)", () => {
  const rowGroup = (id: string, children: PageBlockV2[]) =>
    createPageBlockV2("group", {
      id,
      props: { direction: "row", wrap: false, gap: 16 },
      slots: { children },
    });
  const button = (id: string) =>
    createPageBlockV2("button", {
      id,
      props: { label: "CTA", href: "/", target: "self", variant: "primary", size: "md" },
    });

  test("wraps a block without a row-group parent into a new row group, preserving its id and props", () => {
    const section = createPageSectionV2("content", {
      blocks: [button("blk-cta")],
    });
    const result = insertPageBlockBeside(section, [{ index: 0 }], button("blk-second"));

    expect(result.status).toBe("ok");
    expect(result.path ? serializePageBlockPath(result.path) : null).toBe("root:0/children:1");
    const wrapper = getPageBlockAtPath(result.section, [{ index: 0 }]);
    expect(wrapper).toMatchObject({
      type: "group",
      props: { direction: "row", wrap: false, gap: 16 },
    });
    expect(wrapper?.slots?.children?.map((child) => child.id)).toEqual(["blk-cta", "blk-second"]);
    expect(wrapper?.slots?.children?.[0]).toMatchObject({
      type: "button",
      props: { label: "CTA", href: "/" },
    });
  });

  test("appends after the selected block when the parent is already a row group", () => {
    const section = createPageSectionV2("content", {
      blocks: [rowGroup("blk-row", [button("blk-first"), button("blk-third")])],
    });
    const result = insertPageBlockBeside(
      section,
      [{ index: 0 }, { slotKey: "children", index: 0 }],
      button("blk-between")
    );

    expect(result.status).toBe("ok");
    expect(result.path ? serializePageBlockPath(result.path) : null).toBe("root:0/children:1");
    const row = getPageBlockAtPath(result.section, [{ index: 0 }]);
    expect(row?.id).toBe("blk-row");
    expect(row?.slots?.children?.map((child) => child.id)).toEqual([
      "blk-first",
      "blk-between",
      "blk-third",
    ]);
  });

  test("wrapping a column-pinned root block carries the section column onto the row group", () => {
    // Per-column composition (owner finding #5, round 3): the wrap group
    // replaces the block at the same root index, so it must keep the block's
    // `style.column` pin — otherwise the new row would fall back to its
    // auto-flow cell and jump columns.
    const section = createPageSectionV2("content", {
      layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
      blocks: [
        { ...button("blk-col-one"), style: { column: 1 } },
        { ...button("blk-col-two"), style: { column: 2 } },
      ],
    });
    const result = insertPageBlockBeside(section, [{ index: 1 }], button("blk-second"));

    expect(result.status).toBe("ok");
    const wrapper = getPageBlockAtPath(result.section, [{ index: 1 }]);
    expect(wrapper).toMatchObject({
      type: "group",
      props: { direction: "row", wrap: false, gap: 16 },
      style: { column: 2 },
    });
    expect(wrapper?.slots?.children?.map((child) => child.id)).toEqual([
      "blk-col-two",
      "blk-second",
    ]);

    // Unassigned root blocks keep producing an unassigned wrap group: the
    // group inherits the same derived auto-flow cell from its list index.
    const autoFlow = createPageSectionV2("content", { blocks: [button("blk-plain")] });
    const wrapped = insertPageBlockBeside(autoFlow, [{ index: 0 }], button("blk-next"));
    expect(wrapped.status).toBe("ok");
    expect(getPageBlockAtPath(wrapped.section, [{ index: 0 }])?.style?.column ?? null).toBeNull();
  });

  test("rejects wraps that would push the subtree past the depth budget", () => {
    const deepSection = createPageSectionV2("content", {
      blocks: [
        group("blk-depth-1", [group("blk-depth-2", [group("blk-depth-3", [heading("blk-leaf")])])]),
      ],
    });
    const leafPath: PageBlockPath = [
      { index: 0 },
      { slotKey: "children", index: 0 },
      { slotKey: "children", index: 0 },
      { slotKey: "children", index: 0 },
    ];
    expect(getPageBlockBesideInsertStatus(deepSection, leafPath)).toBe("max-depth-exceeded");
    const rejected = insertPageBlockBeside(deepSection, leafPath, heading("blk-no"));
    expect(rejected.status).toBe("max-depth-exceeded");
    expect(rejected.section).toBe(deepSection);

    const shallowSection = createPageSectionV2("content", { blocks: [heading("blk-ok")] });
    expect(getPageBlockBesideInsertStatus(shallowSection, [{ index: 0 }])).toBe("ok");
  });
});

// --- Section per-column composition moves (owner finding #5, round 3) ---

const twoColumnSection = (columnByBlock: Array<number | null>): PageSectionV2 =>
  createPageSectionV2("content", {
    id: "sec-columned",
    name: "Columned",
    layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
    blocks: columnByBlock.map((column, index) =>
      createPageBlockV2("heading", {
        id: `blk-${index + 1}`,
        props: { text: `Block ${index + 1}`, level: "h2", align: "left" },
        ...(column === null ? {} : { style: { column } }),
      })
    ),
  });

describe("section column composition moves", () => {
  test("container layout reports section-column with the block's effective column once assignments exist", () => {
    const autoFlow = twoColumnSection([null, null, null]);
    expect(getPageBlockContainerLayout(autoFlow, [{ index: 0 }])).toEqual({
      kind: "grid",
      columns: 2,
    });

    const assigned = twoColumnSection([2, null, null]);
    expect(getPageBlockContainerLayout(assigned, [{ index: 0 }])).toEqual({
      kind: "section-column",
      columns: 2,
      column: 2,
    });
    // Unassigned siblings report their legacy auto-flow cell.
    expect(getPageBlockContainerLayout(assigned, [{ index: 1 }])).toEqual({
      kind: "section-column",
      columns: 2,
      column: 2,
    });
    expect(getPageBlockContainerLayout(assigned, [{ index: 2 }])).toEqual({
      kind: "section-column",
      columns: 2,
      column: 1,
    });

    // stackVertical collapses the painted grid but composition (and the
    // wrapper DOM) persists, so the assignment-aware axes stay available.
    const stacked = {
      ...assigned,
      layout: { ...assigned.layout, stackVertical: true },
    } satisfies PageSectionV2;
    expect(getPageBlockContainerLayout(stacked, [{ index: 0 }])).toMatchObject({
      kind: "section-column",
    });
  });

  test("left/right set the column assignment without reordering siblings and no-op at the edges", () => {
    const section = twoColumnSection([null, null, null, null]);

    // First horizontal move activates composition: only the moved block gains
    // an assignment, every sibling keeps its index (and auto-flow cell).
    const moved = movePageSectionBlockToAdjacentColumn(section, [{ index: 0 }], 1);
    expect(moved).not.toBeNull();
    expect(moved!.blocks.map((block) => block.id)).toEqual(["blk-1", "blk-2", "blk-3", "blk-4"]);
    expect(moved!.blocks[0]?.style?.column).toBe(2);
    expect(moved!.blocks[1]?.style ?? {}).not.toHaveProperty("column");

    // Edge no-ops: already in the last/first column.
    expect(movePageSectionBlockToAdjacentColumn(moved!, [{ index: 0 }], 1)).toBeNull();
    expect(movePageSectionBlockToAdjacentColumn(section, [{ index: 0 }], -1)).toBeNull();

    // Back left restores column 1 explicitly.
    const back = movePageSectionBlockToAdjacentColumn(moved!, [{ index: 0 }], -1);
    expect(back!.blocks[0]?.style?.column).toBe(1);

    // Non-root paths and single-column sections are strict no-ops.
    expect(
      movePageSectionBlockToAdjacentColumn(
        section,
        [{ index: 0 }, { slotKey: "children", index: 0 }],
        1
      )
    ).toBeNull();
    const singleColumn = createPageSectionV2("content", {
      id: "sec-single",
      blocks: [createPageBlockV2("text", { id: "blk-single" })],
    });
    expect(movePageSectionBlockToAdjacentColumn(singleColumn, [{ index: 0 }], 1)).toBeNull();
  });

  test("up/down reorder within the effective column stack and pin unassigned siblings first", () => {
    // blk-1 assigned to column 2; blk-2 (index 1) and blk-4 (index 3) flow to
    // column 2, blk-3 (index 2) flows to column 1. Column 2 stack order is
    // blk-1, blk-2, blk-4.
    const section = twoColumnSection([2, null, null, null]);

    const movedDown = movePageSectionBlockWithinColumn(section, [{ index: 0 }], 1);
    expect(movedDown).not.toBeNull();
    expect(movedDown!.section.blocks.map((block) => block.id)).toEqual([
      "blk-2",
      "blk-1",
      "blk-3",
      "blk-4",
    ]);
    expect(movedDown!.path).toEqual([{ index: 1 }]);
    // Every root block is pinned so the index shuffle cannot re-column the
    // unassigned siblings.
    expect(movedDown!.section.blocks.map((block) => block.style?.column)).toEqual([2, 2, 1, 2]);

    const movedUp = movePageSectionBlockWithinColumn(movedDown!.section, movedDown!.path, -1);
    expect(movedUp!.section.blocks.map((block) => block.id)).toEqual([
      "blk-1",
      "blk-2",
      "blk-3",
      "blk-4",
    ]);
    expect(movedUp!.path).toEqual([{ index: 0 }]);

    // Stack-edge and inactive-composition no-ops.
    expect(movePageSectionBlockWithinColumn(movedUp!.section, [{ index: 0 }], -1)).toBeNull();
    const autoFlow = twoColumnSection([null, null]);
    expect(movePageSectionBlockWithinColumn(autoFlow, [{ index: 0 }], 1)).toBeNull();
  });
});
