# TASK-202-01-02: Duplicate Name Visibility and Relation Target Labels
# FileName: TASK-202-01-02_Duplicate_Name_Visibility_and_Relation_Target_Labels.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + Relations
**Estimated Effort:** Medium
**Dependencies:** TASK-202-01
**Status:** Done (2026-04-23)

---

## Overview

Fix duplicate-name ambiguity from `BUG-2` and `UX-2`. The list may contain many
`News` or `Notes` records, and relation dropdowns currently render only the
display name.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/ContentTypeList.tsx:30-38`
  - derive duplicate-name groups.
- `core/admin/ui/content-types/ContentTypeTable.tsx:74-108`
  - render duplicate context near the name and keep slug visible.
- `core/admin/ui/content-types/ContentTypeEditor.tsx:170-180`
  - pass enough relation target metadata to the field editor.
- `core/admin/ui/content-types/FieldEditor.tsx:256-280`
  - render relation options as name plus slug or subtitle.
- `tests/vitest/ui/content-type-table.test.tsx`
- `tests/vitest/ui/field-editor-relation.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged.
- RBAC: `content:read`.
- CSRF: not applicable.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: unchanged.
- Anti-abuse: relation labels must expose only safe summary fields: name, slug,
  and optionally field count/status when already available in the list summary.

## Testing Requirements

- Duplicate names show an explicit duplicate indicator in list rows.
- Relation dropdown options include slug context such as `News (news-855f...)`.
- Existing unique-name relation options remain readable.
- Fallback relation target input still works when the list cannot load.

## Documentation Updates Required

- `_docs/CONTENT_RELATIONS.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Duplicate names are visible before the admin opens a record.
2. Relation targets with duplicate names are distinguishable.
3. The UI still preserves relation values by slug.
