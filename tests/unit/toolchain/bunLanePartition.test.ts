/**
 * Regression tests for the weighted Bun-lane partitioner (TASK-557-05-L01,
 * v2 C1/C2 split per TASK-559).
 *
 * `scripts/bun-lane-partition.ts` is pure: it splits manifest v2 rows into
 * per-worker B lists, two serial C lists (`c1` write-global, `c2` read-only),
 * and one serial perf list using measured wall time where available. These
 * tests pin:
 *
 * - weight precedence: `timings[file] ?? row.weightMs ?? DEFAULT_WEIGHT[bucket]`,
 * - longest-processing-time-first B assignment on `bWorkers` workers (balanced
 *   sums, every B file exactly once),
 * - the 2-C split: `cWriteGlobal === true` C files land in `c1`, the rest in
 *   `c2`, both in deterministic filename order regardless of weight,
 * - `cWorkers: 1` collapses both C lists into `c1` (pre-TASK-559 single
 *   serial C worker shape),
 * - perf files never appear in `b` and are never merged with C,
 * - no file loss/duplication: the union of `b` + `c1` + `c2` + `perf` equals
 *   the B+C+perf manifest set, and A rows are excluded entirely,
 * - error contract: `worker_count_invalid` for `bWorkers < 1`,
 *   `manifest_bucket_invalid:<file>` for an unknown bucket,
 *   `manifest_row_v2_invalid:<file>` for a C row missing the v2
 *   `conflictKeys` array (old single-`conflictKey` rows rejected),
 * - timings entries absent from the manifest are ignored (never invented),
 * - `partitionSummary` output is deterministic (stable snapshot on fixed
 *   timings), emits `worker-c1`/`worker-c2` lines (c2 omitted when empty),
 *   and never crashes on empty workers.
 */
import { expect, test } from "bun:test";

import {
  DEFAULT_WEIGHT,
  type Bucket,
  type ManifestRowV2,
  type PartitionV2,
  partition,
  partitionSummary,
  weightMs,
} from "../../../scripts/bun-lane-partition";

const row = (
  file: string,
  bucket: Bucket,
  opts: { weightMs?: number; conflictKeys?: string[]; cWriteGlobal?: boolean } = {}
): ManifestRowV2 => ({
  file,
  bucket,
  conflictKeys: opts.conflictKeys ?? [],
  ...(opts.weightMs === undefined ? {} : { weightMs: opts.weightMs }),
  ...(opts.cWriteGlobal === undefined ? {} : { cWriteGlobal: opts.cWriteGlobal }),
});

test("weightMs precedence: timings > row.weightMs > DEFAULT_WEIGHT", () => {
  const timings = { "a.test.ts": 123 };
  expect(weightMs(row("a.test.ts", "B"), timings)).toBe(123);
  expect(weightMs(row("b.test.ts", "B", { weightMs: 5_000 }), timings)).toBe(5_000);
  expect(weightMs(row("c.test.ts", "B"), timings)).toBe(DEFAULT_WEIGHT.B);
  // `??` semantics: explicit 0 is a real weight, not a fallback trigger.
  expect(weightMs(row("a.test.ts", "B", { weightMs: 7_000 }), { "a.test.ts": 0 })).toBe(0);
  expect(weightMs(row("b.test.ts", "B", { weightMs: 0 }), timings)).toBe(0);
  expect(weightMs(row("p.test.ts", "perf"), {})).toBe(DEFAULT_WEIGHT.perf);
});

test("B assignment is longest-first and balances sums on bWorkers=2", () => {
  const rows = [row("a", "B"), row("b", "B"), row("c", "B"), row("d", "B")];
  const timings: Record<string, number> = { a: 100, b: 90, c: 80, d: 70 };
  const p = partition(rows, timings, 2);

  expect(p.b).toHaveLength(2);
  // Sorted desc a(100) b(90) c(80) d(70): a->w0(100), b->w1(90), c->w1(170),
  // d->w0(170) => both workers 170ms, perfectly balanced.
  const sums = p.b.map((files) => files.reduce((s, f) => s + timings[f], 0));
  expect(sums.sort((x, y) => x - y)).toEqual([170, 170]);

  const seen = p.b.flat();
  expect(seen).toHaveLength(4);
  expect(new Set(seen).size).toBe(4);
  expect(new Set(seen)).toEqual(new Set(["a", "b", "c", "d"]));
});

test("2-C split: write-global C files go to c1, read-only to c2, filename order", () => {
  const rows = [
    row("zeta.test.ts", "C", { weightMs: 50_000, cWriteGlobal: true }),
    row("alpha.test.ts", "C", { weightMs: 1 }),
    row("mid.test.ts", "C", { weightMs: 10_000, cWriteGlobal: true }),
    row("read-first.test.ts", "C", { conflictKeys: ["site.contentRoutes"] }),
    row("b-heavy.test.ts", "B"),
    row("b-light.test.ts", "B"),
  ];
  const timings = {
    "zeta.test.ts": 999_999,
    "alpha.test.ts": 0,
    "mid.test.ts": 500_000,
    "read-first.test.ts": 100,
    "b-heavy.test.ts": 900,
    "b-light.test.ts": 100,
  };
  const p = partition(rows, timings, 2);

  // Deterministic: c1 = write-global in filename order, c2 = read-only in
  // filename order, regardless of weight (extremely heavy zeta stays c1).
  expect(p.c1).toEqual(["mid.test.ts", "zeta.test.ts"]);
  expect(p.c2).toEqual(["alpha.test.ts", "read-first.test.ts"]);
  // C files never leak into B workers even at extreme weight.
  expect(p.b.flat()).not.toContain("zeta.test.ts");
  expect(p.b.flat()).not.toContain("alpha.test.ts");
  expect(p.b.flat()).not.toContain("mid.test.ts");
  // B files still assigned once each.
  expect(p.b.flat().sort()).toEqual(["b-heavy.test.ts", "b-light.test.ts"]);
  // Deterministic: identical input yields an identical partition.
  expect(partition(rows, timings, 2)).toEqual(p);
});

test("cWorkers=1 collapses c1 and c2 into a single serial c1 list", () => {
  const rows = [
    row("w-global.test.ts", "C", { cWriteGlobal: true }),
    row("a-read.test.ts", "C"),
    row("b-read.test.ts", "C", { conflictKeys: ["site.homepageId"] }),
    row("perf.test.ts", "perf"),
  ];
  const p2 = partition(rows, {}, 2, 2);
  expect(p2.c1).toEqual(["w-global.test.ts"]);
  expect(p2.c2).toEqual(["a-read.test.ts", "b-read.test.ts"]);

  const p1 = partition(rows, {}, 2, 1);
  // Fallback: single serial C worker (pre-TASK-559 shape). The contract's
  // collapse is `c1.push(...c2)` in place: write-global files first (filename
  // order), then read-only files appended (filename order), c2 emptied.
  expect(p1.c1).toEqual(["w-global.test.ts", "a-read.test.ts", "b-read.test.ts"]);
  expect(p1.c2).toEqual([]);
  // B and perf are untouched by the collapse.
  expect(p1.perf).toEqual(p2.perf);
  expect(p1.b).toEqual(p2.b);
});

test("perf files never appear in b and never merge with C", () => {
  const rows = [
    row("perf1.test.ts", "perf"),
    row("perf2.test.ts", "perf"),
    row("c.test.ts", "C", { cWriteGlobal: true }),
    row("b.test.ts", "B"),
  ];
  const timings = {
    "perf1.test.ts": 999_999,
    "perf2.test.ts": 888_888,
    "b.test.ts": 50,
    "c.test.ts": 1,
  };
  const p = partition(rows, timings, 2);

  expect(p.b.flat()).toEqual(["b.test.ts"]);
  expect(p.perf).toEqual(["perf1.test.ts", "perf2.test.ts"]);
  expect(p.c1).toEqual(["c.test.ts"]);
  expect(p.c2).toEqual([]);
  // Perf stays on its own dedicated serial worker, never joined with C.
  expect(p.perf).not.toEqual(p.c1);
  expect(p.perf).not.toEqual(p.c2);
});

test("no loss or duplication across the B+C+perf manifest set; A rows excluded", () => {
  const rows = [
    row("a-pure.test.ts", "A"),
    row("b1.test.ts", "B"),
    row("b2.test.ts", "B"),
    row("b3.test.ts", "B"),
    row("b4.test.ts", "B"),
    row("c1.test.ts", "C", { cWriteGlobal: true }),
    row("c2.test.ts", "C"),
    row("perf1.test.ts", "perf"),
  ];
  const timings = {
    "b1.test.ts": 400,
    "b2.test.ts": 300,
    "b3.test.ts": 200,
    "b4.test.ts": 100,
    "c1.test.ts": 1,
    "c2.test.ts": 2,
    "perf1.test.ts": 999,
  };
  const p = partition(rows, timings, 3);

  const union = [...p.b.flat(), ...p.c1, ...p.c2, ...p.perf];
  const expected = rows.filter((r) => r.bucket !== "A").map((r) => r.file);
  expect(union.sort()).toEqual(expected.sort());
  expect(new Set(union).size).toBe(expected.length);
  // Every B file lands in exactly one worker.
  const bFlat = p.b.flat();
  expect(new Set(bFlat).size).toBe(bFlat.length);
  expect(bFlat).toHaveLength(4);
  // A rows are outside this partitioner.
  expect(union).not.toContain("a-pure.test.ts");
});

test("bWorkers < 1 throws worker_count_invalid", () => {
  const rows = [row("b.test.ts", "B")];
  expect(() => partition(rows, {}, 0)).toThrow("worker_count_invalid");
  expect(() => partition(rows, {}, -2)).toThrow("worker_count_invalid");
});

test("unknown bucket throws manifest_bucket_invalid:<file>", () => {
  // Deliberately malformed row (no v2 conflictKeys): the bucket check runs
  // first, so the named error must be the bucket one, not a v2-shape one.
  const rows: unknown[] = [row("ok.test.ts", "B"), { file: "bad.test.ts", bucket: "X" as Bucket }];
  expect(() => partition(rows as ManifestRowV2[], {}, 2)).toThrow(
    "manifest_bucket_invalid:bad.test.ts"
  );
});

test("C rows missing the v2 conflictKeys array are rejected", () => {
  const legacy: unknown[] = [
    row("ok.test.ts", "B"),
    // Old single-conflictKey shape: no conflictKeys array.
    { file: "legacy-c.test.ts", bucket: "C" as Bucket, conflictKey: "site.contentRoutes" },
  ];
  expect(() => partition(legacy as ManifestRowV2[], {}, 2)).toThrow(
    "manifest_row_v2_invalid:legacy-c.test.ts"
  );
  // A v2 C row is accepted regardless of cWriteGlobal presence (optional).
  const v2 = [
    row("ok.test.ts", "B"),
    row("c.test.ts", "C", { conflictKeys: ["site.contentRoutes"] }),
  ];
  expect(partition(v2, {}, 2).c1).toEqual([]);
  expect(partition(v2, {}, 2).c2).toEqual(["c.test.ts"]);
});

test("timings entries absent from the manifest are ignored", () => {
  const rows = [row("b.test.ts", "B"), row("c.test.ts", "C", { cWriteGlobal: true })];
  const timings = {
    "b.test.ts": 100,
    "c.test.ts": 50,
    "ghost.test.ts": 999_999,
    "ghost2.test.ts": 1,
  };
  const p = partition(rows, timings, 2);
  const pClean = partition(rows, { "b.test.ts": 100, "c.test.ts": 50 }, 2);

  expect(p).toEqual(pClean);
  expect(p.b.flat()).toEqual(["b.test.ts"]);
  expect(p.c1).toEqual(["c.test.ts"]);
  expect(p.c2).toEqual([]);
});

test("DEFAULT_WEIGHT fallback drives a balanced B partition without timings", () => {
  const rows = [
    row("a.test.ts", "B"),
    row("b.test.ts", "B"),
    row("c.test.ts", "B"),
    row("d.test.ts", "B"),
  ];
  const p = partition(rows, {}, 2);

  // All four share DEFAULT_WEIGHT.B, so greedy assignment yields 2 per worker.
  const counts = p.b.map((files) => files.length).sort((x, y) => x - y);
  expect(counts).toEqual([2, 2]);
  expect(p.b.flat().sort()).toEqual(["a.test.ts", "b.test.ts", "c.test.ts", "d.test.ts"]);
});

test("partitionSummary is deterministic, splits C lines, and handles empty workers", () => {
  const rows = [
    row("a.test.ts", "B"),
    row("b.test.ts", "B"),
    row("c-write.test.ts", "C", { cWriteGlobal: true }),
    row("c-read.test.ts", "C"),
    row("p.test.ts", "perf"),
  ];
  const timings = {
    "a.test.ts": 100,
    "b.test.ts": 90,
    "c-write.test.ts": 80,
    "c-read.test.ts": 70,
    "p.test.ts": 60,
  };
  const p1 = partition(rows, timings, 4);
  const p2 = partition(rows, timings, 4);

  const s1 = partitionSummary(p1, timings);
  const s2 = partitionSummary(p2, timings);
  expect(s1).toBe(s2);
  expect(s1).toContain("worker-c1: 1 files (serial)");
  expect(s1).toContain("worker-c2: 1 files (serial)");
  expect(s1).toContain("worker-perf: 1 files (serial)");
  // The c2 line is omitted when c2 is empty.
  const noReadOnly = partition([row("c-write.test.ts", "C", { cWriteGlobal: true })], timings, 1);
  const noReadOnlySummary = partitionSummary(noReadOnly, timings);
  expect(noReadOnlySummary).toContain("worker-c1: 1 files (serial)");
  expect(noReadOnlySummary).not.toContain("worker-c2");
  // Empty workers (bWorkers > B rows) render a 0ms line instead of crashing.
  const sparse = partition(rows, timings, 6);
  const sparseSummary = partitionSummary(sparse, timings);
  expect(sparseSummary).toContain("worker-b5: 0 files, 0ms");
  expect(sparseSummary).toBe(partitionSummary(sparse, timings));
});
