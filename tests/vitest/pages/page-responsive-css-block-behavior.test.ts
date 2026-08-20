/**
 * Responsive CSS BLOCK behavior suite (TASK-539-06-L01 split, part 2).
 *
 * Per-device layer offsets (present-key deltas, zero resets, no responsive
 * anchor path, tilt-wrapper retarget), per-device surface tint glow,
 * per-device block gradient + glow (TASK-531, canonical TASK-541 bytes),
 * placement-gated grid spans (TASK-539-03-L05 contract), `style.column`
 * structural fail-closed, and the forbidden block-style key matrix (9 keys).
 * Block frame/element/text projection and typography live in
 * `page-responsive-css-block.test.ts`.
 */

import { describe, expect, test } from "vitest";

import {
  buildPageResponsiveCss,
  buildPageResponsiveCssPlan,
} from "../../../core/services/pages/pageResponsiveCss";
import { PAGE_BLOCK_GRID_ITEM_ATTRIBUTE } from "../../../core/services/pages/pageBlockGridPlacement";
import {
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
} from "../../../core/services/pages/pageDocumentV2";
import {
  buildBlock,
  buildDocument,
  buildSection,
  frameScope,
  withResponsiveStyleKey,
} from "./page-responsive-css-fixtures";

const CTA_CARD =
  "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)";

describe("per-device layer offsets (TASK-522-05-L02 seam)", () => {
  test("a tablet layer.x/y override emits present-only --layer-* deltas on the block-frame scope", () => {
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
            // per-device reposition must reach the SAME frame scope that carries
            // data-layer + the base --layer-x (finding 4).
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
    expect(css).toContain(
      `${frameScope("blk_layer")}{--layer-x:80% !important;--layer-y:40% !important}`
    );
  });

  test("present-only: a device x override never re-emits inherited base y/z", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_present",
            style: { layer: { x: 10, y: 20, z: 3 } },
            responsive: { tablet: { style: { layer: { x: 80 } } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    // Only the authored x delta emits; inherited base y/z stay on the desktop
    // inline declaration (the frame rule carries exactly one --layer-* prop).
    expect(css).toContain(`${frameScope("blk_present")}{--layer-x:80% !important}`);
    expect(css).not.toContain("--layer-y");
    expect(css).not.toContain("--layer-z");
  });

  test("zero is a present reset and must emit", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_zero",
            style: { layer: { x: 80, y: 40 } },
            responsive: { tablet: { style: { layer: { x: 0, y: 0 } } } },
          }),
        ],
      }),
    ]);
    const css = buildPageResponsiveCss(document);
    expect(css).toContain(
      `${frameScope("blk_zero")}{--layer-x:0% !important;--layer-y:0% !important}`
    );
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

  test("responsive anchor has no declaration path (defense-in-depth)", () => {
    // Raw input carrying `anchor` on the responsive layer: the builder only
    // ever emits present x/y/z — never an anchor declaration.
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_defensive",
            style: { layer: { x: 10 } },
            responsive: {
              tablet: {
                style: {
                  layer: {
                    x: 5,
                    anchor: "top-left",
                  } as never,
                },
              },
            },
          }),
        ],
      }),
    ]);
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toContain(`${frameScope("blk_defensive")}{--layer-x:5% !important}`);
    expect(plan.css).not.toContain("top-left");
    expect(plan.css).not.toContain("--layer-anchor");
    // anchor never produces a declaration or a diagnostic (model-forbidden,
    // dropped at write; the builder has no anchor grammar at all).
    expect(plan.diagnostics).toEqual([]);
  });

  test("TASK-535 — tilt+layer: the tablet layer override targets the hoisted WRAPPER, not the frame", () => {
    // When a block authors BOTH tilt AND layer, the renderer HOISTS the base
    // --layer-* onto the [data-tilt-parent] wrapper (a per-device value on the
    // child frame could never inherit UP to the wrapper that consumes
    // var(--layer-*)). The per-device override must therefore land on the
    // wrapper scope, NOT the frame scope.
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
    expect(css).toContain(
      `:is([data-tilt-parent-for="blk_tilt_layer"],[data-page-marquee-replica-tilt-layer-style-scope="blk_tilt_layer"]){--layer-x:80% !important;--layer-y:40% !important}`
    );
    // Regression guard: the layer delta must NOT be emitted on the frame scope
    // (where it would be DEAD — it can never inherit up to the wrapper).
    expect(css).not.toContain(`${frameScope("blk_tilt_layer")}{--layer-x`);
  });
});

describe("per-device surface tint glow (TASK-524-02-L03 seam)", () => {
  test("a tablet surfaceTint override emits --surface-glow/--deco-ring/--orb-color !important on the frame scope", () => {
    const document = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_tint",
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
    expect(css).toContain(`${frameScope("blk_tint")}{`);
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
});

describe("per-device block gradient + glow (TASK-531-01-L02)", () => {
  test("BLOCK per-device multi-layer gradient override paints via the structured split", () => {
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
    expect(plan.css).toContain(`background-image:${CTA_CARD} !important`);
    expect(plan.css).toContain("background-color:transparent !important");
    expect(plan.diagnostics).toEqual([]);
  });

  test("MOBILE-ONLY block glow override (no enum shadow) still emits a box-shadow rule (G-3b)", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
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
    // TASK-541 canonical spaced bytes (same class as the 05-L01 renderer leaf
    // re-baseline: the composer re-sanitizes the color).
    expect(plan.css).toContain(
      `${frameScope("blk_text")}{box-shadow:0px 18px 45px 0px rgba(142, 232, 255, 0.22) !important}`
    );
    expect(plan.diagnostics).toEqual([]);
  });
});

describe("placement-gated grid spans (TASK-539-03-L05 contract)", () => {
  test("legal block-frame placement targets the canonical grid-item attribute only", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          layout: { columns: 4, align: "start", justify: "start", maxWidth: 1080 },
          blocks: [
            buildBlock({
              id: "sp",
              style: { colSpan: 1 },
              responsive: { mobile: { style: { colSpan: 99, rowSpan: 0 } } },
            }),
          ],
        }),
      ])
    );
    const css = buildPageResponsiveCss(document);
    // Clamped integers (colSpan 99 → 4, rowSpan 0 → 1) on the canonical hook.
    expect(css).toContain(
      `[${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="sp"]{grid-column:span 4 !important;grid-row:span 1 !important}`
    );
    // Never the pre-539 :has() wrapper grammar, never a replica grid alias.
    expect(css).not.toContain(":has(");
    expect(css).not.toContain("data-page-marquee-replica");
  });

  test("legal section-template-wrapper placement shares the same canonical hook", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          id: "sec_timeline",
          type: "timeline",
          variant: "default",
          blocks: [
            buildBlock({
              id: "tl_item",
              style: { colSpan: 2 },
              responsive: { mobile: { style: { colSpan: 3 } } },
            }),
          ],
        }),
      ])
    );
    const css = buildPageResponsiveCss(document);
    // Timeline template chrome is a legal grid target: the wrapper carries the
    // same canonical attribute, so the span rule uses the shared selector.
    expect(css).toContain(
      `[${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="tl_item"]{grid-column:span 3 !important}`
    );
  });

  test("every none class diagnoses each authored span key without inert CSS", () => {
    // Nested slot child (path length > 1) → placement none.
    const nestedDoc = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          blocks: [
            buildBlock({
              id: "outer",
              type: "container",
              props: {},
              slots: {
                children: [
                  buildBlock({
                    id: "inner",
                    responsive: { mobile: { style: { colSpan: 2, rowSpan: 2 } } },
                  }),
                ],
              },
            }),
          ],
        }),
      ])
    );
    const nestedPlan = buildPageResponsiveCssPlan(nestedDoc);
    expect(nestedPlan.css).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE);
    expect(nestedPlan.diagnostics).toContainEqual({
      scope: "block",
      id: "inner",
      breakpoint: "mobile",
      key: "style.colSpan",
      reason: "not_css_expressible",
    });
    expect(nestedPlan.diagnostics).toContainEqual({
      scope: "block",
      id: "inner",
      breakpoint: "mobile",
      key: "style.rowSpan",
      reason: "not_css_expressible",
    });

    // Real per-column composition (>= 2 columns + a visible assigned root) → none.
    const perColumnDoc = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          type: "content",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
          blocks: [
            buildBlock({
              id: "assigned",
              style: { column: 1 },
              responsive: { mobile: { style: { colSpan: 2 } } },
            }),
            buildBlock({ id: "auto", style: { colSpan: 2 } }),
          ],
        }),
      ])
    );
    const perColumnPlan = buildPageResponsiveCssPlan(perColumnDoc);
    expect(perColumnPlan.css).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE);
    expect(perColumnPlan.diagnostics).toContainEqual({
      scope: "block",
      id: "assigned",
      breakpoint: "mobile",
      key: "style.colSpan",
      reason: "not_css_expressible",
    });

    // Non-default media-split variant → none.
    const mediaSplitDoc = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          type: "media-split",
          variant: "split",
          blocks: [
            buildBlock({
              id: "ms",
              style: { colSpan: 2 },
              responsive: { mobile: { style: { colSpan: 2 } } },
            }),
          ],
        }),
      ])
    );
    const mediaSplitPlan = buildPageResponsiveCssPlan(mediaSplitDoc);
    expect(mediaSplitPlan.css).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE);
    expect(mediaSplitPlan.diagnostics).toContainEqual({
      scope: "block",
      id: "ms",
      breakpoint: "mobile",
      key: "style.colSpan",
      reason: "not_css_expressible",
    });
  });

  test("a hidden assigned sibling is excluded from the public visible-root classification", () => {
    // Public policy (includeHiddenBlocks:false): the hidden sibling's column
    // assignment cannot opt the section into per-column composition, so the
    // visible root keeps its legal block-frame placement.
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          type: "content",
          layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
          blocks: [
            buildBlock({
              id: "hidden_assigned",
              visibility: { visible: false },
              style: { column: 1 },
            }),
            buildBlock({
              id: "visible_span",
              style: { colSpan: 2 },
              responsive: { mobile: { style: { colSpan: 2 } } },
            }),
          ],
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toContain(
      `[${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="visible_span"]{grid-column:span 2 !important}`
    );
    // No grid CSS for the hidden sibling (its base-only assignment is not a
    // responsive delta and its hidden state excludes it from the view).
    expect(plan.css).not.toContain("hidden_assigned");
  });

  test("base-only span, responsive-only span, and wholly unauthored span handoff", () => {
    // Base-only span: the renderer stamps the hook (hasAnySpan across
    // base/tablet/mobile), but there is no per-device delta → zero span CSS.
    const baseOnly = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          blocks: [buildBlock({ id: "base_only", style: { colSpan: 4 } })],
        }),
      ])
    );
    expect(buildPageResponsiveCss(baseOnly)).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE);

    // Responsive-only span: no base span, but the mobile delta is a legal
    // per-device projection onto the real DOM target.
    const responsiveOnly = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          blocks: [
            buildBlock({ id: "resp_only", responsive: { mobile: { style: { colSpan: 3 } } } }),
          ],
        }),
      ])
    );
    const respCss = buildPageResponsiveCss(responsiveOnly);
    expect(respCss).toContain(
      `[${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="resp_only"]{grid-column:span 3 !important}`
    );

    // Wholly unauthored span: no base/tablet/mobile span anywhere → the
    // renderer stamps no hook and the builder emits neither hook nor CSS.
    const none = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          blocks: [buildBlock({ id: "no_span" })],
        }),
      ])
    );
    expect(buildPageResponsiveCss(none)).toBe("");
  });

  test("a safe marquee outer group owns the one canonical grid hook; duplicated descendants emit none", () => {
    // The authored outer group is the one legal root grid target outside both
    // replica segments. Base-only span: the renderer stamps the hook, but no
    // per-device delta means zero span CSS — and no grid hook/alias/span CSS
    // for the duplicated rail descendants (nested path → placement none).
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          type: "content",
          layout: { columns: 4, align: "start", justify: "start", maxWidth: 1080 },
          blocks: [
            buildBlock({
              id: "mrq_owner",
              type: "group",
              props: { direction: "row", wrap: false, gap: 16 },
              style: { marquee: { speed: 18, direction: "left", seamless: true }, colSpan: 2 },
              slots: {
                children: [
                  buildBlock({ id: "mrq_child_a", type: "text", props: { text: "A" } }),
                  buildBlock({ id: "mrq_child_b", type: "text", props: { text: "B" } }),
                ],
              },
            }),
          ],
        }),
      ])
    );
    const css = buildPageResponsiveCss(document);
    expect(css).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE);
    expect(css).not.toContain("grid-column");
    expect(css).not.toContain("data-page-marquee-replica");

    // With a per-device span on the owner, the single canonical hook emits.
    const responsiveOwner = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          type: "content",
          layout: { columns: 4, align: "start", justify: "start", maxWidth: 1080 },
          blocks: [
            buildBlock({
              id: "mrq_owner2",
              type: "group",
              props: { direction: "row", wrap: false, gap: 16 },
              style: { marquee: { speed: 18, direction: "left", seamless: true } },
              responsive: { mobile: { style: { colSpan: 4 } } },
              slots: {
                children: [buildBlock({ id: "mrq_child_c", type: "text", props: { text: "C" } })],
              },
            }),
          ],
        }),
      ])
    );
    const ownerCss = buildPageResponsiveCss(responsiveOwner);
    expect(ownerCss).toContain(
      `[${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="mrq_owner2"]{grid-column:span 4 !important}`
    );
    // The child never becomes a grid item (nested path → none), and there is
    // no replica grid alias anywhere.
    expect(ownerCss).not.toContain(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE + '="mrq_child');
    expect(ownerCss).not.toContain("data-page-marquee-replica-tilt-layer-style-scope");
  });
});

describe("style.column (owner finding #5 round 3)", () => {
  test("style.column overrides are structural and fail closed into not_css_expressible diagnostics", () => {
    const document = buildDocument([
      buildSection({
        layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
        blocks: [
          buildBlock({
            id: "blk_column_move",
            style: { column: 1 },
            responsive: {
              tablet: { style: { column: 2 } },
              mobile: { style: { column: null } },
            },
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
});

describe("forbidden block responsive style keys (TASK-539-01 matrix)", () => {
  const FORBIDDEN_BLOCK_KEYS = [
    "decoration",
    "tilt",
    "tiltGlare",
    "surfacePreset",
    "hoverEffect",
    "marquee",
    "composition",
    "revealDelay",
    "magnetic",
  ] as const;

  test("write rejects every forbidden key at the exact responsive style path", () => {
    for (const key of FORBIDDEN_BLOCK_KEYS) {
      const document = buildDocument([
        buildSection({
          blocks: [withResponsiveStyleKey(buildBlock(), key, key === "tiltGlare" ? true : "x")],
        }),
      ]);
      expect(() => normalizePageDocumentV2ForWrite(document)).toThrow(/^Invalid /);
    }
  });

  test("stored reads drop forbidden keys: no CSS or compatibility diagnostic, valid siblings still project", () => {
    for (const key of FORBIDDEN_BLOCK_KEYS) {
      const raw = buildDocument([
        buildSection({
          blocks: [
            withResponsiveStyleKey(
              buildBlock({
                responsive: { mobile: { style: { width: "full" } } },
              }),
              key,
              key === "tiltGlare" ? true : "x"
            ),
          ],
        }),
      ]);
      const stored = normalizeStoredPageDocumentV2ForRead(raw);
      const plan = buildPageResponsiveCssPlan(stored);
      expect(plan.css).toContain(`${frameScope("blk_text")}{width:100% !important}`);
      expect(plan.diagnostics).toEqual([]);
      // No declaration ever derives from the forbidden key. The `marquee`
      // literal legitimately appears inside the replica styling-only alias
      // attribute name, so it is asserted by its declaration/flag shape.
      if (key === "marquee") {
        expect(plan.css).not.toContain("style.marquee");
        expect(plan.css).not.toContain("--marquee");
      } else {
        expect(plan.css).not.toContain(key);
      }
    }
  });
});
