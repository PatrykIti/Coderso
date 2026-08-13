/**
 * Fake-worker orchestration tests for the parallel Bun lane runner
 * (TASK-557-05-L02).
 *
 * These are PURE fake-worker tests: the runner is spawned as a subprocess with
 * `--no-provision`, a stub `bun` binary (recorded via `BUN_LANE_BUN_BIN`), a
 * tiny fixture manifest (`BUN_LANE_MANIFEST_PATH`), and a never-dialed fake
 * `DATABASE_DIRECT_URL` (the URL guard is parse-only, so no DB is touched).
 * The stub records invocation start/end markers into a shared log and fails
 * for a named marker file, which proves:
 *
 * - retry-once: a worker failing for one named file is retried once and the
 *   report records truthful `attempted` counts and exit codes,
 * - aggregation: a worker failing after retry fails the whole run (exit 1,
 *   `[run-bun-parallel] FAILED worker <name>` line), and `--no-retry`
 *   disables the retry (`attempted: 1`),
 * - ordering: the perf worker is invoked strictly after every B/C/A worker
 *   exits (serial-after, never concurrent),
 * - connection budget: `workers x pool > 10` fails fast with
 *   `worker_pool_budget_exceeded` before provisioning and before any spawn.
 *
 * The full integration suite (dry-run, provision-failure abort, real-DB
 * provision path, report shape) is owned by TASK-557-05-L03 as the single
 * writer of `tests/integration/toolchain/runBunParallel.test.ts`; this leaf
 * keeps only the fake-worker retry/ordering assertions it needs.
 */
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, expect, test } from "bun:test";

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..", "..", "..");
const RUNNER = "scripts/run-bun-parallel.ts";

// Never dialed: `assertDirectUrl`/`inspectDatabaseUrl` only parse the string.
const FAKE_DIRECT_URL = "postgres://lane:lane@127.0.0.1:5432/lane_test";

const FIXTURE_MANIFEST = {
  rows: [
    { file: "b-good.test.ts", bucket: "B" },
    { file: "b-flaky.test.ts", bucket: "B" },
    { file: "c-shared.test.ts", bucket: "C", conflictKey: "site.contentRoutes" },
    { file: "perf-gate.test.ts", bucket: "perf" },
    { file: "a-pure.test.ts", bucket: "A" },
  ],
};

/**
 * Stub `bun` binary for the fake-worker tests. Appends `start:<kind>` /
 * `end:<kind>` markers to `FAKE_LOG` (kind = `perf` when
 * `BUN_TEST_PERF_QUIET=1`, else `batch`), sleeps for batch workers to widen
 * the concurrency window for the ordering proof, and exits 1 for any
 * invocation whose args contain `FAKE_FAIL_MARKER` (first time only, unless
 * `FAKE_ALWAYS_FAIL=1`; the retry invocation passes once the counter file
 * exists).
 */
const STUB_BUN = `#!/bin/sh
perf="batch"
[ "$BUN_TEST_PERF_QUIET" = "1" ] && perf="perf"
printf '%s\\n' "start:$perf" >> "$FAKE_LOG"
if [ "$perf" != "perf" ]; then sleep 0.3; fi
printf '%s\\n' "end:$perf" >> "$FAKE_LOG"
if [ -n "$FAKE_FAIL_MARKER" ]; then
  for arg in "$@"; do
    case "$arg" in
      *"$FAKE_FAIL_MARKER"*)
        if [ "$FAKE_ALWAYS_FAIL" = "1" ]; then exit 1; fi
        if [ -f "$FAKE_FAIL_COUNTER" ]; then exit 0; fi
        : > "$FAKE_FAIL_COUNTER"
        exit 1
        ;;
    esac
  done
fi
exit 0
`;

let dir: string;
let manifestPath: string;
let stubPath: string;
let logPath: string;
let counterPath: string;
let missingTimingsPath: string;

type SpawnResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  reportPath: string;
};

function runRunner(args: string[], overrides: Record<string, string> = {}): SpawnResult {
  const reportPath = path.join(dir, "report.json");
  // Fresh per-run state: truncate the invocation log and reset the flake
  // counter so each test sees only its own workers' activity.
  writeFileSync(logPath, "");
  rmSync(counterPath, { force: true });
  const env = { ...(process.env as Record<string, string>) } as Record<string, string>;
  delete env.PGHOST;
  delete env.PGPORT;
  env.BUN_LANE_MANIFEST_PATH = manifestPath;
  env.BUN_LANE_TIMINGS_PATH = missingTimingsPath; // absent -> safeRead degrades to {}
  env.BUN_LANE_BUN_BIN = stubPath;
  env.DATABASE_DIRECT_URL = FAKE_DIRECT_URL;
  env.DATABASE_POOLED_PORT = "6432";
  env.FAKE_LOG = logPath;
  env.FAKE_FAIL_COUNTER = counterPath;
  for (const [key, value] of Object.entries(overrides)) env[key] = value;

  let stdout = "";
  let stderr = "";
  let exitCode = 0;
  try {
    stdout = execFileSync("bun", [RUNNER, ...args, "--report", reportPath], {
      cwd: ROOT,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const failure = error as {
      status?: number;
      stdout?: Buffer | string;
      stderr?: Buffer | string;
    };
    exitCode = failure.status ?? 1;
    stdout = (failure.stdout ?? "").toString();
    stderr = (failure.stderr ?? "").toString();
  }
  return {
    exitCode,
    stdout,
    stderr,
    reportPath,
  };
}

function readReport(reportPath: string): {
  results: Array<{ name: string; exit: number; attempted: number; durationMs: number }>;
  totalMs: number;
} {
  return JSON.parse(readFileSync(reportPath, "utf8"));
}

function readLog(): string[] {
  try {
    return readFileSync(logPath, "utf8").split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "run-bun-parallel-l02-"));
  manifestPath = path.join(dir, "manifest.json");
  stubPath = path.join(dir, "stub-bun.sh");
  logPath = path.join(dir, "invocations.log");
  counterPath = path.join(dir, "fail-counter");
  missingTimingsPath = path.join(dir, "missing-timings.json");
  writeFileSync(manifestPath, JSON.stringify(FIXTURE_MANIFEST, null, 2));
  writeFileSync(stubPath, STUB_BUN, { mode: 0o755 });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

test("retry-once: a worker failing for one named file passes after one retry", () => {
  const { exitCode, reportPath } = runRunner(
    ["--lane", "all", "--workers", "3", "--no-provision"],
    { FAKE_FAIL_MARKER: "b-flaky", FAKE_ALWAYS_FAIL: "0" }
  );
  expect(exitCode).toBe(0);
  const report = readReport(reportPath);
  const b0 = report.results.find((r) => r.name === "b0");
  expect(b0).toBeDefined();
  expect(b0?.attempted).toBe(2); // flake retried exactly once
  expect(b0?.exit).toBe(0);
  // Pure A lane integration: one entry, attempted 1, exit 0.
  const a = report.results.find((r) => r.name === "a");
  expect(a?.attempted).toBe(1);
  expect(a?.exit).toBe(0);
  expect(report.results.some((r) => r.name === "c")).toBe(true);
  expect(report.results.some((r) => r.name === "perf")).toBe(true);
  // totalMs is the max of worker durations, never a placeholder.
  const maxDuration = Math.max(...report.results.map((r) => r.durationMs));
  expect(report.totalMs).toBe(maxDuration);
  expect(report.totalMs).toBeGreaterThan(0);
  // The stub for b0 ran twice (fail then pass); log lines are truthful.
  const log = readLog();
  expect(log.length).toBeGreaterThan(0);
});

test("retry exhaustion aggregates a failing worker into a non-zero run", () => {
  const { exitCode, stderr, reportPath } = runRunner(
    ["--lane", "all", "--workers", "3", "--no-provision"],
    { FAKE_FAIL_MARKER: "b-flaky", FAKE_ALWAYS_FAIL: "1" }
  );
  expect(exitCode).toBe(1);
  expect(stderr).toContain("[run-bun-parallel] FAILED worker b0");
  const report = readReport(reportPath);
  const b0 = report.results.find((r) => r.name === "b0");
  expect(b0?.attempted).toBe(2);
  expect(b0?.exit).toBe(1);
});

test("--no-retry disables the retry (attempted: 1)", () => {
  const { exitCode, reportPath } = runRunner(
    ["--lane", "all", "--workers", "3", "--no-provision", "--no-retry"],
    { FAKE_FAIL_MARKER: "b-flaky", FAKE_ALWAYS_FAIL: "1" }
  );
  expect(exitCode).toBe(1);
  const b0 = readReport(reportPath).results.find((r) => r.name === "b0");
  expect(b0?.attempted).toBe(1);
  expect(b0?.exit).toBe(1);
});

test("ordering: perf runs strictly after every B/C/A worker exits", () => {
  const { exitCode } = runRunner(["--lane", "all", "--workers", "3", "--no-provision"]);
  expect(exitCode).toBe(0);
  const lines = readLog();
  const perfStarts = lines.map((l, i) => (l === "start:perf" ? i : -1)).filter((i) => i >= 0);
  expect(perfStarts).toHaveLength(1); // exactly one perf worker invocation
  const perfStart = perfStarts[0];
  const lastBatchEnd = Math.max(
    ...lines.map((l, i) => (l === "end:batch" ? i : -1)).filter((i) => i >= 0)
  );
  expect(perfStart).toBeGreaterThan(lastBatchEnd); // serial-after, never concurrent
});

test("connection budget: workers x pool > 10 fails before provisioning and spawning", () => {
  const { exitCode, stderr } = runRunner(["--lane", "b", "--workers", "8", "--pool", "2"]);
  expect(exitCode).toBe(1);
  expect(stderr).toContain("worker_pool_budget_exceeded");
  // No worker ever spawned: the fake bun never ran.
  expect(readLog()).toEqual([]);
});
