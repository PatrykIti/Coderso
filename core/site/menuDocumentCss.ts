import type {
  MenuBarLayout,
  MenuDocumentV2,
  NavItemsProps,
} from "../services/menus/menuDocumentV2";
import {
  sanitizeMenuAppearance,
  type MenuAppearance,
  type MenuAppearanceAlignment,
  type MenuAppearanceShadow,
} from "../services/menus/normalizeMenuAppearance";
import type { PageBreakpoint } from "../services/pages/pageDocumentV2";
import { pageResponsiveMediaBounds } from "../services/pages/pageResponsiveCss";
import { SHELL_APPEARANCE_DEFAULTS } from "./siteShellCss";

/**
 * Scoped menu-document stylesheet builder (TASK-499-04).
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
 * Safety: the appearance is re-sanitized through `sanitizeMenuAppearance`, so the
 * emitted CSS only ever contains validated color shapes, clamped numbers, and
 * enum-mapped strings — raw stored input never reaches the stylesheet.
 *
 * Two builders share the same scoped rules:
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
 * Collects the document's validated appearance surface: the first section's
 * `menu-bar` layout (frame subset) merged with the `nav-items` block's typography
 * subset. Both are already normalized `MenuAppearance` subsets (menuDocumentV2),
 * re-sanitized here before resolving against the shell defaults.
 */
const collectMenuAppearance = (doc: MenuDocumentV2): MenuAppearance => {
  const section = doc.sections[0];
  const layout: MenuBarLayout = section?.layout ?? {};
  const navBlock = section?.blocks.find((block) => block.type === "nav-items");
  const navProps: NavItemsProps = navBlock && navBlock.type === "nav-items" ? navBlock.props : {};
  return { ...layout, ...navProps };
};

const resolveMenuAppearance = (doc: MenuDocumentV2) => ({
  ...SHELL_APPEARANCE_DEFAULTS,
  ...sanitizeMenuAppearance(collectMenuAppearance(doc)),
});

type ResolvedMenuAppearance = ReturnType<typeof resolveMenuAppearance>;

type MenuRuleSets = {
  base: string[];
  desktop: string[];
  mobile: string[];
};

const buildMenuRuleSets = (a: ResolvedMenuAppearance): MenuRuleSets => {
  const header = `[${SITE_MENU_DOC_ATTRIBUTE}="true"]`;

  const headerDeclarations = [
    a.surfaceColor !== "transparent" ? `background:${a.surfaceColor}` : null,
    `border-bottom:${a.borderWidth}px solid ${a.borderColor}`,
    a.shadow !== "none" ? `box-shadow:${MENU_SHADOW_CSS[a.shadow]}` : null,
    a.sticky ? "position:sticky;top:0;z-index:50" : null,
  ]
    .filter(Boolean)
    .join(";");

  const itemTypography = [
    a.fontSize !== null ? `font-size:${a.fontSize}px` : null,
    a.fontWeight !== null ? `font-weight:${a.fontWeight}` : null,
    a.textTransform !== "none" ? `text-transform:${a.textTransform}` : null,
  ].filter(Boolean);
  const itemTypographyCss = itemTypography.length > 0 ? `;${itemTypography.join(";")}` : "";
  const summaryColorCss = a.linkColor !== "inherit" ? `;color:${a.linkColor}` : "";

  const base = [
    `${header}{${headerDeclarations}}`,
    `${header} .site-header-inner{margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:${MENU_ALIGNMENT_CSS[a.alignment]};gap:8px 24px;max-width:1080px;padding:${a.paddingY}px ${a.paddingX}px}`,
    `${header} .site-nav-list{gap:${a.itemGap}px}`,
    `${header} .site-nav-link{color:${a.linkColor}${itemTypographyCss}}`,
    `${header} .site-nav-link:hover,${header} .site-nav-link:focus-visible,${header} .site-nav-group>summary:hover,${header} .site-nav-group>summary:focus-visible{background:${a.linkHoverColor}}`,
    a.linkActiveColor !== null
      ? `${header} .site-nav-link:active,${header} .site-nav-group>summary:active{background:${a.linkActiveColor}}`
      : null,
    `${header} .site-nav-group>summary{${summaryColorCss.replace(/^;/, "")}${itemTypographyCss}}`,
  ].filter((line): line is string => line !== null);

  const desktop = [
    `${header} .site-nav-sublist{${a.dropdownDirection === "top" ? "bottom:100%;top:auto" : "top:100%;bottom:auto"}}`,
  ];

  const mobile = [
    ...(a.mobileMode === "disclosure"
      ? [
          `${header} .site-nav-disclosure{display:block}`,
          `${header} .site-nav-list{display:none}`,
          `${header} .site-nav-disclosure[open]~.site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`,
        ]
      : [
          // "inline" keeps the shared link list visible below the breakpoint.
          `${header} .site-nav-disclosure{display:none}`,
          `${header} .site-nav-list{display:flex}`,
        ]),
  ];

  return { base, desktop, mobile };
};

/**
 * FRONT builder: viewport-media responsive scoped sheet for a published menu
 * document. Mobile disclosure collapses via `@media`, exactly like
 * `buildSiteShellCss`.
 */
export function buildMenuDocumentCss(doc: MenuDocumentV2): string {
  const sets = buildMenuRuleSets(resolveMenuAppearance(doc));
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
  const header = `[${SITE_MENU_DOC_ATTRIBUTE}="true"]`;
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
 * share the desktop branch, mirroring the public breakpoint bounds. Consumed
 * ONLY by the admin canvas preview (TASK-499-03); the front uses the viewport
 * variant above. Prepends the structural baseline (see above) that the front
 * gets from the base site-shell sheet — document rules follow, so they win.
 */
export function buildMenuDocumentPreviewCss(doc: MenuDocumentV2, device: PageBreakpoint): string {
  const sets = buildMenuRuleSets(resolveMenuAppearance(doc));
  const branch = device === "mobile" ? sets.mobile : sets.desktop;
  return [...buildCanvasStructuralBaseline(device), ...sets.base, ...branch].join("\n");
}
