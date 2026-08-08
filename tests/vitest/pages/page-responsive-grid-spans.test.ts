import { describe, expect, test } from "vitest";

import { buildPageResponsiveCss } from "../../../core/services/pages/pageResponsiveCss";
import {
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
  normalizePageDocumentV2ForWrite,
} from "../../../core/services/pages/pageDocumentV2";

const block = (overrides: Partial<PageBlockV2> = {}): PageBlockV2 => ({
  id: "span-block",
  type: "text",
  props: { text: "Copy", format: "plain", align: "left" },
  visibility: { visible: true },
  ...overrides,
});

const documentWith = (
  blocks: PageBlockV2[],
  responsive: PageSectionV2["responsive"] = {}
): PageDocumentV2 =>
  normalizePageDocumentV2ForWrite({
    schemaVersion: 2,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: { template: "page-v2", showInNav: true },
    sections: [
      {
        id: "span-section",
        type: "content",
        name: "Spans",
        variant: "default",
        layout: { columns: 4, align: "start", justify: "start", maxWidth: 1080 },
        style: {
          background: "#ffffff",
          backgroundType: "color",
          backgroundImage: null,
          accent: "#0d9488",
          radius: 0,
          shadow: "none",
        },
        spacing: {
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          gap: 16,
        },
        visibility: {
          visible: true,
          authOnly: false,
          anchor: null,
          startsAt: null,
          endsAt: null,
        },
        responsive,
        blocks,
      },
    ],
  });

describe("page responsive grid spans", () => {
  test("stackVertical resets base spans on direct frames and tilt wrappers", () => {
    const css = buildPageResponsiveCss(
      documentWith([block({ style: { colSpan: 4, rowSpan: 3, tilt: "subtle" } })], {
        mobile: { layout: { stackVertical: true } },
      })
    );

    expect(css).toContain(
      '[data-section-id="span-section"] > [data-page-section-content="true"]{grid-template-columns:repeat(1, minmax(0, 1fr)) !important}'
    );
    expect(css).toContain(
      '[data-section-id="span-section"] > [data-page-section-content="true"] > :is([data-block-id],[data-tilt-parent]){grid-column:span 1 !important;grid-row:span 1 !important}'
    );
  });

  test("keeps stack reset footer-scoped without an unscoped selector branch", () => {
    const css = buildPageResponsiveCss(
      documentWith([block({ style: { colSpan: 4 } })], {
        mobile: { layout: { stackVertical: true } },
      }),
      { scopeSelector: '[data-site-footer="true"]' }
    );

    const reset =
      '[data-site-footer="true"] [data-section-id="span-section"] > [data-page-section-content="true"] > :is([data-block-id],[data-tilt-parent]){grid-column:span 1 !important;grid-row:span 1 !important}';
    expect(css).toContain(reset);
    expect(css.replace(reset, "")).not.toContain(
      '[data-section-id="span-section"] > [data-page-section-content="true"] > :is([data-block-id],[data-tilt-parent])'
    );
  });

  test("projects explicit per-device spans through the normalized clamp", () => {
    const css = buildPageResponsiveCss(
      documentWith([
        block({
          style: { colSpan: 1, rowSpan: 4, tilt: "subtle" },
          responsive: { mobile: { style: { colSpan: 99, rowSpan: 0 } } },
        }),
      ])
    );

    expect(css).toContain(
      ':is([data-block-id="span-block"],[data-tilt-parent]:has(> [data-block-id="span-block"])){grid-column:span 4 !important;grid-row:span 1 !important}'
    );
  });

  test("emits no span CSS when neither stack nor responsive spans are authored", () => {
    expect(buildPageResponsiveCss(documentWith([block({ style: { colSpan: 4 } })]))).toBe("");
  });
});
