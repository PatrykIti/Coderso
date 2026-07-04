# TASK-475-03: Single-Click-To-Edit And Drag-Select Entry
# FileName: TASK-475-03-Single-Click-To-Edit-And-Drag-Select.md

**Parent Task:** TASK-475
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-475-01 (shares the editable node ref + same component)

**Status:** ✅ Done
**Completed:** 2026-06-25

> **Completion note (2026-06-25):** Implemented as specified — a second single
> click on a selected text block enters inline edit with the caret placed at the
> click point (`caretRangeFromClientPoint`, fallback caret-at-end); the first
> click on an unselected block still only selects. Verified live (selected block →
> single click → edit) and by Vitest (selected enters edit, unselected does not).

---

## Overview

Lower the friction to start editing text on the canvas. Today entering inline
edit requires a **double-click** (`onDoubleClick`, gated `selected && !editing`,
`PageAuthoringCanvas.tsx:170-177`); a single click only selects the block and
leaves the text non-editable, so a drag from that state selects nothing and the
mark toolbar never appears (owner report).

**Chosen interaction model (owner decision):** keep "first click = select block",
then a **second single click** on the already-selected text block enters inline
edit and places the caret at the click point. From there a drag selects text and
shows the toolbar (drag-select in edit mode is already verified working). No
double-click required.

Scope: text-mark-capable inline targets only (`heading`/`text`/`quote`, i.e.
where `InlineEditableCanvasText` resolves an inline-edit target). Block selection,
nested innermost-block selection, and block-level panel actions are unchanged.

## Current State (verified)

- `PageAuthoringCanvas.tsx:178-182` — `onClick: editing ? stopPropagation : undefined`.
  When not editing, the text node has **no** click handler, so the click bubbles
  to the block-select handler (first click selects).
- `:170-177` — `onDoubleClick` is the only path into edit, requires `selected`.
- `:162` — editable `ref` (`focusInlineEditableNode`) focuses on activation and
  **collapses the caret to the end** (`:79-83`).
- Live-verified: single click → `editing=false`, `contentEditable=inherit`;
  double-click → edit; drag-select **works** once editing (selected "Build with",
  toolbar shown). So only the entry gesture needs changing.

## Implementation pseudocode

### 1. Single click on a selected, non-editing text block enters edit (+ remember click point)

```tsx
const pendingCaretPointRef = useRef<{ x: number; y: number } | null>(null);

onClick: editing
  ? (event) => event.stopPropagation()           // unchanged: swallow clicks while editing
  : selected
    ? (event) => {
        event.stopPropagation();
        pendingCaretPointRef.current = { x: event.clientX, y: event.clientY };
        onStartEdit({ blockId: block.id, propPath });
      }
    : undefined,                                  // not selected: let the click bubble to block-select
```
First click: `selected===false` ⇒ `undefined` ⇒ bubbles ⇒ block gets selected (unchanged).
Second click: `selected===true` ⇒ enters edit. (`onDoubleClick` can stay as a
redundant fast-path or be removed; keep it — a real double-click still works.)

### 2. Place the caret at the click point on activation (fallback: end)

Extend the editable ref callback (the `setEditableNode` introduced in
TASK-475-01; if 475-01 not yet landed, add an equivalent composed ref) so that,
after focusing, it honors a pending caret point:

```tsx
const setEditableNode = useCallback((node: HTMLElement | null) => {
  editableRef.current = node;                     // (from TASK-475-01)
  if (!node) return;
  const point = pendingCaretPointRef.current;
  pendingCaretPointRef.current = null;
  if (point) {
    node.focus();
    const range = caretRangeFromPoint(node.ownerDocument, point.x, point.y); // helper below
    const selection = node.ownerDocument.defaultView?.getSelection?.();
    if (range && selection) { selection.removeAllRanges(); selection.addRange(range); return; }
  }
  focusInlineEditableNode(node);                  // existing fallback: focus + caret at end
}, []);
```

Cross-browser caret helper (Chrome/Safari `caretRangeFromPoint`, Firefox
`caretPositionFromPoint`), clamped to the editable subtree:

```tsx
const caretRangeFromPoint = (doc: Document, x: number, y: number): Range | null => {
  if (typeof doc.caretRangeFromPoint === "function") return doc.caretRangeFromPoint(x, y);
  const pos = (doc as any).caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const r = doc.createRange();
  r.setStart(pos.offsetNode, pos.offset);
  r.collapse(true);
  return r;
};
```

## Data flow

click #1 (unselected) → bubbles → block selected (existing) → render with
`selected=true`.
click #2 (selected, not editing) → store click point → `onStartEdit` →
`editing=true` → `setEditableNode` focuses + places caret at point (fallback end).
press-drag inside the now-editable text → native selection → `onMouseUp` →
`updateSelectionRange` → mark toolbar (existing, verified).

## Error handling / invariants preserved

- `caretRangeFromPoint` returns `null` when the point is outside any text node →
  fall back to caret-at-end (`focusInlineEditableNode`). No throw.
- The change is scoped to `selected && !editing`; an unselected first click still
  only selects (no accidental edit), and nested innermost-block selection is
  untouched.
- Caret placement is a DOM side effect in a ref callback, not `setState` in an
  effect body (complies with AGENTS.md React-hooks rules). `setEditableNode` is a
  stable `useCallback` ⇒ invoked on mount/unmount only.
- `onDoubleClick` retained (real double-click still enters edit).

## Regression-test shape

Lane: **Vitest** — `tests/vitest/ui/page-authoring-canvas.test.tsx`.

- **Entry on single click of a selected block:** render the component with
  `selected=true`, `editing=false`; fire a single `click` on the inline text node;
  assert `onStartEdit` is called once with `{blockId, propPath:"text"}`.
- **No entry when unselected:** with `selected=false`, a single `click` must NOT
  call `onStartEdit` (it must bubble to block-select); assert `onStartEdit` not
  called.
- **Caret-at-point** is not assertable in jsdom (`caretRangeFromPoint` absent);
  unit-test the `caretRangeFromPoint` helper's fallback branch, and verify the
  caret-at-click behavior in the live smoke. Confirm the fallback (caret at end)
  still runs when no point/range.

## Validation

- `bun --cwd core lint`, `bun --cwd core lint:types`
- `bunx vitest run tests/vitest/ui/page-authoring-canvas.test.tsx`
- Live smoke (`coderso-dev-core-host` + `playwright-cli`, real input): select a
  heading (1 click), single-click again → caret appears in the text near the
  click; drag → fragment selected + toolbar shown; apply a color (depends on
  TASK-475-01). Clean up; do not publish.

## Security note

No routes/auth/schema/cache touched; pure canvas interaction wiring. No new sink.
