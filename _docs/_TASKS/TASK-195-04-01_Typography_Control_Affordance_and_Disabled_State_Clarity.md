# TASK-195-04-01: Typography Control Affordance and Disabled-State Clarity
# FileName: TASK-195-04-01_Typography_Control_Affordance_and_Disabled_State_Clarity.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI + UX
**Estimated Effort:** Small
**Dependencies:** TASK-195-04
**Status:** To Do

---

## Overview

Replace the vague typography helper text with clearer affordances.

Current toolbar code in
`core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx:454-519` renders
font controls plus the text `Typography reads from block.`. The QA report is
correct that this wording does not explain whether the controls are editable,
inherited, or disabled.

This leaf should make the typography row self-explanatory without changing the
underlying toolbar profile routing.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx:454-519`
- `tests/vitest/ui/post-richtext-toolbar-wave.test.tsx`
- `tests/vitest/ui/post-richtext-inline-typography-selection.test.ts`

## Security Contract

- Visibility: internal admin editor toolbar only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Anti-abuse:
  - helper copy and tooltips must describe real behavior only,
  - disabled/read-only states must still prevent unintended mutation commands.

## Testing Requirements

- `tests/vitest/ui/post-richtext-toolbar-wave.test.tsx`
  - typography helper copy/tooltip is explicit,
  - disabled or inherited states are visually/testably distinct,
  - grouped toolbar controls remain inert when disabled.
- `tests/vitest/ui/post-richtext-inline-typography-selection.test.ts`
  - inherited typography behavior stays compatible with the current selection
    model.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Typography controls communicate clearly when values are inherited from the
   block.
2. Disabled/read-only states are explicit, not implied by vague copy.
3. Existing toolbar command routing remains unchanged.
