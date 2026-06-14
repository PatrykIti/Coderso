import { describe, expect, test } from "vitest";

import {
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
  getPageBlockActiveSlotKeys,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
  pageBlockTypes,
  toPublishedPageDocumentV2,
  type PageBlockType,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

// TASK-449-02-L01 / TASK-442-01-L01 regression pins.
//
// Every assertion in this suite is GREEN at the current schema layer and
// permanently pins that behavior; this suite is NOT the failing live
// reproduction (that track is owned by TASK-449-01-L01 / TASK-442-01).

// `editorInsertableBlockTypes` (pageDocumentV2.ts:398) is module-private, so
// the guard derives the same catalog through the exported capability matrix.
const editorInsertableBlockTypes = pageBlockTypes.filter(
  (type) => pageBlockCapabilities[type].editorInsertable
);

// Deterministic scaffolding: fixed ids/slugs everywhere, no Date.now/random.
const SECTION_ID = "sec_roundtrip";

const buildDocumentWithRawBlocks = (blocks: readonly unknown[]): Record<string, unknown> => {
  const section = createPageSectionV2("content", { id: SECTION_ID, blocks: [] });
  return {
    ...createDefaultPageDocumentV2(),
    sections: [{ ...section, blocks: [...blocks] }],
  };
};

const collectBlockTypes = (blocks: readonly PageBlockV2[]): PageBlockType[] =>
  blocks.flatMap((block) => [
    block.type,
    ...Object.values(block.slots ?? {}).flatMap((children) => collectBlockTypes(children ?? [])),
  ]);

const blockTypesOf = (document: PageDocumentV2): PageBlockType[] =>
  document.sections.flatMap((section) => collectBlockTypes(section.blocks));

const onlyBlock = (document: PageDocumentV2): PageBlockV2 => {
  const block = document.sections[0]?.blocks[0];
  if (!block) throw new Error("Expected exactly one top-level block in the round-trip document.");
  return block;
};

const roundTripStages = (document: unknown) => {
  const written = normalizePageDocumentV2ForWrite(document);
  const read = normalizeStoredPageDocumentV2ForRead(written);
  const published = toPublishedPageDocumentV2(written);
  return { written, read, published };
};

describe("page document v2 block round-trip (TASK-449-02-L01 guard)", () => {
  test("editor-insertable catalog pin: derived list matches pageDocumentV2.ts:398", () => {
    // Keeps the test.each guard below from going vacuous if the capability
    // flag is ever emptied or reshaped by accident.
    // TASK-456: "form" joined the catalog (form authoring enablement).
    // TASK-457: "collection" joined the catalog (collection authoring).
    // TASK-459-02: "filters" joined the catalog (visitor filters block).
    expect(editorInsertableBlockTypes).toEqual([
      "heading",
      "text",
      "button",
      "image",
      "video",
      "form",
      "list",
      "card",
      "collection",
      "filters",
      "divider",
      "spacer",
      "statistic",
      "quote",
      "container",
      "columns",
      "group",
    ]);
  });

  // pageBlockDefaultProps is module-private; createPageBlockV2 is the exported
  // builder that seeds those defaults when no props are supplied.
  test.each(editorInsertableBlockTypes)(
    "%s block with default props survives write -> read and write -> publish",
    (type) => {
      const block = createPageBlockV2(type, { id: `blk_roundtrip_${type}` });
      const { written, read, published } = roundTripStages(buildDocumentWithRawBlocks([block]));

      expect(blockTypesOf(written)).toContain(type);
      expect(blockTypesOf(read)).toContain(type);
      expect(blockTypesOf(published)).toContain(type);

      // The block itself (id + type) is preserved verbatim, not just the type.
      expect(onlyBlock(read).id).toBe(`blk_roundtrip_${type}`);
      expect(onlyBlock(published).id).toBe(`blk_roundtrip_${type}`);
    }
  );
});

describe("columns block round-trip pins (TASK-449-02-L01)", () => {
  test("explicit empty column slots survive write/read/publish", () => {
    const rawColumns = {
      id: "blk_columns_empty",
      type: "columns",
      props: { count: 2, gap: 24, distribution: "equal" },
      visibility: { visible: true },
      slots: { "column:1": [], "column:2": [] },
    };
    const { written, read, published } = roundTripStages(buildDocumentWithRawBlocks([rawColumns]));

    for (const stage of [written, read, published]) {
      const block = onlyBlock(stage);
      expect(block.type).toBe("columns");
      // normalizeBlockSlots (pageDocumentV2.ts ~1425-1503) keeps provided
      // empty slot arrays as persisted state and does not invent the
      // unprovided column:3 / column:4 keys.
      expect(block.slots).toEqual({ "column:1": [], "column:2": [] });
    }
  });

  test("nested children in column slots survive write/read/publish intact", () => {
    const rawColumns = {
      id: "blk_columns_children",
      type: "columns",
      props: { count: 2, gap: 24, distribution: "equal" },
      slots: {
        "column:1": [
          {
            id: "blk_col1_heading",
            type: "heading",
            props: { text: "Column one", level: "h3", align: "left" },
          },
        ],
        "column:2": [
          {
            id: "blk_col2_text",
            type: "text",
            props: { text: "Column two copy", format: "plain", align: "left" },
          },
        ],
      },
    };
    const { written, read, published } = roundTripStages(buildDocumentWithRawBlocks([rawColumns]));

    for (const stage of [written, read, published]) {
      const block = onlyBlock(stage);
      expect(block.type).toBe("columns");
      expect(Object.keys(block.slots ?? {})).toEqual(["column:1", "column:2"]);

      const columnOne = block.slots?.["column:1"] ?? [];
      const columnTwo = block.slots?.["column:2"] ?? [];
      expect(columnOne).toHaveLength(1);
      expect(columnOne[0]?.id).toBe("blk_col1_heading");
      expect(columnOne[0]?.type).toBe("heading");
      expect(columnOne[0]?.props.text).toBe("Column one");
      expect(columnTwo).toHaveLength(1);
      expect(columnTwo[0]?.id).toBe("blk_col2_text");
      expect(columnTwo[0]?.type).toBe("text");
      expect(columnTwo[0]?.props.text).toBe("Column two copy");
    }
  });

  test("count shrink keeps overflow children non-destructively (current behavior pin)", () => {
    // Current behavior pinned by the TASK-449 drift audit:
    // - getPageBlockActiveSlotKeys (pageDocumentV2.ts ~:459) clamps the ACTIVE
    //   slot keys to props.count (here count=2 -> column:1/column:2),
    // - while normalizeBlockSlots (pageDocumentV2.ts ~:1425-1503) accepts the
    //   static slot key list (column:1..column:4) independent of props.count
    //   and preserves overflow children non-destructively, so column:3
    //   content survives a shrink to count=2 instead of being dropped.
    const rawColumns = {
      id: "blk_columns_overflow",
      type: "columns",
      props: { count: 2, gap: 24, distribution: "equal" },
      slots: {
        "column:1": [
          {
            id: "blk_overflow_heading",
            type: "heading",
            props: { text: "Active column", level: "h3", align: "left" },
          },
        ],
        "column:3": [
          {
            id: "blk_overflow_text",
            type: "text",
            props: { text: "Overflow child", format: "plain", align: "left" },
          },
        ],
      },
    };
    const { written, read, published } = roundTripStages(buildDocumentWithRawBlocks([rawColumns]));

    for (const stage of [written, read, published]) {
      const block = onlyBlock(stage);
      expect(block.type).toBe("columns");
      expect(block.props.count).toBe(2);
      // Active keys clamp to count=2...
      expect(getPageBlockActiveSlotKeys(block)).toEqual(["column:1", "column:2"]);
      // ...but the overflow slot content is retained, not pruned.
      expect(Object.keys(block.slots ?? {})).toEqual(["column:1", "column:3"]);
      const overflowChildren = block.slots?.["column:3"] ?? [];
      expect(overflowChildren).toHaveLength(1);
      expect(overflowChildren[0]?.id).toBe("blk_overflow_text");
      expect(overflowChildren[0]?.type).toBe("text");
      expect(overflowChildren[0]?.props.text).toBe("Overflow child");
    }
  });
});

describe("list block round-trip pins (TASK-442-01-L01)", () => {
  test("default empty list (items: []) survives write/read/publish", () => {
    const rawList = {
      id: "blk_list_empty",
      type: "list",
      props: { items: [], ordered: false },
    };
    const { written, read, published } = roundTripStages(buildDocumentWithRawBlocks([rawList]));

    for (const stage of [written, read, published]) {
      const block = onlyBlock(stage);
      expect(block.type).toBe("list");
      expect(block.id).toBe("blk_list_empty");
      // The schema layer does not prune empty item collections.
      expect(block.props.items).toEqual([]);
      expect(block.props.ordered).toBe(false);
    }
  });

  test("items coercion: non-array items reject on write and coerce to [] on stored reads", () => {
    // Client-readiness link-items contract (supersedes the TASK-442-01-L01
    // silent-coercion pin): list items are schema-validated. Fresh writes
    // reject non-array payloads with page_document_invalid; stored reads stay
    // non-destructive and coerce to [].
    const nonArrayPayloads: readonly unknown[] = ["not-an-array", 42, { nested: true }];

    for (const [index, items] of nonArrayPayloads.entries()) {
      const rawList = {
        id: `blk_list_coerced_${index + 1}`,
        type: "list",
        props: { items, ordered: false },
      };
      const rawDocument = buildDocumentWithRawBlocks([rawList]);

      expect(() => normalizePageDocumentV2ForWrite(rawDocument)).toThrowError(
        /Expected array at sections\.0\.blocks\.0\.props\.items/
      );

      const read = normalizeStoredPageDocumentV2ForRead(rawDocument);
      const block = onlyBlock(read);
      expect(block.type).toBe("list");
      expect(block.props.items).toEqual([]);
    }
  });

  test("populated list items survive write/read/publish intact", () => {
    const rawList = {
      id: "blk_list_populated",
      type: "list",
      props: { items: ["Alpha", "Beta", "Gamma"], ordered: true },
    };
    const { written, read, published } = roundTripStages(buildDocumentWithRawBlocks([rawList]));

    for (const stage of [written, read, published]) {
      const block = onlyBlock(stage);
      expect(block.type).toBe("list");
      // Plain string items keep their legacy stored shape untouched.
      expect(block.props.items).toEqual(["Alpha", "Beta", "Gamma"]);
      expect(block.props.ordered).toBe(true);
    }
  });

  test("link items ({ label, href }) survive write/read/publish with the exact stored shape", () => {
    const rawList = {
      id: "blk_list_links",
      type: "list",
      props: {
        items: ["Plain item", { label: "Privacy", href: "/privacy" }],
        ordered: false,
      },
    };
    const { written, read, published } = roundTripStages(buildDocumentWithRawBlocks([rawList]));

    for (const stage of [written, read, published]) {
      const block = onlyBlock(stage);
      expect(block.type).toBe("list");
      expect(block.props.items).toEqual(["Plain item", { label: "Privacy", href: "/privacy" }]);
    }
  });

  test("link items with an empty href collapse to plain strings; unknown item keys reject on write", () => {
    const collapsing = {
      id: "blk_list_collapse",
      type: "list",
      props: { items: [{ label: "No target", href: "   " }], ordered: false },
    };
    const { written } = roundTripStages(buildDocumentWithRawBlocks([collapsing]));
    expect(onlyBlock(written).props.items).toEqual(["No target"]);

    const unknownKey = buildDocumentWithRawBlocks([
      {
        id: "blk_list_unknown",
        type: "list",
        props: { items: [{ label: "Privacy", href: "/privacy", target: "_blank" }] },
      },
    ]);
    expect(() => normalizePageDocumentV2ForWrite(unknownKey)).toThrowError(
      /Unknown page document field: sections\.0\.blocks\.0\.props\.items\.0\.target/
    );
    // Stored reads stay non-destructive for the same payload: the unknown key
    // is dropped and the link item survives.
    const read = normalizeStoredPageDocumentV2ForRead(unknownKey);
    expect(onlyBlock(read).props.items).toEqual([{ label: "Privacy", href: "/privacy" }]);
  });
});
