import { describe, expect, test } from "vitest";

import Ajv from "ajv";

import {
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  clearResponsiveOverride,
  clearBlockResponsiveOverride,
  createPageBlockV2,
  createPageSectionV2,
  isPageDocumentError,
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
  toPublishedPageDocumentV2,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import { buildDocument, cloneDocument, createHeadingBlock } from "./page-document-v2-test-helpers";

describe("PageDocumentV2 tree and capabilities", () => {
  // Recursive Ajv compilation is intentionally bounded like the original suite.
  const AJV_COMPILE_TEST_TIMEOUT_MS = 30_000;

  test("normalizes owner-backed block prop enums and numeric controls", () => {
    expect(pageBlockWidths).toEqual(["auto", "full"]);
    expect(pageImageFits).toEqual(["cover", "contain"]);
    expect(pageGalleryLayouts).toEqual(["grid", "carousel", "masonry"]);
    expect(pageDividerTones).toEqual(["neutral", "muted", "accent"]);
    expect(pageColumnDistributions).toEqual(["equal", "auto"]);
    expect(pageGroupDirections).toEqual(["row", "column"]);
    // ── TASK-534 ── the switcher block adds six panel:N slots (its tab panels).
    expect(pageBlockSlotKeys).toEqual([
      "children",
      "column:1",
      "column:2",
      "column:3",
      "column:4",
      "panel:1",
      "panel:2",
      "panel:3",
      "panel:4",
      "panel:5",
      "panel:6",
    ]);

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
      createPageBlockV2("badge", {
        id: "blk_badge",
        props: {
          text: "  New  ",
          variant: "solid",
          size: "2xs",
          shape: "rounded",
          weight: "bold",
          background: "#ef4444",
          textColor: "#ffffff",
          icon: "check",
          iconPosition: "end",
        },
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
    expect(normalized.sections[0]?.blocks[6]?.props).toEqual({
      text: "New",
      variant: "solid",
      size: "2xs",
      shape: "rounded",
      weight: "bold",
      background: "#ef4444",
      textColor: "#ffffff",
      icon: "check",
      iconPosition: "end",
    });
  });

  test("badge block defaults and fail-closed props are native Page V2 props", () => {
    expect(pageBlockDefaultProps.badge).toEqual({
      text: "Badge",
      variant: "soft",
      size: "sm",
      shape: "pill",
      weight: "semibold",
      background: null,
      textColor: null,
      icon: null,
      iconPosition: "start",
    });
    expect(createPageBlockV2("badge").props).toEqual(pageBlockDefaultProps.badge);

    const document = buildDocument();
    document.sections[0]!.blocks = [
      {
        id: "blk_badge_unsafe",
        type: "badge",
        props: {
          text: "Unsafe",
          variant: "soft",
          size: "sm",
          shape: "pill",
          weight: "semibold",
          background: "url(javascript:alert(1))",
          textColor: "#ffffff",
          icon: "not-in-allowlist",
          iconPosition: "start",
        },
        visibility: { visible: true },
      },
    ];

    expect(() => normalizePageDocumentV2ForWrite(document)).toThrow(
      "Invalid sections.0.blocks.0.props.background."
    );

    const storedRead = normalizeStoredPageDocumentV2ForRead(document);
    expect(storedRead.sections[0]?.blocks[0]?.props).toMatchObject({
      background: null,
      textColor: "#ffffff",
      icon: null,
    });
  });

  test("form block props round-trip with schema-owned nullable formId (TASK-456)", () => {
    expect(pageBlockPropKeys.form).toEqual([
      "formId",
      "title",
      "textareaRows",
      "showSelectPrompt",
      "loadingLabel",
      "successBehavior",
    ]);
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
    // TASK-534: gallery is now editor-insertable (filter/layout controls shipped),
    // clearing its `gallery-editor-controls-pending` reason; still not assistant-
    // emittable (the assistant does not invent galleries).
    expect(pageBlockCapabilities.gallery).toMatchObject({
      editorInsertable: true,
      insertable: true,
      assistantEmittable: false,
      runtimeRenderer: "real",
    });
    expect("reason" in pageBlockCapabilities.gallery).toBe(false);
    expect(pageBlockCapabilities.columns).toMatchObject({
      editorInsertable: true,
      insertable: true,
      assistantEmittable: true,
      runtimeRenderer: "real",
      slots: ["column:1", "column:2", "column:3", "column:4"],
      publicDataBinding: "none",
    });
    expect("reason" in pageBlockCapabilities.columns).toBe(false);
    // TASK-521-04: the animated-icon block is real + author-insertable (renderer
    // case + palette + controls shipped) while staying outside the assistant
    // emission vocabulary (no decorative-motion invention by the assistant).
    expect(pageBlockCapabilities.icon).toMatchObject({
      editorInsertable: true,
      insertable: true,
      assistantEmittable: false,
      runtimeRenderer: "real",
    });
    expect("reason" in pageBlockCapabilities.icon).toBe(false);
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
