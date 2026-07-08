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

- A card block with `style.tilt:"subtle"` → `renderToString` has `data-tilt-parent` on
  the FRAME (`[data-block-id]`, the perspective parent) and `data-block-tilt="subtle"` on
  the INNER effect wrapper (the tilt node the runtime rotates); `style.tilt:"strong"` →
  `data-block-tilt="strong"`; `tiltGlare:true` → a `.cx-glare` child inside the inner
  wrapper; `tilt:"none"`/unset → NONE of these, no inner wrapper (byte-identical).

### `tests/vitest/pages/page-editor-control-registry.test.ts` (append)

- `pageUniversalBlockControls` includes `block.tilt.strength` (`input:"select"`,
  `options === pageTiltStrengths`) and `block.tilt.glare` (`input:"switch"`), both live
  `PageEditorControlDefinition`s with array `path` and no `kind`/`showWhen` fields (the
  glare switch is always present — inert when tilt unset).

### Runtime (cross-ref, in the 522-01-L05 suite `pageEffectsRuntime.test.ts`)

- Assert the appended `[data-block-tilt]` binding: pointer math sets `rotateX`/
  `rotateY`, `strong`→10deg vs `subtle`→7deg, glare custom props update, reset on
  leave, no attach under coarse-pointer / reduced-motion, AND it tilts on a page that
  has NO `[data-page-spotlight]` element (guards the finding-7 regression: the binding
  must have its OWN pointer:fine gate, not be nested in the spotlight's `sp` block).

## Validation commands

- From REPO ROOT (vitest is root-only; no `--cwd core`): `vitest run
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts
  tests/vitest/pages/pageEffectsRuntime.test.ts` (or `bun run test:vitest`).

## Hard Invariants

1. `tilt:"none"`/unset byte-identity asserted.
2. Vitest lane; no Bun file.
</content>
