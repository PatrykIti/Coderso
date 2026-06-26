# 1195 - TASK-475 Page Editor Inline Mark Toolbar Real-Input Fixes

**Date:** 2026-06-25
**Version:** Unreleased
**Tasks:** TASK-475, TASK-475-01, TASK-475-03, TASK-475-02

## Key Changes

### Page V2 Authoring (canvas inline marks)

- Fixed the inline link URL `<input>` in the canvas mark toolbar: the toolbar
  wrapper's blanket `onMouseDown` `preventDefault()` was stealing the input's
  focus, so it could not be focused or typed into. The handler now skips
  `preventDefault` for `HTMLInputElement` targets while still cancelling the
  default for swatches/buttons (which must preserve the selection). Confirmed
  live: the URL field now focuses and accepts text, and applying a link wraps the
  selected fragment in a sanitized `<a rel="nofollow noreferrer">`.
- Made inline mark activation authoritative against the live DOM selection. The
  mark toolbar is an `absolute` sibling of the editable, so its mouse events never
  reach the editable's `mouseup`/`keyup` that maintain the `selectionRange`
  state. The toolbar `onMouseDown` now snapshots the live selection range
  (`readInlineTextSelectionRange`) into a ref and every control (color/highlight/
  bold/italic/link) reads `snapshot ?? state`, so marks apply reliably under real
  mouse/keyboard input regardless of React state timing.
- Kept inline edit alive while focus moves into the mark toolbar (`onBlur`
  `relatedTarget` containment guard against the toolbar ref); otherwise focusing
  the URL input would commit-and-unmount the toolbar mid-interaction. Focus is
  returned to the editable after a link is applied so a later click-away commits
  through the normal blur path.
- Lowered the friction to start editing text: a second single click on an
  already-selected text block now enters inline edit and places the caret at the
  click point (`caretRangeFromPoint`/`caretPositionFromPoint`, fallback to
  caret-at-end), instead of requiring a double click. The first click on an
  unselected block still only selects it. Drag-to-select then works without a
  double click. (TASK-475-03)

### Tests

- Added Vitest regression coverage in
  `tests/vitest/ui/page-authoring-canvas.test.tsx`: a color swatch applies via the
  live selection snapshot without a prior region `mouseup` (the masked real-input
  case); toolbar `mousedown` cancels the default for swatches but not for the URL
  input; a single click on a selected text block enters edit while an unselected
  one does not.

### Docs And Board

- Updated `_docs/PAGE_MODEL.md` for the canvas inline-mark interaction contract.
- Closed the TASK-475 family and synchronized `_docs/_TASKS/README.md`.

## Validation

- `bun --cwd core lint` — pass.
- `bun --cwd core lint:types` — pass.
- `bunx vitest run tests/vitest/ui/page-authoring-canvas.test.tsx` — 9/9 pass;
  broader page-editor suites (inline-edit-contract, renderer-v2, sanitizers,
  control-registry, xss-guards, state-helpers, clipboard, document-v2) — 146/146
  pass.
- `bun run gates:coderso` — baseline.
- Live smoke (`coderso-dev-core-host` + `playwright-cli`, real mouse/keyboard):
  fragment color applies to the selection and renders after exiting edit; link
  URL field focuses/types and applies a sanitized anchor; single click on a
  selected block enters edit. No page was saved or published.

## Notes / Follow-up

- Implementation evidence (live audit + root-cause trace) is captured in
  `_TMP-PAGE-EDITOR-COLOR-TOOLBAR-LIVE-AUDIT-2026-06-25.md`.
- Refined understanding recorded during implementation: applied marks are stored
  on `block.props.marks` and verified to be written on real-input clicks, but
  while a block is in inline edit the canvas intentionally paints **plain text**
  (`PageAuthoringCanvas.tsx`), so an applied color/highlight is not visible until
  the author clicks away. This "no live feedback while editing" behavior is the
  dominant reason the controls can feel unresponsive; it is a deliberate
  limitation of the plain-text-during-edit model and is **out of scope** for
  TASK-475. Recommended as a dedicated follow-up (live in-edit mark rendering).
