# TASK-557-01-L02: Timing Probe and Weight Derivation
# FileName: TASK-557-01-L02-Timing-Probe-And-Weight-Derivation.md
**Parent Subtask:** TASK-557-01
**Priority:** Medium
**Category:** Testing / Tooling
**Estimated Effort:** Medium
**Dependencies:** TASK-557-01-L01 (manifest exists)
**Status:** ⏳ To Do
---
## Overview
Produce `scripts/bun-lane-time.ts` that runs each lane file once (serially,
against the configured direct-5432 DATABASE_URL, exactly like today's lane) and
records wall time per file into `tests/bun-lane-timings.json`. The runner's
weighted partitioner uses these weights so a worker gets a balanced load
(entryService ~86s vs a pure file ~0.5s cannot share a bucket by count).

The probe is intentionally a maintenance tool, not part of the normal gate: it
must be safe to run on a dedicated worker schema, skip C-heavy contention by
default, and never run while another process uses the shared `public` schema.

## Implementation Pseudocode
```ts
// scripts/bun-lane-time.ts
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const MANIFEST_PATH = "tests/bun-lane-manifest.json";
const TIMINGS_PATH = "tests/bun-lane-timings.json";
const TIMEOUT_MS = 120_000; // per file, generous vs lane 15s test timeout

type Manifest = { rows: Array<{ file: string; bucket: string }> };

async function timeFile(file: string, databaseUrl: string): Promise<number> {
  const started = performance.now();
  const code = await new Promise<number>((resolve) => {
    const child = spawn(
      "bun",
      ["test", "--parallel=1", "--timeout=15000", file],
      { env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "ignore" }
    );
    const timer = setTimeout(() => { child.kill("SIGKILL"); }, TIMEOUT_MS);
    child.on("exit", (c) => { clearTimeout(timer); resolve(c ?? 1); });
  });
  void code; // timing is measured regardless of pass/fail; failures are reported separately
  return performance.now() - started;
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
  const databaseUrl = process.env.DATABASE_DIRECT_URL;
  if (!databaseUrl) throw new Error("DATABASE_DIRECT_URL is required for the timing probe");

  // Probe all files EXCEPT C-bucket by default (C files contend on shared state);
  // pass --include-c to include them serially on a fresh worker schema.
  const files = manifest.rows
    .filter((r) => process.argv.includes("--include-c") || r.bucket !== "C")
    .map((r) => r.file);

  const timings: Record<string, number> = {};
  for (const file of files) {
    timings[file] = await timeFile(file, databaseUrl);
    console.log(`[bun-lane-time] ${file} ${(timings[file] / 1000).toFixed(2)}s`);
  }

  // Merge with prior timings if present (keep min of last and current to smooth flakes).
  try {
    const prev = JSON.parse(await readFile(TIMINGS_PATH, "utf8")) as Record<string, number>;
    for (const [k, v] of Object.entries(prev)) {
      if (timings[k] === undefined) timings[k] = v;
      else timings[k] = Math.min(timings[k], v);
    }
  } catch { /* first run */ }

  await writeFile(TIMINGS_PATH, JSON.stringify(timings, null, 2));
}

void main();
```

Weight derivation (in the runner, TASK-557-05-L01): `weightMs(file)` =
`timings[file] ?? DEFAULT_WEIGHT[bucket]` with defaults `A: 1000, B: 10000,
C: 20000`. The partitioner sorts files by weight descending and assigns each to
the currently-lightest worker (longest-processing-time first) so the max worker
sum is minimized.

Regression-test shape (`tests/unit/toolchain/bunLaneTimings.test.ts`):
- `mergeTimings(prev, next)` keeps the min and preserves unknown keys (byte-stable).
- Weight derivation and the `--dry-run` projected-sum report belong to the
  runner leaves: `weightMs` fallback to bucket defaults is tested in
  TASK-557-05-L01, and the dry-run per-worker sums in TASK-557-05-L03. This leaf
  owns only the timing probe + merge helper so it can land before 05.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/unit/toolchain/bunLaneTimings.test.ts` green.
- Record one real probe run (all A + B files, direct 5432) in the handoff with
  total time; commit `tests/bun-lane-timings.json` with the measured values.

## Documentation Updates Required
- `tests/README.md`: how to refresh timings (`bun scripts/bun-lane-time.ts`).
