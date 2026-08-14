# TASK-559: Bun Lane C-Split to Reach the 10-15 Minute Target (Follow-up to TASK-557)

# FileName: TASK-559_Bun_Lane_C_Split_To_Reach_10_15_Minute_Target.md

**Parent Task:** (none; standalone follow-up)
**Priority:** Medium
**Category:** Toolchain / Testing / Performance
**Estimated Effort:** Medium
**Dependencies:** TASK-557 (terminal)
**Status:** ⏳ To Do
**Changelog:** 1274 (pinned; closure only)

---

## Overview

TASK-557 delivered the parallel lane orchestrator: full `test:bun` now passes
(exit 0, 2414 tests / 380 files, 0 fail) in **22m15s** on the remote direct-5432
Render DB — a 2.3× speedup from the ~50 min serial baseline. The original
10–15 minute target was not met because the **serial C lane** (39 shared-state
files, ~1334s) is the wall bound. This task splits or shards the C lane to
reach the target while preserving C's shared-mutable-state serialization
contract.

## Scope

- **C-lane analysis**: identify which of the 39 C files actually contend on
  shared mutable state (global settings keys via `setSetting`/`setSettings`,
  singleton `backup_schedules`, the fixed `4dd7f4d4` detailPageId literal,
  fence/advisory-lock collisions) versus files that are only C because of
  conservative classification.
- **Split options** (pick the least invasive correct one):
  a) **Two serial C workers** with a disjoint partition (no cross-worker shared
     state): keep the strictest files on C1, move provably self-scoped files to
     C2; both still run serially internally, in parallel with each other.
  b) **Per-worker C sub-schemas**: run C files on separate worker schemas when
     the shared state is schema-scoped (like B), keeping only genuinely global
     files serial on one C worker.
  c) **Shard the heaviest C files** by moving them to B after proving their
     fixtures are self-scoped (randomUUID + delete-only cleanup).
- The pure A lane, perf serial-after, fence isolation, pool budget
  (`workers × pool ≤ 10`), and fail-loud DB guard must stay intact.
- Update `scripts/bun-lane-partition.ts` / `scripts/run-bun-parallel.ts` /
  `scripts/bun-lane-classify.ts` only as needed; keep manifest regeneration
  and the completeness gate green.

## Out of scope

- Reopening TASK-557 product contracts (FK applier, classifier semantics,
  pool defaults) unless the split genuinely requires it.
- Local Docker or any non-remote database (the lane contract is remote
  direct-5432 only).

## Evidence / acceptance

- Full-lane acceptance on the remote Render DB: exit 0 AND total wall time
  **≤ 15 minutes** (target 10–15). Per-worker table recorded in the handoff.
- All workers green; retries only for confirmed flakes; no real failures.
- Targeted suites green (partitioner, manifest, provision, pure, runner
  integration); lint/typecheck; files ≤1000 lines; `git diff --check`.

## Source of truth

- `_docs/_TASKS/TASK-557-05-Weighted-Parallel-Runner.md` (C serial contract),
  `scripts/run-bun-parallel.ts` (orchestrator), `scripts/bun-lane-classify.ts`
  (C classification), `tests/README.md` (lane docs, "Bun lane parallel runner"
  section).
