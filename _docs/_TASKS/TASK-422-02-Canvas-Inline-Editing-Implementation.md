# TASK-422-02: Canvas Inline Editing Implementation
# FileName: TASK-422-02-Canvas-Inline-Editing-Implementation.md

**Parent Task:** TASK-422
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-422-01
**Status:** ⏳ To Do

---

## Overview

Wire inline editing into the Page Editor canvas using the TASK-422-01
contract. Text-bearing leaf blocks render an inline-editable region inside the
existing editable wrapper; entry is dblclick/Enter on a selected block; commit
goes through the same block-prop update path the floating panel uses.

Key integration points (verified against the 2026-06-10 audit):

- `core/admin/ui/pages/PageEditor.tsx` — selection wrapper, block update
  cycle, keyboard guard at ~492–493 (`[contenteditable='true']`), shared admin
  preview renderer slots.
- Canvas blocks are rendered by the shared renderer; the inline-editable
  region must wrap the same text node the renderer paints so WYSIWYG parity
  (canvas == front) is preserved.

Behavior requirements:

- Single click: select only (unchanged). Double-click or Enter: edit mode.
- While editing: Delete/Ctrl+K/Escape-to-deselect and other editor hotkeys are
  suppressed (extend the existing guard, do not add a parallel one).
- Blur/Escape: commit via `commitInlineText`; update flows through the same
  `updateBlock(blockId, "props", …)` path as the panel field; the panel field
  shows the new value without refetch.
- Edit mode is visually distinct from selection (caret + subtle outline);
  `data-page-editor-inline-edit` attribute exposed for tests.
- React Hooks Compiler rules: no synchronous `setState` in effect bodies; use
  event handlers and lazy state per `AGENTS.md` admin React rules.

---

## Implementation Pseudocode

```tsx
function CanvasBlockText({ block, propPath, selected }) {
  const target = resolveInlineEditTarget(block, propPath);
  const [editing, setEditing] = useState(false);
  if (!target) return <RenderedText block={block} propPath={propPath} />;
  return (
    <span
      contentEditable={editing}
      suppressContentEditableWarning
      data-page-editor-inline-edit={editing ? "active" : "idle"}
      onDoubleClick={selected ? () => setEditing(true) : undefined}
      onBlur={(event) => {
        setEditing(false);
        const next = commitInlineText(target, readProp(block, propPath),
          event.currentTarget.textContent ?? "");
        if (next !== readProp(block, propPath)) updateBlockProp(block.id, propPath, next);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.stopPropagation(); event.currentTarget.blur(); }
        if (event.key === "Enter" && !target.multiline) { event.preventDefault(); event.currentTarget.blur(); }
      }}
    >
      {readProp(block, propPath)}
    </span>
  );
}
```

Expected data flow:

- Selection state → dblclick → editing → blur → sanitize/commit →
  `updateBlockProp` → document state → both canvas and panel re-render.
- Enter on a selected block (keyboard path) focuses the first inline target.

Error handling:

- Commit of unchanged text is a no-op (no dirty-state churn).
- If the block is deleted while editing, blur handlers must not write to a
  missing block (guard by block id lookup).

Regression-test shape:

- Vitest UI tests in `tests/vitest/ui/`: enter/edit/commit cycle, hotkey
  suppression while editing, panel/canvas value sync, Escape and Enter
  semantics, no contentEditable on non-text blocks (image, divider, spacer).

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** only sanitized plain text reaches props; no `innerHTML`
  writes from the contentEditable region.
- **Anti-abuse controls:** not applicable.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- New/extended Vitest UI suite for inline editing.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- None beyond the parent family docs (TASK-422-03 owns docs/changelog).
