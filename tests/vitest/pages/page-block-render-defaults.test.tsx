import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  getPageBlockRenderDefault,
  getPageHeadingRenderFontSize,
  pageBlockRenderDefaults,
  pageHeadingLevelFontSizeRenderDefaults,
} from "../../../core/services/pages/pageBlockRenderDefaults";
import {
  createPageBlockV2,
  pageHeadingLevels,
  pageTypographyCapableBlockTypes,
  pageTypographyFontSizeCssValues,
  type PageBlockType,
  type PageBlockV2,
  type PageTypographyFontSize,
  type PageTypographyFontWeight,
} from "../../../core/services/pages/pageDocumentV2";
import {
  pageBlockAlignmentClass,
  pageBlockWidthClass,
  pageTextAlignClass,
  renderPageBlockContent,
  toPageBlockRenderProps,
} from "../../../core/services/pages/pageRendererV2";

/**
 * Consistency contract (TASK-449 owner finding #9, round 3): the effective
 * render defaults table must agree with what `pageRendererV2.tsx` actually
 * paints for UNSET fields. Wherever the renderer output is programmatically
 * reachable (exported class helpers, rendered markup of the baked text
 * nodes), the table is cross-checked against it below. Entries that rest on
 * CSS behavior instead of an emitted class are hand-verified and documented
 * inline (grid `justify-self: stretch`, page-base font inheritance, the
 * px-based `leading-7` ratio).
 */

const markupOf = (block: PageBlockV2) => renderToStaticMarkup(<>{renderPageBlockContent(block)}</>);

/** Baked Tailwind class for each font-size token (1:1 with the token rem values). */
const fontSizeTokenClass: Record<PageTypographyFontSize, string> = {
  "2xs": "text-[0.625rem]",
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};

/** Baked Tailwind class per weight token; "normal" is the absence of one. */
const fontWeightTokenClass: Record<PageTypographyFontWeight, string | null> = {
  normal: null,
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const anyWeightClass = /font-(normal|medium|semibold|bold)/;

describe("frame defaults (width/align)", () => {
  test("unset width emits no class: the grid-stretch frame is the 'full' painted box", () => {
    // Programmatic side: the renderer adds no width class for unset, and the
    // explicit tokens map auto -> w-fit, full -> w-full.
    expect(pageBlockWidthClass(undefined)).toBeUndefined();
    expect(pageBlockWidthClass("full")).toBe("w-full");
    expect(pageBlockWidthClass("auto")).toBe("w-fit");
    // Hand-verified: the frame is an item of the section content grid
    // (`grid w-full`); with no width class and no justify-self class the CSS
    // grid default `justify-self: stretch` spans the full column — the same
    // painted box as the explicit "full". The table records "full".
    const frame = toPageBlockRenderProps(createPageBlockV2("heading"));
    expect(frame.className).toBe("max-w-full");
    for (const [type, defaults] of Object.entries(pageBlockRenderDefaults)) {
      expect(defaults.width, type).toBe("full");
    }
  });

  test("unset align emits no justify-self/text-align: content flows left", () => {
    expect(pageBlockAlignmentClass(undefined)).toBeUndefined();
    // Programmatic side: the renderer's own text-align default is left.
    expect(pageTextAlignClass(undefined)).toBe("text-left");
    const style = toPageBlockRenderProps(createPageBlockV2("heading")).style;
    expect(style.textAlign).toBeUndefined();
    for (const [type, defaults] of Object.entries(pageBlockRenderDefaults)) {
      expect(defaults.align, type).toBe("left");
    }
    // heading/text props.align display default mirrors pageTextAlignClass.
    expect(pageBlockRenderDefaults.heading.textAlign).toBe("left");
    expect(pageBlockRenderDefaults.text.textAlign).toBe("left");
  });
});

describe("typography defaults cross-checked against the rendered baked classes", () => {
  test("heading: per-level size class, font-semibold, leading-tight", () => {
    for (const level of pageHeadingLevels) {
      const markup = markupOf(
        createPageBlockV2("heading", { props: { text: "Heading", level, align: "left" } })
      );
      expect(markup, level).toContain(`<${level} `);
      const expectedSize = pageHeadingLevelFontSizeRenderDefaults[level];
      expect(markup, level).toContain(fontSizeTokenClass[expectedSize]);
      expect(markup, level).toContain("font-semibold");
      // Hand-verified mapping: `leading-tight` is the unitless 1.25 ratio.
      expect(markup, level).toContain("leading-tight");
      expect(getPageHeadingRenderFontSize(level)).toBe(expectedSize);
    }
    expect(pageBlockRenderDefaults.heading.typography).toMatchObject({
      fontFamily: "sans",
      fontWeight: "semibold",
      lineHeight: 1.25,
      letterSpacing: 0,
    });
    // The renderer falls back to h2 for unset/blank levels and to the
    // text-2xl branch for unknown tokens.
    expect(getPageHeadingRenderFontSize(undefined)).toBe("4xl");
    expect(getPageHeadingRenderFontSize("  ")).toBe("4xl");
    expect(getPageHeadingRenderFontSize("h7")).toBe("2xl");
  });

  test("text: text-base leading-7, no weight class", () => {
    const markup = markupOf(createPageBlockV2("text", { props: { text: "Copy" } }));
    expect(markup).toContain("text-base");
    expect(markup).toContain("leading-7");
    expect(markup).not.toMatch(anyWeightClass);
    // text-base is the md token (both 1rem); leading-7 is 1.75rem = a 1.75
    // ratio at the baked 16px size (hand-verified px-based mapping).
    expect(pageTypographyFontSizeCssValues.md).toContain("1rem");
    expect(pageBlockRenderDefaults.text.typography).toMatchObject({
      fontFamily: "sans",
      fontSize: "md",
      fontWeight: "normal",
      lineHeight: 1.75,
      letterSpacing: 0,
    });
  });

  test("button: text-sm font-semibold; line-height not control-expressible", () => {
    const markup = markupOf(createPageBlockV2("button"));
    expect(markup).toContain("text-sm");
    expect(markup).toContain("font-semibold");
    expect(pageBlockRenderDefaults.button.typography).toMatchObject({
      fontFamily: "sans",
      fontSize: "sm",
      fontWeight: "semibold",
      letterSpacing: 0,
    });
    // text-sm's own baked line-height (1.25rem/0.875rem) is no clean ratio:
    // the table deliberately omits it (control shows the honest empty state).
    expect(pageBlockRenderDefaults.button.typography?.lineHeight).toBeUndefined();
  });

  test("quote: text-lg leading-8, no weight class; line-height omitted", () => {
    const markup = markupOf(createPageBlockV2("quote", { props: { text: "Q", cite: "" } }));
    expect(markup).toContain("text-lg");
    expect(markup).toContain("leading-8");
    expect(markup).not.toMatch(anyWeightClass);
    expect(pageBlockRenderDefaults.quote.typography).toMatchObject({
      fontFamily: "sans",
      fontSize: "lg",
      fontWeight: "normal",
      letterSpacing: 0,
    });
    // leading-8 (2rem) over text-lg (1.125rem) ~= 1.78 — not expressible by
    // the 0.05-step unitless control, so the table omits it.
    expect(pageBlockRenderDefaults.quote.typography?.lineHeight).toBeUndefined();
  });

  test("list: no baked size/weight/leading classes — inherits the md/normal page base", () => {
    const markup = markupOf(
      createPageBlockV2("list", { props: { items: ["One"], ordered: false } })
    );
    expect(markup).not.toMatch(/text-(sm|base|lg|xl|2xl|3xl|4xl|5xl)/);
    expect(markup).not.toMatch(anyWeightClass);
    expect(markup).not.toContain("leading-");
    // Hand-verified: list text inherits the page base (16px = the md token,
    // normal weight). No baked leading class exists, so lineHeight is omitted.
    expect(pageBlockRenderDefaults.list.typography).toMatchObject({
      fontFamily: "sans",
      fontSize: "md",
      fontWeight: "normal",
      letterSpacing: 0,
    });
    expect(pageBlockRenderDefaults.list.typography?.lineHeight).toBeUndefined();
  });

  test("card: divergent title/body scales mean no single size/weight default", () => {
    const markup = markupOf(createPageBlockV2("card", { props: { title: "T", text: "B" } }));
    // Two text nodes with different baked scales...
    expect(markup).toContain("text-lg");
    expect(markup).toContain("font-semibold");
    expect(markup).toContain("text-sm");
    // ...so the table must omit single-value size/weight/line-height entries.
    expect(pageBlockRenderDefaults.card.typography?.fontSize).toBeUndefined();
    expect(pageBlockRenderDefaults.card.typography?.fontWeight).toBeUndefined();
    expect(pageBlockRenderDefaults.card.typography?.lineHeight).toBeUndefined();
    expect(pageBlockRenderDefaults.card.typography?.fontFamily).toBe("sans");
  });

  test("statistic: divergent value/label/caption scales mean no single default", () => {
    const markup = markupOf(createPageBlockV2("statistic"));
    expect(markup).toContain("text-3xl");
    expect(markup).toContain("font-semibold");
    expect(markup).toContain("text-sm");
    expect(markup).toContain("font-medium");
    expect(pageBlockRenderDefaults.statistic.typography?.fontSize).toBeUndefined();
    expect(pageBlockRenderDefaults.statistic.typography?.fontWeight).toBeUndefined();
    expect(pageBlockRenderDefaults.statistic.typography?.lineHeight).toBeUndefined();
    expect(pageBlockRenderDefaults.statistic.typography?.fontFamily).toBe("sans");
  });

  test("no text node bakes a font family or tracking class: sans inheritance, 0px tracking", () => {
    for (const type of pageTypographyCapableBlockTypes) {
      const markup = markupOf(createPageBlockV2(type));
      // Hand-verified: text inherits the page base font (the `sans` token
      // stack via --font-sans on the front and the editor canvas frame).
      expect(markup, type).not.toMatch(/font-(sans|display)/);
      expect(markup, type).not.toContain("tracking-");
      expect(pageBlockRenderDefaults[type].typography?.fontFamily, type).toBe("sans");
      expect(pageBlockRenderDefaults[type].typography?.letterSpacing, type).toBe(0);
    }
  });
});

describe("getPageBlockRenderDefault (display-path accessor)", () => {
  test("owner cases: default hero heading displays full/left and the baked 5xl/semibold/sans", () => {
    const heading = createPageBlockV2("heading", {
      props: { text: "Build with Coderso", level: "h1", align: "center" },
    });
    expect(getPageBlockRenderDefault(heading, ["style", "width"])).toBe("full");
    expect(getPageBlockRenderDefault(heading, ["style", "align"])).toBe("left");
    expect(getPageBlockRenderDefault(heading, ["style", "fontFamily"])).toBe("sans");
    expect(getPageBlockRenderDefault(heading, ["style", "fontSize"])).toBe("5xl");
    expect(getPageBlockRenderDefault(heading, ["style", "fontWeight"])).toBe("semibold");
    expect(getPageBlockRenderDefault(heading, ["style", "lineHeight"])).toBe(1.25);
    expect(getPageBlockRenderDefault(heading, ["style", "letterSpacing"])).toBe(0);
    // props.align has a stored value in the hero starter; the render default
    // only backs genuinely unset documents.
    expect(getPageBlockRenderDefault(heading, ["props", "align"])).toBe("left");
  });

  test("heading font size follows the stored level", () => {
    const h2 = createPageBlockV2("heading", { props: { text: "H", level: "h2", align: "left" } });
    const h3 = createPageBlockV2("heading", { props: { text: "H", level: "h3", align: "left" } });
    expect(getPageBlockRenderDefault(h2, ["style", "fontSize"])).toBe("4xl");
    expect(getPageBlockRenderDefault(h3, ["style", "fontSize"])).toBe("2xl");
  });

  test("fields without a single effective rendered value resolve to undefined", () => {
    const card = createPageBlockV2("card");
    expect(getPageBlockRenderDefault(card, ["style", "fontSize"])).toBeUndefined();
    expect(getPageBlockRenderDefault(card, ["style", "fontWeight"])).toBeUndefined();
    const image = createPageBlockV2("image");
    expect(getPageBlockRenderDefault(image, ["style", "fontSize"])).toBeUndefined();
    expect(getPageBlockRenderDefault(image, ["props", "fit"])).toBeUndefined();
    // Non-table fields (schema-default-owned) stay with the registry fallback.
    const text = createPageBlockV2("text");
    expect(getPageBlockRenderDefault(text, ["style", "opacity"])).toBeUndefined();
    expect(getPageBlockRenderDefault(text, ["style", "shadow"])).toBeUndefined();
    expect(getPageBlockRenderDefault(text, ["style", "padding", "top"])).toBeUndefined();
  });

  test("every block type resolves frame defaults through the accessor", () => {
    for (const type of Object.keys(pageBlockRenderDefaults) as PageBlockType[]) {
      const block = createPageBlockV2(type);
      expect(getPageBlockRenderDefault(block, ["style", "width"]), type).toBe("full");
      expect(getPageBlockRenderDefault(block, ["style", "align"]), type).toBe("left");
    }
  });
});
