import { describe, expect, test } from "vitest";

import Ajv from "ajv";

import {
  createPageBlockV2,
  isPageDocumentError,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
  pageBlockDefaultProps,
  pageBlockPropKeys,
  pageBlockTypes,
  pageDocumentV2JsonSchema,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import { buildDocument, cloneDocument, safeNormalizeError } from "./page-document-v2-test-helpers";

// --- Filters block (TASK-459-02) ---

describe("filters block contract (TASK-459-02)", () => {
  const filtersDocument = (props: Record<string, unknown>): PageDocumentV2 => {
    const document = buildDocument();
    document.sections[0]!.blocks = [
      {
        id: "blk_filters",
        type: "filters",
        props,
        visibility: { visible: true },
      },
    ];
    return document;
  };

  test("filters block capability: editor-insertable, runtime-real, scoped read-only binding", () => {
    expect(pageBlockCapabilities.filters).toMatchObject({
      editorInsertable: true,
      insertable: true,
      // Deliberate scope (mirrors form/collection): outside the assistant
      // emission vocabulary; the blueprint composer binds resolved ids.
      assistantEmittable: false,
      runtimeRenderer: "real",
      slots: [],
      publicDataBinding: "scoped-read-only",
    });
    expect("reason" in pageBlockCapabilities.filters).toBe(false);
    // The filters SECTION stays gated (composite-first product rule).
    expect(pageBlockDefaultProps.filters).toMatchObject({
      queryId: null,
      layout: "horizontal",
      autoApply: true,
      showSearch: true,
      showCount: true,
    });
  });

  test("filters props round-trip with canonical facet shapes", () => {
    const normalized = normalizePageDocumentV2ForWrite(
      filtersDocument({
        queryId: "query-1",
        layout: "sidebar",
        autoApply: false,
        showCount: false,
        applyLabel: "Filter now",
        aliases: {
          rooms: "data.rooms.in",
          sort: "__sort",
          q: "__q",
          page: "__page",
        },
        facets: [
          {
            id: "Rooms Facet",
            kind: "checkbox",
            label: "Rooms",
            field: "data.rooms",
            options: [{ value: "3", label: "Three" }],
          },
          {
            id: "sort",
            kind: "sort",
            label: "Sort",
            sortOptions: [
              { value: "data.price:asc", label: "Cheapest", field: "data.price", dir: "asc" },
            ],
          },
        ],
      })
    );

    const block = normalized.sections[0]!.blocks[0]!;
    expect(block.type).toBe("filters");
    expect(block.props).toMatchObject({
      queryId: "query-1",
      layout: "sidebar",
      autoApply: false,
      showSearch: true,
      showCount: false,
      applyLabel: "Filter now",
      aliases: {
        rooms: "data.rooms.in",
        sort: "__sort",
        q: "__q",
        page: "__page",
      },
    });
    // Canonical facet shape is owned by the listing filter contract: ids
    // tokenize, the default operator fills per kind.
    expect(block.props.facets).toEqual([
      {
        id: "rooms-facet",
        kind: "checkbox",
        label: "Rooms",
        field: "data.rooms",
        op: "in",
        options: [{ value: "3", label: "Three" }],
      },
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [
          { value: "data.price:asc", label: "Cheapest", field: "data.price", dir: "asc" },
        ],
      },
    ]);

    const reread = normalizeStoredPageDocumentV2ForRead(normalized);
    expect(reread.sections[0]!.blocks[0]!.props).toEqual(block.props);
  });

  test("unknown facet keys reject on write and drop on stored reads", () => {
    const payload = filtersDocument({
      queryId: "query-1",
      facets: [
        {
          id: "rooms",
          kind: "checkbox",
          label: "Rooms",
          field: "data.rooms",
          tracking: "nope",
        },
      ],
    });
    expect(() => normalizePageDocumentV2ForWrite(payload)).toThrowError(
      /Unknown page document field: sections\.0\.blocks\.0\.props\.facets\.0\.tracking/
    );

    const read = normalizeStoredPageDocumentV2ForRead(payload);
    expect(read.sections[0]!.blocks[0]!.props.facets).toEqual([
      { id: "rooms", kind: "checkbox", label: "Rooms", field: "data.rooms", op: "in" },
    ]);
  });

  test("filters aliases reject invalid fresh writes and sanitize stored reads", () => {
    const invalid = filtersDocument({
      queryId: "query-1",
      aliases: {
        "bad.alias": "data.rooms.in",
        rooms: "data.rooms.nope",
      },
    });
    expect(() => normalizePageDocumentV2ForWrite(invalid)).toThrowError(
      /Invalid sections\.0\.blocks\.0\.props\.aliases/
    );

    const read = normalizeStoredPageDocumentV2ForRead(invalid);
    expect(read.sections[0]!.blocks[0]!.props.aliases).toEqual({});
  });

  test("fieldless non-sort facets drop deterministically (canonical normalizer)", () => {
    const read = normalizeStoredPageDocumentV2ForRead(
      filtersDocument({
        queryId: "query-1",
        facets: [{ id: "broken", kind: "checkbox", label: "Broken" }],
      })
    );
    expect(read.sections[0]!.blocks[0]!.props.facets).toEqual([]);
  });

  test(
    "JSON schema accepts the filters block and rejects unknown facet keys",
    { timeout: 30_000 },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);

      const valid = filtersDocument({
        queryId: "query-1",
        layout: "horizontal",
        autoApply: true,
        showSearch: true,
        showCount: true,
        facets: [{ id: "rooms", kind: "checkbox", label: "Rooms", field: "data.rooms", op: "in" }],
      });
      expect(validate(valid)).toBe(true);

      const unknownFacetKey = filtersDocument({
        queryId: "query-1",
        facets: [{ id: "rooms", kind: "checkbox", field: "data.rooms", tracking: "nope" }],
      });
      expect(validate(unknownFacetKey)).toBe(false);

      const badLayout = filtersDocument({ queryId: "query-1", layout: "drawer" });
      expect(validate(badLayout)).toBe(false);
    }
  );

  test("legacy assistant collection blocks with mode:'filters' normalize into filters plus collection", () => {
    const document = buildDocument();
    document.sections[0]!.blocks = [
      {
        id: "blk_legacy_filters",
        type: "collection",
        props: {
          mode: "filters",
          queryId: "query-1",
          autoApply: false,
          showSearch: true,
          searchPlaceholder: "Search homes",
          searchLabel: "Search",
          applyLabel: "Apply",
          aliases: { rooms: "data.rooms.in" },
          facets: [{ id: "rooms", kind: "checkbox", label: "Rooms", field: "data.rooms" }],
        },
        visibility: { visible: true },
      } as unknown as PageBlockV2,
    ];

    for (const normalized of [
      normalizePageDocumentV2ForWrite(document),
      normalizeStoredPageDocumentV2ForRead(document),
    ]) {
      const filtersBlock = normalized.sections[0]!.blocks[0]!;
      const collectionBlock = normalized.sections[0]!.blocks[1]!;
      expect(filtersBlock.id).toBe("blk_legacy_filters_filters");
      expect(filtersBlock.type).toBe("filters");
      expect(filtersBlock.props).toMatchObject({
        queryId: "query-1",
        autoApply: false,
        showSearch: true,
        searchPlaceholder: "Search homes",
        searchLabel: "Search",
        applyLabel: "Apply",
        aliases: { rooms: "data.rooms.in" },
      });
      expect(filtersBlock.props.facets).toEqual([
        { id: "rooms", kind: "checkbox", label: "Rooms", field: "data.rooms", op: "in" },
      ]);
      expect(collectionBlock.id).toBe("blk_legacy_filters");
      expect(collectionBlock.type).toBe("collection");
      expect(collectionBlock.props).toMatchObject({ queryId: "query-1" });
      expect(collectionBlock.props).not.toHaveProperty("mode");
      expect(collectionBlock.props).not.toHaveProperty("facets");
    }

    // Plain collection blocks (no filters mode) stay untouched.
    const plain = buildDocument();
    plain.sections[0]!.blocks = [
      {
        id: "blk_plain_collection",
        type: "collection",
        props: { contentTypeId: "type-1", queryId: "query-1", limit: 6, templateId: null },
        visibility: { visible: true },
      },
    ];
    const normalizedPlain = normalizePageDocumentV2ForWrite(plain);
    expect(normalizedPlain.sections[0]!.blocks[0]!.type).toBe("collection");
  });
});

describe("collection pagination props and clamp unification (TASK-459-03)", () => {
  const buildCollectionDocument = (props: Record<string, unknown>): PageDocumentV2 => {
    const document = buildDocument();
    document.sections[0]!.blocks = [
      {
        id: "blk_collection_pagination",
        type: "collection",
        props,
        visibility: { visible: true },
      },
    ];
    return document;
  };

  test("pagination props round-trip with the schema defaults (mode none, pageSize null)", () => {
    expect(pageBlockPropKeys.collection).toEqual([
      "contentTypeId",
      "queryId",
      "limit",
      "templateId",
      "paginationMode",
      "pageSize",
      "showCta",
    ]);
    expect(pageBlockDefaultProps.collection).toMatchObject({
      paginationMode: "none",
      pageSize: null,
    });

    // Legacy documents (no pagination props stored) normalize to the default
    // "none" — exactly today's render contract.
    const legacy = buildCollectionDocument({
      contentTypeId: "type-1",
      queryId: null,
      limit: 6,
      templateId: null,
    });
    for (const normalized of [
      normalizePageDocumentV2ForWrite(legacy),
      normalizeStoredPageDocumentV2ForRead(legacy),
    ]) {
      expect(normalized.sections[0]!.blocks[0]!.props).toMatchObject({
        paginationMode: "none",
        pageSize: null,
      });
    }

    // Authored values round-trip on write and read.
    const paged = buildCollectionDocument({
      contentTypeId: "type-1",
      queryId: "query-1",
      limit: 12,
      templateId: null,
      paginationMode: "paged",
      pageSize: 9,
    });
    for (const normalized of [
      normalizePageDocumentV2ForWrite(paged),
      normalizeStoredPageDocumentV2ForRead(paged),
    ]) {
      expect(normalized.sections[0]!.blocks[0]!.props).toMatchObject({
        paginationMode: "paged",
        pageSize: 9,
        limit: 12,
      });
    }
  });

  test("paginationMode rejects unknown values on write and falls back on read", () => {
    const invalid = buildCollectionDocument({
      contentTypeId: "type-1",
      paginationMode: "infinite",
    });
    expect(() => normalizePageDocumentV2ForWrite(invalid)).toThrowError();
    const read = normalizeStoredPageDocumentV2ForRead(invalid);
    expect(read.sections[0]!.blocks[0]!.props.paginationMode).toBe("none");
  });

  test("pageSize rejects non-numeric writes and clamps out-of-range values to the owner bound", () => {
    const invalid = buildCollectionDocument({
      contentTypeId: "type-1",
      pageSize: "nine",
    });
    expect(() => normalizePageDocumentV2ForWrite(invalid)).toThrowError();
    expect(
      normalizeStoredPageDocumentV2ForRead(invalid).sections[0]!.blocks[0]!.props.pageSize
    ).toBeNull();

    const outOfRange = buildCollectionDocument({
      contentTypeId: "type-1",
      paginationMode: "paged",
      pageSize: 50,
    });
    for (const normalized of [
      normalizePageDocumentV2ForWrite(outOfRange),
      normalizeStoredPageDocumentV2ForRead(outOfRange),
    ]) {
      expect(normalized.sections[0]!.blocks[0]!.props.pageSize).toBe(24);
    }
  });

  // Ajv compilation of the recursive document schema takes seconds under
  // parallel suite load (same budget as the schema suite above).
  test(
    "limit clamps to the unified 1..24 bound (stored 25..50 normalize on read)",
    {
      timeout: 30_000,
    },
    () => {
      // The old schema allowed 1..50 while the runtime truncated to 24; the
      // unified owner bound makes the stored value honest. Stored documents
      // with 25..50 normalize ON READ to 24 — exactly what they already
      // rendered — with no destructive rewrite.
      const stored = buildCollectionDocument({ contentTypeId: "type-1", limit: 50 });
      expect(normalizeStoredPageDocumentV2ForRead(stored).sections[0]!.blocks[0]!.props.limit).toBe(
        24
      );
      expect(normalizePageDocumentV2ForWrite(stored).sections[0]!.blocks[0]!.props.limit).toBe(24);

      const inRange = buildCollectionDocument({ contentTypeId: "type-1", limit: 24 });
      expect(normalizePageDocumentV2ForWrite(inRange).sections[0]!.blocks[0]!.props.limit).toBe(24);

      // The JSON schema agrees with the owner bound.
      const ajv = new Ajv({ allowUnionTypes: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);
      expect(validate(buildCollectionDocument({ contentTypeId: "type-1", limit: 30 }))).toBe(false);
      expect(
        validate(
          normalizePageDocumentV2ForWrite(
            buildCollectionDocument({
              contentTypeId: "type-1",
              limit: 24,
              paginationMode: "load-more",
              pageSize: 12,
            })
          )
        )
      ).toBe(true);
    }
  );
});

describe("section scroll effect model (TASK-521-01-L01)", () => {
  const withSectionStyle = (style: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.style = {
      ...doc.sections[0]!.style,
      ...style,
    } as PageDocumentV2["sections"][number]["style"];
    return doc;
  };

  test("round-trips reveal-up + parallaxIntensity (present-only)", () => {
    const normalized = normalizePageDocumentV2ForWrite(
      withSectionStyle({ scrollEffect: "reveal-up", parallaxIntensity: 24 })
    );
    expect(normalized.sections[0]!.style).toMatchObject({
      scrollEffect: "reveal-up",
      parallaxIntensity: 24,
    });
    const roundTripped = normalizePageDocumentV2ForWrite(cloneDocument(normalized));
    expect(roundTripped.sections[0]!.style).toEqual(normalized.sections[0]!.style);
  });

  test("omits scrollEffect:'none' (present-only)", () => {
    const normalized = normalizePageDocumentV2ForWrite(withSectionStyle({ scrollEffect: "none" }));
    expect("scrollEffect" in normalized.sections[0]!.style).toBe(false);
  });

  test("clamps parallaxIntensity to [0,40] (fail-soft)", () => {
    const normalized = normalizeStoredPageDocumentV2ForRead(
      withSectionStyle({ parallaxIntensity: 9999 })
    );
    expect(normalized.sections[0]!.style.parallaxIntensity).toBe(40);
  });

  test("rejects invalid scrollEffect value on write (throws PageDocumentError)", () => {
    const bad = withSectionStyle({ scrollEffect: "drop-table" });
    expect(() => normalizePageDocumentV2ForWrite(bad)).toThrow();
    expect(isPageDocumentError(safeNormalizeError(bad), "page_document_invalid")).toBe(true);
  });

  test("rejects unknown style key", () => {
    expect(() => normalizePageDocumentV2ForWrite(withSectionStyle({ wobble: true }))).toThrow(
      "Unknown page document field: sections.0.style.wobble"
    );
  });

  test("legacy section (no effect keys) is byte-identical", () => {
    const normalized = normalizePageDocumentV2ForWrite(buildDocument());
    expect("scrollEffect" in normalized.sections[0]!.style).toBe(false);
    expect("parallaxIntensity" in normalized.sections[0]!.style).toBe(false);
  });

  test(
    "responsive[bp].style scroll keys validate + round-trip (partial-schema mirror)",
    { timeout: 30_000 },
    () => {
      const doc = buildDocument();
      doc.sections[0]!.responsive = {
        ...doc.sections[0]!.responsive,
        tablet: {
          ...doc.sections[0]!.responsive.tablet,
          style: { scrollEffect: "reveal-fade", parallaxIntensity: 30 },
        },
      };
      const normalized = normalizePageDocumentV2ForWrite(doc);
      expect(normalized.sections[0]!.responsive.tablet?.style).toMatchObject({
        scrollEffect: "reveal-fade",
        parallaxIntensity: 30,
      });
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);
      expect(validate(normalized)).toBe(true);
    }
  );
});

describe("section full-bleed background model (TASK-525-01-L02)", () => {
  const withSectionStyle = (style: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.style = {
      ...doc.sections[0]!.style,
      ...style,
    } as PageDocumentV2["sections"][number]["style"];
    return doc;
  };

  test("round-trips fullBleed:true (present-only)", () => {
    const normalized = normalizePageDocumentV2ForWrite(withSectionStyle({ fullBleed: true }));
    expect(normalized.sections[0]!.style.fullBleed).toBe(true);
    const roundTripped = normalizePageDocumentV2ForWrite(cloneDocument(normalized));
    expect(roundTripped.sections[0]!.style).toEqual(normalized.sections[0]!.style);
  });

  test("omits fullBleed:false (present-only, byte-identical)", () => {
    const normalized = normalizePageDocumentV2ForWrite(withSectionStyle({ fullBleed: false }));
    expect("fullBleed" in normalized.sections[0]!.style).toBe(false);
  });

  test("legacy section (no fullBleed key) is byte-identical", () => {
    const normalized = normalizePageDocumentV2ForWrite(buildDocument());
    expect("fullBleed" in normalized.sections[0]!.style).toBe(false);
  });

  test("rejects an unknown-shaped fullBleed sibling key", () => {
    expect(() => normalizePageDocumentV2ForWrite(withSectionStyle({ fullBleedX: true }))).toThrow(
      "Unknown page document field: sections.0.style.fullBleedX"
    );
  });

  // Expensive schema compile ⇒ 30s timeout (sibling AJV tests convention).
  // TASK-534: bump to the same explicit Ajv-compile timeout the other schema tests
  // use (the recursive document schema compiles in a few seconds under parallel
  // suite load; the default 5s ceiling flakes now the schema carries more props).
  test("fullBleed:true validates against the JSON schema", { timeout: 30_000 }, () => {
    const normalized = normalizePageDocumentV2ForWrite(withSectionStyle({ fullBleed: true }));
    const ajv = new Ajv({ allErrors: true, strict: true });
    const validate = ajv.compile(pageDocumentV2JsonSchema);
    expect(validate(normalized)).toBe(true);
  });
});

describe("page settings effects model (TASK-521-01-L02)", () => {
  const withEffects = (effects: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.settings = { ...doc.settings, effects } as PageDocumentV2["settings"];
    return doc;
  };

  test("round-trips { cursorSpotlight, spotlightColor(alpha), spotlightSize }", () => {
    const normalized = normalizePageDocumentV2ForWrite(
      withEffects({ cursorSpotlight: true, spotlightColor: "#0ea5e988", spotlightSize: 420 })
    );
    expect(normalized.settings.effects).toEqual({
      cursorSpotlight: true,
      spotlightColor: "#0ea5e988",
      spotlightSize: 420,
    });
    const roundTripped = normalizePageDocumentV2ForWrite(cloneDocument(normalized));
    expect(roundTripped.settings.effects).toEqual(normalized.settings.effects);
  });

  test("omits empty effects:{} (present-only)", () => {
    const normalized = normalizePageDocumentV2ForWrite(withEffects({}));
    expect("effects" in normalized.settings).toBe(false);
  });

  test("falls back spotlightColor 'url(x)' → var(--primary) (fail-soft)", () => {
    const normalized = normalizeStoredPageDocumentV2ForRead(
      withEffects({ spotlightColor: "url(x)" })
    );
    expect(normalized.settings.effects?.spotlightColor).toBe("var(--primary)");
  });

  test("clamps spotlightSize to [120,900] (fail-soft)", () => {
    const normalized = normalizeStoredPageDocumentV2ForRead(withEffects({ spotlightSize: 99999 }));
    expect(normalized.settings.effects?.spotlightSize).toBe(900);
  });

  test("rejects unknown settings.effects key", () => {
    expect(() => normalizePageDocumentV2ForWrite(withEffects({ glow: true }))).toThrow(
      "Unknown page document field: settings.effects.glow"
    );
  });

  test("legacy settings (no effects) is byte-identical", () => {
    const normalized = normalizePageDocumentV2ForWrite(buildDocument());
    expect("effects" in normalized.settings).toBe(false);
  });
});

describe("page settings background model (TASK-523-01-L01)", () => {
  const withBackground = (background: unknown): PageDocumentV2 => {
    const doc = buildDocument();
    doc.settings = { ...doc.settings, background } as PageDocumentV2["settings"];
    return doc;
  };

  test("settings.background: solid color round-trips (normalize→serialize→normalize)", () => {
    const normalized = normalizePageDocumentV2ForWrite(withBackground("#0ea5e9"));
    expect(normalized.settings.background).toBe("#0ea5e9");
    const roundTripped = normalizePageDocumentV2ForWrite(cloneDocument(normalized));
    expect(roundTripped.settings.background).toBe("#0ea5e9");
  });

  test("settings.background: safe gradient round-trips verbatim", () => {
    const gradient = "linear-gradient(120deg,#0ea5e9,#a855f7)";
    const normalized = normalizePageDocumentV2ForWrite(withBackground(gradient));
    expect(normalized.settings.background).toBe(gradient);
    const roundTripped = normalizePageDocumentV2ForWrite(cloneDocument(normalized));
    expect(roundTripped.settings.background).toBe(gradient);
  });

  test("settings.background: unknown sibling key rejects (assertKnownKeys, strict mode)", () => {
    const doc = buildDocument();
    doc.settings = { ...doc.settings, canvas: "#000" } as PageDocumentV2["settings"];
    expect(() => normalizePageDocumentV2ForWrite(doc)).toThrow(
      "Unknown page document field: settings.canvas"
    );
  });

  test("settings.background: injection-shaped value fails soft ⇒ key omitted", () => {
    const normalized = normalizeStoredPageDocumentV2ForRead(
      withBackground("red;}body{display:none")
    );
    expect("background" in normalized.settings).toBe(false);
  });

  test("settings.background: bare url()/expression() rejected ⇒ key omitted", () => {
    const url = normalizeStoredPageDocumentV2ForRead(withBackground("url(javascript:alert(1))"));
    expect("background" in url.settings).toBe(false);
    const expr = normalizeStoredPageDocumentV2ForRead(withBackground("expression(alert(1))"));
    expect("background" in expr.settings).toBe(false);
  });

  test("settings.background: url() NESTED in a gradient is rejected ⇒ key omitted (no url() layer, TASK-523 hardening)", () => {
    // The gradient sanitizer now rejects ANY url() token, so this malformed nested
    // form no longer survives — the key is omitted rather than stored verbatim.
    const malformed = "radial-gradient(circle,url(//x))";
    const normalized = normalizePageDocumentV2ForWrite(withBackground(malformed));
    expect("background" in normalized.settings).toBe(false);
  });

  test("settings.background: gradient head + trailing comma-separated url() LAYER is rejected ⇒ key omitted (TASK-523 outbound-beacon)", () => {
    // `linear-gradient(...), url(//evil)` is VALID CSS with two background layers, so a
    // browser would fetch the url() layer on render (outbound tracking beacon). The
    // sanitizer must reject the multi-layer form even though it starts with a valid head.
    for (const beacon of [
      "linear-gradient(red,blue), url(//evil.com/beacon.png)",
      "conic-gradient(from 0deg,red), url(evil.com/x)",
      "radial-gradient(circle,red,blue),url(/beacon)",
    ]) {
      const write = normalizePageDocumentV2ForWrite(withBackground(beacon));
      expect("background" in write.settings).toBe(false);
      const read = normalizeStoredPageDocumentV2ForRead(withBackground(beacon));
      expect("background" in read.settings).toBe(false);
    }
  });

  test("no settings.background ⇒ present-only omit; legacy/post-522 settings byte-identical", () => {
    const normalized = normalizePageDocumentV2ForWrite(buildDocument());
    expect("background" in normalized.settings).toBe(false);
  });

  test(
    "Ajv: settings.background is a valid string property; unknown settings key rejected by additionalProperties:false",
    { timeout: 30_000 },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);

      const withBg = buildDocument();
      withBg.settings = { ...withBg.settings, background: "#0ea5e9" };
      expect(validate(withBg)).toBe(true);

      const unknownKey = buildDocument();
      unknownKey.settings = {
        ...unknownKey.settings,
        canvas: "#000",
      } as unknown as PageDocumentV2["settings"];
      expect(validate(unknownKey)).toBe(false);
    }
  );
});

describe("animated-icon block Ajv lockstep (TASK-521-01-L03)", () => {
  test(
    "normalized icon block with numeric speed/size validates; a string speed fails",
    { timeout: 30_000 },
    () => {
      const doc = buildDocument();
      doc.sections[0]!.blocks = [createPageBlockV2("icon", { id: "blk_icon_ajv" })];
      const normalized = normalizePageDocumentV2ForWrite(doc);
      expect(normalized.sections[0]!.blocks[0]!.props).toMatchObject({ speed: 1600, size: 48 });

      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);
      expect(validate(normalized)).toBe(true);

      // A doc that reached the schema with a STRING speed would fail — proving
      // blockPropJsonSchemaForType returns numericSchema for icon speed, not the
      // generic stringSchema.
      const stringSpeed = cloneDocument(normalized);
      (stringSpeed.sections[0]!.blocks[0]!.props as Record<string, unknown>).speed = "fast";
      expect(validate(stringSpeed)).toBe(false);

      // And an out-of-enum animation fails the schema too (enum mirror).
      const badAnim = cloneDocument(normalized);
      (badAnim.sections[0]!.blocks[0]!.props as Record<string, unknown>).animation = "explode";
      expect(validate(badAnim)).toBe(false);
    }
  );
});

// TASK-522-01-L01 — the ONE new customSvg block type + props model.
describe("customSvg block type + props (TASK-522-01-L01)", () => {
  const CLEAN_SVG =
    '<svg viewBox="0 0 10 10"><path d="M0 0 L10 10" stroke="#000" stroke-width="2"/></svg>';

  const docWithCustomSvg = (props: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.blocks = [
      { id: "blk_svg", type: "customSvg", props, visibility: { visible: true } },
    ];
    return doc;
  };

  test("pageBlockTypes includes customSvg; propKeys + defaults + capabilities are correct", () => {
    expect(pageBlockTypes).toContain("customSvg");
    expect(pageBlockPropKeys.customSvg).toEqual(["svg", "drawIn", "drawSpeed", "label"]);
    expect(pageBlockDefaultProps.customSvg).toEqual({ svg: "", drawIn: false, label: "" });
    expect(pageBlockCapabilities.customSvg.editorInsertable).toBe(true);
    expect(pageBlockCapabilities.customSvg.runtimeRenderer).toBe("real");
  });

  test("round-trips a clean svg + drawIn + drawSpeed + label", () => {
    const normalized = normalizePageDocumentV2ForWrite(
      docWithCustomSvg({ svg: CLEAN_SVG, drawIn: true, drawSpeed: 2400, label: "House" })
    );
    const p = normalized.sections[0]!.blocks[0]!.props;
    expect(p.svg).toContain("<path");
    expect(p.drawIn).toBe(true);
    expect(p.drawSpeed).toBe(2400);
    expect(p.label).toBe("House");
    // idempotent re-normalize
    const again = normalizePageDocumentV2ForWrite(cloneDocument(normalized));
    expect(again.sections[0]!.blocks[0]!.props).toEqual(p);
  });

  test("svg/drawIn/label serialize WITH defaults when unauthored; drawSpeed is present-only", () => {
    const normalized = normalizePageDocumentV2ForWrite(
      docWithCustomSvg({ svg: "", drawIn: false, label: "" })
    );
    const p = normalized.sections[0]!.blocks[0]!.props;
    expect(p.svg).toBe("");
    expect(p.drawIn).toBe(false);
    expect(p.label).toBe("");
    expect(p).not.toHaveProperty("drawSpeed");
  });

  test("drawSpeed:99999 clamps to 6000", () => {
    const normalized = normalizePageDocumentV2ForWrite(
      docWithCustomSvg({ svg: CLEAN_SVG, drawIn: true, drawSpeed: 99999 })
    );
    expect(normalized.sections[0]!.blocks[0]!.props.drawSpeed).toBe(6000);
  });

  test("an svg containing <script> normalizes to svg:'' (sanitizer → default, NOT omitted)", () => {
    const normalized = normalizePageDocumentV2ForWrite(
      docWithCustomSvg({ svg: "<svg><script>alert(1)</script></svg>" })
    );
    const p = normalized.sections[0]!.blocks[0]!.props;
    expect(p.svg).toBe("");
    expect("svg" in p).toBe(true);
  });

  test("unknown prop customSvg.props.foo throws PageDocumentError", () => {
    expect(() =>
      normalizePageDocumentV2ForWrite(docWithCustomSvg({ svg: CLEAN_SVG, foo: "nope" }))
    ).toThrow("Unknown page document field: sections.0.blocks.0.props.foo");
  });

  test(
    "Ajv: a normalized customSvg block validates; an extra prop rejects",
    { timeout: 30_000 },
    () => {
      const normalized = normalizePageDocumentV2ForWrite(
        docWithCustomSvg({ svg: CLEAN_SVG, drawIn: true, drawSpeed: 2400, label: "x" })
      );
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);
      expect(validate(normalized)).toBe(true);
      const extra = cloneDocument(normalized);
      (extra.sections[0]!.blocks[0]!.props as Record<string, unknown>).evil = 1;
      expect(validate(extra)).toBe(false);
    }
  );
});
