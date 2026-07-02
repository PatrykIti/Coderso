import type { MenuBlockV2, MenuDocumentV2 } from "../services/menus/menuDocumentV2";
import type { MenuAppearance } from "../services/menus/normalizeMenuAppearance";
import { sanitizeAuthoringLinkHref } from "../services/pages/pageAuthoringSanitizers";
import type { PageBlockV2, PageBreakpoint, PageDocumentV2 } from "../services/pages/pageDocumentV2";
import {
  PageBlockContent,
  PageBlockFrame,
  PageDocumentRender,
} from "../services/pages/pageRendererV2";
import type { NavigationItem } from "../widgets/core/navigation";
import { SITE_MENU_DOC_ATTRIBUTE, buildMenuDocumentCss } from "./menuDocumentCss";
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
  /**
   * Published menu design document (TASK-499-04). Present ⇒ render the custom
   * menu (`SiteHeaderMenuDocumentRender`); `null`/absent/empty ⇒ default
   * `SiteHeaderNav` (byte-identical to today). Cleared document ⇒ envelope key
   * deleted (TASK-499-02) ⇒ `null` ⇒ default.
   */
  navigationDocument?: MenuDocumentV2 | null;
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

/**
 * TASK-499-01: server-rendered "button" nav affordance. Applied via an inline
 * `style` (precedent: `siteNavExtrasStyle`) + a `data-site-nav-variant` marker,
 * NEVER a rule in `buildSiteShellCss` — so a default (link) item emits markup
 * AND head CSS byte-identical to today (`buildSiteShellCss(null)` untouched).
 */
const siteNavButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 8,
  padding: "8px 14px",
  background: "var(--color-primary, #0d9488)",
  color: "#ffffff",
  fontWeight: 600,
  textDecoration: "none",
} as const;

const SiteNavLink = ({ item }: { item: NavigationItem }) => {
  const isButton = item.meta?.variant === "button";
  return (
    <a
      className="site-nav-link"
      data-site-nav-link="true"
      data-site-nav-variant={isButton ? "button" : undefined}
      style={isButton ? siteNavButtonStyle : undefined}
      href={item.href}
      target={item.target === "blank" ? "_blank" : undefined}
      rel={item.target === "blank" ? "noopener noreferrer" : undefined}
    >
      {item.label}
    </a>
  );
};

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

/**
 * TASK-499-04: document-driven menu header. Analogous to `SiteHeaderNav` but
 * composed from a published `menuDocumentV2`: it renders the first (`menu-bar`)
 * section's blocks in order and its OWN scoped appearance sheet
 * (`buildMenuDocumentCss`), while REUSING the exact `site-header` /
 * `site-header-inner` / `site-nav-*` class names + `SiteNavItem` markup so the
 * base layout sheet (`buildSiteShellCss`, emitted once in the head) and the
 * dropdown/mobile/a11y semantics are identical. Server-rendered, ZERO client
 * JavaScript, fail-closed (an unreadable document never reaches here — the
 * resolver already degraded it to `null` ⇒ the default path ran).
 *
 * The `menu-drawer` section is intentionally NOT front-rendered yet: the mobile
 * collapse is handled by the `menu-bar` CSS `@media` disclosure (like today's
 * shell), so only `sections[0]` is composed here.
 */
const MENU_LEAF_TO_PAGE_TYPE = {
  "cta-button": "button",
  divider: "divider",
  spacer: "spacer",
} as const;

const menuLeafToPageBlock = (block: MenuBlockV2): PageBlockV2 =>
  ({
    id: block.id,
    type: MENU_LEAF_TO_PAGE_TYPE[block.type as keyof typeof MENU_LEAF_TO_PAGE_TYPE],
    props: block.props,
    style: "style" in block ? block.style : undefined,
    visibility: ("visibility" in block && block.visibility) || { visible: true },
  }) as PageBlockV2;

const MENU_UTILITY_DEFAULT_LABEL: Record<"search" | "account" | "language", string> = {
  search: "Search",
  account: "Account",
  language: "Language",
};

const NavItemsRender = ({ items, label }: { items: NavigationItem[]; label: string }) => {
  if (items.length === 0) return null;
  return (
    <nav className="site-nav" aria-label={label.trim() || "Site navigation"} data-site-nav="true">
      <details className="site-nav-disclosure" data-site-nav-disclosure="true">
        <summary>Menu</summary>
      </details>
      <ul className="site-nav-list" data-site-nav-list="true">
        {items.map((item, index) => (
          <SiteNavItem key={`${item.label}-${index}`} item={item} />
        ))}
      </ul>
    </nav>
  );
};

const BrandRender = ({
  block,
  siteName,
}: {
  block: Extract<MenuBlockV2, { type: "brand" }>;
  siteName?: string | null;
}) => {
  // Defense in depth: the write + stored-read normalizers already scrub
  // brand.href through sanitizeAuthoringLinkHref, but re-sanitize at the DOM
  // seam so no unsafe scheme (`javascript:`/`data:`/`vbscript:`) can ever be
  // SSR-emitted into the public header anchor.
  const href = sanitizeAuthoringLinkHref(block.props.href) ?? "/";
  if (block.props.mode === "image" && block.props.image) {
    const imageBlock = {
      id: block.id,
      type: "image",
      props: block.props.image,
      visibility: { visible: true },
    } as PageBlockV2;
    return (
      <a className="site-header-brand" href={href}>
        <PageBlockContent block={imageBlock} />
      </a>
    );
  }
  if (!siteName) return null;
  return (
    <a className="site-header-brand" href={href}>
      {siteName}
    </a>
  );
};

const MenuUtilityRender = ({
  block,
}: {
  block: Extract<MenuBlockV2, { type: "search" | "account" | "language" }>;
}) => {
  const label = block.props.label?.trim() || MENU_UTILITY_DEFAULT_LABEL[block.type];
  return (
    <span className="site-nav-utility" data-site-nav-utility={block.type}>
      {label}
    </span>
  );
};

export function SiteHeaderMenuDocumentRender({
  document,
  navigation,
  siteName,
}: {
  document: MenuDocumentV2;
  /** The SAME mapped item tree `SiteHeaderNav` uses; `null` at zero items. */
  navigation: SiteShellNavigation | null;
  siteName?: string | null;
  /** Accepted for parity with the preview seam; the front uses viewport CSS. */
  breakpoint?: PageBreakpoint;
}) {
  const items = (navigation?.items ?? []).filter(isPubliclyVisibleNavigationItem);
  const navLabel = navigation?.label ?? "Site navigation";
  const blocks = document.sections[0]?.blocks ?? [];

  return (
    <header
      className="site-header"
      {...{ [SITE_HEADER_ATTRIBUTE]: "true", [SITE_MENU_DOC_ATTRIBUTE]: "true" }}
    >
      <style>{buildMenuDocumentCss(document)}</style>
      <div className="site-header-inner">
        {blocks.map((block) => {
          switch (block.type) {
            case "nav-items":
              return <NavItemsRender key={block.id} items={items} label={navLabel} />;
            case "brand":
              return <BrandRender key={block.id} block={block} siteName={siteName} />;
            case "search":
            case "account":
            case "language":
              return <MenuUtilityRender key={block.id} block={block} />;
            case "cta-button":
            case "divider":
            case "spacer": {
              const leaf = menuLeafToPageBlock(block);
              return (
                <PageBlockFrame key={block.id} block={leaf}>
                  <PageBlockContent block={leaf} />
                </PageBlockFrame>
              );
            }
            default:
              return null;
          }
        })}
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
