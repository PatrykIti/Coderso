# TASK-522-02-L03: Custom-SVG Block Render + Editor Tests

# FileName: TASK-522-02-L03-Custom-SVG-Tests.md

**Parent Task:** TASK-522
**Parent Subtask:** TASK-522-02
**Priority:** High
**Category:** Tests / Security
**Estimated Effort:** Small
**Status:** ⏳ To Do

---

## Scope

Executable leaf. Vitest suites for the customSvg render (522-02-L01) + controls
(522-02-L02), including XSS-vector assertions at the RENDER boundary (defence in
depth). No production code.

## Test shapes

### `tests/vitest/pages/page-renderer-v2.test.tsx` (append)

- A `customSvg` block with the reference `house-line` SVG → `renderToString`
  contains `<svg` and a `<path`; `drawIn:true`,`drawSpeed:2400` → the wrapper carries
  `data-draw-in` and `--draw-speed:2400ms`, and the emitted `<path>` carries
  `pathLength="1"` (length-independent draw-in — assert a SHORT-path SVG gets it too).
- **XSS at render:** a `customSvg` block whose stored `props.svg` contains
  `<script>alert(1)</script>` / `onload=` / `<foreignObject>` / `href="javascript:…"`
  / a remote `<use href="http://…">` → the output contains NONE of those tokens and
  renders the neutral fallback (the render-time re-sanitize catches a value that
  bypassed write validation). Include the mXSS corpus (comment-hidden, CDATA,
  unbalanced-quote desync, slash-handlers, nested `<svg>`).
- **Client-render (no Node `Buffer`):** render the case with the `Buffer` global
  deleted (jsdom, mirroring the browser builder canvas) → no `ReferenceError`, sanitized
  `<svg>` still emitted (proves `sanitizeSvg` is isomorphic via `TextEncoder`).
- Empty / whitespace svg → fallback node (no crash).

### `tests/vitest/pages/page-editor-control-registry.test.ts` (append)

- `pageBlockControlRegistry.customSvg` has the 4 expected controls
  (`block.customSvg.props.{svg,label,drawIn,drawSpeed}`) as live
  `PageEditorControlDefinition`s (inputs `text/text/switch/number`, `drawSpeed.clamp`
  `{min:600,max:6000}`); no `kind`/`showWhen`/`prop` fields; the block is
  palette-insertable with icon-less copy.

## Validation commands

- `bun --cwd core vitest run tests/vitest/pages/page-renderer-v2.test.tsx
  tests/vitest/pages/page-editor-control-registry.test.ts`

## Hard Invariants

1. XSS vectors asserted neutralized at the RENDER boundary (not just write).
2. Vitest lane; no Bun file.
</content>
