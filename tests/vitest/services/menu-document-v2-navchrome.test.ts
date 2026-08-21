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

const brandBlock = (extra: Record<string, unknown> = {}) => ({
  id: "blk-brand",
  type: "brand",
  props: { mode: "text", href: "/", ...(extra.props ?? {}) },
  ...(extra.responsive ? { responsive: extra.responsive } : {}),
});
const navBlock = (props: Record<string, unknown> = {}) => ({
  id: "blk-nav",
  type: "nav-items",
  props,
});
const firstBlock = (d: MenuDocumentV2) => d.sections[0]!.blocks[0]!;
const firstSection = (d: MenuDocumentV2) => d.sections[0]!;

describe("menuDocumentV2 resolveBrandImageSrc (TASK-504-01 §3a B1)", () => {
  test("resolves the leaf `src` shape; null when absent/unresolvable", () => {
    expect(resolveBrandImageSrc({ src: "/media/logo.png", assetId: "a1", alt: "" })).toBe(
      "/media/logo.png"
    );
    expect(resolveBrandImageSrc({ src: "https://cdn.example.com/l.svg" })).toBe(
      "https://cdn.example.com/l.svg"
    );
    expect(resolveBrandImageSrc({ assetId: "a1", src: null })).toBeNull();
    expect(resolveBrandImageSrc(undefined)).toBeNull();
    expect(resolveBrandImageSrc({ src: "javascript:alert(1)" })).toBeNull();
  });
});

// ============================================================================
// TASK-506-01 — modern fields, F1 base-reset, F2 resolved-default provider
// ============================================================================

// Representative valid value per NEW NavLevelStyle key (fail-closed READ trap:
// each must round-trip AND join exactly one value partition).
const LEVEL_STYLE_NEW_VALUES: Record<string, unknown> = {
  itemDividerShow: true,
  itemDividerColor: "#abcdef",
  itemDividerWidth: 3,
  itemDividerStyle: "dashed",
  indicator: "underline",
  indicatorColor: "#123456",
  indicatorThickness: 4,
  indicatorGrow: true,
  hoverUnderline: true,
  transitionMs: 200,
  hoverLift: 5,
  showCaret: false,
  caretRotateOnOpen: true,
  flyoutAnimation: "slide",
  containerPaddingX: 20,
  containerPaddingY: 16,
  submenuPlacement: "bottom",
};

// Representative valid value per NEW navChrome key (no flyoutAnimation; + pill).
const NAV_CHROME_NEW_VALUES: Record<string, unknown> = {
  navPillBackground: "#eeeeee",
  navPillRadius: 24,
  navPillPaddingX: 12,
  navPillPaddingY: 8,
  itemDividerShow: true,
  itemDividerColor: "#abcdef",
  itemDividerWidth: 3,
  itemDividerStyle: "dotted",
  indicator: "overline",
  indicatorColor: "#123456",
  indicatorThickness: 5,
  indicatorGrow: true,
  hoverUnderline: true,
  transitionMs: 150,
  hoverLift: 4,
  showCaret: true,
  caretRotateOnOpen: true,
};

const navLevelStyleOf = (d: MenuDocumentV2, level: 1 | 2) =>
  (firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>).props.levelStyles?.[level];
const navChromeOf = (d: MenuDocumentV2) =>
  (firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>).props.navChrome;

describe("TASK-506-01 fail-closed READ-trap round-trip (NavLevelStyle new keys)", () => {
  test.each(Object.entries(LEVEL_STYLE_NEW_VALUES))(
    "levelStyles.1.%s round-trips write→read without dropping siblings",
    (key, value) => {
      const input = doc([navBlock({ levelStyles: { 1: { [key]: value, fontSize: 16 } } })]);
      const out = normalizeMenuDocumentV2ForWrite(input);
      expect(navLevelStyleOf(out, 1)).toEqual({ [key]: value, fontSize: 16 });
      // stored read is idempotent (proves no silent whole-record degrade):
      expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
      expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
    }
  );
});

describe("TASK-506-01 fail-closed READ-trap round-trip (navChrome new keys)", () => {
  test.each(Object.entries(NAV_CHROME_NEW_VALUES))(
    "navChrome.%s round-trips write→read without dropping siblings",
    (key, value) => {
      // Sibling must never collide with the tested key (all navChrome keys are new):
      const siblingKey = key === "showCaret" ? "itemDividerShow" : "showCaret";
      const input = doc([navBlock({ navChrome: { [key]: value, [siblingKey]: true } })]);
      const out = normalizeMenuDocumentV2ForWrite(input);
      expect(navChromeOf(out)).toEqual({ [key]: value, [siblingKey]: true });
      expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
      expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
    }
  );

  test("a stored doc carrying the whole navChrome set survives read intact", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ navChrome: NAV_CHROME_NEW_VALUES })])
    );
    expect(navChromeOf(out)).toEqual(NAV_CHROME_NEW_VALUES);
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
  });
});

// ============================================================================
// TASK-508-01 — linkAlign (NavLevelStyle) + submenuDirection/submenuMode (navChrome)
// ============================================================================

describe("TASK-508-01 fail-closed READ-trap round-trip (new keys)", () => {
  // R1(b): linkAlign on BOTH dropdown levels (survives read, siblings intact).
  test.each([1, 2] as const)("levelStyles.%s.linkAlign round-trips write→read", (level) => {
    const input = doc([
      navBlock({ levelStyles: { [level]: { linkAlign: "center", fontSize: 16 } } }),
    ]);
    const out = normalizeMenuDocumentV2ForWrite(input);
    expect(navLevelStyleOf(out, level)).toEqual({ linkAlign: "center", fontSize: 16 });
    // idempotent stored read ⇒ no silent whole-record degrade:
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
    expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
  });

  // R3a/R3b: submenuDirection + submenuMode on navChrome (base-only nav-global keys).
  test.each([
    ["submenuDirection", "up"],
    ["submenuDirection", "left"],
    ["submenuMode", "accordion"],
  ] as const)("navChrome.%s=%s round-trips write→read without dropping siblings", (key, value) => {
    const input = doc([navBlock({ navChrome: { [key]: value, showCaret: true } })]);
    const out = normalizeMenuDocumentV2ForWrite(input);
    expect(navChromeOf(out)).toEqual({ [key]: value, showCaret: true });
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
    expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
  });

  test("submenuDirection + submenuMode coexist on one navChrome record", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ navChrome: { submenuDirection: "down", submenuMode: "flyout" } })])
    );
    expect(navChromeOf(out)).toEqual({ submenuDirection: "down", submenuMode: "flyout" });
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
  });
});

describe("TASK-508-01 reject-unknown KEY throws with exact path", () => {
  test("unknown key under levelStyles still throws (linkAlign allowlist did not widen the guard)", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: { bogusAlign: 1 } } })])),
      "document.sections[0].blocks[0].props.levelStyles.1.bogusAlign"
    );
  });
  test("unknown key under navChrome still throws", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: { submenuFoo: "down" } })])),
      "document.sections[0].blocks[0].props.navChrome.submenuFoo"
    );
  });
});

describe("TASK-508-01 fail-soft VALUE omit (bad enum ⇒ OMIT, siblings survive, prune-empty)", () => {
  test("linkAlign:'top' OMITTED, sibling survives", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { linkAlign: "top", fontSize: 16 } } })])
    );
    expect(navLevelStyleOf(out, 1)).toEqual({ fontSize: 16 });
  });
  test("submenuDirection:'sideways' / submenuMode:'drawer' OMITTED, sibling survives", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([
        navBlock({
          navChrome: { submenuDirection: "sideways", submenuMode: "drawer", showCaret: true },
        }),
      ])
    );
    expect(navChromeOf(out)).toEqual({ showCaret: true });
  });
  test("a navChrome carrying ONLY bad new values prunes to undefined (byte-identical to never-set)", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ navChrome: { submenuDirection: "sideways", submenuMode: "drawer" } })])
    );
    expect(navChromeOf(out)).toBeUndefined();
    expect(
      "navChrome" in (firstBlock(out) as Extract<MenuBlockV2, { type: "nav-items" }>).props
    ).toBe(false);
  });
  test("a levelStyle carrying ONLY a bad linkAlign prunes to undefined", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { linkAlign: "top" } } })])
    );
    expect(navLevelStyleOf(out, 1)).toBeUndefined();
  });
});

describe("TASK-508-01 no schemaVersion bump + legacy byte-identity", () => {
  test("schemaVersion stays 1 after normalization", () => {
    const out = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    expect(out.schemaVersion).toBe(MENU_DOCUMENT_SCHEMA_VERSION);
    expect(MENU_DOCUMENT_SCHEMA_VERSION).toBe(1);
  });
  test("a legacy doc WITHOUT any new field normalizes byte-unchanged", () => {
    const legacy = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ itemGap: 8, levelStyles: { 1: { fontSize: 16 } } })])
    );
    expect(normalizeMenuDocumentV2ForWrite(legacy)).toEqual(legacy);
    expect(normalizeStoredMenuDocumentV2ForRead(legacy)).toEqual(legacy);
  });
});

describe("TASK-506-01 reject-unknown KEY throws with exact path", () => {
  test("base navChrome unknown key", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: { bogus: 1 } })])),
      "document.sections[0].blocks[0].props.navChrome.bogus"
    );
  });
  test("flyoutAnimation is NOT a navChrome key (levels-1/2 only) ⇒ reject", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([navBlock({ navChrome: { flyoutAnimation: "fade" } })])
        ),
      "document.sections[0].blocks[0].props.navChrome.flyoutAnimation"
    );
  });
  test("base levelStyles unknown modern key", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: { bogus: 1 } } })])),
      "document.sections[0].blocks[0].props.levelStyles.1.bogus"
    );
  });
  test("per-device responsive navChrome unknown key (with .navProps. prefix)", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([navBlock()], { responsive: { mobile: { navProps: { navChrome: { bogus: 1 } } } } })
        ),
      "document.sections[0].responsive.mobile.navProps.navChrome.bogus"
    );
  });
});

describe("TASK-506-01 fail-soft VALUE omit (new partitions)", () => {
  test("bad enum / non-boolean bool / non-finite number / bad color OMITTED, siblings intact", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([
        navBlock({
          levelStyles: {
            1: {
              indicator: "blink", // bad enum ⇒ omit
              showCaret: "yes", // non-boolean ⇒ omit
              indicatorThickness: Number.NaN, // non-finite ⇒ omit
              itemDividerColor: "not-a-color", // bad color ⇒ omit
              fontSize: 16, // valid sibling survives
            },
          },
        }),
      ])
    );
    expect(navLevelStyleOf(out, 1)).toEqual({ fontSize: 16 });
  });
});

describe("TASK-506-01 clamp bounds (new numerics, round + clamp)", () => {
  const clampLevel = (key: string, value: number) => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { [key]: value } } })])
    );
    return (navLevelStyleOf(out, 1) as Record<string, unknown> | undefined)?.[key];
  };
  const clampChrome = (key: string, value: number) => {
    const out = normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: { [key]: value } })]));
    return (navChromeOf(out) as Record<string, unknown> | undefined)?.[key];
  };
  test("itemDividerWidth 0→1 / 99→8", () => {
    expect(clampLevel("itemDividerWidth", 0)).toBe(NAV_LEVEL_NUMBER_RANGES.itemDividerWidth.min);
    expect(clampLevel("itemDividerWidth", 99)).toBe(NAV_LEVEL_NUMBER_RANGES.itemDividerWidth.max);
  });
  test("indicatorThickness 0→1 / 9→6", () => {
    expect(clampLevel("indicatorThickness", 0)).toBe(1);
    expect(clampLevel("indicatorThickness", 9)).toBe(6);
  });
  test("transitionMs -5→0 / 999→400", () => {
    expect(clampLevel("transitionMs", -5)).toBe(0);
    expect(clampLevel("transitionMs", 999)).toBe(400);
  });
  test("hoverLift -1→0 / 20→8", () => {
    expect(clampLevel("hoverLift", -1)).toBe(0);
    expect(clampLevel("hoverLift", 20)).toBe(8);
  });
  test("containerPaddingX/Y clamp", () => {
    expect(clampLevel("containerPaddingX", 99)).toBe(40);
    expect(clampLevel("containerPaddingY", 99)).toBe(32);
  });
  test("navPill radius/paddingX/paddingY clamp (navChrome table)", () => {
    expect(clampChrome("navPillRadius", 99)).toBe(NAV_CHROME_NUMBER_RANGES.navPillRadius.max);
    expect(clampChrome("navPillPaddingX", 99)).toBe(40);
    expect(clampChrome("navPillPaddingY", 99)).toBe(32);
  });
});

describe("TASK-506-01 navChrome split byte-identity", () => {
  test("absent navChrome ⇒ bare base (byte-identical to pre-506)", () => {
    const out = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    expect((firstBlock(out) as Extract<MenuBlockV2, { type: "nav-items" }>).props).toEqual({
      itemGap: 8,
    });
  });
  test("empty navChrome object ⇒ pruned, NO member", () => {
    const out = normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: {} })]));
    expect(navChromeOf(out)).toBeUndefined();
    expect(
      "navChrome" in (firstBlock(out) as Extract<MenuBlockV2, { type: "nav-items" }>).props
    ).toBe(false);
  });
});

describe("TASK-506-01 F1 base-clear byte-identity per surface", () => {
  test("clearMenuNavLevelStyleBase lands byte-identical to never-authored", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { fontSize: 16 } } })])
    );
    const id = d0.sections[0]!.id;
    const authored = patchMenuNavLevelStyleForDevice(d0, id, "desktop", 1, {
      indicator: "underline",
    });
    expect(readMenuNavLevelStyleBaseValue(firstSection(authored), 1, "indicator")).toBe(
      "underline"
    );
    const cleared = clearMenuNavLevelStyleBase(authored, id, 1, "indicator");
    expect(cleared).toEqual(d0);
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(d0));
  });

  test("clearMenuNavChromeBase prunes props.navChrome → props (byte-identical)", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    const id = d0.sections[0]!.id;
    const authored = patchMenuNavChromeForDevice(d0, id, "desktop", { navPillRadius: 20 });
    expect(readMenuNavChromeBaseValue(firstSection(authored), "navPillRadius")).toBe(20);
    const cleared = clearMenuNavChromeBase(authored, id, "navPillRadius");
    expect(cleared).toEqual(d0);
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(d0));
    expect(
      "navChrome" in (firstBlock(cleared) as Extract<MenuBlockV2, { type: "nav-items" }>).props
    ).toBe(false);
  });

  test("clearMenuSectionBase clears a flat level-0 scalar to legacy shape", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    const id = d0.sections[0]!.id;
    const authored = patchMenuSectionForDevice(d0, id, "desktop", "navProps", { linkPaddingX: 20 });
    expect(readMenuSectionBaseValue(firstSection(authored), "navProps", "linkPaddingX")).toBe(20);
    const cleared = clearMenuSectionBase(authored, id, "navProps", "linkPaddingX");
    expect(cleared).toEqual(d0);
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(d0));
  });

  test("clearMenuBrandStyleBase prunes props.style → props (byte-identical)", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(doc([brandBlock()]));
    const authored = patchMenuBrandStyleForDevice(d0, "blk-brand", "desktop", { fontSize: 20 });
    expect(readMenuBrandStyleBaseValue(firstBlock(authored), "fontSize")).toBe(20);
    const cleared = clearMenuBrandStyleBase(authored, "blk-brand", "fontSize");
    expect(cleared).toEqual(d0);
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(d0));
  });

  test("clearing a never-authored base field ⇒ identity", () => {
    const d0 = normalizeMenuDocumentV2ForWrite(doc([navBlock()]));
    const id = d0.sections[0]!.id;
    expect(clearMenuNavChromeBase(d0, id, "navPillRadius")).toEqual(d0);
    expect(clearMenuNavLevelStyleBase(d0, id, 1, "indicator")).toEqual(d0);
  });
});

describe("TASK-506-01 per-device navChrome delta + resolve", () => {
  const base = () =>
    normalizeMenuDocumentV2ForWrite(doc([navBlock({ navChrome: { navPillRadius: 20 } })]));

  test("tablet/mobile write only their own sparse navChrome record; mobile never reads tablet", () => {
    const d0 = base();
    const id = d0.sections[0]!.id;
    let d = patchMenuNavChromeForDevice(d0, id, "tablet", { indicator: "underline" });
    d = patchMenuNavChromeForDevice(d, id, "mobile", { indicator: "overline" });
    expect(firstSection(d).responsive?.tablet?.navProps?.navChrome).toEqual({
      indicator: "underline",
    });
    expect(firstSection(d).responsive?.mobile?.navProps?.navChrome).toEqual({
      indicator: "overline",
    });
    // resolve merges base ⊕ own delta only:
    expect(resolveMenuNavChrome(firstSection(d), "desktop")).toEqual({ navPillRadius: 20 });
    expect(resolveMenuNavChrome(firstSection(d), "tablet")).toEqual({
      navPillRadius: 20,
      indicator: "underline",
    });
    expect(resolveMenuNavChrome(firstSection(d), "mobile")).toEqual({
      navPillRadius: 20,
      indicator: "overline",
    });
    expect(readMenuNavChromeOverrideValue(firstSection(d), "mobile", "indicator")).toBe("overline");
    expect(
      readMenuNavChromeOverrideValue(firstSection(d), "mobile", "navPillRadius")
    ).toBeUndefined();
  });

  test("resolveMenuSectionAppearanceForDevice carries navChrome forward (deep-merge)", () => {
    const d0 = base();
    const id = d0.sections[0]!.id;
    const d = patchMenuNavChromeForDevice(d0, id, "tablet", { indicator: "underline" });
    const resolved = resolveMenuSectionAppearanceForDevice(firstSection(d), "tablet");
    expect(resolved.navProps.navChrome).toEqual({ navPillRadius: 20, indicator: "underline" });
  });

  test("clearMenuNavChromeOverride deep-prunes tablet/mobile to legacy shape", () => {
    const d0 = base();
    const id = d0.sections[0]!.id;
    let d = patchMenuNavChromeForDevice(d0, id, "mobile", { indicator: "overline" });
    d = clearMenuNavChromeOverride(d, id, "mobile", "indicator");
    expect(firstSection(d).responsive).toBeUndefined();
    expect(d).toEqual(d0);
  });

  test("per-device navChrome round-trips through the write normalizer", () => {
    const d0 = base();
    const id = d0.sections[0]!.id;
    const d = patchMenuNavChromeForDevice(d0, id, "mobile", { navPillPaddingX: 12 });
    expect(normalizeMenuDocumentV2ForWrite(d)).toEqual(d);
    expect(normalizeStoredMenuDocumentV2ForRead(d)).toEqual(d);
  });
});

describe("TASK-506-01 F2 resolveMenuControlDefault source labels", () => {
  const sectionOf = (navProps: Record<string, unknown> = {}, extra?: Record<string, unknown>) =>
    firstSection(normalizeMenuDocumentV2ForWrite(doc([navBlock(navProps)], extra)));

  test("level 0 unset ⇒ theme / base-sheet defaults", () => {
    const s = sectionOf();
    expect(resolveMenuControlDefault(s, "desktop", 0, "fontSize")).toEqual({
      value: NAV_FONT_SIZE_INHERITED,
      sourceLabel: `Inherited from theme (${NAV_FONT_SIZE_INHERITED}px)`,
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "paddingX")).toEqual({
      value: MENU_SHELL_DEFAULT_LINK_PX,
      sourceLabel: `Default ${MENU_SHELL_DEFAULT_LINK_PX}px`,
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "paddingY").value).toBe(
      MENU_SHELL_DEFAULT_LINK_PY
    );
    expect(resolveMenuControlDefault(s, "desktop", 0, "radius").value).toBe(
      MENU_SHELL_DEFAULT_LINK_RADIUS
    );
  });

  test("modern enum/bool defaults resolve from NAV_CHROME_DEFAULTS", () => {
    const s = sectionOf();
    expect(resolveMenuControlDefault(s, "desktop", 0, "submenuPlacement")).toEqual({
      value: NAV_CHROME_DEFAULTS.submenuPlacement,
      sourceLabel: "Default (Right)",
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "showCaret")).toEqual({
      value: true,
      sourceLabel: "Default (On)",
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "indicator").sourceLabel).toBe(
      "Default (None)"
    );
    expect(resolveMenuControlDefault(s, "desktop", 0, "itemDividerShow").sourceLabel).toBe(
      "Default (Off)"
    );
  });

  test("TASK-508-01 R3a/R3b/R1(b): new-enum hint entries resolve from NAV_CHROME_DEFAULTS", () => {
    const s = sectionOf();
    // R3a submenuDirection + R3b submenuMode are navChrome (level-0) keys:
    expect(resolveMenuControlDefault(s, "desktop", 0, "submenuDirection")).toEqual({
      value: "down",
      sourceLabel: "Default (Down)",
    });
    expect(resolveMenuControlDefault(s, "desktop", 0, "submenuMode")).toEqual({
      value: "flyout",
      sourceLabel: "Default (Flyout)",
    });
    // R1(b) linkAlign is a LEVEL key — NAV_CHROME_DEFAULTS serves it via the
    // level-agnostic hasOwnProperty branch (levels 1/2 fall through to it):
    expect(resolveMenuControlDefault(s, "desktop", 1, "linkAlign")).toEqual({
      value: "left",
      sourceLabel: "Default (Left)",
    });
    expect(resolveMenuControlDefault(s, "desktop", 2, "linkAlign")).toEqual({
      value: "left",
      sourceLabel: "Default (Left)",
    });
  });

  test("GATED present-only numerics ⇒ value undefined + Off/Not applied (NEVER range.min)", () => {
    const s = sectionOf();
    expect(resolveMenuControlDefault(s, "desktop", 1, "indicatorThickness")).toEqual({
      value: undefined,
      sourceLabel: "Off",
    });
    // TASK-508-01 R1(a): containerPaddingX/Y are NO LONGER gated — asserted in the
    // "R1(a) real container defaults" test below. The level-0 PILL numerics stay gated
    // (no base-sheet default when unset — no element painted):
    for (const key of ["navPillRadius", "navPillPaddingX", "navPillPaddingY"]) {
      expect(resolveMenuControlDefault(s, "desktop", 0, key)).toEqual({
        value: undefined,
        sourceLabel: "Not applied",
      });
    }
    // and definitely not the misleading range.min:
    expect(resolveMenuControlDefault(s, "desktop", 1, "itemDividerWidth").value).not.toBe(
      NAV_LEVEL_NUMBER_RANGES.itemDividerWidth.min
    );
  });

  test("TASK-508-01 R1(a): container controls resolve REAL base-sheet defaults (180 / 6), NOT 'Not applied'", () => {
    const s = sectionOf();
    // minWidth ⇒ 180px (mirrors .site-nav-sublist{min-width:180px}):
    expect(resolveMenuControlDefault(s, "desktop", 1, "minWidth")).toEqual({
      value: MENU_SHELL_SUBLIST_MIN_WIDTH,
      sourceLabel: `Default ${MENU_SHELL_SUBLIST_MIN_WIDTH}px`,
    });
    // containerPaddingX/Y ⇒ 6px (mirrors .site-nav-sublist{padding:6px}):
    for (const key of ["containerPaddingX", "containerPaddingY"]) {
      const r = resolveMenuControlDefault(s, "desktop", 1, key);
      expect(r).toEqual({
        value: MENU_SHELL_SUBLIST_PADDING,
        sourceLabel: `Default ${MENU_SHELL_SUBLIST_PADDING}px`,
      });
      // no longer the misleading "Not applied" / undefined thumb:
      expect(r.sourceLabel).not.toBe("Not applied");
      expect(r.value).not.toBeUndefined();
    }
  });

  test("level 2 unset WITH level 1 SET ⇒ Inherits level 1 (resolved number)", () => {
    const s = sectionOf({ levelStyles: { 1: { paddingX: 14 } } });
    expect(resolveMenuControlDefault(s, "desktop", 2, "paddingX")).toEqual({
      value: 14,
      sourceLabel: "Inherits level 1 (14px)",
    });
  });

  test("compound: level 2 unset WHILE level 1 ALSO unset ⇒ falls through, NEVER 'level 1 (undefined)'", () => {
    // nav base linkPaddingX set ⇒ falls to level 0:
    const s0 = sectionOf({ linkPaddingX: 10 });
    expect(resolveMenuControlDefault(s0, "desktop", 2, "paddingX")).toEqual({
      value: 10,
      sourceLabel: "Inherits level 0 (10px)",
    });
    // nav base ALSO unset ⇒ theme default, value defined (not undefined):
    const s1 = sectionOf();
    const r = resolveMenuControlDefault(s1, "desktop", 2, "paddingX");
    expect(r.value).toBe(MENU_SHELL_DEFAULT_LINK_PX);
    expect(r.sourceLabel).not.toContain("(undefined)");
  });

  test("tablet/mobile unset ⇒ Inherited from desktop (resolved desktop value)", () => {
    // layout base is section-scoped ⇒ reachable:
    const s = sectionOf({}, { layout: { paddingX: 30 } });
    expect(resolveMenuControlDefault(s, "tablet", "base", "paddingX")).toEqual({
      value: 30,
      sourceLabel: "Inherited from desktop",
    });
    // level field with a desktop value:
    const s2 = sectionOf({ levelStyles: { 2: { paddingX: 18 } } });
    expect(resolveMenuControlDefault(s2, "mobile", 2, "paddingX")).toEqual({
      value: 18,
      sourceLabel: "Inherited from desktop",
    });
  });

  test("compound device×level: level-2 unset on tablet WITH desktop-level-2 unset resolves via recursion", () => {
    const s = sectionOf({ levelStyles: { 1: { paddingX: 14 } } });
    const r = resolveMenuControlDefault(s, "tablet", 2, "paddingX");
    // value = resolved shallower (level-1) number; label stays the device-inherit label:
    expect(r.value).toBe(14);
    expect(r.sourceLabel).toBe("Inherited from desktop");
    expect(r.sourceLabel).not.toContain("(undefined)");
  });

  test("brand 'base' key unset on tablet/mobile ⇒ value undefined, NO 'Inherited from desktop'", () => {
    const s = sectionOf();
    const r = resolveMenuControlDefault(s, "tablet", "base", "color");
    expect(r.value).toBeUndefined();
    expect(r.sourceLabel).not.toBe("Inherited from desktop");
  });

  test("layout 'base' key unset on desktop ⇒ theme default from SHELL_APPEARANCE_DEFAULTS", () => {
    const s = sectionOf();
    expect(resolveMenuControlDefault(s, "desktop", "base", "paddingX")).toEqual({
      value: 24,
      sourceLabel: "Default 24px",
    });
  });

  test("provider never mutates the doc", () => {
    const s = sectionOf({ levelStyles: { 1: { paddingX: 14 } } });
    const before = JSON.stringify(s);
    resolveMenuControlDefault(s, "tablet", 2, "paddingX");
    expect(JSON.stringify(s)).toBe(before);
  });
});
