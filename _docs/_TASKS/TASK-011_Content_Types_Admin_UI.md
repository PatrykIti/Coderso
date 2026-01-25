# TASK-011: Content Types Admin UI
# FileName: TASK-011_Content_Types_Admin_UI.md

**Priority:** High
**Category:** CMS/ContentTypes
**Estimated Effort:** Large
**Dependencies:** TASK-003, TASK-004, TASK-024
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
core/admin/ui/content-types/
  ContentTypeList.tsx
  ContentTypeEditor.tsx
  SchemaBuilder.tsx
  FieldEditor.tsx
core/admin/ui/entries/
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

Rules:
- Field `name` is unique per content type.
- `name` uses `snake_case` or `kebab-case` (pick one and enforce).
- Required fields cannot have empty default.
- Relation fields require target type slug.

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
| `core/admin/ui/content-types/SchemaBuilder.tsx` | schema builder UI |
| `core/admin/ui/content-types/FieldEditor.tsx` | field config |

Schema builder sketch:

```tsx
<SchemaBuilder
  fields={fields}
  onChange={setFields}
/>
```

---

### TASK-011-02_Content_type_CRUD_UI

**Status:** To Do

- Create, edit, delete content types.
- Validate schema on save (client + server).
- Lock delete if content type has entries (confirm with double step).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/content-types/ContentTypeList.tsx` | list view |
| `core/admin/ui/content-types/ContentTypeEditor.tsx` | editor view |

Editor sketch:

```tsx
<ContentTypeEditor
  schema={schema}
  onSave={() => saveType(schema)}
/>
```

API call sketch:

```ts
await fetch("/admin/api/content-types", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
  body: JSON.stringify({ name, slug, schema }),
});
```

---

### TASK-011-03_Entry_list_UI

**Status:** To Do

- List entries per content type.
- Filters by status (draft/published).
- Search by title/slug.
- Bulk actions: delete, publish (optional in v1).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/entries/EntryList.tsx` | list + filters |

List sketch:

```tsx
<EntryList
  items={entries}
  onFilterChange={setFilters}
/>
```

---

### TASK-011-04_Entry_editor_UI

**Status:** To Do

- Form generated from schema.
- Draft save and publish buttons.
- Preview token flow.
- Autosave draft (debounced).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/entries/EntryEditor.tsx` | entry editor |
| `core/admin/ui/entries/FieldRenderer.tsx` | schema-based inputs |

Field renderer sketch:

```tsx
function FieldRenderer({ field, value, onChange }) {
  if (field.type === "text") return <Input value={value} onChange={onChange} />;
  if (field.type === "boolean") return <Checkbox checked={value} onChange={onChange} />;
  return null;
}
```

---

## Testing Requirements

- [ ] `tests/unit/contentUi/schemaBuilder.test.tsx` creates valid schema.
- [ ] `tests/unit/contentUi/entryEditor.test.tsx` renders fields correctly.
- [ ] `tests/integration/ui/contentTypes.test.tsx` saves and publishes.
- [ ] `tests/integration/ui/contentTypes.test.tsx` prevents invalid field names.

---

## New Files to Create

- `core/admin/ui/content-types/ContentTypeList.tsx`
- `core/admin/ui/content-types/ContentTypeEditor.tsx`
- `core/admin/ui/content-types/SchemaBuilder.tsx`
- `core/admin/ui/content-types/FieldEditor.tsx`
- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryEditor.tsx`
- `core/admin/ui/entries/FieldRenderer.tsx`
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
