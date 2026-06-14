import type { MenuAppearance } from "../services/menus/normalizeMenuAppearance";
import type { PageBlockV2, PageBreakpoint, PageDocumentV2 } from "../services/pages/pageDocumentV2";
import {
  PageBlockContent,
  PageBlockFrame,
  PageDocumentRender,
} from "../services/pages/pageRendererV2";
import type { NavigationItem } from "../widgets/core/navigation";
import {
  SITE_FOOTER_ATTRIBUTE,
  SITE_FOOTER_SCOPE_SELECTOR,
  SITE_HEADER_ATTRIBUTE,
} from "./siteShellCss";

/**
 * Public site-shell render layer (TASK-455).
 *
 * `SiteHeaderNav` renders the published navigation menu above every public
 * Page v2 render and `SiteFooter` renders the published footer page-template
 * document below it. Both are server-rendered, ship ZERO client JavaScript,
 * and stay fail closed: a `null` shell part renders nothing.
 *
 * Navigation pattern decision: native `<details>/<summary>` disclosures.
 * - Nested menu items render as a `<details>` dropdown per top-level group
 *   (keyboard accessible, announces expanded/collapsed, no JS).
 * - The mobile collapse is CSS-only: a `<details data-site-nav-disclosure>`
 *   toggle whose `[open]` attribute drives a sibling selector that reveals
 *   the single shared link list below the mobile breakpoint. Desktop hides
 *   the toggle and always shows the row, so the links exist exactly once in
 *   the markup.
 */

// Shell attribute constants and the appearance-driven stylesheet builder
// live in the Bun-free `./siteShellCss` module (TASK-458-02); the attribute
// re-exports keep existing importers working.
export {
  SITE_FOOTER_ATTRIBUTE,
  SITE_FOOTER_SCOPE_SELECTOR,
  SITE_HEADER_ATTRIBUTE,
  SHELL_APPEARANCE_DEFAULTS,
  buildSiteShellCss,
  buildSiteShellPreviewCss,
} from "./siteShellCss";

export type SiteShellNavigation = {
  /** Menu name; used as the accessible label of the `<nav>` landmark. */
  label: string;
  items: NavigationItem[];
};

/**
 * Render-ready site shell threaded through `PageTemplatePropsV2`. Built
 * server-side from `resolvePublicSiteShell()` plus the canonical menu->link
 * mapping (`navigationMenuMapping`).
 */
export type SiteShellRenderProps = {
  navigation: SiteShellNavigation | null;
  /**
   * Published menu appearance threaded to `buildSiteShellCss` (TASK-458-02).
   * `null`/absent = legacy look (the builder's fail-closed defaults).
   */
  navigationAppearance?: MenuAppearance | null;
  /**
   * Published nav extras blocks (TASK-458-03) rendered in the dedicated
   * header extras slot. `null`/absent/empty = no slot markup (legacy menus
   * render byte-identically).
   */
  navigationExtras?: PageBlockV2[] | null;
  footerDocument: PageDocumentV2 | null;
};

const isPubliclyVisibleNavigationItem = (item: NavigationItem) =>
  item.meta?.visibility !== "logged_in";

const hasRealHref = (href: string) => href.trim().length > 0 && href.trim() !== "#";

/**
 * Flattens every publicly visible descendant of a group item into one
 * dropdown level: the shell intentionally supports a single submenu depth
 * (deeper nesting stays reachable instead of unreachable).
 */
const flattenNavigationDescendants = (items: NavigationItem[]): NavigationItem[] => {
  const flat: NavigationItem[] = [];
  for (const item of items) {
    if (!isPubliclyVisibleNavigationItem(item)) continue;
    if (hasRealHref(item.href)) flat.push(item);
    if (item.children && item.children.length > 0) {
      flat.push(...flattenNavigationDescendants(item.children));
    }
  }
  return flat;
};

const SiteNavLink = ({ item }: { item: NavigationItem }) => (
  <a
    className="site-nav-link"
    data-site-nav-link="true"
    href={item.href}
    target={item.target === "blank" ? "_blank" : undefined}
    rel={item.target === "blank" ? "noopener noreferrer" : undefined}
  >
    {item.label}
  </a>
);

const SiteNavItem = ({ item }: { item: NavigationItem }) => {
  const dropdownItems = item.children ? flattenNavigationDescendants(item.children) : [];

  if (dropdownItems.length === 0) {
    if (!hasRealHref(item.href)) return null;
    return (
      <li className="site-nav-item">
        <SiteNavLink item={item} />
      </li>
    );
  }

  // A linked parent stays reachable as the first entry of its own dropdown.
  const entries = hasRealHref(item.href) ? [item, ...dropdownItems] : dropdownItems;

  return (
    <li className="site-nav-item">
      <details className="site-nav-group" data-site-nav-group="true">
        <summary>{item.label}</summary>
        <ul className="site-nav-sublist">
          {entries.map((entry, index) => (
            <li key={`${entry.href}-${index}`}>
              <SiteNavLink item={entry} />
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
};

/**
 * Layout for the dedicated nav extras slot (TASK-458-03). Inline styles keep
 * `buildSiteShellCss(null)` byte-identical for legacy menus: the slot only
 * exists in the markup when published extras exist.
 */
const siteNavExtrasStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 12,
} as const;

export function SiteHeaderNav({
  navigation,
  siteName,
  extras,
}: {
  navigation: SiteShellNavigation;
  siteName?: string | null;
  /** Nav extras blocks (CTA button / logo image), already schema-sanitized. */
  extras?: PageBlockV2[] | null;
}) {
  const items = navigation.items.filter(isPubliclyVisibleNavigationItem);
  const extraBlocks = extras ?? [];
  if (items.length === 0 && extraBlocks.length === 0) return null;

  return (
    <header className="site-header" {...{ [SITE_HEADER_ATTRIBUTE]: "true" }}>
      <div className="site-header-inner">
        {siteName ? (
          <a className="site-header-brand" href="/">
            {siteName}
          </a>
        ) : null}
        {items.length > 0 ? (
          <nav
            className="site-nav"
            aria-label={navigation.label.trim() || "Site navigation"}
            data-site-nav="true"
          >
            <details className="site-nav-disclosure" data-site-nav-disclosure="true">
              <summary>Menu</summary>
            </details>
            <ul className="site-nav-list" data-site-nav-list="true">
              {items.map((item, index) => (
                <SiteNavItem key={`${item.label}-${index}`} item={item} />
              ))}
            </ul>
          </nav>
        ) : null}
        {extraBlocks.length > 0 ? (
          <div className="site-nav-extras" data-site-nav-extras="true" style={siteNavExtrasStyle}>
            {extraBlocks.map((block) => (
              <PageBlockFrame key={block.id} block={block}>
                <PageBlockContent block={block} />
              </PageBlockFrame>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function SiteFooter({
  document,
  breakpoint,
}: {
  document: PageDocumentV2;
  breakpoint?: PageBreakpoint;
}) {
  if (document.sections.length === 0) return null;

  return (
    <footer className="site-footer" {...{ [SITE_FOOTER_ATTRIBUTE]: "true" }}>
      <PageDocumentRender
        document={document}
        breakpoint={breakpoint}
        rootTag="div"
        rootClassName="bg-white text-slate-950"
        emptyContent={null}
      />
    </footer>
  );
}
