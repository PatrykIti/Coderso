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
draft/publish flow and WordPress-like preview for pages.

**Goals:**
- Pages table with current/published data.
- Revisions history.
- Preview tokens with TTL.

---

## Architecture

```
core/db/schema.ts
core/services/pages/
  pageService.ts
  revisionService.ts
  previewService.ts
```

---

## Sub-Tasks

### TASK-002-01_Define_page_tables

**Status:** To Do

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

Add:
- `page_revisions`
- `preview_tokens` (target_type=page)

---

### TASK-002-02_Publish_and_revision_services

**Status:** To Do

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

---

### TASK-002-03_Preview_token_flow

**Status:** To Do

Token example:

```ts
const token = crypto.randomUUID();
await db.insert(previewTokens).values({
  targetType: "page",
  targetId: pageId,
  tokenHash: hash(token),
  expiresAt: addMinutes(new Date(), 60),
});
```

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
- Reject unknown fields in payloads.

---

## Testing Requirements

- [ ] Publish flow creates revision and sets `published_data`.
- [ ] Preview token validation works and expires by TTL.
- [ ] Revisions list returns ordered history.

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md` (if token format changes).
- `_docs/PAGE_MODEL.md` (if structure changes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-pages-revisions-preview.md`
- Notes: pages schema, revisions, preview tokens.

---

## Additional Docs

- `_docs/CMS_API.md` (preview endpoint behavior).
