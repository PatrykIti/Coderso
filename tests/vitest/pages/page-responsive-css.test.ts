import { describe, expect, test } from "vitest";

import {
  PAGE_BLOCK_ELEMENT_ATTRIBUTE,
  PAGE_BLOCK_ID_ATTRIBUTE,
  PAGE_BLOCK_TEXT_ATTRIBUTE,
  PAGE_SECTION_CONTENT_ATTRIBUTE,
  PAGE_SECTION_ID_ATTRIBUTE,
  buildPageResponsiveCss,
  buildPageResponsiveCssPlan,
  pageBlockVisualElementTypes,
  pageResponsiveCssBreakpoints,
  pageResponsiveMediaBounds,
  pageResponsiveMediaQueries,
} from "../../../core/services/pages/pageResponsiveCss";
import {
  normalizePageDocumentV2ForWrite,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

const buildSection = (overrides: Partial<PageSectionV2> = {}): PageSectionV2 => ({
  id: "sec_hero",
  type: "hero",
  name: "Hero",
  variant: "default",
  layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
  style: {
    background: "#ffffff",
    backgroundType: "color",
    backgroundImage: null,
    accent: "#0d9488",
    radius: 0,
    shadow: "none",
  },
  spacing: { paddingTop: 64, paddingBottom: 64, paddingLeft: 40, paddingRight: 40, gap: 24 },
  visibility: { visible: true, authOnly: false, anchor: null, startsAt: null, endsAt: null },
  responsive: {},
  blocks: [],
  ...overrides,
});

const buildBlock = (overrides: Partial<PageBlockV2> = {}): PageBlockV2 => ({
  id: "blk_text",
  type: "text",
  props: { text: "Copy", format: "plain", align: "left" },
  visibility: { visible: true },
  ...overrides,
});

const buildDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: 2,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});

describe("pageResponsiveCss contract constants", () => {
  test("exposes the renderer attribute hooks and owned media bounds", () => {
    expect(PAGE_SECTION_ID_ATTRIBUTE).toBe("data-section-id");
    expect(PAGE_BLOCK_ID_ATTRIBUTE).toBe("data-block-id");
    expect(PAGE_SECTION_CONTENT_ATTRIBUTE).toBe("data-page-section-content");
    expect(PAGE_BLOCK_ELEMENT_ATTRIBUTE).toBe("data-page-block-element");
    expect(PAGE_BLOCK_TEXT_ATTRIBUTE).toBe("data-page-block-text");
    expect(pageBlockVisualElementTypes).toEqual(["button", "image"]);
    expect(pageResponsiveCssBreakpoints).toEqual(["tablet", "mobile"]);
    expect(pageResponsiveMediaBounds).toEqual({
      tablet: { minWidth: 640, maxWidth: 1023 },
      mobile: { maxWidth: 639 },
    });
    expect(pageResponsiveMediaQueries.tablet).toBe("(min-width: 640px) and (max-width: 1023px)");
    expect(pageResponsiveMediaQueries.mobile).toBe("(max-width: 639px)");
  });
});

describe("buildPageResponsiveCss", () => {
  test("audit scenario: tablet maxWidth=640 + mobile maxWidth=360 emit snapshot-stable scoped rules", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: {
            tablet: { layout: { maxWidth: 640 } },
            mobile: { layout: { maxWidth: 360 } },
          },
        }),
      ])
    );

    expect(buildPageResponsiveCss(document)).toBe(
      [
        "@media (min-width: 640px) and (max-width: 1023px){",
        '[data-section-id="sec_hero"] > [data-page-section-content="true"]{max-width:640px !important}',
        "}",
        "@media (max-width: 639px){",
        '[data-section-id="sec_hero"] > [data-page-section-content="true"]{max-width:360px !important}',
        "}",
      ].join("\n")
    );
  });

  test("tablet rules are range-bounded so mobile keeps inheriting the desktop base", () => {
    const document = buildDocument([
      buildSection({ responsive: { tablet: { layout: { maxWidth: 640 } } } }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain("@media (min-width: 640px) and (max-width: 1023px){");
    expect(css).not.toContain("@media (max-width: 639px)");
  });

  test("documents without overrides emit an empty string and no empty @media shells", () => {
    expect(buildPageResponsiveCss(buildDocument([]))).toBe("");
    expect(buildPageResponsiveCss(buildDocument([buildSection()]))).toBe("");
    expect(
      buildPageResponsiveCss(buildDocument([buildSection({ responsive: { tablet: {} } })]))
    ).toBe("");
  });

  test("is deterministic for the same input", () => {
    const make = () =>
      buildDocument([
        buildSection({
          responsive: {
            mobile: {
              layout: { maxWidth: 360, align: "center" },
              spacing: { gap: 12, paddingTop: 24 },
            },
          },
          blocks: [
            buildBlock({
              responsive: { mobile: { style: { align: "center", width: "full" } } },
            }),
          ],
        }),
      ]);
    const first = buildPageResponsiveCss(make());
    const second = buildPageResponsiveCss(make());
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });

  test("orders rules by section/block document order and declarations by property", () => {
    const document = buildDocument([
      buildSection({
        id: "sec_b",
        responsive: { mobile: { spacing: { paddingTop: 8 } } },
        blocks: [
          buildBlock({ id: "blk_2", responsive: { mobile: { style: { width: "full" } } } }),
          buildBlock({ id: "blk_1", responsive: { mobile: { style: { width: "auto" } } } }),
        ],
      }),
      buildSection({ id: "sec_a", responsive: { mobile: { spacing: { gap: 4 } } } }),
    ]);
    const css = buildPageResponsiveCss(document);
    const order = ["sec_b", "blk_2", "blk_1", "sec_a"].map((id) => css.indexOf(`"${id}"`));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    const declOrder = buildPageResponsiveCss(
      buildDocument([
        buildSection({
          responsive: { mobile: { spacing: { gap: 4, paddingTop: 8 }, layout: { maxWidth: 360 } } },
        }),
      ])
    );
    expect(declOrder).toContain(
      "{gap:4px !important;max-width:360px !important;padding-top:8px !important}"
    );
  });

  test("maps section padding, gap, alignment, justify, and columns overrides", () => {
    const document = buildDocument([
      buildSection({
        type: "content",
        variant: "default",
        layout: { columns: 3, align: "start", justify: "start", maxWidth: 1080 },
        responsive: {
          tablet: {
            layout: { columns: 2, align: "center", justify: "between" },
            spacing: { paddingTop: 32, paddingLeft: 16, gap: 12 },
          },
        },
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain("align-items:center !important");
    expect(css).toContain("justify-content:space-between !important");
    expect(css).toContain("grid-template-columns:repeat(2, minmax(0, 1fr)) !important");
    expect(css).toContain("padding-top:32px !important");
    expect(css).toContain("padding-left:16px !important");
    expect(css).toContain("gap:12px !important");
  });

  test("columns overrides respect the template column floors", () => {
    const document = buildDocument([
      buildSection({
        id: "sec_grid",
        type: "feature-grid",
        variant: "cards",
        layout: { columns: 4, align: "start", justify: "start", maxWidth: 1080 },
        responsive: { mobile: { layout: { columns: 1 } } },
      }),
    ]);
    // feature-grid cards floors the effective column count at 3.
    expect(buildPageResponsiveCss(document)).toContain(
      "grid-template-columns:repeat(3, minmax(0, 1fr)) !important"
    );
  });

  test("stackVertical overrides force a single column on the section content grid (TASK-425)", () => {
    const document = buildDocument([
      buildSection({
        type: "content",
        layout: { columns: 3, align: "start", justify: "start", maxWidth: 1080 },
        responsive: { mobile: { layout: { stackVertical: true } } },
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain("@media (max-width: 639px){");
    expect(css).toContain(
      '[data-section-id="sec_hero"] > [data-page-section-content="true"]{grid-template-columns:repeat(1, minmax(0, 1fr)) !important}'
    );
    // Tablet has no override: nothing leaks outside the mobile range.
    expect(css).not.toContain("(min-width: 640px)");
  });

  test("stackVertical wins over a simultaneous columns override and stays a single declaration", () => {
    const document = buildDocument([
      buildSection({
        type: "content",
        layout: { columns: 1, align: "start", justify: "start", maxWidth: 1080 },
        responsive: { tablet: { layout: { columns: 3, stackVertical: true } } },
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain("grid-template-columns:repeat(1, minmax(0, 1fr)) !important");
    expect(css.match(/grid-template-columns/g)).toHaveLength(1);
  });

  test("an explicit stackVertical:false override restores the template-floored columns over a stacked base", () => {
    const document = buildDocument([
      buildSection({
        type: "content",
        layout: {
          columns: 3,
          align: "start",
          justify: "start",
          maxWidth: 1080,
          stackVertical: true,
        },
        responsive: { tablet: { layout: { stackVertical: false } } },
      }),
    ]);
    expect(buildPageResponsiveCss(document)).toContain(
      "grid-template-columns:repeat(3, minmax(0, 1fr)) !important"
    );
  });

  test("a stacked base without overrides emits no responsive CSS (legacy-safe no-op)", () => {
    const document = buildDocument([
      buildSection({
        layout: {
          columns: 2,
          align: "start",
          justify: "start",
          maxWidth: 1080,
          stackVertical: true,
        },
      }),
    ]);
    expect(buildPageResponsiveCss(document)).toBe("");
  });

  test("maps section style overrides (accent, background switch, radius, shadow)", () => {
    const document = buildDocument([
      buildSection({
        responsive: {
          mobile: {
            style: {
              accent: "#123456",
              backgroundType: "image",
              backgroundImage: "https://example.com/bg.png",
              radius: 16,
              shadow: "md",
            },
          },
        },
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain("--coderso-section-accent:#123456 !important");
    expect(css).toContain("background-color:transparent !important");
    expect(css).toContain('background-image:url("https://example.com/bg.png") !important');
    expect(css).toContain("border-radius:16px !important");
    expect(css).toContain("box-shadow:0 14px 40px rgba(15, 23, 42, 0.12) !important");
  });

  test("section visibility:false emits a display rule on the section root", () => {
    const document = buildDocument([
      buildSection({ responsive: { mobile: { visibility: { visible: false } } } }),
    ]);
    expect(buildPageResponsiveCss(document)).toContain(
      '[data-section-id="sec_hero"]{display:none !important}'
    );
  });

  test("maps block style and visibility overrides", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            style: { align: "left" },
            responsive: {
              mobile: {
                style: {
                  align: "center",
                  width: "full",
                  textColor: "#222222",
                  background: "#eeeeee",
                  backgroundType: "color",
                  opacity: 0.5,
                  radius: 8,
                  shadow: "sm",
                  borderColor: "#ff0000",
                  padding: { top: 4, left: 2 },
                  margin: { bottom: 6 },
                },
              },
            },
          }),
          buildBlock({
            id: "blk_hide",
            responsive: { mobile: { visibility: { visible: false } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain('[data-block-id="blk_text"]{');
    expect(css).toContain("text-align:center !important");
    expect(css).toContain("justify-self:center !important");
    expect(css).toContain("margin-left:auto !important");
    expect(css).toContain("margin-right:auto !important");
    expect(css).toContain("width:fit-content !important");
    expect(css).toContain("color:#222222 !important");
    expect(css).toContain("--coderso-block-text:#222222 !important");
    expect(css).toContain("background-color:#eeeeee !important");
    expect(css).toContain("--coderso-block-surface:#eeeeee !important");
    expect(css).toContain("opacity:0.5 !important");
    expect(css).toContain("border-radius:8px !important");
    expect(css).toContain("box-shadow:0 6px 20px rgba(15, 23, 42, 0.08) !important");
    expect(css).toContain("border-color:#ff0000 !important");
    expect(css).toContain("border-style:solid !important");
    expect(css).toContain("border-width:1px !important");
    expect(css).toContain("padding:4px 0px 0px 2px !important");
    expect(css).toContain("margin:0px 0px 6px 0px !important");
    expect(css).toContain('[data-block-id="blk_hide"]{display:none !important}');
  });

  test("scopes visual style overrides of re-routed types to the inner element", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_btn",
            type: "button",
            props: { label: "Buy", href: "/buy", target: "self" },
            responsive: {
              mobile: {
                style: {
                  textColor: "#222222",
                  background: "#eeeeee",
                  backgroundType: "color",
                  radius: 8,
                  shadow: "sm",
                  borderColor: "#ff0000",
                  opacity: 0.5,
                  width: "full",
                  align: "center",
                  margin: { bottom: 6 },
                },
              },
            },
          }),
          buildBlock({
            id: "blk_btn_hide",
            type: "button",
            props: { label: "Buy", href: "/buy", target: "self" },
            responsive: { mobile: { visibility: { visible: false } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);

    // Visual keys land on the inner element the renderer marks with
    // PAGE_BLOCK_ELEMENT_ATTRIBUTE (the button anchor / image img).
    expect(css).toContain(
      '[data-block-id="blk_btn"] [data-page-block-element="true"]{' +
        "--coderso-block-surface:#eeeeee !important;" +
        "--coderso-block-text:#222222 !important;" +
        "background-color:#eeeeee !important;" +
        "background-image:none !important;" +
        "border-color:#ff0000 !important;" +
        "border-radius:8px !important;" +
        "border-style:solid !important;" +
        "border-width:1px !important;" +
        "box-shadow:0 6px 20px rgba(15, 23, 42, 0.08) !important;" +
        "color:#222222 !important;" +
        "opacity:0.5 !important}"
    );
    // Layout keys (width/align/margin) stay on the block frame.
    expect(css).toContain(
      '[data-block-id="blk_btn"]{' +
        "justify-self:center !important;" +
        "margin:0px 0px 6px 0px !important;" +
        "margin-left:auto !important;" +
        "margin-right:auto !important;" +
        "text-align:center !important;" +
        "width:fit-content !important}"
    );
    // Visibility also stays a frame rule: hiding removes the whole block.
    expect(css).toContain('[data-block-id="blk_btn_hide"]{display:none !important}');
    expect(css).not.toContain('[data-block-id="blk_btn_hide"] [data-page-block-element');
  });

  test("emits safe block image backgrounds and border none clears", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_bg",
            responsive: {
              mobile: {
                style: {
                  backgroundType: "image",
                  backgroundImage: '/uploads/hero "wide".jpg',
                  borderColor: "#ff0000",
                  borderWidth: 4,
                  borderStyle: "none",
                },
              },
            },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);

    expect(css).toContain(
      '[data-block-id="blk_bg"]{' +
        "--coderso-block-surface:initial !important;" +
        'background-color:transparent !important;background-image:url("/uploads/hero \\"wide\\".jpg") !important;' +
        "background-position:center !important;background-size:cover !important;" +
        "border-style:none !important;border-width:0 !important}"
    );
    expect(css).not.toContain("javascript");
  });

  test("scopes typography overrides to the painted text node of text-capable blocks", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_typo",
            style: { fontSize: "2xl" },
            responsive: {
              mobile: {
                style: {
                  fontFamily: "display",
                  fontSize: "sm",
                  fontWeight: "bold",
                  lineHeight: 1.4,
                  letterSpacing: 0.5,
                },
              },
            },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);

    // Typography targets the renderer's text-node hook, never the frame: the
    // baked utility classes live on the text node and only a rule on the same
    // node can beat them (plus the inline desktop base via !important).
    expect(plan.css).toContain(
      '[data-block-id="blk_typo"] [data-page-block-text="true"]{' +
        "font-family:var(--font-display" +
        ""
    );
    const textRule =
      plan.css.match(
        /\[data-block-id="blk_typo"\] \[data-page-block-text="true"\]\{[^}]*\}/
      )?.[0] ?? "";
    expect(textRule).toContain("font-size:var(--text-sm");
    expect(textRule).toContain("font-weight:700 !important");
    expect(textRule).toContain("line-height:1.4 !important");
    expect(textRule).toContain("letter-spacing:0.5px !important");
    // The frame rule never carries typography.
    expect(plan.css).not.toMatch(/\[data-block-id="blk_typo"\]\{[^}]*font-/);
    expect(plan.diagnostics).toEqual([]);
  });

  test("routes button typography overrides to the inner visual element", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_typo_btn",
            type: "button",
            props: { label: "Buy", href: "/buy", target: "self" },
            responsive: { mobile: { style: { fontSize: "lg", fontWeight: "semibold" } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    const elementRule =
      css.match(
        /\[data-block-id="blk_typo_btn"\] \[data-page-block-element="true"\]\{[^}]*\}/
      )?.[0] ?? "";
    expect(elementRule).toContain("font-size:var(--text-lg");
    expect(elementRule).toContain("font-weight:600 !important");
    expect(css).not.toContain('[data-block-id="blk_typo_btn"] [data-page-block-text');
  });

  test("typography overrides on non-text blocks and null clears stay diagnostics-only", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_typo_container",
            type: "container",
            props: {},
            responsive: { mobile: { style: { fontSize: "lg" } } },
          }),
          buildBlock({
            id: "blk_typo_cleared",
            style: { fontSize: "lg" },
            responsive: { mobile: { style: { fontSize: null } } },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).not.toContain("font-size");
    expect(plan.diagnostics).toEqual([
      {
        scope: "block",
        id: "blk_typo_container",
        breakpoint: "mobile",
        key: "style.fontSize",
        reason: "not_css_expressible",
      },
      {
        scope: "block",
        id: "blk_typo_cleared",
        breakpoint: "mobile",
        key: "style.fontSize",
        reason: "not_css_expressible",
      },
    ]);
  });

  test("reaches blocks nested in active layout slots and skips inactive columns slots", () => {
    const nested = buildBlock({
      id: "blk_nested",
      responsive: { mobile: { style: { width: "full" } } },
    });
    const orphan = buildBlock({
      id: "blk_orphan",
      responsive: { mobile: { style: { width: "full" } } },
    });
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_columns",
            type: "columns",
            props: { count: 2, gap: 24, distribution: "equal" },
            slots: { "column:1": [nested], "column:3": [orphan] },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toContain('[data-block-id="blk_nested"]{width:100% !important}');
    expect(plan.css).not.toContain("blk_orphan");
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_orphan",
      breakpoint: "mobile",
      key: "*",
      reason: "markup_absent_at_base",
    });
  });

  test("escapes hostile ids so selectors cannot break out of the stylesheet", () => {
    const document = buildDocument([
      buildSection({
        id: 'sec"]{}</style><script>',
        responsive: { mobile: { layout: { maxWidth: 360 } } },
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    // The quote is backslash-escaped, `<`/`>` are hex-escaped.
    expect(css).toContain('[data-section-id="sec\\"]{}\\3c /style\\3e \\3c script\\3e "]');
    expect(css).toContain("max-width:360px !important");
    // Neither an unescaped quote breakout nor a style-element terminator leaks.
    expect(css).not.toContain('sec"]');
    expect(css).not.toContain("</style>");
  });

  test("rejects unsafe color values fail-closed into diagnostics", () => {
    const document = buildDocument([
      buildSection({
        responsive: {
          mobile: {
            style: { accent: "red;}body{display:none", background: "url(javascript:alert(1))" },
          },
        },
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toBe("");
    expect(plan.css).not.toContain("body{");
    expect(plan.diagnostics).toContainEqual({
      scope: "section",
      id: "sec_hero",
      breakpoint: "mobile",
      key: "style.accent",
      reason: "unsafe_color_value",
    });
    expect(plan.diagnostics).toContainEqual({
      scope: "section",
      id: "sec_hero",
      breakpoint: "mobile",
      key: "style.background",
      reason: "unsafe_color_value",
    });
  });

  test("keeps block props overrides diagnostics-only", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            responsive: { tablet: { props: { text: "Tablet copy" }, style: { width: "full" } } },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toContain("width:100% !important");
    expect(plan.css).not.toContain("Tablet copy");
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_text",
      breakpoint: "tablet",
      key: "props",
      reason: "props_override_unsupported",
    });
  });

  test("props.align overrides on heading/text emit a text-align rule on the painted text node", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_heading",
            type: "heading",
            props: { text: "Build with Coderso", level: "h1", align: "left" },
            responsive: { tablet: { props: { align: "center" } } },
          }),
          buildBlock({
            id: "blk_copy",
            responsive: { mobile: { props: { align: "right" } } },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    // Scoped through the block frame selector onto the text node the desktop
    // base paints (the baked text-align class lives there, so a frame-level
    // rule could never beat it).
    expect(plan.css).toContain(
      '[data-block-id="blk_heading"] [data-page-block-text="true"]{text-align:center !important}'
    );
    expect(plan.css.indexOf("blk_heading")).toBeLessThan(
      plan.css.indexOf("@media (max-width: 639px)")
    );
    expect(plan.css).toContain(
      '[data-block-id="blk_copy"] [data-page-block-text="true"]{text-align:right !important}'
    );
    // The supported align key alone produces no props diagnostic.
    expect(plan.diagnostics).toEqual([]);
  });

  test("props.align overrides fail closed for non-enum values and non-text block types", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_bad_value",
            type: "heading",
            props: { text: "Heading", level: "h2", align: "left" },
            responsive: { tablet: { props: { align: "justify;}body{display:none" } } },
          }),
          buildBlock({
            id: "blk_mixed",
            responsive: { tablet: { props: { align: "center", text: "Tablet copy" } } },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).not.toContain("body{");
    expect(plan.css).not.toContain("justify");
    expect(plan.css).not.toContain("Tablet copy");
    // Supported align still emits next to the unsupported sibling key.
    expect(plan.css).toContain(
      '[data-block-id="blk_mixed"] [data-page-block-text="true"]{text-align:center !important}'
    );
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_bad_value",
      breakpoint: "tablet",
      key: "props.align",
      reason: "not_css_expressible",
    });
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_mixed",
      breakpoint: "tablet",
      key: "props",
      reason: "props_override_unsupported",
    });
  });

  test("maxWidth overrides on full-bleed sections resize the content cap (525 model: NOT diagnostics-only)", () => {
    // TASK-535 — the pre-525 renderer pinned `max-width:none` on full-width
    // variants, so a maxWidth override was rightly `not_css_expressible`. The 525
    // model DECOUPLED the 100vw bleed box from the CONTENT, which is now ALWAYS
    // capped/centered at `layout.maxWidth` (see `toPageSectionStyle`). So the
    // override IS expressible: it resizes the content cap, mirroring the base
    // content div's BOTH `width: min(<max>, calc(100% - 40px))` AND `max-width`.
    const document = buildDocument([
      buildSection({
        variant: "full-width",
        responsive: { mobile: { layout: { maxWidth: 360 } } },
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    // No stale diagnostic — the override reaches CSS.
    expect(plan.diagnostics).not.toContainEqual({
      scope: "section",
      id: "sec_hero",
      breakpoint: "mobile",
      key: "layout.maxWidth",
      reason: "not_css_expressible",
    });
    // Content selector, mobile media query, declarations alpha-sorted
    // (`max-width` before `width`); both mirror the base full-bleed content cap.
    expect(plan.css).toBe(
      [
        "@media (max-width: 639px){",
        '[data-section-id="sec_hero"] > [data-page-section-content="true"]' +
          "{max-width:360px !important;width:min(360px, calc(100% - 2 * 20px)) !important}",
        "}",
      ].join("\n")
    );
  });

  test("maxWidth overrides on the fullBleed FLAG (not just the full-width variant) also resize the content cap", () => {
    // TASK-535 — `isPageSectionFullBleed` is `variant==='full-width' OR
    // style.fullBleed`, so a default-variant section that TOGGLED `style.fullBleed`
    // gets the same decoupled content cap and the SAME expressible override.
    const document = buildDocument([
      buildSection({
        style: {
          background: "#ffffff",
          backgroundType: "color",
          backgroundImage: null,
          accent: "#0d9488",
          radius: 0,
          shadow: "none",
          fullBleed: true,
        },
        responsive: { tablet: { layout: { maxWidth: 720 } } },
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain("max-width:720px !important");
    expect(css).toContain("width:min(720px, calc(100% - 2 * 20px)) !important");
  });

  test("maxWidth overrides on NON-full-bleed sections stay a plain max-width (no width formula)", () => {
    // Byte-identical to pre-535 for the common (non-full-bleed) case: just
    // `max-width`, no `width: min(...)`.
    const document = buildDocument([
      buildSection({ responsive: { mobile: { layout: { maxWidth: 360 } } } }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toBe(
      [
        "@media (max-width: 639px){",
        '[data-section-id="sec_hero"] > [data-page-section-content="true"]{max-width:360px !important}',
        "}",
      ].join("\n")
    );
    expect(css).not.toContain("width:min(");
  });

  test("overrides on nodes hidden at the desktop base emit diagnostics, not CSS", () => {
    const document = buildDocument([
      buildSection({
        visibility: { visible: false, authOnly: false, anchor: null, startsAt: null, endsAt: null },
        responsive: { mobile: { layout: { maxWidth: 360 } } },
        blocks: [buildBlock({ responsive: { mobile: { style: { width: "full" } } } })],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toBe("");
    expect(plan.diagnostics).toContainEqual({
      scope: "section",
      id: "sec_hero",
      breakpoint: "mobile",
      key: "*",
      reason: "markup_absent_at_base",
    });
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_text",
      breakpoint: "mobile",
      key: "*",
      reason: "markup_absent_at_base",
    });
  });

  test("visibility restore (visible:true over a hidden base) cannot be expressed", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            visibility: { visible: false },
            responsive: { mobile: { visibility: { visible: true } } },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toBe("");
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_text",
      breakpoint: "mobile",
      key: "*",
      reason: "markup_absent_at_base",
    });
  });

  test("non-CSS section visibility fields stay diagnostics-only", () => {
    const document = buildDocument([
      buildSection({
        responsive: { mobile: { visibility: { authOnly: true, anchor: "spot" } } },
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toBe("");
    expect(plan.diagnostics).toContainEqual({
      scope: "section",
      id: "sec_hero",
      breakpoint: "mobile",
      key: "visibility.authOnly",
      reason: "not_css_expressible",
    });
    expect(plan.diagnostics).toContainEqual({
      scope: "section",
      id: "sec_hero",
      breakpoint: "mobile",
      key: "visibility.anchor",
      reason: "not_css_expressible",
    });
  });
});

// --- Section column placement (style.column, owner finding #5 round 3) ---

test("style.column overrides are structural and fail closed into not_css_expressible diagnostics", () => {
  const document = buildDocument([
    buildSection({
      layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
      blocks: [
        buildBlock({
          id: "blk_column_move",
          style: { column: 1 },
          responsive: { tablet: { style: { column: 2 } }, mobile: { style: { column: null } } },
        }),
      ],
    }),
  ]);

  const plan = buildPageResponsiveCssPlan(document);
  // Column assignment re-parents the block into a different wrapper in the
  // BASE markup — no @media projection exists. Editor/preview resolve it;
  // layout.stackVertical remains the supported mobile collapse.
  expect(plan.diagnostics).toEqual([
    {
      scope: "block",
      id: "blk_column_move",
      breakpoint: "tablet",
      key: "style.column",
      reason: "not_css_expressible",
    },
    {
      scope: "block",
      id: "blk_column_move",
      breakpoint: "mobile",
      key: "style.column",
      reason: "not_css_expressible",
    },
  ]);
  expect(plan.css).toBe("");

  // A base-only assignment emits neither CSS nor diagnostics.
  const baseOnly = buildDocument([
    buildSection({
      blocks: [buildBlock({ id: "blk_column_base", style: { column: 2 } })],
    }),
  ]);
  expect(buildPageResponsiveCssPlan(baseOnly)).toEqual({ css: "", diagnostics: [] });
});

describe("per-device layer offsets (TASK-522-05-L02 seam)", () => {
  test("a tablet layer.x override emits a --layer-x !important delta on [data-block-id]", () => {
    const document = buildDocument([
      buildSection({
        style: {
          background: "#fff",
          backgroundType: "color",
          backgroundImage: null,
          accent: "#000",
          radius: 0,
          shadow: "none",
          composition: "layered",
        },
        blocks: [
          buildBlock({
            id: "blk_layer",
            // Base position + an animated float (the anchored-badge case): the
            // per-device reposition must reach the SAME [data-block-id] frame
            // that carries data-layer + the base --layer-x (finding 4).
            style: {
              layer: { x: 10, y: 20, anchor: "top-right" },
              decoration: { motion: "float" },
            },
            responsive: { tablet: { style: { layer: { x: 80, y: 40 } } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain("@media (min-width: 640px) and (max-width: 1023px){");
    // Targets the block-frame selector (the element carrying data-layer + base var).
    expect(css).toContain('[data-block-id="blk_layer"]');
    expect(css).toContain("--layer-x:80% !important");
    expect(css).toContain("--layer-y:40% !important");
  });

  test("no layer override → no --layer-* delta (present-only)", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_no_layer",
            style: { layer: { x: 10 } },
            responsive: { tablet: { style: { align: "center" } } },
          }),
        ],
      }),
    ]);
    expect(buildPageResponsiveCss(document)).not.toContain("--layer-x");
  });

  test("TASK-535 — tilt+layer: the tablet layer override targets the hoisted WRAPPER, not the frame", () => {
    // When a block authors BOTH tilt AND layer, the renderer HOISTS the base
    // --layer-* onto the [data-tilt-parent] wrapper (a per-device value on the child
    // [data-block-id] frame could never inherit UP to the wrapper that consumes
    // var(--layer-*)). The per-device override must therefore land on the wrapper
    // selector [data-tilt-parent-for="<id>"], NOT the frame [data-block-id].
    const document = buildDocument([
      buildSection({
        style: {
          background: "#fff",
          backgroundType: "color",
          backgroundImage: null,
          accent: "#000",
          radius: 0,
          shadow: "none",
          composition: "layered",
        },
        blocks: [
          buildBlock({
            id: "blk_tilt_layer",
            style: {
              layer: { x: 10, y: 20, anchor: "top-right" },
              tilt: "subtle",
            },
            responsive: { tablet: { style: { layer: { x: 80, y: 40 } } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain("@media (min-width: 640px) and (max-width: 1023px){");
    // The override rides the wrapper selector (the element that carries the hoisted
    // base --layer-*), so var(--layer-x) on the wrapper resolves to the tablet value.
    expect(css).toContain('[data-tilt-parent-for="blk_tilt_layer"]{--layer-x:80% !important');
    expect(css).toContain("--layer-y:40% !important");
    // Regression guard: the layer delta must NOT be emitted on the frame selector
    // (where it would be DEAD — it can never inherit up to the wrapper).
    expect(css).not.toContain('[data-block-id="blk_tilt_layer"]{--layer-x');
  });
});

describe("per-device surface tint glow (TASK-524-02-L03 seam)", () => {
  test("a tablet surfaceTint override emits --surface-glow/--deco-ring/--orb-color !important on [data-block-id]", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_tint",
            // Base glass surface with a base tint; the per-device retint must
            // reach the SAME [data-block-id] frame that carries the base glow var.
            style: {
              surfacePreset: "glass",
              surfaceTint: "#8ee8ff",
            },
            responsive: { tablet: { style: { surfaceTint: "#c7b7ff" } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain("@media (min-width: 640px) and (max-width: 1023px){");
    expect(css).toContain('[data-block-id="blk_tint"]');
    expect(css).toContain("--surface-glow:#c7b7ff !important");
    expect(css).toContain("--deco-ring:#c7b7ff !important");
    expect(css).toContain("--orb-color:#c7b7ff !important");
  });

  test("surfaceTint override with no active surface/effect at the breakpoint emits nothing (base gate parity)", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_tint_inert",
            // No surfacePreset/hoverEffect/motion → the glow is inert on the base
            // and must stay inert per-device (no orphan custom prop).
            style: { surfaceTint: "#8ee8ff" },
            responsive: { tablet: { style: { surfaceTint: "#c7b7ff" } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).not.toContain("--surface-glow");
    expect(css).not.toContain("--deco-ring");
    expect(css).not.toContain("--orb-color");
  });

  test("a gradient/url surfaceTint override fails closed (invalid inside radial-gradient())", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_tint_grad",
            style: { surfacePreset: "glass", surfaceTint: "#8ee8ff" },
            responsive: {
              tablet: { style: { surfaceTint: "linear-gradient(90deg,#000,#fff)" } },
            },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).not.toContain("--surface-glow:linear-gradient");
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_tint_grad",
      breakpoint: "tablet",
      key: "style.surfaceTint",
      reason: "unsafe_color_value",
    });
  });
});

// ── TASK-531-01-L02/L04 — the SECOND render boundary (per-device @media RAW <style>) ──
// pageResponsiveCss.ts emits per-device declarations RAW into a <style> string
// (dangerouslySetInnerHTML, NOT React-escaped), so the multi-layer allowlist +
// tripwire and the glow composer must gate this boundary exactly like the write one.
describe("per-device gradient + glow @media (TASK-531-01-L02)", () => {
  const CTA_CARD =
    "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)";
  const sectionContentRule = (css: string): string =>
    css.match(
      /\[data-section-id="sec_hero"\] > \[data-page-section-content="true"\]\{[^}]*\}/
    )?.[0] ?? "";
  const blockRule = (css: string): string =>
    css.match(/\[data-block-id="blk_text"\]\{[^}]*\}/)?.[0] ?? "";

  test("SECTION per-device multi-layer gradient override paints via the NEW section gradient branch", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: {
            tablet: { style: { backgroundType: "gradient", background: CTA_CARD } },
          },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    const rule = sectionContentRule(plan.css);
    expect(rule).toContain(`background-image:${CTA_CARD} !important`);
    expect(rule).toContain("background-color:transparent !important");
    expect(plan.diagnostics).toEqual([]);
  });

  test("BLOCK per-device multi-layer gradient override paints via the RELAXED block re-gate", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          blocks: [
            buildBlock({
              responsive: {
                mobile: { style: { backgroundType: "gradient", background: CTA_CARD } },
              },
            }),
          ],
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    // A PRE-relax single-layer re-gate would drop this comma-joined value ⇒ gate for the fix.
    expect(plan.css).toContain(`background-image:${CTA_CARD} !important`);
    expect(plan.css).toContain("background-color:transparent !important");
    expect(plan.diagnostics).toEqual([]);
  });

  test("per-device url()-bearing multi-layer override is rejected RAW (diagnostic, no <style> emit)", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: {
            tablet: {
              style: {
                backgroundType: "gradient",
                background: "linear-gradient(#fff,#000), url(//evil/beacon)",
              },
            },
          },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).not.toContain("url(//evil/beacon)");
    expect(plan.css).not.toContain("background-image:linear-gradient(#fff,#000), url");
    expect(plan.diagnostics).toContainEqual({
      scope: "section",
      id: "sec_hero",
      breakpoint: "tablet",
      key: "style.background",
      reason: "unsafe_background_value",
    });
  });

  test("per-device @import / expression / over-cap multi-layer overrides all reject at the RAW boundary", () => {
    const overCap = Array.from({ length: 7 }, () => "#000").join(", ");
    for (const [bp, value] of [
      ["tablet", "linear-gradient(#fff,#000), @import url(evil)"],
      ["mobile", "linear-gradient(#fff,#000), expression(alert(1))"],
      ["tablet", overCap],
    ] as const) {
      const document = normalizePageDocumentV2ForWrite(
        buildDocument([
          buildSection({
            id: "sec_hero",
            responsive: { [bp]: { style: { backgroundType: "gradient", background: value } } },
          }),
        ])
      );
      const plan = buildPageResponsiveCssPlan(document);
      expect(plan.css).not.toContain("@import");
      expect(plan.css).not.toContain("expression(");
      expect(plan.diagnostics).toContainEqual({
        scope: "section",
        id: "sec_hero",
        breakpoint: bp,
        key: "style.background",
        reason: "unsafe_background_value",
      });
    }
  });

  test("MOBILE-ONLY glow override (no enum shadow) still emits a box-shadow rule (G-3b)", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: { mobile: { style: { glow: { color: "#8ee8ff", blur: 28 } } } },
          blocks: [
            buildBlock({
              responsive: {
                mobile: { style: { glow: { color: "rgba(142,232,255,.22)", blur: 45, y: 18 } } },
              },
            }),
          ],
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    // Section: device-only glow composes even without an enum shadow override.
    expect(sectionContentRule(plan.css)).toContain(
      "box-shadow:0px 0px 28px 0px #8ee8ff !important"
    );
    // Block: same, on the block frame rule.
    expect(blockRule(plan.css)).toContain(
      "box-shadow:0px 18px 45px 0px rgba(142,232,255,.22) !important"
    );
    expect(plan.diagnostics).toEqual([]);
  });

  test("a device with BOTH enum shadow AND glow emits the merged two-shadow value", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: { mobile: { style: { shadow: "md", glow: { color: "#8ee8ff", blur: 28 } } } },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    expect(sectionContentRule(plan.css)).toContain(
      "box-shadow:0 14px 40px rgba(15, 23, 42, 0.12), 0px 0px 28px 0px #8ee8ff !important"
    );
  });

  test("a per-device glow with a hostile color composes to nothing (fail-soft, no box-shadow rule)", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: { mobile: { style: { glow: { color: "expression(alert(1))" } } } },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    // The hostile color is dropped at the WRITE boundary (normalizeGlow omits the glow),
    // so no glow reaches the responsive branch and no box-shadow rule emits.
    expect(plan.css).not.toContain("expression(");
    expect(plan.css).not.toContain("box-shadow");
  });

  test("byte-identity: a doc with no per-device gradient/glow override emits identical css", () => {
    // A plain per-device maxWidth override (no 531 field) is unchanged by 531.
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([buildSection({ responsive: { tablet: { layout: { maxWidth: 640 } } } })])
    );
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toBe(
      [
        "@media (min-width: 640px) and (max-width: 1023px){",
        '[data-section-id="sec_hero"] > [data-page-section-content="true"]{max-width:640px !important}',
        "}",
      ].join("\n")
    );
    expect(plan.diagnostics).toEqual([]);
  });
});
