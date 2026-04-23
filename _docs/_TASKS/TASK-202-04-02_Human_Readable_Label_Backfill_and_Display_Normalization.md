# TASK-202-04-02: Human Readable Label Backfill and Display Normalization
# FileName: TASK-202-04-02_Human_Readable_Label_Backfill_and_Display_Normalization.md

**Priority:** Medium
**Category:** CMS/Engine + Schema Builder + Compatibility
**Estimated Effort:** Small
**Dependencies:** TASK-202-04
**Status:** To Do

---

## Overview

Fix `UX-5`: existing schema fields can display labels such as `featuredImage`
instead of `Featured Image`. This leaf should improve display defaults without
destructively rewriting stored schema.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/content-types/schemaMapping.ts:235-274`
  - derive readable fallback label when `definition.title` is absent or
    identical to a machine key.
- `core/admin/ui/content-types/FieldEditor.tsx:125-132`
  - keep user-edited labels explicit.
- `core/admin/ui/entries/contentTypeLabels.ts`
  - reuse or align naming helpers if suitable.
- `tests/vitest/ui/schema-mapping.test.ts`
- `tests/vitest/ui/content-type-labels.test.ts`

## Security Contract

- Visibility: internal admin display/normalization only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: normalization must not mutate stored schema until the admin saves
  an explicit label change.

## Testing Requirements

- `featuredImage` displays as `Featured Image`.
- `featured-image` displays as `Featured Image`.
- Existing custom labels remain unchanged.
- Saving an explicit label still persists through `schemaMapping`.

## Documentation Updates Required

- `_docs/CONTENT_FIELDS.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Machine-like labels are readable in the editor.
2. Stored schema is not rewritten on load.
3. Explicit user labels remain authoritative.
