# TASK-539-04: Independent Transform Channels

# FileName: TASK-539-04-Independent-Transform-Channels.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Composition CSS / Interaction Contract
**Estimated Effort:** Large
**Dependencies:** TASK-539-01, TASK-539-02, TASK-539-03
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Define one deterministic transform composition contract so reveal, decoration,
hover, tilt, magnetic motion, and layer anchoring cannot overwrite one another.
Also own the corrected marquee rail and non-interactive glow CSS selectors.

## Leaves

| Leaf | Scope | Status |
|---|---|---|
| TASK-539-04-L01 | Composition attributes, variables, keyframes, marquee/glow CSS | ⏳ To Do |
| TASK-539-04-L02 | CSS/attribute independence proof | ⏳ To Do |

## Ownership

- L01 is the sole TASK-539 writer of
  `core/services/pages/pageCompositionEffects.tsx` and owns compatibility/
  changed-behavior updates in both named CSS suites before its source gate.
- L02 owns only additive cross-effect composition/interactivity CSS cases; it cannot
  re-baseline L01 assertions.
- Renderer/runtime leaves consume exact exported names and may not introduce a second
  transform formula or selector vocabulary.

## Security Contract

No route or author string is added. Attributes are fixed names and values are model
enums/clamped numbers. Generated CSS is a static literal; no `style`/HTML payload is
accepted. Pointer and reduced-motion behavior remains progressive enhancement.

## Acceptance

- Every transform-bearing declaration changes only its owned transform variables; no
  effect writes a whole competing transform. Existing non-transform channels such as
  opacity, filter, and box-shadow remain effect-owned.
- Magnetic is stamped by the composition resolver when authored.
- Marquee is one nowrap rail with two adjacent segments.
- Decorative pseudo-elements cannot capture pointer input.
- An unauthored block emits no new data attributes or inline variables.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- tests/vitest/pages/page-composition-effects.test.ts tests/vitest/pages/task-534-interactivity-css.test.ts
git diff --check
```
