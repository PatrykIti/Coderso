import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fstatSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertTask493BoardClosureDelta,
  assertTask493ChangelogClosureDelta,
  assertTask493TerminalStatusDelta,
  CHANGELOG_1309_ENTRY_BYTES,
  CHANGELOG_1309_INDEX_ROW,
  CHANGELOG_RESERVATION_AFTER,
  CHANGELOG_RESERVATION_BEFORE,
} from "./task-493-closeout.mjs";
export const meta = Object.freeze({
  name: "task-493-implement",
  description:
    "Implement TASK-493 sequentially with fail-closed ownership, executable gates, shared smoke, and an owner-review handoff.",
  phases: Object.freeze([
    Object.freeze({ title: "Start gate" }),
    Object.freeze({ title: "Sequential owners" }),
    Object.freeze({ title: "Documentation" }),
    Object.freeze({ title: "Full validation" }),
    Object.freeze({ title: "Post-audit" }),
    Object.freeze({ title: "Runtime smoke" }),
    Object.freeze({ title: "Owner review" }),
  ]),
});
const ROOT = "/home/coder/project/Coderso-493";
export const TASK_493_BASELINE_SHA = "3c4700929fc288fbf067e19b91ee62587154116d";
const TASK = "TASK-493";
const AUTHOR_AUDIT_PATH = "_docs/_workflows/task-493-author-audit.mjs";
const SELF_TEST_ARG = "--task-493-workflow-self-test";
const RESUME_AFTER_FIX_ARG = "--task-493-resume-after-fix";
const SMOKE_ONLY_ARG = "--task-493-smoke";
const SHA256 = /^[a-f0-9]{64}$/u;
const SOURCE_OR_TEST_EXTENSION = /\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/u;
const GENERATED_ARTIFACT_EXTENSION = /\.generated\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/u;
const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const MAXIMUM_PNG_BYTES = 16 * 1024 * 1024;
const MAXIMUM_PNG_DIMENSION = 16_384;
const MAX_WORKFLOW_TREE_ENTRIES = 4096;
const MAX_WORKFLOW_TREE_DEPTH = 64;
const RELEASE_GATE_REPORT_PATH = ".tmp/coderso-release-gates.json";
const TASK_493_WORKFLOW_PATHS = Object.freeze([
  "_docs/_workflows/task-493-author-audit.mjs",
  "_docs/_workflows/task-493-implement.mjs",
  "_docs/_workflows/task-493-fix.mjs",
  "_docs/_workflows/task-493-closeout.mjs",
]);
export const TASK_493_SMOKE_SCENARIO_IDS = Object.freeze([
  "sitemap-xml-served",
  "robots-txt-sitemap-directive",
  "seo-overview-real-data",
  "sitemap-submit-status",
  "indexed-pages-sync",
  "search-performance-read",
  "seo-manager-fifth-card",
]);
const RESULT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
});
const AUDIT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "findings"],
  properties: {
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
const owner = (id, paths) => Object.freeze({ id, paths: Object.freeze(paths) });
export const OWNERS = Object.freeze([
  owner("workflow-contract-tests", [
    "tests/unit/workflows/task493AuthorAudit.test.ts",
    "tests/unit/workflows/task493WorkflowContracts.test.ts",
  ]),
  owner("01-l01-schema-types", [
    "core/db/tables/seo.ts",
    "core/services/seo/seoSearchPerformanceTypes.ts",
    "tests/vitest/seo/seoSearchPerformanceTypes.test.ts",
  ]),
  owner("01-l02-migration", [
    "core/db/migrations/0079_sitemap_search_performance.sql",
    "core/db/migrations/meta/0079_snapshot.json",
    "core/db/migrations/meta/_journal.json",
    "tests/integration/toolchain/bunLaneProvision.test.ts",
    "tests/integration/toolchain/bunLaneProvisioning.test.ts",
    "tests/integration/toolchain/runBunParallel.test.ts",
  ]),
  owner("03-l01-gsc-client", [
    "core/services/integrations/registry.ts",
    "core/services/seo/gscClient.ts",
    "tests/integration/integrations/gscClient.test.ts",
    "tests/security/gsc-credential.test.ts",
  ]),
  owner("02-l01-sitemap", [
    "core/services/seo/sitemapService.ts",
    "core/server/publicSite.tsx",
    "tests/vitest/seo/sitemapBuilder.test.ts",
    "tests/integration/routes/sitemap.test.ts",
  ]),
  owner("03-l02-gsc-sync", [
    "core/services/seo/gscSyncService.ts",
    "tests/integration/seo/gscSyncService.test.ts",
    "tests/security/seo-sync-service.test.ts",
  ]),
  owner("02-l02-sitemap-submission", [
    "core/services/seo/sitemapSubmissionService.ts",
    "tests/integration/seo/sitemapSubmissionService.test.ts",
    "tests/security/seo-sitemap-submission.test.ts",
  ]),
  owner("04-l01-aggregation", [
    "core/services/seo/seoTypes.ts",
    "core/services/seo/seoPerformanceService.ts",
    "tests/vitest/seo/seoPerformanceAggregation.test.ts",
  ]),
  owner("04-l02-routes", [
    "core/server/routes/seoRoutes.ts",
    "core/server/validation/seoSchemas.ts",
    "tests/integration/routes/seo-performance.test.ts",
  ]),
  owner("05-l01-admin-rewire", [
    "core/admin/services/seoClient.ts",
    "core/admin/services/cachePolicy.ts",
    "core/admin/ui/seo/SeoManagerPage.tsx",
    "core/admin/ui/seo/SeoPerformancePanel.tsx",
    "tests/vitest/ui-integration/seo-manager-performance.test.tsx",
    "tests/vitest/ui-integration/tools-seo-restyle.test.tsx",
  ]),
  owner("06-l01-gate-tests", [
    "tests/integration/routes/seo-pipeline.test.ts",
    "tests/perf/seo-sitemap.test.ts",
    "tests/security/seo-pipeline.test.ts",
    "tests/integration/routes/seo.test.ts",
  ]),
  owner("06-l02-docs", [
    "_docs/DATA_MODEL.md",
    "_docs/CMS_API.md",
    "_docs/SEARCH_SPEC.md",
    "_docs/SECURITY_SPEC.md",
    "_docs/ADMIN_CACHE.md",
    "_docs/ADMIN_CACHE_MAP.md",
    "_docs/_CHANGELOG/1309-2026-08-19-task-493-seo-indexing-and-search-performance-pipeline.md",
    "_docs/_CHANGELOG/README.md",
  ]),
  owner("smoke-adapter", [
    "scripts/runtime-smoke/contracts.ts",
    "scripts/runtime-smoke/cli.ts",
    "scripts/runtime-smoke/registry.ts",
    "scripts/runtime-smoke/server/supervised-server.ts",
    "scripts/runtime-smoke/adapters/task-493.ts",
    "scripts/runtime-smoke/adapters/task-493/browser-actions.ts",
    "scripts/runtime-smoke/adapters/task-493/output-manifest.ts",
    "scripts/runtime-smoke/adapters/task-493/worker-entry.ts",
    "scripts/runtime-smoke/adapters/task-493/worker-operations.ts",
    "scripts/runtime-smoke/adapters/task-493/routing-settings-lease.ts",
    "scripts/runtime-smoke/adapters/task-493/production-handlers.ts",
    "tests/unit/runtime-smoke/cli-registry.test.ts",
    "tests/unit/runtime-smoke/supervised-server.test.ts",
    "tests/unit/runtime-smoke/repository-report.test.ts",
    "tests/unit/runtime-smoke/task-493-adapter.test.ts",
    "tests/unit/runtime-smoke/task-493-worker.test.ts",
  ]),
]);
const DOCUMENTATION_OWNER = owner("documentation", [
  "_docs/DATA_MODEL.md",
  "_docs/CMS_API.md",
  "_docs/SEARCH_SPEC.md",
  "_docs/SECURITY_SPEC.md",
  "_docs/ADMIN_CACHE.md",
  "_docs/ADMIN_CACHE_MAP.md",
  "docs/develop/runtime-smoke-cookbook.md",
  "tests/README.md",
]);
const FORBIDDEN_PATHS = Object.freeze([
  ...TASK_493_WORKFLOW_PATHS,
  "_TMP-task-dispatch-plan-2026-08-10.md",
  "core/services/seo/seoService.ts",
  "core/services/content/postsService.ts",
  "core/services/content/postMutationService.ts",
  "_docs/_TASKS/TASK-414",
  "_docs/_TASKS/TASK-547",
  "_docs/_CHANGELOG/1308-",
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
const command = (label, commandName, args) =>
  Object.freeze({ label, command: commandName, args: Object.freeze(args) });
export const FULL_GATE_COMMANDS = Object.freeze([
  command("task_493_seo_vitest", "bunx", [
    "vitest",
    "run",
    "--config",
    "vitest.config.ts",
    "tests/vitest/seo/seoSearchPerformanceTypes.test.ts",
    "tests/vitest/seo/sitemapBuilder.test.ts",
    "tests/vitest/seo/seoPerformanceAggregation.test.ts",
    "tests/vitest/ui-integration/seo-manager-performance.test.tsx",
  ]),
  command("task_493_seo_bun", "bun", [
    "test",
    "tests/integration/routes/sitemap.test.ts",
    "tests/integration/seo/sitemapSubmissionService.test.ts",
    "tests/integration/seo/gscSyncService.test.ts",
    "tests/integration/integrations/gscClient.test.ts",
    "tests/integration/routes/seo-performance.test.ts",
    "tests/integration/routes/seo-pipeline.test.ts",
    "tests/integration/routes/seo.test.ts",
  ]),
  command("task_493_seo_security", "bun", [
    "test",
    "tests/security/gsc-credential.test.ts",
    "tests/security/seo-sitemap-submission.test.ts",
    "tests/security/seo-sync-service.test.ts",
    "tests/security/seo-pipeline.test.ts",
  ]),
  command("task_493_seo_perf", "bun", ["test", "tests/perf/seo-sitemap.test.ts"]),
  command("task_493_runtime_harness", "bun", [
    "test",
    "tests/unit/runtime-smoke/cli-registry.test.ts",
    "tests/unit/runtime-smoke/supervised-server.test.ts",
    "tests/unit/runtime-smoke/repository-report.test.ts",
    "tests/unit/runtime-smoke/task-493-adapter.test.ts",
    "tests/unit/runtime-smoke/task-493-worker.test.ts",
  ]),
  command("task_493_workflow_contracts", "bun", [
    "test",
    "tests/unit/workflows/task493AuthorAudit.test.ts",
    "tests/unit/workflows/task493WorkflowContracts.test.ts",
  ]),
  command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
  command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  command("task_493_admin_boundary", "bun", ["run", "check:admin-boundary"]),
  command("task_493_security_scan", "bun", ["run", "scan:security:strict"]),
  command("task_493_coderso_release_gates", "bun", ["run", "gates:coderso"]),
  command("task_493_precommit", "bun", ["run", "precommit:check"]),
  command("task_493_author_syntax", "node", [
    "--check",
    "_docs/_workflows/task-493-author-audit.mjs",
  ]),
  command("task_493_implement_syntax", "node", [
    "--check",
    "_docs/_workflows/task-493-implement.mjs",
  ]),
  command("task_493_fix_syntax", "node", ["--check", "_docs/_workflows/task-493-fix.mjs"]),
  command("task_493_closeout_syntax", "node", [
    "--check",
    "_docs/_workflows/task-493-closeout.mjs",
  ]),
]);
export const OWNER_GATE_COMMANDS = Object.freeze({
  "workflow-contract-tests": Object.freeze([
    command("task_493_workflow_contracts", "bun", [
      "test",
      "tests/unit/workflows/task493AuthorAudit.test.ts",
      "tests/unit/workflows/task493WorkflowContracts.test.ts",
    ]),
    command("task_493_author_syntax", "node", [
      "--check",
      "_docs/_workflows/task-493-author-audit.mjs",
    ]),
    command("task_493_implement_syntax", "node", [
      "--check",
      "_docs/_workflows/task-493-implement.mjs",
    ]),
    command("task_493_fix_syntax", "node", ["--check", "_docs/_workflows/task-493-fix.mjs"]),
  ]),
  "01-l01-schema-types": Object.freeze([
    command("task_493_types_vitest", "bunx", [
      "vitest",
      "run",
      "--config",
      "vitest.config.ts",
      "tests/vitest/seo/seoSearchPerformanceTypes.test.ts",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "01-l02-migration": Object.freeze([
    command("task_493_toolchain", "bun", [
      "test",
      "tests/integration/toolchain/bunLaneProvision.test.ts",
      "tests/integration/toolchain/bunLaneProvisioning.test.ts",
      "tests/integration/toolchain/runBunParallel.test.ts",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "03-l01-gsc-client": Object.freeze([
    command("task_493_gsc_client_bun", "bun", [
      "test",
      "tests/integration/integrations/gscClient.test.ts",
      "tests/security/gsc-credential.test.ts",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "02-l01-sitemap": Object.freeze([
    command("task_493_sitemap_vitest", "bunx", [
      "vitest",
      "run",
      "--config",
      "vitest.config.ts",
      "tests/vitest/seo/sitemapBuilder.test.ts",
    ]),
    command("task_493_sitemap_bun", "bun", ["test", "tests/integration/routes/sitemap.test.ts"]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "03-l02-gsc-sync": Object.freeze([
    command("task_493_gsc_sync_bun", "bun", [
      "test",
      "tests/integration/seo/gscSyncService.test.ts",
      "tests/security/seo-sync-service.test.ts",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "02-l02-sitemap-submission": Object.freeze([
    command("task_493_submission_bun", "bun", [
      "test",
      "tests/integration/seo/sitemapSubmissionService.test.ts",
      "tests/security/seo-sitemap-submission.test.ts",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "04-l01-aggregation": Object.freeze([
    command("task_493_aggregation_vitest", "bunx", [
      "vitest",
      "run",
      "--config",
      "vitest.config.ts",
      "tests/vitest/seo/seoPerformanceAggregation.test.ts",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "04-l02-routes": Object.freeze([
    command("task_493_routes_bun", "bun", [
      "test",
      "tests/integration/routes/seo-performance.test.ts",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "05-l01-admin-rewire": Object.freeze([
    command("task_493_admin_vitest", "bunx", [
      "vitest",
      "run",
      "--config",
      "vitest.config.ts",
      "tests/vitest/ui-integration/seo-manager-performance.test.tsx",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "06-l01-gate-tests": Object.freeze([
    command("task_493_pipeline_bun", "bun", [
      "test",
      "tests/integration/routes/seo-pipeline.test.ts",
      "tests/perf/seo-sitemap.test.ts",
      "tests/security/seo-pipeline.test.ts",
      "tests/integration/routes/seo.test.ts",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
  "06-l02-docs": Object.freeze([
    command("task_493_docs_verify", "node", ["--check", "_docs/_workflows/task-493-closeout.mjs"]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
  ]),
  "smoke-adapter": Object.freeze([
    command("task_493_runtime_harness", "bun", [
      "test",
      "tests/unit/runtime-smoke/cli-registry.test.ts",
      "tests/unit/runtime-smoke/supervised-server.test.ts",
      "tests/unit/runtime-smoke/repository-report.test.ts",
      "tests/unit/runtime-smoke/task-493-adapter.test.ts",
      "tests/unit/runtime-smoke/task-493-worker.test.ts",
    ]),
    command("task_493_types", "bun", ["--cwd", "core", "lint:types"]),
    command("task_493_lint", "bun", ["--cwd", "core", "lint"]),
  ]),
});
function commandOutput(root, command, args, environment) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
    ...(environment ? { env: { ...process.env, ...environment } } : {}),
  });
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
function parseImplementationMode() {
  const args = process.argv.slice(2);
  if (args.length === 0) return "run";
  if (args.length === 1 && args[0] === SELF_TEST_ARG) return "self-test";
  if (args.length === 1 && args[0] === RESUME_AFTER_FIX_ARG) return "resume";
  if (args.length === 1 && args[0] === SMOKE_ONLY_ARG) return "smoke";
  throw new Error(`task_493_unknown_arguments:${args.join(",")}`);
}
const RESULT_KEYS = Object.freeze(["pass", "summary", "errors"]);
const AUDIT_KEYS = Object.freeze(["pass", "summary", "findings"]);
const FINDING_KEYS = Object.freeze(["severity", "area", "finding", "evidence", "recommendation"]);
const MAX_RESULT_ITEMS = 40;
const MAX_RESULT_FIELD_LENGTH = 2048;
function hasExactKeys(value, keys) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
function nonEmptyBoundedString(value) {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= MAX_RESULT_FIELD_LENGTH
  );
}
function requirePass(label, identity, result) {
  if (
    !hasExactKeys(result, RESULT_KEYS) ||
    result.pass !== true ||
    !nonEmptyBoundedString(result.summary) ||
    !Array.isArray(result.errors) ||
    result.errors.length > MAX_RESULT_ITEMS ||
    result.errors.some((error) => !nonEmptyBoundedString(error)) ||
    result.errors.length !== 0
  )
    throw new Error(`${label}:invalid_result:${JSON.stringify(result)}`);
  return Object.freeze({ identity, ...result });
}
function requireCleanAudit(label, identity, result) {
  if (
    !hasExactKeys(result, AUDIT_KEYS) ||
    typeof result.pass !== "boolean" ||
    !nonEmptyBoundedString(result.summary) ||
    !Array.isArray(result.findings) ||
    result.findings.length > MAX_RESULT_ITEMS
  )
    throw new Error(`${label}:invalid_result:${JSON.stringify(result)}`);
  for (const finding of result.findings)
    if (
      !hasExactKeys(finding, FINDING_KEYS) ||
      !["HIGH", "MEDIUM", "LOW"].includes(finding.severity) ||
      FINDING_KEYS.slice(1).some((key) => !nonEmptyBoundedString(finding[key]))
    )
      throw new Error(`${label}:invalid_finding:${JSON.stringify(finding)}`);
  const blockers = result.findings.filter(
    (finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM"
  );
  if (result.pass !== (blockers.length === 0))
    throw new Error(`${label}:invalid_result:${JSON.stringify(result)}`);
  if (result.findings.length !== 0)
    throw new Error(`${label}:findings:${JSON.stringify(result.findings)}`);
  return Object.freeze({ identity, ...result });
}
export function verifyTask493Bootstrap(root = ROOT) {
  let parsed;
  try {
    parsed = JSON.parse(
      commandOutput(root, "node", [
        path.join(root, AUTHOR_AUDIT_PATH),
        "--task-493-bootstrap-verify",
      ]).toString("utf8")
    );
  } catch (error) {
    throw new Error("task_493_bootstrap_verifier_invalid_output", { cause: error });
  }
  if (
    parsed?.baseline !== TASK_493_BASELINE_SHA ||
    !Array.isArray(parsed?.paths) ||
    parsed.paths.length !== TASK_493_WORKFLOW_PATHS.length ||
    parsed.paths.some((entry, index) => entry !== TASK_493_WORKFLOW_PATHS[index])
  )
    throw new Error("task_493_bootstrap_verifier_invalid_receipt");
  return parsed;
}
function verifyBeforeDispatch(phaseName, root = ROOT) {
  try {
    const bootstrap = verifyTask493Bootstrap(root);
    assertNoStagedChanges(root);
    assertNoForbiddenDirty(root);
    return bootstrap;
  } catch (error) {
    throw new Error(
      `task_493_bootstrap_before_${phaseName.replaceAll(" ", "_")}:${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function verifyTask493AuthorAuditReceipt(root = ROOT) {
  const moduleUrl = pathToFileURL(path.join(root, AUTHOR_AUDIT_PATH)).href;
  const source = `import { assertTask493AuthorAuditReceipt } from ${JSON.stringify(moduleUrl)}; process.stdout.write(JSON.stringify(assertTask493AuthorAuditReceipt(${JSON.stringify(root)})));`;
  let receipt;
  try {
    receipt = JSON.parse(
      commandOutput(root, "node", ["--input-type=module", "--eval", source], {
        TASK_493_WORKFLOW_IMPORT: "1",
      }).toString("utf8")
    );
  } catch (error) {
    throw new Error("task_493_author_audit_receipt_invalid", { cause: error });
  }
  if (receipt?.task !== TASK || receipt?.fingerprint === undefined)
    throw new Error("task_493_author_audit_receipt_invalid");
  return receipt;
}
const INITIAL_DIRTY_PATHS = Object.freeze([
  "_TMP-task-dispatch-plan-2026-08-10.md",
  "_docs/_TASKS/README.md",
  "_docs/_TASKS/TASK-493_SEO_Indexing_And_Search_Performance_Pipeline.md",
]);
export const TASK_493_RESUME_ALLOWED_DIRTY_PATHS = Object.freeze([
  ...new Set([
    ...INITIAL_DIRTY_PATHS,
    ...OWNERS.flatMap((owner) => owner.paths),
    ...DOCUMENTATION_OWNER.paths,
  ]),
]);
function currentDirtyPaths(root) {
  const paths = [
    ...parseNul(commandOutput(root, "git", ["diff", "--name-only", "-z"])),
    ...parseNul(commandOutput(root, "git", ["ls-files", "--others", "--exclude-standard", "-z"])),
  ];
  return [...new Set(paths)]
    .map(normalizedRepositoryPath)
    .sort((left, right) => left.localeCompare(right));
}
function assertNoForbiddenDirty(root = ROOT) {
  const forbidden = currentDirtyPaths(root).filter(
    (relativePath) =>
      pathMatchesForbidden(relativePath) && relativePath !== "_TMP-task-dispatch-plan-2026-08-10.md"
  );
  if (forbidden.length) throw new Error(`task_493_forbidden_dirty:${JSON.stringify(forbidden)}`);
  return Object.freeze(forbidden);
}
function assertImplementationPreflight(root = ROOT) {
  verifyBeforeDispatch("implementation_preflight", root);
  const dirty = currentDirtyPaths(root);
  const unexpected = dirty.filter((relativePath) => !INITIAL_DIRTY_PATHS.includes(relativePath));
  const forbidden = dirty.filter(
    (relativePath) =>
      pathMatchesForbidden(relativePath) && relativePath !== "_TMP-task-dispatch-plan-2026-08-10.md"
  );
  if (unexpected.length > 0 || forbidden.length > 0)
    throw new Error(`task_493_start_state_invalid:${JSON.stringify({ forbidden, unexpected })}`);
  return Object.freeze({
    receipt: verifyTask493AuthorAuditReceipt(root),
    dirty: Object.freeze(dirty),
  });
}
function assertResumePreflight(root = ROOT) {
  verifyBeforeDispatch("resume_preflight", root);
  const dirty = currentDirtyPaths(root);
  const unexpected = dirty.filter(
    (relativePath) => !TASK_493_RESUME_ALLOWED_DIRTY_PATHS.includes(relativePath)
  );
  if (unexpected.length > 0)
    throw new Error(`task_493_resume_state_invalid:${JSON.stringify({ unexpected })}`);
  return Object.freeze({ dirty: Object.freeze(dirty) });
}
function normalizedRepositoryPath(value) {
  if (typeof value !== "string" || value.includes("\0") || value.includes("\\")) {
    throw new Error("task_493_invalid_repository_path");
  }
  const normalized = path.posix.normalize(value);
  if (normalized === "." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    throw new Error(`task_493_repository_path_escape:${value}`);
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
    if (depth > MAX_WORKFLOW_TREE_DEPTH || entries.length >= MAX_WORKFLOW_TREE_ENTRIES)
      throw new Error("task_493_workflow_tree_limit");
    let stats;
    try {
      stats = lstatSync(absolutePath);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT" && absolutePath === base)
        return;
      throw error;
    }
    const relativePath = normalizedRepositoryPath(
      path.relative(root, absolutePath).split(path.sep).join("/")
    );
    entries.push(relativePath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return;
    for (const name of readdirSync(absolutePath).sort((left, right) => left.localeCompare(right)))
      visit(path.join(absolutePath, name), depth + 1);
  };
  visit(base, 0);
  return entries;
}
function task493TmpNode(stats) {
  return Object.freeze({ dev: stats.dev, ino: stats.ino, mode: stats.mode, nlink: stats.nlink });
}
function sameTask493TmpNode(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}
function readStableTask493TmpFile(absolute, label) {
  const initial = lstatSync(absolute);
  if (
    !initial.isFile() ||
    initial.isSymbolicLink() ||
    initial.nlink !== 1 ||
    initial.size > 16 * 1024 * 1024
  )
    throw new Error(`${label}_invalid`);
  let descriptor;
  try {
    descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.nlink !== 1 || before.size > 16 * 1024 * 1024)
      throw new Error(`${label}_invalid`);
    const bytes = Buffer.from(readFileSync(descriptor));
    const after = fstatSync(descriptor);
    const final = lstatSync(absolute);
    const node = task493TmpNode(before);
    if (
      !sameTask493TmpNode(task493TmpNode(initial), node) ||
      !sameTask493TmpNode(node, task493TmpNode(after)) ||
      !sameTask493TmpNode(node, task493TmpNode(final)) ||
      bytes.byteLength !== after.size
    )
      throw new Error(`${label}_changed`);
    return Object.freeze({
      bytes,
      node,
      value: `file:${node.dev}:${node.ino}:${node.mode}:${node.nlink}:${createHash("sha256").update(bytes).digest("hex")}`,
    });
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}
function captureTask493TmpSnapshot(root) {
  const directory = path.join(root, ".tmp");
  let initial;
  try {
    initial = lstatSync(directory);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT")
      return Object.freeze({
        directory: false,
        entries: Object.freeze([[".tmp", "missing"]]),
        files: new Map(),
      });
    throw error;
  }
  if (!initial.isDirectory() || initial.isSymbolicLink())
    throw new Error("task_493_tmp_root_invalid");
  const entries = [[".tmp", `directory:${initial.dev}:${initial.ino}:${initial.mode}`]];
  const files = new Map();
  const visit = (absolute, relative, depth) => {
    if (depth > MAX_WORKFLOW_TREE_DEPTH || entries.length >= MAX_WORKFLOW_TREE_ENTRIES)
      throw new Error("task_493_tmp_tree_limit");
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink()) throw new Error("task_493_tmp_entry_invalid");
    if (stats.isDirectory()) {
      const node = task493TmpNode(stats);
      entries.push([relative, `directory:${node.dev}:${node.ino}:${node.mode}`]);
      for (const name of readdirSync(absolute).sort((a, b) => a.localeCompare(b)))
        visit(path.join(absolute, name), `${relative}/${name}`, depth + 1);
      if (
        node.dev !== lstatSync(absolute).dev ||
        node.ino !== lstatSync(absolute).ino ||
        node.mode !== lstatSync(absolute).mode
      )
        throw new Error("task_493_tmp_ancestor_changed");
      return;
    }
    if (!stats.isFile()) throw new Error("task_493_tmp_entry_invalid");
    const file = readStableTask493TmpFile(absolute, "task_493_tmp_entry");
    entries.push([relative, file.value]);
    files.set(relative, file);
  };
  for (const name of readdirSync(directory).sort((a, b) => a.localeCompare(b)))
    visit(path.join(directory, name), `.tmp/${name}`, 1);
  if (
    task493TmpNode(initial).dev !== lstatSync(directory).dev ||
    task493TmpNode(initial).ino !== lstatSync(directory).ino ||
    task493TmpNode(initial).mode !== lstatSync(directory).mode
  )
    throw new Error("task_493_tmp_ancestor_changed");
  return Object.freeze({
    directory: true,
    entries: Object.freeze(entries.map((entry) => Object.freeze(entry))),
    files,
  });
}
export function captureRepositoryFingerprint(root = ROOT, excludedPaths = []) {
  const excluded = new Set(excludedPaths.map(normalizedRepositoryPath));
  const paths = [
    ...new Set([
      ...parseNul(commandOutput(root, "git", ["ls-files", "-co", "--exclude-standard", "-z"])),
      ...workflowTreePaths(root),
    ]),
  ];
  const entries = paths
    .map(normalizedRepositoryPath)
    .filter((relativePath) => !excluded.has(relativePath))
    .sort((left, right) => left.localeCompare(right))
    .map((relativePath) => Object.freeze([relativePath, fingerprintPath(root, relativePath)]));
  const tmpEntries = captureTask493TmpSnapshot(root).entries.filter(
    ([relativePath]) => !excluded.has(relativePath)
  );
  return new Map([...entries, ...tmpEntries]);
}
function changedRepositoryPaths(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].filter((pathName) => before.get(pathName) !== after.get(pathName)).sort();
}
function assertNoStagedChanges(root) {
  if (commandStatus(root, "git", ["diff", "--cached", "--quiet"]) !== 0) {
    throw new Error("task_493_staged_changes_forbidden");
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
function assertBaselineReachable(root, baseline = TASK_493_BASELINE_SHA) {
  if (commandStatus(root, "git", ["cat-file", "-e", `${baseline}^{commit}`]) !== 0) {
    throw new Error(`task_493_baseline_missing:${baseline}`);
  }
  if (commandStatus(root, "git", ["merge-base", "--is-ancestor", baseline, "HEAD"]) !== 0) {
    throw new Error(`task_493_baseline_not_ancestor:${baseline}`);
  }
}
export function listTask493LineCountCandidates(root = ROOT, baseline = TASK_493_BASELINE_SHA) {
  assertBaselineReachable(root, baseline);
  const comparison = parseNul(
    commandOutput(root, "git", [
      "diff",
      "--name-only",
      "-z",
      "--diff-filter=ACMRT",
      baseline,
      "--",
      "core",
      "packages",
      "scripts",
      "tests",
      "_docs/_workflows",
    ])
  );
  const untracked = parseNul(
    commandOutput(root, "git", [
      "ls-files",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      "core",
      "packages",
      "scripts",
      "tests",
      "_docs/_workflows",
    ])
  );
  return Object.freeze(
    [...new Set([...comparison, ...untracked])]
      .map(normalizedRepositoryPath)
      .filter(
        (candidate) =>
          SOURCE_OR_TEST_EXTENSION.test(candidate) && !GENERATED_ARTIFACT_EXTENSION.test(candidate)
      )
      .sort((left, right) => left.localeCompare(right))
  );
}
export function countPhysicalLines(filePath) {
  const result = spawnSync("awk", ["END { print NR }", filePath], { encoding: "utf8" });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(
      `task_493_line_count_failed:${filePath}:${result.error?.message ?? result.status ?? result.signal}`
    );
  }
  const count = Number.parseInt(result.stdout.trim(), 10);
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error(`task_493_line_count_invalid:${filePath}`);
  return count;
}
export function assertTask493LineLimit(root = ROOT, baseline = TASK_493_BASELINE_SHA) {
  const counted = [];
  for (const relativePath of listTask493LineCountCandidates(root, baseline)) {
    const absolute = path.resolve(root, relativePath);
    const stats = lstatSync(absolute);
    if (!stats.isFile() || stats.isSymbolicLink())
      throw new Error(`task_493_line_count_not_regular:${relativePath}`);
    const lines = countPhysicalLines(absolute);
    counted.push(Object.freeze({ path: relativePath, lines }));
    if (lines > 1000) throw new Error(`task_493_line_limit:${relativePath}:${lines}`);
  }
  return Object.freeze(counted);
}
function runRequiredCommandDirect(root, entry) {
  const result = spawnSync(entry.command, entry.args, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(
      `${entry.label}:failed:${result.error?.message ?? result.status ?? result.signal}`
    );
  }
}
function releaseGateSnapshot(root) {
  const temporary = captureTask493TmpSnapshot(root);
  return Object.freeze({
    temporary,
    report: temporary.files.get(RELEASE_GATE_REPORT_PATH) ?? null,
  });
}
function sameReleaseGateSnapshot(left, right) {
  return (
    left.temporary.entries.length === right.temporary.entries.length &&
    left.temporary.entries.every(
      (entry, index) =>
        entry[0] === right.temporary.entries[index]?.[0] &&
        entry[1] === right.temporary.entries[index]?.[1]
    )
  );
}
function restoreReleaseGateReport(reportPath, expected) {
  const current = readStableTask493TmpFile(reportPath, "task_493_release_gate_report");
  if (!sameTask493TmpNode(current.node, expected.node))
    throw new Error("task_493_release_gate_report_identity_changed");
  let descriptor;
  try {
    descriptor = openSync(
      reportPath,
      constants.O_WRONLY | constants.O_TRUNC | constants.O_NOFOLLOW
    );
    const before = fstatSync(descriptor);
    if (!sameTask493TmpNode(task493TmpNode(before), expected.node))
      throw new Error("task_493_release_gate_report_identity_changed");
    writeFileSync(descriptor, expected.bytes);
    fchmodSync(descriptor, expected.node.mode);
    const after = fstatSync(descriptor);
    const final = lstatSync(reportPath);
    if (
      !sameTask493TmpNode(expected.node, task493TmpNode(after)) ||
      !sameTask493TmpNode(expected.node, task493TmpNode(final))
    )
      throw new Error("task_493_release_gate_report_identity_changed");
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}
function restoreReleaseGateSnapshot(root, expected) {
  const directory = path.join(root, ".tmp");
  const reportPath = path.join(root, RELEASE_GATE_REPORT_PATH);
  const actual = releaseGateSnapshot(root);
  if (
    expected.temporary.entries.some(
      ([name, value]) =>
        value.startsWith("directory:") &&
        actual.temporary.entries.find(([actualName]) => actualName === name)?.[1] !== value
    )
  )
    throw new Error("task_493_release_gate_tmp_identity_changed");
  if (expected.report) restoreReleaseGateReport(reportPath, expected.report);
  else if (actual.report) unlinkSync(reportPath);
  if (!expected.temporary.directory && existsSync(directory)) {
    const stats = lstatSync(directory);
    if (!stats.isDirectory() || stats.isSymbolicLink() || readdirSync(directory).length !== 0)
      throw new Error("task_493_release_gate_tmp_not_empty");
    rmdirSync(directory);
  }
  if (!sameReleaseGateSnapshot(expected, releaseGateSnapshot(root)))
    throw new Error("task_493_release_gate_report_restore_failed");
}
function runTask493ReleaseGate(root, work) {
  const expected = releaseGateSnapshot(root);
  let primary = null;
  try {
    work();
  } catch (error) {
    primary = error;
  }
  try {
    restoreReleaseGateSnapshot(root, expected);
  } catch (restoration) {
    if (primary)
      throw new AggregateError(
        [primary, restoration],
        "TASK-493 release gate and restoration failures"
      );
    throw restoration;
  }
  if (primary) throw primary;
}
function runRequiredCommand(root, entry) {
  if (entry.label === "task_493_coderso_release_gates")
    return runTask493ReleaseGate(root, () => runRequiredCommandDirect(root, entry));
  return runRequiredCommandDirect(root, entry);
}
function runOwnerGateCommands(root, ownerId) {
  const commands = OWNER_GATE_COMMANDS[ownerId];
  if (!Array.isArray(commands)) throw new Error(`task_493_owner_gate_missing:${ownerId}`);
  const ownerCommands =
    ownerId === "workflow-contract-tests"
      ? [
          ...commands,
          command("task_493_closeout_syntax", "node", [
            "--check",
            "_docs/_workflows/task-493-closeout.mjs",
          ]),
        ]
      : commands;
  const gates = ownerCommands;
  return runReadOnlyGate(`task_493_owner_gate_mutated:${ownerId}`, root, () => {
    for (const command of gates) runRequiredCommand(root, command);
    assertTask493LineLimit(root);
    runRequiredCommand(
      root,
      Object.freeze({
        label: `task_493_owner_diff_${ownerId}`,
        command: "git",
        args: Object.freeze(["diff", "--check"]),
      })
    );
    return Object.freeze(ownerCommands.map(({ label }) => label));
  });
}
export function runTask493FullValidation(root = ROOT) {
  verifyBeforeDispatch("full_validation", root);
  const gates = FULL_GATE_COMMANDS;
  return runReadOnlyGate("task_493_full_validation_mutated", root, () => {
    for (const entry of gates) runRequiredCommand(root, entry);
    const lineCounts = assertTask493LineLimit(root);
    runRequiredCommand(
      root,
      Object.freeze({
        label: "task_493_baseline_diff_check",
        command: "git",
        args: Object.freeze(["diff", "--check", `${TASK_493_BASELINE_SHA}...HEAD`]),
      })
    );
    runRequiredCommand(
      root,
      Object.freeze({
        label: "task_493_worktree_diff_check",
        command: "git",
        args: Object.freeze(["diff", "--check"]),
      })
    );
    return Object.freeze({ pass: true, lineCounts });
  });
}
function assertExactScenarioIds(value, label) {
  if (!Array.isArray(value) || value.length !== TASK_493_SMOKE_SCENARIO_IDS.length)
    throw new Error(`${label}:scenario_count`);
  for (const [index, actual] of value.entries())
    if (actual !== TASK_493_SMOKE_SCENARIO_IDS[index])
      throw new Error(`${label}:scenario_order:${index}`);
}
const TASK_493_SMOKE_SESSIONS = Object.freeze({
  fast: "task-493-fast",
  certification: "task-493-certification",
});
function assertTask493SmokePair(profile, session) {
  if (profile !== "fast" && profile !== "certification")
    throw new Error("task_493_smoke_profile_invalid");
  if (session !== TASK_493_SMOKE_SESSIONS[profile])
    throw new Error(`task_493_smoke_profile_session_mismatch:${profile}:${session}`);
}
function task493SessionDirectory(root, session) {
  if (session !== "task-493-fast" && session !== "task-493-certification")
    throw new Error(`task_493_smoke_session_invalid:${session}`);
  return path.resolve(root, "_docs/_workflows/_smoke/task-493", session);
}
function task493SmokeDirectoryNode(stats) {
  return Object.freeze({ dev: stats.dev, ino: stats.ino, uid: stats.uid, mode: stats.mode });
}
function sameTask493SmokeDirectoryNode(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode
  );
}
function assertNofollowTask493SmokeRoot(root, create = false, createdDirectories = null) {
  let directory = root;
  for (const component of ["_docs", "_workflows", "_smoke", "task-493"]) {
    directory = path.join(directory, component);
    let stats;
    let created = false;
    try {
      stats = lstatSync(directory);
    } catch (error) {
      if (!error || typeof error !== "object" || error.code !== "ENOENT") throw error;
      if (!create) throw new Error("task_493_smoke_ancestor_missing");
      mkdirSync(directory, { mode: 0o700 });
      stats = lstatSync(directory);
      created = true;
    }
    if (!stats.isDirectory() || stats.isSymbolicLink())
      throw new Error("task_493_smoke_ancestor_invalid");
    if (created && createdDirectories !== null)
      createdDirectories.push(
        Object.freeze({ path: directory, node: task493SmokeDirectoryNode(stats) })
      );
  }
  return directory;
}
function ensureInsideRoot(root, candidate, label) {
  const relativePath = path.relative(root, candidate);
  if (relativePath === "" || relativePath.startsWith("..") || path.isAbsolute(relativePath))
    throw new Error(`task_493_${label}_escapes_root`);
  return relativePath.split(path.sep).join("/");
}
export function assertExactTask493Manifest(root, profile, session, manifest) {
  assertTask493SmokePair(profile, session);
  if (!manifest || !Array.isArray(manifest.entries) || !Array.isArray(manifest.paths)) {
    throw new Error("task_493_smoke_manifest_invalid");
  }
  if (
    manifest.entries.length !== TASK_493_SMOKE_SCENARIO_IDS.length ||
    manifest.paths.length !== TASK_493_SMOKE_SCENARIO_IDS.length
  ) {
    throw new Error("task_493_smoke_manifest_count");
  }
  const sessionRelative = ensureInsideRoot(
    root,
    task493SessionDirectory(root, session),
    "smoke_session"
  );
  const expectedPrefix = `${sessionRelative}/`;
  const normalizedPaths = [];
  for (const [index, entry] of manifest.entries.entries()) {
    if (
      !entry ||
      entry.scenarioId !== TASK_493_SMOKE_SCENARIO_IDS[index] ||
      typeof entry.path !== "string"
    ) {
      throw new Error(`task_493_smoke_manifest_entry:${index}`);
    }
    const normalizedPath = normalizedRepositoryPath(entry.path);
    if (
      path.posix.dirname(normalizedPath) !== sessionRelative ||
      !normalizedPath.startsWith(expectedPrefix) ||
      !normalizedPath.endsWith(".png") ||
      manifest.paths[index] !== entry.path
    ) {
      throw new Error(`task_493_smoke_manifest_path:${index}`);
    }
    normalizedPaths.push(normalizedPath);
  }
  if (new Set(normalizedPaths).size !== normalizedPaths.length)
    throw new Error("task_493_smoke_manifest_duplicate");
  return Object.freeze({
    entries: Object.freeze(
      manifest.entries.map((entry) =>
        Object.freeze({ scenarioId: entry.scenarioId, path: normalizedRepositoryPath(entry.path) })
      )
    ),
    paths: Object.freeze(normalizedPaths),
  });
}
export function task493SmokeInvocation(profile, session) {
  assertTask493SmokePair(profile, session);
  return Object.freeze({ command: "run", suite: "task-493", profile, session });
}
function loadTask493Manifest(root, profile, session) {
  const manifestModule = pathToFileURL(
    path.join(root, "scripts/runtime-smoke/adapters/task-493/output-manifest.ts")
  ).href;
  const input = task493SmokeInvocation(profile, session);
  const source = [
    `import { buildExactTask493ScreenshotManifest } from ${JSON.stringify(manifestModule)};`,
    `const manifest = buildExactTask493ScreenshotManifest(${JSON.stringify(input)});`,
    "process.stdout.write(JSON.stringify({ entries: manifest.entries.map(({ scenarioId, path }) => ({ scenarioId, path })), paths: manifest.paths }));",
  ].join("\n");
  const output = commandOutput(root, "bun", ["--eval", source]);
  let manifest;
  try {
    manifest = JSON.parse(output.toString("utf8"));
  } catch (error) {
    throw new Error("task_493_smoke_manifest_json_invalid", { cause: error });
  }
  return assertExactTask493Manifest(root, profile, session, manifest);
}
function collectSessionFiles(root, session) {
  assertNofollowTask493SmokeRoot(root);
  const directory = task493SessionDirectory(root, session);
  const directoryStats = lstatSync(directory);
  if (!directoryStats.isDirectory() || directoryStats.isSymbolicLink())
    throw new Error("task_493_smoke_session_not_directory");
  const files = [];
  const walk = (absolute) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = path.join(absolute, entry.name);
      const relativePath = ensureInsideRoot(root, child, "smoke_output");
      if (entry.isSymbolicLink()) throw new Error(`task_493_smoke_output_symlink:${relativePath}`);
      if (entry.isDirectory()) {
        throw new Error(`task_493_smoke_output_nested_directory:${relativePath}`);
      } else if (entry.isFile()) {
        files.push(relativePath);
      } else {
        throw new Error(`task_493_smoke_output_non_regular:${relativePath}`);
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
    throw new Error(`task_493_smoke_output_extra_or_missing:${JSON.stringify(actual)}`);
  }
  return actual;
}
function sameStableFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}
function readStableSmokeFile(root, relativePath, maximumBytes, label) {
  const absolute = path.resolve(root, relativePath);
  const smokeRoot = assertNofollowTask493SmokeRoot(root);
  const assertSession = () => {
    const directory = path.dirname(absolute);
    const stats = lstatSync(directory);
    if (path.dirname(directory) !== smokeRoot || !stats.isDirectory() || stats.isSymbolicLink())
      throw new Error("task_493_smoke_session_not_directory");
  };
  assertSession();
  const initial = lstatSync(absolute);
  if (!initial.isFile() || initial.isSymbolicLink())
    throw new Error(`${label}_not_regular:${relativePath}`);
  let descriptor;
  try {
    if (!Number.isInteger(constants.O_NOFOLLOW))
      throw new Error("task_493_smoke_nofollow_unsupported");
    descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.size < 1 || before.size > maximumBytes)
      throw new Error(`${label}_invalid:${relativePath}`);
    const bytes = Buffer.from(readFileSync(descriptor));
    const after = fstatSync(descriptor);
    const final = lstatSync(absolute);
    assertSession();
    assertNofollowTask493SmokeRoot(root);
    if (
      !sameStableFile(before, after) ||
      !sameStableFile(after, final) ||
      bytes.byteLength !== after.size
    )
      throw new Error(`${label}_changed:${relativePath}`);
    return bytes;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}
function assertBoundedPng(root, relativePath) {
  const bytes = readStableSmokeFile(root, relativePath, MAXIMUM_PNG_BYTES, "task_493_smoke_png");
  if (
    bytes.byteLength < 33 ||
    bytes.byteLength > MAXIMUM_PNG_BYTES ||
    !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE) ||
    bytes.toString("ascii", 12, 16) !== "IHDR"
  )
    throw new Error(`task_493_smoke_png_invalid:${relativePath}`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (
    width === 0 ||
    height === 0 ||
    width > MAXIMUM_PNG_DIMENSION ||
    height > MAXIMUM_PNG_DIMENSION
  )
    throw new Error(`task_493_smoke_png_dimensions:${relativePath}`);
  return bytes;
}
function assertDecodedTask493Pngs(root, pngBytes) {
  const manifestModule = pathToFileURL(
    path.join(root, "scripts/runtime-smoke/adapters/task-493/output-manifest.ts")
  ).href;
  const source = [
    `import { decodeTask493Png } from ${JSON.stringify(manifestModule)};`,
    "const bytes = new Uint8Array(await new Response(Bun.stdin.stream()).arrayBuffer());",
    "process.stdout.write(JSON.stringify(decodeTask493Png(bytes)));",
  ].join("\n");
  const decoded = pngBytes.map((bytes) => {
    const result = spawnSync("bun", ["--eval", source], {
      cwd: root,
      input: bytes,
      encoding: "buffer",
      stdio: ["pipe", "pipe", "pipe"],
    });
    try {
      if (result.error || result.status !== 0 || result.signal)
        throw result.error ?? new Error(String(result.status ?? result.signal));
      return JSON.parse(result.stdout.toString("utf8"));
    } catch (error) {
      throw new Error("task_493_smoke_png_decode_invalid", { cause: error });
    }
  });
  if (
    decoded.length !== pngBytes.length ||
    decoded.some(
      (entry) =>
        !entry ||
        Object.keys(entry).length !== 2 ||
        !Number.isSafeInteger(entry.width) ||
        !Number.isSafeInteger(entry.height) ||
        entry.width <= 0 ||
        entry.height <= 0 ||
        entry.width > MAXIMUM_PNG_DIMENSION ||
        entry.height > MAXIMUM_PNG_DIMENSION
    )
  )
    throw new Error("task_493_smoke_png_decode_shape");
  return Object.freeze(decoded.map(({ width, height }) => Object.freeze({ width, height })));
}
const TASK_493_SUCCESS_TIMINGS = Object.freeze([
  ["cleanup", "all"],
  ["snapshot", "task493-after"],
  ["snapshot", "task493-before"],
  ["suite", "task-493"],
]);
const TASK_493_REMOVAL_KEYS = Object.freeze([
  "seoIndexedPagesRemoved",
  "seoSearchMetricsRemoved",
  "seoSearchQueriesRemoved",
  "seoSitemapSubmissionsRemoved",
]);
const TASK_493_CLEANUP_COUNT_KEYS = Object.freeze([
  ...TASK_493_REMOVAL_KEYS,
  "workerStarts",
  "workerRequests",
  "databaseBatches",
  "statements",
  "rows",
  "pageErrors",
  "repositorySnapshots",
]);
const TASK_493_CLEANUP_KEYS = Object.freeze([
  ...TASK_493_CLEANUP_COUNT_KEYS,
  "settingsRestored",
  "fixturesAbsent",
  "identitiesAbsent",
]);
function isSafeCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function assertExactReport(report, profile, session, manifest, root) {
  const reportKeys = [
    "schemaVersion",
    "suiteId",
    "profile",
    "session",
    "pass",
    "serverUp",
    "timings",
    "processes",
    "snapshots",
    "scenarios",
    "screenshots",
    "consoleErrors",
    "suiteCleanup",
    "cleanup",
    "failures",
  ];
  const fixtureCount = profile === "fast" ? 7 : profile === "certification" ? 28 : null;
  if (
    !hasExactKeys(report, reportKeys) ||
    fixtureCount === null ||
    report.schemaVersion !== 1 ||
    report.suiteId !== "task-493" ||
    report.profile !== profile ||
    report.session !== session ||
    report.pass !== true ||
    report.serverUp !== true ||
    report.snapshots !== 2 ||
    !Array.isArray(report.consoleErrors) ||
    report.consoleErrors.length !== 0 ||
    !Array.isArray(report.failures) ||
    report.failures.length !== 0
  )
    throw new Error("task_493_smoke_report_identity");
  if (
    !Array.isArray(report.timings) ||
    report.timings.length !== TASK_493_SUCCESS_TIMINGS.length ||
    report.timings.some(
      (entry, index) =>
        !hasExactKeys(entry, ["kind", "name", "count", "failed", "elapsedMs"]) ||
        entry.kind !== TASK_493_SUCCESS_TIMINGS[index][0] ||
        entry.name !== TASK_493_SUCCESS_TIMINGS[index][1] ||
        entry.count !== 1 ||
        entry.failed !== 0 ||
        !isSafeCount(entry.elapsedMs)
    )
  )
    throw new Error("task_493_smoke_report_timings");
  const expectedProcesses = {
    git: 2,
    "playwright-close": 1,
    "playwright-open": 1,
    "playwright-run-code": fixtureCount + 1,
    "playwright-state-load": 3,
    "task493-dev-host": 1,
    "task493-worker-db": 1,
  };
  if (
    !hasExactKeys(report.processes, Object.keys(expectedProcesses)) ||
    Object.entries(expectedProcesses).some(([key, value]) => report.processes[key] !== value)
  )
    throw new Error("task_493_smoke_report_processes");
  if (!Array.isArray(report.scenarios)) throw new Error("task_493_smoke_report:scenario_count");
  assertExactScenarioIds(
    report.scenarios.map((scenario) => scenario?.id),
    "task_493_smoke_report"
  );
  if (
    report.scenarios.some(
      (scenario) =>
        !hasExactKeys(scenario, ["id", "pass", "elapsedMs"]) ||
        scenario.pass !== true ||
        !isSafeCount(scenario.elapsedMs)
    )
  )
    throw new Error("task_493_smoke_report_scenarios");
  const cleanup = report.suiteCleanup;
  const removalRows = hasExactKeys(cleanup, TASK_493_CLEANUP_KEYS)
    ? TASK_493_REMOVAL_KEYS.reduce((sum, key) => sum + cleanup[key], 0)
    : -1;
  if (
    !hasExactKeys(cleanup, TASK_493_CLEANUP_KEYS) ||
    TASK_493_CLEANUP_COUNT_KEYS.some((key) => !isSafeCount(cleanup[key])) ||
    TASK_493_REMOVAL_KEYS.some((key) => cleanup[key] !== fixtureCount) ||
    cleanup.workerStarts !== 1 ||
    cleanup.workerRequests !== fixtureCount + 3 ||
    cleanup.databaseBatches !== fixtureCount + 3 ||
    cleanup.statements !== fixtureCount + 27 ||
    cleanup.rows !== 4 + 2 * fixtureCount + removalRows ||
    cleanup.pageErrors !== 0 ||
    cleanup.repositorySnapshots !== 2 ||
    cleanup.settingsRestored !== true ||
    cleanup.fixturesAbsent !== true ||
    cleanup.identitiesAbsent !== true
  )
    throw new Error("task_493_smoke_report_suite_cleanup");
  if (
    !hasExactKeys(report.cleanup, ["pass", "failures"]) ||
    report.cleanup.pass !== true ||
    !Array.isArray(report.cleanup.failures) ||
    report.cleanup.failures.length !== 0
  )
    throw new Error("task_493_smoke_report_cleanup");
  if (!Array.isArray(report.screenshots) || report.screenshots.length !== manifest.paths.length)
    throw new Error("task_493_smoke_report_screenshot_count");
  const pngBytes = manifest.paths.map((relativePath) => assertBoundedPng(root, relativePath));
  assertDecodedTask493Pngs(root, pngBytes);
  for (const [index, screenshot] of report.screenshots.entries()) {
    const expectedPath = manifest.paths[index];
    if (
      !screenshot ||
      Object.keys(screenshot).length !== 2 ||
      screenshot.path !== expectedPath ||
      typeof screenshot.sha256 !== "string" ||
      !SHA256.test(screenshot.sha256)
    )
      throw new Error(`task_493_smoke_report_screenshot:${index}`);
    const actualDigest = createHash("sha256").update(pngBytes[index]).digest("hex");
    if (screenshot.sha256 !== actualDigest) throw new Error(`task_493_smoke_report_hash:${index}`);
  }
  return Object.freeze(pngBytes);
}
const TASK_493_SAFE_SMOKE_FAILURE_CODES = new Set([
  "smoke_adapter_unavailable",
  "smoke_authentication_failed",
  "smoke_argument_invalid",
  "smoke_cleanup_failed",
  "smoke_output_invalid",
  "smoke_poll_timeout",
  "smoke_process_failed",
  "smoke_process_spawn_failed",
  "smoke_process_timeout",
  "smoke_repository_changed",
  "smoke_repository_invalid",
  "smoke_server_unexpected_exit",
]);
function task493SmokeFailureCode(report, profile, session) {
  if (
    !hasExactKeys(report, [
      "schemaVersion",
      "suiteId",
      "profile",
      "session",
      "pass",
      "serverUp",
      "timings",
      "processes",
      "snapshots",
      "scenarios",
      "screenshots",
      "consoleErrors",
      "suiteCleanup",
      "cleanup",
      "failures",
    ])
  )
    return null;
  const failure = report.failures?.[0];
  const cleanup = report.cleanup;
  const timingKinds = new Set(["suite", "phase", "scenario", "process", "snapshot", "cleanup"]);
  if (
    report.schemaVersion !== 1 ||
    report.suiteId !== "task-493" ||
    report.profile !== profile ||
    report.session !== session ||
    report.pass !== false ||
    report.serverUp !== false ||
    !Array.isArray(report.timings) ||
    !Array.isArray(report.scenarios) ||
    report.scenarios.length !== 0 ||
    !Array.isArray(report.screenshots) ||
    report.screenshots.length !== 0 ||
    !Array.isArray(report.consoleErrors) ||
    report.consoleErrors.length !== 0 ||
    !hasExactKeys(report.processes, Object.keys(report.processes)) ||
    !Object.entries(report.processes).every(
      ([key, value]) =>
        /^[a-z0-9][a-z0-9._-]{0,63}$/u.test(key) && Number.isSafeInteger(value) && value >= 0
    ) ||
    !Number.isSafeInteger(report.snapshots) ||
    report.snapshots < 0 ||
    !hasExactKeys(report.suiteCleanup, []) ||
    !hasExactKeys(cleanup, ["pass", "failures"]) ||
    typeof cleanup.pass !== "boolean" ||
    !Array.isArray(cleanup.failures) ||
    !cleanup.failures.every(
      (entry) =>
        hasExactKeys(entry, ["resource", "phase", "code"]) &&
        /^[a-z0-9][a-z0-9._-]{0,63}$/u.test(entry.resource) &&
        ["close", "absence"].includes(entry.phase) &&
        entry.code === "smoke_cleanup_failed"
    )
  )
    return null;
  if (
    !report.timings.every(
      (entry) =>
        hasExactKeys(entry, ["kind", "name", "count", "failed", "elapsedMs"]) &&
        timingKinds.has(entry.kind) &&
        /^[a-z0-9][a-z0-9._-]{0,63}$/u.test(entry.name) &&
        [entry.count, entry.failed, entry.elapsedMs].every(
          (value) => Number.isSafeInteger(value) && value >= 0
        )
    )
  )
    return null;
  return Array.isArray(report.failures) &&
    report.failures.length === 1 &&
    hasExactKeys(failure, ["code"]) &&
    typeof failure.code === "string" &&
    TASK_493_SAFE_SMOKE_FAILURE_CODES.has(failure.code)
    ? failure.code
    : null;
}
function readTask493SmokeFailureCode(root, reportPath, profile, session) {
  try {
    const bytes = readStableSmokeFile(root, reportPath, 1_048_576, "task_493_smoke_report");
    const text = bytes.toString("utf8");
    if (!Buffer.from(text, "utf8").equals(bytes) || bytes[bytes.byteLength - 1] !== 0x0a)
      return null;
    assertExactSmokeSessionFiles(root, session, [reportPath]);
    return task493SmokeFailureCode(JSON.parse(text), profile, session);
  } catch {
    return null;
  }
}
export function assertExactTask493SmokeEvidence(root, profile, session, manifest, reportBytes) {
  const checkedManifest = assertExactTask493Manifest(root, profile, session, manifest);
  assertNofollowTask493SmokeRoot(root);
  const sessionDirectory = task493SessionDirectory(root, session);
  const stats = lstatSync(sessionDirectory);
  if (!stats.isDirectory() || stats.isSymbolicLink())
    throw new Error("task_493_smoke_session_not_directory");
  const reportPath = ensureInsideRoot(
    root,
    path.join(sessionDirectory, "report.json"),
    "smoke_report"
  );
  const bytes = Buffer.from(reportBytes);
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > 1_048_576 ||
    bytes[bytes.byteLength - 1] !== 0x0a
  ) {
    throw new Error("task_493_smoke_report_bytes_invalid");
  }
  const reportText = bytes.toString("utf8");
  if (!Buffer.from(reportText, "utf8").equals(bytes))
    throw new Error("task_493_smoke_report_utf8_invalid");
  if (!readStableSmokeFile(root, reportPath, 1_048_576, "task_493_smoke_report").equals(bytes))
    throw new Error("task_493_smoke_report_file_mismatch");
  let report;
  try {
    report = JSON.parse(reportText);
  } catch (error) {
    throw new Error("task_493_smoke_report_json_invalid", { cause: error });
  }
  assertExactSmokeSessionFiles(root, session, [reportPath, ...checkedManifest.paths]);
  const pngBytes = assertExactReport(report, profile, session, checkedManifest, root);
  return Object.freeze({ manifest: checkedManifest, report, reportBytes: bytes, pngBytes });
}
function captureSmokeEvidenceSnapshot(root, evidence) {
  assertExactTask493SmokeEvidence(
    root,
    evidence.report.profile,
    evidence.report.session,
    evidence.manifest,
    evidence.reportBytes
  );
  const smokeRoot = ensureInsideRoot(root, assertNofollowTask493SmokeRoot(root), "smoke_ancestor");
  const sessionPath = ensureInsideRoot(
    root,
    task493SessionDirectory(root, evidence.report.session),
    "smoke_session"
  );
  const reportPath = ensureInsideRoot(
    root,
    path.join(task493SessionDirectory(root, evidence.report.session), "report.json"),
    "smoke_report"
  );
  return new Map(
    [smokeRoot, sessionPath, reportPath, ...evidence.manifest.paths].map((relativePath) => [
      relativePath,
      fingerprintPath(root, relativePath),
    ])
  );
}
function assertSmokeEvidenceSnapshot(snapshot, root) {
  for (const [relativePath, value] of snapshot)
    if (fingerprintPath(root, relativePath) !== value)
      throw new Error(`task_493_smoke_evidence_changed:${relativePath}`);
}
function smokeEvidencePaths(snapshot, root, session) {
  const result = [
    ...snapshot.keys(),
    `.tmp/runtime-smoke/${session}.diag.log`,
    `.tmp/runtime-smoke`,
  ];
  return result;
}
function createEmptySmokeSession(root, session, createdDirectories = null) {
  assertNofollowTask493SmokeRoot(root, true, createdDirectories);
  const directory = task493SessionDirectory(root, session);
  if (existsSync(directory)) throw new Error(`task_493_smoke_session_preexisting:${session}`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const stats = lstatSync(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink())
    throw new Error(`task_493_smoke_session_create_failed:${session}`);
  return directory;
}
function createOwnedTask493SmokeSession(root, session) {
  const createdDirectories = [];
  const directory = createEmptySmokeSession(root, session, createdDirectories);
  const smokeRoot = assertNofollowTask493SmokeRoot(root);
  const stats = lstatSync(directory);
  if (path.dirname(directory) !== smokeRoot || !stats.isDirectory() || stats.isSymbolicLink())
    throw new Error(`task_493_smoke_session_create_failed:${session}`);
  return Object.freeze({
    directory,
    node: task493SmokeDirectoryNode(stats),
    createdDirectories: Object.freeze(createdDirectories),
  });
}
function removeOwnedTask493SmokeDirectory(root, expected) {
  const directory = ensureInsideRoot(root, expected.path, "smoke_ancestor");
  const absolute = path.resolve(root, directory);
  let stats;
  try {
    stats = lstatSync(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    !sameTask493SmokeDirectoryNode(expected.node, task493SmokeDirectoryNode(stats))
  )
    throw new Error(`task_493_smoke_ancestor_changed:${directory}`);
  if (readdirSync(absolute).length !== 0) return;
  rmdirSync(absolute);
  try {
    lstatSync(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`task_493_smoke_ancestor_cleanup_failed:${directory}`);
}
function removeOwnedTask493FailedSmokeSession(root, session, owned) {
  const smokeRoot = assertNofollowTask493SmokeRoot(root);
  const directory = task493SessionDirectory(root, session);
  if (owned.directory !== directory || path.dirname(directory) !== smokeRoot)
    throw new Error(`task_493_smoke_session_ownership_invalid:${session}`);
  let stats;
  try {
    stats = lstatSync(directory);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    stats = null;
  }
  if (stats !== null) {
    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      !sameTask493SmokeDirectoryNode(owned.node, task493SmokeDirectoryNode(stats))
    )
      throw new Error(`task_493_smoke_session_changed:${session}`);
    rmSync(directory, { recursive: true, force: false });
    try {
      lstatSync(directory);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      stats = null;
    }
    if (stats !== null) throw new Error(`task_493_smoke_session_cleanup_failed:${session}`);
  }
  for (const expected of [...owned.createdDirectories].reverse())
    removeOwnedTask493SmokeDirectory(root, expected);
}
function assertByteIdenticalReport(expectedBytes, reportPath) {
  const actualBytes = readFileSync(reportPath);
  if (!Buffer.from(expectedBytes).equals(actualBytes))
    throw new Error("task_493_smoke_report_not_stdout_identical");
}
function preserveSmokePrimaryFailure(primary, restoration) {
  if (primary === null) return restoration;
  return new Error(primary instanceof Error ? primary.message : String(primary), {
    cause: new AggregateError(
      [primary, restoration],
      "TASK-493 smoke primary and restoration failures"
    ),
  });
}
function restoreFailedTask493SmokeRun(root, session, ownedFailedSession, before, primary) {
  let failure = primary;
  try {
    if (ownedFailedSession !== null)
      removeOwnedTask493FailedSmokeSession(root, session, ownedFailedSession);
  } catch (restoration) {
    failure = preserveSmokePrimaryFailure(failure, restoration);
  }
  try {
    const allowed = [
      ...smokeEvidencePaths(new Map(), root, session),
      ensureInsideRoot(root, task493SessionDirectory(root, session), "smoke_session"),
      ensureInsideRoot(root, assertNofollowTask493SmokeRoot(root), "smoke_ancestor"),
    ];
    assertScopedRepositoryMutation(
      "task_493_smoke_repository_restoration",
      before,
      captureRepositoryFingerprint(root, allowed),
      allowed,
      root
    );
  } catch (restoration) {
    failure = preserveSmokePrimaryFailure(failure, restoration);
  }
  return failure;
}
function finalizeTask493SmokeProfile(
  root,
  session,
  ownedFailedSession,
  before,
  evidenceSnapshot,
  evidence,
  primary
) {
  let failure = primary;
  let evidenceRevalidated = false;
  try {
    if (evidenceSnapshot === null || evidence === null)
      throw new Error("task_493_smoke_evidence_missing");
    assertExactTask493SmokeEvidence(
      root,
      evidence.report.profile,
      evidence.report.session,
      evidence.manifest,
      evidence.reportBytes
    );
    assertSmokeEvidenceSnapshot(evidenceSnapshot, root);
    evidenceRevalidated = true;
  } catch (restoration) {
    failure = preserveSmokePrimaryFailure(failure, restoration);
  }
  if (failure !== null)
    return restoreFailedTask493SmokeRun(root, session, ownedFailedSession, before, failure);
  try {
    const allowed = smokeEvidencePaths(evidenceSnapshot, root, session);
    const after614 = captureRepositoryFingerprint(root, allowed);
    assertScopedRepositoryMutation(
      "task_493_smoke_repository_restoration",
      before,
      after614,
      allowed,
      root
    );
  } catch (restoration) {
    failure = preserveSmokePrimaryFailure(failure, restoration);
  }
  return failure === null && evidenceRevalidated
    ? null
    : restoreFailedTask493SmokeRun(root, session, ownedFailedSession, before, failure);
}
export function runTask493SmokeProfile(root, profile, session) {
  verifyBeforeDispatch("runtime_smoke", root);
  const before = captureRepositoryFingerprint(root);
  let evidence = null;
  let evidenceSnapshot = null;
  let ownedFailedSession = null;
  let primary = null;
  try {
    const manifest = loadTask493Manifest(root, profile, session);
    ownedFailedSession = createOwnedTask493SmokeSession(root, session);
    const directory = ownedFailedSession.directory;
    const reportPath = path.join(directory, "report.json");
    // The shared runner is now the single owner of the evidence report: it
    // pre-creates report.json in the evidence session dir before the adapter
    // runs and rewrites it with the final report after the run, so the
    // wrapper no longer redirects stdout into a pre-opened descriptor.
    const execution = spawnSync(
      "bun",
      [
        "scripts/runtime-smoke.ts",
        "run",
        "--suite",
        "task-493",
        "--profile",
        profile,
        "--session",
        session,
      ],
      { cwd: root, stdio: ["ignore", "ignore", "inherit"] }
    );
    if (execution?.error || execution?.status !== 0 || execution?.signal)
      throw new Error(
        `task_493_smoke_runner_failed:${readTask493SmokeFailureCode(root, ensureInsideRoot(root, reportPath, "smoke_report"), profile, session) ?? "report_invalid"}`
      );
    assertNofollowTask493SmokeRoot(root);
    const reportBytes = readStableSmokeFile(
      root,
      ensureInsideRoot(root, reportPath, "smoke_report"),
      1_048_576,
      "task_493_smoke_report"
    );
    if (reportBytes.byteLength === 0) throw new Error("task_493_smoke_report_missing");
    evidence = assertExactTask493SmokeEvidence(root, profile, session, manifest, reportBytes);
    evidenceSnapshot = captureSmokeEvidenceSnapshot(root, evidence);
  } catch (error) {
    primary = error;
  } finally {
    primary = finalizeTask493SmokeProfile(
      root,
      session,
      ownedFailedSession,
      before,
      evidenceSnapshot,
      evidence,
      primary
    );
  }
  if (primary !== null) throw primary;
  return Object.freeze({ pass: true, profile, session, evidence });
}
function removeFastSmokeEvidence(root) {
  assertNoStagedChanges(root);
  assertNoForbiddenDirty(root);
  assertNofollowTask493SmokeRoot(root);
  const directory = task493SessionDirectory(root, "task-493-fast");
  const expected = path.resolve(root, "_docs/_workflows/_smoke/task-493/task-493-fast");
  if (directory !== expected || !existsSync(directory))
    throw new Error("task_493_fast_evidence_missing_before_cleanup");
  const stats = lstatSync(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink())
    throw new Error("task_493_fast_evidence_not_owned_directory");
  rmSync(directory, { recursive: true, force: false });
  try {
    lstatSync(directory);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error("task_493_fast_evidence_cleanup_failed");
}
export function runTask493SmokeSequence(
  root = ROOT,
  operations = Object.freeze({
    runProfile: runTask493SmokeProfile,
    removeFastEvidence: removeFastSmokeEvidence,
  })
) {
  const fast = operations.runProfile(root, "fast", "task-493-fast");
  operations.removeFastEvidence(root);
  const certification = operations.runProfile(root, "certification", "task-493-certification");
  return Object.freeze({ fast, certification });
}
const COMMON = `Repository: ${ROOT}; task: ${TASK}; changelog: 1309.
Read current HEAD/status/diff, root AGENTS.md, TASK-493/board, relevant architecture/API/RBAC/security/testing docs, source and tests. The pre-existing untracked _TMP-task-dispatch-plan-2026-08-10.md is owner state and must remain untouched.
Use the configured OpenCode coder role. Never stage, commit, push, reset, clean, revert unrelated changes, expose secrets, weaken assertions, or edit outside the exact owner paths. Read shared files immediately before editing; every touched production/test module ends <=1000 physical lines.
TASK-551-09-L02 exclusively owns post-cache/front invalidation: do not touch core/services/seo/seoService.ts or add a sidecar cache wrapper. Reuse shared lifecycle, dispatcher, worker, cleanup, browser, and reporting primitives; add only task-specific adapter operations, selectors, and manifest behavior. GSC secrets must never reach the client; the admin SEO Manager must preserve cache hydration and background revalidation.`;
async function dispatchResult(phaseName, identity, prompt) {
  verifyBeforeDispatch(phaseName);
  return requirePass(
    identity,
    identity,
    await agent(`${COMMON}\n${prompt}`, {
      label: identity,
      phase: phaseName,
      schema: RESULT_SCHEMA,
    })
  );
}
async function dispatchScopedResult(phaseName, identity, prompt, allowedPaths) {
  const before = captureRepositoryFingerprint();
  let result;
  let changed;
  try {
    result = await dispatchResult(phaseName, identity, prompt);
  } finally {
    changed = assertScopedRepositoryMutation(
      identity,
      before,
      captureRepositoryFingerprint(),
      allowedPaths
    );
  }
  return Object.freeze({ result, changed });
}
async function dispatchAudit(phaseName, identity, prompt) {
  verifyBeforeDispatch(phaseName);
  const before = captureRepositoryFingerprint();
  try {
    return requireCleanAudit(
      identity,
      identity,
      await agent(`${COMMON}\n${prompt}`, {
        label: identity,
        phase: phaseName,
        schema: AUDIT_SCHEMA,
      })
    );
  } finally {
    assertNoRepositoryMutation(
      `task_493_read_only_audit_mutated:${identity}`,
      before,
      captureRepositoryFingerprint()
    );
  }
}
async function runOwner(owner) {
  const implementationIdentity = `task-493:implement:${owner.id}`;
  const implementationStep = await dispatchScopedResult(
    "Sequential owners",
    implementationIdentity,
    `Implement only owner ${owner.id}. Allowed paths: ${owner.paths.join(", ")}.
Run that owner’s focused required tests and static checks. Do not run real smoke,
documentation, task/changelog closure, stage, or commit. Return exact files changed and
actual commands in the summary.`,
    owner.paths
  );
  const executedGates = runOwnerGateCommands(ROOT, owner.id);
  const gateIdentity = `task-493:gate:${owner.id}`;
  const gateStep = await dispatchScopedResult(
    "Sequential owners",
    gateIdentity,
    `Read-only gate for owner ${owner.id}. Inspect the current owner diff and rerun its exact targeted
lanes. Verify changed paths equal the owner scope, no forbidden path, no weakened assertion,
 no file above 1,000 physical lines, and no unreported skipped command. Do not edit.`,
    []
  );
  return Object.freeze({
    id: owner.id,
    changed: implementationStep.changed,
    executedGates,
    implementation: implementationStep.result,
    gate: gateStep.result,
  });
}
async function runDocumentationOwner() {
  const identity = "task-493:implement:documentation";
  const step = await dispatchScopedResult(
    "Documentation",
    identity,
    `Implement only the pre-smoke documentation owner. Allowed paths: ${DOCUMENTATION_OWNER.paths.join(", ")}.
Document the internal route/RBAC/CSRF behavior, pure present-only contract, Post-detail generation/tombstone/cache-bus/hydration behavior, TASK-551 boundary,
and the registered shared-wrapper/helper/worker smoke recipe. Do not edit changelog, board,
 TASK-493 contract/status, product/test/workflow files, stage, or commit.`,
    DOCUMENTATION_OWNER.paths
  );
  return Object.freeze({ changed: step.changed, result: step.result });
}
async function runPostAudit() {
  const checks = await parallel(
    POST_AUDIT_LENSES.map((lens) => async () => {
      const identity = `task-493:post-audit:${lens}`;
      return dispatchAudit(
        "Post-audit",
        identity,
        `Fresh read-only post-audit lens=${lens}. Ground every finding in current file:line evidence.
Check task/board/docs, source boundaries, strict route auth/CSRF/RBAC, present-only and byte
identity behavior, shared smoke wiring/evidence, test integrity, touched-file limits and known
cross-stream collision risks. Return no findings only when the lens is actually clean.`
      );
    })
  );
  if (checks.length !== POST_AUDIT_LENSES.length)
    throw new Error("task_493_post_audit_missing_results");
  return Object.freeze(checks);
}
async function runWorkflow() {
  phase("Start gate");
  const preflight = assertImplementationPreflight();
  const startStep = await dispatchScopedResult(
    "Start gate",
    "task-493:start-gate",
    `Read-only. Verify the current author/audit/reconcile receipt, exact workflow bootstrap, reachable baseline, dependencies/collisions, and dirty state. Do not edit.`,
    []
  );
  const start = startStep.result;
  phase("Sequential owners");
  const owners = [];
  for (const owner of OWNERS) owners.push(await runOwner(owner));
  phase("Documentation");
  const documentation = await runDocumentationOwner();
  phase("Full validation");
  const validation = runTask493FullValidation();
  phase("Post-audit");
  const audits = await runPostAudit();
  phase("Runtime smoke");
  const { fast, certification } = runTask493SmokeSequence(ROOT);
  phase("Owner review");
  return Object.freeze({
    pass: false,
    ownerActionRequired: "owner_review_certification",
    preflight,
    start,
    owners: Object.freeze(owners),
    documentation,
    validation,
    audits,
    fast,
    certification,
  });
}
async function runResumeAfterFixWorkflow() {
  phase("Start gate");
  const preflight = assertResumePreflight();
  phase("Full validation");
  const validation = runTask493FullValidation();
  phase("Post-audit");
  const audits = await runPostAudit();
  phase("Runtime smoke");
  const { fast, certification } = runTask493SmokeSequence(ROOT);
  phase("Owner review");
  return Object.freeze({
    pass: false,
    ownerActionRequired: "owner_review_certification",
    resume: "resume_full_validation_post_audit_smoke",
    preflight,
    validation,
    audits,
    fast,
    certification,
  });
}
function writeTinyFile(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function makeSelfTestManifest(root, session) {
  const directory = task493SessionDirectory(root, session);
  const entries = TASK_493_SMOKE_SCENARIO_IDS.map((scenarioId, index) =>
    Object.freeze({
      scenarioId,
      path: ensureInsideRoot(
        root,
        path.join(directory, `${String(index + 1).padStart(2, "0")}-${scenarioId}.png`),
        "self_test_manifest"
      ),
    })
  );
  return Object.freeze({
    entries: Object.freeze(entries),
    paths: Object.freeze(entries.map((entry) => entry.path)),
  });
}
function expectFailure(callback, prefix) {
  try {
    callback();
  } catch (error) {
    if (String(error?.message).startsWith(prefix)) return;
    throw error;
  }
  throw new Error(`task_493_self_test_expected_failure:${prefix}`);
}
function workflowSelfTest() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "task-493-workflow-"));
  try {
    commandOutput(tempRoot, "git", ["init", "-q"]);
    commandOutput(tempRoot, "git", ["config", "user.email", "task-493@example.invalid"]);
    commandOutput(tempRoot, "git", ["config", "user.name", "TASK-493 workflow self-test"]);
    writeTinyFile(path.join(tempRoot, ".gitignore"), "_docs/_workflows/\n");
    writeTinyFile(path.join(tempRoot, "core/tracked.ts"), "export const tracked = 1;\n");
    commandOutput(tempRoot, "git", ["add", ".gitignore", "core/tracked.ts"]);
    commandOutput(tempRoot, "git", ["commit", "-qm", "baseline"]);
    const stableIgnoredPath = "_docs/_workflows/stable-before-task-493.mjs";
    writeTinyFile(path.join(tempRoot, stableIgnoredPath), "export const stable = true;\n");
    if (
      currentDirtyPaths(tempRoot).includes(stableIgnoredPath) ||
      !captureRepositoryFingerprint(tempRoot).has(stableIgnoredPath)
    ) {
      throw new Error("task_493_self_test_stable_ignored_preflight");
    }
    const stableEmptyDirectory = "_docs/_workflows/stable-empty-before-task-493";
    mkdirSync(path.join(tempRoot, stableEmptyDirectory));
    if (
      currentDirtyPaths(tempRoot).includes(stableEmptyDirectory) ||
      !captureRepositoryFingerprint(tempRoot).has(stableEmptyDirectory)
    ) {
      throw new Error("task_493_self_test_stable_empty_directory_preflight");
    }
    const releaseReport = path.join(tempRoot, RELEASE_GATE_REPORT_PATH);
    const releaseAbsent = releaseGateSnapshot(tempRoot);
    runTask493ReleaseGate(tempRoot, () => writeTinyFile(releaseReport, '{"created":true}\n'));
    if (!sameReleaseGateSnapshot(releaseAbsent, releaseGateSnapshot(tempRoot)))
      throw new Error("task_493_self_test_release_gate_created_report");
    writeTinyFile(releaseReport, '{"original":true}\n');
    chmodSync(releaseReport, 0o600);
    const releasePresent = releaseGateSnapshot(tempRoot);
    runTask493ReleaseGate(tempRoot, () => writeTinyFile(releaseReport, '{"changed":true}\n'));
    if (!sameReleaseGateSnapshot(releasePresent, releaseGateSnapshot(tempRoot)))
      throw new Error("task_493_self_test_release_gate_existing_report");
    const releaseSibling = path.join(tempRoot, ".tmp/stable-before-gate.txt");
    writeTinyFile(releaseSibling, "stable\n");
    const releaseWithSibling = releaseGateSnapshot(tempRoot);
    const unexpectedSibling = path.join(tempRoot, ".tmp/unexpected-after-gate.txt");
    expectFailure(
      () => runTask493ReleaseGate(tempRoot, () => writeTinyFile(unexpectedSibling, "unexpected\n")),
      "task_493_release_gate_report_restore_failed"
    );
    unlinkSync(unexpectedSibling);
    if (!sameReleaseGateSnapshot(releaseWithSibling, releaseGateSnapshot(tempRoot)))
      throw new Error("task_493_self_test_release_gate_sibling");
    const tmpMutationBefore = captureRepositoryFingerprint(tempRoot);
    writeTinyFile(path.join(tempRoot, ".tmp/gate-side-effect.txt"), "side effect\n");
    expectFailure(
      () =>
        assertNoRepositoryMutation(
          "task_493_self_test_tmp",
          tmpMutationBefore,
          captureRepositoryFingerprint(tempRoot),
          tempRoot
        ),
      "task_493_self_test_tmp:scope_violation:"
    );
    rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true });
    const hardlinkSource = path.join(tempRoot, ".tmp/hardlink-source");
    writeTinyFile(hardlinkSource, "hard link\n");
    linkSync(hardlinkSource, path.join(tempRoot, ".tmp/hardlink-peer"));
    expectFailure(() => captureTask493TmpSnapshot(tempRoot), "task_493_tmp_entry_invalid");
    rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true });
    const nestedDirectory = path.join(tempRoot, ".tmp/nested");
    writeTinyFile(path.join(nestedDirectory, "entry"), "nested\n");
    const nestedExpected = releaseGateSnapshot(tempRoot);
    const movedNested = path.join(tempRoot, "nested-original");
    renameSync(nestedDirectory, movedNested);
    mkdirSync(nestedDirectory);
    expectFailure(
      () => restoreReleaseGateSnapshot(tempRoot, nestedExpected),
      "task_493_release_gate_tmp_identity_changed"
    );
    rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true });
    rmSync(movedNested, { recursive: true, force: true });
    writeTinyFile(path.join(tempRoot, ".tmp/root-entry"), "root\n");
    const rootExpected = releaseGateSnapshot(tempRoot);
    const movedRoot = path.join(tempRoot, ".tmp-original");
    renameSync(path.join(tempRoot, ".tmp"), movedRoot);
    mkdirSync(path.join(tempRoot, ".tmp"));
    expectFailure(
      () => restoreReleaseGateSnapshot(tempRoot, rootExpected),
      "task_493_release_gate_tmp_identity_changed"
    );
    rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true });
    rmSync(movedRoot, { recursive: true, force: true });
    writeTinyFile(releaseReport, '{"original":true}\n');
    const reportIdentity = releaseGateSnapshot(tempRoot);
    expectFailure(
      () =>
        runTask493ReleaseGate(tempRoot, () => {
          renameSync(releaseReport, `${releaseReport}.moved`);
          writeTinyFile(releaseReport, '{"replaced":true}\n');
        }),
      "task_493_release_gate_report_identity_changed"
    );
    if (!reportIdentity.report) throw new Error("task_493_self_test_release_gate_report_identity");
    rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true });
    const baseline = commandOutput(tempRoot, "git", ["rev-parse", "HEAD"]).toString("utf8").trim();
    writeTinyFile(
      path.join(tempRoot, "core/tracked.ts"),
      "export const tracked = 1;\nexport const finalLine = true;"
    );
    writeTinyFile(path.join(tempRoot, "tests/untracked.ts"), "one\ntwo\nthree");
    const candidates = listTask493LineCountCandidates(tempRoot, baseline);
    if (JSON.stringify(candidates) !== JSON.stringify(["core/tracked.ts", "tests/untracked.ts"])) {
      throw new Error(`task_493_self_test_line_candidates:${JSON.stringify(candidates)}`);
    }
    if (
      countPhysicalLines(path.join(tempRoot, "core/tracked.ts")) !== 2 ||
      countPhysicalLines(path.join(tempRoot, "tests/untracked.ts")) !== 3
    ) {
      throw new Error("task_493_self_test_unterminated_line_count");
    }
    writeTinyFile(path.join(tempRoot, "scripts/too-long.ts"), `${"x\n".repeat(1001)}`);
    expectFailure(
      () => assertTask493LineLimit(tempRoot, baseline),
      "task_493_line_limit:scripts/too-long.ts:1001"
    );
    rmSync(path.join(tempRoot, "scripts/too-long.ts"));
    writeTinyFile(path.join(tempRoot, "scripts/exempt.generated.ts"), `${"x\n".repeat(1001)}`);
    if (
      listTask493LineCountCandidates(tempRoot, baseline).includes("scripts/exempt.generated.ts")
    ) {
      throw new Error("task_493_self_test_generated_line_candidate");
    }
    assertTask493LineLimit(tempRoot, baseline);
    rmSync(path.join(tempRoot, "scripts/exempt.generated.ts"));
    const fastInvocation = task493SmokeInvocation("fast", "task-493-fast");
    const certificationInvocation = task493SmokeInvocation(
      "certification",
      "task-493-certification"
    );
    if (
      fastInvocation.profile !== "fast" ||
      fastInvocation.session !== "task-493-fast" ||
      certificationInvocation.profile !== "certification" ||
      certificationInvocation.session !== "task-493-certification"
    )
      throw new Error("task_493_self_test_manifest_input_binding");
    expectFailure(
      () => task493SmokeInvocation("fast", "task-493-certification"),
      "task_493_smoke_profile_session_mismatch:fast:task-493-certification"
    );
    const validResultIdentity = "task-493:self-test";
    const validResult = { pass: true, summary: "clean", errors: [] };
    requirePass("task_493_self_test_result", validResultIdentity, validResult);
    expectFailure(
      () =>
        requirePass("task_493_self_test_result", validResultIdentity, {
          ...validResult,
          identity: validResultIdentity,
        }),
      "task_493_self_test_result:invalid_result:"
    );
    const validAuditIdentity = "task-493:self-audit";
    const validAudit = { pass: true, summary: "clean", findings: [] };
    requireCleanAudit("task_493_self_test_post_audit", validAuditIdentity, validAudit);
    expectFailure(
      () =>
        requireCleanAudit("task_493_self_test_final_drift", validAuditIdentity, {
          ...validAudit,
          findings: [
            {
              severity: "LOW",
              area: "a",
              finding: "b",
              evidence: "c",
              recommendation: "d",
              extra: true,
            },
          ],
        }),
      "task_493_self_test_final_drift:invalid_finding:"
    );
    const before = captureRepositoryFingerprint(tempRoot);
    writeTinyFile(path.join(tempRoot, "tests/allowed.ts"), "export const allowed = true;\n");
    assertScopedRepositoryMutation(
      "task_493_self_test_allowed",
      before,
      captureRepositoryFingerprint(tempRoot),
      ["tests/allowed.ts"],
      tempRoot
    );
    const forbiddenBefore = captureRepositoryFingerprint(tempRoot);
    writeTinyFile(
      path.join(tempRoot, "core/services/content/postsService.ts"),
      "export const forbidden = true;\n"
    );
    expectFailure(
      () =>
        assertScopedRepositoryMutation(
          "task_493_self_test_forbidden",
          forbiddenBefore,
          captureRepositoryFingerprint(tempRoot),
          ["core/services/content/postsService.ts"],
          tempRoot
        ),
      "task_493_self_test_forbidden:scope_violation:"
    );
    rmSync(path.join(tempRoot, "core/services/content/postsService.ts"));
    expectFailure(
      () =>
        runReadOnlyGate("task_493_self_test_gate", tempRoot, () =>
          writeTinyFile(
            path.join(tempRoot, "tests/gate-side-effect.ts"),
            "export const sideEffect = true;\n"
          )
        ),
      "task_493_self_test_gate:scope_violation:"
    );
    rmSync(path.join(tempRoot, "tests/gate-side-effect.ts"));
    const ignoredBefore = captureRepositoryFingerprint(tempRoot);
    writeTinyFile(
      path.join(tempRoot, "_docs/_workflows/ignored-side-effect.mjs"),
      "export const ignored = true;\n"
    );
    expectFailure(
      () =>
        assertNoRepositoryMutation(
          "task_493_self_test_ignored",
          ignoredBefore,
          captureRepositoryFingerprint(tempRoot),
          tempRoot
        ),
      "task_493_self_test_ignored:scope_violation:"
    );
    rmSync(path.join(tempRoot, "_docs/_workflows/ignored-side-effect.mjs"));
    const modeBefore = captureRepositoryFingerprint(tempRoot);
    chmodSync(path.join(tempRoot, "core/tracked.ts"), 0o755);
    expectFailure(
      () =>
        assertNoRepositoryMutation(
          "task_493_self_test_mode",
          modeBefore,
          captureRepositoryFingerprint(tempRoot),
          tempRoot
        ),
      "task_493_self_test_mode:scope_violation:"
    );
    chmodSync(path.join(tempRoot, "core/tracked.ts"), 0o644);
    writeTinyFile(path.join(tempRoot, "tests/link-target-a.ts"), "export const target = 'a';\n");
    writeTinyFile(path.join(tempRoot, "tests/link-target-b.ts"), "export const target = 'b';\n");
    const linkPath = path.join(tempRoot, "tests/link-target.ts");
    symlinkSync("link-target-a.ts", linkPath);
    const symlinkBefore = captureRepositoryFingerprint(tempRoot);
    unlinkSync(linkPath);
    symlinkSync("link-target-b.ts", linkPath);
    expectFailure(
      () =>
        assertNoRepositoryMutation(
          "task_493_self_test_symlink",
          symlinkBefore,
          captureRepositoryFingerprint(tempRoot),
          tempRoot
        ),
      "task_493_self_test_symlink:scope_violation:"
    );
    unlinkSync(linkPath);
    const externalSmokeRoot = mkdtempSync(path.join(os.tmpdir(), "task-493-smoke-external-"));
    const smokeAncestor = path.join(tempRoot, "_docs/_workflows/_smoke/task-493");
    mkdirSync(path.dirname(smokeAncestor), { recursive: true });
    symlinkSync(externalSmokeRoot, smokeAncestor, "dir");
    for (const action of [
      () => createEmptySmokeSession(tempRoot, "task-493-fast"),
      () => collectSessionFiles(tempRoot, "task-493-fast"),
      () => removeFastSmokeEvidence(tempRoot),
    ]) {
      expectFailure(action, "task_493_smoke_ancestor_invalid");
    }
    if (readdirSync(externalSmokeRoot).length !== 0)
      throw new Error("task_493_self_test_smoke_ancestor_symlink");
    rmSync(smokeAncestor);
    rmSync(externalSmokeRoot, { recursive: true, force: true });
    const failedSmokeBefore = captureRepositoryFingerprint(tempRoot);
    const failedSmokeDirectories = [];
    const failedSmokeDirectory = createEmptySmokeSession(
      tempRoot,
      "task-493-certification",
      failedSmokeDirectories
    );
    const failedSmokeStats = lstatSync(failedSmokeDirectory);
    const failedSmokeSession = Object.freeze({
      directory: failedSmokeDirectory,
      node: task493SmokeDirectoryNode(failedSmokeStats),
      createdDirectories: Object.freeze(failedSmokeDirectories),
    });
    expectFailure(
      () =>
        assertNoRepositoryMutation(
          "task_493_self_test_failed_empty_smoke",
          failedSmokeBefore,
          captureRepositoryFingerprint(tempRoot),
          tempRoot
        ),
      "task_493_self_test_failed_empty_smoke:scope_violation:"
    );
    removeOwnedTask493FailedSmokeSession(tempRoot, "task-493-certification", failedSmokeSession);
    assertNoRepositoryMutation(
      "task_493_self_test_failed_smoke_restored",
      failedSmokeBefore,
      captureRepositoryFingerprint(tempRoot),
      tempRoot
    );
    const session = "task-493-fast";
    const manifest = makeSelfTestManifest(tempRoot, session);
    const pngBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLZ4QAAAABJRU5ErkJggg==",
      "base64"
    );
    writeTinyFile(
      path.join(tempRoot, "scripts/runtime-smoke/adapters/task-493/output-manifest.ts"),
      `export function decodeTask493Png(bytes: Uint8Array) { if (bytes.byteLength !== ${pngBytes.byteLength} || bytes[12] !== 73 || bytes[13] !== 72 || bytes[14] !== 68 || bytes[15] !== 82) throw new Error("invalid_png"); const read = (offset: number) => (((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0); return { width: read(16), height: read(20) }; }\n`
    );
    const smokeBefore = captureRepositoryFingerprint(tempRoot);
    const ownedEvidenceSession = createOwnedTask493SmokeSession(tempRoot, session);
    const sessionDirectory = ownedEvidenceSession.directory;
    const screenshots = manifest.paths.map((relativePath) => {
      writeTinyFile(path.join(tempRoot, relativePath), pngBytes);
      return Object.freeze({ path: relativePath, sha256: sha256(pngBytes) });
    });
    const reportValue = {
      schemaVersion: 1,
      suiteId: "task-493",
      profile: "fast",
      session,
      pass: true,
      serverUp: true,
      snapshots: 2,
      timings: TASK_493_SUCCESS_TIMINGS.map(([kind, name]) => ({
        kind,
        name,
        count: 1,
        failed: 0,
        elapsedMs: 1,
      })),
      processes: {
        git: 2,
        "playwright-close": 1,
        "playwright-open": 1,
        "playwright-run-code": 8,
        "playwright-state-load": 3,
        "task493-dev-host": 1,
        "task493-worker-db": 1,
      },
      scenarios: TASK_493_SMOKE_SCENARIO_IDS.map((id) => ({ id, pass: true, elapsedMs: 1 })),
      screenshots,
      consoleErrors: [],
      suiteCleanup: {
        seoIndexedPagesRemoved: 7,
        seoSearchMetricsRemoved: 7,
        seoSearchQueriesRemoved: 7,
        seoSitemapSubmissionsRemoved: 7,
        workerStarts: 1,
        workerRequests: 10,
        databaseBatches: 10,
        statements: 34,
        rows: 46,
        pageErrors: 0,
        repositorySnapshots: 2,
        settingsRestored: true,
        fixturesAbsent: true,
        identitiesAbsent: true,
      },
      cleanup: { pass: true, failures: [] },
      failures: [],
    };
    const report = Buffer.from(`${JSON.stringify(reportValue)}\n`);
    const reportPath = path.join(sessionDirectory, "report.json");
    const reportFd = openSync(reportPath, "wx", 0o600);
    const capture = spawnSync(
      process.execPath,
      ["-e", "process.stdout.write(process.argv[1])", report.toString("utf8")],
      { stdio: ["ignore", reportFd, "pipe"] }
    );
    closeSync(reportFd);
    if (capture.error || capture.status !== 0) throw new Error("task_493_self_test_report_capture");
    assertByteIdenticalReport(report, reportPath);
    const evidence = assertExactTask493SmokeEvidence(
      tempRoot,
      "fast",
      session,
      manifest,
      readFileSync(reportPath)
    );
    const evidenceSnapshot = captureSmokeEvidenceSnapshot(tempRoot, evidence);
    assertNoRepositoryMutation(
      "task_493_self_test_validated_smoke",
      smokeBefore,
      captureRepositoryFingerprint(tempRoot, [...evidenceSnapshot.keys()]),
      tempRoot
    );
    const rejectReportMutation = (mutate) => {
      const candidate = structuredClone(reportValue);
      mutate(candidate);
      expectFailure(
        () => assertExactReport(candidate, "fast", session, manifest, tempRoot),
        "task_493_smoke_report"
      );
    };
    const reportMutations = [
      (value) => {
        value.timings[0].name = "drift";
      },
      (value) => {
        [value.timings[0], value.timings[1]] = [value.timings[1], value.timings[0]];
      },
      (value) => {
        value.timings[0].count = 2;
      },
      (value) => {
        value.timings[0].failed = 1;
      },
      (value) => {
        value.timings[0].elapsedMs = "1";
      },
      (value) => {
        value.timings[0].extra = 1;
      },
      (value) => {
        delete value.processes.git;
      },
      (value) => {
        value.processes.extra = 1;
      },
      (value) => {
        value.processes.git = 1;
      },
      (value) => {
        value.processes.git = "2";
      },
      (value) => {
        delete value.suiteCleanup.rows;
      },
      (value) => {
        value.suiteCleanup.extra = 0;
      },
      (value) => {
        value.suiteCleanup.rows = "25";
      },
      (value) => {
        value.suiteCleanup.settingsRestored = false;
      },
      (value) => {
        value.suiteCleanup.fixturesAbsent = false;
      },
      (value) => {
        value.suiteCleanup.identitiesAbsent = false;
      },
      (value) => {
        value.suiteCleanup.seoIndexedPagesRemoved = 6;
      },
      (value) => {
        value.suiteCleanup.workerStarts = 2;
      },
      (value) => {
        value.suiteCleanup.workerRequests = 9;
      },
      (value) => {
        value.suiteCleanup.databaseBatches = 9;
      },
      (value) => {
        value.suiteCleanup.statements = 33;
      },
      (value) => {
        value.suiteCleanup.rows = 24;
      },
      (value) => {
        value.suiteCleanup.pageErrors = 1;
      },
      (value) => {
        value.suiteCleanup.repositorySnapshots = 1;
      },
      (value) => {
        delete value.cleanup.failures;
      },
      (value) => {
        value.cleanup.extra = true;
      },
      (value) => {
        value.cleanup.pass = false;
      },
      (value) => {
        value.cleanup.failures.push({ code: "smoke_cleanup_failed" });
      },
      (value) => {
        value.scenarios[0].extra = true;
      },
      (value) => {
        value.scenarios[0].pass = false;
      },
      (value) => {
        value.scenarios[0].elapsedMs = "1";
      },
      (value) => {
        [value.scenarios[0], value.scenarios[1]] = [value.scenarios[1], value.scenarios[0]];
      },
      (value) => {
        value.screenshots.pop();
      },
      (value) => {
        value.screenshots[0].extra = true;
      },
      (value) => {
        value.screenshots[0].sha256 = "0".repeat(64);
      },
      (value) => {
        value.consoleErrors.push("unexpected");
      },
      (value) => {
        value.failures.push({ code: "smoke_output_invalid" });
      },
      (value) => {
        value.extra = true;
      },
      (value) => {
        delete value.serverUp;
      },
    ];
    for (const mutate of reportMutations) rejectReportMutation(mutate);
    const certificationReport = structuredClone(reportValue);
    Object.assign(certificationReport, {
      profile: "certification",
      session: "task-493-certification",
      processes: { ...certificationReport.processes, "playwright-run-code": 29 },
      suiteCleanup: {
        ...certificationReport.suiteCleanup,
        seoIndexedPagesRemoved: 28,
        seoSearchMetricsRemoved: 28,
        seoSearchQueriesRemoved: 28,
        seoSitemapSubmissionsRemoved: 28,
        workerRequests: 31,
        databaseBatches: 31,
        statements: 55,
        rows: 172,
      },
    });
    assertExactReport(
      certificationReport,
      "certification",
      "task-493-certification",
      manifest,
      tempRoot
    );
    const fakeBunDirectory = path.join(tempRoot, ".task-493-fake-bun");
    const fakeManifest = makeSelfTestManifest(tempRoot, "task-493-certification");
    writeTinyFile(
      path.join(tempRoot, AUTHOR_AUDIT_PATH),
      `if (process.argv[2] === "--task-493-bootstrap-verify") process.stdout.write(${JSON.stringify(JSON.stringify({ baseline: TASK_493_BASELINE_SHA, paths: TASK_493_WORKFLOW_PATHS }))});\n`
    );
    const failureReport = (code) =>
      `${JSON.stringify({ schemaVersion: 1, suiteId: "task-493", profile: "certification", session: "task-493-certification", pass: false, serverUp: false, timings: [], processes: {}, snapshots: 0, scenarios: [], screenshots: [], consoleErrors: [], suiteCleanup: {}, cleanup: { pass: true, failures: [] }, failures: [{ code }] })}\n`;
    const fakeBun = path.join(fakeBunDirectory, "bun");
    writeTinyFile(
      fakeBun,
      `#!/usr/bin/env node\nconst fs = require("fs");\nif (process.argv[2] === "--eval") process.stdout.write(${JSON.stringify(JSON.stringify(fakeManifest))}); else { const session = process.argv[process.argv.indexOf("--session") + 1]; const reportPath = \`_docs/_workflows/_smoke/task-493/\${session}/report.json\`; fs.writeFileSync(reportPath, process.env.TASK_493_SELF_TEST_REPORT ?? ""); process.exit(1); }\n`
    );
    chmodSync(fakeBun, 0o755);
    const runnerBefore = captureRepositoryFingerprint(tempRoot);
    const previousPath = process.env.PATH;
    const previousReport = process.env.TASK_493_SELF_TEST_REPORT;
    process.env.PATH = `${fakeBunDirectory}:${previousPath ?? ""}`;
    try {
      process.env.TASK_493_SELF_TEST_REPORT = failureReport("smoke_process_failed");
      expectFailure(
        () => runTask493SmokeProfile(tempRoot, "certification", "task-493-certification"),
        "task_493_smoke_runner_failed:smoke_process_failed"
      );
      process.env.TASK_493_SELF_TEST_REPORT = "{}\n";
      expectFailure(
        () => runTask493SmokeProfile(tempRoot, "certification", "task-493-certification"),
        "task_493_smoke_runner_failed:report_invalid"
      );
      process.env.TASK_493_SELF_TEST_REPORT = failureReport("smoke_unknown");
      expectFailure(
        () => runTask493SmokeProfile(tempRoot, "certification", "task-493-certification"),
        "task_493_smoke_runner_failed:report_invalid"
      );
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
      if (previousReport === undefined) delete process.env.TASK_493_SELF_TEST_REPORT;
      else process.env.TASK_493_SELF_TEST_REPORT = previousReport;
    }
    if (existsSync(task493SessionDirectory(tempRoot, "task-493-certification")))
      throw new Error("task_493_self_test_failed_runner_session_residue");
    assertNoRepositoryMutation(
      "task_493_self_test_failed_runner_restored",
      runnerBefore,
      captureRepositoryFingerprint(tempRoot),
      tempRoot
    );
    rmSync(fakeBunDirectory, { recursive: true, force: true });
    rmSync(path.join(tempRoot, AUTHOR_AUDIT_PATH));
    const replacement = `${reportPath}.replacement`;
    writeTinyFile(replacement, Buffer.concat([Buffer.from(" "), report]));
    renameSync(replacement, reportPath);
    expectFailure(
      () =>
        assertExactTask493SmokeEvidence(tempRoot, "fast", session, manifest, evidence.reportBytes),
      "task_493_smoke_report_file_mismatch"
    );
    writeTinyFile(reportPath, report);
    writeTinyFile(path.join(tempRoot, manifest.paths[0]), Buffer.from("not-a-png"));
    expectFailure(
      () =>
        assertExactTask493SmokeEvidence(
          tempRoot,
          "fast",
          session,
          manifest,
          readFileSync(reportPath)
        ),
      "task_493_smoke_png_invalid:"
    );
    writeTinyFile(path.join(tempRoot, manifest.paths[0]), pngBytes);
    writeTinyFile(
      path.join(tempRoot, manifest.paths[1]),
      Buffer.concat([pngBytes, Buffer.from("changed")])
    );
    expectFailure(
      () =>
        assertExactTask493SmokeEvidence(
          tempRoot,
          "fast",
          session,
          manifest,
          readFileSync(reportPath)
        ),
      "task_493_smoke_png_decode_invalid"
    );
    expectFailure(
      () => assertSmokeEvidenceSnapshot(evidenceSnapshot, tempRoot),
      "task_493_smoke_evidence_changed:"
    );
    writeTinyFile(path.join(tempRoot, manifest.paths[1]), pngBytes);
    writeTinyFile(
      path.join(tempRoot, "_docs/_workflows/ignored-sibling.mjs"),
      "export const ignoredSibling = true;\n"
    );
    expectFailure(
      () =>
        assertNoRepositoryMutation(
          "task_493_self_test_smoke_sibling",
          smokeBefore,
          captureRepositoryFingerprint(tempRoot, [...evidenceSnapshot.keys()]),
          tempRoot
        ),
      "task_493_self_test_smoke_sibling:scope_violation:"
    );
    rmSync(path.join(tempRoot, "_docs/_workflows/ignored-sibling.mjs"));
    const snapshotMismatch = { ...JSON.parse(report.toString("utf8")), snapshots: 1 };
    expectFailure(
      () => assertExactReport(snapshotMismatch, "fast", session, manifest, tempRoot),
      "task_493_smoke_report_identity"
    );
    writeTinyFile(path.join(sessionDirectory, "extra.txt"), "not allowed\n");
    expectFailure(
      () =>
        assertExactTask493SmokeEvidence(
          tempRoot,
          "fast",
          session,
          manifest,
          readFileSync(reportPath)
        ),
      "task_493_smoke_output_extra_or_missing:"
    );
    rmSync(path.join(sessionDirectory, "extra.txt"));
    mkdirSync(path.join(sessionDirectory, "empty"));
    expectFailure(
      () =>
        assertExactTask493SmokeEvidence(
          tempRoot,
          "fast",
          session,
          manifest,
          readFileSync(reportPath)
        ),
      "task_493_smoke_output_nested_directory:"
    );
    rmSync(path.join(sessionDirectory, "empty"), { recursive: true });
    const reserialized = Buffer.from(JSON.stringify(JSON.parse(report.toString("utf8"))), "utf8");
    expectFailure(
      () => assertByteIdenticalReport(reserialized, reportPath),
      "task_493_smoke_report_not_stdout_identical"
    );
    chmodSync(path.join(tempRoot, manifest.paths[0]), 0o600);
    const revalidationFailure = finalizeTask493SmokeProfile(
      tempRoot,
      session,
      ownedEvidenceSession,
      smokeBefore,
      evidenceSnapshot,
      evidence,
      null
    );
    expectFailure(() => {
      if (revalidationFailure !== null) throw revalidationFailure;
    }, "task_493_smoke_evidence_changed:");
    if (existsSync(sessionDirectory))
      throw new Error("task_493_self_test_failed_evidence_revalidation_session_residue");
    const boardBefore = [
      "- **To Do:** 1 tasks",
      "- **In Progress:** 2 tasks",
      "- **Done:** 3 tasks",
      "## In Progress",
      "| ID |",
      "| TASK-493 | title | priority | effort | In progress 2026-08-19. details |",
      "## Done",
      "| ID |",
      "| TASK-999 | retained |",
    ].join("\n");
    const boardAfter = [
      "- **To Do:** 1 tasks",
      "- **In Progress:** 1 tasks",
      "- **Done:** 4 tasks",
      "## In Progress",
      "| ID |",
      "## Done",
      "| ID |",
      "| TASK-999 | retained |",
      "| TASK-493 | title | priority | effort | ✅ Done (2026-08-19): details |",
    ].join("\n");
    assertTask493BoardClosureDelta(boardBefore, boardAfter);
    expectFailure(
      () => assertTask493BoardClosureDelta(boardBefore, boardAfter.replace("TASK-999", "TASK-998")),
      "task_493_closure_board_scope_invalid"
    );
    expectFailure(
      () =>
        assertTask493BoardClosureDelta(
          boardBefore,
          boardAfter.replace("- **Done:** 4 tasks", "- **Done:** 4 tasks\n- **Done:** 4 tasks")
        ),
      "task_493_closure_board_statistics_duplicate"
    );
    const indexBefore = `prefix\n${CHANGELOG_RESERVATION_BEFORE}\n| No. | Date | Title | Type |`;
    const indexAfter = `prefix\n${CHANGELOG_RESERVATION_AFTER}\n| No. | Date | Title | Type |\n${CHANGELOG_1309_INDEX_ROW}`;
    assertTask493ChangelogClosureDelta(indexBefore, indexAfter, null, CHANGELOG_1309_ENTRY_BYTES);
    expectFailure(
      () =>
        assertTask493ChangelogClosureDelta(
          indexBefore,
          indexAfter.replace("prefix", "other"),
          null,
          CHANGELOG_1309_ENTRY_BYTES
        ),
      "task_493_closure_changelog_scope_invalid"
    );
    expectFailure(
      () =>
        assertTask493ChangelogClosureDelta(
          indexBefore,
          indexAfter,
          null,
          Buffer.concat([CHANGELOG_1309_ENTRY_BYTES, Buffer.from("unrelated\n")])
        ),
      "task_493_closure_entry_invalid"
    );
    const primary = new Error("task_493_smoke_primary");
    const combined = preserveSmokePrimaryFailure(primary, new Error("task_493_smoke_restoration"));
    if (
      !(combined instanceof Error) ||
      combined.message !== primary.message ||
      !(combined.cause instanceof AggregateError) ||
      combined.cause.errors[0] !== primary
    )
      throw new Error("task_493_self_test_smoke_primary_preserved");
    assertTask493TerminalStatusDelta(
      "**Status:** 🚧 In Progress\n**Started:** 2026-08-19",
      "**Status:** ✅ Done\n**Completed:** 2026-08-19\n**Started:** 2026-08-19"
    );
    expectFailure(
      () =>
        assertTask493TerminalStatusDelta(
          "**Status:** 🚧 In Progress\nbody",
          "**Status:** ✅ Done\n**Completed:** 2026-08-19\nchanged"
        ),
      "task_493_closure_terminal_status_invalid"
    );
    return Object.freeze({
      pass: true,
      unterminatedLineCount: true,
      trackedAndUntrackedCandidates: true,
      generatedArtifactExcluded: true,
      stableIgnoredArtifactsBound: true,
      emptyIgnoredDirectoriesBound: true,
      manifestInputBound: true,
      smokeProfileSessionPairRejected: true,
      strictMutationAndAuditResultsRejected: true,
      agentIdentityRejected: true,
      releaseGateReportRestored: true,
      releaseGateSiblingResidueRejected: true,
      tmpMutationRejected: true,
      releaseGateHardlinkRejected: true,
      releaseGateDirectoryIdentityRejected: true,
      releaseGateReportIdentityRejected: true,
      forbiddenScopeRejected: true,
      directStdoutCapture: true,
      boundedPngEvidenceRejected: true,
      decodedPngEvidenceRejected: true,
      extraSmokeOutputRejected: true,
      reportReserializationRejected: true,
      gateMutationRejected: true,
      ignoredWorkflowMutationRejected: true,
      modeAndSymlinkFingerprintRejected: true,
      smokeAncestorSymlinkRejected: true,
      smokeFinallyRestorationRejected: true,
      failedEmptySmokeDirectoryRejected: true,
      failedSmokeRestored: true,
      failedRunnerRestored: true,
      classifiedRunnerFailureRejected: true,
      malformedRunnerReportRejected: true,
      unknownRunnerReportRejected: true,
      exactEvidenceRevalidationRejected: true,
      failedEvidenceRevalidationRestored: true,
      replacementEvidenceRejected: true,
      duplicateScreenshotHashesAllowed: true,
      nestedSuccessReportRejected: true,
      certificationReportProfileBound: true,
      snapshotMismatchRejected: true,
      narrowClosureRejected: true,
      duplicateBoardStatisticRejected: true,
      canonicalClosureRejected: true,
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
const importedForVerification = process.env.TASK_493_WORKFLOW_IMPORT === "1";
const isDirectInvocation = () => {
  try {
    return (
      typeof process.argv[1] === "string" &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
};
if (importedForVerification && isDirectInvocation())
  throw new Error("task_493_workflow_import_direct_invocation");
const mode = importedForVerification ? "import" : parseImplementationMode();
export const result =
  mode === "self-test"
    ? workflowSelfTest()
    : importedForVerification
      ? null
      : mode === "resume"
        ? await runResumeAfterFixWorkflow()
        : mode === "smoke"
          ? runTask493SmokeSequence(ROOT)
          : await runWorkflow();
if (mode === "self-test") process.stdout.write(`${JSON.stringify(result)}\n`);
if (mode === "smoke")
  process.stdout.write(
    `${JSON.stringify({ pass: true, fast: { profile: result.fast.profile, session: result.fast.session }, certification: { profile: result.certification.profile, session: result.certification.session } })}\n`
  );
