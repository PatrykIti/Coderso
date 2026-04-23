# TASK-202-02-01: Create Drawer Duplicate Validation and Create-to-Editor Flow
# FileName: TASK-202-02-01_Create_Drawer_Duplicate_Validation_and_Create_to_Editor_Flow.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-202-02, TASK-202-01-03 (writer inventory if shared validation exposes direct writer gaps)
**Status:** To Do

---

## Overview

Fix `BUG-2` create-side duplicate risk and `BUG-6` post-create dead end. A new
collection should validate uniqueness before submit, then route directly to its
editor with clear feedback.

This leaf must not become a UI-only duplicate-name check. The authoritative
normalization and uniqueness guard belongs in the existing content type contract,
and current creation/update callers must use that owner instead of copying a
second validator. If implementation finds a direct `contentTypes` writer that
cannot delegate in this leaf, document the owner, responsibility, reason, and
targeted follow-up before claiming the duplicate-name contract is closed.

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
  - reject duplicate names and slugs before insert; keep shared normalization and
    uniqueness helpers reusable by update and by current creation/upsert writers
    without creating a second validator.
- `core/services/content/typeService.ts:78-99`
  - reject update collisions with other records while allowing the current
    record to keep its own name/slug.
- `core/services/kits/solutionKitsInstallService.ts:1357-1475`
  - inspect the existing direct content type upsert path. If this leaf changes
    shared create/update invariants, route the path through the shared owner or
    record solution-kit install as a named owner with equivalent validation proof;
    do not copy a local duplicate-name helper.
- `core/services/assistant/actionExecutorService.ts:2731-2762`
  - verify assistant `content-type.upsert` continues through the shared
    `createContentType` owner and does not grow an assistant-only validator.
- `core/server/routes/contentTypeRoutes.ts:54-82`
  - map create and update duplicate-name/slug domain errors to stable API
    errors.
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
  - direct content-type writers must not bypass the shared uniqueness contract
    silently; any exception must name the owner and responsibility,
  - duplicate errors must be readable without leaking DB constraint details.

## Testing Requirements

- Create drawer blocks duplicate name and slug from current cached/list data.
- `typeService` rejects duplicate names and slugs even when the client misses
  the conflict.
- `typeService` rejects update collisions with another content type but accepts
  same-record name/slug persistence.
- Existing direct content-type creation/upsert owners either reuse the shared
  uniqueness guard or have a named owner/responsibility note with targeted proof.
- Route tests cover mapped create/update duplicate errors, not raw thrown
  strings.
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
4. No current content-type creation/upsert path can bypass the authoritative
   duplicate-name/slug contract without a named owner, responsibility, and test
   evidence.
