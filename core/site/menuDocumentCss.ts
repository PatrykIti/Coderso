import {
  hasMenuBlockVisibilityOverride,
  resolveMenuBlockVisibleForDevice,
  resolveMenuBrandStyleForDevice,
  resolveMenuNavChrome,
  resolveMenuSectionAppearanceForDevice,
  type BrandStyle,
  type MenuBarLayout,
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
import { escapeAuthoringCssString } from "../services/pages/pageAuthoringSanitizers";
import type { PageBreakpoint } from "../services/pages/pageDocumentV2";
import { pageResponsiveMediaBounds } from "../services/pages/pageResponsiveCss";
import { SHELL_APPEARANCE_DEFAULTS } from "./siteShellCss";

/**
 * Scoped menu-document stylesheet builder (TASK-499-04, per-device TASK-501-02).
 *
 * A published `menuDocumentV2` reuses the SAME `.site-header` / `.site-header-inner`
 * / `.site-nav-*` class names as `SiteHeaderNav`, so it hard-depends on the base
 * layout sheet emitted once from `buildSiteShellCss(...)` (the head-CSS gate in
 * `renderPublicPage.tsx`). This module emits the document's OWN appearance rules
 * scoped under a NEW attribute (`[data-site-menu-doc="true"]`) so they can NEVER
 * collide with `buildSiteShellCss`'s default rules and so they OVERRIDE the base
 * sheet on equal specificity via later source order (the `<style>` renders inside
 * the header, after the head).
 *
 * HARD CONTRACT: `siteShellCss.ts` is NOT imported for its CSS output, NOT
 * modified, NOT re-emitted here. `buildSiteShellCss(null)` stays byte-identical
 * (`tests/unit/pages/siteShellCss.test.ts`). Only the exported defaults constant
 * (`SHELL_APPEARANCE_DEFAULTS`) is reused — a validated value table, not CSS.
 *
 * Safety: the appearance is re-sanitized through `sanitizeMenuAppearance` (base
 * AND mobile-resolved), so the emitted CSS only ever contains validated color
 * shapes, clamped numbers, and enum-mapped strings — raw stored input never
 * reaches the stylesheet. Block ids interpolated into visibility selectors go
 * through `escapeAuthoringCssString`.
 *
 * Per-device model (TASK-501): the desktop appearance is the BASE
 * (`section.layout` + nav-items props); the mobile appearance is the base
 * merged with the sparse `responsive.mobile` override (mobile inherits desktop,
 * Pages cascade). The mobile `@media` branch appends per-GROUP delta rules —
 * a rule group is emitted only when SOME field in its mobile-resolved input
 * differs from base, and a triggered group emits ALL its declarations with
 * explicit/neutral values so clearing an override reverts without leakage —
 * AFTER the mobileMode disclosure/inline rules (source order wins). Per-block
 * visibility overrides gate via doc-scoped dual
 * `data-menu-block-id`/`data-block-id` hide rules. Docs with NO overrides emit
 * byte-identical output to pre-TASK-501 (asserted in
 * `tests/unit/site/menu-document-render.test.tsx`).
 *
 * Two builders share the same scoped rules (ONE `buildMenuRuleSetsForDocument`):
 * - `buildMenuDocumentCss(doc)` — FRONT viewport-media responsive (mobile
 *   disclosure via `@media`), like `buildSiteShellCss`.
 * - `buildMenuDocumentPreviewCss(doc, device)` — ADMIN-CANVAS device-forced: the
 *   `@media` breakpoint is flattened for the selected device (the Design canvas
 *   constrains the FRAME width, so viewport queries do not apply). Consumed by
 *   the in-canvas preview (TASK-499-03).
 *
 * This module is Bun-free.
 */

export const SITE_MENU_DOC_ATTRIBUTE = "data-site-menu-doc" as const;

const mobileMaxWidth = pageResponsiveMediaBounds.mobile.maxWidth;
const desktopNavMinWidth = pageResponsiveMediaBounds.tablet.minWidth;

const MENU_ALIGNMENT_CSS: Record<MenuAppearanceAlignment, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  "space-between": "space-between",
};

const MENU_SHADOW_CSS: Record<Exclude<MenuAppearanceShadow, "none">, string> = {
  sm: "0 1px 2px rgba(15,23,42,.1)",
  md: "0 8px 24px rgba(15,23,42,.12)",
};

/**
 * Level-container shadow: reuses `MENU_SHADOW_CSS` verbatim; `"none"` emits an
 * explicit `box-shadow:none` so an authored no-shadow beats the base chrome
 * (`siteShellCss.ts:157` / canvas baseline) on the doc scope.
 */
const shadowCss = (s: MenuAppearanceShadow): string => (s === "none" ? "none" : MENU_SHADOW_CSS[s]);

/**
 * Base-sheet link box fallbacks (`siteShellCss.ts:144` = `padding:8px 12px;
 * border-radius:6px`) used ONLY to COMPLETE the `padding` shorthand when a
 * single axis is authored, and to supply the neutral value in the tablet/mobile
 * link-box delta. These are NOT resolution seeds — the cheap-win keys carry NO
 * `MENU_APPEARANCE_DEFAULTS`/`SHELL_APPEARANCE_DEFAULTS` entry (present-only), so
 * an unauthored padding/radius resolves to `undefined` and emits ZERO bytes.
 */
const SHELL_DEFAULT_LINK_PX = 12;
const SHELL_DEFAULT_LINK_PY = 8;
const SHELL_DEFAULT_LINK_RADIUS = 6;

/**
 * Shell defaults extended with the menu-only `orientation` field (TASK-501-01).
 * `SHELL_APPEARANCE_DEFAULTS` stays untouched — `siteShellCss.ts` never emits
 * orientation and its byte-identity guard is inviolable.
 */
const MENU_APPEARANCE_DEFAULTS = {
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

const resolveMenuAppearanceForDevice = (doc: MenuDocumentV2, device: MenuDeviceKind) => ({
  ...MENU_APPEARANCE_DEFAULTS,
  ...sanitizeMenuAppearance(collectMenuAppearanceForDevice(doc, device)),
});
// resolveMenuAppearanceForDevice(doc, "desktop") equals the pre-501 single
// resolve for every legacy doc — this IS the byte-identity invariant.

type ResolvedMenuAppearance = ReturnType<typeof resolveMenuAppearanceForDevice>;

type MenuRuleSets = {
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

const menuDocScope = `[${SITE_MENU_DOC_ATTRIBUTE}="true"]` as const;

/** Sparse typography tail shared by the base link/summary rules (pre-501 shape). */
const baseItemTypographyCss = (a: ResolvedMenuAppearance): string => {
  const itemTypography = [
    a.fontSize !== null ? `font-size:${a.fontSize}px` : null,
    a.fontWeight !== null ? `font-weight:${a.fontWeight}` : null,
    a.textTransform !== "none" ? `text-transform:${a.textTransform}` : null,
  ].filter(Boolean);
  return itemTypography.length > 0 ? `;${itemTypography.join(";")}` : "";
};

/** TOTAL typography declarations for mobile-delta rules (neutral values, no omission). */
const totalTypographyCss = (a: ResolvedMenuAppearance): string =>
  [
    `font-size:${a.fontSize !== null ? `${a.fontSize}px` : "inherit"}`,
    `font-weight:${a.fontWeight !== null ? a.fontWeight : "inherit"}`,
    `text-transform:${a.textTransform}`,
  ].join(";");

const hoverSelector = `${menuDocScope} .site-nav-link:hover,${menuDocScope} .site-nav-link:focus-visible,${menuDocScope} .site-nav-group>summary:hover,${menuDocScope} .site-nav-group>summary:focus-visible`;
const activeSelector = `${menuDocScope} .site-nav-link:active,${menuDocScope} .site-nav-group>summary:active`;

type MenuRuleGroup = {
  /** Field keys this group depends on (mobile delta detection). */
  fields: readonly (keyof ResolvedMenuAppearance)[];
  /** Base-branch rule: the pre-501 sparse emission (null = no rule). */
  base: (a: ResolvedMenuAppearance) => string | null;
  /**
   * Device-delta rule (tablet AND mobile): TOTAL emission — every field gets
   * an explicit declaration (neutral value instead of omission) so a device
   * override can REVERT a base-emitted declaration without leakage. Reused
   * verbatim for both the tablet and mobile branches (each diffs vs DESKTOP).
   */
  delta: (a: ResolvedMenuAppearance) => string;
};

/** Fixed group order = deterministic output; base emission is byte-identical to pre-501. */
const MENU_RULE_GROUPS: readonly MenuRuleGroup[] = [
  {
    // 1. headerFrame
    fields: ["surfaceColor", "borderColor", "borderWidth", "shadow", "sticky"],
    base: (a) => {
      const headerDeclarations = [
        a.surfaceColor !== "transparent" ? `background:${a.surfaceColor}` : null,
        `border-bottom:${a.borderWidth}px solid ${a.borderColor}`,
        a.shadow !== "none" ? `box-shadow:${MENU_SHADOW_CSS[a.shadow]}` : null,
        a.sticky ? "position:sticky;top:0;z-index:50" : null,
      ]
        .filter(Boolean)
        .join(";");
      return `${menuDocScope}{${headerDeclarations}}`;
    },
    delta: (a) =>
      `${menuDocScope}{${[
        `background:${a.surfaceColor}`, // literal `transparent` is a first-class value
        `border-bottom:${a.borderWidth}px solid ${a.borderColor}`,
        `box-shadow:${a.shadow !== "none" ? MENU_SHADOW_CSS[a.shadow] : "none"}`,
        a.sticky ? "position:sticky;top:0;z-index:50" : "position:static",
      ].join(";")}}`,
  },
  {
    // 2. inner — the structural flex/max-width part stays base-only ONCE;
    // the delta re-emits ONLY the appearance declarations.
    fields: ["alignment", "paddingX", "paddingY"],
    base: (a) =>
      `${menuDocScope} .site-header-inner{margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:${MENU_ALIGNMENT_CSS[a.alignment]};gap:8px 24px;max-width:1080px;padding:${a.paddingY}px ${a.paddingX}px}`,
    delta: (a) =>
      `${menuDocScope} .site-header-inner{justify-content:${MENU_ALIGNMENT_CSS[a.alignment]};padding:${a.paddingY}px ${a.paddingX}px}`,
  },
  {
    // 3. navGap
    fields: ["itemGap"],
    base: (a) => `${menuDocScope} .site-nav-list{gap:${a.itemGap}px}`,
    delta: (a) => `${menuDocScope} .site-nav-list{gap:${a.itemGap}px}`,
  },
  {
    // 4. orientation (TASK-501-01 field) — the default "horizontal" emits
    // NOTHING in the base branch (zero byte-drift); a mobile delta emits an
    // explicit revert because the base may be vertical.
    fields: ["orientation"],
    base: (a) =>
      a.orientation === "vertical"
        ? `${menuDocScope} .site-nav-list{flex-direction:column;align-items:stretch}`
        : null,
    delta: (a) =>
      a.orientation === "vertical"
        ? `${menuDocScope} .site-nav-list{flex-direction:column;align-items:stretch}`
        : `${menuDocScope} .site-nav-list{flex-direction:row;align-items:center}`,
  },
  {
    // 5. link
    fields: ["linkColor", "fontSize", "fontWeight", "textTransform"],
    base: (a) => `${menuDocScope} .site-nav-link{color:${a.linkColor}${baseItemTypographyCss(a)}}`,
    delta: (a) => `${menuDocScope} .site-nav-link{color:${a.linkColor};${totalTypographyCss(a)}}`,
  },
  {
    // 6. hover (extended with hover-TEXT color, TASK-504-02 §4). `linkHoverTextColor`
    // carries NO resolution default (present-only) so it is `undefined` when
    // unauthored — the `!= null` gate then emits background-only (byte-identical).
    // The delta reverts an unset hover-text to the RESOLVED base `linkColor` (NOT
    // `"inherit"`) so a per-device hover-background override never silently
    // regresses a custom-`linkColor` doc's hover text (mirrors the active-group
    // precedent below).
    fields: ["linkHoverColor", "linkHoverTextColor"],
    base: (a) => {
      const decls = [
        `background:${a.linkHoverColor}`,
        a.linkHoverTextColor != null ? `color:${a.linkHoverTextColor}` : null,
      ].filter(Boolean);
      return `${hoverSelector}{${decls.join(";")}}`;
    },
    delta: (a) =>
      `${hoverSelector}{background:${a.linkHoverColor};color:${a.linkHoverTextColor != null ? a.linkHoverTextColor : a.linkColor}}`,
  },
  {
    // 7. active — a null revert matches hover (visually identical to the
    // base's no-rule behavior).
    fields: ["linkActiveColor"],
    base: (a) =>
      a.linkActiveColor !== null ? `${activeSelector}{background:${a.linkActiveColor}}` : null,
    delta: (a) =>
      `${activeSelector}{background:${a.linkActiveColor !== null ? a.linkActiveColor : a.linkHoverColor}}`,
  },
  {
    // 8. summary
    fields: ["linkColor", "fontSize", "fontWeight", "textTransform"],
    base: (a) => {
      const summaryColorCss = a.linkColor !== "inherit" ? `;color:${a.linkColor}` : "";
      return `${menuDocScope} .site-nav-group>summary{${summaryColorCss.replace(/^;/, "")}${baseItemTypographyCss(a)}}`;
    },
    delta: (a) =>
      `${menuDocScope} .site-nav-group>summary{color:${a.linkColor};${totalTypographyCss(a)}}`,
  },
  {
    // 9. link box (per-link padding + radius, TASK-504-02 §3). Separate from
    // group 5 (typography) so a device delta re-emits ONLY the box, not
    // color/font. PRESENT-ONLY base: these keys carry NO resolution default
    // (NOT in MENU_APPEARANCE_DEFAULTS/SHELL_APPEARANCE_DEFAULTS), so an
    // unauthored doc resolves them to `undefined` ⇒ base returns `null` ⇒ ZERO
    // bytes ⇒ the base-sheet `padding:8px 12px;border-radius:6px`
    // (siteShellCss.ts:144) stays the effective default and no-override docs are
    // byte-identical. `padding` is a shorthand needing BOTH axes: emit when
    // EITHER is authored, completing the other axis from the local base-sheet
    // fallback (SHELL_DEFAULT_LINK_*, NOT a resolution seed).
    fields: ["linkPaddingX", "linkPaddingY", "linkRadius"],
    base: (a) => {
      const decls = [
        a.linkPaddingX != null || a.linkPaddingY != null
          ? `padding:${a.linkPaddingY ?? SHELL_DEFAULT_LINK_PY}px ${a.linkPaddingX ?? SHELL_DEFAULT_LINK_PX}px`
          : null,
        a.linkRadius != null ? `border-radius:${a.linkRadius}px` : null,
      ].filter(Boolean);
      return decls.length ? `${menuDocScope} .site-nav-link{${decls.join(";")}}` : null;
    },
    delta: (a) =>
      `${menuDocScope} .site-nav-link{padding:${a.linkPaddingY ?? SHELL_DEFAULT_LINK_PY}px ${a.linkPaddingX ?? SHELL_DEFAULT_LINK_PX}px;border-radius:${a.linkRadius ?? SHELL_DEFAULT_LINK_RADIUS}px}`,
  },
];

/**
 * `dropdownDirection` stays desktop-branch-only and reads the BASE appearance —
 * sublists render inline on mobile, so a mobile delta is meaningless.
 */
const dropdownRule = (a: ResolvedMenuAppearance): string =>
  `${menuDocScope} .site-nav-sublist{${a.dropdownDirection === "top" ? "bottom:100%;top:auto" : "top:100%;bottom:auto"}}`;

/**
 * mobileMode disclosure/inline rules — mobile-branch-only, so they read the
 * mobile-RESOLVED appearance (no-override docs resolve to the base value ⇒
 * byte-identical). Emitted FIRST in the mobile branch; delta rules follow and
 * win on source order.
 */
const mobileModeRules = (a: ResolvedMenuAppearance): string[] =>
  a.mobileMode === "disclosure"
    ? [
        `${menuDocScope} .site-nav-disclosure{display:block}`,
        `${menuDocScope} .site-nav-list{display:none}`,
        `${menuDocScope} .site-nav-disclosure[open]~.site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`,
      ]
    : [
        // "inline" keeps the shared link list visible below the breakpoint.
        `${menuDocScope} .site-nav-disclosure{display:none}`,
        `${menuDocScope} .site-nav-list{display:flex}`,
      ];

/**
 * Block ids to hide per FRONT media branch, in document order (TASK-501-02,
 * three-way TASK-502-02). Tablet is now a real breakpoint, so a single
 * desktop/mobile split no longer places hides correctly: a block hidden on
 * desktop but VISIBLE on tablet must NOT be hidden at 640–1023px, and a
 * tablet-only hide must land inside the bounded tablet `@media`. Cascade is
 * Pages-exact — tablet AND mobile each diff against DESKTOP.
 */
type MenuVisibilityPlan = {
  /** hidden on desktop AND tablet → shared >=640 branch (pre-502 hide position). */
  hideShared: string[];
  /** hidden on desktop, VISIBLE on tablet → min-width:1024 branch. */
  hideDesktopOnly: string[];
  /** VISIBLE on desktop, hidden on tablet → bounded tablet 640–1023 branch. */
  hideTabletOnly: string[];
  /** hidden on mobile → max-width:639 branch (unchanged). */
  hideMobile: string[];
};

/**
 * Only blocks WITH a responsive visibility override participate — the flat
 * leaf `visibility` semantics stay render-time (`PageBlockFrame` skip) and
 * byte-unchanged. Blocks visible on NO device are render-skipped by the front
 * (`shouldRenderMenuBlock`, `siteShell.tsx`) ⇒ no markup, no CSS.
 *
 * Byte guard: docs with only mobile visibility overrides resolve tablet ===
 * desktop (tablet inherits the flat value), so `hideDesktopOnly`/
 * `hideTabletOnly` stay EMPTY and the shared hide occupies the exact pre-502
 * position in the >=640 branch.
 */
const collectMenuVisibilityPlan = (doc: MenuDocumentV2): MenuVisibilityPlan => {
  const plan: MenuVisibilityPlan = {
    hideShared: [],
    hideDesktopOnly: [],
    hideTabletOnly: [],
    hideMobile: [],
  };
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (!hasMenuBlockVisibilityOverride(block)) continue;
    const onDesktop = resolveMenuBlockVisibleForDevice(block, "desktop");
    const onTablet = resolveMenuBlockVisibleForDevice(block, "tablet");
    const onMobile = resolveMenuBlockVisibleForDevice(block, "mobile");
    if (!onDesktop && !onTablet && !onMobile) continue; // render-skipped ⇒ no CSS
    if (!onDesktop && !onTablet) plan.hideShared.push(block.id);
    else if (!onDesktop) plan.hideDesktopOnly.push(block.id);
    else if (!onTablet) plan.hideTabletOnly.push(block.id);
    if (!onMobile) plan.hideMobile.push(block.id);
  }
  return plan;
};

/**
 * Vertical divider tone lookup — values MIRROR `pageDividerToneBorderColor`
 * (`pageRendererV2.tsx:310-314`), pinned by a test; NOT imported (that module
 * is a React renderer; this one stays light/Bun-free).
 */
const MENU_DIVIDER_TONE_CSS = {
  neutral: "#e2e8f0",
  muted: "#cbd5e1",
  accent: "var(--coderso-section-accent,#0d9488)",
} as const;

/**
 * Per-divider-block CONTEXT rules (schema untouched), doc order. In the bar the
 * page divider leaf (`<hr>` with INLINE 4-side `borderWidth`) collapses to a
 * ~4×4px dot as a flex item; here the leaf FRAME (carrying `data-block-id`)
 * is painted as a `thickness×1.5em` self-centered vertical line and the inner
 * `<hr>` is hidden (its inline border can't be beaten by a stylesheet, but
 * `display` is not inline-styled, so a plain rule hides it — no `!important`).
 *
 * The frame rule declares NO `display:` on purpose: its (0,3,0) specificity
 * would beat the (0,2,0) visibility `hideRule` in every media branch, so a
 * `display:` here would make a divider with a responsive visibility override
 * permanently un-hideable on the front (see §4). Omitting it lets the hide
 * rule apply normally; the inner `<hr>` is hidden regardless.
 */
const collectMenuDividerRules = (doc: MenuDocumentV2): string[] => {
  const rules: string[] = [];
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (block.type !== "divider") continue;
    const esc = escapeAuthoringCssString(block.id);
    const tone =
      MENU_DIVIDER_TONE_CSS[block.props.tone as keyof typeof MENU_DIVIDER_TONE_CSS] ??
      MENU_DIVIDER_TONE_CSS.neutral;
    const t = block.props.thickness;
    // readNumber(value, 1, 1, 16) parity — clamp 1..16, default 1.
    const thickness = Math.min(
      16,
      Math.max(1, typeof t === "number" && Number.isFinite(t) ? t : 1)
    );
    rules.push(
      `${menuDocScope} .site-header-inner [data-block-id="${esc}"]{align-self:center;width:${thickness}px;height:1.5em;background:${tone}}`,
      `${menuDocScope} .site-header-inner [data-block-id="${esc}"] hr{display:none}`
    );
  }
  return rules;
};

// --- TASK-504-02 §1 brand block styling -------------------------------------
// Present-only: an absent (pruned) `style` emits ZERO bytes. Mirrors
// `collectMenuDividerRules` — loop `sections[0].blocks`, escape the block id,
// key on the `[data-menu-block-id]` stamp the brand `<a>` carries on the front
// (`siteShell.tsx:414,428`). Text decls land on the `<a>`; image decls on its
// descendant `<img>`. Values are pre-validated (token-backed colors, clamped
// numbers, mapped enums) by 504-01.

const brandStyleDecls = (style: BrandStyle): string[] =>
  [
    style.fontSize != null ? `font-size:${style.fontSize}px` : null,
    style.fontWeight != null ? `font-weight:${style.fontWeight}` : null,
    style.color != null ? `color:${style.color}` : null,
    style.textTransform != null ? `text-transform:${style.textTransform}` : null,
    style.letterSpacing != null ? `letter-spacing:${style.letterSpacing}px` : null,
  ].filter((d): d is string => d !== null);

const brandImageDecls = (style: BrandStyle): string[] =>
  [
    style.height != null ? `height:${style.height}px` : null,
    style.maxWidth != null ? `max-width:${style.maxWidth}px` : null,
  ].filter((d): d is string => d !== null);

// TASK-520 audit finding 4: brand ICON size must be responsive on the PUBLIC
// front. The SSR render (siteShell BrandRender) emits the icon <svg> width/height
// as presentation ATTRIBUTES resolved from a single `breakpoint` (desktop on the
// front), so a tablet/mobile `iconSize` override would otherwise never apply once
// the page is rendered. We mirror the `<img>` path: emit per-device `svg{}` CSS —
// a CSS rule beats width/height presentation attributes, so the media-query delta
// overrides the inline desktop baseline. Present-only: no `iconSize` ⇒ ZERO bytes.
const brandIconDecls = (style: BrandStyle): string[] =>
  style.iconSize != null ? [`width:${style.iconSize}px`, `height:${style.iconSize}px`] : [];

const collectMenuBrandRules = (doc: MenuDocumentV2): string[] => {
  const rules: string[] = [];
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (block.type !== "brand") continue;
    const style = block.props.style; // pruned-empty ⇒ undefined by 504-01
    if (!style) continue; // absent ⇒ ZERO bytes
    const esc = escapeAuthoringCssString(block.id);
    const key = `${menuDocScope} [data-menu-block-id="${esc}"]`;
    const textDecls = brandStyleDecls(style);
    if (textDecls.length) rules.push(`${key}{${textDecls.join(";")}}`);
    const imgDecls = brandImageDecls(style);
    if (imgDecls.length) rules.push(`${key} img{${imgDecls.join(";")};width:auto}`);
    const iconDecls = brandIconDecls(style);
    if (iconDecls.length) rules.push(`${key} svg{${iconDecls.join(";")}}`);
  }
  return rules;
};

// --- TASK-504-02 §2 per-nesting-level nav styling ---------------------------
// Level 0 = the EXISTING flat `${menuDocScope} .site-nav-link` group-5 base (the
// cascade ROOT reaching links at ALL depths) — NEVER re-emitted here. Only
// levels 1 and 2 have depth selectors. Selectors are DELIBERATELY
// descendant-anchored so a deeper level is ALSO matched by every shallower
// level's rule and wins its OWN present keys by specificity + source order —
// the true "inherits level N-1" cascade, pure CSS, no runtime merge.

const LEVEL_LINK_SELECTORS: Record<NavLevelStyleLevel, string> = {
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
const TOP_BAR_LINK_SELECTOR =
  `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-link` as const;

const LEVEL_CONTAINER_SELECTORS: Record<NavLevelStyleLevel, string> = {
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
const dividerCss = (s: NavLevelStyle | NavChromeStyle): string | null =>
  s.itemDividerShow === true
    ? `${s.itemDividerWidth ?? 1}px ${s.itemDividerStyle ?? "solid"} ${s.itemDividerColor ?? "currentColor"}`
    : null;

/** Level-0 top-bar divider BETWEEN items. Horizontal bar ⇒ VERTICAL rule
 *  (`border-inline-end`); `orientation:vertical` bar ⇒ HORIZONTAL rule
 *  (`border-block-end`). ≥640-only (folded into desktopShared, excluded from the
 *  mobile linkOnly branch — the <640 nav is a forced flex-column so the desktop
 *  `border-inline-end` would paint on the wrong axis). */
const level0DividerRule = (
  chrome: NavChromeStyle,
  orientation: MenuAppearanceOrientation
): string | null => {
  const v = dividerCss(chrome);
  if (v == null) return null;
  const side = orientation === "vertical" ? "border-block-end" : "border-inline-end";
  return `${menuDocScope} .site-nav-list > .site-nav-item:not(:last-child){${side}:${v}}`;
};

// Dedicated SINGLE-member per-level item selectors for the dropdown divider —
// NEVER concatenate `> li` onto the two-member LEVEL_CONTAINER_SELECTORS[1] (that
// comma group would land the divider on the wrong depth AND the container).
const LEVEL_DROPDOWN_ITEM_SELECTORS: Record<NavLevelStyleLevel, string> = {
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child)`,
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist > li:not(:last-child)`,
};
/** Dropdown (levels ≥1, vertical stack) ⇒ always HORIZONTAL rule
 *  (`border-block-end`). ≥640-only (emitted below the linkOnly guard). */
const levelDropdownDividerRule = (lvl: NavLevelStyleLevel, s: NavLevelStyle): string | null => {
  const v = dividerCss(s);
  if (v == null) return null;
  return `${LEVEL_DROPDOWN_ITEM_SELECTORS[lvl]}{border-block-end:${v}}`;
};

// ── B2 indicator + hover chrome (LINK-level, all-width) ──────────────────────
/** LINK `{}` decls folded into the level/chrome link block: the transition (for
 *  hover-lift + grow + color) + `position:relative` to anchor the ::before bar. */
const indicatorLinkDecls = (s: NavLevelStyle | NavChromeStyle): string[] => {
  const out: string[] = [];
  if (s.transitionMs != null)
    out.push(
      `transition:color ${s.transitionMs}ms,background ${s.transitionMs}ms,transform ${s.transitionMs}ms`
    );
  if (s.indicator != null && s.indicator !== "none") out.push(`position:relative`);
  return out;
};
/** The indicator bar (::BEFORE — the caret owns ::after @712) + its shown state +
 *  hoverUnderline/hoverLift extras. Bar hidden at rest, revealed on
 *  :hover/:focus-visible/[aria-current=page] via scaleX (grow) or opacity. */
const indicatorAndHoverRules = (sel: string, s: NavLevelStyle | NavChromeStyle): string[] => {
  const out: string[] = [];
  if (s.indicator != null && s.indicator !== "none") {
    const edge = s.indicator === "overline" ? "top:0" : "bottom:0";
    const th = s.indicatorThickness ?? 2;
    const dur = s.transitionMs ?? 150;
    const color = s.indicatorColor ?? "currentColor";
    // Reset BOTH axes at rest (TASK-507 A.2): LEVEL_LINK_SELECTORS are
    // descendant-anchored, so a shallower grow `::before{…scaleX(0)…}` reaches a
    // deeper non-grow `::before` (and vice-versa). Declaring only the active axis
    // would let the stale inherited one persist (a deeper non-grow bar stuck at
    // `scaleX(0)` → invisible). Emitting `opacity:1`/`transform:none` neutralizes it.
    const rest =
      s.indicatorGrow === true
        ? `content:"";position:absolute;left:0;${edge};height:${th}px;width:100%;background:${color};transform:scaleX(0);opacity:1;transform-origin:left;transition:transform ${dur}ms`
        : `content:"";position:absolute;left:0;${edge};height:${th}px;width:100%;background:${color};opacity:0;transform:none;transition:opacity ${dur}ms`;
    out.push(`${sel}::before{${rest}}`);
    const on = s.indicatorGrow === true ? `transform:scaleX(1)` : `opacity:1`;
    out.push(
      `${sel}:hover::before,${sel}:focus-visible::before,${sel}:where([aria-current="page"])::before{${on}}`
    );
  }
  const hoverDecls = [
    s.hoverUnderline === true ? `text-decoration:underline` : null,
    s.hoverLift != null ? `transform:translateY(-${s.hoverLift}px)` : null,
  ].filter((d): d is string => d !== null);
  if (hoverDecls.length) out.push(`${sel}:hover,${sel}:focus-visible{${hoverDecls.join(";")}}`);
  return out;
};

// ── B3 caret toggle + rotate + flyout animation ─────────────────────────────
// The caret @712 is emitted UNCONDITIONALLY for ALL groups; B3 emits per-level
// OVERRIDES keyed to the level's group-parent link (higher specificity than @712,
// emitted after ⇒ wins). ` > .site-nav-link` (with spaces) so caretRotateRule can
// strip it back to the <li>.
const GROUP_CARET_SELECTORS: Record<0 | 1 | 2, string> = {
  0: `${menuDocScope} .site-nav-list > li[data-site-nav-group="true"] > .site-nav-link`,
  1: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link`,
  2: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist > li[data-site-nav-group="true"] > .site-nav-link`,
};
const caretToggleRule = (lvl: 0 | 1 | 2, s: NavLevelStyle | NavChromeStyle): string | null =>
  s.showCaret === false ? `${GROUP_CARET_SELECTORS[lvl]}::after{content:none}` : null;
const caretRotateRule = (lvl: 0 | 1 | 2, s: NavLevelStyle | NavChromeStyle): string[] => {
  if (s.caretRotateOnOpen !== true) return [];
  const caret = GROUP_CARET_SELECTORS[lvl]; // …> .site-nav-link
  const g = caret.replace(" > .site-nav-link", ""); // the group <li>
  const dur = s.transitionMs ?? 150;
  // @712's ::after is a non-replaced INLINE box (no display) — `transform` is
  // silently ignored there, so ALSO emit a transformable resting state
  // (display:inline-block + rotate(0) + transition) so the open rotate applies AND
  // animates. Emitting rest HERE keeps @712 byte-identical when this is off.
  return [
    `${caret}::after{display:inline-block;transform:rotate(0);transition:transform ${dur}ms}`,
    `${g}:hover > .site-nav-link::after,${g}:focus-within > .site-nav-link::after{transform:rotate(180deg)}`,
  ];
};
// flyoutAnimation (TASK-508 R2): a PERCEPTIBLE reveal driven by
// visibility+opacity+transform, layered OVER the display:none→grid toggle
// (@1040/@1042 — NEVER replaced; that is the zero-JS reachability contract).
// At REST the sublist is forced `display:grid` (rest spec 0,4,0 (L1)/0,5,0 (L2)
// beats navNestingRules' 0,2,0 `.site-nav-sublist{display:none}`) so the box is
// ALWAYS laid out — opacity/transform can then interpolate in EVERY engine (a
// display:none box has no box to fade). It is hidden via `visibility:hidden`:
// exact reachability parity with display:none (non-focusable, non-clickable,
// a11y-hidden). `:hover`/`:focus-within` flips it `visibility:visible` + fully
// interactive from frame 0 (`visibility 0s` no-delay on SHOWN). The `visibility 0s
// linear ${dur}ms` on the REST rule DELAYS the hide until AFTER the fade/slide-out
// on CLOSE — the trick that makes CLOSE animate. NO @starting-style / allow-discrete
// / `display`-in-transition (the old approach was silently dropped pre-Chrome116/
// Safari17.4/FF129 and never animated close). Each level targets its OWN single
// precise sublist + the parent li that toggles it — NEVER the two-member
// LEVEL_CONTAINER_SELECTORS[1] (which would strand the nested level-2 sublist hidden;
// the level-2 `sub` is the anchored (0,5,0) form).
const flyoutAnimRule = (lvl: NavLevelStyleLevel, s: NavLevelStyle): string[] => {
  if (s.flyoutAnimation == null || s.flyoutAnimation === "none") return [];
  const target =
    lvl === 1
      ? {
          sub: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist`,
          openParent: `${menuDocScope} .site-nav-list > .site-nav-item`,
        }
      : {
          sub: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`,
          openParent: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > .site-nav-item`,
        };
  const { sub, openParent } = target;
  const dur = s.transitionMs ?? 150;
  const slide = s.flyoutAnimation === "slide";
  // REST: laid-out-but-hidden; `visibility 0s linear ${dur}ms` delays hide until the
  // fade/slide-out finishes on CLOSE.
  const restDecls = slide
    ? `display:grid;visibility:hidden;opacity:0;transform:translateY(-6px);transition:opacity ${dur}ms,transform ${dur}ms,visibility 0s linear ${dur}ms`
    : `display:grid;visibility:hidden;opacity:0;transition:opacity ${dur}ms,visibility 0s linear ${dur}ms`;
  // SHOWN: `visibility 0s` (no delay) ⇒ interactive from frame 0 on OPEN.
  const shownDecls = slide
    ? `visibility:visible;opacity:1;transform:none;transition:opacity ${dur}ms,transform ${dur}ms,visibility 0s`
    : `visibility:visible;opacity:1;transition:opacity ${dur}ms,visibility 0s`;
  const shownSel = `${openParent}:hover > .site-nav-sublist,${openParent}:focus-within > .site-nav-sublist`;
  return [`${sub}{${restDecls}}`, `${shownSel}{${shownDecls}}`]; // NO @starting-style/allow-discrete/display-in-transition
};

// ── B4 pill (level-0 wrapper on .site-nav-list) ─────────────────────────────
const pillRule = (chrome: NavChromeStyle): string | null => {
  const decls = [
    chrome.navPillBackground != null ? `background:${chrome.navPillBackground}` : null,
    chrome.navPillRadius != null ? `border-radius:${chrome.navPillRadius}px` : null,
    chrome.navPillPaddingX != null || chrome.navPillPaddingY != null
      ? `padding:${chrome.navPillPaddingY ?? 0}px ${chrome.navPillPaddingX ?? 0}px`
      : null,
  ].filter((d): d is string => d !== null);
  return decls.length ? `${menuDocScope} .site-nav-list{${decls.join(";")}}` : null;
};
// (B4 dropdown INNER padding for levels ≥1 rides levelContainerDecls below.)

// ── B5 nested submenu placement (LEVEL-2 nested sublist ONLY) ────────────────
// Rewrites the hardcoded @707 always-RIGHT nested flyout. Emitted SOLELY on the
// anchored (0,5,0) LEVEL_CONTAINER_SELECTORS[2] (read off the level-2 style) so it
// TIES the 504 reach + wins by source order; NEVER on LEVEL_CONTAINER_SELECTORS[1]
// (that would clobber dropdownRule @325's first-dropdown top|bottom axis). Every
// decl resets ALL FOUR offsets, else an undeclared offset inherits @707's
// `left:100%`/direction `top|bottom` ⇒ a double-anchor stretch.
const submenuPlacementRule = (s: NavLevelStyle | undefined): string | null => {
  if (!s || s.submenuPlacement == null) return null;
  const pos =
    s.submenuPlacement === "bottom"
      ? "left:0;top:100%;right:auto;bottom:auto"
      : s.submenuPlacement === "left"
        ? "right:100%;left:auto;top:0;bottom:auto"
        : "left:100%;right:auto;top:0;bottom:auto"; // right (default)
  return `${LEVEL_CONTAINER_SELECTORS[2]}{${pos}}`;
};

// ── TASK-508 R3a: nav-GLOBAL submenu direction (right|down|up|left) ───────────
// Applies CONSISTENTLY across ALL nested depths (level-1 first dropdown AND
// level-2/3+ nested), so "down everywhere" is ONE cohesive downward column.
// Present-only: unset ⇒ [] ⇒ dropdownDirection + per-level submenuPlacement behave
// EXACTLY as today (byte-identity). When set, rule A (0,4,0 first-dropdown selector)
// supersedes dropdownRule's 0,2,0 axis, and rule B on the anchored (0,5,0)
// LEVEL_CONTAINER_SELECTORS[2] ties the nested reach + wins by source order. Reset
// ALL FOUR offsets per rule (else an undeclared offset inherits @1046's `left:100%`
// ⇒ double-anchor stretch). down→bottom, up→top. Base-only (read from baseNavChrome
// in desktopShared, ≥640-only like dropdownRule; NOT in NAV_CHROME_COMPARE_KEYS).
type SubmenuDirection = NonNullable<NavChromeStyle["submenuDirection"]>;

const FIRST_DROPDOWN_SELECTOR =
  `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist` as const; // (0,4,0)

const directionOffsets = (dir: SubmenuDirection): string =>
  dir === "down"
    ? "left:0;top:100%;right:auto;bottom:auto"
    : dir === "up"
      ? "left:0;bottom:100%;top:auto;right:auto"
      : dir === "right"
        ? "left:100%;top:0;right:auto;bottom:auto"
        : "right:100%;top:0;left:auto;bottom:auto"; // "left"

const submenuDirectionRules = (chrome: NavChromeStyle | undefined): string[] => {
  if (!chrome || chrome.submenuDirection == null) return [];
  const pos = directionOffsets(chrome.submenuDirection);
  return [
    `${FIRST_DROPDOWN_SELECTOR}{${pos}}`, // rule A — level-1 first dropdown (0,4,0)
    `${LEVEL_CONTAINER_SELECTORS[2]}{${pos}}`, // rule B — nested ≥2 (anchored 0,5,0)
  ];
};

// ── TASK-508 R3b: submenuMode = accordion (in-flow block) ────────────────────
// Present-only: submenuMode !== "accordion" ⇒ [] ⇒ byte-identical (flyout is the
// default). Renders the whole menu as ONE downward in-flow column: a vertical top
// bar + `position:static` sublists that push siblings/content DOWN. Reachability is
// UNCHANGED — navNestingRules' display:none→grid hover/focus-within toggle still
// reveals the (now in-flow) sublist (do NOT touch @1040/@1042). Emitted AFTER the
// flyout/direction rules in desktopShared so `position:static` wins + neutralizes
// the absolute offsets (an absolute offset on a static box is inert). Base-only,
// ≥640-only (mobile is already a column via the base sheet).
const accordionRules = (chrome: NavChromeStyle | undefined): string[] => {
  if (chrome?.submenuMode !== "accordion") return [];
  return [
    // 1. Vertical top bar (REUSE the orientation:vertical decls @245-246 verbatim):
    //    a horizontal bar can't cohesively push a static sublist down.
    `${menuDocScope} .site-nav-list{flex-direction:column;align-items:stretch}`,
    // 2. In-flow sublists — override the base sheet's position:absolute
    //    (siteShellCss.ts:157) so sublists expand in place; drop floating chrome.
    `${menuDocScope} .site-nav-sublist{position:static;box-shadow:none;border:0;min-width:0}`,
    // 3. Indent per depth (mirror the mobile inline indent siteShellCss.ts:171).
    `${menuDocScope} .site-nav-sublist{padding-left:16px}`,
  ];
};

/** Link typography/box decls for ONE level (present-only, sparse). `gap` is NOT
 *  here — the link is `display:block`, so `gap` lands on the CONTAINER. */
const levelLinkDecls = (s: NavLevelStyle): string[] => {
  const decls = [
    s.linkColor != null ? `color:${s.linkColor}` : null,
    s.fontSize != null ? `font-size:${s.fontSize}px` : null,
    s.fontWeight != null ? `font-weight:${s.fontWeight}` : null,
    s.paddingX != null || s.paddingY != null
      ? `padding:${s.paddingY ?? SHELL_DEFAULT_LINK_PY}px ${s.paddingX ?? SHELL_DEFAULT_LINK_PX}px`
      : null,
    s.radius != null ? `border-radius:${s.radius}px` : null,
    // TASK-508 R1(b): link text alignment. `.site-nav-link` is display:block filling
    // the ≥180px container, so `text-align:center` centers the label (present-only,
    // per-device, all-width — rides the mobile linkOnly re-emit too).
    s.linkAlign != null ? `text-align:${s.linkAlign}` : null,
  ].filter((d): d is string => d !== null);
  // B2 (TASK-506): the indicator transition + `position:relative` fold into the
  // SAME link `{}` block (present-only ⇒ nothing when unauthored). All-width.
  return [...decls, ...indicatorLinkDecls(s)];
};

/** Hover/active state rules for ONE level (separate state-pseudo selectors). */
const levelStateRules = (level: NavLevelStyleLevel, s: NavLevelStyle): string[] => {
  const sel = LEVEL_LINK_SELECTORS[level];
  const out: string[] = [];
  const hoverDecls = [
    s.linkHoverColor != null ? `background:${s.linkHoverColor}` : null,
    s.linkHoverTextColor != null ? `color:${s.linkHoverTextColor}` : null,
  ].filter((d): d is string => d !== null);
  if (hoverDecls.length) out.push(`${sel}:hover,${sel}:focus-visible{${hoverDecls.join(";")}}`);
  if (s.linkActiveColor != null) out.push(`${sel}:active{background:${s.linkActiveColor}}`);
  return out;
};

/** Submenu-container chrome for levels >= 1 (present-only). `gap` rides the
 *  container (the sublist is `display:grid`), spacing that level's dropdown. */
const levelContainerDecls = (s: NavLevelStyle): string[] => {
  const border =
    s.borderColor != null || s.borderWidth != null
      ? `border:${s.borderWidth ?? 1}px solid ${s.borderColor ?? "rgba(15,23,42,.12)"}`
      : null;
  return [
    s.background != null ? `background:${s.background}` : null,
    border,
    s.radius != null ? `border-radius:${s.radius}px` : null,
    s.shadow != null ? `box-shadow:${shadowCss(s.shadow)}` : null,
    s.minWidth != null ? `min-width:${s.minWidth}px` : null,
    s.gap != null ? `gap:${s.gap}px` : null,
    // B4 (TASK-506) dropdown INNER padding — container-level, distinct from the
    // per-LINK paddingX/Y. Unset axis completes to 0 (author fully controls). ≥640
    // only (this fn is called below the linkOnly guard in navLevelRules).
    s.containerPaddingX != null || s.containerPaddingY != null
      ? `padding:${s.containerPaddingY ?? 0}px ${s.containerPaddingX ?? 0}px`
      : null,
  ].filter((d): d is string => d !== null);
};

const NAV_LEVELS: readonly NavLevelStyleLevel[] = [1, 2];

/**
 * Per-level rule emitter. Splits by field class per the parent contract
 * (TASK-504 §(2) + "Exact depth selectors"): the level LINK typography +
 * hover/active state is all-width (rides `desktopShared` AND re-emits into the
 * <640 mobile bucket for the "mobile inherits desktop" invariant), while the
 * submenu CONTAINER chrome (background/border/radius/shadow/min-width/gap) is
 * ≥640-ONLY — folded into `desktopShared`. `linkOnly` (mobile branch) OMITS the
 * container decls: below 640 the nav is inline (the base sheet strips the
 * dropdown chrome, `siteShellCss.ts`), so re-emitting a level container's
 * background/border/min-width there would PAINT on the inline nested list (a
 * level `minWidth` can overflow a narrow viewport) — a genuine leak, NOT the
 * harmless present-only no-op the contract intends. Full mode
 * (`desktopShared`/tablet, ≥640) keeps the container chrome.
 */
const navLevelRules = (
  levelStyles: NavLevelStyles | undefined,
  options?: { linkOnly?: boolean; skipFlyoutAnim?: boolean }
): string[] => {
  if (!levelStyles) return []; // absent ⇒ ZERO bytes
  const rules: string[] = [];
  for (const lvl of NAV_LEVELS) {
    const s = levelStyles[lvl];
    if (!s) continue;
    const linkDecls = levelLinkDecls(s);
    if (linkDecls.length) rules.push(`${LEVEL_LINK_SELECTORS[lvl]}{${linkDecls.join(";")}}`);
    rules.push(...levelStateRules(lvl, s));
    // B2 (TASK-506) indicator bar + shown state + hover extras — LINK-level ⇒
    // all-width (re-emits at mobile via the linkOnly path too).
    rules.push(...indicatorAndHoverRules(LEVEL_LINK_SELECTORS[lvl], s));
    if (options?.linkOnly) continue; // container chrome is ≥640-only (parent contract)
    const contDecls = levelContainerDecls(s);
    if (contDecls.length) rules.push(`${LEVEL_CONTAINER_SELECTORS[lvl]}{${contDecls.join(";")}}`);
    // B1/B3 (TASK-506) CONTAINER-ish structural — ≥640-only (the flyout/dropdown
    // only exists there). B5 placement is NOT here (standalone, level-2 only).
    const dropdownDivider = levelDropdownDividerRule(lvl, s);
    if (dropdownDivider) rules.push(dropdownDivider);
    const caretToggle = caretToggleRule(lvl, s);
    if (caretToggle) rules.push(caretToggle);
    rules.push(...caretRotateRule(lvl, s));
    // TASK-508 R3b: accordion mode is in-flow + naturally visible, so the flyout
    // reveal (whose R2 rest forces display:grid;visibility:hidden) is GATED OFF —
    // else the accordion sublist reserves in-flow space but is invisible at rest.
    if (!options?.skipFlyoutAnim) rules.push(...flyoutAnimRule(lvl, s));
  }
  return rules;
};

// --- TASK-504-02 §4 current-page rule ---------------------------------------
// Present-only: colored by the EXISTING `linkActiveColor` (no new model key).
// `:where()` contributes 0 specificity so the rule stays at the flat base link
// level — deliberately the LOWEST-priority tint (level/hover rules still win).
// FRONT-ONLY effect: the canvas stamps no `aria-current`, so it matches nothing
// there (the stamp lands via 504-03).
const currentPageRule = (a: ResolvedMenuAppearance): string[] =>
  a.linkActiveColor !== null
    ? [`${menuDocScope} .site-nav-link:where([aria-current="page"]){color:${a.linkActiveColor}}`]
    : [];

// --- TASK-504-02 §5 per-device brand + level deltas -------------------------
// The nested brand `style` / `levelStyles` records are NOT flat
// `ResolvedMenuAppearance` scalars, so `collectDeltaRules` cannot carry them.
// The Pages cascade (tablet/mobile each inherit DESKTOP; mobile NEVER inherits
// tablet) is owned by 504-01's exported resolvers — this module only DIFFS
// their output vs the desktop base to decide which delta rules to emit. The
// resolvers return `{}` (never undefined) for an unstyled target, so the diff
// helpers treat `{}`/`undefined` as equal ⇒ an unstyled block/level ⇒ ZERO bytes.

const BRAND_STYLE_COMPARE_KEYS: readonly (keyof BrandStyle)[] = [
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
];

const shallowEqualStyle = (resolved: BrandStyle, base: BrandStyle | undefined): boolean => {
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

const shallowEqualLevel = (a: NavLevelStyle, b: NavLevelStyle): boolean =>
  NAV_LEVEL_STYLE_COMPARE_KEYS.every((k) => a[k] === b[k]);

const deepEqualLevelStyles = (
  a: NavLevelStyles | undefined,
  b: NavLevelStyles | undefined
): boolean => {
  const la = a ?? {};
  const lb = b ?? {};
  return NAV_LEVELS.every((lvl) => shallowEqualLevel(la[lvl] ?? {}, lb[lvl] ?? {}));
};

/** Brand device deltas: emit the §1 rules but ONLY when the device-resolved
 *  style DIFFERS from the desktop base. Rides `tabletDelta` / `mobile`. */
const collectBrandDeltaRules = (doc: MenuDocumentV2, device: MenuDeviceKind): string[] => {
  const rules: string[] = [];
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (block.type !== "brand") continue;
    const resolved = resolveMenuBrandStyleForDevice(block, device); // 504-01 export ({}-safe)
    if (shallowEqualStyle(resolved, block.props.style)) continue; // no diff ⇒ no rule
    const esc = escapeAuthoringCssString(block.id);
    const key = `${menuDocScope} [data-menu-block-id="${esc}"]`;
    const textDecls = brandStyleDecls(resolved);
    if (textDecls.length) rules.push(`${key}{${textDecls.join(";")}}`);
    const imgDecls = brandImageDecls(resolved);
    if (imgDecls.length) rules.push(`${key} img{${imgDecls.join(";")};width:auto}`);
    const iconDecls = brandIconDecls(resolved);
    if (iconDecls.length) rules.push(`${key} svg{${iconDecls.join(";")}}`);
  }
  return rules;
};

/** Level device deltas: TOTAL re-emit of `navLevelRules` on the device-resolved
 *  `levelStyles`, but ONLY when it DIFFERS from desktop (later source order
 *  wins). The cascade is the ONE authoritative resolver — no local merge clone. */
const collectLevelDeltaRules = (doc: MenuDocumentV2, device: MenuDeviceKind): string[] => {
  const section = doc.sections[0];
  if (!section) return [];
  const navBlock = section.blocks.find((block) => block.type === "nav-items");
  if (!navBlock || navBlock.type !== "nav-items") return [];
  const resolved = resolveMenuSectionAppearanceForDevice(section, device).navProps.levelStyles;
  if (deepEqualLevelStyles(resolved, navBlock.props.levelStyles)) return []; // no diff
  // TASK-508 R3b: recompute the accordion gate from the base doc (submenuMode is
  // base-only — no per-device delta) so the tablet re-emit (linkOnly:false, which
  // fires flyoutAnimRule) ALSO skips flyout when accordion — else a per-device tablet
  // flyoutAnimation on a level would emit its display:grid;visibility:hidden rest and
  // leave the accordion sublist reserving space but invisible on tablet.
  const accordion = navBlock.props.navChrome?.submenuMode === "accordion";
  // Mobile (<640) is inline ⇒ container chrome is ≥640-only (see navLevelRules):
  // a mobile-specific level delta re-emits ONLY link typography + state, never
  // the container, so a per-device container override cannot leak onto the
  // inline nested list. Tablet (≥640) keeps the full container chrome.
  return navLevelRules(resolved, { linkOnly: device === "mobile", skipFlyoutAnim: accordion });
};

// --- TASK-506-02 level-0 navChrome emission + per-device delta --------------
// 506-02 is the sole writer of this navChrome compare list (mirrors
// NAV_LEVEL_STYLE_COMPARE_KEYS; 506-01 supplies the key set). navChrome has NO
// flyoutAnimation / submenuPlacement (both are levels-≥1 NavLevelStyle fields).
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

const shallowEqualChrome = (
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
const navChromeRules = (
  chrome: NavChromeStyle | undefined,
  orientation: MenuAppearanceOrientation,
  options?: { linkOnly?: boolean }
): string[] => {
  if (!chrome) return []; // absent ⇒ ZERO bytes
  const linkSel = `${menuDocScope} .site-nav-link`;
  const rules: string[] = [];
  const linkDecls = indicatorLinkDecls(chrome);
  if (linkDecls.length) rules.push(`${linkSel}{${linkDecls.join(";")}}`); // transition + position:relative stay cascade-root
  // B2 chrome (::before bar + hover-lift/underline) is TOP-BAR-ONLY so a level-0
  // indicator/lift/underline never leaks onto dropdown links (TASK-507 A.1).
  rules.push(...indicatorAndHoverRules(TOP_BAR_LINK_SELECTOR, chrome));
  if (options?.linkOnly) return rules;
  const pill = pillRule(chrome); // B4
  if (pill) rules.push(pill);
  const divider = level0DividerRule(chrome, orientation); // B1
  if (divider) rules.push(divider);
  const caretToggle = caretToggleRule(0, chrome); // B3
  if (caretToggle) rules.push(caretToggle);
  rules.push(...caretRotateRule(0, chrome)); // B3
  return rules;
};

/** navChrome device deltas: TOTAL re-emit on the device-resolved navChrome, but
 *  ONLY when it DIFFERS from desktop base (later source order wins). Mobile is
 *  `linkOnly` (pill/divider/caret are ≥640-only). Mirrors `collectLevelDeltaRules`. */
const collectChromeDeltaRules = (doc: MenuDocumentV2, device: MenuDeviceKind): string[] => {
  const section = doc.sections[0];
  if (!section) return [];
  const navBlock = section.blocks.find((block) => block.type === "nav-items");
  if (!navBlock || navBlock.type !== "nav-items") return [];
  const resolved = resolveMenuNavChrome(section, device); // 506-01 export ({}-safe)
  if (shallowEqualChrome(resolved, navBlock.props.navChrome)) return []; // no diff
  const orientation = resolveMenuAppearanceForDevice(doc, device).orientation;
  return navChromeRules(resolved, orientation, { linkOnly: device === "mobile" });
};

/**
 * B5 standalone tablet delta. `submenuPlacement` is in NAV_LEVEL_STYLE_COMPARE_KEYS
 * (so `deepEqualLevelStyles` sees the diff), but its BASE rule
 * (`submenuPlacementRule`) lives OUTSIDE `navLevelRules`, so `collectLevelDeltaRules`
 * re-emits IDENTICAL level-2 link/container rules and NO placement rewrite. This
 * standalone emitter closes that gap: gate on a real level-2 placement diff so an
 * unchanged doc emits ZERO bytes. NEVER mobile (nested flyout is ≥640-only).
 */
const submenuPlacementDeltaRule = (doc: MenuDocumentV2, device: "tablet"): string | null => {
  const section = doc.sections[0];
  if (!section) return null;
  const navBlock = section.blocks.find((block) => block.type === "nav-items");
  if (!navBlock || navBlock.type !== "nav-items") return null;
  const resolvedL2 = resolveMenuSectionAppearanceForDevice(section, device).navProps
    .levelStyles?.[2];
  const baseL2 = navBlock.props.levelStyles?.[2];
  if ((resolvedL2?.submenuPlacement ?? null) === (baseL2?.submenuPlacement ?? null)) return null;
  return submenuPlacementRule(resolvedL2);
};

/**
 * Fixed nesting block for 502-03's recursive markup (`li.site-nav-item` with
 * its own link/label + a DIRECT-child `ul.site-nav-sublist` per level; NO
 * `<details>` in the menu-document path). Emitted ONLY in the shared >=640
 * branch — desktop AND tablet; mobile (<640) never sees these rules, so all
 * levels stay inline-visible there, indented by the base sheet's per-class
 * cumulative `padding-left:16px` (`siteShellCss.ts:171`). DOC-SCOPED ONLY —
 * the frozen base sheet emits NO `.site-nav-sublist .site-nav-sublist` rule.
 *
 * SAME-COMMIT with 502-03's hover markup (Coordination): against today's
 * `<details class="site-nav-group">` structure the open rules match nothing
 * while the hide-by-default still applies — NO transitional rule is emitted.
 */
const navNestingRules = (a: ResolvedMenuAppearance): string[] => [
  // Hide-by-default: wins the base sheet's `.site-nav-sublist{display:grid}`
  // on equal specificity via later source order.
  `${menuDocScope} .site-nav-sublist{display:none}`,
  // Open per LEVEL on hover / keyboard focus (zero-JS).
  `${menuDocScope} .site-nav-item:hover>.site-nav-sublist,${menuDocScope} .site-nav-item:focus-within>.site-nav-sublist{display:grid}`,
  // Nested absolutes anchor per row.
  `${menuDocScope} .site-nav-sublist>li{position:relative}`,
  // Fly-out: (0,3,0) beats the base sheet's level-1 absolute; direction-aware.
  `${menuDocScope} .site-nav-sublist .site-nav-sublist{left:100%;${
    a.dropdownDirection === "top" ? "bottom:0;top:auto" : "top:0;bottom:auto"
  }}`,
  // Caret on group parents (linked AND linkless — 502-03's linkless label
  // carries BOTH `site-nav-link site-nav-group-label` classes).
  `${menuDocScope} li[data-site-nav-group="true"]>.site-nav-link::after{content:" \\25BE";font-size:.7em}`,
];

/**
 * Doc-scoped dual hide rule: menu-native wrappers carry `data-menu-block-id`
 * (stamped by `SiteHeaderMenuDocumentRender` on the existing outermost element
 * — for nav-items that is the `<nav>` LANDMARK ancestor, never `.site-nav-list`
 * itself, sidestepping the higher-specificity display rules); reused leaf
 * blocks keep `PageBlockFrame`'s existing `data-block-id`. EVERY comma-list
 * member carries the scope prefix (comma lists do not inherit it — a bare
 * attribute selector would apply page-wide).
 */
const hideRule = (id: string): string => {
  const esc = escapeAuthoringCssString(id);
  return `${menuDocScope} [data-menu-block-id="${esc}"],${menuDocScope} [data-block-id="${esc}"]{display:none}`;
};

/**
 * TASK-520-02: the EXTRA menu-bar keys (`radius`, `shadowCustom`, and the
 * `*Scrolled` variants) read off the per-device-resolved `layout`.
 * `ResolvedMenuAppearance` is `MenuAppearance`-typed, so these keys are STRIPPED
 * by `collectMenuAppearanceForDevice`'s `{...layout,...navProps}` cast (@136) and
 * the header-frame `MENU_RULE_GROUPS` CANNOT see them. They are read SEPARATELY
 * here off `resolveMenuSectionAppearanceForDevice(section, device).layout`
 * (per-device merged, @1555), mirroring how `levelStyles`/`navChrome` are read
 * via their own path. Returns `null` when the doc has no first section.
 */
const menuBarExtra = (doc: MenuDocumentV2, device: MenuDeviceKind): MenuBarLayout | null => {
  const section = doc.sections[0];
  if (!section) return null;
  return resolveMenuSectionAppearanceForDevice(section, device).layout;
};

/** Scrolled-state scope — set by 520-04's scroll-state machine on the FRONT header. */
const scrolledScope = `${menuDocScope}[data-scrolled="true"]` as const;

/**
 * G2 — floating-card menu bar: `border-radius` + custom `box-shadow`.
 * `shadowCustom` OVERRIDES the enum `shadow` (Hard Invariant): this block is
 * appended AFTER the header-frame group (`MENU_RULE_GROUPS[0]`) so its
 * `box-shadow` wins on source order. Present-only: an unset key emits ZERO bytes
 * (no-override byte-identity).
 */
const menuBarExtraRules = (layout: MenuBarLayout | null): string[] => {
  if (!layout) return [];
  const decls: string[] = [];
  if (layout.radius != null) decls.push(`border-radius:${layout.radius}px`);
  if (layout.shadowCustom) decls.push(`box-shadow:${layout.shadowCustom}`);
  return decls.length ? [`${menuDocScope}{${decls.join(";")}}`] : [];
};

/**
 * G1 — scrolled/floating-state variants under `[data-scrolled="true"]`. Each
 * variant falls back to the corresponding BASE key when unset (present-only ⇒
 * only authored axes emit; an unset scrolled key inherits the base rule already
 * on `menuDocScope`, which IS the "looks identical scrolled" back-compat). The
 * border falls back per-axis via longhand so a scrolled colour-only override
 * keeps the base width and vice versa. `shadowCustomScrolled` overrides
 * `shadowScrolled` overrides base.
 */
const menuBarScrolledRules = (layout: MenuBarLayout | null): string[] => {
  if (!layout) return [];
  const decls: string[] = [];
  if (layout.surfaceColorScrolled) decls.push(`background:${layout.surfaceColorScrolled}`);
  const w = layout.borderWidthScrolled;
  const c = layout.borderColorScrolled;
  if (c != null && w != null) decls.push(`border-bottom:${w}px solid ${c}`);
  else if (c != null) decls.push(`border-bottom-color:${c}`);
  else if (w != null) decls.push(`border-bottom-width:${w}px`);
  if (layout.shadowCustomScrolled) decls.push(`box-shadow:${layout.shadowCustomScrolled}`);
  else if (layout.shadowScrolled != null)
    decls.push(`box-shadow:${shadowCss(layout.shadowScrolled)}`);
  return decls.length ? [`${scrolledScope}{${decls.join(";")}}`] : [];
};

/**
 * Per-device delta for the extra + scrolled bar rules (tablet/mobile). Re-emit a
 * device block ONLY when its resolved rule text DIFFERS from the DESKTOP base
 * (delta discipline — byte-identity when unchanged, mirroring `collectDeltaRules`).
 * A device with no override resolves equal to desktop ⇒ nothing emitted; a mobile
 * `radius`/scrolled override re-emits inside its `@media` (later + gated by the
 * media query ⇒ wins the unwrapped desktop base rule). Emitted AFTER
 * `collectDeltaRules` in the device branch so a device `shadowCustom` still beats
 * a re-emitted enum `shadow` on source order.
 */
const collectMenuBarExtraDeltaRules = (
  doc: MenuDocumentV2,
  device: Exclude<MenuDeviceKind, "desktop">
): string[] => {
  const desktopLayout = menuBarExtra(doc, "desktop");
  const deviceLayout = menuBarExtra(doc, device);
  const desktopExtra = menuBarExtraRules(desktopLayout);
  const deviceExtra = menuBarExtraRules(deviceLayout);
  const desktopScrolled = menuBarScrolledRules(desktopLayout);
  const deviceScrolled = menuBarScrolledRules(deviceLayout);
  const out: string[] = [];
  if (deviceExtra.join("") !== desktopExtra.join("")) out.push(...deviceExtra);
  if (deviceScrolled.join("") !== desktopScrolled.join("")) out.push(...deviceScrolled);
  return out;
};

/** TOTAL group deltas for a resolved appearance vs the DESKTOP base (tablet OR mobile). */
const collectDeltaRules = (
  resolved: ResolvedMenuAppearance,
  base: ResolvedMenuAppearance
): string[] =>
  // Diff on RESOLVED values, not on override presence: an override equal to
  // the base (legal — no auto-remove-on-equality) emits nothing.
  MENU_RULE_GROUPS.filter((group) =>
    group.fields.some((field) => resolved[field] !== base[field])
  ).map((group) => group.delta(resolved));

const buildMenuRuleSetsForDocument = (doc: MenuDocumentV2): MenuRuleSets => {
  const base = resolveMenuAppearanceForDevice(doc, "desktop");
  const tabletResolved = resolveMenuAppearanceForDevice(doc, "tablet");
  const mobileResolved = resolveMenuAppearanceForDevice(doc, "mobile");
  // DESKTOP-base level styles (nested — read directly off the first nav-items
  // block, NOT the flat MenuAppearance). Present-only ⇒ undefined when unset.
  const navBlock = doc.sections[0]?.blocks.find((block) => block.type === "nav-items");
  const baseLevelStyles: NavLevelStyles | undefined =
    navBlock?.type === "nav-items" ? navBlock.props.levelStyles : undefined;
  // DESKTOP-base level-0 chrome (TASK-506, Option B). Present-only ⇒ undefined.
  const baseNavChrome: NavChromeStyle | undefined =
    navBlock?.type === "nav-items" ? navBlock.props.navChrome : undefined;
  // Byte-identical to the pre-501 base emission for every document, plus the
  // per-divider context rules, the present-only brand rules, and the present-only
  // current-page tint (all device-independent, all ZERO bytes when unauthored).
  const baseRules = [
    ...MENU_RULE_GROUPS.map((group) => group.base(base)).filter(
      (rule): rule is string => rule !== null
    ),
    ...collectMenuDividerRules(doc),
    ...collectMenuBrandRules(doc), // §1 brand — device-independent; per-device via §5
    ...currentPageRule(base), // §4 current-page tint (present-only)
    // TASK-520-02: menu-bar radius + custom-shadow (AFTER the header-frame group ⇒
    // `shadowCustom` overrides the enum `shadow`) then the [data-scrolled] variants.
    // Present-only ⇒ ZERO bytes for a doc with no extra bar keys (byte-identity).
    ...menuBarExtraRules(menuBarExtra(doc, "desktop")),
    ...menuBarScrolledRules(menuBarExtra(doc, "desktop")),
  ];
  // Shared >=640 rules (desktop AND tablet): dropdownRule reads the BASE
  // (device-defining), nesting rules are structural. Level chrome/link BASE folds
  // in AFTER nesting so it beats the structural `.site-nav-sublist` rules + base
  // sheet chrome on source order.
  const basePlacement = submenuPlacementRule(baseLevelStyles?.[2]); // TASK-506 B5
  // TASK-508 R3b: accordion gate (recomputed in collectLevelDeltaRules for the tablet
  // seam too — see there). Gates flyoutAnimRule OFF in BOTH the desktopShared AND the
  // tablet-delta re-emit paths (flyoutAnimation IS per-device forkable @NAV_LEVEL_STYLE_
  // COMPARE_KEYS, so gating only desktopShared would leave a tablet-delta gap).
  const accordion = baseNavChrome?.submenuMode === "accordion";
  const desktopShared = [
    dropdownRule(base),
    ...navNestingRules(base),
    ...navLevelRules(baseLevelStyles, { skipFlyoutAnim: accordion }), // §2 level base + TASK-506 B1/B2/B3/B4 levels 1/2 (R3b gates flyout)
    // TASK-506 level-0 chrome (B1 divider / B2 indicator / B3 caret / B4 pill).
    ...navChromeRules(baseNavChrome, base.orientation),
    // TASK-508 R3a: nav-global direction — AFTER the legacy axes so it supersedes
    // them, BEFORE B5 so a granular level-2 submenuPlacement still wins (emitted last).
    ...submenuDirectionRules(baseNavChrome),
    // TASK-508 R3b: accordion in-flow block — position:static wins + neutralizes offsets.
    ...accordionRules(baseNavChrome),
    // TASK-506 B5 nested placement — LEVEL-2 only, on the anchored (0,5,0) sel.
    ...(basePlacement ? [basePlacement] : []),
  ];
  const tabletPlacement = submenuPlacementDeltaRule(doc, "tablet"); // TASK-506 B5 carve-out
  const tabletDelta = [
    ...collectDeltaRules(tabletResolved, base), // scalar deltas (incl. §3 box, §4 hover-text)
    ...collectBrandDeltaRules(doc, "tablet"), // §5 brand delta
    ...collectLevelDeltaRules(doc, "tablet"), // §5 level delta (+ TASK-506 B1/B2/B3/B4)
    ...collectChromeDeltaRules(doc, "tablet"), // TASK-506 level-0 chrome delta
    // B5: standalone level-2 placement delta — NOT carried by collectLevelDeltaRules
    // (its base rule is outside navLevelRules), so re-emit here (gated on a diff).
    ...(tabletPlacement ? [tabletPlacement] : []),
    // TASK-520-02: per-device menu-bar extra/scrolled delta (AFTER the frame delta).
    ...collectMenuBarExtraDeltaRules(doc, "tablet"),
  ];
  const mobileRules = [
    ...mobileModeRules(mobileResolved), // FIRST — overrides win source order after it
    ...collectDeltaRules(mobileResolved, base), // mobile diffs vs DESKTOP (ignores tablet)
    ...collectBrandDeltaRules(doc, "mobile"), // §5 brand delta
    // Desktop-BASE level LINK typography must reach the inline <640 view too
    // ('mobile inherits desktop' HARD-INVARIANT): the mobile front branch does
    // NOT spread desktopShared, so re-emit the base level LINK rules here.
    // `linkOnly` OMITS the submenu CONTAINER chrome — that is ≥640-only (folded
    // into desktopShared per the parent contract); re-emitting it here would
    // leak background/border/min-width onto the inline nested list (the base
    // sheet strips that chrome at <640). Present-only ⇒ ZERO bytes when unset
    // (no-override byte-identity holds).
    ...navLevelRules(baseLevelStyles, { linkOnly: true }),
    ...collectLevelDeltaRules(doc, "mobile"), // §5 mobile-specific level override on top
    // TASK-506 level-0 chrome: base LINK B2 bits must reach the inline <640 view
    // (mobile inherits desktop); pill/divider/caret are ≥640-only ⇒ linkOnly.
    ...navChromeRules(baseNavChrome, base.orientation, { linkOnly: true }),
    ...collectChromeDeltaRules(doc, "mobile"), // mobile-specific chrome override (linkOnly)
    // TASK-520-02: per-device menu-bar extra/scrolled delta (AFTER the frame delta).
    ...collectMenuBarExtraDeltaRules(doc, "mobile"),
  ];
  // Canvas-only sim-open: the front's [open] disclosure rule (same declarations
  // as mobileModeRules :267) so the Mobile canvas previews the OPENED list.
  const previewMobileOpen =
    mobileResolved.mobileMode === "disclosure"
      ? [
          `${menuDocScope} .site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`,
        ]
      : [];
  return {
    base: baseRules,
    desktopShared,
    tabletDelta,
    mobile: mobileRules,
    previewMobileOpen,
    hide: collectMenuVisibilityPlan(doc),
  };
};

/**
 * FRONT builder: viewport-media responsive scoped sheet for a published menu
 * document. Mobile disclosure collapses via `@media`, exactly like
 * `buildSiteShellCss`. Branch layout (Pages-exact cascade — tablet AND mobile
 * each diff vs DESKTOP):
 * - shared `min-width:640` — `desktopShared` (dropdown + nesting) + hides for
 *   blocks hidden on desktop AND tablet (pre-502 position, byte-stable);
 * - NEW `min-width:1024` — hides for blocks hidden on desktop but VISIBLE on
 *   tablet (only emitted when such a divergence exists);
 * - NEW bounded `640–1023` tablet `@media` — tablet deltas + tablet-only hides
 *   (only emitted when non-empty, so no-tablet-override docs gain no branch);
 * - `max-width:639` mobile — mobileMode + mobile deltas + mobile hides.
 */
export function buildMenuDocumentCss(doc: MenuDocumentV2): string {
  const sets = buildMenuRuleSetsForDocument(doc);
  const desktopOnly = sets.hide.hideDesktopOnly.map(hideRule);
  const tabletBranch = [...sets.tabletDelta, ...sets.hide.hideTabletOnly.map(hideRule)];
  return [
    ...sets.base,
    `@media (min-width: ${desktopNavMinWidth}px){`,
    ...sets.desktopShared,
    ...sets.hide.hideShared.map(hideRule), // hides LAST (501 convention)
    `}`,
    ...(desktopOnly.length
      ? [
          `@media (min-width: ${pageResponsiveMediaBounds.tablet.maxWidth + 1}px){`,
          ...desktopOnly,
          `}`,
        ]
      : []),
    ...(tabletBranch.length
      ? [
          `@media (min-width: ${pageResponsiveMediaBounds.tablet.minWidth}px) and (max-width: ${pageResponsiveMediaBounds.tablet.maxWidth}px){`,
          ...tabletBranch,
          `}`,
        ]
      : []),
    `@media (max-width: ${mobileMaxWidth}px){`,
    ...sets.mobile,
    ...sets.hide.hideMobile.map(hideRule),
    `}`,
  ].join("\n");
}

/**
 * ADMIN-CANVAS structural baseline. On the FRONT the published header carries
 * BOTH scopes: the base site-shell sheet (`[data-site-header]`,
 * `buildSiteShellCss` — which owns the STRUCTURAL nav rules like
 * `.site-nav-list{display:flex}`) plus this module's scoped overrides. The
 * Design canvas injects ONLY the document sheet, so without a structural
 * baseline the nav `<ul>` falls back to `display:block` and the items stack
 * VERTICALLY (canvas-only fidelity bug — the front renders horizontally).
 * These rules mirror the base sheet's structure-only declarations (no colors /
 * appearance — those come from the document rules, emitted AFTER, which win).
 */
const buildCanvasStructuralBaseline = (device: PageBreakpoint): string[] => {
  const header = menuDocScope;
  const base = [
    `${header} .site-header-brand{font-weight:600;color:inherit;text-decoration:none}`,
    `${header} .site-nav summary{cursor:pointer;list-style:none}`,
    `${header} .site-nav summary::-webkit-details-marker{display:none}`,
    `${header} .site-nav-list{display:flex;flex-wrap:wrap;align-items:center;list-style:none;margin:0;padding:0}`,
    `${header} .site-nav-item{position:relative}`,
    `${header} .site-nav-link{display:block;padding:8px 12px;border-radius:6px;text-decoration:none}`,
    `${header} .site-nav-group>summary{display:block;padding:8px 12px;border-radius:6px}`,
    `${header} .site-nav-group>summary::after{content:" \\25BE";font-size:.7em}`,
    `${header} .site-nav-sublist{list-style:none;margin:0;padding:6px;display:grid;gap:2px;min-width:180px}`,
    `${header} .site-nav-disclosure{display:none}`,
    `${header} .site-nav-disclosure>summary{padding:8px 12px;border:1px solid rgba(15,23,42,.16);border-radius:6px}`,
  ];
  const desktop = [
    `${header} .site-nav-sublist{position:absolute;left:0;z-index:40;background:var(--color-bg,#fff);border:1px solid rgba(15,23,42,.12);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12)}`,
  ];
  const mobile = [
    `${header} .site-nav{width:100%}`,
    `${header} .site-nav-sublist{padding-left:16px}`,
  ];
  return device === "mobile" ? [...base, ...mobile] : [...base, ...desktop];
};

/**
 * Canvas-only force-open for the selected nav level (TASK-504-02 §6). Sublists
 * are `display:none` until `:hover`/`:focus-within` (`navNestingRules`), and a
 * level-2 sublist nests INSIDE a level-1 sublist that is itself closed — so the
 * whole ancestor chain (levels 1..N) is opened CUMULATIVELY, not just depth N.
 * Emitted LAST by the preview builder so it wins the closed `display:none`.
 */
const previewForceOpenLevel = (level: NavLevelStyleLevel): string[] => {
  // TASK-506 B3 + TASK-508 R2: force-open ALSO neutralizes the flyoutAnimation closed
  // rest state (`visibility:hidden;opacity:0`/transform) so the animated flyout is
  // VISIBLE on the canvas, not open-but-invisible. Each neutralize rule MATCHES its
  // rest rule's specificity so it ties + wins on source order (emitted LAST).
  const rules = [
    `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`,
  ];
  if (level >= 2) {
    // ANCHORED (0,5,0) — MUST match flyoutAnimRule(2)'s nested hidden selector; the
    // short (0,3,0) `.site-nav-sublist .site-nav-sublist` would LOSE to it regardless
    // of order, leaving a level-2 flyoutAnimation flyout open-but-invisible.
    rules.push(
      `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`
    );
  }
  return rules;
};

/**
 * ADMIN-CANVAS builder: device-forced scoped sheet. The Design canvas constrains
 * the frame width per the selected `DeviceSwitcher` breakpoint, but `@media`
 * queries respond to the real admin viewport, so the responsive branch is
 * flattened (emitted unwrapped) for the requested device. TASK-502-02: the
 * tablet⇒desktop mapping is GONE — tablet gets a REAL device-forced branch
 * (`desktopShared` + `tabletDelta`). NO visibility hide rules are emitted in
 * ANY forced branch: `hideRule` targets the `[data-menu-block-id]` stamp the
 * editor also paints, so a preview `display:none` would kill the 502-04
 * dimmed selectable ghost — canvas visibility is the ghost gate's job. The
 * mobile branch additionally appends a canvas-only disclosure sim-open so the
 * Mobile canvas previews the nav list under the default `mobileMode`.
 * Consumed ONLY by the admin canvas preview (TASK-499-03); the front uses the
 * viewport variant above. Prepends the structural baseline that the front gets
 * from the base site-shell sheet — document rules follow, so they win.
 */
export function buildMenuDocumentPreviewCss(
  doc: MenuDocumentV2,
  device: PageBreakpoint,
  forceOpenLevel?: NavLevelStyleLevel
): string {
  const sets = buildMenuRuleSetsForDocument(doc);
  const branch =
    device === "mobile"
      ? [...sets.mobile, ...sets.previewMobileOpen] // sim-open LAST — wins the closed display:none
      : device === "tablet"
        ? [...sets.desktopShared, ...sets.tabletDelta] // REAL tablet branch (was: desktop map)
        : sets.desktopShared;
  // Canvas-only: when the editor selects a level >= 1, force the whole ancestor
  // chain (levels 1..N) open so the author SEES the styled depth. Emitted LAST so
  // it beats navNestingRules' closed `display:none` on source order. Precedent =
  // previewMobileOpen. `undefined` ⇒ zero extra bytes (preview byte-identical).
  const forceOpen = forceOpenLevel ? previewForceOpenLevel(forceOpenLevel) : [];
  return [...buildCanvasStructuralBaseline(device), ...sets.base, ...branch, ...forceOpen].join(
    "\n"
  );
}
