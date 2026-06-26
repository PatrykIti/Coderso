# 1197 - TASK-476-02 Page Editor Live In-Edit Mark Feedback

**Date:** 2026-06-26
**Version:** Unreleased
**Tasks:** TASK-476 (done), TASK-476-02

## Key Changes

### Page V2 Authoring (inline text marks)

- Applied color/highlight/link marks are now painted **while** a text block is in
  inline edit, instead of only after the author leaves edit. The canvas
  contentEditable renders the marked children (`const content = children ?? text`)
  during edit, mirroring the existing rich-text (`preserveMarkup`) path. The
  commit still reads `innerText` and `block.props.marks` stays the source of
  truth, so text editing and offsets are unchanged.
- After applying a mark, the author's selection is restored over the marked range
  (`applyMark` records the range; a post-render `useEffect` re-selects it via the
  new `selectInlineTextRange` helper — the inverse of
  `readInlineTextSelectionRange`). So the color is visible immediately and the
  fragment can be re-colored in place in one click without re-selecting.

### Tests

- Added `tests/vitest/ui/page-authoring-canvas.test.tsx` coverage asserting a
  block's color mark paints as a `data-page-text-mark="color"` span inside the
  active (editing) inline-edit region.

## Validation

- `bun --cwd core lint` — pass.
- `bun --cwd core lint:types` — pass.
- `bunx vitest run` — `page-authoring-canvas` 10/10; `page-renderer-v2` /
  `page-document-v2` / `page-editor-control-registry` / `page-editor-xss-guards` /
  `page-inline-edit-contract` / `page-authoring-sanitizers` 132/132.
- `bun run gates:coderso` — baseline.
- Live smoke (`coderso-dev-core-host` + `playwright-cli`, real input): color a
  fragment → it shows while still editing and stays selected; apply a different
  color in place → replaces in one click; typing still works. Cleaned up via undo;
  no page saved or published.

## Notes

- Closes TASK-476 (parent + both children done). Documented in
  `_docs/PAGE_MODEL.md` (inline-mark interaction contract updated). Known
  limitation unchanged from the base mark model: editing the underlying text can
  shift character-offset marks (marks are not remapped on text edits).
