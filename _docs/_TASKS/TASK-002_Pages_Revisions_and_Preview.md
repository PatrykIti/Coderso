# TASK-002: Pages, Revisions, and Preview
# FileName: TASK-002_Pages_Revisions_and_Preview.md

**Priority:** High
**Category:** CMS/Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-001
**Status:** To Do

---

## Overview

Implement core page storage with revisions and preview tokens. This enables
Draft/Publish flow and WordPress-like preview for pages.

**Goals:**
- Pages table with current and published data.
- Revisions history.
- Preview tokens with TTL.
- Admin API for pages and revisions.

---

## Architecture

```
core/db/schema.ts
core/services/pages/
  pageService.ts
  revisionService.ts
  previewService.ts
core/server/routes/
  pageRoutes.ts
core/server/validation/
  pageSchemas.ts

tests/unit/pages/
  pageService.test.ts
  previewService.test.ts
  revisionService.test.ts
```

---

## Sub-Tasks

### TASK-002-01_Define_page_tables

**Status:** To Do

Define `pages`, `page_revisions`, and `preview_tokens` in `core/db/schema.ts`.

Schema example:

```ts
export const pages = pgTable("pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  currentData: jsonb("current_data").notNull(),
  publishedData: jsonb("published_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | pages, page_revisions, preview_tokens |
| `core/db/migrations/*` | migration files |

---

### TASK-002-02_Publish_and_revision_services

**Status:** To Do

Implement revision creation and publish workflow in services.

Service example:

```ts
async function publishPage(pageId: string, userId: string) {
  const page = await getPage(pageId);
  await createRevision(pageId, page.currentData, userId);
  await updatePage(pageId, {
    publishedData: page.currentData,
    status: "published",
    publishedAt: new Date(),
  });
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/pages/pageService.ts` | CRUD for pages |
| `core/services/pages/revisionService.ts` | create/list/restore revisions |

---

### TASK-002-03_Preview_token_flow

**Status:** To Do

Create and validate preview tokens with TTL. Use token hashing.

Example:

```ts
const token = crypto.randomUUID();
await db.insert(previewTokens).values({
  targetType: "page",
  targetId: pageId,
  tokenHash: hash(token),
  expiresAt: addMinutes(new Date(), 60),
});
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/services/pages/previewService.ts` | create/validate/expire tokens |
| `core/db/schema.ts` | preview_tokens table |

---

### TASK-002-04_Pages_admin_API_endpoints

**Status:** To Do

Endpoints:
- `GET /pages`
- `POST /pages`
- `GET /pages/:id`
- `PATCH /pages/:id`
- `POST /pages/:id/publish`
- `POST /pages/:id/unpublish`
- `POST /pages/:id/preview`
- `GET /pages/:id/revisions`
- `POST /pages/:id/revisions/:revisionId/restore`

Validation:
- Validate `data` against `PAGE_MODEL.md`.
- Reject unknown fields.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/routes/pageRoutes.ts` | route handlers |
| `core/server/validation/pageSchemas.ts` | JSON schema validation |

---

## Testing Requirements

- [ ] `tests/unit/pages/pageService.test.ts` covers CRUD.
- [ ] `tests/unit/pages/revisionService.test.ts` creates and restores revisions.
- [ ] `tests/unit/pages/previewService.test.ts` validates token TTL.
- [ ] `tests/integration/routes/pages.test.ts` covers admin endpoints.

---

## New Files to Create

- `core/services/pages/pageService.ts`
- `core/services/pages/revisionService.ts`
- `core/services/pages/previewService.ts`
- `core/server/routes/pageRoutes.ts`
- `core/server/validation/pageSchemas.ts`
- `tests/unit/pages/pageService.test.ts`
- `tests/unit/pages/revisionService.test.ts`
- `tests/unit/pages/previewService.test.ts`
- `tests/integration/routes/pages.test.ts`

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md` (if token format changes).
- `_docs/PAGE_MODEL.md` (if structure changes).
- `_docs/CMS_API.md` (pages endpoints details).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-pages-revisions-preview.md`
- Notes: pages schema, revisions, preview tokens, admin API.

---

## Additional Docs

- `_docs/CMS_SPEC.md`
