# TASK-476-02: Live In-Edit Mark Feedback
# FileName: TASK-476-02-Live-In-Edit-Mark-Feedback.md

**Parent Task:** TASK-476
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-475 (real-input toolbar), TASK-471-03 (color marks)
**Status:** ⏳ To Do

---

## Overview

While a text block is in inline edit, the canvas paints **plain text**, not the
mark-painted children:

```ts
// PageAuthoringCanvas.tsx
const content = editing && !preserveMarkup ? text : (children ?? text);
```

So an applied color/highlight is invisible until the author clicks away to exit
edit. This is the dominant reason the color controls feel unresponsive (the mark
*is* stored on `block.props.marks` immediately — verified live in TASK-475 — it
just is not shown in-edit). The plain-text-during-edit choice keeps text editing
simple (caret offsets map to a single flat text node), so showing marked spans
during edit is a deliberate, non-trivial change.

## Why this is its own task (risk)

Rendering `children` (the `data-page-text-mark` spans) inside the live
`contentEditable` means:
- React reconciles a richer DOM while the user types; mark application
  re-renders the editable and can reset the caret/selection.
- Caret-offset ↔ mark-offset mapping must stay correct as the user edits inside
  vs. outside colored spans.
This is effectively the rich-text inline-editing problem and must be designed +
tested carefully (cursor stability, IME, paste, undo) before changing line ~306.

## Candidate approaches (to evaluate during implementation)

1. Show `children` during edit and accept a caret reset after each mark apply
   (restore caret to the applied range end). Smallest visual change; verify
   typing/cursor stability across Chrome/Firefox/WebKit.
2. Keep plain text but overlay a non-editable, absolutely-positioned painted copy
   that mirrors the marks (display-only), under the caret layer.
3. Lighter interim: an active-color indicator on the toolbar swatches reflecting
   the mark at the caret (does not paint the text but signals state).

## Acceptance

- Applying a color/highlight/link while editing visibly updates the selected
  fragment without breaking typing, caret position, selection, undo/redo, or
  commit-on-blur. Cross-browser live-verified.
- Vitest coverage for the chosen rendering path; live smoke on real input.

## Validation

- `bun --cwd core lint`, `bun --cwd core lint:types`, relevant Vitest suites.
- Real-input live smoke across the edit/apply/type/commit cycle.
