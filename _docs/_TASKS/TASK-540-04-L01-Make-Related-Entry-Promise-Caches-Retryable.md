# TASK-540-04-L01: Make Related-Entry Promise Caches Retryable

# FileName: TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Admin Client / Cache / Reliability
**Estimated Effort:** Small
**Dependencies:** TASK-540-01-L01
**Status:** ⏳ To Do
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/services/entriesClient.ts`
- compatibility-expectation updates required before this source gate in
  `tests/vitest/admin/entriesClient.test.ts`

## Grounded anchors

- Value/promise cache owners: `entriesClient.ts:92-96`.
- Sticky `listEntriesCached`: `:261-273`.
- Sticky `listAllEntriesCached`: `:275-285`.

## Implementation Pseudocode

```ts
export async function listEntriesCached(typeSlug, options) {
  if (!options?.force) {
    const cached = getCachedEntries(typeSlug);
    if (cached) return cached;
    const pending = cachedEntriesPromise.get(typeSlug);
    if (pending) return pending;
  }

  const request = listEntries(typeSlug);
  cachedEntriesPromise.set(typeSlug, request);
  try {
    const items = await request;
    primeEntriesCacheInternal(typeSlug, items);
    return items;
  } finally {
    if (cachedEntriesPromise.get(typeSlug) === request) {
      cachedEntriesPromise.delete(typeSlug);
    }
  }
}

export async function listAllEntriesCached(options) {
  // same cache-first contract
  const request = listAllEntries();
  cachedAllEntriesPromise = request;
  try { ... }
  finally {
    if (cachedAllEntriesPromise === request) cachedAllEntriesPromise = null;
  }
}
```

The identity guard is mandatory: a slower first request must not delete a newer
forced request from the pending slot. Do not clear successful value caches in
`finally`; existing invalidation/broadcast ownership stays unchanged.

## Error/compatibility flow

- Rejection propagates to the caller for visible handling, but the pending slot
  is cleared so the next call can retry.
- Concurrent non-force callers share the same live request.
- Force can replace a pending request; only the currently registered request may
  clear itself.
- Public client API and returned payloads remain unchanged.

## Gate tests owned here; aggregate additions owned by TASK-540-06

`tests/vitest/admin/entriesClient.test.ts`: concurrent de-duplication, rejection
then successful retry, success then cached value, force replacement, and stale
request identity guard for both list variants.

Update the named suite before this source gate. TASK-540-06 may add cross-leaf coverage
but must not re-baseline the retry/identity assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/admin/entriesClient.test.ts
```

Rerun the named file once before classifying failure.
