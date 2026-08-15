/**
 * Full orchestrator integration suite for the parallel Bun lane runner
 * (TASK-557-05-L03, `scripts/run-bun-parallel.ts`).
 *
 * This file is the SINGLE WRITER-owned regression suite for the partitioner +
 * orchestrator (TASK-557-05-L02, commit 3e84e6fc). It pins the runner's
 * contract so it stays truthful:
 *
 * - deterministic assignment: the pure weighted partitioner keeps C files
 *   serial on their own two workers (c1 write-global, c2 read-only since
 *   TASK-559), perf files on their own worker, and balances B files across
 *   the remaining workers (longest-processing-time-first);
 * - dry-run stability: `--dry-run` prints `partitionSummary`, exits 0, writes
 *   no report, and never spawns a worker (no DB needed at all);
 * - retry-once flake policy: a worker failing for one named file is retried
 *   exactly once and the report records truthful `attempted` counts; `--no-
 *   retry` keeps `attempted` at 1 even on failure;
 * - exit aggregation: a worker that fails both attempts fails the whole run
 *   with a `[run-bun-parallel] FAILED worker <name>` line;
 * - provision failure aborts PRE-spawn: no half-provisioned run, no worker
 *   process ever starts, and no report is written;
 * - report shape: one entry per worker with truthful `attempted` counts and
 *   `totalMs` equal to the max of worker durations (never a placeholder);
 * - serial-after ordering: the perf worker is invoked strictly after every
 *   B/C/A worker exits (wall-time gates are CPU-contention sensitive);
 * - connection budget: `--pool 4 --workers 8` fails fast with
 *   `worker_pool_budget_exceeded` before provisioning and before any spawn;
 * - no mutation of `public`: the DB-gated provision-then-run proof shows a
 *   real worker writing into `bun_worker_0` while the `public` pg_tables
 *   membership stays byte-identical.
 *
 * Fake-worker tests never run real `bun test`: the runner is spawned as a
 * subprocess with `--no-provision`, a stub `bun` binary (via
 * `BUN_LANE_BUN_BIN`) that records invocation order into a shared log and
 * fails for a named marker file, and a never-dialed fake `DATABASE_DIRECT_URL`
 * (the URL guard is parse-only, so no DB is touched). DB-backed coverage
 * (provision + one real worker) runs only when `DATABASE_DIRECT_URL` is set
 * and skips cleanly otherwise, following the sibling suites in this directory.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import postgres from "postgres";

import {
  partition,
  partitionSummary,
  weightMs,
  type ManifestRowV2,
} from "../../../scripts/bun-lane-partition";
import { provisionWorkers } from "../../../scripts/bun-lane-provision";
import { resolveWorkerEnv } from "../../../scripts/bun-lane-worker-url";

const ROOT = path.resolve(import.meta.dir, "..", "..", "..");
const RUNNER = "scripts/run-bun-parallel.ts";
const SETTINGS_TEST = "tests/unit/settings/settingsService.test.ts";
// Tracks the live migration journal (core/db/migrations/meta/_journal.json),
// currently 72 entries (migration 0071_seed_admin_role was added by an
// unrelated task; the applier applies the full journal, so this count must
// equal journal.entries.length).
const MIGRATION_COUNT = 72;
const WORKER_SCHEMAS = ["bun_worker_0", "bun_worker_1"];

// Never dialed in fake-worker mode: `assertDirectUrl`/`inspectDatabaseUrl`
// only parse the string. The unreachable URL is dialed ONLY by the
// provision-failure test (port 1 refuses connections immediately).
const FAKE_DIRECT_URL = "postgres://lane:lane@127.0.0.1:5432/lane_test";
const UNREACHABLE_DIRECT_URL = "postgres://lane:lane@127.0.0.1:1/lane_test?connect_timeout=1";

// ---------------------------------------------------------------------------
// Pure partitioner contract (deterministic assignment, C isolation, balance).
// ---------------------------------------------------------------------------

const ROWS: ManifestRowV2[] = [
  { file: "a.test.ts", bucket: "B", weightMs: 100, conflictKeys: [] },
  { file: "b.test.ts", bucket: "B", weightMs: 90, conflictKeys: [] },
  { file: "c.test.ts", bucket: "B", weightMs: 80, conflictKeys: [] },
  { file: "d.test.ts", bucket: "B", weightMs: 70, conflictKeys: [] },
  { file: "x.test.ts", bucket: "C", conflictKeys: [], cWriteGlobal: true },
  { file: "y.test.ts", bucket: "C", conflictKeys: [] },
  { file: "p1.test.ts", bucket: "perf", conflictKeys: [] },
];

test("partition keeps C1/C2 and perf separate and balances B deterministically", () => {
  const p = partition(ROWS, {}, 2);
  expect(p.c1).toEqual(["x.test.ts"]); // write-global C stays on the strict worker
  expect(p.c2).toEqual(["y.test.ts"]); // read-only C goes to the self-scoped worker
  expect(p.perf).toEqual(["p1.test.ts"]);
  const union = [...p.b.flat(), ...p.c1, ...p.c2, ...p.perf].sort();
  expect(union).toEqual(ROWS.map((r) => r.file).sort());
  const weightOf = (file: string): number =>
    weightMs(
      ROWS.find((r) => r.file === file)!,
      {}
    );
  const sums = p.b.map((files) => files.reduce((sum, file) => sum + weightOf(file), 0));
  // LPT with 100/90/80/70 lands 170 vs 170: balance is exact here.
  expect(Math.max(...sums) - Math.min(...sums)).toBeLessThanOrEqual(30);
  // Deterministic assignment: the same input always yields the same partition.
  expect(partition(ROWS, {}, 2)).toEqual(p);
});

test("partitionSummary is stable on fixed timings", () => {
  const p = partition(ROWS, {}, 2);
  const summary = partitionSummary(p, {});
  expect(summary).toContain("worker-b0: 2 files, 0ms");
  expect(summary).toContain("worker-b1: 2 files, 0ms");
  expect(summary).toContain("worker-c1: 1 files (serial)");
  expect(summary).toContain("worker-c2: 1 files (serial)");
  expect(summary).toContain("worker-perf: 1 files (serial)");
});

// ---------------------------------------------------------------------------
// Orchestrator fixtures: stub `bun` + fixture manifest.
// ---------------------------------------------------------------------------

const FIXTURE_MANIFEST = {
  rows: [
    { file: "b-good.test.ts", bucket: "B" },
    { file: "b-flaky.test.ts", bucket: "B" },
    {
      file: "c-shared.test.ts",
      bucket: "C",
      conflictKeys: ["site.contentRoutes"],
      cWriteGlobal: true,
    },
    {
      file: "c-readonly.test.ts",
      bucket: "C",
      conflictKeys: ["site.homepageId"],
      cWriteGlobal: false,
    },
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
printf '%s\\n' "worker:$perf:idx=\${BUN_TEST_WORKER_INDEX:-}:fence=\${BUN_TEST_FENCE_NAMESPACE_OFFSET:-}" >> "$FAKE_LOG"
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

type ReportWorker = {
  name: string;
  files: string[];
  exit: number;
  durationMs: number;
  attempted: number;
};

function runRunner(args: string[], overrides: Record<string, string> = {}): SpawnResult {
  const reportPath = path.join(dir, "report.json");
  // Fresh per-run state: truncate the invocation log, reset the flake
  // counter, and remove any stale report so each test sees only its own
  // workers' activity (tests may otherwise inherit the previous run's file).
  writeFileSync(logPath, "");
  rmSync(counterPath, { force: true });
  rmSync(reportPath, { force: true });
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
  return { exitCode, stdout, stderr, reportPath };
}

function readReport(reportPath: string): { results: ReportWorker[]; totalMs: number } {
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
  dir = mkdtempSync(path.join(tmpdir(), "run-bun-parallel-l03-"));
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

// ---------------------------------------------------------------------------
// Orchestrator contract (fake-worker mode, no DB dialed).
// ---------------------------------------------------------------------------

test("--dry-run prints the partition summary, exits 0, and never spawns", () => {
  const { exitCode, stdout, stderr, reportPath } = runRunner([
    "--lane",
    "all",
    "--workers",
    "4",
    "--dry-run",
  ]);
  expect(exitCode).toBe(0);
  expect(stdout).toContain("worker-b0: 2 files, 0ms");
  expect(stdout).toContain("worker-c1: 1 files (serial)");
  expect(stdout).toContain("worker-c2: 1 files (serial)");
  expect(stdout).toContain("worker-perf: 1 files (serial)");
  expect(stderr).toBe("");
  expect(readLog()).toEqual([]); // no worker ever spawned
  expect(existsSync(reportPath)).toBe(false); // dry-run writes no report
});

test("fake worker: a flaky worker passes after exactly one retry", () => {
  const { exitCode, reportPath } = runRunner(
    ["--lane", "all", "--workers", "4", "--no-provision"],
    { FAKE_FAIL_MARKER: "b-flaky", FAKE_ALWAYS_FAIL: "0" }
  );
  expect(exitCode).toBe(0);
  const report = readReport(reportPath);
  const b0 = report.results.find((r) => r.name === "b0");
  expect(b0).toBeDefined();
  expect(b0?.attempted).toBe(2); // flake retried exactly once
  expect(b0?.exit).toBe(0);
  for (const worker of report.results) {
    if (worker.name !== "b0") expect(worker.attempted).toBe(1);
  }
});

test("fake worker: retry exhaustion aggregates into a non-zero run", () => {
  const { exitCode, stderr, reportPath } = runRunner(
    ["--lane", "all", "--workers", "4", "--no-provision"],
    { FAKE_FAIL_MARKER: "b-flaky", FAKE_ALWAYS_FAIL: "1" }
  );
  expect(exitCode).toBe(1);
  expect(stderr).toContain("[run-bun-parallel] FAILED worker b0");
  const b0 = readReport(reportPath).results.find((r) => r.name === "b0");
  expect(b0?.attempted).toBe(2);
  expect(b0?.exit).toBe(1);
});

test("--no-retry keeps attempted at 1 even on failure", () => {
  const { exitCode, reportPath } = runRunner(
    ["--lane", "all", "--workers", "4", "--no-provision", "--no-retry"],
    { FAKE_FAIL_MARKER: "b-flaky", FAKE_ALWAYS_FAIL: "1" }
  );
  expect(exitCode).toBe(1);
  const b0 = readReport(reportPath).results.find((r) => r.name === "b0");
  expect(b0?.attempted).toBe(1);
  expect(b0?.exit).toBe(1);
});

test("fake worker: the pure A lane retries once and the report records attempted 2", () => {
  const { exitCode, reportPath } = runRunner(
    ["--lane", "all", "--workers", "4", "--no-provision"],
    { FAKE_FAIL_MARKER: "a-pure", FAKE_ALWAYS_FAIL: "0" }
  );
  expect(exitCode).toBe(0); // the A retry passes, so the whole run passes
  const report = readReport(reportPath);
  const a = report.results.find((r) => r.name === "a");
  expect(a).toBeDefined();
  expect(a?.attempted).toBe(2); // A-lane flake retried exactly once
  expect(a?.exit).toBe(0);
  for (const worker of report.results) {
    if (worker.name !== "a") expect(worker.attempted).toBe(1);
  }
});

test("fake worker: --no-retry also disables the pure A lane retry", () => {
  const { exitCode, stderr, reportPath } = runRunner(
    ["--lane", "all", "--workers", "4", "--no-provision", "--no-retry"],
    { FAKE_FAIL_MARKER: "a-pure", FAKE_ALWAYS_FAIL: "1" }
  );
  expect(exitCode).toBe(1);
  expect(stderr).toContain("[run-bun-parallel] FAILED worker a");
  const a = readReport(reportPath).results.find((r) => r.name === "a");
  expect(a?.attempted).toBe(1);
  expect(a?.exit).toBe(1);
});

test("report JSON has one entry per worker with truthful attempted and totalMs = max", () => {
  const { exitCode, reportPath } = runRunner(["--lane", "all", "--workers", "4", "--no-provision"]);
  expect(exitCode).toBe(0);
  const report = readReport(reportPath);
  expect(report.results.map((r) => r.name).sort()).toEqual(["a", "b0", "c1", "c2", "perf"]);
  for (const worker of report.results) {
    expect(worker.attempted).toBe(1);
    expect(worker.durationMs).toBeGreaterThan(0);
    expect(Array.isArray(worker.files)).toBe(true);
  }
  // totalMs is the max of worker durations, never a placeholder.
  const maxDuration = Math.max(...report.results.map((r) => r.durationMs));
  expect(report.totalMs).toBe(maxDuration);
  expect(report.totalMs).toBeGreaterThan(0);
});

test("ordering: perf runs strictly after every B/C/A worker exits", () => {
  const { exitCode } = runRunner(["--lane", "all", "--workers", "4", "--no-provision"]);
  expect(exitCode).toBe(0);
  const lines = readLog();
  const perfStarts = lines.map((line, i) => (line === "start:perf" ? i : -1)).filter((i) => i >= 0);
  expect(perfStarts).toHaveLength(1); // exactly one perf worker invocation
  const perfStart = perfStarts[0];
  const lastBatchEnd = Math.max(
    ...lines.map((line, i) => (line === "end:batch" ? i : -1)).filter((i) => i >= 0)
  );
  expect(perfStart).toBeGreaterThan(lastBatchEnd); // serial-after, never concurrent
});

test("connection budget: --pool 4 --workers 8 fails before provisioning and spawning", () => {
  const { exitCode, stderr } = runRunner(["--lane", "all", "--workers", "8", "--pool", "4"]);
  expect(exitCode).toBe(1);
  expect(stderr).toContain("worker_pool_budget_exceeded");
  // No worker ever spawned: the fake bun never ran.
  expect(readLog()).toEqual([]);
});

test("worker_count_too_low fires per lane mode before provisioning", () => {
  // --lane all needs bWorkerCount + cWorkers + 1 = max(1,3-3)+3 = 4 workers.
  const all = runRunner(["--lane", "all", "--workers", "3", "--no-provision"]);
  expect(all.exitCode).toBe(1);
  expect(all.stderr).toContain("worker_count_too_low:3");
  // --lane c needs bWorkerCount + 2 = max(1,2-2)+2 = 3 workers (c1@bLen, c2@bLen+1).
  const c = runRunner(["--lane", "c", "--workers", "2", "--no-provision"]);
  expect(c.exitCode).toBe(1);
  expect(c.stderr).toContain("worker_count_too_low:2");
  // No worker ever spawned in either failing mode.
  expect(readLog()).toEqual([]);
});

test("--lane b --workers 1 and --lane perf --workers 1 are valid minima", () => {
  const b = runRunner(["--lane", "b", "--workers", "1", "--no-provision"]);
  expect(b.exitCode).toBe(0);
  const bReport = readReport(b.reportPath);
  expect(bReport.results.map((r) => r.name)).toEqual(["b0"]);

  const perf = runRunner(["--lane", "perf", "--workers", "1", "--no-provision"]);
  expect(perf.exitCode).toBe(0);
  const perfReport = readReport(perf.reportPath);
  expect(perfReport.results.map((r) => r.name)).toEqual(["perf"]);
});

test("provision failure aborts before any worker spawns", () => {
  const { exitCode, stderr, reportPath } = runRunner(
    ["--lane", "all", "--workers", "4", "--pool", "1"],
    { DATABASE_DIRECT_URL: UNREACHABLE_DIRECT_URL }
  );
  expect(exitCode).toBe(1);
  // The first worker schema drop fails; provisioning aborts with a named error.
  expect(stderr).toContain("provision_drop_failed");
  expect(stderr).toContain("bun_worker_0");
  expect(readLog()).toEqual([]); // no worker ever spawned
  expect(existsSync(reportPath)).toBe(false); // no report on an aborted run
});

// ---------------------------------------------------------------------------
// DB-gated provision-then-run proof (skips without DATABASE_DIRECT_URL).
// ---------------------------------------------------------------------------

const DATABASE_DIRECT_URL = process.env.DATABASE_DIRECT_URL;
let control: postgres.Sql | undefined;

/**
 * Spawn a real `bun test` worker the same way the runner does
 * (`--parallel=1 --timeout=15000 <files>`) and drain both pipes so a chatty
 * child can never block. Returns the child exit code plus captured output for
 * diagnostics.
 */
async function spawnRealWorker(
  files: string[],
  env: Record<string, string>
): Promise<{ exit: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["bun", "test", "--parallel=1", "--timeout=15000", ...files], {
    cwd: ROOT,
    env,
    stdout: "pipe",
    stderr: "pipe" as const,
  });
  const decoder = new TextDecoder();
  const drain = async (stream: ReadableStream<Uint8Array> | null): Promise<string> => {
    if (!stream) return "";
    // Reader loop: DOM `ReadableStream` in this tsconfig has no async
    // iterator contract; `getReader()` matches the runtime stream.
    const reader = stream.getReader();
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out += decoder.decode(value);
    }
    return out;
  };
  const [stdout, stderr] = await Promise.all([
    drain(proc.stdout as ReadableStream<Uint8Array> | null),
    drain(proc.stderr as ReadableStream<Uint8Array> | null),
  ]);
  const exit = await proc.exited;
  return { exit: typeof exit === "number" ? exit : 1, stdout, stderr };
}

beforeAll(async () => {
  if (!DATABASE_DIRECT_URL) return;
  control = postgres(DATABASE_DIRECT_URL, { max: 2 });
  for (const schema of WORKER_SCHEMAS) {
    await control.unsafe(`drop schema if exists "${schema}" cascade`);
  }
});

afterAll(async () => {
  if (!control) return;
  for (const schema of WORKER_SCHEMAS) {
    await control.unsafe(`drop schema if exists "${schema}" cascade`);
  }
  await control.end();
});

test.skipIf(!DATABASE_DIRECT_URL)(
  "provision + real worker run against bun_worker_0; public untouched",
  async () => {
    const url = DATABASE_DIRECT_URL!;
    const before = (
      await control!.unsafe(`select count(*)::int as n from pg_tables where schemaname = 'public'`)
    )[0].n as number;

    const provisioned = await provisionWorkers(url, 2);
    expect(provisioned.map((r) => r.schema)).toEqual(WORKER_SCHEMAS);
    expect(provisioned.every((r) => r.applied === MIGRATION_COUNT)).toBe(true);

    // Minimal real worker: one known-safe DB file with the exact worker env
    // the orchestrator would build (`resolveWorkerEnv(0)`).
    const workerEnv = resolveWorkerEnv(0, { poolMax: 1, fenceOffset: 1 });
    const worker = await spawnRealWorker([SETTINGS_TEST], workerEnv);
    if (worker.exit !== 0) {
      console.error(`worker stdout:\n${worker.stdout.slice(0, 4000)}`);
      console.error(`worker stderr:\n${worker.stderr.slice(0, 4000)}`);
    }
    expect(worker.exit).toBe(0);

    // The provisioned schema holds the expected rows (full migration set)...
    const migrations = (
      await control!.unsafe(
        `select count(*)::int as n from "${WORKER_SCHEMAS[0]}"."_bun_migrations"`
      )
    )[0].n as number;
    expect(migrations).toBe(MIGRATION_COUNT);
    // ...and the worker wrote through its own schema, not `public`.
    const settingsTable = (
      await control!.unsafe(`select to_regclass('${WORKER_SCHEMAS[0]}.settings') as t`)
    )[0].t as string | null;
    expect(settingsTable).toBe(`${WORKER_SCHEMAS[0]}.settings`);

    // `public` membership is untouched: same pg_tables count as before.
    const after = (
      await control!.unsafe(`select count(*)::int as n from pg_tables where schemaname = 'public'`)
    )[0].n as number;
    expect(after).toBe(before);
  },
  420_000
);
