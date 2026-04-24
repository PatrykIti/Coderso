# TASK-207-01: Entries Cross-Type Read Model and Cache Contract
# FileName: TASK-207-01_Entries_Cross_Type_Read_Model_and_Cache_Contract.md

**Priority:** High
**Category:** CMS/Entries + Admin API + Admin Cache
**Estimated Effort:** Large
**Dependencies:** TASK-207, TASK-203
**Status:** Done (2026-04-24)

---

## Overview

Create the additive all-entries read model that lets `/admin/coderso/entries`
render one list across all Engine content types.

Do not solve this by fetching every content type and then running
`listEntriesCached(typeSlug)` N times from the UI. The read model belongs in
`entryService` and the route/client/cache layer should expose it as one internal
admin list contract. Existing type-scoped routes and caches remain active for
entry editors, relation fields, widgets, and current assistant invalidation.

## Sub-Tasks

- [x] TASK-207-01-01: Entry List Read Model Service and Route Contract
- [x] TASK-207-01-02: Entries Client Cache, Prefetch, and Cache Map

## Files to Change

- `core/services/content/entryService.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `core/server/validation/contentSchemas.ts`
  - add an empty all-entries query schema with `additionalProperties: false`
    if the first version of the route stays queryless.
- `core/admin/services/entriesClient.ts`
- `core/admin/services/cachePolicy.ts`
- `core/admin/utils/adminPrefetch.ts`
- `core/admin/services/assistantClient.ts` if assistant execution cache events
  need to invalidate the new all-entries list cache.
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if the route is documented.

## Architecture

The new list item should extend existing entry summary data with content-type
metadata:

```ts
type EntryListContentType = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published";
};

type EntryListItem = EntrySummary & {
  contentType: EntryListContentType;
};
```

The admin UI can then filter by `entry.contentType.slug` and render Engine links
without joining data in the component.

## Security Contract

- Visibility: internal admin read route only.
- Endpoint: add the internal all-entries GET route as
  `GET /admin/api/content-entries`.
  Do not use `GET /admin/api/content/entries`, because the existing
  type-scoped `GET /admin/api/content/:type/entries` route would collide with
  it under the current ordered route matcher.
- Auth model: authenticated admin session / admin API key where supported.
- RBAC: `content:read`.
- CSRF: not required for GET reads.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: keep the initial route queryless, or validate and
  reject unknown query params if filters are later moved server-side. For the
  queryless version, the reject-unknown contract belongs in
  `contentSchemas.ts`, not in a route-local manual query inspection.
- Anti-abuse: no public write path and no secret/provider data in browser cache.

## Testing Requirements

- `bun test tests/unit/content/entryService.test.ts`
- `bun test tests/integration/routes/contentTypes.test.ts`
- Route strictness coverage must prove `GET /content-entries` validates
  `ctx.query` through the content schema owner and rejects an unsupported query
  such as `/content-entries?status=draft`, while the existing
  `/content/:type/entries` route remains type-scoped.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/entriesClient.test.ts tests/vitest/admin/adminPrefetch.test.ts`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if the route is documented.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. A single internal read model can return entries across content types with
   content type id, slug, name, and status.
2. Type-scoped `listEntries(typeId)` / `listEntriesCached(typeSlug)` behavior is
   preserved.
3. The all-entries list has its own cache key and invalidation plan.
4. Prefetch/cache docs name the all-entries owner and do not leave hidden cache
   state undocumented.
