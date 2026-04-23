# TASK-199: Posts List Header Bulk Actions
# FileName: TASK-199_Posts_List_Header_Bulk_Actions.md

**Priority:** Medium
**Category:** CMS/Posts + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-195-01-02, TASK-198
**Status:** Done (2026-04-23)

---

## Overview

Apply the same no-layout-jump bulk-action pattern from Pages to Posts.

The previous Posts list bulk controls worked, but selecting rows inserted a
separate toolbar above the filters/table area. This pushed the table down and
made selection feel visually noisy. Posts should keep the table anchored and
render the selected-row controls in the header actions area next to `New`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/posts/PostsListPage.tsx`
  - render selected-post bulk controls inside `PageHeader.actions`,
  - keep controls to the left of the create trigger,
  - rename the list create trigger from `Create New Post` to `New`,
  - remove the standalone bulk toolbar row above filters/table,
  - keep the same list footer pattern used by Pages and Menus.
- `tests/vitest/ui/posts-list.test.tsx`
  - update the list shell smoke test for the `New` trigger.
- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - prove Posts bulk controls render inline in the header,
  - keep existing visible-scope bulk action behavior covered.

## Implementation Direction

- Preserve current Posts bulk behavior:
  - visible-scope selection,
  - `Publish`,
  - `Move to Draft`,
  - `Delete`,
  - delete confirmation,
  - partial failure feedback,
  - refresh and clear-selection after apply.
- Do not introduce a new posts bulk API route.
- Keep the header action order:
  - selected-count and bulk controls,
  - `New`.
- Use shorter visible copy in the header but preserve accessible clear-selection
  labeling.

## Security Contract

- Visibility: internal admin list only.
- Auth/RBAC/CSRF/rate-limit: unchanged, inherited from existing per-item Posts
  mutation endpoints.
- Reject-unknown validation: unchanged.
- Anti-abuse: destructive bulk delete still requires confirmation and executes
  only against selected visible IDs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/posts-list.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/726-2026-04-23-task-199-posts-list-header-bulk-actions.md`

## Acceptance Criteria

1. Selecting Posts rows no longer inserts a standalone bulk-action row above the
   table.
2. Bulk controls appear in the header actions area to the left of `New`.
3. `New` opens the same create drawer as before.
4. Existing Posts bulk behavior and validation remain unchanged.
5. Posts list shows the same filtered-count footer and `Previous` / `Next`
   controls as Pages and Menus.
