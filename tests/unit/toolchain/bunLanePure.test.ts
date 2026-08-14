/**
 * Pure regression tests for the A-lane runner (TASK-557-06-L01,
 * `scripts/run-bun-pure-lane.ts`).
 *
 * `runPureLane()` runs exactly the A manifest files with
 * `bun test --parallel=16 --timeout=15000` and strips `DATABASE_URL` /
 * `DATABASE_DIRECT_URL` from the child env so any "DB-free" file that touches
 * the DB fails loudly instead of silently writing to `public`. These tests
 * pin that contract without any database or real child run:
 *
 * - an empty A set returns `{exit: 0, durationMs: 0, files: [], attempted: 0}`
 *   immediately, without spawning anything,
 * - the child env never contains `DATABASE_URL` or `DATABASE_DIRECT_URL`
 *   (asserted via a stub `bun` that dumps its env to a file) while every
 *   other variable is inherited,
 * - the child argv is exactly `test --parallel=16 --timeout=15000` plus the A
 *   manifest files (a manifest row in another bucket is never run),
 * - a DB-dependent file fails the lane: the stub exits non-zero, the lane is
 *   retried once (attempted 2), and `runPureLane` propagates the retry's exact
 *   exit code,
 * - retry-once flake guard mirrors the B/C workers: a flaky first run that
 *   passes on retry reports `attempted: 2` with exit 0; a lane that fails both
 *   attempts reports `attempted: 2` with the retry's non-zero exit;
 *   `{ noRetry: true }` keeps `attempted: 1` even on failure (the
 *   orchestrator's `--no-retry` seam),
 * - error contract: unreadable manifest -> `manifest_read_failed:<path>`,
 *   spawn failure -> `pure_lane_spawn_failed:<bin>` (never retried).
 *
 * The runner reads `BUN_LANE_MANIFEST_PATH` and `BUN_LANE_BUN_BIN` per call,
 * so each test points it at a throwaway manifest and a throwaway executable
 * stub; the committed manifest and the real `bun` are never touched. Bun test
 * runs each test file in its own process, so pinning the cwd here cannot
 * affect other suites, and process.env mutations are restored in `finally`.
 */
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, expect, test } from "bun:test";

import { runPureLane } from "../../../scripts/run-bun-pure-lane";

const ROOT = path.resolve(import.meta.dir, "../../..");

if (process.cwd() !== ROOT) {
  process.chdir(ROOT);
}

const tmpDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}

function writeManifest(dir: string, rows: unknown[]): string {
  const manifestPath = path.join(dir, "manifest.json");
  writeFileSync(
    manifestPath,
    JSON.stringify({ generatedAt: "2026-01-01T00:00:00.000Z", rows }, null, 2)
  );
  return manifestPath;
}

/**
 * Throwaway executable that stands in for `bun`. It dumps its full child env
 * to `dumpPath`, writes its argv to `<dir>/args.txt`, and exits `exitCode`.
 * The paths are JSON-stringified into the script so shell quoting stays valid.
 */
function writeStubBun(
  dir: string,
  exitCode: number
): { bin: string; envDump: string; args: string } {
  const bin = path.join(dir, "fake-bun");
  const envDump = path.join(dir, "env-dump.txt");
  const args = path.join(dir, "args.txt");
  writeFileSync(
    bin,
    [
      "#!/bin/sh",
      `env > ${JSON.stringify(envDump)}`,
      `printf '%s\\n' "$@" > ${JSON.stringify(args)}`,
      `exit ${exitCode}`,
      "",
    ].join("\n")
  );
  chmodSync(bin, 0o755);
  return { bin, envDump, args };
}

function setLaneEnv(manifestPath: string, bunBin: string): void {
  process.env.BUN_LANE_MANIFEST_PATH = manifestPath;
  process.env.BUN_LANE_BUN_BIN = bunBin;
}

/**
 * Throwaway executable that stands in for `bun` and fails exactly once: the
 * first invocation exits `firstExit`, later invocations exit `secondExit` (a
 * counter file carries the state across spawns). Same env dump + argv
 * recording as `writeStubBun`, so the retry assertions can pin the guard and
 * the file set on both attempts.
 */
function writeFlakyStubBun(
  dir: string,
  firstExit: number,
  secondExit: number
): { bin: string; envDump: string; args: string; counter: string } {
  const bin = path.join(dir, "fake-bun-flaky");
  const envDump = path.join(dir, "env-dump.txt");
  const args = path.join(dir, "args.txt");
  const counter = path.join(dir, "fail-counter");
  writeFileSync(
    bin,
    [
      "#!/bin/sh",
      `env > ${JSON.stringify(envDump)}`,
      `printf '%s\\n' "$@" > ${JSON.stringify(args)}`,
      `if [ -f ${JSON.stringify(counter)} ]; then exit ${secondExit}; fi`,
      `: > ${JSON.stringify(counter)}`,
      `exit ${firstExit}`,
      "",
    ].join("\n")
  );
  chmodSync(bin, 0o755);
  return { bin, envDump, args, counter };
}

function clearLaneEnv(): void {
  delete process.env.BUN_LANE_MANIFEST_PATH;
  delete process.env.BUN_LANE_BUN_BIN;
}

test("an A-less manifest returns exit 0 fast without spawning", async () => {
  const dir = makeTempDir("bun-pure-lane-empty-");
  try {
    const manifestPath = writeManifest(dir, [
      { file: "tests/integration/routes/pages.test.ts", bucket: "B", weightMs: 0 },
      { file: "tests/perf/codersoPerformanceGate.test.ts", bucket: "perf", weightMs: 0 },
    ]);
    setLaneEnv(manifestPath, path.join(dir, "must-not-run"));
    const result = await runPureLane();
    expect(result).toEqual({ exit: 0, durationMs: 0, files: [], attempted: 0 });
    // No child was spawned: the stub binary was never invoked.
    expect(existsSync(path.join(dir, "args.txt"))).toBe(false);
  } finally {
    clearLaneEnv();
  }
});

test("child env strips DATABASE_URL and DATABASE_DIRECT_URL but inherits everything else", async () => {
  const dir = makeTempDir("bun-pure-lane-env-");
  try {
    const aFiles = [
      "tests/integration/plugins/assets.test.ts",
      "tests/unit/widgets/validator.test.ts",
    ];
    const manifestPath = writeManifest(dir, [
      ...aFiles.map((file) => ({ file, bucket: "A", weightMs: 0 })),
      { file: "tests/integration/routes/pages.test.ts", bucket: "B", weightMs: 0 },
    ]);
    const stub = writeStubBun(dir, 0);
    setLaneEnv(manifestPath, stub.bin);
    process.env.DATABASE_URL = "postgres://pure-lane-stub/db";
    process.env.DATABASE_DIRECT_URL = "postgres://pure-lane-direct-stub/db";
    process.env.PURE_LANE_SENTINEL = "inherited";
    try {
      const result = await runPureLane();
      expect(result.exit).toBe(0);
      expect(result.attempted).toBe(1);
      expect(result.files).toEqual(aFiles);

      const envLines = readFileSync(stub.envDump, "utf8").split("\n");
      expect(envLines).toContain("PURE_LANE_SENTINEL=inherited");
      expect(envLines.some((line) => line.startsWith("DATABASE_URL="))).toBe(false);
      expect(envLines.some((line) => line.startsWith("DATABASE_DIRECT_URL="))).toBe(false);

      // Exactly the A files are run, with the pinned flags and the real `bun`
      // argv shape (`bun test --env-file=/dev/null --parallel=16 --timeout=15000
      // <a-files>`). `--env-file=/dev/null` disables Bun's `.env` autoload in
      // the child, which would otherwise re-inject the stripped DATABASE_*
      // values and defeat the fail-loud guard.
      const args = readFileSync(stub.args, "utf8").trim().split("\n");
      expect(args).toEqual([
        "test",
        "--env-file=/dev/null",
        "--parallel=16",
        "--timeout=15000",
        ...aFiles,
      ]);
    } finally {
      delete process.env.DATABASE_URL;
      delete process.env.DATABASE_DIRECT_URL;
      delete process.env.PURE_LANE_SENTINEL;
    }
  } finally {
    clearLaneEnv();
  }
});

test("a DB-dependent file fails both attempts and the retry's exit propagates exactly", async () => {
  const dir = makeTempDir("bun-pure-lane-fail-");
  try {
    // A real DB-backed file (bucket B in the committed manifest) misclassified
    // into A: the child `bun test` fails, the lane retries once, and the
    // retry's exit must propagate. The always-7 stub fails both attempts.
    const dbFile = "tests/integration/routes/pages.test.ts";
    const manifestPath = writeManifest(dir, [{ file: dbFile, bucket: "A", weightMs: 0 }]);
    const stub = writeStubBun(dir, 7);
    setLaneEnv(manifestPath, stub.bin);
    const result = await runPureLane();
    expect(result.exit).toBe(7);
    expect(result.files).toEqual([dbFile]);
    expect(result.attempted).toBe(2); // failed once, retried exactly once
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    // The failing child still received the DB-free env guard on both attempts.
    const envLines = readFileSync(stub.envDump, "utf8").split("\n");
    expect(envLines.some((line) => line.startsWith("DATABASE_URL="))).toBe(false);
  } finally {
    clearLaneEnv();
  }
});

test("a flaky first run is retried once and the retry's exit 0 wins", async () => {
  const dir = makeTempDir("bun-pure-lane-flaky-");
  try {
    const aFiles = ["tests/unit/widgets/validator.test.ts"];
    const manifestPath = writeManifest(dir, [{ file: aFiles[0], bucket: "A", weightMs: 0 }]);
    const stub = writeFlakyStubBun(dir, 1, 0);
    setLaneEnv(manifestPath, stub.bin);
    const result = await runPureLane();
    expect(result.exit).toBe(0); // the retry passes
    expect(result.attempted).toBe(2); // both attempts recorded truthfully
    expect(result.files).toEqual(aFiles);
    // Both attempts ran the same A file set with the fail-loud guard intact.
    const envLines = readFileSync(stub.envDump, "utf8").split("\n");
    expect(envLines.some((line) => line.startsWith("DATABASE_URL="))).toBe(false);
    const args = readFileSync(stub.args, "utf8").trim().split("\n");
    expect(args).toEqual([
      "test",
      "--env-file=/dev/null",
      "--parallel=16",
      "--timeout=15000",
      ...aFiles,
    ]);
  } finally {
    clearLaneEnv();
  }
});

test("noRetry keeps attempted at 1 even when the lane fails", async () => {
  const dir = makeTempDir("bun-pure-lane-noretry-");
  try {
    const aFiles = ["tests/unit/widgets/validator.test.ts"];
    const manifestPath = writeManifest(dir, [{ file: aFiles[0], bucket: "A", weightMs: 0 }]);
    const stub = writeFlakyStubBun(dir, 7, 7);
    setLaneEnv(manifestPath, stub.bin);
    const result = await runPureLane({ noRetry: true });
    expect(result.exit).toBe(7);
    expect(result.attempted).toBe(1); // the noRetry seam disables the retry
    expect(result.files).toEqual(aFiles);
  } finally {
    clearLaneEnv();
  }
});

test("an unreadable manifest rejects with manifest_read_failed:<path>", async () => {
  const dir = makeTempDir("bun-pure-lane-manifest-");
  try {
    const missing = path.join(dir, "no-such-manifest.json");
    setLaneEnv(missing, "bun");
    await expect(runPureLane()).rejects.toThrow(`manifest_read_failed:${missing}`);
  } finally {
    clearLaneEnv();
  }
});

test("a spawn failure rejects with pure_lane_spawn_failed:<bin>", async () => {
  const dir = makeTempDir("bun-pure-lane-spawn-");
  try {
    const manifestPath = writeManifest(dir, [
      { file: "tests/unit/widgets/validator.test.ts", bucket: "A", weightMs: 0 },
    ]);
    const missingBin = path.join(dir, "no-such-binary");
    setLaneEnv(manifestPath, missingBin);
    await expect(runPureLane()).rejects.toThrow(`pure_lane_spawn_failed:${missingBin}`);
  } finally {
    clearLaneEnv();
  }
});

afterAll(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});
