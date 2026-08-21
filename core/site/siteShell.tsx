import type { ReactNode } from "react";

import {
  MENU_RESPONSIVE_BREAKPOINT_KEYS,
  hasMenuBlockVisibilityOverride,
  menuDocumentHasScrolledVariantForAnyDevice,
  resolveBrandImageSrc,
  resolveMenuBlockVisibleForDevice,
  resolveMenuBrandStyleForDevice,
  type MenuBlockV2,
  type MenuDocumentV2,
} from "../services/menus/menuDocumentV2";
import {
  hasPublicNavigationHref,
  projectPublicNavigationItems,
  type PublicNavigationItem,
} from "../services/navigation/publicNavigationProjection";
import { lucideKebabIconComponents } from "../services/renderContracts/timelineLucideIcons";
import type { MenuAppearance } from "../services/menus/normalizeMenuAppearance";
import { sanitizeAuthoringLinkHref } from "../services/pages/pageAuthoringSanitizers";
import type { PageBlockV2, PageBreakpoint, PageDocumentV2 } from "../services/pages/pageDocumentV2";
import {
  PageBlockContent,
  PageBlockFrame,
  PageDocumentRender,
} from "../services/pages/pageRendererV2";
import type { NavigationItem } from "../services/renderContracts/navigationRenderer";
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
 * Navigation pattern decision (TASK-502-03): `SiteNavItem` is RECURSIVE and
 * takes TWO interaction modes — nested submenus render one `.site-nav-sublist`
 * per level (bug 7: the old `flattenNavigationDescendants` squashed every
 * descendant into a single level and duplicated the parent link; both deleted).
 * - `interaction="details"` (LEGACY `SiteHeaderNav`, the default): recursive
 *   native `<details>/<summary>` click-open per level, keyboard accessible, no
 *   JS. The audit resolution (option (b)) keeps `<details>` on this path:
 *   `buildSiteShellCss` (the FROZEN base sheet — `siteShellCss.ts`) carries NO
 *   sublist hide/hover rules, so de-detailed plain `<ul>` submenus would render
 *   permanently open, and closed-`<details>` content cannot be CSS-revealed —
 *   hover-open is impossible without JS on the legacy path. A linked parent
 *   stays reachable as the FIRST entry of its DIRECT sublist (a `<summary>` is
 *   not a link). FLAT legacy menus render byte-identical markup to pre-502.
 * - `interaction="hover"` (menu-document `NavItemsRender`): details-FREE nested
 *   `<ul class="site-nav-sublist">` per level; a linked parent renders ONCE as
 *   its own `.site-nav-link`, a linkless (`#`) group as a
 *   `.site-nav-link.site-nav-group-label` span with `tabIndex={0}`. The
 *   DOC-SCOPED sheet (`buildMenuDocumentCss`, TASK-502-02) owns hide-by-default
 *   + per-level `:hover`/`:focus-within` open + fly-out; the group hook is
 *   `data-site-nav-group="true"` on the `<li>` (NOT a `.site-nav-group` class).
 *   `buildSiteShellCss(null)` is untouched by BOTH modes.
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

/**
 * TASK-542-03: public visibility + renderability are owned by the shared
 * projection (`projectPublicNavigationItems`, 542-03-L01). The rendered tree
 * is projected ONCE per render and threaded into BOTH the active-identity
 * resolver and the recursive renderer so index paths cannot drift.
 */

/** DFS path key for an item's position in the projected tree ("0.2.1"). */
const pathKey = (path: readonly number[]) => path.join(".");

/**
 * TASK-504-03: normalize an href/path to a comparable root-relative pathname, or
 * null when it cannot participate in current-page matching. SSR has no reliable
 * request origin, so ONLY root-relative internal paths ("/...") match — external
 * URLs, "#", mailto:, tel:, and protocol-relative hrefs never mark active
 * (conscious, mirrors the client widget's same-origin guard).
 */
export const normalizeNavPath = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "#") return null;
  if (trimmed.startsWith("//")) return null; // protocol-relative (//host) ⇒ external ⇒ never active
  if (!trimmed.startsWith("/")) return null; // external / anchor / scheme ⇒ never active
  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? trimmed; // drop query + fragment
  const noTrailing = pathOnly.replace(/\/+$/, "");
  return noTrailing === "" ? "/" : noTrailing;
};

/**
 * TASK-504-03: resolve the single winning current-page href across the RENDERED
 * item tree. Walks the SAME filtered tree `SiteNavItem` renders (publicly-visible
 * + renderable), so a hidden/non-rendered item can never win and orphan the
 * stamp. `pathname` match: current === target OR current startsWith `${target}/`
 * (root "/" only matches current "/"); longest matching target wins (most
 * specific). Returns the normalized winning path (compared by `SiteNavLink`), or
 * null when `activePath` is absent.
 */
export const resolveMenuActiveHref = (
  items: NavigationItem[],
  activePath: string | null | undefined
): string | null => {
  if (!activePath) return null; // absent ⇒ no stamp (byte-identical)
  const current = normalizeNavPath(activePath) ?? "/";
  let best: string | null = null;
  // TASK-542-03: the shared projection owns visibility + renderability, so the
  // back-compat href winner walks the SAME projected tree the render consumes.
  const projected = projectPublicNavigationItems(items);
  const visit = (list: readonly PublicNavigationItem[]) => {
    for (const item of list) {
      const target = normalizeNavPath(item.href);
      if (target) {
        const matches =
          target === "/" ? current === "/" : current === target || current.startsWith(`${target}/`);
        if (matches && (best === null || target.length > best.length)) best = target;
      }
      if (item.children?.length) visit(item.children);
    }
  };
  visit(projected);
  return best;
};

type SiteNavInteraction = "details" | "hover";

/**
 * TASK-542-03: identity-based current-page resolution. Walks the SAME
 * PROJECTED tree the renderer consumes (renderable-only, hidden branches
 * removed) so index paths cannot drift and a hidden item can never win.
 * Returns the DFS path key ("0.2.1") of the winning link, or null when
 * `activePath` is absent. Longest normalized target wins; an equal-length
 * tie keeps the FIRST DFS match (so duplicate hrefs stamp exactly ONE
 * link — the href-only `resolveMenuActiveHref` above stays exported for
 * back-compat, but the render stamps by identity).
 */
export const resolveMenuActiveItemPath = (
  items: readonly PublicNavigationItem[],
  activePath: string | null | undefined
): string | null => {
  if (!activePath) return null; // absent ⇒ no stamp (byte-identical)
  const current = normalizeNavPath(activePath) ?? "/";
  let winnerLength = 0;
  let winnerKey: string | null = null;
  const visit = (nodes: readonly PublicNavigationItem[], parentPath: readonly number[] = []) => {
    nodes.forEach((item, index) => {
      const itemPath = [...parentPath, index];
      const target = normalizeNavPath(item.href);
      if (target) {
        const matches =
          target === "/" ? current === "/" : current === target || current.startsWith(`${target}/`);
        // Strict `>` keeps the FIRST DFS match on equal-length duplicates.
        if (matches && target.length > winnerLength) {
          winnerLength = target.length;
          winnerKey = pathKey(itemPath);
        }
      }
      visit(item.children ?? [], itemPath);
    });
  };
  visit(items);
  return winnerKey;
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

const SiteNavLink = ({
  item,
  itemPath,
  activeIdentity,
}: {
  item: PublicNavigationItem;
  /** TASK-542-03: this item's DFS path in the projected tree ("0.2.1"). */
  itemPath: readonly number[];
  /** TASK-542-03: winning current-page path key; undefined ⇒ no stamp ⇒ legacy byte-identical. */
  activeIdentity?: string | null;
}) => {
  const isButton = item.meta?.variant === "button";
  const isCurrent = activeIdentity != null && pathKey(itemPath) === activeIdentity;
  return (
    <a
      className="site-nav-link"
      data-site-nav-link="true"
      data-site-nav-variant={isButton ? "button" : undefined}
      style={isButton ? siteNavButtonStyle : undefined}
      href={item.href}
      target={item.target === "blank" ? "_blank" : undefined}
      rel={item.target === "blank" ? "noopener noreferrer" : undefined}
      aria-current={isCurrent ? "page" : undefined}
    >
      {item.label}
    </a>
  );
};

const SiteNavItem = ({
  item,
  itemPath,
  interaction = "details", // fail-safe default: works with the frozen base sheet alone
  activeIdentity,
}: {
  item: PublicNavigationItem;
  /** TASK-542-03: DFS path of THIS item ("0", "0.2", ...); children append their projected index. */
  itemPath: readonly number[];
  interaction?: SiteNavInteraction;
  /** TASK-542-03: forwarded to this item's link AND recursive children; undefined ⇒ no stamp. */
  activeIdentity?: string | null;
}) => {
  // TASK-542-03: `item.children` are already PROJECTED (hidden branches and
  // dead leaves removed by the shared projection), so the recursive indices
  // match the identity paths exactly.
  const children = item.children ?? [];

  if (children.length === 0) {
    if (!hasPublicNavigationHref(item.href)) return null; // unchanged leaf semantics
    return (
      <li className="site-nav-item">
        <SiteNavLink item={item} itemPath={itemPath} activeIdentity={activeIdentity} />
      </li>
    );
  }

  const sublist = (
    <ul className="site-nav-sublist">
      {interaction === "details" && hasPublicNavigationHref(item.href) ? (
        // Details-mode reachability convention (audit resolution, option (b)):
        // a <summary> is not a link, so the linked parent stays reachable as
        // the FIRST entry of its DIRECT sublist (never flattened descendants).
        // Conscious trade-off: the "label exactly once" guarantee is a
        // hover-mode property; details mode trades it for parent reachability.
        <li className="site-nav-item">
          <SiteNavLink item={item} itemPath={itemPath} activeIdentity={activeIdentity} />
        </li>
      ) : null}
      {children.map((child, index) => (
        <SiteNavItem
          key={`${child.label}-${index}`}
          item={child}
          itemPath={[...itemPath, index]}
          interaction={interaction}
          activeIdentity={activeIdentity}
        />
      ))}
    </ul>
  );

  if (interaction === "details") {
    return (
      <li className="site-nav-item">
        <details className="site-nav-group" data-site-nav-group="true">
          <summary>{item.label}</summary>
          {sublist}
        </details>
      </li>
    );
  }

  // hover mode (menu-document headers): the parent renders ONCE as its own link
  // (or a plain group label when it links nowhere); 502-02's doc-scoped CSS owns
  // hide-by-default + per-level :hover/:focus-within open + fly-out. The group
  // hook moves onto the <li> so 502-02 targets
  // `li[data-site-nav-group="true"]>.site-nav-link::after` (caret) and anchors
  // the sublist without a `.site-nav-group` class.
  return (
    <li className="site-nav-item" data-site-nav-group="true">
      {hasPublicNavigationHref(item.href) ? (
        <SiteNavLink item={item} itemPath={itemPath} activeIdentity={activeIdentity} />
      ) : (
        // BOTH classes (502-02 Coordination): link color/typography/caret rules
        // target `.site-nav-link`, so group labels style with no new selectors.
        // tabIndex={0} (parent NORMATIVE keyboard contract): spans are not
        // focusable by default and children inside `display:none` cannot receive
        // focus, so without it 502-02's :focus-within open rule could NEVER fire
        // for this subtree (keyboard-unreachable; the replaced <summary> was).
        <span className="site-nav-link site-nav-group-label" tabIndex={0}>
          {item.label}
        </span>
      )}
      {sublist}
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
  // TASK-542-03: the shared projection owns public visibility + renderability
  // (hidden subtrees, dead leaves, linkless-group preservation) — the legacy
  // header renders the same projected tree the document path uses.
  const items = projectPublicNavigationItems(navigation.items);
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
                <SiteNavItem
                  key={`${item.label}-${index}`}
                  item={item}
                  itemPath={[index]}
                  interaction="details"
                />
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
 * TASK-506 front-hook contract (ASSERTED no-change — see TASK-506-03). The five
 * 506 modern-styling bundles (B1 separators, B2 indicator/hover/lift, B3
 * caret/flyout-animation, B4 pill + dropdown padding, B5 nested placement) and
 * the two foundations (F1 base-reset, F2 visible-default) are PURE CSS emitted
 * from the doc-scoped `buildMenuDocumentCss` sheet on the EXISTING markup hooks
 * below — 506 adds NO new markup, class, or aria attribute here. Do NOT "clean
 * up" any of these load-bearing hooks:
 *   li.site-nav-item[:not(:last-child)]         — B1 separators, every level
 *   li[data-site-nav-group="true"]              — B3 caret target + :hover/:focus-within zero-JS open
 *   a.site-nav-link / span.site-nav-link.site-nav-group-label[tabIndex=0]
 *                                               — B2 ::before bar, B3 :focus-within reach
 *   ul.site-nav-sublist (nested)                — B4 container padding, B5 placement
 *   .site-nav-list                              — B4 pill wrapper
 *   .site-nav-link:where([aria-current="page"]) — B2 indicator-on-current (504-03 stamp)
 * Every 506-02 rule keys ONLY off these selectors (verified: the sole non-hook
 * selector in the emitted sheet is the pre-existing doc-scope root). If a future
 * bundle ever needs a data-attr hook it lands HERE (sole writer) present-only
 * (undefined ⇒ attribute absent ⇒ byte-identical) AND mirrors into
 * `renderPreviewNavItem` (MenuDesignEditor.tsx). See TASK-506-03.
 *
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
    // TASK-501-02: a responsive visibility override hands gating to the
    // per-branch CSS hide rules (`buildMenuDocumentCss`) — the frame must NOT
    // skip, so a show-only-on-mobile leaf (flat `visible:false` + mobile
    // `visible:true`) renders its frame and the DESKTOP branch hide rule keeps
    // it invisible ≥640px. Blocks without an override keep the flat
    // render-time semantics byte-unchanged.
    visibility: hasMenuBlockVisibilityOverride(block)
      ? { visible: true }
      : ("visibility" in block && block.visibility) || { visible: true },
  }) as PageBlockV2;

/**
 * TASK-501-02 render gate: a block WITH a responsive visibility override is
 * DOM-rendered whenever it is visible on AT LEAST ONE device (the per-branch
 * CSS hide rules gate it per viewport); visible-on-neither blocks render no
 * markup and emit no CSS. Blocks without an override keep the legacy path
 * unchanged.
 */
// Derive the enumeration from the model (TASK-502-01 added "tablet" to
// MENU_RESPONSIVE_BREAKPOINT_KEYS) so the gate can NEVER drift from the key
// list: a show-only-on-tablet block (flat `visible:false` +
// `responsive.tablet.visibility.visible:true`) resolves false on desktop AND
// mobile — the pre-502 OR would DOM-skip it and 502-02's tablet-branch show
// rule would have no node to reveal. Pre-tablet docs are bit-identical (no
// tablet override can exist ⇒ identical OR result).
const MENU_RENDER_DEVICES = ["desktop", ...MENU_RESPONSIVE_BREAKPOINT_KEYS] as const;

const shouldRenderMenuBlock = (block: MenuBlockV2): boolean =>
  !hasMenuBlockVisibilityOverride(block) ||
  MENU_RENDER_DEVICES.some((device) => resolveMenuBlockVisibleForDevice(block, device));

const MENU_UTILITY_DEFAULT_LABEL: Record<"search" | "account" | "language", string> = {
  search: "Search",
  account: "Account",
  language: "Language",
};

const NavItemsRender = ({
  items,
  label,
  blockId,
  activeIdentity,
}: {
  /** TASK-542-03: the PROJECTED tree (hidden/dead branches already removed). */
  items: PublicNavigationItem[];
  label: string;
  /** TASK-501-02: inert visibility hook stamped on the `<nav>` LANDMARK (the ancestor above `.site-nav-list`). */
  blockId: string;
  /** TASK-542-03: winning current-page path key forwarded into the recursive nav tree; undefined ⇒ no stamp. */
  activeIdentity?: string | null;
}) => {
  if (items.length === 0) return null;
  return (
    <nav
      className="site-nav"
      aria-label={label.trim() || "Site navigation"}
      data-site-nav="true"
      data-menu-block-id={blockId}
    >
      <details className="site-nav-disclosure" data-site-nav-disclosure="true">
        <summary>Menu</summary>
      </details>
      <ul className="site-nav-list" data-site-nav-list="true">
        {items.map((item, index) => (
          <SiteNavItem
            key={`${item.label}-${index}`}
            item={item}
            itemPath={[index]}
            interaction="hover"
            activeIdentity={activeIdentity}
          />
        ))}
      </ul>
    </nav>
  );
};

const BrandRender = ({
  block,
  siteName,
  breakpoint,
}: {
  block: Extract<MenuBlockV2, { type: "brand" }>;
  siteName?: string | null;
  /**
   * TASK-520-04-L01: current device breakpoint (front + canvas). Resolves the
   * per-device `BrandStyle` (incl. the new `iconColor`/`iconSize` for icon mode).
   * Absent ⇒ "desktop" (back-compat: the caller may thread this in either order).
   */
  breakpoint?: PageBreakpoint;
}) => {
  // Defense in depth: the write + stored-read normalizers already scrub
  // brand.href through sanitizeAuthoringLinkHref, but re-sanitize at the DOM
  // seam so no unsafe scheme (`javascript:`/`data:`/`vbscript:`) can ever be
  // SSR-emitted into the public header anchor.
  const href = sanitizeAuthoringLinkHref(block.props.href) ?? "/";
  // TASK-520-04-L01: resolve the per-device brand style (icon color/size live
  // here). resolveMenuBrandStyleForDevice accepts a MenuDeviceKind, which is the
  // same "desktop"|"tablet"|"mobile" union as PageBreakpoint.
  const style = resolveMenuBrandStyleForDevice(block, breakpoint ?? "desktop");
  // Fallback CHAIN (parent contract, TASK-502-01/03): per-menu override →
  // site name → null. 502-01 stores `text` trimmed/capped/sparse; trim again =
  // defense in depth. Empty `siteName` is falsy ⇒ treated as absent.
  const wordmark = block.props.text?.trim() || siteName || null;
  // TASK-520-04-L01: combo is opt-in (`showText:true`) on a graphic mode.
  const showText = block.props.showText === true;

  // Resolve a graphic node per mode (icon | image); null when none is authored.
  let graphic: ReactNode = null;
  if (block.props.mode === "icon" && block.props.icon) {
    // ALLOWLIST resolution: the validated kebab name is resolved against the
    // lucide set (the effective allowlist). An unknown/unresolvable name yields
    // `undefined` ⇒ NO graphic ⇒ falls through to the wordmark chain below
    // (never emits the raw name into markup).
    // SECURITY (TASK-520 audit finding 5): `lucideKebabIconComponents` is built
    // via `Object.fromEntries`, so it inherits `Object.prototype`. A reserved
    // key like `"constructor"` passes the kebab pattern AND resolves to an
    // inherited function (truthy) — rendering `<Object/>` throws "Objects are
    // not valid as a React child" during SSR of the PUBLIC header (stored DoS).
    // Gate on an OWN property so inherited prototype members can never resolve.
    const iconName = block.props.icon;
    const Icon = Object.prototype.hasOwnProperty.call(lucideKebabIconComponents, iconName)
      ? lucideKebabIconComponents[iconName]
      : undefined;
    if (Icon) {
      const iconSize = style.iconSize ?? 24;
      // TASK-542-03: NO inline `style.color` — the doc-scoped CSS
      // (`[data-menu-block-id] svg{color:...}`, TASK-542-02) owns the icon tint
      // on BOTH front (`buildMenuDocumentCss`) and canvas preview
      // (`buildMenuDocumentPreviewCss`); lucide fills `currentColor`. Width/
      // height stay presentation attributes (SSR baseline, media-delta CSS
      // overrides them per device).
      graphic = <Icon aria-hidden="true" width={iconSize} height={iconSize} />;
    }
  } else if (block.props.mode === "image") {
    // TASK-504-03 (defect B1): resolve the brand image `src` through the SINGLE
    // shared resolver. GUARD on a resolved src so an image-mode brand with NO
    // logo falls through to the text/site-name fallback instead of an empty
    // placeholder. The <img> is SIZED by 504-02's `[data-menu-block-id] img{}`
    // rule; this subtask emits NO CSS.
    const brandImage = block.props.image;
    const resolvedSrc = resolveBrandImageSrc(brandImage);
    if (resolvedSrc) {
      const imageBlock = {
        id: block.id,
        type: "image",
        props: brandImage,
        visibility: { visible: true },
      } as PageBlockV2;
      graphic = <PageBlockContent block={imageBlock} />;
    }
  }

  // Compose:
  //  - graphic + showText + wordmark ⇒ graphic + wordmark side by side (COMBO)
  //  - graphic only                  ⇒ image-only / icon-only (today's image path)
  //  - graphic absent                ⇒ wordmark (text mode / graphic-without-graphic)
  if (graphic && showText && wordmark) {
    return (
      <a
        className="site-header-brand site-header-brand--combo inline-flex items-center gap-2"
        href={href}
        data-menu-block-id={block.id}
      >
        {graphic}
        <span className="site-header-brand-text">{wordmark}</span>
      </a>
    );
  }
  if (graphic) {
    return (
      <a className="site-header-brand" href={href} data-menu-block-id={block.id}>
        {graphic}
      </a>
    );
  }
  if (!wordmark) return null;
  return (
    <a className="site-header-brand" href={href} data-menu-block-id={block.id}>
      {wordmark}
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
    <span
      className="site-nav-utility"
      data-site-nav-utility={block.type}
      data-menu-block-id={block.id}
    >
      {label}
    </span>
  );
};

/**
 * TASK-520-04-L02: the scroll-state machine — a dependency-free, idempotent IIFE
 * emitted as a STATIC string literal (no interpolation of stored/user data ⇒ no
 * injection surface). It toggles `data-scrolled="true"` on THIS `<header
 * data-site-menu-doc>` once the page scrolls past an 8px threshold, so the
 * TASK-520-02 `[data-scrolled="true"]` CSS applies (the floating-header effect).
 *
 * - Self-targets via `document.currentScript.closest('[data-site-menu-doc="true"]')`
 *   with a `querySelector` fallback for browsers where `currentScript` is not
 *   available at execution time.
 * - Passive scroll/resize listeners + a `requestAnimationFrame` throttle flag (no
 *   scroll jank).
 * - Sets the initial state on load (deep-link / reload mid-page).
 * - Reduced-motion is honored by construction: the machine only toggles an
 *   attribute (NO JS-driven animation, NO scroll-behavior mutation) — any
 *   transition is owned by the CSS layer, which gates it on prefers-reduced-motion.
 */
const MENU_SCROLL_STATE_MACHINE = [
  "(function(){",
  "var h=document.currentScript&&document.currentScript.closest?document.currentScript.closest('[data-site-menu-doc=\"true\"]'):null;",
  "if(!h)h=document.querySelector('[data-site-menu-doc=\"true\"]');",
  "if(!h)return;",
  "var t=8,f=false;",
  "function u(){f=false;var s=(window.scrollY||window.pageYOffset)>t;",
  'if(s)h.setAttribute("data-scrolled","true");else h.removeAttribute("data-scrolled");}',
  "function o(){if(!f){f=true;requestAnimationFrame(u);}}",
  'window.addEventListener("scroll",o,{passive:true});',
  'window.addEventListener("resize",o,{passive:true});',
  "u();",
  "})();",
].join("");

export function SiteHeaderMenuDocumentRender({
  document,
  navigation,
  siteName,
  activePath,
  breakpoint,
}: {
  document: MenuDocumentV2;
  /** The SAME mapped item tree `SiteHeaderNav` uses; `null` at zero items. */
  navigation: SiteShellNavigation | null;
  siteName?: string | null;
  /** Accepted for parity with the preview seam; the front uses viewport CSS. */
  breakpoint?: PageBreakpoint;
  /**
   * TASK-504-03: the current request path (front only; `null` in preview/canvas).
   * Resolved against the RENDERED item tree to stamp `aria-current="page"` on the
   * winning link; absent/null ⇒ zero stamps ⇒ byte-identical menu-document render.
   */
  activePath?: string | null;
}) {
  const items = projectPublicNavigationItems(navigation?.items ?? []);
  const navLabel = navigation?.label ?? "Site navigation";
  // TASK-542-03: identity-based winner over the SAME projected array the
  // renderer consumes — indices cannot drift and duplicates stamp ONE link.
  const activeIdentity = resolveMenuActiveItemPath(items, activePath);
  const blocks = document.sections[0]?.blocks ?? [];

  // TASK-520-04-L02: scroll-state machine gate. Emit the tiny front-only inline
  // script ONLY when (a) it is the front (activePath is a string; null in
  // preview/canvas), AND (b) menuDocumentHasScrolledVariantForAnyDevice —
  // ANY effective device layout (desktop/tablet/mobile) is sticky AND authors a
  // scrolled-variant key. TASK-542-03 defect fix: the old gate read only
  // `document.sections[0]?.layout` (the desktop base bar), so a tablet/mobile-
  // only authored scrolled variant never armed the script. The CSS media rules
  // decide which device visibly responds; the script remains ONE static,
  // front-only instance. The base keys `radius`/`shadowCustom` are
  // state-independent and do NOT arm the machine.
  const isFront = typeof activePath === "string";
  const emitScrollMachine = isFront && menuDocumentHasScrolledVariantForAnyDevice(document);

  return (
    <header
      className="site-header"
      {...{ [SITE_HEADER_ATTRIBUTE]: "true", [SITE_MENU_DOC_ATTRIBUTE]: "true" }}
    >
      <style>{buildMenuDocumentCss(document)}</style>
      {emitScrollMachine && (
        <script dangerouslySetInnerHTML={{ __html: MENU_SCROLL_STATE_MACHINE }} />
      )}
      <div className="site-header-inner">
        {blocks.filter(shouldRenderMenuBlock).map((block) => {
          switch (block.type) {
            case "nav-items":
              return (
                <NavItemsRender
                  key={block.id}
                  items={items}
                  label={navLabel}
                  blockId={block.id}
                  activeIdentity={activeIdentity}
                />
              );
            case "brand":
              return (
                <BrandRender
                  key={block.id}
                  block={block}
                  siteName={siteName}
                  breakpoint={breakpoint}
                />
              );
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
  peerSpotlightOn = false,
}: {
  document: PageDocumentV2;
  breakpoint?: PageBreakpoint;
  /**
   * TASK-535 — whether the PRIMARY (`<main>`) page document authors a cursor
   * spotlight. Threaded so the footer (secondary) suppresses its own copy of the
   * single viewport-fixed spotlight overlay DIV when the primary already emits it,
   * yet still emits the overlay for a FOOTER-ONLY spotlight.
   */
  peerSpotlightOn?: boolean;
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
        // TASK-535 — the footer is the SECONDARY page document. Idempotent effect
        // stylesheets (reveal/composition/spotlight CSS + noscript) still emit here
        // present-only so a FOOTER-ONLY effect is styled; only the viewport-fixed
        // spotlight OVERLAY DIV is de-duplicated across documents — the footer
        // suppresses it when the primary already emits it (`peerSpotlightOn`), but
        // still emits it for a footer-only spotlight. The runtime <script> emits
        // here too (self-guards at runtime), so footer-only motion keeps working.
        documentRole="secondary"
        peerSpotlightOn={peerSpotlightOn}
      />
    </footer>
  );
}
