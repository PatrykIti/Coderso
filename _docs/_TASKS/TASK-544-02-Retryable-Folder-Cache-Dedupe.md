# TASK-544-02: Retryable Folder Cache Dedupe

# FileName: TASK-544-02-Retryable-Folder-Cache-Dedupe.md

**Parent Task:** TASK-544
**Priority:** Medium
**Category:** Admin Cache / Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-544-01
**Status:** ⏳ To Do
**Changelog:** 1256 (pinned; create only at implementation closure)

---

## Scope

Clear the list request dedupe slot after both resolve and reject, guarded by promise
identity so an older settled request cannot clear a newer forced request.

## Grounded anchor

core/admin/services/mediaFoldersClient.ts:37-75 assigns cachedFoldersPromise but clears
it only through the success-only primeFoldersCache path.

## Leaf

TASK-544-02-L01 is the sole mediaFoldersClient.ts writer and owns the directly affected
client suite. The rejection/overlap behavior tests land with the source; 544-04-L01 only
reruns them read-only.

## Cache invariants

Cached data retains its existing TTL/storage behavior. A rejected read is not cached as
data or as a promise. Forced reads may replace the in-flight identity. Mutation
invalidation/broadcast remains after success only.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/admin/mediaFoldersClient.test.ts
~~~
