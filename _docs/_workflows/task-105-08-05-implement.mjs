import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TASK = "TASK-105-08-05";
const CLOSURE = Object.freeze({
  owner: "TASK-105-09",
  changelog: 1325,
});
const ADMIN_WRITER_PATH_PREFIX = "core/admin/";
export const ADMIN_BOUNDARY_GATE = "bun run check:admin-boundary";

export const TASK105_L05_L04_MANIFEST_ROWS = Object.freeze([
  "tests/unit/runtime-smoke/task105-l05-adapter.test.ts",
  "tests/unit/runtime-smoke/task105-l05-descriptors.test.ts",
  "tests/unit/runtime-smoke/task105-l05-cleanup.test.ts",
  "tests/unit/runtime-smoke/task105-l05-output-manifest.test.ts",
  "tests/unit/runtime-smoke/evidence-session.test.ts",
  "tests/unit/runtime-smoke/task105-l05-auth.test.ts",
  "tests/unit/runtime-smoke/task105-l05-worker-operations.test.ts",
  "tests/unit/runtime-smoke/task105-l05-recovery-receipt.test.ts",
  "tests/unit/runtime-smoke/task105-l05-recovery-db.test.ts",
  "tests/unit/workflows/smokeEvidenceFilesystem.test.ts",
  "tests/unit/runtime-smoke/task105-l05-runner-redaction.test.ts",
]);

const TASK105_L05_L04_INHERITED_DIRTY_MANIFEST_ROWS = Object.freeze([
  "tests/unit/runtime-smoke/task105-l05-adapter.test.ts",
  "tests/unit/runtime-smoke/task105-l05-descriptors.test.ts",
  "tests/unit/runtime-smoke/task105-l05-cleanup.test.ts",
  "tests/unit/runtime-smoke/task105-l05-output-manifest.test.ts",
  "tests/unit/runtime-smoke/evidence-session.test.ts",
  "tests/unit/runtime-smoke/task105-l05-auth.test.ts",
]);

export const TASK105_L05_L04_WRITER_PATHS = Object.freeze([
  "scripts/runtime-smoke.ts",
  "scripts/runtime-smoke/contracts.ts",
  "scripts/runtime-smoke/cli.ts",
  "scripts/runtime-smoke/registry.ts",
  "scripts/runtime-smoke/adapters/types.ts",
  "scripts/runtime-smoke/evidence-session.ts",
  "scripts/runtime-smoke/browser/admin-auth.ts",
  "scripts/runtime-smoke/server/supervised-server.ts",
  "scripts/runtime-smoke/server/fixed-dev-host.ts",
  "scripts/runtime-smoke/adapters/task-105-l05.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/descriptors.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/fixture.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/host.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/browser-segments.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/browser-drivers.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/cleanup.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/output-manifest.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/settings-lease.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/worker-operations.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/worker-fixture-operations.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/worker-recovery-operations.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/recovery-receipt.ts",
  "scripts/runtime-smoke/adapters/task-105-l05/recovery-db.ts",
  "_docs/_workflows/lib/smoke-evidence.mjs",
  "_docs/_workflows/lib/smoke-evidence.d.mts",
  "_docs/_workflows/lib/smoke-evidence-filesystem.mjs",
  "tests/unit/runtime-smoke/cli-registry.test.ts",
  ...TASK105_L05_L04_MANIFEST_ROWS,
  "tests/bun-lane-manifest.json",
  "tests/README.md",
  "docs/develop/runtime-smoke-cookbook.md",
]);

const TASK105_L05_L14_L16_MANIFEST_ROWS = Object.freeze([
  "tests/unit/runtime-smoke/task540-override-actions.test.ts",
  "tests/unit/runtime-smoke/task540-storage-preflight-session-scope.test.ts",
]);

export const meta = Object.freeze({
  name: "task-105-08-05-implement",
  description:
    "Orchestrate the sequential TASK-105-08-05 coverage and runtime-smoke leaves in a shared worktree.",
  phases: Object.freeze([
    "contract-audit",
    "l01-l01-menu-source-repair",
    "l01-l02-menu-item-drawer-dead-guard-repair",
    "l01-menus",
    "l02-l01-dashboard-exhaustive-default-repair",
    "l02-dashboard",
    "s01-solution-kit-id-parity",
    "l03-l01-solution-kit-card-parity",
    "l03-solution-kits",
    "l04-runtime-smoke",
    "post-audit-and-program-closure",
  ]),
});

export const LEAF_ORDER = Object.freeze([
  Object.freeze({
    id: "TASK-105-08-05-L01-L01",
    taskFile: "_docs/_TASKS/TASK-105-08-05-L01-L01-menu-source-split-and-dead-path-repair.md",
    parent: "TASK-105-08-05-L01",
    requiresAdminBoundaryGate: true,
    writerPaths: Object.freeze([
      "core/admin/ui/menus/MenuEditorPage.tsx",
      "core/admin/ui/menus/menuEditorItemState.ts",
      "core/admin/ui/menus/MenuListPage.tsx",
      "tests/vitest/ui/menu-editor-validation.test.ts",
      "tests/vitest/ui/menu-list-page-flows.test.tsx",
    ]),
    receipt: "targeted Vitest, three-target scoped V8, static gates, root-TSC attribution",
  }),
  Object.freeze({
    id: "TASK-105-08-05-L01-L02",
    taskFile: "_docs/_TASKS/TASK-105-08-05-L01-L02-menu-item-drawer-dead-guard-repair.md",
    parent: "TASK-105-08-05-L01",
    requiresAdminBoundaryGate: true,
    writerPaths: Object.freeze([
      "core/admin/ui/menus/MenuItemDrawer.tsx",
      "tests/vitest/ui/menu-item-drawer.test.tsx",
    ]),
    receipt: "targeted Vitest, one-target scoped V8, static gates, root-TSC attribution",
  }),
  Object.freeze({
    id: "TASK-105-08-05-L01",
    taskFile: "_docs/_TASKS/TASK-105-08-05-L01-menus-coverage-reconciliation.md",
    parent: "TASK-105-08-05",
    receipt: "targeted Vitest, scoped V8, static gates, root-TSC attribution",
  }),
  Object.freeze({
    id: "TASK-105-08-05-L02-L01",
    taskFile: "_docs/_TASKS/TASK-105-08-05-L02-L01-dashboard-exhaustive-default-repair.md",
    parent: "TASK-105-08-05-L02",
    requiresAdminBoundaryGate: true,
    writerPaths: Object.freeze([
      "core/admin/ui/dashboard/DashboardBuilder.tsx",
      "core/admin/ui/dashboard/widgetRegistry.ts",
      "tests/vitest/ui/dashboard-builder-catalog-permissions.test.tsx",
    ]),
    receipt: "targeted Vitest, two-target scoped V8, static gates, root-TSC attribution",
  }),
  Object.freeze({
    id: "TASK-105-08-05-L02",
    taskFile: "_docs/_TASKS/TASK-105-08-05-L02-dashboard-coverage.md",
    parent: "TASK-105-08-05",
    receipt: "targeted Vitest, scoped V8, static gates, root-TSC attribution",
  }),
  Object.freeze({
    id: "TASK-105-08-01-S01",
    taskFile: "_docs/_TASKS/TASK-105-08-01-S01-Solution-Kit-ID-Parity.md",
    parent: "TASK-105-08-01",
    requiresValidatedReceiptFrom: "TASK-105-08-05-L02",
    requiresAdminBoundaryGate: true,
    writerPaths: Object.freeze([
      "core/admin/services/solutionKitsClient.ts",
      "core/admin/services/solutionKitSelection.ts",
      "tests/vitest/admin/solutionKitsClient.coverage.test.ts",
      "tests/vitest/admin/solutionKitSelection.test.ts",
    ]),
    receipt:
      "exact-four-path parity, scoped V8, owned-path static attribution, transitional_cross_owner card diagnostic",
  }),
  Object.freeze({
    id: "TASK-105-08-05-L03-L01",
    taskFile: "_docs/_TASKS/TASK-105-08-05-L03-L01-solution-kit-card-parity.md",
    parent: "TASK-105-08-05-L03",
    requiresValidatedReceiptFrom: "TASK-105-08-01-S01",
    requiresAdminBoundaryGate: true,
    writerPaths: Object.freeze([
      "core/admin/ui/kits/SolutionKitCard.tsx",
      "tests/vitest/ui/solution-kit-card-parity.test.tsx",
    ]),
    receipt: "targeted Vitest, one-target scoped V8, static gates, root-TSC attribution",
  }),
  Object.freeze({
    id: "TASK-105-08-05-L03",
    taskFile: "_docs/_TASKS/TASK-105-08-05-L03-solution-kits-coverage.md",
    parent: "TASK-105-08-05",
    requiresValidatedReceiptFrom: "TASK-105-08-05-L03-L01",
    writerPaths: Object.freeze([
      "tests/vitest/kits/use-solution-kit-runs.test.tsx",
      "tests/vitest/kits/use-solution-kits.test.tsx",
      "tests/vitest/ui/solution-kits-page-flow.test.tsx",
      "tests/vitest/ui/solution-kits-page.test.tsx",
      "tests/vitest/ui-integration/solution-kits-restyle.test.tsx",
    ]),
    receipt: "targeted Vitest, scoped V8, static gates, root-TSC attribution",
  }),
  Object.freeze({
    id: "TASK-105-08-05-L04",
    taskFile: "_docs/_TASKS/TASK-105-08-05-L04-runtime-smoke.md",
    parent: "TASK-105-08-05",
    requiresValidatedReceiptFrom: "TASK-105-08-05-L03",
    writerPaths: TASK105_L05_L04_WRITER_PATHS,
    receipt: "focused Bun, runtime registry, exclusive evidence, terminal smoke",
  }),
]);

export const REQUIRED_LEAF_ORDER = Object.freeze([
  "TASK-105-08-05-L01-L01",
  "TASK-105-08-05-L01-L02",
  "TASK-105-08-05-L01",
  "TASK-105-08-05-L02-L01",
  "TASK-105-08-05-L02",
  "TASK-105-08-01-S01",
  "TASK-105-08-05-L03-L01",
  "TASK-105-08-05-L03",
  "TASK-105-08-05-L04",
]);

export const REQUIRED_SOLUTION_KIT_RECEIPT_ORDER = Object.freeze([
  "TASK-105-08-05-L02",
  "TASK-105-08-01-S01",
  "TASK-105-08-05-L03-L01",
  "TASK-105-08-05-L03",
]);

export const REQUIRED_FINAL_WRITER_PATH_COUNTS = Object.freeze({
  "TASK-105-08-01-S01": 4,
  "TASK-105-08-05-L03-L01": 2,
  "TASK-105-08-05-L03": 5,
  "TASK-105-08-05-L04": TASK105_L05_L04_WRITER_PATHS.length,
});

export const REQUIRED_FINAL_WRITER_PATHS = Object.freeze({
  "TASK-105-08-01-S01": Object.freeze([
    "core/admin/services/solutionKitsClient.ts",
    "core/admin/services/solutionKitSelection.ts",
    "tests/vitest/admin/solutionKitsClient.coverage.test.ts",
    "tests/vitest/admin/solutionKitSelection.test.ts",
  ]),
  "TASK-105-08-05-L03-L01": Object.freeze([
    "core/admin/ui/kits/SolutionKitCard.tsx",
    "tests/vitest/ui/solution-kit-card-parity.test.tsx",
  ]),
  "TASK-105-08-05-L03": Object.freeze([
    "tests/vitest/kits/use-solution-kit-runs.test.tsx",
    "tests/vitest/kits/use-solution-kits.test.tsx",
    "tests/vitest/ui/solution-kits-page-flow.test.tsx",
    "tests/vitest/ui/solution-kits-page.test.tsx",
    "tests/vitest/ui-integration/solution-kits-restyle.test.tsx",
  ]),
  "TASK-105-08-05-L04": TASK105_L05_L04_WRITER_PATHS,
});

export const ACTIVE_EXTERNAL_COLLISION_GUARDS = Object.freeze([
  "_docs/_TASKS/TASK-105-08-14-task-540-runtime-smoke-revision-repair.md",
  "_docs/_TASKS/TASK-105-08-15-task-540-launcher-evidence-repair.md",
  "_docs/_TASKS/TASK-105-08-16-task-540-storage-preflight-session-scope-repair.md",
  "scripts/runtime-smoke/adapters/task-540.ts",
  "scripts/runtime-smoke/adapters/task-540/",
  "tests/unit/runtime-smoke/task540-",
  "tests/fixtures/runtime-smoke/task540-native-source-inventory.json",
  "_docs/_workflows/_smoke/evidence/task-540/",
  "tests/bun-lane-manifest.json",
]);

export const CLOSURE_CHANGELOG = CLOSURE;

export const FAMILY_STATIC_GATES = Object.freeze([
  "bun --cwd core lint:types",
  "bun --cwd core lint",
  "./node_modules/.bin/eslint --max-warnings=0 <every child-owned changed path>",
  "./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false --pretty false",
  "git diff --check",
  "physical line-count <=1000 for all child-owned changed production, test, fixture, and runtime-smoke files",
]);

export const FAMILY_CONDITIONAL_STATIC_GATES = Object.freeze([
  Object.freeze({
    id: "admin-boundary",
    command: ADMIN_BOUNDARY_GATE,
    appliesToWriterPathPrefix: ADMIN_WRITER_PATH_PREFIX,
    failClosed: true,
  }),
]);

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function taskStatus(text) {
  const match = /^\*\*Status:\*\* (.+)$/mu.exec(text);
  const status = match?.[1];
  if (typeof status !== "string") throw new Error("task105_l05_status_missing");
  return status;
}

function parseBunLaneManifest(text, source) {
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch {
    throw new Error(`task105_l05_manifest_invalid_json:${source}`);
  }
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    Array.isArray(manifest) ||
    !Array.isArray(manifest.rows)
  ) {
    throw new Error(`task105_l05_manifest_invalid_shape:${source}`);
  }
  const rootKeys = Object.keys(manifest).sort();
  if (rootKeys.length !== 2 || rootKeys[0] !== "generatedAt" || rootKeys[1] !== "rows") {
    throw new Error(`task105_l05_manifest_invalid_keys:${source}`);
  }
  return manifest;
}

function normalizeBunLaneRow(row, source) {
  if (
    row === null ||
    typeof row !== "object" ||
    Array.isArray(row) ||
    typeof row.file !== "string" ||
    typeof row.bucket !== "string" ||
    !Array.isArray(row.conflictKeys) ||
    row.conflictKeys.some((key) => typeof key !== "string") ||
    typeof row.cWriteGlobal !== "boolean" ||
    Object.keys(row).sort().join(",") !== "bucket,cWriteGlobal,conflictKeys,file"
  ) {
    throw new Error(`task105_l05_manifest_invalid_row:${source}`);
  }
  return Object.freeze({
    file: row.file,
    bucket: row.bucket,
    conflictKeys: Object.freeze([...row.conflictKeys]),
    cWriteGlobal: row.cWriteGlobal,
  });
}

function normalizedBunLaneRows(manifest, source) {
  const rows = manifest.rows.map((row) => normalizeBunLaneRow(row, source));
  const files = rows.map(({ file }) => file);
  const duplicateFiles = files.filter((file, index) => files.indexOf(file) !== index).sort();
  if (duplicateFiles.length > 0) {
    throw new Error(`task105_l05_manifest_duplicate_rows:${source}:${duplicateFiles.join(",")}`);
  }
  return rows;
}

function bunLaneRowEquals(left, right) {
  return (
    left.file === right.file &&
    left.bucket === right.bucket &&
    left.cWriteGlobal === right.cWriteGlobal &&
    left.conflictKeys.length === right.conflictKeys.length &&
    left.conflictKeys.every((key, index) => key === right.conflictKeys[index])
  );
}

function expectedTask105L05ManifestRow(file) {
  return Object.freeze({ file, bucket: "A", conflictKeys: Object.freeze([]), cWriteGlobal: false });
}

function readHeadBunLaneManifest(root) {
  let text;
  try {
    text = git(root, ["show", "HEAD:tests/bun-lane-manifest.json"]);
  } catch {
    throw new Error("task105_l05_manifest_head_unavailable");
  }
  return parseBunLaneManifest(text, "head");
}

function trackedDirtyPaths(root) {
  return git(root, ["status", "--porcelain=v1", "-z"])
    .split("\0")
    .filter((entry) => entry.length > 3)
    .map((entry) => entry.slice(3))
    .sort();
}

function matchesGuard(path, guard) {
  return path === guard || path.startsWith(guard);
}

function exactWriterClaims(leafId, candidatePaths) {
  return candidatePaths.flatMap((path) =>
    LEAF_ORDER.filter(
      (otherLeaf) => otherLeaf.id !== leafId && otherLeaf.writerPaths?.includes(path) === true
    ).map((otherLeaf) => `${path}:${otherLeaf.id}`)
  );
}

function hasAdminWriterPath(leaf) {
  return (
    Array.isArray(leaf?.writerPaths) &&
    leaf.writerPaths.some(
      (path) => typeof path === "string" && path.startsWith(ADMIN_WRITER_PATH_PREFIX)
    )
  );
}

export function assertAdminBoundaryGateRegistrationIsFailClosed(registeredLeaves = LEAF_ORDER) {
  if (!Array.isArray(registeredLeaves)) {
    throw new Error("task105_l05_admin_boundary_registration_invalid:leaves");
  }
  const policy = FAMILY_CONDITIONAL_STATIC_GATES.find(({ id }) => id === "admin-boundary");
  if (
    policy?.command !== ADMIN_BOUNDARY_GATE ||
    policy.appliesToWriterPathPrefix !== ADMIN_WRITER_PATH_PREFIX ||
    policy.failClosed !== true
  ) {
    throw new Error("task105_l05_admin_boundary_policy_invalid");
  }
  for (const leaf of registeredLeaves) {
    const expected = hasAdminWriterPath(leaf);
    if (expected !== (leaf?.requiresAdminBoundaryGate === true)) {
      throw new Error(`task105_l05_admin_boundary_registration_invalid:${leaf?.id ?? "unknown"}`);
    }
  }
}

function assertSolutionKitReceiptRegistrationIsFailClosed() {
  const leafIds = LEAF_ORDER.map(({ id }) => id);
  const firstIndex = leafIds.indexOf(REQUIRED_SOLUTION_KIT_RECEIPT_ORDER[0]);
  const registeredOrder = leafIds.slice(
    firstIndex,
    firstIndex + REQUIRED_SOLUTION_KIT_RECEIPT_ORDER.length
  );
  if (
    firstIndex < 0 ||
    registeredOrder.length !== REQUIRED_SOLUTION_KIT_RECEIPT_ORDER.length ||
    registeredOrder.some((id, index) => id !== REQUIRED_SOLUTION_KIT_RECEIPT_ORDER[index])
  ) {
    throw new Error("task105_l05_solution_kit_receipt_order_invalid");
  }

  for (let index = 1; index < REQUIRED_SOLUTION_KIT_RECEIPT_ORDER.length; index += 1) {
    const id = REQUIRED_SOLUTION_KIT_RECEIPT_ORDER[index];
    const expectedPredecessor = REQUIRED_SOLUTION_KIT_RECEIPT_ORDER[index - 1];
    const leaf = LEAF_ORDER.find((candidate) => candidate.id === id);
    if (leaf?.requiresValidatedReceiptFrom !== expectedPredecessor) {
      throw new Error(`task105_l05_receipt_predecessor_invalid:${id}:${expectedPredecessor}`);
    }
  }
}

export function assertFinalWriterRegistrationIsFailClosed(registeredLeaves = LEAF_ORDER) {
  if (!Array.isArray(registeredLeaves)) {
    throw new Error("task105_l05_final_writer_registration_invalid:leaves");
  }
  for (const [leafId, expectedCount] of Object.entries(REQUIRED_FINAL_WRITER_PATH_COUNTS)) {
    const expectedPaths = REQUIRED_FINAL_WRITER_PATHS[leafId];
    const leaf = registeredLeaves.find((candidate) => candidate?.id === leafId);
    const registeredPaths = leaf?.writerPaths;
    const expectedPathsAreValid =
      Array.isArray(expectedPaths) && expectedPaths.length === expectedCount;
    const registeredPathsMatch =
      Array.isArray(registeredPaths) &&
      expectedPathsAreValid &&
      registeredPaths.length === expectedPaths.length &&
      registeredPaths.every((path, index) => path === expectedPaths[index]);
    if (!registeredPathsMatch) {
      const expected = expectedPathsAreValid ? expectedPaths.join(",") : "invalid";
      const actual = Array.isArray(registeredPaths) ? registeredPaths.join(",") : "missing";
      throw new Error(
        `task105_l05_final_writer_registration_invalid:${leafId}:expected=${expected}:actual=${actual}`
      );
    }
  }
}

export function assertTask105L05CandidatePathsAreCollisionFree(leafId, candidatePaths) {
  const leaf = LEAF_ORDER.find(({ id }) => id === leafId);
  if (leaf === undefined) throw new Error(`task105_l05_leaf_unknown:${leafId}`);
  const paths = [...candidatePaths];
  const duplicatePaths = paths.filter((path, index) => paths.indexOf(path) !== index).sort();
  if (duplicatePaths.length > 0) {
    throw new Error(`task105_l05_candidate_paths_duplicate:${duplicatePaths.join(",")}`);
  }

  const foreignExactWriterClaims = exactWriterClaims(leafId, paths).sort();
  if (foreignExactWriterClaims.length > 0) {
    throw new Error(
      `task105_l05_exact_writer_collision:${leafId}:${foreignExactWriterClaims.join(",")}`
    );
  }

  if (leaf.writerPaths !== undefined) {
    const missingPaths = leaf.writerPaths.filter((path) => !paths.includes(path)).sort();
    const unexpectedPaths = paths.filter((path) => !leaf.writerPaths.includes(path)).sort();
    if (missingPaths.length > 0 || unexpectedPaths.length > 0) {
      throw new Error(
        `task105_l05_writer_paths_invalid:${leafId}:missing=${missingPaths.join(",")}:unexpected=${unexpectedPaths.join(",")}`
      );
    }
  }

  const permittedSharedPath =
    leafId === "TASK-105-08-05-L04" ? "tests/bun-lane-manifest.json" : null;
  const collisions = paths
    .filter((path) =>
      ACTIVE_EXTERNAL_COLLISION_GUARDS.some(
        (guard) => matchesGuard(path, guard) && path !== permittedSharedPath
      )
    )
    .sort();
  if (collisions.length > 0) {
    throw new Error(`task105_l05_external_collision:${collisions.join(",")}`);
  }
}

export function assertTask105L05FinalTaskAttributablePathsAreExact(leafId, { attribution, paths }) {
  if (attribution !== "complete-unfiltered-task-attribution") {
    throw new Error(`task105_l05_final_attribution_incomplete:${leafId}`);
  }
  if (!Object.hasOwn(REQUIRED_FINAL_WRITER_PATH_COUNTS, leafId)) {
    throw new Error(`task105_l05_final_writer_leaf_unregistered:${leafId}`);
  }
  if (!Array.isArray(paths)) {
    throw new Error(`task105_l05_final_writer_paths_missing:${leafId}`);
  }
  const expectedPaths = REQUIRED_FINAL_WRITER_PATHS[leafId];
  if (
    !Array.isArray(expectedPaths) ||
    paths.length !== expectedPaths.length ||
    paths.some((path, index) => path !== expectedPaths[index])
  ) {
    throw new Error(`task105_l05_final_writer_paths_invalid:${leafId}`);
  }
  assertTask105L05CandidatePathsAreCollisionFree(leafId, paths);
}

function assertL05LeafTaskStructure(text, leaf) {
  const h1 = /^# ([^:\n]+):/mu.exec(text)?.[1];
  if (h1 !== leaf.id) {
    throw new Error(`task105_l05_leaf_h1_invalid:${leaf.taskFile}`);
  }

  const fileName = /^# FileName:\s*(.+)$/mu.exec(text)?.[1]?.trim();
  if (fileName !== basename(leaf.taskFile)) {
    throw new Error(`task105_l05_leaf_filename_invalid:${leaf.taskFile}`);
  }

  const parent = /^\*\*Parent (?:Task|Subtask):\*\*\s*(.+)$/mu.exec(text)?.[1]?.trim();
  if (parent !== leaf.parent) {
    throw new Error(`task105_l05_leaf_parent_invalid:${leaf.taskFile}`);
  }
}

export function assertTask105L05SharedManifestHandoffIsFrozen(root = ROOT) {
  const rows = normalizedBunLaneRows(readHeadBunLaneManifest(root), "head");
  for (const file of TASK105_L05_L14_L16_MANIFEST_ROWS) {
    const row = rows.find((candidate) => candidate.file === file);
    if (!row || !bunLaneRowEquals(row, expectedTask105L05ManifestRow(file))) {
      throw new Error(`task105_l05_shared_manifest_handoff_missing_or_changed:${file}`);
    }
  }
  for (const file of TASK105_L05_L04_MANIFEST_ROWS) {
    const committedRow = rows.find((candidate) => candidate.file === file);
    if (committedRow && !bunLaneRowEquals(committedRow, expectedTask105L05ManifestRow(file))) {
      throw new Error(`task105_l05_manifest_l04_row_committed_drift:${file}`);
    }
  }
  const currentPath = resolve(root, "tests/bun-lane-manifest.json");
  if (!existsSync(currentPath)) {
    throw new Error("task105_l05_shared_manifest_missing");
  }
  const currentRows = normalizedBunLaneRows(
    parseBunLaneManifest(readFileSync(currentPath, "utf8"), "working_tree"),
    "working_tree"
  );
  const currentByFile = new Map(currentRows.map((row) => [row.file, row]));
  for (const headRow of rows) {
    const currentRow = currentByFile.get(headRow.file);
    if (!currentRow || !bunLaneRowEquals(currentRow, headRow)) {
      throw new Error(`task105_l05_shared_manifest_handoff_row_dirty:${headRow.file}`);
    }
  }
  for (const file of TASK105_L05_L04_INHERITED_DIRTY_MANIFEST_ROWS) {
    const row = currentByFile.get(file);
    if (!row || !bunLaneRowEquals(row, expectedTask105L05ManifestRow(file))) {
      throw new Error(`task105_l05_manifest_inherited_dirty_row_missing_or_changed:${file}`);
    }
  }
  const unexpectedRows = currentRows
    .map(({ file }) => file)
    .filter(
      (file) =>
        !rows.some((row) => row.file === file) && !TASK105_L05_L04_MANIFEST_ROWS.includes(file)
    )
    .sort();
  if (unexpectedRows.length > 0) {
    throw new Error(`task105_l05_manifest_preclassify_unowned_rows:${unexpectedRows.join(",")}`);
  }
  return Object.freeze({
    pass: true,
    handoffRows: TASK105_L05_L14_L16_MANIFEST_ROWS,
    preservedDirtyRows: TASK105_L05_L04_INHERITED_DIRTY_MANIFEST_ROWS,
    head: git(root, ["rev-parse", "HEAD"]).trim(),
  });
}

export function assertTask105L05L04ManifestClassificationPreconditions(root = ROOT) {
  assertTask105L05CandidatePathsAreCollisionFree(
    "TASK-105-08-05-L04",
    TASK105_L05_L04_WRITER_PATHS
  );
  const handoff = assertTask105L05SharedManifestHandoffIsFrozen(root);
  return Object.freeze({
    pass: true,
    l04Rows: TASK105_L05_L04_MANIFEST_ROWS,
    handoff,
  });
}

export function assertTask105L05L04ManifestProjectionIsExact(root = ROOT) {
  const headRows = normalizedBunLaneRows(readHeadBunLaneManifest(root), "head");
  for (const file of TASK105_L05_L14_L16_MANIFEST_ROWS) {
    const row = headRows.find((candidate) => candidate.file === file);
    if (!row || !bunLaneRowEquals(row, expectedTask105L05ManifestRow(file))) {
      throw new Error(`task105_l05_shared_manifest_handoff_missing_or_changed:${file}`);
    }
  }
  const currentPath = resolve(root, "tests/bun-lane-manifest.json");
  if (!existsSync(currentPath)) {
    throw new Error("task105_l05_manifest_projection_missing");
  }
  const currentRows = normalizedBunLaneRows(
    parseBunLaneManifest(readFileSync(currentPath, "utf8"), "working_tree"),
    "working_tree"
  );
  const headByFile = new Map(headRows.map((row) => [row.file, row]));
  const currentByFile = new Map(currentRows.map((row) => [row.file, row]));

  for (const file of TASK105_L05_L04_MANIFEST_ROWS) {
    const row = currentByFile.get(file);
    if (!row || !bunLaneRowEquals(row, expectedTask105L05ManifestRow(file))) {
      throw new Error(`task105_l05_manifest_l04_row_invalid:${file}`);
    }
    const committedHeadRow = headByFile.get(file);
    if (
      committedHeadRow &&
      !bunLaneRowEquals(committedHeadRow, expectedTask105L05ManifestRow(file))
    ) {
      throw new Error(`task105_l05_manifest_l04_row_committed_drift:${file}`);
    }
  }
  for (const [file, headRow] of headByFile) {
    const currentRow = currentByFile.get(file);
    if (!currentRow || !bunLaneRowEquals(currentRow, headRow)) {
      throw new Error(`task105_l05_manifest_existing_row_changed:${file}`);
    }
  }
  const unexpectedRows = currentRows
    .map(({ file }) => file)
    .filter((file) => !headByFile.has(file) && !TASK105_L05_L04_MANIFEST_ROWS.includes(file))
    .sort();
  const l04RowsMissingFromHead = TASK105_L05_L04_MANIFEST_ROWS.filter(
    (file) => !headByFile.has(file)
  ).length;
  if (
    currentRows.length !== headRows.length + l04RowsMissingFromHead ||
    unexpectedRows.length > 0
  ) {
    throw new Error(
      `task105_l05_manifest_projection_invalid:unexpected=${unexpectedRows.join(",")}`
    );
  }
  return Object.freeze({
    pass: true,
    retainedRowCount: headRows.length,
    addedRows: TASK105_L05_L04_MANIFEST_ROWS,
  });
}

export function verifyTask105L05Workflow(root = ROOT) {
  const parentPath = "_docs/_TASKS/TASK-105-08-05-menus-dashboard-kits.md";
  const leafOrder = LEAF_ORDER.map(({ id }) => id);
  if (
    leafOrder.length !== REQUIRED_LEAF_ORDER.length ||
    leafOrder.some((id, index) => id !== REQUIRED_LEAF_ORDER[index])
  ) {
    throw new Error("task105_l05_leaf_order_invalid");
  }
  assertAdminBoundaryGateRegistrationIsFailClosed();
  assertSolutionKitReceiptRegistrationIsFailClosed();
  assertFinalWriterRegistrationIsFailClosed();
  for (const leaf of LEAF_ORDER) {
    if (leaf.writerPaths !== undefined) {
      assertTask105L05CandidatePathsAreCollisionFree(leaf.id, leaf.writerPaths);
    }
  }
  const required = [parentPath, ...LEAF_ORDER.map(({ taskFile }) => taskFile)];
  for (const relativePath of required) {
    if (!existsSync(resolve(root, relativePath))) {
      throw new Error(`task105_l05_task_missing:${relativePath}`);
    }
  }

  const parentStatus = taskStatus(readFileSync(resolve(root, parentPath), "utf8"));
  const leaves = LEAF_ORDER.map((leaf) => {
    const text = readFileSync(resolve(root, leaf.taskFile), "utf8");
    assertL05LeafTaskStructure(text, leaf);
    if (leaf.requiresAdminBoundaryGate === true && !text.includes(ADMIN_BOUNDARY_GATE)) {
      throw new Error(`task105_l05_admin_boundary_gate_missing:${leaf.taskFile}`);
    }
    return Object.freeze({
      id: leaf.id,
      status: taskStatus(text),
      receipt: leaf.receipt,
      requiresValidatedReceiptFrom: leaf.requiresValidatedReceiptFrom ?? null,
      requiresAdminBoundaryGate: leaf.requiresAdminBoundaryGate === true,
    });
  });
  const validStatuses = new Set(["⏳ To Do", "🚧 In Progress", "✅ Done"]);
  if (!validStatuses.has(parentStatus) || leaves.some(({ status }) => !validStatuses.has(status))) {
    throw new Error("task105_l05_status_invalid");
  }

  const dirtyPaths = trackedDirtyPaths(root);
  const guardedDirtyPathCount = dirtyPaths.filter((path) =>
    ACTIVE_EXTERNAL_COLLISION_GUARDS.some((guard) => matchesGuard(path, guard))
  ).length;

  return Object.freeze({
    pass: true,
    task: TASK,
    head: git(root, ["rev-parse", "HEAD"]).trim(),
    dirtyPathCount: dirtyPaths.length,
    guardedDirtyPathCount,
    parentStatus,
    leafOrder: REQUIRED_LEAF_ORDER,
    solutionKitReceiptOrder: REQUIRED_SOLUTION_KIT_RECEIPT_ORDER,
    receiptSemantics: "external_validated_handoff_required_no_status_inference",
    finalOwnershipSemantics: "complete_unfiltered_task_attribution_exact_registered_sets",
    leaves: Object.freeze(leaves),
    collisionGuards: ACTIVE_EXTERNAL_COLLISION_GUARDS,
    closure: CLOSURE,
    staticGates: FAMILY_STATIC_GATES,
    conditionalStaticGates: FAMILY_CONDITIONAL_STATIC_GATES,
    finalWriterPaths: REQUIRED_FINAL_WRITER_PATHS,
    lineCountScope: Object.freeze({
      appliesTo: "all child-owned changed production, test, fixture, and runtime-smoke files",
      maximumPhysicalLines: 1000,
    }),
  });
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    throw new Error(
      "usage: node _docs/_workflows/task-105-08-05-implement.mjs --verify|--assert-l04-classify-preconditions|--assert-l04-manifest-projection"
    );
  }
  switch (args[0]) {
    case "--verify":
      process.stdout.write(`${JSON.stringify(verifyTask105L05Workflow())}\n`);
      return;
    case "--assert-l04-classify-preconditions":
      process.stdout.write(
        `${JSON.stringify(assertTask105L05L04ManifestClassificationPreconditions())}\n`
      );
      return;
    case "--assert-l04-manifest-projection":
      process.stdout.write(`${JSON.stringify(assertTask105L05L04ManifestProjectionIsExact())}\n`);
      return;
    default:
      throw new Error(
        "usage: node _docs/_workflows/task-105-08-05-implement.mjs --verify|--assert-l04-classify-preconditions|--assert-l04-manifest-projection"
      );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
