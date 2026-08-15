# TASK-559: Bun Lane C-Split to Reach the 10-15 Minute Target (Follow-up to TASK-557)

# FileName: TASK-559_Bun_Lane_C_Split_To_Reach_10_15_Minute_Target.md

**Parent Task:** (none; standalone follow-up)
**Priority:** Medium
**Category:** Toolchain / Testing / Performance
**Estimated Effort:** Medium
**Dependencies:** TASK-557 (terminal)
**Status:** ✅ Done
**Completed:** 2026-08-15
**Changelog:** 1274 (pinned; closure only)

---

## Overview

TASK-557 delivered the parallel lane orchestrator: full `test:bun` passes
(exit 0) in **22m15s** on the remote direct-5432 Render DB — a 2.3× speedup
from the ~50 min serial baseline. The original 10–15 minute target was not met
because the **serial C lane** is the wall bound. This task splits the C lane
into two serial workers with a disjoint partition to reach the target while
preserving C's shared-mutable-state serialization contract.

### Corrected baseline (2026-08-14, audited against HEAD f75343de)

- Manifest (`tests/bun-lane-manifest.json`, generatedAt 2026-08-14T15:12) has
  **397 rows: A=154, B=198, C=40, perf=5** (NOT "380 files / 39 C files").
- `tests/bun-lane-timings.json` covers only **12 of 40 C files** (sum ≈ 146s);
  28 C files have no recorded weight. The earlier "~1334s C bound" conflated
  C-lane duration with the total wall time (~22m15s). The C lane's real bound
  must be re-measured during implementation (below).
- 30 C files hit `site.contentRoutes`, 4 `site.adminBaseUrl`, 2
  `site.navigationMenuId`, 1 each `auth.resetTtlMinutes`/`auth.sessionTtlDays`/
  `site.homepageId`, 1 fixed literal `4dd7f4d4`, 1 `backup_schedules`
  (`tests/unit/backups/backupService.test.ts`). Several files carry MORE than
  one conflict signal (e.g. `detail-page-runtime-lite.test.ts`,
  `actionExecutorContentUpdates.test.ts`, `actionExecutorService.db.test.ts` —
  `site.contentRoutes` AND `4dd7f4d4`), so the single `conflictKey` manifest
  field is lossy and must become a full per-file contention set.

## Scope

- **C-lane analysis** (produced during implementation, committed as evidence):
  for each of the 40 C files classify the contention KIND:
  - `write-global`: `setSetting`/`setSettings` used in `beforeAll`/`beforeEach`
    on a C_SETTING_KEYS key, `backup_schedules` DML, or the fixed `4dd7f4d4`
    literal in a WRITE path (insert/update fixture rows).
  - `read-only`: only `getSetting`/reads of C keys (worker-schema-local reads
    after per-worker provisioning), no write-global signal.
  - All C files run on per-worker schemas (`search_path`) with per-worker fence
    offsets, so settings writes are schema-scoped and advisory locks are
    already fenced. Consequence: the split into two workers is SAFE for every C
    file (no cross-worker table contention exists); the write-global/read-only
    rule below is a conservative load-balance heuristic (keep genuinely
    global-looking files on the strict worker), NOT a safety invariant.
- **Chosen design — option (a): two serial C workers (C1/C2) with a
  write-signal-disjoint partition.**
  - C1 (strict): every C file with a `write-global` signal (runs serially).
  - C2 (self-scoped): every C file with only `read-only` signals (runs
    serially, in parallel with C1).
  - Both C workers keep `bun test --parallel=1` internally (serial contract
    inside a worker unchanged).
  - Deterministic rule, not timings-based: `set*Setting` helper writes
    (`setSetting`/`setSettings`/`setTestSetting` and any `set\w*Setting` form)
    in before-hooks, `backup_schedules` DML, and the fixed `4dd7f4d4` literal
    mark a file as write-global (strict worker); everything else is
    read-only (self-scoped worker).
- **Manifest v2**: replace the single `conflictKey?: string` with
  `conflictKeys: string[]` (all matched signals) and add
  `cWriteGlobal: boolean` (the write-global signal above). Keep
  `weightMs?: number`. Regenerate the manifest; keep the completeness gate
  (committed manifest == fresh classification) green.
- **Partitioner** (`scripts/bun-lane-partition.ts`): `partition(rows, timings,
  bWorkers, cWorkers)` where `cWorkers` is 1 or 2; returns `{ b, c1, c2, perf }`
  (`c2 = []` when `cWorkers === 1`). Partition rule: write-global C files
  (filename-ordered) → `c1`; read-only C files (filename-ordered) → `c2`.
- **Orchestrator** (`scripts/run-bun-parallel.ts`): spawn `c1` and `c2` workers
  with consecutive worker indices/fence offsets when the partition has two C
  lists. Worker-count math: total workers stays **≤ 5** (default
  `BUN_TEST_WORKERS`), so with two C workers the B lane gets one fewer worker:
  `bWorkerCount = max(1, workers - reservedForPureA - cWorkers)`. Budget
  invariant `workers × pool ≤ 10` stays untouched (5 × 2 = 10).
  **Provisioning overflow guard (M3):** `provisionWorkers(url, flags.workers)`
  provisions exactly `bun_worker_0..{workers-1}`; every spawned worker index
  must be < `flags.workers`. The needed index count is LANE-AWARE:
  `dbWorkersNeeded = bWorkerCount + cWorkers + 1` for `--lane all` (min viable
  `--workers` = 4), `bWorkerCount` for `--lane b` (min 1), `bWorkerCount + 2`
  for `--lane c` (c1@bLen, c2@bLen+1; min 3), `1` for `--lane perf` (workers
  must be 1 anyway via `perf_lane_parallel_invalid`). Add a named guard
  `flags.workers < dbWorkersNeeded` → throw `worker_count_too_low:<n>` BEFORE
  provisioning; test it per lane mode.
- **Timing evidence**: add C-inclusive timing collection so
  `tests/bun-lane-timings.json` covers every C file (extend
  `scripts/bun-lane-time.ts` or a dedicated one-off probe run), and record a
  per-worker table (B0..Bn, c1, c2, a, perf) in the handoff + changelog.
- **Docs**: update `tests/README.md` "Bun lane parallel runner" section (C1/C2
  semantics, manifest v2 fields, budget math). Do NOT touch board rows (owner
  syncs at closure).

## Out of scope

- Reopening TASK-557 product contracts (FK applier, classifier semantics,
  pool defaults) unless the split genuinely requires it.
- Moving C files to B (option c) unless a measured run still misses the target
  after C1/C2 and a follow-up proves per-file self-scoping (`randomUUID` +
  delete-only cleanup) — then a SEPARATE follow-up task owns it.
- Local Docker or any non-remote database (the lane contract is remote
  direct-5432 only).
- Changing test content/behavior: this task only re-partitions; no test file
  edits (line count gate applies to scripts/docs only).

## Implementation Pseudocode

### 1. Classifier (`scripts/bun-lane-classify.ts`)

```ts
// C_SETTING_KEYS / C_TABLES / C_LITERALS unchanged.
type BucketRowV2 = {
  file: string;
  bucket: Bucket;
  weightMs?: number;
  conflictKeys: string[];   // ALL matched signals (was conflictKey?: string)
  cWriteGlobal: boolean;    // true when any write-global signal matched
};

function collectConflictKeys(src: string): string[] {
  // deterministic order: C_SETTING_KEYS then C_TABLES then C_LITERALS order
  return [
    ...C_SETTING_KEYS.filter((k) => src.includes(k)),
    ...C_TABLES.filter((t) => src.includes(t)),
    ...C_LITERALS.filter((l) => src.includes(l)),
  ];
}

function hasCWriteGlobal(src: string): boolean {
  // M1 fix: match the helper form too — `setTestSetting` (and any
  // `set\w*Setting` name) writes settings exactly like `setSetting`.
  const writesSettings =
    (/set\w*Setting/.test(src) && /beforeAll|beforeEach/.test(src));
  const writesBackupSchedule = /backup_schedules/.test(src); // DML presence
  const writesFixedLiteral = /4dd7f4d4/.test(src); // fixture write marker
  return writesSettings || writesBackupSchedule || writesFixedLiteral;
}

async function classify(file: string): Promise<BucketRowV2> {
  // perf path override FIRST (unchanged).
  // hasDb detection unchanged.
  const keys = collectConflictKeys(src);
  const hitsC = keys.length > 0 || (setSetting-signal && before hook);
  if (!hitsC) {
    return { file, bucket: cleansOwnRows ? "B" : "B", weightMs: 0, conflictKeys: [], cWriteGlobal: false };
  }
  return {
    file, bucket: "C", weightMs: 0,
    conflictKeys: keys,
    cWriteGlobal: hasCWriteGlobal(src),
  };
}
// main(): write manifest with v2 rows; completeness gate test updated.
```

### 2. Partitioner (`scripts/bun-lane-partition.ts`)

```ts
export type ManifestRowV2 = {
  file: string; bucket: Bucket; weightMs?: number;
  conflictKeys: string[]; cWriteGlobal?: boolean;
};
export type PartitionV2 = {
  b: string[][];
  c1: string[];   // write-global C files, filename order (serial)
  c2: string[];   // read-only C files, filename order (serial)
  perf: string[];
};

export function partition(
  rows: ManifestRowV2[], timings: Record<string, number>,
  bWorkers: number, cWorkers: 1 | 2 = 2
): PartitionV2 {
  if (bWorkers < 1) throw new Error("worker_count_invalid");
  // bucket validation unchanged; C rows must carry conflictKeys (array).
  // NOTE (M2): this split is a conservative heuristic, not a safety
  // invariant — per-worker schema isolation + unique fence offsets make any
  // partition correct. c1 holds files whose fixtures look globally-writable.
  const cRows = rows.filter((r) => r.bucket === "C")
    .sort((x, y) => x.file.localeCompare(y.file));
  const c1 = cRows.filter((r) => r.cWriteGlobal === true).map((r) => r.file);
  const c2 = cRows.filter((r) => r.cWriteGlobal !== true).map((r) => r.file);
  if (cWorkers === 1) {
    c1.push(...c2); c2.length = 0; // fallback: single serial C worker (today's shape)
  }
  // B weighted longest-first onto bWorkers bins (unchanged); perf unchanged.
  return { b, c1, c2, perf };
}

export function partitionSummary(p: PartitionV2, timings): string {
  // emits worker-b{i}, worker-c1 (n files, serial), worker-c2 (n files, serial),
  // worker-perf; c2 line omitted when empty.
}
```

### 3. Orchestrator (`scripts/run-bun-parallel.ts`)

```ts
// main():
const cWorkers: 1 | 2 = 2; // this task always splits; keep constant until evidence says otherwise
const reservedForPureA = flags.lane === "all" ? 1 : 0;
const bWorkerCount = Math.max(1, flags.workers - reservedForPureA - cWorkers);
// M3 fix: named lower-bound guard BEFORE provisioning.
if (flags.workers < bWorkerCount + cWorkers + 1) {
  throw new Error(`worker_count_too_low:${flags.workers}`);
}
const part = partition(manifest.rows, timings, bWorkerCount, cWorkers);
// worker index layout: b0..b(B-1), c1 at bLen, c2 at bLen+1, perf at bLen+2 (when c2 non-empty)
// spawn:
//   runWorker("c1", part.c1, resolveWorkerEnv(c1Index, { poolMax: pool, fenceOffset: c1Index + 1 }))
//   runWorker("c2", part.c2, resolveWorkerEnv(c2Index, { poolMax: pool, fenceOffset: c2Index + 1 }))  // only when part.c2.length > 0
// Budget assertConnectionBudget(flags.workers, pool) unchanged (workers total <= 5 => 5x2=10).
// Perf index shifts by one when c2 exists; PERF_SERIAL after ALL other workers (unchanged).
```

### 4. Regression tests

- `tests/unit/toolchain/bunLanePartition.test.ts`: (a) 2-C split separates
  write-global from read-only deterministically; (b) `cWorkers: 1` collapses to
  today's single serial list; (c) unknown bucket still throws
  `manifest_bucket_invalid`; (d) manifest v2 row shape accepted (old
  single-`conflictKey` rows rejected or normalized).
- `tests/unit/toolchain/bunLaneManifest.test.ts`: committed manifest equals
  fresh classification (v2 fields); every C row has `conflictKeys` array +
  `cWriteGlobal` boolean; no C row is `cWriteGlobal: false` while containing a
  write signal (consistency assertion).
- Runner integration (`tests/unit/toolchain/*runner*` or the existing fake-Bun
  worker seam): with a stub `bun` binary, assert spawn order/names `b0..bn,
  c1, c2, a, perf`, correct env per worker (search_path schema index + fence
  offset), and that `--lane c` runs c1+c2 (or c1 only when c2 empty).
- Keep the pure-lane invariant test green (A lane untouched).

## Evidence / acceptance

- Full-lane acceptance on the remote Render DB: exit 0 AND total wall time
  **≤ 15 minutes** (target 10–15). Per-worker table (B0..Bn, c1, c2, a, perf
  with file counts + wall ms) recorded in the handoff AND in changelog 1274.
- `tests/bun-lane-timings.json` regenerated with C-inclusive coverage; the
  handoff notes the measured C1/C2 split times and the pre-split C serial time
  (re-measured, not the stale 1334s).
- All workers green; retries only for confirmed flakes; no real failures.
- Targeted suites green (partitioner, manifest, provision, pure, runner
  integration); `bun --cwd core lint` + `bun --cwd core lint:types`; touched
  files ≤1000 lines; `git diff --check`.

## Source of truth

- `_docs/_TASKS/TASK-557-05-Weighted-Parallel-Runner.md` (C serial contract),
  `scripts/run-bun-parallel.ts` (orchestrator), `scripts/bun-lane-classify.ts`
  (C classification), `scripts/bun-lane-partition.ts` (partitioner),
  `tests/bun-lane-manifest.json` / `tests/bun-lane-timings.json`,
  `tests/README.md` (lane docs, "Bun lane parallel runner" section).


## Acceptance evidence (2026-08-15)

Full-lane run on remote direct-5432 (`tests/bun-lane-report-559-accept.json`):
**exit 0, total wall 9.98 min** (target ≤15 min). Per-worker table:

| worker | exit | files | wall |
|---|---|---|---|
| b0 | 0 | 93 | 372.6s |
| b1 | 0 | 100 | 496.5s |
| c1 (write-global) | 0 | 13 | 90.2s |
| c2 (read-only) | 0 | 32 | 598.7s |
| a (pure) | 0 | 154 | 29.9s |
| perf | 0 | 5 | 2.4s |

All workers green on the first attempt (no retries). The C lane dropped from
the previous serial bound (~1334s) to max(c1,c2)=598.7s by running the two
disjoint C workers in parallel.

Pre-existing A-lane repairs landed as part of acceptance (test-only, in files
untouched by the split): `bunLaneProvisioning` migration count 71→72
(TASK-518's 0071), `smokeEvidenceClosureDelta`/`closureCorpus` closure-date
drift (TASK-545 lib derives the date from today), `firstAdminRace` fake-tx
alignment with the stable admin role (TASK-518), and the pure-lane per-test
timeout raised 15s→60s (repo-wide inventory scans take 15-23s under full
5-worker CPU pressure; A-lane files are DB-free so the timeout only guards
hangs). The npmBundled suite passes in isolation (load flake only).
