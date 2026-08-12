import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, closeSync, constants, existsSync, fchmodSync, fstatSync, linkSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runTask554IsolatedFrozenInstall } from "../../scripts/task-554-isolated-frozen-install.mjs";
import { assertTask554BoardClosureDelta, assertTask554ChangelogClosureDelta, assertTask554TerminalStatusDelta, CHANGELOG_1267_ENTRY_BYTES, CHANGELOG_1267_INDEX_ROW, CHANGELOG_RESERVATION_AFTER, CHANGELOG_RESERVATION_BEFORE } from "./task-554-closeout.mjs";
export const meta = Object.freeze({ name: "task-554-implement", description: "Implement TASK-554 sequentially with fail-closed ownership, executable gates, shared smoke, and an owner-review handoff.", phases: Object.freeze([Object.freeze({ title: "Start gate" }), Object.freeze({ title: "Sequential owners" }), Object.freeze({ title: "Documentation" }), Object.freeze({ title: "Full validation" }), Object.freeze({ title: "Post-audit" }), Object.freeze({ title: "Runtime smoke" }), Object.freeze({ title: "Owner review" })]) });
const ROOT = "/home/coder/project/Coderso";
export const TASK_554_BASELINE_SHA = "f6705443e129c9e89c32763405800b72ba3a0680";
const TASK = "TASK-554";
const AUTHOR_AUDIT_PATH = "_docs/_workflows/task-554-author-audit.mjs";
const SELF_TEST_ARG = "--task-554-workflow-self-test";
const RESUME_AFTER_FIX_ARG = "--task-554-resume-after-fix";
const SMOKE_ONLY_ARG = "--task-554-smoke";
const SHA256 = /^[a-f0-9]{64}$/u;
const SOURCE_OR_TEST_EXTENSION = /\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/u;
const GENERATED_ARTIFACT_EXTENSION = /\.generated\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/u;
const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAXIMUM_PNG_BYTES = 16 * 1024 * 1024;
const MAXIMUM_PNG_DIMENSION = 16_384;
const MAX_WORKFLOW_TREE_ENTRIES = 4096;
const MAX_WORKFLOW_TREE_DEPTH = 64;
const RELEASE_GATE_REPORT_PATH = ".tmp/coderso-release-gates.json";
const TASK_554_WORKFLOW_PATHS = Object.freeze(["_docs/_workflows/task-554-author-audit.mjs", "_docs/_workflows/task-554-implement.mjs", "_docs/_workflows/task-554-fix.mjs", "_docs/_workflows/task-554-closeout.mjs"]);
export const TASK_554_SMOKE_SCENARIO_IDS = Object.freeze(["writer-metadata-save-preserves-schedule", "writer-status-publish-denied", "writer-schedule-denied", "publisher-schedule", "publisher-publish", "publisher-unpublish", "publisher-archive"]);
const RESULT_SCHEMA = Object.freeze({ type: "object", additionalProperties: false, required: ["pass", "summary", "errors"], properties: { pass: { type: "boolean" }, summary: { type: "string" }, errors: { type: "array", items: { type: "string" } } } });
const AUDIT_SCHEMA = Object.freeze({ type: "object", additionalProperties: false, required: ["pass", "summary", "findings"], properties: { pass: { type: "boolean" }, summary: { type: "string" }, findings: { type: "array", items: { type: "object", additionalProperties: false, required: ["severity", "area", "finding", "evidence", "recommendation"], properties: { severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] }, area: { type: "string" }, finding: { type: "string" }, evidence: { type: "string" }, recommendation: { type: "string" } } } } } });
const owner = (id, paths) => Object.freeze({ id, paths: Object.freeze(paths) });
export const TASK_554_SECURITY_GATE_REPAIR_PATHS = Object.freeze(["package.json", "bun.lock", "scripts/runtime-smoke/adapters/task-540/suite/runtime/platform-actions.ts", "tests/unit/runtime-smoke/task540-native-suite-boundary.test.ts", "scripts/task-554-isolated-frozen-install.mjs", "scripts/task-554-isolated-frozen-install.d.mts", "tests/unit/workflows/task554IsolatedFrozenInstall.test.ts"]);
export const OWNERS = Object.freeze([owner("workflow-contract-tests", ["tests/unit/workflows/task554AuthorAudit.test.ts", "tests/unit/workflows/task554WorkflowContracts.test.ts"]), owner("contract-schema-route", ["core/services/posts/postMetadataContract.ts", "core/server/validation/postSchemas.ts", "core/server/routes/postsRoutes.ts", "core/server/routes/index.ts", "core/server/httpServer.ts", "tests/vitest/server/postMetadataContract.test.ts", "tests/vitest/server/requestBody.test.ts", "tests/vitest/validation/postSchemas.test.ts", "tests/integration/routes/postsRoutes.test.ts", "tests/integration/routes/postMetadataRbac.test.ts"]), owner("admin-client", ["core/admin/services/postsClient.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts"]), owner("classic-metadata-ui", ["core/admin/ui/posts/editor/postMetadataMutationPayload.ts", "core/admin/ui/posts/editor/PostClassicEditorShell.tsx", "tests/vitest/ui/post-metadata-mutation-payload.test.ts", "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx", "tests/vitest/ui/post-classic-metadata-hydration.test.tsx", "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts"]), owner("smoke-adapter", ["scripts/runtime-smoke/contracts.ts", "scripts/runtime-smoke/cli.ts", "scripts/runtime-smoke/registry.ts", "scripts/runtime-smoke/server/supervised-server.ts", "scripts/runtime-smoke/adapters/task-554.ts", "scripts/runtime-smoke/adapters/task-554/browser-actions.ts", "scripts/runtime-smoke/adapters/task-554/output-manifest.ts", "scripts/runtime-smoke/adapters/task-554/worker-entry.ts", "scripts/runtime-smoke/adapters/task-554/worker-operations.ts", "scripts/runtime-smoke/adapters/task-554/routing-settings-lease.ts", "scripts/runtime-smoke/adapters/task-554/production-handlers.ts", "tests/unit/runtime-smoke/cli-registry.test.ts", "tests/unit/runtime-smoke/supervised-server.test.ts", "tests/unit/runtime-smoke/repository-report.test.ts", "tests/unit/runtime-smoke/task-554-adapter.test.ts", "tests/unit/runtime-smoke/task-554-worker.test.ts"]), owner("security-gate-repair", TASK_554_SECURITY_GATE_REPAIR_PATHS)]);
const DOCUMENTATION_OWNER = owner("documentation", ["_docs/CMS_API.md", "_docs/RBAC_SPEC.md", "_docs/SECURITY_SPEC.md", "_docs/ADMIN_CACHE.md", "_docs/ADMIN_CACHE_MAP.md", "docs/develop/runtime-smoke-cookbook.md", "docs/develop/assistant.md", "tests/README.md"]);
const FORBIDDEN_PATHS = Object.freeze([...TASK_554_WORKFLOW_PATHS, "_TMP-task-dispatch-plan-2026-08-10.md", "core/services/content/postsService.ts", "core/services/content/postMutationService.ts", "_docs/_TASKS/TASK-414", "_docs/_TASKS/TASK-547", "_docs/_CHANGELOG/1266-", "core/services/kits/fullSitePackage/", "core/services/kits/fullSiteInstall/", "core/admin/ui/posts/editor/hooks/usePostEditorState.ts"]);
const POST_AUDIT_LENSES = Object.freeze(["scope-fidelity", "rbac-fail-closed", "present-only-byte-identity", "cross-stream-smoke", "test-integrity"]);
const command = (label, commandName, args) => Object.freeze({ label, command: commandName, args: Object.freeze(args) });
export const FULL_GATE_COMMANDS = Object.freeze([
  command("task_554_frozen_install", "bun", ["install", "--frozen-lockfile"]),
  command("task_554_frozen_install_test", "bun", ["test", "tests/unit/workflows/task554IsolatedFrozenInstall.test.ts"]),
  command("task_554_vitest", "bunx", ["vitest", "run", "--config", "vitest.config.ts", "tests/vitest/validation/postSchemas.test.ts", "tests/vitest/server/postMetadataContract.test.ts", "tests/vitest/server/requestBody.test.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts", "tests/vitest/ui/post-metadata-mutation-payload.test.ts", "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx", "tests/vitest/ui/post-classic-metadata-hydration.test.tsx", "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts"]),
  command("task_554_route_and_rbac", "bun", ["test", "tests/integration/routes/postsRoutes.test.ts", "tests/integration/routes/postMetadataRbac.test.ts", "tests/unit/auth/rbac.test.ts"]),
  command("task_554_runtime_harness", "bun", ["test", "tests/unit/runtime-smoke/cli-registry.test.ts", "tests/unit/runtime-smoke/supervised-server.test.ts", "tests/unit/runtime-smoke/repository-report.test.ts", "tests/unit/runtime-smoke/task-554-adapter.test.ts", "tests/unit/runtime-smoke/task-554-worker.test.ts"]),
  command("task_554_workflow_contracts", "bun", ["test", "tests/unit/workflows/task554AuthorAudit.test.ts", "tests/unit/workflows/task554WorkflowContracts.test.ts"]),
  command("task_554_types", "bun", ["--cwd", "core", "lint:types"]), command("task_554_lint", "bun", ["--cwd", "core", "lint"]), command("task_554_admin_boundary", "bun", ["run", "check:admin-boundary"]), command("task_540_boundary", "bun", ["test", "tests/unit/runtime-smoke/task540-native-suite-boundary.test.ts"]), command("task_554_security_scan", "bun", ["run", "scan:security:strict"]), command("task_554_coderso_release_gates", "bun", ["run", "gates:coderso"]), command("task_554_precommit", "bun", ["run", "precommit:check"]),
  command("task_554_author_syntax", "node", ["--check", "_docs/_workflows/task-554-author-audit.mjs"]), command("task_554_implement_syntax", "node", ["--check", "_docs/_workflows/task-554-implement.mjs"]), command("task_554_fix_syntax", "node", ["--check", "_docs/_workflows/task-554-fix.mjs"]), command("task_554_closeout_syntax", "node", ["--check", "_docs/_workflows/task-554-closeout.mjs"]),
]);
export const OWNER_GATE_COMMANDS = Object.freeze({
  "workflow-contract-tests": Object.freeze([command("task_554_workflow_contracts", "bun", ["test", "tests/unit/workflows/task554AuthorAudit.test.ts", "tests/unit/workflows/task554WorkflowContracts.test.ts"]), command("task_554_author_syntax", "node", ["--check", "_docs/_workflows/task-554-author-audit.mjs"]), command("task_554_implement_syntax", "node", ["--check", "_docs/_workflows/task-554-implement.mjs"]), command("task_554_fix_syntax", "node", ["--check", "_docs/_workflows/task-554-fix.mjs"])]), "contract-schema-route": Object.freeze([command("task_554_contract_vitest", "bunx", ["vitest", "run", "--config", "vitest.config.ts", "tests/vitest/validation/postSchemas.test.ts", "tests/vitest/server/postMetadataContract.test.ts", "tests/vitest/server/requestBody.test.ts"]), command("task_554_contract_bun", "bun", ["test", "tests/integration/routes/postsRoutes.test.ts", "tests/integration/routes/postMetadataRbac.test.ts", "tests/unit/auth/rbac.test.ts"]), command("task_554_types", "bun", ["--cwd", "core", "lint:types"]), command("task_554_lint", "bun", ["--cwd", "core", "lint"])]),
  "admin-client": Object.freeze([command("task_554_client_vitest", "bunx", ["vitest", "run", "--config", "vitest.config.ts", "tests/vitest/admin/postsClient.test.ts", "tests/vitest/admin/postsClientCacheAuthority.test.ts"]), command("task_554_types", "bun", ["--cwd", "core", "lint:types"]), command("task_554_lint", "bun", ["--cwd", "core", "lint"])]), "classic-metadata-ui": Object.freeze([command("task_554_ui_vitest", "bunx", ["vitest", "run", "--config", "vitest.config.ts", "tests/vitest/ui/post-metadata-mutation-payload.test.ts", "tests/vitest/ui/post-classic-editor-shell-wave.test.tsx", "tests/vitest/ui/post-classic-metadata-hydration.test.tsx", "tests/vitest/ui/post-editor-state-metadata-boundary.test.ts"]), command("task_554_types", "bun", ["--cwd", "core", "lint:types"]), command("task_554_lint", "bun", ["--cwd", "core", "lint"])]),
  "smoke-adapter": Object.freeze([command("task_554_runtime_harness", "bun", ["test", "tests/unit/runtime-smoke/cli-registry.test.ts", "tests/unit/runtime-smoke/supervised-server.test.ts", "tests/unit/runtime-smoke/repository-report.test.ts", "tests/unit/runtime-smoke/task-554-adapter.test.ts", "tests/unit/runtime-smoke/task-554-worker.test.ts"]), command("task_554_types", "bun", ["--cwd", "core", "lint:types"]), command("task_554_lint", "bun", ["--cwd", "core", "lint"])]), "security-gate-repair": Object.freeze([command("task_554_frozen_install", "bun", ["install", "--frozen-lockfile"]), command("task_554_frozen_install_test", "bun", ["test", "tests/unit/workflows/task554IsolatedFrozenInstall.test.ts"]), command("task_540_boundary", "bun", ["test", "tests/unit/runtime-smoke/task540-native-suite-boundary.test.ts"]), command("task_554_security_scan", "bun", ["run", "scan:security:strict"])]),
});
function commandOutput(root, command, args, environment) { return execFileSync(command, args, { cwd: root, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"], ...(environment ? { env: { ...process.env, ...environment } } : {}) }); }
function commandStatus(root, command, args) { try { commandOutput(root, command, args); return 0; } catch (error) { return typeof error?.status === "number" ? error.status : 255; } }
function parseNul(bytes) { return bytes.toString("utf8").split("\0").filter(Boolean); }
function parseImplementationMode() { const args = process.argv.slice(2); if (args.length === 0) return "run"; if (args.length === 1 && args[0] === SELF_TEST_ARG) return "self-test"; if (args.length === 1 && args[0] === RESUME_AFTER_FIX_ARG) return "resume"; if (args.length === 1 && args[0] === SMOKE_ONLY_ARG) return "smoke"; throw new Error(`task_554_unknown_arguments:${args.join(",")}`); }
const RESULT_KEYS = Object.freeze(["pass", "summary", "errors"]);
const AUDIT_KEYS = Object.freeze(["pass", "summary", "findings"]);
const FINDING_KEYS = Object.freeze(["severity", "area", "finding", "evidence", "recommendation"]);
const MAX_RESULT_ITEMS = 40;
const MAX_RESULT_FIELD_LENGTH = 2048;
function hasExactKeys(value, keys) { return Boolean(value) && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }
function nonEmptyBoundedString(value) { return typeof value === "string" && value.trim().length > 0 && value.length <= MAX_RESULT_FIELD_LENGTH; }
function requirePass(label, identity, result) {
  if (!hasExactKeys(result, RESULT_KEYS) || result.pass !== true || !nonEmptyBoundedString(result.summary) || !Array.isArray(result.errors) || result.errors.length > MAX_RESULT_ITEMS || result.errors.some((error) => !nonEmptyBoundedString(error)) || result.errors.length !== 0) throw new Error(`${label}:invalid_result:${JSON.stringify(result)}`);
  return Object.freeze({ identity, ...result });
}
function requireCleanAudit(label, identity, result) {
  if (!hasExactKeys(result, AUDIT_KEYS) || typeof result.pass !== "boolean" || !nonEmptyBoundedString(result.summary) || !Array.isArray(result.findings) || result.findings.length > MAX_RESULT_ITEMS) throw new Error(`${label}:invalid_result:${JSON.stringify(result)}`);
  for (const finding of result.findings) if (!hasExactKeys(finding, FINDING_KEYS) || !["HIGH", "MEDIUM", "LOW"].includes(finding.severity) || FINDING_KEYS.slice(1).some((key) => !nonEmptyBoundedString(finding[key]))) throw new Error(`${label}:invalid_finding:${JSON.stringify(finding)}`);
  const blockers = result.findings.filter((finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM");
  if (result.pass !== (blockers.length === 0)) throw new Error(`${label}:invalid_result:${JSON.stringify(result)}`);
  if (result.findings.length !== 0) throw new Error(`${label}:findings:${JSON.stringify(result.findings)}`);
  return Object.freeze({ identity, ...result });
}
export function verifyTask554Bootstrap(root = ROOT) { let parsed; try { parsed = JSON.parse(commandOutput(root, "node", [path.join(root, AUTHOR_AUDIT_PATH), "--task-554-bootstrap-verify"]).toString("utf8")); } catch (error) { throw new Error("task_554_bootstrap_verifier_invalid_output", { cause: error }); } if (parsed?.baseline !== TASK_554_BASELINE_SHA || !Array.isArray(parsed?.paths) || parsed.paths.length !== TASK_554_WORKFLOW_PATHS.length || parsed.paths.some((entry, index) => entry !== TASK_554_WORKFLOW_PATHS[index])) throw new Error("task_554_bootstrap_verifier_invalid_receipt"); return parsed; }
function verifyBeforeDispatch(phaseName, root = ROOT) {
  try {
    const bootstrap = verifyTask554Bootstrap(root);
    assertNoStagedChanges(root);
    assertNoForbiddenDirty(root);
    return bootstrap;
  } catch (error) {
    throw new Error(`task_554_bootstrap_before_${phaseName.replaceAll(" ", "_")}:${error instanceof Error ? error.message : String(error)}`);
  }
}
function verifyTask554AuthorAuditReceipt(root = ROOT) {
  const moduleUrl = pathToFileURL(path.join(root, AUTHOR_AUDIT_PATH)).href;
  const source = `import { assertTask554AuthorAuditReceipt } from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify(assertTask554AuthorAuditReceipt(${JSON.stringify(root)})));`;
  let receipt;
  try {
    receipt = JSON.parse(commandOutput(root, "node", ["--input-type=module", "--eval", source], { TASK_554_WORKFLOW_IMPORT: "1" }).toString("utf8"));
  } catch (error) {
    throw new Error("task_554_author_audit_receipt_invalid", { cause: error });
  }
  if (receipt?.task !== TASK || receipt?.fingerprint === undefined) throw new Error("task_554_author_audit_receipt_invalid");
  return receipt;
}
const INITIAL_DIRTY_PATHS = Object.freeze([
  "_TMP-task-dispatch-plan-2026-08-10.md",
  "_docs/_TASKS/README.md",
  "_docs/_TASKS/TASK-554_Post_Metadata_Publish_RBAC_Hardening.md",
]);
export const TASK_554_RESUME_ALLOWED_DIRTY_PATHS = Object.freeze([...new Set([...INITIAL_DIRTY_PATHS, ...OWNERS.flatMap((owner) => owner.paths), ...DOCUMENTATION_OWNER.paths])]);
function currentDirtyPaths(root) {
  const paths = [
    ...parseNul(commandOutput(root, "git", ["diff", "--name-only", "-z"])),
    ...parseNul(commandOutput(root, "git", ["ls-files", "--others", "--exclude-standard", "-z"])),
  ];
  return [...new Set(paths)].map(normalizedRepositoryPath).sort((left, right) => left.localeCompare(right));
}
function assertNoForbiddenDirty(root = ROOT) {
  const forbidden = currentDirtyPaths(root).filter((relativePath) => pathMatchesForbidden(relativePath) && relativePath !== "_TMP-task-dispatch-plan-2026-08-10.md");
  if (forbidden.length) throw new Error(`task_554_forbidden_dirty:${JSON.stringify(forbidden)}`);
  return Object.freeze(forbidden);
}
function assertImplementationPreflight(root = ROOT) {
  verifyBeforeDispatch("implementation_preflight", root);
  const dirty = currentDirtyPaths(root);
  const unexpected = dirty.filter((relativePath) => !INITIAL_DIRTY_PATHS.includes(relativePath));
  const forbidden = dirty.filter((relativePath) => pathMatchesForbidden(relativePath) && relativePath !== "_TMP-task-dispatch-plan-2026-08-10.md");
  if (unexpected.length > 0 || forbidden.length > 0) throw new Error(`task_554_start_state_invalid:${JSON.stringify({ forbidden, unexpected })}`);
  return Object.freeze({ receipt: verifyTask554AuthorAuditReceipt(root), dirty: Object.freeze(dirty) });
}
function assertResumePreflight(root = ROOT) {
  verifyBeforeDispatch("resume_preflight", root);
  const dirty = currentDirtyPaths(root);
  const unexpected = dirty.filter((relativePath) => !TASK_554_RESUME_ALLOWED_DIRTY_PATHS.includes(relativePath));
  if (unexpected.length > 0) throw new Error(`task_554_resume_state_invalid:${JSON.stringify({ unexpected })}`);
  return Object.freeze({ dirty: Object.freeze(dirty) });
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
  if (stats.isSymbolicLink()) return `symlink:${stats.mode}:${readlinkSync(absolute)}`;
  if (!stats.isFile()) return `non_file:${stats.mode}`;
  return `file:${stats.mode}:${createHash("sha256").update(readFileSync(absolute)).digest("hex")}`;
}
function workflowTreePaths(root) {
  const base = path.join(root, "_docs/_workflows");
  const entries = [];
  const visit = (absolutePath, depth) => {
    if (depth > MAX_WORKFLOW_TREE_DEPTH || entries.length >= MAX_WORKFLOW_TREE_ENTRIES) throw new Error("task_554_workflow_tree_limit");
    let stats;
    try { stats = lstatSync(absolutePath); } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT" && absolutePath === base) return;
      throw error;
    }
    const relativePath = normalizedRepositoryPath(path.relative(root, absolutePath).split(path.sep).join("/"));
    entries.push(relativePath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return;
    for (const name of readdirSync(absolutePath).sort((left, right) => left.localeCompare(right))) visit(path.join(absolutePath, name), depth + 1);
  };
  visit(base, 0);
  return entries;
}
function task554TmpNode(stats) { return Object.freeze({ dev: stats.dev, ino: stats.ino, mode: stats.mode, nlink: stats.nlink }); }
function sameTask554TmpNode(left, right) { return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.nlink === right.nlink; }
function readStableTask554TmpFile(absolute, label) {
  const initial = lstatSync(absolute); if (!initial.isFile() || initial.isSymbolicLink() || initial.nlink !== 1 || initial.size > 16 * 1024 * 1024) throw new Error(`${label}_invalid`);
  let descriptor;
  try {
    descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW); const before = fstatSync(descriptor);
    if (!before.isFile() || before.nlink !== 1 || before.size > 16 * 1024 * 1024) throw new Error(`${label}_invalid`);
    const bytes = Buffer.from(readFileSync(descriptor)); const after = fstatSync(descriptor); const final = lstatSync(absolute); const node = task554TmpNode(before);
    if (!sameTask554TmpNode(task554TmpNode(initial), node) || !sameTask554TmpNode(node, task554TmpNode(after)) || !sameTask554TmpNode(node, task554TmpNode(final)) || bytes.byteLength !== after.size) throw new Error(`${label}_changed`);
    return Object.freeze({ bytes, node, value: `file:${node.dev}:${node.ino}:${node.mode}:${node.nlink}:${createHash("sha256").update(bytes).digest("hex")}` });
  } finally { if (descriptor !== undefined) closeSync(descriptor); }
}
function captureTask554TmpSnapshot(root) {
  const directory = path.join(root, ".tmp"); let initial;
  try { initial = lstatSync(directory); } catch (error) { if (error && typeof error === "object" && error.code === "ENOENT") return Object.freeze({ directory: false, entries: Object.freeze([[".tmp", "missing"]]), files: new Map() }); throw error; }
  if (!initial.isDirectory() || initial.isSymbolicLink()) throw new Error("task_554_tmp_root_invalid");
  const entries = [[".tmp", `directory:${initial.dev}:${initial.ino}:${initial.mode}:${initial.nlink}`]]; const files = new Map();
  const visit = (absolute, relative, depth) => {
    if (depth > MAX_WORKFLOW_TREE_DEPTH || entries.length >= MAX_WORKFLOW_TREE_ENTRIES) throw new Error("task_554_tmp_tree_limit");
    const stats = lstatSync(absolute); if (stats.isSymbolicLink()) throw new Error("task_554_tmp_entry_invalid");
    if (stats.isDirectory()) { const node = task554TmpNode(stats); entries.push([relative, `directory:${node.dev}:${node.ino}:${node.mode}:${node.nlink}`]); for (const name of readdirSync(absolute).sort((a, b) => a.localeCompare(b))) visit(path.join(absolute, name), `${relative}/${name}`, depth + 1); if (!sameTask554TmpNode(node, task554TmpNode(lstatSync(absolute)))) throw new Error("task_554_tmp_ancestor_changed"); return; }
    if (!stats.isFile()) throw new Error("task_554_tmp_entry_invalid"); const file = readStableTask554TmpFile(absolute, "task_554_tmp_entry"); entries.push([relative, file.value]); files.set(relative, file);
  };
  for (const name of readdirSync(directory).sort((a, b) => a.localeCompare(b))) visit(path.join(directory, name), `.tmp/${name}`, 1);
  if (!sameTask554TmpNode(task554TmpNode(initial), task554TmpNode(lstatSync(directory)))) throw new Error("task_554_tmp_ancestor_changed");
  return Object.freeze({ directory: true, entries: Object.freeze(entries.map((entry) => Object.freeze(entry))), files });
}
export function captureRepositoryFingerprint(root = ROOT, excludedPaths = []) {
  const excluded = new Set(excludedPaths.map(normalizedRepositoryPath)); const paths = [...new Set([...parseNul(commandOutput(root, "git", ["ls-files", "-co", "--exclude-standard", "-z"])), ...workflowTreePaths(root)])];
  const entries = paths.map(normalizedRepositoryPath).filter((relativePath) => !excluded.has(relativePath)).sort((left, right) => left.localeCompare(right)).map((relativePath) => Object.freeze([relativePath, fingerprintPath(root, relativePath)]));
  return new Map([...entries, ...captureTask554TmpSnapshot(root).entries]);
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
function runReadOnlyGate(label, root, work) {
  assertNoStagedChanges(root);
  assertNoForbiddenDirty(root);
  const before = captureRepositoryFingerprint(root);
  try {
    return work();
  } finally {
    assertNoRepositoryMutation(label, before, captureRepositoryFingerprint(root), root);
  }
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
    .filter((candidate) => SOURCE_OR_TEST_EXTENSION.test(candidate) && !GENERATED_ARTIFACT_EXTENSION.test(candidate))
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
function runRequiredCommandDirect(root, entry) {
  const result = spawnSync(entry.command, entry.args, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(`${entry.label}:failed:${result.error?.message ?? result.status ?? result.signal}`);
  }
}
function releaseGateSnapshot(root) { const temporary = captureTask554TmpSnapshot(root); return Object.freeze({ temporary, report: temporary.files.get(RELEASE_GATE_REPORT_PATH) ?? null }); }
function sameReleaseGateSnapshot(left, right) { return left.temporary.entries.length === right.temporary.entries.length && left.temporary.entries.every((entry, index) => entry[0] === right.temporary.entries[index]?.[0] && entry[1] === right.temporary.entries[index]?.[1]); }
function restoreReleaseGateReport(reportPath, expected) {
  const current = readStableTask554TmpFile(reportPath, "task_554_release_gate_report"); if (!sameTask554TmpNode(current.node, expected.node)) throw new Error("task_554_release_gate_report_identity_changed");
  let descriptor;
  try { descriptor = openSync(reportPath, constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW); const before = fstatSync(descriptor); if (!sameTask554TmpNode(task554TmpNode(before), expected.node)) throw new Error("task_554_release_gate_report_identity_changed"); writeFileSync(descriptor, expected.bytes); fchmodSync(descriptor, expected.node.mode); const after = fstatSync(descriptor); const final = lstatSync(reportPath); if (!sameTask554TmpNode(expected.node, task554TmpNode(after)) || !sameTask554TmpNode(expected.node, task554TmpNode(final))) throw new Error("task_554_release_gate_report_identity_changed"); } finally { if (descriptor !== undefined) closeSync(descriptor); }
}
function restoreReleaseGateSnapshot(root, expected) {
  const directory = path.join(root, ".tmp"); const reportPath = path.join(root, RELEASE_GATE_REPORT_PATH); const actual = releaseGateSnapshot(root);
  if (expected.temporary.entries.some(([name, value]) => value.startsWith("directory:") && actual.temporary.entries.find(([actualName]) => actualName === name)?.[1] !== value)) throw new Error("task_554_release_gate_tmp_identity_changed");
  if (expected.report) restoreReleaseGateReport(reportPath, expected.report); else if (actual.report) unlinkSync(reportPath);
  if (!expected.temporary.directory && existsSync(directory)) { const stats = lstatSync(directory); if (!stats.isDirectory() || stats.isSymbolicLink() || readdirSync(directory).length !== 0) throw new Error("task_554_release_gate_tmp_not_empty"); rmdirSync(directory); }
  if (!sameReleaseGateSnapshot(expected, releaseGateSnapshot(root))) throw new Error("task_554_release_gate_report_restore_failed");
}
function runTask554ReleaseGate(root, work) {
  const expected = releaseGateSnapshot(root); let primary = null;
  try { work(); } catch (error) { primary = error; }
  try { restoreReleaseGateSnapshot(root, expected); } catch (restoration) {
    if (primary) throw new AggregateError([primary, restoration], "TASK-554 release gate and restoration failures");
    throw restoration;
  }
  if (primary) throw primary;
}
function runRequiredCommand(root, entry) {
  if (entry.label === "task_554_frozen_install") throw new Error("task_554_frozen_install_must_run_first");
  if (entry.label === "task_554_coderso_release_gates") return runTask554ReleaseGate(root, () => runRequiredCommandDirect(root, entry));
  return runRequiredCommandDirect(root, entry);
}
function runIsolatedFrozenInstallFirst(root, entries) { const installs = entries.filter((entry) => entry.label === "task_554_frozen_install"); if (installs.length > 1) throw new Error("task_554_frozen_install_duplicate"); if (installs.length) runReadOnlyGate("task_554_isolated_frozen_install_mutated", root, () => runTask554IsolatedFrozenInstall(root)); return entries.filter((entry) => entry.label !== "task_554_frozen_install"); }
function runOwnerGateCommands(root, ownerId) {
  const commands = OWNER_GATE_COMMANDS[ownerId];
  if (!Array.isArray(commands)) throw new Error(`task_554_owner_gate_missing:${ownerId}`);
  const ownerCommands = ownerId === "workflow-contract-tests" ? [...commands, command("task_554_closeout_syntax", "node", ["--check", "_docs/_workflows/task-554-closeout.mjs"])] : commands;
  const gates = runIsolatedFrozenInstallFirst(root, ownerCommands);
  return runReadOnlyGate(`task_554_owner_gate_mutated:${ownerId}`, root, () => {
    for (const command of gates) runRequiredCommand(root, command);
    assertTask554LineLimit(root);
    runRequiredCommand(root, Object.freeze({ label: `task_554_owner_diff_${ownerId}`, command: "git", args: Object.freeze(["diff", "--check"]) }));
    return Object.freeze(ownerCommands.map(({ label }) => label));
  });
}
export function runTask554FullValidation(root = ROOT) {
  verifyBeforeDispatch("full_validation", root);
  const gates = runIsolatedFrozenInstallFirst(root, FULL_GATE_COMMANDS);
  return runReadOnlyGate("task_554_full_validation_mutated", root, () => {
    for (const entry of gates) runRequiredCommand(root, entry);
    const lineCounts = assertTask554LineLimit(root);
    runRequiredCommand(root, Object.freeze({ label: "task_554_baseline_diff_check", command: "git", args: Object.freeze(["diff", "--check", `${TASK_554_BASELINE_SHA}...HEAD`]) }));
    runRequiredCommand(root, Object.freeze({ label: "task_554_worktree_diff_check", command: "git", args: Object.freeze(["diff", "--check"]) }));
    return Object.freeze({ pass: true, lineCounts });
  });
}
function assertExactScenarioIds(value, label) {
  if (!Array.isArray(value) || value.length !== TASK_554_SMOKE_SCENARIO_IDS.length) throw new Error(`${label}:scenario_count`);
  for (const [index, actual] of value.entries()) if (actual !== TASK_554_SMOKE_SCENARIO_IDS[index]) throw new Error(`${label}:scenario_order:${index}`);
}
const TASK_554_SMOKE_SESSIONS = Object.freeze({ fast: "task-554-fast", certification: "task-554-certification" });
function assertTask554SmokePair(profile, session) {
  if (profile !== "fast" && profile !== "certification") throw new Error("task_554_smoke_profile_invalid");
  if (session !== TASK_554_SMOKE_SESSIONS[profile]) throw new Error(`task_554_smoke_profile_session_mismatch:${profile}:${session}`);
}
function task554SessionDirectory(root, session) {
  if (session !== "task-554-fast" && session !== "task-554-certification") throw new Error(`task_554_smoke_session_invalid:${session}`);
  return path.resolve(root, "_docs/_workflows/_smoke/task-554", session);
}
function task554SmokeDirectoryNode(stats) { return Object.freeze({ dev: stats.dev, ino: stats.ino, uid: stats.uid, mode: stats.mode }); }
function sameTask554SmokeDirectoryNode(left, right) { return left.dev === right.dev && left.ino === right.ino && left.uid === right.uid && left.mode === right.mode; }
function assertNofollowTask554SmokeRoot(root, create = false, createdDirectories = null) {
  let directory = root;
  for (const component of ["_docs", "_workflows", "_smoke", "task-554"]) {
    directory = path.join(directory, component); let stats; let created = false;
    try { stats = lstatSync(directory); } catch (error) {
      if (!error || typeof error !== "object" || error.code !== "ENOENT") throw error; if (!create) throw new Error("task_554_smoke_ancestor_missing");
      mkdirSync(directory, { mode: 0o700 }); stats = lstatSync(directory); created = true;
    }
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error("task_554_smoke_ancestor_invalid");
    if (created && createdDirectories !== null) createdDirectories.push(Object.freeze({ path: directory, node: task554SmokeDirectoryNode(stats) }));
  }
  return directory;
}
function ensureInsideRoot(root, candidate, label) {
  const relativePath = path.relative(root, candidate);
  if (relativePath === "" || relativePath.startsWith("..") || path.isAbsolute(relativePath)) throw new Error(`task_554_${label}_escapes_root`);
  return relativePath.split(path.sep).join("/");
}
export function assertExactTask554Manifest(root, profile, session, manifest) {
  assertTask554SmokePair(profile, session);
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
export function task554SmokeInvocation(profile, session) {
  assertTask554SmokePair(profile, session);
  return Object.freeze({ command: "run", suite: "task-554", profile, session });
}
function loadTask554Manifest(root, profile, session) {
  const manifestModule = pathToFileURL(path.join(root, "scripts/runtime-smoke/adapters/task-554/output-manifest.ts")).href;
  const input = task554SmokeInvocation(profile, session);
  const source = [
    `import { buildExactTask554ScreenshotManifest } from ${JSON.stringify(manifestModule)};`,
    `const manifest = buildExactTask554ScreenshotManifest(${JSON.stringify(input)});`,
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
  assertNofollowTask554SmokeRoot(root);
  const directory = task554SessionDirectory(root, session);
  const directoryStats = lstatSync(directory);
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink()) throw new Error("task_554_smoke_session_not_directory");
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
function assertExactSmokeSessionFiles(root, session, expectedPaths) {
  const expected = new Set(expectedPaths);
  const actual = collectSessionFiles(root, session);
  if (actual.length !== expected.size || actual.some((filePath) => !expected.has(filePath))) {
    throw new Error(`task_554_smoke_output_extra_or_missing:${JSON.stringify(actual)}`);
  }
  return actual;
}
function sameStableFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode && left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs;
}
function readStableSmokeFile(root, relativePath, maximumBytes, label) {
  const absolute = path.resolve(root, relativePath); const smokeRoot = assertNofollowTask554SmokeRoot(root); const assertSession = () => { const directory = path.dirname(absolute); const stats = lstatSync(directory); if (path.dirname(directory) !== smokeRoot || !stats.isDirectory() || stats.isSymbolicLink()) throw new Error("task_554_smoke_session_not_directory"); };
  assertSession(); const initial = lstatSync(absolute);
  if (!initial.isFile() || initial.isSymbolicLink()) throw new Error(`${label}_not_regular:${relativePath}`);
  let descriptor;
  try {
    if (!Number.isInteger(constants.O_NOFOLLOW)) throw new Error("task_554_smoke_nofollow_unsupported");
    descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.size < 1 || before.size > maximumBytes) throw new Error(`${label}_invalid:${relativePath}`);
    const bytes = Buffer.from(readFileSync(descriptor)); const after = fstatSync(descriptor);
    const final = lstatSync(absolute); assertSession(); assertNofollowTask554SmokeRoot(root);
    if (!sameStableFile(before, after) || !sameStableFile(after, final) || bytes.byteLength !== after.size) throw new Error(`${label}_changed:${relativePath}`);
    return bytes;
  } finally { if (descriptor !== undefined) closeSync(descriptor); }
}
function assertBoundedPng(root, relativePath) {
  const bytes = readStableSmokeFile(root, relativePath, MAXIMUM_PNG_BYTES, "task_554_smoke_png");
  if (bytes.byteLength < 33 || bytes.byteLength > MAXIMUM_PNG_BYTES || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) || bytes.toString("ascii", 12, 16) !== "IHDR") throw new Error(`task_554_smoke_png_invalid:${relativePath}`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width === 0 || height === 0 || width > MAXIMUM_PNG_DIMENSION || height > MAXIMUM_PNG_DIMENSION) throw new Error(`task_554_smoke_png_dimensions:${relativePath}`);
  return bytes;
}
function assertDecodedTask554Pngs(root, pngBytes) {
  const manifestModule = pathToFileURL(path.join(root, "scripts/runtime-smoke/adapters/task-554/output-manifest.ts")).href;
  const source = [`import { decodeTask554Png } from ${JSON.stringify(manifestModule)};`, "const bytes = new Uint8Array(await new Response(Bun.stdin.stream()).arrayBuffer());", "process.stdout.write(JSON.stringify(decodeTask554Png(bytes)));"].join("\n");
  const decoded = pngBytes.map((bytes) => {
    const result = spawnSync("bun", ["--eval", source], { cwd: root, input: bytes, encoding: "buffer", stdio: ["pipe", "pipe", "pipe"] });
    try { if (result.error || result.status !== 0 || result.signal) throw result.error ?? new Error(String(result.status ?? result.signal)); return JSON.parse(result.stdout.toString("utf8")); } catch (error) { throw new Error("task_554_smoke_png_decode_invalid", { cause: error }); }
  });
  if (decoded.length !== pngBytes.length || decoded.some((entry) => !entry || Object.keys(entry).length !== 2 || !Number.isSafeInteger(entry.width) || !Number.isSafeInteger(entry.height) || entry.width <= 0 || entry.height <= 0 || entry.width > MAXIMUM_PNG_DIMENSION || entry.height > MAXIMUM_PNG_DIMENSION)) throw new Error("task_554_smoke_png_decode_shape");
  return Object.freeze(decoded.map(({ width, height }) => Object.freeze({ width, height })));
}
const TASK_554_SUCCESS_TIMINGS = Object.freeze([["cleanup", "all"], ["snapshot", "task554-after"], ["snapshot", "task554-before"], ["suite", "task-554"]]);
const TASK_554_REMOVAL_KEYS = Object.freeze(["postChildrenRemoved", "accessLogsRemoved", "loginAuditRowsRemoved", "sessionsRemoved", "userRolesRemoved", "postsRemoved", "usersRemoved", "rolesRemoved"]);
const TASK_554_CLEANUP_COUNT_KEYS = Object.freeze([...TASK_554_REMOVAL_KEYS, "workerStarts", "workerRequests", "databaseBatches", "statements", "rows", "pageErrors", "repositorySnapshots"]); const TASK_554_CLEANUP_KEYS = Object.freeze([...TASK_554_CLEANUP_COUNT_KEYS, "settingsRestored", "fixturesAbsent", "identitiesAbsent"]);
function isSafeCount(value) { return Number.isSafeInteger(value) && value >= 0; }
function assertExactReport(report, profile, session, manifest, root) {
  const reportKeys = ["schemaVersion", "suiteId", "profile", "session", "pass", "serverUp", "timings", "processes", "snapshots", "scenarios", "screenshots", "consoleErrors", "suiteCleanup", "cleanup", "failures"]; const fixtureCount = profile === "fast" ? 7 : profile === "certification" ? 28 : null;
  if (!hasExactKeys(report, reportKeys) || fixtureCount === null || report.schemaVersion !== 1 || report.suiteId !== "task-554" || report.profile !== profile || report.session !== session || report.pass !== true || report.serverUp !== true || report.snapshots !== 2 || !Array.isArray(report.consoleErrors) || report.consoleErrors.length !== 0 || !Array.isArray(report.failures) || report.failures.length !== 0) throw new Error("task_554_smoke_report_identity");
  if (!Array.isArray(report.timings) || report.timings.length !== TASK_554_SUCCESS_TIMINGS.length || report.timings.some((entry, index) => !hasExactKeys(entry, ["kind", "name", "count", "failed", "elapsedMs"]) || entry.kind !== TASK_554_SUCCESS_TIMINGS[index][0] || entry.name !== TASK_554_SUCCESS_TIMINGS[index][1] || entry.count !== 1 || entry.failed !== 0 || !isSafeCount(entry.elapsedMs))) throw new Error("task_554_smoke_report_timings");
  const expectedProcesses = { git: 2, "playwright-close": 1, "playwright-open": 1, "playwright-run-code": fixtureCount, "playwright-state-load": 2, "task554-dev-host": 1, "task554-worker-db": 1 };
  if (!hasExactKeys(report.processes, Object.keys(expectedProcesses)) || Object.entries(expectedProcesses).some(([key, value]) => report.processes[key] !== value)) throw new Error("task_554_smoke_report_processes");
  if (!Array.isArray(report.scenarios)) throw new Error("task_554_smoke_report:scenario_count"); assertExactScenarioIds(report.scenarios.map((scenario) => scenario?.id), "task_554_smoke_report");
  if (report.scenarios.some((scenario) => !hasExactKeys(scenario, ["id", "pass", "elapsedMs"]) || scenario.pass !== true || !isSafeCount(scenario.elapsedMs))) throw new Error("task_554_smoke_report_scenarios");
  const cleanup = report.suiteCleanup; const removalRows = hasExactKeys(cleanup, TASK_554_CLEANUP_KEYS) ? TASK_554_REMOVAL_KEYS.reduce((sum, key) => sum + cleanup[key], 0) : -1;
  if (!hasExactKeys(cleanup, TASK_554_CLEANUP_KEYS) || TASK_554_CLEANUP_COUNT_KEYS.some((key) => !isSafeCount(cleanup[key])) || cleanup.postsRemoved !== fixtureCount || cleanup.workerStarts !== 1 || cleanup.workerRequests !== fixtureCount + 3 || cleanup.databaseBatches !== fixtureCount + 3 || cleanup.statements !== fixtureCount + 27 || cleanup.rows !== 4 + 2 * fixtureCount + removalRows || cleanup.pageErrors !== 0 || cleanup.repositorySnapshots !== 2 || cleanup.settingsRestored !== true || cleanup.fixturesAbsent !== true || cleanup.identitiesAbsent !== true) throw new Error("task_554_smoke_report_suite_cleanup");
  if (!hasExactKeys(report.cleanup, ["pass", "failures"]) || report.cleanup.pass !== true || !Array.isArray(report.cleanup.failures) || report.cleanup.failures.length !== 0) throw new Error("task_554_smoke_report_cleanup");
  if (!Array.isArray(report.screenshots) || report.screenshots.length !== manifest.paths.length) throw new Error("task_554_smoke_report_screenshot_count");
  const pngBytes = manifest.paths.map((relativePath) => assertBoundedPng(root, relativePath));
  assertDecodedTask554Pngs(root, pngBytes);
  for (const [index, screenshot] of report.screenshots.entries()) { const expectedPath = manifest.paths[index];
    if (!screenshot || Object.keys(screenshot).length !== 2 || screenshot.path !== expectedPath || typeof screenshot.sha256 !== "string" || !SHA256.test(screenshot.sha256)) throw new Error(`task_554_smoke_report_screenshot:${index}`);
    const actualDigest = createHash("sha256").update(pngBytes[index]).digest("hex");
    if (screenshot.sha256 !== actualDigest) throw new Error(`task_554_smoke_report_hash:${index}`);
  }
  return Object.freeze(pngBytes);
}
const TASK_554_SAFE_SMOKE_FAILURE_CODES = new Set(["smoke_adapter_unavailable", "smoke_authentication_failed", "smoke_argument_invalid", "smoke_cleanup_failed", "smoke_output_invalid", "smoke_poll_timeout", "smoke_process_failed", "smoke_process_spawn_failed", "smoke_process_timeout", "smoke_repository_changed", "smoke_repository_invalid", "smoke_server_unexpected_exit"]);
function task554SmokeFailureCode(report, profile, session) {
  if (!hasExactKeys(report, ["schemaVersion", "suiteId", "profile", "session", "pass", "serverUp", "timings", "processes", "snapshots", "scenarios", "screenshots", "consoleErrors", "suiteCleanup", "cleanup", "failures"])) return null;
  const failure = report.failures?.[0]; const cleanup = report.cleanup; const timingKinds = new Set(["suite", "phase", "scenario", "process", "snapshot", "cleanup"]);
  if (report.schemaVersion !== 1 || report.suiteId !== "task-554" || report.profile !== profile || report.session !== session || report.pass !== false || report.serverUp !== false || !Array.isArray(report.timings) || !Array.isArray(report.scenarios) || report.scenarios.length !== 0 || !Array.isArray(report.screenshots) || report.screenshots.length !== 0 || !Array.isArray(report.consoleErrors) || report.consoleErrors.length !== 0 || !hasExactKeys(report.processes, Object.keys(report.processes)) || !Object.entries(report.processes).every(([key, value]) => /^[a-z0-9][a-z0-9._-]{0,63}$/u.test(key) && Number.isSafeInteger(value) && value >= 0) || !Number.isSafeInteger(report.snapshots) || report.snapshots < 0 || !hasExactKeys(report.suiteCleanup, []) || !hasExactKeys(cleanup, ["pass", "failures"]) || typeof cleanup.pass !== "boolean" || !Array.isArray(cleanup.failures) || !cleanup.failures.every((entry) => hasExactKeys(entry, ["resource", "phase", "code"]) && /^[a-z0-9][a-z0-9._-]{0,63}$/u.test(entry.resource) && ["close", "absence"].includes(entry.phase) && entry.code === "smoke_cleanup_failed")) return null;
  if (!report.timings.every((entry) => hasExactKeys(entry, ["kind", "name", "count", "failed", "elapsedMs"]) && timingKinds.has(entry.kind) && /^[a-z0-9][a-z0-9._-]{0,63}$/u.test(entry.name) && [entry.count, entry.failed, entry.elapsedMs].every((value) => Number.isSafeInteger(value) && value >= 0))) return null;
  return Array.isArray(report.failures) && report.failures.length === 1 && hasExactKeys(failure, ["code"]) && typeof failure.code === "string" && TASK_554_SAFE_SMOKE_FAILURE_CODES.has(failure.code) ? failure.code : null;
}
function readTask554SmokeFailureCode(root, reportPath, profile, session) { try { const bytes = readStableSmokeFile(root, reportPath, 1_048_576, "task_554_smoke_report"); const text = bytes.toString("utf8"); if (!Buffer.from(text, "utf8").equals(bytes) || bytes[bytes.byteLength - 1] !== 0x0a) return null; assertExactSmokeSessionFiles(root, session, [reportPath]); return task554SmokeFailureCode(JSON.parse(text), profile, session); } catch { return null; } }
export function assertExactTask554SmokeEvidence(root, profile, session, manifest, reportBytes) {
  const checkedManifest = assertExactTask554Manifest(root, profile, session, manifest);
  assertNofollowTask554SmokeRoot(root);
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
  if (!readStableSmokeFile(root, reportPath, 1_048_576, "task_554_smoke_report").equals(bytes)) throw new Error("task_554_smoke_report_file_mismatch");
  let report;
  try {
    report = JSON.parse(reportText);
  } catch (error) {
    throw new Error("task_554_smoke_report_json_invalid", { cause: error });
  }
  assertExactSmokeSessionFiles(root, session, [reportPath, ...checkedManifest.paths]);
  const pngBytes = assertExactReport(report, profile, session, checkedManifest, root);
  return Object.freeze({ manifest: checkedManifest, report, reportBytes: bytes, pngBytes });
}
function captureSmokeEvidenceSnapshot(root, evidence) {
  assertExactTask554SmokeEvidence(root, evidence.report.profile, evidence.report.session, evidence.manifest, evidence.reportBytes);
  const smokeRoot = ensureInsideRoot(root, assertNofollowTask554SmokeRoot(root), "smoke_ancestor"); const sessionPath = ensureInsideRoot(root, task554SessionDirectory(root, evidence.report.session), "smoke_session");
  const reportPath = ensureInsideRoot(root, path.join(task554SessionDirectory(root, evidence.report.session), "report.json"), "smoke_report");
  return new Map([smokeRoot, sessionPath, reportPath, ...evidence.manifest.paths].map((relativePath) => [relativePath, fingerprintPath(root, relativePath)]));
}
function assertSmokeEvidenceSnapshot(snapshot, root) {
  for (const [relativePath, value] of snapshot) if (fingerprintPath(root, relativePath) !== value) throw new Error(`task_554_smoke_evidence_changed:${relativePath}`);
}
function smokeEvidencePaths(snapshot) {
  return [...snapshot.keys()];
}
function createEmptySmokeSession(root, session, createdDirectories = null) {
  assertNofollowTask554SmokeRoot(root, true, createdDirectories);
  const directory = task554SessionDirectory(root, session);
  if (existsSync(directory)) throw new Error(`task_554_smoke_session_preexisting:${session}`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stats = lstatSync(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`task_554_smoke_session_create_failed:${session}`);
  return directory;
}
function createOwnedTask554SmokeSession(root, session) {
  const createdDirectories = []; const directory = createEmptySmokeSession(root, session, createdDirectories); const smokeRoot = assertNofollowTask554SmokeRoot(root); const stats = lstatSync(directory);
  if (path.dirname(directory) !== smokeRoot || !stats.isDirectory() || stats.isSymbolicLink()) throw new Error(`task_554_smoke_session_create_failed:${session}`);
  return Object.freeze({ directory, node: task554SmokeDirectoryNode(stats), createdDirectories: Object.freeze(createdDirectories) });
}
function removeOwnedTask554SmokeDirectory(root, expected) {
  const directory = ensureInsideRoot(root, expected.path, "smoke_ancestor"); const absolute = path.resolve(root, directory); let stats;
  try { stats = lstatSync(absolute); } catch (error) { if (error?.code === "ENOENT") return; throw error; }
  if (!stats.isDirectory() || stats.isSymbolicLink() || !sameTask554SmokeDirectoryNode(expected.node, task554SmokeDirectoryNode(stats))) throw new Error(`task_554_smoke_ancestor_changed:${directory}`);
  if (readdirSync(absolute).length !== 0) return; rmdirSync(absolute);
  try { lstatSync(absolute); } catch (error) { if (error?.code === "ENOENT") return; throw error; }
  throw new Error(`task_554_smoke_ancestor_cleanup_failed:${directory}`);
}
function removeOwnedTask554FailedSmokeSession(root, session, owned) {
  const smokeRoot = assertNofollowTask554SmokeRoot(root); const directory = task554SessionDirectory(root, session);
  if (owned.directory !== directory || path.dirname(directory) !== smokeRoot) throw new Error(`task_554_smoke_session_ownership_invalid:${session}`);
  let stats;
  try { stats = lstatSync(directory); } catch (error) { if (error?.code !== "ENOENT") throw error; stats = null; }
  if (stats !== null) {
    if (!stats.isDirectory() || stats.isSymbolicLink() || !sameTask554SmokeDirectoryNode(owned.node, task554SmokeDirectoryNode(stats))) throw new Error(`task_554_smoke_session_changed:${session}`);
    rmSync(directory, { recursive: true, force: false });
    try { lstatSync(directory); } catch (error) { if (error?.code !== "ENOENT") throw error; stats = null; }
    if (stats !== null) throw new Error(`task_554_smoke_session_cleanup_failed:${session}`);
  }
  for (const expected of [...owned.createdDirectories].reverse()) removeOwnedTask554SmokeDirectory(root, expected);
}
function assertByteIdenticalReport(expectedBytes, reportPath) {
  const actualBytes = readFileSync(reportPath);
  if (!Buffer.from(expectedBytes).equals(actualBytes)) throw new Error("task_554_smoke_report_not_stdout_identical");
}
function preserveSmokePrimaryFailure(primary, restoration) {
  if (primary === null) return restoration;
  return new Error(primary instanceof Error ? primary.message : String(primary), {
    cause: new AggregateError([primary, restoration], "TASK-554 smoke primary and restoration failures"),
  });
}
function restoreFailedTask554SmokeRun(root, session, ownedFailedSession, before, primary) {
  let failure = primary;
  try { if (ownedFailedSession !== null) removeOwnedTask554FailedSmokeSession(root, session, ownedFailedSession); } catch (restoration) { failure = preserveSmokePrimaryFailure(failure, restoration); }
  try { assertNoRepositoryMutation("task_554_smoke_repository_restoration", before, captureRepositoryFingerprint(root), root); } catch (restoration) { failure = preserveSmokePrimaryFailure(failure, restoration); }
  return failure;
}
function finalizeTask554SmokeProfile(root, session, ownedFailedSession, before, evidenceSnapshot, evidence, primary) {
  let failure = primary; let evidenceRevalidated = false;
  try { if (evidenceSnapshot === null || evidence === null) throw new Error("task_554_smoke_evidence_missing"); assertExactTask554SmokeEvidence(root, evidence.report.profile, evidence.report.session, evidence.manifest, evidence.reportBytes); assertSmokeEvidenceSnapshot(evidenceSnapshot, root); evidenceRevalidated = true; } catch (restoration) { failure = preserveSmokePrimaryFailure(failure, restoration); }
  if (failure !== null) return restoreFailedTask554SmokeRun(root, session, ownedFailedSession, before, failure);
  try { assertNoRepositoryMutation("task_554_smoke_repository_restoration", before, captureRepositoryFingerprint(root, smokeEvidencePaths(evidenceSnapshot)), root); } catch (restoration) { failure = preserveSmokePrimaryFailure(failure, restoration); }
  return failure === null && evidenceRevalidated ? null : restoreFailedTask554SmokeRun(root, session, ownedFailedSession, before, failure);
}
export function runTask554SmokeProfile(root, profile, session) {
  verifyBeforeDispatch("runtime_smoke", root);
  const before = captureRepositoryFingerprint(root);
  let evidence = null;
  let evidenceSnapshot = null; let ownedFailedSession = null;
  let primary = null;
  try {
    const manifest = loadTask554Manifest(root, profile, session);
    ownedFailedSession = createOwnedTask554SmokeSession(root, session);
    const directory = ownedFailedSession.directory;
    const reportPath = path.join(directory, "report.json");
    const reportFd = openSync(reportPath, "wx", 0o600);
    let execution;
    try {
      execution = spawnSync("bun", ["scripts/runtime-smoke.ts", "run", "--suite", "task-554", "--profile", profile, "--session", session], { cwd: root, stdio: ["ignore", reportFd, "inherit"] });
    } finally {
      closeSync(reportFd);
    }
    if (execution?.error || execution?.status !== 0 || execution?.signal) throw new Error(`task_554_smoke_runner_failed:${readTask554SmokeFailureCode(root, ensureInsideRoot(root, reportPath, "smoke_report"), profile, session) ?? "report_invalid"}`);
    assertNofollowTask554SmokeRoot(root);
    const reportBytes = readStableSmokeFile(root, ensureInsideRoot(root, reportPath, "smoke_report"), 1_048_576, "task_554_smoke_report");
    if (reportBytes.byteLength === 0) throw new Error("task_554_smoke_report_missing");
    evidence = assertExactTask554SmokeEvidence(root, profile, session, manifest, reportBytes);
    evidenceSnapshot = captureSmokeEvidenceSnapshot(root, evidence);
  } catch (error) {
    primary = error;
  } finally { primary = finalizeTask554SmokeProfile(root, session, ownedFailedSession, before, evidenceSnapshot, evidence, primary); }
  if (primary !== null) throw primary;
  return Object.freeze({ pass: true, profile, session, evidence });
}
function removeFastSmokeEvidence(root) {
  assertNoStagedChanges(root); assertNoForbiddenDirty(root); assertNofollowTask554SmokeRoot(root);
  const directory = task554SessionDirectory(root, "task-554-fast");
  const expected = path.resolve(root, "_docs/_workflows/_smoke/task-554/task-554-fast");
  if (directory !== expected || !existsSync(directory)) throw new Error("task_554_fast_evidence_missing_before_cleanup");
  const stats = lstatSync(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error("task_554_fast_evidence_not_owned_directory");
  rmSync(directory, { recursive: true, force: false }); try { lstatSync(directory); } catch (error) { if (error?.code === "ENOENT") return; throw error; } throw new Error("task_554_fast_evidence_cleanup_failed");
}
export function runTask554SmokeSequence(root = ROOT, operations = Object.freeze({ runProfile: runTask554SmokeProfile, removeFastEvidence: removeFastSmokeEvidence })) {
  const fast = operations.runProfile(root, "fast", "task-554-fast");
  operations.removeFastEvidence(root);
  const certification = operations.runProfile(root, "certification", "task-554-certification");
  return Object.freeze({ fast, certification });
}
const COMMON = `Repository: ${ROOT}; task: ${TASK}; changelog: 1267.
Read current HEAD/status/diff, root AGENTS.md, TASK-554/board, relevant architecture/API/RBAC/security/testing docs, source and tests. The pre-existing untracked _TMP-task-dispatch-plan-2026-08-10.md is owner state and must remain untouched.
Use the configured OpenCode coder role. Never stage, commit, push, reset, clean, revert unrelated changes, expose secrets, weaken assertions, or edit outside the exact owner paths. Read shared files immediately before editing; every touched production/test module ends <=1000 physical lines.
TASK-551-09-L02 exclusively owns post-cache/front invalidation: do not edit postsService.ts or add a cache wrapper. Reuse shared lifecycle, dispatcher, worker, cleanup, browser, and reporting primitives; add only task-specific adapter operations, selectors, and manifest behavior. A missing actor must receive auth_required before validation;
metadata response application must preserve newer metadata plus unrelated local edits.`;
async function dispatchResult(phaseName, identity, prompt) {
  verifyBeforeDispatch(phaseName);
  return requirePass(identity, identity, await agent(
    `${COMMON}\n${prompt}`,
    { label: identity, phase: phaseName, schema: RESULT_SCHEMA },
  ));
}
async function dispatchScopedResult(phaseName, identity, prompt, allowedPaths) {
  const before = captureRepositoryFingerprint();
  let result;
  let changed;
  try {
    result = await dispatchResult(phaseName, identity, prompt);
  } finally {
    changed = assertScopedRepositoryMutation(identity, before, captureRepositoryFingerprint(), allowedPaths);
  }
  return Object.freeze({ result, changed });
}
async function dispatchAudit(phaseName, identity, prompt) {
  verifyBeforeDispatch(phaseName);
  const before = captureRepositoryFingerprint();
  try {
    return requireCleanAudit(identity, identity, await agent(
      `${COMMON}\n${prompt}`,
      { label: identity, phase: phaseName, schema: AUDIT_SCHEMA },
    ));
  } finally {
    assertNoRepositoryMutation(`task_554_read_only_audit_mutated:${identity}`, before, captureRepositoryFingerprint());
  }
}
async function runOwner(owner) {
  const implementationIdentity = `task-554:implement:${owner.id}`;
  const implementationStep = await dispatchScopedResult("Sequential owners", implementationIdentity,
    `Implement only owner ${owner.id}. Allowed paths: ${owner.paths.join(", ")}.
Run that owner’s focused required tests and static checks. Do not run real smoke,
documentation, task/changelog closure, stage, or commit. Return exact files changed and
actual commands in the summary.`, owner.paths);
  const executedGates = runOwnerGateCommands(ROOT, owner.id);
  const gateIdentity = `task-554:gate:${owner.id}`;
  const gateStep = await dispatchScopedResult("Sequential owners", gateIdentity,
    `Read-only gate for owner ${owner.id}. Inspect the current owner diff and rerun its exact targeted
lanes. Verify changed paths equal the owner scope, no forbidden path, no weakened assertion,
 no file above 1,000 physical lines, and no unreported skipped command. Do not edit.`, []);
  return Object.freeze({ id: owner.id, changed: implementationStep.changed, executedGates, implementation: implementationStep.result, gate: gateStep.result });
}
async function runDocumentationOwner() {
  const identity = "task-554:implement:documentation";
  const step = await dispatchScopedResult("Documentation", identity,
    `Implement only the pre-smoke documentation owner. Allowed paths: ${DOCUMENTATION_OWNER.paths.join(", ")}.
Document the internal route/RBAC/CSRF behavior, pure present-only contract, Post-detail generation/tombstone/cache-bus/hydration behavior, TASK-551 boundary,
and the registered shared-wrapper/helper/worker smoke recipe. Do not edit changelog, board,
 TASK-554 contract/status, product/test/workflow files, stage, or commit.`, DOCUMENTATION_OWNER.paths);
  return Object.freeze({ changed: step.changed, result: step.result });
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
async function runWorkflow() {
  phase("Start gate"); const preflight = assertImplementationPreflight();
  const startStep = await dispatchScopedResult("Start gate", "task-554:start-gate", `Read-only. Verify the current author/audit/reconcile receipt, exact workflow bootstrap, reachable baseline, dependencies/collisions, and dirty state. Do not edit.`, []);
  const start = startStep.result;
  phase("Sequential owners"); const owners = [];
  for (const owner of OWNERS) owners.push(await runOwner(owner));
  phase("Documentation"); const documentation = await runDocumentationOwner();
  phase("Full validation"); const validation = runTask554FullValidation();
  phase("Post-audit"); const audits = await runPostAudit();
  phase("Runtime smoke");
  const { fast, certification } = runTask554SmokeSequence(ROOT);
  phase("Owner review");
  return Object.freeze({ pass: false, ownerActionRequired: "owner_review_certification", preflight, start, owners: Object.freeze(owners), documentation, validation, audits, fast, certification });
}
async function runResumeAfterFixWorkflow() {
  phase("Start gate"); const preflight = assertResumePreflight();
  phase("Full validation"); const validation = runTask554FullValidation();
  phase("Post-audit"); const audits = await runPostAudit();
  phase("Runtime smoke");
  const { fast, certification } = runTask554SmokeSequence(ROOT);
  phase("Owner review");
  return Object.freeze({ pass: false, ownerActionRequired: "owner_review_certification", resume: "resume_full_validation_post_audit_smoke", preflight, validation, audits, fast, certification });
}
function writeTinyFile(filePath, content) { mkdirSync(path.dirname(filePath), { recursive: true }); writeFileSync(filePath, content, "utf8"); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
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
    writeTinyFile(path.join(tempRoot, ".gitignore"), "_docs/_workflows/\n");
    writeTinyFile(path.join(tempRoot, "core/tracked.ts"), "export const tracked = 1;\n");
    commandOutput(tempRoot, "git", ["add", ".gitignore", "core/tracked.ts"]);
    commandOutput(tempRoot, "git", ["commit", "-qm", "baseline"]);
    const stableIgnoredPath = "_docs/_workflows/stable-before-task-554.mjs";
    writeTinyFile(path.join(tempRoot, stableIgnoredPath), "export const stable = true;\n");
    if (currentDirtyPaths(tempRoot).includes(stableIgnoredPath) || !captureRepositoryFingerprint(tempRoot).has(stableIgnoredPath)) {
      throw new Error("task_554_self_test_stable_ignored_preflight");
    }
    const stableEmptyDirectory = "_docs/_workflows/stable-empty-before-task-554";
    mkdirSync(path.join(tempRoot, stableEmptyDirectory));
    if (currentDirtyPaths(tempRoot).includes(stableEmptyDirectory) || !captureRepositoryFingerprint(tempRoot).has(stableEmptyDirectory)) {
      throw new Error("task_554_self_test_stable_empty_directory_preflight");
    }
    const releaseReport = path.join(tempRoot, RELEASE_GATE_REPORT_PATH);
    const releaseAbsent = releaseGateSnapshot(tempRoot);
    runTask554ReleaseGate(tempRoot, () => writeTinyFile(releaseReport, "{\"created\":true}\n"));
    if (!sameReleaseGateSnapshot(releaseAbsent, releaseGateSnapshot(tempRoot))) throw new Error("task_554_self_test_release_gate_created_report");
    writeTinyFile(releaseReport, "{\"original\":true}\n"); chmodSync(releaseReport, 0o600);
    const releasePresent = releaseGateSnapshot(tempRoot);
    runTask554ReleaseGate(tempRoot, () => writeTinyFile(releaseReport, "{\"changed\":true}\n"));
    if (!sameReleaseGateSnapshot(releasePresent, releaseGateSnapshot(tempRoot))) throw new Error("task_554_self_test_release_gate_existing_report");
    const releaseSibling = path.join(tempRoot, ".tmp/stable-before-gate.txt"); writeTinyFile(releaseSibling, "stable\n");
    const releaseWithSibling = releaseGateSnapshot(tempRoot); const unexpectedSibling = path.join(tempRoot, ".tmp/unexpected-after-gate.txt");
    expectFailure(() => runTask554ReleaseGate(tempRoot, () => writeTinyFile(unexpectedSibling, "unexpected\n")), "task_554_release_gate_report_restore_failed");
    unlinkSync(unexpectedSibling); if (!sameReleaseGateSnapshot(releaseWithSibling, releaseGateSnapshot(tempRoot))) throw new Error("task_554_self_test_release_gate_sibling");
    const tmpMutationBefore = captureRepositoryFingerprint(tempRoot); writeTinyFile(path.join(tempRoot, ".tmp/gate-side-effect.txt"), "side effect\n"); expectFailure(() => assertNoRepositoryMutation("task_554_self_test_tmp", tmpMutationBefore, captureRepositoryFingerprint(tempRoot), tempRoot), "task_554_self_test_tmp:scope_violation:"); rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true });
    const hardlinkSource = path.join(tempRoot, ".tmp/hardlink-source"); writeTinyFile(hardlinkSource, "hard link\n"); linkSync(hardlinkSource, path.join(tempRoot, ".tmp/hardlink-peer")); expectFailure(() => captureTask554TmpSnapshot(tempRoot), "task_554_tmp_entry_invalid"); rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true });
    const nestedDirectory = path.join(tempRoot, ".tmp/nested"); writeTinyFile(path.join(nestedDirectory, "entry"), "nested\n"); const nestedExpected = releaseGateSnapshot(tempRoot); const movedNested = path.join(tempRoot, "nested-original"); renameSync(nestedDirectory, movedNested); mkdirSync(nestedDirectory); expectFailure(() => restoreReleaseGateSnapshot(tempRoot, nestedExpected), "task_554_release_gate_tmp_identity_changed"); rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true }); rmSync(movedNested, { recursive: true, force: true });
    writeTinyFile(path.join(tempRoot, ".tmp/root-entry"), "root\n"); const rootExpected = releaseGateSnapshot(tempRoot); const movedRoot = path.join(tempRoot, ".tmp-original"); renameSync(path.join(tempRoot, ".tmp"), movedRoot); mkdirSync(path.join(tempRoot, ".tmp")); expectFailure(() => restoreReleaseGateSnapshot(tempRoot, rootExpected), "task_554_release_gate_tmp_identity_changed"); rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true }); rmSync(movedRoot, { recursive: true, force: true });
    writeTinyFile(releaseReport, "{\"original\":true}\n"); const reportIdentity = releaseGateSnapshot(tempRoot); expectFailure(() => runTask554ReleaseGate(tempRoot, () => { renameSync(releaseReport, `${releaseReport}.moved`); writeTinyFile(releaseReport, "{\"replaced\":true}\n"); }), "task_554_release_gate_report_identity_changed"); if (!reportIdentity.report) throw new Error("task_554_self_test_release_gate_report_identity"); rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true });
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
    writeTinyFile(path.join(tempRoot, "scripts/exempt.generated.ts"), `${"x\n".repeat(1001)}`);
    if (listTask554LineCountCandidates(tempRoot, baseline).includes("scripts/exempt.generated.ts")) {
      throw new Error("task_554_self_test_generated_line_candidate");
    }
    assertTask554LineLimit(tempRoot, baseline);
    rmSync(path.join(tempRoot, "scripts/exempt.generated.ts"));
    const fastInvocation = task554SmokeInvocation("fast", "task-554-fast");
    const certificationInvocation = task554SmokeInvocation("certification", "task-554-certification");
    if (fastInvocation.profile !== "fast" || fastInvocation.session !== "task-554-fast" || certificationInvocation.profile !== "certification" || certificationInvocation.session !== "task-554-certification") throw new Error("task_554_self_test_manifest_input_binding");
    expectFailure(() => task554SmokeInvocation("fast", "task-554-certification"), "task_554_smoke_profile_session_mismatch:fast:task-554-certification");
    const validResultIdentity = "task-554:self-test";
    const validResult = { pass: true, summary: "clean", errors: [] };
    requirePass("task_554_self_test_result", validResultIdentity, validResult);
    expectFailure(() => requirePass("task_554_self_test_result", validResultIdentity, { ...validResult, identity: validResultIdentity }), "task_554_self_test_result:invalid_result:");
    const validAuditIdentity = "task-554:self-audit";
    const validAudit = { pass: true, summary: "clean", findings: [] };
    requireCleanAudit("task_554_self_test_post_audit", validAuditIdentity, validAudit);
    expectFailure(() => requireCleanAudit("task_554_self_test_final_drift", validAuditIdentity, { ...validAudit, findings: [{ severity: "LOW", area: "a", finding: "b", evidence: "c", recommendation: "d", extra: true }] }), "task_554_self_test_final_drift:invalid_finding:");
    const before = captureRepositoryFingerprint(tempRoot);
    writeTinyFile(path.join(tempRoot, "tests/allowed.ts"), "export const allowed = true;\n");
    assertScopedRepositoryMutation("task_554_self_test_allowed", before, captureRepositoryFingerprint(tempRoot), ["tests/allowed.ts"], tempRoot);
    const forbiddenBefore = captureRepositoryFingerprint(tempRoot);
    writeTinyFile(path.join(tempRoot, "core/services/content/postsService.ts"), "export const forbidden = true;\n");
    expectFailure(
      () => assertScopedRepositoryMutation("task_554_self_test_forbidden", forbiddenBefore, captureRepositoryFingerprint(tempRoot), ["core/services/content/postsService.ts"], tempRoot),
      "task_554_self_test_forbidden:scope_violation:",
    );
    rmSync(path.join(tempRoot, "core/services/content/postsService.ts"));
    expectFailure(
      () => runReadOnlyGate("task_554_self_test_gate", tempRoot, () => writeTinyFile(path.join(tempRoot, "tests/gate-side-effect.ts"), "export const sideEffect = true;\n")),
      "task_554_self_test_gate:scope_violation:",
    );
    rmSync(path.join(tempRoot, "tests/gate-side-effect.ts"));
    const ignoredBefore = captureRepositoryFingerprint(tempRoot);
    writeTinyFile(path.join(tempRoot, "_docs/_workflows/ignored-side-effect.mjs"), "export const ignored = true;\n");
    expectFailure(() => assertNoRepositoryMutation("task_554_self_test_ignored", ignoredBefore, captureRepositoryFingerprint(tempRoot), tempRoot), "task_554_self_test_ignored:scope_violation:");
    rmSync(path.join(tempRoot, "_docs/_workflows/ignored-side-effect.mjs"));
    const modeBefore = captureRepositoryFingerprint(tempRoot);
    chmodSync(path.join(tempRoot, "core/tracked.ts"), 0o755);
    expectFailure(() => assertNoRepositoryMutation("task_554_self_test_mode", modeBefore, captureRepositoryFingerprint(tempRoot), tempRoot), "task_554_self_test_mode:scope_violation:");
    chmodSync(path.join(tempRoot, "core/tracked.ts"), 0o644);
    writeTinyFile(path.join(tempRoot, "tests/link-target-a.ts"), "export const target = 'a';\n");
    writeTinyFile(path.join(tempRoot, "tests/link-target-b.ts"), "export const target = 'b';\n");
    const linkPath = path.join(tempRoot, "tests/link-target.ts");
    symlinkSync("link-target-a.ts", linkPath);
    const symlinkBefore = captureRepositoryFingerprint(tempRoot);
    unlinkSync(linkPath);
    symlinkSync("link-target-b.ts", linkPath);
    expectFailure(() => assertNoRepositoryMutation("task_554_self_test_symlink", symlinkBefore, captureRepositoryFingerprint(tempRoot), tempRoot), "task_554_self_test_symlink:scope_violation:");
    unlinkSync(linkPath);
    const externalSmokeRoot = mkdtempSync(path.join(os.tmpdir(), "task-554-smoke-external-"));
    const smokeAncestor = path.join(tempRoot, "_docs/_workflows/_smoke/task-554");
    mkdirSync(path.dirname(smokeAncestor), { recursive: true });
    symlinkSync(externalSmokeRoot, smokeAncestor, "dir");
    for (const action of [() => createEmptySmokeSession(tempRoot, "task-554-fast"), () => collectSessionFiles(tempRoot, "task-554-fast"), () => removeFastSmokeEvidence(tempRoot)]) {
      expectFailure(action, "task_554_smoke_ancestor_invalid");
    }
    if (readdirSync(externalSmokeRoot).length !== 0) throw new Error("task_554_self_test_smoke_ancestor_symlink");
    rmSync(smokeAncestor);
    rmSync(externalSmokeRoot, { recursive: true, force: true });
    const failedSmokeBefore = captureRepositoryFingerprint(tempRoot);
    const failedSmokeDirectories = [];
    const failedSmokeDirectory = createEmptySmokeSession(tempRoot, "task-554-certification", failedSmokeDirectories);
    const failedSmokeStats = lstatSync(failedSmokeDirectory);
    const failedSmokeSession = Object.freeze({ directory: failedSmokeDirectory, node: task554SmokeDirectoryNode(failedSmokeStats), createdDirectories: Object.freeze(failedSmokeDirectories) });
    expectFailure(() => assertNoRepositoryMutation("task_554_self_test_failed_empty_smoke", failedSmokeBefore, captureRepositoryFingerprint(tempRoot), tempRoot), "task_554_self_test_failed_empty_smoke:scope_violation:");
    removeOwnedTask554FailedSmokeSession(tempRoot, "task-554-certification", failedSmokeSession);
    assertNoRepositoryMutation("task_554_self_test_failed_smoke_restored", failedSmokeBefore, captureRepositoryFingerprint(tempRoot), tempRoot);
    const session = "task-554-fast";
    const manifest = makeSelfTestManifest(tempRoot, session);
    const pngBytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLZ4QAAAABJRU5ErkJggg==", "base64");
    writeTinyFile(path.join(tempRoot, "scripts/runtime-smoke/adapters/task-554/output-manifest.ts"), `export function decodeTask554Png(bytes: Uint8Array) { if (bytes.byteLength !== ${pngBytes.byteLength} || bytes[12] !== 73 || bytes[13] !== 72 || bytes[14] !== 68 || bytes[15] !== 82) throw new Error("invalid_png"); const read = (offset: number) => (((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0); return { width: read(16), height: read(20) }; }\n`);
    const smokeBefore = captureRepositoryFingerprint(tempRoot);
    const ownedEvidenceSession = createOwnedTask554SmokeSession(tempRoot, session); const sessionDirectory = ownedEvidenceSession.directory;
    const screenshots = manifest.paths.map((relativePath) => { writeTinyFile(path.join(tempRoot, relativePath), pngBytes); return Object.freeze({ path: relativePath, sha256: sha256(pngBytes) }); });
    const reportValue = { schemaVersion: 1, suiteId: "task-554", profile: "fast", session, pass: true, serverUp: true, snapshots: 2,
      timings: TASK_554_SUCCESS_TIMINGS.map(([kind, name]) => ({ kind, name, count: 1, failed: 0, elapsedMs: 1 })), processes: { git: 2, "playwright-close": 1, "playwright-open": 1, "playwright-run-code": 7, "playwright-state-load": 2, "task554-dev-host": 1, "task554-worker-db": 1 },
      scenarios: TASK_554_SMOKE_SCENARIO_IDS.map((id) => ({ id, pass: true, elapsedMs: 1 })), screenshots, consoleErrors: [],
      suiteCleanup: { postChildrenRemoved: 0, accessLogsRemoved: 0, loginAuditRowsRemoved: 0, sessionsRemoved: 0, userRolesRemoved: 0, postsRemoved: 7, usersRemoved: 0, rolesRemoved: 0, workerStarts: 1, workerRequests: 10, databaseBatches: 10, statements: 34, rows: 25, pageErrors: 0, repositorySnapshots: 2, settingsRestored: true, fixturesAbsent: true, identitiesAbsent: true }, cleanup: { pass: true, failures: [] }, failures: [] };
    const report = Buffer.from(`${JSON.stringify(reportValue)}\n`);
    const reportPath = path.join(sessionDirectory, "report.json");
    const reportFd = openSync(reportPath, "wx", 0o600);
    const capture = spawnSync(process.execPath, ["-e", "process.stdout.write(process.argv[1])", report.toString("utf8")], { stdio: ["ignore", reportFd, "pipe"] });
    closeSync(reportFd);
    if (capture.error || capture.status !== 0) throw new Error("task_554_self_test_report_capture");
    assertByteIdenticalReport(report, reportPath);
    const evidence = assertExactTask554SmokeEvidence(tempRoot, "fast", session, manifest, readFileSync(reportPath));
    const evidenceSnapshot = captureSmokeEvidenceSnapshot(tempRoot, evidence);
    assertNoRepositoryMutation("task_554_self_test_validated_smoke", smokeBefore, captureRepositoryFingerprint(tempRoot, [...evidenceSnapshot.keys()]), tempRoot);
    const rejectReportMutation = (mutate) => { const candidate = structuredClone(reportValue); mutate(candidate); expectFailure(() => assertExactReport(candidate, "fast", session, manifest, tempRoot), "task_554_smoke_report"); };
    const reportMutations = [(value) => { value.timings[0].name = "drift"; }, (value) => { [value.timings[0], value.timings[1]] = [value.timings[1], value.timings[0]]; }, (value) => { value.timings[0].count = 2; }, (value) => { value.timings[0].failed = 1; }, (value) => { value.timings[0].elapsedMs = "1"; }, (value) => { value.timings[0].extra = 1; },
      (value) => { delete value.processes.git; }, (value) => { value.processes.extra = 1; }, (value) => { value.processes.git = 1; }, (value) => { value.processes.git = "2"; },
      (value) => { delete value.suiteCleanup.rows; }, (value) => { value.suiteCleanup.extra = 0; }, (value) => { value.suiteCleanup.rows = "25"; }, (value) => { value.suiteCleanup.settingsRestored = false; }, (value) => { value.suiteCleanup.fixturesAbsent = false; }, (value) => { value.suiteCleanup.identitiesAbsent = false; }, (value) => { value.suiteCleanup.postsRemoved = 6; }, (value) => { value.suiteCleanup.workerStarts = 2; }, (value) => { value.suiteCleanup.workerRequests = 9; }, (value) => { value.suiteCleanup.databaseBatches = 9; }, (value) => { value.suiteCleanup.statements = 33; }, (value) => { value.suiteCleanup.rows = 24; }, (value) => { value.suiteCleanup.pageErrors = 1; }, (value) => { value.suiteCleanup.repositorySnapshots = 1; },
      (value) => { delete value.cleanup.failures; }, (value) => { value.cleanup.extra = true; }, (value) => { value.cleanup.pass = false; }, (value) => { value.cleanup.failures.push({ code: "smoke_cleanup_failed" }); }, (value) => { value.scenarios[0].extra = true; }, (value) => { value.scenarios[0].pass = false; }, (value) => { value.scenarios[0].elapsedMs = "1"; }, (value) => { [value.scenarios[0], value.scenarios[1]] = [value.scenarios[1], value.scenarios[0]]; }, (value) => { value.screenshots.pop(); }, (value) => { value.screenshots[0].extra = true; }, (value) => { value.screenshots[0].sha256 = "0".repeat(64); }, (value) => { value.consoleErrors.push("unexpected"); }, (value) => { value.failures.push({ code: "smoke_output_invalid" }); }, (value) => { value.extra = true; }, (value) => { delete value.serverUp; }];
    for (const mutate of reportMutations) rejectReportMutation(mutate);
    const certificationReport = structuredClone(reportValue); Object.assign(certificationReport, { profile: "certification", session: "task-554-certification", processes: { ...certificationReport.processes, "playwright-run-code": 28 }, suiteCleanup: { ...certificationReport.suiteCleanup, postsRemoved: 28, workerRequests: 31, databaseBatches: 31, statements: 55, rows: 88 } }); assertExactReport(certificationReport, "certification", "task-554-certification", manifest, tempRoot);
    const fakeBunDirectory = path.join(tempRoot, ".task-554-fake-bun"); const fakeManifest = makeSelfTestManifest(tempRoot, "task-554-certification");
    writeTinyFile(path.join(tempRoot, AUTHOR_AUDIT_PATH), `if (process.argv[2] === "--task-554-bootstrap-verify") process.stdout.write(${JSON.stringify(JSON.stringify({ baseline: TASK_554_BASELINE_SHA, paths: TASK_554_WORKFLOW_PATHS }))});\n`);
    const failureReport = (code) => `${JSON.stringify({ schemaVersion: 1, suiteId: "task-554", profile: "certification", session: "task-554-certification", pass: false, serverUp: false, timings: [], processes: {}, snapshots: 0, scenarios: [], screenshots: [], consoleErrors: [], suiteCleanup: {}, cleanup: { pass: true, failures: [] }, failures: [{ code }] })}\n`;
    const fakeBun = path.join(fakeBunDirectory, "bun"); writeTinyFile(fakeBun, `#!/usr/bin/env node\nif (process.argv[2] === "--eval") process.stdout.write(${JSON.stringify(JSON.stringify(fakeManifest))}); else { process.stdout.write(process.env.TASK_554_SELF_TEST_REPORT ?? ""); process.exit(1); }\n`); chmodSync(fakeBun, 0o755);
    const runnerBefore = captureRepositoryFingerprint(tempRoot); const previousPath = process.env.PATH; const previousReport = process.env.TASK_554_SELF_TEST_REPORT; process.env.PATH = `${fakeBunDirectory}:${previousPath ?? ""}`;
    try { process.env.TASK_554_SELF_TEST_REPORT = failureReport("smoke_process_failed"); expectFailure(() => runTask554SmokeProfile(tempRoot, "certification", "task-554-certification"), "task_554_smoke_runner_failed:smoke_process_failed"); process.env.TASK_554_SELF_TEST_REPORT = "{}\n"; expectFailure(() => runTask554SmokeProfile(tempRoot, "certification", "task-554-certification"), "task_554_smoke_runner_failed:report_invalid"); process.env.TASK_554_SELF_TEST_REPORT = failureReport("smoke_unknown"); expectFailure(() => runTask554SmokeProfile(tempRoot, "certification", "task-554-certification"), "task_554_smoke_runner_failed:report_invalid"); } finally { if (previousPath === undefined) delete process.env.PATH; else process.env.PATH = previousPath; if (previousReport === undefined) delete process.env.TASK_554_SELF_TEST_REPORT; else process.env.TASK_554_SELF_TEST_REPORT = previousReport; }
    if (existsSync(task554SessionDirectory(tempRoot, "task-554-certification"))) throw new Error("task_554_self_test_failed_runner_session_residue");
    assertNoRepositoryMutation("task_554_self_test_failed_runner_restored", runnerBefore, captureRepositoryFingerprint(tempRoot), tempRoot); rmSync(fakeBunDirectory, { recursive: true, force: true }); rmSync(path.join(tempRoot, AUTHOR_AUDIT_PATH));
    const replacement = `${reportPath}.replacement`;
    writeTinyFile(replacement, Buffer.concat([Buffer.from(" "), report])); renameSync(replacement, reportPath);
    expectFailure(() => assertExactTask554SmokeEvidence(tempRoot, "fast", session, manifest, evidence.reportBytes), "task_554_smoke_report_file_mismatch");
    writeTinyFile(reportPath, report);
    writeTinyFile(path.join(tempRoot, manifest.paths[0]), Buffer.from("not-a-png"));
    expectFailure(() => assertExactTask554SmokeEvidence(tempRoot, "fast", session, manifest, readFileSync(reportPath)), "task_554_smoke_png_invalid:");
    writeTinyFile(path.join(tempRoot, manifest.paths[0]), pngBytes);
    writeTinyFile(path.join(tempRoot, manifest.paths[1]), Buffer.concat([pngBytes, Buffer.from("changed")]));
    expectFailure(() => assertExactTask554SmokeEvidence(tempRoot, "fast", session, manifest, readFileSync(reportPath)), "task_554_smoke_png_decode_invalid");
    expectFailure(() => assertSmokeEvidenceSnapshot(evidenceSnapshot, tempRoot), "task_554_smoke_evidence_changed:");
    writeTinyFile(path.join(tempRoot, manifest.paths[1]), pngBytes);
    writeTinyFile(path.join(tempRoot, "_docs/_workflows/ignored-sibling.mjs"), "export const ignoredSibling = true;\n");
    expectFailure(() => assertNoRepositoryMutation("task_554_self_test_smoke_sibling", smokeBefore, captureRepositoryFingerprint(tempRoot, [...evidenceSnapshot.keys()]), tempRoot), "task_554_self_test_smoke_sibling:scope_violation:");
    rmSync(path.join(tempRoot, "_docs/_workflows/ignored-sibling.mjs"));
    const snapshotMismatch = { ...JSON.parse(report.toString("utf8")), snapshots: 1 };
    expectFailure(() => assertExactReport(snapshotMismatch, "fast", session, manifest, tempRoot), "task_554_smoke_report_identity");
    writeTinyFile(path.join(sessionDirectory, "extra.txt"), "not allowed\n");
    expectFailure(
      () => assertExactTask554SmokeEvidence(tempRoot, "fast", session, manifest, readFileSync(reportPath)),
      "task_554_smoke_output_extra_or_missing:",
    );
    rmSync(path.join(sessionDirectory, "extra.txt"));
    mkdirSync(path.join(sessionDirectory, "empty"));
    expectFailure(() => assertExactTask554SmokeEvidence(tempRoot, "fast", session, manifest, readFileSync(reportPath)), "task_554_smoke_output_nested_directory:");
    rmSync(path.join(sessionDirectory, "empty"), { recursive: true });
    const reserialized = Buffer.from(JSON.stringify(JSON.parse(report.toString("utf8"))), "utf8");
    expectFailure(() => assertByteIdenticalReport(reserialized, reportPath), "task_554_smoke_report_not_stdout_identical");
    chmodSync(path.join(tempRoot, manifest.paths[0]), 0o600);
    const revalidationFailure = finalizeTask554SmokeProfile(tempRoot, session, ownedEvidenceSession, smokeBefore, evidenceSnapshot, evidence, null);
    expectFailure(() => { if (revalidationFailure !== null) throw revalidationFailure; }, "task_554_smoke_evidence_changed:");
    if (existsSync(sessionDirectory)) throw new Error("task_554_self_test_failed_evidence_revalidation_session_residue");
    const boardBefore = ["- **To Do:** 1 tasks", "- **In Progress:** 2 tasks", "- **Done:** 3 tasks", "## In Progress", "| ID |", "| TASK-554 | title | priority | effort | In progress 2026-08-11. details |", "## Done", "| ID |", "| TASK-999 | retained |"].join("\n");
    const boardAfter = ["- **To Do:** 1 tasks", "- **In Progress:** 1 tasks", "- **Done:** 4 tasks", "## In Progress", "| ID |", "## Done", "| ID |", "| TASK-999 | retained |", "| TASK-554 | title | priority | effort | ✅ Done (2026-08-11): details |"].join("\n");
    assertTask554BoardClosureDelta(boardBefore, boardAfter);
    expectFailure(() => assertTask554BoardClosureDelta(boardBefore, boardAfter.replace("TASK-999", "TASK-998")), "task_554_closure_board_scope_invalid");
    expectFailure(() => assertTask554BoardClosureDelta(boardBefore, boardAfter.replace("- **Done:** 4 tasks", "- **Done:** 4 tasks\n- **Done:** 4 tasks")), "task_554_closure_board_statistics_duplicate");
    const indexBefore = `prefix\n${CHANGELOG_RESERVATION_BEFORE}\n| No. | Date | Title | Type |`;
    const indexAfter = `prefix\n${CHANGELOG_RESERVATION_AFTER}\n| No. | Date | Title | Type |\n${CHANGELOG_1267_INDEX_ROW}`;
    assertTask554ChangelogClosureDelta(indexBefore, indexAfter, null, CHANGELOG_1267_ENTRY_BYTES);
    expectFailure(() => assertTask554ChangelogClosureDelta(indexBefore, indexAfter.replace("prefix", "other"), null, CHANGELOG_1267_ENTRY_BYTES), "task_554_closure_changelog_scope_invalid");
    expectFailure(() => assertTask554ChangelogClosureDelta(indexBefore, indexAfter, null, Buffer.concat([CHANGELOG_1267_ENTRY_BYTES, Buffer.from("unrelated\n")])), "task_554_closure_entry_invalid");
    const primary = new Error("task_554_smoke_primary");
    const combined = preserveSmokePrimaryFailure(primary, new Error("task_554_smoke_restoration"));
    if (!(combined instanceof Error) || combined.message !== primary.message || !(combined.cause instanceof AggregateError) || combined.cause.errors[0] !== primary) throw new Error("task_554_self_test_smoke_primary_preserved");
    assertTask554TerminalStatusDelta("**Status:** 🚧 In Progress\n**Started:** 2026-08-11", "**Status:** ✅ Done\n**Completed:** 2026-08-11\n**Started:** 2026-08-11");
    expectFailure(() => assertTask554TerminalStatusDelta("**Status:** 🚧 In Progress\nbody", "**Status:** ✅ Done\n**Completed:** 2026-08-11\nchanged"), "task_554_closure_terminal_status_invalid");
    return Object.freeze({ pass: true, unterminatedLineCount: true, trackedAndUntrackedCandidates: true, generatedArtifactExcluded: true, stableIgnoredArtifactsBound: true, emptyIgnoredDirectoriesBound: true,
      manifestInputBound: true, smokeProfileSessionPairRejected: true, strictMutationAndAuditResultsRejected: true, agentIdentityRejected: true, releaseGateReportRestored: true, releaseGateSiblingResidueRejected: true,
      tmpMutationRejected: true, releaseGateHardlinkRejected: true, releaseGateDirectoryIdentityRejected: true, releaseGateReportIdentityRejected: true, forbiddenScopeRejected: true, directStdoutCapture: true,
      boundedPngEvidenceRejected: true, decodedPngEvidenceRejected: true, extraSmokeOutputRejected: true, reportReserializationRejected: true, gateMutationRejected: true, ignoredWorkflowMutationRejected: true,
      modeAndSymlinkFingerprintRejected: true, smokeAncestorSymlinkRejected: true, smokeFinallyRestorationRejected: true, failedEmptySmokeDirectoryRejected: true, failedSmokeRestored: true, failedRunnerRestored: true, classifiedRunnerFailureRejected: true, malformedRunnerReportRejected: true, unknownRunnerReportRejected: true,
      exactEvidenceRevalidationRejected: true, failedEvidenceRevalidationRestored: true, replacementEvidenceRejected: true, duplicateScreenshotHashesAllowed: true, nestedSuccessReportRejected: true, certificationReportProfileBound: true, snapshotMismatchRejected: true, narrowClosureRejected: true, duplicateBoardStatisticRejected: true, canonicalClosureRejected: true });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
const importedForVerification = process.env.TASK_554_WORKFLOW_IMPORT === "1";
const isDirectInvocation = () => { try { return typeof process.argv[1] === "string" && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (importedForVerification && isDirectInvocation()) throw new Error("task_554_workflow_import_direct_invocation");
const mode = importedForVerification ? "import" : parseImplementationMode();
export const result = mode === "self-test"
  ? workflowSelfTest()
  : importedForVerification
    ? null
    : mode === "resume"
      ? await runResumeAfterFixWorkflow()
      : mode === "smoke"
        ? runTask554SmokeSequence(ROOT)
        : await runWorkflow();
if (mode === "self-test") process.stdout.write(`${JSON.stringify(result)}\n`);
if (mode === "smoke") process.stdout.write(`${JSON.stringify({ pass: true, fast: { profile: result.fast.profile, session: result.fast.session }, certification: { profile: result.certification.profile, session: result.certification.session } })}\n`);
