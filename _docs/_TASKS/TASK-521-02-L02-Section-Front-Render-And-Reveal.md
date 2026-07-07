# TASK-521-02-L02: Section Front Render — reveal/parallax data-attrs + reduced-motion CSS

# FileName: TASK-521-02-L02-Section-Front-Render-And-Reveal.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-02
**Priority:** High
**Category:** Site Render / Accessibility
**Estimated Effort:** Medium
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Edits ONLY the SECTION region of
`core/services/pages/pageRendererV2.tsx`: `toPageSectionRenderProps` (`:515-530`)
and `PageSectionRender` (`:2291-2315`). Emits the DOM contract the 521-01 runtime
reads — `data-page-effect`, `data-parallax`, a `[data-parallax-inner]` wrapper —
plus the reduced-motion-safe reveal CSS classes. Does NOT emit the runtime script
(521-05 does, once, at the page root). Disjoint from 521-04 (block content) and
521-05 (page root).

## Grounded anchors

`PageSectionRenderProps` (`:100-101`, `sectionClassName`); `toPageSectionRenderProps`
(`:515-530`) — currently returns `sectionClassName`, `dataAttributes`, `style`,
etc.; `PageSectionRender` (`:2291-2315`) emits `<section id={anchor}
className={renderProps.sectionClassName} {...renderProps.dataAttributes}>` (`:2303-2306`)
then `<PageSectionContent …/>` (`:2308`). Reduced-motion CSS precedent:
`hero.tsx:447-450` / `section.tsx:582-584` (`motion-safe:animate-in …
motion-reduce:animate-none`). Import `pageSectionScrollEffects` /
`PAGE_PARALLAX_INTENSITY_CLAMP` read-only from `pageDocumentV2.ts` (521-01).

## Implementation pseudocode

```tsx
// (1) toPageSectionRenderProps — derive effect props from section.style:
const effect = section.style.scrollEffect;                 // undefined | enum
const parallax = effect === "parallax"
  ? Math.max(0, Math.min(40, section.style.parallaxIntensity ?? 20))
  : undefined;
const isReveal = effect === "reveal-fade" || effect === "reveal-up";

// reveal CSS: hidden-then-animate, motion-safe ONLY (reduce users see it at rest).
// Use the [data-revealed] attribute the runtime sets on enter:
const revealClass = isReveal
  ? "motion-safe:opacity-0 motion-safe:transition-[opacity,transform] motion-safe:duration-700 "
    + (effect === "reveal-up" ? "motion-safe:translate-y-4 " : "")
    + "motion-safe:data-[revealed=true]:opacity-100 motion-safe:data-[revealed=true]:translate-y-0"
  : "";

return {
  ...existing,
  sectionClassName: [existing.sectionClassName, revealClass].filter(Boolean).join(" "),
  dataAttributes: {
    ...existing.dataAttributes,
    ...(effect ? { "data-page-effect": effect } : {}),      // present-only
    ...(parallax !== undefined ? { "data-parallax": String(parallax) } : {}),
  },
  // expose a flag so PageSectionRender knows to wrap parallax content:
  parallaxEnabled: parallax !== undefined,
};

// (2) PageSectionRender — for parallax, wrap content in a transl-able inner el
//     the runtime targets (querySelector("[data-parallax-inner]")):
<section id={section.visibility.anchor ?? undefined}
         className={renderProps.sectionClassName} {...renderProps.dataAttributes}>
  {renderProps.parallaxEnabled ? (
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

**Reveal without JS:** the class hides the section only under `motion-safe`; the
521-01 runtime's no-IO fallback and reduced-motion path both leave/ set
`data-revealed`/content visible, so content is NEVER permanently hidden (SEO-safe,
progressive-enhancement). **Parallax `will-change-transform`** + transform-only =
no layout shift.

## Regression-test shape

- **Bun render — `tests/unit/pages/pageSectionRender.test.tsx`** (`bun:test` +
  `renderToString`): a section with `scrollEffect:"reveal-up"` renders
  `data-page-effect="reveal-up"` + the `motion-safe:` reveal class; a section with
  `scrollEffect:"parallax"` + `parallaxIntensity:24` renders `data-parallax="24"`
  and a `[data-parallax-inner]` wrapper; a section with NO scrollEffect renders NO
  data-effect attribute and NO inner wrapper (byte-identity vs pre-521).
- **Vitest smoke — `tests/vitest/content/...`**: jsdom mount + fire IO/scroll →
  assert `data-revealed` toggles / transform applied (may live in 521-05/06 with
  the full runtime). Reduced-motion emulation → no transform.

## Hard Invariants

1. Present-only: unset effect ⇒ no attr, no class, no wrapper, byte-identical.
2. Reveal CSS `motion-safe:`-only; content visible at rest for reduce/no-JS.
3. Parallax = transform-only inner wrapper (no layout shift).
4. Emits DOM contract ONLY; does not emit the runtime script (521-05).
