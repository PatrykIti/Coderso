# TASK-202-02-01: Create Drawer Duplicate Validation and Create-to-Editor Flow
# FileName: TASK-202-02-01_Create_Drawer_Duplicate_Validation_and_Create_to_Editor_Flow.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-202-02
**Status:** To Do

---

## Overview

Fix `BUG-2` create-side duplicate risk and `BUG-6` post-create dead end. A new
collection should validate uniqueness before submit, then route directly to its
editor with clear feedback.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx:23-84`
  - reuse slugify, add duplicate name/slug checks, emit success result.
- `core/admin/ui/content-types/ContentTypeList.tsx:73-115`
  - navigate to the created editor using shared admin navigation.
- `core/admin/utils/adminPaths.ts`
  - reference only if route helper coverage needs an explicit helper.
- `tests/vitest/ui-integration/contentTypes.test.tsx`
- `tests/vitest/ui/content-type-table.test.tsx` if create flow stays list-owned.

## Security Contract

- Visibility: internal admin create UI.
- Auth model: unchanged.
- RBAC: `content:write`.
- CSRF: existing `createContentType` CSRF flow.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: unchanged create payload shape unless server-side
  duplicate validation adds explicit error mapping.
- Anti-abuse:
  - client validation is advisory; server uniqueness remains authoritative,
  - duplicate errors must be readable without leaking DB constraint details.

## Testing Requirements

- Create drawer blocks duplicate name and slug from current cached/list data.
- Slug auto-generation still locks after manual edit.
- Successful create navigates to `/admin/coderso/engine/:id`.
- Success feedback names the created collection.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Duplicate name/slug creation is blocked before submit where possible.
2. A successful create opens the new content type editor.
3. The admin sees a clear creation success message.
