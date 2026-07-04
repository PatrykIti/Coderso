# TASK-499-04: Menu Front Renderer + Default Fallback
# FileName: TASK-499-04-Menu-Front-Renderer-And-Default-Fallback.md

**Priority:** High
**Category:** Front Renderer / Site Shell / Content (Menus)
**Estimated Effort:** Large
**Dependencies:** TASK-499-02 (menuDocumentV2 + `resolvePublishedMenuDocument`), TASK-455 (site shell), TASK-458-02 (`buildSiteShellCss` byte-identity)
**Status:** ✅ Done
**Completed:** 2026-07-01
**Parent Task:** TASK-499

---

## Overview

Render the published menu design document on the public front, with the
default-fallback that is the core behavior the owner specified:

- **EMPTY Design** (`settings.published.document` absent/empty) ⇒ the front
  renders **today's `SiteHeaderNav` default** (nav positions + `siteName` logo +
  optional CTA extras), **byte-identical** to now.
- **NON-EMPTY Design** ⇒ the front renders the **custom menu document** (with
  nesting), styled by the document's `menu-bar` layout and composed blocks.

The override is purely **additive**: the default path and the
`buildSiteShellCss(null)` byte-identity contract are untouched; clearing the
document falls back to the default.

- **Goal:** a `SiteHeaderMenuDocumentRender` that renders `menuDocumentV2`
  server-side (zero client JS, fail-closed), a scoped CSS builder
  (`menuDocumentCss.ts`) that never alters `buildSiteShellCss`, a
  `navigationDocument` field on `SiteShellRenderProps`, and a branch in
  `DefaultRuntimePageShellV2` that selects document-vs-default.
- **Owning modules:** `core/site/siteShell.tsx`, `core/site/menuDocumentCss.ts`
  (new), `core/site/pageRuntimeV2.tsx`, `core/server/publicSite.tsx`,
  `core/site/renderPublicPage.tsx` (the SINGLE `buildSiteShellCss` head-emission
  point + the `hasSiteShell` gate, `:375-380`).
- **Out of scope:** the authoring UI (499-03); the legacy `appearance`+`extras`
  render path stays for back-compat (legacy menus, no document).

---

## Security Contract

The front renders **published-only**: `resolvePublicSiteShell` already gates on
`menu.status === "published"` (`publicSiteShell.ts:51-57`), and
`resolvePublishedMenuDocument` reads the `published` snapshot, never the
top-level draft (TASK-499-02). The menu document render is server-side, ships
ZERO client JavaScript (CSS-only disclosures, like today's shell), and is
fail-closed: an unreadable document degrades to the default `SiteHeaderNav`.
`nav-items` binds the already-mapped, safe-href item tree
(`mapMenuNodesToNavigationItems` → `normalizeWidgetSafeHref`); reused leaf blocks
render through `PageBlockFrame`/`PageBlockContent` exactly like today's extras
(`siteShell.tsx:187-195`). No new endpoint. The menu document CSS is emitted only
from validated `menuDocumentV2` values (token colors, clamped numbers, enums) —
raw stored input never reaches CSS.

---

## Implementation Pseudocode

### 1. `menuDocumentCss.ts` — scoped CSS for the document (NEVER touches the default)

```ts
// core/site/menuDocumentCss.ts  (Bun-free)
// Build the menu-bar + nav typography CSS from a menuDocumentV2, scoped under a
// NEW attribute so it can never collide with buildSiteShellCss's default rules.
export const SITE_MENU_DOC_ATTRIBUTE = "data-site-menu-doc" as const;
// FRONT sheet — VIEWPORT-media responsive (mobile disclosure via `@media`), like
// buildSiteShellCss. Reuse the appearance->CSS mapping shape from
// siteShellCss.ts:114-180 over the menu-bar layout + nav-items props (both
// MenuAppearance-subset). Scope every rule under `[data-site-menu-doc="true"]`. The
// default buildSiteShellCss(null) output is NOT imported, NOT modified, NOT
// re-emitted here.
export function buildMenuDocumentCss(doc: MenuDocumentV2): string { /* viewport media queries */ }
// ADMIN-CANVAS variant — DEVICE-FORCED. The Design canvas has a DeviceSwitcher
// (TASK-499-03 §1), so the in-canvas preview needs the mobile-disclosure flatten
// resolved against the SELECTED breakpoint, not the viewport — exactly the
// buildSiteShellCss / buildSiteShellPreviewCss(appearance, device) pair the current
// MenuDesignEditorPage.tsx:122-125 already uses. Same scoped `[data-site-menu-doc]`
// rules, but each `@media` breakpoint is resolved from `device`. Used ONLY by the
// admin canvas (TASK-499-03 §2); the front (§2 below) keeps calling the viewport
// variant `buildMenuDocumentCss(doc)`.
export function buildMenuDocumentPreviewCss(doc: MenuDocumentV2, device: PageBreakpoint): string { /* device-forced flatten */ }
```

> **Byte-identity guard:** do NOT change `siteShellCss.ts`. The default path keeps
> emitting `buildSiteShellCss(null)`; the document path emits its OWN scoped sheet.
> `tests/unit/pages/siteShellCss.test.ts` must stay green untouched.

### 2. `SiteHeaderMenuDocumentRender` in `siteShell.tsx`

```tsx
// Analogous to SiteHeaderNav but document-driven. Renders the menu-bar section
// (scoped wrapper + its CSS via menuDocumentCss) and each block; nav-items
// expands the published item tree with nesting (REUSE SiteNavItem +
// flattenNavigationDescendants, siteShell.tsx:82-135 — single dropdown depth, as
// the renderer supports). Server-rendered, zero client JS, fail-closed.
export function SiteHeaderMenuDocumentRender({
  document, navigation, siteName, breakpoint,
}: {
  document: MenuDocumentV2;
  navigation: SiteShellNavigation | null;   // the SAME mapped item tree SiteHeaderNav uses
  siteName?: string | null;
  breakpoint?: PageBreakpoint;
}) {
  const items = (navigation?.items ?? []).filter(isPubliclyVisibleNavigationItem);
  return (
    <header className="site-header" {...{ [SITE_HEADER_ATTRIBUTE]: "true", [SITE_MENU_DOC_ATTRIBUTE]: "true" }}>
      <style>{buildMenuDocumentCss(document)}</style>
      <div className="site-header-inner">
        {document.sections[0]?.blocks.map((block) => {
          switch (block.type) {
            case "nav-items": return <NavItemsRender key={block.id} items={items} label={navigation?.label ?? "Site navigation"} props={block.props} />;
            case "brand":     return <BrandRender key={block.id} block={block} siteName={siteName} />;
            case "cta-button":
            case "divider":
            case "spacer":    return <PageBlockFrame key={block.id} block={toPageLeaf(block)}><PageBlockContent block={toPageLeaf(block)} /></PageBlockFrame>;
            case "search": case "account": case "language": return <MenuUtilityRender key={block.id} block={block} />;
          }
        })}
      </div>
    </header>
  );
}
// NavItemsRender reuses the EXACT <nav>/<details>/<ul> markup of SiteHeaderNav
// (:171-186) so dropdown/mobile semantics + accessibility are identical.
```

### 3. Extend `SiteShellRenderProps` + populate it

```ts
// siteShell.tsx:56-70 — add the document field next to navigationAppearance/Extras:
export type SiteShellRenderProps = {
  navigation: SiteShellNavigation | null;
  navigationAppearance?: MenuAppearance | null;
  navigationExtras?: PageBlockV2[] | null;
  /** Published menu design document (TASK-499); present ⇒ render the custom menu,
   *  null/absent/empty ⇒ default SiteHeaderNav (byte-identical). */
  navigationDocument?: MenuDocumentV2 | null;
  footerDocument: PageDocumentV2 | null;
};
```

```ts
// publicSite.tsx:822-849 — populate in resolveSiteShellRenderProps (published-only).
// IMPORT resolvePublishedMenuDocument FROM core/services/menus/menuDocumentV2.ts
// (TASK-499-02 §5 — the resolver lives in menuDocumentV2.ts, NOT normalizeMenuAppearance.ts),
// next to the existing resolvePublishedMenuAppearance/...NavExtras imports.
// NOTE: `shell.navigation` here is the RAW MenuWithItems from resolvePublicSiteShell —
// truthy whenever a published menu exists (even a ZERO-ITEM menu); `.menu.settings` is
// therefore reachable. This is distinct from the MAPPED SiteShellNavigation
// (`navigation:` above), which is null at zero items — exactly the §5 case where
// `siteShell.navigation === null` yet `navigationDocument` is non-null.
navigationDocument: shell.navigation
  ? resolvePublishedMenuDocument(shell.navigation.menu.settings)
  : null,
// the catch-block fallback sets navigationDocument: null (fail-closed), like the others.
```

### 4. Branch in `DefaultRuntimePageShellV2` (the behavioral keystone)

```tsx
// pageRuntimeV2.tsx:23-49 — select document vs default ABOVE the existing default:
{siteShell?.navigationDocument ? (
  <SiteHeaderMenuDocumentRender
    document={siteShell.navigationDocument}
    navigation={siteShell.navigation}        // bind the live item tree into nav-items
    siteName={siteName}
    breakpoint={previewDevice}
  />
) : siteShell?.navigation ? (
  <SiteHeaderNav                              // UNCHANGED default path (byte-identical)
    navigation={siteShell.navigation}
    siteName={siteName}
    extras={siteShell.navigationExtras ?? null}
  />
) : null}
```

Net behavior (matches the owner exactly):
- absent/empty document ⇒ `navigationDocument` is `null` ⇒ the existing
  `SiteHeaderNav` default runs untouched (positions + `siteName` + optional CTA).
- non-empty document ⇒ the custom menu renders with nesting.
- clearing the document ⇒ envelope key deleted (TASK-499-02) ⇒ `null` ⇒ default.

The menu rendered is still the one designated by `site.navigationMenuId`,
published-only (`publicSiteShell.ts:51-57`).

### 5. `renderPublicPage.tsx` — head CSS emission for document menus (REQUIRED)

The base `.site-header` stylesheet (`.site-header-inner` flex, `.site-nav-list`,
`.site-nav-group > summary`, `.site-nav-sublist` dropdown, the mobile `@media`
disclosure) lives ONLY in `buildSiteShellCss` and is emitted from a SINGLE point:
`renderPublicPage.tsx:375-380`. `SiteHeaderMenuDocumentRender` (§2) REUSES those
exact `site-header` / `site-header-inner` / `site-nav-*` class names, so it
hard-depends on that base sheet. Two breakages exist if this file is left as-is —
both must be fixed:

```ts
// renderPublicPage.tsx:375-380 (current — emits a STRING, not an array):
//   const hasSiteShell = Boolean(siteShell?.navigation || siteShell?.footerDocument);
//   const inlineCssWithShell = hasSiteShell
//     ? [inlineCss, buildSiteShellCss(siteShell?.navigationAppearance ?? null)]
//         .filter(Boolean)
//         .join("\n")          // truthy branch JOINS to a string
//     : inlineCss;             // falsy branch is the bare `inlineCss` string
//   // renderDocument's 4th param is typed `inlineCss?: string | null` (:101) — both
//   // branches MUST stay a string; an array trips lint:types AND a stray comma-join.
//
// (a) ZERO-ITEM document menu: buildSiteShellNavigation returns null when
//     items.length === 0 (publicSite.tsx:814), so siteShell.navigation === null
//     while siteShell.navigationDocument is non-null and §4 STILL renders the
//     document menu. With the current gate, hasSiteShell === false ⇒ the base
//     sheet is NOT emitted ⇒ the custom menu renders with NO base layout CSS.
// (b) MIGRATED menu: a menu carried over from legacy keeps published.appearance,
//     so navigationAppearance is non-null AND a document is active; emitting
//     buildSiteShellCss(navigationAppearance) bleeds legacy absent-rule props
//     (e.g. sticky) UNDER the custom menu.
//
// FIX — change ONLY the `hasSiteShell` condition (add `navigationDocument`) and the
// `buildSiteShellCss(...)` argument (base-only when a document is active). PRESERVE
// `.filter(Boolean).join("\n")` on the truthy branch and the bare `: inlineCss`
// string on the falsy branch — `inlineCssWithShell` stays a `string` (renderDocument
// 4th param is `string | null`):
const hasSiteShell = Boolean(
  siteShell?.navigation || siteShell?.navigationDocument || siteShell?.footerDocument);
const inlineCssWithShell = hasSiteShell
  ? [inlineCss, buildSiteShellCss(
      // document active ⇒ base layout only (null); the document's appearance is its
      // OWN scoped sheet (menuDocumentCss, §1) — legacy appearance must NOT bleed.
      siteShell?.navigationDocument ? null : (siteShell?.navigationAppearance ?? null))]
      .filter(Boolean)
      .join("\n")
  : inlineCss;
```

> The default (no-document) path is byte-unchanged: `navigationDocument` null ⇒
> `buildSiteShellCss(navigationAppearance ?? null)` exactly as today ⇒
> `tests/unit/pages/siteShellCss.test.ts` stays green.

**Error handling:** the document render is fail-closed — a malformed published
document resolves to `null` via `resolvePublishedMenuDocument` (TASK-499-02
stored-read), so the default path runs; never an error page.

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`.
- **Byte-identity (must stay green, untouched):**
  `tests/unit/pages/siteShellCss.test.ts` — `buildSiteShellCss(null)` and the
  all-defaults model still reproduce the legacy stylesheet byte-for-byte.
- New `tests/unit/site/menu-document-render.test.tsx`:
  - `SiteHeaderMenuDocumentRender` golden: menu-bar + brand + nav-items (with a
    nested item ⇒ `<details>` dropdown, single depth) + cta-button.
  - `nav-items` renders the bound item tree; honors `openInNewTab` ⇒
    `target="_blank" rel="noopener noreferrer"` (TASK-499-01).
  - scoped CSS sits under `[data-site-menu-doc="true"]`; emits only validated
    values.
- New `tests/vitest/site/page-runtime-shell-branch.test.tsx`:
  - `navigationDocument` present ⇒ `SiteHeaderMenuDocumentRender`; absent ⇒
    `SiteHeaderNav` (assert the default markup is unchanged).
  - **`renderPublicPage` head-CSS gate (§5):** (a) document + ZERO items
    (`siteShell.navigation === null`, `navigationDocument` non-null) STILL emits the
    base `buildSiteShellCss` sheet (`hasSiteShell` true via the document) so the
    custom menu has its base `.site-header*` layout; (b) MIGRATED menu (document
    active + residual `navigationAppearance`) emits `buildSiteShellCss(null)` — the
    legacy appearance rules do NOT appear in the head (no bleed under the custom
    menu); (c) no-document path is byte-unchanged
    (`buildSiteShellCss(navigationAppearance ?? null)`).
- **Default/legacy end-to-end regression (must stay green) —
  `tests/integration/runtime/site-shell-runtime.test.ts`:** this is the strongest
  guard that the default/legacy front render stays byte-identical after the
  `pageRuntimeV2.tsx` branch (§4) + the `renderPublicPage.tsx:375-380` gate change
  (§5). It asserts the published-menu header markup (`data-site-header`,
  `data-site-nav-link`/`-group`/`-disclosure`, `:303-317`), the published-appearance
  `buildSiteShellCss(appearance)` head emission (`:432-465`), and the no-menu
  `not.toContain("data-site-header")` case (`:354`). All MUST stay green with the
  default path (no `navigationDocument`) byte-unchanged; extend it (or a sibling) with
  the document-active path assertions, NOT by weakening the default assertions.
- `tests/integration/runtime/` (extend `menu-design-extras-runtime.test.ts` or
  add a sibling): published menu with a document ⇒ custom render; empty/legacy ⇒
  default; draft document never leaks pre-publish; cleared document ⇒ default.
- `resolvePublishedMenuDocument` published-snapshot-only + legacy fallback +
  empty ⇒ null (shared with TASK-499-02 suite).

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + Statistics on status change (closing agent).
- Add a `_docs/_CHANGELOG/` entry linking **TASK-499** + **TASK-499-04**; document
  the default-vs-custom front behavior and the preserved byte-identity contract.
- Cross-link the new `navigationDocument` shell field from the TASK-455 site-shell
  notes.
