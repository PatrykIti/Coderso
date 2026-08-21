/**
 * Placement-gated grid span emission (TASK-539-03-L05 rebaseline).
 *
 * The TASK-539-03 renderer leaf replaced the pre-539 `:is([data-block-id],
 * [data-tilt-parent])` direct-child grammar with ONE canonical
 * `data-page-block-grid-item` hook stamped on every legal grid item (direct
 * block frames AND hoisted tilt wrappers) plus the section-template wrapper.
 * The responsive builder rebaselines onto that single hook: the mobile
 * `stackVertical` reset clears base spans through the placement-gated selector
 * and per-device span deltas project onto the exact same attribute. Nothing is
 * weakened: stack resets, footer scoping, clamps, and the no-authored-span
 * no-op all keep their original strength.
 */

import { describe, expect, test } from "vitest";

import { buildPageResponsiveCss } from "../../../core/services/pages/pageResponsiveCss";
import { normalizePageDocumentV2ForWrite } from "../../../core/services/pages/pageDocumentV2";
import { buildBlock, buildDocument, buildSection } from "./page-responsive-css-fixtures";

const block = (overrides: Parameters<typeof buildBlock>[0] = {}): ReturnType<typeof buildBlock> =>
  buildBlock({ id: "span-block", ...overrides });

const documentWith = (
  blocks: ReturnType<typeof buildBlock>[],
  responsive: NonNullable<Parameters<typeof buildSection>[0]>["responsive"] = {}
) =>
  normalizePageDocumentV2ForWrite(
    buildDocument([
      buildSection({
        id: "span-section",
        type: "content",
        layout: { columns: 4, align: "start", justify: "start", maxWidth: 1080 },
        responsive,
        blocks,
      }),
    ])
  );

describe("page responsive grid spans", () => {
  test("stackVertical resets base spans on the canonical grid items (frames and tilt wrappers)", () => {
    const css = buildPageResponsiveCss(
      documentWith([block({ style: { colSpan: 4, rowSpan: 3, tilt: "subtle" } })], {
        mobile: { layout: { stackVertical: true } },
      })
    );

    expect(css).toContain(
      '[data-section-id="span-section"] > [data-page-section-content="true"]{grid-template-columns:repeat(1, minmax(0, 1fr)) !important}'
    );
    // The renderer stamps data-page-block-grid-item on every direct grid item
    // — the block frame AND the hoisted tilt wrapper — so the placement-gated
    // reset reaches both without the pre-539 :is([data-block-id],[data-tilt-parent])
    // child grammar and without ever touching nested or non-grid nodes.
    expect(css).toContain(
      '[data-section-id="span-section"] > [data-page-section-content="true"] > [data-page-block-grid-item]{grid-column:span 1 !important;grid-row:span 1 !important}'
    );
    expect(css).not.toContain(":is([data-block-id],[data-tilt-parent])");
  });

  test("keeps stack reset footer-scoped without an unscoped selector branch", () => {
    const css = buildPageResponsiveCss(
      documentWith([block({ style: { colSpan: 4 } })], {
        mobile: { layout: { stackVertical: true } },
      }),
      { scopeSelector: '[data-site-footer="true"]' }
    );

    const reset =
      '[data-site-footer="true"] [data-section-id="span-section"] > [data-page-section-content="true"] > [data-page-block-grid-item]{grid-column:span 1 !important;grid-row:span 1 !important}';
    expect(css).toContain(reset);
    expect(css.replace(reset, "")).not.toContain(
      '[data-section-id="span-section"] > [data-page-section-content="true"] > [data-page-block-grid-item]'
    );
  });

  test("projects explicit per-device spans through the normalized clamp onto the canonical hook", () => {
    const css = buildPageResponsiveCss(
      documentWith([
        block({
          style: { colSpan: 1, rowSpan: 4, tilt: "subtle" },
          responsive: { mobile: { style: { colSpan: 99, rowSpan: 0 } } },
        }),
      ])
    );

    // Clamped integers (99 → 4, 0 → 1) on the ONE canonical grid-item hook;
    // the tilt wrapper is a legal grid item too, but the attribute (not a
    // :has() family) is the shared target — no pre-539 grammar remains.
    expect(css).toContain(
      '[data-page-block-grid-item="span-block"]{grid-column:span 4 !important;grid-row:span 1 !important}'
    );
    expect(css).not.toContain(":has(");
    expect(css).not.toContain(":is([data-block-id],[data-tilt-parent])");
  });

  test("emits no span CSS when neither stack nor responsive spans are authored", () => {
    expect(buildPageResponsiveCss(documentWith([block({ style: { colSpan: 4 } })]))).toBe("");
  });
});
