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

## Overview

Bound append-heavy data growth, remove destructive pruning from request write
paths, make all revision allocation concurrency-safe, and add a single- and
multi-replica-safe maintenance job plus evidence-only partition-readiness
report. Do not introduce automatic partition DDL without threshold evidence and
a separately reviewed migration/rollback plan.

## Sub-Tasks

1. `TASK-551-06-L01` owns common retention policy and bounded append-heavy
   pruners, including atomic assistant execution/undo persistence.
2. `TASK-551-06-L02` lands after L01 and TASK-551-05 constraints; it owns the
   shared revision lock/allocator plus page/widget adoption and bounded revision
   reads/pruning. It pins generic detail/entry/post family contracts, but actual
   `detailPageDocumentService.ts` adoption is TASK-551-09-L03 and entry/post
   adoption remains TASK-551-09 after TASK-517 serialization.
3. `TASK-551-06-L03` consumes every pruner, consumes the parent gate's terminal
   TASK-511 state or exact serialized handoff, and
   owns scheduled execution, distributed lock behavior, recovery telemetry,
   and read-only partition-readiness reporting. It exports exactly
   `createRetentionSchedulerLifecycleParticipant(deps)`; TASK-551-08-L03 solely
   registers it in HTTP/development composition before `prod.ts` starts the
   lifecycle.

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
delete or truncates a shared table.

## Shared Acceptance

- Every append-heavy family enumerated by L01/L02 has explicit bounded retention
  or an evidence-backed legal/product exemption, including access/audit/email,
  search/integration/assistant, auth tokens/sessions, analytics, forms,
  webhooks, kit runs, cache outbox/backups, and all revision tables.
- Request-path writes trigger zero global prune statements; scheduled batches
  are idempotent and preserve FK ordering/cascades.
- Page/widget service writers allocate a unique monotonic per-parent version
  under 50 concurrent attempts here. The shared helper proves the generic
  `detail_page`, `entry`, and `post` family key/version contract directly;
  TASK-551-09-L03 must adopt it in the whole detail document writer and
  TASK-551-09 must adopt it in entry/post before closure. Every revision family
  then retains a bounded, policy-defined history.
- At most one replica runs the maintenance plan at a time; lock loss/failure
  causes safe abort and later retry, never overlapping destructive work.
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
- TASK-551-08-L03 is the sole HTTP/development composition writer. It registers
  the imported retention participant and existing backup start/stop functions;
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
