# TASK-520-04: Front Render — Scroll-State Machine & Brand Icon/Combo

# FileName: TASK-520-04-Front-Render-Scroll-Machine-And-Brand.md

**Parent Task:** TASK-520
**Priority:** High
**Category:** Site Render / Navigation
**Estimated Effort:** Medium
**Dependencies:** TASK-520-01 (model), TASK-520-02 (CSS — the `[data-scrolled]` rules the machine toggles + the radius/custom-shadow rules).
**Status:** ⏳ To Do

---

## Scope (single-writer)

**520-04 is the SOLE WRITER of `core/site/siteShell.tsx`.** Two disjoint leaves:

- **520-04-L01** — `BrandRender` (@490-536): render `mode:"icon"` (lucide `<svg>`
  from the validated name, styled by `iconColor`/`iconSize`) and the
  `showText:true` combo (graphic + wordmark side by side); declare `BrandRender`'s
  new optional `breakpoint` prop. text-only + image-only unchanged.
- **520-04-L02** — the scroll-state machine: emit a tiny **front-only** inline
  `<script>` in `SiteHeaderMenuDocumentRender` (@555-621) that toggles
  `data-scrolled="true"` on the `<header data-site-menu-doc>` past a threshold, so
  the 520-02 scrolled-variant CSS applies. Also owns the caller edit at @599
  (threading `breakpoint={breakpoint}` into `<BrandRender>`) since @599 sits inside
  this leaf's region — keeps the two leaves' edited regions strictly disjoint.

ZERO edits to `menuDocumentV2.ts`, `menuDocumentCss.ts`, `MenuDesignEditor.tsx`.

## Grounded anchors

`BrandRender` @490-536 (href sanitize @501, `resolveBrandImageSrc` @509,
image-mode `<img>` via `PageBlockContent` @517-521, text/site-name fallback
@529-534); `SiteHeaderMenuDocumentRender` @555-621 (`<header>` with
`SITE_HEADER_ATTRIBUTE`/`SITE_MENU_DOC_ATTRIBUTE` @580-583, `<style>{buildMenuDocumentCss}`
@584, block switch @586-617, `activePath` front-only signal @568-572 [null in
preview/canvas]); inline-script precedent `renderPublicPage.tsx:166-169` /
`renderPublicEntry.tsx:215-218` (`dangerouslySetInnerHTML`); lucide render source
`core/widgets/core/timelineLucideIcons.ts` (`lucideKebabIconComponents`,
SSR-renderable to `<svg>`).

## Security Contract

No route surface. (1) Brand icon: resolve the validated name against
`lucideKebabIconComponents` — an unknown/unresolvable name → fall through to the
text/site-name chain (never emit the raw name into markup). (2) Icon color:
already whitelisted by 520-01 (`iconColor`), re-apply as an inline `style` on the
`<svg>` (defence in depth: it is a validated color). (3) Scroll script: a STATIC
string literal (no interpolation of stored data), so no injection surface; emitted
only on the front (gated on `activePath != null`). (4) `brand.href` continues
through `sanitizeAuthoringLinkHref` (@501) unchanged.

See leaf files for execution-ready pseudocode + test shapes.

## Hard Invariants

1. Front-only script (gated on the existing front signal); preview/canvas emits
   NO script (byte-identical preview).
2. Brand back-compat: unset `showText` = today's exclusive text-XOR-image;
   `mode:"icon"` with absent/unresolvable icon → text/site-name fallback.
3. No-override docs byte-identical (icon/combo branches only add markup when the
   respective keys are set; the script is emitted only when a scrolled variant is
   authored on a sticky bar — see L02).
4. Lucide set loaded SSR-safe (the module is already SSR-renderable; keep the
   brand icon on the server-render path — no client hydration of the mark).

## Testing Requirements

Bun render (`tests/unit/site/menu-document-render.test.tsx` — `bun:test` +
`renderToString`, i.e. the Bun lane per `_docs/TESTING_STRATEGY.md`, `tests/unit/*`
= Bun; or a brand-render test) per leaf; the ≥6-scenario Playwright smoke (scroll
transition on the real front) is in 520-05.
