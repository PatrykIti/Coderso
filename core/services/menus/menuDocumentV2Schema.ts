/**
 * menuDocumentV2Schema — the menu Design tab's composable document schema
 * contract (TASK-499-02): type declarations, enum/const arrays, key sets,
 * number ranges, defaults, and the machine-readable `MenuDocumentError`.
 * Split from the legacy menuDocumentV2 monolith by TASK-542-01-L01; the
 * facade re-exports every public symbol. Bun-free, import-side-effect free
 * (Vitest lane).
 */
import type {
  MenuAppearance,
  MenuAppearanceFontWeight,
  MenuAppearanceShadow,
  MenuAppearanceTextTransform,
} from "./normalizeMenuAppearance";
import type { PageBlockStyleV2, PageBlockVisibilityV2 } from "../pages/pageDocumentV2";
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

export const MENU_NATIVE_BLOCK_TYPES = [
  "nav-items",
  "brand",
  "search",
  "account",
  "language",
] as const;
export const MENU_LEAF_BLOCK_TYPES = ["cta-button", "divider", "spacer"] as const;

/** Menu-bar layout = the `MenuAppearance` surface/frame subset. */
export const MENU_BAR_LAYOUT_KEYS = [
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
export const MENU_BAR_EXTRA_KEYS = [
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
export const NAV_ITEMS_PROP_KEYS = [
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
export const MENU_SECTION_OVERRIDE_GROUP_KEYS = ["layout", "navProps"] as const;
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
