# TASK-537: Entry Mutation Atomicity and Secret-Minimal Projections

# FileName: TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md

**Priority:** High
**Category:** Content Entries / Data Integrity / Security / Cache
**Estimated Effort:** Large
**Dependencies:** TASK-514, TASK-541 (program order); must land before TASK-517
**Status:** ✅ Done
**Started:** 2026-07-12
**Completed:** 2026-07-12
**Changelog:** 1249

---

## Overview

`updateEntryMetadata` currently performs status/publish, taxonomy, entry
metadata/visibility, and SEO writes through separate transaction owners. A later
taxonomy or SEO failure can occur after an earlier write. Several mutation paths
also materialize wider `content_entries` rows than their consumers need,
including the password hash column.

This family introduces one transaction-aware metadata mutation boundary,
prepares all rejectable values before its first write, invalidates caches only
after commit, and narrows update/publish/delete projections. No endpoint, DDL,
permission, or public visibility behavior is added. TASK-517 remains the owner of
public enforcement and must be freshly audited on the post-537 tree.

## Hard invariants

- A metadata request commits entry status/revision, taxonomy assignments,
  visibility/password state, tags, scheduling, and SEO together or not at all.
- The coordinator's first minimal entry read uses `FOR UPDATE`; standalone publish uses
  the same locked path, serializing password keep/clear decisions and per-entry revision
  numbering.
- After the row lock, a route guard reads one fresh permission snapshot through the same
  transaction executor with one minimal joined `user_roles` -> `roles` SELECT. It always
  rechecks `content:write` and additionally checks `content:publish` only when the locked
  state proves a real transition. It must never split the snapshot across statements or
  acquire a second global-DB connection while the row lock is held. Role/user-role changes
  committed before that joined statement starts are visible; changes committed after its
  statement snapshot begins do not retroactively change the current mutation decision.
- Known validation (schedule, password requirement/hash preparation, taxonomy
  membership, SEO canonical/robots) completes before the first write.
- Transaction-aware helpers accept the caller's DB executor and never open a
  nested transaction or clear caches internally.
- A metadata mutation with SEO clears the global site cache once after commit; another
  changed metadata/status mutation performs one targeted content-entry invalidation after
  commit. Browser cache-bus effects stay client-owned after a successful response;
  rollback emits none. A post-commit cache failure is redacted/reported but still returns
  the durable result, so it cannot be mistaken for a DB rollback or trigger a duplicate retry.
- `accessPassword` is never selected/returned/logged by the audited update,
  publish, delete, or metadata mutation queries/results. Existing duplicate,
  list, and detail public/minimal projections remain unchanged and hash-free. A
  derived `hasPassword` boolean remains the only exposed password-state signal.
- DB fixtures are unique and clean up only their own rows.
- A production-local internal dependency seam in `entryService.ts` makes transaction,
  prepare/apply, hash, authorization, and post-commit ordering testable; public service
  signatures and the endpoint surface remain compatible.

## Security Contract

- **Visibility:** existing internal admin content-entry endpoints only; no new
  public route.
- **Auth/RBAC:** the existing Admin session-cookie authentication remains unchanged.
  Ordinary writes require `content:write`; a transition to published additionally
  requires `content:publish` and an actor id. The leading middleware remains an early
  rejection gate. After the row lock, the route guard reads one permission snapshot with
  one minimal joined `user_roles` -> `roles` SELECT through that transaction executor and
  evaluates every required permission before the first write. A legacy string requirement
  normalizes to a one-element all-of list; an empty list fails closed even for a wildcard
  role. This eliminates split-snapshot authorization and connection-pool self-deadlock
  while preserving `content:write`-only metadata saves on already-published entries. This
  route has no API-key mode and TASK-537 does not add one.
- **CSRF/rate limiting:** session mutations retain shared CSRF and `admin_write`. No
  nonce/captcha applies.
- **Validation:** existing strict route envelopes remain reject-unknown. `scheduledAt`
  remains present-only at the route boundary and the final scheduled state requires a
  valid non-null date. Domain errors stay machine-readable through the centralized entry
  mapper; `seo_canonical_invalid` and `seo_robots_invalid` map to HTTP 400.
- **Secrets:** plaintext passwords exist only long enough to hash; hashes stay in
  the DB executor and never enter a broad returned row, cache, log, or client DTO.

## Sub-Tasks

| ID | Title | Leaves | Status |
|---|---|---|---|
| TASK-537-01 | Entry metadata transaction boundary | TASK-537-01-L01, L02 | ✅ Done |
| TASK-537-02 | Secret-minimal entry projections | TASK-537-02-L01 | ✅ Done |
| TASK-537-03 | Rollback/cache tests and closure | TASK-537-03-L01 | ✅ Done |

## Finding coverage matrix

| Finding | Owner | Required proof |
|---|---|---|
| M-01 multi-step metadata writes are non-atomic | 537-01/L01 + L02 + 537-02/L01 | DB fault injection at taxonomy/SEO/status seams rolls back all rows and revisions |
| M-01 cache may run before the full mutation succeeds | 537-02/L01 + 537-03/L01 | cache spy remains silent on rollback and runs once after commit |
| M-02 update/publish/delete materialize password hash | 537-02/L01 | projection-shape tests and query spies prove the column is absent |
| Post-audit RBAC split snapshot and `DB_POOL_MAX=1` self-deadlock | 537-02/L01 | one minimal joined `user_roles` -> `roles` query on the locked transaction executor, non-empty all-of/fail-closed tests, READ COMMITTED linearization proof, controlled row-lock ordering, and bounded one-connection subprocess |

## Ownership and land order

Land `537-01 → 537-02 → 537-03`, after TASK-541 and before TASK-544 in the
audited dependency map. Separate 537-01 leaves own transaction-aware taxonomy and SEO helpers;
537-02 is the sole `entryService.ts` writer and the sole TASK-537 writer of the metadata
route/route test plus the narrow executor-aware RBAC seam in `roleService.ts` and
`rbac.ts` and its shared permission-factory type in `routes/index.ts`. It composes the locked outer transaction, transition guard,
pre-write preparation, cache-after-commit, and minimal projections. TASK-517 may
not implement against the stale pre-537 service shape; rerun its route/cache/
security drift audit after 537.

## Testing Requirements

- `bun --cwd core lint:types`
- `bun --cwd core lint`
- With repo env loaded, the full `bun run test` and `bun run precommit:check` are
  mandatory closure gates in addition to the eleven targeted files. Both must pass before
  runtime smoke and before any status moves to Done, and both rerun after every final-drift
  fix, including a docs-only fix.
- With repo env loaded and DB reachable: targeted entry/taxonomy/SEO service and
  content route suites, including unique rollback fixtures.
- Controlled concurrency covers password keep/clear and duplicate revision-number races;
  the internal dependency seam covers deferred apply, injected DB failures, permission
  guard timing, and post-commit invalidation timing without production fallbacks.
- A controlled row-lock test proves the guard cannot run before `FOR UPDATE`, and a
  `DB_POOL_MAX=1` subprocess proves the real RBAC lookup completes through the transaction
  executor without waiting for a second pooled connection.
- RBAC tests prove the permission snapshot is one joined minimal projection rather than
  two READ COMMITTED statements, pin the before/after-statement role-change linearization,
  and cover legacy-string allow/deny, all-of allow/deny, wildcard allow, and empty-list
  fail-closed behavior.
- The existing Admin entries-client Vitest proves cacheBus reconciliation occurs only
  after a successful metadata HTTP response and emits nothing for a rejected response.
- No optional projection helper module is created. Pure preparation behavior is tested
  through the exact exported taxonomy/SEO helpers in their existing Bun-owned suites.
- Re-run every named failing file once in isolation before classifying a failure.
- Post-audit lenses: atomicity, secret projection, cache-after-commit, route error
  mapping, and TASK-517 compatibility.

## Documentation Updates Required

Update `_docs/CONTENT_TYPES_SPEC.md`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
and `_docs/ADMIN_CACHE.md` if cache timing text changes. Update `_docs/RBAC_SPEC.md`
unconditionally with the non-empty all-of permission contract, empty-list fail-closed
behavior, wildcard semantics, the one joined minimal transaction-executor permission
snapshot, and its READ COMMITTED role-change linearization. At closure create changelog
1249 and mark all descendants done.

## Completion Record

- The metadata coordinator now validates rejectable state before its first write and
  commits entry status/revision, taxonomy assignments, visibility/password/schedule,
  tags, and SEO through one locked transaction. Taxonomy and SEO expose caller-executor
  prepare/apply seams without nested transactions or cache effects.
- Update, publish, delete, and metadata paths use explicit minimal projections. No
  audited read/return projection materializes the stored `accessPassword` hash; only
  the SQL-derived `hasPassword` signal is exposed. A freshly prepared hash exists
  transiently only inside the coordinator's DB-write path (local preparation and write
  plan) and is never returned, cached, or logged. Locked authorization uses one minimal
  joined role
  snapshot on the transaction executor, with non-empty all-of and empty fail-closed
  semantics.
- Cache invalidation occurs after durable commit: SEO uses one global clear, other
  changed metadata/status uses one targeted clear, and no-op/rollback emits neither.
  Browser cache reconciliation remains client-owned after a successful response.
- The initial post-implementation audit found two Medium test-integrity gaps: the
  rollback snapshot did not pin a non-null schedule/hash baseline, and the deferred
  apply matrix did not cover both resolve/reject outcomes for taxonomy and SEO. Both
  were corrected; three fresh final read-only lenses then reported 0 High/Medium/Low
  findings.
- Full validation passed: targeted Bun 109/109 tests (663 assertions), entries-client
  Vitest 19/19, full Bun 1,680 pass / 1 optional live skip / 0 fail (8,866 assertions),
  full Vitest 836 files / 6,746 tests, core/root static checks, `precommit:check`, and
  all five Coderso release gates. Targeted Semgrep reported zero findings. The strict
  scan remained non-green only for the exact unchanged TASK-545-owned finding in
  `_docs/_workflows/task-522-author.mjs`; no scanner configuration changed.
- Live smoke used the required dev-host helper and separate full
  `playwright-cli -s=wf537smoke ...` commands. Six canonical entry flows covered
  taxonomy/SEO, schedule omit/reject, password-state minimization, full rollback, and
  publish/unpublish front parity in light/dark and wide/narrow viewports, with zero
  console errors, warnings, or page errors. Eight distinct valid PNGs were captured and
  every fixture, preference, browser session, listener, and helper process was cleaned
  or restored. Setup/debug/cleanup probes that intentionally exercised existing dialog
  warnings or expected 4xx responses were discarded before the canonical measurements
  and are not counted as clean acceptance flows.

### TASK-517 follow-on audit

TASK-517 remains open and untouched. Before its implementation, its owner must add
TASK-537 as a dependency, reground all stale `entryService.ts` anchors, keep
`getEntryAccessPasswordHash` as the sole raw-hash projection outside
`ENTRY_MUTATION_FIELDS`, choose a free changelog pin because its parent/517-03 files pin
occupied 1236 while the board and changelog index still reserve stale 1230, and sync all
four locations. Its proposed memoized gated-route signal must invalidate through
TASK-537's post-commit cache seam; it may not reintroduce pre-commit invalidation or
bypass the locked mutation contract.
