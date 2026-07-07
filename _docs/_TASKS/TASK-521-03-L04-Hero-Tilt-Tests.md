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
render + script). Per `_docs/TESTING_STRATEGY.md` and the LIVE layout, the hero
normalize + `renderToString` suites already live in **Vitest**
(`tests/vitest/widgets/hero.test.tsx`, `tests/vitest/widgets/heroEditors.test.tsx`)
— there is NO Bun `tests/unit/widgets/hero*` file — so these cases EXTEND the
existing Vitest hero suites; the jsdom pointer behavior goes in the Vitest content
lane.

## Grounded anchors

Existing hero test suites (Vitest): `tests/vitest/widgets/hero.test.tsx` (normalize
+ SSR-string), `tests/vitest/widgets/heroEditors.test.tsx` (editor contract), and
`tests/vitest/content` mounts widgets in jsdom. `normalizeHeroData` (`hero.tsx:788`)
is the normalize unit; `resolveHeroTilt` (521-03-L01, fail-soft like
`resolveHeroMotionPreset`, `hero.tsx:555` — returns `"none"`, never throws).

## Test shape

**Vitest — `tests/vitest/widgets/hero.test.tsx`** (extend; `renderToString`):

```ts
it("round-trips style.tilt:'subtle'/'strong'", () => {});
it("omits tilt:'none' (present-only)", () => {});
it("resolveHeroTilt fail-soft: invalid tilt → omitted (never throws)", () => {});
it("renders data-hero-tilt + max + motion-safe perspective when set", () => {}); // renderToString
it("no tilt ⇒ byte-identical hero (no attr, no script)", () => {});
it("HERO_TILT_SCRIPT has reduced-motion + pointer:fine guards, no interpolation", () => {});
```

**Vitest — `tests/vitest/widgets/heroEditors.test.tsx`** (extend): editor
`writablePaths` include `style.tilt`.

**Vitest — `tests/vitest/content/heroTilt.test.tsx`** (**line 1 MUST be
`// @vitest-environment happy-dom`** — `vitest.config.ts` is `environment:"node"`
globally; DOM files opt in per-file like `tests/vitest/admin/adminApp.test.tsx:1`,
else `document`/`window.matchMedia`/pointer events are undefined):

```ts
// @vitest-environment happy-dom
it("pointermove applies clamped rotateX/rotateY", () => {}); // run script via new Function()
it("pointerleave resets transform", () => {});
it("prefers-reduced-motion reduce ⇒ no transform", () => {});
it("coarse pointer ⇒ no transform", () => {});
```

## Definition of done

Vitest hero-tilt tests pass; regressions to present-only byte-identity, the
reduced-motion/pointer guards, or the clamp fail a test.
