# TASK-190-06-03-01-03: Collection Workspace Client Cache, Prefetch, and UI Shell
# FileName: TASK-190-06-03-01-03_Collection_Workspace_Client_Cache_Prefetch_and_UI_Shell.md

**Priority:** High
**Category:** Admin/UI + Cache + Prefetch
**Estimated Effort:** Medium
**Dependencies:** TASK-190-06-03-01-01, TASK-190-06-03-01-02
**Status:** Done (2026-05-10)

---

## Overview

Add the cached client helpers, Engine prefetch integration, and first workspace
route shell for the server-owned collection workspace summary.

## Sub-Tasks

No child task files.

## Files to Change

- Update `core/admin/services/contentTypesClient.ts`
- Update `core/admin/services/cachePolicy.ts`
- Update `core/admin/utils/adminPrefetch.ts`
- Add `core/admin/ui/content-types/CollectionWorkspacePage.tsx`
- Add `core/admin/ui/content-types/CollectionOverview.tsx`
- Add `core/admin/ui/content-types/CollectionReadinessChecklist.tsx`
- Update `core/admin/utils/adminPaths.ts`
- Update `tests/perf/admin-prefetch-budget.test.ts` if matcher specificity changes
- Update `tests/vitest/admin/contentTypesClient.test.ts`
- Update `tests/vitest/admin/adminPrefetch.test.ts`
- Add `tests/vitest/ui/collection-workspace.test.tsx`

## Client Contract

- `contentTypesClient.ts` stays the only client wrapper owner; do not introduce
  `collectionsClient.ts`,
- cache keys stay under the content-types family, for example
  `contentTypes:collectionWorkspace:<contentTypeId>`,
- `CollectionWorkspacePage.tsx` owns route-local refresh/pending UX only,
- `adminPrefetch.ts` remains the prefetch owner and must warm the workspace
  route through the current Engine seam without being swallowed by the broader
  `/advanced/engine` match,
- because current `adminPrefetch.ts` treats string `match` values as literal
  `path.startsWith(...)` prefixes, workspace warmup must use either a predicate
  matcher or an explicit workspace-path parser/resolver. Do not document a
  parameterized string pattern that the current helper cannot match.

## Pseudocode

```ts
export const getContentTypeCollectionWorkspaceCached = (contentTypeId, options) =>
  readThroughCache(
    `contentTypes:collectionWorkspace:${contentTypeId}`,
    () => api.get(`/admin/api/content-types/${contentTypeId}/collection-workspace`),
    options
  );

prefetchEntries.unshift({
  match: (path) => resolveCollectionWorkspacePrefetchTarget(path) !== null,
  resolveKey: ({ path }) => {
    const target = resolveCollectionWorkspacePrefetchTarget(path);
    return target ? `/advanced/engine/${target.contentTypeId}/collection` : "/advanced/engine";
  },
  run: ({ path }) => warmCollectionWorkspace(path),
});
```

## Security Contract

- Visibility: internal admin UI only.
- Auth model: authenticated admin session.
- RBAC: client and UI reuse route-owned permissions; no new grants.
- CSRF: unchanged; read caching/prefetch are non-mutating.
- Rate-limit bucket: `admin_read`.
- Reject-unknown validation: client cache consumes strict server payload only.
- Anti-abuse: no route-local fetch transport, no workspace-only cache namespace.
- Secret handling: cached payload stays bounded/redacted under existing admin
  cache rules.

## Testing Requirements

- client helpers use the content-types cache namespace and current cache bus
  contract,
- workspace warmup resolves through a specific Engine-prefetch match,
- workspace warmup does not rely on a parameterized string `match`; it uses a
  predicate matcher or explicit workspace-path parser compatible with the
  current `adminPrefetch.ts` implementation,
- the workspace route shell mounts inside the canonical `/admin/advanced/engine`
  family and does not create a second admin namespace,
- route-local refresh/pending UX stays in the page shell, not the client helper.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`

## Completion Notes

- Added `contentTypes:collectionWorkspace:<contentTypeId>` cache ownership under
  `contentTypesClient.ts` with read-through cached helpers and strict cached
  payload validation.
- Added a predicate Engine prefetch matcher for
  `/advanced/engine/:contentTypeId/collection` ahead of the generic
  `/advanced/engine` prefix so workspace warmup is not swallowed by the list
  route.
- Replaced the placeholder workspace route with an `AdminShell` page that
  hydrates the server-owned summary, surfaces canonical resource readiness, and
  keeps cache-bus pending/refresh UX route-local.

## Validation

- `bun run test:vitest -- tests/vitest/admin/contentTypesClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/ui/collection-workspace.test.tsx tests/vitest/admin/adminApp.test.tsx`
  - 4 files passed / 34 tests passed.
- Final full-gate validation is recorded in changelog entry `822`.
