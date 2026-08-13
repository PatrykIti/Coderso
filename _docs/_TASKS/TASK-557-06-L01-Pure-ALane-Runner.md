# TASK-557-06-L01: Pure A-Lane Runner
# FileName: TASK-557-06-L01-Pure-ALane-Runner.md
**Parent Subtask:** TASK-557-06
**Priority:** High
**Category:** Testing / Tooling
**Estimated Effort:** Small
**Dependencies:** TASK-557-01-L01 (manifest with A bucket)
**Status:** ⏳ To Do
---
## Overview
`scripts/run-bun-pure-lane.ts` runs exactly the A manifest files with
`bun test --parallel=16 --timeout=15000 <a-files>` and NO database env
(`DATABASE_URL` unset in the child env so any accidental DB dependency fails
loudly instead of silently hitting the shared DB). Returns non-zero on any
failure. The orchestrator (TASK-557-05-L02 `--lane all`) runs this first (A is
the fastest lane and warms nothing), then B/C/perf workers.

## Implementation Pseudocode
```ts
// scripts/run-bun-pure-lane.ts
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

export async function runPureLane(): Promise<{ exit: number; durationMs: number }> {
  const manifest = JSON.parse(await readFile("tests/bun-lane-manifest.json", "utf8"));
  const aFiles = manifest.rows.filter((r: { bucket: string }) => r.bucket === "A").map((r: { file: string }) => r.file);
  if (aFiles.length === 0) return { exit: 0, durationMs: 0 };

  const started = performance.now();
  const env = { ...process.env };
  delete env.DATABASE_URL; // fail loudly if any "DB-free" file touches the DB
  delete env.DATABASE_DIRECT_URL;

  const exit = await new Promise<number>((resolve, reject) => {
    const child = spawn(
      "bun",
      ["test", "--parallel=16", "--timeout=15000", ...aFiles],
      { env, stdio: ["inherit", "inherit", "inherit"] }
    );
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
  return { exit, durationMs: performance.now() - started };
}

if (import.meta.main) {
  const { exit, durationMs } = await runPureLane();
  console.log(`[bun-lane-pure] ${(durationMs / 1000).toFixed(1)}s exit=${exit}`);
  process.exit(exit);
}
```

Error handling: unreadable manifest -> `manifest_read_failed`; spawn error ->
`pure_lane_spawn_failed`; exit code propagated. The env-strip is the guard that
keeps the A lane honest: a manifest misclassification (a DB file in A) fails
loudly at runtime instead of silently writing to `public`.

Regression-test shape (`tests/unit/toolchain/bunLanePure.test.ts`):
- `runPureLane` with a stubbed manifest of 0 files exits 0 fast.
- The child env has `DATABASE_URL` and `DATABASE_DIRECT_URL` removed (assert
  via a stub `bun` that prints env).
- A file whose test calls `db` fails the lane (stub asserts non-zero).

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- Pure tests green; one real A-lane run recorded (file count, wall time,
  pass/fail) in the handoff.

## Documentation Updates Required
- `tests/README.md` — pure lane command and env-strip guard.
