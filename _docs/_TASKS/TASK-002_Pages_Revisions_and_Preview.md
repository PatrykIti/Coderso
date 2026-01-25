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

### TASK-002-1: Define page tables

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

### TASK-002-2: Publish and revision services

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

### TASK-002-3: Preview token flow

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
