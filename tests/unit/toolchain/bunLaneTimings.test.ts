/**
 * Regression tests for the Bun-lane timing probe (TASK-557-01-L02).
 *
 * `scripts/bun-lane-time.ts` measures wall time per lane file serially and
 * merges the result into `tests/bun-lane-timings.json`, which the TASK-557-05
 * weighted partitioner consumes. These tests pin:
 *
 * - `mergeTimings(prev, next)` keeps the min per overlapping key, preserves
 *   unknown prev keys, adds new next keys, and never mutates its inputs
 *   (deterministic, byte-stable for identical inputs),
 * - empty prev or empty next inputs behave correctly,
 * - `timeFile` resolves (never hangs) for a missing file, without needing a
 *   real database,
 * - importing the module never runs the probe (import.meta.main guard), so no
 *   `tests/bun-lane-timings.json` is created on import.
 *
 * Weight derivation (`weightMs` fallback to bucket defaults) and the
 * `--dry-run` projected per-worker sums belong to the runner leaves
 * TASK-557-05-L01 / TASK-557-05-L03 and are not tested here.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, expect, test } from "bun:test";

import { mergeTimings, timeFile } from "../../../scripts/bun-lane-time";

const ROOT = path.resolve(import.meta.dir, "../../..");
const TIMINGS_PATH = path.join(ROOT, "tests", "bun-lane-timings.json");
const PROBE_PATH = path.join(ROOT, "scripts", "bun-lane-time.ts");

// Bun test runs each test file in its own process, so a cwd pin here cannot
// affect other suites. The probe spawns `bun test` relative to the repo root.
if (process.cwd() !== ROOT) {
  process.chdir(ROOT);
}

test("mergeTimings keeps min for overlapping keys and preserves unknown prev keys", () => {
  const prev = {
    "tests/unit/a.test.ts": 5_000,
    "tests/unit/legacy.test.ts": 7_000,
    "tests/integration/shared.test.ts": 9_000,
  };
  const next = {
    "tests/unit/a.test.ts": 3_000,
    "tests/integration/shared.test.ts": 12_000,
    "tests/integration/new.test.ts": 4_000,
  };

  const merged = mergeTimings(prev, next);

  // Overlapping keys keep the minimum, prev-only keys survive, next-only keys
  // are added.
  expect(merged).toEqual({
    "tests/unit/a.test.ts": 3_000,
    "tests/unit/legacy.test.ts": 7_000,
    "tests/integration/shared.test.ts": 9_000,
    "tests/integration/new.test.ts": 4_000,
  });
  // Returns a NEW record; inputs are never mutated.
  expect(merged).not.toBe(prev);
  expect(merged).not.toBe(next);
  expect(prev).toEqual({
    "tests/unit/a.test.ts": 5_000,
    "tests/unit/legacy.test.ts": 7_000,
    "tests/integration/shared.test.ts": 9_000,
  });
  // Byte-stable: identical inputs produce identical serialized output.
  expect(JSON.stringify(merged)).toBe(JSON.stringify(mergeTimings(prev, next)));
});

test("mergeTimings handles empty prev and empty next", () => {
  const next = { "tests/unit/a.test.ts": 1_000 };
  const prev = { "tests/unit/b.test.ts": 2_000 };

  expect(mergeTimings({}, next)).toEqual(next);
  expect(mergeTimings({}, next)).not.toBe(next);
  expect(mergeTimings(prev, {})).toEqual(prev);
  expect(mergeTimings(prev, {})).not.toBe(prev);
  expect(mergeTimings({}, {})).toEqual({});
});

test("timeFile resolves without hanging for a missing file", async () => {
  // No DATABASE_DIRECT_URL and no real database are needed: bun test exits
  // fast with a non-zero code for a missing test file, and timeFile measures
  // wall time regardless of the exit code.
  const started = performance.now();
  const elapsed = await timeFile(
    "tests/unit/toolchain/__no_such_timing_probe_file__.test.ts",
    "postgres://user:pass@127.0.0.1:1/none"
  );

  expect(typeof elapsed).toBe("number");
  expect(elapsed).toBeGreaterThanOrEqual(0);
  // Well below the 120s SIGKILL ceiling; a hung spawn would resolve only at
  // ~120s and fail this bound.
  expect(performance.now() - started).toBeLessThan(60_000);
});

test("importing the module does not run the probe", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "bun-lane-time-import-"));
  try {
    // A broken import.meta.main guard would run main() here, which either
    // writes `tests/bun-lane-timings.json` into the temp cwd or throws on the
    // missing DATABASE_DIRECT_URL; both make execFileSync fail or the
    // assertion fail.
    execFileSync("bun", ["-e", `import(${JSON.stringify(PROBE_PATH)}).then(() => {})`], {
      cwd: tmp,
      stdio: "ignore",
    });
    expect(existsSync(path.join(tmp, "tests", "bun-lane-timings.json"))).toBe(false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// The import-guard subprocess above only exercises a fresh process; the
// module-level static import in this file must also stay side-effect free.
test("static import exposes the probe contract", () => {
  expect(typeof timeFile).toBe("function");
  expect(typeof mergeTimings).toBe("function");
});

afterAll(() => {
  // The suite never writes timings; the committed file must remain intact.
  expect(existsSync(TIMINGS_PATH)).toBe(true);
});
