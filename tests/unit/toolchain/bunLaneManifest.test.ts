/**
 * Regression tests for the static Bun-lane classifier and its committed
 * manifest (TASK-557-01-L01).
 *
 * The classifier walks the exact `test:bun` lane set from package.json
 * (LANE_DIRS) and emits `tests/bun-lane-manifest.json`, which is the single
 * source of truth for the TASK-557-05 partitioner. These tests pin:
 *
 * - the collected lane file set equals the git-derived golden set (tracked
 *   plus untracked non-ignored `*.test.{ts,tsx}` files inside LANE_DIRS),
 * - the contract classification examples (settingsService -> C,
 *   widgets/validator -> A, content/entryService -> B, perf path override
 *   beating DB signals both ways),
 * - importing the module never writes the manifest (import.meta.main guard),
 * - the committed manifest equals a fresh in-process re-run of the classifier
 *   (byte-identical `rows`, ignoring `generatedAt`),
 * - the manifest rows are internally consistent (valid buckets, C rows carry
 *   a conflictKey, no out-of-lane file).
 *
 * The classifier resolves lane paths relative to the repo root, so this suite
 * pins the working directory to the repo root on load.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, expect, test } from "bun:test";

import { classify, collectLaneFiles, LANE_DIRS } from "../../../scripts/bun-lane-classify";

const ROOT = path.resolve(import.meta.dir, "../../..");
const MANIFEST_PATH = path.join(ROOT, "tests", "bun-lane-manifest.json");
const CLASSIFIER_PATH = path.join(ROOT, "scripts", "bun-lane-classify.ts");

// Bun test runs each test file in its own process, so a cwd pin here cannot
// affect other suites. The classifier reads `tests/...` relative to cwd.
if (process.cwd() !== ROOT) {
  process.chdir(ROOT);
}

const BUCKETS = ["perf", "A", "B", "C"] as const;
type Bucket = (typeof BUCKETS)[number];
type BucketRow = {
  file: string;
  bucket: Bucket;
  weightMs?: number;
  conflictKey?: string;
};

/**
 * Golden lane set: `git ls-files` over `tests/<glob>.test.{ts,tsx}` (tracked
 * plus untracked non-ignored, so a not-yet-committed lane test still counts)
 * intersected with LANE_DIRS. This is exactly the set `bun test` would run
 * over the 9 lane directories.
 */
function gitGoldenLaneFiles(): string[] {
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "--", "tests/**/*.test.ts*"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
  return out
    .split("\n")
    .filter(Boolean)
    .filter((file) => LANE_DIRS.some((dir) => file.startsWith(`${dir}/`)))
    .sort();
}

function readManifestRows(): BucketRow[] {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    generatedAt: string;
    rows: BucketRow[];
  };
  return manifest.rows;
}

test("collectLaneFiles equals the git golden lane set", async () => {
  const collected = await collectLaneFiles();
  expect(collected).toEqual(gitGoldenLaneFiles());
});

test("collectLaneFiles returns deterministic sorted relative paths", async () => {
  const first = await collectLaneFiles();
  const second = await collectLaneFiles();
  expect(first).toEqual(second);
  expect(first.length).toBeGreaterThan(0);
  expect(first.every((file) => !path.isAbsolute(file))).toBe(true);
  expect(first.every((file) => file.startsWith("tests/"))).toBe(true);
  expect(first).toEqual([...first].sort());
});

test("classify examples match the contract signals", async () => {
  const settings = await classify("tests/unit/settings/settingsService.test.ts");
  expect(settings.bucket).toBe("C");
  expect(settings.conflictKey).toBe("site.contentRoutes");

  const validator = await classify("tests/unit/widgets/validator.test.ts");
  expect(validator.bucket).toBe("A");

  const entryService = await classify("tests/unit/content/entryService.test.ts");
  expect(entryService.bucket).toBe("B");

  // perf path override beats DB signals in both directions: the gate file has
  // no core/db import, the ingestion file imports core/db.
  const perfGate = await classify("tests/perf/codersoPerformanceGate.test.ts");
  expect(perfGate.bucket).toBe("perf");
  const perfIngestion = await classify("tests/perf/analyticsIngestion.test.ts");
  expect(perfIngestion.bucket).toBe("perf");
});

test("classify rejects unreadable files with a named error", async () => {
  await expect(classify("tests/unit/toolchain/__no_such_lane_test__.test.ts")).rejects.toThrow(
    /manifest_read_failed:tests\/unit\/toolchain\/__no_such_lane_test__\.test\.ts/
  );
});

test("importing the module does not write the manifest", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "bun-lane-import-"));
  try {
    // A broken import.meta.main guard would run main() here, which either
    // writes `tests/bun-lane-manifest.json` into the temp cwd or fails on the
    // missing lane dirs; both make execFileSync fail or the assertion fail.
    execFileSync("bun", ["-e", `import(${JSON.stringify(CLASSIFIER_PATH)}).then(() => {})`], {
      cwd: tmp,
      stdio: "ignore",
    });
    expect(existsSync(path.join(tmp, "tests", "bun-lane-manifest.json"))).toBe(false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("committed manifest equals a fresh classification run", async () => {
  const onDiskRows = readManifestRows();
  const files = await collectLaneFiles();
  const freshRows = await Promise.all(files.map(classify));
  expect(JSON.stringify(freshRows)).toBe(JSON.stringify(onDiskRows));
});

test("manifest rows are internally consistent", async () => {
  const rows = readManifestRows();
  const golden = gitGoldenLaneFiles();
  expect(rows.length).toBe(golden.length);

  for (const row of rows) {
    expect(BUCKETS).toContain(row.bucket);
    expect(row.file).toMatch(/\.test\.(ts|tsx)$/);
    expect(LANE_DIRS.some((dir) => row.file.startsWith(`${dir}/`))).toBe(true);
    if (row.bucket === "C") {
      expect(typeof row.conflictKey).toBe("string");
    }
  }
});

// The import-guard subprocess above only exercises a fresh process; the
// module-level static import in this file must also stay side-effect free.
test("static import exposes the classifier contract", () => {
  expect(typeof collectLaneFiles).toBe("function");
  expect(typeof classify).toBe("function");
  expect(LANE_DIRS.length).toBe(10);
  expect(LANE_DIRS).toContain("tests/unit");
  expect(LANE_DIRS).toContain("tests/perf");
  expect(LANE_DIRS).toContain("tests/integration/toolchain");
});

afterAll(() => {
  // The suite never writes the manifest; verify the committed file is intact.
  expect(readManifestRows().length).toBeGreaterThan(0);
});
