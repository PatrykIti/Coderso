import { describe, expect, test } from "vitest";

import {
  PAGE_GALLERY_CATEGORY_MAX,
  PAGE_GALLERY_ITEMS_MAX,
  PAGE_GALLERY_SRC_MAX,
  PageDocumentError,
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
  getPageBlockActiveSlotKeys,
  isPageDocumentError,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
  pageBlockTypes,
  toPublishedPageDocumentV2,
  type PageBlockType,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";
import { safeNormalizeError } from "./page-document-v2-test-helpers";

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
    // TASK-471: "badge" joined the catalog (badge authoring enablement).
    // TASK-521-04: "icon" joined the catalog (animated-icon block flip).
    // TASK-522-01: "customSvg" joined the catalog (custom-SVG block).
    // TASK-534: "gallery" (filter controls) + "switcher"/"scrollHint" joined.
    expect(editorInsertableBlockTypes).toEqual([
      "heading",
      "text",
      "badge",
      "button",
      "image",
      "video",
      "gallery",
      "form",
      "list",
      "card",
      "collection",
      "filters",
      "divider",
      "spacer",
      "statistic",
      "icon",
      "quote",
      "container",
      "columns",
      "group",
      "customSvg",
      "switcher",
      "scrollHint",
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

describe("animated-icon block prop model (TASK-521-01-L03 — prop model only, NO type/capability flip)", () => {
  test("pageBlockTypes still contains 'icon' and NO 'animatedIcon' member", () => {
    expect(pageBlockTypes).toContain("icon");
    expect(pageBlockTypes as readonly string[]).not.toContain("animatedIcon");
  });

  test("pageBlockCapabilities.icon is real + insertable after the 521-04 flip", () => {
    // TASK-521-04-L03 flipped the capability (renderer case + palette + controls
    // shipped); this frozen-capability assertion is edited by 521-04-L04.
    expect(pageBlockCapabilities.icon).toMatchObject({
      runtimeRenderer: "real",
      editorInsertable: true,
      insertable: true,
    });
    expect(pageBlockCapabilities.icon).not.toHaveProperty("reason");
  });

  test("createPageBlockV2('icon') yields the extended default props + round-trips", () => {
    const block = createPageBlockV2("icon", { id: "blk_icon_default" });
    expect(block.props).toEqual({
      name: "sparkles",
      label: "",
      animation: "pulse",
      size: 48,
      color: "var(--primary)",
      speed: 1600,
    });
    const { written, read, published } = roundTripStages(buildDocumentWithRawBlocks([block]));
    for (const stage of [written, read, published]) {
      expect(onlyBlock(stage).props).toEqual(block.props);
    }
  });

  test("resolves bad icon name → 'sparkles' (pattern + set allowlist, fail-soft)", () => {
    for (const bad of ["../../x", "not-in-set", "SPARKLES", "<script>", "a".repeat(60)]) {
      const doc = buildDocumentWithRawBlocks([
        { id: "blk_icon_name", type: "icon", props: { name: bad } },
      ]);
      // Write mode is fail-soft for the name allowlist (no throw): coerces.
      expect(onlyBlock(normalizePageDocumentV2ForWrite(doc)).props.name).toBe("sparkles");
    }
  });

  test("rejects invalid animation value on write (fail-closed enum throws PageDocumentError)", () => {
    const doc = buildDocumentWithRawBlocks([
      { id: "blk_icon_anim", type: "icon", props: { animation: "explode" } },
    ]);
    expect(() => normalizePageDocumentV2ForWrite(doc)).toThrowError(
      /Invalid sections\.0\.blocks\.0\.props\.animation/
    );
    // Stored reads stay non-destructive: unknown enum falls back to "none".
    expect(onlyBlock(normalizeStoredPageDocumentV2ForRead(doc)).props.animation).toBe("none");
  });

  test("clamps size/speed (fail-soft); color 'expression(1)' → var(--primary) via readSafeColor", () => {
    const doc = buildDocumentWithRawBlocks([
      {
        id: "blk_icon_clamp",
        type: "icon",
        props: { size: 9999, speed: 10, color: "expression(1)" },
      },
    ]);
    const props = onlyBlock(normalizePageDocumentV2ForWrite(doc)).props;
    expect(props.size).toBe(160);
    expect(props.speed).toBe(400);
    expect(props.color).toBe("var(--primary)");
  });

  test("rejects unknown icon prop (icon.props.wobble → throws)", () => {
    const doc = buildDocumentWithRawBlocks([
      { id: "blk_icon_unknown", type: "icon", props: { wobble: true } },
    ]);
    expect(() => normalizePageDocumentV2ForWrite(doc)).toThrowError(
      /Unknown page document field: sections\.0\.blocks\.0\.props\.wobble/
    );
  });
});

// ── TASK-539-01-L01 ── strict gallery model ───────────────────────────────────
describe("TASK-539 strict gallery model", () => {
  const galleryDoc = (items: unknown): Record<string, unknown> =>
    buildDocumentWithRawBlocks([
      { id: "blk_gallery", type: "gallery", props: { layout: "grid", items } },
    ]);

  test("canonical rows round-trip exactly (src/alt/caption/category)", () => {
    const doc = galleryDoc([
      { src: "/a.jpg", alt: "A", caption: "Alpha", category: "modern eco" },
      { src: "/b.jpg", alt: "B", caption: "Beta" },
    ]);
    const { written, read, published } = roundTripStages(doc);
    for (const stage of [written, read, published]) {
      const items = onlyBlock(stage).props.items as Array<Record<string, unknown>>;
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        src: "/a.jpg",
        alt: "A",
        caption: "Alpha",
        category: "modern eco",
      });
      expect(items[1]).toEqual({ src: "/b.jpg", alt: "B", caption: "Beta" });
    }
  });

  test("draft sentinel {src:'',alt:'',caption:''} persists and counts toward the limit", () => {
    const doc = galleryDoc([{ src: "", alt: "", caption: "" }]);
    const written = normalizePageDocumentV2ForWrite(doc);
    const items = onlyBlock(written).props.items as Array<Record<string, unknown>>;
    expect(items).toEqual([{ src: "", alt: "", caption: "" }]);
  });

  test("caption-only and alt-only rows are canonical persistence data", () => {
    const doc = galleryDoc([
      { src: "", alt: "", caption: "Caption only" },
      { src: "", alt: "Alt only", caption: "" },
    ]);
    const written = normalizePageDocumentV2ForWrite(doc);
    const items = onlyBlock(written).props.items as Array<Record<string, unknown>>;
    expect(items[0]).toEqual({ src: "", alt: "", caption: "Caption only" });
    expect(items[1]).toEqual({ src: "", alt: "Alt only", caption: "" });
  });

  test("121 raw rows reject on write; the 120th is accepted", () => {
    const atLimit = Array.from({ length: PAGE_GALLERY_ITEMS_MAX }, (_, i) => ({
      src: `/g/${i}.jpg`,
      alt: `A${i}`,
      caption: `C${i}`,
    }));
    const ok = normalizePageDocumentV2ForWrite(galleryDoc(atLimit));
    expect(onlyBlock(ok).props.items as unknown[]).toHaveLength(PAGE_GALLERY_ITEMS_MAX);
    const over = galleryDoc([...atLimit, { src: "/x.jpg", alt: "X", caption: "X" }]);
    const error = safeNormalizeError(over);
    expect(isPageDocumentError(error, "page_document_invalid")).toBe(true);
  });

  test("required-string caps reject cap+1 and accept the exact cap", () => {
    // The src must be byte-identical to the media sanitizer output at the cap,
    // so build a valid absolute URL whose path hits PAGE_GALLERY_SRC_MAX.
    const srcPrefix = "https://example.com/";
    const srcAtCap = srcPrefix + "a".repeat(PAGE_GALLERY_SRC_MAX - srcPrefix.length);
    expect(srcAtCap.length).toBe(PAGE_GALLERY_SRC_MAX);
    const cap = galleryDoc([{ src: srcAtCap, alt: "a".repeat(500), caption: "c".repeat(2_000) }]);
    expect(normalizePageDocumentV2ForWrite(cap)).toBeDefined();
    const over = galleryDoc([{ src: srcAtCap + "a", alt: "a", caption: "c" }]);
    const error = safeNormalizeError(over);
    expect(isPageDocumentError(error, "page_document_invalid")).toBe(true);
  });

  test("outer whitespace on every required string rejects (never canonicalized)", () => {
    for (const row of [
      { src: " /a.jpg", alt: "a", caption: "c" },
      { src: "/a.jpg", alt: " a", caption: "c" },
      { src: "/a.jpg", alt: "a", caption: "c " },
    ]) {
      const error = safeNormalizeError(galleryDoc([row]));
      expect(isPageDocumentError(error, "page_document_invalid")).toBe(true);
    }
  });

  test("nonempty src must be byte-identical to the media sanitizer output", () => {
    const unsafe = galleryDoc([{ src: "javascript:alert(1)", alt: "a", caption: "c" }]);
    const error = safeNormalizeError(unsafe);
    expect(isPageDocumentError(error, "page_document_invalid")).toBe(true);
  });

  test("missing or wrong-typed required strings throw page_document_invalid", () => {
    for (const row of [
      { src: "/a.jpg", caption: "c" },
      { src: "/a.jpg", alt: 5, caption: "c" },
      { src: "/a.jpg", alt: "a", caption: null },
    ]) {
      const error = safeNormalizeError(galleryDoc([row]));
      expect(isPageDocumentError(error, "page_document_invalid")).toBe(true);
    }
  });

  test("unknown/legacy keys on a write row throw page_document_unknown_field at the exact path", () => {
    for (const key of [
      "url",
      "image",
      "assetUrl",
      "title",
      "label",
      "name",
      "description",
      "evil",
    ]) {
      const error = safeNormalizeError(
        galleryDoc([{ src: "/a.jpg", alt: "a", caption: "c", [key]: "x" }])
      );
      expect(isPageDocumentError(error, "page_document_unknown_field"), key).toBe(true);
      expect((error as PageDocumentError)?.path).toBe(`sections.0.blocks.0.props.items.0.${key}`);
    }
  });

  test("category write matrix: empty, invalid, 48/49-char tokens, 12/13 tokens, 587/588, duplicates", () => {
    // category:"" must be omitted on write, never accepted.
    const empty = galleryDoc([{ src: "/a.jpg", alt: "a", caption: "c", category: "" }]);
    const emptyError = safeNormalizeError(empty);
    expect(isPageDocumentError(emptyError, "page_document_invalid")).toBe(true);

    // 48-char token is legal.
    const token48 = "a".repeat(48);
    const ok = normalizePageDocumentV2ForWrite(
      galleryDoc([{ src: "/a.jpg", alt: "a", caption: "c", category: token48 }])
    );
    expect((onlyBlock(ok).props.items as Array<Record<string, unknown>>)[0]?.category).toBe(
      token48
    );

    // 49-char token rejects.
    const bad = safeNormalizeError(
      galleryDoc([{ src: "/a.jpg", alt: "a", caption: "c", category: "a".repeat(49) }])
    );
    expect(isPageDocumentError(bad, "page_document_invalid")).toBe(true);

    // 12 tokens legal; 13 tokens reject.
    const twelve = Array.from({ length: 12 }, (_, i) => `t${i}`).join(" ");
    const twelveOk = normalizePageDocumentV2ForWrite(
      galleryDoc([{ src: "/a.jpg", alt: "a", caption: "c", category: twelve }])
    );
    expect((onlyBlock(twelveOk).props.items as Array<Record<string, unknown>>)[0]?.category).toBe(
      twelve
    );
    const thirteen = Array.from({ length: 13 }, (_, i) => `t${i}`).join(" ");
    const thirteenError = safeNormalizeError(
      galleryDoc([{ src: "/a.jpg", alt: "a", caption: "c", category: thirteen }])
    );
    expect(isPageDocumentError(thirteenError, "page_document_invalid")).toBe(true);

    // 587-char total legal; 588 rejects. Tokens must be unique AND 48 chars,
    // so pad a unique index into each token body.
    const maxTotal = Array.from(
      { length: 12 },
      (_, i) => "a".repeat(40) + String(i).padStart(8, "0")
    ).join(" ");
    expect(maxTotal.length).toBe(PAGE_GALLERY_CATEGORY_MAX);
    const okMax = normalizePageDocumentV2ForWrite(
      galleryDoc([{ src: "/a.jpg", alt: "a", caption: "c", category: maxTotal }])
    );
    expect((onlyBlock(okMax).props.items as Array<Record<string, unknown>>)[0]?.category).toBe(
      maxTotal
    );

    // Duplicate tokens reject on write (schema may accept them; normalizer must not).
    const dup = safeNormalizeError(
      galleryDoc([{ src: "/a.jpg", alt: "a", caption: "c", category: "modern modern" }])
    );
    expect(isPageDocumentError(dup, "page_document_invalid")).toBe(true);

    // Bad spacing / non-ASCII whitespace reject.
    const spaced = safeNormalizeError(
      galleryDoc([{ src: "/a.jpg", alt: "a", caption: "c", category: "modern  eco" }])
    );
    expect(isPageDocumentError(spaced, "page_document_invalid")).toBe(true);
  });

  test("stored read: legacy aliases use exact precedence (empty higher-precedence wins)", () => {
    const doc = galleryDoc([
      { url: "/url.jpg", title: "T", description: "D" },
      { src: "/src.jpg", image: "/ignored.jpg" },
      { title: "Title only" },
    ]);
    const read = normalizeStoredPageDocumentV2ForRead(doc);
    const items = onlyBlock(read).props.items as Array<Record<string, unknown>>;
    expect(items[0]).toEqual({ src: "/url.jpg", alt: "T", caption: "T" });
    // src beats image; title supplies both alt and caption.
    expect(items[1]).toEqual({ src: "/src.jpg", alt: "", caption: "" });
    expect(items[2]).toEqual({ src: "", alt: "Title only", caption: "Title only" });
  });

  test("stored read: trim-before-cap, sanitize-after-cap, and canonical-only output", () => {
    const doc = galleryDoc([
      { src: "  /a.jpg  ", alt: "  A  ", caption: "  C  ", category: "x  y  x" },
    ]);
    const read = normalizeStoredPageDocumentV2ForRead(doc);
    const items = onlyBlock(read).props.items as Array<Record<string, unknown>>;
    expect(items[0]).toEqual({ src: "/a.jpg", alt: "A", caption: "C", category: "x y" });
  });

  test("stored read: unsafe src sanitizes to empty and junk rows drop; frozen input unchanged", () => {
    const doc = galleryDoc([
      { src: "javascript:bad()", alt: "A", caption: "C" },
      { id: 5 },
      { src: 42, alt: "B" },
    ]);
    const read = normalizeStoredPageDocumentV2ForRead(doc);
    const items = onlyBlock(read).props.items as Array<Record<string, unknown>>;
    // The no-string-field row drops; the alt-bearing row survives with empty src.
    expect(items).toEqual([
      { src: "", alt: "A", caption: "C" },
      { src: "", alt: "B", caption: "" },
    ]);
  });

  test("stored read: legacy string rows adapt with empty alt/caption and read is deterministic", () => {
    const doc = galleryDoc(["https://example.com/slide.jpg"]);
    const read = normalizeStoredPageDocumentV2ForRead(doc);
    expect(onlyBlock(read).props.items).toEqual([
      { src: "https://example.com/slide.jpg", alt: "", caption: "" },
    ]);
    const second = normalizeStoredPageDocumentV2ForRead(read);
    expect(JSON.stringify(second)).toBe(JSON.stringify(read));
  });

  test("stored read: alt-only/all-empty preservation and cap-at-120 slicing", () => {
    const doc = galleryDoc([
      { src: "", alt: "Only alt", caption: "" },
      { src: "", alt: "", caption: "" },
    ]);
    const read = normalizeStoredPageDocumentV2ForRead(doc);
    const items = onlyBlock(read).props.items as Array<Record<string, unknown>>;
    expect(items).toEqual([
      { src: "", alt: "Only alt", caption: "" },
      { src: "", alt: "", caption: "" },
    ]);
  });
});
