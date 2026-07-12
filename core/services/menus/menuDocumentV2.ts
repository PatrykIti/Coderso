import {
  PAGE_DOCUMENT_SCHEMA_VERSION,
  createPageBlockV2,
  createPageSectionV2,
  isPageDocumentError,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  type PageBlockStyleV2,
  type PageBlockV2,
  type PageBlockVisibilityV2,
} from "../pages/pageDocumentV2";
import {
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
} from "../pages/pageAuthoringSanitizers";
import {
  isMenuAppearanceError,
  menuAppearanceFontWeights,
  menuAppearanceShadows,
  menuAppearanceTextTransforms,
  normalizeMenuAppearance,
  normalizeMenuColorValue,
  menuAppearanceNumberRanges,
  type MenuAppearance,
  type MenuAppearanceFontWeight,
  type MenuAppearanceShadow,
  type MenuAppearanceTextTransform,
} from "./normalizeMenuAppearance";
// F2 resolved-default provider reads the shell theme defaults as the SINGLE
// non-hardcoded source (parent §506-01 / F2). `SHELL_APPEARANCE_DEFAULTS` is a
// pure validated value table (no CSS, no side effects); importing it here is
// NON-CYCLIC — siteShellCss imports normalizeMenuAppearance/pages, never this
// module. The three per-link defaults (12/8/6) are NOT in that table, so they are
// re-declared below as EXPORTED model consts (single source for 506-02/506-04).
import { SHELL_APPEARANCE_DEFAULTS } from "../../site/siteShellCss";

/**
 * menuDocumentV2 — the menu Design tab's composable document (TASK-499-02).
 *
 * Option B: a NEW, menu-scoped document engine with its OWN section/block
 * enums and its OWN `MENU_DOCUMENT_SCHEMA_VERSION`, independent of the page
 * schema. It reuses ONLY the proven shared leaf validators (button / image /
 * divider / spacer, via the page block pipeline wrapper trick) and the
 * existing strict `normalizeMenuAppearance` field validators (colors, clamped
 * numbers, enum strings). The page schema (`pageDocumentV2.ts`) is NOT
 * polluted with menu types.
 *
 * Write path (strict): `normalizeMenuDocumentV2ForWrite` throws a
 * machine-readable `MenuDocumentError` (`menu_document_invalid` + offending
 * `path`) on unknown section/block types, unknown props, malformed values, or
 * over-capacity trees; nothing is persisted.
 *
 * Read path (fail-closed): `normalizeStoredMenuDocumentV2ForRead` never throws
 * — unreadable input degrades to an empty document (⇒ the resolvers return
 * `null` ⇒ the legacy appearance+extras look).
 *
 * Menu-native blocks (`nav-items`/`brand`/`search`/`account`/`language`) carry
 * NO FLAT block `style`/`visibility`: their appearance flows entirely through
 * the validated menu-bar `layout` + nav-items appearance props, so per-block
 * style/visibility would be redundant AND unvalidatable (the page
 * `normalizeBlockStyle`/`normalizeBlockVisibility` validators are
 * module-private and MUST NOT be deep-imported). Only the reused leaf blocks
 * (`cta-button`/`divider`/`spacer`) carry style/visibility, validated for free
 * by the page block pipeline.
 *
 * Per-device overrides (TASK-501-01 + TASK-502-01): sections carry SPARSE
 * `responsive.{tablet,mobile}.{layout,navProps}` records; EVERY block type
 * (menu-native included) carries sparse `responsive.{tablet,mobile}.visibility`
 * records. The block record is document-level render/CSS gating owned by THIS
 * contract — it does NOT touch the page visibility pipeline. Records store only
 * edited keys, are lazily created, pruned when empty, and removed by explicit
 * Reset only (never auto-removed on equality). Cascade mirrors Pages EXACTLY
 * (`pageResponsiveCss.ts:10-13`): desktop = base; tablet AND mobile each merge
 * ONLY their OWN record over the DESKTOP base — mobile does NOT inherit tablet.
 *
 * Device-defining nav props (TASK-502-01): `mobileMode` and `dropdownDirection`
 * are device-DEFINING, never overridable — a `responsive.*.navProps` record
 * carrying either key is REJECTED on the strict WRITE. On the fail-closed
 * STORED READ the one conscious carve-out applies (a 501-era doc may legit hold
 * such a record; degrading the whole doc for it would be data loss): the keys
 * get SPLIT treatment — `dropdownDirection` is truly DEAD (the desktop-branch
 * emission reads the BASE) ⇒ silently PRUNED; a mobile `mobileMode` override is
 * LIVE (the mobile branch consumes the mobile-resolved value) ⇒ HOISTED into
 * the first nav-items block's base props, THEN pruned — behavior-preserving
 * (published mobile rendering byte-identical). Migration is non-destructive:
 * the migrated doc round-trips clean ⇒ the next autosave persists it.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

export const MENU_DOCUMENT_SCHEMA_VERSION = 1 as const;

export const menuSectionTypes = ["menu-bar", "menu-drawer"] as const;
export const menuBlockTypes = [
  // menu-native (own normalizers):
  "nav-items",
  "brand",
  "search",
  "account",
  "language",
  // reused shared leaf blocks (delegated to the page block pipeline):
  "cta-button",
  "divider",
  "spacer",
] as const;

export type MenuSectionType = (typeof menuSectionTypes)[number];
export type MenuBlockType = (typeof menuBlockTypes)[number];

const MENU_NATIVE_BLOCK_TYPES = ["nav-items", "brand", "search", "account", "language"] as const;
const MENU_LEAF_BLOCK_TYPES = ["cta-button", "divider", "spacer"] as const;

/** Menu-bar layout = the `MenuAppearance` surface/frame subset. */
const MENU_BAR_LAYOUT_KEYS = [
  "surfaceColor",
  "paddingX",
  "paddingY",
  "alignment",
  "borderColor",
  "borderWidth",
  "shadow",
  "sticky",
] as const satisfies readonly (keyof MenuAppearance)[];

/** TASK-520-01-L01: menu-bar EXTRA keys — present-only, NON-`MenuAppearance`
 *  members (radius, custom box-shadow, scrolled/floating-state variants). These
 *  are DELIBERATELY held out of `MENU_BAR_LAYOUT_KEYS`/`SHELL_APPEARANCE_DEFAULTS`
 *  (Hard Invariant #1: `buildSiteShellCss(null)` byte-identity), so they carry NO
 *  seeded resolver default and NO `ControlDefaultHint` surfaces for them. They join
 *  the menu-bar layout reject-unknown allowlist as a sibling of the appearance
 *  subset — a key in NEITHER set throws `MenuDocumentError`. */
const MENU_BAR_EXTRA_KEYS = [
  "radius",
  "shadowCustom",
  "surfaceColorScrolled",
  "borderColorScrolled",
  "borderWidthScrolled",
  "shadowScrolled",
  "shadowCustomScrolled",
] as const;
/** Local clamp table for the menu-bar card radius (NOT added to
 *  `menuAppearanceNumberRanges`; exported for the 520-03 slider bound). */
export const MENU_BAR_LAYOUT_NUMBER_RANGES = { radius: { min: 0, max: 40 } } as const;

/** nav-items props = the `MenuAppearance` typography/link subset. The four
 *  cheap-win scalars (TASK-504-01 §2a) are real `MenuAppearance` keys so the
 *  `satisfies` still holds and they ride the scalar delta channel per-device. */
const NAV_ITEMS_PROP_KEYS = [
  "itemGap",
  "fontSize",
  "fontWeight",
  "textTransform",
  "linkColor",
  "linkHoverColor",
  "linkActiveColor",
  "dropdownDirection",
  "mobileMode",
  "orientation",
  "linkPaddingX",
  "linkPaddingY",
  "linkRadius",
  "linkHoverTextColor",
] as const satisfies readonly (keyof MenuAppearance)[];

/** TASK-520-01-L01: intersection extension — the appearance subset plus the
 *  present-only EXTRA keys (radius, custom shadow, scrolled/floating variants).
 *  The extra keys are intentionally NOT `keyof MenuAppearance`; unset ⇒ fall back
 *  to the corresponding base key at emit (520-02). */
export type MenuBarLayout = Pick<MenuAppearance, (typeof MENU_BAR_LAYOUT_KEYS)[number]> & {
  radius?: number; // 0..40 (MENU_BAR_LAYOUT_NUMBER_RANGES.radius)
  shadowCustom?: string; // validated box-shadow (L02); OVERRIDES `shadow` at emit
  surfaceColorScrolled?: string; // normalizeMenuColorValue (alpha OK)
  borderColorScrolled?: string; // normalizeMenuColorValue
  borderWidthScrolled?: number; // menuAppearanceNumberRanges.borderWidth [0,8]
  shadowScrolled?: MenuAppearanceShadow; // none|sm|md
  shadowCustomScrolled?: string; // validated box-shadow (L02); OVERRIDES shadowScrolled at emit
};
/** No longer a pure `Pick` — carries the non-appearance `levelStyles` +
 *  `navChrome` (TASK-506 level-0 home) members. */
export type NavItemsProps = Pick<MenuAppearance, (typeof NAV_ITEMS_PROP_KEYS)[number]> & {
  levelStyles?: NavLevelStyles;
  navChrome?: NavChromeStyle;
};

// --- TASK-504-01 brand style + per-level nav style shapes --------------------

/** Brand block styling. Text-mode keys style the `<a>`; image-mode keys size the
 *  `<img>`. Sparse — only edited keys stored; empty ⇒ member omitted (legacy
 *  byte-identity). Per-device on tablet + mobile via `MenuBlockOverride.style`. */
export type BrandStyle = {
  // text mode:
  fontSize?: number; // BRAND_STYLE_NUMBER_RANGES.fontSize [10,48]
  fontWeight?: MenuAppearanceFontWeight;
  color?: string; // normalizeMenuColorValue (token-backed)
  textTransform?: MenuAppearanceTextTransform;
  letterSpacing?: number; // [-2,8] px — NEGATIVE allowed
  // image mode:
  height?: number; // [16,120] px
  maxWidth?: number; // [40,400] px
  // TASK-520-01-L03 icon mode:
  iconColor?: string; // normalizeMenuColorValue (alpha OK via 519)
  iconSize?: number; // BRAND_STYLE_NUMBER_RANGES.iconSize [12,64] px
};

/** Per-nesting-level nav styling. Link fields apply at every level; container
 *  fields apply ONLY to the submenu chrome at levels >= 1 (ignored for level 0). */
export type NavLevelStyle = {
  linkColor?: string;
  linkHoverColor?: string;
  linkHoverTextColor?: string;
  linkActiveColor?: string;
  fontSize?: number;
  fontWeight?: MenuAppearanceFontWeight;
  gap?: number;
  paddingX?: number;
  paddingY?: number;
  // submenu CONTAINER (levels >= 1 only):
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  shadow?: MenuAppearanceShadow;
  minWidth?: number;
  // --- TASK-506 modern styling (present-only; CSS emission is 506-02) ---------
  // B1 item separators (orientation-aware emission is 506-02's job):
  itemDividerShow?: boolean;
  itemDividerColor?: string; // normalizeMenuColorValue
  itemDividerWidth?: number; // 1..8
  itemDividerStyle?: "solid" | "dashed" | "dotted";
  // B2 indicator + hover:
  indicator?: "none" | "underline" | "overline";
  indicatorColor?: string; // color
  indicatorThickness?: number; // 1..6
  indicatorGrow?: boolean;
  hoverUnderline?: boolean;
  transitionMs?: number; // 0..400
  hoverLift?: number; // 0..8
  // B3 caret + flyout (levels >= 1 parents; flyoutAnimation is levels 1/2 ONLY):
  showCaret?: boolean;
  caretRotateOnOpen?: boolean;
  flyoutAnimation?: "none" | "fade" | "slide";
  // B4 dropdown inner padding (container, levels >= 1):
  containerPaddingX?: number; // 0..40
  containerPaddingY?: number; // 0..32
  // B5 nested placement (level 2):
  submenuPlacement?: "right" | "bottom" | "left";
  // TASK-508-01 R1(b) link alignment (text-align on the LINK; applies at every
  // level via LEVEL_LINK_SELECTORS in 508-02). Per-device (rides the level cascade).
  linkAlign?: "left" | "center" | "right";
};

/**
 * TASK-506 level-0 home (Option B). A NEW nav-items sub-record parallel to
 * `levelStyles`, holding the level-0 variants of B1/B2/B3 + the B4 pill. It is
 * NOT a `MenuAppearance` key set (so it cannot ride `NAV_ITEMS_PROP_KEYS`) — it
 * gets its own reject-unknown allowlist + prune + device helper family.
 * NO `flyoutAnimation` here: that is a levels-≥1 CONTAINER field (NavLevelStyle
 * 1/2 ONLY); the top bar is never a revealed sublist.
 */
export type NavChromeStyle = {
  // B4 pill (level-0 wrapper on .site-nav-list):
  navPillBackground?: string; // color
  navPillRadius?: number; // 0..40
  navPillPaddingX?: number; // 0..40
  navPillPaddingY?: number; // 0..32
  // level-0 variants of B1/B2/B3 (same field names/semantics as NavLevelStyle):
  itemDividerShow?: boolean;
  itemDividerColor?: string;
  itemDividerWidth?: number;
  itemDividerStyle?: "solid" | "dashed" | "dotted";
  indicator?: "none" | "underline" | "overline";
  indicatorColor?: string;
  indicatorThickness?: number;
  indicatorGrow?: boolean;
  hoverUnderline?: boolean;
  transitionMs?: number;
  hoverLift?: number;
  showCaret?: boolean;
  caretRotateOnOpen?: boolean;
  // TASK-508-01 R3a/R3b nav-GLOBAL submenu form (governs EVERY flyout depth incl.
  // level 1). BASE-ONLY structural keys — NOT per-device (no NAV_CHROME_COMPARE_KEYS
  // entry); a per-device override would be dead data (508-02 emits only from base).
  submenuDirection?: "right" | "down" | "up" | "left"; // level-1 first dropdown AND level-2/3+ nested
  submenuMode?: "flyout" | "accordion"; // default flyout (present-only; accordion opt-in)
};

/** Level 0 = the EXISTING nav-items scalar base (NO new type). Level 2 = "level 2
 *  AND deeper" (descendant selector in 504-02). The level key is NUMERIC — one
 *  canonical representation shared by 504-02's selector maps and 504-04's editor.
 *  Runtime object keys are still `"1"`/`"2"` strings (JSON-identical). */
export type NavLevelStyleLevel = 1 | 2;
export type NavLevelStyles = Partial<Record<NavLevelStyleLevel, NavLevelStyle>>;

// --- per-device override vocabulary (TASK-501-01 + TASK-502-01: tablet) ------

// Order tablet-first (wider viewport first; the CSS builder 502-02 iterates
// this const for branch emission). Both tablet and mobile inherit the DESKTOP
// base; mobile does NOT inherit tablet (Pages cascade, pageResponsiveCss.ts).
export const MENU_RESPONSIVE_BREAKPOINT_KEYS = ["tablet", "mobile"] as const;
export type MenuResponsiveBreakpoint = (typeof MENU_RESPONSIVE_BREAKPOINT_KEYS)[number];
const MENU_SECTION_OVERRIDE_GROUP_KEYS = ["layout", "navProps"] as const;
export type MenuSectionOverrideGroup = (typeof MENU_SECTION_OVERRIDE_GROUP_KEYS)[number];

/**
 * `mobileMode` and `dropdownDirection` are device-DEFINING nav props: they write
 * to the BASE on every device and are NEVER stored inside a responsive record
 * (rejected on write, pruned/hoisted on stored read). Exported so 502-04 can
 * scope the panel controls and tests can assert the carve-out.
 */
export const MENU_NAV_DEVICE_DEFINING_KEYS = ["mobileMode", "dropdownDirection"] as const;

/** Editor device kind. Desktop = base; tablet and mobile each address their OWN
 *  sparse responsive record. Cascade (Pages, pageResponsiveCss.ts:10-13):
 *  tablet and mobile BOTH inherit the DESKTOP base; mobile does NOT inherit tablet. */
export type MenuDeviceKind = "desktop" | "tablet" | "mobile";

export type MenuSectionOverride = {
  /** SPARSE — edited keys only. */
  layout?: MenuBarLayout;
  /** SPARSE — edited keys only (incl. orientation). */
  navProps?: NavItemsProps;
};
export type MenuSectionResponsive = Partial<Record<MenuResponsiveBreakpoint, MenuSectionOverride>>;

/** Brand style is per-device; the block override carries an optional style delta
 *  (tablet/mobile) alongside the existing visibility record (TASK-504-01 §5). */
export type MenuBlockOverride = {
  visibility?: { visible: boolean };
  style?: BrandStyle;
};
export type MenuBlockResponsive = Partial<Record<MenuResponsiveBreakpoint, MenuBlockOverride>>;

export type BrandProps = {
  /** TASK-520-01-L03: `"icon"` added (allowlisted lucide mark). */
  mode: "text" | "image" | "icon";
  href: string;
  /** Validated page `image` leaf props (assetId/src/alt/caption/fit). */
  image?: Record<string, unknown>;
  /**
   * Per-menu brand text override. Fallback chain (normative for 502-03 front
   * AND 502-04 canvas): props.text → siteName (`site.name` setting) → null.
   * Absent = inherit the site name. Text FORMATTING is a named residual, not a
   * member here. Rendered as React text only (never reaches CSS).
   */
  text?: string;
  /** TASK-520-01-L03: validated kebab lucide icon name for `mode:"icon"`
   *  (`normalizeBrandIconName` pattern-check; the RENDER (520-04) resolves it
   *  against the lucide set = the effective allowlist). */
  icon?: string;
  /** TASK-520-01-L03: graphic-with-text combo. When `true` on a graphic mode
   *  (`"image"`/`"icon"`), the render shows the graphic AND the text wordmark side
   *  by side. Present-only (only `true` stored; unset/false = exclusive legacy). */
  showText?: boolean;
  /** Sparse brand styling (TASK-504-01 §3); absent ⇒ legacy byte-identity. */
  style?: BrandStyle;
};

export type MenuUtilityProps = {
  label?: string;
};

export type MenuBlockV2 =
  | { id: string; type: "nav-items"; props: NavItemsProps; responsive?: MenuBlockResponsive }
  | { id: string; type: "brand"; props: BrandProps; responsive?: MenuBlockResponsive }
  | {
      id: string;
      type: "search" | "account" | "language";
      props: MenuUtilityProps;
      responsive?: MenuBlockResponsive;
    }
  | {
      id: string;
      type: "cta-button";
      props: Record<string, unknown>;
      style?: PageBlockStyleV2;
      visibility?: PageBlockVisibilityV2;
      responsive?: MenuBlockResponsive;
    }
  | {
      id: string;
      type: "divider" | "spacer";
      props: Record<string, unknown>;
      style?: PageBlockStyleV2;
      visibility?: PageBlockVisibilityV2;
      responsive?: MenuBlockResponsive;
    };

export type MenuSectionV2 = {
  id: string;
  type: MenuSectionType;
  name: string;
  layout: MenuBarLayout;
  blocks: MenuBlockV2[];
  responsive?: MenuSectionResponsive;
};

export type MenuDocumentV2 = {
  schemaVersion: typeof MENU_DOCUMENT_SCHEMA_VERSION;
  sections: MenuSectionV2[];
};

export const MENU_DOCUMENT_INVALID = "menu_document_invalid" as const;

export class MenuDocumentError extends Error {
  readonly code = MENU_DOCUMENT_INVALID;
  readonly path: string;

  constructor(path: string) {
    super(MENU_DOCUMENT_INVALID);
    this.name = "MenuDocumentError";
    this.path = path;
  }
}

export const isMenuDocumentError = (error: unknown): error is MenuDocumentError =>
  error instanceof MenuDocumentError;

/** Clamped tree capacity: a menu document is not a page canvas. */
export const MENU_DOCUMENT_MAX_SECTIONS = 2 as const;
export const MENU_SECTION_MAX_BLOCKS = 12 as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requireArray = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) throw new MenuDocumentError(path);
  return value;
};

// Browser-safe id: menuDocumentV2 is pure contract logic imported by the admin
// Design editor (browser), so it must NOT pull `node:crypto`. The global Web Crypto
// `randomUUID` exists in Bun + Node 20+ + browsers; fall back for older/edge runtimes.
const randomMenuDocumentUuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const createMenuDocumentId = (prefix: string) =>
  `${prefix}_${randomMenuDocumentUuid().slice(0, 8)}`;

const pickAppearance = (
  value: MenuAppearance,
  keys: readonly (keyof MenuAppearance)[]
): MenuAppearance => {
  const out: MenuAppearance = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      Object.assign(out, { [key]: value[key] });
    }
  }
  return out;
};

const readMenuBlockId = (value: Record<string, unknown>, prefix: string): string =>
  typeof value.id === "string" && value.id.trim().length > 0
    ? value.id
    : createMenuDocumentId(prefix);

const sectionTypeName: Record<MenuSectionType, string> = {
  "menu-bar": "Menu bar",
  "menu-drawer": "Menu drawer",
};

// --- menu-native prop normalizers (reject cross-subset BEFORE pick) ---------

const normalizeAppearanceSubset = (
  value: unknown,
  keys: readonly (keyof MenuAppearance)[],
  path: string
): MenuAppearance => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  // Reject-unknown per subset: `normalizeMenuAppearance` is strict only over the
  // FULL appearance key set, so a cross-subset key (e.g. `linkColor` on a
  // menu-bar layout, or `sticky` on nav-items) would PASS the full normalize and
  // be silently DROPPED by pick. Assert the raw input carries no key outside the
  // intended subset BEFORE pick — never lean on pick to enforce the allowlist.
  for (const key of Object.keys(value)) {
    if (!(keys as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  try {
    return pickAppearance(normalizeMenuAppearance(value), keys);
  } catch (error) {
    if (isMenuAppearanceError(error)) throw new MenuDocumentError(`${path}.${error.field}`);
    throw error;
  }
};

// TASK-520-01-L01: split normalizer. Reject-unknown over the UNION of the
// appearance subset ∪ the EXTRA keys; the appearance keys route through the strict
// `normalizeAppearanceSubset` (fed an appearance-only slice so its own reject-unknown
// does not choke on the extra keys), the extra keys route through local fail-soft
// value normalizers (present-only assign; bad values omitted, never thrown).
const normalizeMenuBarLayout = (value: unknown, path: string): MenuBarLayout => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const allowed = new Set<string>([...MENU_BAR_LAYOUT_KEYS, ...MENU_BAR_EXTRA_KEYS]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new MenuDocumentError(`${path}.${key}`); // reject-unknown
  }
  const appearanceInput: Record<string, unknown> = {};
  for (const k of MENU_BAR_LAYOUT_KEYS) {
    if (k in (value as object)) appearanceInput[k] = (value as Record<string, unknown>)[k];
  }
  const out: MenuBarLayout = {
    ...(normalizeAppearanceSubset(appearanceInput, MENU_BAR_LAYOUT_KEYS, path) as MenuBarLayout),
  };
  const v = value as Record<string, unknown>;
  if (v.radius != null) {
    const n = clampLocalNumber(MENU_BAR_LAYOUT_NUMBER_RANGES.radius, v.radius);
    if (n !== null) out.radius = n;
  }
  if (v.borderWidthScrolled != null) {
    const n = clampLocalNumber(menuAppearanceNumberRanges.borderWidth, v.borderWidthScrolled);
    if (n !== null) out.borderWidthScrolled = n;
  }
  if (v.surfaceColorScrolled != null) {
    const c = normalizeMenuColorValue(v.surfaceColorScrolled);
    if (c !== null) out.surfaceColorScrolled = c;
  }
  if (v.borderColorScrolled != null) {
    const c = normalizeMenuColorValue(v.borderColorScrolled);
    if (c !== null) out.borderColorScrolled = c;
  }
  if (v.shadowScrolled != null) {
    const s = normalizeEnumLocal(menuAppearanceShadows, v.shadowScrolled);
    if (s !== null) out.shadowScrolled = s;
  }
  // TASK-520-01-L02: custom box-shadow validation (security-critical CSS-value whitelist).
  if (v.shadowCustom != null) {
    const sh = normalizeMenuBoxShadowValue(v.shadowCustom);
    if (sh !== null) out.shadowCustom = sh;
  }
  if (v.shadowCustomScrolled != null) {
    const sh = normalizeMenuBoxShadowValue(v.shadowCustomScrolled);
    if (sh !== null) out.shadowCustomScrolled = sh;
  }
  return out; // present-only; empties simply absent
};

// CONSCIOUS nav-block fail-closed READ-trap extension: `levelStyles` is a
// non-appearance member, so it is SPLIT off BEFORE the flat subset (an unhandled
// `levelStyles` key would be REJECTED by normalizeAppearanceSubset and degrade
// the doc). The flat scalar contract (reject-unknown, throw-on-bad-value) is
// unchanged for every OTHER key.
const normalizeNavItemsProps = (value: unknown, path: string): NavItemsProps => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  // TASK-506: split BOTH non-appearance members (`levelStyles` + `navChrome`) off
  // BEFORE the flat subset — either would be REJECTED by normalizeAppearanceSubset
  // and degrade the doc. Reused verbatim by the responsive write path, so navChrome
  // flows through the SAME reject-unknown per-device (no separate allowlist needed).
  const { levelStyles: rawLevelStyles, navChrome: rawNavChrome, ...scalars } = value;
  const base = normalizeAppearanceSubset(scalars, NAV_ITEMS_PROP_KEYS, path) as NavItemsProps;
  let next: NavItemsProps = base;
  if (rawLevelStyles !== undefined && rawLevelStyles !== null) {
    const levelStyles = normalizeNavLevelStyles(rawLevelStyles, `${path}.levelStyles`);
    if (levelStyles) next = { ...next, levelStyles }; // prune ⇒ no member
  }
  if (rawNavChrome !== undefined && rawNavChrome !== null) {
    const navChrome = normalizeNavChrome(rawNavChrome, `${path}.navChrome`);
    if (navChrome) next = { ...next, navChrome }; // prune ⇒ no member
  }
  return next; // absent BOTH ⇒ bare base (legacy byte-identity)
};

// --- responsive override write normalizers (reject-unknown, prune-empty) ----

/**
 * Read/write divergence for the device-defining carve-out (TASK-502-01). The
 * write path REJECTS a `mobileMode`/`dropdownDirection` inside a responsive
 * navProps record; the stored read PRUNES it (a 501-era doc may legit hold one
 * — degrading the whole doc would be data loss). This is a NARROW channel,
 * separate from the leaf `mode` param (leaf validation stays strict on read).
 */
type MenuResponsiveCarveout = "reject" | "prune";

const normalizeMenuSectionResponsive = (
  value: unknown,
  path: string,
  carveout: MenuResponsiveCarveout
): MenuSectionResponsive | undefined => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const out: MenuSectionResponsive = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!(MENU_RESPONSIVE_BREAKPOINT_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`); // "desktop"/junk ⇒ reject
    }
    if (raw === undefined || raw === null) continue;
    if (!isPlainObject(raw)) throw new MenuDocumentError(`${path}.${key}`);
    const override: MenuSectionOverride = {};
    for (const groupKey of Object.keys(raw)) {
      if (!(MENU_SECTION_OVERRIDE_GROUP_KEYS as readonly string[]).includes(groupKey)) {
        throw new MenuDocumentError(`${path}.${key}.${groupKey}`); // "style"/"blocks"/… ⇒ reject
      }
    }
    if (raw.layout !== undefined && raw.layout !== null) {
      // Reuses the SAME subset normalizer as the base ⇒ same reject-unknown
      // + color/number/enum validation (raw stored input never reaches CSS).
      const layout = normalizeMenuBarLayout(raw.layout, `${path}.${key}.layout`);
      if (Object.keys(layout).length > 0) override.layout = layout; // prune empty
    }
    if (raw.navProps !== undefined && raw.navProps !== null) {
      if (!isPlainObject(raw.navProps)) throw new MenuDocumentError(`${path}.${key}.navProps`);
      // Device-defining carve-out: mobileMode/dropdownDirection are never
      // overridable. WRITE ⇒ reject (offending path); STORED READ ⇒ prune the
      // key from the record (mobileMode is HOISTED to the base earlier, in the
      // section pre-pass; dropdownDirection is dead ⇒ prune-only).
      let navInput: Record<string, unknown> = raw.navProps;
      for (const defKey of MENU_NAV_DEVICE_DEFINING_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(navInput, defKey)) continue;
        if (carveout === "reject") {
          throw new MenuDocumentError(`${path}.${key}.navProps.${defKey}`);
        }
        if (navInput === raw.navProps) navInput = { ...navInput }; // copy-on-first-prune
        delete navInput[defKey];
      }
      const navProps = normalizeNavItemsProps(navInput, `${path}.${key}.navProps`);
      if (Object.keys(navProps).length > 0) override.navProps = navProps; // prune empty
    }
    if (Object.keys(override).length > 0) out[key as MenuResponsiveBreakpoint] = override;
  }
  return Object.keys(out).length > 0 ? out : undefined; // empty ⇒ NEVER persisted
};

/**
 * HOIST pre-pass (stored read ONLY, TASK-502-01). A 501-era
 * `responsive.mobile.navProps.mobileMode` override is LIVE data (the mobile CSS
 * branch reads the mobile-resolved value), so prune-only would silently change
 * published mobile rendering. When the raw mobile record carries an OWN
 * mobileMode whose value is a VALID enum member, write it into the raw FIRST
 * nav-items block's `props.mobileMode` (the normative base target, overwriting
 * the base value); `normalizeNavItemsProps` then validates it like any base
 * prop. Invalid/junk values are NOT hoisted (prune-only — hoisting junk would
 * degrade the doc the carve-out exists to save); tablet records and
 * `dropdownDirection` are NEVER hoisted (never consumed / truly dead). Returns
 * a new blocks array when a hoist happened, else null (identity).
 */
const NAV_ITEMS_MOBILE_MODE_VALUES = ["disclosure", "inline"] as const;

const hoistMobileModeOverride = (responsive: unknown, rawBlocks: unknown[]): unknown[] | null => {
  if (!isPlainObject(responsive)) return null;
  const mobile = responsive.mobile;
  if (!isPlainObject(mobile)) return null;
  const navProps = mobile.navProps;
  if (!isPlainObject(navProps)) return null;
  if (!Object.prototype.hasOwnProperty.call(navProps, "mobileMode")) return null;
  const override = navProps.mobileMode;
  if (!(NAV_ITEMS_MOBILE_MODE_VALUES as readonly unknown[]).includes(override)) return null;
  const navIndex = rawBlocks.findIndex(
    (block) => isPlainObject(block) && block.type === "nav-items"
  );
  if (navIndex === -1) return null;
  const navBlock = rawBlocks[navIndex];
  if (!isPlainObject(navBlock)) return null;
  const props = isPlainObject(navBlock.props) ? navBlock.props : {};
  const next = [...rawBlocks];
  next[navIndex] = { ...navBlock, props: { ...props, mobileMode: override } };
  return next;
};

const MENU_BLOCK_VISIBILITY_OVERRIDE_KEYS = ["visible"] as const;
// CONSCIOUS fail-closed READ-trap extension (TASK-504-01 §5): "style" carries the
// tablet/mobile brand style delta; forgetting it degrades every doc holding a
// `responsive.{bp}.style` brand delta.
const MENU_BLOCK_OVERRIDE_GROUP_KEYS = ["visibility", "style"] as const;

const normalizeMenuBlockResponsive = (
  value: unknown,
  path: string
): MenuBlockResponsive | undefined => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const out: MenuBlockResponsive = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!(MENU_RESPONSIVE_BREAKPOINT_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
    if (raw === undefined || raw === null) continue;
    if (!isPlainObject(raw)) throw new MenuDocumentError(`${path}.${key}`);
    for (const groupKey of Object.keys(raw)) {
      // "props"/junk ⇒ reject: menu block overrides carry ONLY visibility + style.
      if (!(MENU_BLOCK_OVERRIDE_GROUP_KEYS as readonly string[]).includes(groupKey)) {
        throw new MenuDocumentError(`${path}.${key}.${groupKey}`);
      }
    }
    const override: MenuBlockOverride = {};
    // CONTROL-FLOW CONVERSION (§5): the two source `continue`s become conditional
    // NON-ASSIGNMENT so the `style` branch + final assign always run — a
    // ported-verbatim `continue` on empty `visible` would silently DROP a valid
    // brand `style` delta (fail-closed data-loss). Asserted in tests.
    if (raw.visibility !== undefined && raw.visibility !== null) {
      if (!isPlainObject(raw.visibility)) throw new MenuDocumentError(`${path}.${key}.visibility`);
      for (const vKey of Object.keys(raw.visibility)) {
        if (!(MENU_BLOCK_VISIBILITY_OVERRIDE_KEYS as readonly string[]).includes(vKey)) {
          throw new MenuDocumentError(`${path}.${key}.visibility.${vKey}`);
        }
      }
      const visible = raw.visibility.visible;
      if (visible !== undefined && visible !== null) {
        if (typeof visible !== "boolean") {
          throw new MenuDocumentError(`${path}.${key}.visibility.visible`);
        }
        override.visibility = { visible };
      } // empty `visible` ⇒ skip ONLY this assign, FALL THROUGH to style
    }
    if (raw.style !== undefined && raw.style !== null) {
      const style = normalizeBrandStyle(raw.style, `${path}.${key}.style`);
      if (style) override.style = style; // prune empty
    }
    if (Object.keys(override).length > 0) out[key as MenuResponsiveBreakpoint] = override;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/** Authoring cap for the per-menu brand text override (exported: 502-04 sets Input maxLength). */
export const MENU_BRAND_TEXT_MAX_LENGTH = 120 as const;

// CONSCIOUS key-list extension (fail-closed read trap: BRAND_PROP_KEYS gates
// BOTH write and stored read; forgetting a key would degrade every saved doc
// carrying that member to empty on read — asserted in tests). "style" added by
// TASK-504-01 — a forgotten "style" degrades every brand-styled doc to empty.
// TASK-520-01-L03: "icon"/"showText" added (fail-closed read trap — a forgotten
// key degrades every icon/combo doc to empty on read; round-trip test asserts it).
const BRAND_PROP_KEYS = ["mode", "href", "image", "text", "icon", "showText", "style"] as const;

// --- TASK-504-01 brand style + per-level style normalizers ------------------

const BRAND_STYLE_KEYS = [
  "fontSize",
  "fontWeight",
  "color",
  "textTransform",
  "letterSpacing",
  "height",
  "maxWidth",
  // TASK-520-01-L03 icon mode:
  "iconColor",
  "iconSize",
] as const;

// reject-unknown OUTER level keys (RAW string keys off Object.keys — the wire form):
const NAV_LEVEL_KEYS = ["1", "2"] as const;
// NUMERIC iteration/assignment (NavLevelStyleLevel):
const NAV_LEVEL_STYLE_LEVELS = [1, 2] as const satisfies readonly NavLevelStyleLevel[];
const NAV_LEVEL_STYLE_KEYS = [
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
  // TASK-506 modern fields (each MUST also land in exactly one value partition
  // below — a key here handled by no branch is silently DROPPED):
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
  // TASK-508-01 R1(b) (value partition: NAV_LEVEL_STYLE_ENUM_FIELDS):
  "linkAlign",
] as const;

// NEW LOCAL clamp tables (NOT added to menuAppearanceNumberRanges): (a) brand
// "fontSize" COLLIDES (appearance 10..32 vs brand 10..48); (b) letterSpacing/
// height/maxWidth/minWidth/radius are not appearance concepts. Both EXPORTED for
// the 504-04 editor slider bounds.
export const BRAND_STYLE_NUMBER_RANGES = {
  fontSize: { min: 10, max: 48 },
  letterSpacing: { min: -2, max: 8 }, // NEGATIVE min — the reason it can't reuse the shared table
  height: { min: 16, max: 120 },
  maxWidth: { min: 40, max: 400 },
  iconSize: { min: 12, max: 64 }, // TASK-520-01-L03 icon mode
} as const;

export const NAV_LEVEL_NUMBER_RANGES = {
  fontSize: { min: 10, max: 32 },
  gap: { min: 0, max: 32 },
  paddingX: { min: 0, max: 40 },
  paddingY: { min: 0, max: 32 },
  borderWidth: { min: 0, max: 8 },
  radius: { min: 0, max: 32 },
  minWidth: { min: 80, max: 480 },
  // TASK-506 modern numeric fields (levels 1/2 + level-0 navChrome share bounds):
  itemDividerWidth: { min: 1, max: 8 }, // B1
  indicatorThickness: { min: 1, max: 6 }, // B2
  transitionMs: { min: 0, max: 400 }, // B2
  hoverLift: { min: 0, max: 8 }, // B2
  containerPaddingX: { min: 0, max: 40 }, // B4 (levels >= 1)
  containerPaddingY: { min: 0, max: 32 }, // B4 (levels >= 1)
} as const;

// TASK-506 fresh local enum option arrays (mirror menuAppearanceFontWeights usage).
const ITEM_DIVIDER_STYLES = ["solid", "dashed", "dotted"] as const;
const NAV_INDICATOR_KINDS = ["none", "underline", "overline"] as const;
const FLYOUT_ANIMATIONS = ["none", "fade", "slide"] as const;
const SUBMENU_PLACEMENTS = ["right", "bottom", "left"] as const;
// TASK-508-01 fresh enum option arrays (mirror SUBMENU_PLACEMENTS above).
const NAV_LINK_ALIGNS = ["left", "center", "right"] as const; // R1(b) NavLevelStyle.linkAlign
const SUBMENU_DIRECTIONS = ["right", "down", "up", "left"] as const; // R3a navChrome.submenuDirection
const SUBMENU_MODES = ["flyout", "accordion"] as const; // R3b navChrome.submenuMode

// TASK-506 level-0 pill ranges (navChrome-only keys) + the level-0 variants of the
// shared numeric fields (same bounds as the level table above).
export const NAV_CHROME_NUMBER_RANGES = {
  navPillRadius: { min: 0, max: 40 },
  navPillPaddingX: { min: 0, max: 40 },
  navPillPaddingY: { min: 0, max: 32 },
  itemDividerWidth: { min: 1, max: 8 },
  indicatorThickness: { min: 1, max: 6 },
  transitionMs: { min: 0, max: 400 },
  hoverLift: { min: 0, max: 8 },
} as const;

/**
 * TASK-506 F2 modern-fields effective defaults. The single non-hardcoded source
 * for the enum/bool B1–B5 fields' resolved-default hint (`resolveMenuControlDefault`
 * reads it; 506-02 mirrors it for present-only CSS emission; 506-04's
 * `ControlDefaultHint` imports it). These mirror today's implicit CSS behaviour
 * (caret always-on, nested flyout flies right, pure display toggle). NOTE:
 * `flyoutAnimation` is a levels-1/2 NavLevelStyle field (never a navChrome key)
 * but its effective-default VALUE lives here for the level-1/2 hint, exactly like
 * the level-2-only `submenuPlacement`. The GATED present-only NUMERICS are
 * DELIBERATELY absent (unset ⇒ no element ⇒ no meaningful resolved number). */
export const NAV_CHROME_DEFAULTS = {
  submenuPlacement: "right",
  indicator: "none",
  flyoutAnimation: "none",
  showCaret: true,
  caretRotateOnOpen: false,
  indicatorGrow: false,
  hoverUnderline: false,
  itemDividerShow: false,
  itemDividerStyle: "solid",
  // TASK-508-01 HINT-ONLY entries (NAV_CHROME_DEFAULTS is the level-agnostic hint
  // provider, NOT chrome-only — resolveNavKeyThemeDefault's hasOwnProperty branch
  // serves levels 1/2 too). NEVER read by CSS emission ⇒ byte-safe / present-only.
  linkAlign: "left", // R1(b) level-1/2 dropdown link align hint (Default (Left))
  submenuDirection: "down", // R3a recommended unified direction hint (Default (Down))
  submenuMode: "flyout", // R3b default mode hint (Default (Flyout))
} as const;

/**
 * TASK-506 F2 theme / base-sheet default source consts. Re-declared here (the
 * model layer stays self-contained) as the SINGLE source 506-02/506-04 import.
 * Mirrors `SHELL_DEFAULT_LINK_*` (`menuDocumentCss.ts:104-106`) +
 * `NAV_FONT_SIZE_INHERITED` (the editor const `MenuDesignEditor.tsx:304`). */
export const MENU_SHELL_DEFAULT_LINK_PX = 12 as const;
export const MENU_SHELL_DEFAULT_LINK_PY = 8 as const;
export const MENU_SHELL_DEFAULT_LINK_RADIUS = 6 as const;
export const NAV_FONT_SIZE_INHERITED = 16 as const;
/** TASK-508-01 R1(a): base-sheet mirror of `.site-nav-sublist{min-width:180px;
 *  padding:6px}` (siteShellCss.ts:151). The sublist container ALWAYS paints these
 *  regardless of override, so the effective UNSET value genuinely IS 180 / 6 —
 *  surfacing them in the hint is honest, not misleading. Do NOT edit siteShellCss.ts. */
export const MENU_SHELL_SUBLIST_MIN_WIDTH = 180 as const;
export const MENU_SHELL_SUBLIST_PADDING = 6 as const;

/** Editor slider-bound convenience alias for the LEVEL-0 nav-link scalars
 *  (control-facing keys `paddingX`/`paddingY`/`radius`, re-mapped from the shared
 *  `menuAppearanceNumberRanges`). Bounds only — the level-0 WRITE target is still
 *  the `linkPaddingX`/`linkPaddingY`/`linkRadius` scalar; this alias is never a
 *  write key. Exported for 504-04. */
export const NAV_LINK_NUMBER_RANGES = {
  paddingX: menuAppearanceNumberRanges.linkPaddingX,
  paddingY: menuAppearanceNumberRanges.linkPaddingY,
  radius: menuAppearanceNumberRanges.linkRadius,
} as const;

/** Local clamp (table-agnostic mirror of clampMenuAppearanceNumber). Returns null
 *  for non-finite ⇒ caller OMITS the key (sparse fail-soft value policy). */
const clampLocalNumber = (range: { min: number; max: number }, value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(range.max, Math.max(range.min, Math.round(value)))
    : null;

const normalizeEnumLocal = <T>(options: readonly T[], value: unknown): T | null =>
  options.includes(value as T) ? (value as T) : null;

// --- TASK-520-01-L02: custom box-shadow value validator (security-critical) ---
//
// `shadowCustom`/`shadowCustomScrolled` are attacker-influenceable free-text CSS
// values that 520-02 emits into a `<style>`/inline declaration on the PUBLIC
// render path. `normalizeMenuColorValue` validates a SINGLE color token — it
// cannot validate a full `box-shadow` (offsets + blur + spread + color, possibly
// comma-layered). This bespoke validator accepts ONLY a bounded box-shadow
// grammar: an optional `inset`, 2..4 length tokens, and EXACTLY ONE color token
// validated via `normalizeMenuColorValue`, comma-repeated up to 4 layers, total
// length <= 200. It rejects `url(`/`expression(`/`javascript:`/`var(`/`calc(`/
// `image-set(`/`{`/`}`/`;`/`<`/`>`/`@`/`\`/`/*` up front. Fail-soft (null ⇒ key
// omitted; never throws). The embedded color token is emitted in the canonical
// authoring bytes returned by the shared owner, including leading-dot alpha
// normalization (`.24` → `0.24`). The surrounding shadow grammar and its own
// length/layer limits remain separate from the single-color contract.
const BOX_SHADOW_MAX_LENGTH = 200;
const BOX_SHADOW_MAX_LAYERS = 4;
// One length token: optional sign, integer/decimal with unit px|rem|em, OR bare 0.
const SHADOW_LENGTH = String.raw`-?(?:\d+(?:\.\d+)?(?:px|rem|em)|0)`;
// Hard-deny anything that could break out of the value context or fetch/execute:
const SHADOW_DENY = /url\(|expression\(|javascript:|image-set\(|var\(|calc\(|[;{}<>@\\]|\/\*/i;

// Bracket-aware tokenizer: split a single layer on whitespace ONLY at paren-depth
// 0 so a color function like `rgba(8, 17, 31, .84)` (internal spaces after commas)
// stays a SINGLE token.
const tokenizeShadowLayer = (layer: string): string[] => {
  const tokens: string[] = [];
  let cur = "";
  let depth = 0;
  for (const ch of layer) {
    if (ch === "(") {
      depth += 1;
      cur += ch;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      cur += ch;
      continue;
    }
    if (depth === 0 && /\s/.test(ch)) {
      if (cur) {
        tokens.push(cur);
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
};

export function normalizeMenuBoxShadowValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw.length === 0 || raw.length > BOX_SHADOW_MAX_LENGTH) return null;
  if (SHADOW_DENY.test(raw)) return null; // security gate 1

  // Split on top-level commas, then re-merge commas that fall INSIDE a color
  // function's parens (a comma at paren-depth > 0 belongs to the color, not a
  // layer boundary — otherwise `rgba(0,0,0,.24)` is miscounted as extra layers).
  const pieces = raw.split(",");
  const mergedLayers: string[] = [];
  let depth = 0;
  for (const piece of pieces) {
    if (depth > 0) mergedLayers[mergedLayers.length - 1] += "," + piece;
    else mergedLayers.push(piece);
    for (const ch of piece) {
      if (ch === "(") depth += 1;
      else if (ch === ")") depth = Math.max(0, depth - 1);
    }
  }
  if (mergedLayers.length > BOX_SHADOW_MAX_LAYERS) return null;

  const lengthRe = new RegExp(`^${SHADOW_LENGTH}$`, "i");
  const cleaned: string[] = [];
  for (const layerRaw of mergedLayers) {
    const layer = layerRaw.trim();
    if (layer.length === 0) return null;
    let rest = layer;
    let inset = "";
    if (/^inset\b/i.test(rest)) {
      inset = "inset ";
      rest = rest.replace(/^inset\b\s*/i, "");
    }
    const tokens = tokenizeShadowLayer(rest).filter(Boolean);
    const lengths: string[] = [];
    let color: string | null = null;
    for (const tok of tokens) {
      if (lengthRe.test(tok)) {
        lengths.push(tok);
        continue;
      }
      if (color !== null) return null; // a second non-length token ⇒ reject
      color = normalizeMenuColorValue(tok); // security gate 2 (reuses color whitelist)
      if (color === null) return null; // unknown token / bad color ⇒ reject
    }
    if (lengths.length < 2 || lengths.length > 4) return null; // offset-x/y (+ optional blur/spread)
    if (color === null) return null; // a visible shadow needs a color
    cleaned.push(`${inset}${lengths.join(" ")} ${color}`.trim());
  }
  return cleaned.join(", "); // canonicalized, validated
}

/** TASK-520-01-L03: brand icon-name validator (pattern-only, fail-soft). The
 *  effective ALLOWLIST is enforced at RENDER (520-04) by resolving the name against
 *  `lucideKebabIconComponents`; an unknown/unresolvable name falls through to the
 *  text/site-name chain and renders nothing injectable. */
const BRAND_ICON_NAME_PATTERN = /^[a-z0-9-]{1,64}$/;
const normalizeBrandIconName = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const n = value.trim().toLowerCase();
  return BRAND_ICON_NAME_PATTERN.test(n) ? n : undefined;
};

/**
 * VALUE-handling policy (CONSCIOUS): KEYS reject-unknown (throw
 * MenuDocumentError), but VALUES fail-soft (a bad color/number/enum is OMITTED,
 * NOT thrown — mirrors normalizeMenuColorValue's null-drop). This intentionally
 * differs from the flat normalizeAppearanceSubset (which throws on bad scalar
 * values); asserted by tests so it can never regress silently.
 */
const normalizeBrandStyle = (value: unknown, path: string): BrandStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path); // structural throw
  for (const key of Object.keys(value)) {
    // reject-unknown KEYS
    if (!(BRAND_STYLE_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  const out: BrandStyle = {};
  const num = (k: keyof typeof BRAND_STYLE_NUMBER_RANGES) => {
    const v = clampLocalNumber(BRAND_STYLE_NUMBER_RANGES[k], value[k]);
    if (v !== null) out[k] = v; // value fail-soft omit
  };
  if (value.fontSize !== undefined && value.fontSize !== null) num("fontSize");
  if (value.letterSpacing !== undefined && value.letterSpacing !== null) num("letterSpacing");
  if (value.height !== undefined && value.height !== null) num("height");
  if (value.maxWidth !== undefined && value.maxWidth !== null) num("maxWidth");
  if (value.iconSize !== undefined && value.iconSize !== null) num("iconSize"); // TASK-520-01-L03
  if (value.fontWeight !== undefined && value.fontWeight !== null) {
    const w = normalizeEnumLocal(menuAppearanceFontWeights, value.fontWeight);
    if (w !== null) out.fontWeight = w;
  }
  if (value.textTransform !== undefined && value.textTransform !== null) {
    const t = normalizeEnumLocal(menuAppearanceTextTransforms, value.textTransform);
    if (t !== null) out.textTransform = t;
  }
  if (value.color !== undefined && value.color !== null) {
    const c = normalizeMenuColorValue(value.color);
    if (c !== null) out.color = c;
  }
  if (value.iconColor !== undefined && value.iconColor !== null) {
    // TASK-520-01-L03 icon mode color (alpha OK via the shared color whitelist).
    const c = normalizeMenuColorValue(value.iconColor);
    if (c !== null) out.iconColor = c;
  }
  return Object.keys(out).length > 0 ? out : undefined; // PRUNE empty ⇒ omit member
};

const NAV_LEVEL_STYLE_COLOR_KEYS = [
  "linkColor",
  "linkHoverColor",
  "linkHoverTextColor",
  "linkActiveColor",
  "background",
  "borderColor",
  // TASK-506:
  "itemDividerColor",
  "indicatorColor",
] as const;
const NAV_LEVEL_STYLE_NUMBER_KEYS = [
  "fontSize",
  "gap",
  "paddingX",
  "paddingY",
  "borderWidth",
  "radius",
  "minWidth",
  // TASK-506 (bounds in NAV_LEVEL_NUMBER_RANGES):
  "itemDividerWidth",
  "indicatorThickness",
  "transitionMs",
  "hoverLift",
  "containerPaddingX",
  "containerPaddingY",
] as const;
// TASK-506: the FIRST boolean partition on nav styling (none existed before).
const NAV_LEVEL_STYLE_BOOL_KEYS = [
  "itemDividerShow",
  "indicatorGrow",
  "hoverUnderline",
  "showCaret",
  "caretRotateOnOpen",
] as const;
// TASK-506 enum partition (mirror the shadow branch — fail-soft omit on bad value).
const NAV_LEVEL_STYLE_ENUM_FIELDS = [
  ["itemDividerStyle", ITEM_DIVIDER_STYLES],
  ["indicator", NAV_INDICATOR_KINDS],
  ["flyoutAnimation", FLYOUT_ANIMATIONS],
  ["submenuPlacement", SUBMENU_PLACEMENTS],
  // TASK-508-01 R1(b) — fail-soft OMIT on bad value via the shared enum loop:
  ["linkAlign", NAV_LINK_ALIGNS],
] as const;

const normalizeNavLevelStyle = (value: unknown, path: string): NavLevelStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    // reject-unknown STYLE keys
    if (!(NAV_LEVEL_STYLE_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  const out: NavLevelStyle = {};
  for (const k of NAV_LEVEL_STYLE_COLOR_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    const c = normalizeMenuColorValue(value[k]);
    if (c !== null) out[k] = c; // value fail-soft omit
  }
  for (const k of NAV_LEVEL_STYLE_NUMBER_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    const n = clampLocalNumber(NAV_LEVEL_NUMBER_RANGES[k], value[k]);
    if (n !== null) out[k] = n;
  }
  if (value.fontWeight !== undefined && value.fontWeight !== null) {
    const w = normalizeEnumLocal(menuAppearanceFontWeights, value.fontWeight);
    if (w !== null) out.fontWeight = w;
  }
  if (value.shadow !== undefined && value.shadow !== null) {
    const s = normalizeEnumLocal(menuAppearanceShadows, value.shadow);
    if (s !== null) out.shadow = s;
  }
  // TASK-506 enum branches (fail-soft omit on bad value):
  for (const [k, options] of NAV_LEVEL_STYLE_ENUM_FIELDS) {
    if (value[k] === undefined || value[k] === null) continue;
    const e = normalizeEnumLocal(options, value[k]);
    if (e !== null) (out as Record<string, unknown>)[k] = e;
  }
  // TASK-506 boolean partition (typeof===boolean, non-boolean ⇒ fail-soft OMIT):
  for (const k of NAV_LEVEL_STYLE_BOOL_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    if (typeof value[k] === "boolean") (out as Record<string, unknown>)[k] = value[k];
  }
  return Object.keys(out).length > 0 ? out : undefined; // prune empty level
};

const normalizeNavLevelStyles = (value: unknown, path: string): NavLevelStyles | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    // reject-unknown LEVEL keys ("0"/"3"/junk)
    if (!(NAV_LEVEL_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  const out: NavLevelStyles = {};
  for (const level of NAV_LEVEL_STYLE_LEVELS) {
    const raw = (value as Record<string, unknown>)[level]; // value[1] ⇒ "1" at runtime
    if (raw === undefined || raw === null) continue;
    const style = normalizeNavLevelStyle(raw, `${path}.${level}`);
    if (style) out[level] = style; // prune empty level
  }
  return Object.keys(out).length > 0 ? out : undefined; // prune empty record ⇒ omit
};

// --- TASK-506 level-0 navChrome sub-record (Option B) ------------------------
// CONSCIOUS fail-closed READ-trap allowlist: a forgotten key degrades every stored
// doc carrying a navChrome member to empty on read (round-trip test per key). NO
// `flyoutAnimation` — it is a levels-≥1 NavLevelStyle field (writing it under
// navChrome reject-unknown throws).
const NAV_CHROME_KEYS = [
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
  // TASK-508-01 R3a/R3b nav-global submenu form (value partition: NAV_CHROME_ENUM_FIELDS):
  "submenuDirection",
  "submenuMode",
] as const;
const NAV_CHROME_COLOR_KEYS = ["navPillBackground", "itemDividerColor", "indicatorColor"] as const;
const NAV_CHROME_NUMBER_KEYS = [
  "navPillRadius",
  "navPillPaddingX",
  "navPillPaddingY",
  "itemDividerWidth",
  "indicatorThickness",
  "transitionMs",
  "hoverLift",
] as const;
const NAV_CHROME_ENUM_FIELDS = [
  ["itemDividerStyle", ITEM_DIVIDER_STYLES],
  ["indicator", NAV_INDICATOR_KINDS],
  // TASK-508-01 R3a/R3b (fail-soft OMIT on bad value via the shared enum loop):
  ["submenuDirection", SUBMENU_DIRECTIONS],
  ["submenuMode", SUBMENU_MODES],
] as const;
const NAV_CHROME_BOOL_KEYS = [
  "itemDividerShow",
  "indicatorGrow",
  "hoverUnderline",
  "showCaret",
  "caretRotateOnOpen",
] as const;

// Same VALUE policy as normalizeNavLevelStyle (KEYS throw reject-unknown; VALUES
// fail-soft OMIT). Numbers clamp over NAV_CHROME_NUMBER_RANGES; empty ⇒ pruned.
const normalizeNavChrome = (value: unknown, path: string): NavChromeStyle | undefined => {
  if (value === undefined || value === null) return undefined;
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    if (!(NAV_CHROME_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`); // reject-unknown KEY
    }
  }
  const out: NavChromeStyle = {};
  for (const k of NAV_CHROME_COLOR_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    const c = normalizeMenuColorValue(value[k]);
    if (c !== null) (out as Record<string, unknown>)[k] = c;
  }
  for (const k of NAV_CHROME_NUMBER_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    const n = clampLocalNumber(NAV_CHROME_NUMBER_RANGES[k], value[k]);
    if (n !== null) (out as Record<string, unknown>)[k] = n;
  }
  for (const [k, options] of NAV_CHROME_ENUM_FIELDS) {
    if (value[k] === undefined || value[k] === null) continue;
    const e = normalizeEnumLocal(options, value[k]);
    if (e !== null) (out as Record<string, unknown>)[k] = e;
  }
  for (const k of NAV_CHROME_BOOL_KEYS) {
    if (value[k] === undefined || value[k] === null) continue;
    if (typeof value[k] === "boolean") (out as Record<string, unknown>)[k] = value[k];
  }
  return Object.keys(out).length > 0 ? out : undefined; // prune empty ⇒ no member
};

/**
 * Brand IMAGE src resolver (TASK-504-01 §3a, B1 model half; SINGLE home). Takes
 * the NORMALIZED brand `image` shape (the page image-leaf props
 * `{ assetId, src, alt, caption, fit }`) and returns the resolvable `src` (or
 * null when absent/unresolvable), reusing the SAME `sanitizeAuthoringMediaUrl`
 * the image leaf uses to derive its `src` (`pageRendererV2.tsx` renderImage). Do
 * NOT re-implement in 504-03/504-04 — they IMPORT this.
 */
export function resolveBrandImageSrc(image: BrandProps["image"]): string | null {
  if (!isPlainObject(image)) return null;
  return sanitizeAuthoringMediaUrl(image.src) ?? null;
}

const normalizeBrandProps = (
  value: unknown,
  mode: "write" | "stored-read",
  path: string
): BrandProps => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    if (!(BRAND_PROP_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  let brandMode: BrandProps["mode"] = "text";
  if (value.mode !== undefined) {
    // TASK-520-01-L03: "icon" added to the mode union.
    if (value.mode !== "text" && value.mode !== "image" && value.mode !== "icon") {
      throw new MenuDocumentError(`${path}.mode`);
    }
    brandMode = value.mode;
  }
  let href = "/";
  if (value.href !== undefined) {
    if (typeof value.href !== "string") throw new MenuDocumentError(`${path}.href`);
    const trimmed = value.href.trim();
    // Route brand.href through the SAME authoring URL sanitizer every other
    // stored href uses (the page button/link leaf → sanitizeAuthoringLinkHref),
    // closing the reject-unknown hole: `javascript:`/`data:`/`vbscript:` (and
    // other unsafe schemes) are dropped on WRITE and can never be SSR-emitted
    // into the public header anchor. Fail-soft to "/" (mirroring the page
    // button leaf, which drops an unsafe href rather than throwing) so a valid
    // anchor is always rendered.
    if (trimmed.length > 0) href = sanitizeAuthoringLinkHref(trimmed) ?? "/";
  }
  const props: BrandProps = { mode: brandMode, href };
  if (value.text !== undefined && value.text !== null) {
    // null tolerated as absent (mirrors image below).
    if (typeof value.text !== "string") throw new MenuDocumentError(`${path}.text`);
    const text = value.text.trim().slice(0, MENU_BRAND_TEXT_MAX_LENGTH); // fail-soft cap, never throw-on-long
    if (text.length > 0) props.text = text; // SPARSE: empty/whitespace ⇒ OMIT ⇒ inherit site name
  }
  if (value.icon !== undefined && value.icon !== null) {
    // TASK-520-01-L03: fail-soft — a bad icon name is dropped (SPARSE), never throws.
    const icon = normalizeBrandIconName(value.icon);
    if (icon) props.icon = icon;
  }
  if (value.showText !== undefined && value.showText !== null) {
    // TASK-520-01-L03: strict TYPE (throw on non-boolean); present-only VALUE
    // (store only `true`; false = the exclusive-legacy default ⇒ omit).
    if (typeof value.showText !== "boolean") throw new MenuDocumentError(`${path}.showText`);
    if (value.showText) props.showText = true;
  }
  if (value.image !== undefined && value.image !== null) {
    props.image = normalizeBrandImage(value.image, mode, `${path}.image`);
  }
  if (value.style !== undefined && value.style !== null) {
    // null tolerated as absent; sparse ⇒ omit when pruned (legacy byte-identity).
    const style = normalizeBrandStyle(value.style, `${path}.style`);
    if (style) props.style = style;
  }
  return props;
};

const MENU_UTILITY_PROP_KEYS = ["label"] as const;

const normalizeMenuUtilityProps = (value: unknown, path: string): MenuUtilityProps => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    if (!(MENU_UTILITY_PROP_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
  }
  const props: MenuUtilityProps = {};
  if (value.label !== undefined && value.label !== null) {
    if (typeof value.label !== "string") throw new MenuDocumentError(`${path}.label`);
    props.label = value.label.trim();
  }
  return props;
};

// --- reused leaf blocks — through the page pipeline (the proven trick) -------

const MENU_LEAF_PAGE_TYPES = {
  "cta-button": "button",
  divider: "divider",
  spacer: "spacer",
} as const;

/**
 * Wraps a candidate leaf block in ONE throwaway page section, runs the PUBLIC
 * page normalizers, then re-tags it back to the menu type. This inherits
 * button/image/divider/spacer + style + visibility + box-spacing validation for
 * FREE, with no page-schema edit (mirrors `menuNavExtras.ts`).
 */
const normalizeThroughPageLeaf = (
  block: Record<string, unknown>,
  pageType: string,
  mode: "write" | "stored-read",
  path: string
): {
  props: Record<string, unknown>;
  style?: PageBlockStyleV2;
  visibility: PageBlockVisibilityV2;
} => {
  const wrapped = {
    id: readMenuBlockId(block, "blk"),
    props: {},
    visibility: { visible: true },
    ...block,
    type: pageType,
  };
  const wrapper = {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: ["desktop", "tablet", "mobile"],
    seo: {},
    settings: {},
    sections: [
      {
        ...createPageSectionV2("custom", { id: "sec_menu_doc_leaf", name: "Menu leaf" }),
        blocks: [wrapped],
      },
    ],
  };
  let out: PageBlockV2 | undefined;
  try {
    const doc =
      mode === "write"
        ? normalizePageDocumentV2ForWrite(wrapper)
        : normalizeStoredPageDocumentV2ForRead(wrapper);
    out = doc.sections[0]?.blocks[0];
  } catch (error) {
    if (isPageDocumentError(error)) throw new MenuDocumentError(path);
    throw error;
  }
  if (!out) throw new MenuDocumentError(path);
  return { props: out.props, style: out.style, visibility: out.visibility };
};

const normalizeBrandImage = (
  value: unknown,
  mode: "write" | "stored-read",
  path: string
): Record<string, unknown> => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const leaf = normalizeThroughPageLeaf({ props: value }, "image", mode, path);
  return leaf.props;
};

// --- block / section normalizers --------------------------------------------

// "responsive" added by TASK-501-01 — the stored read is fail-closed
// (normalizeStoredMenuDocumentV2ForRead delegates to the strict writer);
// removing/forgetting this entry degrades every saved responsive document to
// empty (silent data loss).
const MENU_NATIVE_BLOCK_KEYS = ["id", "type", "props", "responsive"];
// "responsive" added by TASK-501-01 — same fail-closed read trap as above.
const MENU_LEAF_BLOCK_KEYS = ["id", "type", "props", "style", "visibility", "responsive"];

const assertBlockKeys = (
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string
) => {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new MenuDocumentError(`${path}.${key}`);
  }
};

const isMenuNativeBlockType = (type: string): boolean =>
  (MENU_NATIVE_BLOCK_TYPES as readonly string[]).includes(type);

const isMenuLeafBlockType = (type: string): type is (typeof MENU_LEAF_BLOCK_TYPES)[number] =>
  (MENU_LEAF_BLOCK_TYPES as readonly string[]).includes(type);

const normalizeMenuBlock = (
  value: unknown,
  path: string,
  mode: "write" | "stored-read"
): MenuBlockV2 => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const type = value.type;
  if (typeof type !== "string" || !(menuBlockTypes as readonly string[]).includes(type)) {
    throw new MenuDocumentError(`${path}.type`);
  }
  const blockType = type as MenuBlockType;
  const id = readMenuBlockId(value, "blk");

  // Reject-unknown at the block level: menu-native blocks carry NO FLAT style/
  // visibility, only reused leaf blocks do (both carry the menu-validated
  // `responsive` visibility record).
  assertBlockKeys(
    value,
    isMenuNativeBlockType(blockType) ? MENU_NATIVE_BLOCK_KEYS : MENU_LEAF_BLOCK_KEYS,
    path
  );

  // Validated by the MENU contract (never the page pipeline) for every block
  // type; emitted spread-if-present so legacy blocks round-trip byte-identically.
  const responsive =
    value.responsive === undefined || value.responsive === null
      ? undefined
      : normalizeMenuBlockResponsive(value.responsive, `${path}.responsive`);

  if (blockType === "nav-items") {
    return {
      id,
      type: "nav-items",
      props: normalizeNavItemsProps(value.props ?? {}, `${path}.props`),
      ...(responsive ? { responsive } : {}),
    };
  }
  if (blockType === "brand") {
    return {
      id,
      type: "brand",
      props: normalizeBrandProps(value.props ?? {}, mode, `${path}.props`),
      ...(responsive ? { responsive } : {}),
    };
  }
  if (blockType === "search" || blockType === "account" || blockType === "language") {
    return {
      id,
      type: blockType,
      props: normalizeMenuUtilityProps(value.props ?? {}, `${path}.props`),
      ...(responsive ? { responsive } : {}),
    };
  }
  if (isMenuLeafBlockType(blockType)) {
    const pageType = MENU_LEAF_PAGE_TYPES[blockType];
    // Strip `responsive` before wrapping: the PAGE block schema accepts a
    // WIDER `responsive` shape (props/style per breakpoint) that would
    // silently launder page-shaped overrides past the menu contract above.
    const { responsive: _rawResponsive, ...leafInput } = value;
    const leaf = normalizeThroughPageLeaf({ ...leafInput, id }, pageType, mode, path);
    return {
      id,
      type: blockType,
      props: leaf.props,
      style: leaf.style,
      visibility: leaf.visibility,
      ...(responsive ? { responsive } : {}),
    };
  }
  throw new MenuDocumentError(`${path}.type`);
};

// "responsive" added by TASK-501-01 — the stored read is fail-closed;
// removing/forgetting this entry degrades every saved responsive document to
// empty (silent data loss).
const MENU_SECTION_KEYS = ["id", "type", "name", "layout", "blocks", "responsive"];

const normalizeMenuSection = (
  value: unknown,
  path: string,
  mode: "write" | "stored-read",
  carveout: MenuResponsiveCarveout
): MenuSectionV2 => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value)) {
    if (!MENU_SECTION_KEYS.includes(key)) throw new MenuDocumentError(`${path}.${key}`);
  }
  const type = value.type;
  if (typeof type !== "string" || !(menuSectionTypes as readonly string[]).includes(type)) {
    throw new MenuDocumentError(`${path}.type`);
  }
  const sectionType = type as MenuSectionType;
  const id =
    typeof value.id === "string" && value.id.trim().length > 0
      ? value.id
      : createMenuDocumentId("sec");
  const name =
    typeof value.name === "string" && value.name.trim().length > 0
      ? value.name.trim()
      : sectionTypeName[sectionType];
  const layout = normalizeMenuBarLayout(value.layout ?? {}, `${path}.layout`);
  let rawBlocks = requireArray(value.blocks ?? [], `${path}.blocks`);
  if (rawBlocks.length > MENU_SECTION_MAX_BLOCKS) throw new MenuDocumentError(`${path}.blocks`);
  // HOIST pre-pass (stored read only): a 501-era mobile `mobileMode` override is
  // consumed by the mobile branch today, so it is hoisted into the base props
  // BEFORE block normalization (the responsive normalizer then prunes the
  // record). Behavior-preserving; runs before normalization so the hoisted
  // value is validated like any base prop.
  if (carveout === "prune") {
    const hoisted = hoistMobileModeOverride(value.responsive, rawBlocks);
    if (hoisted) rawBlocks = hoisted;
  }
  const blocks = rawBlocks.map((block, index) =>
    normalizeMenuBlock(block, `${path}.blocks[${index}]`, mode)
  );
  // Spread-if-present: legacy documents WITHOUT `responsive` normalize to
  // byte-identical objects (no `responsive` member ever materializes).
  const responsive =
    value.responsive === undefined || value.responsive === null
      ? undefined
      : normalizeMenuSectionResponsive(value.responsive, `${path}.responsive`, carveout);
  return { id, type: sectionType, name, layout, blocks, ...(responsive ? { responsive } : {}) };
};

// --- write / read / resolvers -----------------------------------------------

const normalizeMenuDocumentV2 = (
  value: unknown,
  carveout: MenuResponsiveCarveout
): MenuDocumentV2 => {
  if (!isPlainObject(value)) throw new MenuDocumentError("document");
  const sections = requireArray(value.sections, "document.sections");
  if (sections.length > MENU_DOCUMENT_MAX_SECTIONS)
    throw new MenuDocumentError("document.sections");
  // Schema-first / reject-unknown, NO stamp-on-absent: a NON-EMPTY document MUST
  // carry the EXACT current marker (reject absent OR lower/unknown). This is what
  // makes a marker-less/lower-version STORED document fail-closed to empty on read.
  if (sections.length > 0 && value.schemaVersion !== MENU_DOCUMENT_SCHEMA_VERSION) {
    throw new MenuDocumentError("document.schemaVersion");
  }
  // Leaf/brand `mode` stays the literal "write" in BOTH paths (the carve-out is
  // a separate narrow channel — leaf validation never flips to the lenient page
  // read path on a stored read).
  return {
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: sections.map((section, index) =>
      normalizeMenuSection(section, `document.sections[${index}]`, "write", carveout)
    ),
  };
};

export function normalizeMenuDocumentV2ForWrite(value: unknown): MenuDocumentV2 {
  return normalizeMenuDocumentV2(value, "reject");
}

const EMPTY_MENU_DOCUMENT: MenuDocumentV2 = {
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [],
};

export function normalizeStoredMenuDocumentV2ForRead(value: unknown): MenuDocumentV2 {
  // Fail-closed EXCEPT the one conscious device-defining carve-out (prune): a
  // marker-less/lower-version or otherwise-invalid stored document throws ⇒
  // degrades to empty here ⇒ resolver null ⇒ legacy look.
  try {
    return normalizeMenuDocumentV2(value, "prune");
  } catch {
    return { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [] };
  }
}

export const isEmptyMenuDocument = (doc: MenuDocumentV2 | null): boolean =>
  !doc || doc.sections.length === 0 || doc.sections.every((section) => section.blocks.length === 0);

// --- composition helpers (pure) ---------------------------------------------

export function createDefaultMenuBlock(type: MenuBlockType): MenuBlockV2 {
  if (type === "nav-items")
    return { id: createMenuDocumentId("blk"), type: "nav-items", props: {} };
  if (type === "brand")
    return { id: createMenuDocumentId("blk"), type: "brand", props: { mode: "text", href: "/" } };
  if (type === "search" || type === "account" || type === "language")
    return { id: createMenuDocumentId("blk"), type, props: {} };
  // Reused leaf blocks: seed defaults through the page block factory so props/
  // style/visibility match the page schema, then re-tag to the menu type.
  const pageBlock = createPageBlockV2(MENU_LEAF_PAGE_TYPES[type]);
  return {
    id: createMenuDocumentId("blk"),
    type,
    props: pageBlock.props,
    style: pageBlock.style,
    visibility: pageBlock.visibility,
  };
}

export function createDefaultMenuDocumentV2(): MenuDocumentV2 {
  return {
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: createMenuDocumentId("sec"),
        type: "menu-bar",
        name: sectionTypeName["menu-bar"],
        layout: {},
        blocks: [
          createDefaultMenuBlock("brand"),
          createDefaultMenuBlock("nav-items"),
          createDefaultMenuBlock("cta-button"),
        ],
      },
    ],
  };
}

const firstSectionBlocks = (doc: MenuDocumentV2): MenuBlockV2[] => doc.sections[0]?.blocks ?? [];

const withFirstSectionBlocks = (doc: MenuDocumentV2, blocks: MenuBlockV2[]): MenuDocumentV2 => {
  if (doc.sections.length === 0) return doc;
  return {
    ...doc,
    sections: doc.sections.map((section, index) =>
      index === 0 ? { ...section, blocks } : section
    ),
  };
};

export function findMenuBlock(doc: MenuDocumentV2, id: string | null): MenuBlockV2 | null {
  if (!id) return null;
  for (const section of doc.sections) {
    const found = section.blocks.find((block) => block.id === id);
    if (found) return found;
  }
  return null;
}

export function insertMenuBlock(doc: MenuDocumentV2, block: MenuBlockV2): MenuDocumentV2 {
  return withFirstSectionBlocks(doc, [...firstSectionBlocks(doc), block]);
}

export function deleteMenuBlock(doc: MenuDocumentV2, id: string): MenuDocumentV2 {
  return withFirstSectionBlocks(
    doc,
    firstSectionBlocks(doc).filter((block) => block.id !== id)
  );
}

export function reorderMenuBlock(
  doc: MenuDocumentV2,
  id: string,
  dir: "up" | "down"
): MenuDocumentV2 {
  const blocks = [...firstSectionBlocks(doc)];
  const index = blocks.findIndex((block) => block.id === id);
  if (index === -1) return doc;
  const target = dir === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= blocks.length) return doc;
  const [moved] = blocks.splice(index, 1);
  if (!moved) return doc;
  blocks.splice(target, 0, moved);
  return withFirstSectionBlocks(doc, blocks);
}

// --- per-device resolve / read / patch / clear helpers (TASK-501-01) --------
// All immutable and tolerant (missing id/override ⇒ identity return); consumed
// by the CSS builder (501-02) and the Design editor's event handlers (501-03).

/** desktop ⇒ null (the base); tablet/mobile ⇒ their OWN sparse responsive record. */
const menuDeviceBreakpoint = (device: MenuDeviceKind): MenuResponsiveBreakpoint | null =>
  device === "desktop" ? null : device;

const mapMenuSection = (
  doc: MenuDocumentV2,
  sectionId: string,
  fn: (section: MenuSectionV2) => MenuSectionV2
): MenuDocumentV2 => {
  const index = doc.sections.findIndex((section) => section.id === sectionId);
  if (index === -1) return doc;
  return {
    ...doc,
    sections: doc.sections.map((section, i) => (i === index ? fn(section) : section)),
  };
};

const mapMenuBlock = (
  doc: MenuDocumentV2,
  blockId: string,
  fn: (block: MenuBlockV2) => MenuBlockV2
): MenuDocumentV2 => {
  let found = false;
  const sections = doc.sections.map((section) => {
    const index = section.blocks.findIndex((block) => block.id === blockId);
    if (index === -1) return section;
    found = true;
    return {
      ...section,
      blocks: section.blocks.map((block, i) => (i === index ? fn(block) : block)),
    };
  });
  return found ? { ...doc, sections } : doc;
};

/**
 * Resolve-for-display/CSS: desktop = the base; tablet/mobile = base merged with
 * ONLY their OWN sparse `responsive[bp]` record (both inherit DESKTOP — mobile
 * NEVER merges the tablet record). The nav base is the FIRST `nav-items` block's
 * props (mirrors `collectMenuAppearance`'s `.find()` binding in
 * `menuDocumentCss.ts`).
 */
/** Deep-merge a levelStyles delta over the base (per level, per field). Scalars
 *  stay shallow (the caller spreads them); ONLY levelStyles needs the deep merge
 *  so a device override never wholesale-REPLACES a base level. */
const mergeNavLevelStyles = (
  base: NavLevelStyles | undefined,
  delta: NavLevelStyles | undefined
): NavLevelStyles | undefined => {
  if (!base && !delta) return undefined;
  const out: NavLevelStyles = {};
  for (const level of NAV_LEVEL_STYLE_LEVELS) {
    const merged = { ...(base?.[level] ?? {}), ...(delta?.[level] ?? {}) };
    if (Object.keys(merged).length > 0) out[level] = merged;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

export function resolveMenuSectionAppearanceForDevice(
  section: MenuSectionV2,
  device: MenuDeviceKind
): { layout: MenuBarLayout; navProps: NavItemsProps } {
  const navBlock = section.blocks.find((block) => block.type === "nav-items");
  const baseNavProps: NavItemsProps = navBlock?.type === "nav-items" ? navBlock.props : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) {
    // desktop: base unchanged (includes levelStyles verbatim).
    return { layout: { ...section.layout }, navProps: { ...baseNavProps } };
  }
  const override = section.responsive?.[bp]; // ONLY the device's own record
  // Scalars keep the existing shallow per-key merge; levelStyles is deep-merged
  // per level per field; navChrome shallow-merges base⊕override (like the scalars)
  // so an override field wins while unset fields inherit desktop.
  const { levelStyles: baseLevels, navChrome: baseChrome, ...baseScalars } = baseNavProps;
  const {
    levelStyles: overrideLevels,
    navChrome: overrideChrome,
    ...overrideScalars
  } = override?.navProps ?? {};
  const navProps: NavItemsProps = { ...baseScalars, ...overrideScalars };
  const mergedLevels = mergeNavLevelStyles(baseLevels, overrideLevels);
  if (mergedLevels) navProps.levelStyles = mergedLevels; // omit when empty
  const mergedChrome = { ...(baseChrome ?? {}), ...(overrideChrome ?? {}) };
  if (Object.keys(mergedChrome).length > 0) navProps.navChrome = mergedChrome; // omit when empty
  return {
    layout: { ...section.layout, ...(override?.layout ?? {}) }, // inherits desktop base
    navProps,
  };
}

/** Badge/Reset detection — reads the RAW override (undefined = inherited), never the merge. */
export function readMenuSectionOverrideValue(
  section: MenuSectionV2,
  breakpoint: MenuResponsiveBreakpoint,
  group: MenuSectionOverrideGroup,
  // TASK-520-01-L01: widened additively to the extra bar keys (type-only; the
  // runtime already reads/writes by property name) so 520-03 stays cast-free.
  key: keyof MenuAppearance | keyof MenuBarLayout
): unknown {
  const record = section.responsive?.[breakpoint]?.[group];
  return record && Object.prototype.hasOwnProperty.call(record, key)
    ? (record as Record<string, unknown>)[key]
    : undefined;
}

/**
 * Device-forked writer. desktop ⇒ base (group "layout" ⇒ `section.layout`;
 * group "navProps" ⇒ the FIRST nav-items block's props ONLY — NORMATIVE: matches
 * the readers above and `collectMenuAppearance`, and a section-level
 * `responsive[bp].navProps` record can only represent ONE nav-items block;
 * additional nav-items blocks are left untouched). tablet/mobile ⇒ their OWN
 * lazily-created SPARSE `responsive[bp][group]` record (a tablet patch NEVER
 * touches an existing mobile record and vice versa). `patch` values MUST be
 * valid `MenuAppearance` values OR `undefined`: an `undefined` patch value means
 * DELETE-KEY-FROM-TARGET (base-key delete on desktop; override leaf delete +
 * prune chain on tablet/mobile) — never an own `undefined` key, which would
 * break legacy byte-identity and `readMenuSectionOverrideValue`'s hasOwnProperty
 * detection. The write normalizer re-validates on save. NO auto-remove-on-
 * equality — an override exists until cleared.
 */
export function patchMenuSectionForDevice(
  doc: MenuDocumentV2,
  sectionId: string,
  device: MenuDeviceKind,
  group: MenuSectionOverrideGroup,
  patch: MenuBarLayout | NavItemsProps
): MenuDocumentV2 {
  const applyPatch = <T extends Record<string, unknown>>(target: T): T => {
    const next: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined)
        delete next[key]; // delete-on-undefined — never an own undefined key
      else next[key] = value;
    }
    return next as T;
  };
  return mapMenuSection(doc, sectionId, (section) => {
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      if (group === "layout") {
        return {
          ...section,
          layout: applyPatch(section.layout as Record<string, unknown>) as MenuBarLayout,
        };
      }
      const navIndex = section.blocks.findIndex((block) => block.type === "nav-items");
      if (navIndex === -1) return section; // no nav-items block ⇒ identity
      return {
        ...section,
        blocks: section.blocks.map((block, i) =>
          i === navIndex && block.type === "nav-items"
            ? {
                ...block,
                props: applyPatch(block.props as Record<string, unknown>) as NavItemsProps,
              }
            : block
        ),
      };
    }
    const record = section.responsive?.[bp] ?? {};
    const nextGroup = applyPatch((record[group] ?? {}) as Record<string, unknown>);
    const { [group]: _g, ...restRecord } = record;
    const nextRecord = (
      Object.keys(nextGroup).length > 0 ? { ...restRecord, [group]: nextGroup } : restRecord
    ) as MenuSectionOverride;
    const { [bp]: _b, ...restResponsive } = section.responsive ?? {};
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0 ? { ...restResponsive, [bp]: nextRecord } : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    // Prune chain to the byte-identical legacy shape, same as clearMenuSectionOverride.
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/**
 * Explicit Reset: delete ONE override key, prune empty group ⇒ empty
 * breakpoint ⇒ empty `responsive` (port of `clearResponsiveOverride`,
 * `pageDocumentV2.ts`). Missing override ⇒ identity.
 */
export function clearMenuSectionOverride(
  doc: MenuDocumentV2,
  sectionId: string,
  breakpoint: MenuResponsiveBreakpoint,
  group: MenuSectionOverrideGroup,
  // TASK-520-01-L01: widened additively to the extra bar keys (type-only).
  key: keyof MenuAppearance | keyof MenuBarLayout
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const record = section.responsive?.[breakpoint]?.[group];
    if (!record || !Object.prototype.hasOwnProperty.call(record, key)) return section;
    const { [key]: _removed, ...restGroup } = record as Record<string, unknown>;
    const { [group]: _g, ...restOverride } = section.responsive![breakpoint]!;
    const override = (
      Object.keys(restGroup).length > 0 ? { ...restOverride, [group]: restGroup } : restOverride
    ) as MenuSectionOverride;
    const { [breakpoint]: _b, ...restResponsive } = section.responsive!;
    const responsive: MenuSectionResponsive =
      Object.keys(override).length > 0
        ? { ...restResponsive, [breakpoint]: override }
        : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    // Prune to the byte-identical legacy shape (no empty responsive member).
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/** desktop = flat leaf visibility (`visibility?.visible ?? true`; native blocks ⇒ true); tablet/mobile = their OWN override ?? DESKTOP value (mobile never reads tablet). */
export function resolveMenuBlockVisibleForDevice(
  block: MenuBlockV2,
  device: MenuDeviceKind
): boolean {
  const desktopVisible = "visibility" in block ? (block.visibility?.visible ?? true) : true;
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return desktopVisible;
  return block.responsive?.[bp]?.visibility?.visible ?? desktopVisible;
}

/**
 * Input to the render-if-visible-anywhere gate (501-02/502-02): a block with a
 * visibility override is DOM-rendered whenever visible on AT LEAST ONE device
 * and CSS-gated per branch; visible-on-neither blocks stay render-skipped.
 * Zero-arg = ANY breakpoint (back-compat: the CSS visibility plan + the
 * hand-off-to-CSS gate render-if-visible-anywhere, now seeing tablet records
 * too); with a `breakpoint` arg = that record only (502-04 badge/Reset).
 */
export const hasMenuBlockVisibilityOverride = (
  block: MenuBlockV2,
  breakpoint?: MenuResponsiveBreakpoint
): boolean =>
  breakpoint !== undefined
    ? block.responsive?.[breakpoint]?.visibility !== undefined
    : MENU_RESPONSIVE_BREAKPOINT_KEYS.some(
        (bp) => block.responsive?.[bp]?.visibility !== undefined
      );

/**
 * tablet/mobile ⇒ their OWN `responsive[bp].visibility` record (any block type,
 * incl. menu-native); desktop ⇒ FLAT `visibility`, LEAF blocks only (native
 * blocks carry no flat visibility by contract — documented no-op for them on
 * desktop). Mirrors `setBlockVisibleForBreakpoint` (`pageEditorMutationActions.ts`).
 */
export function setMenuBlockVisibleForDevice(
  doc: MenuDocumentV2,
  blockId: string,
  device: MenuDeviceKind,
  visible: boolean
): MenuDocumentV2 {
  return mapMenuBlock(doc, blockId, (block) => {
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      // Direct discriminant comparisons (not the type-guard helper) so the
      // union narrows to the leaf members that carry flat `visibility`.
      if (block.type === "cta-button" || block.type === "divider" || block.type === "spacer") {
        return { ...block, visibility: { visible } };
      }
      return block; // menu-native on desktop ⇒ documented no-op
    }
    return {
      ...block,
      responsive: {
        ...(block.responsive ?? {}),
        [bp]: { ...(block.responsive?.[bp] ?? {}), visibility: { visible } },
      },
    };
  });
}

/**
 * Explicit reset; prunes empty `mobile` ⇒ empty `responsive` ⇒ deletes the
 * member (port of `clearBlockResponsiveOverride`, `pageDocumentV2.ts`).
 * Missing override ⇒ identity.
 */
export function clearMenuBlockVisibilityOverride(
  doc: MenuDocumentV2,
  blockId: string,
  breakpoint: MenuResponsiveBreakpoint
): MenuDocumentV2 {
  return mapMenuBlock(doc, blockId, (block) => {
    const record = block.responsive?.[breakpoint];
    if (!record || record.visibility === undefined) return block;
    const { visibility: _removed, ...restOverride } = record;
    const { [breakpoint]: _b, ...restResponsive } = block.responsive!;
    const responsive =
      Object.keys(restOverride).length > 0
        ? { ...restResponsive, [breakpoint]: restOverride }
        : restResponsive;
    const next: MenuBlockV2 = { ...block, responsive };
    // Prune to the byte-identical legacy shape (no empty responsive member).
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

// --- TASK-504-01 per-device brand style helpers -----------------------------
// desktop ⇒ brand.props.style; tablet/mobile ⇒ their OWN sparse
// responsive[bp].style delta over the DESKTOP base (mobile never reads tablet).

/** Resolve the brand style for a device (desktop = base; tablet/mobile = base ⊕
 *  own delta, field-level cascade). Returns {} when unstyled. */
export function resolveMenuBrandStyleForDevice(
  block: MenuBlockV2,
  device: MenuDeviceKind
): BrandStyle {
  const base = block.type === "brand" ? (block.props.style ?? {}) : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return { ...base };
  return { ...base, ...(block.responsive?.[bp]?.style ?? {}) };
}

/** Badge/Reset RAW read — undefined = inherited (hasOwnProperty, never the merge). */
export function readMenuBrandStyleOverrideValue(
  block: MenuBlockV2,
  breakpoint: MenuResponsiveBreakpoint,
  key: keyof BrandStyle
): unknown {
  const record = block.responsive?.[breakpoint]?.style;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

export const hasMenuBrandStyleOverride = (
  block: MenuBlockV2,
  breakpoint?: MenuResponsiveBreakpoint
): boolean =>
  breakpoint !== undefined
    ? block.responsive?.[breakpoint]?.style !== undefined
    : MENU_RESPONSIVE_BREAKPOINT_KEYS.some((bp) => block.responsive?.[bp]?.style !== undefined);

/**
 * Device-forked writer. desktop ⇒ brand.props.style; tablet/mobile ⇒ own sparse
 * responsive[bp].style. An `undefined` patch value ⇒ DELETE that key (never an
 * own undefined key). Non-brand block ⇒ identity. Full prune chain: empty style
 * ⇒ drop style; empty override ⇒ drop breakpoint; empty responsive ⇒ delete
 * member (byte-identical legacy shape).
 */
export function patchMenuBrandStyleForDevice(
  doc: MenuDocumentV2,
  blockId: string,
  device: MenuDeviceKind,
  patch: Partial<BrandStyle>
): MenuDocumentV2 {
  const applyPatch = (target: BrandStyle): BrandStyle => {
    const next: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete next[key];
      else next[key] = value;
    }
    return next as BrandStyle;
  };
  return mapMenuBlock(doc, blockId, (block) => {
    if (block.type !== "brand") return block; // non-brand ⇒ identity
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      const nextStyle = applyPatch(block.props.style ?? {});
      const nextProps: BrandProps = { ...block.props };
      if (Object.keys(nextStyle).length > 0) nextProps.style = nextStyle;
      else delete nextProps.style;
      return { ...block, props: nextProps };
    }
    const record = block.responsive?.[bp] ?? {};
    const nextStyle = applyPatch(record.style ?? {});
    const { style: _s, ...restRecord } = record;
    const nextRecord = (
      Object.keys(nextStyle).length > 0 ? { ...restRecord, style: nextStyle } : restRecord
    ) as MenuBlockOverride;
    const { [bp]: _b, ...restResponsive } = block.responsive ?? {};
    const responsive: MenuBlockResponsive =
      Object.keys(nextRecord).length > 0 ? { ...restResponsive, [bp]: nextRecord } : restResponsive;
    const next: MenuBlockV2 = { ...block, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/** Explicit Reset: delete ONE brand-style key, prune style ⇒ override ⇒ responsive. */
export function clearMenuBrandStyleOverride(
  doc: MenuDocumentV2,
  blockId: string,
  breakpoint: MenuResponsiveBreakpoint,
  key: keyof BrandStyle
): MenuDocumentV2 {
  return mapMenuBlock(doc, blockId, (block) => {
    const record = block.responsive?.[breakpoint];
    const style = record?.style;
    if (!style || !Object.prototype.hasOwnProperty.call(style, key)) return block;
    const { [key]: _removed, ...restStyle } = style;
    const { style: _s, ...restOverride } = record;
    const nextRecord = (
      Object.keys(restStyle).length > 0 ? { ...restOverride, style: restStyle } : restOverride
    ) as MenuBlockOverride;
    const { [breakpoint]: _b, ...restResponsive } = block.responsive!;
    const responsive: MenuBlockResponsive =
      Object.keys(nextRecord).length > 0
        ? { ...restResponsive, [breakpoint]: nextRecord }
        : restResponsive;
    const next: MenuBlockV2 = { ...block, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

// --- TASK-504-01 per-device nav-LEVEL style helpers (levels 1/2 only) --------
// Level 0 reuses the EXISTING patchMenuSectionForDevice / clearMenuSectionOverride
// / readMenuSectionOverrideValue on the scalar navProps group (writing the
// linkPaddingX/linkPaddingY/linkRadius/itemGap BASE scalars, NOT NavLevelStyle
// keys — see §2a). desktop ⇒ the FIRST nav-items block props.levelStyles[level];
// tablet/mobile ⇒ section responsive[bp].navProps.levelStyles[level].

/** Single-level resolver 504-04's per-level control display consumes (the
 *  level-scoped analogue of resolveMenuSectionAppearanceForDevice). Returns {}
 *  when the level is unstyled; mobile never reads tablet. */
export function resolveMenuNavLevelStyle(
  section: MenuSectionV2,
  device: MenuDeviceKind,
  level: NavLevelStyleLevel
): NavLevelStyle {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const base = navBlock?.type === "nav-items" ? (navBlock.props.levelStyles?.[level] ?? {}) : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return { ...base };
  return { ...base, ...(section.responsive?.[bp]?.navProps?.levelStyles?.[level] ?? {}) };
}

/** RAW read for a level field's override (badge/Reset) — hasOwnProperty. */
export function readMenuNavLevelStyleOverrideValue(
  section: MenuSectionV2,
  breakpoint: MenuResponsiveBreakpoint,
  level: NavLevelStyleLevel,
  key: keyof NavLevelStyle
): unknown {
  const record = section.responsive?.[breakpoint]?.navProps?.levelStyles?.[level];
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

const applyNavLevelPatch = (
  target: NavLevelStyle,
  patch: Partial<NavLevelStyle>
): NavLevelStyle => {
  const next: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return next as NavLevelStyle;
};

/** Set a levelStyles record on a navProps group, pruning the empty level. */
const withNavLevel = (
  navProps: NavItemsProps,
  level: NavLevelStyleLevel,
  nextLevel: NavLevelStyle
): NavItemsProps => {
  const { levelStyles = {}, ...rest } = navProps;
  const { [level]: _l, ...restLevels } = levelStyles;
  const nextLevelStyles: NavLevelStyles =
    Object.keys(nextLevel).length > 0 ? { ...restLevels, [level]: nextLevel } : restLevels;
  const next: NavItemsProps = { ...rest };
  if (Object.keys(nextLevelStyles).length > 0) next.levelStyles = nextLevelStyles;
  return next;
};

/**
 * Device-forked writer for ONE level's fields. desktop ⇒ the FIRST nav-items
 * block props.levelStyles[level] (matches the .find() binding used by resolve +
 * collectMenuAppearance); tablet/mobile ⇒ section responsive[bp].navProps
 * .levelStyles[level]. delete-on-undefined + DEEP prune: field ⇒ level ⇒
 * levelStyles ⇒ navProps ⇒ override ⇒ responsive.
 */
export function patchMenuNavLevelStyleForDevice(
  doc: MenuDocumentV2,
  sectionId: string,
  device: MenuDeviceKind,
  level: NavLevelStyleLevel,
  patch: Partial<NavLevelStyle>
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      const navIndex = section.blocks.findIndex((block) => block.type === "nav-items");
      if (navIndex === -1) return section; // no nav-items block ⇒ identity
      return {
        ...section,
        blocks: section.blocks.map((block, i) => {
          if (i !== navIndex || block.type !== "nav-items") return block;
          const nextLevel = applyNavLevelPatch(block.props.levelStyles?.[level] ?? {}, patch);
          return { ...block, props: withNavLevel(block.props, level, nextLevel) };
        }),
      };
    }
    const record = section.responsive?.[bp] ?? {};
    const navProps = record.navProps ?? {};
    const nextLevel = applyNavLevelPatch(navProps.levelStyles?.[level] ?? {}, patch);
    const nextNavProps = withNavLevel(navProps, level, nextLevel);
    const { navProps: _n, ...restRecord } = record;
    const nextRecord = (
      Object.keys(nextNavProps).length > 0 ? { ...restRecord, navProps: nextNavProps } : restRecord
    ) as MenuSectionOverride;
    const { [bp]: _b, ...restResponsive } = section.responsive ?? {};
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0 ? { ...restResponsive, [bp]: nextRecord } : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/** Explicit Reset for one level field; full DEEP prune chain to legacy shape. */
export function clearMenuNavLevelStyleOverride(
  doc: MenuDocumentV2,
  sectionId: string,
  breakpoint: MenuResponsiveBreakpoint,
  level: NavLevelStyleLevel,
  key: keyof NavLevelStyle
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const record = section.responsive?.[breakpoint];
    const levelStyle = record?.navProps?.levelStyles?.[level];
    if (!levelStyle || !Object.prototype.hasOwnProperty.call(levelStyle, key)) return section;
    const { [key]: _removed, ...restLevel } = levelStyle;
    const nextNavProps = withNavLevel(record!.navProps ?? {}, level, restLevel as NavLevelStyle);
    const { navProps: _n, ...restOverride } = record!;
    const nextRecord = (
      Object.keys(nextNavProps).length > 0
        ? { ...restOverride, navProps: nextNavProps }
        : restOverride
    ) as MenuSectionOverride;
    const { [breakpoint]: _b, ...restResponsive } = section.responsive!;
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0
        ? { ...restResponsive, [breakpoint]: nextRecord }
        : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

// --- TASK-506 per-device level-0 navChrome helpers (Option B) ----------------
// desktop ⇒ FIRST nav-items block props.navChrome; tablet/mobile ⇒ section
// responsive[bp].navProps.navChrome (own sparse delta over the DESKTOP base;
// mobile never reads tablet). Mirrors the levelStyles family exactly.

/** Set/delete navChrome on a navProps group, pruning the empty member (mirror
 *  withNavLevel). */
const withNavChrome = (navProps: NavItemsProps, nextChrome: NavChromeStyle): NavItemsProps => {
  const { navChrome: _c, ...rest } = navProps;
  const next: NavItemsProps = { ...rest };
  if (Object.keys(nextChrome).length > 0) next.navChrome = nextChrome;
  return next;
};

const applyNavChromePatch = (
  target: NavChromeStyle,
  patch: Partial<NavChromeStyle>
): NavChromeStyle => {
  const next: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined)
      delete next[key]; // delete-on-undefined
    else next[key] = value;
  }
  return next as NavChromeStyle;
};

/** Single resolver 506-04's level-0 control display consumes. Returns {} when
 *  unstyled; mobile never reads tablet. */
export function resolveMenuNavChrome(
  section: MenuSectionV2,
  device: MenuDeviceKind
): NavChromeStyle {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const base = navBlock?.type === "nav-items" ? (navBlock.props.navChrome ?? {}) : {};
  const bp = menuDeviceBreakpoint(device);
  if (bp === null) return { ...base };
  return { ...base, ...(section.responsive?.[bp]?.navProps?.navChrome ?? {}) };
}

/** RAW read for a navChrome field's device override (badge/Reset) — hasOwnProperty. */
export function readMenuNavChromeOverrideValue(
  section: MenuSectionV2,
  breakpoint: MenuResponsiveBreakpoint,
  key: keyof NavChromeStyle
): unknown {
  const record = section.responsive?.[breakpoint]?.navProps?.navChrome;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/** RAW read for a navChrome field's BASE value (F1 hasBaseValue predicate). */
export function readMenuNavChromeBaseValue(
  section: MenuSectionV2,
  key: keyof NavChromeStyle
): unknown {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const record = navBlock?.type === "nav-items" ? navBlock.props.navChrome : undefined;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/**
 * Device-forked writer for level-0 navChrome. desktop ⇒ the FIRST nav-items
 * block props.navChrome (matches the .find() binding used by resolve +
 * collectMenuAppearance); tablet/mobile ⇒ section responsive[bp].navProps
 * .navChrome. delete-on-undefined + DEEP prune: field ⇒ navChrome ⇒ navProps ⇒
 * override ⇒ responsive.
 */
export function patchMenuNavChromeForDevice(
  doc: MenuDocumentV2,
  sectionId: string,
  device: MenuDeviceKind,
  patch: Partial<NavChromeStyle>
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const bp = menuDeviceBreakpoint(device);
    if (bp === null) {
      const navIndex = section.blocks.findIndex((block) => block.type === "nav-items");
      if (navIndex === -1) return section; // no nav-items block ⇒ identity
      return {
        ...section,
        blocks: section.blocks.map((block, i) => {
          if (i !== navIndex || block.type !== "nav-items") return block;
          const nextChrome = applyNavChromePatch(block.props.navChrome ?? {}, patch);
          return { ...block, props: withNavChrome(block.props, nextChrome) };
        }),
      };
    }
    const record = section.responsive?.[bp] ?? {};
    const navProps = record.navProps ?? {};
    const nextChrome = applyNavChromePatch(navProps.navChrome ?? {}, patch);
    const nextNavProps = withNavChrome(navProps, nextChrome);
    const { navProps: _n, ...restRecord } = record;
    const nextRecord = (
      Object.keys(nextNavProps).length > 0 ? { ...restRecord, navProps: nextNavProps } : restRecord
    ) as MenuSectionOverride;
    const { [bp]: _b, ...restResponsive } = section.responsive ?? {};
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0 ? { ...restResponsive, [bp]: nextRecord } : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

/** Explicit Reset for one navChrome field on tablet/mobile; DEEP prune to legacy shape. */
export function clearMenuNavChromeOverride(
  doc: MenuDocumentV2,
  sectionId: string,
  breakpoint: MenuResponsiveBreakpoint,
  key: keyof NavChromeStyle
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const record = section.responsive?.[breakpoint];
    const chrome = record?.navProps?.navChrome;
    if (!chrome || !Object.prototype.hasOwnProperty.call(chrome, key)) return section;
    const { [key]: _removed, ...restChrome } = chrome;
    const nextNavProps = withNavChrome(record!.navProps ?? {}, restChrome as NavChromeStyle);
    const { navProps: _n, ...restOverride } = record!;
    const nextRecord = (
      Object.keys(nextNavProps).length > 0
        ? { ...restOverride, navProps: nextNavProps }
        : restOverride
    ) as MenuSectionOverride;
    const { [breakpoint]: _b, ...restResponsive } = section.responsive!;
    const responsive: MenuSectionResponsive =
      Object.keys(nextRecord).length > 0
        ? { ...restResponsive, [breakpoint]: nextRecord }
        : restResponsive;
    const next: MenuSectionV2 = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete next.responsive;
    return next;
  });
}

// --- TASK-506 F1 base-record reset (desktop-branch delete + prune wrappers) ---
// Thin named API over the existing patch*ForDevice desktop `bp===null` branches
// (which already delete-on-undefined + prune to the legacy byte-stable shape).
// No new prune logic. EXCLUDES MENU_NAV_DEVICE_DEFINING_KEYS (they carry
// resolution defaults, written to base on every device — never base-reset).

/** Clear ONE flat level-0 scalar / layout base key (byte-stable legacy shape). */
export function clearMenuSectionBase(
  doc: MenuDocumentV2,
  sectionId: string,
  group: MenuSectionOverrideGroup,
  // TASK-520-01-L01: widened additively to the extra bar keys (type-only).
  key: keyof MenuAppearance | keyof MenuBarLayout
): MenuDocumentV2 {
  return patchMenuSectionForDevice(doc, sectionId, "desktop", group, {
    [key]: undefined,
  } as unknown as NavItemsProps);
}

/** Clear ONE per-level (1/2) base field. */
export function clearMenuNavLevelStyleBase(
  doc: MenuDocumentV2,
  sectionId: string,
  level: NavLevelStyleLevel,
  key: keyof NavLevelStyle
): MenuDocumentV2 {
  return patchMenuNavLevelStyleForDevice(doc, sectionId, "desktop", level, { [key]: undefined });
}

/** Clear ONE level-0 navChrome base field (prunes props.navChrome → props). */
export function clearMenuNavChromeBase(
  doc: MenuDocumentV2,
  sectionId: string,
  key: keyof NavChromeStyle
): MenuDocumentV2 {
  return patchMenuNavChromeForDevice(doc, sectionId, "desktop", { [key]: undefined });
}

/** Clear ONE brand-style base field (prunes props.style → props). */
export function clearMenuBrandStyleBase(
  doc: MenuDocumentV2,
  blockId: string,
  key: keyof BrandStyle
): MenuDocumentV2 {
  return patchMenuBrandStyleForDevice(doc, blockId, "desktop", { [key]: undefined });
}

/** RAW base read for a per-level (1/2) field (F1 hasBaseValue predicate). */
export function readMenuNavLevelStyleBaseValue(
  section: MenuSectionV2,
  level: NavLevelStyleLevel,
  key: keyof NavLevelStyle
): unknown {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const record = navBlock?.type === "nav-items" ? navBlock.props.levelStyles?.[level] : undefined;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

/** RAW base read for a flat level-0 scalar / layout field (F1 hasBaseValue predicate). */
export function readMenuSectionBaseValue(
  section: MenuSectionV2,
  group: MenuSectionOverrideGroup,
  // TASK-520-01-L01: widened additively to the extra bar keys (type-only).
  key: keyof MenuAppearance | keyof MenuBarLayout
): unknown {
  if (group === "layout") {
    return Object.prototype.hasOwnProperty.call(section.layout, key)
      ? (section.layout as Record<string, unknown>)[key]
      : undefined;
  }
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const record = navBlock?.type === "nav-items" ? navBlock.props : undefined;
  return record && Object.prototype.hasOwnProperty.call(record, key)
    ? (record as Record<string, unknown>)[key]
    : undefined;
}

/** RAW base read for a brand-style field (F1 hasBaseValue predicate). */
export function readMenuBrandStyleBaseValue(block: MenuBlockV2, key: keyof BrandStyle): unknown {
  const record = block.type === "brand" ? block.props.style : undefined;
  return record && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
}

// --- TASK-506 F2 resolved-default provider (single model source of truth) -----

export type MenuControlDefault = {
  value: number | string | boolean | undefined;
  sourceLabel: string;
};

/** level param vocabulary: 0 = level-0 nav scalar/navChrome; 1|2 = NavLevelStyle;
 *  "base" = brand OR layout scalar (a DISTINCT source domain, never a level-0 nav key). */
export type MenuControlDefaultLevel = 0 | 1 | 2 | "base";

// Gated present-only numerics: unset ⇒ NO element exists ⇒ NO meaningful resolved
// number; range.min is FORBIDDEN here (the exact misleading 0/80 bug F2 kills).
const MENU_GATED_PRESENT_ONLY_OFF_KEYS = [
  "itemDividerWidth",
  "indicatorThickness",
  "transitionMs",
  "hoverLift",
] as const;
// TASK-508-01 R1(a): containerPaddingX/Y REMOVED — the sublist container has a REAL
// base-sheet default (6px), surfaced via the explicit branches in
// resolveNavKeyThemeDefault. The level-0 pill (navPillRadius/PaddingX/PaddingY) genuinely
// has NO base-sheet default when unset (no element painted) ⇒ stays gated "Not applied".
const MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS = [
  "navPillRadius",
  "navPillPaddingX",
  "navPillPaddingY",
] as const;

// Level-style field name ⇒ level-0 nav-base SCALAR name (the analogous cascade key).
const NAV_LEVEL_TO_BASE_SCALAR: Record<string, keyof MenuAppearance> = {
  paddingX: "linkPaddingX",
  paddingY: "linkPaddingY",
  radius: "linkRadius",
  gap: "itemGap",
};

const isMenuLayoutKey = (key: string): boolean =>
  (MENU_BAR_LAYOUT_KEYS as readonly string[]).includes(key);

const humanizeControlValue = (value: unknown): string =>
  typeof value === "boolean"
    ? value
      ? "On"
      : "Off"
    : typeof value === "string"
      ? value.charAt(0).toUpperCase() + value.slice(1)
      : String(value);

/** Value + unit for the "Inherits level N (…)" / device labels. */
const formatControlValue = (key: string, value: unknown): string => {
  if (typeof value === "number") return `${value}${key === "transitionMs" ? "ms" : "px"}`;
  if (typeof value === "boolean") return value ? "On" : "Off";
  return String(value);
};

/** Terminal theme / base-sheet default for a nav (level 0/1/2) key (case 3). */
const resolveNavKeyThemeDefault = (key: string): MenuControlDefault => {
  if (key === "fontSize")
    return {
      value: NAV_FONT_SIZE_INHERITED,
      sourceLabel: `Inherited from theme (${NAV_FONT_SIZE_INHERITED}px)`,
    };
  if (key === "paddingX" || key === "linkPaddingX")
    return {
      value: MENU_SHELL_DEFAULT_LINK_PX,
      sourceLabel: `Default ${MENU_SHELL_DEFAULT_LINK_PX}px`,
    };
  if (key === "paddingY" || key === "linkPaddingY")
    return {
      value: MENU_SHELL_DEFAULT_LINK_PY,
      sourceLabel: `Default ${MENU_SHELL_DEFAULT_LINK_PY}px`,
    };
  if (key === "radius" || key === "linkRadius")
    return {
      value: MENU_SHELL_DEFAULT_LINK_RADIUS,
      sourceLabel: `Default ${MENU_SHELL_DEFAULT_LINK_RADIUS}px`,
    };
  // TASK-508-01 R1(a): real base-sheet defaults for the dropdown CONTAINER controls
  // (siteShellCss.ts:151 `.site-nav-sublist{min-width:180px;padding:6px}`). Hint/thumb
  // only — CSS emission (levelContainerDecls, 508-02) stays present-only on the STORED value.
  if (key === "minWidth")
    return {
      value: MENU_SHELL_SUBLIST_MIN_WIDTH,
      sourceLabel: `Default ${MENU_SHELL_SUBLIST_MIN_WIDTH}px`,
    };
  if (key === "containerPaddingX" || key === "containerPaddingY")
    return {
      value: MENU_SHELL_SUBLIST_PADDING,
      sourceLabel: `Default ${MENU_SHELL_SUBLIST_PADDING}px`,
    };
  if ((MENU_GATED_PRESENT_ONLY_OFF_KEYS as readonly string[]).includes(key))
    return { value: undefined, sourceLabel: "Off" };
  if ((MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS as readonly string[]).includes(key))
    return { value: undefined, sourceLabel: "Not applied" };
  if (Object.prototype.hasOwnProperty.call(NAV_CHROME_DEFAULTS, key)) {
    const value = (NAV_CHROME_DEFAULTS as Record<string, string | boolean>)[key];
    return { value, sourceLabel: `Default (${humanizeControlValue(value)})` };
  }
  if (key === "gap" || key === "itemGap")
    return {
      value: SHELL_APPEARANCE_DEFAULTS.itemGap,
      sourceLabel: `Default ${SHELL_APPEARANCE_DEFAULTS.itemGap}px`,
    };
  // Other enums/colors with no declared default ⇒ present-only, no hint value.
  return { value: undefined, sourceLabel: "Not set" };
};

/** Terminal theme default for a "base" (brand OR layout) key (case 4). */
const resolveBaseKeyThemeDefault = (key: string): MenuControlDefault => {
  if (isMenuLayoutKey(key)) {
    const value = (SHELL_APPEARANCE_DEFAULTS as Record<string, unknown>)[key];
    if (typeof value === "number") return { value, sourceLabel: `Default ${value}px` };
    if (value === undefined || value === null) return { value: undefined, sourceLabel: "Not set" };
    return {
      value: value as string | boolean,
      sourceLabel: `Default (${humanizeControlValue(value)})`,
    };
  }
  // Brand key: KEY-based from the shell defaults where present; most brand keys
  // (color/letterSpacing/height/maxWidth) have NO theme default ⇒ present-only.
  const value = (SHELL_APPEARANCE_DEFAULTS as Record<string, unknown>)[key];
  if (value === undefined || value === null) return { value: undefined, sourceLabel: "Not set" };
  if (typeof value === "number") return { value, sourceLabel: `Inherited from theme (${value}px)` };
  return {
    value: value as string | boolean,
    sourceLabel: `Default (${humanizeControlValue(value)})`,
  };
};

/** Read the level-0 nav-base value (scalar OR navChrome) for the analogous key. */
const readNavBaseAnalogValue = (section: MenuSectionV2, key: string): unknown => {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  if (navBlock?.type !== "nav-items") return undefined;
  const props = navBlock.props;
  if ((NAV_CHROME_KEYS as readonly string[]).includes(key)) {
    const chrome = props.navChrome;
    return chrome && Object.prototype.hasOwnProperty.call(chrome, key)
      ? (chrome as Record<string, unknown>)[key]
      : undefined;
  }
  const scalarKey = NAV_LEVEL_TO_BASE_SCALAR[key] ?? key;
  return Object.prototype.hasOwnProperty.call(props, scalarKey)
    ? (props as Record<string, unknown>)[scalarKey]
    : undefined;
};

/** Desktop's OWN authored value at the given level (the base a device inherits). */
const readOwnDesktopValue = (
  section: MenuSectionV2,
  level: MenuControlDefaultLevel,
  key: string
): unknown => {
  if (level === "base") {
    // Layout is section-scoped (reachable); brand is BLOCK-scoped (NOT reachable).
    return isMenuLayoutKey(key)
      ? readMenuSectionBaseValue(section, "layout", key as keyof MenuAppearance)
      : undefined;
  }
  if (level === 0) return readNavBaseAnalogValue(section, key);
  const resolved = resolveMenuNavLevelStyle(section, "desktop", level);
  return (resolved as Record<string, unknown>)[key];
};

/**
 * Returns the EFFECTIVE value + human source label for an UNSET control so the
 * editor never hardcodes defaults. Section-only (4-param): 506-04 computes each
 * brand control's `isSet` at its call site (brand is block-scoped) and passes it
 * in. NEVER emits CSS / mutates the doc — pure read/derivation.
 */
export function resolveMenuControlDefault(
  section: MenuSectionV2,
  device: MenuDeviceKind,
  level: MenuControlDefaultLevel,
  key: string
): MenuControlDefault {
  const bp = menuDeviceBreakpoint(device);
  // Case 1 — tablet/mobile with the field unset on THIS device ⇒ inherit RESOLVED
  // desktop at the SAME level (device override was already ruled out — the editor
  // only calls this for an unset control).
  if (bp !== null) {
    const own = readOwnDesktopValue(section, level, key);
    if (own !== undefined)
      return { value: own as MenuControlDefault["value"], sourceLabel: "Inherited from desktop" };
    // Brand "base" desktop value is block-scoped ⇒ unreachable from `section`
    // ⇒ present-only, NO misleading "Inherited from desktop".
    if (level === "base" && !isMenuLayoutKey(key))
      return { value: undefined, sourceLabel: "Not set" };
    // Desktop unset at this level ⇒ RECURSE the desktop cascade (case 2/3/4). Reuse
    // its resolved value but keep the device-inherit label; a still-undefined
    // desktop value stays undefined (never "Inherited from desktop (undefined)").
    const walked = resolveMenuControlDefault(section, "desktop", level, key);
    return walked.value === undefined
      ? { value: undefined, sourceLabel: walked.sourceLabel }
      : { value: walked.value, sourceLabel: "Inherited from desktop" };
  }

  // Desktop.
  if (level === "base") return resolveBaseKeyThemeDefault(key); // case 4
  if (level === 0) return resolveNavKeyThemeDefault(key); // case 3

  // Case 2 — level N (1/2) unset ⇒ FULL CASCADE WALK of shallower LEVELS (the walk
  // lives here because resolveMenuNavLevelStyle does NOT self-fall-back a level).
  for (let l = level - 1; l >= 1; l -= 1) {
    const resolved = resolveMenuNavLevelStyle(section, "desktop", l as NavLevelStyleLevel);
    const value = (resolved as Record<string, unknown>)[key];
    if (value !== undefined)
      return {
        value: value as MenuControlDefault["value"],
        sourceLabel: `Inherits level ${l} (${formatControlValue(key, value)})`,
      };
  }
  // All shallower NavLevelStyle levels unset ⇒ fall through to the LEVEL-0
  // nav-base/navChrome value (the real next cascade stop).
  const navBaseValue = readNavBaseAnalogValue(section, key);
  if (navBaseValue !== undefined)
    return {
      value: navBaseValue as MenuControlDefault["value"],
      sourceLabel: `Inherits level 0 (${formatControlValue(key, navBaseValue)})`,
    };
  // Level 0 also unset ⇒ theme / base-sheet default.
  return resolveNavKeyThemeDefault(key);
}

// --- legacy adapter ---------------------------------------------------------

/**
 * Seeds a document from the existing appearance+extras WITHOUT writing (used on
 * first Design open). FRESH-MENU CONTRACT: returns `null` when there is NOTHING
 * legacy to seed (appearance === null AND no extras) so the TASK-499-03 seed
 * chain falls through to `createDefaultMenuDocumentV2()` (which DOES include a
 * brand(text) block); a non-null adapter would make that fall-through dead code
 * and seed a brand-less fresh Design.
 */
export function buildMenuDocumentV2FromLegacy(
  appearance: MenuAppearance | null,
  extras: PageBlockV2[]
): MenuDocumentV2 | null {
  if (appearance === null && extras.length === 0) return null;

  const source = appearance ?? {};
  const layout = pickAppearance(source, MENU_BAR_LAYOUT_KEYS) as MenuBarLayout;
  const navProps = pickAppearance(source, NAV_ITEMS_PROP_KEYS) as NavItemsProps;

  const blocks: MenuBlockV2[] = [
    { id: createMenuDocumentId("blk"), type: "nav-items", props: navProps },
  ];
  for (const block of extras) {
    if (block.type === "button") {
      blocks.push({
        id: block.id,
        type: "cta-button",
        props: block.props,
        style: block.style,
        visibility: block.visibility,
      });
    } else if (block.type === "image") {
      blocks.push({
        id: block.id,
        type: "brand",
        props: { mode: "image", href: "/", image: block.props },
      });
    }
  }

  return {
    schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: [
      {
        id: createMenuDocumentId("sec"),
        type: "menu-bar",
        name: sectionTypeName["menu-bar"],
        layout,
        blocks,
      },
    ],
  };
}

// --- published / stored resolvers -------------------------------------------

/**
 * Public render resolver for the published menu document snapshot. Mirrors
 * `resolvePublishedMenuAppearance`: the `published` snapshot first; legacy
 * envelopes without `published` fall back to the top-level `document`;
 * absent/empty ⇒ `null` (legacy appearance+extras treatment).
 */
export function resolvePublishedMenuDocument(settings: unknown): MenuDocumentV2 | null {
  if (!isPlainObject(settings)) return null;
  const published = settings.published;
  const raw = isPlainObject(published) ? published.document : settings.document;
  if (raw === undefined) return null;
  const doc = normalizeStoredMenuDocumentV2ForRead(raw);
  return isEmptyMenuDocument(doc) ? null : doc;
}

/**
 * Draft resolver for the editor: reads the top-level `document` draft only
 * (never the published snapshot), fail-closed; absent/empty ⇒ `null`.
 */
export function resolveStoredMenuDocument(settings: unknown): MenuDocumentV2 | null {
  if (!isPlainObject(settings)) return null;
  const raw = settings.document;
  if (raw === undefined) return null;
  const doc = normalizeStoredMenuDocumentV2ForRead(raw);
  return isEmptyMenuDocument(doc) ? null : doc;
}

export { EMPTY_MENU_DOCUMENT };
