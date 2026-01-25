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
Admins define content structures without DB migrations.

**Goals:**
- `content_types`, `content_entries`, `content_revisions` tables.
- JSON schema validation for entries.
- Draft/publish flow similar to pages.
- Admin API endpoints for types and entries.

---

## Architecture

```
core/db/schema.ts
core/services/content/
  typeService.ts
  entryService.ts
  validation.ts
core/server/routes/
  contentTypeRoutes.ts
  contentEntryRoutes.ts

core/server/validation/
  contentSchemas.ts

tests/unit/content/
  typeService.test.ts
  entryService.test.ts
  validation.test.ts
```

---

## Sub-Tasks

### TASK-003-01_Schema_for_content_types_and_entries

**Status:** To Do

Define tables in `core/db/schema.ts`.

Constraints and indexes:
- `content_types.slug` unique.
- `content_entries` unique on `(type_id, slug)`.
- `content_entries.status` index.
- `content_entries.title` index (search).
- `content_revisions.entry_id` index.

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

export const contentEntries = pgTable("content_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  typeId: uuid("type_id").notNull().references(() => contentTypes.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  data: jsonb("data").notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | content_types, content_entries, content_revisions |
| `core/db/migrations/*` | migration files |

Schema sketch (revisions):

```ts
export const contentRevisions = pgTable("content_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  entryId: uuid("entry_id").notNull().references(() => contentEntries.id),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

### TASK-003-02_Entry_validation

**Status:** To Do

Validate content type schema and entry data with JSON schema validator
(e.g. Ajv).

Rules:
- Cache compiled validators per content type (in-memory map).
- Rebuild validator on content type update.
- Reject unknown fields (strict mode).

Example:

```ts
const validate = getSchemaValidator(contentType.schema);
if (!validate(entry.data)) {
  throw new ValidationError(validate.errors);
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/content/validation.ts` | schema validator wrapper |
| `core/server/validation/contentSchemas.ts` | request payload schemas |

Validator sketch:

```ts
const validatorCache = new Map<string, ValidateFunction>();

export function getValidator(typeId: string, schema: any) {
  if (!validatorCache.has(typeId)) validatorCache.set(typeId, ajv.compile(schema));
  return validatorCache.get(typeId)!;
}
```

---

### TASK-003-03_Publish_and_revisions_for_entries

**Status:** To Do

Implement revision creation and publish workflow.

Steps:
1) On publish, create revision from current entry data.
2) Update status to `published` and set `published_at`.
3) If publish fails, keep entry in draft state (transaction).

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

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/content/entryService.ts` | CRUD + publish + revisions |
| `core/services/content/typeService.ts` | CRUD for content types |

Entry service sketch:

```ts
export async function createEntry(typeId: string, input) {
  return db.insert(contentEntries).values({
    typeId,
    title: input.title,
    slug: input.slug,
    data: input.data,
  }).returning();
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
- Validate schema on content type create/update.
- Validate entry data on create/update/publish.
- Ensure slug uniqueness per content type.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/routes/contentTypeRoutes.ts` | content type endpoints |
| `core/server/routes/contentEntryRoutes.ts` | entry endpoints |

Route sketch:

```ts
router.post("/content-types", requirePermission("content:write"), async (req) => {
  const created = await createContentType(req.body);
  return json(created);
});
```

---

## Testing Requirements

- [ ] `tests/unit/content/validation.test.ts` rejects invalid data.
- [ ] `tests/unit/content/typeService.test.ts` creates/updates schemas.
- [ ] `tests/unit/content/entryService.test.ts` publishes and revisions.
- [ ] `tests/integration/routes/contentTypes.test.ts` validates API.

Test sketch (validation.test.ts):

```ts
it("rejects entry with missing required field", async () => {
  await expect(createEntry(typeId, { data: {} })).rejects.toThrow();
});
```

---

## New Files to Create

- `core/services/content/typeService.ts`
- `core/services/content/entryService.ts`
- `core/services/content/validation.ts`
- `core/server/routes/contentTypeRoutes.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `core/server/validation/contentSchemas.ts`
- `tests/unit/content/typeService.test.ts`
- `tests/unit/content/entryService.test.ts`
- `tests/unit/content/validation.test.ts`
- `tests/integration/routes/contentTypes.test.ts`

---

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md` (if schema changes).
- `_docs/DATA_MODEL.md` (if table changes).
- `_docs/CMS_API.md` (content endpoints details).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-types-engine.md`
- Notes: content types schema + validation + entry workflows.

---

## Additional Docs

- `_docs/CMS_SPEC.md`
