/** Read-only Bun-lane membership checks for the fixed TASK-551 suite set. */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { LANE_DIRS } from "../bun-lane-classify";
import { fail } from "./contracts";

export type BunLaneManifestRow = Readonly<{
  file: string;
  bucket: "perf" | "A" | "B" | "C";
  conflictKeys: readonly string[];
  cWriteGlobal: boolean;
}>;
export type BunLaneManifest = Readonly<{ rows: readonly BunLaneManifestRow[] }>;
export type BunLaneMembershipInput = Readonly<{
  script: string;
  requireFiles: boolean;
  exists?: (relativePath: string) => boolean;
  manifest?: BunLaneManifest;
}>;
export type Task551BunLaneMembershipState =
  "legal-initial" | "recovery-initial" | "post-finalization";

const ROOT = path.resolve(import.meta.dir, "../..");
const TEST_FILE = /^tests\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.test\.(?:ts|tsx)$/;
const TASK551_L01_BUN_PATHS = new Set([
  "tests/perf/database-query-inventory.test.ts",
  "tests/integration/server/task551BunLaneMembership.test.ts",
]);
/**
 * Contract correction (2026-09-02, L11 classifier-materialization barrier): these
 * five lane test files are contracted products of TASK-551-02-L02 and TASK-551-11,
 * each pinned by literal path in its own owning contract. They are unplanned in
 * the TASK-551-01-L01 manifest slice yet must never fail it; only an unplanned
 * `task551`-marked path outside this closed list fails.
 */
export const TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS = Object.freeze([
  "tests/integration/server/task551DatabaseLifecycle.test.ts",
  "tests/integration/server/task551RuntimeEntrypoints.test.ts",
  "tests/unit/workflows/task551AuthorAudit.test.ts",
  "tests/unit/workflows/task551EvidenceContract.test.ts",
  "tests/unit/workflows/task551WorkflowContracts.test.ts",
]);
const TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATH_SET = new Set(
  TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS
);
const MANIFEST_ROOT_KEYS = ["generatedAt", "rows"] as const;
const MANIFEST_ROW_KEYS = ["file", "bucket", "conflictKeys", "cWriteGlobal"] as const;
const RUNNER_COMMAND_TOKENS = Object.freeze([
  "bun",
  "scripts/run-bun-parallel.ts",
  "--lane",
  "all",
]);
const TEST_BUN_ENV_PREFIX_TOKENS = Object.freeze([
  "set",
  "-a",
  "&&",
  "{",
  "[",
  "!",
  "-f",
  ".env",
  "]",
  "||",
  ".",
  "./.env",
  ";",
  "}",
  "&&",
  "set",
  "+a",
  "&&",
]);
const VERTICAL_SEPARATOR = /[\r\n\v\f\u0085\u2028\u2029]/u;
const NON_ASCII_OR_NON_HORIZONTAL_SEPARATOR = /[^\S\r\n\t ]/u;

function hasDotPathSegment(value: string): boolean {
  return value.split("/").some((segment) => segment === "." || segment === "..");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function canonicalBunLaneRootsFromClassifier(
  laneDirs: readonly string[] = LANE_DIRS
): readonly string[] {
  const roots = [...laneDirs];
  if (
    roots.length === 0 ||
    roots.some(
      (root) =>
        hasDotPathSegment(root) || !/^tests\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(root)
    )
  )
    fail("query_inventory_invalid", "lane-roots");
  if (new Set(roots).size !== roots.length) fail("query_inventory_invalid", "lane-roots");
  return Object.freeze(roots.sort());
}

export const EXECUTED_ROOTS = canonicalBunLaneRootsFromClassifier();

export function readRootPackageScript(scriptName: "test:bun"): string {
  try {
    const parsed = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      scripts?: Record<string, unknown>;
    };
    const script = parsed.scripts?.[scriptName];
    if (typeof script !== "string" || script.length === 0)
      fail("query_inventory_invalid", "package-script");
    return script;
  } catch (error) {
    if (error instanceof Error && error.name === "InventoryError") throw error;
    return fail("query_inventory_invalid", "package-script");
  }
}

export function parseShippedTestBunCommand(
  script: string
): Readonly<{ invokesParallelOrchestrator: boolean }> {
  if (typeof script !== "string") fail("query_inventory_invalid", "package-script");
  if (VERTICAL_SEPARATOR.test(script) || NON_ASCII_OR_NON_HORIZONTAL_SEPARATOR.test(script))
    return Object.freeze({ invokesParallelOrchestrator: false });
  const tokens = script.match(/&&|\|\||[;&|]|[{}[\]!]|[^ \t;&|{}[\]!]+/g) ?? [];
  const isExact = (expected: readonly string[]): boolean =>
    tokens.length === expected.length && tokens.every((token, index) => token === expected[index]);
  return Object.freeze({
    invokesParallelOrchestrator:
      isExact(RUNNER_COMMAND_TOKENS) ||
      isExact([...TEST_BUN_ENV_PREFIX_TOKENS, ...RUNNER_COMMAND_TOKENS]),
  });
}

export function parseBunLaneManifest(value: unknown): BunLaneManifest {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(value, MANIFEST_ROOT_KEYS) ||
    typeof value.generatedAt !== "string" ||
    value.generatedAt.length === 0 ||
    !Array.isArray(value.rows)
  ) {
    return fail("query_inventory_invalid", "manifest");
  }
  const rows = value.rows.map((row): BunLaneManifestRow => {
    if (!isPlainRecord(row) || !hasExactKeys(row, MANIFEST_ROW_KEYS))
      fail("query_inventory_invalid", "manifest-row");
    if (
      typeof row.file !== "string" ||
      hasDotPathSegment(row.file) ||
      !TEST_FILE.test(row.file) ||
      (row.bucket !== "perf" && row.bucket !== "A" && row.bucket !== "B" && row.bucket !== "C")
    ) {
      fail("query_inventory_invalid", "manifest-row");
    }
    if (
      !Array.isArray(row.conflictKeys) ||
      row.conflictKeys.some((key) => typeof key !== "string" || key.length === 0) ||
      new Set(row.conflictKeys).size !== row.conflictKeys.length
    ) {
      fail("query_inventory_invalid", "manifest-row");
    }
    if (typeof row.cWriteGlobal !== "boolean") fail("query_inventory_invalid", "manifest-row");
    return Object.freeze({
      file: row.file,
      bucket: row.bucket,
      conflictKeys: Object.freeze([...row.conflictKeys]),
      cWriteGlobal: row.cWriteGlobal,
    });
  });
  return Object.freeze({ rows: Object.freeze(rows) });
}

export function readBunLaneManifest(): BunLaneManifest {
  try {
    return parseBunLaneManifest(
      JSON.parse(readFileSync(path.join(ROOT, "tests/bun-lane-manifest.json"), "utf8"))
    );
  } catch (error) {
    if (error instanceof Error && error.name === "InventoryError") throw error;
    return fail("query_inventory_invalid", "manifest");
  }
}

function defaultExists(relativePath: string): boolean {
  return existsSync(path.join(ROOT, relativePath));
}

function assertUniquePaths(paths: readonly string[], role: string): void {
  if (new Set(paths).size !== paths.length) fail("query_inventory_invalid", role);
}

function assertUnderRoots(paths: readonly string[], roots: readonly string[]): void {
  for (const testPath of paths) {
    if (
      hasDotPathSegment(testPath) ||
      !TEST_FILE.test(testPath) ||
      !roots.some((root) => testPath === root || testPath.startsWith(`${root}/`))
    )
      fail("query_inventory_invalid", "bun-path");
  }
}

function task551ManifestSlice(
  planned: readonly string[],
  manifest: BunLaneManifest
): readonly string[] {
  const plannedSet = new Set(planned);
  return manifest.rows
    .map((row) => row.file)
    .filter(
      (file) =>
        plannedSet.has(file) ||
        (file.toLowerCase().includes("task551") &&
          !TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATH_SET.has(file))
    )
    .sort();
}

export function assertExactInitialDependentBunMembership(
  paths: readonly string[],
  expected: readonly string[]
): void {
  assertUniquePaths(paths, "planned-bun-paths");
  assertUniquePaths(expected, "planned-bun-paths");
  if ([...paths].sort().join("\n") !== [...expected].sort().join("\n"))
    fail("query_inventory_invalid", "planned-bun-paths");
  assertUnderRoots(paths, EXECUTED_ROOTS);
}

export function assertExactTask551BunTestPlan(input: {
  planned: readonly string[];
  l01Owned: readonly string[];
  initialDependent: readonly string[];
  l04: readonly string[];
  l02Followups: readonly string[];
  l02Preexisting: readonly string[];
  l02Future: readonly string[];
}): void {
  assertUniquePaths(input.planned, "planned-bun-paths");
  assertUniquePaths(input.l01Owned, "l01-bun-paths");
  assertUniquePaths(input.initialDependent, "planned-bun-paths");
  assertUniquePaths(input.l04, "planned-bun-paths");
  assertUniquePaths(input.l02Followups, "planned-bun-paths");
  assertUniquePaths(input.l02Preexisting, "planned-bun-paths");
  assertUniquePaths(input.l02Future, "planned-bun-paths");
  assertUnderRoots(input.initialDependent, EXECUTED_ROOTS);
  assertUnderRoots(input.l04, EXECUTED_ROOTS);
  assertUnderRoots(input.l02Followups, EXECUTED_ROOTS);
  assertUnderRoots(input.l02Preexisting, EXECUTED_ROOTS);
  assertUnderRoots(input.l02Future, EXECUTED_ROOTS);
  const expectedFollowups = [...input.l02Preexisting, ...input.l02Future].sort();
  if ([...input.l02Followups].sort().join("\n") !== expectedFollowups.join("\n"))
    fail("query_inventory_invalid", "planned-bun-paths");
  const expected = [
    ...input.l01Owned,
    ...input.initialDependent,
    ...input.l04,
    ...input.l02Followups,
  ].sort();
  if ([...input.planned].sort().join("\n") !== expected.join("\n"))
    fail("query_inventory_invalid", "planned-bun-paths");
  assertUnderRoots(input.planned, EXECUTED_ROOTS);
}

export function assertCanonicalBunLaneMembership(
  paths: readonly string[],
  input: BunLaneMembershipInput
): void {
  if (!parseShippedTestBunCommand(input.script).invokesParallelOrchestrator)
    fail("query_inventory_invalid", "test-bun-command");
  assertUniquePaths(paths, "planned-bun-paths");
  assertUnderRoots(paths, EXECUTED_ROOTS);
  const exists = input.exists ?? defaultExists;
  if (input.requireFiles && paths.some((testPath) => !exists(testPath)))
    fail("query_inventory_final_receipt_missing", "planned-bun-file");
  if (input.manifest !== undefined)
    assertExactMaterializedTask551BunLaneMembership({
      planned: paths,
      manifest: input.manifest,
      exists,
    });
}

export function assertTask551BunLaneMembershipState(input: {
  planned: readonly string[];
  l01Owned: readonly string[];
  initialDependent: readonly string[];
  l04: readonly string[];
  l02Followups: readonly string[];
  l02Preexisting: readonly string[];
  l02Future: readonly string[];
  manifest: BunLaneManifest;
  exists?: (relativePath: string) => boolean;
}): Task551BunLaneMembershipState {
  assertExactTask551BunTestPlan(input);
  const exists = input.exists ?? defaultExists;
  const recoveryDependent = [...input.initialDependent, ...input.l02Followups];
  const allDependent = [...recoveryDependent, ...input.l04];
  const hasExactDependentState = (present: readonly string[], absent: readonly string[]): boolean =>
    present.every((testPath) => exists(testPath)) && absent.every((testPath) => !exists(testPath));
  const ownsNoRows = task551ManifestSlice(input.planned, input.manifest).length === 0;
  if (
    hasExactDependentState(
      input.l02Preexisting,
      allDependent.filter((path) => !input.l02Preexisting.includes(path))
    ) &&
    ownsNoRows
  ) {
    return "legal-initial";
  }
  if (hasExactDependentState(recoveryDependent, input.l04) && ownsNoRows) {
    return "recovery-initial";
  }
  if (allDependent.every((testPath) => exists(testPath))) {
    assertExactMaterializedTask551BunLaneMembership({
      planned: input.planned,
      manifest: input.manifest,
      exists,
    });
    return "post-finalization";
  }
  fail("query_inventory_invalid", "task551-bun-state");
}

export function assertExactMaterializedTask551BunLaneMembership(input: {
  planned: readonly string[];
  manifest: BunLaneManifest;
  exists?: (relativePath: string) => boolean;
}): void {
  assertUniquePaths(input.planned, "planned-bun-paths");
  assertUnderRoots(input.planned, EXECUTED_ROOTS);
  const exists = input.exists ?? defaultExists;
  if (input.planned.some((testPath) => !exists(testPath)))
    fail("query_inventory_final_receipt_missing", "planned-bun-file");
  const slice = task551ManifestSlice(input.planned, input.manifest);
  if (
    new Set(slice).size !== slice.length ||
    slice.join("\n") !== [...input.planned].sort().join("\n")
  ) {
    fail("query_inventory_final_receipt_missing", "task551-manifest-membership");
  }
  const dependentPaths = input.planned.filter((file) => !TASK551_L01_BUN_PATHS.has(file));
  if (
    dependentPaths.length !== 7 ||
    input.manifest.rows.some((row) => dependentPaths.includes(row.file) && row.bucket !== "perf")
  ) {
    fail("query_inventory_final_receipt_missing", "task551-manifest-bucket");
  }
}
