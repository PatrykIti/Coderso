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
- `core/services/content/typeService.ts:63-76`
  - reject duplicate names and slugs before insert.
- `core/server/routes/contentTypeRoutes.ts:54-66`
  - map duplicate-name/slug domain errors to stable API errors.
- `core/server/validation/contentSchemas.ts:1-10`
  - keep create payload strict; extend only if the real contract changes.
- `tests/unit/content/typeService.test.ts`
- `tests/integration/routes/contentTypes.test.ts`
- `tests/vitest/ui-integration/contentTypes.test.tsx`
- `tests/vitest/ui/content-type-table.test.tsx` if create flow stays list-owned.

## Security Contract

- Visibility: internal admin create UI.
- Auth model: unchanged.
- RBAC: `content:write`.
- CSRF: existing `createContentType` CSRF flow.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: unchanged create payload shape unless the existing
  route schema explicitly changes.
- Anti-abuse:
  - client validation is advisory; `typeService` uniqueness remains
    authoritative for both name and slug,
  - duplicate errors must be readable without leaking DB constraint details.

## Testing Requirements

- Create drawer blocks duplicate name and slug from current cached/list data.
- `typeService` rejects duplicate names and slugs even when the client misses
  the conflict.
- Route tests cover mapped duplicate errors, not raw thrown strings.
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
