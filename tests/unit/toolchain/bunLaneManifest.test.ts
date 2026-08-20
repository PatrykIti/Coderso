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
 *   adminThemes/tokenValidation -> A, content/entryService -> B, perf path override
 *   beating DB signals both ways),
 * - importing the module never writes the manifest (import.meta.main guard),
 * - the committed manifest equals a fresh in-process re-run of the classifier
 *   (byte-identical `rows`, ignoring `generatedAt`),
 * - the manifest rows are internally consistent (valid buckets, C rows carry
 *   a conflictKeys array + cWriteGlobal boolean, no out-of-lane file).
 *
 * The classifier resolves lane paths relative to the repo root, so this suite
 * pins the working directory to the repo root on load.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, expect, test } from "bun:test";

import {
  classify,
  collectConflictKeys,
  collectLaneFiles,
  hasCWriteGlobal,
  LANE_DIRS,
  reachesDbTransitively,
} from "../../../scripts/bun-lane-classify";

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
type BucketRowV2 = {
  file: string;
  bucket: Bucket;
  weightMs?: number;
  conflictKeys: string[];
  cWriteGlobal: boolean;
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
    .filter((file) => existsSync(path.join(ROOT, file))) // working tree is authoritative (uncommitted deletions still sit in the index)
    .sort();
}

function readManifestRows(): BucketRowV2[] {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
    generatedAt: string;
    rows: BucketRowV2[];
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
  expect(settings.conflictKeys).toContain("site.contentRoutes");
  expect(settings.conflictKeys).toContain("site.adminBaseUrl");
  expect(settings.cWriteGlobal).toBe(true); // setSetting in a before-hook

  const validator = await classify("tests/unit/adminThemes/tokenValidation.test.ts");
  expect(validator.bucket).toBe("A");
  expect(validator.conflictKeys).toEqual([]);
  expect(validator.cWriteGlobal).toBe(false);

  const entryService = await classify("tests/unit/content/entryService.test.ts");
  expect(entryService.bucket).toBe("B");

  // perf path override beats DB signals in both directions: the gate file has
  // no core/db import, the ingestion file imports core/db.
  const perfGate = await classify("tests/perf/codersoPerformanceGate.test.ts");
  expect(perfGate.bucket).toBe("perf");
  const perfIngestion = await classify("tests/perf/analyticsIngestion.test.ts");
  expect(perfIngestion.bucket).toBe("perf");
});

test("classify rows carry NO weightMs field (all four branches)", async () => {
  // TASK-578: the classifier has no measured timings and must OMIT the
  // optional weightMs field instead of emitting `weightMs: 0`. A `0` is a
  // REAL weight to the partitioner (`??` never treats it as absent), so with
  // an empty timings map every B file would fall back to 0 and LPT would dump
  // the whole lane onto one worker. Every emission branch must stay absent.
  const perf = await classify("tests/perf/codersoPerformanceGate.test.ts");
  const a = await classify("tests/unit/adminThemes/tokenValidation.test.ts");
  const c = await classify("tests/unit/settings/settingsService.test.ts");
  const b = await classify("tests/unit/content/entryService.test.ts");
  expect([perf.bucket, a.bucket, c.bucket, b.bucket]).toEqual(["perf", "A", "C", "B"]);
  for (const row of [perf, a, c, b]) {
    expect(Object.hasOwn(row, "weightMs")).toBe(false);
    expect(row.weightMs).toBeUndefined();
  }
});

test("transitive DB-coupling is detected through the value-import closure", async () => {
  // cache.test.ts imports `siteCache` -> `settingsService` -> `core/db/client`
  // with no direct `core/db` import of its own; the pure A lane strips
  // DATABASE_URL, so this file must NOT be A (module load would throw
  // `DATABASE_URL is not set`).
  expect(reachesDbTransitively("tests/unit/site/cache.test.ts")).toBe(true);
  expect((await classify("tests/unit/site/cache.test.ts")).bucket).not.toBe("A");

  // A genuinely DB-free file stays A.
  expect(reachesDbTransitively("tests/unit/adminThemes/tokenValidation.test.ts")).toBe(false);
  expect((await classify("tests/unit/adminThemes/tokenValidation.test.ts")).bucket).toBe("A");
});

test("transitive detection follows re-exports and skips type-only imports", async () => {
  // schema.ts re-exports tables via `export * from "./tables/..."`, and
  // securitySettings imports `../../db/schema`; cors.test.ts reaches the DB
  // schema transitively through securitySettings even though it never names
  // core/db itself.
  expect(reachesDbTransitively("tests/integration/routes/cors.test.ts")).toBe(true);
  expect((await classify("tests/integration/routes/cors.test.ts")).bucket).not.toBe("A");
});

test("transitive detection follows statically-declared file-URL loads", async () => {
  // cli-registry.test.ts imports the runtime-smoke registry, whose
  // `loadFixedAdapter` does `await import(pathToFileURL(adapterPath).href)`
  // where adapterPath comes from the static ADAPTER_PATHS string map
  // (e.g. "scripts/runtime-smoke/adapters/task-554.ts"). That adapter module
  // statically reaches core/db/client, so at test runtime the dynamic load
  // throws `DATABASE_URL is not set` in the pure A lane. The classifier must
  // treat those static path literals as part of the registry's closure.
  expect(reachesDbTransitively("scripts/runtime-smoke/registry.ts")).toBe(true);
  expect(reachesDbTransitively("tests/unit/runtime-smoke/cli-registry.test.ts")).toBe(true);
  expect((await classify("tests/unit/runtime-smoke/cli-registry.test.ts")).bucket).not.toBe("A");
});

test("module-scope await imports are followed, lazy and type forms are not", async () => {
  // detail-page-runtime-lite.test.ts loads the real public site at module
  // scope (`const { handlePublicRequest } = await import(".../publicSite")`),
  // and publicSite's static closure reaches core/db/client through
  // previewService. In the pure A lane that top-level await throws
  // `DATABASE_URL is not set`, so the file must not stay A.
  expect(reachesDbTransitively("tests/integration/runtime/detail-page-runtime-lite.test.ts")).toBe(
    true
  );
  expect(
    (await classify("tests/integration/runtime/detail-page-runtime-lite.test.ts")).bucket
  ).not.toBe("A");

  // postBlockRuntimeMapper only mentions mediaService via a lazy function-body
  // `await import(...)` and a `typeof import(...)` type query, neither of which
  // loads the module at evaluation time, so it must NOT be flagged as DB
  // coupled through those forms. post-rendering-parity.test.tsx reaches it
  // transitively and genuinely stays DB-free.
  expect(reachesDbTransitively("core/services/posts/runtime/postBlockRuntimeMapper.ts")).toBe(
    false
  );
  expect(reachesDbTransitively("tests/integration/runtime/post-rendering-parity.test.tsx")).toBe(
    false
  );
});

test("module-scope mock registrations stub the awaited graph (mock-aware walk)", async () => {
  // detailPageRuntimeResolver.test.ts mocks core/db/client (and the binding
  // resolver) at module scope before awaiting detailPageRuntimeResolver. The
  // client mock stubs the whole DB access surface, including the pure
  // table-definitions schema module the resolver imports, so the file is
  // genuinely DB-free and stays A.
  expect(reachesDbTransitively("tests/unit/content/detailPageRuntimeResolver.test.ts")).toBe(false);
  expect((await classify("tests/unit/content/detailPageRuntimeResolver.test.ts")).bucket).toBe("A");
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

test("manifest rows are internally consistent", () => {
  const rows = readManifestRows();
  const golden = gitGoldenLaneFiles();
  expect(rows.length).toBe(golden.length);

  for (const row of rows) {
    expect(BUCKETS).toContain(row.bucket);
    expect(row.file).toMatch(/\.test\.(ts|tsx)$/);
    expect(LANE_DIRS.some((dir) => row.file.startsWith(`${dir}/`))).toBe(true);
    // v2 row shape: conflictKeys is a required array on every row.
    expect(Array.isArray(row.conflictKeys)).toBe(true);
    expect(typeof row.cWriteGlobal).toBe("boolean");
    // TASK-578: the classifier omits weightMs (no measured timings), so no
    // committed row may carry `weightMs: 0` and break the DEFAULT_WEIGHT
    // fallback when the timings file is missing.
    expect(Object.hasOwn(row, "weightMs")).toBe(false);
  }
});

test("every C row carries the v2 fields and matches a fresh signal scan", () => {
  const rows = readManifestRows();
  const cRows = rows.filter((row) => row.bucket === "C");
  expect(cRows.length).toBeGreaterThan(0);
  for (const row of cRows) {
    expect(Array.isArray(row.conflictKeys)).toBe(true);
    expect(typeof row.cWriteGlobal).toBe("boolean");
    const src = readFileSync(path.join(ROOT, row.file), "utf8");
    // Consistency assertion: no committed cWriteGlobal may drift from the
    // classifier rule (a `false` row must really be read-only), and the
    // conflict set must equal ALL matched signals in classifier order.
    expect(hasCWriteGlobal(src)).toBe(row.cWriteGlobal);
    expect(collectConflictKeys(src)).toEqual(row.conflictKeys);
  }
});

test("every A row is truly DB-free at module load (pure-lane invariant)", () => {
  // The pure A lane strips DATABASE_URL and runs with --env-file=/dev/null, so
  // an A row whose static value-import closure reaches core/db/client or
  // core/db/schema would throw `DATABASE_URL is not set` at import time and
  // fail the whole lane. This pins the TASK-557 transitive-coupling fix: the
  // committed manifest must never put a transitively DB-coupled file in A.
  const dbCoupled = readManifestRows()
    .filter((row) => row.bucket === "A")
    .filter((row) => reachesDbTransitively(row.file))
    .map((row) => row.file);
  expect(dbCoupled).toEqual([]);
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
