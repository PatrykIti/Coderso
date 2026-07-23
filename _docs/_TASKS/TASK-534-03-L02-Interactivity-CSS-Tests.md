# TASK-534-03-L02: Interactivity CSS Tests

# FileName: TASK-534-03-L02-Interactivity-CSS-Tests.md

**Parent Task:** TASK-534
**Parent Subtask:** TASK-534-03
**Priority:** Medium
**Category:** Tests
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Static-shape Vitest coverage for `PAGE_INTERACTIVITY_CSS`.

## Test lane (rationale)

**Vitest `tests/vitest/pages/`** — pure static-string assertion (no DB, no DOM),
matching the `PAGE_COMPOSITION_EFFECTS_CSS` / `pageEffectsRuntime` static-shape
suites.

## Implementation pseudocode

```ts
// tests/vitest/pages/task-534-interactivity-css.test.ts
it("is a string containing switcher/filter/magnetic selectors");
it("[hidden]/.is-hidden display:none rules are OUTSIDE the reduced-motion guard");
it("every transition/opacity rule is inside prefers-reduced-motion: no-preference");
it("uses var(--primary) token, not author input; contains no ${ interpolation");
```

## Security note

The static-string test guards against a future edit introducing `${`
interpolation or an author-data `url()` into the CSS string.

## Hard Invariants

1. Vitest static-shape lane.
2. Asserts the reduced-motion partitioning (functional vs motion rules).
