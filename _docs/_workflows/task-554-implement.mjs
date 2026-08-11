import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const meta = Object.freeze({
  name: "task-554-implement",
  description: "Implement TASK-554 sequentially with fail-closed ownership, executable gates, shared smoke, and terminal metadata closure.",
  phases: Object.freeze([
    Object.freeze({ title: "Start gate" }),
    Object.freeze({ title: "Sequential owners" }),
    Object.freeze({ title: "Documentation" }),
    Object.freeze({ title: "Full validation" }),
    Object.freeze({ title: "Post-audit" }),
    Object.freeze({ title: "Runtime smoke" }),
    Object.freeze({ title: "Metadata closure" }),
    Object.freeze({ title: "Final drift" }),
    Object.freeze({ title: "Terminal status" }),
  ]),
});

const ROOT = "/home/coder/project/Coderso";
export const TASK_554_BASELINE_SHA = "f6705443e129c9e89c32763405800b72ba3a0680";
const TASK = "TASK-554";
const AUTHOR_AUDIT_PATH = "_docs/_workflows/task-554-author-audit.mjs";
const SELF_TEST_ARG = "--task-554-workflow-self-test";
const SHA256 = /^[a-f0-9]{64}$/u;
const SOURCE_OR_TEST_EXTENSION = /\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/u;

export const TASK_554_SMOKE_SCENARIO_IDS = Object.freeze([
  "writer-metadata-save-preserves-schedule",
  "writer-status-publish-denied",
  "writer-schedule-denied",
  "publisher-schedule",
  "publisher-publish",
  "publisher-unpublish",
  "publisher-archive",
]);

const RESULT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["identity", "pass", "summary", "errors"],
  properties: {
    identity: { type: "string" },
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
});

const AUDIT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["identity", "pass", "summary", "findings"],
  properties: {
    identity: { type: "string" },
    pass: { type: "boolean" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
});

const OWNERS = Object.freeze([
  Object.freeze({
    id: "workflow-contract-tests",
    paths: Object.freeze([
      "tests/unit/workflows/task554AuthorAudit.test.ts",
      "tests/unit/workflows/task554WorkflowContracts.test.ts",
    ]),
  }),
  Object.freeze({
    id: "contract-schema-route",
    paths: Object.freeze([
      "core/services/posts/postMetadataContract.ts",
      "core/server/validation/postSchemas.ts",
      "core/server/routes/postsRoutes.ts",
      "core/server/routes/index.ts",
      "tests/vitest/server/postMetadataContract.test.ts",
      "tests/vitest/validation/postSchemas.test.ts",
      "tests/integration/routes/postsRoutes.test.ts",
      "tests/integration/routes/postMetadataRbac.test.ts",
    ]),
  }),
  Object.freeze({
    id: "admin-client",
    paths: Object.freeze([
      "core/admin/services/postsClient.ts",
      "tests/vitest/admin/postsClient.test.ts",
    ]),
  }),
  Object.freeze({
    id: "classic-metadata-ui",
    paths: Object.freeze([
      "core/admin/ui/posts/editor/postMetadataMutationPayload.ts",
      "core/admin/ui/posts/editor/PostClassicEditorShell.tsx",
      "tests/vitest/ui/post-metadata-mutation-payload.test.ts",
      "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx",
      "tests/vitest/ui/post-classic-metadata-hydration.test.tsx",
      "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts",
    ]),
  }),
  Object.freeze({
    id: "smoke-adapter",
    paths: Object.freeze([
      "scripts/runtime-smoke/contracts.ts",
      "scripts/runtime-smoke/cli.ts",
      "scripts/runtime-smoke/registry.ts",
      "scripts/runtime-smoke/adapters/task-554.ts",
      "scripts/runtime-smoke/adapters/task-554/browser-actions.ts",
      "scripts/runtime-smoke/adapters/task-554/output-manifest.ts",
      "scripts/runtime-smoke/adapters/task-554/worker-entry.ts",
      "scripts/runtime-smoke/adapters/task-554/worker-operations.ts",
      "scripts/runtime-smoke/adapters/task-554/production-handlers.ts",
      "tests/unit/runtime-smoke/cli-registry.test.ts",
      "tests/unit/runtime-smoke/task-554-adapter.test.ts",
      "tests/unit/runtime-smoke/task-554-worker.test.ts",
    ]),
  }),
]);

const DOCUMENTATION_OWNER = Object.freeze({
  id: "documentation",
  paths: Object.freeze([
    "_docs/CMS_API.md",
    "_docs/RBAC_SPEC.md",
    "_docs/SECURITY_SPEC.md",
    "docs/develop/runtime-smoke-cookbook.md",
    "docs/develop/assistant.md",
  ]),
});

const METADATA_CLOSURE_OWNER = Object.freeze({
  id: "metadata-closure",
  paths: Object.freeze([
    "_docs/_CHANGELOG/1267-2026-08-11-task-554-post-metadata-publish-rbac-hardening.md",
    "_docs/_CHANGELOG/README.md",
    "_docs/_TASKS/README.md",
  ]),
});

const TERMINAL_STATUS_OWNER = Object.freeze({
  id: "terminal-status",
  paths: Object.freeze(["_docs/_TASKS/TASK-554_Post_Metadata_Publish_RBAC_Hardening.md"]),
});

const FORBIDDEN_PATHS = Object.freeze([
  "_TMP-task-dispatch-plan-2026-08-10.md",
  "core/services/content/postsService.ts",
  "core/services/posts/postMutationService.ts",
  "_docs/_TASKS/TASK-414",
  "_docs/_TASKS/TASK-547",
  "_docs/_CHANGELOG/1266-",
  "core/services/kits/fullSitePackage/",
  "core/services/kits/fullSiteInstall/",
  "core/admin/ui/posts/editor/hooks/usePostEditorState.ts",
]);

const POST_AUDIT_LENSES = Object.freeze([
  "scope-fidelity",
  "rbac-fail-closed",
  "present-only-byte-identity",
  "cross-stream-smoke",
  "test-integrity",
]);

const FULL_GATE_COMMANDS = Object.freeze([
  Object.freeze({
    label: "task_554_vitest",
    command: "bunx",
    args: Object.freeze([
      "vitest", "run", "--config", "vitest.config.ts",
      "tests/vitest/validation/postSchemas.test.ts",
      "tests/vitest/server/postMetadataContract.test.ts",
      "tests/vitest/admin/postsClient.test.ts",
      "tests/vitest/ui/post-metadata-mutation-payload.test.ts",
      "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx",
      "tests/vitest/ui/post-classic-metadata-hydration.test.tsx",
      "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts",
    ]),
  }),
  Object.freeze({
    label: "task_554_route_and_rbac",
    command: "bun",
    args: Object.freeze([
      "test",
      "tests/integration/routes/postsRoutes.test.ts",
      "tests/integration/routes/postMetadataRbac.test.ts",
      "tests/unit/auth/rbac.test.ts",
    ]),
  }),
  Object.freeze({
    label: "task_554_runtime_harness",
    command: "bun",
    args: Object.freeze([
      "test",
      "tests/unit/runtime-smoke/cli-registry.test.ts",
      "tests/unit/runtime-smoke/task-554-adapter.test.ts",
      "tests/unit/runtime-smoke/task-554-worker.test.ts",
    ]),
  }),
  Object.freeze({
    label: "task_554_workflow_contracts",
    command: "bun",
    args: Object.freeze([
      "test",
      "tests/unit/workflows/task554AuthorAudit.test.ts",
      "tests/unit/workflows/task554WorkflowContracts.test.ts",
    ]),
  }),
  Object.freeze({ label: "task_554_types", command: "bun", args: Object.freeze(["--cwd", "core", "lint:types"]) }),
  Object.freeze({ label: "task_554_lint", command: "bun", args: Object.freeze(["--cwd", "core", "lint"]) }),
  Object.freeze({ label: "task_554_admin_boundary", command: "bun", args: Object.freeze(["run", "check:admin-boundary"]) }),
  Object.freeze({ label: "task_554_security_scan", command: "bun", args: Object.freeze(["run", "scan:security:strict"]) }),
  Object.freeze({ label: "task_554_precommit", command: "bun", args: Object.freeze(["run", "precommit:check"]) }),
  Object.freeze({ label: "task_554_author_syntax", command: "node", args: Object.freeze(["--check", "_docs/_workflows/task-554-author-audit.mjs"]) }),
  Object.freeze({ label: "task_554_implement_syntax", command: "node", args: Object.freeze(["--check", "_docs/_workflows/task-554-implement.mjs"]) }),
  Object.freeze({ label: "task_554_fix_syntax", command: "node", args: Object.freeze(["--check", "_docs/_workflows/task-554-fix.mjs"]) }),
]);

const OWNER_GATE_COMMANDS = Object.freeze({
  "workflow-contract-tests": Object.freeze([
    Object.freeze({ label: "task_554_workflow_contracts", command: "bun", args: Object.freeze(["test", "tests/unit/workflows/task554AuthorAudit.test.ts", "tests/unit/workflows/task554WorkflowContracts.test.ts"]) }),
    Object.freeze({ label: "task_554_author_syntax", command: "node", args: Object.freeze(["--check", "_docs/_workflows/task-554-author-audit.mjs"]) }),
    Object.freeze({ label: "task_554_implement_syntax", command: "node", args: Object.freeze(["--check", "_docs/_workflows/task-554-implement.mjs"]) }),
    Object.freeze({ label: "task_554_fix_syntax", command: "node", args: Object.freeze(["--check", "_docs/_workflows/task-554-fix.mjs"]) }),
  ]),
  "contract-schema-route": Object.freeze([
    Object.freeze({ label: "task_554_contract_vitest", command: "bunx", args: Object.freeze(["vitest", "run", "--config", "vitest.config.ts", "tests/vitest/validation/postSchemas.test.ts", "tests/vitest/server/postMetadataContract.test.ts"]) }),
    Object.freeze({ label: "task_554_contract_bun", command: "bun", args: Object.freeze(["test", "tests/integration/routes/postsRoutes.test.ts", "tests/integration/routes/postMetadataRbac.test.ts", "tests/unit/auth/rbac.test.ts"]) }),
    Object.freeze({ label: "task_554_types", command: "bun", args: Object.freeze(["--cwd", "core", "lint:types"]) }),
    Object.freeze({ label: "task_554_lint", command: "bun", args: Object.freeze(["--cwd", "core", "lint"]) }),
  ]),
  "admin-client": Object.freeze([
    Object.freeze({ label: "task_554_client_vitest", command: "bunx", args: Object.freeze(["vitest", "run", "--config", "vitest.config.ts", "tests/vitest/admin/postsClient.test.ts"]) }),
    Object.freeze({ label: "task_554_types", command: "bun", args: Object.freeze(["--cwd", "core", "lint:types"]) }),
    Object.freeze({ label: "task_554_lint", command: "bun", args: Object.freeze(["--cwd", "core", "lint"]) }),
  ]),
  "classic-metadata-ui": Object.freeze([
    Object.freeze({ label: "task_554_ui_vitest", command: "bunx", args: Object.freeze(["vitest", "run", "--config", "vitest.config.ts", "tests/vitest/ui/post-metadata-mutation-payload.test.ts", "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx", "tests/vitest/ui/post-classic-metadata-hydration.test.tsx", "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts"]) }),
    Object.freeze({ label: "task_554_types", command: "bun", args: Object.freeze(["--cwd", "core", "lint:types"]) }),
    Object.freeze({ label: "task_554_lint", command: "bun", args: Object.freeze(["--cwd", "core", "lint"]) }),
  ]),
  "smoke-adapter": Object.freeze([
    Object.freeze({ label: "task_554_runtime_harness", command: "bun", args: Object.freeze(["test", "tests/unit/runtime-smoke/cli-registry.test.ts", "tests/unit/runtime-smoke/task-554-adapter.test.ts", "tests/unit/runtime-smoke/task-554-worker.test.ts"]) }),
    Object.freeze({ label: "task_554_types", command: "bun", args: Object.freeze(["--cwd", "core", "lint:types"]) }),
    Object.freeze({ label: "task_554_lint", command: "bun", args: Object.freeze(["--cwd", "core", "lint"]) }),
  ]),
});

function commandOutput(root, command, args) {
  return execFileSync(command, args, { cwd: root, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] });
}

function commandStatus(root, command, args) {
  try {
    commandOutput(root, command, args);
    return 0;
  } catch (error) {
    return typeof error?.status === "number" ? error.status : 255;
  }
}

function parseNul(bytes) {
  return bytes.toString("utf8").split("\0").filter(Boolean);
}

function assertNoUnexpectedArguments() {
  const args = process.argv.slice(2);
  if (args.length === 0) return false;
  if (args.length === 1 && args[0] === SELF_TEST_ARG) return true;
  throw new Error(`task_554_unknown_arguments:${args.join(",")}`);
}

function requirePass(label, identity, result) {
  if (result?.identity !== identity || result?.pass !== true || !Array.isArray(result.errors) || result.errors.length !== 0) {
    throw new Error(`${label}:invalid_result:${JSON.stringify(result)}`);
  }
  return result;
}

function requireCleanAudit(label, identity, result) {
  const findings = result?.findings;
  const blockers = Array.isArray(findings)
    ? findings.filter((finding) => finding?.severity === "HIGH" || finding?.severity === "MEDIUM")
    : null;
  if (result?.identity !== identity || !Array.isArray(findings) || result.pass !== (blockers?.length === 0)) {
    throw new Error(`${label}:invalid_result:${JSON.stringify(result)}`);
  }
  if (findings.length !== 0) throw new Error(`${label}:findings:${JSON.stringify(findings)}`);
  return result;
}

export function verifyTask554Bootstrap(root = ROOT) {
  const output = commandOutput(root, "node", [path.join(root, AUTHOR_AUDIT_PATH), "--task-554-bootstrap-verify"]);
  let parsed;
  try {
    parsed = JSON.parse(output.toString("utf8"));
  } catch (error) {
    throw new Error("task_554_bootstrap_verifier_invalid_output", { cause: error });
  }
  if (
    parsed?.baseline !== TASK_554_BASELINE_SHA ||
    !Array.isArray(parsed?.paths) ||
    parsed.paths.length !== 3
  ) {
    throw new Error("task_554_bootstrap_verifier_invalid_receipt");
  }
  return parsed;
}

function verifyBeforeDispatch(phaseName, root = ROOT) {
  try {
    return verifyTask554Bootstrap(root);
  } catch (error) {
    throw new Error(`task_554_bootstrap_before_${phaseName.replaceAll(" ", "_")}:${error instanceof Error ? error.message : String(error)}`);
  }
}

function normalizedRepositoryPath(value) {
  if (typeof value !== "string" || value.includes("\0") || value.includes("\\")) {
    throw new Error("task_554_invalid_repository_path");
  }
  const normalized = path.posix.normalize(value);
  if (normalized === "." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`task_554_repository_path_escape:${value}`);
  }
  return normalized;
}

function pathMatchesForbidden(pathName) {
  return FORBIDDEN_PATHS.some((entry) => pathName === entry || pathName.startsWith(entry));
}

function fingerprintPath(root, relativePath) {
  const absolute = path.resolve(root, normalizedRepositoryPath(relativePath));
  let stats;
  try {
    stats = lstatSync(absolute);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return "missing";
    throw error;
  }
  if (stats.isSymbolicLink()) return `symlink:${readlinkSync(absolute)}`;
  if (!stats.isFile()) return `non_file:${stats.mode}`;
  return `file:${createHash("sha256").update(readFileSync(absolute)).digest("hex")}`;
}

export function captureRepositoryFingerprint(root = ROOT) {
  const paths = parseNul(commandOutput(root, "git", ["ls-files", "-co", "--exclude-standard", "-z"]));
  const entries = paths
    .map(normalizedRepositoryPath)
    .sort((left, right) => left.localeCompare(right))
    .map((relativePath) => Object.freeze([relativePath, fingerprintPath(root, relativePath)]));
  return new Map(entries);
}

function changedRepositoryPaths(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].filter((pathName) => before.get(pathName) !== after.get(pathName)).sort();
}

function assertNoStagedChanges(root) {
  if (commandStatus(root, "git", ["diff", "--cached", "--quiet"]) !== 0) {
    throw new Error("task_554_staged_changes_forbidden");
  }
}

export function assertScopedRepositoryMutation(label, before, after, allowedPaths, root = ROOT) {
  assertNoStagedChanges(root);
  const allowed = new Set(allowedPaths.map(normalizedRepositoryPath));
  const changed = changedRepositoryPaths(before, after);
  const forbidden = changed.filter(pathMatchesForbidden);
  const outside = changed.filter((pathName) => !allowed.has(pathName));
  if (forbidden.length > 0 || outside.length > 0) {
    throw new Error(`${label}:scope_violation:${JSON.stringify({ forbidden, outside })}`);
  }
  return Object.freeze(changed);
}

function assertNoRepositoryMutation(label, before, after, root = ROOT) {
  return assertScopedRepositoryMutation(label, before, after, [], root);
}

function assertBaselineReachable(root, baseline = TASK_554_BASELINE_SHA) {
  if (commandStatus(root, "git", ["cat-file", "-e", `${baseline}^{commit}`]) !== 0) {
    throw new Error(`task_554_baseline_missing:${baseline}`);
  }
  if (commandStatus(root, "git", ["merge-base", "--is-ancestor", baseline, "HEAD"]) !== 0) {
    throw new Error(`task_554_baseline_not_ancestor:${baseline}`);
  }
}

export function listTask554LineCountCandidates(root = ROOT, baseline = TASK_554_BASELINE_SHA) {
  assertBaselineReachable(root, baseline);
  const comparison = parseNul(commandOutput(root, "git", [
    "diff", "--name-only", "-z", "--diff-filter=ACMRT", baseline, "--",
    "core", "packages", "scripts", "tests", "_docs/_workflows",
  ]));
  const untracked = parseNul(commandOutput(root, "git", [
    "ls-files", "--others", "--exclude-standard", "-z", "--",
    "core", "packages", "scripts", "tests", "_docs/_workflows",
  ]));
  return Object.freeze([...new Set([...comparison, ...untracked])]
    .map(normalizedRepositoryPath)
    .filter((candidate) => SOURCE_OR_TEST_EXTENSION.test(candidate))
    .sort((left, right) => left.localeCompare(right)));
}

export function countPhysicalLines(filePath) {
  const result = spawnSync("awk", ["END { print NR }", filePath], { encoding: "utf8" });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(`task_554_line_count_failed:${filePath}:${result.error?.message ?? result.status ?? result.signal}`);
  }
  const count = Number.parseInt(result.stdout.trim(), 10);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error(`task_554_line_count_invalid:${filePath}`);
  return count;
}

export function assertTask554LineLimit(root = ROOT, baseline = TASK_554_BASELINE_SHA) {
  const counted = [];
  for (const relativePath of listTask554LineCountCandidates(root, baseline)) {
    const absolute = path.resolve(root, relativePath);
    const stats = lstatSync(absolute);
    if (!stats.isFile() || stats.isSymbolicLink()) throw new Error(`task_554_line_count_not_regular:${relativePath}`);
    const lines = countPhysicalLines(absolute);
    counted.push(Object.freeze({ path: relativePath, lines }));
    if (lines > 1000) throw new Error(`task_554_line_limit:${relativePath}:${lines}`);
  }
  return Object.freeze(counted);
}

function runRequiredCommand(root, entry) {
  const result = spawnSync(entry.command, entry.args, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(`${entry.label}:failed:${result.error?.message ?? result.status ?? result.signal}`);
  }
}

function runOwnerGateCommands(root, ownerId) {
  const commands = OWNER_GATE_COMMANDS[ownerId];
  if (!Array.isArray(commands)) throw new Error(`task_554_owner_gate_missing:${ownerId}`);
  for (const command of commands) runRequiredCommand(root, command);
  assertTask554LineLimit(root);
  runRequiredCommand(root, Object.freeze({ label: `task_554_owner_diff_${ownerId}`, command: "git", args: Object.freeze(["diff", "--check"]) }));
  return Object.freeze(commands.map(({ label }) => label));
}

export function runTask554FullValidation(root = ROOT) {
  verifyBeforeDispatch("full_validation", root);
  for (const entry of FULL_GATE_COMMANDS) runRequiredCommand(root, entry);
  const lineCounts = assertTask554LineLimit(root);
  runRequiredCommand(root, Object.freeze({
    label: "task_554_baseline_diff_check",
    command: "git",
    args: Object.freeze(["diff", "--check", `${TASK_554_BASELINE_SHA}...HEAD`]),
  }));
  runRequiredCommand(root, Object.freeze({
    label: "task_554_worktree_diff_check",
    command: "git",
    args: Object.freeze(["diff", "--check"]),
  }));
  return Object.freeze({ pass: true, lineCounts });
}

function assertExactScenarioIds(value, label) {
  if (!Array.isArray(value) || value.length !== TASK_554_SMOKE_SCENARIO_IDS.length) {
    throw new Error(`${label}:scenario_count`);
  }
  for (const [index, actual] of value.entries()) {
    if (actual !== TASK_554_SMOKE_SCENARIO_IDS[index]) {
      throw new Error(`${label}:scenario_order:${index}`);
    }
  }
}

function task554SessionDirectory(root, session) {
  if (session !== "task-554-fast" && session !== "task-554-certification") {
    throw new Error(`task_554_smoke_session_invalid:${session}`);
  }
  return path.resolve(root, "_docs/_workflows/_smoke/task-554", session);
}

function ensureInsideRoot(root, candidate, label) {
  const relativePath = path.relative(root, candidate);
  if (relativePath === "" || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`task_554_${label}_escapes_root`);
  }
  return relativePath.split(path.sep).join("/");
}

export function assertExactTask554Manifest(root, profile, session, manifest) {
  if (profile !== "fast" && profile !== "certification") throw new Error("task_554_smoke_profile_invalid");
  if (!manifest || !Array.isArray(manifest.entries) || !Array.isArray(manifest.paths)) {
    throw new Error("task_554_smoke_manifest_invalid");
  }
  if (manifest.entries.length !== TASK_554_SMOKE_SCENARIO_IDS.length || manifest.paths.length !== TASK_554_SMOKE_SCENARIO_IDS.length) {
    throw new Error("task_554_smoke_manifest_count");
  }
  const sessionRelative = ensureInsideRoot(root, task554SessionDirectory(root, session), "smoke_session");
  const expectedPrefix = `${sessionRelative}/`;
  const normalizedPaths = [];
  for (const [index, entry] of manifest.entries.entries()) {
    if (!entry || entry.scenarioId !== TASK_554_SMOKE_SCENARIO_IDS[index] || typeof entry.path !== "string") {
      throw new Error(`task_554_smoke_manifest_entry:${index}`);
    }
    const normalizedPath = normalizedRepositoryPath(entry.path);
    if (path.posix.dirname(normalizedPath) !== sessionRelative || !normalizedPath.startsWith(expectedPrefix) || !normalizedPath.endsWith(".png") || manifest.paths[index] !== entry.path) {
      throw new Error(`task_554_smoke_manifest_path:${index}`);
    }
    normalizedPaths.push(normalizedPath);
  }
  if (new Set(normalizedPaths).size !== normalizedPaths.length) throw new Error("task_554_smoke_manifest_duplicate");
  return Object.freeze({ entries: Object.freeze(manifest.entries.map((entry) => Object.freeze({ scenarioId: entry.scenarioId, path: normalizedRepositoryPath(entry.path) }))), paths: Object.freeze(normalizedPaths) });
}

function loadTask554Manifest(root, profile, session) {
  const manifestModule = pathToFileURL(path.join(root, "scripts/runtime-smoke/adapters/task-554/output-manifest.ts")).href;
  const source = [
    `import { buildExactTask554ScreenshotManifest } from ${JSON.stringify(manifestModule)};`,
    "const manifest = buildExactTask554ScreenshotManifest({ command: 'run', suite: 'task-554', profile: process.env.TASK_554_SMOKE_PROFILE, session: process.env.TASK_554_SMOKE_SESSION });",
    "process.stdout.write(JSON.stringify({ entries: manifest.entries.map(({ scenarioId, path }) => ({ scenarioId, path })), paths: manifest.paths }));",
  ].join("\n");
  const output = commandOutput(root, "bun", ["--eval", source]);
  let manifest;
  try {
    manifest = JSON.parse(output.toString("utf8"));
  } catch (error) {
    throw new Error("task_554_smoke_manifest_json_invalid", { cause: error });
  }
  return assertExactTask554Manifest(root, profile, session, manifest);
}

function collectSessionFiles(root, session) {
  const directory = task554SessionDirectory(root, session);
  const files = [];
  const walk = (absolute) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = path.join(absolute, entry.name);
      const relativePath = ensureInsideRoot(root, child, "smoke_output");
      if (entry.isSymbolicLink()) throw new Error(`task_554_smoke_output_symlink:${relativePath}`);
      if (entry.isDirectory()) {
        throw new Error(`task_554_smoke_output_nested_directory:${relativePath}`);
      } else if (entry.isFile()) {
        files.push(relativePath);
      } else {
        throw new Error(`task_554_smoke_output_non_regular:${relativePath}`);
      }
    }
  };
  walk(directory);
  return Object.freeze(files.sort((left, right) => left.localeCompare(right)));
}

function assertExactReport(report, profile, session, manifest, root) {
  if (!report || typeof report !== "object" || Array.isArray(report)) throw new Error("task_554_smoke_report_shape");
  const reportKeys = Object.keys(report).sort();
  const expectedReportKeys = ["schemaVersion", "suiteId", "profile", "session", "pass", "serverUp", "timings", "processes", "snapshots", "scenarios", "screenshots", "consoleErrors", "suiteCleanup", "cleanup", "failures"].sort();
  if (reportKeys.length !== expectedReportKeys.length || reportKeys.some((key, index) => key !== expectedReportKeys[index])) {
    throw new Error("task_554_smoke_report_keys");
  }
  if (report.suiteId !== "task-554" || report.profile !== profile || report.session !== session || report.pass !== true || report.serverUp !== true) {
    throw new Error("task_554_smoke_report_identity");
  }
  const scenarioIds = report.scenarios?.map((scenario) => scenario?.id);
  assertExactScenarioIds(scenarioIds, "task_554_smoke_report");
  if (report.scenarios.some((scenario) => !scenario || Object.keys(scenario).length !== 3 || scenario?.pass !== true || !Number.isFinite(scenario?.elapsedMs)) || !Array.isArray(report.consoleErrors) || report.consoleErrors.length !== 0 || !Array.isArray(report.failures) || report.failures.length !== 0 || report.cleanup?.pass !== true || report.suiteCleanup?.pageErrors !== 0 || report.suiteCleanup?.repositorySnapshots !== 2) {
    throw new Error("task_554_smoke_report_failure");
  }
  if (!Array.isArray(report.screenshots) || report.screenshots.length !== manifest.paths.length) {
    throw new Error("task_554_smoke_report_screenshot_count");
  }
  const hashes = new Set();
  for (const [index, screenshot] of report.screenshots.entries()) {
    const expectedPath = manifest.paths[index];
    if (!screenshot || Object.keys(screenshot).length !== 2 || screenshot.path !== expectedPath || typeof screenshot.sha256 !== "string" || !SHA256.test(screenshot.sha256)) {
      throw new Error(`task_554_smoke_report_screenshot:${index}`);
    }
    const actualDigest = createHash("sha256").update(readFileSync(path.resolve(root, expectedPath))).digest("hex");
    if (screenshot.sha256 !== actualDigest) throw new Error(`task_554_smoke_report_hash:${index}`);
    hashes.add(screenshot.sha256);
  }
  if (hashes.size !== manifest.paths.length) throw new Error("task_554_smoke_report_duplicate_hash");
}

export function assertExactTask554SmokeEvidence(root, profile, session, manifest, reportBytes) {
  const checkedManifest = assertExactTask554Manifest(root, profile, session, manifest);
  const sessionDirectory = task554SessionDirectory(root, session);
  const stats = lstatSync(sessionDirectory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error("task_554_smoke_session_not_directory");
  const reportPath = ensureInsideRoot(root, path.join(sessionDirectory, "report.json"), "smoke_report");
  const bytes = Buffer.from(reportBytes);
  if (bytes.byteLength === 0 || bytes.byteLength > 1_048_576 || bytes[bytes.byteLength - 1] !== 0x0a) {
    throw new Error("task_554_smoke_report_bytes_invalid");
  }
  const reportText = bytes.toString("utf8");
  if (!Buffer.from(reportText, "utf8").equals(bytes)) throw new Error("task_554_smoke_report_utf8_invalid");
  let report;
  try {
    report = JSON.parse(reportText);
  } catch (error) {
    throw new Error("task_554_smoke_report_json_invalid", { cause: error });
  }
  const expected = new Set([reportPath, ...checkedManifest.paths]);
  const actual = collectSessionFiles(root, session);
  if (actual.length !== expected.size || actual.some((filePath) => !expected.has(filePath))) {
    throw new Error(`task_554_smoke_output_extra_or_missing:${JSON.stringify(actual)}`);
  }
  for (const relativePath of expected) {
    const fileStats = lstatSync(path.resolve(root, relativePath));
    if (!fileStats.isFile() || fileStats.isSymbolicLink() || fileStats.size <= 0) {
      throw new Error(`task_554_smoke_output_invalid:${relativePath}`);
    }
  }
  assertExactReport(report, profile, session, checkedManifest, root);
  return Object.freeze({ manifest: checkedManifest, report });
}

function createEmptySmokeSession(root, session) {
  const directory = task554SessionDirectory(root, session);
  if (existsSync(directory)) throw new Error(`task_554_smoke_session_preexisting:${session}`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stats = lstatSync(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`task_554_smoke_session_create_failed:${session}`);
  return directory;
}

function assertByteIdenticalReport(expectedBytes, reportPath) {
  const actualBytes = readFileSync(reportPath);
  if (!Buffer.from(expectedBytes).equals(actualBytes)) throw new Error("task_554_smoke_report_not_stdout_identical");
}

export function runTask554SmokeProfile(root, profile, session) {
  verifyBeforeDispatch("runtime_smoke", root);
  const before = captureRepositoryFingerprint(root);
  const manifest = loadTask554Manifest(root, profile, session);
  const directory = createEmptySmokeSession(root, session);
  const reportPath = path.join(directory, "report.json");
  const reportFd = openSync(reportPath, "wx", 0o600);
  let execution;
  try {
    execution = spawnSync("bun", [
      "scripts/runtime-smoke.ts", "run", "--suite", "task-554", "--profile", profile, "--session", session,
    ], { cwd: root, stdio: ["ignore", reportFd, "inherit"] });
  } finally {
    closeSync(reportFd);
  }
  if (execution?.error || execution?.status !== 0 || execution?.signal) {
    throw new Error(`task_554_smoke_runner_failed:${execution?.error?.message ?? execution?.status ?? execution?.signal}`);
  }
  const reportBytes = readFileSync(reportPath);
  if (reportBytes.byteLength === 0) throw new Error("task_554_smoke_report_missing");
  const evidence = assertExactTask554SmokeEvidence(root, profile, session, manifest, reportBytes);
  assertByteIdenticalReport(reportBytes, reportPath);
  const after = captureRepositoryFingerprint(root);
  assertNoRepositoryMutation("task_554_smoke_repository_restoration", before, after, root);
  return Object.freeze({ pass: true, profile, session, evidence });
}

function removeFastSmokeEvidence(root) {
  const directory = task554SessionDirectory(root, "task-554-fast");
  const expected = path.resolve(root, "_docs/_workflows/_smoke/task-554/task-554-fast");
  if (directory !== expected || !existsSync(directory)) throw new Error("task_554_fast_evidence_missing_before_cleanup");
  const stats = lstatSync(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error("task_554_fast_evidence_not_owned_directory");
  rmSync(directory, { recursive: true, force: false });
  if (existsSync(directory)) throw new Error("task_554_fast_evidence_cleanup_failed");
}

const COMMON = `Repository: ${ROOT}; task: ${TASK}; changelog: 1267.
Read current HEAD, status, diff, root AGENTS.md, TASK-554, task board, relevant
architecture/API/RBAC/security/testing docs, source and tests before work. The
pre-existing untracked _TMP-task-dispatch-plan-2026-08-10.md is owner state and
must remain untouched. Use the configured OpenCode coder implementation role
required by AGENTS.md. Never stage, commit, push, reset, clean, revert unrelated
changes, expose secrets, weaken assertions, or edit outside the current owner’s
exact paths. Read shared files immediately before editing. Every touched production
or test module must end at <=1000 physical lines. TASK-551-09-L02 exclusively owns
post-cache/front invalidation: do not edit postsService.ts or add a cache wrapper.
The runtime suite must reuse shared lifecycle, dispatcher, worker, cleanup, browser,
and reporting primitives; add only task-specific adapter operations, selectors, and
manifest behavior. A missing actor must receive auth_required before validation;
metadata response application must preserve newer metadata plus unrelated local edits.`;

async function dispatchResult(phaseName, identity, prompt) {
  verifyBeforeDispatch(phaseName);
  return requirePass(identity, identity, await agent(
    `${COMMON}\n${prompt}`,
    { label: identity, phase: phaseName, schema: RESULT_SCHEMA },
  ));
}

async function dispatchAudit(phaseName, identity, prompt) {
  verifyBeforeDispatch(phaseName);
  return requireCleanAudit(identity, identity, await agent(
    `${COMMON}\n${prompt}`,
    { label: identity, phase: phaseName, schema: AUDIT_SCHEMA },
  ));
}

async function runOwner(owner) {
  const implementationIdentity = `task-554:implement:${owner.id}`;
  const beforeImplementation = captureRepositoryFingerprint();
  const implementation = await dispatchResult("Sequential owners", implementationIdentity,
    `Implement only owner ${owner.id}. Allowed paths: ${owner.paths.join(", ")}.
Run that owner’s focused required tests and static checks. Do not run real smoke,
documentation, task/changelog closure, stage, or commit. Return exact files changed and
actual commands in the summary.`);
  const changed = assertScopedRepositoryMutation(implementationIdentity, beforeImplementation, captureRepositoryFingerprint(), owner.paths);
  const executedGates = runOwnerGateCommands(ROOT, owner.id);

  const gateIdentity = `task-554:gate:${owner.id}`;
  const beforeGate = captureRepositoryFingerprint();
  const gate = await dispatchResult("Sequential owners", gateIdentity,
    `Read-only gate for owner ${owner.id}. Inspect the current owner diff and rerun its exact targeted
lanes. Verify changed paths equal the owner scope, no forbidden path, no weakened assertion,
no file above 1,000 physical lines, and no unreported skipped command. Do not edit.`);
  assertNoRepositoryMutation(gateIdentity, beforeGate, captureRepositoryFingerprint());
  return Object.freeze({ id: owner.id, changed, executedGates, implementation, gate });
}

async function runDocumentationOwner() {
  const identity = "task-554:implement:documentation";
  const before = captureRepositoryFingerprint();
  const result = await dispatchResult("Documentation", identity,
    `Implement only the pre-smoke documentation owner. Allowed paths: ${DOCUMENTATION_OWNER.paths.join(", ")}.
Document the internal route/RBAC/CSRF behavior, pure present-only contract, TASK-551 boundary,
and the registered shared-wrapper/helper/worker smoke recipe. Do not edit changelog, board,
TASK-554 contract/status, product/test/workflow files, stage, or commit.`);
  const changed = assertScopedRepositoryMutation(identity, before, captureRepositoryFingerprint(), DOCUMENTATION_OWNER.paths);
  return Object.freeze({ changed, result });
}

async function runPostAudit() {
  const checks = await parallel(POST_AUDIT_LENSES.map((lens) => async () => {
    const identity = `task-554:post-audit:${lens}`;
    return dispatchAudit("Post-audit", identity,
      `Fresh read-only post-audit lens=${lens}. Ground every finding in current file:line evidence.
Check task/board/docs, source boundaries, strict route auth/CSRF/RBAC, present-only and byte
identity behavior, shared smoke wiring/evidence, test integrity, touched-file limits and known
cross-stream collision risks. Return no findings only when the lens is actually clean.`);
  }));
  if (checks.length !== POST_AUDIT_LENSES.length) throw new Error("task_554_post_audit_missing_results");
  return Object.freeze(checks);
}

async function runMetadataClosure() {
  const identity = "task-554:metadata-closure";
  const before = captureRepositoryFingerprint();
  const result = await dispatchResult("Metadata closure", identity,
    `After owner-reviewed certification evidence, edit only these metadata closure paths:
${METADATA_CLOSURE_OWNER.paths.join("\n")}.
Create the pinned 1267 entry, update its index and only TASK-554’s board row/statistics.
Re-read both indexes immediately before editing. Do not edit source, tests, workflows, product docs,
TASK-554 status, another task family, stage, or commit.`);
  const changed = assertScopedRepositoryMutation(identity, before, captureRepositoryFingerprint(), METADATA_CLOSURE_OWNER.paths);
  return Object.freeze({ changed, result });
}

async function runFinalDrift() {
  return dispatchAudit("Final drift", "task-554:final-drift",
    `Fresh read-only final metadata drift pass. Verify task graph/status order, changelog 1267 and
index, TASK-554 board/statistics, source/doc validation receipts, security invariants, exact
certification evidence, fast-evidence absence, repository restoration, and every known drift risk.
The task is intentionally still In Progress before this pass; do not edit.`);
}

async function runTerminalStatus() {
  const identity = "task-554:terminal-status";
  const before = captureRepositoryFingerprint();
  const result = await dispatchResult("Terminal status", identity,
    `Only after all prior receipts are green, update only TASK-554’s own status/completed evidence in
${TERMINAL_STATUS_OWNER.paths[0]}. It must become ✅ Done last. Do not alter implementation,
tests, product docs, changelog/index, board, any other task, stage, or commit.`);
  const changed = assertScopedRepositoryMutation(identity, before, captureRepositoryFingerprint(), TERMINAL_STATUS_OWNER.paths);
  return Object.freeze({ changed, result });
}

async function runWorkflow() {
  if (assertNoUnexpectedArguments()) return workflowSelfTest();
  phase("Start gate");
  const startBefore = captureRepositoryFingerprint();
  const start = await dispatchResult("Start gate", "task-554:start-gate",
    `Read-only. Verify the fresh author/audit/reconcile receipt is current, exact workflow bootstrap is clean,
the baseline is reachable, task dependencies and writer collisions are clear, and list current dirty state.
Do not edit.`);
  assertNoRepositoryMutation("task_554_start_gate", startBefore, captureRepositoryFingerprint());

  phase("Sequential owners");
  const owners = [];
  for (const owner of OWNERS) owners.push(await runOwner(owner));

  phase("Documentation");
  const documentation = await runDocumentationOwner();

  phase("Full validation");
  const validation = runTask554FullValidation();

  phase("Post-audit");
  const audits = await runPostAudit();

  phase("Runtime smoke");
  const fast = runTask554SmokeProfile(ROOT, "fast", "task-554-fast");
  removeFastSmokeEvidence(ROOT);
  const certification = runTask554SmokeProfile(ROOT, "certification", "task-554-certification");

  phase("Metadata closure");
  const closure = await runMetadataClosure();

  phase("Final drift");
  const finalDrift = await runFinalDrift();

  phase("Terminal status");
  const terminal = await runTerminalStatus();
  return Object.freeze({ pass: true, start, owners: Object.freeze(owners), documentation, validation, audits, fast, certification, closure, finalDrift, terminal });
}

function writeTinyFile(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function makeSelfTestManifest(root, session) {
  const directory = task554SessionDirectory(root, session);
  const entries = TASK_554_SMOKE_SCENARIO_IDS.map((scenarioId, index) => Object.freeze({
    scenarioId,
    path: ensureInsideRoot(root, path.join(directory, `${String(index + 1).padStart(2, "0")}-${scenarioId}.png`), "self_test_manifest"),
  }));
  return Object.freeze({ entries: Object.freeze(entries), paths: Object.freeze(entries.map((entry) => entry.path)) });
}

function expectFailure(callback, prefix) {
  try {
    callback();
  } catch (error) {
    if (String(error?.message).startsWith(prefix)) return;
    throw error;
  }
  throw new Error(`task_554_self_test_expected_failure:${prefix}`);
}

function workflowSelfTest() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "task-554-workflow-"));
  try {
    commandOutput(tempRoot, "git", ["init", "-q"]);
    commandOutput(tempRoot, "git", ["config", "user.email", "task-554@example.invalid"]);
    commandOutput(tempRoot, "git", ["config", "user.name", "TASK-554 workflow self-test"]);
    writeTinyFile(path.join(tempRoot, "core/tracked.ts"), "export const tracked = 1;\n");
    commandOutput(tempRoot, "git", ["add", "core/tracked.ts"]);
    commandOutput(tempRoot, "git", ["commit", "-qm", "baseline"]);
    const baseline = commandOutput(tempRoot, "git", ["rev-parse", "HEAD"]).toString("utf8").trim();
    writeTinyFile(path.join(tempRoot, "core/tracked.ts"), "export const tracked = 1;\nexport const finalLine = true;");
    writeTinyFile(path.join(tempRoot, "tests/untracked.ts"), "one\ntwo\nthree");
    const candidates = listTask554LineCountCandidates(tempRoot, baseline);
    if (JSON.stringify(candidates) !== JSON.stringify(["core/tracked.ts", "tests/untracked.ts"])) {
      throw new Error(`task_554_self_test_line_candidates:${JSON.stringify(candidates)}`);
    }
    if (countPhysicalLines(path.join(tempRoot, "core/tracked.ts")) !== 2 || countPhysicalLines(path.join(tempRoot, "tests/untracked.ts")) !== 3) {
      throw new Error("task_554_self_test_unterminated_line_count");
    }
    writeTinyFile(path.join(tempRoot, "scripts/too-long.ts"), `${"x\n".repeat(1001)}`);
    expectFailure(() => assertTask554LineLimit(tempRoot, baseline), "task_554_line_limit:scripts/too-long.ts:1001");
    rmSync(path.join(tempRoot, "scripts/too-long.ts"));

    const before = captureRepositoryFingerprint(tempRoot);
    writeTinyFile(path.join(tempRoot, "tests/allowed.ts"), "export const allowed = true;\n");
    assertScopedRepositoryMutation("task_554_self_test_allowed", before, captureRepositoryFingerprint(tempRoot), ["tests/allowed.ts"], tempRoot);
    const forbiddenBefore = captureRepositoryFingerprint(tempRoot);
    writeTinyFile(path.join(tempRoot, "core/services/content/postsService.ts"), "export const forbidden = true;\n");
    expectFailure(
      () => assertScopedRepositoryMutation("task_554_self_test_forbidden", forbiddenBefore, captureRepositoryFingerprint(tempRoot), ["core/services/content/postsService.ts"], tempRoot),
      "task_554_self_test_forbidden:scope_violation:",
    );

    const session = "task-554-fast";
    const manifest = makeSelfTestManifest(tempRoot, session);
    const sessionDirectory = createEmptySmokeSession(tempRoot, session);
    const screenshots = manifest.paths.map((relativePath, index) => {
      const bytes = Buffer.from(`fake-png-${index + 1}`);
      writeTinyFile(path.join(tempRoot, relativePath), bytes);
      return Object.freeze({ path: relativePath, sha256: sha256(bytes) });
    });
    const report = Buffer.from(`${JSON.stringify({
      schemaVersion: 1, suiteId: "task-554", profile: "fast", session, pass: true, serverUp: true,
      timings: [], processes: {}, snapshots: 2,
      scenarios: TASK_554_SMOKE_SCENARIO_IDS.map((id) => ({ id, pass: true, elapsedMs: 1 })),
      screenshots, consoleErrors: [], suiteCleanup: { pageErrors: 0, repositorySnapshots: 2 }, cleanup: { pass: true }, failures: [],
    })}\n`);
    const reportPath = path.join(sessionDirectory, "report.json");
    const reportFd = openSync(reportPath, "wx", 0o600);
    const capture = spawnSync(process.execPath, ["-e", "process.stdout.write(process.argv[1])", report.toString("utf8")], { stdio: ["ignore", reportFd, "pipe"] });
    closeSync(reportFd);
    if (capture.error || capture.status !== 0) throw new Error("task_554_self_test_report_capture");
    assertByteIdenticalReport(report, reportPath);
    assertExactTask554SmokeEvidence(tempRoot, "fast", session, manifest, readFileSync(reportPath));
    writeTinyFile(path.join(sessionDirectory, "extra.txt"), "not allowed\n");
    expectFailure(
      () => assertExactTask554SmokeEvidence(tempRoot, "fast", session, manifest, readFileSync(reportPath)),
      "task_554_smoke_output_extra_or_missing:",
    );
    rmSync(path.join(sessionDirectory, "extra.txt"));
    const reserialized = Buffer.from(JSON.stringify(JSON.parse(report.toString("utf8"))), "utf8");
    expectFailure(() => assertByteIdenticalReport(reserialized, reportPath), "task_554_smoke_report_not_stdout_identical");

    return Object.freeze({
      pass: true,
      unterminatedLineCount: true,
      trackedAndUntrackedCandidates: true,
      forbiddenScopeRejected: true,
      directStdoutCapture: true,
      extraSmokeOutputRejected: true,
      reportReserializationRejected: true,
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const selfTest = assertNoUnexpectedArguments();
export const result = selfTest ? workflowSelfTest() : await runWorkflow();
if (selfTest) process.stdout.write(`${JSON.stringify(result)}\n`);
