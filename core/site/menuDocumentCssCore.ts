/**
 * menuDocumentCssCore — shared scoped-selector/appearance-default/compare-key
 * layer of the menu-document stylesheet (TASK-542-02-L01 split). Owns the
 * doc scope attribute + selectors, media bounds, alignment/shadow literals,
 * appearance defaults + resolver types, the compare-key sets and the shallow/
 * deep equality helpers, plus the canonical caret content literal shared by
 * `navNestingRules` and the neutralizer matrix. Bun-free (Vitest lane).
 */
import {
  resolveMenuBrandStyleForDevice,
  resolveMenuNavChrome,
  resolveMenuSectionAppearanceForDevice,
  type BrandStyle,
  type MenuDeviceKind,
  type MenuDocumentV2,
  type NavChromeStyle,
  type NavLevelStyle,
  type NavLevelStyles,
  type NavLevelStyleLevel,
} from "../services/menus/menuDocumentV2";
import {
  sanitizeMenuAppearance,
  type MenuAppearance,
  type MenuAppearanceAlignment,
  type MenuAppearanceOrientation,
  type MenuAppearanceShadow,
} from "../services/menus/normalizeMenuAppearance";
import { pageResponsiveMediaBounds } from "../services/pages/pageResponsiveCss";
import { SHELL_APPEARANCE_DEFAULTS } from "./siteShellCss";

export const SITE_MENU_DOC_ATTRIBUTE = "data-site-menu-doc" as const;
export const mobileMaxWidth = pageResponsiveMediaBounds.mobile.maxWidth;
export const desktopNavMinWidth = pageResponsiveMediaBounds.tablet.minWidth;
export const MENU_ALIGNMENT_CSS: Record<MenuAppearanceAlignment, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  "space-between": "space-between",
};

export const MENU_SHADOW_CSS: Record<Exclude<MenuAppearanceShadow, "none">, string> = {
  sm: "0 1px 2px rgba(15,23,42,.1)",
  md: "0 8px 24px rgba(15,23,42,.12)",
};

/**
 * Level-container shadow: reuses `MENU_SHADOW_CSS` verbatim; `"none"` emits an
 * explicit `box-shadow:none` so an authored no-shadow beats the base chrome
 * (`siteShellCss.ts:157` / canvas baseline) on the doc scope.
 */
export const shadowCss = (s: MenuAppearanceShadow): string =>
  s === "none" ? "none" : MENU_SHADOW_CSS[s];
export const SHELL_DEFAULT_LINK_PX = 12;
export const SHELL_DEFAULT_LINK_PY = 8;
export const SHELL_DEFAULT_LINK_RADIUS = 6;

/**
 * Canonical group-parent caret content literal (navNestingRules + the
 * showCaret:true-after-false neutralizer restore the SAME glyph, TASK-542-02
 * matrix #5). `\25BE` (▾) in a CSS string; the literal is shared so the
 * neutralizer re-emits byte-identical caret text.
 */
export const MENU_GROUP_CARET_CONTENT = " \\25BE";
export const MENU_APPEARANCE_DEFAULTS = {
  ...SHELL_APPEARANCE_DEFAULTS,
  orientation: "horizontal" as MenuAppearanceOrientation,
};

/**
 * Collects the document's validated appearance surface per CASCADE device:
 * the first section's `menu-bar` layout (frame subset) merged with the
 * `nav-items` block's typography subset — `"desktop"` reads the flat base,
 * `"mobile"` reads the base merged with the sparse `responsive.mobile`
 * override (`resolveMenuSectionAppearanceForDevice`, TASK-501-01). Both are
 * already normalized `MenuAppearance` subsets, re-sanitized here before
 * resolving against the defaults.
 */
const collectMenuAppearanceForDevice = (
  doc: MenuDocumentV2,
  device: MenuDeviceKind
): MenuAppearance => {
  const section = doc.sections[0];
  if (!section) return {};
  const { layout, navProps } = resolveMenuSectionAppearanceForDevice(section, device);
  return { ...layout, ...navProps };
};

export const resolveMenuAppearanceForDevice = (doc: MenuDocumentV2, device: MenuDeviceKind) => ({
  ...MENU_APPEARANCE_DEFAULTS,
  ...sanitizeMenuAppearance(collectMenuAppearanceForDevice(doc, device)),
});
// resolveMenuAppearanceForDevice(doc, "desktop") equals the pre-501 single
// resolve for every legacy doc — this IS the byte-identity invariant.

export type ResolvedMenuAppearance = ReturnType<typeof resolveMenuAppearanceForDevice>;

export type MenuRuleSets = {
  /** MENU_RULE_GROUPS base emission + per-divider context rules (device-independent). */
  base: string[];
  /** dropdownRule(base) + navNestingRules(base): the shared >=640 (desktop AND tablet) rules. */
  desktopShared: string[];
  /** TOTAL group re-emissions, tablet-resolved vs DESKTOP base (empty ⇒ no tablet branch). */
  tabletDelta: string[];
  /** mobileModeRules(mobile-resolved) + mobile deltas (vs DESKTOP base — mobile ignores tablet). */
  mobile: string[];
  /** Canvas-only disclosure sim-open (empty unless mobileMode "disclosure"). */
  previewMobileOpen: string[];
  /** Front-only hide rule ids, partitioned per resolved tri-device visibility. */
  hide: MenuVisibilityPlan;
};

export type MenuVisibilityPlan = {
  /** hidden on desktop AND tablet → shared >=640 branch (pre-502 hide position). */
  hideShared: string[];
  /** hidden on desktop, VISIBLE on tablet → min-width:1024 branch. */
  hideDesktopOnly: string[];
  /** VISIBLE on desktop, hidden on tablet → bounded tablet 640–1023 branch. */
  hideTabletOnly: string[];
  /** hidden on mobile → max-width:639 branch (unchanged). */
  hideMobile: string[];
};

export const menuDocScope = `[${SITE_MENU_DOC_ATTRIBUTE}="true"]` as const;
export const hoverSelector = `${menuDocScope} .site-nav-link:hover,${menuDocScope} .site-nav-link:focus-visible,${menuDocScope} .site-nav-group>summary:hover,${menuDocScope} .site-nav-group>summary:focus-visible`;
export const activeSelector = `${menuDocScope} .site-nav-link:active,${menuDocScope} .site-nav-group>summary:active`;
export const LEVEL_LINK_SELECTORS: Record<NavLevelStyleLevel, string> = {
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link`,
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist .site-nav-link`,
};

// Level-0 B2 chrome (indicator ::before bar + hover-lift/underline) must NOT ride
// the cascade-root `.site-nav-link` (which matches links at ALL depths, so a
// level-0-only indicator/lift/underline would leak onto every dropdown link and a
// deeper `indicator:"none"` early-returns and cannot cancel it) — anchor it to the
// TOP-BAR direct link only. linkColor/fontSize/hover-background and the
// `indicatorLinkDecls` transition+position:relative stay cascade-root by design
// (TASK-504 inheritance); ONLY the NEW B2 chrome is scoped here (TASK-507 A.1).
export const TOP_BAR_LINK_SELECTOR =
  `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-link` as const;

export const LEVEL_CONTAINER_SELECTORS: Record<NavLevelStyleLevel, string> = {
  // Two-member group: the level-1 sublist itself AND its nested sublists, so
  // level-1 chrome cascades into deeper containers.
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist, ${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`,
  // Anchored (0,5,0) form (NOT the short `.site-nav-sublist .site-nav-sublist`
  // (0,3,0)) so a level-2 container override TIES level-1's reach selector and
  // wins by source order (emitted after level 1).
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`,
};

// --- TASK-506-02 modern styling emitters (present-only; ZERO bytes when unset) ---
// Every generator returns null/[] for an absent field, so an unauthored doc is
// byte-identical (Hard Invariant 2). All values arrive pre-validated/clamped/
// enum-mapped from 506-01's normalizers — 506-02 does no re-validation.

// ── B1 item separators (orientation-aware) ──────────────────────────────────
/** Shared border shorthand builder for the B1 divider. `itemDividerShow!==true`
 *  ⇒ null ⇒ ZERO bytes. The `?? 1|solid|currentColor` fallbacks fire ONLY when
 *  the feature is explicitly ON (documented cheap-win), so byte-identity holds. */
export const LEVEL_DROPDOWN_ITEM_SELECTORS: Record<NavLevelStyleLevel, string> = {
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child)`,
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist > li:not(:last-child)`,
};
/** Dropdown (levels ≥1, vertical stack) ⇒ always HORIZONTAL rule
 *  (`border-block-end`). ≥640-only (emitted below the linkOnly guard). */
export const GROUP_CARET_SELECTORS: Record<0 | 1 | 2, string> = {
  0: `${menuDocScope} .site-nav-list > li[data-site-nav-group="true"] > .site-nav-link`,
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link`,
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link`,
};
export const BRAND_STYLE_COMPARE_KEYS: readonly (keyof BrandStyle)[] = [
  "fontSize",
  "fontWeight",
  "color",
  "textTransform",
  "letterSpacing",
  "height",
  "maxWidth",
  // TASK-520 audit finding 4: without `iconSize` here, a size-only per-device
  // brand-icon override is treated as "no diff" ⇒ collectBrandDeltaRules emits
  // nothing ⇒ the front icon stays desktop-sized across viewports.
  "iconSize",
  // TASK-542-02 matrix #10: `iconColor` joins the per-device brand path — a
  // color-only override must fire the delta (and the emit must paint it).
  "iconColor",
];

export const shallowEqualStyle = (resolved: BrandStyle, base: BrandStyle | undefined): boolean => {
  const other = base ?? {};
  return BRAND_STYLE_COMPARE_KEYS.every((k) => resolved[k] === other[k]);
};

// 506-02 is the sole writer of this list (506-01 supplies the key SET in its
// closure note). EVERY new NavLevelStyle key MUST be here or `collectLevelDeltaRules`
// silently never emits a per-device override of it (a live cross-subtask guard —
// test #4 fails on a missing key). B5 `submenuPlacement` IS listed (it makes the
// diff fire) but its base rule lives OUTSIDE navLevelRules, so its actual tablet
// re-emit is the standalone `submenuPlacementDeltaRule` — see that note.
export const NAV_LEVEL_STYLE_COMPARE_KEYS: readonly (keyof NavLevelStyle)[] = [
  "linkColor",
  "linkHoverColor",
  "linkHoverTextColor",
  "linkActiveColor",
  "fontSize",
  "fontWeight",
  "gap",
  "paddingX",
  "paddingY",
  "background",
  "borderColor",
  "borderWidth",
  "radius",
  "shadow",
  "minWidth",
  // TASK-506 modern fields (B1/B2/B3/B4 ride navLevelRules; B5 is standalone):
  "itemDividerShow",
  "itemDividerColor",
  "itemDividerWidth",
  "itemDividerStyle",
  "indicator",
  "indicatorColor",
  "indicatorThickness",
  "indicatorGrow",
  "hoverUnderline",
  "transitionMs",
  "hoverLift",
  "showCaret",
  "caretRotateOnOpen",
  "flyoutAnimation",
  "containerPaddingX",
  "containerPaddingY",
  "submenuPlacement",
  // TASK-508 R1(b): per-device link alignment — MUST be here or collectLevelDeltaRules
  // silently never emits a per-device linkAlign override (cross-subtask guard test #4).
  "linkAlign",
];

export const shallowEqualLevel = (a: NavLevelStyle, b: NavLevelStyle): boolean =>
  NAV_LEVEL_STYLE_COMPARE_KEYS.every((k) => a[k] === b[k]);

export const NAV_LEVELS: readonly NavLevelStyleLevel[] = [1, 2];

export const deepEqualLevelStyles = (
  a: NavLevelStyles | undefined,
  b: NavLevelStyles | undefined
): boolean => {
  const la = a ?? {};
  const lb = b ?? {};
  return NAV_LEVELS.every((lvl) => shallowEqualLevel(la[lvl] ?? {}, lb[lvl] ?? {}));
};

/** Brand device deltas: emit the §1 rules but ONLY when the device-resolved
 *  style DIFFERS from the desktop base. Rides `tabletDelta` / `mobile`. */
export const NAV_CHROME_COMPARE_KEYS: readonly (keyof NavChromeStyle)[] = [
  "navPillBackground",
  "navPillRadius",
  "navPillPaddingX",
  "navPillPaddingY",
  "itemDividerShow",
  "itemDividerColor",
  "itemDividerWidth",
  "itemDividerStyle",
  "indicator",
  "indicatorColor",
  "indicatorThickness",
  "indicatorGrow",
  "hoverUnderline",
  "transitionMs",
  "hoverLift",
  "showCaret",
  "caretRotateOnOpen",
  // TASK-508: submenuDirection/submenuMode are intentionally EXCLUDED — they are
  // STRUCTURAL, base-only keys (read from baseNavChrome in desktopShared, no
  // tablet-delta emitter). Adding them here would fabricate DEAD tablet-override
  // data behind a misleading badge/Reset. See STRUCTURAL_BASE_ONLY_CHROME_KEYS.
];

// TASK-508 R3a/R3b: the two nav-global structural keys that are base-only (emitted
// solely from baseNavChrome in desktopShared, ≥640-only, like dropdownDirection).
// The 508-05 compare-key coverage guard EXEMPTS these from NAV_CHROME_COMPARE_KEYS
// and separately asserts they are ABSENT from it (a later accidental dead-data delta
// addition is thereby caught).
export const STRUCTURAL_BASE_ONLY_CHROME_KEYS = ["submenuDirection", "submenuMode"] as const;

export const shallowEqualChrome = (
  resolved: NavChromeStyle,
  base: NavChromeStyle | undefined
): boolean => {
  const other = base ?? {};
  return NAV_CHROME_COMPARE_KEYS.every((k) => resolved[k] === other[k]);
};

/**
 * Level-0 chrome emitter (mirror of `navLevelRules`). The `indicatorLinkDecls`
 * transition + `position:relative` stay on the cascade-ROOT `.site-nav-link`
 * (matches links at ALL depths — harmless anchors that deeper levels reuse); the
 * B2 CHROME (indicator ::before bar + hover-lift/underline) is scoped to
 * TOP_BAR_LINK_SELECTOR so it applies to depth-0 links ONLY and never leaks onto
 * dropdown links (TASK-507 A.1). B2 is all-width (rides the mobile `linkOnly`
 * branch); the pill (B4), top-bar divider (B1) and caret toggle/rotate (B3) are
 * ≥640-only (omitted when `linkOnly`). NO flyoutAnimation at level 0 (the top bar
 * is never a revealed sublist). Present-only ⇒ ZERO bytes when unauthored.
 */
