# TASK-194-03-02: New Block Insertion Focus and Scroll
# FileName: TASK-194-03-02_New_Block_Insertion_Focus_and_Scroll.md

**Priority:** Medium
**Category:** CMS/Pages + Admin/UI + Builder UX
**Estimated Effort:** Small
**Dependencies:** TASK-194-03
**Status:** To Do

---

## Overview

Bring newly inserted blocks into view so users do not have to hunt for them
below the fold. The report also asked for a transient visual anchor so the user
can immediately spot which block was just inserted.

Current owner seams:

- `core/admin/ui/pages/PageEditor.tsx:551-585`
  - add/insert handlers already select the new block id.
- `core/admin/ui/pages/PageEditor.tsx:963-974`
  - the editor renders `BlockList` with no post-insert scroll coordination.
- `core/admin/ui/pages/builder/BlockList.tsx:165-217`
  - rows are renderable targets but do not currently expose a stable scroll/focus
    hook for the editor.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageEditor.tsx:551-585`
- `core/admin/ui/pages/PageEditor.tsx:963-974`
- `core/admin/ui/pages/builder/BlockList.tsx:165-217`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx:837-913`
- `tests/vitest/ui/page-editor-shell-wave.test.tsx:1045-1099`
- `tests/vitest/pageBuilder/blockList.test.tsx` if new data attributes or focus
  targets are introduced

## Implementation Direction

- Keep `setSelectedId(nextBlock.id)` as the source of truth.
- Add a stable row marker such as `data-block-id`.
- After insert, queue a layout-safe scroll/focus step that brings the selected
  row into view without reordering or mutating content.
- Prefer `scrollIntoView({ block: "nearest" | "center" })` on the selected row
  or its main select button.
- Add a short-lived highlight state/class for the inserted block so the user
  gets the same visual landing cue even on long canvases.

## Implementation Sketch

```ts
setSelectedId(nextBlock.id);
queueMicrotask(() => {
  document
    .querySelector(`[data-block-id="${CSS.escape(nextBlock.id)}"]`)
    ?.scrollIntoView({ block: "center", behavior: "smooth" });
});
```

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: none beyond keeping the operation purely presentational and tied to
  the selected block id.

## Testing Requirements

- `tests/vitest/ui/page-editor-shell-wave.test.tsx`
  - after add/insert, the selected block id changes to the new block and the
    scroll/focus hook fires,
  - the temporary highlight state is applied and then clears.
- `tests/vitest/pageBuilder/blockList.test.tsx`
  - row markers/focus targets exist for selected blocks if new attributes are
    introduced,
  - highlight class/attribute renders for the targeted block only.

## Documentation Updates Required

- `_docs/CMS_SPEC.md` if the editor UX contract is documented there
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Adding a new block scrolls the canvas to the inserted block.
2. The inserted block is visually highlighted for a short, deterministic window.
3. The inserted block is still selected as the details target.
4. No block order or data semantics change.
