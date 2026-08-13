/**
 * Per-file wall-time probe for the Bun lane (TASK-557-01-L02).
 *
 * Runs each lane file once, serially, against the configured direct-5432
 * DATABASE_URL (exactly like today's lane) and records wall time per file into
 * `tests/bun-lane-timings.json`. The TASK-557-05 weighted partitioner uses
 * these weights so a worker gets a balanced load (entryService ~86s vs a pure
 * file ~0.5s cannot share a bucket by count).
 *
 * The probe is intentionally a maintenance tool, not part of the normal gate:
 * it must be safe to run on a dedicated worker schema, skips C-heavy
 * contention by default, and must never run while another process uses the
 * shared `public` schema.
 *
 * Run from the repo root:
 * - `bun scripts/bun-lane-time.ts` (times all non-C files),
 * - `bun scripts/bun-lane-time.ts --include-c` (times C files serially too).
 *
 * Requires `DATABASE_DIRECT_URL` (direct 5432; a pooler is not allowed).
 * Importing this module never runs the probe (import.meta.main guard).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MANIFEST_PATH = "tests/bun-lane-manifest.json";
const TIMINGS_PATH = "tests/bun-lane-timings.json";
const TIMEOUT_MS = 120_000; // per file, generous vs the lane 15s test timeout

type Manifest = { generatedAt: string; rows: Array<{ file: string; bucket: string }> };

const repoRoot = path.resolve(import.meta.dir, "..");

/**
 * Spawns `bun test --parallel=1 --timeout=15000 <file>` with the probe
 * DATABASE_URL and resolves with the wall time in ms, regardless of the child
 * exit code. The child is SIGKILLed after TIMEOUT_MS so a hung suite cannot
 * stall the probe forever; its result is still measured (failures are reported
 * separately by the normal lane).
 */
async function timeFile(file: string, databaseUrl: string): Promise<number> {
  const started = performance.now();
  const proc = Bun.spawn(["bun", "test", "--parallel=1", "--timeout=15000", file], {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  });
  const timer = setTimeout(() => {
    proc.kill("SIGKILL");
  }, TIMEOUT_MS);
  const exitCode = await proc.exited;
  clearTimeout(timer);
  void exitCode; // wall time is measured regardless of pass/fail
  return performance.now() - started;
}

/**
 * Pure merge of two timing maps: keeps the minimum per overlapping key,
 * preserves keys that only exist in `prev`, and adds keys that only exist in
 * `next`. Returns a NEW record and never mutates its inputs, so repeated
 * merges stay deterministic (byte-stable for identical inputs).
 */
function mergeTimings(
  prev: Record<string, number>,
  next: Record<string, number>
): Record<string, number> {
  const merged: Record<string, number> = { ...prev };
  for (const [file, ms] of Object.entries(next)) {
    const prior = merged[file];
    merged[file] = prior === undefined ? ms : Math.min(prior, ms);
  }
  return merged;
}

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
  const databaseUrl = process.env.DATABASE_DIRECT_URL;
  if (!databaseUrl) throw new Error("DATABASE_DIRECT_URL is required for the timing probe");

  // Probe all files EXCEPT C-bucket by default (C files contend on shared
  // state); pass --include-c to include them serially on a fresh worker schema.
  const files = manifest.rows
    .filter((row) => process.argv.includes("--include-c") || row.bucket !== "C")
    .map((row) => row.file);

  const measured: Record<string, number> = {};
  for (const file of files) {
    measured[file] = await timeFile(file, databaseUrl);
    console.log(`[bun-lane-time] ${file} ${(measured[file] / 1000).toFixed(2)}s`);
  }

  // Merge with prior timings if present (keep min of last and current to
  // smooth flakes).
  let prior: Record<string, number> = {};
  try {
    prior = JSON.parse(await readFile(TIMINGS_PATH, "utf8")) as Record<string, number>;
  } catch {
    // first run
  }

  const timings = mergeTimings(prior, measured);
  // Sorted keys for byte-stable serialization across runs and machines.
  const sorted: Record<string, number> = Object.fromEntries(
    Object.keys(timings)
      .sort()
      .map((file) => [file, timings[file]])
  );
  await writeFile(TIMINGS_PATH, JSON.stringify(sorted, null, 2));
  console.log(`[bun-lane-time] wrote ${TIMINGS_PATH} with ${Object.keys(sorted).length} files`);
}

// export for tests; importing this module must never run the probe
if (import.meta.main) {
  await main();
}
export { mergeTimings, timeFile };
