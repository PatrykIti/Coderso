# TASK-557-05-L02: Worker Orchestration and Aggregation
# FileName: TASK-557-05-L02-Worker-Orchestration-And-Aggregation.md
**Parent Subtask:** TASK-557-05
**Priority:** High
**Category:** Testing / Tooling
**Estimated Effort:** Large
**Dependencies:** TASK-557-05-L01 (partition), TASK-557-02 (env), TASK-557-03 (provision), TASK-557-04 (fence), TASK-557-06-L01 (pure A lane `runPureLane`), TASK-557-06-L02 (PERF_SERIAL/PERF_BUDGETS/PERF_QUIET_ENV)
**Status:** ⏳ To Do
---
## Overview
`scripts/run-bun-parallel.ts` wires everything together:
1. Load manifest + timings; partition.
2. Provision worker schemas (`bun-lane-provision`).
3. Spawn workers: each `bun test --parallel=1 --timeout=15000 <files>` with
   `resolveWorkerEnv(i)` (DATABASE_URL = worker schema URL, DB_POOL_MAX,
   BUN_TEST_FENCE_NAMESPACE_OFFSET = i+1, NODE_ENV=test). A dedicated C worker;
   B workers = `K - 1` under `--lane b|c|perf`, or `K - 2` under `--lane all`
   (the extra slot is the pure A lane, which is not a DB worker). The perf lane
   runs AFTER the B and C workers finish (wall-time gates are CPU-contention
   sensitive; never in parallel with B/C). Default K=5 -> 3 B workers, 1 C
   worker, perf worker serial-after, pure A worker.
4. Stream each worker's stdout/stderr with a prefixed tag `[b0] ...`; capture
   exit codes; on non-zero, retry the worker's whole file set ONCE
   (flake guard), then keep the best result and record both in the report.
5. Aggregate: overall exit 0 iff every worker passed after retry; write
   `tests/bun-lane-report.json` with per-worker status/duration/failures.
6. Flags: `--workers N`, `--dry-run`, `--lane <b|c|perf|all>`, `--no-provision`,
   `--pool N`, `--no-retry`, `--report <path>`. `--pool` defaults to
   `DEFAULT_WORKER_POOL_MAX` (2) and is clamped by `resolveWorkerPoolMax`;
   the runner enforces `workers * pool <= 10` with a named error
   (`worker_pool_budget_exceeded`) before provisioning or spawning, so a
   too-large `--pool` fails fast instead of exhausting the direct-connection
   reserve.

The pure A lane is invoked by the same runner when `--lane all` (TASK-557-06).
`package.json` `test:bun` becomes `bun scripts/run-bun-parallel.ts --lane all`.

## Implementation Pseudocode
```ts
// scripts/run-bun-parallel.ts
import { readFile, writeFile } from "node:fs/promises";
import { partition, partitionSummary, type Partition } from "./bun-lane-partition";
import { resolveWorkerEnv, resolveWorkerPoolMax, assertConnectionBudget, resolveWorkerCount } from "./bun-lane-worker-url";
import { provisionWorkers } from "./bun-lane-provision";
import { runPureLane } from "./run-bun-pure-lane"; // TASK-557-06-L01
import { PERF_SERIAL, PERF_BUDGETS, PERF_QUIET_ENV } from "./bun-lane-perf-policy";

// import { spawn } from "node:child_process"; // NOT used: Bun.spawn is the repo convention (scripts/run-bun-lane.ts:87,114)

type WorkerResult = { name: string; files: string[]; exit: number; durationMs: number; attempted: number };

type Flags = {
  workers: number; pool: number; lane: "b" | "c" | "perf" | "all";
  dryRun: boolean; noProvision: boolean; noRetry: boolean; report: string;
};

function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    workers: resolveWorkerCount(), // BUN_TEST_WORKERS env, default 8 (TASK-557-02-L01)
    pool: 1, lane: "all",
    dryRun: false, noProvision: false, noRetry: false, report: "tests/bun-lane-report.json",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--workers") { flags.workers = Number(argv[++i]); if (!Number.isInteger(flags.workers) || flags.workers < 1) throw new Error(`worker_count_invalid:${argv[i]}`); }
    else if (arg === "--pool") { flags.pool = Number(argv[++i]); if (!Number.isInteger(flags.pool) || flags.pool < 1) throw new Error(`worker_pool_max_invalid:${argv[i]}`); }
    else if (arg === "--lane") { const v = argv[++i]; if (v !== "b" && v !== "c" && v !== "perf" && v !== "all") throw new Error(`lane_invalid:${v}`); flags.lane = v; }
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--no-provision") flags.noProvision = true;
    else if (arg === "--no-retry") flags.noRetry = true;
    else if (arg === "--report") flags.report = argv[++i];
    else throw new Error(`flag_unknown:${arg}`);
  }
  return flags;
}

async function safeRead(path: string): Promise<Record<string, number>> {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch { return {}; } // missing timings file -> empty map, partition falls back to weights
}

async function runWorker(name: string, files: string[], env: Record<string, string>, noRetry: boolean): Promise<WorkerResult> {
  const started = performance.now();
  const result: WorkerResult = { name, files, exit: 1, durationMs: 0, attempted: 0 };
  const runOnceWrapper = () => new Promise<number>((resolve, reject) => {
    const proc = Bun.spawn(["bun", "test", "--parallel=1", "--timeout=15000", ...files], {
      env, stdout: "pipe", stderr: "pipe" as const,
    });
    const decoder = new TextDecoder();
    (async () => {
      try {
        for await (const chunk of proc.stdout) process.stdout.write(`[${name}] ${decoder.decode(chunk)}`);
        for await (const chunk of proc.stderr) process.stderr.write(`[${name}] ${decoder.decode(chunk)}`);
        const exit = await proc.exited;
        resolve(typeof exit === "number" ? exit : 1);
      } catch (error) { reject(error); }
    })();
  });
  result.attempted = 1;
  let exit = await runOnceWrapper();
  if (exit !== 0 && !noRetry) {
    result.attempted = 2;
    exit = await runOnceWrapper();
  }
  result.exit = exit;
  result.durationMs = performance.now() - started;
  return result;
}

async function main() {
  const flags = parseFlags(Bun.argv.slice(2));
  const manifest = JSON.parse(await readFile("tests/bun-lane-manifest.json", "utf8"));
  const timings = await safeRead("tests/bun-lane-timings.json");
  // Lane-aware B worker allocation: `--lane all` reserves one slot for the pure
  // A lane; single-lane runs hand every DB worker to that lane.
  const reservedForPureA = flags.lane === "all" ? 1 : 0;
  const bWorkerCount = Math.max(1, flags.workers - 1 - reservedForPureA);
  const pool = resolveWorkerPoolMax(process.env, flags.pool);
  const part = partition(manifest.rows, timings, bWorkerCount);
  if (flags.dryRun) { console.log(partitionSummary(part, timings)); return; }

  assertConnectionBudget(flags.workers, pool); // workers * pool <= 10, named error

  if (!flags.noProvision) {
    await provisionWorkers(process.env.DATABASE_DIRECT_URL!, flags.workers);
  }

  const results: WorkerResult[] = [];
  const bEnvs = part.b.map((_, i) => resolveWorkerEnv(i, { poolMax: pool, fenceOffset: i + 1 }));
  const cIndex = part.b.length;
  const perfIndex = cIndex + 1;
  // B + C + pure A run in parallel (A has no DB dependency and needs no CPU
  // isolation); perf runs AFTER all of them (serial, CPU-isolated).
  // Lane-aware: --lane b runs only B workers; --lane c only C; --lane all both.
  const workers: Promise<WorkerResult>[] = [];
  if (flags.lane === "all" || flags.lane === "b") {
    workers.push(...part.b.map((files, i) => runWorker(`b${i}`, files, bEnvs[i], flags.noRetry)));
  }
  if (flags.lane === "all" || flags.lane === "c") {
    workers.push(runWorker("c", part.c, resolveWorkerEnv(cIndex, { poolMax: pool, fenceOffset: cIndex + 1 }), flags.noRetry));
  }
  if (flags.lane === "all") {
    workers.push(runPureLane().then((pure) => ({
      name: "a", files: pure.files, exit: pure.exit,
      durationMs: pure.durationMs, attempted: pure.attempted,
    })));
  }
  results.push(...(await Promise.all(workers)));

  if (flags.lane === "all" || flags.lane === "perf") {
    const perf = await runWorker("perf", part.perf, {
      ...resolveWorkerEnv(perfIndex, { poolMax: pool, fenceOffset: perfIndex + 1 }),
      ...PERF_QUIET_ENV,
    }, flags.noRetry);
    results.push(perf);
  }

  const totalMs = Math.max(...results.map((r) => r.durationMs));
  await writeFile(flags.report, JSON.stringify({ results, totalMs }, null, 2));
  const failed = results.filter((r) => r.exit !== 0);
  for (const f of failed) console.error(`[run-bun-parallel] FAILED worker ${f.name} (${f.exit})`);
  process.exit(failed.length === 0 ? 0 : 1);
}

if (import.meta.main) { await main(); }
```

Policy wiring: the perf worker env is an ADDITIVE overlay on
`resolveWorkerEnv(perfIndex, ...)`: `UV_THREADPOOL_SIZE=4` and quiet flags are
added, but `DATABASE_URL`/`DATABASE_DIRECT_URL`/`NODE_ENV` come from the base
resolver — the perf lane needs real DB access (`analyticsIngestion` is a
DB-backed gate), so it must never replace the base env. The policy constants
(`PERF_SERIAL`, `PERF_BUDGETS`, quiet-env keys) are OWNED by
`scripts/bun-lane-perf-policy.ts` (TASK-557-06-L02); this runner only imports
and applies them.

Error handling: provision failure aborts before spawning (no half-provisioned
run); a worker that cannot spawn (e.g. `bun` missing) fails the run with
`worker_spawn_failed:<name>`; retry policy is bounded to exactly one retry;
aggregation is deterministic (all workers awaited before report write). The
runner never mutates `public`, never re-provisions mid-run, and prints a
credential-free summary (`partitionSummary` + report path).

Connection budget: `assertConnectionBudget(workers, pool)` throws
`worker_pool_budget_exceeded` when `workers * pool > 10` (Render direct
reserve). This is the aggregate guard behind the per-worker clamp in
`resolveWorkerPoolMax`; both live in `scripts/bun-lane-worker-url.ts` and are
unit-tested (TASK-557-02-L02).

Regression-test shape (integration, `tests/integration/toolchain/runBunParallel.test.ts`):
the full integration suite for the orchestrator is owned by TASK-557-05-L03
(runner tests and dry-run). L02 keeps only the fake-worker retry and ordering
assertions it needs to prove aggregation, and L03 owns the file as the single
writer. Shared assertions (both leaves must hold):
- `--dry-run` produces the partition summary and exits 0 without spawning.
- Fake-worker mode: a stub `bun` script (a test helper file) that fails for one
  named file exercises retry-once and exit-code aggregation.
- Provision failure aborts before any worker spawn (assert no worker ran).
- Report JSON has one entry per worker with truthful `attempted` counts, and
  `totalMs` equals the max of worker durations (never a placeholder).
- Ordering proof: with a stub `bun` that records invocation order into a shared
  file, the perf worker is invoked strictly after every B/C worker exits
  (serial-after), never concurrently.
- `--pool 4` with `--workers 8` fails fast with `worker_pool_budget_exceeded`
  before provisioning (no schema created, no spawn).

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Runner integration tests green (dry-run pure; fake-worker pure; provision
  path DB-gated with `DATABASE_DIRECT_URL`).
- One real full-lane run recorded in the handoff: total wall time, per-worker
  durations, pass/fail counts.

## Documentation Updates Required
- `tests/README.md` — runner flags and report contract.
