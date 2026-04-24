# TASK-206-03-01: Media Cache and Prefetch Regression Matrix
# FileName: TASK-206-03-01_Media_Cache_and_Prefetch_Regression_Matrix.md

**Priority:** Medium
**Category:** CMS/Media + Admin/Cache + Testing
**Estimated Effort:** Medium
**Dependencies:** TASK-206-00, TASK-206-01-01, TASK-206-01-02, TASK-206-02-01, TASK-206-02-02
**Status:** To Do

---

## Overview

Add focused regression coverage for the Media cache lifecycle. The tests must
prove request behavior, not just static rendered markup.

The regression matrix should cover:

- Media Library cached route entry,
- Media Picker cached browse/selection,
- update/recover/replace/delete cache patching,
- upload cache upsert,
- `/media` prefetch staying `force: false`,
- shared in-memory TTL fallback for Media plus the parity list clients,
- fallback reload only when cache is missing, expired, invalidated, or explicit.

## Sub-Tasks

No child task files.

## Files to Change

- `tests/vitest/ui/media-library.test.tsx`
- `tests/vitest/ui/media-picker.test.tsx`
- `tests/vitest/admin/mediaClient.test.ts`
- `tests/vitest/admin/storageCache.test.ts`
- `tests/vitest/admin/pagesClient.test.ts`
- `tests/vitest/admin/menusClient.test.ts`
- `tests/vitest/admin/postsClient.test.ts`
- `tests/vitest/admin/admin-prefetch-policy.test.ts`
- `tests/vitest/admin/adminPrefetch.test.ts`
- `tests/perf/admin-prefetch-budget.test.ts` only if the prefetch map/queue
  changes.

## Implementation Direction

- Prefer targeted tests over broad snapshot changes.
- Mock `fetch` at the client boundary to count full-list `GET /media` calls.
- Seed `localStorage` through the existing admin cache envelope.
- Reset `clearMediaCache()` between tests.
- Include TTL regression coverage from `TASK-206-00`. Do not prove expired
  cache behavior only through `mediaClient`; the shared helper and parity list
  clients must be covered too.
- Assert exact `force` options where components mock `listMediaCached`.
- Request-level UI tests must run component effects. Use the existing
  `// @vitest-environment happy-dom` + `createRoot`/`act` pattern used by other
  interactive admin suites. `renderAdminUi()`/`renderToString()` is acceptable
  only for SSR smoke assertions; it must not be used as proof that mount effects
  avoided `GET /media`.
- Keep test fixtures close to the real `MediaRecord` shape.

## Pseudocode

```ts
// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";

function seedMediaCache(rows: MediaRecord[]) {
  localStorage.setItem(
    cacheKeys.mediaList,
    JSON.stringify({ value: rows, savedAt: Date.now() })
  );
}

function mountMediaLibrary() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/media">
        <MediaLibraryPage />
      </AdminRouterProvider>
    );
  });
  return {
    host,
    cleanup: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}
```

```ts
test("media library cached mount does not fetch full media list", async () => {
  seedMediaCache([mediaRow]);
  const fetchCalls = spyOnFetch();
  const view = mountMediaLibrary();

  await flushEffects();

  expect(fetchCalls.fullMediaListGets()).toHaveLength(0);
  view.cleanup();
});
```

```ts
test("media client update patches cached list", async () => {
  seedMediaCache([rowA, rowB]);
  mockFetchPatch(`/media/${rowA.id}`, { ...rowA, title: "Updated" });

  await updateMedia(rowA.id, { title: "Updated" });

  expect(getCachedMedia()).toEqual([{ ...rowA, title: "Updated" }, rowB]);
  expect(fullListGetCalls()).toHaveLength(0);
});
```

```ts
test("expired in-memory media cache falls through to a fresh list read", async () => {
  seedMediaCache([staleRow], { savedAt: Date.now() - cacheTtlMs.list - 1 });
  await listMediaCached(); // primes any module memory path from the stale setup only if a bug exists
  mockFetchGet("/media", [freshRow]);

  expect(await listMediaCached()).toEqual([freshRow]);
  expect(fullMediaListGets()).toHaveLength(1);
});
```

## Security Contract

- Visibility: test-only.
- Auth/RBAC/CSRF/rate-limit: tests must preserve current write CSRF assertions
  for mutation calls.
- Reject-unknown validation: unchanged.
- Anti-abuse:
  - tests must fail if route-entry or prefetch behavior regresses into repeated
    full-list request bursts.
  - effect-backed tests must fail if they are accidentally reduced to
    server-render-only assertions.

## Testing Requirements

- Run the exact suites touched:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/media-library.test.tsx tests/vitest/ui/media-picker.test.tsx tests/vitest/admin/storageCache.test.ts tests/vitest/admin/mediaClient.test.ts tests/vitest/admin/pagesClient.test.ts tests/vitest/admin/menusClient.test.ts tests/vitest/admin/postsClient.test.ts tests/vitest/admin/admin-prefetch-policy.test.ts tests/vitest/admin/adminPrefetch.test.ts`
- Run perf budget only if prefetch behavior changed:
  - `bun test tests/perf/admin-prefetch-budget.test.ts`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if new regression guarantees are documented.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Tests fail if cached Media route entry performs a full list read.
2. Tests fail if MediaPicker forces reload after cache hydration.
3. Tests prove cross-tab-like update events do not apply stale in-memory media
   rows over storage-backed patched rows.
4. Tests fail if known mutation paths reload unchanged assets.
5. Tests fail if expired in-memory list cache satisfies Media, Pages, Menus, or
   covered Posts cached reads.
6. Prefetch tests continue to prove `force: false`.
