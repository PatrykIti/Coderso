# TASK-504-03

# FileName: TASK-504-03-Front-Aria-Current-Stamp.md

**Parent Task:** TASK-504
**Priority:** High
**Category:** Site Shell / Front render
**Estimated Effort:** Small
**Depends on:** TASK-504-02 (emits the `:where([aria-current="page"])` current-page rule
this stamp activates) — but the markup change here is independent of 504-02's CSS and can
land before it (the attribute is inert with no rule). Consumes TASK-502-01/02
(`SiteHeaderMenuDocumentRender`, `NavItemsRender`, hover-mode `SiteNavItem`,
`data-menu-block-id` brand stamp) and the TASK-455 shell threading
(`PageTemplatePropsV2` → `DefaultRuntimePageShellV2`).
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Goal (single responsibility)

Make the document-driven header stamp `aria-current="page"` on the nav link (top-level OR
nested) that matches the current request path, so TASK-504-02's current-page CSS rule
(`${scope} .site-nav-link:where([aria-current="page"])`) has a node to target. The
document header is server-rendered with **ZERO client JavaScript** (`siteShell.tsx:307`),
so the stamp is computed at SSR from a threaded `activePath` — NOT by the client
`updateNavigationActiveLinks` widget path (which only runs on the legacy `navigation`
widget, not the menu-document header).

**Scope discipline:** the new nav markup is the `aria-current="page"` attribute only — no new
class, no new element, no `data-*` on nav links. The brand `data-menu-block-id` stamp already
exists (`siteShell.tsx:414` image mode + `:428` text mode — confirmed present, TASK-502; **no
change**). `buildSiteShellCss` / `siteShellCss.ts` base sheet stays **byte-identical** (expected
ZERO edits — this subtask emits NO CSS; the rules are 504-02's).

**Second in-scope deliverable — fix the front brand IMAGE render (defect B1, HIGH; see §5).**
Because `siteShell.tsx` is 504-03's SOLE-writer file, the front half of the brand-image fix lands
here: `MenuBrandRender` (`:406-417`) currently passes `props: block.props.image` (`:410`) — a shape
that does NOT resolve to a `src` — so image-mode brand renders the empty dashed placeholder and
BALLOONS the header. 504-03 consumes 504-01's normalized `{asset/src}`-resolvable brand-image shape
(§504-01 (3a)) and emits a resolved-`src`-guarded `<img>` SIZED by the new
`BrandStyle.height`/`maxWidth` (504-02 emits the `img{}` rule; the guard prevents the placeholder
when no logo is set). Still NO CSS emitted here and NO base-sheet edit — markup/props only.

### Security Contract

UI/client-state + schema-first document contract extension; **no new route / RBAC /
endpoint / migration**. `activePath` is a read-only, server-derived request-path string
(already-known `url.pathname`), never persisted, never reflected into an attribute value
(it drives a boolean match only — the emitted attribute is the constant literal `"page"`).
No `menuDocumentV2` `schemaVersion` bump. No new secrets, tokens, or authz surface.

---

## Files & single-writer ownership

This subtask is the **sole writer** of `core/site/siteShell.tsx` for TASK-504. It also
carries the **additive prop-forwarding** through the render chain (no other 504 subtask
touches these files; each edit is a one-value forward, no logic):

| File | Change | Kind |
|---|---|---|
| `core/site/siteShell.tsx` | active-href resolver + `activePath`/`activeHref` props + stamp; AND the `MenuBrandRender` image-mode fix (resolved-`src`-guarded `<img>`, defect B1 §5) | **substantive (owned)** |
| `core/site/pageRuntimeV2.tsx` | `PageTemplatePropsV2.activePath?` + forward to `SiteHeaderMenuDocumentRender` | additive forward |
| `core/site/renderPublicPage.tsx` | `PublicPageV2RuntimeRenderOptions.activePath?` + `templateProps.activePath` | additive forward |
| `core/server/publicSite.tsx` | source `activePath` from the request `url.pathname`, thread to `renderPublicPageV2RuntimeHtml` | additive forward |
| `core/site/siteShellCss.ts` | **NONE** — base sheet inviolable (byte-identity guarded) | none |

`SiteHeaderNav` (the LEGACY flat header) is **untouched** — it never receives
`activeHref`, so its markup is byte-identical (its active-link handling stays the client
`navigation` widget's job). Preview / editor-canvas paths thread `activePath = null`
(no stamp). The current-page stamp is FRONT-ONLY: the canvas `NavItemsPreview` has no
route/current-page concept and stamps no `aria-current` (deferred with the active-item
indicator) — NO 504 subtask adds a canvas mirror.

---

## Execution-ready pseudocode

### 1. Path normalizer + active-href resolver (new, `siteShell.tsx`)

Mirror the proven client algorithm `resolveNavigationMatchingPath` /
`updateNavigationActiveLinks` (`core/widgets/core/navigation.tsx:693-738`): trailing-slash
normalization, **`pathname` semantics** (exact OR path-prefix), **longest target wins**.
Fixed semantics (no `activeLinkMode` in the menu doc — deferred; documented below).

```ts
// core/site/siteShell.tsx  (near hasRealHref, :109)

/**
 * Normalize an href/path to a comparable root-relative pathname, or null when it
 * cannot participate in current-page matching. SSR has no reliable request origin,
 * so ONLY root-relative internal paths ("/...") match — external URLs, "#", mailto:,
 * tel:, and protocol-relative hrefs never mark active (conscious, documented).
 */
const normalizeNavPath = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "#") return null;
  if (trimmed.startsWith("//")) return null;          // protocol-relative (//host) ⇒ external ⇒ never active
  if (!trimmed.startsWith("/")) return null;          // external / anchor / scheme ⇒ never active
  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? trimmed; // drop query + fragment
  const noTrailing = pathOnly.replace(/\/+$/, "");
  return noTrailing === "" ? "/" : noTrailing;
};

/**
 * Resolve the single winning current-page href across the RENDERED item tree.
 * - Walks the SAME filtered tree SiteNavItem renders (publicly-visible + renderable),
 *   so a hidden/non-rendered item can never win and orphan the stamp.
 * - `pathname` match: current === target OR current startsWith `${target}/`
 *   (root "/" only matches current "/"). Longest matching target wins (most specific).
 * Returns the normalized winning path (compared by SiteNavLink), or null.
 */
const resolveMenuActiveHref = (
  items: NavigationItem[],
  activePath: string | null | undefined
): string | null => {
  if (!activePath) return null;                        // absent ⇒ no stamp (byte-identical)
  const current = normalizeNavPath(activePath) ?? "/";
  let best: string | null = null;
  const visit = (list: NavigationItem[]) => {
    for (const item of list) {
      if (!isPubliclyVisibleNavigationItem(item)) continue;   // subtree hidden (flatten parity)
      if (!isRenderableNavItem(item)) continue;               // never produces markup
      const target = normalizeNavPath(item.href);
      if (target) {
        const matches =
          target === "/"
            ? current === "/"
            : current === target || current.startsWith(`${target}/`);
        if (matches && (best === null || target.length > best.length)) best = target;
      }
      if (item.children?.length) visit(item.children);
    }
  };
  visit(items);
  return best;
};
```

### 2. Thread `activeHref` down and stamp (`siteShell.tsx`)

```ts
// SiteNavLink gains an OPTIONAL activeHref (default undefined ⇒ no stamp ⇒ legacy byte-identical)
const SiteNavLink = ({
  item,
  activeHref,                                    // NEW: string | null | undefined
}: {
  item: NavigationItem;
  activeHref?: string | null;
}) => {
  const isButton = item.meta?.variant === "button";
  const isCurrent = activeHref != null && normalizeNavPath(item.href) === activeHref;
  return (
    <a
      className="site-nav-link"
      data-site-nav-link="true"
      data-site-nav-variant={isButton ? "button" : undefined}
      style={isButton ? siteNavButtonStyle : undefined}
      href={item.href}
      target={item.target === "blank" ? "_blank" : undefined}
      rel={item.target === "blank" ? "noopener noreferrer" : undefined}
      aria-current={isCurrent ? "page" : undefined}   // NEW — undefined ⇒ attr omitted
    >
      {item.label}
    </a>
  );
};

// SiteNavItem forwards activeHref into BOTH its own link and recursive children.
// Default undefined preserves the details/legacy path byte-for-byte.
const SiteNavItem = ({ item, interaction = "details", activeHref }: {
  item: NavigationItem; interaction?: SiteNavInteraction; activeHref?: string | null;
}) => {
  // ...existing filter-then-recurse unchanged...
  //   leaf:        <SiteNavLink item={item} activeHref={activeHref} />
  //   details firstchild reachability link: <SiteNavLink item={item} activeHref={activeHref} />
  //   children.map: <SiteNavItem ... interaction={interaction} activeHref={activeHref} />
  //   hover linked parent: <SiteNavLink item={item} activeHref={activeHref} />
  //   hover group-label <span> (linkless): NO stamp (no href) — unchanged
};
```

> Every existing `<SiteNavLink .../>` and recursive `<SiteNavItem .../>` call site inside
> `SiteNavItem` gains `activeHref={activeHref}`. `SiteHeaderNav` (`:280-282`) calls
> `SiteNavItem` **without** `activeHref` ⇒ `undefined` propagates ⇒ every `aria-current`
> resolves to `undefined` ⇒ omitted ⇒ **byte-identical legacy markup**.

### 3. Wire the resolver at the menu-document header (`siteShell.tsx`)

```ts
export function SiteHeaderMenuDocumentRender({
  document, navigation, siteName, breakpoint,
  activePath,                                    // NEW: string | null (default undefined)
}: {
  document: MenuDocumentV2;
  navigation: SiteShellNavigation | null;
  siteName?: string | null;
  breakpoint?: PageBreakpoint;
  activePath?: string | null;
}) {
  const items = (navigation?.items ?? []).filter(isPubliclyVisibleNavigationItem);
  const navLabel = navigation?.label ?? "Site navigation";
  const activeHref = resolveMenuActiveHref(items, activePath);   // NEW — null when absent
  const blocks = document.sections[0]?.blocks ?? [];
  // ...header unchanged... nav-items case:
  //   <NavItemsRender key={block.id} items={items} label={navLabel}
  //                   blockId={block.id} activeHref={activeHref} />
}

const NavItemsRender = ({ items, label, blockId, activeHref }: {
  items: NavigationItem[]; label: string; blockId: string; activeHref?: string | null;
}) => {
  // ...unchanged <nav>/<ul>... item map:
  //   <SiteNavItem key=... item={item} interaction="hover" activeHref={activeHref} />
};
```

- `resolveMenuActiveHref` is called on the SAME `items` array `NavItemsRender` renders
  (filtered identically), so the winning href always corresponds to a rendered anchor.
- `activePath` absent/`null` ⇒ `activeHref === null` ⇒ NO anchor stamped ⇒ the existing
  menu-document render output is byte-identical (guards the 502 render byte-identity test).

### 4. Additive prop threading (forward-only; no logic)

```ts
// core/site/pageRuntimeV2.tsx
export type PageTemplatePropsV2 = { /* ...existing... */ activePath?: string | null };
// DefaultRuntimePageShellV2: pass ONLY into the document header branch:
<SiteHeaderMenuDocumentRender ... breakpoint={previewDevice} activePath={activePath} />
// SiteHeaderNav branch: NO activePath (legacy unchanged).

// core/site/renderPublicPage.tsx
export type PublicPageV2RuntimeRenderOptions = /* ...existing... */ & { activePath?: string | null };
const templateProps: PageTemplatePropsV2 = { /* ...existing... */ activePath: activePath ?? null };

// core/server/publicSite.tsx
// SURFACE (narrow): the ONLY header-bearing render is `renderPublicPageV2RuntimeHtml`,
// reached solely via `renderPublicPageHtmlInternal` (Pages incl. homepage, publicSite.tsx:861→956).
// Content-ENTRY DETAIL renders do NOT carry the menu-doc header — `renderEntryDetailHtml`
// (publicSite.tsx:1174) routes to either `renderPublicEntryDetailHtml` (its own theme
// templates, NO site header) or the detail-page-template branch (→ V1
// `renderPublicPageRuntimeHtml` / `DefaultRuntimePageShell`, pageRuntime.tsx:104, which
// renders NO site header/nav). So there is NOTHING to stamp on any detail path — do NOT
// thread requestPath through renderEntryDetailHtml / renderPublicEntry.
// renderPublicPageHtmlInternal(page, options): source the request path.
//   const activePath = options?.requestPath ?? null;   // null in preview ⇒ no stamp
//   renderPublicPageV2RuntimeHtml({ ..., activePath });
// Route handler (fetch, url already parsed): pass requestPath: url.pathname ONLY into the
//   public PAGE render options (the renderPublicPageHtmlInternal callers). Preview path
//   passes nothing ⇒ null (safe default).
```

### 5. Fix the brand IMAGE render (defect B1, HIGH — `siteShell.tsx` `MenuBrandRender`)

`MenuBrandRender` (`:406-417`) today builds `const imageBlock = { …, props: block.props.image }`
(`:410`) and renders `<PageBlockContent block={imageBlock} />`. `block.props.image` is the raw
picker record (`{ assetId, alt, … }`), which does NOT resolve to a `src` in the image leaf, so the
front shows the empty-image dashed placeholder and the header balloons ~64px → ~217px. Fix:

```tsx
// image branch (:406) — use the 504-01-normalized {asset/src}-resolvable shape + a src GUARD.
const brandImage = block.props.image;                 // 504-01 normalizes this to the leaf shape
const resolvedSrc = resolveBrandImageSrc(brandImage); // same resolution the image leaf uses
if (block.props.mode === "image" && resolvedSrc) {    // GUARD: no resolved src ⇒ fall through to text
  const imageBlock = {
    id: block.id, type: "image",
    props: brandImage,                                 // now resolves to a real <img src>
    visibility: { visible: true },
  } as PageBlockV2;
  return (
    <a className="site-header-brand" href={href} data-menu-block-id={block.id}>
      <PageBlockContent block={imageBlock} />          {/* real <img>, SIZED by 504-02's img{} rule */}
    </a>
  );
}
// else: existing text/siteName fallback (unchanged) — so an image-mode brand with NO logo set
// no longer renders the dashed placeholder, it shows the text/site-name fallback.
```

- The `<img>` is SIZED by 504-02's `[data-menu-block-id] img{height;max-width;width:auto}` rule
  driven by the new `BrandStyle.height`/`maxWidth`; 504-03 emits NO CSS. The `<a>` already carries
  `data-menu-block-id` (`:414`), so the rule reaches the descendant `<img>`.
- The exact `props` shape + the `resolveBrandImageSrc` resolution are the SINGLE contract from
  504-01 (§3a). If the image leaf reads a different key, 504-01 normalizes to it — do NOT invent a
  second shape here.
- **Byte-identity:** a brand block WITHOUT `image` (text mode) is untouched (the guard fails ⇒
  same text branch as today); the no-`activePath` / no-logo render stays byte-identical.

### Error handling / fail-closed

- `activePath` undefined/null/empty ⇒ `resolveMenuActiveHref` returns `null` immediately
  ⇒ zero stamps ⇒ byte-identical. There is no throw path (pure string ops on already-safe
  server data).
- Ties (two items normalizing to the same winning target — e.g. a linked parent that also
  appears as a nested entry) stamp BOTH anchors: both ARE the current page, valid a11y.
- External / anchor / scheme hrefs return `null` from `normalizeNavPath` ⇒ never active
  (SSR has no request origin to safely compare cross-origin absolute URLs — conscious,
  matches the client widget's same-origin guard, `navigation.tsx:700`).

---

## Testing Requirements

Per `_docs/TESTING_STRATEGY.md`: the Vitest (Bun-free) lane covers the pure resolver +
SSR markup; the Bun lane covers the shell render byte-identity + live-path parity.

### Vitest (Bun-free)

- `tests/vitest/site/siteShell.test.tsx` (or the existing siteShell/menu-document suite):
  - `normalizeNavPath` — trailing-slash strip, `"/"` root, query/hash drop, external /
    `#` / mailto / protocol-relative ⇒ `null`.
  - `resolveMenuActiveHref` — exact match; path-prefix match (`/blog` active on `/blog/x`);
    **longest-target wins** among nested items; root `/` matches ONLY `/`; hidden
    (`visibility: "logged_in"`) or non-renderable items never win; `activePath` null/empty
    ⇒ `null`.
  - `SiteHeaderMenuDocumentRender` render — with `activePath` matching a TOP-LEVEL item, the
    matching `.site-nav-link` carries `aria-current="page"` and NO other link does; with
    `activePath` matching a NESTED item, the nested `.site-nav-link` carries it (proves
    recursion threading); with `activePath` unset ⇒ **zero** `aria-current` in the output.
  - **Brand IMAGE render (defect B1)** — a brand block in image mode with a configured logo
    renders a real `<img>` whose resolved `src` is non-empty (NOT the dashed placeholder); an
    image-mode brand with NO logo falls through to the text/site-name fallback (no placeholder);
    a text-mode brand is byte-identical to today.
  - `SiteHeaderNav` (legacy) render — output contains **zero** `aria-current` regardless
    (proves the legacy path is untouched).

### Bun (render/shell suites)

- `tests/unit/site/menu-document-render.test.tsx` (Bun): **no-override / no-`activePath`
  doc emits byte-identical markup** (the render byte-identity guard — this subtask must not
  perturb it); an `activePath`-provided render adds exactly one `aria-current="page"` and
  emits identical CSS (this subtask emits NO CSS).
- If a render-path integration test exists (`tests/routes/*` public-page render): assert the
  served HTML for a page whose path matches a nav item carries `aria-current="page"` on that
  link (proves the `url.pathname → activePath` threading end-to-end).

### Byte-identity / guards named explicitly

- `tests/unit/pages/siteShellCss.test.ts` — `buildSiteShellCss(null)` byte-identical:
  **ZERO edits, ZERO-line diff** (this subtask touches no CSS).
- `tests/unit/site/menu-document-render.test.tsx` — no-`activePath` menu docs byte-identical.
- `SiteHeaderNav` legacy markup byte-identical (no `activeHref` reaches it).

### SMOKE — current-page real-flow (contributes to the parent's ≥5-scenario suite; full
matrix owned by TASK-504-05)

Run in the live front (`:3000`) with `playwright-cli`; assert **VISIBLE EFFECT** (the
attribute AND the resulting computed style once 504-02 lands), not control presence. Start
`coderso-dev-core-host` if the front is down.

1. **Active top-level link stamped + styled.** Publish a menu doc whose nav includes the
   current page's path; load that page; assert the matching top-level `.site-nav-link` has
   `getAttribute("aria-current") === "page"` and (with 504-02's rule) a CHANGED computed
   text `color` vs a sibling non-active link. Assert NO sibling carries `aria-current`.
2. **Nested active link at the right depth.** Load a page whose path matches a NESTED nav
   item; HOVER to open the dropdown; assert the NESTED `.site-nav-link` carries
   `aria-current="page"` (and the styled current-page color) while the top-level parent
   link does NOT (unless it is the same target — longest-match specificity).
3. **Prefix + longest-match.** With nav items `/blog` and `/blog/post`, load `/blog/post`;
   assert ONLY `/blog/post` is active (longest wins), and on `/blog/other` ONLY `/blog` is
   active. Load `/` and assert only the `/` (home) link is active, not `/blog`.
   > **Fixture setup:** `/blog`, `/blog/post`, and `/blog/other` MUST be published **Page
   > v2 pages** (reached via `renderPublicPageHtmlInternal` → `renderPublicPageV2RuntimeHtml`),
   > NOT content-entry detail routes or detail-page-template renders. Only the V2 page
   > runtime emits the `SiteHeaderMenuDocumentRender` header; on a content-entry / detail
   > path NO menu header renders and there is no `.site-nav-link` node to assert against.

---

## Documentation Updates Required

- Handled centrally in **TASK-504-05** (`_docs/PAGE_MODEL.md` current-page + `aria-current`
  note, `_docs/_CHANGELOG/`). This subtask files no separate doc edits; note in the closure
  changelog: SSR `aria-current` stamp is `pathname`-semantics + longest-match, same-origin
  root-relative only; configurable `activeLinkMode` for the menu doc is **deferred**.

## Acceptance Criteria (measured LIVE)

- The nav link (top-level or nested) whose path matches the current request carries
  `aria-current="page"`; longest/most-specific target wins; root `/` matches only `/`;
  external/anchor hrefs never active.
- With TASK-504-02 landed, the active link shows the authored current-page computed style;
  hover-text color change is independently visible (504-02).
- **Brand image mode (defect B1) renders a real `<img>` with a resolved `src`** (not the dashed
  placeholder) and no longer balloons the header; sized by the new `BrandStyle.height`/`maxWidth`
  (504-02); an image-mode brand with no logo falls through to the text fallback.
- `SiteHeaderNav` (legacy) markup unchanged; no-`activePath` menu-document render
  byte-identical; `buildSiteShellCss(null)` byte-identical (ZERO-line diff).
- Zero client JavaScript added to the header render path; no route/RBAC/endpoint/migration;
  no `schemaVersion` bump.
- Gates: Vitest + Bun render/shell suites, lint, types, root `tsc`, gates:coderso green
  together; playwright current-page smoke green at 390px + 1280px.

## Deferred (state in TASK-504-05 changelog residuals)

- Configurable `activeLinkMode` (`exact`/`pathname`/`none`) for the menu-document header
  (fixed `pathname` + longest-match here).
- Cross-origin absolute-URL active matching (SSR has no reliable request origin).
- Active-item indicator pill/underline beyond the current-page color (parent-level defer).
