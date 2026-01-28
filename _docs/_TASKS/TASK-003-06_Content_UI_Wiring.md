# TASK-003-06: Content UI Wiring (Admin)
# FileName: TASK-003-06_Content_UI_Wiring.md

**Priority:** High  
**Category:** CMS/Content  
**Estimated Effort:** Medium  
**Dependencies:** TASK-003-04, TASK-006-16, TASK-006-17, TASK-006-04  
**Status:** To Do  

---

## Overview

Wire the Content Types UI and Entries UI to the real API endpoints. Replace mock data with live fetches and add error/loading states. This should feel consistent with Pages UI wiring (TASK-002-05).

## UI Alignment

**Content Types List** (`/admin/content-types`)
- `GET /content-types`
- `POST /content-types`

**Content Type Editor** (`/admin/content-types/:id`)
- `GET /content-types/:id`
- `PATCH /content-types/:id`

**Entries List** (`/admin/entries`)
- `GET /content/:type/entries`
- `POST /content/:type/entries`

**Entry Editor** (`/admin/entries/:type/:id`)
- `GET /content/:type/entries/:id`
- `PATCH /content/:type/entries/:id`
- `POST /content/:type/entries/:id/preview`
- `POST /content/:type/entries/:id/publish`
- `POST /content/:type/entries/:id/unpublish`

## Sub-Tasks

1. Add admin service clients for content types and entries.
2. Replace mock data in content types UI with real API calls.
3. Replace mock data in entries list/editor UI with real API calls.
4. Add consistent loading + error states (same as Pages UI).
5. Update UI tests to cover the real clients.

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/services/contentTypesClient.ts` | add API client | use `apiRequest` |
| `core/admin/services/entriesClient.ts` | add API client | use `apiRequest` |
| `core/admin/ui/content-types/ContentTypeList.tsx` | replace mock list | loading + errors |
| `core/admin/ui/content-types/ContentTypeEditor.tsx` | load type by id | patch updates |
| `core/admin/ui/content-types/SchemaBuilderPage.tsx` | wire save/create | use client |
| `core/admin/ui/entries/EntriesList.tsx` | replace mock entries | filters + create |
| `core/admin/ui/entries/EntryEditor.tsx` | load + save + publish | preview + status |
| `core/admin/app/routes.tsx` | ensure routes exist | entries + content types |

## UI Notes

- Follow the same request and state patterns as `core/admin/services/pagesClient.ts`.
- Use `withCsrf: true` for create/update/publish endpoints.
- For preview, open the returned `previewUrl` in a new tab.

## Tests

- `tests/unit/admin/contentTypesClient.test.ts`
  - list, get, create, update

- `tests/unit/admin/entriesClient.test.ts`
  - list, get, create, update, publish, preview

- Update existing UI tests for Content Types and Entries to use the real clients.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-ui-wiring.md`
