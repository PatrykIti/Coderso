# TASK-551-03-L02 — Round-5 dispositions (orchestrator record, 2026-09-25)

Source: Round-4 auditors (S1-A 0/0, S1-B 0/1, S2-A 0/2, S2-B 0/6, S3-A 0/2,
S3-B 0/2 HIGH/MEDIUM). All MEDIUMs are contract-design gaps; decisions below.

## S1
R5-01 Scope-version bump: a changed variant pin gets version m + 1 where m =
max(ADMIN_LIST_SCOPE_VERSIONS[F]) over EVERY family paired with the variant; all
paired families become m + 1; DB-free invariant: within one family no version
> 1 appears in the pin history of two different variants (every pin change is a
unique bump). Note the reason: keysetCursor validates name/type/nullability/
count only (keysetCursor.ts:778-788), not order/nulls.
R5-02 Restore the R3-03 DB-leg fixture details under R4-01 "What stands":
global blackout uses a marker-unique window in year 2300 deleted in `finally`;
the 501-row week-cap seed = 20-minute non-overlapping slots over 167 h on the
marker resource only; losers of the 50-way race can never see
`booking_blackout_conflict` (no ambient blackout overlaps the race window).
R5-03 LOWs: booking lock-wait wording = "zero counted statements after its
BEGIN; pre-transaction point reads are not asserted"; polling budget ≤ 2 s
(holder commits within 2 s), race relies on DB_POOL_MAX 10; R2-32 symbol list
restated (drop withReservationExclusion; add BOOKING_RESOURCE_LOCK_NAMESPACE
(not re-exported by the facade), acquireBookingResourceLock,
mapReservationWriteError, readOwnDataValue, bookingErrorCandidates); the
"no import from mediaFoldersService" static pin owner =
task551AdminWriteConcurrency.test.ts DB-free block; timezone/customer-name
checks stay INSIDE the callback after the preflight (error precedence
byte-identical); declare AdminListSpecVariantId/AdminListScopeFamily/factoryOf
test-local in task551BoundedAdminLists.test.ts; export AdminSetTx from
rolesService.ts; 10-L02 mirror adds the lowercase-only `ids` rule and the
per-resource lock note and replaces its "no C17 v4" sentence.

## S2 — useBoundedAdminList state machine v3 (single writer owns all of it)
R5-04 One in-flight request per hook. next/previous/loadMore are ignored while
`pending`; `revalidate` while pending sets `revalidateQueued = true` (coalesced)
and runs once after the pending request settles; it never overwrites pending
or lastRequest.
R5-05 Append-mode revalidate chain is cancellable: each page fetch in the chain
re-checks `token === latestToken` before issuing the next request; a newer
request supersedes the chain (it stops silently); at most one chain per hook;
cacheBus events during a chain only set `revalidateQueued`; test: a burst of N
events during a chain produces ≤ depth + 1 forced fetches in total.
R5-06 Status `error` blocks next/previous/loadMore; exits: `retry` (re-runs
lastRequest) or a queued/incoming revalidate; test: error → loadMore ignored,
retry re-runs the failed request.
R5-07 Paged reads after a family cacheBus event are forced: the hook records
`familyEpoch` from each event; memory-map entries carry `fetchedAtEpoch`; a
next/previous read whose entry predates the current epoch is forced; test:
event → previous returns fresh rows.
R5-08 Status `reset` has a defined render (empty list + "list was reset" hint)
and an exit: the hook re-issues the first-page read once on the next effect
tick (so non-subscribing pickers recover); test: reset during load-more →
picker shows the fresh first page.
R5-09 Overtaken read: `current()` is re-checked after EVERY await in EVERY
branch; reset wins over error (newer rejects + reset → reset page); the
unreachable memory→slot→empty tail is REMOVED from the pseudocode; pins: the
four reachable outcomes (newer resolves/rejects × reset yes/no).
R5-10 Posts: in addition to the TASK-554 epoch rule, postsClient applies the
installation-token check (registered through adminCacheAuthority) so a read
overtaken by an identity transition resolves the reset page; TASK-554 files
unchanged (epoch semantics identical); the token case is pinned in
tests/vitest/admin/postsClient.test.ts? NO — that file is TASK-554 1:1: pin it
in task551PaginatedClients.test.ts instead.
R5-11 `fetchPage` stability: the hook takes `fetchKey` (family + canonical
scope string); `fetchPage` lives in a ref; the effect depends on
`[fetchKey, pending]` only; a changed fetchKey resets state and reloads; test:
re-render with a new closure but the same key → zero refetches.

## S3
R5-12 Root-tsc baseline: captured by the orchestrator with pinned argv
`./node_modules/.bin/tsc -p tsconfig.json --noEmit --pretty false` after the
TASK-551-11 split lands and before W0; the sorted error lines
(`file(line,col): error TSxxxx: message`) are written to
`_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-root-tsc-baseline.txt`
(tracked; sha256 in the receipt); the diff is a multiset diff of lines; a lost
baseline is re-captured only with an explicit receipt note (never silently).
R5-13 FINAL occurrence: captures its OWN baseline immediately before its first
edit (same argv/location suffix `-final.txt`); the diff rule applies within the
occurrence; errors present at that baseline are cross-stream.
