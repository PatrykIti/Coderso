# TASK-048: Content Types & Content UX Expansion (Index)
# FileName: TASK-048_Content_Types_and_Content_UX_Expansion.md

**Priority:** 🟡 Medium  
**Category:** CMS/Content  
**Estimated Effort:** Large  
**Dependencies:** TASK-003 (Content Types Engine), TASK-003-06 (Content UI Wiring), TASK-009 (Widget Registry), TASK-043 (Entry Metadata)  
**Status:** 🚧 **In Progress** (2026-02-03)

---

## Overview

Make Content Types and Content (Entries) **WordPress‑like**, non‑technical, and production‑ready.  
Everything should be manageable from the UI (no manual JSON/SQL).  
This epic expands the backend model and admin UX to support:

- Rich field types (text, rich text, select, media, relation, etc.)
- Relation configuration (single + multi) without typing IDs
- Media picker integration (single/multi, allowed types)
- Taxonomies (categories/tags) per content type
- Clear guidance (tooltips, examples, hints)
- Documentation for real‑world usage (mabudo.pl style)

> Goal: A non‑technical user can model and edit content without knowing IDs or slugs.

---

## Sub-Tasks

| ID | Title | Focus |
|----|------|-------|
| TASK-048-01 | Field Types & Schema Meta | ✅ Done (2026-02-03) |
| TASK-048-02 | Relation Field UX & Data Model | ✅ Done (2026-02-03) |
| TASK-048-03 | Media Field UX & Storage Integration | ✅ Done (2026-02-04) |
| TASK-048-04 | Taxonomy System & Terms | ✅ Done (2026-02-04) |
| TASK-048-05 | Content Editor Help & Tooltips | ✅ Done (2026-02-04) |
| TASK-048-06 | Content Modeling Docs & Examples | ✅ Done (2026-02-04) |
| TASK-048-07 | Field Layout & Grouping UX | ✅ Done (2026-02-04) |
| TASK-048-08 | Entry Workflow & Validation UX | ✅ Done (2026-02-04) |
| TASK-048-09 | Entry List UX & Bulk Actions | Filters, quick edit, bulk publish/unpublish |

---

## Architecture (Target)

```
core/db/
  schema.ts                   # ADD: taxonomy tables, term assignments
core/services/content/
  typeService.ts              # UPDATE: schema meta + taxonomy fields
  entryService.ts             # UPDATE: relation/media validation
core/services/media/
  mediaService.ts             # REUSE: media list + filters
core/services/search/
  searchService.ts            # UPDATE: index taxonomy + relations

core/admin/ui/content-types/
  FieldEditor.tsx             # UPDATE: non‑technical relation target select
  ContentTypeEditor.tsx       # UPDATE: taxonomy config UI
  FieldLayoutEditor.tsx       # NEW: sections/tabs + field grouping
core/admin/ui/entries/
  FieldRenderer.tsx           # UPDATE: relation/media pickers
  EntryEditor.tsx             # UPDATE: help & tooltips
  EntryWorkflowPanel.tsx      # NEW: publish checklist + validation summary
  EntryBulkActions.tsx        # NEW: bulk actions UI for list/grid

_docs/
  CONTENT_TYPES_SPEC.md       # UPDATE: fields + relations + taxonomy
  CONTENT_FIELDS.md           # ADD
  CONTENT_RELATIONS.md        # ADD
  CONTENT_MODELING_COOKBOOK.md# ADD
  CONTENT_WORKFLOW.md         # ADD
  CONTENT_LIST_UX.md          # ADD
```

---

## Implementation Order

1) Field schema meta (types + config)  
2) Relation picker UX + multi‑relation  
3) Media picker UX + validation  
4) Taxonomies (categories/tags)  
5) Field layout/grouping UX  
6) Workflow/validation UX  
7) List UX + bulk actions  
8) UI hints & documentation

---

## Testing Requirements

- Unit tests for schema mapping and content validation
- UI tests for relation/media pickers and layout/grouping
- Integration tests for taxonomy CRUD + entry assignment
- UI tests for workflow checklist + bulk actions

---

## Documentation Updates Required

Update or add:
- `CONTENT_TYPES_SPEC.md`
- `CMS_SPEC.md`
- `CMS_API.md`
- `DATA_MODEL.md`
- `CONTENT_FIELDS.md` (new)
- `CONTENT_RELATIONS.md` (new)
- `CONTENT_MODELING_COOKBOOK.md` (new)
- `CONTENT_WORKFLOW.md` (new)
- `CONTENT_LIST_UX.md` (new)
- `_docs/README.md` (docs index)

---

## Changelog

Each subtask must produce its own changelog entry in `_docs/_CHANGELOG/`.
