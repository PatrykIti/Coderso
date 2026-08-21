/**
 * Responsive CSS SECTION projection suite (TASK-539-06-L01 split).
 *
 * Section layout/spacing/visibility/columns/stack projections, the 525-model
 * full-bleed content cap, the full-bleed vs capped PAINT target decision, the
 * structured background paint parse (image/color separation, explicit
 * resets), the forbidden section-style key matrix (8 keys), and the
 * TASK-531 section gradient/glow branches.
 */

import { describe, expect, test } from "vitest";

import {
  buildPageResponsiveCss,
  buildPageResponsiveCssPlan,
} from "../../../core/services/pages/pageResponsiveCss";
import {
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
} from "../../../core/services/pages/pageDocumentV2";
import {
  buildBlock,
  buildDocument,
  buildSection,
  withResponsiveStyleKey,
} from "./page-responsive-css-fixtures";

const CTA_CARD =
  "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)";

const sectionContentRule = (css: string): string =>
  css.match(
    /\[data-section-id="sec_hero"\] > \[data-page-section-content="true"\]\{[^}]*\}/
  )?.[0] ?? "";
const sectionRootRule = (css: string): string =>
  css.match(/\[data-section-id="sec_hero"\]\{[^}]*\}/)?.[0] ?? "";

describe("section layout/spacing/columns projection", () => {
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

describe("full-bleed content cap (525 model)", () => {
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
});

describe("full-bleed paint targeting (TASK-539-06-L01)", () => {
  test("full-bleed paint (background/radius/shadow/glow) targets the section ROOT", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
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
          responsive: {
            mobile: {
              style: {
                backgroundType: "image",
                backgroundImage: "https://example.com/bleed.png",
                radius: 16,
                shadow: "md",
                glow: { color: "#8ee8ff", blur: 28 },
              },
            },
          },
        }),
      ])
    );
    const css = buildPageResponsiveCss(document);
    const rootRule = sectionRootRule(css);
    expect(rootRule).toContain("border-radius:16px !important");
    expect(rootRule).toContain(
      "box-shadow:0 14px 40px rgba(15, 23, 42, 0.12), 0px 0px 28px 0px #8ee8ff !important"
    );
    expect(rootRule).toContain('background-image:url("https://example.com/bleed.png") !important');
    expect(rootRule).toContain("background-color:transparent !important");
    // Layout/max-width/spacing stay on content; the root carries no width cap.
    expect(sectionContentRule(css)).toBe("");
    expect(rootRule).not.toContain("max-width");
  });

  test("capped (non-full-bleed) paint stays on the section CONTENT", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: {
            mobile: {
              style: {
                backgroundType: "image",
                backgroundImage: "https://example.com/bg.png",
                radius: 16,
                shadow: "md",
              },
            },
          },
        }),
      ])
    );
    const css = buildPageResponsiveCss(document);
    expect(sectionRootRule(css)).toBe("");
    const contentRule = sectionContentRule(css);
    expect(contentRule).toContain("border-radius:16px !important");
    expect(contentRule).toContain("box-shadow:0 14px 40px rgba(15, 23, 42, 0.12) !important");
    expect(contentRule).toContain('background-image:url("https://example.com/bg.png") !important');
  });

  test("a device override can never switch the paint target (base decision only)", () => {
    // Same responsive paint delta over a capped base stays on content, even
    // though the full-width-template section above targets root.
    const capped = normalizePageDocumentV2ForWrite(
      buildDocument([buildSection({ responsive: { mobile: { style: { radius: 16 } } } })])
    );
    const fullBleed = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          variant: "full-width",
          responsive: { mobile: { style: { radius: 16 } } },
        }),
      ])
    );
    expect(sectionRootRule(buildPageResponsiveCss(capped))).toBe("");
    expect(sectionContentRule(buildPageResponsiveCss(capped))).toContain("border-radius:16px");
    expect(sectionContentRule(buildPageResponsiveCss(fullBleed))).toBe("");
    expect(sectionRootRule(buildPageResponsiveCss(fullBleed))).toContain("border-radius:16px");
  });
});

describe("structured section background paint (TASK-539-06-L01)", () => {
  test("gradient stack + optional final color emit image and color in SEPARATE declarations", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: { tablet: { style: { backgroundType: "gradient", background: CTA_CARD } } },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    const rule = sectionContentRule(plan.css);
    expect(rule).toContain(`background-image:${CTA_CARD} !important`);
    expect(rule).toContain("background-color:transparent !important");
    // No combined "image, color" single declaration is ever rebuilt.
    expect(plan.css).not.toContain(`background-image:${CTA_CARD}, `);
    expect(plan.diagnostics).toEqual([]);
  });

  test("gradient with a final canonical color paints background-color from paint.color", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: {
            mobile: {
              style: {
                backgroundType: "gradient",
                background: "linear-gradient(180deg,#0f1720,#1b2733), rgba(255,255,255,.35)",
              },
            },
          },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    const rule = sectionContentRule(plan.css);
    expect(rule).toContain("background-image:linear-gradient(180deg,#0f1720,#1b2733) !important");
    // The final color layer is emitted with TASK-541 canonical spaced bytes.
    expect(rule).toContain("background-color:rgba(255, 255, 255, 0.35) !important");
    expect(plan.diagnostics).toEqual([]);
  });

  test("explicit color branch emits canonical background-color and clears background-image", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: {
            mobile: { style: { backgroundType: "color", background: "rgba(142,232,255,.22)" } },
          },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    const rule = sectionContentRule(plan.css);
    expect(rule).toContain("background-color:rgba(142, 232, 255, 0.22) !important");
    expect(rule).toContain("background-image:none !important");
  });

  test("explicit none reset clears both paint declarations without interpolating the author string", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          style: {
            background: "#ffffff",
            backgroundType: "gradient",
            backgroundImage: null,
            accent: "#0d9488",
            radius: 0,
            shadow: "none",
          },
          responsive: { mobile: { style: { backgroundType: "none" } } },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    const rule = sectionContentRule(plan.css);
    expect(rule).toContain("background-color:transparent !important");
    expect(rule).toContain("background-image:none !important");
    expect(plan.css).not.toContain("linear-gradient");
  });
});

describe("per-device gradient + glow @media (TASK-531-01-L02)", () => {
  test("MOBILE-ONLY section glow override (no enum shadow) still emits a box-shadow rule (G-3b)", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: { mobile: { style: { glow: { color: "#8ee8ff", blur: 28 } } } },
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    expect(sectionContentRule(plan.css)).toContain(
      "box-shadow:0px 0px 28px 0px #8ee8ff !important"
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

  test("byte-identity: a doc with no per-device gradient/glow override emits identical css", () => {
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

describe("forbidden section responsive style keys (TASK-539-01 matrix)", () => {
  const FORBIDDEN_SECTION_KEYS = [
    "scrollEffect",
    "parallaxIntensity",
    "surfacePreset",
    "composition",
    "fullBleed",
    "noiseOverlay",
    "columnTemplate",
    "border",
  ] as const;

  test("write rejects every forbidden key at the exact responsive style path", () => {
    for (const key of FORBIDDEN_SECTION_KEYS) {
      const document = buildDocument([
        withResponsiveStyleKey(buildSection(), key, key === "fullBleed" ? true : "x"),
      ]);
      expect(() => normalizePageDocumentV2ForWrite(document)).toThrow(/^Invalid /);
    }
  });

  test("stored reads drop forbidden keys: no CSS or compatibility diagnostic, sibling still projects", () => {
    for (const key of FORBIDDEN_SECTION_KEYS) {
      // The forbidden key sits beside a valid `accent` sibling so the sibling
      // projection is observable after the stored read drops the forbidden key.
      const raw = buildDocument([
        withResponsiveStyleKey(
          buildSection({ responsive: { mobile: { style: { accent: "#123456" } } } }),
          key,
          key === "fullBleed" ? true : "x"
        ),
      ]);
      const stored = normalizeStoredPageDocumentV2ForRead(raw);
      const plan = buildPageResponsiveCssPlan(stored);
      expect(plan.css).toContain("--coderso-section-accent:#123456 !important");
      expect(plan.diagnostics).toEqual([]);
      expect(plan.css).not.toContain(key);
    }
  });
});

// A section hidden at the desktop base has no public markup; the block below it
// inherits the same absent state (fail-closed diagnostics, zero CSS).
describe("section markup-absent fail-closed", () => {
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
});
