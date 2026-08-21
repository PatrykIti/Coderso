/**
 * Responsive CSS BLOCK projection suite (TASK-539-06-L01 split, part 1).
 *
 * Block frame / inner visual element / text projection, visibility,
 * layout-slot reachability, props + props.align handling, and typography
 * (token routing, custom font size through the shared sanitizer, explicit
 * text-transform resets). Per-device layer offsets, surface tint, block
 * gradient/glow, placement-gated grid spans, `style.column`, and the
 * forbidden block-style key matrix live in
 * `page-responsive-css-block-behavior.test.ts`.
 */

import { describe, expect, test } from "vitest";

import {
  buildPageResponsiveCss,
  buildPageResponsiveCssPlan,
} from "../../../core/services/pages/pageResponsiveCss";
import { normalizePageDocumentV2ForWrite } from "../../../core/services/pages/pageDocumentV2";
import {
  buildBlock,
  buildDocument,
  buildSection,
  elementScope,
  frameScope,
  textScope,
} from "./page-responsive-css-fixtures";

describe("block style and visibility projection", () => {
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
    expect(css).toContain(`${frameScope("blk_text")}{`);
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
    expect(css).toContain(`${frameScope("blk_hide")}{display:none !important}`);
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
      `${elementScope("blk_btn")}{` +
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
      `${frameScope("blk_btn")}{` +
        "justify-self:center !important;" +
        "margin:0px 0px 6px 0px !important;" +
        "margin-left:auto !important;" +
        "margin-right:auto !important;" +
        "text-align:center !important;" +
        "width:fit-content !important}"
    );
    // Visibility also stays a frame rule: hiding removes the whole block.
    expect(css).toContain(`${frameScope("blk_btn_hide")}{display:none !important}`);
    expect(css).not.toContain(`${frameScope("blk_btn_hide")} [data-page-block-element`);
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
      `${frameScope("blk_bg")}{` +
        "--coderso-block-surface:initial !important;" +
        'background-color:transparent !important;background-image:url("/uploads/hero \\"wide\\".jpg") !important;' +
        "background-position:center !important;background-size:cover !important;" +
        "border-style:none !important;border-width:0 !important}"
    );
    expect(css).not.toContain("javascript");
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
    expect(plan.css).toContain(`${frameScope("blk_nested")}{width:100% !important}`);
    expect(plan.css).not.toContain("blk_orphan");
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_orphan",
      breakpoint: "mobile",
      key: "*",
      reason: "markup_absent_at_base",
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
    expect(plan.css).toContain(`${textScope("blk_heading")}{text-align:center !important}`);
    expect(plan.css.indexOf("blk_heading")).toBeLessThan(
      plan.css.indexOf("@media (max-width: 639px)")
    );
    expect(plan.css).toContain(`${textScope("blk_copy")}{text-align:right !important}`);
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
    expect(plan.css).toContain(`${textScope("blk_mixed")}{text-align:center !important}`);
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
});

describe("typography (TASK-424 + TASK-532 Bundle B)", () => {
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

    const textRule =
      plan.css.match(
        new RegExp(`${textScope("blk_typo").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{[^}]*\\}`)
      )?.[0] ?? "";
    expect(textRule).toContain("font-family:var(--font-display");
    expect(textRule).toContain("font-size:var(--text-sm");
    expect(textRule).toContain("font-weight:700 !important");
    expect(textRule).toContain("line-height:1.4 !important");
    expect(textRule).toContain("letter-spacing:0.5px !important");
    const frameRule =
      plan.css.match(
        /:is\(\[data-block-id="blk_typo"\],\[data-page-marquee-replica-block-style-scope="blk_typo"\]\)\{[^}]*\}/
      )?.[0] ?? "";
    // The frame rule never carries typography (only the text-node rule does).
    expect(frameRule).not.toContain("font-");
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
        new RegExp(
          `${elementScope("blk_typo_btn").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\{[^}]*\\}`
        )
      )?.[0] ?? "";
    expect(elementRule).toContain("font-size:var(--text-lg");
    expect(elementRule).toContain("font-weight:600 !important");
    expect(css).not.toContain(`${frameScope("blk_typo_btn")} [data-page-block-text`);
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

  test("fontSizeCustom emits only after the shared sanitizer accepts it and wins over the token", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          blocks: [
            buildBlock({
              id: "blk_custom",
              style: { fontSize: "2xl" },
              responsive: {
                tablet: { style: { fontSizeCustom: "clamp(2rem, 5vw, 3rem)", fontSize: "sm" } },
              },
            }),
          ],
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    const rule =
      plan.css.match(
        /:is\(\[data-block-id="blk_custom"\],\[data-page-marquee-replica-block-style-scope="blk_custom"\]\) \[data-page-block-text="true"\]\{[^}]*\}/
      )?.[0] ?? "";
    // The custom value wins over the discrete token and is emitted verbatim
    // (already sanitized at the write boundary).
    expect(rule).toContain("font-size:clamp(2rem, 5vw, 3rem) !important");
    expect(rule).not.toContain("--text-sm");
    expect(plan.diagnostics).toEqual([]);
  });

  test("fontSizeCustom on non-typography blocks and invalid custom sizes diagnose exact keys", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_custom_container",
            type: "container",
            props: {},
            responsive: { mobile: { style: { fontSizeCustom: "1.75rem" } } },
          }),
          buildBlock({
            id: "blk_custom_bad",
            responsive: { mobile: { style: { fontSizeCustom: "1.75rem;}body{display:none" } } },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).not.toContain("font-size");
    expect(plan.css).not.toContain("body{");
    expect(plan.diagnostics).toEqual([
      {
        scope: "block",
        id: "blk_custom_container",
        breakpoint: "mobile",
        key: "style.fontSizeCustom",
        reason: "not_css_expressible",
      },
      {
        scope: "block",
        id: "blk_custom_bad",
        breakpoint: "mobile",
        key: "style.fontSizeCustom",
        reason: "not_css_expressible",
      },
    ]);
  });

  test("explicit textTransform:none is a present reset; enum values project through the fixed map", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          blocks: [
            buildBlock({
              id: "blk_transform_reset",
              style: { textTransform: "uppercase" },
              responsive: { tablet: { style: { textTransform: "none" } } },
            }),
            buildBlock({
              id: "blk_transform_up",
              responsive: { mobile: { style: { textTransform: "uppercase" } } },
            }),
          ],
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toContain(
      `${textScope("blk_transform_reset")}{text-transform:none !important}`
    );
    expect(plan.css).toContain(
      `${textScope("blk_transform_up")}{text-transform:uppercase !important}`
    );
    expect(plan.diagnostics).toEqual([]);
  });

  test("textTransform on a non-typography block diagnoses the exact key", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_transform_container",
            type: "container",
            props: {},
            responsive: { mobile: { style: { textTransform: "uppercase" } } },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toBe("");
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_transform_container",
      breakpoint: "mobile",
      key: "style.textTransform",
      reason: "not_css_expressible",
    });
  });
});
