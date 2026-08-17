# TASK-578: Bun Lane Degraded-Path Resilience

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1300 (pinned)
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

- **Fix the root cause in the classifier, not in `weightMs`:** the pinned
  `bunLanePartition.test.ts:58-60` contract is
  `timings[file] ?? row.weightMs ?? DEFAULT_WEIGHT[bucket]` with explicit `0`
  as a REAL weight (never a fallback trigger). The partitioner must keep that
  contract unchanged. The defect is that the classifier EMITS `weightMs: 0`
  for every row at classify time (when no timings are known), so with an empty
  timings map the partitioner reads `undefined ?? 0 ?? DEFAULT` = `0` for every
  B file and LPT dumps all files onto worker 0. Fix: the classifier must OMIT
  the `weightMs` field (not emit `0`) when it has no measured timing, so
  `row.weightMs` is `undefined` and the existing `weightMs()` falls back to
  `DEFAULT_WEIGHT[bucket]`. Explicit measured `0` (present in the timings map)
  keeps its pinned meaning.
- Add a regression with a real manifest row carrying NO `weightMs` field +
  empty timings map asserting more than one worker is used (B files spread by
  bucket defaults).
- Runner must skip a lane whose file list is empty (do not run `bun test` with
  no paths); add a fake-worker test for empty `c1`.
- Keep deterministic filename ordering and the existing LPT/C-split behavior.
- Update `scripts/bun-lane-classify.ts` emission sites (perf override, A, C, B
  branches) to drop the `weightMs: 0` field entirely; the manifest format does
  not require it (the row type is optional).

## Fix Strategy

```ts
// classifier (scripts/bun-lane-classify.ts) — OMIT weightMs when unknown:
// return { file, bucket: "B", conflictKeys: [], cWriteGlobal: false }; // NO weightMs field
// (same for the A/C/perf branches)

// partitioner (scripts/bun-lane-partition.ts) — UNCHANGED:
// weightMs(row, timings) stays `timings[row.file] ?? row.weightMs ?? DEFAULT_WEIGHT[row.bucket]`
// so pinned `0` semantics are preserved.

// runner (scripts/run-bun-parallel.ts) — skip empty lane:
if (part.c1.length > 0) await runWorker("c1", part.c1, ...);
```

## Security Contract

- No endpoint change; tooling only.

## Validation

- `bun test tests/unit/toolchain/bunLanePartition.test.ts` — pinned `weightMs`
  `0`-semantics assertions (lines 58-60) stay GREEN unchanged; add the new
  regression: a manifest row with NO `weightMs` + empty timings map spreads B
  files over >1 worker.
- `bun test tests/unit/toolchain/bunLaneClassify.test.ts` (or add) — classifier
  rows carry NO `weightMs` field (the `weightMs: 0` emission is gone from all
  branches).
- `bun test tests/integration/toolchain/runBunParallelFakeWorker.test.ts`
  (extended with empty-c1: no `bun test` invocation with an empty file list).

## Notes

- Current committed timings are healthy; this is resilience for the declared
  degraded path and future classification changes.
