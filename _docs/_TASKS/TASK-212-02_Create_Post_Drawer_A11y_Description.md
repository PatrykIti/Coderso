# TASK-212-02: Create Post Drawer A11y Description
# FileName: TASK-212-02_Create_Post_Drawer_A11y_Description.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI + Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-212, TASK-204-01
**Status:** To Do

---

## Overview

Repair `BUG-8` from the 2026-04-25 Posts replay. Opening Create New Post logs a
Radix missing description warning because the drawer's `aria-describedby`
references a missing element id.

The visible copy already exists: `Start a new article and publish when ready.`
The implementation should bind that copy through the shared `SheetDescription`
primitive instead of a plain paragraph.

## Sub-Tasks

- `TASK-212-02-01_Create_Post_Drawer_SheetDescription_Wiring.md`
- `TASK-212-02-02_Post_Dialog_A11y_Regression_Matrix.md`

## Files to Change

- `core/admin/ui/posts/PostsCreateDrawer.tsx`
- new focused `tests/vitest/ui/posts-create-drawer-a11y.test.tsx`, or
  `tests/vitest/ui/page-post-list-wave.test.tsx` only if its sheet mock is
  upgraded to faithfully expose the Radix title/description relationship

## Implementation Direction

Use the same pattern already used by fixed sheet/dialog surfaces:

```tsx
<SheetTitle>Create New Post</SheetTitle>
<SheetDescription className="text-xs text-muted-foreground">
  Start a new article and publish when ready.
</SheetDescription>
```

Do not hand-roll ids or aria props unless the shared sheet primitive cannot
cover the contract.

## Security Contract

- Visibility: internal admin create drawer only.
- Auth model: unchanged admin session/API-key path for the create mutation.
- RBAC: unchanged `content:write`.
- CSRF: existing create request keeps current CSRF behavior.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: unchanged create payload validation.
- Anti-abuse: no user-provided values are inserted into description ids or
  hidden accessible labels.

## Testing Requirements

- The a11y regression test must exercise the real `SheetContent` /
  `SheetDescription` wiring, or a faithful test double that behaves like the
  shared Radix sheet primitives:
  - `SheetContent` renders a `role="dialog"` node;
  - `SheetDescription` creates the element referenced by `aria-describedby`;
  - a plain paragraph under `SheetTitle` does not satisfy the assertion.
- Do not close this task from the current shallow sheet mocks that render
  `SheetContent` as a plain `<div>` and `SheetDescription` as an unbound node.
- Render Create New Post drawer open and assert:
  - `role="dialog"` has `aria-describedby`;
  - the referenced id exists in the DOM;
  - the referenced node contains `Start a new article and publish when ready.`;
  - test output is console-clean under the global Vitest guardrails.
- Manual Playwright:
  - open Create New Post and confirm no Radix warning in console.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-POSTS.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Create New Post drawer no longer emits the Radix missing-description warning.
2. The visible description remains unchanged and is programmatically associated
   with the drawer content.
3. The test catches a future plain-`p` regression.
