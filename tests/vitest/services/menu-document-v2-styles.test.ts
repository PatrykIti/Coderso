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

describe("menuDocumentV2 normalizeBrandStyle (TASK-504-01)", () => {
  test("accepts each text-mode + image-mode key, SPARSE (only present kept)", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        brandBlock({
          props: {
            style: {
              fontSize: 24,
              fontWeight: 700,
              color: "var(--color-primary)",
              textTransform: "uppercase",
              letterSpacing: 2,
              height: 48,
              maxWidth: 200,
            },
          },
        }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>;
    expect(block.props.style).toEqual({
      fontSize: 24,
      fontWeight: 700,
      color: "var(--color-primary)",
      textTransform: "uppercase",
      letterSpacing: 2,
      height: 48,
      maxWidth: 200,
    });
  });

  test("empty style ⇒ member omitted (legacy byte-identity)", () => {
    const d = normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style: {} } })]));
    expect("style" in (firstBlock(d) as { props: BrandProps }).props).toBe(false);
  });

  test("reject-unknown key ⇒ throw at the exact path", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style: { foo: 1 } } })])),
      "document.sections[0].blocks[0].props.style.foo"
    );
  });

  test("non-object / array style container ⇒ structural throw at path", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style: [] } })])),
      "document.sections[0].blocks[0].props.style"
    );
  });

  test("bad VALUES fail-soft (omitted, NOT thrown) — distinct from the flat subset", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        brandBlock({
          props: {
            style: { color: "not-a-color", fontSize: Number.NaN, fontWeight: 450, height: 40 },
          },
        }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>;
    // only the valid `height` survives; the three bad values are omitted, not thrown.
    expect(block.props.style).toEqual({ height: 40 });
  });

  test("NEW clamp ranges: letterSpacing negative allowed, fontSize 48, height/maxWidth bounds", () => {
    const styled = (style: Record<string, unknown>) =>
      (
        firstBlock(
          normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style } })]))
        ) as Extract<MenuBlockV2, { type: "brand" }>
      ).props.style;
    expect(styled({ letterSpacing: -2 })).toEqual({ letterSpacing: -2 });
    expect(styled({ letterSpacing: -3 })).toEqual({
      letterSpacing: BRAND_STYLE_NUMBER_RANGES.letterSpacing.min,
    });
    expect(styled({ fontSize: 48 })).toEqual({ fontSize: 48 });
    expect(styled({ fontSize: 999 })).toEqual({ fontSize: 48 });
    expect(styled({ fontSize: 1 })).toEqual({ fontSize: 10 });
    expect(styled({ height: 999 })).toEqual({ height: 120 });
    expect(styled({ maxWidth: 1 })).toEqual({ maxWidth: 40 });
  });
});

describe("menuDocumentV2 normalizeNavLevelStyles (TASK-504-01)", () => {
  test("accepts levels 1/2 with link + container fields; sparse + prune", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        navBlock({
          levelStyles: {
            1: {
              linkColor: "#111111",
              fontSize: 14,
              background: "#ffffff",
              borderWidth: 2,
              radius: 8,
              minWidth: 200,
              shadow: "md",
            },
            2: { linkColor: "#222222" },
          },
        }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>;
    expect(block.props.levelStyles).toEqual({
      1: {
        linkColor: "#111111",
        fontSize: 14,
        background: "#ffffff",
        borderWidth: 2,
        radius: 8,
        minWidth: 200,
        shadow: "md",
      },
      2: { linkColor: "#222222" },
    });
  });

  test("reject-unknown OUTER level key (0/3/junk) at levelStyles.<key>", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([navBlock({ levelStyles: { 0: { linkColor: "#111" } } })])
        ),
      "document.sections[0].blocks[0].props.levelStyles.0"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([navBlock({ levelStyles: { 3: { linkColor: "#111" } } })])
        ),
      "document.sections[0].blocks[0].props.levelStyles.3"
    );
  });

  test("reject-unknown per-level style key", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: { bogus: 1 } } })])),
      "document.sections[0].blocks[0].props.levelStyles.1.bogus"
    );
  });

  test("NEW ranges: minWidth [80,480], radius/borderWidth/gap/paddingX/paddingY", () => {
    const lvl = (style: Record<string, unknown>) =>
      (
        firstBlock(
          normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: style } })]))
        ) as Extract<MenuBlockV2, { type: "nav-items" }>
      ).props.levelStyles![1];
    expect(lvl({ minWidth: 1 })).toEqual({ minWidth: NAV_LEVEL_NUMBER_RANGES.minWidth.min });
    expect(lvl({ minWidth: 999 })).toEqual({ minWidth: 480 });
    expect(lvl({ radius: 999 })).toEqual({ radius: 32 });
    expect(lvl({ borderWidth: 999 })).toEqual({ borderWidth: 8 });
    expect(lvl({ gap: 999 })).toEqual({ gap: 32 });
    expect(lvl({ paddingX: 999 })).toEqual({ paddingX: 40 });
    expect(lvl({ paddingY: 999 })).toEqual({ paddingY: 32 });
  });

  test("empty level pruned; empty record ⇒ member omitted (bad values fail-soft)", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { linkColor: "nope" }, 2: {} } })])
    );
    expect("levelStyles" in (firstBlock(d) as { props: Record<string, unknown> }).props).toBe(
      false
    );
  });
});

describe("menuDocumentV2 normalizeNavItemsProps extension (TASK-504-01)", () => {
  test("scalars + levelStyles round-trip both", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ itemGap: 12, linkColor: "#111111", levelStyles: { 1: { fontSize: 16 } } })])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>;
    expect(block.props.itemGap).toBe(12);
    expect(block.props.linkColor).toBe("#111111");
    expect(block.props.levelStyles).toEqual({ 1: { fontSize: 16 } });
  });

  test("scalar bad value STILL THROWS (unchanged flat-subset behavior)", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ linkColor: "not-a-color" })])),
      "document.sections[0].blocks[0].props.linkColor"
    );
  });

  test("stray non-scalar/non-levelStyles key still rejects", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ bogusKey: 1 })])),
      "document.sections[0].blocks[0].props.bogusKey"
    );
  });

  test("cheap-win base scalars ride NAV_ITEMS_PROP_KEYS (round-trip)", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        navBlock({
          linkPaddingX: 20,
          linkPaddingY: 10,
          linkRadius: 8,
          linkHoverTextColor: "#abcdef",
        }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>;
    expect(block.props).toMatchObject({
      linkPaddingX: 20,
      linkPaddingY: 10,
      linkRadius: 8,
      linkHoverTextColor: "#abcdef",
    });
    expect(NAV_LINK_NUMBER_RANGES).toEqual({
      paddingX: { min: 0, max: 40 },
      paddingY: { min: 0, max: 32 },
      radius: { min: 0, max: 32 },
    });
  });

  test("LEVEL-0 key-namespace guard: bare NavLevelStyle keys at props ROOT still throw", () => {
    // paddingX/paddingY/radius/gap are NOT MenuAppearance base keys ⇒ reject-unknown
    // (proves the level-0 base writes linkPaddingX/linkPaddingY/linkRadius/itemGap).
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ paddingX: 10 })])),
      "document.sections[0].blocks[0].props.paddingX"
    );
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ radius: 10 })])),
      "document.sections[0].blocks[0].props.radius"
    );
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(doc([navBlock({ gap: 10 })])),
      "document.sections[0].blocks[0].props.gap"
    );
  });
});

describe("menuDocumentV2 fail-closed READ-trap round-trips (TASK-504-01)", () => {
  test("brand.props.style + navProps.levelStyles + responsive deltas survive IDENTICALLY", () => {
    const input = normalizeMenuDocumentV2ForWrite(
      doc(
        [
          brandBlock({
            props: { style: { fontSize: 22, color: "#111111" } },
            responsive: {
              tablet: { style: { fontSize: 18 } },
              mobile: { style: { fontSize: 14 } },
            },
          }),
          navBlock({
            linkColor: "#111111",
            levelStyles: { 1: { fontSize: 16 }, 2: { linkColor: "#222222" } },
          }),
        ],
        {
          responsive: {
            tablet: { navProps: { levelStyles: { 1: { fontSize: 18 } } } },
            mobile: { navProps: { levelStyles: { 1: { fontSize: 12 } } } },
          },
        }
      )
    );
    expect(normalizeStoredMenuDocumentV2ForRead(input)).toEqual(input);
    // sanity: the members actually materialized (guards against a vacuous pass).
    const brand = input.sections[0]!.blocks[0] as Extract<MenuBlockV2, { type: "brand" }>;
    expect(brand.props.style).toBeDefined();
    expect(brand.responsive?.mobile?.style).toEqual({ fontSize: 14 });
    expect(input.sections[0]!.responsive?.tablet?.navProps?.levelStyles?.[1]).toEqual({
      fontSize: 18,
    });
  });
});

describe("menuDocumentV2 per-device brand style model (TASK-504-01 §5)", () => {
  test("accepts {tablet|mobile}.style, prunes empty, rejects unknown style key", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([
        brandBlock({ responsive: { tablet: { style: { fontSize: 20 } }, mobile: { style: {} } } }),
      ])
    );
    const block = firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>;
    expect(block.responsive?.tablet?.style).toEqual({ fontSize: 20 });
    expect(block.responsive?.mobile).toBeUndefined(); // empty style pruned ⇒ no breakpoint
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([brandBlock({ responsive: { tablet: { style: { nope: 1 } } } })])
        ),
      "document.sections[0].blocks[0].responsive.tablet.style.nope"
    );
  });

  test("CONTROL-FLOW data-loss guard: a style delta WITHOUT visibility survives (not dropped)", () => {
    const styleOnly = normalizeMenuDocumentV2ForWrite(
      doc([brandBlock({ responsive: { mobile: { style: { fontSize: 14 } } } })])
    );
    expect(normalizeStoredMenuDocumentV2ForRead(styleOnly)).toEqual(styleOnly);
    expect(
      (styleOnly.sections[0]!.blocks[0] as Extract<MenuBlockV2, { type: "brand" }>).responsive
        ?.mobile?.style
    ).toEqual({ fontSize: 14 });
  });

  test("CONTROL-FLOW data-loss guard: empty/absent `visible` beside a style delta keeps the style", () => {
    // visibility present but with NO `visible` ⇒ the visibility assign is skipped;
    // the style branch MUST still run (the §5 continue→non-assign conversion).
    const mixed = normalizeMenuDocumentV2ForWrite(
      doc([brandBlock({ responsive: { tablet: { visibility: {}, style: { fontSize: 16 } } } })])
    );
    const record = (mixed.sections[0]!.blocks[0] as Extract<MenuBlockV2, { type: "brand" }>)
      .responsive?.tablet;
    expect(record?.style).toEqual({ fontSize: 16 });
    expect(record?.visibility).toBeUndefined();
    expect(normalizeStoredMenuDocumentV2ForRead(mixed)).toEqual(mixed);
  });
});

describe("menuDocumentV2 resolveMenuBrandStyleForDevice (TASK-504-01)", () => {
  const block = () =>
    firstBlock(
      normalizeMenuDocumentV2ForWrite(
        doc([
          brandBlock({
            props: { style: { fontSize: 24, color: "#111111" } },
            responsive: {
              tablet: { style: { fontSize: 18 } },
              mobile: { style: { fontSize: 12 } },
            },
          }),
        ])
      )
    );

  test("desktop = base; tablet/mobile = base ⊕ own delta; mobile ≠ tablet", () => {
    const b = block();
    expect(resolveMenuBrandStyleForDevice(b, "desktop")).toEqual({
      fontSize: 24,
      color: "#111111",
    });
    expect(resolveMenuBrandStyleForDevice(b, "tablet")).toEqual({ fontSize: 18, color: "#111111" });
    expect(resolveMenuBrandStyleForDevice(b, "mobile")).toEqual({ fontSize: 12, color: "#111111" });
  });

  test("non-brand block ⇒ {}", () => {
    const nav = firstBlock(normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })])));
    expect(resolveMenuBrandStyleForDevice(nav, "desktop")).toEqual({});
  });
});

describe("menuDocumentV2 patch/clear brand style per device (TASK-504-01)", () => {
  const base = () =>
    normalizeMenuDocumentV2ForWrite(doc([brandBlock({ props: { style: { fontSize: 24 } } })]));

  test("desktop writes props.style; tablet/mobile write responsive[bp].style", () => {
    let d = base();
    d = patchMenuBrandStyleForDevice(d, "blk-brand", "desktop", { color: "#222222" });
    expect((firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>).props.style).toEqual({
      fontSize: 24,
      color: "#222222",
    });
    d = patchMenuBrandStyleForDevice(d, "blk-brand", "mobile", { fontSize: 12 });
    expect(
      (firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>).responsive?.mobile?.style
    ).toEqual({
      fontSize: 12,
    });
    expect(hasMenuBrandStyleOverride(firstBlock(d), "mobile")).toBe(true);
    expect(hasMenuBrandStyleOverride(firstBlock(d), "tablet")).toBe(false);
    expect(hasMenuBrandStyleOverride(firstBlock(d))).toBe(true);
  });

  test("undefined patch value deletes the key; readOverrideValue is RAW hasOwnProperty", () => {
    let d = patchMenuBrandStyleForDevice(base(), "blk-brand", "mobile", {
      fontSize: 12,
      color: "#333333",
    });
    expect(readMenuBrandStyleOverrideValue(firstBlock(d), "mobile", "fontSize")).toBe(12);
    d = patchMenuBrandStyleForDevice(d, "blk-brand", "mobile", { fontSize: undefined });
    expect(readMenuBrandStyleOverrideValue(firstBlock(d), "mobile", "fontSize")).toBeUndefined();
    expect(
      (firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>).responsive?.mobile?.style
    ).toEqual({
      color: "#333333",
    });
  });

  test("clear prunes style ⇒ override ⇒ responsive to byte-identical legacy shape", () => {
    const legacy = base();
    let d = patchMenuBrandStyleForDevice(legacy, "blk-brand", "tablet", { fontSize: 18 });
    d = clearMenuBrandStyleOverride(d, "blk-brand", "tablet", "fontSize");
    expect(d).toEqual(legacy);
    expect((firstBlock(d) as Extract<MenuBlockV2, { type: "brand" }>).responsive).toBeUndefined();
  });

  test("patch on a non-brand block ⇒ identity", () => {
    const nav = normalizeMenuDocumentV2ForWrite(doc([navBlock({ itemGap: 8 })]));
    expect(patchMenuBrandStyleForDevice(nav, "blk-nav", "mobile", { fontSize: 12 })).toEqual(nav);
  });
});

describe("menuDocumentV2 nav-level resolve/deep-merge (TASK-504-01)", () => {
  test("resolveMenuSectionAppearanceForDevice DEEP-merges levelStyles per level per field", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { fontSize: 16, linkColor: "#111111" } } })], {
        responsive: { mobile: { navProps: { levelStyles: { 1: { fontSize: 12 } } } } },
      })
    );
    const section = firstSection(d);
    // override field wins, unset field inherits desktop:
    expect(resolveMenuSectionAppearanceForDevice(section, "mobile").navProps.levelStyles).toEqual({
      1: { fontSize: 12, linkColor: "#111111" },
    });
    // desktop unchanged; tablet has no override ⇒ inherits desktop:
    expect(resolveMenuSectionAppearanceForDevice(section, "desktop").navProps.levelStyles).toEqual({
      1: { fontSize: 16, linkColor: "#111111" },
    });
    expect(resolveMenuSectionAppearanceForDevice(section, "tablet").navProps.levelStyles).toEqual({
      1: { fontSize: 16, linkColor: "#111111" },
    });
  });

  test("resolveMenuNavLevelStyle single-level: desktop base; device ⊕ delta; mobile ≠ tablet", () => {
    const d = normalizeMenuDocumentV2ForWrite(
      doc([navBlock({ levelStyles: { 1: { fontSize: 16 }, 2: { linkColor: "#222222" } } })], {
        responsive: {
          tablet: { navProps: { levelStyles: { 1: { fontSize: 18 } } } },
          mobile: { navProps: { levelStyles: { 1: { fontSize: 12 } } } },
        },
      })
    );
    const section = firstSection(d);
    expect(resolveMenuNavLevelStyle(section, "desktop", 1)).toEqual({ fontSize: 16 });
    expect(resolveMenuNavLevelStyle(section, "tablet", 1)).toEqual({ fontSize: 18 });
    expect(resolveMenuNavLevelStyle(section, "mobile", 1)).toEqual({ fontSize: 12 });
    expect(resolveMenuNavLevelStyle(section, "mobile", 2)).toEqual({ linkColor: "#222222" });
  });
});

describe("menuDocumentV2 patch/clear nav-level style per device (TASK-504-01)", () => {
  const base = () =>
    normalizeMenuDocumentV2ForWrite(doc([navBlock({ levelStyles: { 1: { fontSize: 16 } } })]));

  test("desktop writes nav block props.levelStyles[level]", () => {
    const d0 = base();
    const d = patchMenuNavLevelStyleForDevice(d0, d0.sections[0]!.id, "desktop", 1, {
      linkColor: "#111111",
    });
    expect(
      (firstBlock(d) as Extract<MenuBlockV2, { type: "nav-items" }>).props.levelStyles
    ).toEqual({
      1: { fontSize: 16, linkColor: "#111111" },
    });
  });

  test("tablet writes responsive[bp].navProps.levelStyles[level]; nested raw read reports Override vs Inherited", () => {
    const d0 = base();
    const d = patchMenuNavLevelStyleForDevice(d0, d0.sections[0]!.id, "mobile", 1, {
      fontSize: 12,
    });
    expect(firstSection(d).responsive?.mobile?.navProps?.levelStyles?.[1]).toEqual({
      fontSize: 12,
    });
    expect(readMenuNavLevelStyleOverrideValue(firstSection(d), "mobile", 1, "fontSize")).toBe(12);
    expect(
      readMenuNavLevelStyleOverrideValue(firstSection(d), "mobile", 1, "linkColor")
    ).toBeUndefined();
  });

  test("clearing ONE nested field DEEP-prunes to legacy shape while a sibling level survives", () => {
    const d0 = base();
    let d = patchMenuNavLevelStyleForDevice(d0, d0.sections[0]!.id, "mobile", 1, { fontSize: 12 });
    d = patchMenuNavLevelStyleForDevice(d, d0.sections[0]!.id, "mobile", 2, {
      linkColor: "#999999",
    });
    d = clearMenuNavLevelStyleOverride(d, d0.sections[0]!.id, "mobile", 1, "fontSize");
    // level-1 field cleared, but level-2 sibling still present ⇒ responsive retained:
    expect(firstSection(d).responsive?.mobile?.navProps?.levelStyles).toEqual({
      2: { linkColor: "#999999" },
    });
    d = clearMenuNavLevelStyleOverride(d, d0.sections[0]!.id, "mobile", 2, "linkColor");
    // now fully pruned ⇒ byte-identical legacy shape (no responsive member):
    expect(firstSection(d).responsive).toBeUndefined();
    expect(d).toEqual(d0);
  });

  test("desktop level-0 scalar overrides still route through patchMenuSectionForDevice (no regression)", () => {
    const d0 = base();
    const d = patchMenuSectionForDevice(d0, d0.sections[0]!.id, "mobile", "navProps", {
      itemGap: 24,
    });
    expect(firstSection(d).responsive?.mobile?.navProps).toEqual({ itemGap: 24 });
  });
});
