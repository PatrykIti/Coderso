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
It must stay inside the current seam: today the toolbar exposes a global
`disabled` flag plus optional typography callbacks, not a second state model for
`editable but inherited` versus `read-only`.

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
  - disabled-state affordances must still prevent unintended mutation commands,
  - this leaf must not imply a richer inherited/read-only contract than the
    current toolbar props actually expose.

## Testing Requirements

- `tests/vitest/ui/post-richtext-toolbar-wave.test.tsx`
  - typography helper copy/tooltip is explicit,
  - current disabled/available states are visually/testably distinct,
  - grouped toolbar controls remain inert when disabled.
- `tests/vitest/ui/post-richtext-inline-typography-selection.test.ts`
  - the current selection/profile wiring stays compatible after the helper-copy
    change and no new typography state model is implied.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Typography controls communicate clearly under the current toolbar contract
   when values come from block-owned typography.
2. Disabled/unavailable states are explicit, not implied by vague copy.
3. Existing toolbar command routing remains unchanged.
