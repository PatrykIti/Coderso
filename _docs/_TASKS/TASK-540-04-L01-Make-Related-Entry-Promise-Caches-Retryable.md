# TASK-540-04-L01: Make Related-Entry and Media Promise Caches Retryable

# FileName: TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md

**Parent Task:** TASK-540
**Parent Subtask:** TASK-540-04
**Priority:** High
**Category:** Admin Client / Cache / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-540-01-L01
**Status:** ✅ Done
**Completed:** 2026-08-06
**Started:** 2026-07-13
**Fix Started:** 2026-07-20
**Implementation Complete:** 2026-07-20 — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.
**Revalidation Passed:** generation 0d0b4b2b3c194e1693151d2a2c847b1c / token 965989df8f714e18b6d7155cb9745e96 / gate green
**Fix Reason:** Final post-audit found that independent list/detail authority can let an older detail shrink or stale a newer full entry list. A later shared-cache audit found the same missing exact-request authority in the content-type list cache used by related-entry consumers.
**Modularity Repair Revalidated:** 2026-07-17 — cohesive <=1,000-line split and exact owner gate passed.
**Current Repair State:** Cache behavior and the test-only cohesive split are implemented. The retained Entries suite now contains its original 19 tests plus two authorized JSON-boundary regressions, so the three Entries suites pass independently at 21/21, 15/15, and 8/8; unchanged Media passes 23/23; the Entries/Media gate is 67/67; and the added Content Types authority suite passes 23/23. Exact fingerprints, static, line, isolation, and drift gates pass. Full family post-audit and runtime smoke remain later closure gates.
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
- `tests/vitest/admin/entriesClientReadAuthority.test.ts`
- `tests/vitest/admin/entriesClientMutationReconciliation.test.ts`
- `tests/vitest/admin/support/entriesClientTestHarness.ts`
- `tests/vitest/admin/mediaClient.test.ts`
- `core/admin/services/contentTypesClient.ts`
- `tests/vitest/admin/contentTypesClient.test.ts`

No other TASK-540 leaf edits these nine paths. Value priming, explicit invalidation,
mutation payloads, and broadcast ordering outside the pending-read authority correction
remain unchanged. Entry writes revoke the matching pending detail and record a typed
reconciliation change while preserving the pending full list; media writes retain their
list-only revocation. Content-type list reads use the same exact-request authority as
media, while public manual priming and every successful content-type mutation revoke an
older read before applying the mutation-derived list update. These write revocations
apply even when the corresponding value cache is absent.

## Mandatory Entries test split

The full-task line gate is anchored at `e5f15a567` and follows every touched path
through the final working tree; staging and intermediate commits do not reset it. The
verified baseline→pre-split line evidence was `entriesClient.ts` 463→751,
`mediaClient.ts` 266→278, `entriesClient.test.ts` 758→1,893, and
`mediaClient.test.ts` 563→935. The completed split finishes at 734/542/588/99 lines for
the retained/read-authority/mutation/harness owners, while the read-only production
clients and Media suite remain 751/278/935. Every owned path is below its declared
budget and the hard limit.

Complete test declarations moved into these exact independently runnable Vitest owners:

| Owner | Exact expanded pre-split positions and responsibility | Count | Post-format budget |
|---|---|---:|---:|
| retained `entriesClient.test.ts` | original positions 1-19 plus two authorized JSON-safe EntryData boundary regressions: transport methods, CSRF/payloads/events, local cache reads, metadata/password redaction, and raw all-entry priming | 21 | `<=900` |
| `entriesClientReadAuthority.test.ts` | current `:820-1336`, positions 20-34: two expanded detail A/B orders, detail retry/mutation authority, four expanded list/detail orders, rejected-list/scoped-clear, list promise identity, A/B replacement, and rejection retry | 15 | `<=700` |
| `entriesClientMutationReconciliation.test.ts` | current `:1337-1893`, positions 35-42: upsert/status/delete replay, newer rejected detail, replace→status composition, rejected mutation, and per-type/all-entry A/B/C→D authority | 8 | `<=750` |
| `support/entriesClientTestHarness.ts` | current helpers `:35-112`: JSON response, isolated localStorage install/restore, scoped cache reset, deferred promise, and typed entry/all-entry fixture builders only | 0 | `<=150` |

The original expanded Entries name multiset was 42: lexical `test.each` declarations
expand to two detail-order names and four cross-channel order names. Its sorted
JSON-serialized expanded-name SHA-256 at the verified pre-split tree is
`4ac0a985562db074992ca7af1ec9e3b7030eb5de9ae4e5ec1de94cf263249ae8`.
Two authorized JSON-boundary regressions make the current family 44 tests with SHA-256
`b3723d9b8d970ee024778b0c8f557302c4e7b774f00f79defa2b1d4ca4028efc`.
The media suite retains 23 unchanged tests, so the current independent/combined result is
`21 + 15 + 8 + 23 = 67`. The harness contains no test, hooks, global fetch mutation,
or singleton state. Each test owns and restores fetch/localStorage/CSRF/cache state in
`try/finally`; no suite relies on another suite's evaluation or cleanup order.

The retained suite may import the harness, and both new suites import it directly; no
test file imports another test file. Shared helpers move exactly once, while helpers
used by one partition remain local. Preserve caller-visible promise identity, request
version ordering, typed replace/status/delete authority, complete-list reconciliation,
present/absent-cache variants, exact cache keys and broadcasts, rejection propagation,
retryability, and the existing production client API. Moving tests is not permission to
re-baseline timing/order assertions or change production fallbacks.

This modularity failure is never a LOW/TASK-9999 candidate, and test-name/assertion or
isolation loss is test-integrity impact. Any such drift blocks this leaf until repaired.

The split landed in this exact order: `support/entriesClientTestHarness.ts`, retained
`entriesClient.test.ts`, `entriesClientReadAuthority.test.ts`, then
`entriesClientMutationReconciliation.test.ts`. Each suite passed immediately after its
move, followed by the unchanged Media suite and historical combined 65/65 gate. Production clients remain
read-only during this test-only partition unless a fresh evidence-backed behavior drift
is verified at their sole owner.

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
// support/entriesClientTestHarness.ts — stateless helper factory/functions only
export function installEntriesTestLocalStorage() {
  const original = globalThis.localStorage;
  const storage = createIsolatedStorage();
  globalThis.localStorage = storage;
  return { storage, restore: () => restoreExactOriginal(original) };
}

export function createDeferred<T>() {
  // one promise/resolve/reject tuple owned by the calling test
}

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

function primeContentTypesCacheInternal(items) {
  contentTypesListCache.write(items); // never clears cachedContentTypesPromise
}

function revokeContentTypesListRead() {
  cachedContentTypesPromise = null;
}

export function primeContentTypesCache(items) {
  // This public/manual prime is authoritative, unlike the value-only internal helper.
  revokeContentTypesListRead();
  primeContentTypesCacheInternal(items);
}

export function listContentTypesCached(options): Promise<ContentTypeSummary[]> {
  if (!options?.force) {
    const cached = getCachedContentTypes();
    if (cached) return Promise.resolve(cached);
    if (cachedContentTypesPromise) return cachedContentTypesPromise;
  }

  let request: Promise<ContentTypeSummary[]>;
  request = listContentTypes()
    .then((items) => {
      if (cachedContentTypesPromise === request) primeContentTypesCacheInternal(items);
      return items;
    })
    .finally(() => {
      if (cachedContentTypesPromise === request) cachedContentTypesPromise = null;
    });
  cachedContentTypesPromise = request;
  return request;
}

async function successfulContentTypeMutation() {
  const result = await mutateContentType();
  // create, duplicate, update, and delete all revoke before their existing cache update.
  revokeContentTypesListRead();
  applyExistingMutationDerivedContentTypeCacheUpdate(result);
  return result;
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

The owned suites use deferred A/B requests and assert caller-visible promise identity.
For per-type entries, all entries, media, and content types independently, cover:

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
- content-type forced A/B reads in both settlement orders prove that only B publishes
  or clears; authoritative rejection retries; public manual priming revokes an older
  publisher; and successful create/duplicate/update/delete each revoke an older pending
  list before applying their existing mutation-derived cache update, including from an
  absent list value; and
- authoritative success is returned from the value cache without another transport
  read.

TASK-540-06 runs these suites read-only and must not re-baseline their retry,
publication, or identity assertions.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/admin/entriesClient.test.ts \
  tests/vitest/admin/entriesClientReadAuthority.test.ts \
  tests/vitest/admin/entriesClientMutationReconciliation.test.ts \
  tests/vitest/admin/mediaClient.test.ts \
  tests/vitest/admin/contentTypesClient.test.ts
node _docs/_workflows/task-540-implement.mjs --check-task-family-line-limit
```

Run the three Entries files independently for 21/21, 15/15, and 8/8, and Media for
23/23. Run Content Types independently for 23/23 before the combined 90/90 command.
Count complete physical lines for all three clients, all five suites, and the support harness, including blanks/comments and an
unterminated final line; reject every result above 1,000. Rerun the named failing file
once in isolation before classifying failure. `runLeafGate` applies this byte-based
count to the leaf's exact `allowedFiles` before and after commands; the displayed global
command runs after all modular streams are present.

## Completion

Implemented exact pending-promise identity and request authority for per-type entry,
entry-detail, all-entry, media, and content-type cached reads. Publication and cleanup require the
registered promise identity; authoritative rejection is retryable; and every successful
entry, media, or content-type mutation revokes the affected older read before its
existing value-cache update while preserving the domain-specific priming differences.

The pre-audit corrected a contract contradiction that would have removed the existing
empty-cache entry-upsert behavior. The first post-audit then found incomplete A/B/C
settlement-order evidence. Tests were expanded for each cache owner with C-first
success and C-reject→D retry while late A/B completions cannot publish or clear the
new authority. A later family audit exposed isolated detail-read authority; A/B settle,
retry, successful/rejected mutation, and scoped-identity regressions raised the previous
gate to 57/57. The fresh cross-channel audit then reproduced list/detail start-order
loss of unrelated rows. The corrected client now uses atomic versioned list/detail
requests and replayable typed per-item authority, including replacement-to-status
composition. The original complete cross-channel/mutation/clear matrix passed 65/65, static gates
and diff check were green, and a fresh read-only post-audit reported zero findings for
the pre-split tree. The modular split then preserved all 42 expanded names and 38
declarations, passed isolated 19/15/8 plus Media 23 and combined 65/65, finished every
owner below 1,000 lines, and passed fresh zero-finding code audits. Two later authorized
JSON-boundary regressions raise the retained/current family to 21 and 44, and the current
combined Entries/Media gate to 67, without changing the original split provenance. Its exact modularity
receipt is historical; family post-audit, smoke, and closure were completed by 2026-08-06.
