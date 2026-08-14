/**
 * Parallel Bun lane orchestrator (TASK-557-05-L02).
 *
 * Replaces `bun test --parallel=1 ...` for the full lane. Reads the committed
 * manifest + measured timings, partitions B/C/perf buckets, provisions worker
 * schemas, spawns one process per worker with its own `DATABASE_URL` + fence
 * offset, retries flaky workers once, and writes a machine-readable report.
 *
 * Safety invariants:
 * - C files never share a worker with each other (one dedicated serial C
 *   worker); B files are weighted (longest-first) across `K-2` workers under
 *   `--lane all` (one slot reserved for the pure A lane) or `K-1` otherwise;
 *   perf files run strictly AFTER all B/C/A workers finish (wall-time gates
 *   are CPU-contention sensitive), never concurrently.
 * - `assertConnectionBudget(workers, pool)` enforces `workers x pool <= 10`
 *   (Render direct-connect reserve) BEFORE provisioning; provisioning failure
 *   aborts before any worker spawns.
 * - The perf worker env is an ADDITIVE overlay of `PERF_QUIET_ENV` on
 *   `resolveWorkerEnv`: `DATABASE_URL`/`DATABASE_DIRECT_URL`/`NODE_ENV` come
 *   from the base resolver (the perf lane needs real DB access).
 * - A spawn failure fails the run with `worker_spawn_failed:<name>`; retry is
 *   bounded to exactly one retry; aggregation is deterministic (all workers
 *   awaited before the report write).
 *
 * Flags: `--workers N` (default `resolveWorkerCount()` = `BUN_TEST_WORKERS`),
 * `--pool N` (default 1), `--lane b|c|perf|all` (default all), `--dry-run`,
 * `--no-provision`, `--no-retry`, `--report <path>` (default
 * `tests/bun-lane-report.json`). `--lane perf` with `--workers > 1` is
 * rejected (`perf_lane_parallel_invalid`, TASK-557-06-L02: perf gates are
 * serial and CPU-isolated).
 *
 * Test seams (defaults match production behavior exactly, following
 * `run-bun-pure-lane.ts`):
 * - `BUN_LANE_MANIFEST_PATH` overrides the manifest path.
 * - `BUN_LANE_TIMINGS_PATH` overrides the timings path (missing -> `{}`).
 * - `BUN_LANE_BUN_BIN` overrides the spawned test binary (fake-worker tests
 *   substitute a stub that records invocation order and fails on a marker).
 */
import { readFile, writeFile } from "node:fs/promises";

import { partition, partitionSummary, type Partition } from "./bun-lane-partition";
import {
  assertConnectionBudget,
  resolveWorkerCount,
  resolveWorkerEnv,
  resolveWorkerPoolMax,
} from "./bun-lane-worker-url";
import { provisionWorkers } from "./bun-lane-provision";
import { runPureLane } from "./run-bun-pure-lane";
import { PERF_QUIET_ENV, PERF_SERIAL } from "./bun-lane-perf-policy";

const DEFAULT_MANIFEST_PATH = "tests/bun-lane-manifest.json";
const DEFAULT_TIMINGS_PATH = "tests/bun-lane-timings.json";
const DEFAULT_BUN_BIN = "bun";
const DEFAULT_REPORT_PATH = "tests/bun-lane-report.json";

type WorkerResult = {
  name: string;
  files: string[];
  exit: number;
  durationMs: number;
  attempted: number;
};

type Flags = {
  workers: number;
  pool: number;
  lane: "b" | "c" | "perf" | "all";
  dryRun: boolean;
  noProvision: boolean;
  noRetry: boolean;
  report: string;
};

/** Parse the CLI flags; unknown flags and invalid values throw named errors. */
export function parseFlags(argv: string[]): Flags {
  const flags: Flags = {
    workers: resolveWorkerCount(),
    pool: 1,
    lane: "all",
    dryRun: false,
    noProvision: false,
    noRetry: false,
    report: DEFAULT_REPORT_PATH,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--workers") {
      const raw = argv[++i];
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 1) throw new Error(`worker_count_invalid:${raw}`);
      flags.workers = value;
    } else if (arg === "--pool") {
      const raw = argv[++i];
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 1) throw new Error(`worker_pool_max_invalid:${raw}`);
      flags.pool = value;
    } else if (arg === "--lane") {
      const value = argv[++i];
      if (value !== "b" && value !== "c" && value !== "perf" && value !== "all") {
        throw new Error(`lane_invalid:${value}`);
      }
      flags.lane = value;
    } else if (arg === "--dry-run") {
      flags.dryRun = true;
    } else if (arg === "--no-provision") {
      flags.noProvision = true;
    } else if (arg === "--no-retry") {
      flags.noRetry = true;
    } else if (arg === "--report") {
      flags.report = argv[++i];
    } else {
      throw new Error(`flag_unknown:${arg}`);
    }
  }
  return flags;
}

/** Read a JSON map; a missing/unreadable file degrades to `{}`. */
export async function safeRead(path: string): Promise<Record<string, number>> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * Spawn one worker (`bun test --parallel=1 --timeout=15000 <files>`) with a
 * `[name]`-prefixed output stream. On a non-zero exit the whole file set is
 * retried once unless `noRetry`; `attempted` records 1 or 2 runs. A spawn
 * failure rejects with `worker_spawn_failed:<name>`.
 */
export async function runWorker(
  name: string,
  files: string[],
  env: Record<string, string>,
  noRetry: boolean
): Promise<WorkerResult> {
  const started = performance.now();
  const bunBin = process.env.BUN_LANE_BUN_BIN ?? DEFAULT_BUN_BIN;
  const result: WorkerResult = { name, files, exit: 1, durationMs: 0, attempted: 0 };

  const runOnce = (): Promise<number> =>
    new Promise<number>((resolve, reject) => {
      let proc: ReturnType<typeof Bun.spawn>;
      try {
        // Bun.spawn is the repo convention (scripts/run-bun-lane.ts).
        proc = Bun.spawn([bunBin, "test", "--parallel=1", "--timeout=15000", ...files], {
          env,
          stdout: "pipe",
          stderr: "pipe" as const,
        });
      } catch (cause) {
        reject(new Error(`worker_spawn_failed:${name}`, { cause }));
        return;
      }
      const decoder = new TextDecoder();
      const prefix = `[${name}] `;
      const drain = async (
        stream: ReadableStream<Uint8Array> | null,
        target: {
          write: (chunk: string) => unknown;
        }
      ): Promise<void> => {
        if (!stream) return;
        // Reader loop instead of `for await`: the DOM `ReadableStream` type in
        // this tsconfig lacks an async iterator contract, but `getReader()` is
        // always available on the runtime stream.
        const reader = stream.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          target.write(`${prefix}${decoder.decode(value)}`);
        }
      };
      (async () => {
        try {
          // Drain stdout and stderr concurrently so a chatty child can never
          // block on a full pipe while the other stream is being read.
          // `proc.stdout`/`proc.stderr` are typed as BodyInit by Bun's types
          // but are ReadableStreams at runtime under `stdout: "pipe"`.
          await Promise.all([
            drain(proc.stdout as ReadableStream<Uint8Array> | null, process.stdout),
            drain(proc.stderr as ReadableStream<Uint8Array> | null, process.stderr),
          ]);
          const exit = await proc.exited;
          resolve(typeof exit === "number" ? exit : 1);
        } catch (cause) {
          reject(new Error(`worker_spawn_failed:${name}`, { cause }));
        }
      })();
    });

  result.attempted = 1;
  let exit = await runOnce();
  if (exit !== 0 && !noRetry) {
    result.attempted = 2;
    exit = await runOnce();
  }
  result.exit = exit;
  result.durationMs = performance.now() - started;
  return result;
}

/**
 * Aggregate all worker results; returns `{results, totalMs}` where `totalMs`
 * is the max of per-worker durations (never a placeholder).
 */
export async function main(): Promise<void> {
  const flags = parseFlags(Bun.argv.slice(2));
  // Perf gates are serial and CPU-isolated: a parallel perf lane is invalid.
  if (flags.lane === "perf" && flags.workers > 1) {
    throw new Error("perf_lane_parallel_invalid");
  }

  const manifest = JSON.parse(
    await readFile(process.env.BUN_LANE_MANIFEST_PATH ?? DEFAULT_MANIFEST_PATH, "utf8")
  ) as { rows: Parameters<typeof partition>[0] };
  const timings = await safeRead(process.env.BUN_LANE_TIMINGS_PATH ?? DEFAULT_TIMINGS_PATH);

  // Lane-aware B worker allocation: `--lane all` reserves one slot for the
  // pure A lane; single-lane runs hand every DB worker to that lane.
  const reservedForPureA = flags.lane === "all" ? 1 : 0;
  const bWorkerCount = Math.max(1, flags.workers - 1 - reservedForPureA);
  const pool = resolveWorkerPoolMax(process.env, flags.pool);
  const part: Partition = partition(manifest.rows, timings, bWorkerCount);
  if (flags.dryRun) {
    console.log(partitionSummary(part, timings));
    return;
  }

  assertConnectionBudget(flags.workers, pool); // workers x pool <= 10, named error

  if (!flags.noProvision) {
    if (!process.env.DATABASE_DIRECT_URL) throw new Error("worker_direct_url_missing");
    // Abort on provision failure before any worker spawns (no half-provisioned
    // run): errors propagate out of main and exit non-zero.
    await provisionWorkers(process.env.DATABASE_DIRECT_URL, flags.workers);
  }

  const results: WorkerResult[] = [];
  const bEnvs = part.b.map((_, i) => resolveWorkerEnv(i, { poolMax: pool, fenceOffset: i + 1 }));
  const cIndex = part.b.length;
  const perfIndex = cIndex + 1;

  // B + C + pure A run in parallel (A has no DB dependency and needs no CPU
  // isolation); perf runs strictly after ALL of them (serial, CPU-isolated).
  const workers: Promise<WorkerResult>[] = [];
  if (flags.lane === "all" || flags.lane === "b") {
    workers.push(...part.b.map((files, i) => runWorker(`b${i}`, files, bEnvs[i], flags.noRetry)));
  }
  if (flags.lane === "all" || flags.lane === "c") {
    workers.push(
      runWorker(
        "c",
        part.c,
        resolveWorkerEnv(cIndex, { poolMax: pool, fenceOffset: cIndex + 1 }),
        flags.noRetry
      )
    );
  }
  if (flags.lane === "all") {
    workers.push(
      runPureLane().then((pure) => ({
        name: "a",
        files: pure.files,
        exit: pure.exit,
        durationMs: pure.durationMs,
        attempted: pure.attempted,
      }))
    );
  }
  results.push(...(await Promise.all(workers)));

  if (PERF_SERIAL && (flags.lane === "all" || flags.lane === "perf")) {
    const perf = await runWorker(
      "perf",
      part.perf,
      {
        ...resolveWorkerEnv(perfIndex, { poolMax: pool, fenceOffset: perfIndex + 1 }),
        ...PERF_QUIET_ENV, // additive overlay; never replaces the base env
      },
      flags.noRetry
    );
    results.push(perf);
  }

  const totalMs = Math.max(...results.map((r) => r.durationMs));
  await writeFile(flags.report, JSON.stringify({ results, totalMs }, null, 2));
  const failed = results.filter((r) => r.exit !== 0);
  for (const f of failed) {
    console.error(`[run-bun-parallel] FAILED worker ${f.name} (${f.exit})`);
  }
  process.exit(failed.length === 0 ? 0 : 1);
}

if (import.meta.main) {
  await main();
}
