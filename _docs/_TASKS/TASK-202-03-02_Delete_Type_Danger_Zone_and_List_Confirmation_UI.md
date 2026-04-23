# TASK-202-03-02: Delete Type Danger Zone and List Confirmation UI
# FileName: TASK-202-03-02_Delete_Type_Danger_Zone_and_List_Confirmation_UI.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-202-03-01, TASK-202-02-03
**Status:** To Do

---

## Overview

Add safe content type delete UI for `BUG-1`. The editor needs a Danger Zone and
the list row menu can expose Delete only through the same confirmation contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeEditor.tsx:405-503`
  - add Danger Zone after normal settings/schema controls.
- `core/admin/ui/content-types/ContentTypeTable.tsx:74-108`
  - trigger delete confirmation from row action menu.
- `core/admin/ui/content-types/ContentTypeList.tsx:73-115`
  - own list-side pending delete state and refresh behavior.
- `core/admin/services/contentTypesClient.ts:184-198`
- `tests/vitest/ui/content-type-table.test.tsx`
- `tests/vitest/ui/content-type-editor.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged.
- RBAC: `content:write`.
- CSRF: delete goes through `deleteContentType`.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: no client-side bypass of route guard.
- Anti-abuse:
  - confirmation names the exact content type name and slug,
  - UI explains blocked delete when entries or other owner dependencies exist,
  - no native `window.confirm`; use shared dialog primitives.

## Testing Requirements

- Editor renders a Danger Zone with delete affordance.
- List row delete opens a branded confirmation dialog.
- Confirm calls the shared client and removes the row only after success.
- Blocked delete surfaces a user-readable conflict message.
- Conflict details name the responsible owner area when the server reports one
  (entries, custom screens, taxonomies, routes/listings, or a documented
  follow-up).

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Content type delete is discoverable but never immediate.
2. The confirmation identifies name, slug, and dependency impact.
3. Delete failure does not remove local list/detail state.
