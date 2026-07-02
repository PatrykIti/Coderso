import {
  hasMenuBlockVisibilityOverride,
  resolveMenuBlockVisibleForDevice,
  resolveMenuSectionAppearanceForDevice,
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
 * Two builders share the same scoped rules (ONE `buildMenuRuleSets`):
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
  device: "desktop" | "mobile"
): MenuAppearance => {
  const section = doc.sections[0];
  if (!section) return {};
  const { layout, navProps } = resolveMenuSectionAppearanceForDevice(section, device);
  return { ...layout, ...navProps };
};

const resolveMenuAppearanceForDevice = (doc: MenuDocumentV2, device: "desktop" | "mobile") => ({
  ...MENU_APPEARANCE_DEFAULTS,
  ...sanitizeMenuAppearance(collectMenuAppearanceForDevice(doc, device)),
});
// resolveMenuAppearanceForDevice(doc, "desktop") equals the pre-501 single
// resolve for every legacy doc — this IS the byte-identity invariant.

type ResolvedMenuAppearance = ReturnType<typeof resolveMenuAppearanceForDevice>;

type MenuRuleSets = {
  base: string[];
  desktop: string[];
  mobile: string[];
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
   * Mobile-delta rule: TOTAL emission — every field gets an explicit
   * declaration (neutral value instead of omission) so a mobile override can
   * REVERT a base-emitted declaration without leakage.
   */
  mobile: (a: ResolvedMenuAppearance) => string;
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
    mobile: (a) =>
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
    mobile: (a) =>
      `${menuDocScope} .site-header-inner{justify-content:${MENU_ALIGNMENT_CSS[a.alignment]};padding:${a.paddingY}px ${a.paddingX}px}`,
  },
  {
    // 3. navGap
    fields: ["itemGap"],
    base: (a) => `${menuDocScope} .site-nav-list{gap:${a.itemGap}px}`,
    mobile: (a) => `${menuDocScope} .site-nav-list{gap:${a.itemGap}px}`,
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
    mobile: (a) =>
      a.orientation === "vertical"
        ? `${menuDocScope} .site-nav-list{flex-direction:column;align-items:stretch}`
        : `${menuDocScope} .site-nav-list{flex-direction:row;align-items:center}`,
  },
  {
    // 5. link
    fields: ["linkColor", "fontSize", "fontWeight", "textTransform"],
    base: (a) => `${menuDocScope} .site-nav-link{color:${a.linkColor}${baseItemTypographyCss(a)}}`,
    mobile: (a) => `${menuDocScope} .site-nav-link{color:${a.linkColor};${totalTypographyCss(a)}}`,
  },
  {
    // 6. hover
    fields: ["linkHoverColor"],
    base: (a) => `${hoverSelector}{background:${a.linkHoverColor}}`,
    mobile: (a) => `${hoverSelector}{background:${a.linkHoverColor}}`,
  },
  {
    // 7. active — a null revert matches hover (visually identical to the
    // base's no-rule behavior).
    fields: ["linkActiveColor"],
    base: (a) =>
      a.linkActiveColor !== null ? `${activeSelector}{background:${a.linkActiveColor}}` : null,
    mobile: (a) =>
      `${activeSelector}{background:${a.linkActiveColor !== null ? a.linkActiveColor : a.linkHoverColor}}`,
  },
  {
    // 8. summary
    fields: ["linkColor", "fontSize", "fontWeight", "textTransform"],
    base: (a) => {
      const summaryColorCss = a.linkColor !== "inherit" ? `;color:${a.linkColor}` : "";
      return `${menuDocScope} .site-nav-group>summary{${summaryColorCss.replace(/^;/, "")}${baseItemTypographyCss(a)}}`;
    },
    mobile: (a) =>
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

/** Block ids to hide per device branch, in document order (TASK-501-02). */
type MenuVisibilityPlan = { hideOnDesktop: string[]; hideOnMobile: string[] };

/**
 * Only blocks WITH a responsive visibility override participate — the flat
 * leaf `visibility` semantics stay render-time (`PageBlockFrame` skip) and
 * byte-unchanged. Blocks visible on NEITHER device are render-skipped by the
 * front (`shouldRenderMenuBlock`, `siteShell.tsx`) ⇒ no markup, no CSS.
 */
const collectMenuVisibilityPlan = (doc: MenuDocumentV2): MenuVisibilityPlan => {
  const plan: MenuVisibilityPlan = { hideOnDesktop: [], hideOnMobile: [] };
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (!hasMenuBlockVisibilityOverride(block)) continue;
    const onDesktop = resolveMenuBlockVisibleForDevice(block, "desktop");
    const onMobile = resolveMenuBlockVisibleForDevice(block, "mobile");
    if (!onDesktop && !onMobile) continue; // render-skipped ⇒ no CSS
    if (!onDesktop) plan.hideOnDesktop.push(block.id);
    if (!onMobile) plan.hideOnMobile.push(block.id);
  }
  return plan;
};

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

const buildMenuRuleSets = (
  base: ResolvedMenuAppearance,
  mobileResolved: ResolvedMenuAppearance,
  visibility: MenuVisibilityPlan
): MenuRuleSets => {
  // Byte-identical to the pre-501 base emission for every document.
  const baseRules = MENU_RULE_GROUPS.map((group) => group.base(base)).filter(
    (rule): rule is string => rule !== null
  );
  const desktopRules = [dropdownRule(base), ...visibility.hideOnDesktop.map(hideRule)];
  // Diff on RESOLVED values, not on override presence: an override equal to
  // the base (legal — no auto-remove-on-equality) emits nothing.
  const mobileDelta = MENU_RULE_GROUPS.filter((group) =>
    group.fields.some((field) => mobileResolved[field] !== base[field])
  ).map((group) => group.mobile(mobileResolved));
  const mobileRules = [
    ...mobileModeRules(mobileResolved), // FIRST — overrides win source order after it
    ...mobileDelta,
    ...visibility.hideOnMobile.map(hideRule), // LAST
  ];
  return { base: baseRules, desktop: desktopRules, mobile: mobileRules };
};

const buildMenuRuleSetsForDocument = (doc: MenuDocumentV2): MenuRuleSets =>
  buildMenuRuleSets(
    resolveMenuAppearanceForDevice(doc, "desktop"),
    resolveMenuAppearanceForDevice(doc, "mobile"),
    collectMenuVisibilityPlan(doc)
  );

/**
 * FRONT builder: viewport-media responsive scoped sheet for a published menu
 * document. Mobile disclosure collapses via `@media`, exactly like
 * `buildSiteShellCss`. Show-only-on-mobile hide rules live in the desktop
 * `min-width` branch; mobile delta + hide-on-mobile rules in the `max-width`
 * branch — no un-hide/revert rules needed.
 */
export function buildMenuDocumentCss(doc: MenuDocumentV2): string {
  const sets = buildMenuRuleSetsForDocument(doc);
  return [
    ...sets.base,
    `@media (min-width: ${desktopNavMinWidth}px){`,
    ...sets.desktop,
    `}`,
    `@media (max-width: ${mobileMaxWidth}px){`,
    ...sets.mobile,
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
 * flattened (emitted unwrapped) for the requested device. Desktop and tablet
 * share the desktop branch, mirroring the public breakpoint bounds (tablet
 * stays deferred, TASK-501 parent decision). Consumed ONLY by the admin canvas
 * preview (TASK-499-03); the front uses the viewport variant above. Prepends
 * the structural baseline (see above) that the front gets from the base
 * site-shell sheet — document rules follow, so they win. Mobile flatten
 * correctness: base rules (desktop-resolved) + mobile delta emitted after ⇒
 * net mobile-resolved look, exactly like the front cascade; the shared rule
 * sets carry the visibility hide rules for free.
 */
export function buildMenuDocumentPreviewCss(doc: MenuDocumentV2, device: PageBreakpoint): string {
  const sets = buildMenuRuleSetsForDocument(doc);
  const branch = device === "mobile" ? sets.mobile : sets.desktop;
  return [...buildCanvasStructuralBaseline(device), ...sets.base, ...branch].join("\n");
}
