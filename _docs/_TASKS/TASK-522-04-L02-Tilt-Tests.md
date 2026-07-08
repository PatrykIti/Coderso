# TASK-522-04-L02: Tilt-On-Any-Block Tests

# FileName: TASK-522-04-L02-Tilt-Tests.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-04
**Priority:** High
**Category:** Tests / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Vitest render-shape + runtime-binding assertions for block tilt +
glare. No production code. (The runtime IIFE behavior is covered by the 522-01-L05
runtime suite; this leaf asserts the render-shape + control wiring end-to-end.)

## Test shapes

### `tests/vitest/pages/page-renderer-v2.test.tsx` (append)

- A card block with `style.tilt:"subtle"` → `renderToString` has
  `data-block-tilt="subtle"` on the frame + an outer `data-tilt-parent`;
  `style.tilt:"strong"` → `data-block-tilt="strong"`; `tiltGlare:true` → a `.cx-glare`
  child; `tilt:"none"`/unset → NONE of these (byte-identical).

### `tests/vitest/pages/page-editor-control-registry.test.ts` (append)

- `pageUniversalBlockControls` includes `block.tilt.strength` (`input:"select"`,
  `options === pageTiltStrengths`) and `block.tilt.glare` (`input:"switch"`), both live
  `PageEditorControlDefinition`s with array `path` and no `kind`/`showWhen` fields (the
  glare switch is always present — inert when tilt unset).

### Runtime (cross-ref, in the 522-01-L05 suite `page-effects-runtime.test.ts`)

- Assert the appended `[data-block-tilt]` binding: pointer math sets `rotateX`/
  `rotateY`, `strong`→10deg vs `subtle`→7deg, glare custom props update, reset on
  leave, no attach under coarse-pointer / reduced-motion.

## Validation commands

- `bun --cwd core vitest run tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/page-effects-runtime.test.ts`

## Hard Invariants

1. `tilt:"none"`/unset byte-identity asserted.
2. Vitest lane; no Bun file.
</content>
