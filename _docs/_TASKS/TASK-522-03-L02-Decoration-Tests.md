# TASK-522-03-L02: Decoration + Block-Frame Tests

# FileName: TASK-522-03-L02-Decoration-Tests.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-03
**Priority:** High
**Category:** Tests / Accessibility
**Estimated Effort:** Small
**Status:** ✅ Done

---

## Scope

Executable leaf. Vitest suites for the decoration effect + the shared block-frame
composition resolver wiring (522-03-L01). No production code.

## Test shapes

### `tests/vitest/pages/page-renderer-v2.test.tsx` (append)

- Block `style.decoration.motion` `float`/`drift`/`pulse`/`radiate`/`orbit` → the INNER
  effect wrapper gets `data-deco` set accordingly (`radiate` stays on the FRAME — box-shadow,
  no inner wrapper); `delay:900`/`duration:8000` → `--deco-delay:900ms` /
  `--deco-duration:8000ms` on the inner wrapper; `motion:"none"` → NO `data-deco` (reset,
  present-only).
- **Byte-identity:** a block with NO composition style → `toPageBlockRenderProps` output
  and the `renderToString` frame are identical to the pre-522 output (no `data-*`, no
  `data-tilt-parent`, no inner wrapper, no `.cx-glare`). (Snapshot or explicit string
  compare of a minimal block.)
- Two decorated siblings with different `delay` produce different `--deco-delay`
  (stagger).
- **Anchor + decoration compose (the reference floating-badge flow — regression guard
  for the transform-property collision, finding 4).** A block with
  `style.decoration.motion:"float"` AND `style.layer:{x,y,anchor:"top-right"}` keeps
  `data-layer` + `data-layer-anchor="top-right"` + `--layer-x/--layer-y` on the FRAME
  (`[data-block-id]`, via `toPageBlockRenderProps` — so the anchor translate lives on the
  frame AND the 522-05-L02 per-device `--layer-*` on `[data-block-id]` reaches it), while
  the INNER effect wrapper carries `data-deco="float"` (NOT `data-layer-anchor`) so the
  cx-float keyframe animates the inner descendant without clobbering the frame's anchor
  translate. The frame has NO `data-tilt-parent` (decoration is not tilt). Assert the same
  frame-layer/inner-effect split for `hoverEffect:"lift"` + anchor, and assert NO inner
  wrapper for `decoration.motion:"radiate"` + anchor (box-shadow, not transform → everything
  stays on the frame) and for a layer-only block with no transform effect.

### `tests/vitest/pages/page-editor-control-registry.test.ts` (append)

- `pageUniversalBlockControls` includes `block.decoration.motion/delay/duration` as
  live `PageEditorControlDefinition`s: `motion` is `input:"select"` with
  `options === pageBlockDecorationMotions` (array), `delay`/`duration` are
  `input:"number"` with `clamp:{min,max}`; `path` is an array (e.g.
  `["style","decoration","motion"]`); no `kind`/`showWhen`/`min` fields exist. The
  composed block controls include them for every block type (they are universal).

## Validation commands

- From REPO ROOT (vitest is root-only; no `--cwd core`): `vitest run
  tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts` (or `bun run test:vitest`).

## Hard Invariants

1. Byte-identity for unstyled blocks explicitly asserted.
2. Vitest lane; no Bun file.
</content>
