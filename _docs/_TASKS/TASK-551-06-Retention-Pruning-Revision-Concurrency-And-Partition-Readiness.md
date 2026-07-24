# TASK-551-06: Retention, Pruning, Revision Concurrency, and Partition Readiness
# FileName: TASK-551-06-Retention-Pruning-Revision-Concurrency-And-Partition-Readiness.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Database / Reliability / Operations / Performance
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-04 complete
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Objective

Bound append-heavy data growth, remove destructive pruning from request write
paths, make all revision allocation concurrency-safe, and add a single- and
multi-replica-safe maintenance job plus evidence-only partition-readiness
report. Do not introduce automatic partition DDL without threshold evidence and
a separately reviewed migration/rollback plan.

## Leaves and Strict Land Order

1. `TASK-551-06-L01` owns common retention policy and bounded append-heavy
   pruners, including atomic assistant execution/undo persistence.
2. `TASK-551-06-L02` lands after L01 and TASK-551-05 constraints; it owns the
   shared revision allocator plus page/widget/detail revision adoption, bounded
   history, and pruning. Entry/post facade and mutation adoption is handed to
   TASK-551-09 after TASK-517 serialization.
3. `TASK-551-06-L03` consumes every pruner, consumes the parent gate's terminal
   TASK-511 state or exact serialized handoff, and
   owns scheduled execution, distributed lock behavior, recovery telemetry,
   and read-only partition-readiness reporting.

No leaves run in parallel. L03 is the only scheduler writer; L01/L02 expose
injectable jobs and never start timers or perform global pruning inline with
request writes.

## Cross-Stream Collision Guards

- TASK-551-09 is the sole TASK-551 writer of the whole entry/post facade and
  mutation services (canonical singular `postMutationService.ts`) after
  TASK-517, and also solely owns `detailPageDocumentService.ts`. L02 exposes the
  allocator/retention contract those later adopters consume, but never edits
  their files. `publicSite.tsx` remains forbidden.
- TASK-511 exclusively owns backup service/scheduler files. L03 waits for it,
  does not modify `backupScheduler.ts`, and integrates only through its own
  scheduler startup path.
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
delete or truncates a shared table.

## Shared Acceptance

- Every append-heavy family enumerated by L01/L02 has explicit bounded retention
  or an evidence-backed legal/product exemption, including access/audit/email,
  search/integration/assistant, auth tokens/sessions, analytics, forms,
  webhooks, kit runs, cache outbox/backups, and all revision tables.
- Request-path writes trigger zero global prune statements; scheduled batches
  are idempotent and preserve FK ordering/cascades.
- Page/widget/detail revision families allocate a unique monotonic per-parent
  version under 50 concurrent attempts here; TASK-551-09 must apply the same
  landed helper to entry/post before family closure. Every revision family then
  retains a bounded, policy-defined history.
- At most one replica runs the maintenance plan at a time; lock loss/failure
  causes safe abort and later retry, never overlapping destructive work.
- Partition report is read-only, sanitized, threshold-driven, and creates/
  detaches/drops zero partitions.

## Validation Rollup

Run all leaf DB/reliability/performance suites plus
`bun run gates:coderso`, `bun run gates:coderso:perf`,
`bun --cwd core lint:types`, and `bun --cwd core lint`. Shared operational docs,
environment examples, and changelog 1263 remain TASK-551-10-L02.
