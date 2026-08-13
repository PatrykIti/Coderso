# TASK-557-05-L02: Worker Orchestration and Aggregation
# FileName: TASK-557-05-L02-Worker-Orchestration-And-Aggregation.md
**Parent Subtask:** TASK-557-05
**Priority:** High
**Category:** Testing / Tooling
**Estimated Effort:** Large
**Dependencies:** TASK-557-05-L01 (partition), TASK-557-02 (env), TASK-557-03 (provision), TASK-557-04 (fence)
**Status:** ⏳ To Do
---
## Overview
`scripts/run-bun-parallel.ts` wires everything together:
1. Load manifest + timings; partition.
2. Provision worker schemas (`bun-lane-provision`).
3. Spawn workers: each `bun test --parallel=1 --timeout=15000 <files>` with
   `resolveWorkerEnv(i)` (DATABASE_URL = worker schema URL, DB_POOL_MAX,
   BUN_TEST_FENCE_NAMESPACE_OFFSET = i+1, NODE_ENV=test). A dedicated C worker
   and a dedicated perf worker; B workers `K-2` (default K=8 -> 6 B workers).
4. Stream each worker's stdout/stderr with a prefixed tag `[b0] ...`; capture
   exit codes; on non-zero, retry the worker's whole file set ONCE
   (flake guard), then keep the best result and record both in the report.
5. Aggregate: overall exit 0 iff every worker passed after retry; write
   `tests/bun-lane-report.json` with per-worker status/duration/failures.
6. Flags: `--workers N`, `--dry-run`, `--lane <b|c|perf|all>`, `--no-provision`,
   `--pool N`, `--no-retry`, `--report <path>`.

The pure A lane is invoked by the same runner when `--lane all` (TASK-557-06).
`package.json` `test:bun` becomes `bun scripts/run-bun-parallel.ts --lane all`.

## Implementation Pseudocode
```ts
// scripts/run-bun-parallel.ts
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { partition, type Partition } from "./bun-lane-partition";
import { resolveWorkerEnv } from "./bun-lane-worker-url";
import { provisionWorkers } from "./bun-lane-provision";

type WorkerResult = { name: string; files: string[]; exit: number; durationMs: number; attempted: number };

async function runWorker(name: string, files: string[], env: Record<string, string>): Promise<WorkerResult> {
  const started = performance.now();
  const result: WorkerResult = { name, files, exit: 1, durationMs: 0, attempted: 0 };
  let exit: number;
  const runOnce = () => new Promise<number>((resolve, reject) => {
    const child = spawn("bun", ["test", "--parallel=1", "--timeout=15000", ...files], {
      env, stdio: ["inherit", "pipe", "pipe"],
    });
    child.stdout.on("data", (d) => process.stdout.write(`[${name}] ${d}`));
    child.stderr.on("data", (d) => process.stderr.write(`[${name}] ${d}`));
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
  result.attempted = 1;
  exit = await runOnce();
  if (exit !== 0 && !flags.noRetry) {
    result.attempted = 2;
    exit = await runOnce();
  }
  result.exit = exit;
  result.durationMs = performance.now() - started;
  return result;
}

async function main() {
  const flags = parseFlags(Bun.argv.slice(2));
  const manifest = JSON.parse(await readFile("tests/bun-lane-manifest.json", "utf8"));
  const timings = safeRead("tests/bun-lane-timings.json");
  const part = partition(manifest.rows, timings, Math.max(1, flags.workers - 2));
  if (flags.dryRun) { console.log(partitionSummary(part, timings)); return; }

  if (!flags.noProvision) {
    await provisionWorkers(process.env.DATABASE_DIRECT_URL!, flags.workers);
  }

  const results: WorkerResult[] = [];
  const bEnvs = part.b.map((_, i) => resolveWorkerEnv(i, { fenceOffset: i + 1 }));
  // C worker index = part.b.length, perf worker index = part.b.length + 1
  const cIndex = part.b.length;
  const perfIndex = cIndex + 1;
  await Promise.all([
    ...part.b.map((files, i) => runWorker(`b${i}`, files, bEnvs[i])),
    runWorker("c", part.c, resolveWorkerEnv(cIndex, { fenceOffset: cIndex + 1 })),
    runWorker("perf", part.perf, resolveWorkerEnv(perfIndex, { fenceOffset: perfIndex + 1 })),
  ].map((p) => p.then((r) => results.push(r))));

  await writeFile(flags.report, JSON.stringify({ results, totalMs: /* max duration */ }, null, 2));
  const failed = results.filter((r) => r.exit !== 0);
  for (const f of failed) console.error(`[run-bun-parallel] FAILED worker ${f.name} (${f.exit})`);
  process.exit(failed.length === 0 ? 0 : 1);
}
```

Error handling: provision failure aborts before spawning (no half-provisioned
run); a worker that cannot spawn (e.g. `bun` missing) fails the run with
`worker_spawn_failed:<name>`; retry policy is bounded to exactly one retry;
aggregation is deterministic (all workers awaited before report write). The
runner never mutates `public`, never re-provisions mid-run, and prints a
credential-free summary (`partitionSummary` + report path).

Regression-test shape (integration, `tests/integration/toolchain/runBunParallel.test.ts`):
- `--dry-run` produces the partition summary and exits 0 without spawning.
- Fake-worker mode: a stub `bun` script (a test helper file) that fails for one
  named file exercises retry-once and exit-code aggregation.
- Provision failure aborts before any worker spawn (assert no worker ran).
- Report JSON has one entry per worker with truthful `attempted` counts.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Runner integration tests green (dry-run pure; fake-worker pure; provision
  path DB-gated with `DATABASE_DIRECT_URL`).
- One real full-lane run recorded in the handoff: total wall time, per-worker
  durations, pass/fail counts.

## Documentation Updates Required
- `tests/README.md` — runner flags and report contract.
