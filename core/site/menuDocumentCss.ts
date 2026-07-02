import {
  hasMenuBlockVisibilityOverride,
  resolveMenuBlockVisibleForDevice,
  resolveMenuSectionAppearanceForDevice,
  type MenuDeviceKind,
  type MenuDocumentV2,
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
    // 6. hover
    fields: ["linkHoverColor"],
    base: (a) => `${hoverSelector}{background:${a.linkHoverColor}}`,
    delta: (a) => `${hoverSelector}{background:${a.linkHoverColor}}`,
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
  // Byte-identical to the pre-501 base emission for every document, plus the
  // per-divider context rules (device-independent, appended last).
  const baseRules = [
    ...MENU_RULE_GROUPS.map((group) => group.base(base)).filter(
      (rule): rule is string => rule !== null
    ),
    ...collectMenuDividerRules(doc),
  ];
  // Shared >=640 rules (desktop AND tablet): dropdownRule reads the BASE
  // (device-defining), nesting rules are structural.
  const desktopShared = [dropdownRule(base), ...navNestingRules(base)];
  const tabletDelta = collectDeltaRules(tabletResolved, base);
  const mobileRules = [
    ...mobileModeRules(mobileResolved), // FIRST — overrides win source order after it
    ...collectDeltaRules(mobileResolved, base), // mobile diffs vs DESKTOP (ignores tablet)
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
export function buildMenuDocumentPreviewCss(doc: MenuDocumentV2, device: PageBreakpoint): string {
  const sets = buildMenuRuleSetsForDocument(doc);
  const branch =
    device === "mobile"
      ? [...sets.mobile, ...sets.previewMobileOpen] // sim-open LAST — wins the closed display:none
      : device === "tablet"
        ? [...sets.desktopShared, ...sets.tabletDelta] // REAL tablet branch (was: desktop map)
        : sets.desktopShared;
  return [...buildCanvasStructuralBaseline(device), ...sets.base, ...branch].join("\n");
}
