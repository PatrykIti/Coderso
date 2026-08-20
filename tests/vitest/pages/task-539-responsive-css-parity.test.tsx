/**
 * TASK-539-06-L02 — responsive CSS PARITY proof (owner TASK-539-06-L01).
 *
 * For every authored responsive delta this suite computes the breakpoint
 * resolver's effective values (`resolvePageDocumentForBreakpoint`) on the
 * same normalized stored document and asserts the public CSS delta (and its
 * diagnostics) match byte-for-byte. CSS proofs are paired with real rendered
 * markup (`PageSectionContent`) so selectors that claim to target a node are
 * proven against the node the renderer actually stamps.
 *
 * ADDITIVE PROOF, not a second source; no L01 re-baseline, no source fix.
 * Sole-writer scope: this file only.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  PAGE_BLOCK_GRID_ITEM_ATTRIBUTE,
  resolvePageBlockGridPlacement,
  type PageBlockGridPlacementTarget,
} from "../../../core/services/pages/pageBlockGridPlacement";
import type { PageBlockPath } from "../../../core/services/pages/pageBlockPaths";
import {
  PAGE_BLOCK_SPAN_CLAMP,
  mergePageBlockLayerPresentKeys,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  resolvePageDocumentForBreakpoint,
  type PageBlockResponsiveLayerV2,
  type PageBlockResponsiveStyleV2,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionResponsiveStyleV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";
import {
  parseAuthoringCssBackgroundPaint,
  sanitizeAuthoringCssFontSize,
} from "../../../core/services/pages/pageAuthoringSanitizers";
import { composeGlowBoxShadow, mergeShadows } from "../../../core/services/pages/pageGlow";
import {
  PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE,
} from "../../../core/services/pages/pageRendererReplicaIdentity";
import {
  buildPageResponsiveCssPlan,
  PAGE_TILT_PARENT_LAYER_ATTRIBUTE,
  type PageResponsiveCssDiagnostic,
} from "../../../core/services/pages/pageResponsiveCss";
import { PageSectionContent } from "../../../core/services/pages/pageRendererV2";
import {
  buildBlock,
  buildDocument,
  buildSection,
  elementScope,
  frameScope,
  textScope,
  withResponsiveStyleKey,
} from "./page-responsive-css-fixtures";

const stored = (document: PageDocumentV2): PageDocumentV2 =>
  normalizeStoredPageDocumentV2ForRead(document);

const countOf = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

const diag = (
  scope: PageResponsiveCssDiagnostic["scope"],
  id: string,
  breakpoint: PageResponsiveCssDiagnostic["breakpoint"],
  key: string,
  reason: PageResponsiveCssDiagnostic["reason"]
): PageResponsiveCssDiagnostic => ({ scope, id, breakpoint, key, reason });

/** One stored document with a single plain section and the given blocks. */
const plainDoc = (blocks: PageBlockV2[]): PageDocumentV2 =>
  stored(buildDocument([buildSection({ blocks })]));

const tiltLayerScope = (id: string): string =>
  `:is([${PAGE_TILT_PARENT_LAYER_ATTRIBUTE}="${id}"],[${PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE}="${id}"])`;

const gridItemScope = (id: string): string => `[${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="${id}"]`;

const sectionContentScope = (id: string): string =>
  `[data-section-id="${id}"] > [data-page-section-content="true"]`;

const sectionRootScope = (id: string): string => `[data-section-id="${id}"]`;

const placementOf = (section: PageSectionV2, index: number): PageBlockGridPlacementTarget =>
  resolvePageBlockGridPlacement(section, [{ index }] as PageBlockPath, {
    includeHiddenBlocks: false,
  });

const mediaShell = (breakpoint: "tablet" | "mobile", rules: string[]): string =>
  [
    breakpoint === "tablet"
      ? "@media (min-width: 640px) and (max-width: 1023px){"
      : "@media (max-width: 639px){",
    ...rules,
    "}",
  ].join("\n");

type BuildSectionInput = NonNullable<Parameters<typeof buildSection>[0]>;

/** One stored 4-column content-grid document. */
const contentDoc = (
  blocks: PageBlockV2[],
  responsive: BuildSectionInput["responsive"] = {}
): PageDocumentV2 =>
  stored(
    buildDocument([
      buildSection({
        type: "content",
        layout: { columns: 4, align: "start", justify: "start", maxWidth: 1080 },
        blocks,
        responsive,
      }),
    ])
  );

/** One stored 2-column content-grid document. */
const twoColDoc = (blocks: PageBlockV2[]): PageDocumentV2 =>
  stored(
    buildDocument([
      buildSection({
        type: "content",
        layout: { columns: 2, align: "start", justify: "start", maxWidth: 1080 },
        blocks,
      }),
    ])
  );

/** One stored generic section with a type and variant. */
const sectionDoc = (
  type: BuildSectionInput["type"],
  variant: BuildSectionInput["variant"],
  blocks: PageBlockV2[]
): PageDocumentV2 => stored(buildDocument([buildSection({ type, variant, blocks })]));

/** A legal approved seamless marquee owner group (safe text/heading children). */
const marqueeGroup = (
  id: string,
  children: PageBlockV2[],
  extraStyle: Record<string, unknown> = {},
  responsive: NonNullable<Parameters<typeof buildBlock>[0]>["responsive"] = {}
): PageBlockV2 =>
  buildBlock({
    id,
    type: "group",
    props: { direction: "row", wrap: false, gap: 16 },
    style: { marquee: { speed: 18, direction: "left", seamless: true }, ...extraStyle },
    slots: { children },
    responsive,
  });

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

describe("1. facade-owned responsive types + forbidden-key parity (TASK-539-01 owner)", () => {
  test("plan inputs consume the facade-owned responsive types; never raw broad casts", () => {
    const sectionStyleSink: PageSectionResponsiveStyleV2 = { accent: "#123456" };
    const blockStyleSink: PageBlockResponsiveStyleV2 = { width: "full", layer: { x: 5 } };
    const layerSink: PageBlockResponsiveLayerV2 = { x: 0, y: 0, z: 0 };
    expect(sectionStyleSink.accent).toBe("#123456");
    expect(blockStyleSink.layer?.x).toBe(5);
    expect(layerSink.z).toBe(0);
    // @ts-expect-error anchor is never allowed in a responsive layer delta
    const rejectedAnchor: PageBlockResponsiveLayerV2 = { x: 1, anchor: "top-left" };
    // @ts-expect-error tilt is never allowed in a responsive style override
    const rejectedTilt: PageBlockResponsiveStyleV2 = { tilt: "subtle" };
    expect(rejectedAnchor.x).toBe(1);
    expect(rejectedTilt).toEqual({ tilt: "subtle" });
  });

  test("all 17 forbidden keys reject on write, vanish on stored read, sibling projects", () => {
    for (const key of FORBIDDEN_SECTION_KEYS) {
      const raw = buildDocument([
        withResponsiveStyleKey(
          buildSection({ responsive: { mobile: { style: { accent: "#123456" } } } }),
          key,
          key === "fullBleed" ? true : "x"
        ),
      ]);
      expect(() => normalizePageDocumentV2ForWrite(raw)).toThrow(/^Invalid /);
      const storedDoc = stored(raw);
      const plan = buildPageResponsiveCssPlan(storedDoc);
      expect(plan.css).toContain("--coderso-section-accent:#123456 !important");
      expect(plan.diagnostics).toEqual([]);
      const effective = resolvePageDocumentForBreakpoint(storedDoc, "mobile").sections[0]!.style;
      expect(effective.accent).toBe("#123456");
      expect(Object.keys(effective)).not.toContain(key);
    }
    for (const key of FORBIDDEN_BLOCK_KEYS) {
      const raw = buildDocument([
        buildSection({
          blocks: [
            withResponsiveStyleKey(
              buildBlock({ responsive: { mobile: { style: { width: "full" } } } }),
              key,
              key === "tiltGlare" ? true : "x"
            ),
          ],
        }),
      ]);
      expect(() => normalizePageDocumentV2ForWrite(raw)).toThrow(/^Invalid /);
      const storedDoc = stored(raw);
      const plan = buildPageResponsiveCssPlan(storedDoc);
      expect(plan.css).toContain(`${frameScope("blk_text")}{width:100% !important}`);
      expect(plan.diagnostics).toEqual([]);
      if (key === "marquee") {
        expect(plan.css).not.toContain("style.marquee");
        expect(plan.css).not.toContain("--marquee");
      }
      const effective = resolvePageDocumentForBreakpoint(storedDoc, "mobile").sections[0]!
        .blocks[0]!.style;
      expect(effective?.width).toBe("full");
      expect(Object.keys(effective ?? {})).not.toContain(key);
    }
  });
});

describe("2. layer present-key parity (base y/z/anchor stay, device x only)", () => {
  test("device x deltas match the merged effective layer; only present keys emit, zeros included", () => {
    const xOnly = plainDoc([
      buildBlock({
        id: "blk_present",
        style: { layer: { x: 10, y: 20, z: 3, anchor: "top-right" } },
        responsive: { tablet: { style: { layer: { x: 80 } } } },
      }),
    ]);
    // Model-owner merge + resolver parity: the present x wins; inherited base
    // y/z/anchor stay effective through the base inline declaration.
    expect(
      mergePageBlockLayerPresentKeys(
        xOnly.sections[0]!.blocks[0]!.style!.layer,
        xOnly.sections[0]!.blocks[0]!.responsive!.tablet!.style!.layer
      )
    ).toEqual({ x: 80, y: 20, z: 3, anchor: "top-right" });
    expect(
      resolvePageDocumentForBreakpoint(xOnly, "tablet").sections[0]!.blocks[0]!.style!.layer
    ).toEqual({ x: 80, y: 20, z: 3, anchor: "top-right" });
    expect(buildPageResponsiveCssPlan(xOnly).css).toBe(
      mediaShell("tablet", [`${frameScope("blk_present")}{--layer-x:80% !important}`])
    );

    const zeroReset = contentDoc([
      buildBlock({
        id: "blk_zero",
        style: { layer: { x: 80, y: 40 } },
        responsive: { tablet: { style: { layer: { x: 0, y: 0 } } } },
      }),
    ]);
    expect(
      resolvePageDocumentForBreakpoint(zeroReset, "tablet").sections[0]!.blocks[0]!.style!.layer
    ).toEqual({ x: 0, y: 0 });
    expect(buildPageResponsiveCssPlan(zeroReset).css).toBe(
      mediaShell("tablet", [
        `${frameScope("blk_zero")}{--layer-x:0% !important;--layer-y:0% !important}`,
      ])
    );
  });

  test("responsive anchor rejects on write, is removed on stored read, never CSS", () => {
    const raw = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_defensive",
            style: { layer: { x: 10 } },
            responsive: {
              tablet: {
                style: {
                  layer: { x: 5, anchor: "top-left" } as never,
                },
              },
            },
          }),
        ],
      }),
    ]);
    expect(() => normalizePageDocumentV2ForWrite(raw)).toThrow(/^Invalid /);
    const storedDoc = stored(raw);
    // Stored read drops the anchor key; the numeric x sibling survives because
    // the base layer makes the delta reachable.
    expect(storedDoc.sections[0]!.blocks[0]!.responsive).toEqual({
      tablet: { style: { layer: { x: 5 } } },
    });
    const plan = buildPageResponsiveCssPlan(storedDoc);
    expect(plan.css).toBe(
      mediaShell("tablet", [`${frameScope("blk_defensive")}{--layer-x:5% !important}`])
    );
    expect(plan.css).not.toContain("anchor");
    expect(plan.diagnostics).toEqual([]);
    const effective = resolvePageDocumentForBreakpoint(storedDoc, "tablet").sections[0]!.blocks[0]!
      .style;
    expect(effective?.layer).toEqual({ x: 5 });
  });
});

describe("3. typography parity (shared sanitizer gate + explicit resets)", () => {
  test("fontSizeCustom and textTransform:none emit only after their gates, matching effective values", () => {
    expect(sanitizeAuthoringCssFontSize("clamp(2rem, 5vw, 3rem)")).toBe("clamp(2rem, 5vw, 3rem)");
    expect(sanitizeAuthoringCssFontSize("1.75rem;}body{display:none")).toBeNull();

    const custom = plainDoc([
      buildBlock({
        id: "blk_custom",
        style: { fontSize: "2xl" },
        responsive: {
          tablet: { style: { fontSizeCustom: "clamp(2rem, 5vw, 3rem)", fontSize: "sm" } },
        },
      }),
    ]);
    const customEffective = resolvePageDocumentForBreakpoint(custom, "tablet").sections[0]!
      .blocks[0]!.style;
    expect(customEffective?.fontSizeCustom).toBe("clamp(2rem, 5vw, 3rem)");
    expect(customEffective?.fontSize).toBe("sm");
    const customPlan = buildPageResponsiveCssPlan(custom);
    expect(customPlan.css).toBe(
      mediaShell("tablet", [
        `${textScope("blk_custom")}{font-size:clamp(2rem, 5vw, 3rem) !important}`,
      ])
    );
    expect(customPlan.diagnostics).toEqual([]);

    const reset = plainDoc([
      buildBlock({
        id: "blk_reset",
        style: { textTransform: "uppercase" },
        responsive: { mobile: { style: { textTransform: "none" } } },
      }),
    ]);
    expect(
      resolvePageDocumentForBreakpoint(reset, "mobile").sections[0]!.blocks[0]!.style?.textTransform
    ).toBe("none");
    expect(buildPageResponsiveCssPlan(reset).css).toBe(
      mediaShell("mobile", [`${textScope("blk_reset")}{text-transform:none !important}`])
    );
  });

  test("non-typography blocks diagnose the exact keys and emit neither declaration", () => {
    const storedDoc = plainDoc([
      buildBlock({
        id: "blk_container",
        type: "container",
        props: {},
        responsive: {
          mobile: { style: { fontSizeCustom: "1.75rem", textTransform: "uppercase" } },
        },
      }),
    ]);
    // Both values survive the resolver; the projection fails closed because a
    // container has no painted text target.
    expect(
      resolvePageDocumentForBreakpoint(storedDoc, "mobile").sections[0]!.blocks[0]!.style
    ).toMatchObject({ fontSizeCustom: "1.75rem", textTransform: "uppercase" });
    const plan = buildPageResponsiveCssPlan(storedDoc);
    expect(plan.css).toBe("");
    expect(plan.diagnostics).toEqual([
      diag("block", "blk_container", "mobile", "style.fontSizeCustom", "not_css_expressible"),
      diag("block", "blk_container", "mobile", "style.textTransform", "not_css_expressible"),
    ]);
  });
});

describe("4. grid placement parity (public visible-root policy + rendered markup)", () => {
  test("resolvePageBlockGridPlacement(...,{includeHiddenBlocks:false}) covers every public class", () => {
    const root = contentDoc([buildBlock({ id: "root" })]);
    expect(placementOf(root.sections[0]!, 0)).toBe("block-frame");

    for (const type of ["timeline", "gallery", "faq", "testimonials"] as const) {
      expect(
        placementOf(
          sectionDoc(type, "default", [buildBlock({ id: `wrap_${type}` })]).sections[0]!,
          0
        )
      ).toBe("section-template-wrapper");
    }

    const nested = plainDoc([
      buildBlock({
        id: "outer",
        type: "container",
        props: {},
        slots: { children: [buildBlock({ id: "inner" })] },
      }),
    ]);
    expect(
      resolvePageBlockGridPlacement(
        nested.sections[0]!,
        [{ index: 0 }, { slotKey: "children", index: 0 }] as PageBlockPath,
        { includeHiddenBlocks: false }
      )
    ).toBe("none");

    expect(
      placementOf(twoColDoc([buildBlock({ id: "assigned", style: { column: 1 } })]).sections[0]!, 0)
    ).toBe("none");

    // A hidden assigned sibling is excluded from the visible-root set, so the
    // visible root keeps its legal block-frame placement.
    const hiddenSibling = twoColDoc([
      buildBlock({ id: "hidden", visibility: { visible: false }, style: { column: 1 } }),
      buildBlock({ id: "visible" }),
    ]);
    expect(placementOf(hiddenSibling.sections[0]!, 1)).toBe("block-frame");

    expect(placementOf(sectionDoc("media-split", "default", [buildBlock()]).sections[0]!, 0)).toBe(
      "block-frame"
    );
    for (const variant of ["split", "horizontal"] as const) {
      expect(placementOf(sectionDoc("media-split", variant, [buildBlock()]).sections[0]!, 0)).toBe(
        "none"
      );
    }
  });

  test("legal classes share the exact grid-item selector; none diagnoses each span without inert CSS", () => {
    const clampSpan = (value: number): number =>
      Math.max(PAGE_BLOCK_SPAN_CLAMP.min, Math.min(PAGE_BLOCK_SPAN_CLAMP.max, Math.trunc(value)));

    const frameDoc = contentDoc([
      buildBlock({
        id: "sp",
        style: { colSpan: 1 },
        responsive: { mobile: { style: { colSpan: 99, rowSpan: 0 } } },
      }),
    ]);
    expect(buildPageResponsiveCssPlan(frameDoc).css).toBe(
      mediaShell("mobile", [
        `${gridItemScope("sp")}{grid-column:span ${clampSpan(99)} !important;grid-row:span ${clampSpan(0)} !important}`,
      ])
    );

    const wrapperDoc = sectionDoc("timeline", "default", [
      buildBlock({
        id: "tl_item",
        style: { colSpan: 2 },
        responsive: { mobile: { style: { colSpan: 3 } } },
      }),
    ]);
    expect(buildPageResponsiveCssPlan(wrapperDoc).css).toBe(
      mediaShell("mobile", [`${gridItemScope("tl_item")}{grid-column:span 3 !important}`])
    );

    const noneDoc = plainDoc([
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
    ]);
    const nonePlan = buildPageResponsiveCssPlan(noneDoc);
    expect(nonePlan.css).toBe("");
    expect(nonePlan.diagnostics).toEqual([
      diag("block", "inner", "mobile", "style.colSpan", "not_css_expressible"),
      diag("block", "inner", "mobile", "style.rowSpan", "not_css_expressible"),
    ]);
  });

  test("rendered markup stamps the hook exactly where the CSS targets it", () => {
    const storedDoc = contentDoc([
      buildBlock({ id: "base_only", style: { colSpan: 4 } }),
      buildBlock({ id: "resp_only", responsive: { mobile: { style: { colSpan: 3 } } } }),
      buildBlock({ id: "no_span" }),
    ]);
    const html = renderToStaticMarkup(<PageSectionContent section={storedDoc.sections[0]!} />);
    // The shared span predicate stamps the hook on the classified target for
    // both span-bearing cases, and nowhere for the no-span case.
    expect(countOf(html, `data-page-block-grid-item="base_only"`)).toBe(1);
    expect(countOf(html, `data-page-block-grid-item="resp_only"`)).toBe(1);
    expect(countOf(html, `data-page-block-grid-item="no_span"`)).toBe(0);
    const css = buildPageResponsiveCssPlan(storedDoc).css;
    expect(css).toContain(`${gridItemScope("resp_only")}{grid-column:span 3 !important}`);
  });
});

describe("5. gradient paint parity (exact image + canonical color, separate declarations)", () => {
  const GRADIENT_STACK = "linear-gradient(180deg,#0f1720,#1b2733), rgba(255,255,255,.35)";

  test("section and block gradient stacks split exact image and canonical color bytes", () => {
    const sectionDoc = stored(
      buildDocument([
        buildSection({
          responsive: {
            mobile: { style: { backgroundType: "gradient", background: GRADIENT_STACK } },
          },
        }),
      ])
    );
    const storedBackground = sectionDoc.sections[0]!.responsive!.mobile!.style!.background;
    // Stored read canonicalizes the final color (TASK-541 spaced bytes); the
    // structured parse splits the exact image bytes from the color bytes.
    expect(storedBackground).toBe(
      "linear-gradient(180deg,#0f1720,#1b2733), rgba(255, 255, 255, 0.35)"
    );
    expect(parseAuthoringCssBackgroundPaint(storedBackground)).toEqual({
      image: "linear-gradient(180deg,#0f1720,#1b2733)",
      color: "rgba(255, 255, 255, 0.35)",
    });
    const sectionPlan = buildPageResponsiveCssPlan(sectionDoc);
    expect(sectionPlan.css).toBe(
      mediaShell("mobile", [
        `${sectionContentScope("sec_hero")}{background-color:rgba(255, 255, 255, 0.35) !important;background-image:linear-gradient(180deg,#0f1720,#1b2733) !important}`,
      ])
    );
    expect(sectionPlan.diagnostics).toEqual([]);

    const blockDoc = plainDoc([
      buildBlock({
        id: "blk_g",
        responsive: {
          mobile: { style: { backgroundType: "gradient", background: GRADIENT_STACK } },
        },
      }),
    ]);
    const blockPlan = buildPageResponsiveCssPlan(blockDoc);
    expect(blockPlan.css).toBe(
      mediaShell("mobile", [
        `${frameScope("blk_g")}{--coderso-block-surface:initial !important;background-color:rgba(255, 255, 255, 0.35) !important;background-image:linear-gradient(180deg,#0f1720,#1b2733) !important}`,
      ])
    );
    expect(blockPlan.diagnostics).toEqual([]);
  });

  test("invalid paint never leaks and an explicit reset stays safe", () => {
    const hostileDoc = stored(
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
    const hostilePlan = buildPageResponsiveCssPlan(hostileDoc);
    expect(hostilePlan.css).not.toContain("url(");
    expect(hostilePlan.css).not.toContain("evil");
    expect(hostilePlan.diagnostics).toContainEqual(
      diag("section", "sec_hero", "tablet", "style.background", "unsafe_background_value")
    );

    const resetPlan = buildPageResponsiveCssPlan(
      stored(
        buildDocument([
          buildSection({ responsive: { mobile: { style: { backgroundType: "none" } } } }),
        ])
      )
    );
    expect(resetPlan.css).toBe(
      mediaShell("mobile", [
        `${sectionContentScope("sec_hero")}{background-color:transparent !important;background-image:none !important}`,
      ])
    );
    expect(resetPlan.diagnostics).toEqual([]);
  });
});

describe("6. full-bleed paint targeting parity (base decision only)", () => {
  test("full-bleed paint rides the root; layout/max-width/spacing stay on content", () => {
    const storedDoc = stored(
      buildDocument([
        buildSection({
          variant: "full-width",
          responsive: {
            mobile: {
              layout: { maxWidth: 360 },
              spacing: { gap: 8 },
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
    // Full-width variant, so the paint target is the section ROOT; a device
    // override can never flip it.
    const plan = buildPageResponsiveCssPlan(storedDoc);
    const rootRule =
      `${sectionRootScope("sec_hero")}{background-color:transparent !important;` +
      `background-image:url("https://example.com/bleed.png") !important;` +
      "border-radius:16px !important;" +
      "box-shadow:0 14px 40px rgba(15, 23, 42, 0.12), 0px 0px 28px 0px #8ee8ff !important}";
    const contentRule =
      `${sectionContentScope("sec_hero")}{gap:8px !important;max-width:360px !important;` +
      "width:min(360px, calc(100% - 2 * 20px)) !important}";
    expect(plan.css).toContain(rootRule);
    expect(plan.css).toContain(contentRule);
    // Glow parity: the composed shadow is the exact merged value.
    expect(composeGlowBoxShadow({ color: "#8ee8ff", blur: 28 })).toBe("0px 0px 28px 0px #8ee8ff");
    expect(
      mergeShadows(
        "0 14px 40px rgba(15, 23, 42, 0.12)",
        composeGlowBoxShadow({ color: "#8ee8ff", blur: 28 })
      )
    ).toBe("0 14px 40px rgba(15, 23, 42, 0.12), 0px 0px 28px 0px #8ee8ff");

    const bleedCss = buildPageResponsiveCssPlan(
      stored(
        buildDocument([
          buildSection({
            style: { fullBleed: true } as PageSectionV2["style"],
            responsive: { mobile: { style: { radius: 16 } } },
          }),
        ])
      )
    ).css;
    expect(bleedCss).toContain(`${sectionRootScope("sec_hero")}{border-radius:16px !important}`);
    expect(bleedCss).not.toContain(`${sectionContentScope("sec_hero")}{border-radius`);

    const cappedCss = buildPageResponsiveCssPlan(
      stored(buildDocument([buildSection({ responsive: { mobile: { style: { radius: 16 } } } })]))
    ).css;
    expect(cappedCss).toContain(
      `${sectionContentScope("sec_hero")}{border-radius:16px !important}`
    );
    expect(cappedCss).not.toContain(`${sectionRootScope("sec_hero")}{`);
  });

  test("a device override can never carry fullBleed and responsive tilt cannot exist", () => {
    const fullBleedRaw = buildDocument([
      buildSection({ responsive: { mobile: { style: { fullBleed: true } as never } } }),
    ]);
    expect(() => normalizePageDocumentV2ForWrite(fullBleedRaw)).toThrow(/^Invalid /);
    const storedBleed = stored(fullBleedRaw);
    expect(storedBleed.sections[0]!.responsive).toEqual({});
    expect(buildPageResponsiveCssPlan(storedBleed)).toEqual({ css: "", diagnostics: [] });

    const tiltRaw = buildDocument([
      buildSection({
        blocks: [
          buildBlock({
            id: "blk_tilt",
            responsive: { mobile: { style: { tilt: "subtle" } as never } },
          }),
        ],
      }),
    ]);
    expect(() => normalizePageDocumentV2ForWrite(tiltRaw)).toThrow(/^Invalid /);
    const storedTilt = stored(tiltRaw);
    expect(
      resolvePageDocumentForBreakpoint(storedTilt, "mobile").sections[0]!.blocks[0]!.style?.tilt
    ).toBeUndefined();
    expect(buildPageResponsiveCssPlan(storedTilt)).toEqual({ css: "", diagnostics: [] });
  });
});

describe("7. tilt+layer wrapper and marquee replica parity", () => {
  test("tablet and mobile pin one exact :is(canonical, replica alias) rule per target", () => {
    const storedDoc = stored(
      buildDocument([
        buildSection({
          blocks: [
            buildBlock({
              id: "blk_text",
              responsive: {
                tablet: { style: { width: "full", fontSize: "lg" } },
                mobile: { style: { width: "full", fontSize: "lg" } },
              },
            }),
            buildBlock({
              id: "blk_btn",
              type: "button",
              props: { label: "Buy", href: "/buy", target: "self" },
              responsive: {
                tablet: { style: { textColor: "#111111" } },
                mobile: { style: { textColor: "#111111" } },
              },
            }),
            buildBlock({
              id: "blk_tilt",
              style: { tilt: "subtle", layer: { x: 1, y: 2 } },
              responsive: {
                tablet: { style: { layer: { x: 5 } } },
                mobile: { style: { layer: { x: 5 } } },
              },
            }),
          ],
        }),
      ])
    );
    const plan = buildPageResponsiveCssPlan(storedDoc);
    const textFrameRule = `${frameScope("blk_text")}{width:100% !important}`;
    const textNodeRule = `${textScope("blk_text")}{font-size:var(--text-lg, 1.125rem) !important}`;
    const elementRule = `${elementScope("blk_btn")}{--coderso-block-text:#111111 !important;color:#111111 !important}`;
    const wrapperRule = `${tiltLayerScope("blk_tilt")}{--layer-x:5% !important}`;
    expect(plan.css).toBe(
      mediaShell("tablet", [textFrameRule, textNodeRule, elementRule, wrapperRule]) +
        "\n" +
        mediaShell("mobile", [textFrameRule, textNodeRule, elementRule, wrapperRule])
    );
    // Each declaration appears exactly once per breakpoint, never duplicated.
    expect(countOf(plan.css, "width:100% !important")).toBe(2);
    expect(countOf(plan.css, "--layer-x:5% !important")).toBe(2);
    expect(plan.diagnostics).toEqual([]);
  });

  test("an approved two-segment marquee stamps aliases with canonical ids", () => {
    const storedDoc = contentDoc([
      marqueeGroup(
        "blk-marquee",
        [
          buildBlock({
            id: "blk-tilt",
            type: "heading",
            props: { text: "Composed", level: "h2", align: "left" },
            style: { tilt: "subtle", layer: { x: 8, y: 12 } },
            responsive: { tablet: { style: { layer: { x: 5 } } } },
          }),
          buildBlock({ id: "blk-m1", responsive: { tablet: { style: { width: "full" } } } }),
        ],
        { colSpan: 2 },
        { mobile: { style: { colSpan: 4 } } }
      ),
    ]);
    const html = renderToStaticMarkup(<PageSectionContent section={storedDoc.sections[0]!} />);
    // Replica frames swap data-block-id for the block alias; the hoisted
    // wrapper swaps data-tilt-parent-for, both carrying canonical ids.
    expect(countOf(html, `data-page-marquee-replica-block-style-scope="blk-tilt"`)).toBe(1);
    expect(countOf(html, `data-page-marquee-replica-block-style-scope="blk-m1"`)).toBe(1);
    expect(countOf(html, `data-page-marquee-replica-tilt-layer-style-scope="blk-tilt"`)).toBe(1);
    expect(countOf(html, 'data-block-id="blk-tilt"')).toBe(1);
    expect(countOf(html, 'data-tilt-parent-for="blk-tilt"')).toBe(1);
    // The only legal grid target is the outer marquee group; descendants don't.
    expect(countOf(html, `data-page-block-grid-item="blk-marquee"`)).toBe(1);

    const plan = buildPageResponsiveCssPlan(storedDoc);
    expect(plan.css).toContain(`${tiltLayerScope("blk-tilt")}{--layer-x:5% !important}`);
    expect(plan.css).toContain(`${frameScope("blk-m1")}{width:100% !important}`);
    expect(plan.css).toContain(`${gridItemScope("blk-marquee")}{grid-column:span 4 !important}`);
    expect(plan.css).not.toContain('data-page-block-grid-item="blk-tilt"');
    expect(plan.css).not.toContain('data-page-block-grid-item="blk-m1"');
    expect(plan.css).not.toContain(
      PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE + '="blk-marquee"'
    );
    expect(plan.diagnostics).toEqual([]);
    // Alias membership alone never emits CSS; an unauthored delta emits nothing.
    expect(
      buildPageResponsiveCssPlan(contentDoc([marqueeGroup("blk-marquee", [buildBlock()])]))
    ).toEqual({ css: "", diagnostics: [] });
  });

  test("primary, non-seamless, and unsafe-fallback markup contain zero replica aliases", () => {
    const renderSection = (blocks: PageBlockV2[]): string =>
      renderToStaticMarkup(<PageSectionContent section={plainDoc(blocks).sections[0]!} />);
    const tiltChild = buildBlock({
      id: "blk-tilt",
      type: "heading",
      props: { text: "Composed", level: "h2", align: "left" },
      style: { tilt: "subtle", layer: { x: 8, y: 12 } },
    });
    expect(renderSection([tiltChild])).not.toContain("data-page-marquee-replica");
    expect(renderSection([tiltChild])).toContain('data-tilt-parent-for="blk-tilt"');

    const nonSeamless = marqueeGroup("blk-ns", [buildBlock()], {
      marquee: { speed: 18, direction: "left", seamless: false },
    });
    expect(renderSection([nonSeamless])).not.toContain("data-page-marquee-replica");

    // A seamless marquee over an unsafe subtree degrades to one canonical segment.
    const unsafe = marqueeGroup("blk-unsafe", [
      buildBlock({ id: "blk-v", type: "video", props: { src: "/v.mp4", title: "v" } }),
    ]);
    const unsafeHtml = renderSection([unsafe]);
    expect(unsafeHtml).not.toContain("data-page-marquee-replica");
    expect(unsafeHtml).toContain('data-block-id="blk-v"');
  });
});

describe("8. style.column and props diagnostic parity", () => {
  test("numeric assignment and explicit null reset over a base emit the exact column diagnostic", () => {
    const storedDoc = twoColDoc([
      buildBlock({
        id: "blk_column_move",
        style: { column: 1 },
        responsive: {
          tablet: { style: { column: 2 } },
          mobile: { style: { column: null } },
        },
      }),
    ]);
    // Both forms fail closed: the projection cannot re-parent the desktop DOM.
    expect(
      resolvePageDocumentForBreakpoint(storedDoc, "tablet").sections[0]!.blocks[0]!.style!.column
    ).toBe(2);
    expect(
      resolvePageDocumentForBreakpoint(storedDoc, "mobile").sections[0]!.blocks[0]!.style!.column
    ).toBeNull();
    const plan = buildPageResponsiveCssPlan(storedDoc);
    expect(plan.css).toBe("");
    expect(plan.diagnostics).toEqual([
      diag("block", "blk_column_move", "tablet", "style.column", "not_css_expressible"),
      diag("block", "blk_column_move", "mobile", "style.column", "not_css_expressible"),
    ]);

    const baseOnly = plainDoc([buildBlock({ id: "blk_column_base", style: { column: 2 } })]);
    expect(buildPageResponsiveCssPlan(baseOnly)).toEqual({ css: "", diagnostics: [] });
  });

  test("unsupported props keep the exact diagnostic while props.align emits its rule", () => {
    const storedDoc = stored(
      buildDocument([
        buildSection({
          blocks: [
            buildBlock({
              id: "blk_head",
              type: "heading",
              props: { text: "Build with Coderso", level: "h1", align: "left" },
              responsive: { tablet: { props: { align: "center" } } },
            }),
            buildBlock({
              id: "blk_copy",
              responsive: {
                tablet: { props: { text: "Tablet copy" }, style: { width: "full" } },
              },
            }),
          ],
        }),
      ])
    );
    // The resolver applies the align override; the delta re-targets the text node.
    expect(
      resolvePageDocumentForBreakpoint(storedDoc, "tablet").sections[0]!.blocks[0]!.props.align
    ).toBe("center");
    const plan = buildPageResponsiveCssPlan(storedDoc);
    expect(plan.css).toContain(`${textScope("blk_head")}{text-align:center !important}`);
    expect(plan.css).toContain(`${frameScope("blk_copy")}{width:100% !important}`);
    expect(plan.css).not.toContain("Tablet copy");
    expect(plan.diagnostics).toEqual([
      diag("block", "blk_copy", "tablet", "props", "props_override_unsupported"),
    ]);
  });
});

describe("9. hostile ids, deterministic ordering, and byte identity", () => {
  test("hostile section and block ids are escaped so the rule cannot break out", () => {
    const sectionCss = buildPageResponsiveCssPlan(
      stored(
        buildDocument([
          buildSection({
            id: 'sec"]{}</style><script>',
            responsive: { mobile: { layout: { maxWidth: 360 } } },
          }),
        ])
      )
    ).css;
    expect(sectionCss).toContain('[data-section-id="sec\\"]{}\\3c /style\\3e \\3c script\\3e "]');
    expect(sectionCss).toContain("max-width:360px !important");
    expect(sectionCss).not.toContain('sec"]');
    expect(sectionCss).not.toContain("</style>");

    const blockCss = buildPageResponsiveCssPlan(
      stored(
        buildDocument([
          buildSection({
            blocks: [
              buildBlock({
                id: 'blk"]{}</style><script>',
                responsive: { mobile: { style: { width: "full" } } },
              }),
            ],
          }),
        ])
      )
    ).css;
    const escapedId = 'blk\\"]{}\\3c /style\\3e \\3c script\\3e ';
    expect(blockCss).toContain(
      `:is([data-block-id="${escapedId}"],[${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="${escapedId}"])`
    );
    expect(blockCss).not.toContain('blk"]');
    expect(blockCss).not.toContain("</style>");
  });

  test("ordering is deterministic and byte identity holds, including zero emitted bytes", () => {
    const make = (): PageDocumentV2 =>
      stored(
        buildDocument([
          buildSection({
            id: "sec_b",
            responsive: { mobile: { spacing: { paddingTop: 8 } } },
            blocks: [
              buildBlock({ id: "blk_2", responsive: { mobile: { style: { width: "full" } } } }),
              buildBlock({ id: "blk_1", responsive: { mobile: { style: { width: "auto" } } } }),
            ],
          }),
          buildSection({ id: "sec_a", responsive: { mobile: { spacing: { gap: 4 } } } }),
        ])
      );
    const first = buildPageResponsiveCssPlan(make()).css;
    const second = buildPageResponsiveCssPlan(make()).css;
    expect(first).toBe(second);
    const order = ["sec_b", "blk_2", "blk_1", "sec_a"].map((id) => first.indexOf(`"${id}"`));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    const alphaSort = buildPageResponsiveCssPlan(
      stored(
        buildDocument([
          buildSection({
            responsive: {
              mobile: { spacing: { gap: 4, paddingTop: 8 }, layout: { maxWidth: 360 } },
            },
          }),
        ])
      )
    ).css;
    expect(alphaSort).toContain(
      "{gap:4px !important;max-width:360px !important;padding-top:8px !important}"
    );

    expect(buildPageResponsiveCssPlan(buildDocument([]))).toEqual({ css: "", diagnostics: [] });
    const legacy = stored(
      buildDocument([
        buildSection({
          style: { fullBleed: true, composition: "layered" } as PageSectionV2["style"],
          blocks: [
            buildBlock({
              style: { tilt: "subtle", layer: { x: 10 }, colSpan: 2, marquee: { speed: 18 } },
            }),
          ],
        }),
      ])
    );
    expect(buildPageResponsiveCssPlan(legacy)).toEqual({ css: "", diagnostics: [] });

    const sectionARule = `${sectionContentScope("sec_a")}{max-width:360px !important}`;
    const twoSections = stored(
      buildDocument([
        buildSection({ id: "sec_a", responsive: { mobile: { layout: { maxWidth: 360 } } } }),
        buildSection({ id: "sec_b", responsive: { tablet: { spacing: { gap: 8 } } } }),
      ])
    );
    expect(buildPageResponsiveCssPlan(twoSections).css).toContain(sectionARule);
    expect(buildPageResponsiveCssPlan(twoSections).css).toContain(
      `${sectionContentScope("sec_b")}{gap:8px !important}`
    );
  });
});
