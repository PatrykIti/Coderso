# TASK-540-04-L01: Make Related-Entry and Media Promise Caches Retryable

# FileName: TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Admin Client / Cache / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01-L01
**Status:** ✅ Done
**Started:** 2026-07-13
**Completed:** 2026-07-13
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/services/entriesClient.ts`
- `core/admin/services/mediaClient.ts`
- `tests/vitest/admin/entriesClient.test.ts`
- `tests/vitest/admin/mediaClient.test.ts`

No other TASK-540 leaf edits these four paths. Value priming, explicit invalidation,
mutation payloads, and broadcast ordering outside the pending-read authority correction
remain unchanged. Revoking a pending read after a successful write is part of this
leaf's authority correction, including when the value cache is absent.

## Grounded anchors

- Entry value/promise cache owners: `entriesClient.ts:92-96`.
- Entry priming helpers that currently clear pending slots: `:139-149`.
- Sticky `listEntriesCached`: `:261-273`.
- Sticky `listAllEntriesCached`: `:275-285`.
- Media pending owner and priming helper: `mediaClient.ts:98-110`.
- Sticky `listMediaCached`: `mediaClient.ts:152-163`.

## Implementation Pseudocode

```ts
// Value priming helpers never read or mutate a pending-request slot.
function primeEntriesCacheInternal(typeSlug, items) {
  cachedEntries.set(typeSlug, items);
  writeLocalCache(cacheKeys.entriesList(typeSlug), items);
}

export function listEntriesCached(typeSlug, options): Promise<EntrySummary[]> {
  if (!options?.force) {
    const cached = getCachedEntries(typeSlug);
    if (cached) return Promise.resolve(cached);
    const pending = cachedEntriesPromise.get(typeSlug);
    if (pending) return pending;
  }

  let request: Promise<EntrySummary[]>;
  request = listEntries(typeSlug)
    .then((items) => {
      // A superseded request may resolve for its caller but never publishes stale data.
      if (cachedEntriesPromise.get(typeSlug) === request) {
        primeEntriesCacheInternal(typeSlug, items);
      }
      return items;
    })
    .finally(() => {
      if (cachedEntriesPromise.get(typeSlug) === request) {
        cachedEntriesPromise.delete(typeSlug);
      }
    });
  cachedEntriesPromise.set(typeSlug, request);
  return request;
}

export function listAllEntriesCached(options): Promise<EntryListItem[]> {
  if (!options?.force) {
    const cached = getCachedAllEntries();
    if (cached) return Promise.resolve(cached);
    if (cachedAllEntriesPromise) return cachedAllEntriesPromise;
  }

  let request: Promise<EntryListItem[]>;
  request = listAllEntries()
    .then((items) => {
      if (cachedAllEntriesPromise === request) primeAllEntriesCacheInternal(items);
      return items;
    })
    .finally(() => {
      if (cachedAllEntriesPromise === request) cachedAllEntriesPromise = null;
    });
  cachedAllEntriesPromise = request;
  return request;
}

function primeMediaCacheInternal(items) {
  mediaListCache.write(items); // never clears cachedMediaPromise
}

export function listMediaCached(options): Promise<MediaRecord[]> {
  if (!options?.force) {
    const cached = getCachedMedia();
    if (cached) return Promise.resolve(cached);
    if (cachedMediaPromise) return cachedMediaPromise;
  }

  let request: Promise<MediaRecord[]>;
  request = listMedia()
    .then((items) => {
      if (cachedMediaPromise === request) primeMediaCacheInternal(items);
      return items;
    })
    .finally(() => {
      if (cachedMediaPromise === request) cachedMediaPromise = null;
    });
  cachedMediaPromise = request;
  return request;
}

// Every successful write-derived list mutation revokes the older read before
// inspecting or priming the value cache. Revocation is required even when there
// is no current cached list: the old read may still carry a pre-write snapshot.
function revokeEntriesRead(typeSlug: string) {
  cachedEntriesPromise.delete(typeSlug);
}

function upsertCachedEntry(typeSlug, entry) {
  revokeEntriesRead(typeSlug);
  // Preserve the existing entry-client contract: unlike media, an entry upsert
  // may seed a mutation-derived one-row type list when no list cache exists.
  const current = cachedEntries.get(typeSlug) ?? readEntriesCache(typeSlug) ?? [];
  const summary = toEntrySummary(entry);
  const index = current.findIndex((item) => item.id === summary.id);
  const next = [...current];
  if (index === -1) next.unshift(summary);
  else next[index] = { ...next[index], ...summary };
  primeEntriesCacheInternal(typeSlug, next);
  // Preserve the existing detail-cache publication verbatim.
  const detail = toEntryDetail(entry);
  getCachedEntryDetailsMap(typeSlug).set(detail.id, detail);
  writeEntryDetailCache(typeSlug, detail);
}

function updateCachedEntryStatus(typeSlug, id, status) {
  revokeEntriesRead(typeSlug);
  existingValueOnlyStatusPrimeWhenPresent(typeSlug, id, status);
}

function removeCachedEntry(typeSlug, id) {
  revokeEntriesRead(typeSlug);
  existingValueOnlyRemovalWhenPresent(typeSlug, id);
}

function revokeMediaRead() {
  cachedMediaPromise = null;
}

function upsertCachedMedia(item) {
  revokeMediaRead();
  existingValueOnlyUpsertWhenFullListPresent(item);
}

function removeCachedMedia(id) {
  revokeMediaRead();
  existingValueOnlyRemovalWhenFullListPresent(id);
}
```

The stored promise is the exact promise returned to every concurrent non-force caller;
these cached exports therefore must not be declared `async`. An `async` wrapper would
preserve network de-duplication but break the asserted caller-visible promise identity.
The request variable above deliberately refers to the authoritative chained promise,
not the underlying transport promise.

The authority checks are mandatory on both publication and cleanup. If initial A is
replaced by forced B (and B by forced C), every superseded request may settle for its
own caller but may neither prime a value nor clear the current pending slot. This remains
true in every success/rejection settlement order. Priming helpers mutate only their
value/storage caches; they never mutate pending slots. Explicit invalidation may still
clear both value and pending caches under its existing contract.

Every successful write-derived entry upsert, status update, or removal and every media
upsert/removal explicitly revokes its pending slot before inspecting the current value
cache or applying the existing mutation-derived value publication. Entry upsert keeps
its current ability to seed a one-row type list when the cache is absent; entry status
and removal plus media upsert/removal remain present-list-only. This includes entry
create/update/metadata/duplicate, publish/unpublish, and delete, plus media
upload/update/recover/replace and delete. Revocation remains required when the full
value cache is missing or expired:
otherwise a still-live pre-write read could later become authoritative and seed stale
rows. Rejected mutations do not revoke, prime, or broadcast. The all-entries mutation
path keeps using its existing explicit `clearAllEntriesCache()` invalidation.

## Error/compatibility flow

- Rejection propagates to the caller for visible handling, but the authoritative
  pending slot is cleared so the next call can retry.
- Concurrent non-force callers receive the same live promise object.
- Force can replace a pending request; only the currently registered request may
  publish or clear itself.
- A superseded success cannot overwrite the authoritative value cache, including
  after B has already published.
- Public client APIs and returned payloads remain unchanged.

## Gate tests owned here; aggregate additions owned by TASK-540-06

Both owned suites use deferred A/B requests and assert caller-visible promise identity.
For per-type entries, all entries, and media independently, cover:

- two concurrent non-force callers are `toBe` the same pending promise and issue one
  transport read;
- A is replaced by forced B, a third non-force caller joins B, A settles first without
  publishing or clearing B, and B alone becomes the cached value;
- B settles first and publishes, then late A cannot overwrite B;
- authoritative rejection clears its slot, exposes the rejection, and the next
  non-force call creates a distinct request that can succeed;
- a superseded rejection cannot clear the authoritative request; and
- a third forced request C supersedes A/B and remains authoritative under every A/B/C
  success/rejection settlement order;
- entry upsert, status update (`publishEntry` and `unpublishEntry`), and removal each
  revoke an older pending per-type read before value-cache inspection; the late read
  cannot overwrite the mutation-derived value;
- the same entry mutation cases with no current value cache prove the pending slot is
  still revoked: an upsert keeps its existing mutation-derived one-row cache and a late
  read cannot overwrite it, while status/removal leave the list absent and a late read
  cannot seed it;
- media upsert and removal prove the same behavior both with and without a current full
  media-list cache; and
- authoritative success is returned from the value cache without another transport
  read.

TASK-540-06 runs these suites read-only and must not re-baseline their retry,
publication, or identity assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/admin/entriesClient.test.ts \
  tests/vitest/admin/mediaClient.test.ts
```

Rerun the named failing file once in isolation before classifying failure.

## Completion

Implemented exact pending-promise identity and request authority for per-type entry,
all-entry, and media cached reads. Publication and cleanup now require the registered
promise identity; authoritative rejection is retryable; and every successful entry or
media mutation revokes an older read before value-cache inspection while preserving
the existing entry/media priming differences.

The pre-audit corrected a contract contradiction that would have removed the existing
empty-cache entry-upsert behavior. The first post-audit then found incomplete A/B/C
settlement-order evidence. Tests were expanded for each cache owner with C-first
success and C-reject→D retry while late A/B completions cannot publish or clear the
new authority. The final fresh audit reported zero HIGH, MEDIUM, or LOW findings.
Final validation: targeted Vitest 52/52, `bun --cwd core lint:types`,
`bun --cwd core lint`, `git diff --check`, empty staging, and Page collision guards
all passed.
