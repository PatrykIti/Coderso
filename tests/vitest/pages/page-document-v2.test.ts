import { describe, expect, test } from "vitest";
import Ajv from "ajv";

import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  clearResponsiveOverride,
  clearBlockResponsiveOverride,
  createDefaultPageDocumentV2,
  createPageBlockV2,
  createPageSectionV2,
  isPageDocumentError,
  isLegacyOrVersionlessPageDocument,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageBlockCapabilities,
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

const createHeadingBlock = (id: string, text = "Nested heading"): PageBlockV2 => ({
  id,
  type: "heading",
  props: { text, level: "h2", align: "left" },
  visibility: { visible: true },
});

describe("PageDocumentV2", () => {
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

  test("exposes a JSON schema that accepts v2 and rejects v1 blocks payloads", () => {
    const ajv = new Ajv({ allErrors: true, strict: true });
    const validate = ajv.compile(pageDocumentV2JsonSchema);

    expect(validate(buildDocument())).toBe(true);
    expect(validate({ blocks: [] })).toBe(false);
    expect(validate({ schemaVersion: 2, sections: [], extra: true })).toBe(false);
  });

  test("keeps JSON schema parity for strict block props, style, and responsive fields", () => {
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
    } as PageDocumentV2["sections"][number]["blocks"][number]["style"];
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
  });

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
    } as PageDocumentV2["sections"][number]["blocks"][number]["style"];
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

  test("JSON schema validates bounded recursive slots without permissive nested fields", () => {
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
  });

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
    expect(published).toEqual(buildDocument());
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
    expect(pageBlockCapabilities.collection).toMatchObject({
      editorInsertable: false,
      insertable: false,
      assistantEmittable: false,
      runtimeRenderer: "real",
      publicDataBinding: "scoped-read-only",
      reason: "collection-editor-controls-pending",
    });
    expect(pageBlockCapabilities.form).toMatchObject({
      runtimeRenderer: "real",
      publicDataBinding: "scoped-read-only",
      reason: "form-editor-controls-pending",
    });
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
