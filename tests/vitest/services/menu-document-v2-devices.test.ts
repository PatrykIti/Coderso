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

describe("menuDocumentV2 per-device resolve/read helpers (TASK-501-01)", () => {
  const sectionFixture: MenuSectionV2 = {
    id: "sec-1",
    type: "menu-bar",
    name: "Menu bar",
    layout: { paddingY: 16, surfaceColor: "#0f172a" },
    blocks: [{ id: "blk-nav", type: "nav-items", props: { itemGap: 8, fontSize: 14 } }],
    responsive: {
      mobile: {
        layout: { paddingY: 4 },
        navProps: { orientation: "vertical" },
      },
    },
  };

  test("desktop resolves the base; a mobile-only override leaves tablet === desktop (mobile does NOT leak to tablet)", () => {
    const desktop = resolveMenuSectionAppearanceForDevice(sectionFixture, "desktop");
    expect(desktop.layout).toEqual({ paddingY: 16, surfaceColor: "#0f172a" });
    expect(desktop.navProps).toEqual({ itemGap: 8, fontSize: 14 });
    // The fixture carries ONLY a mobile record ⇒ tablet reads its OWN (absent)
    // record and inherits the desktop base unchanged.
    expect(resolveMenuSectionAppearanceForDevice(sectionFixture, "tablet")).toEqual(desktop);
  });

  test("mobile resolves base merged with the sparse override (overridden key wins, others inherit)", () => {
    const mobile = resolveMenuSectionAppearanceForDevice(sectionFixture, "mobile");
    expect(mobile.layout).toEqual({ paddingY: 4, surfaceColor: "#0f172a" });
    expect(mobile.navProps).toEqual({ itemGap: 8, fontSize: 14, orientation: "vertical" });
  });

  test("readMenuSectionOverrideValue reads the RAW override, never the merge", () => {
    expect(readMenuSectionOverrideValue(sectionFixture, "mobile", "layout", "paddingY")).toBe(4);
    expect(readMenuSectionOverrideValue(sectionFixture, "mobile", "navProps", "orientation")).toBe(
      "vertical"
    );
    // Inherited (base-only) keys read undefined — badge shows Inherited.
    expect(
      readMenuSectionOverrideValue(sectionFixture, "mobile", "layout", "surfaceColor")
    ).toBeUndefined();
    expect(
      readMenuSectionOverrideValue(sectionFixture, "mobile", "navProps", "itemGap")
    ).toBeUndefined();
  });
});

describe("menuDocumentV2 patchMenuSectionForDevice (TASK-501-01)", () => {
  const makeDoc = (): MenuDocumentV2 => ({
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: "sec-1",
        type: "menu-bar",
        name: "Menu bar",
        layout: { paddingY: 16 },
        blocks: [{ id: "blk-nav", type: "nav-items", props: { itemGap: 8 } }],
      },
    ],
  });

  test("desktop patch mutates the base and leaves responsive absent", () => {
    const out = patchMenuSectionForDevice(makeDoc(), "sec-1", "desktop", "layout", {
      paddingY: 2,
    });
    expect(out.sections[0]?.layout).toEqual({ paddingY: 2 });
    expect("responsive" in (out.sections[0] as MenuSectionV2)).toBe(false);
    const nav = patchMenuSectionForDevice(makeDoc(), "sec-1", "desktop", "navProps", {
      orientation: "vertical",
    });
    expect((nav.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      itemGap: 8,
      orientation: "vertical",
    });
    expect("responsive" in (nav.sections[0] as MenuSectionV2)).toBe(false);
  });

  test("tablet patch writes its OWN sparse responsive.tablet record and leaves the base untouched", () => {
    const out = patchMenuSectionForDevice(makeDoc(), "sec-1", "tablet", "layout", { paddingY: 2 });
    expect(out.sections[0]?.responsive).toEqual({ tablet: { layout: { paddingY: 2 } } });
    expect(out.sections[0]?.layout).toEqual({ paddingY: 16 }); // base untouched
    const nav = patchMenuSectionForDevice(makeDoc(), "sec-1", "tablet", "navProps", {
      orientation: "vertical",
    });
    expect(nav.sections[0]?.responsive).toEqual({
      tablet: { navProps: { orientation: "vertical" } },
    });
    // The base nav-items props stay untouched by a tablet write.
    expect((nav.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      itemGap: 8,
    });
  });

  test("a tablet patch NEVER touches an existing mobile record and vice versa", () => {
    const withMobile = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", {
      paddingY: 4,
    });
    const both = patchMenuSectionForDevice(withMobile, "sec-1", "tablet", "layout", {
      paddingY: 8,
    });
    expect(both.sections[0]?.responsive).toEqual({
      mobile: { layout: { paddingY: 4 } },
      tablet: { layout: { paddingY: 8 } },
    });
    // Clearing the tablet override leaves the mobile record deep-equal to before.
    const clearedTablet = clearMenuSectionOverride(both, "sec-1", "tablet", "layout", "paddingY");
    expect(clearedTablet.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 4 } } });
  });

  test("mobile patch creates the sparse record with ONLY the patched key; a second patch merges", () => {
    const one = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", { paddingY: 2 });
    expect(one.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 2 } } });
    // Base untouched.
    expect(one.sections[0]?.layout).toEqual({ paddingY: 16 });
    const two = patchMenuSectionForDevice(one, "sec-1", "mobile", "navProps", {
      orientation: "vertical",
    });
    expect(two.sections[0]?.responsive).toEqual({
      mobile: { layout: { paddingY: 2 }, navProps: { orientation: "vertical" } },
    });
    // Sibling override keys survive a merge within the same group.
    const three = patchMenuSectionForDevice(two, "sec-1", "mobile", "navProps", { itemGap: 20 });
    expect(three.sections[0]?.responsive?.mobile?.navProps).toEqual({
      orientation: "vertical",
      itemGap: 20,
    });
  });

  test("NO auto-remove-on-equality: patching mobile with the exact base value still stores the override", () => {
    const out = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", { paddingY: 16 });
    expect(out.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 16 } } });
  });

  test("multi-nav-items write target: desktop navProps patch mutates ONLY the FIRST nav-items block", () => {
    const base = makeDoc();
    const secondNav: MenuBlockV2 = { id: "blk-nav-2", type: "nav-items", props: { itemGap: 4 } };
    const twoNavDoc: MenuDocumentV2 = {
      ...base,
      sections: [
        {
          ...(base.sections[0] as MenuSectionV2),
          blocks: [...(base.sections[0] as MenuSectionV2).blocks, secondNav],
        },
      ],
    };
    const out = patchMenuSectionForDevice(twoNavDoc, "sec-1", "desktop", "navProps", {
      fontSize: 18,
    });
    expect((out.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      itemGap: 8,
      fontSize: 18,
    });
    // The second nav-items block is untouched (reference-identical).
    expect(out.sections[0]?.blocks[1]).toBe(secondNav);
  });

  test("no nav-items block ⇒ identity on a desktop navProps patch; unknown sectionId ⇒ identity", () => {
    const base = makeDoc();
    const noNavDoc: MenuDocumentV2 = {
      ...base,
      sections: [{ ...(base.sections[0] as MenuSectionV2), blocks: [] }],
    };
    const out = patchMenuSectionForDevice(noNavDoc, "sec-1", "desktop", "navProps", {
      fontSize: 18,
    });
    expect(out.sections[0]).toEqual(noNavDoc.sections[0]);
    expect(
      patchMenuSectionForDevice(base, "sec-missing", "mobile", "layout", { paddingY: 2 })
    ).toBe(base);
  });

  test("delete-on-undefined: desktop deletes the base key; mobile deletes the override leaf and prunes", () => {
    const desktopOut = patchMenuSectionForDevice(makeDoc(), "sec-1", "desktop", "layout", {
      paddingY: undefined,
    });
    expect(desktopOut.sections[0]?.layout).toEqual({});
    expect(Object.prototype.hasOwnProperty.call(desktopOut.sections[0]?.layout, "paddingY")).toBe(
      false
    );

    const withOverride = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", {
      paddingY: 2,
    });
    const cleared = patchMenuSectionForDevice(withOverride, "sec-1", "mobile", "layout", {
      paddingY: undefined,
    });
    // Sole override deleted ⇒ the whole responsive chain prunes back to the
    // pre-override document (never an own `undefined` key).
    expect(cleared).toEqual(makeDoc());
    expect("responsive" in (cleared.sections[0] as MenuSectionV2)).toBe(false);
    expect(
      readMenuSectionOverrideValue(
        cleared.sections[0] as MenuSectionV2,
        "mobile",
        "layout",
        "paddingY"
      )
    ).toBeUndefined();

    // Undefined patch for a key absent from the target leaves no residue.
    const noResidue = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "navProps", {
      fontWeight: undefined,
    });
    expect(noResidue).toEqual(makeDoc());
  });
});

describe("menuDocumentV2 clearMenuSectionOverride (TASK-501-01)", () => {
  const makeDoc = (): MenuDocumentV2 => ({
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: "sec-1",
        type: "menu-bar",
        name: "Menu bar",
        layout: { paddingY: 16 },
        blocks: [{ id: "blk-nav", type: "nav-items", props: {} }],
      },
    ],
  });

  test("removes one key; removing the last key prunes group ⇒ breakpoint ⇒ responsive", () => {
    let patched = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", {
      paddingY: 2,
      paddingX: 4,
    });
    patched = clearMenuSectionOverride(patched, "sec-1", "mobile", "layout", "paddingX");
    expect(patched.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 2 } } });
    const fullyCleared = clearMenuSectionOverride(patched, "sec-1", "mobile", "layout", "paddingY");
    // Deep-equals the pre-override document (byte-identical legacy shape).
    expect(fullyCleared).toEqual(makeDoc());
    expect("responsive" in (fullyCleared.sections[0] as MenuSectionV2)).toBe(false);
  });

  test("clearing keeps sibling groups intact", () => {
    let patched = patchMenuSectionForDevice(makeDoc(), "sec-1", "mobile", "layout", {
      paddingY: 2,
    });
    patched = patchMenuSectionForDevice(patched, "sec-1", "mobile", "navProps", {
      orientation: "vertical",
    });
    const cleared = clearMenuSectionOverride(patched, "sec-1", "mobile", "layout", "paddingY");
    expect(cleared.sections[0]?.responsive).toEqual({
      mobile: { navProps: { orientation: "vertical" } },
    });
  });

  test("clearing a non-existent override is an identity return", () => {
    const base = makeDoc();
    const out = clearMenuSectionOverride(base, "sec-1", "mobile", "layout", "paddingY");
    expect(out.sections[0]).toBe(base.sections[0]);
    expect(clearMenuSectionOverride(base, "sec-missing", "mobile", "layout", "paddingY")).toBe(
      base
    );
  });

  test("patch/clear are immutable — the input document object is never mutated (TASK-501-04)", () => {
    const input = makeDoc();
    const snapshot = structuredClone(input);

    const patched = patchMenuSectionForDevice(input, "sec-1", "mobile", "layout", { paddingY: 2 });
    expect(patched).not.toBe(input);
    expect(input).toEqual(snapshot);

    const basePatched = patchMenuSectionForDevice(input, "sec-1", "desktop", "layout", {
      paddingY: 20,
    });
    expect(basePatched).not.toBe(input);
    expect(input).toEqual(snapshot);

    expect(clearMenuSectionOverride(patched, "sec-1", "mobile", "layout", "paddingY")).not.toBe(
      patched
    );
    expect(patched.sections[0]?.responsive).toEqual({ mobile: { layout: { paddingY: 2 } } });
    expect(input).toEqual(snapshot);
  });
});

describe("menuDocumentV2 block visibility per device (TASK-501-01)", () => {
  const nativeBlock: MenuBlockV2 = { id: "blk-nav", type: "nav-items", props: {} };
  const leafVisible: MenuBlockV2 = {
    id: "blk-cta",
    type: "cta-button",
    props: {},
    visibility: { visible: true },
  };
  const leafHidden: MenuBlockV2 = {
    id: "blk-cta-hidden",
    type: "cta-button",
    props: {},
    visibility: { visible: false },
  };

  const makeDoc = (blocks: MenuBlockV2[]): MenuDocumentV2 => ({
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [{ id: "sec-1", type: "menu-bar", name: "Menu bar", layout: {}, blocks }],
  });

  test("resolveMenuBlockVisibleForDevice: desktop = flat visibility (native ⇒ true); tablet inherits desktop with no tablet record", () => {
    expect(resolveMenuBlockVisibleForDevice(nativeBlock, "desktop")).toBe(true);
    expect(resolveMenuBlockVisibleForDevice(leafVisible, "desktop")).toBe(true);
    expect(resolveMenuBlockVisibleForDevice(leafHidden, "desktop")).toBe(false);
    // No tablet record ⇒ tablet inherits the flat/desktop value.
    expect(resolveMenuBlockVisibleForDevice(leafHidden, "tablet")).toBe(false);
  });

  test("mobile override wins over the flat value in BOTH directions; no override ⇒ inherits desktop", () => {
    // hide-on-mobile: flat visible + mobile false.
    const hideOnMobile: MenuBlockV2 = {
      ...leafVisible,
      responsive: { mobile: { visibility: { visible: false } } },
    };
    expect(resolveMenuBlockVisibleForDevice(hideOnMobile, "desktop")).toBe(true);
    expect(resolveMenuBlockVisibleForDevice(hideOnMobile, "mobile")).toBe(false);
    // show-only-on-mobile: flat false + mobile true.
    const showOnlyOnMobile: MenuBlockV2 = {
      ...leafHidden,
      responsive: { mobile: { visibility: { visible: true } } },
    };
    expect(resolveMenuBlockVisibleForDevice(showOnlyOnMobile, "desktop")).toBe(false);
    expect(resolveMenuBlockVisibleForDevice(showOnlyOnMobile, "mobile")).toBe(true);
    // No override ⇒ mobile inherits desktop.
    expect(resolveMenuBlockVisibleForDevice(leafHidden, "mobile")).toBe(false);
    expect(resolveMenuBlockVisibleForDevice(nativeBlock, "mobile")).toBe(true);
  });

  test("hasMenuBlockVisibilityOverride detects the record", () => {
    expect(hasMenuBlockVisibilityOverride(nativeBlock)).toBe(false);
    expect(
      hasMenuBlockVisibilityOverride({
        ...nativeBlock,
        responsive: { mobile: { visibility: { visible: false } } },
      })
    ).toBe(true);
  });

  test("setMenuBlockVisibleForDevice: mobile writes the sparse override on native AND leaf blocks", () => {
    const base = makeDoc([nativeBlock, leafVisible]);
    const out = setMenuBlockVisibleForDevice(
      setMenuBlockVisibleForDevice(base, "blk-nav", "mobile", false),
      "blk-cta",
      "mobile",
      false
    );
    expect(out.sections[0]?.blocks[0]?.responsive).toEqual({
      mobile: { visibility: { visible: false } },
    });
    expect(out.sections[0]?.blocks[1]?.responsive).toEqual({
      mobile: { visibility: { visible: false } },
    });
    // Flat leaf visibility untouched by a mobile write.
    expect(
      (out.sections[0]?.blocks[1] as { visibility?: { visible: boolean } }).visibility
    ).toEqual({ visible: true });
  });

  test("setMenuBlockVisibleForDevice: desktop writes flat visibility on leaf blocks; native ⇒ documented no-op", () => {
    const base = makeDoc([nativeBlock, leafVisible]);
    const leafOut = setMenuBlockVisibleForDevice(base, "blk-cta", "desktop", false);
    expect(
      (leafOut.sections[0]?.blocks[1] as { visibility?: { visible: boolean } }).visibility
    ).toEqual({ visible: false });
    expect("responsive" in (leafOut.sections[0]?.blocks[1] as MenuBlockV2)).toBe(false);
    const nativeOut = setMenuBlockVisibleForDevice(base, "blk-nav", "desktop", false);
    expect(nativeOut.sections[0]?.blocks[0]).toBe(nativeBlock);
    expect("visibility" in (nativeOut.sections[0]?.blocks[0] as MenuBlockV2)).toBe(false);
    // Unknown block id ⇒ identity.
    expect(setMenuBlockVisibleForDevice(base, "blk-missing", "mobile", false)).toBe(base);
  });

  test("clearMenuBlockVisibilityOverride prunes back to the pre-override block shape", () => {
    const base = makeDoc([nativeBlock, leafVisible]);
    const withOverride = setMenuBlockVisibleForDevice(base, "blk-nav", "mobile", false);
    const cleared = clearMenuBlockVisibilityOverride(withOverride, "blk-nav", "mobile");
    expect(cleared).toEqual(base);
    expect("responsive" in (cleared.sections[0]?.blocks[0] as MenuBlockV2)).toBe(false);
    // Clearing a non-existent override is an identity return.
    const noop = clearMenuBlockVisibilityOverride(base, "blk-nav", "mobile");
    expect(noop.sections[0]?.blocks[0]).toBe(nativeBlock);
    expect(clearMenuBlockVisibilityOverride(base, "blk-missing", "mobile")).toBe(base);
  });
});

// --- TASK-502-01: brand.text ------------------------------------------------

describe("menuDocumentV2 brand text (TASK-502-01)", () => {
  const brandDoc = (props: Record<string, unknown>) =>
    doc([{ id: "blk-brand", type: "brand", props }]);
  const readBrand = (props: Record<string, unknown>) =>
    normalizeMenuDocumentV2ForWrite(brandDoc(props)).sections[0]?.blocks[0] as {
      props: BrandProps;
    };

  test("accepts a text override, round-tripping through the strict writer", () => {
    expect(readBrand({ mode: "text", href: "/", text: "Acme Corp" }).props.text).toBe("Acme Corp");
  });

  test("trims surrounding whitespace", () => {
    expect(readBrand({ mode: "text", href: "/", text: "  Acme  " }).props.text).toBe("Acme");
  });

  test("caps at MENU_BRAND_TEXT_MAX_LENGTH without throwing", () => {
    const long = "a".repeat(200);
    const stored = readBrand({ mode: "text", href: "/", text: long }).props.text;
    expect(stored).toBe("a".repeat(MENU_BRAND_TEXT_MAX_LENGTH));
    expect(stored?.length).toBe(MENU_BRAND_TEXT_MAX_LENGTH);
  });

  test("empty / whitespace / null store NO text member (sparse omit ⇒ inherit site name)", () => {
    for (const text of ["", "   ", null]) {
      const props = readBrand({ mode: "text", href: "/", text }).props;
      expect("text" in props).toBe(false);
    }
  });

  test("rejects a non-string text with the exact path", () => {
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/", text: 42 })),
      "document.sections[0].blocks[0].props.text"
    );
    expectDocError(
      () => normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/", text: {} })),
      "document.sections[0].blocks[0].props.text"
    );
  });

  test("a legacy brand WITHOUT text round-trips deep-equal (no text member materializes)", () => {
    const legacy = normalizeMenuDocumentV2ForWrite(brandDoc({ mode: "text", href: "/" }));
    const read = normalizeStoredMenuDocumentV2ForRead(legacy);
    expect(read).toEqual(legacy);
    const props = read.sections[0]?.blocks[0]?.props as BrandProps;
    expect("text" in props).toBe(false);
  });

  test("createDefaultMenuDocumentV2 and buildMenuDocumentV2FromLegacy stay textless", () => {
    const def = createDefaultMenuDocumentV2();
    const brand = def.sections[0]?.blocks.find((block) => block.type === "brand");
    expect("text" in (brand as { props: BrandProps }).props).toBe(false);
    const built = buildMenuDocumentV2FromLegacy(null, [
      createPageBlockV2("image", { id: "blk-logo" }),
    ]);
    const builtBrand = built?.sections[0]?.blocks.find((block) => block.type === "brand");
    expect("text" in (builtBrand as { props: BrandProps }).props).toBe(false);
  });
});

// --- TASK-502-01: tablet breakpoint round-trip + reject ----------------------

describe("menuDocumentV2 tablet breakpoint (TASK-502-01)", () => {
  test("section tablet layout/navProps + tablet & mobile side-by-side round-trip deep-equal", () => {
    const input = doc(
      [
        {
          id: "blk-nav",
          type: "nav-items",
          props: { itemGap: 8 },
          responsive: {
            tablet: { visibility: { visible: false } },
            mobile: { visibility: { visible: true } },
          },
        },
        {
          id: "blk-cta",
          type: "cta-button",
          props: { label: "Go", href: "/x", target: "self", variant: "primary", size: "md" },
          visibility: { visible: true },
          responsive: { tablet: { visibility: { visible: false } } },
        },
      ],
      {
        responsive: {
          tablet: { layout: { paddingY: 12 }, navProps: { itemGap: 24 } },
          mobile: { layout: { paddingY: 4 }, navProps: { orientation: "vertical" } },
        },
      }
    );
    const out = normalizeMenuDocumentV2ForWrite(input);
    const section0 = out.sections[0] as MenuSectionV2;
    expect(section0.responsive).toEqual({
      tablet: { layout: { paddingY: 12 }, navProps: { itemGap: 24 } },
      mobile: { layout: { paddingY: 4 }, navProps: { orientation: "vertical" } },
    });
    expect(section0.blocks[0]?.responsive).toEqual({
      tablet: { visibility: { visible: false } },
      mobile: { visibility: { visible: true } },
    });
    expect(section0.blocks[1]?.responsive).toEqual({ tablet: { visibility: { visible: false } } });
    // Idempotent through BOTH the writer and the stored read.
    expect(normalizeMenuDocumentV2ForWrite(out)).toEqual(out);
    expect(normalizeStoredMenuDocumentV2ForRead(out)).toEqual(out);
  });

  test("reject-unknown: cross-subset keys inside a tablet record throw with the exact path", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { tablet: { layout: { linkColor: "var(--color-primary)" } } } })
        ),
      "document.sections[0].responsive.tablet.layout.linkColor"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { tablet: { navProps: { sticky: true } } } })
        ),
      "document.sections[0].responsive.tablet.navProps.sticky"
    );
  });

  test("reject-unknown: a tablet block override carrying page-shaped props is rejected (leaf strip trap)", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([{ type: "nav-items", props: {}, responsive: { tablet: { props: { x: 1 } } } }])
        ),
      "document.sections[0].blocks[0].responsive.tablet.props"
    );
  });
});

// --- TASK-502-01: cascade (mobile does NOT inherit tablet) -------------------

describe("menuDocumentV2 cascade (TASK-502-01)", () => {
  const sectionFixture: MenuSectionV2 = {
    id: "sec-1",
    type: "menu-bar",
    name: "Menu bar",
    layout: { paddingY: 16, surfaceColor: "#0f172a" },
    blocks: [{ id: "blk-nav", type: "nav-items", props: { itemGap: 8, fontSize: 14 } }],
    responsive: { tablet: { layout: { paddingY: 12 }, navProps: { itemGap: 24 } } },
  };

  test("tablet = base merged with ONLY the tablet record", () => {
    const tablet = resolveMenuSectionAppearanceForDevice(sectionFixture, "tablet");
    expect(tablet.layout).toEqual({ paddingY: 12, surfaceColor: "#0f172a" });
    expect(tablet.navProps).toEqual({ itemGap: 24, fontSize: 14 });
  });

  test("a tablet-only override leaves the mobile resolve deep-equal to desktop (mobile ignores tablet)", () => {
    const desktop = resolveMenuSectionAppearanceForDevice(sectionFixture, "desktop");
    const mobile = resolveMenuSectionAppearanceForDevice(sectionFixture, "mobile");
    expect(mobile).toEqual(desktop);
    expect(mobile.layout).toEqual({ paddingY: 16, surfaceColor: "#0f172a" });
    expect(mobile.navProps).toEqual({ itemGap: 8, fontSize: 14 });
  });
});

// --- TASK-502-01: device-defining carve-out ---------------------------------

describe("menuDocumentV2 device-defining carve-out (TASK-502-01)", () => {
  test("exported key list is mobileMode + dropdownDirection", () => {
    expect(MENU_NAV_DEVICE_DEFINING_KEYS).toEqual(["mobileMode", "dropdownDirection"]);
  });

  test("WRITE rejects mobileMode / dropdownDirection inside a responsive navProps record", () => {
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { mobile: { navProps: { mobileMode: "inline" } } } })
        ),
      "document.sections[0].responsive.mobile.navProps.mobileMode"
    );
    expectDocError(
      () =>
        normalizeMenuDocumentV2ForWrite(
          doc([], { responsive: { tablet: { navProps: { dropdownDirection: "top" } } } })
        ),
      "document.sections[0].responsive.tablet.navProps.dropdownDirection"
    );
  });

  test("BASE nav-items props still accept mobileMode / dropdownDirection", () => {
    const out = normalizeMenuDocumentV2ForWrite(
      doc([{ type: "nav-items", props: { mobileMode: "inline", dropdownDirection: "top" } }])
    );
    expect((out.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      mobileMode: "inline",
      dropdownDirection: "top",
    });
  });

  test("STORED READ hoists a mobile mobileMode override into the base props then prunes the record", () => {
    // A 501-era doc: base nav-items mobileMode "disclosure", mobile override "inline".
    const stored = doc(
      [{ id: "blk-nav", type: "nav-items", props: { mobileMode: "disclosure", itemGap: 8 } }],
      { responsive: { mobile: { navProps: { mobileMode: "inline" } } } }
    );
    const read = normalizeStoredMenuDocumentV2ForRead(stored);
    const nav = read.sections[0]?.blocks[0] as { props: Record<string, unknown> };
    // Hoisted: the base value is overwritten with the override value.
    expect(nav.props).toEqual({ mobileMode: "inline", itemGap: 8 });
    // The record is pruned back to the never-overridden shape (no responsive member).
    expect("responsive" in (read.sections[0] as MenuSectionV2)).toBe(false);
    // Doc NOT degraded.
    expect(read.sections).toHaveLength(1);
    // Migrated doc round-trips clean through the STRICT writer (persistable).
    expect(() => normalizeMenuDocumentV2ForWrite(read)).not.toThrow();
    expect(normalizeMenuDocumentV2ForWrite(read)).toEqual(read);
  });

  test("mobileMode hoist emits byte-identical published CSS before and after the migration", () => {
    // "Before" = the raw 501-era doc with the live override; "after" = the
    // migrated (hoisted+pruned) doc. The mobile branch reads the mobile-resolved
    // appearance, so the hoist must not change one byte of the emission.
    const before = doc(
      [{ id: "blk-nav", type: "nav-items", props: { mobileMode: "disclosure" } }],
      { responsive: { mobile: { navProps: { mobileMode: "inline" } } } }
    ) as unknown as MenuDocumentV2;
    const after = normalizeStoredMenuDocumentV2ForRead(before);
    expect(buildMenuDocumentCss(after)).toBe(buildMenuDocumentCss(before));
  });

  test("STORED READ prune-only drops a dead dropdownDirection override (never hoisted)", () => {
    const stored = doc(
      [{ id: "blk-nav", type: "nav-items", props: { dropdownDirection: "bottom" } }],
      { responsive: { mobile: { navProps: { dropdownDirection: "top" } } } }
    );
    const read = normalizeStoredMenuDocumentV2ForRead(stored);
    const nav = read.sections[0]?.blocks[0] as { props: Record<string, unknown> };
    // Base is UNCHANGED — dropdownDirection is never hoisted.
    expect(nav.props).toEqual({ dropdownDirection: "bottom" });
    expect("responsive" in (read.sections[0] as MenuSectionV2)).toBe(false);
  });

  test("a junk mobileMode override value is NOT hoisted (prune-only, base unchanged, doc not degraded)", () => {
    const stored = doc(
      [{ id: "blk-nav", type: "nav-items", props: { mobileMode: "disclosure" } }],
      { responsive: { mobile: { navProps: { mobileMode: "diagonal" } } } }
    );
    const read = normalizeStoredMenuDocumentV2ForRead(stored);
    const nav = read.sections[0]?.blocks[0] as { props: Record<string, unknown> };
    expect(nav.props).toEqual({ mobileMode: "disclosure" }); // base untouched
    expect("responsive" in (read.sections[0] as MenuSectionV2)).toBe(false);
    expect(read.sections).toHaveLength(1); // NOT degraded
  });

  test("sibling override keys in the same record survive the carve-out prune", () => {
    const stored = doc([{ id: "blk-nav", type: "nav-items", props: {} }], {
      responsive: { mobile: { navProps: { mobileMode: "inline", itemGap: 20 } } },
    });
    const read = normalizeStoredMenuDocumentV2ForRead(stored);
    // itemGap survives as a real mobile override; mobileMode is hoisted+pruned.
    expect(read.sections[0]?.responsive).toEqual({ mobile: { navProps: { itemGap: 20 } } });
    expect((read.sections[0]?.blocks[0] as { props: Record<string, unknown> }).props).toEqual({
      mobileMode: "inline",
    });
  });

  test("blast radius unchanged: a malformed LEAF prop still degrades the whole doc (carve-out did NOT loosen leaf validation)", () => {
    const stored = doc([
      {
        type: "cta-button",
        props: { label: "Go", variant: "NONSENSE" },
        visibility: { visible: true },
      },
    ]);
    expect(normalizeStoredMenuDocumentV2ForRead(stored).sections).toEqual([]);
  });
});

// --- TASK-502-01: per-breakpoint block visibility (tablet) ------------------

describe("menuDocumentV2 tablet block visibility (TASK-502-01)", () => {
  const nativeBlock: MenuBlockV2 = { id: "blk-nav", type: "nav-items", props: {} };
  const leafVisible: MenuBlockV2 = {
    id: "blk-cta",
    type: "cta-button",
    props: {},
    visibility: { visible: true },
  };
  const makeDoc = (blocks: MenuBlockV2[]): MenuDocumentV2 => ({
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [{ id: "sec-1", type: "menu-bar", name: "Menu bar", layout: {}, blocks }],
  });

  test("setMenuBlockVisibleForDevice tablet writes responsive.tablet on native AND leaf; desktop stays flat", () => {
    const base = makeDoc([nativeBlock, leafVisible]);
    const out = setMenuBlockVisibleForDevice(
      setMenuBlockVisibleForDevice(base, "blk-nav", "tablet", false),
      "blk-cta",
      "tablet",
      false
    );
    expect(out.sections[0]?.blocks[0]?.responsive).toEqual({
      tablet: { visibility: { visible: false } },
    });
    expect(out.sections[0]?.blocks[1]?.responsive).toEqual({
      tablet: { visibility: { visible: false } },
    });
    // Flat leaf visibility untouched by the tablet write.
    expect(
      (out.sections[0]?.blocks[1] as { visibility?: { visible: boolean } }).visibility
    ).toEqual({
      visible: true,
    });
  });

  test("resolveMenuBlockVisibleForDevice reads the tablet record; mobile ignores it", () => {
    const block: MenuBlockV2 = {
      ...leafVisible,
      responsive: { tablet: { visibility: { visible: false } } },
    };
    expect(resolveMenuBlockVisibleForDevice(block, "desktop")).toBe(true);
    expect(resolveMenuBlockVisibleForDevice(block, "tablet")).toBe(false);
    // A tablet-only override leaves mobile inheriting the flat/desktop value.
    expect(resolveMenuBlockVisibleForDevice(block, "mobile")).toBe(true);
  });

  test("hasMenuBlockVisibilityOverride: any-breakpoint vs a specific breakpoint", () => {
    const tabletOnly: MenuBlockV2 = {
      ...nativeBlock,
      responsive: { tablet: { visibility: { visible: false } } },
    };
    expect(hasMenuBlockVisibilityOverride(tabletOnly)).toBe(true); // any-breakpoint
    expect(hasMenuBlockVisibilityOverride(tabletOnly, "tablet")).toBe(true);
    expect(hasMenuBlockVisibilityOverride(tabletOnly, "mobile")).toBe(false);
    expect(hasMenuBlockVisibilityOverride(nativeBlock)).toBe(false);
  });

  test("clearMenuBlockVisibilityOverride accepts tablet and prunes to the pre-override shape", () => {
    const base = makeDoc([nativeBlock]);
    const withOverride = setMenuBlockVisibleForDevice(base, "blk-nav", "tablet", false);
    const cleared = clearMenuBlockVisibilityOverride(withOverride, "blk-nav", "tablet");
    expect(cleared).toEqual(base);
    expect("responsive" in (cleared.sections[0]?.blocks[0] as MenuBlockV2)).toBe(false);
  });
});

// --- TASK-502-01: mobile-only doc byte-identity -----------------------------

describe("menuDocumentV2 mobile-only byte-identity (TASK-502-01)", () => {
  test("a 501-era doc with ONLY mobile overrides (no dead keys) round-trips deep-equal", () => {
    const mobileOnly = normalizeMenuDocumentV2ForWrite(
      doc(
        [
          {
            id: "blk-nav",
            type: "nav-items",
            props: { itemGap: 8 },
            responsive: { mobile: { visibility: { visible: false } } },
          },
        ],
        { responsive: { mobile: { layout: { paddingY: 4 }, navProps: { itemGap: 16 } } } }
      )
    );
    expect(normalizeStoredMenuDocumentV2ForRead(mobileOnly)).toEqual(mobileOnly);
  });
});

// --- TASK-504-01: brand style, per-level styles, cheap-wins ------------------

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

test("nested Menu color fields canonicalize or omit fail-soft across write and read resolvers", () => {
  for (const colorCase of rawMenuColorCases) {
    const input = doc(
      [
        brandBlock({ props: { style: { color: colorCase.input, height: 40 } } }),
        navBlock({
          levelStyles: { 1: { linkColor: colorCase.input, fontSize: 16 } },
          navChrome: { navPillBackground: colorCase.input, navPillRadius: 8 },
        }),
      ],
      {
        id: "sec-color-nested",
        layout: { surfaceColorScrolled: colorCase.input, radius: 6 },
      }
    );

    const assertNestedResult = (out: MenuDocumentV2) => {
      const layout = out.sections[0]?.layout;
      const brand = out.sections[0]?.blocks[0] as Extract<MenuBlockV2, { type: "brand" }>;
      const nav = out.sections[0]?.blocks[1] as Extract<MenuBlockV2, { type: "nav-items" }>;
      const expectedColor = colorCase.expected ?? undefined;

      expect(layout?.surfaceColorScrolled, `${colorCase.id}:scrolled`).toBe(expectedColor);
      expect(layout?.radius, `${colorCase.id}:layout-sibling`).toBe(6);
      expect(brand.props.style?.color, `${colorCase.id}:brand`).toBe(expectedColor);
      expect(brand.props.style?.height, `${colorCase.id}:brand-sibling`).toBe(40);
      expect(nav.props.levelStyles?.[1]?.linkColor, `${colorCase.id}:level`).toBe(expectedColor);
      expect(nav.props.levelStyles?.[1]?.fontSize, `${colorCase.id}:level-sibling`).toBe(16);
      expect(nav.props.navChrome?.navPillBackground, `${colorCase.id}:chrome`).toBe(expectedColor);
      expect(nav.props.navChrome?.navPillRadius, `${colorCase.id}:chrome-sibling`).toBe(8);
    };

    const written = normalizeMenuDocumentV2ForWrite(input);
    assertNestedResult(written);
    const stored = normalizeStoredMenuDocumentV2ForRead(input);
    assertNestedResult(stored);
    const resolvedStored = resolveStoredMenuDocument({ document: input });
    expect(resolvedStored, `${colorCase.id}:stored-resolver`).not.toBeNull();
    assertNestedResult(resolvedStored as MenuDocumentV2);
    const resolvedPublished = resolvePublishedMenuDocument({ published: { document: input } });
    expect(resolvedPublished, `${colorCase.id}:published-resolver`).not.toBeNull();
    assertNestedResult(resolvedPublished as MenuDocumentV2);
  }
});
