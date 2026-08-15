/**
 * Pure weighted partitioner for the parallel Bun lane (TASK-557-05-L01).
 *
 * Splits the `tests/bun-lane-manifest.json` rows into per-worker B lists, two
 * serial C lists (C1/C2, TASK-559), and one serial perf list, using measured
 * wall time where available:
 *
 * - B files are assigned longest-processing-time-first: sorted by weight
 *   descending, each placed on the currently lightest worker (by sum of
 *   assigned weights).
 * - C files share mutable state and run serially in filename order. Since
 *   TASK-559, the single C list is split into two serial workers:
 *   - `c1` (strict): C files whose fixtures look globally-writable
 *     (`cWriteGlobal === true`: `set\w*Setting` in a before-hook,
 *     `backup_schedules` DML, or the fixed `4dd7f4d4` literal).
 *   - `c2` (self-scoped): every other C file (read-only signals only).
 *   This split is a conservative LOAD-BALANCE heuristic, not a safety
 *   invariant: per-worker schema isolation (`search_path`) + unique fence
 *   offsets already make any partition correct, so no cross-worker table
 *   contention exists. `cWorkers: 1` collapses both lists into `c1` (the
 *   pre-TASK-559 single serial C worker shape).
 * - Perf files run on their own dedicated worker serially (wall-time gates
 *   are CPU-contention sensitive).
 * - A files are not part of this partitioner (pure lane, TASK-557-06).
 *
 * Weights: `timings[file] ?? row.weightMs ?? DEFAULT_WEIGHT[bucket]`. A file
 * listed in timings but absent from the manifest is ignored (never invented).
 * Errors: `bWorkers < 1` throws `worker_count_invalid`; a manifest row with an
 * unknown bucket throws `manifest_bucket_invalid:<file>`; a C row without the
 * v2 `conflictKeys` array throws `manifest_row_v2_invalid:<file>` (old
 * single-`conflictKey` rows are rejected, not silently normalized).
 *
 * This module is pure (no CLI, no I/O) so the runner can wire it to the
 * `--dry-run` / `--split-c` surface.
 */
export type Bucket = "A" | "B" | "C" | "perf";
export type ManifestRowV2 = {
  file: string;
  bucket: Bucket;
  weightMs?: number;
  conflictKeys: string[];
  cWriteGlobal?: boolean;
};
export type PartitionV2 = {
  b: string[][];
  c1: string[]; // write-global C files, filename order (serial)
  c2: string[]; // read-only C files, filename order (serial)
  perf: string[];
};

export const DEFAULT_WEIGHT: Record<Bucket, number> = { A: 1000, B: 10000, C: 20000, perf: 20000 };

export function weightMs(row: ManifestRowV2, timings: Record<string, number>): number {
  return timings[row.file] ?? row.weightMs ?? DEFAULT_WEIGHT[row.bucket];
}

export function partition(
  rows: ManifestRowV2[],
  timings: Record<string, number>,
  bWorkers: number,
  cWorkers: 1 | 2 = 2
): PartitionV2 {
  if (bWorkers < 1) throw new Error("worker_count_invalid");
  for (const row of rows) {
    if (!Object.hasOwn(DEFAULT_WEIGHT, row.bucket)) {
      throw new Error(`manifest_bucket_invalid:${row.file}`);
    }
  }
  const cRows = rows.filter((r) => r.bucket === "C").sort((x, y) => x.file.localeCompare(y.file));
  for (const row of cRows) {
    if (!Array.isArray(row.conflictKeys)) {
      throw new Error(`manifest_row_v2_invalid:${row.file}`);
    }
  }
  const c1 = cRows.filter((r) => r.cWriteGlobal === true).map((r) => r.file);
  const c2 = cRows.filter((r) => r.cWriteGlobal !== true).map((r) => r.file);
  if (cWorkers === 1) {
    c1.push(...c2);
    c2.length = 0; // fallback: single serial C worker (pre-TASK-559 shape)
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

  const perf = rows
    .filter((r) => r.bucket === "perf")
    .sort((x, y) => x.file.localeCompare(y.file))
    .map((r) => r.file);

  return { b, c1, c2, perf };
}

export function partitionSummary(p: PartitionV2, timings: Record<string, number>): string {
  const lines = p.b.map(
    (files, i) =>
      `worker-b${i}: ${files.length} files, ${files.reduce((s, f) => s + (timings[f] ?? 0), 0).toFixed(0)}ms`
  );
  lines.push(`worker-c1: ${p.c1.length} files (serial)`);
  if (p.c2.length > 0) lines.push(`worker-c2: ${p.c2.length} files (serial)`);
  lines.push(`worker-perf: ${p.perf.length} files (serial)`);
  return lines.join("\n");
}
