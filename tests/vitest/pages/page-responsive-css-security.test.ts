/**
 * Responsive CSS FAIL-CLOSED security suite (TASK-539-06-L01 split).
 *
 * The per-device boundary emits declarations RAW into a `<style>` string
 * (dangerouslySetInnerHTML, NOT React-escaped), so every hostile value must
 * fail closed: hostile ids, unsafe colors, url-bearing / @import / expression /
 * over-cap multi-layer backgrounds, hostile glow colors, hostile custom font
 * sizes, unsafe scope selectors, and unsafe block scope ids.
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
  frameScope,
} from "./page-responsive-css-fixtures";

describe("hostile ids", () => {
  test("escapes hostile section ids so selectors cannot break out of the stylesheet", () => {
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

  test("escapes hostile BLOCK ids identically in both :is() arms", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: 'blk"]{}</style><script>',
            responsive: { mobile: { style: { width: "full" } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    const escaped = 'blk\\"]{}\\3c /style\\3e \\3c script\\3e ';
    expect(css).toContain(
      `:is([data-block-id="${escaped}"],[data-page-marquee-replica-block-style-scope="${escaped}"])`
    );
    // The escaped value appears exactly once in each arm, never duplicated
    // primary/replica grammar, and no unescaped breakout leaks.
    expect(css).not.toContain('blk"]');
    expect(css).not.toContain("</style>");
  });

  test("whitespace-only block/section ids fail closed into unsafe_scope_id diagnostics", () => {
    const document = buildDocument([
      buildSection({
        id: "   ",
        responsive: { mobile: { layout: { maxWidth: 360 } } },
        blocks: [buildBlock({ id: "", responsive: { mobile: { style: { width: "full" } } } })],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toBe("");
    // The builder reports the TRIMMED id (the same value the scope selector
    // would otherwise consume), never the raw whitespace bytes.
    expect(plan.diagnostics).toContainEqual({
      scope: "section",
      id: "",
      breakpoint: "mobile",
      key: "*",
      reason: "unsafe_scope_id",
    });
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "",
      breakpoint: "mobile",
      key: "*",
      reason: "unsafe_scope_id",
    });
  });
});

describe("unsafe colors", () => {
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

describe("multi-layer background RAW boundary", () => {
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

  test("hostile block backgroundImage under image type never leaks a javascript: URL", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_bad_bg",
            type: "image",
            props: { src: "/uploads/a.jpg", alt: "A", fit: "cover", align: "center" },
            responsive: {
              mobile: {
                style: {
                  backgroundType: "image",
                  backgroundImage: "javascript:alert(1)",
                },
              },
            },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).not.toContain("javascript");
    expect(plan.css).not.toContain("alert(1)");
    // The hostile value cannot become an image URL: it is rejected with the
    // exact unsafe background key (never interpolated into `url(...)`).
    expect(plan.css).toBe("");
    expect(plan.diagnostics).toContainEqual({
      scope: "block",
      id: "blk_bad_bg",
      breakpoint: "mobile",
      key: "style.backgroundImage",
      reason: "unsafe_background_value",
    });
  });
});

describe("hostile glow and custom font sizes", () => {
  test("a per-device glow with a hostile color composes to nothing (fail-soft, no box-shadow rule)", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: { mobile: { style: { glow: { color: "expression(alert(1))" } } } },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    // The hostile color is dropped at the WRITE boundary (normalizeGlow omits
    // the glow), so no glow reaches the responsive branch and no box-shadow
    // rule emits.
    expect(plan.css).not.toContain("expression(");
    expect(plan.css).not.toContain("box-shadow");
    expect(plan.diagnostics).toEqual([]);
  });

  test("hostile fontSizeCustom is dropped at the write boundary and the builder emits nothing", () => {
    // The shared sanitizer rejects the payload at write (fail-soft: the key is
    // dropped). The normalized doc therefore has no fontSizeCustom delta and
    // the builder projects nothing — no CSS, no diagnostics.
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          blocks: [
            buildBlock({
              responsive: {
                mobile: {
                  style: {
                    fontSizeCustom: "1.75rem;}body{display:none",
                  },
                },
              },
            }),
          ],
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toBe("");
    expect(plan.css).not.toContain("body{");
    expect(plan.diagnostics).toEqual([]);
  });
});

describe("unsafe scope selector", () => {
  test("a hostile trusted scope selector throws page_responsive_css_scope_invalid", () => {
    const document = buildDocument([buildSection()]);
    expect(() =>
      buildPageResponsiveCssPlan(document, {
        scopeSelector: "[data-site-footer];body{display:none}",
      })
    ).toThrow("page_responsive_css_scope_invalid");
    expect(() => buildPageResponsiveCssPlan(document, { scopeSelector: '[data-x="y}"]' })).toThrow(
      "page_responsive_css_scope_invalid"
    );
    // A compliant owned literal still projects.
    expect(
      buildPageResponsiveCssPlan(document, { scopeSelector: '[data-site-footer="true"]' }).css
    ).toBe("");
  });

  test("the allowed scope selector charset stays a conservative allowlist (no CSS metacharacters)", () => {
    const document = buildDocument([buildSection()]);
    const safe = ['[data-site-footer="true"]', ".site-footer", "#global-site", "footer"];
    for (const scope of safe) {
      expect(() => buildPageResponsiveCssPlan(document, { scopeSelector: scope })).not.toThrow();
    }
    const hostile = [
      "> body",
      "body >",
      ":has(script)",
      "div, body",
      "div{color:red}",
      "@import url(x)",
      "/*x*/footer",
    ];
    for (const scope of hostile) {
      expect(() => buildPageResponsiveCssPlan(document, { scopeSelector: scope })).toThrow(
        "page_responsive_css_scope_invalid"
      );
    }
  });

  test("a hostile scope never reaches the emitted CSS and never breaks the fallback path", () => {
    const document = buildDocument([
      buildSection({
        responsive: { mobile: { layout: { maxWidth: 360 } } },
        blocks: [buildBlock({ responsive: { mobile: { style: { width: "full" } } } })],
      }),
    ]);
    expect(() =>
      buildPageResponsiveCssPlan(document, { scopeSelector: "}body{display:none" })
    ).toThrow("page_responsive_css_scope_invalid");
    // Without a scope the same document emits cleanly with the shared :is arms.
    const css = buildPageResponsiveCss(document);
    expect(css).toContain(`${frameScope("blk_text")}{width:100% !important}`);
  });
});
