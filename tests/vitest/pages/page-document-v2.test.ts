import { describe, expect, test, vi } from "vitest";

import Ajv from "ajv";

import {
  PAGE_TEXT_MARK_MAX,
  applyBlockTextMark,
  removeBlockTextMark,
  clearResponsiveOverride,
  createPageDocumentId,
  createDefaultPageDocumentV2,
  isPageDocumentError,
  isLegacyOrVersionlessPageDocument,
  normalizePageDocumentV2ForWrite,
  normalizeBlockTextColorMarks,
  normalizeBlockTextMarks,
  normalizeStoredPageDocumentV2ForRead,
  pageDocumentV2JsonSchema,
  resolvePageBlockForBreakpoint,
  resolvePageDocumentForBreakpoint,
  resolvePageSectionForBreakpoint,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  buildDocument,
  safeNormalizeError,
  withGlobalCrypto,
} from "./page-document-v2-test-helpers";

describe("PageDocumentV2", () => {
  test("compacts crypto randomUUID output into the stored id shape", () => {
    const cryptoStub = {
      randomUUID: () => "ABCDEFAB-CDEF-4ABC-8DEF-ABCDEFABCDEF",
    } as unknown as Crypto;

    withGlobalCrypto(cryptoStub, () => {
      expect(createPageDocumentId("sec")).toBe("sec_abcdefabcdef");
    });
  });

  test("uses crypto getRandomValues when randomUUID is unavailable", () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set([0, 1, 2, 3, 4, 5]);
      return bytes;
    });
    const cryptoStub = { getRandomValues } as unknown as Crypto;

    withGlobalCrypto(cryptoStub, () => {
      expect(createPageDocumentId("blk")).toBe("blk_000102030405");
    });
    expect(getRandomValues).toHaveBeenCalledOnce();
  });

  test("fails closed instead of falling back to insecure randomness", () => {
    withGlobalCrypto(undefined, () => {
      try {
        createPageDocumentId("sec");
        throw new Error("Expected createPageDocumentId to fail without Web Crypto");
      } catch (error) {
        expect(isPageDocumentError(error, "page_document_invalid")).toBe(true);
      }
    });
  });

  test("normalizes a strict v2 Page document without widget block coupling", () => {
    const normalized = normalizePageDocumentV2ForWrite(buildDocument());

    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.sections).toHaveLength(1);
    expect(normalized.sections[0]?.blocks[0]).toMatchObject({
      id: "blk_heading",
      type: "heading",
      props: {
        text: "Build with Coderso",
        level: "h1",
      },
    });
    expect("blocks" in normalized).toBe(false);
  });

  // Ajv compilation of the recursive document schema takes seconds under
  // parallel suite load, so the schema tests carry an explicit timeout.
  const AJV_COMPILE_TEST_TIMEOUT_MS = 30_000;

  test(
    "exposes a JSON schema that accepts v2 and rejects v1 blocks payloads",
    { timeout: AJV_COMPILE_TEST_TIMEOUT_MS },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);

      expect(validate(buildDocument())).toBe(true);
      expect(validate({ blocks: [] })).toBe(false);
      expect(validate({ schemaVersion: 2, sections: [], extra: true })).toBe(false);
    }
  );

  test(
    "keeps JSON schema parity for strict block props, style, and responsive fields",
    {
      timeout: AJV_COMPILE_TEST_TIMEOUT_MS,
    },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);

      const unknownBlockProp = buildDocument();
      unknownBlockProp.sections[0]!.blocks[0]!.props = {
        ...unknownBlockProp.sections[0]!.blocks[0]!.props,
        trackingPixel: "nope",
      };
      expect(validate(unknownBlockProp)).toBe(false);

      const unknownBlockStyle = buildDocument();
      unknownBlockStyle.sections[0]!.blocks[0]!.style = {
        align: "center",
        debugBorder: "nope",
      } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
      expect(validate(unknownBlockStyle)).toBe(false);

      const unknownBlockResponsive = buildDocument();
      unknownBlockResponsive.sections[0]!.blocks[0]!.responsive = {
        mobile: {
          props: { text: "Mobile", trackingPixel: "nope" },
        },
      };
      expect(validate(unknownBlockResponsive)).toBe(false);

      const unknownSectionResponsive = buildDocument();
      unknownSectionResponsive.sections[0]!.responsive = {
        mobile: {
          layout: { columns: 1 },
          debug: true,
        } as PageDocumentV2["sections"][number]["responsive"]["mobile"],
      };
      expect(validate(unknownSectionResponsive)).toBe(false);

      const invalidBlockPropEnum = buildDocument();
      invalidBlockPropEnum.sections[0]!.blocks[0] = {
        id: "blk_image",
        type: "image",
        props: { src: "/hero.jpg", alt: "Hero", caption: "", fit: "stretch" },
        visibility: { visible: true },
      };
      expect(validate(invalidBlockPropEnum)).toBe(false);

      const invalidBlockPropNumber = buildDocument();
      invalidBlockPropNumber.sections[0]!.blocks[0] = {
        id: "blk_divider",
        type: "divider",
        props: { tone: "neutral", thickness: 99 },
        visibility: { visible: true },
      };
      expect(validate(invalidBlockPropNumber)).toBe(false);
    }
  );

  test("rejects unknown root, section, block, and block prop fields on fresh writes", () => {
    expect(() =>
      normalizePageDocumentV2ForWrite({
        ...buildDocument(),
        unexpected: true,
      })
    ).toThrow("Unknown page document field: unexpected");

    const sectionUnknown = buildDocument();
    sectionUnknown.sections[0] = {
      ...sectionUnknown.sections[0]!,
      extra: "nope",
    } as PageDocumentV2["sections"][number];
    expect(() => normalizePageDocumentV2ForWrite(sectionUnknown)).toThrow(
      "Unknown page document field: sections.0.extra"
    );

    const blockUnknown = buildDocument();
    blockUnknown.sections[0]!.blocks[0] = {
      ...blockUnknown.sections[0]!.blocks[0]!,
      extra: "nope",
    } as PageDocumentV2["sections"][number]["blocks"][number];
    expect(() => normalizePageDocumentV2ForWrite(blockUnknown)).toThrow(
      "Unknown page document field: sections.0.blocks.0.extra"
    );

    const propUnknown = buildDocument();
    propUnknown.sections[0]!.blocks[0]!.props = {
      ...propUnknown.sections[0]!.blocks[0]!.props,
      trackingPixel: "nope",
    };
    expect(() => normalizePageDocumentV2ForWrite(propUnknown)).toThrow(
      "Unknown page document field: sections.0.blocks.0.props.trackingPixel"
    );

    const styleUnknown = buildDocument();
    styleUnknown.sections[0]!.blocks[0]!.style = {
      align: "center",
      debugBorder: "nope",
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    expect(() => normalizePageDocumentV2ForWrite(styleUnknown)).toThrow(
      "Unknown page document field: sections.0.blocks.0.style.debugBorder"
    );
  });

  test("rejects fresh legacy/versionless writes and resets stored legacy data for reads", () => {
    expect(() => normalizePageDocumentV2ForWrite({ blocks: [] })).toThrow(
      "Pages require schemaVersion 2 and sections[]."
    );
    expect(isLegacyOrVersionlessPageDocument({ blocks: [] })).toBe(true);
    expect(isLegacyOrVersionlessPageDocument({ schemaVersion: 2, sections: [] })).toBe(false);

    expect(normalizeStoredPageDocumentV2ForRead({ blocks: [] })).toEqual(
      createDefaultPageDocumentV2()
    );
    expect(normalizeStoredPageDocumentV2ForRead({})).toEqual(createDefaultPageDocumentV2());
  });

  test("normalizes corrupt stored revision retention to the documented default", () => {
    const stored = {
      ...buildDocument(),
      settings: {
        ...buildDocument().settings,
        revisionRetention: Number.NaN,
      },
    };

    expect(normalizeStoredPageDocumentV2ForRead(stored).settings.revisionRetention).toBe(10);
  });

  test("resolves responsive section overrides through a desktop-first cascade", () => {
    const [section] = buildDocument().sections;
    expect(section).toBeDefined();

    const desktop = resolvePageSectionForBreakpoint(section!, "desktop");
    const tablet = resolvePageSectionForBreakpoint(section!, "tablet");
    const mobileDocument = resolvePageDocumentForBreakpoint(buildDocument(), "mobile");

    expect(desktop.layout.columns).toBe(2);
    expect(tablet.layout.columns).toBe(1);
    expect(tablet.spacing.gap).toBe(20);
    expect(tablet.spacing.paddingLeft).toBe(40);
    expect(mobileDocument.sections[0]?.visibility.visible).toBe(false);
    expect(mobileDocument.sections[0]?.spacing.paddingLeft).toBe(20);
  });

  test("normalizes layout.stackVertical with an explicit false default and sparse overrides (TASK-425)", () => {
    // Full normalization defaults the base flag to false when absent, so
    // documents saved before the field resolve to today's behavior.
    const withoutField = normalizePageDocumentV2ForWrite(buildDocument());
    expect(withoutField.sections[0]?.layout.stackVertical).toBe(false);

    // Fresh writes accept the base flag and the per-breakpoint override
    // through the existing responsive[bp].layout container.
    const document = buildDocument();
    document.sections[0]!.layout.stackVertical = false;
    document.sections[0]!.responsive.mobile = {
      ...document.sections[0]!.responsive.mobile,
      layout: { stackVertical: true },
    };
    const normalized = normalizePageDocumentV2ForWrite(document);
    expect(normalized.sections[0]?.layout.stackVertical).toBe(false);
    expect(normalized.sections[0]?.responsive.mobile?.layout).toEqual({ stackVertical: true });
    // Overrides stay sparse: tablet did not gain the field.
    expect(normalized.sections[0]?.responsive.tablet?.layout).toEqual({ columns: 1 });

    // Cascade: mobile resolves the override, desktop/tablet keep the base.
    const resolvedMobile = resolvePageSectionForBreakpoint(normalized.sections[0]!, "mobile");
    expect(resolvedMobile.layout.stackVertical).toBe(true);
    const resolvedTablet = resolvePageSectionForBreakpoint(normalized.sections[0]!, "tablet");
    expect(resolvedTablet.layout.stackVertical).toBe(false);

    // Reset restores inheritance through the shared override-clear helper.
    const cleared = clearResponsiveOverride(normalized.sections[0]!, "mobile", [
      "layout",
      "stackVertical",
    ]);
    expect(cleared.responsive.mobile?.layout).toBeUndefined();

    // Non-boolean stored values fall back to false instead of inventing layout.
    const storedCorrupt = buildDocument();
    (storedCorrupt.sections[0]!.layout as Record<string, unknown>).stackVertical = "yes";
    const storedRead = normalizeStoredPageDocumentV2ForRead(storedCorrupt);
    expect(storedRead.sections[0]?.layout.stackVertical).toBe(false);
  });

  test("normalizes expanded block style fields with clamped values", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.style = {
      align: "center",
      width: "full",
      textColor: " #111827 ",
      background: null,
      backgroundType: "color",
      backgroundImage: " /media/hero.jpg ",
      opacity: 2,
      radius: 99,
      shadow: "lg",
      borderColor: " #e2e8f0 ",
      borderWidth: 99,
      borderStyle: "dashed",
      padding: { top: 12, right: 999, bottom: -5, left: 4 },
      margin: { top: 8 },
    };

    const normalized = normalizePageDocumentV2ForWrite(document);

    expect(normalized.sections[0]?.blocks[0]?.style).toEqual({
      align: "center",
      width: "full",
      textColor: "#111827",
      background: null,
      backgroundType: "color",
      backgroundImage: "/media/hero.jpg",
      opacity: 1,
      radius: 64,
      shadow: "lg",
      borderColor: "#e2e8f0",
      borderWidth: 12,
      borderStyle: "dashed",
      padding: { top: 12, right: 240, bottom: 0, left: 4 },
      margin: { top: 8 },
    });
  });

  test("normalizes token-backed typography style fields with clamps and explicit nulls", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.style = {
      fontFamily: "display",
      fontSize: "xs",
      fontWeight: "bold",
      lineHeight: 99,
      letterSpacing: -99,
    };
    document.sections[0]!.blocks[1]!.style = {
      fontFamily: null,
      fontSize: null,
      fontWeight: null,
      lineHeight: null,
      letterSpacing: null,
    };

    const normalized = normalizePageDocumentV2ForWrite(document);

    expect(normalized.sections[0]?.blocks[0]?.style).toEqual({
      fontFamily: "display",
      fontSize: "xs",
      fontWeight: "bold",
      lineHeight: 2.5,
      letterSpacing: -2,
    });
    // Explicit null is the stored "use the baked default" value.
    expect(normalized.sections[0]?.blocks[1]?.style).toEqual({
      fontFamily: null,
      fontSize: null,
      fontWeight: null,
      lineHeight: null,
      letterSpacing: null,
    });
  });

  test("rejects unknown typography tokens on writes and nulls them on stored reads", () => {
    const badFontSize = buildDocument();
    badFontSize.sections[0]!.blocks[0]!.style = {
      fontSize: "mega",
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    expect(() => normalizePageDocumentV2ForWrite(badFontSize)).toThrow(
      "Invalid sections.0.blocks.0.style.fontSize."
    );
    expect(isPageDocumentError(safeNormalizeError(badFontSize), "page_document_invalid")).toBe(
      true
    );

    const badLineHeight = buildDocument();
    badLineHeight.sections[0]!.blocks[0]!.style = {
      lineHeight: "tall",
    } as unknown as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    expect(() => normalizePageDocumentV2ForWrite(badLineHeight)).toThrow(
      "Invalid sections.0.blocks.0.style.lineHeight."
    );

    // Stored reads fail open to null (no invented styling) instead of throwing.
    const storedRead = normalizeStoredPageDocumentV2ForRead(badFontSize);
    expect(storedRead.sections[0]?.blocks[0]?.style?.fontSize).toBeNull();
  });

  test("documents without typography fields normalize without gaining them (legacy parity)", () => {
    const legacyShaped = buildDocument();
    const written = normalizePageDocumentV2ForWrite(legacyShaped);
    const read = normalizeStoredPageDocumentV2ForRead(legacyShaped);

    for (const normalized of [written, read]) {
      const block = normalized.sections[0]?.blocks[0];
      expect(block?.style).toBeUndefined();
      const styled = normalized.sections[0]?.blocks[1];
      expect(styled?.style ?? {}).not.toHaveProperty("fontFamily");
      expect(styled?.style ?? {}).not.toHaveProperty("fontSize");
      expect(styled?.style ?? {}).not.toHaveProperty("fontWeight");
      expect(styled?.style ?? {}).not.toHaveProperty("lineHeight");
      expect(styled?.style ?? {}).not.toHaveProperty("letterSpacing");
    }
  });

  // ── TASK-532 typography fidelity (Bundle B) — model + schema round-trip ──
  test("TASK-532 fluid font-size + text-transform + heavier weights round-trip present-only", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.style = {
      fontSizeCustom: " clamp(2.6rem,5vw,4.4rem) ",
      fontSize: "lg",
      fontWeight: "extrabold",
      textTransform: "uppercase",
    } as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    document.sections[0]!.blocks[1]!.style = {
      fontWeight: "black",
      textTransform: "none", // present-only reset ⇒ omitted
      fontSizeCustom: "expression(1)", // rejected by the grammar ⇒ omitted
    } as PageDocumentV2["sections"][number]["blocks"][number]["style"];

    const normalized = normalizePageDocumentV2ForWrite(document);

    // Custom size is stored trimmed; the token remains (custom-wins is a render
    // concern); heavier weight + transform round-trip.
    expect(normalized.sections[0]?.blocks[0]?.style).toEqual({
      fontSizeCustom: "clamp(2.6rem,5vw,4.4rem)",
      fontSize: "lg",
      fontWeight: "extrabold",
      textTransform: "uppercase",
    });
    // "none" transform + rejected fluid size are both OMITTED (present-only).
    expect(normalized.sections[0]?.blocks[1]?.style).toEqual({
      fontWeight: "black",
    });
  });

  test("TASK-532 fail-closed enums: bad fontWeight/textTransform throw on write", () => {
    const badWeight = buildDocument();
    badWeight.sections[0]!.blocks[0]!.style = {
      fontWeight: "ultra",
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    expect(() => normalizePageDocumentV2ForWrite(badWeight)).toThrow(
      "Invalid sections.0.blocks.0.style.fontWeight."
    );

    const badTransform = buildDocument();
    badTransform.sections[0]!.blocks[0]!.style = {
      textTransform: "rotate",
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    expect(() => normalizePageDocumentV2ForWrite(badTransform)).toThrow(
      "Invalid sections.0.blocks.0.style.textTransform."
    );
  });

  test("TASK-532 eyebrow divider width/align/gradient round-trip present-only + clamp + fail-closed", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0] = {
      id: "blk_divider",
      type: "divider",
      props: { tone: "accent", thickness: 2, width: 34, align: "left", gradient: true },
      visibility: { visible: true },
    };
    document.sections[0]!.blocks[1] = {
      id: "blk_divider2",
      type: "divider",
      props: { tone: "neutral", thickness: 1, width: 9999, align: "center" },
      visibility: { visible: true },
    };

    const normalized = normalizePageDocumentV2ForWrite(document);
    expect(normalized.sections[0]?.blocks[0]?.props).toEqual({
      tone: "accent",
      thickness: 2,
      width: 34,
      align: "left",
      gradient: true,
    });
    // width over the cap clamps to 400 (fail-soft); no gradient authored.
    expect(normalized.sections[0]?.blocks[1]?.props).toEqual({
      tone: "neutral",
      thickness: 1,
      width: 400,
      align: "center",
    });

    // align:"skew" is fail-closed.
    const badAlign = buildDocument();
    badAlign.sections[0]!.blocks[0] = {
      id: "blk_divider3",
      type: "divider",
      props: { tone: "neutral", thickness: 1, align: "skew" },
      visibility: { visible: true },
    };
    expect(() => normalizePageDocumentV2ForWrite(badAlign)).toThrow();
  });

  test("TASK-532 legacy divider without new props is byte-identical (present-only)", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0] = {
      id: "blk_divider",
      type: "divider",
      props: { tone: "muted", thickness: 3 },
      visibility: { visible: true },
    };
    const written = normalizePageDocumentV2ForWrite(document);
    expect(written.sections[0]?.blocks[0]?.props).toEqual({ tone: "muted", thickness: 3 });
    // No new decorative keys leaked in.
    expect(written.sections[0]?.blocks[0]?.props).not.toHaveProperty("width");
    expect(written.sections[0]?.blocks[0]?.props).not.toHaveProperty("align");
    expect(written.sections[0]?.blocks[0]?.props).not.toHaveProperty("gradient");
  });

  test(
    "TASK-532 JSON schema accepts new fields on inline + responsive style, rejects unknown",
    { timeout: AJV_COMPILE_TEST_TIMEOUT_MS },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);

      const inline = buildDocument();
      inline.sections[0]!.blocks[0]!.style = {
        fontSizeCustom: "clamp(2.6rem,5vw,4.4rem)",
        textTransform: "uppercase",
        fontWeight: "black",
      } as PageDocumentV2["sections"][number]["blocks"][number]["style"];
      expect(validate(inline)).toBe(true);

      // The responsive-override style path is validated by the SAME $ref-shared
      // schema (no separate partial schema exists).
      const responsive = buildDocument();
      responsive.sections[0]!.blocks[0]!.responsive = {
        tablet: { style: { fontSizeCustom: "1.45rem", textTransform: "capitalize" } },
      } as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
      expect(validate(responsive)).toBe(true);

      // Unknown style key still rejects (additionalProperties:false).
      const unknownKey = buildDocument();
      unknownKey.sections[0]!.blocks[0]!.style = {
        fontSizeThing: "1rem",
      } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
      expect(validate(unknownKey)).toBe(false);

      // Unknown textTransform enum value rejects at the schema too.
      const badTransform = buildDocument();
      badTransform.sections[0]!.blocks[0]!.style = {
        textTransform: "rotate",
      } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
      expect(validate(badTransform)).toBe(false);
    }
  );

  test("TASK-532 fontSizeThing unknown style key throws PageDocumentError on write", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.style = {
      fontSizeThing: "1rem",
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    expect(() => normalizePageDocumentV2ForWrite(document)).toThrow();
    expect(isPageDocumentError(safeNormalizeError(document), "page_document_unknown_field")).toBe(
      true
    );
  });

  test("normalizes text marks with clamped ranges and same-type conflict removal", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.props = {
      text: "Hello world",
      level: "h1",
      align: "left",
      marks: [
        { type: "color", from: 0, to: 5, color: "#ef4444" },
        { type: "color", from: 3, to: 8, color: "#22c55e" },
        { type: "highlight", from: 0, to: 5, color: "var(--color-accent)" },
        { type: "bold", from: 0, to: 5 },
        { type: "italic", from: 1, to: 99 },
        { type: "link", from: 6, to: 99, href: "/safe" },
        { type: "color", from: 6, to: 99, color: "#0f172a" },
      ],
    };

    const normalized = normalizePageDocumentV2ForWrite(document);

    expect(normalized.sections[0]?.blocks[0]?.props.marks).toEqual([
      { type: "bold", from: 0, to: 5 },
      { type: "color", from: 0, to: 5, color: "#ef4444" },
      { type: "highlight", from: 0, to: 5, color: "var(--color-accent)" },
      { type: "italic", from: 1, to: 11 },
      { type: "link", from: 6, to: 11, href: "/safe" },
      { type: "color", from: 6, to: 11, color: "#0f172a" },
    ]);
  });

  test("text marks fail closed for unsafe shapes and stay base-only", () => {
    const badColor = buildDocument();
    badColor.sections[0]!.blocks[0]!.props = {
      text: "Hello world",
      level: "h1",
      align: "left",
      marks: [{ type: "color", from: 0, to: 5, color: "url(javascript:alert(1))" }],
    };
    expect(() => normalizePageDocumentV2ForWrite(badColor)).toThrow(
      "Invalid sections.0.blocks.0.props.marks.0.color."
    );

    const badLink = buildDocument();
    badLink.sections[0]!.blocks[0]!.props = {
      text: "Hello world",
      level: "h1",
      align: "left",
      marks: [{ type: "link", from: 0, to: 5, href: "javascript:alert(1)" }],
    };
    expect(() => normalizePageDocumentV2ForWrite(badLink)).toThrow(
      "Invalid sections.0.blocks.0.props.marks.0.href."
    );

    const responsiveMarks = buildDocument();
    responsiveMarks.sections[0]!.blocks[0]!.responsive = {
      mobile: {
        props: {
          marks: [{ type: "color", from: 0, to: 5, color: "#ef4444" }],
        },
      },
    };
    expect(() => normalizePageDocumentV2ForWrite(responsiveMarks)).toThrow(
      "Text marks are base-only at sections.0.blocks.0.responsive.mobile.props.marks."
    );

    expect(
      normalizeBlockTextMarks("Hello", [
        { type: "color", from: 0, to: 2, color: "#ef4444" },
        { type: "script", from: 2, to: 4, color: "#22c55e" },
        { type: "link", from: 2, to: 4, href: "javascript:alert(1)" },
        { type: "highlight", from: 2, to: 4, color: "var(--color-surface)" },
        { type: "color", from: 4, to: 5, color: "expression(alert(1))" },
      ])
    ).toEqual([
      { type: "color", from: 0, to: 2, color: "#ef4444" },
      { type: "highlight", from: 2, to: 4, color: "var(--color-surface)" },
    ]);
  });

  test("applyBlockTextMark replaces a different color over the same range and toggles an identical one (TASK-476-01)", () => {
    const text = "Build with Coderso";
    // Apply color A to a fragment.
    const blue = applyBlockTextMark(text, [], {
      type: "color",
      from: 11,
      to: 18,
      color: "#2563eb",
    });
    expect(blue).toEqual([{ type: "color", from: 11, to: 18, color: "#2563eb" }]);

    // Apply a DIFFERENT color over the same range -> replace in one call (not clear).
    const orange = applyBlockTextMark(text, blue, {
      type: "color",
      from: 11,
      to: 18,
      color: "#ea580c",
    });
    expect(orange).toEqual([{ type: "color", from: 11, to: 18, color: "#ea580c" }]);

    // Apply the SAME color over the same range -> toggle off.
    const cleared = applyBlockTextMark(text, orange, {
      type: "color",
      from: 11,
      to: 18,
      color: "#ea580c",
    });
    expect(cleared).toEqual([]);

    // Bold remains a pure toggle (value-less).
    const bold = applyBlockTextMark(text, [], { type: "bold", from: 0, to: 5 });
    expect(bold).toEqual([{ type: "bold", from: 0, to: 5 }]);
    expect(applyBlockTextMark(text, bold, { type: "bold", from: 0, to: 5 })).toEqual([]);

    // A different-type mark on the same range is retained alongside (no value-coupling).
    const colored = applyBlockTextMark(text, [], {
      type: "color",
      from: 0,
      to: 5,
      color: "#2563eb",
    });
    const withHighlight = applyBlockTextMark(text, colored, {
      type: "highlight",
      from: 0,
      to: 5,
      color: "var(--color-accent)",
    });
    expect(withHighlight).toEqual([
      { type: "color", from: 0, to: 5, color: "#2563eb" },
      { type: "highlight", from: 0, to: 5, color: "var(--color-accent)" },
    ]);
  });

  test("removeBlockTextMark strips only the link mark over the range and keeps other marks (TASK-478-02)", () => {
    const text = "Build with Coderso";
    // A linked + colored + bold fragment over the SAME range.
    const marks = [
      { type: "link" as const, from: 11, to: 18, href: "/old" },
      { type: "color" as const, from: 11, to: 18, color: "#2563eb" },
      { type: "bold" as const, from: 11, to: 18 },
    ];

    const unlinked = removeBlockTextMark(text, marks, { type: "link", from: 11, to: 18 });

    // The link mark is gone; color + bold are untouched (normalized order: bold,
    // then color).
    expect(unlinked).toEqual([
      { type: "bold", from: 11, to: 18 },
      { type: "color", from: 11, to: 18, color: "#2563eb" },
    ]);
    expect(unlinked.some((mark) => mark.type === "link")).toBe(false);
  });

  test("removeBlockTextMark splits a partially overlapping link and preserves the outside slices (TASK-478-02)", () => {
    const text = "abcdefghij"; // length 10
    const marks = [{ type: "link" as const, from: 0, to: 10, href: "/whole" }];

    // Remove the MIDDLE [3, 6): the two ends stay linked with the same href.
    const split = removeBlockTextMark(text, marks, { type: "link", from: 3, to: 6 });
    expect(split).toEqual([
      { type: "link", from: 0, to: 3, href: "/whole" },
      { type: "link", from: 6, to: 10, href: "/whole" },
    ]);

    // Removing a prefix slice [0, 4) keeps only the tail.
    expect(removeBlockTextMark(text, marks, { type: "link", from: 0, to: 4 })).toEqual([
      { type: "link", from: 4, to: 10, href: "/whole" },
    ]);
  });

  test("removeBlockTextMark is a no-op for a non-overlapping range or absent mark type (TASK-478-02)", () => {
    const text = "Build with Coderso";
    const marks = [{ type: "link" as const, from: 0, to: 5, href: "/x" }];

    // No overlap -> unchanged.
    expect(removeBlockTextMark(text, marks, { type: "link", from: 11, to: 18 })).toEqual([
      { type: "link", from: 0, to: 5, href: "/x" },
    ]);
    // Removing a type that is not present -> unchanged.
    expect(removeBlockTextMark(text, marks, { type: "bold", from: 0, to: 5 })).toEqual([
      { type: "link", from: 0, to: 5, href: "/x" },
    ]);
  });

  test("text mark compatibility helper and mark count stay bounded", () => {
    expect(
      normalizeBlockTextColorMarks("Hello", [
        { type: "color", from: 0, to: 2, color: "#ef4444" },
        { type: "bold", from: 0, to: 2 },
      ])
    ).toEqual([
      { type: "bold", from: 0, to: 2 },
      { type: "color", from: 0, to: 2, color: "#ef4444" },
    ]);

    const marks = normalizeBlockTextColorMarks(
      "abcdefghijklmnopqrstuvwxyz",
      Array.from({ length: PAGE_TEXT_MARK_MAX + 4 }, (_, index) => ({
        type: "color",
        from: index,
        to: index + 1,
        color: "#ef4444",
      }))
    );

    expect(marks).toHaveLength(PAGE_TEXT_MARK_MAX);
  });

  test(
    "JSON schema accepts typography tokens plus nulls and rejects unknown tokens",
    { timeout: AJV_COMPILE_TEST_TIMEOUT_MS },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);

      const valid = buildDocument();
      valid.sections[0]!.blocks[0]!.style = {
        fontFamily: "sans",
        fontSize: "2xs",
        fontWeight: "semibold",
        lineHeight: 1.4,
        letterSpacing: 0.5,
      };
      valid.sections[0]!.blocks[0]!.props = {
        text: "Schema marked",
        level: "h2",
        align: "left",
        marks: [
          { type: "color", from: 0, to: 6, color: "var(--color-primary)" },
          { type: "highlight", from: 0, to: 6, color: "#fef3c7" },
          { type: "bold", from: 0, to: 6 },
          { type: "italic", from: 1, to: 5 },
          { type: "link", from: 0, to: 6, href: "/safe" },
        ],
      };
      expect(validate(valid)).toBe(true);

      const cleared = buildDocument();
      cleared.sections[0]!.blocks[0]!.style = {
        fontFamily: null,
        fontSize: null,
        fontWeight: null,
        lineHeight: null,
        letterSpacing: null,
      };
      expect(validate(cleared)).toBe(true);

      const unknownToken = buildDocument();
      unknownToken.sections[0]!.blocks[0]!.style = {
        // TASK-532 (Bundle B): the weight enum grew to include "black" (900), so
        // the invalid-token fixture is re-baselined to a token that stays OUTSIDE
        // the 6-member enum, preserving the reject-unknown-token intent.
        fontWeight: "ultrablack",
      } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
      expect(validate(unknownToken)).toBe(false);

      const outOfClamp = buildDocument();
      outOfClamp.sections[0]!.blocks[0]!.style = {
        lineHeight: 9,
      };
      expect(validate(outOfClamp)).toBe(false);

      const responsiveTypography = buildDocument();
      responsiveTypography.sections[0]!.blocks[0]!.responsive = {
        tablet: { style: { fontSize: "sm" } },
      };
      expect(validate(responsiveTypography)).toBe(true);
    }
  );

  test("resolves responsive typography overrides through the desktop-first cascade", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.style = { fontSize: "lg", fontWeight: "bold" };
    document.sections[0]!.blocks[0]!.responsive = {
      mobile: { style: { fontSize: "sm" } },
    };

    const normalized = normalizePageDocumentV2ForWrite(document);
    const block = normalized.sections[0]!.blocks[0]!;
    expect(resolvePageBlockForBreakpoint(block, "desktop").style).toEqual({
      fontSize: "lg",
      fontWeight: "bold",
    });
    expect(resolvePageBlockForBreakpoint(block, "mobile").style).toEqual({
      fontSize: "sm",
      fontWeight: "bold",
    });
    expect(resolvePageBlockForBreakpoint(block, "tablet").style).toEqual({
      fontSize: "lg",
      fontWeight: "bold",
    });
  });
});
