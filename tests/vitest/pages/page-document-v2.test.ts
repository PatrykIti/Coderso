import { describe, expect, test, vi } from "vitest";
import Ajv from "ajv";

import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  clearResponsiveOverride,
  clearBlockResponsiveOverride,
  createPageDocumentId,
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
  isPageDocumentError,
  isLegacyOrVersionlessPageDocument,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
  pageBlockDefaultProps,
  pageBlockPropKeys,
  pageBlockWidths,
  pageBlockSlotKeys,
  pageDividerTones,
  pageGalleryLayouts,
  pageGroupDirections,
  pageImageFits,
  pageBlockTypes,
  pageColumnDistributions,
  pageDocumentV2JsonSchema,
  resolvePageBlockForBreakpoint,
  resolvePageDocumentForBreakpoint,
  resolvePageSectionForBreakpoint,
  toPublishedPageDocumentV2,
  type PageBlockV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

const buildDocument = (): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {
    title: "Homepage",
    description: "Primary landing page",
    image: null,
  },
  settings: {
    template: "page-v2",
    showInNav: true,
    collectionLink: {
      contentTypeId: "projects",
      pageRole: "canonical-list-page",
      listingQueryId: "featured",
      listingTemplateId: null,
    },
  },
  sections: [
    {
      id: "sec_hero",
      type: "hero",
      name: "Hero",
      variant: "split",
      layout: {
        columns: 2,
        align: "center",
        justify: "between",
        maxWidth: 1080,
      },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "sm",
      },
      spacing: {
        paddingTop: 72,
        paddingBottom: 72,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 32,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: "hero",
        startsAt: null,
        endsAt: null,
      },
      responsive: {
        tablet: {
          layout: { columns: 1 },
          spacing: { gap: 20 },
        },
        mobile: {
          layout: { columns: 1 },
          spacing: { paddingLeft: 20, paddingRight: 20 },
          visibility: { visible: false },
        },
      },
      blocks: [
        {
          id: "blk_heading",
          type: "heading",
          props: {
            text: "Build with Coderso",
            level: "h1",
            align: "left",
          },
          visibility: { visible: true },
        },
        {
          id: "blk_cta",
          type: "button",
          props: {
            label: "See projects",
            href: "/projects",
            target: "self",
            variant: "primary",
            size: "md",
          },
          visibility: { visible: true },
        },
      ],
    },
  ],
});

const cloneDocument = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const safeNormalizeError = (value: unknown): unknown => {
  try {
    normalizePageDocumentV2ForWrite(value);
    return null;
  } catch (error) {
    return error;
  }
};

const createHeadingBlock = (id: string, text = "Nested heading"): PageBlockV2 => ({
  id,
  type: "heading",
  props: { text, level: "h2", align: "left" },
  visibility: { visible: true },
});

const withGlobalCrypto = <T>(cryptoValue: Crypto | undefined, run: () => T): T => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    value: cryptoValue,
    configurable: true,
  });
  try {
    return run();
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "crypto", descriptor);
    } else {
      Reflect.deleteProperty(globalThis, "crypto");
    }
  }
};

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
      opacity: 2,
      radius: 99,
      shadow: "lg",
      borderColor: " #e2e8f0 ",
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
      opacity: 1,
      radius: 64,
      shadow: "lg",
      borderColor: "#e2e8f0",
      padding: { top: 12, right: 160, bottom: 0, left: 4 },
      margin: { top: 8 },
    });
  });

  test("normalizes token-backed typography style fields with clamps and explicit nulls", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.style = {
      fontFamily: "display",
      fontSize: "2xl",
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
      fontSize: "2xl",
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

  test(
    "JSON schema accepts typography tokens plus nulls and rejects unknown tokens",
    { timeout: AJV_COMPILE_TEST_TIMEOUT_MS },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);

      const valid = buildDocument();
      valid.sections[0]!.blocks[0]!.style = {
        fontFamily: "sans",
        fontSize: "lg",
        fontWeight: "semibold",
        lineHeight: 1.4,
        letterSpacing: 0.5,
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
        fontWeight: "black",
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

  test("normalizes owner-backed block prop enums and numeric controls", () => {
    expect(pageBlockWidths).toEqual(["auto", "full"]);
    expect(pageImageFits).toEqual(["cover", "contain"]);
    expect(pageGalleryLayouts).toEqual(["grid", "carousel", "masonry"]);
    expect(pageDividerTones).toEqual(["neutral", "muted", "accent"]);
    expect(pageColumnDistributions).toEqual(["equal", "auto"]);
    expect(pageGroupDirections).toEqual(["row", "column"]);
    expect(pageBlockSlotKeys).toEqual(["children", "column:1", "column:2", "column:3", "column:4"]);

    const document = buildDocument();
    document.sections[0]!.blocks = [
      createPageBlockV2("image", {
        id: "blk_image",
        props: { src: "/hero.jpg", alt: "Hero", caption: "Hero caption", fit: "contain" },
      }),
      createPageBlockV2("gallery", {
        id: "blk_gallery",
        props: { items: [], layout: "carousel" },
      }),
      createPageBlockV2("divider", {
        id: "blk_divider",
        props: { tone: "accent", thickness: 99 },
      }),
      createPageBlockV2("spacer", {
        id: "blk_spacer",
        props: { size: -10 },
      }),
      createPageBlockV2("columns", {
        id: "blk_columns",
        props: { count: 99, gap: 999, distribution: "auto" },
      }),
      createPageBlockV2("group", {
        id: "blk_group",
        props: { direction: "row", wrap: true, gap: -5 },
      }),
    ];

    const normalized = normalizePageDocumentV2ForWrite(document);

    expect(normalized.sections[0]?.blocks[0]?.props).toMatchObject({ fit: "contain" });
    expect(normalized.sections[0]?.blocks[1]?.props).toMatchObject({ layout: "carousel" });
    expect(normalized.sections[0]?.blocks[2]?.props).toMatchObject({
      tone: "accent",
      thickness: 16,
    });
    expect(normalized.sections[0]?.blocks[3]?.props).toMatchObject({ size: 0 });
    expect(normalized.sections[0]?.blocks[4]?.props).toMatchObject({
      count: 4,
      gap: 120,
      distribution: "auto",
    });
    expect(normalized.sections[0]?.blocks[5]?.props).toMatchObject({
      direction: "row",
      wrap: true,
      gap: 0,
    });
  });

  test("form block props round-trip with schema-owned nullable formId (TASK-456)", () => {
    expect(pageBlockPropKeys.form).toEqual(["formId", "title"]);
    expect(pageBlockDefaultProps.form).toEqual({ formId: null, title: "" });
    // Palette default: a fresh form block starts unselected (formId null).
    expect(createPageBlockV2("form").props).toEqual({ formId: null, title: "" });

    const document = buildDocument();
    document.sections[0]!.blocks = [
      createPageBlockV2("form", {
        id: "blk_form_picked",
        props: { formId: "  form-contact  ", title: "  Contact us  " },
      }),
      createPageBlockV2("form", {
        id: "blk_form_cleared",
        props: { formId: null, title: "" },
      }),
    ];
    const written = normalizePageDocumentV2ForWrite(document);
    expect(written.sections[0]?.blocks[0]?.props).toEqual({
      formId: "form-contact",
      title: "Contact us",
    });
    expect(written.sections[0]?.blocks[1]?.props).toEqual({ formId: null, title: "" });

    // Stored read keeps the same values non-destructively.
    const read = normalizeStoredPageDocumentV2ForRead(written);
    expect(read.sections[0]?.blocks[0]?.props).toEqual({
      formId: "form-contact",
      title: "Contact us",
    });

    // Unknown form prop keys stay rejected on fresh writes.
    const unknownProp = buildDocument();
    unknownProp.sections[0]!.blocks = [
      {
        ...createPageBlockV2("form"),
        props: { formId: null, title: "", submitLabel: "Send" },
      },
    ];
    expect(() => normalizePageDocumentV2ForWrite(unknownProp)).toThrow(
      "Unknown page document field: sections.0.blocks.0.props.submitLabel"
    );
  });

  test("normalizes bounded recursive layout block slots", () => {
    const document = buildDocument();
    document.sections[0]!.blocks = [
      {
        id: "blk_container",
        type: "container",
        props: {},
        visibility: { visible: true },
        slots: {
          children: [
            {
              id: "blk_columns",
              type: "columns",
              props: { count: 3, gap: 32, distribution: "equal" },
              visibility: { visible: true },
              slots: {
                "column:1": [
                  {
                    ...createHeadingBlock("blk_nested_heading", "Desktop nested"),
                    responsive: {
                      mobile: { props: { text: "Mobile nested" } },
                    },
                  },
                ],
                "column:2": [],
                "column:3": [
                  {
                    id: "blk_group",
                    type: "group",
                    props: { direction: "row", wrap: true, gap: 12 },
                    visibility: { visible: true },
                    slots: {
                      children: [
                        {
                          id: "blk_nested_text",
                          type: "text",
                          props: { text: "Nested body", format: "plain", align: "left" },
                          visibility: { visible: true },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ];

    const normalized = normalizePageDocumentV2ForWrite(document);
    const container = normalized.sections[0]?.blocks[0];
    const columns = container?.slots?.children?.[0];
    const group = columns?.slots?.["column:3"]?.[0];

    expect(PAGE_BLOCK_MAX_TREE_DEPTH).toBe(4);
    expect(PAGE_BLOCK_MAX_CHILDREN_PER_SLOT).toBe(24);
    expect(container).toMatchObject({
      id: "blk_container",
      type: "container",
      props: {},
    });
    expect(columns).toMatchObject({
      id: "blk_columns",
      type: "columns",
      props: { count: 3, gap: 32, distribution: "equal" },
    });
    expect(columns?.slots?.["column:2"]).toEqual([]);
    expect(columns?.slots?.["column:1"]?.[0]?.responsive?.mobile?.props).toEqual({
      text: "Mobile nested",
    });
    expect(group).toMatchObject({
      id: "blk_group",
      type: "group",
      props: { direction: "row", wrap: true, gap: 12 },
    });
    expect(group?.slots?.children?.[0]?.props).toMatchObject({ text: "Nested body" });
  });

  test("rejects invalid recursive slot writes", () => {
    const withBlock = (block: unknown) => ({
      ...buildDocument(),
      sections: [{ ...buildDocument().sections[0]!, blocks: [block] }],
    });

    expect(() =>
      normalizePageDocumentV2ForWrite(
        withBlock({
          ...createHeadingBlock("blk_atom_slots"),
          slots: { children: [createHeadingBlock("blk_child")] },
        })
      )
    ).toThrow("does not support slots");

    expect(() =>
      normalizePageDocumentV2ForWrite(
        withBlock({
          id: "blk_container_unknown",
          type: "container",
          props: {},
          visibility: { visible: true },
          slots: { header: [createHeadingBlock("blk_header")] },
        })
      )
    ).toThrow("Unknown page document field: sections.0.blocks.0.slots.header");

    const tooDeep = {
      id: "blk_depth_1",
      type: "container",
      props: {},
      visibility: { visible: true },
      slots: {
        children: [
          {
            id: "blk_depth_2",
            type: "container",
            props: {},
            visibility: { visible: true },
            slots: {
              children: [
                {
                  id: "blk_depth_3",
                  type: "container",
                  props: {},
                  visibility: { visible: true },
                  slots: {
                    children: [
                      {
                        id: "blk_depth_4",
                        type: "container",
                        props: {},
                        visibility: { visible: true },
                        slots: { children: [createHeadingBlock("blk_depth_5")] },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    };
    expect(() => normalizePageDocumentV2ForWrite(withBlock(tooDeep))).toThrow(
      "Page block slots exceed the maximum nesting depth."
    );

    expect(() =>
      normalizePageDocumentV2ForWrite(
        withBlock({
          id: "blk_overflow",
          type: "container",
          props: {},
          visibility: { visible: true },
          slots: {
            children: Array.from({ length: PAGE_BLOCK_MAX_CHILDREN_PER_SLOT + 1 }, (_, index) =>
              createHeadingBlock(`blk_child_${index}`)
            ),
          },
        })
      )
    ).toThrow(`exceeds ${PAGE_BLOCK_MAX_CHILDREN_PER_SLOT} children`);

    expect(() =>
      normalizePageDocumentV2ForWrite(
        withBlock({
          id: "blk_duplicate",
          type: "container",
          props: {},
          visibility: { visible: true },
          slots: { children: [createHeadingBlock("blk_duplicate")] },
        })
      )
    ).toThrow("Duplicate page block id: blk_duplicate.");

    const cyclicBlock: Record<string, unknown> = {
      id: "blk_cycle",
      type: "container",
      props: {},
      visibility: { visible: true },
    };
    cyclicBlock.slots = { children: [cyclicBlock] };
    expect(() => normalizePageDocumentV2ForWrite(withBlock(cyclicBlock))).toThrow(
      "Page block tree contains a cycle."
    );
  });

  test("stored reads prune malformed slots without resetting valid recursive data", () => {
    const stored = buildDocument();
    stored.sections[0]!.blocks = [
      {
        id: "blk_container",
        type: "container",
        props: {},
        visibility: { visible: true },
        slots: {
          children: Array.from({ length: PAGE_BLOCK_MAX_CHILDREN_PER_SLOT + 1 }, (_, index) => {
            if (index === 1) return createHeadingBlock("blk_child_0", "Duplicate child");
            if (index === 2) {
              return {
                ...createHeadingBlock("blk_atom_slots", "Atom slots"),
                slots: { children: [createHeadingBlock("blk_dropped_atom_child")] },
              };
            }
            return createHeadingBlock(`blk_child_${index}`, `Child ${index}`);
          }),
        },
      },
      {
        id: "blk_depth_1",
        type: "container",
        props: {},
        visibility: { visible: true },
        slots: {
          children: [
            {
              id: "blk_depth_2",
              type: "container",
              props: {},
              visibility: { visible: true },
              slots: {
                children: [
                  {
                    id: "blk_depth_3",
                    type: "container",
                    props: {},
                    visibility: { visible: true },
                    slots: {
                      children: [
                        {
                          id: "blk_depth_4",
                          type: "container",
                          props: {},
                          visibility: { visible: true },
                          slots: { children: [createHeadingBlock("blk_over_depth")] },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ];

    const normalized = normalizeStoredPageDocumentV2ForRead(stored);
    const clippedChildren = normalized.sections[0]?.blocks[0]?.slots?.children ?? [];
    const depthFour =
      normalized.sections[0]?.blocks[1]?.slots?.children?.[0]?.slots?.children?.[0]?.slots
        ?.children?.[0];

    expect(clippedChildren).toHaveLength(PAGE_BLOCK_MAX_CHILDREN_PER_SLOT);
    expect(clippedChildren[0]?.id).toBe("blk_child_0");
    expect(clippedChildren[1]?.id).toBe("blk_child_0_2");
    expect(clippedChildren.some((block) => block.id === "blk_child_24")).toBe(false);
    expect(clippedChildren[2]?.slots).toBeUndefined();
    expect(depthFour).toMatchObject({ id: "blk_depth_4", type: "container" });
    expect(depthFour?.slots).toBeUndefined();
  });

  test(
    "JSON schema validates bounded recursive slots without permissive nested fields",
    {
      timeout: AJV_COMPILE_TEST_TIMEOUT_MS,
    },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);
      const document = buildDocument();
      document.sections[0]!.blocks = [
        {
          id: "blk_container",
          type: "container",
          props: {},
          visibility: { visible: true },
          slots: {
            children: [
              {
                id: "blk_columns",
                type: "columns",
                props: { count: 2, gap: 24, distribution: "equal" },
                visibility: { visible: true },
                slots: {
                  "column:1": [createHeadingBlock("blk_nested_heading")],
                  "column:2": [],
                },
              },
            ],
          },
        },
      ];

      expect(validate(document)).toBe(true);

      const unknownSlot = cloneDocument(document);
      unknownSlot.sections[0]!.blocks[0]!.slots = {
        ...unknownSlot.sections[0]!.blocks[0]!.slots,
        header: [createHeadingBlock("blk_header")],
      } as PageDocumentV2["sections"][number]["blocks"][number]["slots"];
      expect(validate(unknownSlot)).toBe(false);

      const slotsOnAtom = cloneDocument(document);
      slotsOnAtom.sections[0]!.blocks[0]!.slots!.children![0]!.slots!["column:1"]![0] = {
        ...createHeadingBlock("blk_atom_slots"),
        slots: { children: [createHeadingBlock("blk_atom_child")] },
      } as PageDocumentV2["sections"][number]["blocks"][number];
      expect(validate(slotsOnAtom)).toBe(false);

      const nestedUnknown = cloneDocument(document);
      nestedUnknown.sections[0]!.blocks[0]!.slots!.children![0]!.slots!["column:1"]![0] = {
        ...createHeadingBlock("blk_unknown_nested"),
        debug: true,
      } as PageDocumentV2["sections"][number]["blocks"][number];
      expect(validate(nestedUnknown)).toBe(false);

      const tooManyChildren = cloneDocument(document);
      tooManyChildren.sections[0]!.blocks[0]!.slots!.children = Array.from(
        { length: PAGE_BLOCK_MAX_CHILDREN_PER_SLOT + 1 },
        (_, index) => createHeadingBlock(`blk_many_${index}`)
      ) as PageDocumentV2["sections"][number]["blocks"];
      expect(validate(tooManyChildren)).toBe(false);

      const tooDeep = cloneDocument(document);
      tooDeep.sections[0]!.blocks = [
        {
          id: "blk_depth_1",
          type: "container",
          props: {},
          visibility: { visible: true },
          slots: {
            children: [
              {
                id: "blk_depth_2",
                type: "container",
                props: {},
                visibility: { visible: true },
                slots: {
                  children: [
                    {
                      id: "blk_depth_3",
                      type: "container",
                      props: {},
                      visibility: { visible: true },
                      slots: {
                        children: [
                          {
                            id: "blk_depth_4",
                            type: "container",
                            props: {},
                            visibility: { visible: true },
                            slots: { children: [createHeadingBlock("blk_depth_5")] },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ];
      expect(validate(tooDeep)).toBe(false);
    }
  );

  test("resolves sparse block responsive overrides without changing desktop base", () => {
    const document = buildDocument();
    document.sections[0]!.blocks[0]!.responsive = {
      mobile: {
        props: { text: "Mobile heading" },
        style: { align: "center", padding: { top: 8 } },
        visibility: { visible: false },
      },
    };
    const normalized = normalizePageDocumentV2ForWrite(document);
    const block = normalized.sections[0]!.blocks[0]!;

    expect(block.responsive?.mobile?.props).toEqual({ text: "Mobile heading" });

    const desktop = resolvePageBlockForBreakpoint(block, "desktop");
    const mobile = resolvePageBlockForBreakpoint(block, "mobile");
    const mobileDocument = resolvePageDocumentForBreakpoint(normalized, "mobile");

    expect(desktop.props).toMatchObject({ text: "Build with Coderso", level: "h1" });
    expect(desktop.visibility.visible).toBe(true);
    expect(mobile.props).toMatchObject({ text: "Mobile heading", level: "h1" });
    expect(mobile.style).toEqual({ align: "center", padding: { top: 8 } });
    expect(mobile.visibility.visible).toBe(false);
    expect(mobileDocument.sections[0]?.blocks[0]?.props.text).toBe("Mobile heading");
  });

  test("resolves nested slot block responsive overrides recursively", () => {
    const document = buildDocument();
    document.sections[0]!.blocks = [
      createPageBlockV2("columns", {
        id: "blk_nested_columns",
        props: { count: 2, gap: 24, distribution: "equal" },
        slots: {
          "column:1": [
            createPageBlockV2("heading", {
              id: "blk_nested_heading",
              props: { text: "Desktop nested", level: "h2", align: "left" },
              responsive: {
                mobile: {
                  props: { text: "Mobile nested" },
                  visibility: { visible: false },
                },
              },
            }),
          ],
        },
      }),
    ];
    const normalized = normalizePageDocumentV2ForWrite(document);
    const desktop = resolvePageDocumentForBreakpoint(normalized, "desktop");
    const mobile = resolvePageDocumentForBreakpoint(normalized, "mobile");

    expect(desktop.sections[0]?.blocks[0]?.slots?.["column:1"]?.[0]?.props.text).toBe(
      "Desktop nested"
    );
    expect(desktop.sections[0]?.blocks[0]?.slots?.["column:1"]?.[0]?.visibility.visible).toBe(true);
    expect(mobile.sections[0]?.blocks[0]?.slots?.["column:1"]?.[0]?.props.text).toBe(
      "Mobile nested"
    );
    expect(mobile.sections[0]?.blocks[0]?.slots?.["column:1"]?.[0]?.visibility.visible).toBe(false);
  });

  test("clears responsive overrides and prunes empty breakpoint records", () => {
    const section = buildDocument().sections[0]!;

    const withoutGap = clearResponsiveOverride(section, "tablet", ["spacing", "gap"]);
    expect(withoutGap.responsive.tablet?.spacing).toBeUndefined();
    expect(withoutGap.responsive.tablet?.layout?.columns).toBe(1);

    const withoutColumns = clearResponsiveOverride(withoutGap, "tablet", ["layout", "columns"]);
    expect(withoutColumns.responsive.tablet).toBeUndefined();

    const block = createPageBlockV2("heading", {
      id: "blk-responsive",
      props: { text: "Heading", level: "h2", align: "left" },
      responsive: {
        mobile: {
          props: { text: "Mobile heading" },
          style: { padding: { top: 12, bottom: 16 } },
        },
      },
    });
    const withoutText = clearBlockResponsiveOverride(block, "mobile", ["props", "text"]);
    expect(withoutText.responsive?.mobile?.props).toBeUndefined();
    expect(withoutText.responsive?.mobile?.style).toEqual({
      padding: { top: 12, bottom: 16 },
    });

    const withoutPaddingTop = clearBlockResponsiveOverride(withoutText, "mobile", [
      "style",
      "padding",
      "top",
    ]);
    expect(withoutPaddingTop.responsive?.mobile?.style).toEqual({
      padding: { bottom: 16 },
    });

    const withoutPaddingBottom = clearBlockResponsiveOverride(withoutPaddingTop, "mobile", [
      "style",
      "padding",
      "bottom",
    ]);
    expect(withoutPaddingBottom.responsive).toBeUndefined();
  });

  test("creates atomic section defaults and strips editor fields from published data", () => {
    const section = createPageSectionV2("hero", {
      id: "sec_created",
      blocks: [
        {
          id: "blk_text",
          type: "text",
          props: { text: "Body copy", format: "plain", align: "left" },
          visibility: { visible: true },
        },
      ],
    });
    expect(section).toMatchObject({
      id: "sec_created",
      type: "hero",
      name: "Hero",
      layout: { maxWidth: 1080 },
    });

    const published = toPublishedPageDocumentV2({
      ...buildDocument(),
      editor: { selectedSectionId: "sec_hero" },
    });
    // Full normalization carries the explicit stackVertical default (TASK-425).
    const expected = cloneDocument(buildDocument());
    expected.sections[0]!.layout.stackVertical = false;
    expect(published).toEqual(expected);
  });

  test("exposes block capability metadata for every block type", () => {
    expect(Object.keys(pageBlockCapabilities).sort()).toEqual([...pageBlockTypes].sort());
    for (const type of pageBlockTypes) {
      const capability = pageBlockCapabilities[type];
      if (capability.editorInsertable || capability.insertable || capability.assistantEmittable) {
        expect(capability.runtimeRenderer).toBe("real");
      }
      if (!capability.insertable) {
        expect(capability.reason).toBeTruthy();
      }
    }
    expect(pageBlockCapabilities.heading).toMatchObject({
      editorInsertable: true,
      insertable: true,
      assistantEmittable: true,
      runtimeRenderer: "real",
      slots: [],
    });
    expect(pageBlockCapabilities.gallery).toMatchObject({
      editorInsertable: false,
      insertable: false,
      assistantEmittable: false,
      runtimeRenderer: "real",
      reason: "gallery-editor-controls-pending",
    });
    expect(pageBlockCapabilities.columns).toMatchObject({
      editorInsertable: true,
      insertable: true,
      assistantEmittable: true,
      runtimeRenderer: "real",
      slots: ["column:1", "column:2", "column:3", "column:4"],
      publicDataBinding: "none",
    });
    expect("reason" in pageBlockCapabilities.columns).toBe(false);
    expect(pageBlockCapabilities.icon.reason).toBe("icon-runtime-renderer-pending");
    // TASK-457: the collection block is author-insertable (controls shipped)
    // while staying outside the assistant emission vocabulary.
    expect(pageBlockCapabilities.collection).toMatchObject({
      editorInsertable: true,
      insertable: true,
      assistantEmittable: false,
      runtimeRenderer: "real",
      publicDataBinding: "scoped-read-only",
    });
    expect("reason" in pageBlockCapabilities.collection).toBe(false);
    // TASK-456: the form block is author-insertable (controls shipped) while
    // staying outside the assistant emission vocabulary.
    expect(pageBlockCapabilities.form).toMatchObject({
      editorInsertable: true,
      insertable: true,
      assistantEmittable: false,
      runtimeRenderer: "real",
      publicDataBinding: "scoped-read-only",
    });
    expect("reason" in pageBlockCapabilities.form).toBe(false);
    expect(pageBlockCapabilities.embed).toMatchObject({
      runtimeRenderer: "real",
      publicDataBinding: "scoped-read-only",
      reason: "embed-editor-controls-pending",
    });
    expect(createPageBlockV2("heading").props).toMatchObject({ text: "Heading", level: "h2" });
  });

  test("exposes machine-readable document errors", () => {
    try {
      normalizePageDocumentV2ForWrite({ schemaVersion: 2, sections: [], extra: true });
    } catch (error) {
      expect(isPageDocumentError(error, "page_document_unknown_field")).toBe(true);
      expect(error).toMatchObject({ path: "extra" });
    }
  });
});

// --- Section column placement (style.column, owner finding #5 round 3) ---

test("normalizes section column placement with integer clamps and an explicit null round-trip", () => {
  const document = buildDocument();
  document.sections[0]!.blocks[0]!.style = { column: 2 };
  document.sections[0]!.blocks[1]!.style = {
    ...(document.sections[0]!.blocks[1]!.style ?? {}),
    column: null,
  };

  const normalized = normalizePageDocumentV2ForWrite(document);
  expect(normalized.sections[0]?.blocks[0]?.style).toEqual({ column: 2 });
  // Explicit null is the stored "legacy auto-flow" value and round-trips.
  expect(normalized.sections[0]?.blocks[1]?.style?.column).toBeNull();
  const reread = normalizeStoredPageDocumentV2ForRead(normalized);
  expect(reread.sections[0]?.blocks[0]?.style?.column).toBe(2);
  expect(reread.sections[0]?.blocks[1]?.style?.column).toBeNull();

  // Out-of-range and fractional values clamp into integer 1..4.
  const clamped = buildDocument();
  clamped.sections[0]!.blocks[0]!.style = { column: 9 };
  clamped.sections[0]!.blocks[1]!.style = { column: 2.9 };
  const normalizedClamped = normalizePageDocumentV2ForWrite(clamped);
  expect(normalizedClamped.sections[0]?.blocks[0]?.style?.column).toBe(4);
  expect(normalizedClamped.sections[0]?.blocks[1]?.style?.column).toBe(2);
  const floor = buildDocument();
  floor.sections[0]!.blocks[0]!.style = { column: 0 };
  expect(normalizePageDocumentV2ForWrite(floor).sections[0]?.blocks[0]?.style?.column).toBe(1);

  // Non-numeric values reject on writes and null out on stored reads.
  const invalid = buildDocument();
  invalid.sections[0]!.blocks[0]!.style = {
    column: "two",
  } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
  expect(() => normalizePageDocumentV2ForWrite(invalid)).toThrow(
    "Invalid sections.0.blocks.0.style.column."
  );
  expect(
    normalizeStoredPageDocumentV2ForRead(invalid).sections[0]?.blocks[0]?.style?.column
  ).toBeNull();

  // Legacy parity: documents without the field never gain it on either path.
  const legacy = buildDocument();
  for (const normalizedLegacy of [
    normalizePageDocumentV2ForWrite(legacy),
    normalizeStoredPageDocumentV2ForRead(legacy),
  ]) {
    expect(normalizedLegacy.sections[0]?.blocks[0]?.style).toBeUndefined();
    expect(normalizedLegacy.sections[0]?.blocks[1]?.style ?? {}).not.toHaveProperty("column");
  }
});

test("section column placement rides responsive style overrides in the editor model", () => {
  const document = buildDocument();
  document.sections[0]!.blocks[0]!.style = { column: 1 };
  document.sections[0]!.blocks[0]!.responsive = { tablet: { style: { column: 2 } } };
  const normalized = normalizePageDocumentV2ForWrite(document);

  const block = normalized.sections[0]!.blocks[0]!;
  expect(resolvePageBlockForBreakpoint(block, "desktop").style?.column).toBe(1);
  expect(resolvePageBlockForBreakpoint(block, "tablet").style?.column).toBe(2);
  // Mobile inherits the DESKTOP base (standard cascade), not tablet.
  expect(resolvePageBlockForBreakpoint(block, "mobile").style?.column).toBe(1);
});

test(
  "JSON schema accepts section column placement plus null and rejects out-of-range values",
  { timeout: 30_000 },
  () => {
    const ajv = new Ajv({ allErrors: true, strict: true });
    const validate = ajv.compile(pageDocumentV2JsonSchema);

    const valid = buildDocument();
    valid.sections[0]!.blocks[0]!.style = { column: 2 };
    valid.sections[0]!.blocks[1]!.style = { column: null };
    expect(validate(valid)).toBe(true);

    const responsiveColumn = buildDocument();
    responsiveColumn.sections[0]!.blocks[0]!.responsive = { tablet: { style: { column: 2 } } };
    expect(validate(responsiveColumn)).toBe(true);

    const outOfRange = buildDocument();
    outOfRange.sections[0]!.blocks[0]!.style = { column: 9 };
    expect(validate(outOfRange)).toBe(false);

    const wrongType = buildDocument();
    wrongType.sections[0]!.blocks[0]!.style = {
      column: "two",
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    expect(validate(wrongType)).toBe(false);
  }
);

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
