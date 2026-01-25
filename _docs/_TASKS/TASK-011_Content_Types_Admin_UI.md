# TASK-011: Content Types Admin UI
# FileName: TASK-011_Content_Types_Admin_UI.md

**Priority:** High
**Category:** CMS/ContentTypes
**Estimated Effort:** Large
**Dependencies:** TASK-003, TASK-004
**Status:** To Do

---

## Overview

Build admin UI for content type schemas and content entries. This includes
schema builder, entry forms, and publish/preview actions.

**Goals:**
- Create and edit content type schemas.
- Dynamic entry editor based on schema.
- Draft/publish/preview flow for entries.

---

## Architecture

```
admin/ui/content-types/
  ContentTypeList.tsx
  ContentTypeEditor.tsx
  SchemaBuilder.tsx
  FieldEditor.tsx
admin/ui/entries/
  EntryList.tsx
  EntryEditor.tsx
  FieldRenderer.tsx

tests/unit/contentUi/
  schemaBuilder.test.tsx
  entryEditor.test.tsx
```

---

## Sub-Tasks

### TASK-011-01_Schema_builder_UI

**Status:** To Do

Schema fields: text, richtext, number, boolean, select, media, relation.

Example field definition:

```json
{
  "name": "title",
  "type": "text",
  "required": true,
  "label": "Title",
  "help": "Short title for listings"
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/content-types/SchemaBuilder.tsx` | schema builder UI |
| `admin/ui/content-types/FieldEditor.tsx` | field config |

---

### TASK-011-02_Content_type_CRUD_UI

**Status:** To Do

- Create, edit, delete content types.
- Validate schema on save (client + server).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/content-types/ContentTypeList.tsx` | list view |
| `admin/ui/content-types/ContentTypeEditor.tsx` | editor view |

---

### TASK-011-03_Entry_list_UI

**Status:** To Do

- List entries per content type.
- Filters by status (draft/published).
- Search by title/slug.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/entries/EntryList.tsx` | list + filters |

---

### TASK-011-04_Entry_editor_UI

**Status:** To Do

- Form generated from schema.
- Draft save and publish buttons.
- Preview token flow.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `admin/ui/entries/EntryEditor.tsx` | entry editor |
| `admin/ui/entries/FieldRenderer.tsx` | schema-based inputs |

---

## Testing Requirements

- [ ] `tests/unit/contentUi/schemaBuilder.test.tsx` creates valid schema.
- [ ] `tests/unit/contentUi/entryEditor.test.tsx` renders fields correctly.
- [ ] `tests/integration/ui/contentTypes.test.tsx` saves and publishes.

---

## New Files to Create

- `admin/ui/content-types/ContentTypeList.tsx`
- `admin/ui/content-types/ContentTypeEditor.tsx`
- `admin/ui/content-types/SchemaBuilder.tsx`
- `admin/ui/content-types/FieldEditor.tsx`
- `admin/ui/entries/EntryList.tsx`
- `admin/ui/entries/EntryEditor.tsx`
- `admin/ui/entries/FieldRenderer.tsx`
- `tests/unit/contentUi/schemaBuilder.test.tsx`
- `tests/unit/contentUi/entryEditor.test.tsx`
- `tests/integration/ui/contentTypes.test.tsx`

---

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md` (field UI notes).
- `_docs/CMS_API.md` (payload shapes if updated).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-types-admin-ui.md`
- Notes: schema builder and entry editor.

---

## Additional Docs

- `_docs/CMS_SPEC.md`
