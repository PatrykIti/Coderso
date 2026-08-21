import { describe, expect, test } from "vitest";

import {
  BRAND_STYLE_NUMBER_RANGES,
  MENU_BAR_LAYOUT_NUMBER_RANGES,
  MENU_BRAND_TEXT_MAX_LENGTH,
  MENU_DOCUMENT_INVALID,
  MENU_DOCUMENT_SCHEMA_VERSION,
  MENU_NAV_DEVICE_DEFINING_KEYS,
  MENU_RESPONSIVE_BREAKPOINT_KEYS,
  MENU_SHELL_DEFAULT_LINK_PX,
  MENU_SHELL_DEFAULT_LINK_PY,
  MENU_SHELL_DEFAULT_LINK_RADIUS,
  MENU_SHELL_SUBLIST_MIN_WIDTH,
  MENU_SHELL_SUBLIST_PADDING,
  NAV_CHROME_DEFAULTS,
  NAV_CHROME_NUMBER_RANGES,
  NAV_FONT_SIZE_INHERITED,
  NAV_LEVEL_NUMBER_RANGES,
  NAV_LINK_NUMBER_RANGES,
  buildMenuDocumentV2FromLegacy,
  clearMenuBlockVisibilityOverride,
  clearMenuBrandStyleBase,
  clearMenuBrandStyleOverride,
  clearMenuNavChromeBase,
  clearMenuNavChromeOverride,
  clearMenuNavLevelStyleBase,
  clearMenuNavLevelStyleOverride,
  clearMenuSectionBase,
  clearMenuSectionOverride,
  createDefaultMenuDocumentV2,
  hasMenuBlockVisibilityOverride,
  hasMenuBrandStyleOverride,
  isEmptyMenuDocument,
  isMenuDocumentError,
  normalizeMenuBoxShadowValue,
  normalizeMenuDocumentV2ForWrite,
  normalizeStoredMenuDocumentV2ForRead,
  patchMenuBrandStyleForDevice,
  patchMenuNavChromeForDevice,
  patchMenuNavLevelStyleForDevice,
  patchMenuSectionForDevice,
  readMenuBrandStyleBaseValue,
  readMenuBrandStyleOverrideValue,
  readMenuNavChromeBaseValue,
  readMenuNavChromeOverrideValue,
  readMenuNavLevelStyleBaseValue,
  readMenuNavLevelStyleOverrideValue,
  readMenuSectionBaseValue,
  readMenuSectionOverrideValue,
  resolveBrandImageSrc,
  resolveMenuBlockVisibleForDevice,
  resolveMenuBrandStyleForDevice,
  resolveMenuControlDefault,
  resolveMenuNavChrome,
  resolveMenuNavLevelStyle,
  resolveMenuSectionAppearanceForDevice,
  resolvePublishedMenuDocument,
  resolveStoredMenuDocument,
  setMenuBlockVisibleForDevice,
  type BrandProps,
  type MenuBlockV2,
  type MenuDocumentV2,
  type MenuSectionV2,
  type NavChromeStyle,
  type NavLevelStyle,
} from "../../../core/services/menus/menuDocumentV2";
import { createPageBlockV2 } from "../../../core/services/pages/pageDocumentV2";
import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";
import { buildMenuDocumentCss } from "../../../core/site/menuDocumentCss";

// TASK-542-01-L01: the WRITE contract requires explicit valid IDs (the
// normalizer never invents one). Inject deterministic ids into plain-object
// blocks that lack one; assertions elsewhere are unchanged.
const blockWithId = (block: unknown, index: number): unknown =>
  typeof block === "object" && block !== null && !Array.isArray(block) && !("id" in block)
    ? { id: `blk-0-${index}`, ...(block as Record<string, unknown>) }
    : block;

const section = (blocks: unknown[], extra?: Record<string, unknown>) => ({
  id: "sec-menu-bar",
  type: "menu-bar",
  name: "Menu bar",
  layout: {},
  blocks: blocks.map(blockWithId),
  ...extra,
});

const doc = (blocks: unknown[], extra?: Record<string, unknown>) => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [section(blocks, extra)],
});

const boundaryTerminal = "transparent";
const boundaryPaddingLength = CSS_COLOR_VALUE_MAX_LENGTH - boundaryTerminal.length;
const rawAtCapColor = `${" ".repeat(Math.floor(boundaryPaddingLength / 2))}${boundaryTerminal}${" ".repeat(
  Math.ceil(boundaryPaddingLength / 2)
)}`;
const rawOverCapColor = `${rawAtCapColor} `;
const rawMenuColorCases = [
  { id: "exact cap", input: rawAtCapColor, expected: "transparent" },
  { id: "cap plus one", input: rawOverCapColor, expected: null },
  { id: "C0 control", input: `\u001f${boundaryTerminal}`, expected: null },
  { id: "C1 control", input: `\u0085${boundaryTerminal}`, expected: null },
  { id: "NBSP", input: `\u00a0${boundaryTerminal}`, expected: null },
  { id: "EM SPACE", input: `\u2003${boundaryTerminal}`, expected: null },
  { id: "inherited currentColor", input: "currentColor", expected: null },
  { id: "inherited inherit", input: "inherit", expected: null },
  { id: "out-of-range function", input: "rgb(256,0,0)", expected: null },
] as const;

const shadowColorPrefix = "rgba(";
const shadowColorTerminal = "0,0,0,.5)";
const shadowColorAtCap = `${shadowColorPrefix}${" ".repeat(
  CSS_COLOR_VALUE_MAX_LENGTH - shadowColorPrefix.length - shadowColorTerminal.length
)}${shadowColorTerminal}`;
const shadowColorOverCap = `${shadowColorPrefix} ${shadowColorAtCap.slice(shadowColorPrefix.length)}`;
const shadowColorBoundaryCases = [
  { id: "exact cap", input: shadowColorAtCap, expected: "rgba(0, 0, 0, 0.5)" },
  { id: "cap plus one", input: shadowColorOverCap, expected: null },
  { id: "C0 control", input: "rgba(\u001f0,0,0,.5)", expected: null },
  { id: "C1 control", input: "rgba(\u00850,0,0,.5)", expected: null },
  { id: "NBSP", input: "rgba(\u00a00,0,0,.5)", expected: null },
  { id: "EM SPACE", input: "rgba(\u20030,0,0,.5)", expected: null },
  { id: "inherited keyword", input: "currentColor", expected: null },
  { id: "out-of-range function", input: "rgb(256,0,0)", expected: null },
] as const;

const expectDocError = (fn: () => unknown, path: string) => {
  try {
    fn();
    throw new Error(`expected ${MENU_DOCUMENT_INVALID} at ${path}`);
  } catch (error) {
    expect(isMenuDocumentError(error)).toBe(true);
    expect((error as { code: string }).code).toBe(MENU_DOCUMENT_INVALID);
    expect((error as { path: string }).path).toBe(path);
  }
};

// --- TASK-520-01: menu-bar scrolled/radius/custom-shadow + brand icon/combo ---

const layoutOf = (out: MenuDocumentV2): Record<string, unknown> =>
  (out.sections[0]?.layout ?? {}) as Record<string, unknown>;
const brandPropsOf = (out: MenuDocumentV2): Record<string, unknown> =>
  (out.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props;

describe("TASK-520-01-L01 menu-bar layout scrolled variants + radius", () => {
  test("round-trips radius + scrolled color/width/shadow-enum keys", () => {
    const layout = {
      radius: 18,
      surfaceColorScrolled: "rgba(8,17,31,.84)",
      borderColorScrolled: "#ffffff2e",
      borderWidthScrolled: 2,
      shadowScrolled: "md",
    };
    const out = normalizeMenuDocumentV2ForWrite(doc([], { layout }));
    expect(layoutOf(out)).toEqual({
      ...layout,
      surfaceColorScrolled: "rgba(8, 17, 31, 0.84)",
    });
    // idempotent round-trip
    expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
  });

  test("rejects an unknown menu-bar layout key with a machine-readable path", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([], { layout: { bogus: 1 } })),
      "document.sections[0].layout.bogus"
    );
  });

  test("fails soft on bad values, clamps borderWidthScrolled, keeps siblings", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([], {
        layout: {
          radius: "x",
          shadowScrolled: "xl",
          surfaceColorScrolled: "url(x)",
          borderWidthScrolled: 999,
          borderColorScrolled: "#ffffff2e",
        },
      })
    );
    expect(layoutOf(out)).toEqual({ borderWidthScrolled: 8, borderColorScrolled: "#ffffff2e" });
  });

  test("present-only: an appearance-only layout is byte-identical (no extra keys)", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([], { layout: { surfaceColor: "#101828", sticky: true } })
    );
    expect(layoutOf(out)).toEqual({ surfaceColor: "#101828", sticky: true });
  });

  test("radius is per-device via responsive.mobile.layout and merges on resolve", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([], { layout: { radius: 18 }, responsive: { mobile: { layout: { radius: 8 } } } })
    );
    expect(layoutOf(out).radius).toBe(18);
    const resolved = resolveMenuSectionAppearanceForDevice(
      out.sections[0] as MenuSectionV2,
      "mobile"
    );
    expect((resolved.layout as Record<string, unknown>).radius).toBe(8);
  });

  test("MENU_BAR_LAYOUT_NUMBER_RANGES.radius bounds are exported for the slider", () => {
    expect(MENU_BAR_LAYOUT_NUMBER_RANGES.radius).toEqual({ min: 0, max: 40 });
  });
});

describe("TASK-520-01-L02 normalizeMenuBoxShadowValue (security-critical whitelist)", () => {
  test("accepts the owner token + hex8 + inset + 2-layer with canonical color bytes", () => {
    expect(normalizeMenuBoxShadowValue("0 18px 50px rgba(0,0,0,.24)")).toBe(
      "0 18px 50px rgba(0, 0, 0, 0.24)"
    );
    expect(normalizeMenuBoxShadowValue("0 8px 24px #0000003d")).toBe("0 8px 24px #0000003d");
    expect(normalizeMenuBoxShadowValue("inset 0 1px 2px #00000022")).toBe(
      "inset 0 1px 2px #00000022"
    );
    expect(normalizeMenuBoxShadowValue("0 2px 4px #000, 0 8px 16px #0003")).toBe(
      "0 2px 4px #000, 0 8px 16px #0003"
    );
  });

  test("keeps a color function with internal spaces as ONE token (bracket-aware)", () => {
    expect(normalizeMenuBoxShadowValue("0 18px 50px rgba(8, 17, 31, .84)")).toBe(
      "0 18px 50px rgba(8, 17, 31, 0.84)"
    );
  });

  test("passes each untouched embedded color token through the shared raw-byte boundary", () => {
    expect(shadowColorAtCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(shadowColorOverCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);

    for (const colorCase of shadowColorBoundaryCases) {
      const expected = colorCase.expected === null ? null : `0 0 ${colorCase.expected}`;
      expect(normalizeMenuBoxShadowValue(`0 0 ${colorCase.input}`), colorCase.id).toBe(expected);
    }
  });

  test("rejects injection / escape / non-grammar inputs (→ null)", () => {
    for (const bad of [
      "0 0 10px red;} body{display:none}",
      "0 0 5px url(x)",
      "0 0 5px expression(alert(1))",
      "0 0 5px var(--x)",
      "0 0 5px calc(1px)",
      "<script>",
      "0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000, 0 0 1px #000",
      "10px",
      "foo bar baz #fff",
      "0 0 5px red",
      `0 0 ${"1".repeat(210)}px #000`,
      42,
      null,
    ]) {
      expect(normalizeMenuBoxShadowValue(bad)).toBeNull();
    }
  });

  test("shadowCustom* round-trip via the document; invalid omitted, siblings survive", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([], {
        layout: {
          shadow: "sm",
          shadowCustom: "0 18px 50px rgba(0,0,0,.24)",
          shadowCustomScrolled: "0 8px 24px rgba(0,0,0,.3)",
        },
      })
    );
    expect(layoutOf(out)).toEqual({
      shadow: "sm",
      shadowCustom: "0 18px 50px rgba(0, 0, 0, 0.24)",
      shadowCustomScrolled: "0 8px 24px rgba(0, 0, 0, 0.3)",
    });
    const bad = normalizeMenuDocumentV2ForWrite(
      doc([], { layout: { radius: 6, shadowCustom: "0 0 10px red;}body{}" } })
    );
    expect(layoutOf(bad)).toEqual({ radius: 6 });
  });
});

describe("TASK-520-01-L03 brand icon mode + graphic-with-text combo", () => {
  const brandDoc = (props: Record<string, unknown>) => doc([{ type: "brand", props }]);

  test("icon mode round-trips with icon + showText + icon style", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({
        mode: "icon",
        href: "/",
        icon: "house",
        showText: true,
        style: { iconColor: "#f7fbffcc", iconSize: 28 },
      })
    );
    expect(brandPropsOf(out)).toEqual({
      mode: "icon",
      href: "/",
      icon: "house",
      showText: true,
      style: { iconColor: "#f7fbffcc", iconSize: 28 },
    });
  });

  test("image + showText combo round-trips", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({ mode: "image", href: "/", showText: true })
    );
    expect(brandPropsOf(out)).toEqual({ mode: "image", href: "/", showText: true });
  });

  test("icon name is lowercased; bad name / bad color / small size fail soft", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({
        mode: "icon",
        href: "/",
        icon: "Arrow-Right",
        style: { iconColor: "url(x)", iconSize: 5 },
      })
    );
    expect(brandPropsOf(out)).toEqual({
      mode: "icon",
      href: "/",
      icon: "arrow-right",
      style: { iconSize: 12 },
    });
  });

  test("invalid icon name is omitted (render falls through)", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({ mode: "icon", href: "/", icon: "../../etc" })
    );
    expect(brandPropsOf(out)).toEqual({ mode: "icon", href: "/" });
  });

  test("showText present-only: false is dropped, non-boolean throws", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      brandDoc({ mode: "text", href: "/", showText: false })
    );
    expect(brandPropsOf(out)).toEqual({ mode: "text", href: "/" });
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/", showText: "yes" })),
      "document.sections[0].blocks[0].props.showText"
    );
  });

  test("bad mode throws; unknown brand style key throws", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "svg", href: "/" })),
      "document.sections[0].blocks[0].props.mode"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          brandDoc({ mode: "icon", href: "/", style: { bogusStyle: 1 } })
        ),
      "document.sections[0].blocks[0].props.style.bogusStyle"
    );
  });

  test("back-compat: legacy text/image brand round-trips byte-identical", () => {
    const outText = normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/" }));
    expect(brandPropsOf(outText)).toEqual({ mode: "text", href: "/" });
    const outImage = normalizeMenuDocumentV2ForWrite(
      brandDoc({ mode: "image", href: "/", image: { src: "/logo.png", alt: "Logo" } })
    );
    const p = brandPropsOf(outImage);
    expect(p.mode).toBe("image");
    expect(p.icon).toBeUndefined();
    expect(p.showText).toBeUndefined();
    expect(BRAND_STYLE_NUMBER_RANGES.iconSize).toEqual({ min: 12, max: 64 });
  });
});

// Type-level anchors so a signature drift is caught at compile-time.
const _levelKeyAnchor: keyof NavLevelStyle = "flyoutAnimation";
const _chromeKeyAnchor: keyof NavChromeStyle = "navPillBackground";
void _levelKeyAnchor;
void _chromeKeyAnchor;
