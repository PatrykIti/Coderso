# TASK-190-05-03-07-01-03: Detail Page Revisions and Restore Route Flow
# FileName: TASK-190-05-03-07-01-03_Detail_Page_Revisions_and_Restore_Route_Flow.md

**Priority:** High
**Category:** CMS/Admin API + Revisions
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-01, TASK-190-05-03-07-01-01
**Status:** Done (2026-05-08)

---

## Overview

Implement revision list/restore/discard routes for detail pages and keep their
route-level error mapping aligned with the detail-page revision contract.

Current slice note:
- `detailPageRevisionService.ts` now owns revision listing, restore, and
  autosave-only discard semantics for detail pages.
- `detailPageRoutes.ts` now exposes `GET /detail-pages/:id/revisions`,
  `POST /detail-pages/:id/revisions/:revisionId/restore`, and
  `DELETE /detail-pages/:id/revisions/:revisionId`.
- Restore now updates `current_document` only and does not become a second
  publish path; publish state remains owned by the dedicated lifecycle routes.
- Route-level error mapping now covers `detail_page_revision_not_found` and
  `detail_page_revision_delete_forbidden`.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/server/routes/detailPageRoutes.ts`
- Update `core/services/content/detailPageRevisionService.ts`
- Update `tests/integration/routes/detailPages.test.ts`

## Contract

- `GET /admin/api/detail-pages/:id/revisions` returns bounded revision metadata
  without embedding stored document snapshots,
- `POST /admin/api/detail-pages/:id/revisions/:revisionId/restore` restores the
  chosen revision through the shared detail-page revision contract,
- `DELETE /admin/api/detail-pages/:id/revisions/:revisionId` only discards
  allowed autosave revisions and maps forbidden cases through
  `mapDetailPageError`.

## Pseudocode

```ts
router.post("/admin/api/detail-pages/:id/revisions/:revisionId/restore", async (ctx) =>
  detailPageRevisionService.restore(ctx.params.id, ctx.params.revisionId)
);

router.delete("/admin/api/detail-pages/:id/revisions/:revisionId", async (ctx) => {
  await detailPageRevisionService.discardAutosave(ctx.params.id, ctx.params.revisionId);
  return { ok: true };
});
```

## Security Contract

- Visibility: internal admin API only.
- Auth model: authenticated admin session / scoped internal API key where supported.
- RBAC:
  - revision list requires `content:read`,
  - restore/discard require `content:write`.
- CSRF: mutating routes require existing admin CSRF middleware.
- Rate-limit bucket: `admin_read` / `admin_write`.
- Reject-unknown validation: route params and revision payloads stay strict.
- Anti-abuse: revision routes do not become a second publish path outside the
  documented lifecycle semantics.
- Secret handling: revision responses stay bounded and do not expose secret-like
  binding fields without existing redaction.

## Testing Requirements

- revision list/restore/discard routes are registered,
- restore/discard follow the documented revision rules,
- forbidden revision delete cases map through the existing route error boundary.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
