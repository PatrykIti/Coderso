# TASK-551-06: Retention, Pruning, Revision Concurrency, and Partition Readiness
# FileName: TASK-551-06-Retention-Pruning-Revision-Concurrency-And-Partition-Readiness.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Database / Reliability / Operations / Performance
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-03-L01 and TASK-551-05-L02 complete
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Bound append-heavy data growth, remove destructive pruning from request write
paths, make all revision allocation concurrency-safe, and add a single- and
multi-replica-safe maintenance job plus evidence-only partition-readiness
report. Do not introduce automatic partition DDL without threshold evidence and
a separately reviewed migration/rollback plan.

## Sub-Tasks

1. `TASK-551-06-L01` owns common retention policy and bounded append-heavy
   pruners, including atomic assistant execution/undo persistence. It removes
   the actual inline `pruneHistory` helper/call and lands the actor-scoped,
   UUIDv5/idempotency-key search-history write consumed by TASK-551-04's later
   strict POST; its temporary legacy GET-shaped branch performs zero SQL.
2. `TASK-551-06-L02` lands after L01 and TASK-551-05 constraints; it owns the
   shared revision lock/allocator plus page/widget adoption and bounded revision
   service reads/pruning. It defines the page/detail revision cursor envelopes
   consumed later by TASK-551-03-L02, but edits no route, schema, client, or UI.
   It pins generic detail/entry/post family contracts, but actual
   `detailPageDocumentService.ts` adoption is TASK-551-09-L03 and entry/post
   adoption remains TASK-551-09 after TASK-517 serialization. Consumers must use
   the exact owner signatures `withRevisionParentLock(identity, tx, run)` and
   `allocateRevision(input, tx)`; tx-first overloads or compatibility wrappers
   are forbidden.
3. `TASK-551-06-L03` consumes every pruner, consumes the parent gate's terminal
   TASK-511 state or exact serialized handoff, and
   owns scheduled execution, distributed lock behavior, recovery telemetry,
   and read-only partition-readiness reporting. It exports exactly
   `createRetentionSchedulerLifecycleParticipant(deps)`; TASK-551-08-L03 solely
   registers it in the shared HTTP composition consumed by the already-owned
   TASK-551-02 prod/dev entrypoints; it does not edit or start either entrypoint.
   Enabled startup also consumes L02's
   `assertMaintenanceSessionAffinity()` and fails before traffic unless its
   lock-owning channel is live-proven direct PostgreSQL or PgBouncer session
   pooling; the ordinary main pool may remain transaction-pooled. Disabled
   scheduling performs no probe, preserving `off + primary + pool=1` for small
   sites; enabling on capacity 1 fails before listen. Dedicated-mode DB-start
   probe success is lifecycle-scoped and reused, not physically repeated.

No leaves run in parallel. L03 is the only scheduler writer; L01/L02 expose
injectable jobs and never start timers or perform global pruning inline with
request writes.

The family land order through this child is TASK-551-01 → 02 → 05 → 03-L01 →
06-L01 → 06-L02 → 06-L03. TASK-551-03-L02 then adopts the revision envelopes
at the route/client/UI boundary, followed by 03-L03 and TASK-551-04.

## Cross-Stream Collision Guards

- TASK-551-09 is the sole TASK-551 writer of the whole entry/post facade and
  mutation services (canonical singular `postMutationService.ts`) after
  TASK-517, and also solely owns `detailPageDocumentService.ts`. L02 exposes the
  allocator/retention contract those later adopters consume, but never edits
  their files. `publicSite.tsx` remains forbidden.
- TASK-511 exclusively owns backup service/scheduler files. L03 waits for it,
  does not modify `backupScheduler.ts`, and exports only its retention
  participant factory for TASK-551-08-L03 composition.
- TASK-493 GSC, TASK-518 migrations, TASK-551 cache/search/schema migrations,
  task board, changelog, and workflow paths are forbidden.
- No migration artifacts belong to TASK-551-06; it consumes TASK-551-05 cutoff
  indexes and constraints.

## Shared Retention Contract

Retention is opt-in/configurable per family with explicit safe defaults, min/max
age, maximum rows per parent where applicable, batch size `default 500/max
2,000`, maximum batches/run, timeout, dry-run count mode, and deterministic
oldest-first order. A batch uses indexed cutoff/keyset selection and scoped
delete (`FOR UPDATE SKIP LOCKED` where appropriate); it never runs an unbounded
delete or truncates a shared table. The existing `ANALYTICS_RETENTION_DAYS`
variable remains the sole canonical analytics age setting; no
`RETENTION_ANALYTICS_*` age alias may silently replace or override it.
`RETENTION_DRY_RUN` is the sole global run-mode variable: absent is false and
only exact lowercase `true|false` is valid. L01 parses it into required typed
policy state; L02/L03 only consume it. Global true has no family/scheduler/CLI
override and runs the same bounded candidate reads with zero deletes, updates,
destructive locks, cache/outbox publication, or persisted high-water progress.
Direct service dry-run calls need no scheduler lock. A scheduled dry-run still
reserves one dedicated session and attempts/acquires the one replica advisory
lock before those reads, solely to prevent parallel jobs; that session-level
coordination lock is not a destructive row lock or persisted progress.

## Shared Acceptance

- Every append-heavy family enumerated by L01/L02 has explicit bounded retention
  or an evidence-backed legal/product exemption, including access/audit/email,
  search/integration/assistant, auth tokens/sessions, analytics, forms,
  webhooks, kit runs, cache outbox/backups, and all revision tables.
- Request-path writes trigger zero global prune statements; scheduled batches
  are idempotent and preserve FK ordering/cascades.
- Search-history command replays are concurrency-idempotent by actor/key, key
  reuse with changed canonical input conflicts, and raw keys are not stored.
  TASK-551-04 removes history persistence from GET and leaves the sole write on
  its internal CSRF-protected admin POST.
- Dry-run syntax, typed propagation, and precedence are exact; every family
  returns only bounded sanitized match counts and executes zero mutation.
- Scheduled dry-run uses exactly the same one-replica advisory-lock protocol as
  apply mode, while direct service dry-run uses no scheduler advisory lock; both
  execute zero `DELETE`/`UPDATE`, destructive row lock, or persisted progress.
- Page/widget service writers allocate a unique monotonic per-parent version
  under 50 concurrent attempts here. The shared helper proves the generic
  `detail_page`, `entry`, and `post` family key/version contract directly;
  TASK-551-09-L03 must adopt it in the whole detail document writer and
  TASK-551-09 must adopt it in entry/post before closure. Every revision family
  then retains a bounded, policy-defined history. All adopters call exactly
  `withRevisionParentLock(identity, tx, run)` and `allocateRevision(input, tx)`.
- At most one replica runs the maintenance plan at a time; lock loss/failure
  causes cancellation and rollback before the same-session advisory lock can be
  observed as released, so another replica never overlaps destructive work.
- The enabled scheduler never takes a session advisory lock through PgBouncer
  transaction pooling. Configuration plus L02's two-transaction/two-backend
  lock/PID probe fail fast before traffic, and the same proven backend owns the
  lock, liveness checks, every batch transaction, and unlock.
- Disabled scheduling performs zero affinity reservation/probe and imposes no
  two-session minimum on ordinary DB startup. The two-session requirement is
  enforced exactly when the scheduler is enabled.
- Retention owns one run `AbortSignal`; lifecycle close aborts first, cancels
  active SQL and confirms same-session rollback/termination within 4,500 ms,
  below the shared 5,000 ms worker-participant ceiling. No cache/DB close or
  result publication races detached maintenance work.
- Partition report is read-only, sanitized, threshold-driven, and creates/
  detaches/drops zero partitions.

## Security Contract

- Internal service/runtime/tooling changes only. Existing revision, assistant,
  auth/session, analytics, form, webhook, and backup routes retain their current
  visibility, auth/API-key path, RBAC, CSRF, rate-limit, strict validation, and
  public-write nonce/signature/CAPTCHA controls.
- Retention functions and partition inspection use closed family/table
  registries; no HTTP input supplies SQL, table, cutoff, output path, or lock ID.
- Request writes execute zero retention SQL. Logs/metrics/receipts contain only
  allowlisted family identifiers, bounded counts/timings, and sanitized errors—
  never deleted row content, PII, credentials, tokens, hashes, SQL, or binds.
- TASK-551-08-L03 is the sole later shared HTTP-composition writer. It registers
  the imported retention participant and existing backup start/stop functions;
  TASK-551-02 already owns both prod/dev entrypoints and the signal lifecycle.
  L03 installs no signal handler and edits no backup scheduler source.

## Testing Requirements

Run all leaf DB/reliability/performance suites plus
`bun run gates:coderso`, `bun run gates:coderso:perf`,
`bun run scan:security`, `bun --cwd core lint:types`, and `bun --cwd core lint`.

## Documentation Updates Required

No shared docs are edited here. Each leaf hands the policy/env tables, revision
adoption matrix, scheduler/lifecycle API, recovery and partition evidence to
TASK-551-10-L02. Shared operational docs, environment examples, and changelog
1263 remain its sole ownership.
