# 283 - TASK-057-06 Post Autosave, Revisions, Preview, and Publish Flow

- **Date:** 2026-02-21
- **Version:** 0.1.283
- **Tasks:** TASK-057-06

## Key Changes

### Posts API: Autosave and Revisions Aliases
- Added internal post alias routes:
  - `POST /admin/api/posts/:id/autosave`
  - `GET /admin/api/posts/:id/revisions`
  - `POST /admin/api/posts/:id/revisions/:revisionId/restore`
- Added validation contract for autosave payload:
  - `core/server/validation/postSchemas.ts`
- Extended route-level post error mapping:
  - revision not found
  - revision create failure

### Post Service: Revision Lifecycle
- Extended post service with revision workflows:
  - `autosavePost(...)`
  - `listPostRevisions(...)`
  - `restorePostRevision(...)`
- Implemented idempotent autosave revision behavior:
  - no new revision when snapshot is unchanged
  - creates new revision only for changed snapshot
- Implemented idempotent restore behavior:
  - restore no-op when current snapshot already matches target revision
  - optional safety snapshot when actor is present

### Admin Editor UX: Autosave Status and Revision Restore
- Added post client methods for autosave and revisions:
  - `core/admin/services/postsClient.ts`
- Added debounced autosave hook:
  - `core/admin/ui/posts/editor/hooks/usePostAutosave.ts`
- Extended editor state to handle:
  - autosave pending/error state
  - last saved timestamp
  - revisions loading/error state
  - revision restore flow
- Added revision drawer UI:
  - `core/admin/ui/posts/editor/PostRevisionDrawer.tsx`
- Updated top bar status lifecycle:
  - `Unsaved changes`
  - `Saving...`
  - `Autosaved at ...`
  - `Published`
- Added explicit `Revisions` action in editor top bar.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/integration/routes/postsRoutes.test.ts tests/unit/admin/postsClient.test.ts tests/unit/ui/post-block-editor-shell.test.tsx tests/integration/ui/post-autosave-flow.test.tsx tests/integration/posts/posts-revisions-flow.test.ts`

## Added/Updated Tests
- Added: `tests/integration/posts/posts-revisions-flow.test.ts`
- Added: `tests/integration/ui/post-autosave-flow.test.tsx`
- Updated: `tests/unit/admin/postsClient.test.ts`
- Updated: `tests/unit/ui/post-block-editor-shell.test.tsx`
- Updated: `tests/integration/routes/postsRoutes.test.ts`
