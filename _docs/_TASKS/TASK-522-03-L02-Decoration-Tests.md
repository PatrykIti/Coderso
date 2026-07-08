# TASK-522-03-L02: Decoration + Block-Frame Tests

# FileName: TASK-522-03-L02-Decoration-Tests.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-03
**Priority:** High
**Category:** Tests / Accessibility
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Vitest suites for the decoration effect + the shared block-frame
composition resolver wiring (522-03-L01). No production code.

## Test shapes

### `tests/vitest/pages/page-renderer-v2.test.tsx` (append)

- Block `style.decoration.motion` `float`/`drift`/`pulse`/`radiate`/`orbit` → wrapper
  `data-deco` set accordingly; `delay:900`/`duration:8000` → `--deco-delay:900ms` /
  `--deco-duration:8000ms`; `motion:"none"` → NO `data-deco` (reset, present-only).
- **Byte-identity:** a block with NO composition style → the frame `renderToString`
  is identical to the pre-522 output (no `data-*`, no `data-tilt-parent`, no
  `.cx-glare`). (Snapshot or explicit string compare of a minimal block.)
- Two decorated siblings with different `delay` produce different `--deco-delay`
  (stagger).

### `tests/vitest/pages/page-editor-control-registry.test.ts` (append)

- `pageUniversalBlockControls` includes `block.decoration.motion/delay/duration` as
  live `PageEditorControlDefinition`s: `motion` is `input:"select"` with
  `options === pageBlockDecorationMotions` (array), `delay`/`duration` are
  `input:"number"` with `clamp:{min,max}`; `path` is an array (e.g.
  `["style","decoration","motion"]`); no `kind`/`showWhen`/`min` fields exist. The
  composed block controls include them for every block type (they are universal).

## Validation commands

- `bun --cwd core vitest run tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts`

## Hard Invariants

1. Byte-identity for unstyled blocks explicitly asserted.
2. Vitest lane; no Bun file.
</content>
