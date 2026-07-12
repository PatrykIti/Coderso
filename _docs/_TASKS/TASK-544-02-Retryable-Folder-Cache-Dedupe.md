# TASK-544-02: Retryable Folder Cache Dedupe

# FileName: TASK-544-02-Retryable-Folder-Cache-Dedupe.md

**Parent Task:** TASK-544
**Priority:** Medium
**Category:** Admin Cache / Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-544-01
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1256

---

## Scope

Clear the list request dedupe slot after both resolve and reject, guarded by promise
identity so an older settled request cannot clear a newer forced request. Validate every
folder item before it can enter the TTL cache, and project successful transport rows to the
exact six-field browser contract before returning or persisting them.

## Grounded anchor

core/admin/services/mediaFoldersClient.ts:37-75 assigns cachedFoldersPromise but clears
it only through the success-only primeFoldersCache path.

## Leaf

TASK-544-02-L01 is the sole mediaFoldersClient.ts writer and owns the directly affected
client suite. The rejection/overlap behavior tests land with the source; 544-04-L01 only
reruns them read-only.

| Leaf | Scope | Source ownership | Status |
|---|---|---|---|
| TASK-544-02-L01 | Retryable promise identity and canonical cache projection | mediaFoldersClient + direct Vitest suite | ✅ Done |

## Cache invariants

Cached data retains its existing TTL/storage behavior. The unpaginated endpoint retains its
full array and existing string compatibility; TASK-544 adds no arbitrary browser-only item
count or string-length limit. Validation is a finite structural walk over the received
array. A rejected read is not cached as data or as a promise. A malformed array item rejects
with a client-owned error whose explicit stable `code` is
`media_folders_response_invalid`, and writes no cache. Valid rows are copied to exactly
`id`, `name`, `slug`, `parentId`, `orderIndex`, and `createdAt`; `createdBy` and every other
unknown transport key are stripped and cannot enter localStorage. The same descriptor-safe
item projector supplies the required-field checks for persisted envelopes; persisted items
additionally require the exact six-key allowlist, so malformed or non-canonical values are
evicted.
Forced reads may replace the in-flight identity. Mutation invalidation/broadcast remains
after success only.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts tests/vitest/admin/mediaFoldersClient.test.ts
~~~

## Completion evidence

Settled requests clear only their own dedupe identity, forced/cleared generations cannot
be overwritten by stale completions, and only the canonical six-field projection reaches
browser cache. Rejection, overlap, malformed-envelope, descriptor-safety, projection, and
success-only cache-event regressions passed in the final targeted Vitest matrix.
