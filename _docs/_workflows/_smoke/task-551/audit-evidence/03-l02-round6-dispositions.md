# TASK-551-03-L02 — Round-6 dispositions (orchestrator record, 2026-09-25)

Source: Round-5 auditors (S1-A 0/0, S1-B 0/0, S2-A 0/2, S2-B 0/3, S3-A 0/2,
S3-B 0/3). Precondition for writing Round 6: TASK-551-11 raises
TASK551_MAX_TASK_FILE_BYTES to 1 MiB (code + boundary test landed), since the
03-L02 file has 1,535 bytes of headroom under the 512 KiB cap.

R6-01 (S2-B, S3-B) Two kinds of invalidation, two generations. `invalidate`
(mutation callers `clear<Family>Cache`, cacheBus family events): advances
`invalidationEpoch`, marks page memory stale (entries keep `fetchedAtEpoch`),
clears in-flight dedupe and the persisted slot; an in-flight read overtaken by
an invalidation resolves outcome `superseded` and the hook silently re-runs
`lastRequest` in the background (no reset UI, current rows stay rendered until
the fresh page lands — the "background revalidation" rule). `reset` (family or
installation reset, identity transition via adminCacheAuthority): advances
`resetGeneration`, clears everything, and an overtaken read resolves the reset
page (hint + one recovery read). Define every public `clear<Family>Cache` body
under this rule (pages, posts, entries, forms, submissions, media, booking,
users) and the pageGenerations/pageLatest/pagesGeneration relationship; pins in
task551PaginatedClients (superseded vs reset) and task551PaginatedListViews
(background revalidate keeps rows; reset shows hint).
R6-02 (S2-B) pages/users templates wrap their own await in try/catch; after a
rejection `current()` is re-checked and reset wins over error (same as posts
p3); pin p3-equivalents for pages and users.
R6-03 (S2-A/S2-B, S3-B) `rekey`: `familyEpoch`/`invalidationEpoch` and the
epoch map are per hook instance and PERSIST across rekey and reset (never back
to 0); rekey clears items/cursor stack and takes the NEW scope's initial filters
passed with `fetchKey` (`{ fetchKey, initialFilters }`), dropping filters that
do not belong to the new scope (D3 field filters are scope-bound); tests: A→B→A
with an event in between forces A's pages; screen switch never sends the old
screen's fieldFilter.*.
R6-04 (S2-A) Reset detection is by a discriminant, not object identity:
`AdminListRead<I> = { kind: 'page', page } | { kind: 'reset' } | { kind:
'superseded' }`; `fetchPage` returns the client result unchanged; view mapping
happens after the hook (`mapItems` option applied only to `kind: 'page'`); test
with a mapping adapter proves the reset hint and the recovery read.
R6-05 (S3-A) Baseline re-capture (INITIAL and FINAL) is allowed only when the
working tree has no 03-L02 wave edits (allowlisted files byte-identical to the
pre-W0 commit) — otherwise blocked; the receipt records the git state proving it.
R6-06 (S3-A/B) File size: the 11 cap raise supersedes "a further round needs a
split first"; no new task file; closure edits (Status/Started/Completed ≤ 200
bytes) and post-audit amendments fit under 1 MiB.
R6-07 (S1-A LOW) The week-cap seed (167 h, status `pending`, inserted
directly), the 50-way race window, the reactivation-leg windows and the
year-2300 blackout are four pairwise-disjoint windows derived from RUN; owning
suite task551AdminWriteConcurrency.test.ts.

## Orchestrator freeze (2026-09-25, after the TASK-551-11 v5 audit)
- The 03-L02 task file is 522,753 bytes against the 524,288-byte dispatch cap.
  NO append to _docs/_TASKS/TASK-551-03-L02-*.md (Round 6, L11 anchor mirrors,
  C13/C14 notes) until TASK-551-11 re-open step 2 (cap → 1 MiB) is green.
  Round-6 writers are held by the orchestrator; the freeze is recorded here and
  in the 11 contract (v6) and will be restated in 03-L02 Round 6 itself.
- No 01-L01 classifier precondition/regeneration run starts between an L11
  step's snapshot and that step's green receipt (collision guard).
