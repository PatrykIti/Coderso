# TASK-520-04-L02: Front Scroll-State Machine — `data-scrolled` Toggle Script

# FileName: TASK-520-04-L02-Scroll-State-Machine-Script.md

**Parent Subtask:** TASK-520-04
**Priority:** High
**Category:** Site Render / Navigation
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY `SiteHeaderMenuDocumentRender` (@555-621) in
`core/site/siteShell.tsx` (disjoint from L01's `BrandRender` @490-536). Owns the
caller edit at **@599** that threads `breakpoint={breakpoint}` into the
`<BrandRender>` invocation (L01 declares the optional `breakpoint` prop; this leaf
passes it because @599 sits inside this leaf's region). Emits a tiny
**front-only** inline `<script>` that toggles `data-scrolled="true"` on the
`<header data-site-menu-doc>` once the page scrolls past a threshold, so the
520-02 `[data-scrolled="true"]` CSS applies (the floating-header effect). The
script is emitted ONLY when (a) it is the front (not preview/canvas) AND (b) the
menu bar is `sticky` AND at least one scrolled-variant key is authored — so
legacy / no-scrolled docs stay byte-identical (no script).

## Grounded anchors

`SiteHeaderMenuDocumentRender` @555-621; `<header>` attributes @580-583
(`SITE_MENU_DOC_ATTRIBUTE`); `<style>{buildMenuDocumentCss(document)}` @584;
`activePath` front-only signal @568-572 (string on front, null in preview/canvas);
`document.sections[0]?.layout` carries the scrolled keys (`MenuBarLayout`, 520-01);
inline-script precedent `renderPublicPage.tsx:166-169` (`dangerouslySetInnerHTML`,
static literal).

## Implementation pseudocode

```tsx
// Inside SiteHeaderMenuDocumentRender, after computing `blocks`:
const barLayout = document.sections[0]?.layout as MenuBarLayout | undefined;
const hasScrolledVariant = !!barLayout && barLayout.sticky === true && (
  barLayout.surfaceColorScrolled != null || barLayout.borderColorScrolled != null ||
  barLayout.borderWidthScrolled != null || barLayout.shadowScrolled != null ||
  barLayout.shadowCustomScrolled != null
);
const isFront = typeof activePath === "string";        // front-only (null in preview/canvas)
const emitScrollMachine = isFront && hasScrolledVariant;

// STATIC script literal (no interpolation of stored data ⇒ no injection surface). Minified:
const SCROLL_MACHINE = [
  '(function(){',
  'var h=document.currentScript&&document.currentScript.closest?document.currentScript.closest(\'[data-site-menu-doc="true"]\'):null;',
  'if(!h)h=document.querySelector(\'[data-site-menu-doc="true"]\');',
  'if(!h)return;',
  'var t=8,f=false;',                                  // threshold px, rAF flag
  'function u(){f=false;var s=(window.scrollY||window.pageYOffset)>t;',
  'if(s)h.setAttribute("data-scrolled","true");else h.removeAttribute("data-scrolled");}',
  'function o(){if(!f){f=true;requestAnimationFrame(u);}}',
  'window.addEventListener("scroll",o,{passive:true});',
  'window.addEventListener("resize",o,{passive:true});',
  'u();',                                              // set initial state (deep-link / reload mid-page)
  '})();',
].join("");

// In the returned JSX, alongside <style>:
{emitScrollMachine && (
  <script dangerouslySetInnerHTML={{ __html: SCROLL_MACHINE }} />
)}

// Caller edit @599 (owned by THIS leaf — it is inside SiteHeaderMenuDocumentRender):
// thread the per-device breakpoint into BrandRender (L01 declared the optional prop):
//   return <BrandRender key={block.id} block={block} siteName={siteName} breakpoint={breakpoint} />;
```

**Placement:** render the `<script>` INSIDE the `<header>` (valid HTML5;
`document.currentScript.closest('[data-site-menu-doc]')` then finds THIS header,
so multiple headers on a page would each self-target). Fallback `querySelector`
for browsers where `currentScript` is unavailable at execution.

**Threshold:** fixed `8px` (perceptible immediately on any scroll; matches the
common "solid on scroll" feel). If the owner later wants a configurable threshold
it is an additive model key — out of scope here.

**No layout shift:** the script only toggles an attribute; the scrolled CSS
changes color/border/shadow (not box size). `radius` is state-independent (base).

## Regression-test shape

- **Bun render (SSR string) — `tests/unit/site/menu-document-render.test.tsx`** (that
  file is `bun:test` + `renderToString` ⇒ the Bun lane per `_docs/TESTING_STRATEGY.md`,
  NOT Vitest): a doc with `sticky:true` + a scrolled variant on
  the FRONT (`activePath` set) emits a `<script>` containing `data-scrolled`; a doc
  WITHOUT a scrolled variant, OR with `sticky:false`, OR in preview
  (`activePath` null) emits NO script (byte-identity). Assert the script string is
  the exact static literal (no stored data interpolated).
- **Playwright smoke (520-05):** on the real front, at `scrollY 0` the header has
  NO `data-scrolled`; after `window.scrollTo(0, 200)` the header gains
  `data-scrolled="true"` and computed `background-color`/`box-shadow` change to the
  scrolled values; scrolling back to top removes it and reverts. 0 console errors.

## Hard Invariants

1. Script emitted ONLY front + sticky + a scrolled variant authored (else NO
   script → byte-identical).
2. Static literal — never interpolates stored/user data (no injection surface).
3. Passive listeners + rAF throttle (no scroll jank); sets initial state on load.
4. Self-targets THIS header (`currentScript.closest`) with a `querySelector`
   fallback.
