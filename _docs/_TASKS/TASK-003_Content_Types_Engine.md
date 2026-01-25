# TASK-003: Content Types Engine
# FileName: TASK-003_Content_Types_Engine.md

**Priority:** High
**Category:** CMS/Content
**Estimated Effort:** Large
**Dependencies:** TASK-001, TASK-002
**Status:** To Do

---

## Overview

Build dynamic content types with JSON schema storage and entry management.
Enable admin to define content structures without DB migrations.

**Goals:**
- `content_types`, `content_entries`, `content_revisions`.
- JSON schema validation for entries.
- Draft/publish flow similar to pages.

---

## Architecture

```
core/db/schema.ts
core/services/content/
  typeService.ts
  entryService.ts
  validation.ts
```

---

## Sub-Tasks

### TASK-003-01_Schema_for_content_types_and_entries

**Status:** To Do

Schema example:

```ts
export const contentTypes = pgTable("content_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  schema: jsonb("schema").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Tables to include:
- content_entries
- content_revisions

---

### TASK-003-02_Entry_validation

**Status:** To Do

Validation flow:
- Validate schema when creating/updating a content type.
- Validate entry data against schema before save/publish.

Example (pseudo):

```ts
const validate = getSchemaValidator(contentType.schema);
if (!validate(entry.data)) {
  throw new ValidationError(validate.errors);
}
```

---

### TASK-003-03_Publish_and_revisions_for_entries

**Status:** To Do

Service example:

```ts
async function publishEntry(entryId: string, userId: string) {
  const entry = await getEntry(entryId);
  await createEntryRevision(entryId, entry.data, userId);
  await updateEntry(entryId, {
    status: "published",
    publishedAt: new Date(),
  });
}
```

---

### TASK-003-04_Content_types_admin_API_endpoints

**Status:** To Do

Endpoints:
- `GET /content-types`
- `POST /content-types`
- `PATCH /content-types/:id`
- `DELETE /content-types/:id`
- `GET /content/:type/entries`
- `POST /content/:type/entries`
- `GET /content/:type/entries/:id`
- `PATCH /content/:type/entries/:id`
- `POST /content/:type/entries/:id/preview`
- `POST /content/:type/entries/:id/publish`
- `POST /content/:type/entries/:id/unpublish`

Validation:
- Validate content type schema on create/update.
- Validate entry data against schema on create/update/publish.

---

## Testing Requirements

- [ ] Schema validation rejects invalid entries.
- [ ] Publish creates revision and sets status.
- [ ] Listing entries supports search filters.

---

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md` (if schema changes).
- `_docs/DATA_MODEL.md` (if table changes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-types-engine.md`
- Notes: content types schema + validation + entry workflows.

---

## Additional Docs

- `_docs/CMS_API.md` (content endpoints).
