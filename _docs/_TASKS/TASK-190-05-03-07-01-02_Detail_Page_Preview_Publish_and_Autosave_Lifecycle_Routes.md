# TASK-190-05-03-07-01-02: Detail Page Preview, Publish, and Autosave Lifecycle Routes
# FileName: TASK-190-05-03-07-01-02_Detail_Page_Preview_Publish_and_Autosave_Lifecycle_Routes.md

**Priority:** High
**Category:** CMS/Admin API + Preview + Lifecycle
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-01, TASK-190-05-03-04, TASK-190-05-03-07-01-01
**Status:** Done (2026-05-08)

---

## Overview

Implement the internal preview/publish/unpublish/autosave lifecycle routes for
detail pages on top of the shared preview-token contract.

Current slice note:
- `detailPageRoutes.ts` now exposes the internal `preview`, `publish`,
  `unpublish`, and `autosave` endpoints behind the existing admin permission
  seams.
- `previewService.ts` now provides a dedicated `detail-page` preview-token
  helper that persists `sampleEntryId` in `preview_tokens.context`.
- `detailPageDocumentService.ts` now owns publish/unpublish/autosave lifecycle
  semantics, including `publish` / `autosave` revision writes and preserving
  canonical route ownership outside the detail-page CRUD seam.
- Route tests now prove dedicated `type=detail-page` preview URL issuance plus
  publish/autosave/unpublish behavior through the internal route boundary.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/server/routes/detailPageRoutes.ts`
- Update `core/server/validation/detailPageSchemas.ts`
- Update `core/services/content/detailPageDocumentService.ts`
- Update `core/services/pages/previewService.ts`
- Update `tests/integration/routes/detailPages.test.ts`

## Contract

- `POST /admin/api/detail-pages/:id/preview` issues only the dedicated
  `type=detail-page` preview token,
- preview stores `sampleEntryId` in `preview_tokens.context`,
- publish/unpublish/autosave stay on the same lifecycle semantics defined by the
  detail-page document contract.

## Pseudocode

```ts
router.post("/admin/api/detail-pages/:id/preview", async (ctx) => {
  const request = normalizeDetailPagePreviewRequest(ctx.body);
  return previewService.issueDetailPagePreview({
    detailPageId: ctx.params.id,
    sampleEntryId: request.sampleEntryId,
  });
});

router.post("/admin/api/detail-pages/:id/publish", async (ctx) =>
  detailPageDocumentService.publish(ctx.params.id)
);
```

## Security Contract

- Visibility: internal admin API only.
- Auth model: authenticated admin session / scoped internal API key where supported.
- RBAC:
  - preview requires `content:read`,
  - autosave requires `content:write`,
  - publish/unpublish require `content:publish`.
- CSRF: all mutating routes require existing admin CSRF middleware.
- Rate-limit bucket: `admin_read` / `admin_write`.
- Reject-unknown validation: preview/lifecycle payloads stay strict.
- Anti-abuse: preview never trusts sample-entry query params and never exposes
  draft documents through public `type=content` routes.
- Secret handling: no preview tokens or sample-entry data in logs/debug payloads.

## Testing Requirements

- preview returns `token`, `previewUrl`, and `expiresAt` for the dedicated
  `detail-page` target,
- preview stores sample-entry context server-side,
- publish/unpublish/autosave follow the documented lifecycle semantics.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/_TASKS/README.md`
