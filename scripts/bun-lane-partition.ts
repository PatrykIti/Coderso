/**
 * Pure weighted partitioner for the parallel Bun lane (TASK-557-05-L01).
 *
 * Splits the `tests/bun-lane-manifest.json` rows into per-worker B lists, one
 * serial C list, and one serial perf list, using measured wall time where
 * available:
 *
 * - B files are assigned longest-processing-time-first: sorted by weight
 *   descending, each placed on the currently lightest worker (by sum of
 *   assigned weights).
 * - C files share mutable state and must run serially in filename order on
 *   one dedicated worker by default (the future `--split-c` flag enables
 *   one-C-per-worker for scaling; the CLI surface is owned by TASK-557-05-L02).
 * - Perf files run on their own dedicated worker serially (wall-time gates
 *   are CPU-contention sensitive).
 * - A files are not part of this partitioner (pure lane, TASK-557-06).
 *
 * Weights: `timings[file] ?? row.weightMs ?? DEFAULT_WEIGHT[bucket]`. A file
 * listed in timings but absent from the manifest is ignored (never invented).
 * Errors: `bWorkers < 1` throws `worker_count_invalid`; a manifest row with an
 * unknown bucket throws `manifest_bucket_invalid:<file>`.
 *
 * This module is pure (no CLI, no I/O) so TASK-557-05-L02 can wire it to the
 * `--dry-run` / `--split-c` runner.
 */
export type Bucket = "A" | "B" | "C" | "perf";
export type ManifestRow = { file: string; bucket: Bucket; weightMs?: number; conflictKey?: string };
export type Partition = { b: string[][]; c: string[]; perf: string[] };

export const DEFAULT_WEIGHT: Record<Bucket, number> = { A: 1000, B: 10000, C: 20000, perf: 20000 };

export function weightMs(row: ManifestRow, timings: Record<string, number>): number {
  return timings[row.file] ?? row.weightMs ?? DEFAULT_WEIGHT[row.bucket];
}

export function partition(
  rows: ManifestRow[],
  timings: Record<string, number>,
  bWorkers: number
): Partition {
  if (bWorkers < 1) throw new Error("worker_count_invalid");
  for (const row of rows) {
    if (!Object.hasOwn(DEFAULT_WEIGHT, row.bucket)) {
      throw new Error(`manifest_bucket_invalid:${row.file}`);
    }
  }

  const b = Array.from({ length: bWorkers }, () => [] as string[]);
  const sums = Array.from({ length: bWorkers }, () => 0);

  const bRows = rows
    .filter((r) => r.bucket === "B")
    .sort((x, y) => weightMs(y, timings) - weightMs(x, timings));
  for (const row of bRows) {
    let lightest = 0;
    for (let i = 1; i < bWorkers; i++) if (sums[i] < sums[lightest]) lightest = i;
    b[lightest].push(row.file);
    sums[lightest] += weightMs(row, timings);
  }

  const c = rows
    .filter((r) => r.bucket === "C")
    .sort((x, y) => x.file.localeCompare(y.file))
    .map((r) => r.file);
  const perf = rows
    .filter((r) => r.bucket === "perf")
    .sort((x, y) => x.file.localeCompare(y.file))
    .map((r) => r.file);

  return { b, c, perf };
}

export function partitionSummary(p: Partition, timings: Record<string, number>): string {
  const lines = p.b.map(
    (files, i) =>
      `worker-b${i}: ${files.length} files, ${files.reduce((s, f) => s + (timings[f] ?? 0), 0).toFixed(0)}ms`
  );
  return (
    lines.join("\n") +
    `\nworker-c: ${p.c.length} files (serial)` +
    `\nworker-perf: ${p.perf.length} files (serial)`
  );
}
