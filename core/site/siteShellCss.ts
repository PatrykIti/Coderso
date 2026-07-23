import {
  normalizeMenuColorValue,
  sanitizeMenuAppearance,
  type MenuAppearance,
  type MenuAppearanceAlignment,
  type MenuAppearanceDropdownDirection,
  type MenuAppearanceFontWeight,
  type MenuAppearanceMobileMode,
  type MenuAppearanceShadow,
  type MenuAppearanceTextTransform,
} from "../services/menus/normalizeMenuAppearance";
import type { PageBreakpoint } from "../services/pages/pageDocumentV2";
import { pageResponsiveMediaBounds } from "../services/pages/pageResponsiveCss";

/**
 * Site-shell stylesheet builder (TASK-458-02).
 *
 * `buildSiteShellCss(appearance)` maps the published menu's normalized
 * `MenuAppearance` onto the handwritten shell rule set that used to be the
 * static `SITE_SHELL_CSS` constant. HARD CONTRACT: `buildSiteShellCss(null)`
 * (and the all-defaults model) reproduces the legacy stylesheet
 * BYTE-IDENTICALLY, so menus without a stored appearance render exactly as
 * before (fail-closed defaults; pinned by `tests/unit/pages/siteShellCss.test.ts`).
 *
 * Safety: input is re-sanitized through `sanitizeMenuAppearance`, so the
 * emitted CSS only ever contains validated color shapes, clamped numbers,
 * and enum-mapped strings — raw stored input never reaches the stylesheet.
 */

export const SITE_HEADER_ATTRIBUTE = "data-site-header" as const;
export const SITE_FOOTER_ATTRIBUTE = "data-site-footer" as const;

/**
 * Scope prefix for the footer template's responsive CSS so its
 * section/block rules can never collide with the page document's rules
 * (distinct scope per the TASK-455 contract).
 */
export const SITE_FOOTER_SCOPE_SELECTOR = `[${SITE_FOOTER_ATTRIBUTE}="true"]` as const;

const mobileMaxWidth = pageResponsiveMediaBounds.mobile.maxWidth;
const desktopNavMinWidth = pageResponsiveMediaBounds.tablet.minWidth;

type ResolvedShellAppearance = {
  surfaceColor: string;
  linkColor: string;
  linkHoverColor: string;
  linkActiveColor: string | null;
  itemGap: number;
  paddingY: number;
  paddingX: number;
  alignment: MenuAppearanceAlignment;
  fontSize: number | null;
  fontWeight: MenuAppearanceFontWeight | null;
  textTransform: MenuAppearanceTextTransform;
  borderColor: string;
  borderWidth: number;
  shadow: MenuAppearanceShadow;
  sticky: boolean;
  dropdownDirection: MenuAppearanceDropdownDirection;
  mobileMode: MenuAppearanceMobileMode;
};

/**
 * Today's hardcoded shell look. Fields resolved to these values emit the
 * exact legacy declarations (or none at all where the legacy stylesheet has
 * no declaration), which is what guarantees the byte-identity contract.
 */
export const SHELL_APPEARANCE_DEFAULTS: ResolvedShellAppearance = {
  surfaceColor: "transparent",
  linkColor: "inherit",
  linkHoverColor: "rgba(15,23,42,.06)",
  linkActiveColor: null,
  itemGap: 4,
  paddingY: 12,
  paddingX: 24,
  alignment: "space-between",
  fontSize: null,
  fontWeight: null,
  textTransform: "none",
  borderColor: "rgba(15,23,42,.08)",
  borderWidth: 1,
  shadow: "none",
  sticky: false,
  dropdownDirection: "bottom",
  mobileMode: "disclosure",
};

const SHELL_ALIGNMENT_CSS: Record<MenuAppearanceAlignment, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  "space-between": "space-between",
};

const SHELL_SHADOW_CSS: Record<Exclude<MenuAppearanceShadow, "none">, string> = {
  sm: "0 1px 2px rgba(15,23,42,.1)",
  md: "0 8px 24px rgba(15,23,42,.12)",
};

const LEGACY_DEFAULT_COLOR_KEYS = ["surfaceColor", "linkHoverColor", "borderColor"] as const;

const CANONICAL_SHELL_COLOR_DEFAULTS = Object.freeze(
  Object.fromEntries(
    LEGACY_DEFAULT_COLOR_KEYS.map((key) => [
      key,
      normalizeMenuColorValue(SHELL_APPEARANCE_DEFAULTS[key]),
    ])
  ) as Record<(typeof LEGACY_DEFAULT_COLOR_KEYS)[number], string | null>
);

const resolveShellAppearance = (appearance: MenuAppearance | null): ResolvedShellAppearance => {
  const sanitized = sanitizeMenuAppearance(appearance);
  const resolved: ResolvedShellAppearance = {
    ...SHELL_APPEARANCE_DEFAULTS,
    ...sanitized,
  };

  // Menu writes keep canonical color bytes, but an explicitly authored value that is
  // semantically equal to the historical shell default must still render the frozen
  // legacy stylesheet byte-for-byte. This adapter affects render bytes only; it never
  // rewrites the stored canonical document.
  for (const key of LEGACY_DEFAULT_COLOR_KEYS) {
    if (sanitized[key] === CANONICAL_SHELL_COLOR_DEFAULTS[key]) {
      resolved[key] = SHELL_APPEARANCE_DEFAULTS[key];
    }
  }

  return resolved;
};

type ShellRuleSets = {
  /** Breakpoint-independent rules, in stylesheet order. */
  base: string[];
  /** Rules the public stylesheet wraps in the desktop `min-width` query. */
  desktop: string[];
  /** Rules the public stylesheet wraps in the mobile `max-width` query. */
  mobile: string[];
  footer: string;
};

const buildShellRuleSets = (a: ResolvedShellAppearance): ShellRuleSets => {
  const header = `[${SITE_HEADER_ATTRIBUTE}="true"]`;

  const headerDeclarations = [
    a.surfaceColor !== "transparent" ? `background:${a.surfaceColor}` : null,
    `border-bottom:${a.borderWidth}px solid ${a.borderColor}`,
    a.shadow !== "none" ? `box-shadow:${SHELL_SHADOW_CSS[a.shadow]}` : null,
    a.sticky ? "position:sticky;top:0;z-index:50" : null,
  ]
    .filter(Boolean)
    .join(";");

  // Typography applies to both plain links and dropdown group summaries so
  // every top-level nav entry reads the same.
  const itemTypography = [
    a.fontSize !== null ? `font-size:${a.fontSize}px` : null,
    a.fontWeight !== null ? `font-weight:${a.fontWeight}` : null,
    a.textTransform !== "none" ? `text-transform:${a.textTransform}` : null,
  ].filter(Boolean);
  const itemTypographyCss = itemTypography.length > 0 ? `;${itemTypography.join(";")}` : "";
  const summaryColorCss = a.linkColor !== "inherit" ? `;color:${a.linkColor}` : "";

  const base = [
    `${header}{${headerDeclarations}}`,
    `${header} .site-header-inner{margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:${SHELL_ALIGNMENT_CSS[a.alignment]};gap:8px 24px;max-width:1080px;padding:${a.paddingY}px ${a.paddingX}px}`,
    `${header} .site-header-brand{font-weight:600;color:inherit;text-decoration:none}`,
    `${header} .site-nav summary{cursor:pointer;list-style:none}`,
    `${header} .site-nav summary::-webkit-details-marker{display:none}`,
    `${header} .site-nav-list{display:flex;flex-wrap:wrap;align-items:center;gap:${a.itemGap}px;list-style:none;margin:0;padding:0}`,
    `${header} .site-nav-item{position:relative}`,
    `${header} .site-nav-link{display:block;padding:8px 12px;border-radius:6px;color:${a.linkColor};text-decoration:none${itemTypographyCss}}`,
    `${header} .site-nav-link:hover,${header} .site-nav-link:focus-visible,${header} .site-nav-group>summary:hover,${header} .site-nav-group>summary:focus-visible{background:${a.linkHoverColor}}`,
    a.linkActiveColor !== null
      ? `${header} .site-nav-link:active,${header} .site-nav-group>summary:active{background:${a.linkActiveColor}}`
      : null,
    `${header} .site-nav-group>summary{display:block;padding:8px 12px;border-radius:6px${summaryColorCss}${itemTypographyCss}}`,
    `${header} .site-nav-group>summary::after{content:" \\25BE";font-size:.7em}`,
    `${header} .site-nav-sublist{list-style:none;margin:0;padding:6px;display:grid;gap:2px;min-width:180px}`,
    `${header} .site-nav-disclosure{display:none}`,
    `${header} .site-nav-disclosure>summary{padding:8px 12px;border:1px solid rgba(15,23,42,.16);border-radius:6px}`,
  ].filter((line): line is string => line !== null);

  const desktop = [
    `${header} .site-nav-sublist{position:absolute;left:0;${a.dropdownDirection === "top" ? "bottom:100%" : "top:100%"};z-index:40;background:var(--color-bg,#fff);border:1px solid rgba(15,23,42,.12);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12)}`,
  ];

  const mobile = [
    `${header} .site-nav{width:100%}`,
    // "inline" keeps the single shared link list visible (wrapping) below the
    // mobile breakpoint instead of collapsing it behind the disclosure.
    ...(a.mobileMode === "disclosure"
      ? [
          `${header} .site-nav-disclosure{display:block}`,
          `${header} .site-nav-list{display:none}`,
          `${header} .site-nav-disclosure[open]~.site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`,
        ]
      : []),
    `${header} .site-nav-sublist{padding-left:16px}`,
  ];

  return {
    base,
    desktop,
    mobile,
    footer: `[${SITE_FOOTER_ATTRIBUTE}="true"]{border-top:1px solid rgba(15,23,42,.08)}`,
  };
};

export function buildSiteShellCss(appearance: MenuAppearance | null): string {
  const sets = buildShellRuleSets(resolveShellAppearance(appearance));
  return [
    ...sets.base,
    `@media (min-width: ${desktopNavMinWidth}px){`,
    ...sets.desktop,
    `}`,
    `@media (max-width: ${mobileMaxWidth}px){`,
    ...sets.mobile,
    `}`,
    sets.footer,
  ].join("\n");
}

/**
 * Canvas preview variant (TASK-458-03): the menu design canvas constrains
 * the FRAME width per device, but `@media` queries respond to the real
 * admin viewport, so the breakpoint branch is flattened (emitted unwrapped)
 * for the requested device instead. Desktop and tablet share the desktop
 * branch, mirroring the public breakpoint bounds; the footer rule is
 * irrelevant inside the canvas and omitted.
 */
export function buildSiteShellPreviewCss(
  appearance: MenuAppearance | null,
  breakpoint: PageBreakpoint
): string {
  const sets = buildShellRuleSets(resolveShellAppearance(appearance));
  const branch = breakpoint === "mobile" ? sets.mobile : sets.desktop;
  return [...sets.base, ...branch].join("\n");
}
