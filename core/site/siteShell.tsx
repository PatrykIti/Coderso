import type { PageBreakpoint, PageDocumentV2 } from "../services/pages/pageDocumentV2";
import { PageDocumentRender } from "../services/pages/pageRendererV2";
import { pageResponsiveMediaBounds } from "../services/pages/pageResponsiveCss";
import type { NavigationItem } from "../widgets/core/navigation";

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

export const SITE_HEADER_ATTRIBUTE = "data-site-header" as const;
export const SITE_FOOTER_ATTRIBUTE = "data-site-footer" as const;

/**
 * Scope prefix for the footer template's responsive CSS so its
 * section/block rules can never collide with the page document's rules
 * (distinct scope per the TASK-455 contract).
 */
export const SITE_FOOTER_SCOPE_SELECTOR = `[${SITE_FOOTER_ATTRIBUTE}="true"]` as const;

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
  footerDocument: PageDocumentV2 | null;
};

const mobileMaxWidth = pageResponsiveMediaBounds.mobile.maxWidth;
const desktopNavMinWidth = pageResponsiveMediaBounds.tablet.minWidth;

/**
 * Handwritten shell CSS (emitted inline with the page so the shell needs no
 * stylesheet build step). Every rule is scoped under the shell data
 * attributes; breakpoints reuse the owned responsive contract bounds.
 */
export const SITE_SHELL_CSS = `
[${SITE_HEADER_ATTRIBUTE}="true"]{border-bottom:1px solid rgba(15,23,42,.08)}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-header-inner{margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 24px;max-width:1080px;padding:12px 24px}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-header-brand{font-weight:600;color:inherit;text-decoration:none}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav summary{cursor:pointer;list-style:none}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav summary::-webkit-details-marker{display:none}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-list{display:flex;flex-wrap:wrap;align-items:center;gap:4px;list-style:none;margin:0;padding:0}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-item{position:relative}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-link{display:block;padding:8px 12px;border-radius:6px;color:inherit;text-decoration:none}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-link:hover,[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-link:focus-visible,[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-group>summary:hover,[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-group>summary:focus-visible{background:rgba(15,23,42,.06)}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-group>summary{display:block;padding:8px 12px;border-radius:6px}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-group>summary::after{content:" \\25BE";font-size:.7em}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-sublist{list-style:none;margin:0;padding:6px;display:grid;gap:2px;min-width:180px}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-disclosure{display:none}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-disclosure>summary{padding:8px 12px;border:1px solid rgba(15,23,42,.16);border-radius:6px}
@media (min-width: ${desktopNavMinWidth}px){
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-sublist{position:absolute;left:0;top:100%;z-index:40;background:var(--color-bg,#fff);border:1px solid rgba(15,23,42,.12);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12)}
}
@media (max-width: ${mobileMaxWidth}px){
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav{width:100%}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-disclosure{display:block}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-list{display:none}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-disclosure[open]~.site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}
[${SITE_HEADER_ATTRIBUTE}="true"] .site-nav-sublist{padding-left:16px}
}
[${SITE_FOOTER_ATTRIBUTE}="true"]{border-top:1px solid rgba(15,23,42,.08)}
`.trim();

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

export function SiteHeaderNav({
  navigation,
  siteName,
}: {
  navigation: SiteShellNavigation;
  siteName?: string | null;
}) {
  const items = navigation.items.filter(isPubliclyVisibleNavigationItem);
  if (items.length === 0) return null;

  return (
    <header className="site-header" {...{ [SITE_HEADER_ATTRIBUTE]: "true" }}>
      <div className="site-header-inner">
        {siteName ? (
          <a className="site-header-brand" href="/">
            {siteName}
          </a>
        ) : null}
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
