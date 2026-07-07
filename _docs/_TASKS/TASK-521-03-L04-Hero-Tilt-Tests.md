# TASK-521-03-L04: Hero Tilt Tests

# FileName: TASK-521-03-L04-Hero-Tilt-Tests.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-03
**Priority:** Medium
**Category:** Tests
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Regression tests for hero tilt (L01 model, L02 editor, L03
render + script). Bun lane for normalize + SSR-string (`tests/unit/widgets/*`,
`bun:test`); Vitest lane for jsdom pointer behavior + editor contract
(`tests/vitest/content*`), per `_docs/TESTING_STRATEGY.md`.

## Grounded anchors

Existing hero tests location (Bun: `tests/unit/widgets/hero*.test.ts(x)` if
present, else colocate with widget normalize tests; Vitest: `tests/vitest/content`
mounts widgets). `normalizeHeroData` (`hero.tsx:788`) is the normalize unit.

## Test shape

**Bun — `tests/unit/widgets/heroTilt.test.tsx`** (`bun:test`):

```ts
it("round-trips style.tilt:'subtle'/'strong'", () => {});
it("omits tilt:'none' (present-only)", () => {});
it("resolves invalid tilt → omitted", () => {});
it("renders data-hero-tilt + max + motion-safe perspective when set", () => {}); // renderToString
it("no tilt ⇒ byte-identical hero (no attr, no script)", () => {});
it("HERO_TILT_SCRIPT has reduced-motion + pointer:fine guards, no interpolation", () => {});
```

**Vitest — `tests/vitest/content/heroTilt.test.tsx`** (jsdom):

```ts
it("pointermove applies clamped rotateX/rotateY", () => {}); // run script via new Function()
it("pointerleave resets transform", () => {});
it("prefers-reduced-motion reduce ⇒ no transform", () => {});
it("coarse pointer ⇒ no transform", () => {});
it("editor writablePaths include style.tilt", () => {});
```

## Definition of done

Bun + Vitest hero-tilt tests pass; regressions to present-only byte-identity, the
reduced-motion/pointer guards, or the clamp fail a test.
