# TASK-048-02: Relation Field UX & Data Model
# FileName: TASK-048-02_Relation_Field_UX_and_Data_Model.md

**Priority:** 🟡 Medium  
**Category:** CMS/Content  
**Estimated Effort:** Medium  
**Dependencies:** TASK-048-01, TASK-003-06  
**Status:** ✅ **Done** (2026-02-03)

---

## Overview

Make relations **user‑friendly**:
- Choose target Content Type from a dropdown (no slug typing).
- Pick related entries from a searchable list (no ID typing).
- Support **single** and **multi‑relation**.

---

## Data Model (Entry Data)

Single relation:
```json
{
  "related-project": "entry-id-123"
}
```

Multi‑relation:
```json
{
  "related-projects": ["entry-id-123", "entry-id-456"]
}
```

Schema meta example:
```json
{
  "type": "string",
  "xFieldType": "relation",
  "xRelationTarget": "projects",
  "xFieldConfig": { "multiple": true }
}
```

---

## Implementation Checklist

### Admin UI

| File | Change |
|------|--------|
| `core/admin/ui/content-types/FieldEditor.tsx` | replace slug input with dropdown |
| `core/admin/ui/content-types/ContentTypeEditor.tsx` | fetch content types list |
| `core/admin/ui/entries/FieldRenderer.tsx` | relation picker with search |
| `core/admin/ui/entries/EntryEditor.tsx` | pass content type list to renderer |

### Backend validation

| File | Change |
|------|--------|
| `core/services/content/validation.ts` | allow array for relation fields when `multiple` |
| `core/services/content/entryService.ts` | validate relation IDs exist |

---

## UI Details

**Content Type Editor**
```
Related content type:
  [ Projects ▼ ]

Tooltip:
  “Choose the type you want to connect to (e.g. Testimonials → Projects)”
```

**Entry Editor**
```
Related Projects:
  Search + select entries
  Multi‑select if enabled
```

---

## Testing Requirements

- Unit: relation field schema -> round‑trip preserves target + multiple flag
- Unit: entry validation rejects invalid relation IDs
- UI: relation picker renders options

---

## Documentation Updates Required

Update:
- `_docs/CONTENT_RELATIONS.md` (new)
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CMS_API.md` (relation data shape)

---

## Changelog

Add `_docs/_CHANGELOG/<next>-YYYY-MM-DD-relations-ux.md` and link TASK-048-02.
