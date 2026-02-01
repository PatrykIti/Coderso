# TASK-048-04: Taxonomy System & Terms
# FileName: TASK-048-04_Taxonomy_System_and_Terms.md

**Priority:** 🟡 Medium  
**Category:** CMS/Content  
**Estimated Effort:** Large  
**Dependencies:** TASK-048-01, TASK-003  
**Status:** ⏳ **To Do** (2026-02-01)

---

## Overview

Introduce WordPress‑like taxonomies (Categories/Tags) that are:
- configurable per Content Type
- editable in Entry editor
- indexed for search/filtering

---

## Data Model

```
content_taxonomies
  - id
  - name
  - slug
  - type_id (content_types.id)
  - kind ("category" | "tag")

content_terms
  - id
  - taxonomy_id
  - name
  - slug

content_term_assignments
  - entry_id
  - term_id
```

---

## Implementation Checklist

### Backend
| File | Change |
|------|--------|
| `core/db/schema.ts` | new tables |
| `core/db/migrations/` | add migration |
| `core/services/content/taxonomyService.ts` | CRUD + assignments |
| `core/server/routes/taxonomyRoutes.ts` | REST API |
| `core/server/validation/taxonomySchemas.ts` | request validation |
| `core/services/search/searchService.ts` | index taxonomy terms |

### Admin UI
| File | Change |
|------|--------|
| `core/admin/ui/content-types/ContentTypeEditor.tsx` | taxonomy config UI |
| `core/admin/ui/entries/EntryMetadataPanel.tsx` | category/tag selectors |
| `core/admin/services/taxonomyClient.ts` | API client |

---

## UX Details

- In Content Type editor: toggle “Enable Categories”, “Enable Tags”
- In Entry editor: dropdown for categories + tag input (multi)
- Auto‑suggest terms for tags

---

## Testing Requirements

- Unit: taxonomy CRUD + assignment
- Integration: routes /content-types/:id/taxonomies
- UI: Entry editor shows taxonomy selectors

---

## Documentation Updates Required

Update:
- `_docs/DATA_MODEL.md`
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/CONTENT_FIELDS.md`

---

## Changelog

Add `_docs/_CHANGELOG/<next>-YYYY-MM-DD-taxonomy-system.md` and link TASK-048-04.
