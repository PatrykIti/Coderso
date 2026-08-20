/**
 * pageResponsiveCss facade, constants, orchestration, and identity suite
 * (TASK-539-06-L01 split).
 *
 * Keeps the stable facade export receipt, the exact media/attribute constants,
 * the one shared `:is(primary canonical selector, replica styling-only alias)`
 * selector path for frame / visual element / text / hoisted tilt-layer at both
 * tablet and mobile, and the orchestration-level behavior (media shells,
 * document-order rules, deterministic output, no-override byte identity,
 * trusted scope prefix). Section projection lives in
 * `page-responsive-css-section.test.ts`, block/placement in
 * `page-responsive-css-block.test.ts`, hostile cases in
 * `page-responsive-css-security.test.ts`.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  PAGE_BLOCK_ELEMENT_ATTRIBUTE,
  PAGE_BLOCK_ID_ATTRIBUTE,
  PAGE_BLOCK_TEXT_ATTRIBUTE,
  PAGE_SECTION_CONTENT_ATTRIBUTE,
  PAGE_SECTION_ID_ATTRIBUTE,
  PAGE_TILT_PARENT_LAYER_ATTRIBUTE,
  buildPageResponsiveCss,
  buildPageResponsiveCssPlan,
  isPageBlockVisualElementType,
  pageBlockVisualElementTypes,
  pageResponsiveCssBreakpoints,
  pageResponsiveMediaBounds,
  pageResponsiveMediaQueries,
  type PageBlockVisualElementType,
  type PageResponsiveCssBreakpoint,
  type PageResponsiveCssDiagnostic,
  type PageResponsiveCssDiagnosticReason,
  type PageResponsiveCssOptions,
  type PageResponsiveCssPlan,
} from "../../../core/services/pages/pageResponsiveCss";
import {
  PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE,
} from "../../../core/services/pages/pageRendererReplicaIdentity";
import { PAGE_BLOCK_GRID_ITEM_ATTRIBUTE } from "../../../core/services/pages/pageBlockGridPlacement";
import { normalizePageDocumentV2ForWrite } from "../../../core/services/pages/pageDocumentV2";
import { buildBlock, buildDocument, buildSection } from "./page-responsive-css-fixtures";

const FACADE_EXPORT_NAMES = [
  "PAGE_SECTION_ID_ATTRIBUTE",
  "PAGE_BLOCK_ID_ATTRIBUTE",
  "PAGE_SECTION_CONTENT_ATTRIBUTE",
  "PAGE_BLOCK_ELEMENT_ATTRIBUTE",
  "PAGE_BLOCK_TEXT_ATTRIBUTE",
  "PAGE_TILT_PARENT_LAYER_ATTRIBUTE",
  "pageBlockVisualElementTypes",
  "PageBlockVisualElementType",
  "isPageBlockVisualElementType",
  "pageResponsiveCssBreakpoints",
  "PageResponsiveCssBreakpoint",
  "pageResponsiveMediaBounds",
  "pageResponsiveMediaQueries",
  "PageResponsiveCssDiagnosticReason",
  "PageResponsiveCssDiagnostic",
  "PageResponsiveCssPlan",
  "PageResponsiveCssOptions",
  "buildPageResponsiveCssPlan",
  "buildPageResponsiveCss",
];

describe("pageResponsiveCss contract constants", () => {
  test("exposes the renderer attribute hooks and owned media bounds", () => {
    expect(PAGE_SECTION_ID_ATTRIBUTE).toBe("data-section-id");
    expect(PAGE_BLOCK_ID_ATTRIBUTE).toBe("data-block-id");
    expect(PAGE_SECTION_CONTENT_ATTRIBUTE).toBe("data-page-section-content");
    expect(PAGE_BLOCK_ELEMENT_ATTRIBUTE).toBe("data-page-block-element");
    expect(PAGE_BLOCK_TEXT_ATTRIBUTE).toBe("data-page-block-text");
    expect(PAGE_TILT_PARENT_LAYER_ATTRIBUTE).toBe("data-tilt-parent-for");
    expect(pageBlockVisualElementTypes).toEqual(["button", "image"]);
    expect(pageResponsiveCssBreakpoints).toEqual(["tablet", "mobile"]);
    expect(pageResponsiveMediaBounds).toEqual({
      tablet: { minWidth: 640, maxWidth: 1023 },
      mobile: { maxWidth: 639 },
    });
    expect(pageResponsiveMediaQueries.tablet).toBe("(min-width: 640px) and (max-width: 1023px)");
    expect(pageResponsiveMediaQueries.mobile).toBe("(max-width: 639px)");
  });

  test("stable facade export receipt: all 19 public names, no export *", () => {
    const facade = readFileSync("core/services/pages/pageResponsiveCss.ts", "utf8");
    // Only explicit `export { ... }` statements — never `export * from ...`.
    expect(facade).not.toMatch(/^\s*export\s+\*\s+from/m);
    for (const name of FACADE_EXPORT_NAMES) {
      expect(facade).toMatch(new RegExp(`export[\\s\\S]*\\b${name}\\b`));
    }
    // Compile-time receipt: every type is assignable through the facade.
    const typeSink: PageBlockVisualElementType = "button";
    const breakpointSink: PageResponsiveCssBreakpoint = "mobile";
    const planSink: PageResponsiveCssPlan = { css: "", diagnostics: [] };
    const optionsSink: PageResponsiveCssOptions = {};
    const diagSink: PageResponsiveCssDiagnostic = {
      scope: "block",
      id: "x",
      breakpoint: "tablet",
      key: "*",
      reason: "not_css_expressible",
    };
    const reasonSink: PageResponsiveCssDiagnosticReason = "unsafe_scope_id";
    expect(typeSink).toBe("button");
    expect(breakpointSink).toBe("mobile");
    expect(planSink).toEqual({ css: "", diagnostics: [] });
    expect(optionsSink).toEqual({});
    expect(diagSink.reason).toBe("not_css_expressible");
    expect(reasonSink).toBe("unsafe_scope_id");
    expect(isPageBlockVisualElementType("button")).toBe(true);
    expect(isPageBlockVisualElementType("container")).toBe(false);
  });

  test("replica alias constants resolve directly from their one owner with exact literals", () => {
    expect(PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE).toBe(
      "data-page-marquee-replica-block-style-scope"
    );
    expect(PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE).toBe(
      "data-page-marquee-replica-tilt-layer-style-scope"
    );
    // The declarations layer imports them directly; the facade must not
    // re-export them (stable facade surface stays at the 19-name receipt).
    const facade = readFileSync("core/services/pages/pageResponsiveCss.ts", "utf8");
    expect(facade).not.toContain("PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE");
    const declarations = readFileSync(
      "core/services/pages/pageResponsiveCssDeclarations.ts",
      "utf8"
    );
    expect(declarations).toContain('from "./pageRendererReplicaIdentity"');
    expect(declarations).toContain("PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE");
    expect(declarations).toContain("PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE");
    // The grid-item hook comes from the placement owner, never respelled.
    expect(declarations).toContain('from "./pageBlockGridPlacement"');
    expect(declarations).toContain("PAGE_BLOCK_GRID_ITEM_ATTRIBUTE");
    expect(PAGE_BLOCK_GRID_ITEM_ATTRIBUTE).toBe("data-page-block-grid-item");
  });

  test("static source contracts: no broad casts, no duplicated forbidden key lists", () => {
    const read = (file: string): string => readFileSync(`core/services/pages/${file}`, "utf8");
    const splitModules = [
      "pageResponsiveCss.ts",
      "pageResponsiveCssContracts.ts",
      "pageResponsiveCssDeclarations.ts",
      "pageResponsiveCssSection.ts",
      "pageResponsiveCssBlock.ts",
      "pageResponsiveCssOrchestration.ts",
    ];
    for (const file of splitModules) {
      const source = read(file);
      // Collectors consume the dedicated responsive types through the model
      // facade; never a local broad-style cast back to the base style.
      expect(source).not.toMatch(/as\s+Partial<PageSectionStyleV2>/);
      expect(source).not.toMatch(/as\s+Partial<PageBlockStyleV2>/);
    }
    // Forbidden responsive keys that have NO legitimate base-read seam in the
    // split modules must never be re-declared as local lists/literals.
    for (const forbidden of [
      "scrollEffect",
      "parallaxIntensity",
      "noiseOverlay",
      "columnTemplate",
      "tiltGlare",
      "revealDelay",
      "magnetic",
    ]) {
      for (const file of splitModules) {
        expect(read(file)).not.toContain(forbidden);
      }
    }
    // Collector/helper signatures consume the facade-owned responsive types
    // (imported through the explicit Page model facade).
    const block = read("pageResponsiveCssBlock.ts");
    const section = read("pageResponsiveCssSection.ts");
    expect(block).toMatch(/PageBlockResponsiveOverrideV2/);
    expect(block).toMatch(/from "\.\/pageDocumentV2"/);
    expect(section).toMatch(/PageSectionResponsiveOverrideV2/);
    expect(section).toMatch(/from "\.\/pageDocumentV2"/);
  });
});

describe("replica alias selector identity (TASK-539-05 seam)", () => {
  test("frame/visual-element/text/tilt-layer share one :is(canonical, alias) scope at both breakpoints", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
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
            // Text block: frame rule (width) + text-node rule (font-size).
            buildBlock({
              id: "blk_a",
              responsive: {
                tablet: { style: { width: "full", fontSize: "lg" } },
                mobile: { style: { width: "full", fontSize: "lg" } },
              },
            }),
            // Button block: inner visual element rule (text color).
            buildBlock({
              id: "blk_b",
              type: "button",
              props: { label: "Buy", href: "/buy", target: "self" },
              responsive: {
                tablet: { style: { textColor: "#111111" } },
                mobile: { style: { textColor: "#111111" } },
              },
            }),
            // Tilt+layer block: hoisted wrapper rule (layer delta).
            buildBlock({
              id: "blk_c",
              style: { layer: { x: 1, y: 2 }, tilt: "subtle" },
              responsive: {
                tablet: { style: { layer: { x: 5 } } },
                mobile: { style: { layer: { x: 5 } } },
              },
            }),
          ],
        }),
      ])
    );
    const css = buildPageResponsiveCss(document);

    const frameScope = `:is([data-block-id="blk_a"],[data-page-marquee-replica-block-style-scope="blk_a"])`;
    const elementScope = `:is([data-block-id="blk_b"],[data-page-marquee-replica-block-style-scope="blk_b"])`;
    const wrapperScope = `:is([data-tilt-parent-for="blk_c"],[data-page-marquee-replica-tilt-layer-style-scope="blk_c"])`;

    const countOf = (cssBody: string, needle: string): number => cssBody.split(needle).length - 1;

    // One shared rule per breakpoint — identical declarations for the canonical
    // and the replica alias arms, never duplicated primary/replica CSS.
    const frameRule = `${frameScope}{width:100% !important}`;
    const textRule = `${frameScope} [data-page-block-text="true"]{font-size:var(--text-lg`;
    const elementRule = `${elementScope} [data-page-block-element="true"]{--coderso-block-text:#111111 !important;color:#111111 !important}`;
    const wrapperRule = `${wrapperScope}{--layer-x:5% !important}`;
    expect(countOf(css, frameRule)).toBe(2);
    expect(countOf(css, "width:100% !important")).toBe(2);
    expect(countOf(css, textRule)).toBe(2);
    expect(countOf(css, elementRule)).toBe(2);
    expect(countOf(css, wrapperRule)).toBe(2);
    // Both arms carry the SAME canonical normalized block id value.
    expect(css).toContain('[data-page-marquee-replica-block-style-scope="blk_a"]');
    expect(css).toContain('[data-page-marquee-replica-tilt-layer-style-scope="blk_c"]');
    // The alias participates in the selector scope only — never a separate
    // declaration grammar (each declaration appears exactly once per breakpoint).
    expect(countOf(css, "--layer-x:5% !important")).toBe(2);
    expect(countOf(css, "color:#111111 !important")).toBe(2);
  });

  test("alias presence alone never causes CSS; an unauthored delta emits nothing", () => {
    // The alias arms exist in every shared selector, but a document without
    // authored deltas for a node emits zero rules for it.
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          blocks: [buildBlock({ id: "blk_idle", responsive: { tablet: { style: {} } } })],
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(document);
    expect(plan.css).toBe("");
    expect(plan.diagnostics).toEqual([]);
  });
});

describe("buildPageResponsiveCss orchestration", () => {
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

  test("no-override output is byte-identical: empty css and empty diagnostics", () => {
    const plan = buildPageResponsiveCssPlan(buildDocument([buildSection()]));
    expect(plan).toEqual({ css: "", diagnostics: [] });
    // An unrelated legacy-style document (base-only effects, no responsive
    // deltas) also emits zero bytes — no new facade byte for unauthored docs.
    const legacy = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          style: {
            background: "#fff",
            backgroundType: "color",
            backgroundImage: null,
            accent: "#000",
            radius: 0,
            shadow: "none",
            fullBleed: true,
            composition: "layered",
          },
          blocks: [
            buildBlock({
              style: { tilt: "subtle", layer: { x: 10 }, colSpan: 2, marquee: { speed: 18 } },
            }),
          ],
        }),
      ])
    );
    expect(buildPageResponsiveCssPlan(legacy)).toEqual({ css: "", diagnostics: [] });
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

  test("applies the optional trusted outer scope to each completed selector exactly once", () => {
    const document = normalizePageDocumentV2ForWrite(
      buildDocument([
        buildSection({
          responsive: { mobile: { layout: { maxWidth: 360 }, spacing: { gap: 8 } } },
          blocks: [buildBlock({ responsive: { mobile: { style: { width: "full" } } } })],
        }),
      ])
    );
    const css = buildPageResponsiveCss(document, {
      scopeSelector: '[data-site-footer="true"]',
    });
    // Declarations are alpha-sorted (gap < max-width) like every other rule.
    expect(css).toContain(
      '[data-site-footer="true"] [data-section-id="sec_hero"] > [data-page-section-content="true"]{gap:8px !important;max-width:360px !important}'
    );
    expect(css).toContain(
      '[data-site-footer="true"] :is([data-block-id="blk_text"],[data-page-marquee-replica-block-style-scope="blk_text"]){width:100% !important}'
    );
    // The prefix appears exactly once per rule — never doubled.
    expect(css.match(/data-site-footer="true"\] \[data-section-id/g)).toHaveLength(1);
    expect(css.match(/data-site-footer="true"\] :is/g)).toHaveLength(1);
  });
});
