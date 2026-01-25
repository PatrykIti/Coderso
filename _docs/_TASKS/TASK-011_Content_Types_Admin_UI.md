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
admin/ui/entries/
  EntryList.tsx
  EntryEditor.tsx
```

---

## Sub-Tasks

### TASK-011-1: Schema builder UI

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

---

### TASK-011-2: Content type CRUD UI

**Status:** To Do

- Create, edit, delete content types.
- Validate schema on save (client + server).

---

### TASK-011-3: Entry editor UI

**Status:** To Do

- Form generated from schema.
- Draft save and publish buttons.
- Preview token flow.

---

## Testing Requirements

- [ ] Create content type with valid schema.
- [ ] Entry editor renders correct fields and saves data.
- [ ] Publish and preview actions call correct API endpoints.

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
