# 812 - TASK-190 detail-page route contract hardening

**Date:** 2026-05-09
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-05-03-03, TASK-190-05-03-07, TASK-190-05-03-07-01-03

## Key Changes

### Detail-page route strictness

- Tightened the internal detail-page route family so UUID path params are
  schema-validated consistently across CRUD, lifecycle, and revision endpoints.
- Added strict empty-body validation to delete, publish/unpublish, restore, and
  discard routes so unknown payload keys now fail closed instead of being
  silently ignored.

### Revision and runtime fail-closed behavior

- Bounded `GET /detail-pages/:id/revisions` to revision metadata only, instead
  of exposing stored detail-page document snapshots through the admin route.
- Bounded revision restore responses to summary metadata instead of returning
  the raw updated detail-page row through the route boundary.
- Hardened the published detail-page runtime resolver so public/content preview
  paths no longer fall back to `current_document` when a published row is
  missing `published_document`.

### Permissions, testing, and docs sync

- Restored the documented RBAC boundary for
  `setting.content-route.upsert`: assistant dry-run/execute now follow the
  action-family contract instead of forcing a broader
  `content:write`/`content:publish` bundle on this settings-only seam.
- Moved pure `contentRouteMatcher` regression coverage into the Vitest server
  helper lane and added a Bun runtime acceptance proving that linked
  `detailPageId` metadata does not change list-route rendering.
- Synced stale `TASK-190` docs/board state: the `07-01` parent is now closed,
  the umbrella/architecture notes reflect the already-landed detail-page
  runtime and internal admin route slices, and the task-board statistics are
  recomputed from the live tables.

## Validation

- `bun test tests/integration/routes/detailPages.test.ts`
- `bun test tests/unit/content/detailPageRuntimeResolver.test.ts`
