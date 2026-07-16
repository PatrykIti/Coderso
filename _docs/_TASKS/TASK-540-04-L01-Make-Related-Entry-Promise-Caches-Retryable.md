# TASK-540-04-L01: Make Related-Entry and Media Promise Caches Retryable

# FileName: TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Admin Client / Cache / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01-L01
**Status:** 🚧 In Progress
**Started:** 2026-07-13
**Implementation Complete:** 2026-07-14 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Fix Started:** 2026-07-14
**Fix Reason:** Final post-audit found that independent list/detail authority can let an older detail shrink or stale a newer full entry list.
**Revalidation Passed:** 2026-07-14 — `core lint:types`, `core lint`, the exact Entries/Media client Vitest matrix (65/65), and `git diff --check`
**Post-Audit:** 2026-07-14 — PASS; zero HIGH, MEDIUM, or LOW findings on the corrected working tree
**Previous Revalidation:** 2026-07-14 — `core lint:types`, `core lint`, and the exact entries/media client Vitest matrix (57/57)
**Previous Completion:** 2026-07-14
**Reopened:** 2026-07-14 (cross-channel list/detail reconciliation)
**Changelog:** 1252 (pinned; closure only)

---

## Exclusive ownership

- `core/admin/services/entriesClient.ts`
- `core/admin/services/mediaClient.ts`
- `tests/vitest/admin/entriesClient.test.ts`
- `tests/vitest/admin/mediaClient.test.ts`

No other TASK-540 leaf edits these four paths. Value priming, explicit invalidation,
mutation payloads, and broadcast ordering outside the pending-read authority correction
remain unchanged. Entry writes revoke the matching pending detail and record a typed
reconciliation change while preserving the pending full list; media writes retain their
list-only revocation. Both apply even when the value cache is absent.

## Historical pre-implementation grounded anchors

These 2026-07-13 line snapshots are retained as audit provenance. They describe the
pre-implementation source layout; current ownership and validation are anchored by the
named files, symbols, and regression suites in this contract rather than mutable line
numbers.

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

type PendingVersioned<T> = Readonly<{ promise: Promise<T>; version: number }>;
const pendingEntryLists = new Map<string, PendingVersioned<EntrySummary[]>>();

export function listEntriesCached(typeSlug, options): Promise<EntrySummary[]> {
  if (!options?.force) {
    const cached = getCachedEntries(typeSlug);
    if (cached) return Promise.resolve(cached);
    const pending = pendingEntryLists.get(typeSlug);
    if (pending) return pending.promise;
  }

  // Allocate only after cache/pending reuse, then atomically store promise+version.
  const version = nextEntryPublicationVersion();
  let pending!: PendingVersioned<EntrySummary[]>;
  const promise = listEntries(typeSlug)
    .then((items) => {
      if (pendingEntryLists.get(typeSlug) === pending) {
        publishReconciledEntryList(typeSlug, items, version);
      }
      return items;
    })
    .finally(() => {
      if (pendingEntryLists.get(typeSlug) === pending) {
        pendingEntryLists.delete(typeSlug);
      }
    });
  pending = { promise, version };
  pendingEntryLists.set(typeSlug, pending);
  return promise;
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

// Entry type lists and details share one monotonic clock. Settled authority carries
// the exact value/typed patch/tombstone required to replay a newer mutation over an
// older full list; pending detail authority is the atomic request record itself.
type EntryItemChange =
  | Readonly<{ kind: "replace"; value: EntryDetail }>
  | Readonly<{ kind: "status"; value: EntryStatus }>
  | Readonly<{ kind: "delete" }>;
type EntryItemAuthority = Readonly<{ version: number; change: EntryItemChange }>;
const pendingEntryDetails = new Map<
  string,
  Map<string, PendingVersioned<EntryDetail>>
>();
const settledEntryItemAuthority = new Map<string, Map<string, EntryItemAuthority>>();
const committedEntryListVersions = new Map<string, number>();

function reconcileEntryList(typeSlug, serverItems, listVersion) {
  const current = readCurrentTypeListById(typeSlug);
  const pending = pendingEntryDetails.get(typeSlug);
  const settled = settledEntryItemAuthority.get(typeSlug);
  return reconcileCompleteList({
    serverItems,
    current,
    listVersion,
    authorityFor(id) {
      return {
        pendingVersion: pending?.get(id)?.version,
        settledAuthority: settled?.get(id),
      };
    },
    // Reconciliation applies a settled replace/status/delete whenever its version is
    // newer than listVersion, independently of any still-newer pending detail. A
    // pending detail carries no replay data: by itself it uses the server row
    // provisionally (never a stale current row) and remains registered for settlement.
  });
}

function publishReconciledEntryList(typeSlug, items, listVersion) {
  const reconciled = reconcileEntryList(typeSlug, items, listVersion);
  primeEntriesCacheInternal(typeSlug, reconciled);
  committedEntryListVersions.set(typeSlug, listVersion);
  // A successful newer list invalidates only older detail attempts/values. This
  // happens on success, not start, so a rejected list cannot strand valid detail work.
  invalidateEntryDetailsAtOrBefore(typeSlug, listVersion);
  discardSettledAuthorityAtOrBefore(typeSlug, listVersion);
}

function getEntryCached(typeSlug, id, options) {
  if (!options?.force) {
    const cached = getCachedEntryDetail(typeSlug, id) ?? detailFromCachedList(typeSlug, id);
    if (cached) return Promise.resolve(cached);
    const pending = pendingEntryDetails.get(typeSlug)?.get(id);
    if (pending) return pending.promise;
  }

  const version = nextEntryPublicationVersion();
  let pending!: PendingVersioned<EntryDetail>;
  const promise = getEntry(typeSlug, id)
    .then((detail) => {
      if (pendingEntryDetails.get(typeSlug)?.get(id) !== pending) return detail;
      settleItemAuthority(typeSlug, id, {
        version,
        change: { kind: "replace", value: detail },
      });
      publishEntryDetail(detail, version);
      mergeSummaryIntoCurrentList(typeSlug, detail); // never replaces unrelated rows
      return detail;
    })
    .finally(() => removePendingDetailOnlyIfExact(typeSlug, id, pending));
  pending = { promise, version };
  getOrCreatePendingEntryDetails(typeSlug).set(id, pending);
  return promise;
}

// A successful mutation receives a newer settled item version and revokes only its
// matching pending detail. The full-list request remains useful: on settlement it
// fills unrelated rows while preserving this newer value/tombstone. A rejected
// mutation allocates no authority and changes neither pending reads nor value caches.
function publishSuccessfulEntryMutation(typeSlug, entry) {
  const version = nextEntryPublicationVersion();
  revokePendingEntryDetail(typeSlug, entry.id);
  settleItemAuthority(typeSlug, entry.id, {
    version,
    change: { kind: "replace", value: entry },
  });
  mergeSummaryIntoCurrentList(typeSlug, entry);
  publishEntryDetail(entry);
}

function publishSuccessfulEntryStatus(typeSlug, id, status) {
  const version = nextEntryPublicationVersion();
  revokePendingEntryDetail(typeSlug, id);
  settleItemAuthority(typeSlug, id, {
    version,
    change: { kind: "status", value: status },
  });
  patchCurrentListAndDetailStatus(typeSlug, id, status);
}

function publishSuccessfulEntryDelete(typeSlug, id) {
  const version = nextEntryPublicationVersion();
  revokePendingEntryDetail(typeSlug, id);
  settleItemAuthority(typeSlug, id, { version, change: { kind: "delete" } });
  removeItemFromCurrentListAndDetail(typeSlug, id);
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

Every successful write-derived entry upsert, status update, or removal revokes only its
matching pending detail, records a newer item value/tombstone, and merges into the
current list without discarding a still-useful full-list request. That full-list result
later fills unrelated rows while preserving all item authorities newer than its start.
This covers entry create/update/metadata/duplicate, publish/unpublish, delete, both
list/detail start orders, and both settlement orders. Media remains list-only: every
media upsert/removal explicitly revokes its pending list read before applying the
existing present-list-only publication. Rejected mutations allocate no authority.
Rejected mutations do not revoke, prime, or broadcast. The all-entries mutation path
keeps using its existing explicit `clearAllEntriesCache()` invalidation.

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
- for Entries, detail-start→newer-list and list-start→newer-detail in both settlement
  orders preserve the full unrelated row set while the newer value wins for its ID;
  a successfully committed newer list evicts/invalidates every older observed detail
  value and request, while a rejected newer list leaves the older detail able to publish;
  a newer create/update/status/delete is preserved when an older full list settles,
  including publish/unpublish with no prior value cache via its typed status patch;
  list-start→successful replace/status/delete→newer detail rejection preserves the
  settled change in both present-cache and absent-cache variants—the valueless pending
  request never masks replayable mutation authority;
  rejected mutations retain pending detail authority, and scoped clear invalidates
  every captured list/detail publisher and known detail value;
- authoritative rejection clears its slot, exposes the rejection, and the next
  non-force call creates a distinct request that can succeed;
- a superseded rejection cannot clear the authoritative request; and
- a third forced request C supersedes A/B and remains authoritative under every A/B/C
  success/rejection settlement order;
- entry upsert, status update (`publishEntry` and `unpublishEntry`), and removal each
  record a newer typed item change without discarding an older pending full list; when
  that list settles it fills unrelated rows and replays the exact newer replace/status/
  delete change instead of overwriting it;
- the same mutation cases with no current value cache prove an older list still fills
  its unrelated rows while applying an upsert, applying the exact published/draft status
  to its returned target row, or retaining the deletion tombstone;
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
entry-detail, all-entry, and media cached reads. Publication and cleanup require the
registered promise identity; authoritative rejection is retryable; and every successful
entry or media mutation revokes only the affected older read before value-cache inspection
while preserving the existing entry/media priming differences.

The pre-audit corrected a contract contradiction that would have removed the existing
empty-cache entry-upsert behavior. The first post-audit then found incomplete A/B/C
settlement-order evidence. Tests were expanded for each cache owner with C-first
success and C-reject→D retry while late A/B completions cannot publish or clear the
new authority. A later family audit exposed isolated detail-read authority; A/B settle,
retry, successful/rejected mutation, and scoped-identity regressions raised the previous
gate to 57/57. The fresh cross-channel audit then reproduced list/detail start-order
loss of unrelated rows. The corrected client now uses atomic versioned list/detail
requests and replayable typed per-item authority, including replacement-to-status
composition. The complete cross-channel/mutation/clear matrix passed 65/65, static gates
and diff check are green, and a fresh read-only post-audit reported zero findings.
