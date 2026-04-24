# TASK-206-03: Regression Proof, Prefetch, Docs, and Closure
# FileName: TASK-206-03_Regression_Proof_Prefetch_Docs_and_Closure.md

**Priority:** Medium
**Category:** CMS/Media + Admin/Cache + QA/Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-206-00, TASK-206-01, TASK-206-02
**Status:** To Do

---

## Overview

Close the Media cache lifecycle work with request-level regression proof,
prefetch validation, docs updates, changelog, and task-board sync.

This subtask must prove the implementation matches the existing admin cache
architecture rather than only making unit tests green. The important behavior is
observable: ordinary navigation to Media with fresh cache should not issue
`GET /media`, and mutation paths should not reload unchanged assets.

## Sub-Tasks

- [ ] TASK-206-03-01: Media Cache and Prefetch Regression Matrix
- [ ] TASK-206-03-02: Docs, Changelog, and Board Closure

## Files to Change

- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/vitest/admin/storageCache.test.ts`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/vitest/admin/pagesClient.test.ts`
- `tests/vitest/admin/menusClient.test.ts`
- `tests/vitest/admin/postsClient.test.ts`
- `tests/vitest/admin/admin-prefetch-policy.test.ts`
- `tests/perf/admin-prefetch-budget.test.ts` only if prefetch entry behavior
  changes.
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on closure.

## Implementation Direction

- Verify request behavior at the client boundary, not only rendered text.
- Verify expired-cache behavior through the shared cache contract introduced by
  `TASK-206-00`; do not document expired Media cache fallback unless the generic
  TTL regression is green.
- Keep prefetch warmup using `force: false`.
- Keep active-route skip behavior in `adminPrefetch`.
- Record exact validated commands in the changelog entry.
- If DB-backed route/service tests are required by upload changes, run them with
  `.env` loaded when `DATABASE_URL` is available.

## Pseudocode

Request regression assertion shape:

```ts
// @vitest-environment happy-dom

const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
globalThis.fetch = async (input, init) => {
  calls.push({ input, init });
  return jsonResponse([]);
};

seedLocalCache(cacheKeys.mediaList, cachedMediaRows);
const view = mountWithCreateRootAndAct(
  <AdminRouterProvider initialPath="/admin/media">
    <MediaLibraryPage />
  </AdminRouterProvider>
);
await flushEffects();

expect(calls.some((call) => String(call.input).endsWith("/media"))).toBe(false);
view.cleanup();
```

Do not use `renderAdminUi()` / `renderToString()` as request-level proof for
mount behavior, because server rendering does not execute `useEffect`.

Prefetch assertion shape:

```ts
expect(prefetchWarmupOptions).toEqual({ force: false });
```

Mutation assertion shape:

```ts
seedLocalCache(cacheKeys.mediaList, [rowA, rowB]);
await updateMedia(rowA.id, { title: "Updated" });
expect(getCachedMedia()).toEqual([{ ...rowA, title: "Updated" }, rowB]);
expect(fetchCallsTo("/media")).not.toContain("GET full list");
```

## Security Contract

- Visibility: validation/docs only; no new runtime surface.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless earlier leaves changed upload
  response/request ownership.
- Anti-abuse:
  - proof must include no repeated prefetch/mount full-list request loops,
  - docs must not describe weaker cache invalidation behavior than code ships.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-picker.test.tsx tests/vitest/admin/storageCache.test.ts tests/vitest/admin/mediaClient.test.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/admin/menusClient.test.ts tests/vitest/admin/postsClient.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- `bun test tests/perf/admin-prefetch-budget.test.ts` if prefetch behavior changes.
- If upload route/service response changes:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/media.test.ts`
  - `bun test tests/unit/media/mediaService.test.ts`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
  - Media list lifecycle policy,
  - update vs invalidate behavior,
  - upload partial cache note.
- `_docs/ADMIN_CACHE_MAP.md`
  - Media library/picker cached APIs,
  - mutation cache owner notes.
- `_docs/_TASKS/README.md`
  - move family to Done at closure.
- `_docs/_CHANGELOG/*`
  - add completion entry with validation commands.

## Acceptance Criteria

1. Tests prove cached Media navigation avoids `GET /media`.
2. Tests prove prefetch remains warmup-only.
3. Tests prove mutation paths patch cache without full-list reload.
4. Tests prove expired in-memory list caches do not bypass the shared TTL
   contract.
5. Docs match the final shipped contract.
6. Task board and changelog are synced on closure.
