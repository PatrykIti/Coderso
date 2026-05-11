# TASK-190-06-03-01-01: Collection Workspace Route and Server Read Model
# FileName: TASK-190-06-03-01-01_Collection_Workspace_Route_and_Server_Read_Model.md

**Priority:** High
**Category:** Admin/UI + Collections + Server Read Model
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-02, TASK-190-05-03-07, TASK-190-06-02
**Status:** Done (2026-05-10)

---

## Overview

Register the collection workspace under the current `Advanced/Engine` route
family and add the first server-owned bounded summary endpoint.

This leaf owns the route and response contract only. It does not own the full
canonical-resolution algorithm or the client cache/prefetch/UI shell.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/content/collectionWorkspaceService.ts`
- Update `core/server/routes/contentTypeRoutes.ts`
- Add server validation for the collection workspace response if route-level
  response schemas live in a dedicated helper
- Update `core/admin/app/AdminApp.tsx`
- Add `tests/integration/routes/contentTypes.test.ts`

## Route Contract

```text
GET /admin/api/content-types/:id/collection-workspace
/admin/advanced/engine/:contentTypeId/collection
```

Rules:

- the route stays inside the existing Engine family,
- the server response is the single workspace summary source of truth,
- the response is bounded and strict even when many linked resources exist,
- unresolved resources return explicit `unresolved` / `candidates` markers
  instead of browser-side inference.

## Pseudocode

```ts
router.get("/admin/api/content-types/:id/collection-workspace", async (ctx) => {
  const summary = await collectionWorkspaceService.getSummary(ctx.params.id, ctx.actor);
  return validateCollectionWorkspaceSummary(summary);
});
```

## Security Contract

- Visibility: internal admin read model only.
- Auth model: authenticated admin session.
- RBAC: host route requires `content:read`; linked slices are further redacted by
  owner-read checks in later leaves.
- CSRF: not applicable to read-only requests.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: response payload is strict.
- Anti-abuse: summary is bounded and redacted.
- Secret handling: no preview tokens, raw bindings, or secret settings values in
  the summary.

## Testing Requirements

- route registers under the existing Engine route family,
- server summary returns strict bounded payload shape,
- unknown content type returns existing not-found behavior,
- route tests prove the workspace endpoint does not create a parallel admin
  module or second transport.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`

## Completion Notes

- Added the server-owned `collectionWorkspaceService` read model for one
  content type / collection root. The summary is bounded and exposes explicit
  `canonical`, `linkedSecondary`, `unresolved`, and `candidates` buckets without
  raw bindings, preview tokens, or browser-owned state.
- Registered `GET /admin/api/content-types/:id/collection-workspace` under the
  current content-type route family with `content:read` and existing
  `content_type_not_found` error mapping.
- Registered the canonical admin route
  `/admin/advanced/engine/:contentTypeId/collection` with a minimal route
  landing. Cached client helpers, specific Engine prefetch, and the full UI
  shell remain owned by `TASK-190-06-03-01-03`.
- Kept full deterministic canonical resolution and owner-read redaction deferred
  to `TASK-190-06-03-01-02`; this leaf reads owner seams and returns candidates
  rather than guessing.
- 2026-05-11 correction: the completed summary should be read as bounded route /
  detail / list / listing / admin-screen coverage. Forms/CTA, media, and SEO
  need explicit owner-seam metadata before this endpoint can summarize them
  without title/slug heuristics.
