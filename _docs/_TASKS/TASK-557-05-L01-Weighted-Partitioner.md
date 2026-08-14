# TASK-557-05-L01: Weighted Partitioner
# FileName: TASK-557-05-L01-Weighted-Partitioner.md
**Parent Subtask:** TASK-557-05
**Priority:** High
**Category:** Testing / Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-557-01 (manifest + timings)
**Status:** ✅ Done
**Completed:** 2026-08-14
---
## Overview
Pure partition logic in `scripts/bun-lane-partition.ts`:
- Input: manifest rows (`{file, bucket, weightMs}`), timings map, worker count.
- Output: `{ b: string[][], c: string[], perf: string[] }` where `b[i]` is the
  B file list for worker i, `c` is the serial C list (one dedicated worker),
  and `perf` is the perf list (dedicated worker).
- Assignment: longest-processing-time first — sort B files by weight
  descending, place each on the currently lightest worker (by sum of assigned
  weights). C files are NOT weighted-split: they share state and must run
  serially in manifest order on one worker by default (flag `--split-c`
  enables one-C-per-worker for future scaling).
- Perf files are excluded from B/C assignment; they run on their own worker
  serially (wall-time gates are CPU-contention sensitive).
- A files are not part of this partitioner (pure lane, TASK-557-06).

## Implementation Pseudocode
```ts
// scripts/bun-lane-partition.ts
export type Bucket = "A" | "B" | "C" | "perf";
export type ManifestRow = { file: string; bucket: Bucket; weightMs?: number; conflictKey?: string };
export type Partition = { b: string[][]; c: string[]; perf: string[] };

const DEFAULT_WEIGHT: Record<Bucket, number> = { A: 1000, B: 10000, C: 20000, perf: 20000 };

export function weightMs(row: ManifestRow, timings: Record<string, number>): number {
  return timings[row.file] ?? row.weightMs ?? DEFAULT_WEIGHT[row.bucket];
}

export function partition(
  rows: ManifestRow[],
  timings: Record<string, number>,
  bWorkers: number
): Partition {
  const b = Array.from({ length: bWorkers }, () => [] as string[]);
  const sums = Array.from({ length: bWorkers }, () => 0);

  const bRows = rows.filter((r) => r.bucket === "B").sort(
    (x, y) => weightMs(y, timings) - weightMs(x, timings)
  );
  for (const row of bRows) {
    let lightest = 0;
    for (let i = 1; i < bWorkers; i++) if (sums[i] < sums[lightest]) lightest = i;
    b[lightest].push(row.file);
    sums[lightest] += weightMs(row, timings);
  }

  const c = rows.filter((r) => r.bucket === "C")
    .sort((x, y) => x.file.localeCompare(y.file))
    .map((r) => r.file);
  const perf = rows.filter((r) => r.bucket === "perf")
    .sort((x, y) => x.file.localeCompare(y.file))
    .map((r) => r.file);

  return { b, c, perf };
}

export function partitionSummary(p: Partition, timings: Record<string, number>): string {
  const lines = p.b.map((files, i) =>
    `worker-b${i}: ${files.length} files, ${files.reduce((s, f) => s + (timings[f] ?? 0), 0).toFixed(0)}ms`
  );
  return lines.join("\n") +
    `\nworker-c: ${p.c.length} files (serial)` +
    `\nworker-perf: ${p.perf.length} files (serial)`;
}
```

Error handling: reject `bWorkers < 1` (`worker_count_invalid`); a manifest row
with an unknown bucket throws `manifest_bucket_invalid:<file>`; a file listed
in timings but absent from the manifest is ignored (never invented).

Regression-test shape (`tests/unit/toolchain/bunLanePartition.test.ts`):
- With timings `{a: 100, b: 90, c: 80, d: 70}`, `bWorkers=2` yields two buckets
  with sums as close as possible and every file exactly once.
- C files land in `c` in deterministic order regardless of weight.
- Perf files never appear in `b`.
- `--dry-run` output is stable (snapshot on fixed timings).
- No file loss/duplication across the union of `b`, `c`, `perf` equals the
  B+C+perf manifest set.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/unit/toolchain/bunLanePartition.test.ts` green (pure).
- Record the real partition summary (file counts + projected sums per worker)
  for K=8 in the handoff.

## Documentation Updates Required
- `tests/README.md` — partitioner contract (C serial by default, `--split-c`).
