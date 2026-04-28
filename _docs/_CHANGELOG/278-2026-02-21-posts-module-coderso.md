# 278 - Posts Module in Coderso

- **Date:** 2026-02-21
- **Version:** 0.1.278
- **Tasks:** TASK-055, TASK-055-01, TASK-055-02, TASK-055-03, TASK-055-04, TASK-055-05, TASK-055-06

## Key Changes

### Posts Domain + API Aliases
- Added dedicated posts domain service on top of existing content engine:
  - `core/services/content/postsService.ts`
- Posts reuse `content_entries` with reserved content type `post` (auto-bootstrap, no new posts table).
- Added internal API aliases:
  - `GET/POST /admin/api/posts`
  - `GET/PATCH/DELETE /admin/api/posts/:id`
  - `PATCH /admin/api/posts/:id/metadata`
  - `POST /admin/api/posts/:id/publish`
  - `POST /admin/api/posts/:id/unpublish`
  - `POST /admin/api/posts/:id/preview`
  - `POST /admin/api/posts/:id/duplicate`

### Admin UI: Posts List + Editor
- Added Coderso posts list page and create drawer:
  - `core/admin/ui/posts/PostsListPage.tsx`
  - `core/admin/ui/posts/PostsTable.tsx`
  - `core/admin/ui/posts/PostsCreateDrawer.tsx`
- Added dedicated posts editor route using existing entry editor flow:
  - `/admin/coderso/posts/:id`
  - `core/admin/ui/posts/PostEditorPage.tsx`
  - `core/admin/ui/entries/EntryEditor.tsx` (posts mode context)
- Sidebar registry now exposes Posts as stable module (without `Soon` badge).

### Cache + Navigation Wiring
- Added posts client and cache keys:
  - `core/admin/services/postsClient.ts`
  - `core/admin/services/cachePolicy.ts` (`postsList`, `postDetail(id)`)
- Wired routes in `core/admin/app/AdminApp.tsx`.

### Documentation and Contracts
- Updated architecture/API/navigation docs to reflect delivered posts workflow.
- Clarified cookbook guidance: when to use Posts vs generic Entries.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/postsRoutes.test.ts tests/unit/content/postsService.test.ts tests/unit/admin/postsClient.test.ts tests/unit/ui/posts-list.test.tsx tests/unit/ui/post-editor-page.test.tsx tests/unit/ui/coderso-modules.test.ts`

### Added/Updated Tests
- `tests/integration/routes/postsRoutes.test.ts`
- `tests/unit/content/postsService.test.ts`
- `tests/unit/admin/postsClient.test.ts`
- `tests/unit/ui/posts-list.test.tsx`
- `tests/unit/ui/post-editor-page.test.tsx`
- `tests/unit/ui/coderso-modules.test.ts`
