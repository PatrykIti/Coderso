# TASK-002-05: Pages UI Wiring (Admin)
# FileName: TASK-002-05_Pages_UI_Wiring.md

**Priority:** High  
**Category:** CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002-04, TASK-006-06, TASK-006-07  
**Status:** To Do  

---

## Overview

Wire the existing Pages UI (Page List + Page Editor) to the real Pages API created in TASK‑002‑04. Replace mock data with live fetches and add loading/error handling. This makes the UI functional end‑to‑end.

---

## UI Alignment (must match current UI)

**Page List UI** (`/admin/pages`)
- Uses `PageListPage` + `PageTable` + `PageCreateDrawer` + `PageRowActions`
- Needs list, create, edit, publish, unpublish, preview, duplicate actions

**Page Editor UI** (`/admin/pages/:id`)
- Uses `PageEditor` + Page Builder blocks
- Needs load by id, save draft, publish, preview

---

## API Endpoints to Use

- `GET /admin/api/pages`
- `POST /admin/api/pages`
- `GET /admin/api/pages/:id`
- `PATCH /admin/api/pages/:id`
- `POST /admin/api/pages/:id/publish`
- `POST /admin/api/pages/:id/unpublish`
- `POST /admin/api/pages/:id/preview`
- `POST /admin/api/pages/:id/duplicate`

**Preview response**
```json
{ "token": "...", "previewUrl": "...", "expiresAt": "..." }
```

---

## Admin Service Layer (new)

Create `core/admin/services/pagesClient.ts` using `apiRequest`.

```ts
export type PageSummary = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "scheduled" | "archived";
  updatedAt: string;
  author: { id: string; name: string | null; email: string } | null;
};

export type PagePayload = {
  title: string;
  slug: string;
  template?: string;
  data: Record<string, unknown>;
};
```

**Functions**
- `listPages(): Promise<PageSummary[]>`
- `getPage(id: string)`
- `createPage(payload)`
- `updatePage(id, payload)`
- `publishPage(id)`
- `unpublishPage(id)`
- `previewPage(id, ttlMinutes?)`
- `duplicatePage(id)`

All non‑GET requests should pass `{ withCsrf: true }`.

---

## File‑by‑File Plan

### 1) `core/admin/services/pagesClient.ts` (new)
- Implement endpoints above.
- Add `isApiClientError` handling in UI components (same pattern as auth).

### 2) `core/admin/ui/pages/PageListPage.tsx`
- Replace mock data with `listPages()`.
- State: `items`, `isLoading`, `error`.
- On create success → redirect to `/admin/pages/:id`.
- If error → show `<Alert variant="destructive">` with message.

### 3) `core/admin/ui/pages/PageTable.tsx`
- Accept `items: PageSummary[]` and callbacks:
  - `onEdit(id)`
  - `onPreview(id)`
  - `onPublish(id)`
  - `onUnpublish(id)`
  - `onDuplicate(id)`
- Remove local `pages` array.

### 4) `core/admin/ui/pages/PageRowActions.tsx`
- Accept props with handlers and row status.
- Disable/enable “Publish/Unpublish” based on status.
- `Preview` opens new tab if previewUrl.

### 5) `core/admin/ui/pages/PageCreateDrawer.tsx`
- Controlled inputs for title, slug, template.
- `onCreate(payload)` callback from parent; show loading state.

### 6) `core/admin/ui/pages/PageEditor.tsx`
- Parse page id from `window.location.pathname` (or optional prop for tests).
- On mount: `getPage(id)` → set blocks/data.
- Save draft: `updatePage`.
- Publish: `publishPage` + refresh.
- Preview: call `previewPage` and open `previewUrl`.
- Handle error + loading state.

---

## Mock Payloads (for dev/test)

**Create page request**
```json
{
  "title": "About us",
  "slug": "/about",
  "template": "landing",
  "data": { "blocks": [] }
}
```

**Page list response**
```json
[
  {
    "id": "page_home",
    "title": "Homepage",
    "slug": "/",
    "status": "published",
    "author": { "id": "u_admin", "name": "Sarah Jenks", "email": "admin@site.com" },
    "updatedAt": "2026-01-20T10:15:00Z"
  }
]
```

---

## Testing Requirements

### Unit tests
- `tests/unit/admin/pagesClient.test.ts`
  - verifies endpoints, payloads, and CSRF usage
- Update `tests/unit/ui/page-list.test.tsx`
  - uses new props, renders without crash
- Update `tests/unit/ui/page-row-actions.test.tsx`
  - ensures callbacks are wired
- Update `tests/unit/ui/page-editor.test.tsx`
  - injects mock page data or id override

### Integration
- No new integration routes (already covered in TASK‑002‑04).

---

## Documentation Updates Required

- `_docs/CMS_API.md` (add preview response shape if not listed)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-pages-ui-wiring.md`
