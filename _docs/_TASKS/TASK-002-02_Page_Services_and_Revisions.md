# TASK-002-02: Page Services & Revisions
# FileName: TASK-002-02_Page_Services_and_Revisions.md

**Priority:** High  
**Category:** CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002-01  
**Status:** Done (2026-01-28)  

---

## Overview

Implement core services for pages and revisions. This layer backs the admin UI (Page List + Page Editor) and exposes actions used by routes.

**UI Alignment:**
- **Page List** needs `listPages()` returning title, slug, status, updatedAt, author.
- **Create Page** drawer uses `createPage()` with `title`, `slug`, `template`.
- **Page Editor** uses `getPageById()` and `updatePageDraft()`.
- **Publish/Unpublish** actions use `publishPage()` and `unpublishPage()`.
- **Duplicate** in PageRowActions should use `duplicatePage()` (new helper; can be optional in v1).

---

## Architecture

```
core/services/pages/pageService.ts
core/services/pages/revisionService.ts
core/db/schema.ts
```

---

## Service API (proposed)

### pageService.ts
```ts
export type PageStatus = "draft" | "published" | "scheduled" | "archived";

export type PageData = {
  blocks: Array<Record<string, unknown>>; // validated in TASK-002-04
  seo?: { title?: string; description?: string; image?: string | null };
  settings?: { template?: string; showInNav?: boolean };
};

export async function listPages(): Promise<PageSummary[]> {}
export async function getPageById(id: string): Promise<Page | null> {}
export async function getPageBySlug(slug: string): Promise<Page | null> {}
export async function createPage(input: { title: string; slug: string; data: PageData; authorId?: string; template?: string }): Promise<Page> {}
export async function updatePageDraft(id: string, input: { title?: string; slug?: string; data?: PageData }): Promise<Page> {}
export async function publishPage(id: string, actorId?: string): Promise<Page> {}
export async function unpublishPage(id: string, actorId?: string): Promise<Page> {}
export async function deletePage(id: string): Promise<void> {}
export async function duplicatePage(id: string, actorId?: string): Promise<Page> {} // optional
```

### revisionService.ts
```ts
export async function createRevision(pageId: string, data: PageData, actorId?: string): Promise<PageRevision> {}
export async function listRevisions(pageId: string): Promise<PageRevision[]> {}
export async function restoreRevision(pageId: string, revisionId: string, actorId?: string): Promise<Page> {}
```

---

## Mock Data (for UI wiring)

### Page summary list (for `/admin/pages`)
```json
[
  {
    "id": "page_home",
    "title": "Homepage",
    "slug": "/",
    "status": "published",
    "author": { "id": "u_admin", "name": "Sarah Jenks" },
    "updatedAt": "2026-01-20T10:15:00Z"
  },
  {
    "id": "page_pricing",
    "title": "Pricing",
    "slug": "/pricing",
    "status": "draft",
    "author": { "id": "u_editor", "name": "Mike Ross" },
    "updatedAt": "2026-01-18T18:22:00Z"
  }
]
```

### Page detail (for `/admin/pages/:id`)
```json
{
  "id": "page_home",
  "title": "Homepage",
  "slug": "/",
  "status": "draft",
  "currentData": {
    "blocks": [{ "id": "blk1", "type": "hero", "data": { "headline": "Build faster" } }],
    "seo": { "title": "Homepage" },
    "settings": { "template": "landing" }
  },
  "publishedData": { "blocks": [] },
  "updatedAt": "2026-01-20T10:15:00Z",
  "publishedAt": "2026-01-15T08:12:00Z"
}
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/pages/pageService.ts` | implement service methods | CRUD + publish + unpublish + duplicate |
| `core/services/pages/revisionService.ts` | implement revision history | create/list/restore |

**Important:** use transactions for publish/unpublish/restore to avoid partial writes.

---

## Testing Requirements

### Unit tests
- `tests/unit/pages/pageService.test.ts`
  - create page (draft)
  - update draft data
  - publish -> creates revision + copies data
  - unpublish -> clears published data/status
  - duplicate -> copies current data and slug is unique

- `tests/unit/pages/revisionService.test.ts`
  - createRevision increments version
  - listRevisions returns ordered versions
  - restoreRevision updates pages.current_data

### Notes
- Use test DB or transaction rollback (same pattern as existing page tests).
- Validate that `updatedAt` changes on draft update.

---

## Documentation Updates Required

- `_docs/CMS_API.md` (page service endpoints rely on this)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-pages-revisions-preview.md`
