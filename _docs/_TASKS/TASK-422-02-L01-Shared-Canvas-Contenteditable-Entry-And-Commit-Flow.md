# TASK-422-02-L01: Shared Canvas Contenteditable Entry And Commit Flow
# FileName: TASK-422-02-L01-Shared-Canvas-Contenteditable-Entry-And-Commit-Flow.md

**Parent Subtask:** TASK-422-02
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-422-02, TASK-422-01-L01
**Status:** ⏳ To Do

---

## Overview

Wire the inline-edit contract into `PageEditor.tsx` and the shared Page canvas
renderer so selected text-bearing blocks can enter `contentEditable` mode and
commit through the same block-update path as the floating inspector.

---

## Implementation Pseudocode

```tsx
function InlineEditableCanvasText({ block, propPath, selected }) {
  const target = resolveInlineEditTarget(block, propPath);
  const [editing, setEditing] = useState(false);

  return (
    <span
      contentEditable={editing}
      data-page-editor-inline-edit={editing ? "active" : "idle"}
      onDoubleClick={selected ? () => setEditing(true) : undefined}
      onBlur={(event) => commitInlineEdit(block.id, propPath, event.currentTarget.textContent ?? "")}
    />
  );
}
```

Expected data flow:

- Dblclick or Enter on a selected target enables inline editing.
- Blur/Escape commits through the existing `updateBlock` path.
- The existing contenteditable hotkey guard remains the single suppression path.

Error handling:

- Deleted/missing blocks abort commit safely.
- Unchanged text is a no-op.

Regression-test shape:

- Vitest UI coverage for enter/edit/commit, hotkey suppression, and panel/canvas
  synchronization.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** no raw `innerHTML` may be written into Page props.

---

## Testing Requirements

- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

