# TASK-521-02-L02: Section Front Render — reveal/parallax data-attrs + reduced-motion CSS

# FileName: TASK-521-02-L02-Section-Front-Render-And-Reveal.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-02
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Medium
**Status:** ✅ Done

---

## Scope

Executable leaf. Edits ONLY the SECTION region of
`core/services/pages/pageRendererV2.tsx`: `toPageSectionRenderProps` (`:515-530`)
and `PageSectionRender` (`:2291-2315`). Emits the DOM contract the 521-01 runtime
reads — `data-page-effect`, `data-parallax`, a `[data-parallax-inner]` wrapper —
plus the reduced-motion-safe reveal CSS classes. Does NOT emit the runtime script
(521-05 does, once, at the page root). Disjoint from 521-04 (block content) and
521-05 (page root).

**Strict-type decision (CHOSEN — option b, no cross-region type edit):** the
`data-page-effect`/`data-parallax` attributes are spread DIRECTLY on the
`<section>` JSX inside `PageSectionRender` (`:2291-2315`, in-scope) and the
parallax-wrap is decided by a local `const parallaxEnabled` in that same JSX
scope. They are NOT routed through `renderProps.dataAttributes` and NO
`parallaxEnabled` field is added to the returned props. This is deliberate:
`PageSectionDataAttributes` (`:86-92`) is a STRICT object type (fixed keys, no
index signature) and `PageSectionRenderProps` (`:100-105`) has no `parallaxEnabled`
member, so routing through them would force edits at `:86-105` — OUTSIDE this
leaf's declared section region and a reconcile-failure under the parent's
coordination rule. `toPageSectionRenderProps` ONLY appends the reveal `revealClass`
into the existing `sectionClassName` string field (no type change). The effect/
parallax values are re-derived from `section.style` locally in `PageSectionRender`
(which already receives `section`).

## Grounded anchors

`PageSectionRenderProps` (`:100-105`, `sectionClassName` at `:101`) — STRICT type,
NOT edited by this leaf; `PageSectionDataAttributes` (`:86-92`) — STRICT (fixed
keys, no index signature), NOT edited by this leaf; `toPageSectionRenderProps`
(`:515-530`) — currently returns `sectionClassName`, `dataAttributes`, `style`,
etc. (this leaf appends only to the `sectionClassName` STRING, no type change);
`PageSectionRender` (`:2291-2315`) emits `<section id={anchor}
className={renderProps.sectionClassName} {...renderProps.dataAttributes}>` (`:2303-2306`)
then `<PageSectionContent …/>` (`:2308`) — the two extra data-attrs + the parallax
wrapper decision are added INLINE here (in-scope), re-deriving from `section.style`.
Reduced-motion CSS precedent:
`hero.tsx:447-450` / `section.tsx:582-584` (`motion-safe:animate-in …
motion-reduce:animate-none`). Import `pageSectionScrollEffects` /
`PAGE_PARALLAX_INTENSITY_CLAMP` read-only from `pageDocumentV2.ts` (521-01).

## Implementation pseudocode

```tsx
// (1) toPageSectionRenderProps — derive ONLY the reveal CSS class from
//     section.style and append it to the EXISTING sectionClassName string
//     (no type change; no new return field, no data-attr routing here):
const effect = section.style.scrollEffect;                 // undefined | enum
const isReveal = effect === "reveal-fade" || effect === "reveal-up";

// reveal CSS: hidden-then-animate, motion-safe ONLY (reduce users see it at rest).
// CRITICAL — the hidden state must ONLY apply once the runtime CONFIRMS it is
// running (JS-required-to-HIDE), else the builder canvas / SSR-no-JS / CSP-blocked
// / early-exception paths would leave sections permanently invisible.
//
// COMMITTED SINGLE PATH (no fragile Tailwind arbitrary-variant JIT gamble): the
// HIDE state (opacity-0 / translate, gated on the runtime-set `[data-reveal-armed]`
// ancestor + `:not([data-revealed])`) is shipped as a STATIC CSS STRING exported
// from THIS leaf and emitted ONCE by 521-05-L03 in a `<style data-page-motion-css>`
// (NOT as a nested `motion-safe:[[data-reveal-armed]_&:not(...)]:` Tailwind class —
// that ancestor+descendant+:not arbitrary variant is not reliably JIT-compiled and
// is the acknowledged risk). The section itself carries ONLY the JIT-safe, standard
// utilities: the transition + the revealed-state target utilities (plain
// `motion-safe:` + `data-[revealed=true]:` variants, both first-class in Tailwind):
const revealClass = isReveal
  ? "motion-safe:transition-[opacity,transform] motion-safe:duration-700 "
    + "motion-safe:data-[revealed=true]:opacity-100 motion-safe:data-[revealed=true]:translate-y-0"
  : "";

// EXPORTED reveal-hide rule STRING — the single source of the hidden state. 521-05-L03
// imports THIS const and emits it verbatim in `<style data-page-motion-css>` beside
// the front `[data-page-motion]` root in PageDocumentRender (:2361). Scoped under the
// runtime-set `[data-reveal-armed]` (NOT the SSR-stamped `[data-page-motion]`), so the
// canvas / no-JS / CSP-blocked / reduced-motion / pre-arm-exception cases NEVER hide
// content (marker absent ⇒ rule inert). motion-safe via the @media guard:
export const PAGE_REVEAL_MOTION_CSS =
  '@media (prefers-reduced-motion: no-preference){'
  + '[data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]){opacity:0}'
  + '[data-reveal-armed] [data-page-effect="reveal-up"]:not([data-revealed]){transform:translateY(1rem)}'
  + '}';
// Rationale: reveal SHOULD be inert (visible at rest) in the canvas AND wherever the
// runtime never armed, so `[data-reveal-armed]` scoping is correct (this is NOT the
// icon keyframe case). 521-05-L03 MUST import + emit PAGE_REVEAL_MOTION_CSS (the
// hidden state does not ship any other way) AND also emits a belt-and-suspenders
// `<noscript><style>[data-page-effect^="reveal"]{opacity:1;transform:none}</style></noscript>`
// for the pure JS-disabled case.

return {
  ...existing,
  // ONLY the sectionClassName STRING changes — no new field, no dataAttributes
  // mutation (PageSectionRenderProps / PageSectionDataAttributes stay untouched):
  sectionClassName: [existing.sectionClassName, revealClass].filter(Boolean).join(" "),
};

// (2) PageSectionRender (:2291-2315, in-scope) — re-derive effect/parallax from
//     section.style locally, SPREAD the two extra data-attrs DIRECTLY on the
//     <section> JSX (NOT through the strict renderProps.dataAttributes), and
//     decide the parallax wrapper with a LOCAL const. No strict-type edit needed:
const effect = section.style.scrollEffect;                 // undefined | enum
const parallax = effect === "parallax"
  ? Math.max(0, Math.min(40, section.style.parallaxIntensity ?? 20))
  : undefined;
const parallaxEnabled = parallax !== undefined;
const effectDataAttrs = {
  ...(effect ? { "data-page-effect": effect } : {}),        // present-only
  ...(parallax !== undefined ? { "data-parallax": String(parallax) } : {}),
};
// spread renderProps.dataAttributes (strict, unchanged) THEN the extra attrs:
<section id={section.visibility.anchor ?? undefined}
         className={renderProps.sectionClassName}
         {...renderProps.dataAttributes} {...effectDataAttrs}>
  {parallaxEnabled ? (
    <div data-parallax-inner className="will-change-transform">
      <PageSectionContent section={section} emptyContent={emptyContent}
        runtimeDataByBlockId={runtimeDataByBlockId} />
    </div>
  ) : (
    <PageSectionContent section={section} emptyContent={emptyContent}
      runtimeDataByBlockId={runtimeDataByBlockId} />
  )}
</section>
```

**Never permanently hidden (JS-required-to-HIDE):** the section is hidden ONLY
under `motion-safe` AND under `[data-reveal-armed]`, a marker the 521-01 runtime
sets on the root as its first post-guard action. So JS-disabled, CSP-blocked,
reduced-motion, no-IO, and any pre-arm exception ALL leave content visible at rest
(SEO-safe, progressive-enhancement); once armed, IO sets `data-revealed` to reveal.
521-05-L03 additionally emits a `<noscript>` reveal-visible style for the pure
JS-off case. **Parallax `will-change-transform`** + transform-only = no layout shift.

## Regression-test shape

- **Vitest render — extend `tests/vitest/pages/page-renderer-v2.test.tsx`**
  (`renderToString`; the `pageRendererV2` render suite already lives here per
  `_docs/TESTING_STRATEGY.md`): a section with `scrollEffect:"reveal-up"` renders
  `data-page-effect="reveal-up"` + the `motion-safe:` reveal class; a section with
  `scrollEffect:"parallax"` + `parallaxIntensity:24` renders `data-parallax="24"`
  and a `[data-parallax-inner]` wrapper; a section with NO scrollEffect renders NO
  data-effect attribute and NO inner wrapper (byte-identity vs pre-521).
- **Vitest smoke — `tests/vitest/content/...`**: jsdom mount + fire IO/scroll →
  assert `data-revealed` toggles / transform applied (may live in 521-05/06 with
  the full runtime). Reduced-motion emulation → no transform.

## Hard Invariants

1. Present-only: unset effect ⇒ no attr, no class, no wrapper, byte-identical.
2. Reveal HIDE state ships ONLY as the exported `PAGE_REVEAL_MOTION_CSS` static
   string (emitted by 521-05-L03), `@media (prefers-reduced-motion: no-preference)`
   AND scoped under the runtime-set `[data-reveal-armed]` marker
   (JS-required-to-HIDE) so content is NEVER permanently hidden in the builder
   canvas / SSR-no-JS / CSP-blocked / reduced-motion / pre-arm-exception cases. The
   section carries only JIT-safe standard utilities (transition + `data-[revealed
   =true]:` revealed-state) — NO nested arbitrary-variant ancestor selector class.
3. Parallax = transform-only inner wrapper (no layout shift).
4. Emits DOM contract ONLY; does not emit the runtime script or the
   `[data-page-motion]` root marker (521-05 owns both).
5. NO edit to the strict types `PageSectionDataAttributes` (`:86-92`) or
   `PageSectionRenderProps` (`:100-105`): the `data-page-effect`/`data-parallax`
   attrs are spread directly on the `<section>` JSX and the parallax wrapper uses a
   local const — `toPageSectionRenderProps` only appends to the `sectionClassName`
   string. Stays inside the declared `:515-530` + `:2291-2315` region (no
   reconcile failure).
