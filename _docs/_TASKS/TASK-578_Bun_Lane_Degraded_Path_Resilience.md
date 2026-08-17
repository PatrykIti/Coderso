# TASK-578: Bun Lane Degraded-Path Resilience

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** Medium
**Size:** Small

# FileName: TASK-578_Bun_Lane_Degraded_Path_Resilience.md

**Parent Task:** none
**Source Findings:** M-557-01, L-557-02, L-559-01 (audits `_TMP-audit-task-557-bun-lanes.md`, `_TMP-audit-task-559-bun-lane-c-split.md`, verified at HEAD `4e3dab15`)

## Purpose

The Bun parallel lane runner has two degraded-path defects:

- M-557-01: `safeRead()` turns a missing/corrupt timings file into `{}`, the
  classifier emits `weightMs: 0`, and the partitioner treats `0` as a valid
  priority weight, so LPT assigns all files to the first worker (lane B
  degenerates to `[204, 0]`). The declared fallback to bucket defaults does not
  work.
- L-557-02 / L-559-01: the runner always spawns `c1`; a future manifest with
  zero `cWriteGlobal` files would run `bun test` with no file list (repo-wide
  discovery), and the current tests never cover an empty-c1 partition.

## Evidence

- `scripts/run-bun-parallel.ts:131-138` (`{}` fallback), `:282-300`
  (always-run c1), `:146-215` (`runWorker` without empty guard).
- `scripts/bun-lane-classify.ts:697-720` (emits `weightMs: 0`),
  `scripts/bun-lane-partition.ts:51-100` (`0` accepted as priority).
- Verified: `partition(manifest.rows, {}, 2, 2)` returns `b: [204, 0]` with the
  current 418-file manifest; with the tracked timings file it returns
  `b: [93, 111]` (so not active in a normal checkout, but the declared
  graceful-degradation path is broken).

## Scope

- Classifier must not emit `weightMs: 0` as "unknown" (or the partitioner must
  treat non-positive manifest weight as missing and use the bucket default;
  explicit measured `0` can be replaced by a minimal positive weight).
- Add a regression with a real manifest row `weightMs: 0` + empty timings map
  asserting more than one worker is used.
- Runner must skip a lane whose file list is empty (do not run `bun test` with
  no paths); add a fake-worker test for empty `c1`.
- Keep deterministic filename ordering and the existing LPT/C-split behavior.

## Fix Strategy

```ts
// partitioner
function effectiveWeight(row, timings) {
  const w = timings?.[row.file] ?? row.weightMs ?? DEFAULT_WEIGHT;
  return Number.isFinite(w) && w > 0 ? w : DEFAULT_WEIGHT;
}
// runner
if (part.c1.length > 0) await runWorker("c1", part.c1, ...);
```

## Security Contract

- No endpoint change; tooling only.

## Validation

- `bun test tests/unit/toolchain/bunLanePartition.test.ts` (extended with
  `weightMs: 0` + empty timings).
- `bun test tests/integration/toolchain/runBunParallelFakeWorker.test.ts`
  (extended with empty-c1).

## Notes

- Current committed timings are healthy; this is resilience for the declared
  degraded path and future classification changes.
