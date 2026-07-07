# TASK-521-02-L03: Section-Effects Tests

# FileName: TASK-521-02-L03-Section-Effects-Tests.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-02
**Priority:** Medium
**Category:** Tests
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Regression tests for the section-effect descriptors (L01) and the
front render (L02). Bun lane for SSR-string + descriptor assertions
(`tests/unit/pages/*`, `bun:test`); Vitest lane for any jsdom behavioral check
(`tests/vitest/content*`) per `_docs/TESTING_STRATEGY.md`.

## Test shape

**Bun — `tests/unit/pages/pageSectionRender.test.tsx`** (`renderToString`):

```ts
it("reveal-up stamps data-page-effect + motion-safe reveal class", () => {});
it("reveal-fade stamps fade class, no translate", () => {});
it("parallax stamps data-parallax + [data-parallax-inner] wrapper", () => {});
it("clamps parallax intensity in render (>40 → 40)", () => {});
it("no scrollEffect ⇒ byte-identical <section> (no attr, no wrapper)", () => {});
```

**Bun — `tests/unit/pages/pageEditorControlRegistry.test.ts`** (from L01):
descriptor presence + option-values === `pageSectionScrollEffects`.

**Vitest — `tests/vitest/content/sectionScrollEffect.test.tsx`** (jsdom):

```ts
it("IntersectionObserver enter toggles data-revealed", () => { /* mock IO, fire */ });
it("scroll applies translate3d within clamp to [data-parallax-inner]", () => {});
it("prefers-reduced-motion: reduce ⇒ runtime no-ops (no transform, content shown)", () => {
  // mock matchMedia reduce → run PAGE_EFFECTS_RUNTIME_SOURCE via new Function() in jsdom
});
```

## Definition of done

Bun + Vitest section-effect tests pass; a regression that drops the present-only
byte-identity, the reduced-motion guard, or the enum/UI alignment fails a test.
