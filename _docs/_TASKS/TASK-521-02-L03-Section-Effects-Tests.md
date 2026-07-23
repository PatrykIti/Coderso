# TASK-521-02-L03: Section-Effects Tests

# FileName: TASK-521-02-L03-Section-Effects-Tests.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-02
**Priority:** Medium
**Category:** Tests
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Regression tests for the section-effect descriptors (L01) and the
front render (L02). Per `_docs/TESTING_STRATEGY.md` (pure TS + `pageRendererV2`
`renderToString` → **Vitest**; the existing page-renderer render tests already
live at `tests/vitest/pages/page-renderer-v2.test.tsx` and the descriptor tests at
`tests/vitest/pages/page-editor-control-registry.test.ts`). Vitest lane for the
jsdom behavioral checks too.

## Test shape

**Vitest — extend `tests/vitest/pages/page-renderer-v2.test.tsx`** (`renderToString`):

```ts
it("reveal-up stamps data-page-effect + motion-safe reveal class", () => {});
it("reveal-fade stamps fade class, no translate", () => {});
it("parallax stamps data-parallax + [data-parallax-inner] wrapper", () => {});
it("clamps parallax intensity in render (>40 → 40)", () => {});
it("no scrollEffect ⇒ byte-identical <section> (no attr, no wrapper)", () => {});
```

**Vitest — extend `tests/vitest/pages/page-editor-control-registry.test.ts`** (from L01):
descriptor presence + `options` === `[...pageSectionScrollEffects]`.

**Vitest — `tests/vitest/content/sectionScrollEffect.test.tsx`** (**line 1 MUST be
`// @vitest-environment happy-dom`** — `vitest.config.ts` is `environment:"node"`
globally; DOM files opt in per-file like `tests/vitest/admin/adminApp.test.tsx:1`,
else `document`/`window.matchMedia`/`IntersectionObserver` is undefined):

```ts
// @vitest-environment happy-dom
it("IntersectionObserver enter toggles data-revealed", () => { /* mock IO, fire */ });
it("scroll applies translate3d within clamp to [data-parallax-inner]", () => {});
it("prefers-reduced-motion: reduce ⇒ runtime no-ops (no transform, content shown)", () => {
  // mock matchMedia reduce + IntersectionObserver → run PAGE_EFFECTS_RUNTIME_SOURCE
  // via new Function() in happy-dom
});
```

## Definition of done

Vitest section-effect tests pass (pages + content suites); a regression that drops
the present-only byte-identity, the reduced-motion guard, or the enum/UI alignment
fails a test.
