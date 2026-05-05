# TASK-190-05-03-07-03: Detail Page Admin Client, Cache, and Delete Conflict Parity
# FileName: TASK-190-05-03-07-03_Detail_Page_Admin_Client_Cache_and_Delete_Conflict_Parity.md

**Priority:** High
**Category:** Admin/UI + Cache + Error Parity
**Estimated Effort:** Medium
**Dependencies:** TASK-190-05-03-05, TASK-190-05-03-07-01, TASK-190-05-03-07-02
**Status:** To Do

---

## Overview

Add the admin cached-client family for detail pages and align delete/content-type
conflict behavior across manual admin flows and assistant execution results.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/admin/services/detailPagesClient.ts`
- Update `core/admin/services/cachePolicy.ts`
- Update `core/admin/services/assistantClient.ts`
- Update `core/server/routes/contentTypeRoutes.ts`
- Update `tests/vitest/admin/detailPagesClient.test.ts`
- Update `tests/vitest/admin/assistantClient.test.ts`
- Update `tests/integration/routes/contentTypes.test.ts`

## Cache and Conflict Contract

- `detailPagesClient.ts` owns list/detail/get/update/autosave/publish/unpublish/
  revisions/restore/preview wrappers and cache hydration for the detail-page
  resource family.
- `cachePolicy.ts` owns:
  - `detailPages:list`,
  - `detailPages:list:contentType:<contentTypeId>`,
  - `detailPages:detail:<id>`.
- `assistantClient.ts` maps validated `detail-page.upsert` execution results
  onto the same cache-key family.
- `contentTypeRoutes.ts` must map `content_type_has_detail_pages` through the
  existing content-type error boundary so the API contract matches the task
  family wording.

## Pseudocode

```ts
export const invalidateDetailPageClientCaches = ({ id, contentTypeId }) => {
  cacheBus.invalidate(`detailPages:detail:${id}`);
  cacheBus.invalidate(`detailPages:list:contentType:${contentTypeId}`);
};

const mapContentTypeError = (error) => {
  if (error.message === "content_type_has_detail_pages") {
    return new ApiError(error.message, "Content type has detail pages.", 409);
  }
  return mapExistingContentTypeError(error);
};
```

## Security Contract

- Visibility: internal admin client/cache layer only.
- Auth model: existing admin session flow.
- RBAC: client wrappers do not grant permissions beyond route owners.
- CSRF: unchanged for client wrappers; mutating routes still rely on admin CSRF.
- Rate-limit bucket: `admin_read` / `admin_write`.
- Reject-unknown validation: client payloads follow strict route/domain owners.
- Anti-abuse: cache keys stay scoped by resource id/content type and do not
  broaden access to hidden resources.
- Secret handling: no preview tokens, CSRF tokens, or secret fields leak into
  cache payloads.

## Testing Requirements

- `detailPagesClient.ts` uses the correct list/detail cache keys.
- Filtered list reads invalidate the active `contentTypeId`-scoped key.
- Assistant execution result mapping invalidates the same keys as manual admin
  flows.
- Content-type delete route/service coverage maps `content_type_has_detail_pages`
  through the existing API boundary.
- Linked detail pages reject delete until the canonical route link is cleared.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
