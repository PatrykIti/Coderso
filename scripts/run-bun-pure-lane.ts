/**
 * Pure A-lane runner for the parallel Bun test lane (TASK-557-06-L01).
 *
 * Runs exactly the A manifest files (`bucket === "A"` in
 * `tests/bun-lane-manifest.json`) with
 * `bun test --parallel=16 --timeout=15000 <a-files>` and NO database env in
 * the child: `DATABASE_URL` and `DATABASE_DIRECT_URL` are stripped so any
 * accidental DB dependency fails loudly at runtime instead of silently
 * hitting the shared `public` schema. The orchestrator (TASK-557-05-L02
 * `--lane all`) runs this lane concurrently with the B/C workers (A has no DB
 * dependency and no CPU-isolation requirement) and the perf lane strictly
 * after the whole batch.
 *
 * Contract:
 * - `runPureLane(options?)` returns `{ exit, durationMs, files, attempted }`;
 *   exit is the child's exit code (non-zero propagates), `files` is exactly
 *   the A manifest set, and `attempted` is 1 or 2 when a child ran (0 for an
 *   empty A set, which returns immediately without spawning).
 * - Retry-once flake guard mirrors the B/C workers: on a non-zero exit the
 *   FULL A file set is rerun once unless `options.noRetry` is set; `attempted`
 *   records 1 or 2 runs truthfully and the final exit is the retry's exit
 *   (0 when the retry passes). A spawn failure throws
 *   `pure_lane_spawn_failed:<bin>` WITHOUT retry, matching the B/C workers'
 *   `worker_spawn_failed` behavior.
 * - Unreadable/invalid manifest -> `manifest_read_failed:<path>`.
 * - `import.meta.main` CLI prints `[bun-lane-pure] <seconds>s exit=<code>`
 *   and exits with the child's code.
 *
 * The DB guard is two layers because `bun test` auto-loads `.env` into the
 * child: stripping the vars from the spawn env alone is NOT enough (Bun
 * re-injects `DATABASE_URL`/`DATABASE_DIRECT_URL` from the repo `.env`), so
 * the child also runs with `--env-file=/dev/null` to disable `.env`
 * autoload entirely. A misclassified DB file in A then fails loudly (empty
 * URL / absent vars) instead of silently hitting the shared `public` schema.
 *
 * Testability seams (defaults match production behavior exactly):
 * - `BUN_LANE_MANIFEST_PATH` overrides the manifest path.
 * - `BUN_LANE_BUN_BIN` overrides the spawned binary.
 * Both are read inside `runPureLane()` so tests can set `process.env` per
 * call without touching the committed manifest or the real `bun`.
 */
import { readFile } from "node:fs/promises";

const DEFAULT_MANIFEST_PATH = "tests/bun-lane-manifest.json";
const DEFAULT_BUN_BIN = "bun";

export type PureLaneResult = {
  exit: number;
  durationMs: number;
  files: string[];
  attempted: number;
};

/**
 * Run exactly the A manifest files with `bun test --env-file=/dev/null
 * --parallel=16 --timeout=15000` and a DB-env-stripped child environment.
 * `--env-file=/dev/null` stops Bun from re-injecting `DATABASE_*` from the
 * repo `.env`, so the fail-loud guard is airtight.
 *
 * Retry-once flake guard (mirrors the B/C workers in `run-bun-parallel.ts`):
 * a non-zero first exit reruns the FULL A file set once, so load-induced
 * timeouts under full 5-worker CPU pressure (the final3 A-lane flakes) can
 * recover. `attempted` records 1 or 2 runs truthfully; the final exit is the
 * retry's exit (0 when the retry passes). `options.noRetry` disables the
 * retry, matching the orchestrator's `--no-retry` flag. A spawn failure
 * throws `pure_lane_spawn_failed:<bin>` without retry. Returns the final exit
 * code, wall time, the A file list, and the attempted count. An empty A set
 * returns `{exit: 0, durationMs: 0, files: [], attempted: 0}` without
 * spawning.
 */
export async function runPureLane(options?: { noRetry?: boolean }): Promise<PureLaneResult> {
  const manifestPath = process.env.BUN_LANE_MANIFEST_PATH ?? DEFAULT_MANIFEST_PATH;
  const bunBin = process.env.BUN_LANE_BUN_BIN ?? DEFAULT_BUN_BIN;
  const noRetry = options?.noRetry ?? false;

  let manifest: { rows: { file: string; bucket: string }[] };
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      rows: { file: string; bucket: string }[];
    };
  } catch (cause) {
    throw new Error(`manifest_read_failed:${manifestPath}`, { cause });
  }

  const aFiles = manifest.rows
    .filter((row: { bucket: string }) => row.bucket === "A")
    .map((row: { file: string }) => row.file);

  if (aFiles.length === 0) {
    return { exit: 0, durationMs: 0, files: [], attempted: 0 };
  }

  const started = performance.now();
  // Fail-loud guard: strip the DB env so any "DB-free" file that touches the
  // DB fails here instead of silently writing to `public`. `process.env` may
  // carry `undefined` values, which `Bun.spawn`'s env contract allows.
  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.DATABASE_DIRECT_URL;

  // Spawn one child and await its exit; a spawn failure rejects so the caller
  // sees `pure_lane_spawn_failed:<bin>` WITHOUT retry (same fail-loud shape as
  // the B/C workers' `worker_spawn_failed`).
  const runOnce = async (): Promise<number> => {
    let proc: ReturnType<typeof Bun.spawn>;
    try {
      // Bun.spawn is the repo convention (scripts/run-bun-lane.ts); keep it.
      // `--env-file=/dev/null` disables Bun's `.env` autoload in the child,
      // which would otherwise re-inject the stripped DATABASE_* values from the
      // repo `.env` and defeat the fail-loud guard above.
      proc = Bun.spawn(
        [bunBin, "test", "--env-file=/dev/null", "--parallel=16", "--timeout=15000", ...aFiles],
        {
          env,
          stdout: "inherit",
          stderr: "inherit" as const,
        }
      );
    } catch (cause) {
      throw new Error(`pure_lane_spawn_failed:${bunBin}`, { cause });
    }

    let exitCode: number;
    try {
      exitCode = await proc.exited;
    } catch (cause) {
      throw new Error(`pure_lane_spawn_failed:${bunBin}`, { cause });
    }
    return typeof exitCode === "number" ? exitCode : 1;
  };

  let attempted = 1;
  let exit = await runOnce();
  if (exit !== 0 && !noRetry) {
    attempted = 2;
    exit = await runOnce();
  }
  return { exit, durationMs: performance.now() - started, files: aFiles, attempted };
}

if (import.meta.main) {
  const { exit, durationMs } = await runPureLane();
  console.log(`[bun-lane-pure] ${(durationMs / 1000).toFixed(1)}s exit=${exit}`);
  process.exit(exit);
}
