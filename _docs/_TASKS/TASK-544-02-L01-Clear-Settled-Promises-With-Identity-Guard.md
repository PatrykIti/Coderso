# TASK-544-02-L01: Clear Settled Promises with Identity Guard

# FileName: TASK-544-02-L01-Clear-Settled-Promises-With-Identity-Guard.md

**Parent Task:** TASK-544
**Parent Subtask:** TASK-544-02
**Priority:** Medium
**Category:** Admin Cache / Async Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-544-02
**Status:** ⏳ To Do
**Changelog:** 1256 (pinned; create only at implementation closure)

---

## Scope

Refactor listMediaFoldersCached so the exact request clears its dedupe slot in finally.
Keep cache writes on successful validated data only.

## Source and direct-test ownership

This leaf is the sole TASK-544 writer of:

- core/admin/services/mediaFoldersClient.ts;
- tests/vitest/admin/mediaFoldersClient.test.ts.

It must not edit cacheBus/cachePolicy, MediaLibraryPage, MediaFolderRail, other tests,
docs, tasks, or changelog indexes. Add the promise-identity compatibility regressions
before the source gate; closure reruns this suite read-only and never rebaselines it.

## Implementation Pseudocode

~~~ts
let foldersRequestGeneration = 0;

async function listMediaFoldersCached(options) {
  if !force:
    cached = getCachedMediaFolders();
    if cached: return cached;
    if cachedFoldersPromise: return cachedFoldersPromise;

  const generation = ++foldersRequestGeneration;
  const rawRequest = listMediaFolders();
  let request: Promise<MediaFolder[]>;
  request = rawRequest.then((items) => {
    require isFolderList(items);
    if (foldersRequestGeneration === generation && cachedFoldersPromise === request) {
      foldersCache.write(items); // only the newest authoritative request may prime
    }
    return items;
  }).finally(() => {
    if (cachedFoldersPromise === request) {
      cachedFoldersPromise = null;
    }
  });
  cachedFoldersPromise = request; // concurrent callers share validation + cache semantics
  return request;
}

clearMediaFoldersCache() {
  foldersRequestGeneration += 1; // invalidates every older completion
  cachedFoldersPromise = null;
  foldersCache.clear();
}
~~~

Do not clear the slot from `primeFoldersCache` as a side effect that lacks request
identity. Force reads and mutation invalidation advance the generation. An older caller
may still receive its own successfully validated response, but it may neither prime data
nor clear the newer promise identity.

## Error and compatibility contract

The original API/client error propagates. Rejection writes no cache and the next call
creates a new request. Successful requests preserve return/cache shape and TTL.
Mutation invalidation and cacheBus broadcasts remain after mutation success only.

## Direct regression-test shape

This leaf owns its test edits. Use deferred promises for:

- concurrent non-force calls share one request;
- rejection clears the slot and retry performs a second request;
- old request settles after a newer forced request and cannot clear/overwrite the newer
  identity/data;
- success writes once and later reads use cache;
- clear/mutation behavior remains compatible.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/admin/mediaFoldersClient.test.ts
~~~

Re-run the file alone before declaring a failure.

## Acceptance criteria

- No rejected promise is sticky.
- Identity checks prevent old/new overlap corruption.
- Successful cache and broadcast contracts remain unchanged.
