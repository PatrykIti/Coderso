# TASK-557-01: Suite Classification Manifest and Timing Weights
# FileName: TASK-557-01-Suite-Classification-And-Timing-Weights.md
**Parent Task:** TASK-557
**Priority:** High
**Category:** Testing / Tooling
**Estimated Effort:** Medium
**Dependencies:** None (foundation; must land before TASK-557-05 runner)
**Status:** ⏳ To Do
---
## Overview
The parallel runner needs a deterministic, machine-readable classification of
every lane file into conflict classes (A = DB-free, B = DB-backed self-scoped,
C = shared mutable state) plus measured per-file timings to drive weighted
partitioning. Today the audit produced these numbers ad hoc (222/113/30); this
subtask turns them into a checked-in manifest and a reproducible probe so the
partitioner never guesses.

Deliverables:
- `scripts/bun-lane-classify.ts` — static classifier over the exact lane file
  list (mirrors package.json:30), emits `tests/bun-lane-manifest.json`.
- `scripts/bun-lane-time.ts` — optional timing probe that runs each file once
  serially (or a sampled subset) and writes `tests/bun-lane-timings.json`.
- `tests/bun-lane-manifest.json` (committed baseline) with `{file, bucket,
  dir, weightMs, conflictKey?}` rows.
- Owned tests asserting manifest completeness (every lane file present, no
  out-of-lane file) and bucket stability on re-run.

## Sub-Tasks
- TASK-557-01-L01: Static classifier and committed manifest
- TASK-557-01-L02: Timing probe and weight derivation

## Testing Requirements
- `bun --cwd core lint` and `bun --cwd core lint:types` green.
- `bun test scripts/../tests/unit/toolchain/bunLaneManifest.test.ts` (new
  owned test; or colocate under `tests/unit/toolchain/`) asserting:
  manifest file set == lane file set; every row has a valid bucket; C bucket
  rows list their `conflictKey` (settings key / singleton table / first-admin).
- Manifest re-generation must be byte-stable on a clean tree (guard test).

## Documentation Updates Required
- `tests/README.md` — describe the manifest as the partitioner's source of
  truth.
- `_docs/TESTING_STRATEGY.md` — document the A/B/C conflict model.
