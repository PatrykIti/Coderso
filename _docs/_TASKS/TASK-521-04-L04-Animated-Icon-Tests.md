# TASK-521-04-L04: Animated-Icon Tests

# FileName: TASK-521-04-L04-Animated-Icon-Tests.md

**Parent Task:** TASK-521
**Parent Subtask:** TASK-521-04
**Priority:** Medium
**Category:** Tests
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Regression tests for the glyph set (L01), renderer case (L02),
and palette/controls (L03). Lanes per `_docs/TESTING_STRATEGY.md`: **pure-domain
descriptor + `renderToString` render assertions live in Vitest** (`tests/vitest/
pages/*` holds the model round-trips + renderer suites); `tests/unit/pages/` (Bun)
is reserved for DB/service integration + the Ajv `validation.test.ts`, so it is NOT
used here. jsdom animation-state checks go in the Vitest content lane.

## Test shape

**Vitest — `tests/vitest/pages/page-renderer-v2.test.tsx`** (extend, the established
`renderToString` render suite used by 521-02-L02/L03):

```ts
it("glyph map keys === animatedIconNames", () => {});
it("keyframes CSS guarded by prefers-reduced-motion: no-preference", () => {});
it("renders <svg size> in [data-anim-icon=spin] with --anim-speed + color", () => {});
it("animation:'none' ⇒ no data-anim-icon attr (static)", () => {});
it("invalid name ⇒ sparkles fallback", () => {});
it("each icon block emits a <style data-anim-icon-css> whose body === ANIMATED_ICON_KEYFRAMES_CSS (idempotent; dup copies inert — no strict single-count)", () => {});
it("color re-sanitized at render (sanitizeAuthoringCssColor) ⇒ bad color → var(--primary)", () => {});
```

**Vitest — `tests/vitest/pages/page-editor-control-registry.test.ts`** (APPEND to
the shared single-writer descriptor suite, after 521-02's section cases merge —
the SAME file 521-02-L01/L03 and the parent seam note target): the 5 icon block
descriptors are present in `pageBlockControlRegistry.icon`; option values ===
imported enums (`animatedIconNames` / `animatedIconAnimations`); `size`/`speed`
carry the expected `clamp`+`unit`; the icon controls do NOT appear in
`pageUniversalBlockControls`; `blockOptionCopy.icon` updated.

**Vitest — `tests/vitest/content/animatedIcon.test.tsx`** (**line 1 MUST be
`// @vitest-environment happy-dom`** — `vitest.config.ts` is `environment:"node"`
globally; DOM files opt in per-file like `tests/vitest/admin/adminApp.test.tsx:1`):

```ts
// @vitest-environment happy-dom
// NOTE: happy-dom/jsdom do NOT apply <style> @keyframes to getComputedStyle, so a
// `computed animationName none` assertion is NOT observable. Assert instead the
// DOM/inline-state the render actually sets:
it("reduce ⇒ data-anim-icon still present but keyframes are @media-guarded (assert the emitted CSS is wrapped in @media (prefers-reduced-motion: no-preference))", () => {});
it("no-preference marker ⇒ [data-anim-icon] carries the animation NAME attr + --anim-speed var for spin/pulse/bounce/draw", () => {});
```
The reduced-motion guarantee is asserted on the EMITTED CSS string (the keyframe
rules live inside `@media (prefers-reduced-motion: no-preference)`) — see the
`ANIMATED_ICON_KEYFRAMES_CSS` assertion in the render suite above — NOT via
`getComputedStyle(...).animationName`, which the test DOM does not compute from
`<style>` @keyframes.

## Definition of done

The animated-icon Vitest suites pass; regressions to the allowlist, the
reduced-motion CSS guard, the render-time color sanitize, or the
no-dependency/keyframe contract fail a test. No divergent duplicate under
`tests/unit/pages/` (the descriptor + render assertions share the existing Vitest
files owned by 521-02).
