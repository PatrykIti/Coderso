# TASK-202-01: Engine List Discovery and Content Type Identity
# FileName: TASK-202-01_Engine_List_Discovery_and_Content_Type_Identity.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-202
**Status:** Done (2026-04-23)

---

## Overview

Make the Engine list and relation-target selection manageable when the instance
contains many content types, duplicate names, and generated records. This
subtask covers `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` findings `BUG-2`, `BUG-7`,
`UX-1`, and `UX-2`.

Current code shows the gaps:

- `ContentTypeList.tsx:30-38` maps all types directly into rows without list
  query, sort, or filter state.
- `ContentTypeTable.tsx:32-117` renders a static table with a single `Edit`
  action and no duplicate context.
- `ContentTypeEditor.tsx:170-180` loads relation target labels as name/slug
  pairs, but `FieldEditor.tsx:275-279` renders only the name.

## Sub-Tasks

- `TASK-202-01-01_Content_Type_List_Search_Sort_Status_Filters.md`
- `TASK-202-01-02_Duplicate_Name_Visibility_and_Relation_Target_Labels.md`
- `TASK-202-01-03_Screen_UUID_Name_Hygiene_and_Generator_Guard.md`

## Scope

- Add list search by name and slug.
- Add deterministic sorting for Name, Slug, Fields, and Status.
- Add status filter once `TASK-202-05-01` makes status real; until then, keep
  the UI explicit that status is unavailable instead of filtering fake values.
- Surface duplicate-name context in list rows.
- Render relation options with name plus slug so duplicate names are
  distinguishable.
- Trace the source of `Screen <uuid>` content type names and guard the owning
  generator path across all current content-type writers, not only the visible
  custom-screen UI. This source guard is part of the list/identity wave; cleanup
  of existing records waits for the safe delete/archive path in `TASK-202-03`.

Out of scope:

- bulk cleanup or deletion of existing data before delete safety lands,
- a separate content type registry client,
- a new table framework,
- changing public entry runtime routes.

## Files to Change

- `core/admin/ui/content-types/ContentTypeList.tsx:22-115`
- `core/admin/ui/content-types/ContentTypeTable.tsx:32-117`
- `core/admin/ui/content-types/ContentTypeEditor.tsx:170-180`
- `core/admin/ui/content-types/FieldEditor.tsx:256-280`
- generation owner identified by `TASK-202-01-03`
- content-type upsert/creation owners identified by `TASK-202-01-03`
- `tests/vitest/ui/content-type-table.test.tsx`
- `tests/vitest/ui/field-editor-relation.test.tsx`
- `tests/vitest/ui-integration/contentTypes.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged authenticated admin session/API-key path.
- RBAC: unchanged `content:read`.
- CSRF: not applicable for read-only list/filter/relation display.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: list and relation labels must not expose raw schema data or
  unrelated entry payloads.

## Testing Requirements

- Vitest:
  - content type table search/sort/filter rendering,
  - duplicate-name badges or helper text,
  - relation target labels include slug context,
  - generated-name guard coverage in the real owner path once the generator is
    identified; do not add a detached helper test that the current writers never
    call.
- Bun only if generator/service behavior changes.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CONTENT_RELATIONS.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Admins can find a content type by name or slug on the Engine list.
2. Duplicate content type names are visible and relation targets are
   distinguishable.
3. UUID-like generated screen type names have a named owner and prevention
   guard.
