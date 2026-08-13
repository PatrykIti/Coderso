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
 * - `runPureLane()` returns `{ exit, durationMs, files, attempted }`; exit is
 *   the child's exit code (non-zero propagates), `files` is exactly the A
 *   manifest set, and `attempted` is 1 when a child ran (0 for an empty A
 *   set, which returns immediately without spawning).
 * - Unreadable/invalid manifest -> `manifest_read_failed:<path>`.
 * - Spawn failure -> `pure_lane_spawn_failed:<bin>`.
 * - `import.meta.main` CLI prints `[bun-lane-pure] <seconds>s exit=<code>`
 *   and exits with the child's code.
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
 * Run exactly the A manifest files with `bun test --parallel=16
 * --timeout=15000` and a DB-env-stripped child environment. Returns the
 * child exit code (non-zero propagates), wall time, the A file list, and
 * `attempted: 1`. An empty A set returns `{exit: 0, durationMs: 0, files: [],
 * attempted: 0}` without spawning.
 */
export async function runPureLane(): Promise<PureLaneResult> {
  const manifestPath = process.env.BUN_LANE_MANIFEST_PATH ?? DEFAULT_MANIFEST_PATH;
  const bunBin = process.env.BUN_LANE_BUN_BIN ?? DEFAULT_BUN_BIN;

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
  // DB fails here instead of silently writing to `public`.
  const env: Record<string, string> = { ...process.env };
  delete env.DATABASE_URL;
  delete env.DATABASE_DIRECT_URL;

  let proc: ReturnType<typeof Bun.spawn>;
  try {
    // Bun.spawn is the repo convention (scripts/run-bun-lane.ts); keep it.
    proc = Bun.spawn([bunBin, "test", "--parallel=16", "--timeout=15000", ...aFiles], {
      env,
      stdout: "inherit",
      stderr: "inherit" as const,
    });
  } catch (cause) {
    throw new Error(`pure_lane_spawn_failed:${bunBin}`, { cause });
  }

  let exitCode: number;
  try {
    exitCode = await proc.exited;
  } catch (cause) {
    throw new Error(`pure_lane_spawn_failed:${bunBin}`, { cause });
  }
  const exit = typeof exitCode === "number" ? exitCode : 1;
  return { exit, durationMs: performance.now() - started, files: aFiles, attempted: 1 };
}

if (import.meta.main) {
  const { exit, durationMs } = await runPureLane();
  console.log(`[bun-lane-pure] ${(durationMs / 1000).toFixed(1)}s exit=${exit}`);
  process.exit(exit);
}
