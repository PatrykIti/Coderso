/**
 * menuDocumentCssRules — positive rule emitters of the menu-document stylesheet
 * (TASK-542-02-L01 split): typography, dropdown, mobile-mode, visibility plan,
 * divider, brand (style/image/icon), indicator/caret/flyout/pill/submenu/
 * accordion, level link/container/state, nesting, current-page, and the
 * menu-bar extra/scrolled rules. Bun-free (Vitest lane).
 */
import {
  hasMenuBlockVisibilityOverride,
  resolveMenuBlockVisibleForDevice,
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
import type {
  MenuAppearance,
  MenuAppearanceAlignment,
  MenuAppearanceOrientation,
  MenuAppearanceShadow,
} from "../services/menus/normalizeMenuAppearance";
import { escapeAuthoringCssString } from "../services/pages/pageAuthoringSanitizers";
import { MENU_SHELL_SUBLIST_PADDING } from "../services/menus/menuDocumentV2Fields";
import {
  MENU_ALIGNMENT_CSS,
  MENU_APPEARANCE_DEFAULTS,
  MENU_GROUP_CARET_CONTENT,
  MENU_SHADOW_CSS,
  menuDocScope,
  SHELL_DEFAULT_LINK_PX,
  SHELL_DEFAULT_LINK_PY,
  SHELL_DEFAULT_LINK_RADIUS,
  shadowCss,
  LEVEL_CONTAINER_SELECTORS,
  LEVEL_DROPDOWN_ITEM_SELECTORS,
  LEVEL_LINK_SELECTORS,
  GROUP_CARET_SELECTORS,
  TOP_BAR_LINK_SELECTOR,
  hoverSelector,
  activeSelector,
  type MenuRuleSets,
  type MenuVisibilityPlan,
  type ResolvedMenuAppearance,
  NAV_LEVELS,
} from "./menuDocumentCssCore";

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
export const MENU_RULE_GROUPS: readonly MenuRuleGroup[] = [
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
export const dropdownRule = (a: ResolvedMenuAppearance): string =>
  `${menuDocScope} .site-nav-sublist{${a.dropdownDirection === "top" ? "bottom:100%;top:auto" : "top:100%;bottom:auto"}}`;

/**
 * mobileMode disclosure/inline rules — mobile-branch-only, so they read the
 * mobile-RESOLVED appearance (no-override docs resolve to the base value ⇒
 * byte-identical). Emitted FIRST in the mobile branch; delta rules follow and
 * win on source order.
 */
export const mobileModeRules = (a: ResolvedMenuAppearance): string[] =>
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
export const collectMenuVisibilityPlan = (doc: MenuDocumentV2): MenuVisibilityPlan => {
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
export const collectMenuDividerRules = (doc: MenuDocumentV2): string[] => {
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

export const brandStyleDecls = (style: BrandStyle): string[] =>
  [
    style.fontSize != null ? `font-size:${style.fontSize}px` : null,
    style.fontWeight != null ? `font-weight:${style.fontWeight}` : null,
    style.color != null ? `color:${style.color}` : null,
    style.textTransform != null ? `text-transform:${style.textTransform}` : null,
    style.letterSpacing != null ? `letter-spacing:${style.letterSpacing}px` : null,
  ].filter((d): d is string => d !== null);

export const brandImageDecls = (style: BrandStyle): string[] =>
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
// TASK-542-02 matrix #10: brand ICON COLOR joins the per-device svg path. The
// SSR `<svg>` fills `currentColor`, so emitting `color:` on the svg selector
// re-tints it per viewport. Present-only ⇒ ZERO bytes when unauthored.
export const brandIconDecls = (style: BrandStyle): string[] => [
  ...(style.iconSize != null ? [`width:${style.iconSize}px`, `height:${style.iconSize}px`] : []),
  ...(style.iconColor != null ? [`color:${style.iconColor}`] : []),
];

export const collectMenuBrandRules = (doc: MenuDocumentV2): string[] => {
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
export const submenuPlacementRule = (s: NavLevelStyle | undefined): string | null => {
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

export const submenuDirectionRules = (chrome: NavChromeStyle | undefined): string[] => {
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
export const accordionRules = (chrome: NavChromeStyle | undefined): string[] => {
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
    // per-LINK paddingX/Y. Unset axis completes to MENU_SHELL_SUBLIST_PADDING (6)
    // so a one-axis override keeps a readable gutter (TASK-542-02 matrix #9). ≥640
    // only (this fn is called below the linkOnly guard in navLevelRules).
    s.containerPaddingX != null || s.containerPaddingY != null
      ? `padding:${s.containerPaddingY ?? MENU_SHELL_SUBLIST_PADDING}px ${s.containerPaddingX ?? MENU_SHELL_SUBLIST_PADDING}px`
      : null,
  ].filter((d): d is string => d !== null);
};

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
export const navLevelRules = (
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
export const currentPageRule = (a: ResolvedMenuAppearance): string[] =>
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

export const navChromeRules = (
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
export const navNestingRules = (a: ResolvedMenuAppearance): string[] => [
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
  `${menuDocScope} li[data-site-nav-group="true"]>.site-nav-link::after{content:"${MENU_GROUP_CARET_CONTENT}";font-size:.7em}`,
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
export const hideRule = (id: string): string => {
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
export const menuBarExtra = (doc: MenuDocumentV2, device: MenuDeviceKind): MenuBarLayout | null => {
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
export const menuBarExtraRules = (layout: MenuBarLayout | null): string[] => {
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
export const menuBarScrolledRules = (layout: MenuBarLayout | null): string[] => {
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
