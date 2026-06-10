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
  getPageBlockAtPath,
  getPageBlockEditorSlotKeys,
  getPageBlockInsertTargetStatus,
  getPageBlockListAtPath,
  insertPageBlockAtTarget,
  movePageBlockToTarget,
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
