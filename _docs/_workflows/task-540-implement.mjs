import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import { parseEnv, promisify } from "node:util";

import { buildTask540SmokePlan } from "./task-540-smoke-contract.mjs";
import { executeTask540SmokePlan } from "./task-540-smoke-executor.mjs";

export const meta = {
  name: "task-540-implement",
  description:
    "Implement TASK-540 in strict leaf order, run owner-scoped gates and five-lens audits, execute seven real Custom Screen flows once through the repo-owned local executor, and close changelog 1252. Agents never stage or commit.",
  phases: [
    { title: "Start gate" },
    { title: "540-01-L01" },
    { title: "540-02-L01" },
    { title: "540-03-L01" },
    { title: "540-04-L01" },
    { title: "540-04-L02" },
    { title: "540-04-L03" },
    { title: "540-04-L04" },
    { title: "540-05-L01" },
    { title: "540-05-L02" },
    { title: "540-06-L01 prepare" },
    { title: "Post-audit" },
    { title: "Full validation" },
    { title: "Smoke" },
    { title: "Smoke evidence audit" },
    { title: "Closure" },
    { title: "Final validation" },
    { title: "Final drift" },
    { title: "Final gate" },
  ],
};

const execFileAsync = promisify(execFile);
const ROOT = "/home/coder/project/Coderso";
const MAX_VALIDATION_STREAM_BYTES = 4 * 1024 * 1024;
const MAX_VALIDATION_EXCERPT_BYTES = 8 * 1024;
const VALIDATION_COMMAND_TIMEOUT_MS = 45 * 60 * 1000;
const LOCAL_COMMAND_AUTHORITY = new WeakMap();
const TRACKED_TEST_FILES = Object.freeze(
  (
    await execFileAsync("git", ["ls-files", "tests"], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      maxBuffer: 2 * 1024 * 1024,
    })
  ).stdout
    .split("\n")
    .filter((file) => /\.test\.[cm]?[jt]sx?$/.test(file))
    .sort()
);
// Parse the repo environment privately instead of process.loadEnvFile(), which
// preserves inherited keys and could diverge from the smoke's `source .env`.
// Overwrite only keys declared by the repo file so helper/runtime and redaction
// use the same values. Neither map is ever serialized into prompts or evidence.
const INHERITED_ENV_FOR_REDACTION = Object.freeze({ ...process.env });
const REPO_ENV = Object.freeze(
  await (async () => {
    try {
      return parseEnv(await readFile(ROOT + "/.env", "utf8"));
    } catch {
      throw new Error("TASK-540 repo environment is unavailable or invalid");
    }
  })()
);
Object.assign(process.env, REPO_ENV);
// Every Git command in this workflow is observational. Disable optional index
// refresh writes so even read-oriented Git subprocesses preserve the exact
// caller-owned index file captured at workflow start.
process.env.GIT_OPTIONAL_LOCKS = "0";
const TASKS = ROOT + "/_docs/_TASKS";
const WORKFLOW_REL = "_docs/_workflows/task-540-implement.mjs";
const WORKFLOW = ROOT + "/" + WORKFLOW_REL;
const SMOKE_CONTRACT_WORKFLOW_REL = "_docs/_workflows/task-540-smoke-contract.mjs";
const SMOKE_EXECUTOR_WORKFLOW_REL = "_docs/_workflows/task-540-smoke-executor.mjs";
const SMOKE_HOST_WORKFLOW_REL = "_docs/_workflows/task-540-smoke-host.mjs";
const WORKFLOW_MECHANICAL_GATE_COMMAND = [
  "node --check " + SMOKE_CONTRACT_WORKFLOW_REL,
  "node " + SMOKE_CONTRACT_WORKFLOW_REL + " --self-test",
  "node --check " + SMOKE_EXECUTOR_WORKFLOW_REL,
  "node " + SMOKE_EXECUTOR_WORKFLOW_REL + " --self-test",
  "node --check " + SMOKE_HOST_WORKFLOW_REL,
  "node " + SMOKE_HOST_WORKFLOW_REL + " --self-test",
  "node --check " + WORKFLOW_REL,
  "node " + WORKFLOW_REL + " --self-test-repair-siblings",
  "git diff --check",
].join(" && ");
const HISTORICAL_FIX_WORKFLOW_REL = "_docs/_workflows/task-540-fix.mjs";
const EXPECTED_BRANCH = "feature/tasks-fixes";
const RUN_DATE = new Date().toISOString().slice(0, 10);
const CHANGELOG_DIRECTORY_REL = "_docs/_CHANGELOG";
const CHANGELOG_REL =
  "_docs/_CHANGELOG/1252-2026-07-14-task-540-custom-screens-functional-and-data-integrity-remediation.md";
const CLOSURE_ANCHOR_PREFIX = "<!-- TASK-540-CLOSURE-ANCHOR:";
const CLOSURE_ANCHOR_SUFFIX = " -->";
const EARLY_CLOSURE_TASK_PATHS = Object.freeze([
  "_docs/_TASKS/TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md",
  "_docs/_TASKS/TASK-540-06-Tests-Smoke-And-Closure.md",
  "_docs/_TASKS/TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md",
]);
const CLOSURE_CHANGELOG_PATH_FIELD = "Closure Changelog Path";

function requireSafeTask540ChangelogPath(value, label) {
  if (
    typeof value !== "string" ||
    !/^_docs\/_CHANGELOG\/1252-[a-zA-Z0-9][a-zA-Z0-9._-]*\.md$/.test(value) ||
    value.includes("..")
  ) {
    throw new Error(label + ": unsafe TASK-540 changelog path");
  }
  return value;
}

const PINNED_CHANGELOG_REL = await (async () => {
  const values = await Promise.all(
    EARLY_CLOSURE_TASK_PATHS.map(async (relativePath) =>
      readTaskMetadataField(
        await readFile(ROOT + "/" + relativePath, "utf8"),
        CLOSURE_CHANGELOG_PATH_FIELD
      )
    )
  );
  if (values.every((value) => value === null)) return null;
  if (!values[0] || !values.every((value) => value === values[0])) {
    throw new Error("TASK-540 closure contracts have a partial or mismatched changelog path pin");
  }
  const pinnedPath = requireSafeTask540ChangelogPath(values[0], "TASK-540 startup");
  if (pinnedPath !== CHANGELOG_REL) {
    throw new Error("TASK-540 task contracts disagree with the immutable changelog path pin");
  }
  return pinnedPath;
})();
const DISCOVERED_CHANGELOG_REL = await (async () => {
  const entries = await readdir(ROOT + "/" + CHANGELOG_DIRECTORY_REL, {
    withFileTypes: true,
  });
  const matches = entries.filter(({ name }) => /^1252-.*\.md$/.test(name));
  if (matches.length > 1) {
    throw new Error(
      "TASK-540 found duplicate pinned changelog 1252 files: " +
        matches
          .map(({ name }) => name)
          .sort()
          .join(", ")
    );
  }
  if (matches.length === 0) return null;
  if (!matches[0].isFile()) {
    throw new Error("TASK-540 pinned changelog 1252 is not a regular file");
  }
  return CHANGELOG_DIRECTORY_REL + "/" + matches[0].name;
})();
if (
  (PINNED_CHANGELOG_REL && PINNED_CHANGELOG_REL !== CHANGELOG_REL) ||
  (DISCOVERED_CHANGELOG_REL && DISCOVERED_CHANGELOG_REL !== CHANGELOG_REL)
) {
  throw new Error(
    "TASK-540 task/discovered changelog path disagrees with the immutable program pin"
  );
}
const EXISTING_CHANGELOG_REL = DISCOVERED_CHANGELOG_REL;
const CHANGELOG_TITLE_PREFIX = "TASK-540 Custom Screens Functional and Data-Integrity Remediation";
const CHANGELOG_TYPE =
  "Custom Screens/Admin UI/API/Reliability/Accessibility/Security/Testing/Docs/Task Board";
const CHANGELOG_TASKS_LINE =
  "Tasks: TASK-540, TASK-540-01, TASK-540-01-L01, TASK-540-02, TASK-540-02-L01, TASK-540-03, TASK-540-03-L01, TASK-540-04, TASK-540-04-L01, TASK-540-04-L02, TASK-540-04-L03, TASK-540-04-L04, TASK-540-05, TASK-540-05-L01, TASK-540-05-L02, TASK-540-06, TASK-540-06-L01";
const ENV = "set -a && source .env && set +a && ";

const TASK_FILES = Object.freeze([
  "TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md",
  "TASK-540-01-Strict-Screen-Data-Urls-Tabs-And-Binding-Gc.md",
  "TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md",
  "TASK-540-02-Button-Binding-And-Tabs-Authoring.md",
  "TASK-540-02-L01-Expose-Link-Binding-And-Complete-Tab-Slot-Editing.md",
  "TASK-540-03-Accessible-Tabs-And-Selection-Semantics.md",
  "TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md",
  "TASK-540-04-Dirty-Navigation-And-Async-Cache-Recovery.md",
  "TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md",
  "TASK-540-04-L02-Cancel-And-Retry-Related-Entry-Loads.md",
  "TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md",
  "TASK-540-04-L04-Guard-Screen-Builder-Drafts.md",
  "TASK-540-05-Responsive-Canvas-Aria-And-User-Preferences.md",
  "TASK-540-05-L01-Keep-Screen-Canvas-Usable-And-Aria-Valid.md",
  "TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md",
  "TASK-540-06-Tests-Smoke-And-Closure.md",
  "TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md",
]);
const TASK_PATHS = Object.freeze(TASK_FILES.map((file) => "_docs/_TASKS/" + file));

const LEAF_ORDER = Object.freeze([
  "540-01-L01",
  "540-02-L01",
  "540-03-L01",
  "540-04-L01",
  "540-04-L02",
  "540-04-L03",
  "540-04-L04",
  "540-05-L01",
  "540-05-L02",
  "540-06-L01",
]);
const ROOT_TASK_PATH = TASK_PATHS[0];
const LEAF_STATUS_GROUPS = Object.freeze({
  "540-01-L01": {
    childId: "540-01",
    childPath: TASK_PATHS[1],
    leafPath: TASK_PATHS[2],
    leafIds: ["540-01-L01"],
  },
  "540-02-L01": {
    childId: "540-02",
    childPath: TASK_PATHS[3],
    leafPath: TASK_PATHS[4],
    leafIds: ["540-02-L01"],
  },
  "540-03-L01": {
    childId: "540-03",
    childPath: TASK_PATHS[5],
    leafPath: TASK_PATHS[6],
    leafIds: ["540-03-L01"],
  },
  "540-04-L01": {
    childId: "540-04",
    childPath: TASK_PATHS[7],
    leafPath: TASK_PATHS[8],
    leafIds: ["540-04-L01", "540-04-L02", "540-04-L03", "540-04-L04"],
  },
  "540-04-L02": {
    childId: "540-04",
    childPath: TASK_PATHS[7],
    leafPath: TASK_PATHS[9],
    leafIds: ["540-04-L01", "540-04-L02", "540-04-L03", "540-04-L04"],
  },
  "540-04-L03": {
    childId: "540-04",
    childPath: TASK_PATHS[7],
    leafPath: TASK_PATHS[10],
    leafIds: ["540-04-L01", "540-04-L02", "540-04-L03", "540-04-L04"],
  },
  "540-04-L04": {
    childId: "540-04",
    childPath: TASK_PATHS[7],
    leafPath: TASK_PATHS[11],
    leafIds: ["540-04-L01", "540-04-L02", "540-04-L03", "540-04-L04"],
  },
  "540-05-L01": {
    childId: "540-05",
    childPath: TASK_PATHS[12],
    leafPath: TASK_PATHS[13],
    leafIds: ["540-05-L01", "540-05-L02"],
  },
  "540-05-L02": {
    childId: "540-05",
    childPath: TASK_PATHS[12],
    leafPath: TASK_PATHS[14],
    leafIds: ["540-05-L01", "540-05-L02"],
  },
  "540-06-L01": {
    childId: "540-06",
    childPath: TASK_PATHS[15],
    leafPath: TASK_PATHS[16],
    leafIds: ["540-06-L01"],
    holdUntilClosure: true,
  },
});
const LEAF_TASK_PATHS = Object.freeze(
  LEAF_ORDER.map((leafId) => LEAF_STATUS_GROUPS[leafId].leafPath)
);
const CHILD_IDS_IN_LAND_ORDER = Object.freeze([
  ...new Set(LEAF_ORDER.map((leafId) => LEAF_STATUS_GROUPS[leafId].childId)),
]);
const CHILD_TASK_PATHS = Object.freeze(
  CHILD_IDS_IN_LAND_ORDER.map(
    (childId) =>
      LEAF_STATUS_GROUPS[
        LEAF_ORDER.find((leafId) => LEAF_STATUS_GROUPS[leafId].childId === childId)
      ].childPath
  )
);
const FAMILY_STATUS_ORDER = Object.freeze([
  ...LEAF_TASK_PATHS,
  ...CHILD_TASK_PATHS,
  ROOT_TASK_PATH,
]);
const AUDIT_OWNERS = Object.freeze([...LEAF_ORDER, "orchestrator"]);

const TARGET_VITEST_FILES = Object.freeze([
  "tests/vitest/admin/cacheBus.test.ts",
  "tests/vitest/admin/custom-screen-schemas.test.ts",
  "tests/vitest/admin/customScreensClient.test.ts",
  "tests/vitest/customScreens/screenDocumentOps.test.ts",
  "tests/vitest/customScreens/screen-document-image-src.test.ts",
  "tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts",
  "tests/vitest/customScreens/customScreenService.test.ts",
  "tests/vitest/customScreens/relatedEntryResolver.test.ts",
  "tests/vitest/admin/entriesClient.test.ts",
  "tests/vitest/admin/mediaClient.test.ts",
  "tests/vitest/admin/userSettingsClient.test.ts",
  "tests/vitest/ui/admin-auth-identity.test.tsx",
  "tests/vitest/ui/assistant-panel-interaction.test.tsx",
  "tests/vitest/ui/use-screen-entry-preferences.test.ts",
  "tests/vitest/ui/use-screen-related-entries.test.tsx",
  "tests/vitest/ui/custom-screen-entry-draft.test.ts",
  "tests/vitest/ui/custom-screen-binding-panel.test.tsx",
  "tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx",
  "tests/vitest/ui/custom-screen-authoring-boundary.test.ts",
  "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx",
  "tests/vitest/ui/custom-screens-page.test.tsx",
  "tests/vitest/ui/custom-screen-route-params.test.ts",
  "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx",
  "tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx",
  "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
  "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
  "tests/vitest/ui-integration/screen-editor-sections.test.tsx",
  "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
  "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx",
  "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx",
  "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx",
  "tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx",
  "tests/vitest/widgets/screenWidgets.test.tsx",
  "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx",
]);
const TARGET_BUN_FILES = Object.freeze([
  "tests/unit/settings/userSettingsService.test.ts",
  "tests/integration/routes/userSettings.test.ts",
  "tests/integration/routes/cors.test.ts",
  "tests/integration/routes/customScreensRoutes.test.ts",
  "tests/unit/assistant/actionExecutorService.test.ts",
]);
const SOURCE_OWNER_TEST_FILES = Object.freeze([
  ...TARGET_VITEST_FILES.filter(
    (file) => file !== "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx"
  ),
  ...TARGET_BUN_FILES,
]);
const CLOSURE_OWNER_TEST_FILES = Object.freeze([
  "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx",
]);
if (
  TARGET_VITEST_FILES.length !== 34 ||
  TARGET_BUN_FILES.length !== 5 ||
  SOURCE_OWNER_TEST_FILES.length !== 38 ||
  CLOSURE_OWNER_TEST_FILES.length !== 1 ||
  new Set([...TARGET_VITEST_FILES, ...TARGET_BUN_FILES]).size !== 39
) {
  throw new Error("TASK-540 test matrix cardinality drift");
}
let sourceOwnerTestHashesAtClosureBoundary = null;

const DB_PREFLIGHT =
  ENV +
  'bun --eval \'import { canConnect } from "./tests/utils/db"; ' +
  "const configured = Boolean(process.env.DATABASE_URL?.trim()); " +
  "const reachable = configured && await canConnect(); " +
  "process.stdout.write(JSON.stringify({ configured, reachable, selectOne: reachable ? 1 : 0 })); " +
  "if (!reachable) process.exit(1); process.exit(0)'";
const LINT_TYPES = "bun --cwd core lint:types";
const LINT = "bun --cwd core lint";
const ROOT_TSC = "./node_modules/.bin/tsc -p tsconfig.json --noEmit";
const TARGETED_VITEST =
  "bunx vitest run --config vitest.config.ts " + TARGET_VITEST_FILES.join(" ");
const TARGETED_BUN = ENV + "bun test " + TARGET_BUN_FILES.join(" ");

function isolationCommandForTestFile(file) {
  if (!TRACKED_TEST_FILES.includes(file)) {
    throw new Error("TASK-540 isolation metadata references an untracked test: " + file);
  }
  return file.startsWith("tests/vitest/")
    ? "bunx vitest run --config vitest.config.ts " + file
    : ENV + "bun test " + file;
}

function isolationMetadata(files) {
  return Object.freeze(
    files.map((file) => Object.freeze({ file, command: isolationCommandForTestFile(file) }))
  );
}

const FULL_GATE_COMMANDS = Object.freeze([
  { id: "dbPreflight", command: DB_PREFLIGHT },
  { id: "lintTypes", command: LINT_TYPES },
  { id: "lint", command: LINT },
  { id: "rootTsc", command: ROOT_TSC },
  {
    id: "targetedVitest",
    command: TARGETED_VITEST,
    isolationCommands: isolationMetadata(TARGET_VITEST_FILES),
  },
  {
    id: "targetedBun",
    command: TARGETED_BUN,
    isolationCommands: isolationMetadata(TARGET_BUN_FILES),
  },
  {
    id: "fullTest",
    command: ENV + "bun run test",
    isolationCommands: isolationMetadata(TRACKED_TEST_FILES),
  },
  { id: "precommitCheck", command: "bun run precommit:check" },
  { id: "adminBuild", command: "bun --cwd core build:admin" },
  { id: "adminBoundary", command: "bun run check:admin-boundary" },
  { id: "adminBundle", command: "bun run check:admin-bundle" },
  { id: "releaseGates", command: "bun run gates:coderso" },
  { id: "strictScan", command: "bun run scan:security:strict" },
  {
    id: "smokeContractSyntax",
    command: "node --check _docs/_workflows/task-540-smoke-contract.mjs",
  },
  {
    id: "smokeContractSelfTest",
    command: "node _docs/_workflows/task-540-smoke-contract.mjs --self-test",
  },
  {
    id: "smokeExecutorSyntax",
    command: "node --check _docs/_workflows/task-540-smoke-executor.mjs",
  },
  {
    id: "smokeExecutorSelfTest",
    command: "node _docs/_workflows/task-540-smoke-executor.mjs --self-test",
  },
  {
    id: "smokeHostSyntax",
    command: "node --check _docs/_workflows/task-540-smoke-host.mjs",
  },
  {
    id: "smokeHostSelfTest",
    command: "node _docs/_workflows/task-540-smoke-host.mjs --self-test",
  },
  { id: "workflowSyntax", command: "node --check _docs/_workflows/task-540-implement.mjs" },
  {
    id: "workflowRepairResumeSelfTest",
    command: "node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings",
  },
  { id: "diffCheck", command: "git diff --check" },
]);

const KNOWN_STRICT_FINDING = Object.freeze({
  scanner: "semgrep-sast",
  rule: "javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag",
  file: "_docs/_workflows/task-522-author.mjs",
  line: 185,
  owner: "TASK-545",
});
const STRICT_SCAN_CLEAN_SCANNERS = Object.freeze([
  "bun-audit",
  "trivy-vuln",
  "trivy-config",
  "trivy-secret",
  "gitleaks-history",
  "gitleaks-worktree",
]);

function countLiteral(source, literal) {
  return source.split(literal).length - 1;
}

function classifyStrictScanReceipt(receipt, label) {
  const authority = localCommandAuthority(receipt, label);
  const output = Buffer.concat([authority.stdout, Buffer.from("\n"), authority.stderr]).toString(
    "utf8"
  );
  const knownRuleCount = countLiteral(output, KNOWN_STRICT_FINDING.rule);
  const knownFileCount = countLiteral(output, KNOWN_STRICT_FINDING.file);
  const exactLinePattern = new RegExp(
    "(?:^|[^0-9])" + KNOWN_STRICT_FINDING.line + "(?:[:|\\u2502\\u2506]|[^0-9])"
  );
  const ruleIndex = output.indexOf(KNOWN_STRICT_FINDING.rule);
  const fileIndex = output.indexOf(KNOWN_STRICT_FINDING.file);
  const findingBlockStart = Math.max(0, Math.min(ruleIndex, fileIndex) - 2048);
  const findingBlockEnd = Math.min(output.length, Math.max(ruleIndex, fileIndex) + 4096);
  const findingBlock =
    ruleIndex >= 0 && fileIndex >= 0 && Math.abs(ruleIndex - fileIndex) <= 8192
      ? output.slice(findingBlockStart, findingBlockEnd)
      : "";
  const cohesiveFindingBlock =
    countLiteral(findingBlock, KNOWN_STRICT_FINDING.rule) === 1 &&
    countLiteral(findingBlock, KNOWN_STRICT_FINDING.file) === 1 &&
    exactLinePattern.test(findingBlock);
  const semgrepSummaryCount = (output.match(/^- semgrep-sast: non-zero:1 \([^)]+\)$/gm) ?? [])
    .length;
  const cleanSummariesExact = STRICT_SCAN_CLEAN_SCANNERS.every(
    (scanner) =>
      (output.match(new RegExp("^- " + scanner + ": ok \\([^)]+\\)$", "gm")) ?? []).length === 1
  );
  const scannerSummaryRows =
    output.match(/^- [a-z0-9-]+: (?:ok|non-zero:[0-9]+) \([^)]+\)$/gm) ?? [];
  const unexpectedNonGreenSummary = scannerSummaryRows.some(
    (row) => !row.startsWith("- semgrep-sast: ") && row.includes("non-zero:")
  );
  const oneFindingSummary = /\b1 (?:code )?finding\b/i.test(output);
  const toolingFailure =
    /failed to start|could not run|command not found|internal error|traceback/i.test(output);
  const suppressed = /nosemgrep|noqa|suppressed finding|ignored finding/i.test(output);
  const accepted =
    receipt.status === 1 &&
    !receipt.stdoutTruncated &&
    !receipt.stderrTruncated &&
    output.includes("[security-scan] mode=strict") &&
    output.includes(
      "[security-scan] strict mode failed because these scanners reported findings: semgrep-sast"
    ) &&
    semgrepSummaryCount === 1 &&
    cleanSummariesExact &&
    knownRuleCount === 1 &&
    knownFileCount === 1 &&
    cohesiveFindingBlock &&
    scannerSummaryRows.length === STRICT_SCAN_CLEAN_SCANNERS.length + 1 &&
    !unexpectedNonGreenSummary &&
    oneFindingSummary &&
    !toolingFailure &&
    !suppressed;
  return Object.freeze({
    accepted,
    exitCode: receipt.status,
    green: false,
    classification: accepted ? "external-non-green" : "rejected",
    task540Findings: accepted ? 0 : 1,
    toolingFailure,
    suppressed,
    externalFindings: accepted ? [KNOWN_STRICT_FINDING] : [],
  });
}

function parseDatabasePreflightReceipt(receipt, label) {
  const authority = localCommandAuthority(receipt, label);
  const output = authority.stdout.toString("utf8").trim();
  const candidates = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.endsWith("}"));
  if (receipt.status !== 0 || candidates.length !== 1) {
    throw new Error(label + ": database preflight did not emit one successful observation");
  }
  let parsed;
  try {
    parsed = JSON.parse(candidates[0]);
  } catch {
    throw new Error(label + ": database preflight emitted invalid JSON");
  }
  requireExactObjectKeys(parsed, ["configured", "reachable", "selectOne"], label);
  if (parsed.configured !== true || parsed.reachable !== true || parsed.selectOne !== 1) {
    throw new Error(label + ": database preflight did not prove select one");
  }
  return Object.freeze(parsed);
}

const FORBIDDEN_PATHS = Object.freeze([
  "core/admin/ui/pages/**",
  "core/services/pages/**",
  "core/services/pages/pageRendererV2.tsx",
  "core/ui/theme/tokenCss.ts",
  "core/widgets/**",
  "core/admin/ui/dashboard/**",
  "core/services/dashboardWidgets/**",
  "core/admin/services/dashboardWidgets/**",
  "_docs/WIDGETS.md",
  "_docs/_WIDGETS/**",
  "_docs/DASHBOARD_WIDGETS_SPEC.md",
  "core/db/schema.ts",
  "core/db/migrations/**",
  "packages/**",
  "store/**",
  "package.json",
  "core/package.json",
  "bun.lock",
  ".semgrep.yml",
  ".gitleaks.toml",
  "_docs/_TASKS/TASK-539*",
  "_docs/_TASKS/TASK-542*",
  "_docs/_TASKS/TASK-545*",
  "all task/changelog files outside TASK-540 and pinned changelog 1252",
]);

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
};

const MUTATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors", "touchedFiles"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    touchedFiles: {
      type: "array",
      uniqueItems: true,
      items: { type: "string", minLength: 1 },
    },
  },
};

const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors", "failureKind", "failedCommand", "commands"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    failureKind: { enum: ["none", "code-test", "infrastructure"] },
    failedCommand: { type: ["string", "null"] },
    commands: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "command", "status"],
        properties: {
          id: { type: "string" },
          command: { type: "string" },
          status: { type: "integer" },
        },
      },
    },
  },
};

const AUDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "owner", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { enum: ["high", "medium", "low"] },
          owner: { enum: AUDIT_OWNERS },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};

const COMMAND_RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "command", "status"],
  properties: {
    id: { type: "string", minLength: 1 },
    command: { type: "string", minLength: 1 },
    status: { type: "integer" },
  },
};

const STRICT_FINDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scanner", "rule", "file", "line", "owner"],
  properties: {
    scanner: { type: "string" },
    rule: { type: "string" },
    file: { type: "string" },
    line: { type: "integer", minimum: 1 },
    owner: { type: "string" },
  },
};

const FULL_GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors", "commands", "database", "strictScan"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    commands: {
      type: "array",
      minItems: FULL_GATE_COMMANDS.length,
      maxItems: FULL_GATE_COMMANDS.length,
      items: COMMAND_RECEIPT_SCHEMA,
    },
    database: {
      type: "object",
      additionalProperties: false,
      required: ["configured", "reachable", "selectOne"],
      properties: {
        configured: { const: true },
        reachable: { const: true },
        selectOne: { const: 1 },
      },
    },
    strictScan: {
      type: "object",
      additionalProperties: false,
      required: [
        "exitCode",
        "green",
        "classification",
        "task540Findings",
        "toolingFailure",
        "suppressed",
        "externalFindings",
      ],
      properties: {
        exitCode: { const: 1 },
        green: { const: false },
        classification: { const: "external-non-green" },
        task540Findings: { const: 0 },
        toolingFailure: { const: false },
        suppressed: { const: false },
        externalFindings: {
          type: "array",
          minItems: 1,
          maxItems: 1,
          items: STRICT_FINDING_SCHEMA,
        },
      },
    },
  },
};

const EVIDENCE_BEGIN = "<!-- TASK-540-SMOKE-EVIDENCE:BEGIN -->";
const EVIDENCE_END = "<!-- TASK-540-SMOKE-EVIDENCE:END -->";
function sameUniqueSet(actual, expected) {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((value) => expected.includes(value))
  );
}

function resultPassed(result) {
  return result.pass === true && result.errors.length === 0;
}

const SENSITIVE_FIELD_NAME =
  "password|passwd|secret|api[_\\s.-]*key|private[_\\s.-]*key|csrf(?:[_\\s.-]*token)?|" +
  "authorization|cookie|set-cookie|access[_\\s.-]*token|refresh[_\\s.-]*token|" +
  "session[_\\s.-]*(?:token|hash|cookie)|token[_\\s.-]*hash|password[_\\s.-]*hash";
const SENSITIVE_ASSIGNMENT_PATTERN = new RegExp(
  "(?:^|[\\s,{;])(?:[\\\"']?(?:" + SENSITIVE_FIELD_NAME + ")[\\\"']?)\\s*(?::|=)\\s*([^\\s,;}]+)",
  "gi"
);
const RAW_AUTHORIZATION_PATTERN =
  /\b(?:authorization|proxy-authorization)\s*:\s*(?!\[?redacted\]?|<redacted>)[^\s,;]+/i;
const RAW_COOKIE_HEADER_PATTERN =
  /\b(?:cookie|set-cookie)\s*:\s*(?!\[?redacted\]?|<redacted>)[^\s,;]+/i;
const RAW_BEARER_PATTERN = /\bbearer\s+[a-z0-9._~+\/-]{8,}/i;
const JWT_VALUE_PATTERN = /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/;
const SECRET_BROWSER_ACCESS_PATTERN =
  /\bdocument\.cookie\b|\b(?:localStorage|sessionStorage)\.getItem\(\s*["'][^"']*(?:token|cookie|csrf|secret|password)[^"']*["']/i;
const SAFE_REDACTED_VALUE_PATTERN =
  /^(?:\$[A-Z][A-Z0-9_]*|\[?(?:discarded|redacted)\]?|<redacted>|null|undefined|true|false)$/i;
const SENSITIVE_ENV_KEY_PATTERN =
  /(?:^ADMIN_EMAIL$|PASSWORD|PASSWD|SECRET|(?:^|_)TOKEN(?:_|$)|(?:^|_)KEY(?:_|$)|API[_-]?KEY|PRIVATE[_-]?KEY|ACCESS[_-]?KEY|(?:ENC|HASH)[_-]?KEY|CONNECTION[_-]?STRING|DATABASE_URL|REDIS_URL|DSN)/i;
const REQUIRED_REDACTION_CREDENTIAL_KEYS = Object.freeze(["ADMIN_EMAIL", "ADMIN_PASSWORD"]);
function buildSensitiveValueCorpus() {
  const values = new Set();
  const addClassifiedValue = (value) => {
    if (typeof value === "string" && value.length > 0) values.add(value);
  };

  for (const key of REQUIRED_REDACTION_CREDENTIAL_KEYS) {
    if (typeof REPO_ENV[key] !== "string" || REPO_ENV[key].length === 0) {
      throw new Error("TASK-540 required smoke credentials are unavailable");
    }
    addClassifiedValue(REPO_ENV[key]);
  }
  for (const environment of [INHERITED_ENV_FOR_REDACTION, REPO_ENV]) {
    for (const [key, value] of Object.entries(environment)) {
      if (!SENSITIVE_ENV_KEY_PATTERN.test(key)) continue;
      // Every non-empty classified value joins the corpus. Short/weak values
      // use boundary-aware matching below instead of silently bypassing scans.
      addClassifiedValue(value);
      if (/(?:DATABASE_URL\d*|REDIS_URL\d*|DSN\d*)$/i.test(key) && typeof value === "string") {
        try {
          const parsed = new URL(value);
          addClassifiedValue(parsed.password);
          addClassifiedValue(decodeURIComponent(parsed.password));
        } catch {
          // The full configured value remains in the corpus even when it is not a URL.
        }
      }
    }
  }
  return Object.freeze([...values]);
}

const SENSITIVE_VALUE_CORPUS = buildSensitiveValueCorpus();

function containsConfiguredSensitiveValue(value, secret) {
  if (secret.length >= 6) return value.includes(secret);
  const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?:^|[^A-Za-z0-9])" + escaped + "(?=$|[^A-Za-z0-9])").test(value);
}

function hasSensitiveEvidence(value) {
  if (
    SENSITIVE_VALUE_CORPUS.some((secret) => containsConfiguredSensitiveValue(value, secret)) ||
    RAW_AUTHORIZATION_PATTERN.test(value) ||
    RAW_COOKIE_HEADER_PATTERN.test(value) ||
    RAW_BEARER_PATTERN.test(value) ||
    JWT_VALUE_PATTERN.test(value) ||
    SECRET_BROWSER_ACCESS_PATTERN.test(value)
  ) {
    return true;
  }
  SENSITIVE_ASSIGNMENT_PATTERN.lastIndex = 0;
  for (const match of value.matchAll(SENSITIVE_ASSIGNMENT_PATTERN)) {
    const assigned = (match[1] ?? "").replace(/^["'`]|["'`]$/g, "");
    if (!SAFE_REDACTED_VALUE_PATTERN.test(assigned)) return true;
  }
  return false;
}

function hasSensitiveEvidenceDeep(value) {
  if (typeof value === "string") return hasSensitiveEvidence(value);
  if (Array.isArray(value)) return value.some(hasSensitiveEvidenceDeep);
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, item]) => hasSensitiveEvidence(key) || hasSensitiveEvidenceDeep(item)
    );
  }
  return false;
}

function requireSensitiveSafeAgentResult(result, label) {
  if (hasSensitiveEvidenceDeep(result)) {
    throw new Error(label + ": structured agent result failed value-aware redaction");
  }
  return result;
}

async function dispatchAgentSafely(prompt, options) {
  await requireInitialGitIndexBaseline(options.label + " before agent dispatch");
  let result = null;
  let dispatchError = null;
  try {
    result = requireSensitiveSafeAgentResult(await agent(prompt, options), options.label);
  } catch {
    // Agent/schema errors may contain rejected structured output. Discard the
    // original object/message before it can enter failures, logs, or a prompt.
    dispatchError = new Error(options.label + ": agent dispatch failed; details discarded");
  }
  let indexError = null;
  try {
    await requireInitialGitIndexBaseline(options.label + " after agent dispatch");
  } catch (error) {
    indexError = error;
  }
  if (dispatchError && indexError) {
    throw new AggregateError(
      [dispatchError, indexError],
      options.label + ": agent dispatch failed and changed the exact initial Git index baseline"
    );
  }
  if (dispatchError) throw dispatchError;
  if (indexError) throw indexError;
  return result;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requireAllResults(results, expectedIds, label) {
  if (!Array.isArray(results) || results.length !== expectedIds.length) {
    throw new Error(label + ": missing result count");
  }
  for (let index = 0; index < expectedIds.length; index += 1) {
    const item = results[index];
    if (!item || item.id !== expectedIds[index] || item.result == null) {
      throw new Error(label + ": missing/reordered result " + expectedIds[index]);
    }
  }
  return results;
}

async function git(args) {
  const result = await execFileAsync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 32 * 1024 * 1024,
  });
  return result.stdout;
}

async function gitBytes(args) {
  const result = await execFileAsync("git", args, {
    cwd: ROOT,
    encoding: "buffer",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 64 * 1024 * 1024,
  });
  return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout);
}

function splitNul(value) {
  return value.split("\0").filter(Boolean);
}

const GIT_INDEX_AUTHORITY_KEYS = Object.freeze(["identity", "indexFile", "stageProjection"]);
const GIT_INDEX_IDENTITY_KEYS = Object.freeze([
  "resolvedPathByteLength",
  "resolvedPathSha256",
  "device",
  "inode",
  "mode",
  "linkCount",
  "mtimeNs",
  "ctimeNs",
]);
const GIT_INDEX_BYTE_PROJECTION_KEYS = Object.freeze(["byteLength", "sha256"]);

function hasExactOwnStringKeys(value, expected) {
  if (!value || typeof value !== "object") return false;
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === expected.length &&
    keys.every((key) => typeof key === "string" && expected.includes(key))
  );
}

function freezeGitIndexByteProjection(value, label) {
  if (
    !hasExactOwnStringKeys(value, GIT_INDEX_BYTE_PROJECTION_KEYS) ||
    !Number.isSafeInteger(value.byteLength) ||
    value.byteLength < 0 ||
    typeof value.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.sha256)
  ) {
    throw new Error(label + ": malformed Git index byte projection");
  }
  return Object.freeze({ byteLength: value.byteLength, sha256: value.sha256 });
}

function freezeGitIndexAuthority(value, label) {
  if (
    !hasExactOwnStringKeys(value, GIT_INDEX_AUTHORITY_KEYS) ||
    !hasExactOwnStringKeys(value.identity, GIT_INDEX_IDENTITY_KEYS) ||
    !Number.isSafeInteger(value.identity.resolvedPathByteLength) ||
    value.identity.resolvedPathByteLength <= 0 ||
    typeof value.identity.resolvedPathSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.identity.resolvedPathSha256) ||
    !["device", "inode", "mode", "linkCount", "mtimeNs", "ctimeNs"].every(
      (key) => typeof value.identity[key] === "string" && /^\d+$/.test(value.identity[key])
    )
  ) {
    throw new Error(label + ": malformed resolved Git index identity");
  }
  return Object.freeze({
    identity: Object.freeze({
      resolvedPathByteLength: value.identity.resolvedPathByteLength,
      resolvedPathSha256: value.identity.resolvedPathSha256,
      device: value.identity.device,
      inode: value.identity.inode,
      mode: value.identity.mode,
      linkCount: value.identity.linkCount,
      mtimeNs: value.identity.mtimeNs,
      ctimeNs: value.identity.ctimeNs,
    }),
    indexFile: freezeGitIndexByteProjection(value.indexFile, label + " index file"),
    stageProjection: freezeGitIndexByteProjection(
      value.stageProjection,
      label + " stage projection"
    ),
  });
}

function sameGitIndexAuthority(left, right) {
  return (
    left.identity.resolvedPathByteLength === right.identity.resolvedPathByteLength &&
    left.identity.resolvedPathSha256 === right.identity.resolvedPathSha256 &&
    left.identity.device === right.identity.device &&
    left.identity.inode === right.identity.inode &&
    left.identity.mode === right.identity.mode &&
    left.identity.linkCount === right.identity.linkCount &&
    left.identity.mtimeNs === right.identity.mtimeNs &&
    left.identity.ctimeNs === right.identity.ctimeNs &&
    left.indexFile.byteLength === right.indexFile.byteLength &&
    left.indexFile.sha256 === right.indexFile.sha256 &&
    left.stageProjection.byteLength === right.stageProjection.byteLength &&
    left.stageProjection.sha256 === right.stageProjection.sha256
  );
}

function createGitIndexBaselineController() {
  let initial = null;
  return Object.freeze({
    captureInitial(authority, label) {
      if (initial !== null) {
        throw new Error(label + ": refusing mid-run Git index baseline adoption");
      }
      initial = freezeGitIndexAuthority(authority, label);
      return initial;
    },
    requireUnchanged(authority, label) {
      if (initial === null) {
        throw new Error(label + ": initial Git index baseline is not captured");
      }
      const current = freezeGitIndexAuthority(authority, label);
      if (!sameGitIndexAuthority(initial, current)) {
        throw new Error(label + ": exact initial Git index baseline changed");
      }
      return current;
    },
  });
}

function parseResolvedGitIndexPath(output, label) {
  if (!Buffer.isBuffer(output) || output.length < 2 || output.at(-1) !== 0x0a) {
    throw new Error(label + ": Git index path output is not one complete line");
  }
  let end = output.length - 1;
  if (end > 0 && output[end - 1] === 0x0d) end -= 1;
  const path = output.subarray(0, end);
  if (path.length === 0 || path.includes(0x00) || path.includes(0x0a) || path.includes(0x0d)) {
    throw new Error(label + ": resolved Git index path is ambiguous");
  }
  return Buffer.from(path);
}

function gitIndexStatIdentity(info, resolvedPath) {
  return Object.freeze({
    resolvedPathByteLength: resolvedPath.length,
    resolvedPathSha256: createHash("sha256").update(resolvedPath).digest("hex"),
    device: info.dev.toString(),
    inode: info.ino.toString(),
    mode: info.mode.toString(),
    linkCount: info.nlink.toString(),
    mtimeNs: info.mtimeNs.toString(),
    ctimeNs: info.ctimeNs.toString(),
  });
}

function sameGitIndexStat(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

async function readGitIndexFileAuthority(label) {
  const unresolvedPath = parseResolvedGitIndexPath(
    await gitBytes(["rev-parse", "--path-format=absolute", "--git-path", "index"]),
    label
  );
  const resolvedPath = await realpath(unresolvedPath, { encoding: "buffer" });
  if (!Buffer.isBuffer(resolvedPath) || resolvedPath.length === 0) {
    throw new Error(label + ": Git index path did not resolve as bytes");
  }
  const before = await lstat(resolvedPath, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new Error(label + ": resolved Git index is not a regular file");
  }
  const bytes = await readFile(resolvedPath);
  const after = await lstat(resolvedPath, { bigint: true });
  if (
    !after.isFile() ||
    after.isSymbolicLink() ||
    !sameGitIndexStat(before, after) ||
    BigInt(bytes.length) !== after.size
  ) {
    throw new Error(label + ": resolved Git index changed while its bytes were read");
  }
  return freezeGitIndexAuthority(
    {
      identity: gitIndexStatIdentity(after, resolvedPath),
      indexFile: {
        byteLength: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
      // Filled only by captureGitIndexAuthority after the binary stage projection
      // is observed between two byte-identical index-file reads.
      stageProjection: {
        byteLength: 0,
        sha256: createHash("sha256").update(Buffer.alloc(0)).digest("hex"),
      },
    },
    label
  );
}

async function captureGitIndexAuthority(label) {
  const before = await readGitIndexFileAuthority(label + " before projection");
  const stageProjection = await gitBytes(["ls-files", "--stage", "-z"]);
  const after = await readGitIndexFileAuthority(label + " after projection");
  if (
    !sameGitIndexAuthority(
      before,
      Object.freeze({ ...after, stageProjection: before.stageProjection })
    )
  ) {
    throw new Error(label + ": Git index changed around its raw stage projection");
  }
  return freezeGitIndexAuthority(
    {
      identity: after.identity,
      indexFile: after.indexFile,
      stageProjection: {
        byteLength: stageProjection.length,
        sha256: createHash("sha256").update(stageProjection).digest("hex"),
      },
    },
    label
  );
}

const GIT_INDEX_BASELINE = createGitIndexBaselineController();

async function captureInitialGitIndexBaseline(label) {
  return GIT_INDEX_BASELINE.captureInitial(await captureGitIndexAuthority(label), label);
}

async function requireInitialGitIndexBaseline(label) {
  return GIT_INDEX_BASELINE.requireUnchanged(await captureGitIndexAuthority(label), label);
}

async function assertTask540GitIndexBaselineContract() {
  const emptySha256 = createHash("sha256").update(Buffer.alloc(0)).digest("hex");
  const base = Object.freeze({
    identity: Object.freeze({
      resolvedPathByteLength: 38,
      resolvedPathSha256: "1".repeat(64),
      device: "43",
      inode: "1001",
      mode: "33188",
      linkCount: "1",
      mtimeNs: "1000000000",
      ctimeNs: "1000000001",
    }),
    indexFile: Object.freeze({ byteLength: 256, sha256: "2".repeat(64) }),
    stageProjection: Object.freeze({ byteLength: 64, sha256: "3".repeat(64) }),
  });
  const withChanges = ({ identity, indexFile, stageProjection }) => ({
    identity: { ...base.identity, ...identity },
    indexFile: { ...base.indexFile, ...indexFile },
    stageProjection: { ...base.stageProjection, ...stageProjection },
  });
  const rejects = (operation) => {
    try {
      operation();
      return false;
    } catch {
      return true;
    }
  };
  const cases = [
    {
      label: "empty stage projection baseline is accepted unchanged",
      test() {
        const controller = createGitIndexBaselineController();
        const empty = withChanges({
          stageProjection: { byteLength: 0, sha256: emptySha256 },
        });
        controller.captureInitial(empty, "empty initial");
        controller.requireUnchanged(empty, "empty unchanged");
        return true;
      },
    },
    {
      label: "non-empty stage projection baseline is accepted unchanged",
      test() {
        const controller = createGitIndexBaselineController();
        controller.captureInitial(base, "non-empty initial");
        controller.requireUnchanged(withChanges({}), "non-empty unchanged");
        return true;
      },
    },
    {
      label: "index byte hash mutation is rejected",
      test() {
        const controller = createGitIndexBaselineController();
        controller.captureInitial(base, "byte hash initial");
        return rejects(() =>
          controller.requireUnchanged(
            withChanges({ indexFile: { sha256: "4".repeat(64) } }),
            "byte hash mutation"
          )
        );
      },
    },
    {
      label: "resolved index file identity mutation is rejected",
      test() {
        const controller = createGitIndexBaselineController();
        controller.captureInitial(base, "identity initial");
        return rejects(() =>
          controller.requireUnchanged(
            withChanges({ identity: { inode: "1002" } }),
            "identity mutation"
          )
        );
      },
    },
    {
      label: "raw stage projection hash mutation is rejected",
      test() {
        const controller = createGitIndexBaselineController();
        controller.captureInitial(base, "stage hash initial");
        return rejects(() =>
          controller.requireUnchanged(
            withChanges({ stageProjection: { sha256: "5".repeat(64) } }),
            "stage hash mutation"
          )
        );
      },
    },
    {
      label: "raw stage projection byte-count mutation is rejected",
      test() {
        const controller = createGitIndexBaselineController();
        controller.captureInitial(base, "stage count initial");
        return rejects(() =>
          controller.requireUnchanged(
            withChanges({ stageProjection: { byteLength: 65 } }),
            "stage count mutation"
          )
        );
      },
    },
    {
      label: "mid-run recapture is rejected without adopting the candidate",
      test() {
        const controller = createGitIndexBaselineController();
        controller.captureInitial(base, "single-assignment initial");
        const candidate = withChanges({ identity: { inode: "1003" } });
        const recaptureRejected = rejects(() =>
          controller.captureInitial(candidate, "mid-run recapture")
        );
        controller.requireUnchanged(withChanges({}), "original remains authoritative");
        return recaptureRejected;
      },
    },
  ];
  for (const testCase of cases) {
    if (testCase.test() !== true) {
      throw new Error("TASK-540 Git index baseline self-test failed: " + testCase.label);
    }
  }
  const liveController = createGitIndexBaselineController();
  liveController.captureInitial(
    await captureGitIndexAuthority("TASK-540 live Git index self-test initial"),
    "TASK-540 live Git index self-test initial"
  );
  liveController.requireUnchanged(
    await captureGitIndexAuthority("TASK-540 live Git index self-test unchanged"),
    "TASK-540 live Git index self-test unchanged"
  );
  return cases.length + 1;
}

async function hashPath(relativePath) {
  const absolute = ROOT + "/" + relativePath;
  try {
    const info = await lstat(absolute);
    const mode = String(info.mode & 0o7777);
    if (info.isSymbolicLink()) {
      return createHash("sha256")
        .update("symlink\0" + mode + "\0" + (await readlink(absolute)))
        .digest("hex");
    }
    if (!info.isFile()) return "non-file:" + info.mode;
    const hash = createHash("sha256");
    hash.update("file\0" + mode + "\0");
    hash.update(await readFile(absolute));
    return hash.digest("hex");
  } catch (error) {
    if (error && error.code === "ENOENT") return "<missing>";
    throw error;
  }
}

async function hashSensitiveEnvProjection() {
  const entries = (await readdir(ROOT, { withFileTypes: true }))
    .filter(({ name }) => /^\.env(?:\..+)?$/.test(name))
    .map(({ name }) => name)
    .sort();
  const hashes = {};
  for (const relativePath of entries) hashes[relativePath] = await hashPath(relativePath);
  return Object.freeze(hashes);
}

async function worktreeSnapshot(
  label = "TASK-540 worktree snapshot",
  additionalPaths = Object.freeze([])
) {
  if (
    !Array.isArray(additionalPaths) ||
    additionalPaths.some(
      (relativePath) =>
        typeof relativePath !== "string" ||
        relativePath.length === 0 ||
        relativePath.startsWith("/") ||
        relativePath.includes("..") ||
        relativePath.includes("\0")
    )
  ) {
    throw new Error(label + ": repository snapshot additional paths are invalid");
  }
  const [head, branch, tracked, untracked, indexAuthority] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["diff", "--name-only", "-z", "HEAD"]),
    git(["ls-files", "--others", "--exclude-standard", "-z"]),
    requireInitialGitIndexBaseline(label + " index authority"),
  ]);
  const paths = [
    ...new Set([...splitNul(tracked), ...splitNul(untracked), ...additionalPaths]),
  ].sort();
  const hashes = {};
  for (const path of paths) hashes[path] = await hashPath(path);
  return {
    head: head.trim(),
    branch: branch.trim(),
    indexAuthority,
    paths,
    hashes,
  };
}

function snapshotDelta(before, after) {
  const paths = [...new Set([...before.paths, ...after.paths])].sort();
  return paths.filter(
    (path) => (before.hashes[path] ?? "<clean>") !== (after.hashes[path] ?? "<clean>")
  );
}

function canonicalRepositoryFingerprint(snapshot) {
  const projection = JSON.stringify({
    head: snapshot.head,
    branch: snapshot.branch,
    indexAuthority: snapshot.indexAuthority,
    paths: snapshot.paths,
    hashes: snapshot.hashes,
  });
  return Object.freeze({
    head: snapshot.head,
    branch: snapshot.branch,
    worktreeSha256: createHash("sha256").update(projection).digest("hex"),
  });
}

function sameRepositoryFingerprint(left, right) {
  return (
    left.head === right.head &&
    left.branch === right.branch &&
    left.worktreeSha256 === right.worktreeSha256
  );
}

function createBoundedCommandStream() {
  const hash = createHash("sha256");
  const chunks = [];
  let byteLength = 0;
  let retainedBytes = 0;
  let truncated = false;
  return Object.freeze({
    push(chunk) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteLength += bytes.length;
      hash.update(bytes);
      const remaining = MAX_VALIDATION_STREAM_BYTES - retainedBytes;
      if (remaining > 0) {
        const retained = bytes.subarray(0, remaining);
        chunks.push(retained);
        retainedBytes += retained.length;
      }
      if (bytes.length > Math.max(remaining, 0)) truncated = true;
      return truncated;
    },
    finish() {
      return Object.freeze({
        bytes: byteLength,
        sha256: hash.digest("hex"),
        truncated,
        retained: Buffer.concat(chunks, retainedBytes),
      });
    },
  });
}

function boundedValidationExcerpt(bytes) {
  const excerpt = bytes.subarray(0, MAX_VALIDATION_EXCERPT_BYTES).toString("utf8");
  if (hasSensitiveEvidence(excerpt)) return "[redacted-sensitive-output]";
  return excerpt;
}

async function terminateLocalCommand(child) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
  await delay(250);
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

async function runLocalValidationCommand(spec, label) {
  const before = await worktreeSnapshot(label + " before local command");
  const startFingerprint = canonicalRepositoryFingerprint(before);
  const stdout = createBoundedCommandStream();
  const stderr = createBoundedCommandStream();
  const startedAtEpochMs = Date.now();
  let timedOut = false;
  let outputLimitExceeded = false;
  let spawnError = null;
  const child = spawn("/bin/bash", ["--noprofile", "--norc", "-c", spec.command], {
    cwd: ROOT,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const captureChunk = (stream, chunk) => {
    if (stream.push(chunk) && !outputLimitExceeded) {
      outputLimitExceeded = true;
      void terminateLocalCommand(child).catch(() => {});
    }
  };
  child.stdout.on("data", (chunk) => captureChunk(stdout, chunk));
  child.stderr.on("data", (chunk) => captureChunk(stderr, chunk));
  child.once("error", (error) => {
    spawnError = error;
  });
  const timeout = setTimeout(() => {
    timedOut = true;
    void terminateLocalCommand(child).catch(() => {});
  }, VALIDATION_COMMAND_TIMEOUT_MS);
  const completion = await new Promise((resolve) => {
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timeout);
  const after = await worktreeSnapshot(label + " after local command");
  const endFingerprint = canonicalRepositoryFingerprint(after);
  const stdoutResult = stdout.finish();
  const stderrResult = stderr.finish();
  const status = timedOut
    ? 124
    : outputLimitExceeded
      ? 125
      : spawnError
        ? 127
        : (completion.code ?? 128);
  const receipt = {
    runnerVersion: "orchestrator-local-v1",
    id: spec.id,
    command: spec.command,
    status,
    signal: completion.signal ?? null,
    timedOut,
    outputLimitExceeded,
    startedAtEpochMs,
    endedAtEpochMs: Date.now(),
    stdoutBytes: stdoutResult.bytes,
    stderrBytes: stderrResult.bytes,
    stdoutSha256: stdoutResult.sha256,
    stderrSha256: stderrResult.sha256,
    stdoutTruncated: stdoutResult.truncated,
    stderrTruncated: stderrResult.truncated,
    repository: Object.freeze({
      start: startFingerprint,
      end: endFingerprint,
      unchanged: sameRepositoryFingerprint(startFingerprint, endFingerprint),
    }),
  };
  LOCAL_COMMAND_AUTHORITY.set(
    receipt,
    Object.freeze({
      label,
      stdout: stdoutResult.retained,
      stderr: stderrResult.retained,
      stdoutExcerpt: boundedValidationExcerpt(stdoutResult.retained),
      stderrExcerpt: boundedValidationExcerpt(stderrResult.retained),
      spawnError: Boolean(spawnError),
    })
  );
  return Object.freeze(receipt);
}

function localCommandFailureProjection(receipt, label) {
  const authority = localCommandAuthority(receipt, label);
  const projection = ["stdout:\n" + authority.stdoutExcerpt, "stderr:\n" + authority.stderrExcerpt]
    .join("\n")
    .slice(0, MAX_VALIDATION_EXCERPT_BYTES);
  if (hasSensitiveEvidence(projection)) {
    return "[redacted-sensitive-command-failure]";
  }
  return projection;
}

function localCommandAuthority(receipt, label) {
  const authority = LOCAL_COMMAND_AUTHORITY.get(receipt);
  if (!authority || authority.label !== label) {
    throw new Error(label + ": local command authority is missing");
  }
  if (receipt.stdoutTruncated || receipt.stderrTruncated) {
    throw new Error(label + ": bounded local command output was truncated");
  }
  if (
    createHash("sha256").update(authority.stdout).digest("hex") !== receipt.stdoutSha256 ||
    createHash("sha256").update(authority.stderr).digest("hex") !== receipt.stderrSha256 ||
    authority.stdout.length !== receipt.stdoutBytes ||
    authority.stderr.length !== receipt.stderrBytes
  ) {
    throw new Error(label + ": local command bytes do not match their receipt");
  }
  return authority;
}

function localFailureKind(receipt) {
  const authority = LOCAL_COMMAND_AUTHORITY.get(receipt);
  const output = authority
    ? Buffer.concat([authority.stdout, Buffer.from("\n"), authority.stderr]).toString("utf8")
    : "";
  if (
    receipt.timedOut ||
    receipt.outputLimitExceeded ||
    receipt.status === 125 ||
    receipt.status === 126 ||
    receipt.status === 127 ||
    receipt.id === "dbPreflight" ||
    /\b(?:ECONNREFUSED|ENOTFOUND|ETIMEDOUT|database .*unavailable|could not connect|command not found|failed to spawn)\b/i.test(
      output
    )
  ) {
    return "infrastructure";
  }
  return "code-test";
}

async function runNamedIsolationCommands(spec, receipt, label) {
  const metadata = spec.isolationCommands ?? [];
  if (metadata.length === 0) return Object.freeze([]);
  const authority = localCommandAuthority(receipt, label + ":" + spec.id);
  const output = Buffer.concat([authority.stdout, Buffer.from("\n"), authority.stderr]).toString(
    "utf8"
  );
  const failureLines = output
    .split(/\r?\n/)
    .filter((line) => /\bfail(?:ed|ure)?\b|\berror\b|[✗×]/i.test(line));
  let selected = metadata.filter(({ file }) => failureLines.some((line) => line.includes(file)));
  if (selected.length === 0) {
    const mentioned = metadata.filter(({ file }) => output.includes(file));
    if (mentioned.length === 1) selected = mentioned;
  }
  if (selected.length > 8) {
    throw new Error(label + ": named isolation set exceeds the bounded maximum");
  }
  const receipts = [];
  for (const isolation of selected) {
    const isolationLabel = label + ":isolate:" + isolation.file;
    const isolationReceipt = await runLocalValidationCommand(
      { id: "isolate:" + isolation.file, command: isolation.command },
      isolationLabel
    );
    localCommandAuthority(isolationReceipt, isolationLabel);
    if (!isolationReceipt.repository.unchanged) {
      throw new Error(label + ": named isolation command changed repository authority");
    }
    receipts.push(isolationReceipt);
  }
  return Object.freeze(receipts);
}

async function runLocalCommandSequence(commands, { label, allowStrictScan = false } = {}) {
  const before = await worktreeSnapshot(label + " before local sequence");
  const start = canonicalRepositoryFingerprint(before);
  const receipts = [];
  const isolationReceipts = [];
  let failedReceipt = null;
  let strictScan = null;
  for (const spec of commands) {
    const commandLabel = label + ":" + spec.id;
    const receipt = await runLocalValidationCommand(spec, commandLabel);
    receipts.push(receipt);
    localCommandAuthority(receipt, commandLabel);
    if (!receipt.repository.unchanged) {
      failedReceipt = receipt;
      break;
    }
    if (spec.id === "strictScan" && allowStrictScan) {
      strictScan = classifyStrictScanReceipt(receipt, commandLabel);
      if (!strictScan.accepted) {
        failedReceipt = receipt;
        break;
      }
      continue;
    }
    if (receipt.status !== 0) {
      isolationReceipts.push(...(await runNamedIsolationCommands(spec, receipt, label)));
      failedReceipt = receipt;
      break;
    }
  }
  const after = await worktreeSnapshot(label + " after local sequence");
  const end = canonicalRepositoryFingerprint(after);
  const unchanged = sameRepositoryFingerprint(start, end);
  if (!unchanged && !failedReceipt) {
    failedReceipt = Object.freeze({
      id: "repositoryFingerprint",
      command: "orchestrator-local repository fingerprint comparison",
      status: 1,
      timedOut: false,
    });
  }
  return Object.freeze({
    receipts: Object.freeze(receipts),
    isolationReceipts: Object.freeze(isolationReceipts),
    failedReceipt,
    strictScan,
    authority: Object.freeze({
      runner: "orchestrator-local-v1",
      start,
      end,
      unchanged,
    }),
  });
}

function requireSafeRollbackPath(relativePath, label) {
  if (
    typeof relativePath !== "string" ||
    relativePath.startsWith("/") ||
    relativePath.split("/").includes("..") ||
    !/^_docs\/(?:_TASKS|_CHANGELOG)\//.test(relativePath) ||
    relativePath.split("/").some((segment) => /^\.env(?:\.|$)/.test(segment))
  ) {
    throw new Error(label + ": unsafe exact-rollback path " + relativePath);
  }
  return relativePath;
}

const EXACT_ROLLBACK_PARENT_PATHS = Object.freeze(new Set(["_docs/_TASKS", "_docs/_CHANGELOG"]));

async function requireCanonicalRollbackParent(relativePath, label) {
  requireSafeRollbackPath(relativePath, label);
  const separator = relativePath.lastIndexOf("/");
  const parentRelativePath = relativePath.slice(0, separator);
  const basename = relativePath.slice(separator + 1);
  if (!EXACT_ROLLBACK_PARENT_PATHS.has(parentRelativePath) || !basename || basename.includes("/")) {
    throw new Error(label + ": rollback path has an unowned canonical parent");
  }
  const rootInfo = await lstat(ROOT);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || (await realpath(ROOT)) !== ROOT) {
    throw new Error(label + ": repository root is not its exact canonical directory");
  }
  const parentAbsolutePath = ROOT + "/" + parentRelativePath;
  const parentInfo = await lstat(parentAbsolutePath);
  if (
    !parentInfo.isDirectory() ||
    parentInfo.isSymbolicLink() ||
    (await realpath(parentAbsolutePath)) !== parentAbsolutePath
  ) {
    throw new Error(label + ": rollback parent is not its exact canonical directory");
  }
  return Object.freeze({
    parentAbsolutePath,
    absolutePath: parentAbsolutePath + "/" + basename,
    basename,
  });
}

function exactBytesSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readOptionalRollbackFile(relativePath, label) {
  const { absolutePath } = await requireCanonicalRollbackParent(relativePath, label);
  try {
    const before = await lstat(absolutePath);
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1) {
      throw new Error(label + ": exact-rollback target is not a regular file: " + relativePath);
    }
    const bytes = await readFile(absolutePath);
    const after = await lstat(absolutePath);
    if (
      !after.isFile() ||
      after.isSymbolicLink() ||
      after.nlink !== 1 ||
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      bytes.length !== after.size ||
      (before.mode & 0o7777) !== (after.mode & 0o7777)
    ) {
      throw new Error(label + ": exact-rollback target changed while it was read: " + relativePath);
    }
    return Object.freeze({
      relativePath,
      exists: true,
      bytesBase64: bytes.toString("base64"),
      byteLength: bytes.length,
      sha256: exactBytesSha256(bytes),
      mode: after.mode & 0o7777,
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return Object.freeze({
        relativePath,
        exists: false,
        bytesBase64: null,
        byteLength: null,
        sha256: null,
        mode: null,
      });
    }
    throw error;
  }
}

function freezeWorktreeAuthority(snapshot) {
  return Object.freeze({
    head: snapshot.head,
    branch: snapshot.branch,
    indexAuthority: freezeGitIndexAuthority(
      snapshot.indexAuthority,
      "TASK-540 frozen worktree index authority"
    ),
    paths: Object.freeze([...snapshot.paths]),
    hashes: Object.freeze({ ...snapshot.hashes }),
  });
}

function equalWorktreeAuthority(left, right) {
  return (
    left.head === right.head &&
    left.branch === right.branch &&
    sameGitIndexAuthority(left.indexAuthority, right.indexAuthority) &&
    JSON.stringify(left.paths) === JSON.stringify(right.paths) &&
    equalHashMaps(left.hashes, right.hashes)
  );
}

async function captureExactRollbackFiles(relativePaths, label, { allowMissing = [] } = {}) {
  if (new Set(relativePaths).size !== relativePaths.length) {
    throw new Error(label + ": exact-rollback snapshot paths are duplicated");
  }
  const missingAllowed = new Set(allowMissing);
  const [authorityBefore, sensitiveEnvBefore] = await Promise.all([
    worktreeSnapshot(label + " before exact snapshot capture"),
    hashSensitiveEnvProjection(),
  ]);
  const entries = await Promise.all(
    relativePaths.map((relativePath) => readOptionalRollbackFile(relativePath, label))
  );
  for (const entry of entries) {
    if (!entry.exists && !missingAllowed.has(entry.relativePath)) {
      throw new Error(label + ": required exact-rollback file is missing: " + entry.relativePath);
    }
  }
  const [authorityAfter, sensitiveEnvAfter] = await Promise.all([
    worktreeSnapshot(label + " after exact snapshot capture"),
    hashSensitiveEnvProjection(),
  ]);
  if (
    !equalWorktreeAuthority(authorityBefore, authorityAfter) ||
    !equalHashMaps(sensitiveEnvBefore, sensitiveEnvAfter)
  ) {
    throw new Error(label + ": repository authority changed during exact snapshot capture");
  }
  return Object.freeze({
    authority: freezeWorktreeAuthority(authorityBefore),
    sensitiveEnv: sensitiveEnvBefore,
    entries: Object.freeze(entries),
  });
}

async function verifyExactRollbackFiles(snapshot, label) {
  const errors = [];
  for (const expected of snapshot.entries) {
    try {
      const actual = await readOptionalRollbackFile(expected.relativePath, label);
      if (
        actual.exists !== expected.exists ||
        actual.bytesBase64 !== expected.bytesBase64 ||
        actual.byteLength !== expected.byteLength ||
        actual.sha256 !== expected.sha256 ||
        actual.mode !== expected.mode
      ) {
        throw new Error(label + ": exact bytes were not restored for " + expected.relativePath);
      }
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, label + ": exact persisted rollback verification failed");
  }
}

function exactRollbackEntryBytes(entry, label) {
  if (
    !entry.exists ||
    typeof entry.bytesBase64 !== "string" ||
    !Number.isSafeInteger(entry.byteLength) ||
    entry.byteLength < 0 ||
    typeof entry.sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(entry.sha256)
  ) {
    throw new Error(label + ": exact-rollback byte snapshot is malformed: " + entry.relativePath);
  }
  const bytes = Buffer.from(entry.bytesBase64, "base64");
  if (
    bytes.toString("base64") !== entry.bytesBase64 ||
    bytes.length !== entry.byteLength ||
    exactBytesSha256(bytes) !== entry.sha256
  ) {
    throw new Error(
      label + ": exact-rollback byte snapshot is not canonical: " + entry.relativePath
    );
  }
  return bytes;
}

function exactRollbackEntryUtf8(entry, label) {
  const bytes = exactRollbackEntryBytes(entry, label);
  const source = bytes.toString("utf8");
  if (!Buffer.from(source, "utf8").equals(bytes)) {
    throw new Error(
      label + ": semantic task/changelog source is not strict UTF-8: " + entry.relativePath
    );
  }
  return source;
}

function requireExactRollbackSnapshotEntry(snapshot, relativePath, label) {
  const entries = snapshot.entries.filter((entry) => entry.relativePath === relativePath);
  if (entries.length !== 1 || !entries[0].exists) {
    throw new Error(label + ": exact-rollback snapshot entry is missing: " + relativePath);
  }
  exactRollbackEntryBytes(entries[0], label);
  return entries[0];
}

function requireExactRollbackSnapshotUtf8(snapshot, relativePath, label) {
  return exactRollbackEntryUtf8(
    requireExactRollbackSnapshotEntry(snapshot, relativePath, label),
    label
  );
}

async function readRollbackTargetInfo(absolutePath) {
  try {
    return await lstat(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function unlinkSafeRollbackTarget(absolutePath, relativePath, label) {
  const info = await readRollbackTargetInfo(absolutePath);
  if (!info) return;
  if (!info.isFile() && !info.isSymbolicLink()) {
    throw new Error(label + ": rollback target became a non-file: " + relativePath);
  }
  await unlink(absolutePath);
}

async function requireReplaceableRollbackTarget(absolutePath, relativePath, label) {
  const info = await readRollbackTargetInfo(absolutePath);
  if (info && !info.isFile() && !info.isSymbolicLink()) {
    throw new Error(label + ": rollback target became a non-file: " + relativePath);
  }
}

async function restoreExactRollbackEntry(entry, label) {
  let location = await requireCanonicalRollbackParent(entry.relativePath, label);
  if (!entry.exists) {
    await unlinkSafeRollbackTarget(location.absolutePath, entry.relativePath, label);
    await requireCanonicalRollbackParent(entry.relativePath, label);
    return;
  }
  const bytes = exactRollbackEntryBytes(entry, label);

  const temporaryPath =
    location.parentAbsolutePath +
    "/." +
    location.basename +
    ".task-540-rollback-" +
    randomUUID() +
    ".tmp";
  let handle = null;
  let temporaryExists = false;
  let mutationError = null;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    temporaryExists = true;
    await handle.writeFile(bytes);
    await handle.chmod(entry.mode);
    await handle.sync();
    await handle.close();
    handle = null;

    location = await requireCanonicalRollbackParent(entry.relativePath, label);
    await requireReplaceableRollbackTarget(location.absolutePath, entry.relativePath, label);
    location = await requireCanonicalRollbackParent(entry.relativePath, label);
    await rename(temporaryPath, location.absolutePath);
    temporaryExists = false;
    await requireCanonicalRollbackParent(entry.relativePath, label);
  } catch (error) {
    mutationError = error;
  }

  const cleanupErrors = [];
  if (handle) {
    try {
      await handle.close();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (temporaryExists) {
    try {
      await unlink(temporaryPath);
    } catch (error) {
      if (error?.code !== "ENOENT") cleanupErrors.push(error);
    }
  }
  if (mutationError && cleanupErrors.length > 0) {
    throw new AggregateError(
      [mutationError, ...cleanupErrors],
      label + ": exact rollback write and temporary cleanup both failed"
    );
  }
  if (mutationError) throw mutationError;
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, label + ": exact rollback temporary cleanup failed");
  }
}

async function restoreExactRollbackFiles(
  snapshot,
  owner,
  label,
  { allowedResidualPaths = [] } = {}
) {
  // Rollback stays orchestrator-local: these task/index snapshots can be large,
  // and exact bytes must never be serialized into an agent prompt or shell command.
  if (
    !sameUniqueSet(
      snapshot.entries.map((entry) => entry.relativePath),
      owner.allowedFiles
    )
  ) {
    throw new Error(label + ": exact snapshot does not cover every rollback-owned file");
  }
  for (const entry of snapshot.entries) {
    if (!owner.allowedFiles.includes(entry.relativePath)) {
      throw new Error(label + ": rollback owner does not own " + entry.relativePath);
    }
  }
  if (new Set(allowedResidualPaths).size !== allowedResidualPaths.length) {
    throw new Error(label + ": residual rollback paths are duplicated");
  }
  const residualPathSet = new Set(allowedResidualPaths);
  for (const relativePath of residualPathSet) {
    if (
      typeof relativePath !== "string" ||
      relativePath.length === 0 ||
      relativePath.startsWith("/") ||
      relativePath.split("/").includes("..") ||
      relativePath.split("/").some((segment) => /^\.env(?:\.|$)/.test(segment)) ||
      owner.allowedFiles.includes(relativePath)
    ) {
      throw new Error(label + ": unsafe residual rollback path " + relativePath);
    }
  }
  const [currentAuthority, currentSensitiveEnv] = await Promise.all([
    worktreeSnapshot(label + " before exact rollback restore"),
    hashSensitiveEnvProjection(),
  ]);
  if (
    currentAuthority.head !== snapshot.authority.head ||
    currentAuthority.branch !== snapshot.authority.branch ||
    !sameGitIndexAuthority(currentAuthority.indexAuthority, snapshot.authority.indexAuthority) ||
    !equalHashMaps(currentSensitiveEnv, snapshot.sensitiveEnv)
  ) {
    throw new Error(label + ": exact rollback authority changed before restore");
  }
  const preRestoreDelta = snapshotDelta(snapshot.authority, currentAuthority);
  if (
    preRestoreDelta.some(
      (relativePath) =>
        !owner.allowedFiles.includes(relativePath) && !residualPathSet.has(relativePath)
    )
  ) {
    throw new Error(
      label + ": unrelated worktree state changed before rollback: " + preRestoreDelta.join(", ")
    );
  }

  const mutationErrors = [];
  for (const entry of snapshot.entries) {
    try {
      await restoreExactRollbackEntry(entry, label);
    } catch (error) {
      mutationErrors.push(error);
    }
  }
  const mutationError =
    mutationErrors.length > 0
      ? new AggregateError(mutationErrors, label + ": exact rollback mutation failed")
      : null;

  let verificationError = null;
  try {
    await verifyExactRollbackFiles(snapshot, label);
    const [after, sensitiveEnvAfter] = await Promise.all([
      worktreeSnapshot(label + " after exact rollback restore"),
      hashSensitiveEnvProjection(),
    ]);
    const residualDelta = snapshotDelta(snapshot.authority, after);
    const authorityRestored =
      after.head === snapshot.authority.head &&
      after.branch === snapshot.authority.branch &&
      sameGitIndexAuthority(after.indexAuthority, snapshot.authority.indexAuthority) &&
      residualDelta.every((relativePath) => residualPathSet.has(relativePath));
    if (!authorityRestored || !equalHashMaps(snapshot.sensitiveEnv, sensitiveEnvAfter)) {
      throw new Error(
        residualPathSet.size === 0
          ? label + ": exact rollback did not restore its complete captured authority"
          : label + ": scoped rollback changed authority outside its declared residual paths"
      );
    }
  } catch (error) {
    verificationError = error;
  }
  if (mutationError && verificationError) {
    throw new AggregateError(
      [mutationError, verificationError],
      label + ": rollback mutation and exact persisted verification both failed"
    );
  }
  if (mutationError) throw mutationError;
  if (verificationError) throw verificationError;
}

async function taskStatusState() {
  const rows = [];
  for (const file of TASK_FILES) {
    const source = await readFile(TASKS + "/" + file, "utf8");
    const status = source.match(/^\*\*Status:\*\*\s*(.+)$/m)?.[1] ?? "<missing>";
    rows.push({ file, status });
  }
  return rows;
}

async function repoContext() {
  const [head, branch, status, diffStat, diffNames, staged, taskStatuses] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["status", "--short", "--untracked-files=all"]),
    git(["diff", "--stat", "HEAD"]),
    git(["diff", "--name-only", "HEAD"]),
    git(["diff", "--cached", "--name-only"]),
    taskStatusState(),
  ]);
  return {
    root: ROOT,
    head: head.trim(),
    branch: branch.trim(),
    status: status.trim(),
    diffStat: diffStat.trim(),
    diffNames: diffNames.trim(),
    stagedNamesForContext: staged.trim(),
    taskStatuses,
  };
}

async function groundedPrompt(body) {
  return (
    body +
    "\n\nRoot-local state captured immediately before dispatch (verify it yourself; " +
    "do not treat it as permission to alter unrelated work):\n" +
    JSON.stringify(await repoContext())
  );
}

async function runReadOnlyAgent(prompt, options) {
  const [before, sensitiveEnvBefore] = await Promise.all([
    worktreeSnapshot(options.label + " before read-only dispatch"),
    hashSensitiveEnvProjection(),
  ]);
  let result = null;
  let dispatchError = null;
  try {
    result = await dispatchAgentSafely(await groundedPrompt(prompt), options);
  } catch (error) {
    dispatchError = error;
  }
  let stateError = null;
  try {
    const [after, sensitiveEnvAfter] = await Promise.all([
      worktreeSnapshot(options.label + " after read-only dispatch"),
      hashSensitiveEnvProjection(),
    ]);
    const delta = snapshotDelta(before, after);
    if (
      before.head !== after.head ||
      before.branch !== after.branch ||
      !sameGitIndexAuthority(before.indexAuthority, after.indexAuthority) ||
      !equalHashMaps(sensitiveEnvBefore, sensitiveEnvAfter) ||
      delta.length > 0
    ) {
      stateError = new Error(
        options.label + ": read-only agent changed repository state: " + delta.join(", ")
      );
    }
  } catch (error) {
    stateError = error;
  }
  if (dispatchError && stateError) {
    throw new AggregateError(
      [dispatchError, stateError],
      options.label + ": read-only dispatch failed and changed repository state"
    );
  }
  if (dispatchError) throw dispatchError;
  if (stateError) throw stateError;
  return result;
}

const ASSISTANT_FIXTURE_ONLY_PATH = "tests/vitest/ui/assistant-panel-interaction.test.tsx";
const ASSISTANT_ACTION_EXECUTOR_FIXTURE_ONLY_PATH =
  "tests/unit/assistant/actionExecutorService.test.ts";
const SCREEN_EDITOR_SECTIONS_FIXTURE_ONLY_PATH =
  "tests/vitest/ui-integration/screen-editor-sections.test.tsx";
const ASSISTANT_PREFERENCE_PROPERTY_FORMS = Object.freeze([
  '    "customScreens.entry.preferences": { version: 1, showFieldMetadata: false },\n',
  '    "customScreens.entry.preferences": {\n' +
    "      version: 1,\n" +
    "      showFieldMetadata: false,\n" +
    "    },\n",
]);

function projectAssistantFixtureOnlySource(source) {
  const fixtureStart = source.indexOf("const makeUserSettings =");
  const fixtureEnd = source.indexOf("\n};", fixtureStart);
  if (fixtureStart < 0 || fixtureEnd < 0) {
    throw new Error("TASK-540 assistant UserSettings fixture boundary is missing");
  }
  const matches = ASSISTANT_PREFERENCE_PROPERTY_FORMS.flatMap((form) => {
    const indexes = [];
    let cursor = source.indexOf(form);
    while (cursor >= 0) {
      indexes.push({ form, index: cursor });
      cursor = source.indexOf(form, cursor + form.length);
    }
    return indexes;
  });
  if (matches.length > 1) {
    throw new Error("TASK-540 assistant preference fixture property is duplicated");
  }
  if (
    matches.length === 1 &&
    (matches[0].index < fixtureStart || matches[0].index + matches[0].form.length > fixtureEnd)
  ) {
    throw new Error("TASK-540 assistant preference property escaped makeUserSettings");
  }
  const match = matches[0] ?? null;
  return Object.freeze({
    hasExactProperty: Boolean(match),
    projection: match
      ? source.slice(0, match.index) + source.slice(match.index + match.form.length)
      : source,
  });
}

const CUSTOM_SCREEN_PATCH_FIXTURE_REPLACEMENTS = Object.freeze([
  Object.freeze([
    "    definition: createNativeTestCustomScreenDefinition([\n" +
      '      { id: "hero-1", type: "hero", data: { headline: "Old headline", body: "Keep body" } },\n' +
      '      { id: "text-1", type: "rich-text-section", data: { title: "Keep sibling" } },\n' +
      "    ]),",
    "    definition: createNativeTestCustomScreenDefinition([\n" +
      '      { id: "heading-1", type: "heading", data: { text: "Old headline", label: "Keep label" } },\n' +
      '      { id: "text-1", type: "text", data: { content: "Keep sibling" } },\n' +
      "    ]),",
  ]),
  Object.freeze(['        title: "Patch hero",', '        title: "Patch heading",']),
  Object.freeze([
    '    summary: "Patch screen hero headline.",',
    '    summary: "Patch screen heading text.",',
  ]),
  Object.freeze([
    '          blockId: "hero-1",\n' +
      '          expectedBlockType: "hero",\n' +
      '          dataPath: ["headline"],',
    '          blockId: "heading-1",\n' +
      '          expectedBlockType: "heading",\n' +
      '          dataPath: ["text"],',
  ]),
  Object.freeze([
    '  expect(deps.__state.customScreens[0]?.blocks[0]?.data.headline).toBe("New headline");\n' +
      '  expect(deps.__state.customScreens[0]?.blocks[0]?.data.body).toBe("Keep body");\n' +
      '  expect(deps.__state.customScreens[0]?.blocks[1]?.data.title).toBe("Keep sibling");',
    '  expect(deps.__state.customScreens[0]?.blocks[0]?.data.text).toBe("New headline");\n' +
      '  expect(deps.__state.customScreens[0]?.blocks[0]?.data.label).toBe("Keep label");\n' +
      '  expect(deps.__state.customScreens[0]?.blocks[1]?.data.content).toBe("Keep sibling");',
  ]),
]);

function canonicalizeCustomScreenPatchFixtureSource(source) {
  const startMarker =
    'test("executeAssistantActionPlan patches custom screen block data", async () => {';
  const endMarker =
    '\ntest("executeAssistantActionPlan deletes pages through explicit delete actions"';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error("TASK-540 assistant action fixture boundary is missing");
  }
  let body = source.slice(start, end);
  for (const [legacy, canonical] of CUSTOM_SCREEN_PATCH_FIXTURE_REPLACEMENTS) {
    const legacyCount = body.split(legacy).length - 1;
    const canonicalCount = body.split(canonical).length - 1;
    if (legacyCount + canonicalCount !== 1) {
      throw new Error("TASK-540 assistant action fixture form is missing or duplicated");
    }
    if (legacyCount === 1) body = body.replace(legacy, canonical);
  }
  return source.slice(0, start) + body + source.slice(end);
}

const SCREEN_EDITOR_SECTIONS_CACHE_BUS_MOCK_BEFORE =
  'vi.mock("@/utils/cacheBus", () => ({\n' +
  "  subscribeCacheEvents: vi.fn(() => () => undefined),\n" +
  "}));";
const SCREEN_EDITOR_SECTIONS_CACHE_BUS_MOCK_AFTER =
  'vi.mock("@/utils/cacheBus", () => ({\n' +
  "  createCacheEventOperationToken: () => Symbol(),\n" +
  "  subscribeCacheEvents: vi.fn(() => () => undefined),\n" +
  "}));";

function canonicalizeScreenEditorSectionsCacheBusMockSource(source) {
  const legacyCount = source.split(SCREEN_EDITOR_SECTIONS_CACHE_BUS_MOCK_BEFORE).length - 1;
  const canonicalCount = source.split(SCREEN_EDITOR_SECTIONS_CACHE_BUS_MOCK_AFTER).length - 1;
  if (legacyCount + canonicalCount !== 1) {
    throw new Error("TASK-540 Screen editor sections cacheBus mock is missing or duplicated");
  }
  return legacyCount === 1
    ? source.replace(
        SCREEN_EDITOR_SECTIONS_CACHE_BUS_MOCK_BEFORE,
        SCREEN_EDITOR_SECTIONS_CACHE_BUS_MOCK_AFTER
      )
    : source;
}

async function captureFixtureOnlySources(owner) {
  const sources = new Map();
  for (const relativePath of owner.fixtureOnlyFiles ?? []) {
    sources.set(relativePath, await readFile(ROOT + "/" + relativePath, "utf8"));
  }
  return sources;
}

async function verifyFixtureOnlySources(owner, beforeSources) {
  for (const relativePath of owner.fixtureOnlyFiles ?? []) {
    if (relativePath === SCREEN_EDITOR_SECTIONS_FIXTURE_ONLY_PATH) {
      const before = beforeSources.get(relativePath);
      const expectedAfter = canonicalizeScreenEditorSectionsCacheBusMockSource(before);
      const after = await readFile(ROOT + "/" + relativePath, "utf8");
      if (
        after !== expectedAfter ||
        canonicalizeScreenEditorSectionsCacheBusMockSource(after) !== after
      ) {
        throw new Error(
          "TASK-540 Screen editor sections fixture-only seam changed outside the exact cacheBus factory export"
        );
      }
      continue;
    }
    if (relativePath === ASSISTANT_ACTION_EXECUTOR_FIXTURE_ONLY_PATH) {
      const before = beforeSources.get(relativePath);
      const expectedAfter = canonicalizeCustomScreenPatchFixtureSource(before);
      const after = await readFile(ROOT + "/" + relativePath, "utf8");
      if (after !== expectedAfter || canonicalizeCustomScreenPatchFixtureSource(after) !== after) {
        throw new Error(
          "TASK-540 assistant action fixture-only seam changed outside the exact canonical Screen block projection"
        );
      }
      continue;
    }
    if (relativePath !== ASSISTANT_FIXTURE_ONLY_PATH) {
      throw new Error("TASK-540 has no fixture-only verifier for " + relativePath);
    }
    const before = projectAssistantFixtureOnlySource(beforeSources.get(relativePath));
    const after = projectAssistantFixtureOnlySource(
      await readFile(ROOT + "/" + relativePath, "utf8")
    );
    if (!after.hasExactProperty || before.projection !== after.projection) {
      throw new Error(
        "TASK-540 assistant fixture-only seam changed outside the exact preference property"
      );
    }
  }
}

function projectTaskBoardUnrelatedBytes(source) {
  const rows = [...source.matchAll(/^\| TASK-540 \|.*$/gm)];
  if (rows.length !== 1) throw new Error("TASK-540 board projection requires one task row");
  let projected = source.replace(/^\| TASK-540 \|.*\n?/gm, "");
  for (const label of ["To Do", "In Progress", "Done"]) {
    const pattern = new RegExp("^- \\*\\*" + label + ":\\*\\* \\d+ tasks$", "gm");
    const matches = [...projected.matchAll(pattern)];
    if (matches.length !== 1) {
      throw new Error("TASK-540 board projection requires one " + label + " statistic");
    }
    projected = projected.replace(pattern, "<TASK-540-STAT:" + label + ">");
  }
  return projected;
}

const TASK_STATUS_MUTABLE_METADATA_FIELDS = Object.freeze([
  "Started",
  "Fix Started",
  "Reopened",
  "Implementation Complete",
  "Completed",
  "Targeted Gate Passed",
  "Revalidation Passed",
  "Repair Pending",
  "Closure Pending",
  "Closure Evidence SHA-256",
  "Closure Generation",
  "Closure Board Baseline",
  CLOSURE_CHANGELOG_PATH_FIELD,
]);

function projectTaskContractUnrelatedBytes(source, mutation, label) {
  const statusLines = [...source.matchAll(/^\*\*Status:\*\*.*$/gm)];
  if (statusLines.length !== 1) {
    throw new Error(label + ": task-contract projection requires one Status field");
  }
  let projected = source.replace(/^\*\*Status:\*\*.*$/m, "<TASK-540-MUTABLE-STATUS>");
  for (const field of mutation.mutableFields ?? []) {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp("^\\*\\*" + escaped + ":\\*\\*.*(?:\\n|$)", "gm");
    const matches = [...projected.matchAll(pattern)];
    if (matches.length > 1) {
      throw new Error(label + ": duplicated mutable task metadata field " + field);
    }
    projected = projected.replace(pattern, "");
  }
  for (const taskId of mutation.tableTaskIds ?? []) {
    const pattern = new RegExp("^\\| TASK-" + taskId + " \\|.*$", "gm");
    const matches = [...projected.matchAll(pattern)];
    if (matches.length !== 1) {
      throw new Error(label + ": task-contract projection requires one TASK-" + taskId + " row");
    }
    projected = projected.replace(pattern, "<TASK-540-MUTABLE-ROW:" + taskId + ">");
  }
  return projected;
}

const TASK_540_RESERVED_PROSE =
  "Changelogs 1251, 1252, 1254, and 1257 remain reserved for the implementation " +
  "closure of TASK-539, TASK-540, TASK-542, and TASK-545, respectively.";
const TASK_540_CONSUMED_PROSE = "Changelog 1252 is consumed by the completed TASK-540 family.";
const TASK_540_REMAINING_RESERVED_PROSE =
  "Changelogs 1251, 1254, and 1257 remain reserved for the implementation closure of " +
  "TASK-539, TASK-542, and TASK-545, respectively.";
const TASK_540_INDEX_SLOT_END = "These remaining numbers are contract reservations only:";

function normalizeProse(value) {
  return value.replace(/\s+/g, " ").trim();
}

function projectTask540IndexProseSlot(prose, label) {
  const starts = [
    prose.indexOf("Changelogs 1251, 1252, 1254, and 1257 remain reserved"),
    prose.indexOf("Changelog 1252 is consumed by the completed TASK-540 family."),
  ].filter((index) => index >= 0);
  if (starts.length !== 1) {
    throw new Error(label + ": TASK-540 changelog prose slot is missing or duplicated");
  }
  const start = starts[0];
  const end = prose.indexOf(TASK_540_INDEX_SLOT_END, start);
  if (end < 0) throw new Error(label + ": TASK-540 changelog prose slot end is missing");
  const actual = normalizeProse(prose.slice(start, end));
  const reserved = normalizeProse(TASK_540_RESERVED_PROSE);
  const consumed = normalizeProse(
    TASK_540_CONSUMED_PROSE + " " + TASK_540_REMAINING_RESERVED_PROSE
  );
  if (actual !== reserved && actual !== consumed) {
    throw new Error(label + ": TASK-540 changelog prose slot is not canonical");
  }
  const projected = prose.slice(0, start) + "<TASK-540-INDEX-PROSE-SLOT>\n" + prose.slice(end);
  if (/\b1252\b/.test(projected)) {
    throw new Error(label + ": contradictory 1252 prose escaped the canonical slot");
  }
  const projectedFragments = projected.match(/[^.!?]*[.!?]+|[^.!?]+$/gs) ?? [];
  const contradictoryReservation = projectedFragments.some(
    (sentence) =>
      /\b(?:1251|1254|1257)\b/.test(sentence) &&
      /\b(?:reserved|reservation|reservations|consumed|completed)\b/i.test(sentence)
  );
  if (contradictoryReservation) {
    throw new Error(label + ": contradictory neighboring reservation prose escaped the slot");
  }
  const contradictoryNeighborTriple = projectedFragments.some((fragment) =>
    [1251, 1254, 1257].every((number) => new RegExp("\\b" + number + "\\b").test(fragment))
  );
  if (contradictoryNeighborTriple) {
    throw new Error(label + ": contradictory 1251/1254/1257 fragment escaped the slot");
  }
  return projected;
}

function projectTask540AnchorSlot(prose, mode, label) {
  const heading = "## Index\n";
  if (prose.split(heading).length - 1 !== 1) {
    throw new Error(label + ": changelog Index heading is missing or duplicated");
  }
  const headingEnd = prose.indexOf(heading) + heading.length;
  const before = prose.slice(0, headingEnd);
  let rest = prose.slice(headingEnd);
  const leading = rest.match(/^(?:[ \t]*\n)*/)?.[0] ?? "";
  rest = rest.slice(leading.length);
  let anchorLine = null;
  const newline = rest.indexOf("\n");
  const firstLine = newline >= 0 ? rest.slice(0, newline) : rest;
  if (firstLine.startsWith("<!-- TASK-540-CLOSURE-ANCHOR")) {
    anchorLine = firstLine;
    rest = newline >= 0 ? rest.slice(newline + 1) : "";
    rest = rest.replace(/^(?:[ \t]*\n)*/, "");
  }
  if (rest.split("\n").some((line) => line.startsWith("<!-- TASK-540-CLOSURE-ANCHOR"))) {
    throw new Error(label + ": TASK-540 closure anchor escaped its exact slot");
  }
  if (mode === "anchor-only") {
    if (
      !anchorLine ||
      !anchorLine.startsWith(CLOSURE_ANCHOR_PREFIX) ||
      !anchorLine.endsWith(CLOSURE_ANCHOR_SUFFIX)
    ) {
      throw new Error(label + ": exact TASK-540 closure anchor slot is malformed");
    }
  } else if (!["evidence", "anchor-recovery"].includes(mode)) {
    throw new Error(label + ": unsupported TASK-540 changelog mutation mode");
  }
  return before + "<TASK-540-CLOSURE-ANCHOR-SLOT>\n\n" + rest;
}

function isCanonicalTask540IndexRow(row) {
  const cells = row
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
  return (
    cells.length === 4 &&
    cells[0] === "1252" &&
    cells[1] === "2026-07-14" &&
    cells[2].startsWith(CHANGELOG_TITLE_PREFIX + " —") &&
    cells[3] === CHANGELOG_TYPE
  );
}

function projectTask540IndexUnrelatedBytes(source, mode = "evidence", label = "TASK-540") {
  const tableStart = source.indexOf("| No. | Date | Title | Type |");
  if (tableStart < 0) throw new Error(label + ": changelog index table header is missing");
  let prose = source.slice(0, tableStart);
  let table = source.slice(tableStart);
  prose = projectTask540AnchorSlot(prose, mode, label);
  if (mode === "evidence") {
    prose = projectTask540IndexProseSlot(prose, label);
    const rows = [...table.matchAll(/^\| 1252 \|.*$/gm)].map((match) => match[0]);
    if (rows.length > 1 || (rows.length === 1 && !isCanonicalTask540IndexRow(rows[0]))) {
      throw new Error(label + ": TASK-540 changelog row is duplicated or non-canonical");
    }
    table = table.replace(/^\| 1252 \|.*\n?/gm, "");
    table = table.replace(/^(\|-----\|------\|-------\|------\|\n)/m, "$1<TASK-540-INDEX-ROW>\n");
  }
  return prose + table;
}

function requireTask540NeighborReservations(source, label) {
  const tableStart = source.indexOf("| No. | Date | Title | Type |");
  if (tableStart < 0) throw new Error(label + ": changelog index header is missing");
  const prose = source.slice(0, tableStart).replace(/\s+/g, " ");
  const exactReservation =
    "Changelogs 1251, 1254, and 1257 remain reserved for the implementation closure of " +
    "TASK-539, TASK-542, and TASK-545, respectively.";
  if (prose.split(exactReservation).length - 1 !== 1) {
    throw new Error(label + ": exact 1251/1254/1257 reservation mapping is missing");
  }
  for (const number of [1251, 1254, 1257]) {
    if ([...source.matchAll(new RegExp("^\\| " + number + " \\|.*$", "gm"))].length !== 0) {
      throw new Error(label + ": reserved changelog " + number + " unexpectedly has an index row");
    }
  }
}

async function captureSharedMutationProjections(owner) {
  const projection = {};
  if (owner.allowedFiles.includes("_docs/_TASKS/README.md") && !owner.skipTaskBoardProjection) {
    projection.taskBoard = projectTaskBoardUnrelatedBytes(
      await readFile(TASKS + "/README.md", "utf8")
    );
  }
  if (
    owner.allowedFiles.includes("_docs/_CHANGELOG/README.md") &&
    !owner.skipChangelogIndexProjection
  ) {
    projection.changelogIndex = projectTask540IndexUnrelatedBytes(
      await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8"),
      owner.changelogIndexMutation ?? "evidence",
      owner.id
    );
  }
  if (owner.taskContractMutations?.length) {
    projection.taskContracts = Object.fromEntries(
      await Promise.all(
        owner.taskContractMutations.map(async (mutation) => [
          mutation.relativePath,
          projectTaskContractUnrelatedBytes(
            await readFile(ROOT + "/" + mutation.relativePath, "utf8"),
            mutation,
            owner.id
          ),
        ])
      )
    );
  }
  return Object.freeze(projection);
}

async function verifySharedMutationProjections(owner, before, label) {
  if (Object.hasOwn(before, "taskBoard")) {
    const after = projectTaskBoardUnrelatedBytes(await readFile(TASKS + "/README.md", "utf8"));
    if (after !== before.taskBoard) {
      throw new Error(label + ": task-board mutation changed unrelated bytes/rows");
    }
  }
  if (Object.hasOwn(before, "changelogIndex")) {
    const indexSource = await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8");
    const after = projectTask540IndexUnrelatedBytes(
      indexSource,
      owner.changelogIndexMutation ?? "evidence",
      label
    );
    if (after !== before.changelogIndex) {
      throw new Error(label + ": changelog-index mutation changed unrelated bytes/rows");
    }
    requireTask540NeighborReservations(indexSource, label);
  }
  if (Object.hasOwn(before, "taskContracts")) {
    for (const mutation of owner.taskContractMutations) {
      const after = projectTaskContractUnrelatedBytes(
        await readFile(ROOT + "/" + mutation.relativePath, "utf8"),
        mutation,
        label
      );
      if (after !== before.taskContracts[mutation.relativePath]) {
        throw new Error(label + ": status mutation changed unrelated task-contract bytes");
      }
    }
  }
}

async function runMutatingAgent(prompt, options, owner, requireOwned = true) {
  const fixtureOnlySources = await captureFixtureOnlySources(owner);
  const [before, sensitiveEnvBefore, sharedProjectionBefore] = await Promise.all([
    worktreeSnapshot(options.label + " before mutating dispatch"),
    hashSensitiveEnvProjection(),
    captureSharedMutationProjections(owner),
  ]);
  let result = null;
  let dispatchError = null;
  try {
    result = await dispatchAgentSafely(await groundedPrompt(prompt), {
      ...options,
      schema: MUTATION_SCHEMA,
    });
  } catch (error) {
    dispatchError = error;
  }

  let verificationError = null;
  try {
    const [after, sensitiveEnvAfter] = await Promise.all([
      worktreeSnapshot(options.label + " after mutating dispatch"),
      hashSensitiveEnvProjection(),
    ]);
    const delta = snapshotDelta(before, after);
    await verifyFixtureOnlySources(owner, fixtureOnlySources);
    await verifySharedMutationProjections(owner, sharedProjectionBefore, options.label);
    if (
      before.head !== after.head ||
      before.branch !== after.branch ||
      !sameGitIndexAuthority(before.indexAuthority, after.indexAuthority) ||
      !equalHashMaps(sensitiveEnvBefore, sensitiveEnvAfter)
    ) {
      throw new Error(
        options.label +
          ": agent changed the exact initial index baseline, committed, or changed branch"
      );
    }
    if (delta.some((path) => !owner.allowedFiles.includes(path))) {
      throw new Error(options.label + ": file ownership violation: " + delta.join(", "));
    }
    if (!dispatchError) {
      if (!result || !sameUniqueSet(result.touchedFiles, delta)) {
        throw new Error(options.label + ": reported touchedFiles differ from worktree delta");
      }
      if (requireOwned && owner.requiredFiles.some((path) => !result.touchedFiles.includes(path))) {
        throw new Error(options.label + ": required owned file was not changed");
      }
      if (!resultPassed(result)) {
        throw new Error(options.label + ": mutation agent failed: " + result.errors.join("; "));
      }
    }
  } catch (error) {
    verificationError = error;
  }

  if (dispatchError && verificationError) {
    throw new AggregateError(
      [dispatchError, verificationError],
      options.label + ": dispatch failed and post-dispatch repository verification also failed"
    );
  }
  if (dispatchError) throw dispatchError;
  if (verificationError) throw verificationError;
  return result;
}

function namedTestFilesForCommand(value) {
  const isVitestRun = /(?:^|\s)bunx\s+vitest\s+run(?:\s|$)/.test(value);
  const isBunTest = /(?:^|\s)bun\s+test(?:\s|$)/.test(value);
  if (!isVitestRun && !isBunTest) return Object.freeze([]);
  const files = value
    .split(/\s+/)
    .filter((token) => /^tests\/.*\.(?:test|spec)\.[cm]?[jt]sx?$/.test(token));
  if (new Set(files).size !== files.length) {
    throw new Error("TASK-540 test command repeats a named isolation file");
  }
  for (const file of files) {
    if (!TRACKED_TEST_FILES.includes(file)) {
      throw new Error("TASK-540 test command names an untracked isolation file: " + file);
    }
  }
  return Object.freeze(files);
}

function command(id, value) {
  const isolationCommands = isolationMetadata(namedTestFilesForCommand(value));
  return Object.freeze({ id, command: value, isolationCommands });
}

function vitestCommand(files) {
  return "bunx vitest run --config vitest.config.ts " + files.join(" ");
}

const LEAVES = Object.freeze(
  [
    {
      id: "540-01-L01",
      taskFile: "TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md",
      allowedFiles: Object.freeze([
        "core/services/customScreens/customScreenSchemas.ts",
        "core/services/customScreens/customScreenService.ts",
        "core/server/routes/customScreenRoutes.ts",
        "tests/unit/assistant/actionExecutorService.test.ts",
        "tests/vitest/admin/custom-screen-schemas.test.ts",
        "tests/vitest/customScreens/screen-document-image-src.test.ts",
        "tests/integration/routes/customScreensRoutes.test.ts",
      ]),
      repairAllowedFiles: Object.freeze(["tests/unit/assistant/actionExecutorService.test.ts"]),
      fixtureOnlyFiles: Object.freeze(["tests/unit/assistant/actionExecutorService.test.ts"]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/admin/custom-screen-schemas.test.ts",
            "tests/vitest/customScreens/screen-document-image-src.test.ts",
          ])
        ),
        command("dbPreflight", DB_PREFLIGHT),
        command(
          "bun",
          ENV +
            "bun test tests/integration/routes/customScreensRoutes.test.ts " +
            "tests/unit/assistant/actionExecutorService.test.ts"
        ),
        command("workflowSyntax", "node --check _docs/_workflows/task-540-implement.mjs"),
        command(
          "workflowRepairResumeSelfTest",
          "node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings"
        ),
        command("diffCheck", "git diff --check"),
      ]),
    },
    {
      id: "540-02-L01",
      taskFile: "TASK-540-02-L01-Expose-Link-Binding-And-Complete-Tab-Slot-Editing.md",
      allowedFiles: Object.freeze([
        "core/admin/ui/custom-screens/ScreenBlockInspector.tsx",
        "tests/vitest/ui/custom-screen-binding-panel.test.tsx",
        "tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx",
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/ui/custom-screen-binding-panel.test.tsx",
            "tests/vitest/ui-integration/custom-screen-image-inspector.test.tsx",
          ])
        ),
      ]),
    },
    {
      id: "540-03-L01",
      taskFile: "TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md",
      allowedFiles: Object.freeze([
        "core/admin/ui/custom-screens/ScreenRuntimeRenderer.tsx",
        "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx",
        "tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx",
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx",
            "tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx",
            "tests/vitest/customScreens/screen-document-image-src.test.ts",
          ])
        ),
      ]),
    },
    {
      id: "540-04-L01",
      taskFile: "TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md",
      allowedFiles: Object.freeze([
        "core/admin/services/entriesClient.ts",
        "core/admin/services/mediaClient.ts",
        "tests/vitest/admin/entriesClient.test.ts",
        "tests/vitest/admin/mediaClient.test.ts",
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/admin/entriesClient.test.ts",
            "tests/vitest/admin/mediaClient.test.ts",
          ])
        ),
      ]),
    },
    {
      id: "540-04-L02",
      taskFile: "TASK-540-04-L02-Cancel-And-Retry-Related-Entry-Loads.md",
      allowedFiles: Object.freeze([
        "core/admin/ui/custom-screens/hooks/useScreenRelatedEntries.ts",
        "core/admin/ui/custom-screens/CustomScreenWorkspacePreviewDialog.tsx",
        "tests/vitest/ui/use-screen-related-entries.test.tsx",
        "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx",
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/ui/use-screen-related-entries.test.tsx",
            "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx",
          ])
        ),
      ]),
    },
    {
      id: "540-04-L03",
      taskFile: "TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md",
      allowedFiles: Object.freeze([
        "core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx",
        "core/admin/ui/custom-screens/CustomScreenEntryCanvas.tsx",
        "core/admin/ui/custom-screens/CustomScreenPreview.tsx",
        "core/services/customScreens/screenEntryPresentationOverrides.ts",
        "core/services/customScreens/screenEntryPresentationOverrideContract.ts",
        "core/admin/services/customScreensClient.ts",
        "core/admin/utils/cacheBus.ts",
        "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
        "tests/vitest/ui/custom-screen-entry-draft.test.ts",
        "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx",
        "tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts",
        "tests/vitest/admin/customScreensClient.test.ts",
        "tests/vitest/admin/cacheBus.test.ts",
      ]),
      repairAllowedFiles: Object.freeze([
        "core/admin/utils/cacheBus.ts",
        "tests/vitest/admin/cacheBus.test.ts",
        "tests/integration/routes/customScreensRoutes.test.ts",
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command("rootTsc", ROOT_TSC),
        command("isolatedCacheBus", vitestCommand(["tests/vitest/admin/cacheBus.test.ts"])),
        command(
          "expandedL03Vitest",
          vitestCommand([
            "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
            "tests/vitest/ui/custom-screen-entry-draft.test.ts",
            "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx",
            "tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts",
            "tests/vitest/admin/customScreensClient.test.ts",
            "tests/vitest/admin/cacheBus.test.ts",
            "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx",
            "tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx",
            "tests/vitest/widgets/screenWidgets.test.tsx",
            "tests/vitest/ui/use-screen-related-entries.test.tsx",
            "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx",
          ])
        ),
        command(
          "l04ReadOnlyConsumerVitest",
          vitestCommand([
            "tests/vitest/ui/custom-screens-page.test.tsx",
            "tests/vitest/ui/custom-screen-route-params.test.ts",
            "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
            "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
            "tests/vitest/ui-integration/screen-editor-sections.test.tsx",
            "tests/vitest/admin/cacheBus.test.ts",
          ])
        ),
        command("dbPreflight", DB_PREFLIGHT),
        command(
          "directImageOverrideRouteBun",
          ENV + "bun test tests/integration/routes/customScreensRoutes.test.ts"
        ),
        command("workflowSyntax", "node --check _docs/_workflows/task-540-implement.mjs"),
        command(
          "workflowRepairResumeSelfTest",
          "node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings"
        ),
        command("diffCheck", "git diff --check"),
      ]),
    },
    {
      id: "540-04-L04",
      taskFile: "TASK-540-04-L04-Guard-Screen-Builder-Drafts.md",
      allowedFiles: Object.freeze([
        "core/admin/ui/custom-screens/CustomScreenEditorPage.tsx",
        "core/admin/ui/custom-screens/routeParams.ts",
        "tests/vitest/ui/custom-screens-page.test.tsx",
        "tests/vitest/ui/custom-screen-route-params.test.ts",
        "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
        "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
        "tests/vitest/ui-integration/screen-editor-sections.test.tsx",
      ]),
      repairAllowedFiles: Object.freeze([
        "tests/vitest/ui-integration/screen-editor-sections.test.tsx",
      ]),
      fixtureOnlyFiles: Object.freeze([
        "tests/vitest/ui-integration/screen-editor-sections.test.tsx",
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command("rootTsc", ROOT_TSC),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/ui/custom-screens-page.test.tsx",
            "tests/vitest/ui/custom-screen-route-params.test.ts",
            "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
            "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
            "tests/vitest/ui-integration/screen-editor-sections.test.tsx",
            "tests/vitest/admin/cacheBus.test.ts",
          ])
        ),
        command("workflowSyntax", "node --check _docs/_workflows/task-540-implement.mjs"),
        command(
          "workflowRepairResumeSelfTest",
          "node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings"
        ),
        command("diffCheck", "git diff --check"),
      ]),
    },
    {
      id: "540-05-L01",
      taskFile: "TASK-540-05-L01-Keep-Screen-Canvas-Usable-And-Aria-Valid.md",
      allowedFiles: Object.freeze([
        "core/admin/ui/custom-screens/ScreenAuthoringCanvas.tsx",
        "core/admin/ui/shared/CanvasEditor.tsx",
        "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx",
        "tests/vitest/ui/custom-screen-authoring-boundary.test.ts",
        "tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx",
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx",
            "tests/vitest/ui/custom-screen-authoring-boundary.test.ts",
            "tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx",
          ])
        ),
        command("rootTsc", ROOT_TSC),
      ]),
    },
    {
      id: "540-05-L02",
      taskFile: "TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md",
      allowedFiles: Object.freeze([
        "core/services/settings/userSettingsService.ts",
        "core/services/settings/screenEntryPreferencesContract.ts",
        "core/admin/services/adminAuthIdentity.ts",
        "core/admin/services/userSettingsClient.ts",
        "core/admin/ui/contexts/AdminAuthContext.tsx",
        "core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts",
        "core/server/routes/userSettingsRoutes.ts",
        "core/server/httpServer.ts",
        "core/services/settings/securitySettings.ts",
        "core/server/middleware/cors.ts",
        "tests/unit/settings/userSettingsService.test.ts",
        "tests/vitest/admin/userSettingsClient.test.ts",
        "tests/vitest/ui/admin-auth-identity.test.tsx",
        "tests/vitest/ui/assistant-panel-interaction.test.tsx",
        "tests/vitest/ui/use-screen-entry-preferences.test.ts",
        "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx",
        "tests/integration/routes/userSettings.test.ts",
        "tests/integration/routes/cors.test.ts",
      ]),
      fixtureOnlyFiles: Object.freeze(["tests/vitest/ui/assistant-panel-interaction.test.tsx"]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/admin/userSettingsClient.test.ts",
            "tests/vitest/ui/admin-auth-identity.test.tsx",
            "tests/vitest/ui/assistant-panel-interaction.test.tsx",
            "tests/vitest/ui/use-screen-entry-preferences.test.ts",
            "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx",
            "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
          ])
        ),
        command("rootTsc", ROOT_TSC),
        command("dbPreflight", DB_PREFLIGHT),
        command(
          "bun",
          ENV +
            "bun test tests/unit/settings/userSettingsService.test.ts " +
            "tests/integration/routes/userSettings.test.ts " +
            "tests/integration/routes/cors.test.ts"
        ),
      ]),
    },
    {
      id: "540-06-L01",
      phase: "540-06-L01 prepare",
      taskFile: "TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md",
      allowedFiles: Object.freeze([
        "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx",
        "_docs/CONTENT_TYPES_SPEC.md",
        "_docs/CMS_SPEC.md",
        "_docs/CMS_API.md",
        "_docs/SECURITY_SPEC.md",
        "_docs/ADMIN_CACHE.md",
        "_docs/ADMIN_CACHE_MAP.md",
        "docs/guide/coderso/custom-screen-records-and-entry-workflow.md",
        "docs/guide/coderso/custom-screens-list-and-builder.md",
        "docs/develop/content-and-widgets.md",
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command("rootTsc", ROOT_TSC),
        command("vitest", TARGETED_VITEST),
        command("dbPreflight", DB_PREFLIGHT),
        command("bun", TARGETED_BUN),
        command("smokeContractSyntax", "node --check _docs/_workflows/task-540-smoke-contract.mjs"),
        command(
          "smokeContractSelfTest",
          "node _docs/_workflows/task-540-smoke-contract.mjs --self-test"
        ),
        command("smokeExecutorSyntax", "node --check _docs/_workflows/task-540-smoke-executor.mjs"),
        command(
          "smokeExecutorSelfTest",
          "node _docs/_workflows/task-540-smoke-executor.mjs --self-test"
        ),
        command("smokeHostSyntax", "node --check _docs/_workflows/task-540-smoke-host.mjs"),
        command("smokeHostSelfTest", "node _docs/_workflows/task-540-smoke-host.mjs --self-test"),
        command("workflowSyntax", "node --check _docs/_workflows/task-540-implement.mjs"),
        command(
          "workflowRepairResumeSelfTest",
          "node _docs/_workflows/task-540-implement.mjs --self-test-repair-siblings"
        ),
        command("diffCheck", "git diff --check"),
      ]),
    },
  ].map((leaf) =>
    Object.freeze({
      ...leaf,
      phase: leaf.phase ?? leaf.id,
      requiredFiles: leaf.allowedFiles,
    })
  )
);

const LEAF_BY_ID = new Map(LEAVES.map((leaf) => [leaf.id, leaf]));

function effectiveRepairMutationOwner(leaf, { afterClosure = false } = {}) {
  const repairFiles = leaf.repairAllowedFiles ?? leaf.allowedFiles;
  const group = LEAF_STATUS_GROUPS[leaf.id];
  if (!group) throw new Error("TASK-540 effective repair owner has no status group: " + leaf.id);
  const taskContracts = afterClosure ? [ROOT_TASK_PATH, group.childPath, group.leafPath] : [];
  if (
    new Set(repairFiles).size !== repairFiles.length ||
    repairFiles.some((file) => taskContracts.includes(file))
  ) {
    throw new Error("TASK-540 effective repair owner has duplicate/mixed mutation authority");
  }
  return Object.freeze({
    ...leaf,
    allowedFiles: Object.freeze([...repairFiles, ...taskContracts]),
    requiredFiles: Object.freeze([]),
  });
}

const leafRestrictionPrompt = (leaf) => {
  const restrictions = [];
  if (leaf.id === "540-01-L01" && leaf.fixtureOnlyFiles?.length) {
    restrictions.push(
      " This owned path is a fixture-only compatibility seam: " +
        JSON.stringify(leaf.fixtureOnlyFiles) +
        ". Change only the existing custom-screen.block.patch test from unsupported fresh-write " +
        "hero/rich-text-section fixtures to canonical heading/text blocks, patch heading.data.text, " +
        "and preserve the heading label plus sibling text content. Do not change production, loosen " +
        "the Screen schema, add compatibility kinds, or weaken any assertion. The orchestrator " +
        "mechanically verifies the exact projection."
    );
  } else if (leaf.id === "540-04-L03" && leaf.repairAllowedFiles?.length) {
    restrictions.push(
      " This persisted repair has exactly three implementation/test repair paths: " +
        JSON.stringify(leaf.repairAllowedFiles) +
        ". In cacheBus.ts implement only private per-subscription canonical/legacy remote " +
        "correlation keyed by JSON.stringify([sourceId, ts, key, action]): count each family, " +
        "select delivery when max(canonical, legacy) exceeds delivered, subtract balanced pairs, " +
        "commit/delete/touch the complete state before handler invocation, and cap residual LRU " +
        "state at 128 with oldest fail-open eviction. " +
        "Reject unless Reflect.ownKeys is the order-independent exact string-key set action/key/" +
        "sourceId/ts, strictly bound every field, " +
        "reject storage over 2048 code units before JSON.parse, and reject malformed/own-source input " +
        "before every correlation lookup, touch, insertion, or eviction. Preserve self-source filtering, " +
        "use separate family listener wrappers with exact teardown/clear, and remove-before-set each " +
        "storage key so identical broadcasts re-arm. " +
        "Preserve canonical-only, legacy-only, repeated-identical, local bypass, exact local operation " +
        "tokens, remote undefined tokens, payload/API/cache-key/route/UI compatibility, and the explicit " +
        "no-TTL/fail-open contract. cacheBus.test.ts is the sole cache-bus test writer and must add the exact " +
        "interleaving and delimiter-collision matrix; asymmetric instance-directed A/B subscription " +
        "isolation plus unsubscribe/resubscribe; throwing-handler committed-state behavior; storage " +
        "remove/set and pre-parse oversize spy; exact unknown-own-key and timestamp reject/accept corpus; " +
        "specifically reject -1/fraction/NaN/Infinity/MAX_SAFE+1 and accept 0/MAX_SAFE; at the full " +
        "128-residual cap prove accessor/proxy/invalid-action/type/bound and own-source channel input, " +
        "plus malformed/removal/invalid/own-source storage input, are state-neutral and cannot evict " +
        "the oldest correlated twin; exact-cap and re-touch 128-entry true-LRU/FIFO " +
        "discriminator; local-token/own-echo behavior; and exact-four-key serialization from the leaf. " +
        "customScreensRoutes.test.ts is the sole additive Bun route-test writer: use its existing hasDb " +
        "pattern, the real registerCustomScreenRoutes boundary and validate helper, imported production " +
        "services/schema, uniquely scoped content-type/screen/entry/user fixtures, and cleanup limited to " +
        "owned rows. Prove a direct-image UUID override PATCH then GET round trip and a structurally valid " +
        "inactive target mapped to the bounded custom_screen_override_invalid 400 with no persistence. " +
        "Do not edit production routes or add another DB skip mechanism. " +
        "Every other dependent/consumer test is read-only; do not edit production consumers, unrelated " +
        "task/docs/changelog/board/workflow, weaken assertions, stage, or commit. Only an explicit " +
        "after-closure audit owner may separately add the exact root/child/leaf task contracts for " +
        "evidenced prose, without performing the separate status transition."
    );
  } else if (leaf.id === "540-04-L04" && leaf.fixtureOnlyFiles?.length) {
    restrictions.push(
      " This owned path is a fixture-only compatibility seam: " +
        JSON.stringify(leaf.fixtureOnlyFiles) +
        ". Add or preserve only `createCacheEventOperationToken: () => Symbol(),` inside " +
        "the existing @/utils/cacheBus mock immediately before subscribeCacheEvents. Every " +
        "other byte, including all nine TASK-500 tests and all of their behavior assertions, " +
        "imports, fixtures, and " +
        "mocks, must remain byte-identical. Do not change production or replace the fresh-symbol " +
        "factory with a shared token. The orchestrator mechanically verifies the exact projection."
    );
  } else if (leaf.fixtureOnlyFiles?.length) {
    restrictions.push(
      " These owned paths are fixture-only compatibility seams: " +
        JSON.stringify(leaf.fixtureOnlyFiles) +
        ". In assistant-panel-interaction.test.tsx add/preserve only the exact typed " +
        '`"customScreens.entry.preferences": { version: 1, showFieldMetadata: false }` ' +
        "property inside makeUserSettings; every import, mock, test, and behavior assertion must " +
        "remain byte-identical. The orchestrator mechanically verifies this projection."
    );
  }
  return restrictions.join("");
};
const COMMON =
  "Repository " +
  ROOT +
  ". Implement TASK-540 only in the declared strict sequence. Read root AGENTS.md, " +
  "the parent/child/exact leaf, architecture/domain/testing/security/cache docs, owned " +
  "source/tests, current HEAD/status/full diff immediately before editing. Build on current " +
  "on-disk state and preserve unrelated work. Code/comments are English. Never stage, " +
  "commit, push, reset, checkout, suppress a scanner, change dependencies, or edit another " +
  "task family. Configurable widgets remain Dashboard-only. Page and widget paths are " +
  "forbidden: " +
  JSON.stringify(FORBIDDEN_PATHS) +
  ". Add changed-behavior tests with the sole source owner; never weaken assertions. " +
  "Re-run a named failing file alone before classifying it. Never print .env values, " +
  "credentials, cookies, tokens, hashes, or raw user data.";

function parseCanonicalTaskStatusSource(source, relativePath) {
  const statuses = [...source.matchAll(/^\*\*Status:\*\*\s*(.+)$/gm)].map((match) => match[1]);
  if (statuses.length !== 1) {
    throw new Error(relativePath + ": task must carry exactly one canonical Status field");
  }
  return {
    source,
    status: statuses[0],
  };
}

async function readCanonicalTaskStatus(relativePath) {
  return parseCanonicalTaskStatusSource(
    await readFile(ROOT + "/" + relativePath, "utf8"),
    relativePath
  );
}

function requireTableStatus(source, taskId, status, label) {
  const rows = source.split("\n").filter((line) => line.startsWith("| TASK-" + taskId + " |"));
  if (rows.length !== 1 || !rows[0].trimEnd().endsWith("| " + status + " |")) {
    throw new Error(label + ": stale status table row for TASK-" + taskId);
  }
}

const RESUME_TASK_STATUS = Object.freeze({
  todo: "⏳ To Do",
  active: "🚧 In Progress",
  done: "✅ Done",
});

function isTask540RepairSiblingStateAllowed(state, { allowCoveredDone = false } = {}) {
  const hasTargetedGate = Boolean(state.targetedGate);
  const hasRevalidation = Boolean(state.revalidation);
  const hasExactlyOneGate = hasTargetedGate !== hasRevalidation;
  if (state.id === "540-06-L01") {
    return (
      state.status === RESUME_TASK_STATUS.active &&
      !state.completed &&
      !state.repairPending &&
      ((!state.closurePending && !hasTargetedGate && !hasRevalidation) ||
        (allowCoveredDone && Boolean(state.closurePending) && hasExactlyOneGate))
    );
  }
  return (
    !state.repairPending &&
    hasExactlyOneGate &&
    ((state.status === RESUME_TASK_STATUS.active && !state.completed) ||
      (allowCoveredDone && state.status === RESUME_TASK_STATUS.done && Boolean(state.completed)))
  );
}

function assertTask540RepairSiblingStateContract() {
  const cases = [
    {
      label: "ungated active closure sibling",
      state: {
        id: "540-06-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        targetedGate: null,
        revalidation: null,
        repairPending: null,
      },
      allowed: true,
    },
    {
      label: "gated active closure sibling with durable closure pending",
      state: {
        id: "540-06-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        targetedGate: "gate green",
        revalidation: null,
        repairPending: null,
        closurePending: "generation 1 / abcdef123456",
      },
      allowCoveredDone: true,
      allowed: true,
    },
    {
      label: "gated active closure sibling without durable closure pending",
      state: {
        id: "540-06-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        targetedGate: "gate green",
        revalidation: null,
        repairPending: null,
      },
      allowed: false,
    },
    {
      label: "prematurely done closure sibling",
      state: {
        id: "540-06-L01",
        status: RESUME_TASK_STATUS.done,
        completed: "2026-07-14",
        repairPending: null,
      },
      allowed: false,
    },
    {
      label: "gated active source sibling",
      state: {
        id: "540-03-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        targetedGate: "gate green",
        revalidation: null,
        repairPending: null,
      },
      allowed: true,
    },
    {
      label: "completed source sibling after family closure",
      state: {
        id: "540-03-L01",
        status: RESUME_TASK_STATUS.done,
        completed: "2026-07-14",
        targetedGate: null,
        revalidation: "gate green",
        repairPending: null,
      },
      allowCoveredDone: true,
      allowed: true,
    },
    {
      label: "ungated active source sibling",
      state: {
        id: "540-03-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        repairPending: null,
      },
      allowed: false,
    },
    {
      label: "done source sibling without gate receipt",
      state: {
        id: "540-03-L01",
        status: RESUME_TASK_STATUS.done,
        completed: "2026-07-14",
        repairPending: null,
      },
      allowed: false,
    },
    {
      label: "source sibling with both gate fields",
      state: {
        id: "540-03-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        targetedGate: "gate green",
        revalidation: "gate green",
        repairPending: null,
      },
      allowed: false,
    },
    {
      label: "second pending repair on closure sibling",
      state: {
        id: "540-06-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        repairPending: "generation duplicate / token duplicate",
      },
      allowed: false,
    },
  ];
  for (const testCase of cases) {
    if (
      isTask540RepairSiblingStateAllowed(testCase.state, {
        allowCoveredDone: testCase.allowCoveredDone ?? false,
      }) !== testCase.allowed
    ) {
      throw new Error("TASK-540 repair sibling self-test failed: " + testCase.label);
    }
  }
  return cases.length;
}

function assertTask540L03RepairSiblingContract() {
  const repairOwner = LEAF_BY_ID.get("540-04-L03");
  const expectedRepairFiles = [
    "core/admin/utils/cacheBus.ts",
    "tests/vitest/admin/cacheBus.test.ts",
    "tests/integration/routes/customScreensRoutes.test.ts",
  ];
  if (
    !repairOwner ||
    JSON.stringify(repairOwner.repairAllowedFiles) !== JSON.stringify(expectedRepairFiles)
  ) {
    throw new Error("TASK-540 L03 repair owner is not pinned to the exact three-file repair set");
  }
  const cases = [
    {
      label: "L03 repair preserves the exact ungated active closure sibling",
      state: {
        id: "540-06-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        targetedGate: null,
        revalidation: null,
        repairPending: null,
      },
      allowed: true,
    },
    {
      label: "L03 pre-closure repair rejects a gate without durable closure pending",
      state: {
        id: "540-06-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        targetedGate: "stale gate",
        revalidation: null,
        repairPending: null,
      },
      allowed: false,
    },
    {
      label: "L03 post-closure repair accepts the pinned gate with durable pending",
      state: {
        id: "540-06-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        targetedGate: "gate green",
        revalidation: null,
        repairPending: null,
        closurePending: "generation 2 / abcdef123456",
      },
      allowCoveredDone: true,
      allowed: true,
    },
    {
      label: "L03 repair rejects a second pending repair on the closure sibling",
      state: {
        id: "540-06-L01",
        status: RESUME_TASK_STATUS.active,
        completed: null,
        targetedGate: null,
        revalidation: null,
        repairPending: "generation duplicate / token duplicate",
      },
      allowed: false,
    },
  ];
  for (const testCase of cases) {
    if (
      isTask540RepairSiblingStateAllowed(testCase.state, {
        allowCoveredDone: testCase.allowCoveredDone ?? false,
      }) !== testCase.allowed
    ) {
      throw new Error("TASK-540 L03 repair sibling self-test failed: " + testCase.label);
    }
  }
  return cases.length;
}

function assertTask540L03EffectiveRepairOwnerContract() {
  const leaf = LEAF_BY_ID.get("540-04-L03");
  const group = LEAF_STATUS_GROUPS["540-04-L03"];
  if (!leaf || !group) throw new Error("TASK-540 L03 effective repair owner is missing");
  const repairFiles = [
    "core/admin/utils/cacheBus.ts",
    "tests/vitest/admin/cacheBus.test.ts",
    "tests/integration/routes/customScreensRoutes.test.ts",
  ];
  const taskContracts = [ROOT_TASK_PATH, group.childPath, group.leafPath];
  const preClosure = effectiveRepairMutationOwner(leaf);
  const afterClosure = effectiveRepairMutationOwner(leaf, { afterClosure: true });
  const historicalConsumers = leaf.allowedFiles.filter((file) => !repairFiles.includes(file));
  const cases = [
    {
      label: "L03 pre-closure audit fixer owns only the exact three-file repair set",
      pass: JSON.stringify(preClosure.allowedFiles) === JSON.stringify(repairFiles),
    },
    {
      label: "L03 after-closure audit fixer adds only three status contracts",
      pass:
        JSON.stringify(afterClosure.allowedFiles) ===
        JSON.stringify([...repairFiles, ...taskContracts]),
    },
    {
      label: "L03 audit fixers cannot recover historical consumers or status-transition authority",
      pass:
        historicalConsumers.length > 0 &&
        historicalConsumers.every(
          (file) =>
            !preClosure.allowedFiles.includes(file) && !afterClosure.allowedFiles.includes(file)
        ) &&
        !Object.hasOwn(preClosure, "taskContractMutations") &&
        !Object.hasOwn(afterClosure, "taskContractMutations"),
    },
  ];
  for (const testCase of cases) {
    if (!testCase.pass) {
      throw new Error("TASK-540 L03 effective repair owner self-test failed: " + testCase.label);
    }
  }
  return cases.length;
}

function assertTask540L03GateIsolationContract() {
  const leaf = LEAF_BY_ID.get("540-04-L03");
  if (!leaf) throw new Error("TASK-540 L03 isolation owner is missing");
  const cases = [
    {
      id: "expandedL03Vitest",
      files: [
        "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
        "tests/vitest/ui/custom-screen-entry-draft.test.ts",
        "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx",
        "tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts",
        "tests/vitest/admin/customScreensClient.test.ts",
        "tests/vitest/admin/cacheBus.test.ts",
        "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx",
        "tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx",
        "tests/vitest/widgets/screenWidgets.test.tsx",
        "tests/vitest/ui/use-screen-related-entries.test.tsx",
        "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx",
      ],
    },
    {
      id: "l04ReadOnlyConsumerVitest",
      files: [
        "tests/vitest/ui/custom-screens-page.test.tsx",
        "tests/vitest/ui/custom-screen-route-params.test.ts",
        "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
        "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
        "tests/vitest/ui-integration/screen-editor-sections.test.tsx",
        "tests/vitest/admin/cacheBus.test.ts",
      ],
    },
    {
      id: "directImageOverrideRouteBun",
      files: ["tests/integration/routes/customScreensRoutes.test.ts"],
    },
  ];
  for (const testCase of cases) {
    const gate = leaf.commands.find(({ id }) => id === testCase.id);
    const metadata = gate?.isolationCommands ?? [];
    if (
      !gate ||
      JSON.stringify(metadata.map(({ file }) => file)) !== JSON.stringify(testCase.files) ||
      metadata.some(
        ({ file, command: isolationCommand }) =>
          isolationCommand !== isolationCommandForTestFile(file)
      )
    ) {
      throw new Error("TASK-540 L03 named-file isolation self-test failed: " + testCase.id);
    }
  }
  let duplicateRejected = false;
  try {
    namedTestFilesForCommand(
      vitestCommand(["tests/vitest/admin/cacheBus.test.ts", "tests/vitest/admin/cacheBus.test.ts"])
    );
  } catch (error) {
    duplicateRejected = error instanceof Error && error.message.includes("repeats");
  }
  if (!duplicateRejected) {
    throw new Error("TASK-540 L03 named-file isolation self-test accepted a duplicate file");
  }
  const dbPreflight = leaf.commands.find(({ id }) => id === "dbPreflight");
  if (
    !dbPreflight ||
    dbPreflight.command !== DB_PREFLIGHT ||
    (dbPreflight.isolationCommands?.length ?? 0) !== 0
  ) {
    throw new Error("TASK-540 L03 DB preflight self-test failed");
  }
  const routeGate = leaf.commands.find(({ id }) => id === "directImageOverrideRouteBun");
  if (
    !routeGate ||
    routeGate.command !== ENV + "bun test tests/integration/routes/customScreensRoutes.test.ts"
  ) {
    throw new Error("TASK-540 L03 direct-image route command self-test failed");
  }
  return cases.length + 2;
}

function readTaskMetadataField(source, field) {
  const prefix = "**" + field + ":**";
  const lines = source.split("\n").filter((candidate) => candidate.startsWith(prefix));
  if (lines.length > 1) throw new Error("TASK-540 duplicated metadata field: " + field);
  if (lines.length === 0) return null;
  const value = lines[0].slice(prefix.length).trim();
  if (!value) throw new Error("TASK-540 empty metadata field: " + field);
  return value;
}

function isCanonicalIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const IMPLEMENTATION_COMPLETE_SUFFIX =
  " — assigned work was completed; canonical `✅ Done` transition awaits family changelog 1252.";

function requireCanonicalReceiptDate(value, label) {
  if (!isCanonicalIsoDate(value) || value > RUN_DATE) {
    throw new Error(label + ": receipt date must be canonical and no later than " + RUN_DATE);
  }
  return value;
}

function requireCanonicalCompleted(value, label) {
  return requireCanonicalReceiptDate(value, label + " Completed");
}

function requireAbsentCompleted(value, label) {
  if (value !== null) throw new Error(label + ": Completed must be absent");
  return null;
}

function requireCanonicalImplementationComplete(value, label) {
  if (typeof value !== "string" || !value.endsWith(IMPLEMENTATION_COMPLETE_SUFFIX)) {
    throw new Error(label + ": Implementation Complete has a non-canonical suffix");
  }
  const date = value.slice(0, -IMPLEMENTATION_COMPLETE_SUFFIX.length);
  requireCanonicalReceiptDate(date, label + " Implementation Complete");
  if (value !== date + IMPLEMENTATION_COMPLETE_SUFFIX) {
    throw new Error(label + ": Implementation Complete is not byte-canonical");
  }
  return value;
}

function requireAbsentImplementationComplete(value, label) {
  if (value !== null) throw new Error(label + ": Implementation Complete must be absent");
  return null;
}

function preClosureRegateValue(fixStartedDate) {
  if (!isCanonicalIsoDate(fixStartedDate)) {
    throw new Error("TASK-540 pre-closure re-gate requires a canonical Fix Started date");
  }
  return "pre-closure remediation / fix-started " + fixStartedDate + " / gate green";
}

function matchingPreClosureFixStartedDate(childSource, leafSource, label) {
  const childFixStarted = readTaskMetadataField(childSource, "Fix Started");
  const leafFixStarted = readTaskMetadataField(leafSource, "Fix Started");
  if (childFixStarted === null && leafFixStarted === null) return null;
  if (
    !childFixStarted ||
    childFixStarted !== leafFixStarted ||
    !isCanonicalIsoDate(childFixStarted) ||
    childFixStarted > RUN_DATE
  ) {
    throw new Error(label + ": closure child/leaf Fix Started markers are not exact");
  }
  return childFixStarted;
}

async function readPersistedPreClosureFixStartedDate(leaf, label) {
  if (leaf.id !== "540-06-L01") return null;
  const group = LEAF_STATUS_GROUPS[leaf.id];
  if (!group) throw new Error(label + ": closure leaf status group is missing");
  const [childState, leafState] = await Promise.all([
    readCanonicalTaskStatus(group.childPath),
    readCanonicalTaskStatus(group.leafPath),
  ]);
  return matchingPreClosureFixStartedDate(childState.source, leafState.source, label);
}

const CLOSURE_GATE_FIELDS = Object.freeze(["Targeted Gate Passed", "Revalidation Passed"]);
const CLOSURE_RECEIPT_FIELDS = Object.freeze([
  "Closure Pending",
  "Closure Evidence SHA-256",
  "Closure Generation",
  "Closure Board Baseline",
  CLOSURE_CHANGELOG_PATH_FIELD,
]);

function readTaskGateReceipts(source) {
  return CLOSURE_GATE_FIELDS.flatMap((field) => {
    const value = readTaskMetadataField(source, field);
    return value ? [Object.freeze({ field, value })] : [];
  });
}

function readTaskGateReceipt(source, label) {
  const receipts = readTaskGateReceipts(source);
  if (receipts.length !== 1) {
    throw new Error(label + ": task leaf must carry exactly one gate receipt");
  }
  return receipts[0];
}

function readClosureLeafGateReceipt(source, label) {
  return readTaskGateReceipt(source, label);
}

function equalClosureGateReceipts(left, right) {
  return Boolean(left && right && left.field === right.field && left.value === right.value);
}

async function captureClosureContractReceipts() {
  return Promise.all(
    closureContractPaths().map(async (relativePath) => {
      const { source } = await readCanonicalTaskStatus(relativePath);
      return Object.freeze({
        relativePath,
        receipts: Object.freeze(
          Object.fromEntries(
            CLOSURE_RECEIPT_FIELDS.map((field) => [field, readTaskMetadataField(source, field)])
          )
        ),
        gates: Object.freeze(
          Object.fromEntries(
            CLOSURE_GATE_FIELDS.map((field) => [field, readTaskMetadataField(source, field)])
          )
        ),
      });
    })
  );
}

async function verifyClosureContractReceipts(before, label, { allowGateChange = false } = {}) {
  const after = await captureClosureContractReceipts();
  for (let index = 0; index < before.length; index += 1) {
    const gateMayChange =
      allowGateChange && before[index].relativePath === LEAF_STATUS_GROUPS["540-06-L01"].leafPath;
    if (
      before[index].relativePath !== after[index].relativePath ||
      JSON.stringify(before[index].receipts) !== JSON.stringify(after[index].receipts) ||
      (!gateMayChange && JSON.stringify(before[index].gates) !== JSON.stringify(after[index].gates))
    ) {
      throw new Error(
        label + ": closure receipt projection changed at " + before[index].relativePath
      );
    }
  }
}

function readTaskBoardStats(source) {
  const read = (label) => {
    const matches = [
      ...source.matchAll(new RegExp("^- \\*\\*" + label + ":\\*\\* (\\d+) tasks$", "gm")),
    ];
    if (matches.length !== 1) {
      throw new Error("TASK-540 board statistic missing or duplicated: " + label);
    }
    const value = Number(matches[0][1]);
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error("TASK-540 board statistic is invalid: " + label);
    }
    return value;
  };
  return Object.freeze({
    toDo: read("To Do"),
    inProgress: read("In Progress"),
    done: read("Done"),
  });
}

const TASK_540_BOARD_BUCKET_MARKERS = Object.freeze({
  toDo: "⏳ To Do",
  inProgress: "🚧 In progress",
  done: "✅ Done",
});

function requireTask540BoardNotesMarker(notes, bucket, label) {
  const marker = TASK_540_BOARD_BUCKET_MARKERS[bucket];
  if (!marker || (notes !== marker && !notes.startsWith(marker + " "))) {
    throw new Error(label + ": Notes must start with exact bucket marker " + marker);
  }
  return marker;
}

function readTask540BoardState(source) {
  const rows = [...source.matchAll(/^\| TASK-540 \|.*$/gm)];
  if (rows.length !== 1) throw new Error("TASK-540 board row is missing or duplicated");
  const row = rows[0][0];
  const cells = row
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
  if (cells.length !== 5 || cells[0] !== "TASK-540") {
    throw new Error("TASK-540 board row must contain exactly five canonical cells");
  }
  const rowIndex = rows[0].index ?? -1;
  const headingIndex = (heading) => {
    const matches = [...source.matchAll(new RegExp("^## " + heading + "$", "gm"))];
    if (matches.length !== 1) {
      throw new Error("TASK-540 board heading is missing or duplicated: " + heading);
    }
    return matches[0].index ?? -1;
  };
  const toDoStart = headingIndex("To Do");
  const inProgressStart = headingIndex("In Progress");
  const doneStart = headingIndex("Done");
  if (!(toDoStart < inProgressStart && inProgressStart < doneStart)) {
    throw new Error("TASK-540 board headings are not in canonical order");
  }
  const bucket =
    rowIndex > toDoStart && rowIndex < inProgressStart
      ? "toDo"
      : rowIndex > inProgressStart && rowIndex < doneStart
        ? "inProgress"
        : rowIndex > doneStart
          ? "done"
          : null;
  if (!bucket) throw new Error("TASK-540 board row is outside a canonical bucket");
  const notes = cells[4];
  requireTask540BoardNotesMarker(notes, bucket, "TASK-540 board row");
  return Object.freeze({
    bucket,
    row,
    cells: Object.freeze(cells),
    notes,
    stats: readTaskBoardStats(source),
  });
}

function formatClosureBoardBaseline(stats) {
  return "toDo " + stats.toDo + " / inProgress " + stats.inProgress + " / done " + stats.done;
}

function parseClosureBoardBaseline(value, label) {
  const match = value?.match(/^toDo (\d+) \/ inProgress (\d+) \/ done (\d+)$/);
  if (!match) throw new Error(label + ": malformed Closure Board Baseline");
  const stats = { toDo: Number(match[1]), inProgress: Number(match[2]), done: Number(match[3]) };
  if (Object.values(stats).some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error(label + ": invalid Closure Board Baseline");
  }
  return Object.freeze(stats);
}

function closedBoardStatsFromBaseline(baseline, label) {
  if (baseline.inProgress < 1) {
    throw new Error(label + ": Closure Board Baseline has no active TASK-540 row");
  }
  return Object.freeze({
    toDo: baseline.toDo,
    inProgress: baseline.inProgress - 1,
    done: baseline.done + 1,
  });
}

function parsePositiveClosureGeneration(value, label) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw new Error(label + ": malformed closure generation");
  }
  const generation = Number(value);
  if (!Number.isSafeInteger(generation)) {
    throw new Error(label + ": unsafe closure generation");
  }
  return generation;
}

function parseClosurePending(value, label) {
  const match = value?.match(/^generation ([1-9]\d*) \/ ([0-9a-f]{12})$/);
  if (!match) throw new Error(label + ": malformed Closure Pending receipt");
  return Object.freeze({
    value,
    generation: parsePositiveClosureGeneration(match[1], label),
    token: match[2],
  });
}

function parseRepairPending(value, label) {
  const match = value?.match(/^generation ([0-9a-f]{32}) \/ token ([0-9a-f]{32})$/);
  if (!match) throw new Error(label + ": malformed Repair Pending receipt");
  return Object.freeze({ value, generation: match[1], token: match[2] });
}

function repairGateValue(repairPending) {
  parseRepairPending(repairPending, "TASK-540 repair gate");
  return repairPending + " / gate green";
}

function repairPendingFromGateValue(value, label) {
  const suffix = " / gate green";
  if (typeof value !== "string" || !value.endsWith(suffix)) {
    throw new Error(label + ": repaired gate value has no exact pending receipt");
  }
  const repairPending = value.slice(0, -suffix.length);
  parseRepairPending(repairPending, label);
  if (repairGateValue(repairPending) !== value) {
    throw new Error(label + ": repaired gate value is not canonical");
  }
  return repairPending;
}

function closureContractPaths() {
  return [
    ROOT_TASK_PATH,
    LEAF_STATUS_GROUPS["540-06-L01"].childPath,
    LEAF_STATUS_GROUPS["540-06-L01"].leafPath,
  ];
}

async function readSharedClosurePending({ required = false, allowMissingGate = false } = {}) {
  const states = await Promise.all(closureContractPaths().map(readCanonicalTaskStatus));
  const pendingValues = states.map(({ source }) =>
    readTaskMetadataField(source, "Closure Pending")
  );
  const boardBaselineValues = states.map(({ source }) =>
    readTaskMetadataField(source, "Closure Board Baseline")
  );
  const changelogPathValues = states.map(({ source }) =>
    readTaskMetadataField(source, CLOSURE_CHANGELOG_PATH_FIELD)
  );
  const evidenceValues = states.map(({ source }) =>
    readTaskMetadataField(source, "Closure Evidence SHA-256")
  );
  const receiptGenerationValues = states.map(({ source }) =>
    readTaskMetadataField(source, "Closure Generation")
  );
  const repairPendingValues = states.map(({ source }) =>
    readTaskMetadataField(source, "Repair Pending")
  );
  const parentGateValues = states
    .slice(0, 2)
    .flatMap(({ source }) =>
      CLOSURE_GATE_FIELDS.map((field) => readTaskMetadataField(source, field))
    );
  if (repairPendingValues[0] || repairPendingValues[1] || parentGateValues.some(Boolean)) {
    throw new Error("TASK-540 closure root/parent retained leaf-only repair or gate evidence");
  }
  for (let index = 0; index < states.length; index += 1) {
    const completed = readTaskMetadataField(states[index].source, "Completed");
    if (states[index].status === RESUME_TASK_STATUS.done) {
      requireCanonicalCompleted(completed, "TASK-540 shared closure contract " + index);
    } else {
      requireAbsentCompleted(completed, "TASK-540 shared closure contract " + index);
    }
  }
  requireAbsentImplementationComplete(
    readTaskMetadataField(states[0].source, "Implementation Complete"),
    "TASK-540 shared closure root"
  );
  const closureLeafGateCount = readTaskGateReceipts(states[2].source).length;
  const closureImplementationExpected = closureLeafGateCount === 1 && !repairPendingValues[2];
  for (const index of [1, 2]) {
    const value = readTaskMetadataField(states[index].source, "Implementation Complete");
    if (closureImplementationExpected) {
      requireCanonicalImplementationComplete(value, "TASK-540 shared closure contract " + index);
    } else {
      requireAbsentImplementationComplete(value, "TASK-540 shared closure contract " + index);
    }
  }
  if (pendingValues.every((value) => value === null)) {
    if (
      evidenceValues.some((value) => value !== null) ||
      receiptGenerationValues.some((value) => value !== null) ||
      boardBaselineValues.some((value) => value !== null) ||
      changelogPathValues.some((value) => value !== null)
    ) {
      throw new Error("TASK-540 closure-only receipt exists without a pending closure");
    }
    const closureLeafRepairPending = repairPendingValues[2];
    const closureLeafHasGate = CLOSURE_GATE_FIELDS.some((field) =>
      readTaskMetadataField(states[2].source, field)
    );
    if (closureLeafRepairPending) {
      parseRepairPending(closureLeafRepairPending, "TASK-540 pre-pending closure repair");
      if (
        !allowMissingGate ||
        closureLeafHasGate ||
        states.some(({ status }) => status !== RESUME_TASK_STATUS.active)
      ) {
        throw new Error("TASK-540 invalid Repair Pending state without Closure Pending");
      }
    }
    if (required) throw new Error("TASK-540 closure restart is missing Closure Pending");
    return null;
  }
  if (
    states.some(({ status }) => status !== RESUME_TASK_STATUS.active) ||
    !pendingValues[0] ||
    !pendingValues.every((value) => value === pendingValues[0]) ||
    !boardBaselineValues[0] ||
    !boardBaselineValues.every((value) => value === boardBaselineValues[0]) ||
    !changelogPathValues[0] ||
    !changelogPathValues.every((value) => value === changelogPathValues[0])
  ) {
    throw new Error("TASK-540 closure contracts have mismatched pending state");
  }
  const evidenceAbsent = evidenceValues.every((value) => value === null);
  const generationsAbsent = receiptGenerationValues.every((value) => value === null);
  if (evidenceAbsent !== generationsAbsent) {
    throw new Error("TASK-540 pending evidence/generation receipts are only partially absent");
  }
  if (
    !evidenceAbsent &&
    (!/^[0-9a-f]{64}$/.test(evidenceValues[0]) ||
      !evidenceValues.every((value) => value === evidenceValues[0]) ||
      !receiptGenerationValues.every((value) => value === receiptGenerationValues[0]))
  ) {
    throw new Error("TASK-540 pending evidence/generation receipts are mismatched");
  }
  const priorGeneration = evidenceAbsent
    ? null
    : parsePositiveClosureGeneration(
        receiptGenerationValues[0],
        "TASK-540 pending prior generation"
      );
  const boardBaseline = parseClosureBoardBaseline(
    boardBaselineValues[0],
    "TASK-540 closure restart"
  );
  const changelogPath = requireSafeTask540ChangelogPath(
    changelogPathValues[0],
    "TASK-540 closure restart"
  );
  if (changelogPath !== CHANGELOG_REL) {
    throw new Error("TASK-540 closure restart path differs from the startup path pin");
  }
  const boardState = readTask540BoardState(await readFile(TASKS + "/README.md", "utf8"));
  if (
    boardState.bucket !== "inProgress" ||
    JSON.stringify(boardState.stats) !== JSON.stringify(boardBaseline)
  ) {
    throw new Error("TASK-540 pending closure board does not match its pinned baseline");
  }
  const pending = parseClosurePending(pendingValues[0], "TASK-540 closure restart");
  const closureLeafRepairPending = repairPendingValues[2];
  const hasGateReceipt = CLOSURE_GATE_FIELDS.some((field) =>
    readTaskMetadataField(states[2].source, field)
  );
  if (closureLeafRepairPending && hasGateReceipt) {
    throw new Error("TASK-540 closure leaf retained both Repair Pending and a gate receipt");
  }
  if (!hasGateReceipt && (!allowMissingGate || !closureLeafRepairPending)) {
    throw new Error("TASK-540 closure restart lost its closure leaf gate receipt");
  }
  const gateReceipt = hasGateReceipt
    ? readClosureLeafGateReceipt(states[2].source, "TASK-540 closure restart")
    : null;
  return Object.freeze({
    ...pending,
    boardBaseline: boardBaselineValues[0],
    changelogPath,
    gateReceipt,
    priorEvidenceHash: evidenceValues[0],
    priorGeneration,
  });
}

async function requireTask540ChangelogIndex() {
  const changelogIndex = await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8");
  parseClosureAnchor(changelogIndex, "TASK-540 changelog index", { required: true });
  requireTask540NeighborReservations(changelogIndex, "TASK-540 changelog index");
  const indexRows = [...changelogIndex.matchAll(/^\| 1252 \|.*$/gm)];
  const rows1253 = [...changelogIndex.matchAll(/^\| 1253 \|.*$/gm)];
  const row1252 = indexRows[0]?.index ?? -1;
  const rows1250 = [...changelogIndex.matchAll(/^\| 1250 \|.*$/gm)];
  const row1253 = rows1253[0]?.index ?? -1;
  const row1250 = rows1250[0]?.index ?? -1;
  const filename = CHANGELOG_REL.split("/").at(-1) ?? "";
  const filenameDate = filename.match(/^1252-(\d{4}-\d{2}-\d{2})-/)?.[1] ?? null;
  const cells =
    indexRows.length === 1
      ? indexRows[0][0]
          .slice(1, -1)
          .split("|")
          .map((cell) => cell.trim())
      : [];
  const prose = changelogIndex.slice(0, changelogIndex.indexOf("| No. |"));
  const staleReservation = prose
    .replace(/\s+/g, " ")
    .split(/[.!?](?:\s|$)/)
    .some(
      (sentence) =>
        /\b1252\b/.test(sentence) && /\b(?:reserved|reservation|reservations)\b/i.test(sentence)
    );
  if (
    indexRows.length !== 1 ||
    !filenameDate ||
    cells.length !== 4 ||
    cells[0] !== "1252" ||
    cells[1] !== filenameDate ||
    !cells[2].startsWith(CHANGELOG_TITLE_PREFIX + " —") ||
    cells[3] !== CHANGELOG_TYPE ||
    !prose.includes("Changelog 1252 is consumed by the completed TASK-540 family.") ||
    staleReservation ||
    rows1253.length !== 1 ||
    rows1250.length !== 1 ||
    row1253 < 0 ||
    row1250 < 0 ||
    !(row1253 < row1252 && row1252 < row1250)
  ) {
    throw new Error("TASK-540 changelog index row is missing, duplicated, or misordered");
  }
  const changelogSource = await readFile(ROOT + "/" + CHANGELOG_REL, "utf8");
  const h1Lines = changelogSource.match(/^# 1252 - .*$/gm) ?? [];
  const dateLines = [...changelogSource.matchAll(/^Date:\s*(.+)$/gm)].map((match) => match[1]);
  const versionLines = [...changelogSource.matchAll(/^Version:\s*(.+)$/gm)].map(
    (match) => match[1]
  );
  const taskLines = changelogSource.match(/^Tasks:.*$/gm) ?? [];
  const expectedTaskIds = CHANGELOG_TASKS_LINE.slice("Tasks: ".length).split(", ");
  const actualTaskIds =
    taskLines.length === 1
      ? taskLines[0]
          .slice("Tasks:".length)
          .split(",")
          .map((taskId) => taskId.trim())
      : [];
  const hasExactUniqueOrderedTaskIds =
    new Set(expectedTaskIds).size === expectedTaskIds.length &&
    new Set(actualTaskIds).size === actualTaskIds.length &&
    actualTaskIds.length === expectedTaskIds.length &&
    actualTaskIds.every((taskId, index) => taskId === expectedTaskIds[index]);
  if (
    !changelogSource.startsWith("# 1252 - " + CHANGELOG_TITLE_PREFIX + "\n") ||
    h1Lines.length !== 1 ||
    dateLines.length !== 1 ||
    dateLines[0] !== filenameDate ||
    versionLines.length !== 1 ||
    versionLines[0] !== "Unreleased" ||
    taskLines.length !== 1 ||
    taskLines[0] !== CHANGELOG_TASKS_LINE ||
    !hasExactUniqueOrderedTaskIds
  ) {
    throw new Error("TASK-540 changelog metadata does not match its pinned file/index contract");
  }
  return indexRows[0][0];
}

async function validateTerminalResumeState() {
  const leafPathSet = new Set(LEAF_TASK_PATHS);
  const childPathSet = new Set(CHILD_TASK_PATHS);
  const taskStates = await Promise.all(
    TASK_PATHS.map(async (relativePath) => ({
      relativePath,
      ...(await readCanonicalTaskStatus(relativePath)),
    }))
  );
  for (const state of taskStates) {
    const completed = readTaskMetadataField(state.source, "Completed");
    const implementationComplete = readTaskMetadataField(state.source, "Implementation Complete");
    if (state.status !== RESUME_TASK_STATUS.done) {
      throw new Error("TASK-540 terminal restart found an open contract: " + state.relativePath);
    }
    requireCanonicalCompleted(completed, "TASK-540 terminal " + state.relativePath);
    if (leafPathSet.has(state.relativePath) || childPathSet.has(state.relativePath)) {
      requireCanonicalImplementationComplete(
        implementationComplete,
        "TASK-540 terminal " + state.relativePath
      );
    } else {
      requireAbsentImplementationComplete(
        implementationComplete,
        "TASK-540 terminal " + state.relativePath
      );
    }
    const gateReceipts = readTaskGateReceipts(state.source);
    if (leafPathSet.has(state.relativePath)) {
      if (gateReceipts.length !== 1 || readTaskMetadataField(state.source, "Repair Pending")) {
        throw new Error(
          "TASK-540 terminal leaf lacks its unique landed receipt: " + state.relativePath
        );
      }
    } else if (gateReceipts.length !== 0 || readTaskMetadataField(state.source, "Repair Pending")) {
      throw new Error(
        "TASK-540 terminal non-leaf retained leaf-only evidence: " + state.relativePath
      );
    }
  }

  const closurePathSet = new Set(closureContractPaths());
  const closureStates = taskStates.filter(({ relativePath }) => closurePathSet.has(relativePath));
  const closureLeafState = closureStates.find(
    ({ relativePath }) => relativePath === LEAF_STATUS_GROUPS["540-06-L01"].leafPath
  );
  if (!closureLeafState) {
    throw new Error("TASK-540 terminal closure leaf is missing its gate receipt");
  }
  const gateReceipt = readClosureLeafGateReceipt(
    closureLeafState.source,
    "TASK-540 terminal restart"
  );
  const evidenceHashes = closureStates.map(({ source }) =>
    readTaskMetadataField(source, "Closure Evidence SHA-256")
  );
  const generationValues = closureStates.map(({ source }) =>
    readTaskMetadataField(source, "Closure Generation")
  );
  const boardBaselineValues = closureStates.map(({ source }) =>
    readTaskMetadataField(source, "Closure Board Baseline")
  );
  const changelogPathValues = closureStates.map(({ source }) =>
    readTaskMetadataField(source, CLOSURE_CHANGELOG_PATH_FIELD)
  );
  if (
    !evidenceHashes[0]?.match(/^[0-9a-f]{64}$/) ||
    !evidenceHashes.every((value) => value === evidenceHashes[0]) ||
    !generationValues[0] ||
    !generationValues.every((value) => value === generationValues[0]) ||
    !boardBaselineValues[0] ||
    !boardBaselineValues.every((value) => value === boardBaselineValues[0]) ||
    !changelogPathValues[0] ||
    !changelogPathValues.every((value) => value === changelogPathValues[0]) ||
    requireSafeTask540ChangelogPath(changelogPathValues[0], "TASK-540 terminal restart") !==
      CHANGELOG_REL ||
    closureStates.some(({ source }) => readTaskMetadataField(source, "Closure Pending"))
  ) {
    throw new Error("TASK-540 terminal restart has invalid shared closure evidence");
  }
  for (const state of taskStates.filter(({ relativePath }) => !closurePathSet.has(relativePath))) {
    if (
      [
        "Closure Pending",
        "Closure Evidence SHA-256",
        "Closure Generation",
        "Closure Board Baseline",
        CLOSURE_CHANGELOG_PATH_FIELD,
      ].some((field) => readTaskMetadataField(state.source, field))
    ) {
      throw new Error(
        "TASK-540 terminal source descendant has closure-only evidence: " + state.relativePath
      );
    }
  }

  const terminalGeneration = parsePositiveClosureGeneration(
    generationValues[0],
    "TASK-540 terminal restart"
  );
  const anchor = await readClosureAnchor({ required: true, label: "TASK-540 terminal restart" });
  const closureControl = anchor.closureControl;
  if (
    anchor.evidenceSha256 !== evidenceHashes[0] ||
    anchor.repairAuthorization !== null ||
    closureControl.generation !== terminalGeneration ||
    closureControl.boardBaseline !== boardBaselineValues[0] ||
    closureControl.changelogPath !== changelogPathValues[0] ||
    closureControl.gateReceipt.field !== gateReceipt.field ||
    closureControl.gateReceipt.valueSha256 !== closureGateValueHash(gateReceipt)
  ) {
    throw new Error("TASK-540 terminal closureControl does not match task receipts");
  }
  const boardSource = await readFile(TASKS + "/README.md", "utf8");
  const boardState = readTask540BoardState(boardSource);
  requireBoardRowMarker(boardState, "TASK-540 terminal restart");
  const boardBaseline = parseClosureBoardBaseline(
    boardBaselineValues[0],
    "TASK-540 terminal restart"
  );
  const expectedClosedStats = closedBoardStatsFromBaseline(
    boardBaseline,
    "TASK-540 terminal restart"
  );
  if (
    boardState.bucket !== "done" ||
    JSON.stringify(boardState.stats) !== JSON.stringify(expectedClosedStats)
  ) {
    throw new Error("TASK-540 terminal board row/statistics do not match the closure baseline");
  }
  let changelogValid = false;
  if (EXISTING_CHANGELOG_REL === CHANGELOG_REL) {
    try {
      const source = await readFile(ROOT + "/" + CHANGELOG_REL, "utf8");
      const start = source.indexOf(EVIDENCE_BEGIN);
      const end = source.indexOf(EVIDENCE_END, start + EVIDENCE_BEGIN.length);
      const block =
        start >= 0 && end >= 0 ? source.slice(start, end + EVIDENCE_END.length) : "<missing>";
      changelogValid =
        source.split(EVIDENCE_BEGIN).length - 1 === 1 &&
        source.split(EVIDENCE_END).length - 1 === 1 &&
        createHash("sha256").update(block).digest("hex") === anchor.evidenceSha256 &&
        JSON.stringify(parseClosureControlFromEvidenceBlock(block, "TASK-540 terminal draft")) ===
          JSON.stringify(closureControl);
      if (changelogValid) await requireTask540ChangelogIndex();
    } catch {
      changelogValid = false;
    }
  }
  return Object.freeze({
    path: CHANGELOG_REL,
    evidenceHash: anchor.evidenceSha256,
    generation: terminalGeneration,
    boardBaseline: boardBaselineValues[0],
    changelogPath: changelogPathValues[0],
    gateReceipt,
    closureControl,
    anchor,
    changelogNeedsRecovery: !changelogValid,
  });
}

async function resolveLeafResumeState() {
  if ((await hashPath(HISTORICAL_FIX_WORKFLOW_REL)) === "<missing>") {
    throw new Error("TASK-540 historical corrective workflow evidence is missing");
  }

  const rootState = await readCanonicalTaskStatus(ROOT_TASK_PATH);
  const terminalCandidate = rootState.status === RESUME_TASK_STATUS.done;
  if (!terminalCandidate && rootState.status !== RESUME_TASK_STATUS.active) {
    throw new Error("TASK-540 resumable workflow requires the root In Progress or terminal Done");
  }
  const rootCompleted = readTaskMetadataField(rootState.source, "Completed");
  const rootImplementationComplete = readTaskMetadataField(
    rootState.source,
    "Implementation Complete"
  );
  if (terminalCandidate) {
    requireCanonicalCompleted(rootCompleted, "TASK-540 terminal root");
  } else {
    requireAbsentCompleted(rootCompleted, "TASK-540 active root");
  }
  requireAbsentImplementationComplete(rootImplementationComplete, "TASK-540 root");

  const leafPathSet = new Set(LEAVES.map((leaf) => LEAF_STATUS_GROUPS[leaf.id].leafPath));
  const allContractStates = await Promise.all(
    TASK_PATHS.map(async (relativePath) => ({
      relativePath,
      ...(relativePath === ROOT_TASK_PATH
        ? rootState
        : await readCanonicalTaskStatus(relativePath)),
    }))
  );
  for (const state of allContractStates) {
    const repairPending = readTaskMetadataField(state.source, "Repair Pending");
    if (repairPending && !leafPathSet.has(state.relativePath)) {
      throw new Error("TASK-540 Repair Pending escaped its single leaf owner");
    }
    if (terminalCandidate && repairPending) {
      throw new Error("TASK-540 terminal graph retained Repair Pending");
    }
  }
  for (const relativePath of [ROOT_TASK_PATH, LEAF_STATUS_GROUPS["540-06-L01"].childPath]) {
    const state = allContractStates.find((candidate) => candidate.relativePath === relativePath);
    if (CLOSURE_GATE_FIELDS.some((field) => readTaskMetadataField(state.source, field))) {
      throw new Error("TASK-540 root/closure parent retained a leaf-only gate receipt");
    }
  }

  const leafStates = [];
  for (const leaf of LEAVES) {
    const group = LEAF_STATUS_GROUPS[leaf.id];
    const state = await readCanonicalTaskStatus(group.leafPath);
    if (!Object.values(RESUME_TASK_STATUS).includes(state.status)) {
      throw new Error("TASK-" + leaf.id + ": non-resumable status " + state.status);
    }

    const completed = readTaskMetadataField(state.source, "Completed");
    const implementationComplete = readTaskMetadataField(state.source, "Implementation Complete");
    const targetedGate = readTaskMetadataField(state.source, "Targeted Gate Passed");
    const revalidation = readTaskMetadataField(state.source, "Revalidation Passed");
    const repairPending = readTaskMetadataField(state.source, "Repair Pending");
    const closurePending = readTaskMetadataField(state.source, "Closure Pending");
    if (repairPending) parseRepairPending(repairPending, "TASK-" + leaf.id);
    if (targetedGate && revalidation) {
      throw new Error("TASK-" + leaf.id + ": multiple current gate receipts");
    }
    if (state.status === RESUME_TASK_STATUS.done) {
      requireCanonicalCompleted(completed, "TASK-" + leaf.id);
    } else {
      requireAbsentCompleted(completed, "TASK-" + leaf.id);
    }
    if (state.status === RESUME_TASK_STATUS.done && repairPending) {
      throw new Error("TASK-" + leaf.id + ": Done with a pending repair");
    }
    const landed =
      state.status === RESUME_TASK_STATUS.done ||
      (state.status === RESUME_TASK_STATUS.active &&
        !repairPending &&
        Boolean(targetedGate || revalidation));
    if (landed) {
      requireCanonicalImplementationComplete(implementationComplete, "TASK-" + leaf.id);
    } else {
      requireAbsentImplementationComplete(implementationComplete, "TASK-" + leaf.id);
    }
    leafStates.push({
      id: leaf.id,
      status: state.status,
      landed,
      completed,
      implementationComplete,
      targetedGate,
      revalidation,
      repairPending,
      closurePending,
      evidence:
        state.status === RESUME_TASK_STATUS.done
          ? "Completed: " + completed
          : targetedGate
            ? "Targeted Gate Passed: " + targetedGate
            : revalidation
              ? "Revalidation Passed: " + revalidation
              : null,
      source: state.source,
    });
  }

  const pendingRepairs = leafStates.filter(({ repairPending }) => repairPending);
  if (pendingRepairs.length > 1) {
    throw new Error("TASK-540 resumable workflow found multiple pending repair owners");
  }
  const repairState = pendingRepairs[0] ?? null;
  let mode = terminalCandidate ? "terminal" : "initial";
  let startIndex = null;
  if (terminalCandidate) {
    if (repairState || leafStates.some(({ status }) => status !== RESUME_TASK_STATUS.done)) {
      throw new Error("TASK-540 terminal restart requires every leaf Done without pending repair");
    }
    startIndex = leafStates.length;
  } else if (repairState) {
    mode = "repair";
    if (
      repairState.status !== RESUME_TASK_STATUS.active ||
      repairState.completed ||
      repairState.targetedGate ||
      repairState.revalidation
    ) {
      throw new Error("TASK-" + repairState.id + ": invalid pending repair receipts");
    }
    for (const state of leafStates) {
      if (state.id === repairState.id) continue;
      if (
        !isTask540RepairSiblingStateAllowed(state, {
          allowCoveredDone: true,
        })
      ) {
        throw new Error("TASK-" + state.id + ": invalid sibling state during repair resume");
      }
    }
  } else {
    const firstUnlandedIndex = leafStates.findIndex((state) => !state.landed);
    startIndex = firstUnlandedIndex === -1 ? leafStates.length : firstUnlandedIndex;
    for (let index = 0; index < leafStates.length; index += 1) {
      const state = leafStates[index];
      if (index < startIndex && !state.landed) {
        throw new Error("TASK-" + state.id + ": missing landed evidence before resume cursor");
      }
      if (index > startIndex && state.status !== RESUME_TASK_STATUS.todo) {
        throw new Error(
          "TASK-" +
            state.id +
            ": later leaf was started or landed before TASK-" +
            leafStates[startIndex].id
        );
      }
    }
  }

  const childIds = [...new Set(LEAVES.map((leaf) => LEAF_STATUS_GROUPS[leaf.id].childId))];
  for (const childId of childIds) {
    const childLeaves = leafStates.filter(
      (state) => LEAF_STATUS_GROUPS[state.id].childId === childId
    );
    const group = LEAF_STATUS_GROUPS[childLeaves[0].id];
    const childState = await readCanonicalTaskStatus(group.childPath);
    const expectedChildStatus = childLeaves.every(
      (state) => state.status === RESUME_TASK_STATUS.done
    )
      ? RESUME_TASK_STATUS.done
      : childLeaves.every((state) => state.status === RESUME_TASK_STATUS.todo)
        ? RESUME_TASK_STATUS.todo
        : RESUME_TASK_STATUS.active;
    if (childState.status !== expectedChildStatus) {
      throw new Error(
        "TASK-" + childId + ": expected " + expectedChildStatus + ", got " + childState.status
      );
    }
    const childCompleted = readTaskMetadataField(childState.source, "Completed");
    const childImplementationComplete = readTaskMetadataField(
      childState.source,
      "Implementation Complete"
    );
    if (expectedChildStatus === RESUME_TASK_STATUS.done) {
      requireCanonicalCompleted(childCompleted, "TASK-" + childId);
    } else {
      requireAbsentCompleted(childCompleted, "TASK-" + childId);
    }
    if (childLeaves.every(({ landed }) => landed)) {
      requireCanonicalImplementationComplete(childImplementationComplete, "TASK-" + childId);
    } else {
      requireAbsentImplementationComplete(childImplementationComplete, "TASK-" + childId);
    }
    for (const leafState of childLeaves) {
      requireTableStatus(
        childState.source,
        leafState.id,
        leafState.status,
        "TASK-540 resumable child"
      );
    }
    requireTableStatus(rootState.source, childId, expectedChildStatus, "TASK-540 resumable root");
  }

  const boardState = readTask540BoardState(await readFile(TASKS + "/README.md", "utf8"));
  const expectedBoardBucket = terminalCandidate ? "done" : "inProgress";
  if (boardState.bucket !== expectedBoardBucket) {
    throw new Error("TASK-540 resumable workflow requires board bucket " + expectedBoardBucket);
  }
  const terminal = terminalCandidate ? await validateTerminalResumeState() : null;

  return Object.freeze({
    mode,
    startIndex,
    startLeafId: repairState?.id ?? LEAVES[startIndex]?.id ?? null,
    repair: repairState
      ? Object.freeze({ id: repairState.id, pending: repairState.repairPending })
      : null,
    terminal,
    landedLeafIds: Object.freeze(leafStates.filter(({ landed }) => landed).map(({ id }) => id)),
    remainingLeafIds: Object.freeze(
      repairState ? [repairState.id] : leafStates.slice(startIndex).map(({ id }) => id)
    ),
    leafStates: Object.freeze(
      leafStates.map(
        ({
          id,
          status,
          landed,
          completed,
          implementationComplete,
          targetedGate,
          revalidation,
          repairPending,
          closurePending,
          evidence,
        }) =>
          Object.freeze({
            id,
            status,
            landed,
            completed,
            implementationComplete,
            targetedGate,
            revalidation,
            repairPending,
            closurePending,
            evidence,
          })
      )
    ),
  });
}

async function resolveChangelogResumeState(resumeState) {
  if (resumeState.mode === "terminal") {
    if (!resumeState.terminal || resumeState.terminal.path !== CHANGELOG_REL) {
      throw new Error("TASK-540 terminal resume lost its validated changelog state");
    }
    return Object.freeze({
      mode: "terminal-reopen",
      path: resumeState.terminal.path,
      closurePending: null,
      generation: resumeState.terminal.generation,
      evidenceHash: resumeState.terminal.evidenceHash,
      boardBaseline: resumeState.terminal.boardBaseline,
      changelogPath: resumeState.terminal.changelogPath,
      gateReceipt: resumeState.terminal.gateReceipt,
      closureControl: resumeState.terminal.closureControl,
      anchor: resumeState.terminal.anchor,
      changelogNeedsRecovery: resumeState.terminal.changelogNeedsRecovery,
    });
  }
  const allowMissingGate = resumeState.mode === "repair" && resumeState.repair?.id === "540-06-L01";
  const sharedPending = await readSharedClosurePending({ allowMissingGate });
  const indexState = classifyClosureEvidenceIndex(
    await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8"),
    "TASK-540 closure restart"
  );
  const anchor = indexState.anchor;
  if ((sharedPending || allowMissingGate) && !anchor) {
    throw new Error("TASK-540 closure restart requires a canonical consumed anchor");
  }
  if (!sharedPending) {
    if (!anchor) {
      const closureGroup = LEAF_STATUS_GROUPS["540-06-L01"];
      const [childState, leafState] = await Promise.all([
        readCanonicalTaskStatus(closureGroup.childPath),
        readCanonicalTaskStatus(closureGroup.leafPath),
      ]);
      const childFixStarted = readTaskMetadataField(childState.source, "Fix Started");
      const leafFixStarted = readTaskMetadataField(leafState.source, "Fix Started");
      let reservedMode = EXISTING_CHANGELOG_REL ? "overwrite-draft" : "reserved";
      if (childFixStarted || leafFixStarted) {
        const fixStartedDate = matchingPreClosureFixStartedDate(
          childState.source,
          leafState.source,
          "TASK-540 reserved pre-closure remediation restart"
        );
        const gateReceipts = CLOSURE_GATE_FIELDS.flatMap((field) => {
          const value = readTaskMetadataField(leafState.source, field);
          return value ? [Object.freeze({ field, value })] : [];
        });
        const exactClosureCursorRestart =
          gateReceipts.length === 0 &&
          resumeState.mode === "initial" &&
          resumeState.startIndex === LEAVES.length - 1 &&
          resumeState.startLeafId === "540-06-L01" &&
          JSON.stringify(resumeState.remainingLeafIds) === JSON.stringify(["540-06-L01"]);
        const exactEarlierRepairRestart =
          gateReceipts.length === 0 &&
          resumeState.mode === "repair" &&
          Boolean(resumeState.repair?.id) &&
          resumeState.repair.id !== "540-06-L01" &&
          resumeState.startLeafId === resumeState.repair.id &&
          JSON.stringify(resumeState.remainingLeafIds) === JSON.stringify([resumeState.repair.id]);
        const exactUngatedRestart = exactClosureCursorRestart || exactEarlierRepairRestart;
        const exactRegatedContinuation =
          gateReceipts.length === 1 &&
          gateReceipts[0].field === "Revalidation Passed" &&
          gateReceipts[0].value === preClosureRegateValue(fixStartedDate) &&
          resumeState.mode === "initial" &&
          resumeState.startIndex === LEAVES.length &&
          resumeState.startLeafId === null &&
          resumeState.remainingLeafIds.length === 0;
        if (EXISTING_CHANGELOG_REL || (!exactUngatedRestart && !exactRegatedContinuation)) {
          throw new Error("TASK-540 reserved pre-closure remediation state is not exact");
        }
        reservedMode = exactUngatedRestart
          ? "reserved-pre-closure-ungated"
          : "reserved-pre-closure-regated";
      }
      if (EXISTING_CHANGELOG_REL && resumeState.startIndex !== LEAVES.length) {
        throw new Error("TASK-540 pre-pending changelog draft appeared before all leaves landed");
      }
      return Object.freeze({
        mode: reservedMode,
        path: CHANGELOG_REL,
        closurePending: null,
        generation: 0,
        evidenceHash: null,
        boardBaseline: null,
        changelogPath: null,
        gateReceipt: null,
        closureControl: null,
        anchor: null,
        changelogNeedsRecovery: Boolean(EXISTING_CHANGELOG_REL),
      });
    }
    const closureGroup = LEAF_STATUS_GROUPS["540-06-L01"];
    const [rootState, childState, leafState, boardSource] = await Promise.all([
      readCanonicalTaskStatus(ROOT_TASK_PATH),
      readCanonicalTaskStatus(closureGroup.childPath),
      readCanonicalTaskStatus(closureGroup.leafPath),
      readFile(TASKS + "/README.md", "utf8"),
    ]);
    const boardState = readTask540BoardState(boardSource);
    const gateReceipts = CLOSURE_GATE_FIELDS.flatMap((field) => {
      const value = readTaskMetadataField(leafState.source, field);
      return value ? [Object.freeze({ field, value })] : [];
    });
    if (gateReceipts.length > 1) {
      throw new Error("TASK-540 evidence-before-pending leaf has duplicate gate authority");
    }
    const gateReceipt = gateReceipts[0] ?? null;
    const boardBaseline = formatClosureBoardBaseline(boardState.stats);
    const closureControl = anchor.closureControl;
    const activeClosureGraph = [rootState, childState, leafState].every(
      ({ status, source }) =>
        status === RESUME_TASK_STATUS.active && !readTaskMetadataField(source, "Completed")
    );
    if (
      !activeClosureGraph ||
      CLOSURE_GATE_FIELDS.some(
        (field) =>
          readTaskMetadataField(rootState.source, field) ||
          readTaskMetadataField(childState.source, field)
      )
    ) {
      throw new Error("TASK-540 evidence-before-pending closure graph is not exactly active");
    }
    requireTableStatus(
      childState.source,
      "540-06-L01",
      RESUME_TASK_STATUS.active,
      "TASK-540 evidence-before-pending child"
    );
    requireTableStatus(
      rootState.source,
      "540-06",
      RESUME_TASK_STATUS.active,
      "TASK-540 evidence-before-pending root"
    );
    const gateControlMatches = Boolean(
      gateReceipt &&
      closureControl.gateReceipt.field === gateReceipt.field &&
      closureControl.gateReceipt.valueSha256 === closureGateValueHash(gateReceipt)
    );
    const fixStartedDate = matchingPreClosureFixStartedDate(
      childState.source,
      leafState.source,
      "TASK-540 evidence-before-pending repair"
    );
    const leafRepairPending = readTaskMetadataField(leafState.source, "Repair Pending");
    const authorization = anchor.repairAuthorization;
    let authorizedSuccessorRepairPending = null;
    if (authorization && gateReceipt) {
      if (gateReceipt.field !== "Revalidation Passed") {
        throw new Error("TASK-540 authorized pre-pending repair retained a non-successor gate");
      }
      authorizedSuccessorRepairPending = repairPendingFromGateValue(
        gateReceipt.value,
        "TASK-540 authorized pre-pending successor"
      );
    }
    const normalGateMatches =
      leafRepairPending === null && authorization === null && gateControlMatches;
    const pendingRepairMatches = Boolean(
      fixStartedDate &&
      leafRepairPending &&
      gateReceipt === null &&
      resumeState.mode === "repair" &&
      resumeState.repair?.id === "540-06-L01" &&
      leafRepairPending === resumeState.repair.pending &&
      authorization &&
      authorization.repairPendingSha256 === hashRepairPendingReceipt(leafRepairPending) &&
      equalHashedGateReceipts(authorization.priorGate, closureControl.gateReceipt) &&
      equalHashedGateReceipts(
        authorization.successorGate,
        hashedGateReceipt({
          field: "Revalidation Passed",
          value: repairGateValue(leafRepairPending),
        })
      )
    );
    const authorizedSuccessorMatches = Boolean(
      fixStartedDate &&
      leafRepairPending === null &&
      gateReceipt &&
      resumeState.mode === "initial" &&
      resumeState.startIndex === LEAVES.length &&
      resumeState.startLeafId === null &&
      resumeState.remainingLeafIds.length === 0 &&
      authorization &&
      authorizedSuccessorRepairPending &&
      authorization.repairPendingSha256 ===
        hashRepairPendingReceipt(authorizedSuccessorRepairPending) &&
      equalHashedGateReceipts(authorization.priorGate, closureControl.gateReceipt) &&
      equalHashedGateReceipts(authorization.successorGate, hashedGateReceipt(gateReceipt))
    );
    if (
      boardState.bucket !== "inProgress" ||
      closureControl.boardBaseline !== boardBaseline ||
      closureControl.changelogPath !== CHANGELOG_REL ||
      (!normalGateMatches && !pendingRepairMatches && !authorizedSuccessorMatches)
    ) {
      throw new Error("TASK-540 evidence-before-pending control does not match active graph");
    }
    return Object.freeze({
      mode: pendingRepairMatches
        ? "evidence-before-pending-repair"
        : authorizedSuccessorMatches
          ? "evidence-before-pending-after-gate-repair"
          : "evidence-before-pending",
      path: CHANGELOG_REL,
      closurePending: null,
      generation: closureControl.generation,
      evidenceHash: anchor.evidenceSha256,
      boardBaseline,
      changelogPath: CHANGELOG_REL,
      gateReceipt,
      closureControl,
      anchor,
      changelogNeedsRecovery: true,
    });
  }
  if (resumeState.mode !== "repair" && resumeState.startIndex !== LEAVES.length) {
    throw new Error("TASK-540 closure pending state appeared before all leaves landed");
  }
  const requiredPending = sharedPending;
  const closureControl = anchor.closureControl;
  const authorization = anchor.repairAuthorization;
  const gateControlMatches =
    !authorization &&
    requiredPending.gateReceipt &&
    equalHashedGateReceipts(
      closureControl.gateReceipt,
      hashedGateReceipt(requiredPending.gateReceipt)
    );
  let authorizedSuccessorRepairPending = null;
  if (authorization && requiredPending.gateReceipt) {
    if (requiredPending.gateReceipt.field !== "Revalidation Passed") {
      throw new Error("TASK-540 authorized closure repair retained a non-successor gate");
    }
    authorizedSuccessorRepairPending = repairPendingFromGateValue(
      requiredPending.gateReceipt.value,
      "TASK-540 authorized closure successor"
    );
  }
  const pendingRepairMatches = Boolean(
    !requiredPending.gateReceipt &&
    resumeState.repair?.id === "540-06-L01" &&
    authorization &&
    authorization.repairPendingSha256 === hashRepairPendingReceipt(resumeState.repair.pending) &&
    equalHashedGateReceipts(authorization.priorGate, closureControl.gateReceipt) &&
    equalHashedGateReceipts(
      authorization.successorGate,
      hashedGateReceipt({
        field: "Revalidation Passed",
        value: repairGateValue(resumeState.repair.pending),
      })
    )
  );
  const successorGateMatches = Boolean(
    requiredPending.gateReceipt &&
    authorization &&
    authorizedSuccessorRepairPending &&
    authorization.repairPendingSha256 ===
      hashRepairPendingReceipt(authorizedSuccessorRepairPending) &&
    equalHashedGateReceipts(authorization.priorGate, closureControl.gateReceipt) &&
    equalHashedGateReceipts(
      authorization.successorGate,
      hashedGateReceipt(requiredPending.gateReceipt)
    )
  );
  if (
    closureControl.generation !== requiredPending.generation ||
    closureControl.boardBaseline !== requiredPending.boardBaseline ||
    closureControl.changelogPath !== requiredPending.changelogPath ||
    (!gateControlMatches && !pendingRepairMatches && !successorGateMatches)
  ) {
    throw new Error("TASK-540 pending restart does not match independent closureControl");
  }
  return Object.freeze({
    mode: successorGateMatches ? "closure-restart-after-gate-repair" : "closure-restart",
    path: CHANGELOG_REL,
    closurePending: requiredPending.value,
    generation: requiredPending.generation,
    evidenceHash: anchor.evidenceSha256,
    boardBaseline: requiredPending.boardBaseline,
    changelogPath: requiredPending.changelogPath,
    gateReceipt: requiredPending.gateReceipt,
    closureControl,
    anchor,
    changelogNeedsRecovery: true,
  });
}

const COVERED_CHANGELOG_MODES = new Set([
  "terminal-reopen",
  "closure-restart",
  "closure-restart-after-gate-repair",
]);

function hasIndependentTask540CoverageAuthority(changelogState) {
  if (!COVERED_CHANGELOG_MODES.has(changelogState?.mode)) return false;
  const control = changelogState.closureControl;
  const anchor = changelogState.anchor;
  if (!control || !anchor || !changelogState.evidenceHash?.match(/^[0-9a-f]{64}$/)) return false;
  try {
    const canonicalControl = validateClosureControl(control, "TASK-540 coverage authority");
    const canonicalAnchor = buildClosureAnchor(
      anchor.evidenceSha256,
      canonicalControl,
      anchor.repairAuthorization
    );
    parseClosureBoardBaseline(changelogState.boardBaseline, "TASK-540 coverage authority");
    if (
      JSON.stringify(canonicalControl) !== JSON.stringify(control) ||
      JSON.stringify(canonicalAnchor) !== JSON.stringify(anchor)
    ) {
      return false;
    }
  } catch {
    return false;
  }
  if (
    changelogState.path !== CHANGELOG_REL ||
    changelogState.changelogPath !== CHANGELOG_REL ||
    !Number.isSafeInteger(changelogState.generation) ||
    changelogState.generation < 1 ||
    !changelogState.boardBaseline ||
    anchor.evidenceSha256 !== changelogState.evidenceHash ||
    JSON.stringify(anchor.closureControl) !== JSON.stringify(control) ||
    control.generation !== changelogState.generation ||
    control.boardBaseline !== changelogState.boardBaseline ||
    control.changelogPath !== CHANGELOG_REL
  ) {
    return false;
  }
  if (
    changelogState.mode === "terminal-reopen" &&
    (changelogState.closurePending !== null || anchor.repairAuthorization !== null)
  ) {
    return false;
  }
  if (
    changelogState.mode !== "terminal-reopen" &&
    typeof changelogState.closurePending !== "string"
  ) {
    return false;
  }
  if (changelogState.gateReceipt) {
    const currentGate = hashedGateReceipt(changelogState.gateReceipt);
    const gateAuthorized =
      equalHashedGateReceipts(control.gateReceipt, currentGate) ||
      Boolean(
        anchor.repairAuthorization &&
        equalHashedGateReceipts(anchor.repairAuthorization.successorGate, currentGate)
      );
    if (!gateAuthorized) return false;
  } else if (!anchor.repairAuthorization) {
    return false;
  }
  return true;
}

function validateResumeLeafCoverageContract(
  leafStates,
  { allowCoveredDone = false, repairId = null, startLeafId = null } = {}
) {
  if (
    !Array.isArray(leafStates) ||
    leafStates.length !== LEAF_ORDER.length ||
    leafStates.some((state, index) => state.id !== LEAF_ORDER[index])
  ) {
    throw new Error("TASK-540 resume coverage requires every leaf in strict land order");
  }
  let doneCount = 0;
  let activeCount = 0;
  let landedCount = 0;
  for (const state of leafStates) {
    const isClosureLeaf = state.id === "540-06-L01";
    const gateCount = Number(Boolean(state.targetedGate)) + Number(Boolean(state.revalidation));
    if (gateCount > 1) {
      throw new Error("TASK-" + state.id + ": resume coverage found both gate receipts");
    }
    if (!isClosureLeaf && state.closurePending) {
      throw new Error("TASK-" + state.id + ": source leaf retained Closure Pending");
    }
    if (state.repairPending && state.id !== repairId) {
      throw new Error("TASK-" + state.id + ": Repair Pending escaped the exact repair owner");
    }
    if (state.status === RESUME_TASK_STATUS.done) {
      doneCount += 1;
      requireCanonicalCompleted(state.completed, "TASK-" + state.id + " covered leaf");
      requireCanonicalImplementationComplete(
        state.implementationComplete,
        "TASK-" + state.id + " covered leaf"
      );
      if (
        !allowCoveredDone ||
        gateCount !== 1 ||
        state.repairPending ||
        state.closurePending ||
        !state.landed
      ) {
        throw new Error(
          "TASK-" + state.id + ": Done is not covered by exact terminal leaf authority"
        );
      }
      landedCount += 1;
      continue;
    }
    requireAbsentCompleted(state.completed, "TASK-" + state.id + " nonterminal leaf");
    if (state.status === RESUME_TASK_STATUS.todo) {
      requireAbsentImplementationComplete(
        state.implementationComplete,
        "TASK-" + state.id + " To Do leaf"
      );
      if (
        gateCount !== 0 ||
        state.repairPending ||
        state.closurePending ||
        state.implementationComplete ||
        state.landed
      ) {
        throw new Error("TASK-" + state.id + ": To Do leaf retained landed evidence");
      }
      continue;
    }
    if (state.status !== RESUME_TASK_STATUS.active) {
      throw new Error("TASK-" + state.id + ": unsupported resume coverage status");
    }
    activeCount += 1;
    if (state.repairPending) {
      requireAbsentImplementationComplete(
        state.implementationComplete,
        "TASK-" + state.id + " repair leaf"
      );
      if (gateCount !== 0 || state.implementationComplete || state.landed) {
        throw new Error("TASK-" + state.id + ": repair owner retained stale landed evidence");
      }
      continue;
    }
    if (gateCount === 1) {
      requireCanonicalImplementationComplete(
        state.implementationComplete,
        "TASK-" + state.id + " landed leaf"
      );
      if (!state.landed) {
        throw new Error("TASK-" + state.id + ": gated leaf lacks Implementation Complete");
      }
      if (state.closurePending && (!isClosureLeaf || !allowCoveredDone)) {
        throw new Error("TASK-" + state.id + ": Closure Pending lacks covered authority");
      }
      landedCount += 1;
      continue;
    }
    requireAbsentImplementationComplete(
      state.implementationComplete,
      "TASK-" + state.id + " active ungated leaf"
    );
    if (
      state.implementationComplete ||
      state.landed ||
      state.closurePending ||
      (state.id !== repairId && state.id !== startLeafId && !(isClosureLeaf && repairId))
    ) {
      throw new Error("TASK-" + state.id + ": unexpected active ungated leaf");
    }
  }
  return Object.freeze({ doneCount, activeCount, landedCount });
}

async function validateResumeGraphCoverage(resumeState, changelogState, label) {
  const allowCoveredDone = hasIndependentTask540CoverageAuthority(changelogState);
  const leafSummary = validateResumeLeafCoverageContract(resumeState.leafStates, {
    allowCoveredDone,
    repairId: resumeState.repair?.id ?? null,
    startLeafId: resumeState.startLeafId,
  });
  if (resumeState.mode === "terminal" && !allowCoveredDone) {
    throw new Error(label + ": terminal graph lacks independently validated changelog 1252");
  }

  const taskStates = new Map(
    await Promise.all(
      TASK_PATHS.map(async (relativePath) => [
        relativePath,
        Object.freeze({ relativePath, ...(await readCanonicalTaskStatus(relativePath)) }),
      ])
    )
  );
  const leafById = new Map(resumeState.leafStates.map((state) => [state.id, state]));
  const closurePathSet = new Set(closureContractPaths());
  for (const leafId of LEAF_ORDER) {
    const group = LEAF_STATUS_GROUPS[leafId];
    const persisted = taskStates.get(group.leafPath);
    const projected = leafById.get(leafId);
    const persistedProjection = {
      status: persisted.status,
      completed: readTaskMetadataField(persisted.source, "Completed"),
      implementationComplete: readTaskMetadataField(persisted.source, "Implementation Complete"),
      targetedGate: readTaskMetadataField(persisted.source, "Targeted Gate Passed"),
      revalidation: readTaskMetadataField(persisted.source, "Revalidation Passed"),
      repairPending: readTaskMetadataField(persisted.source, "Repair Pending"),
      closurePending: readTaskMetadataField(persisted.source, "Closure Pending"),
    };
    const resumeProjection = {
      status: projected.status,
      completed: projected.completed,
      implementationComplete: projected.implementationComplete,
      targetedGate: projected.targetedGate,
      revalidation: projected.revalidation,
      repairPending: projected.repairPending,
      closurePending: projected.closurePending,
    };
    if (JSON.stringify(persistedProjection) !== JSON.stringify(resumeProjection)) {
      throw new Error(label + ": leaf graph changed during coverage validation: TASK-" + leafId);
    }
    if (
      leafId !== "540-06-L01" &&
      CLOSURE_RECEIPT_FIELDS.some((field) => readTaskMetadataField(persisted.source, field))
    ) {
      throw new Error(label + ": source leaf retained closure-only authority: TASK-" + leafId);
    }
  }
  for (const childId of CHILD_IDS_IN_LAND_ORDER) {
    const leafIds = LEAF_ORDER.filter((leafId) => LEAF_STATUS_GROUPS[leafId].childId === childId);
    const group = LEAF_STATUS_GROUPS[leafIds[0]];
    const state = taskStates.get(group.childPath);
    const childLeaves = leafIds.map((leafId) => leafById.get(leafId));
    const expectedStatus = childLeaves.every(({ status }) => status === RESUME_TASK_STATUS.done)
      ? RESUME_TASK_STATUS.done
      : childLeaves.every(({ status }) => status === RESUME_TASK_STATUS.todo)
        ? RESUME_TASK_STATUS.todo
        : RESUME_TASK_STATUS.active;
    const completed = readTaskMetadataField(state.source, "Completed");
    const implementationComplete = readTaskMetadataField(state.source, "Implementation Complete");
    const allLeavesLanded = childLeaves.every(({ landed }) => landed);
    if (expectedStatus === RESUME_TASK_STATUS.done) {
      requireCanonicalCompleted(completed, label + " TASK-" + childId);
    } else {
      requireAbsentCompleted(completed, label + " TASK-" + childId);
    }
    if (allLeavesLanded) {
      requireCanonicalImplementationComplete(implementationComplete, label + " TASK-" + childId);
    } else {
      requireAbsentImplementationComplete(implementationComplete, label + " TASK-" + childId);
    }
    if (
      state.status !== expectedStatus ||
      (expectedStatus === RESUME_TASK_STATUS.done && !allowCoveredDone) ||
      readTaskGateReceipts(state.source).length !== 0 ||
      readTaskMetadataField(state.source, "Repair Pending")
    ) {
      throw new Error(label + ": child graph coverage mismatch for TASK-" + childId);
    }
    if (
      !closurePathSet.has(group.childPath) &&
      CLOSURE_RECEIPT_FIELDS.some((field) => readTaskMetadataField(state.source, field))
    ) {
      throw new Error(label + ": source child retained closure-only authority: TASK-" + childId);
    }
    for (const leafId of leafIds) {
      requireTableStatus(state.source, leafId, leafById.get(leafId).status, label + " child");
    }
  }

  const rootState = taskStates.get(ROOT_TASK_PATH);
  const childStates = CHILD_IDS_IN_LAND_ORDER.map((childId) => {
    const leafId = LEAF_ORDER.find(
      (candidate) => LEAF_STATUS_GROUPS[candidate].childId === childId
    );
    return taskStates.get(LEAF_STATUS_GROUPS[leafId].childPath);
  });
  const expectedRootStatus = childStates.every(({ status }) => status === RESUME_TASK_STATUS.done)
    ? RESUME_TASK_STATUS.done
    : RESUME_TASK_STATUS.active;
  const persistedRootCompleted = readTaskMetadataField(rootState.source, "Completed");
  const persistedRootImplementationComplete = readTaskMetadataField(
    rootState.source,
    "Implementation Complete"
  );
  if (expectedRootStatus === RESUME_TASK_STATUS.done) {
    requireCanonicalCompleted(persistedRootCompleted, label + " root");
  } else {
    requireAbsentCompleted(persistedRootCompleted, label + " root");
  }
  requireAbsentImplementationComplete(persistedRootImplementationComplete, label + " root");
  if (
    rootState.status !== expectedRootStatus ||
    (expectedRootStatus === RESUME_TASK_STATUS.done && !allowCoveredDone) ||
    readTaskGateReceipts(rootState.source).length !== 0 ||
    readTaskMetadataField(rootState.source, "Repair Pending")
  ) {
    throw new Error(label + ": root graph coverage mismatch");
  }
  for (let index = 0; index < CHILD_IDS_IN_LAND_ORDER.length; index += 1) {
    requireTableStatus(
      rootState.source,
      CHILD_IDS_IN_LAND_ORDER[index],
      childStates[index].status,
      label + " root"
    );
  }

  const boardState = readTask540BoardState(await readFile(TASKS + "/README.md", "utf8"));
  const expectedBoardBucket =
    expectedRootStatus === RESUME_TASK_STATUS.done ? "done" : "inProgress";
  if (boardState.bucket !== expectedBoardBucket) {
    throw new Error(label + ": board bucket does not match the covered graph");
  }
  const statusByPath = Object.freeze(
    Object.fromEntries(
      FAMILY_STATUS_ORDER.map((relativePath) => [relativePath, taskStates.get(relativePath).status])
    )
  );
  const completedByPath = Object.freeze(
    Object.fromEntries(
      FAMILY_STATUS_ORDER.map((relativePath) => [
        relativePath,
        readTaskMetadataField(taskStates.get(relativePath).source, "Completed"),
      ])
    )
  );
  const activePaths = Object.freeze(
    FAMILY_STATUS_ORDER.filter(
      (relativePath) => statusByPath[relativePath] === RESUME_TASK_STATUS.active
    )
  );
  return Object.freeze({
    allowCoveredDone,
    leafSummary,
    statusByPath,
    completedByPath,
    activePaths,
    activeLeafIds: Object.freeze(
      LEAF_ORDER.filter(
        (leafId) => statusByPath[LEAF_STATUS_GROUPS[leafId].leafPath] === RESUME_TASK_STATUS.active
      )
    ),
    activeChildIds: Object.freeze(
      CHILD_IDS_IN_LAND_ORDER.filter((childId) => {
        const leafId = LEAF_ORDER.find(
          (candidate) => LEAF_STATUS_GROUPS[candidate].childId === childId
        );
        return statusByPath[LEAF_STATUS_GROUPS[leafId].childPath] === RESUME_TASK_STATUS.active;
      })
    ),
    allActive: activePaths.length === FAMILY_STATUS_ORDER.length,
  });
}

function implementationCompleteValue(date = RUN_DATE) {
  requireCanonicalReceiptDate(date, "TASK-540 Implementation Complete value");
  return date + IMPLEMENTATION_COMPLETE_SUFFIX;
}

function requireFinalCompletedForEntry(relativePath, value, entryGraph, label) {
  requireCanonicalCompleted(value, label + " " + relativePath);
  if (!entryGraph) return value;
  const priorStatus = entryGraph.statusByPath[relativePath];
  const priorCompleted = entryGraph.completedByPath[relativePath];
  if (priorStatus === RESUME_TASK_STATUS.active) {
    if (value !== RUN_DATE) {
      throw new Error(label + ": newly closed contract requires Completed " + RUN_DATE);
    }
    return value;
  }
  if (priorStatus === RESUME_TASK_STATUS.done) {
    requireCanonicalCompleted(priorCompleted, label + " historical " + relativePath);
    if (value !== priorCompleted) {
      throw new Error(label + ": covered Done contract changed historical Completed");
    }
    return value;
  }
  throw new Error(label + ": final entry status is not active or covered Done");
}

async function transitionLeafStatus(leaf, transition, reason, repairPending = null) {
  const group = LEAF_STATUS_GROUPS[leaf.id];
  if (!group) throw new Error("Missing status group for " + leaf.id);
  const closureReceiptsBefore = await captureClosureContractReceipts();
  const repairCompletion = transition === "complete" && Boolean(repairPending);
  const expectedLeafStatus = RESUME_TASK_STATUS.active;
  const siblingStates = await Promise.all(
    group.leafIds.map(async (leafId) => {
      if (leafId === leaf.id) {
        return { id: leafId, status: expectedLeafStatus, landed: transition === "complete" };
      }
      const siblingGroup = LEAF_STATUS_GROUPS[leafId];
      const siblingState = await readCanonicalTaskStatus(siblingGroup.leafPath);
      const targetedGate = readTaskMetadataField(siblingState.source, "Targeted Gate Passed");
      const revalidation = readTaskMetadataField(siblingState.source, "Revalidation Passed");
      return {
        id: leafId,
        status: siblingState.status,
        landed:
          siblingState.status === RESUME_TASK_STATUS.done ||
          (siblingState.status === RESUME_TASK_STATUS.active &&
            !readTaskMetadataField(siblingState.source, "Repair Pending") &&
            Boolean(targetedGate) !== Boolean(revalidation)),
      };
    })
  );
  const expectedChildStatus = RESUME_TASK_STATUS.active;
  const childImplementationComplete = siblingStates.every(({ landed }) => landed);
  const exactImplementationComplete = implementationCompleteValue();
  const startMetadataField = reason.includes("repair") ? "Fix Started" : "Started";
  const childMutableFields =
    transition === "start"
      ? [startMetadataField]
      : childImplementationComplete
        ? ["Implementation Complete"]
        : [];
  const leafGateMutableFields = [
    "Implementation Complete",
    "Targeted Gate Passed",
    "Revalidation Passed",
    "Repair Pending",
  ];
  const leafMutableFields = transition === "start" ? [startMetadataField] : leafGateMutableFields;
  const owner = Object.freeze({
    id: "status-" + leaf.id,
    allowedFiles: Object.freeze([ROOT_TASK_PATH, group.childPath, group.leafPath]),
    requiredFiles: Object.freeze([]),
    taskContractMutations: Object.freeze([
      Object.freeze({
        relativePath: ROOT_TASK_PATH,
        tableTaskIds: [group.childId],
        mutableFields: [],
      }),
      Object.freeze({
        relativePath: group.childPath,
        tableTaskIds: [leaf.id],
        mutableFields: Object.freeze([...new Set(childMutableFields)]),
      }),
      Object.freeze({
        relativePath: group.leafPath,
        tableTaskIds: [],
        mutableFields: Object.freeze([...new Set(leafMutableFields)]),
      }),
    ]),
  });
  const rollbackOwner = Object.freeze({
    id: owner.id + "-rollback",
    allowedFiles: Object.freeze([...owner.allowedFiles, "_docs/_TASKS/README.md"]),
    requiredFiles: Object.freeze([]),
  });
  const transactionSnapshot = await captureExactRollbackFiles(
    rollbackOwner.allowedFiles,
    "TASK-540 transition pre-dispatch " + leaf.id + ":" + transition
  );
  const preClosureFixStartedDate =
    transition === "complete" &&
    leaf.id === "540-06-L01" &&
    !repairPending &&
    reason.includes("regate")
      ? matchingPreClosureFixStartedDate(
          requireExactRollbackSnapshotUtf8(
            transactionSnapshot,
            group.childPath,
            "TASK-540 pre-closure re-gate transition"
          ),
          requireExactRollbackSnapshotUtf8(
            transactionSnapshot,
            group.leafPath,
            "TASK-540 pre-closure re-gate transition"
          ),
          "TASK-540 pre-closure re-gate transition"
        )
      : null;
  const preClosureGateValue = preClosureFixStartedDate
    ? preClosureRegateValue(preClosureFixStartedDate)
    : null;
  const action =
    transition === "start"
      ? "Set the exact leaf and its child In Progress before implementation/fix; add Started for first implementation or Fix Started for a verified repair."
      : repairCompletion
        ? "Keep the exact repaired leaf and its child In Progress, remove the leaf's exact Repair Pending and old gate receipts, and record its canonical Implementation Complete plus one fresh matching Revalidation Passed receipt for this repair generation/token."
        : reason.includes("regate")
          ? "Keep the exact leaf and its child In Progress, record canonical Implementation Complete, remove the opposite/stale gate receipt, and add one dedicated Revalidation Passed field with the green re-gate evidence."
          : "Keep the exact leaf and its child In Progress, record canonical Implementation Complete, remove the opposite/stale gate receipt, and add one dedicated Targeted Gate Passed field with the green targeted-gate evidence.";

  let transitionMutationError = null;
  try {
    await runMutatingAgent(
      "Repository " +
        ROOT +
        ". TASK-540 task-state transition only. " +
        action +
        " Read the root parent, exact child, exact leaf, and _docs/_TASKS/README.md fresh. " +
        "Edit only " +
        JSON.stringify(owner.allowedFiles) +
        ". The required exact post-transition statuses are leaf=" +
        expectedLeafStatus +
        ", child=" +
        expectedChildStatus +
        ", root=🚧 In Progress." +
        (transition === "complete"
          ? " Write exact leaf field `**Implementation Complete:** " +
            exactImplementationComplete +
            "`. " +
            (childImplementationComplete
              ? "Every physical leaf under the direct child is now landed, so write the same exact Implementation Complete field on that child."
              : "The direct child is not fully landed, so it must not carry Implementation Complete.")
          : "") +
        (repairCompletion
          ? " The leaf's exact current `**Repair Pending:** " +
            repairPending +
            "` must be removed atomically only now, after the green gate. Remove any Targeted Gate Passed value and write `**Revalidation Passed:** " +
            repairPending +
            " / gate green" +
            "` exactly; a different or stale generation/token is invalid."
          : preClosureGateValue
            ? " Remove any Targeted Gate Passed and Repair Pending value and write exact `**Revalidation Passed:** " +
              preClosureGateValue +
              "` from the persisted matching child/leaf Fix Started date. A different date or value is invalid."
            : "") +
        " Synchronize the child leaf-status table and root subtask-status " +
        "table. Keep TASK-540's board row/statistics byte-identical and In Progress. Preserve every " +
        "unrelated descendant status byte-identically. Use canonical " +
        "status fields and dedicated Started/Fix Started/Implementation Complete/Targeted Gate Passed/Revalidation Passed fields " +
        "dated " +
        RUN_DATE +
        "; do not put dates in **Status:**. Do not edit source, tests, docs outside these task " +
        "files, board, workflow, changelog, or another task. Never stage or commit. Transition " +
        "reason: " +
        reason +
        ".",
      { label: "status:" + leaf.id + ":" + transition + ":" + reason, phase: leaf.phase },
      owner,
      false
    );
  } catch (error) {
    transitionMutationError = error;
  }

  let transitionVerificationError = null;
  let verifiedClosureGateReceipt = null;
  try {
    const [rootState, childState, leafState, boardSource] = await Promise.all([
      readCanonicalTaskStatus(ROOT_TASK_PATH),
      readCanonicalTaskStatus(group.childPath),
      readCanonicalTaskStatus(group.leafPath),
      readFile(TASKS + "/README.md", "utf8"),
    ]);
    if (rootState.status !== "🚧 In Progress" || leafState.status !== expectedLeafStatus) {
      throw new Error("TASK-540 status transition field mismatch for " + leaf.id);
    }
    requireAbsentCompleted(
      readTaskMetadataField(rootState.source, "Completed"),
      "TASK-540 active root after transition " + leaf.id
    );
    requireAbsentImplementationComplete(
      readTaskMetadataField(rootState.source, "Implementation Complete"),
      "TASK-540 active root after transition " + leaf.id
    );
    if (childState.status !== expectedChildStatus) {
      throw new Error("TASK-540 child status transition mismatch for " + group.childId);
    }
    requireAbsentCompleted(
      readTaskMetadataField(leafState.source, "Completed"),
      "TASK-540 active leaf " + leaf.id
    );
    requireAbsentCompleted(
      readTaskMetadataField(childState.source, "Completed"),
      "TASK-540 active child " + group.childId
    );
    requireTableStatus(childState.source, leaf.id, expectedLeafStatus, "TASK-540 child");
    requireTableStatus(rootState.source, group.childId, expectedChildStatus, "TASK-540 root");
    if (transition === "complete") {
      const gateReceipt = readTaskGateReceipt(
        leafState.source,
        "TASK-540 landed transition " + leaf.id
      );
      const expectedGateField =
        repairCompletion || preClosureGateValue || reason.includes("regate")
          ? "Revalidation Passed"
          : "Targeted Gate Passed";
      const expectedGateValue = repairCompletion
        ? repairGateValue(repairPending)
        : (preClosureGateValue ?? null);
      if (
        gateReceipt.field !== expectedGateField ||
        (expectedGateValue !== null && gateReceipt.value !== expectedGateValue)
      ) {
        throw new Error("TASK-540 missing gate evidence field for " + leaf.id);
      }
      if (
        readTaskMetadataField(leafState.source, "Implementation Complete") !==
          exactImplementationComplete ||
        Boolean(readTaskMetadataField(childState.source, "Implementation Complete")) !==
          childImplementationComplete ||
        (childImplementationComplete &&
          readTaskMetadataField(childState.source, "Implementation Complete") !==
            exactImplementationComplete)
      ) {
        throw new Error("TASK-540 missing canonical Implementation Complete for " + leaf.id);
      }
      if (leaf.id === "540-06-L01") {
        const currentGateReceipt = gateReceipt;
        const mayReplacePinnedGate =
          !closureLeafGateReceipt || repairCompletion || reason.includes("regate");
        if (
          closureLeafGateReceipt &&
          !equalClosureGateReceipts(closureLeafGateReceipt, currentGateReceipt) &&
          !mayReplacePinnedGate
        ) {
          throw new Error("TASK-540 closure leaf transition changed its pinned gate receipt");
        }
        verifiedClosureGateReceipt = currentGateReceipt;
      }
      if (
        repairCompletion &&
        (readTaskMetadataField(leafState.source, "Repair Pending") ||
          readTaskMetadataField(leafState.source, "Targeted Gate Passed"))
      ) {
        throw new Error(
          "TASK-540 repaired leaf retained stale pending/targeted evidence: " + leaf.id
        );
      }
      if (
        preClosureGateValue &&
        (readTaskMetadataField(leafState.source, "Repair Pending") ||
          readTaskMetadataField(leafState.source, "Targeted Gate Passed"))
      ) {
        throw new Error("TASK-540 pre-closure re-gate retained stale repair/gate evidence");
      }
      if (
        !repairCompletion &&
        !preClosureGateValue &&
        readTaskMetadataField(leafState.source, "Repair Pending")
      ) {
        throw new Error("TASK-540 landed leaf retained Repair Pending: " + leaf.id);
      }
    } else {
      requireAbsentImplementationComplete(
        readTaskMetadataField(leafState.source, "Implementation Complete"),
        "TASK-540 starting leaf " + leaf.id
      );
      requireAbsentImplementationComplete(
        readTaskMetadataField(childState.source, "Implementation Complete"),
        "TASK-540 starting child " + group.childId
      );
    }
    const boardBefore = requireExactRollbackSnapshotUtf8(
      transactionSnapshot,
      "_docs/_TASKS/README.md",
      "TASK-540 task transition"
    );
    if (boardSource !== boardBefore) {
      throw new Error("TASK-540 task transition changed the board or its statistics");
    }
    const boardRow = boardSource.split("\n").find((line) => line.startsWith("| TASK-540 |"));
    if (!boardRow?.includes("🚧 In progress")) {
      throw new Error("TASK-540 board row left In Progress contract");
    }
    await verifyClosureContractReceipts(
      closureReceiptsBefore,
      "TASK-540 task transition " + leaf.id,
      { allowGateChange: transition === "complete" && leaf.id === "540-06-L01" }
    );
  } catch (error) {
    transitionVerificationError = error;
  }

  if (transitionMutationError || transitionVerificationError) {
    const primaryError =
      transitionMutationError && transitionVerificationError
        ? new AggregateError(
            [transitionMutationError, transitionVerificationError],
            "TASK-540 task transition dispatch and persisted-state verification both failed"
          )
        : (transitionMutationError ?? transitionVerificationError);
    try {
      await restoreExactRollbackFiles(
        transactionSnapshot,
        rollbackOwner,
        "TASK-540 transition rollback " + leaf.id + ":" + transition
      );
    } catch (rollbackError) {
      throw new AggregateError(
        [primaryError, rollbackError],
        "TASK-540 task transition failure and exact transaction rollback both failed"
      );
    }
    throw primaryError;
  }
  if (verifiedClosureGateReceipt) {
    closureLeafGateReceipt = Object.freeze({ ...verifiedClosureGateReceipt });
  }
}

async function runLeafGate(leaf, attempt, phaseName = leaf.phase) {
  void phaseName;
  const label = "gate:" + leaf.id + ":" + attempt;
  const execution = await runLocalCommandSequence(leaf.commands, { label });
  const failed = execution.failedReceipt;
  const pass =
    failed === null &&
    execution.receipts.length === leaf.commands.length &&
    execution.authority.unchanged;
  const result = Object.freeze({
    pass,
    summary: pass
      ? leaf.id + " local gate passed"
      : leaf.id + " local gate stopped at " + (failed?.id ?? "unknown"),
    errors: pass
      ? []
      : [
          leaf.id +
            ": orchestrator-local command failed: " +
            (failed?.id ?? "repositoryFingerprint") +
            " status=" +
            (failed?.status ?? 1),
        ],
    failureKind: pass ? "none" : localFailureKind(failed),
    failedCommand: pass ? null : failed.command,
    commands: execution.receipts,
    isolationCommands: execution.isolationReceipts,
    failureProjection:
      pass || !execution.receipts.includes(failed)
        ? null
        : localCommandFailureProjection(failed, label + ":" + failed.id),
    authority: execution.authority,
  });
  if (pass && result.commands.some((receipt) => receipt.status !== 0)) {
    throw new Error(leaf.id + ": local gate attempted to authorize a non-green command");
  }
  return result;
}

function gateFailurePrompt(gate) {
  const values = [...gate.errors];
  if (gate.failureProjection)
    values.push("Bounded local failure projection:\n" + gate.failureProjection);
  return values.join("\n- ");
}

async function implementAndGate(leaf) {
  phase(leaf.phase);
  await transitionLeafStatus(leaf, "start", "implementation");
  await runMutatingAgent(
    COMMON +
      "\n\nImplement exactly " +
      leaf.id +
      " from " +
      TASKS +
      "/" +
      leaf.taskFile +
      ". Edit only these exact single-writer paths: " +
      JSON.stringify(leaf.allowedFiles) +
      leafRestrictionPrompt(leaf) +
      ". Read every owned file fresh. Do not edit tasks, workflow, product docs, or " +
      "changelog in a source leaf; 540-06-L01 may edit only its declared aggregate test " +
      "and documentation paths. Return exact repo-relative touchedFiles.",
    { label: "impl:" + leaf.id, phase: leaf.phase },
    leaf
  );

  let gate = await runLeafGate(leaf, 1);
  for (let attempt = 1; !gate.pass && attempt <= 3; attempt += 1) {
    if (gate.failureKind === "infrastructure") {
      throw new Error(leaf.id + ": infrastructure gate failure: " + gate.errors.join("; "));
    }
    await runMutatingAgent(
      COMMON +
        "\n\nFix only the verified " +
        leaf.id +
        " gate defect within " +
        JSON.stringify(leaf.allowedFiles) +
        ". Do not weaken a behavior assertion. Failures:\n- " +
        gateFailurePrompt(gate) +
        leafRestrictionPrompt(leaf),
      { label: "fix:" + leaf.id + ":" + attempt, phase: leaf.phase },
      leaf,
      false
    );
    gate = await runLeafGate(leaf, attempt + 1);
  }
  if (!gate.pass) throw new Error(leaf.id + ": targeted gate remained red");
  await transitionLeafStatus(leaf, "complete", "targeted-gate-green");
}

async function resumeActiveUngatedLeaf(leaf) {
  phase(leaf.phase);
  const preClosureFixStartedDate = await readPersistedPreClosureFixStartedDate(
    leaf,
    "TASK-540 active ungated resume"
  );
  let gate = await runLeafGate(leaf, 1, leaf.phase);
  let behaviorFixRan = false;
  for (let attempt = 1; !gate.pass && attempt <= 3; attempt += 1) {
    if (gate.failureKind === "infrastructure") {
      throw new Error(leaf.id + ": active resume stopped on infrastructure failure");
    }
    behaviorFixRan = true;
    await runMutatingAgent(
      COMMON +
        "\n\nResume the already-active/no-gate " +
        leaf.id +
        " after its prior dispatch may have completed an allowed mutation. Fix only the verified " +
        "behavior failure within " +
        JSON.stringify(leaf.allowedFiles) +
        ". Do not require a file mutation, weaken assertions, edit task state, stage, or commit. " +
        "Failures:\n- " +
        gateFailurePrompt(gate) +
        leafRestrictionPrompt(leaf),
      { label: "resume-active-fix:" + leaf.id + ":" + attempt, phase: leaf.phase },
      leaf,
      false
    );
    gate = await runLeafGate(leaf, attempt + 1, leaf.phase);
  }
  if (!gate.pass) throw new Error(leaf.id + ": active/no-gate resume remained red");
  await transitionLeafStatus(
    leaf,
    "complete",
    preClosureFixStartedDate
      ? "resume-pre-closure-regate-green"
      : behaviorFixRan
        ? "resume-regate-green"
        : "targeted-gate-green"
  );
}

async function resumeInterruptedRepair(resumeState) {
  const repair = resumeState.repair;
  const leaf = repair ? LEAF_BY_ID.get(repair.id) : null;
  if (!repair || !leaf) throw new Error("TASK-540 repair resume owner is missing");
  const repairOwner = effectiveRepairMutationOwner(leaf);
  const repairInvariant = await capturePersistedRepairInvariant(leaf, repair.pending);
  phase(leaf.phase);
  await runRepairMutationWithInvariant(
    COMMON +
      "\n\nResume only the persisted interrupted repair for " +
      leaf.id +
      " with exact `Repair Pending` receipt " +
      repair.pending +
      ". Re-read the entire exact leaf contract, current owned source/tests/docs and full diff, " +
      "then complete every still-missing behavior in that owner's contract. Old gate receipts " +
      "were invalidated and may not be recreated here. Edit only " +
      JSON.stringify(repairOwner.allowedFiles) +
      leafRestrictionPrompt(leaf) +
      ". Preserve every later Done leaf byte-identically. Return exact touchedFiles; no task, " +
      "board, changelog, workflow, stage, or commit changes.",
    { label: "repair-resume:" + leaf.id, phase: leaf.phase },
    repairOwner,
    leaf,
    repairInvariant,
    false
  );

  let gate = await runLeafGate(leaf, 1, leaf.phase);
  for (let attempt = 1; !gate.pass && attempt <= 3; attempt += 1) {
    if (gate.failureKind === "infrastructure") {
      throw new Error(leaf.id + ": repair-resume infrastructure failure");
    }
    await runRepairMutationWithInvariant(
      COMMON +
        "\n\nFix only the persisted repair owner's verified gate defect within " +
        JSON.stringify(repairOwner.allowedFiles) +
        leafRestrictionPrompt(leaf) +
        ". Do not weaken an assertion. Failures:\n- " +
        gateFailurePrompt(gate),
      { label: "repair-resume-fix:" + leaf.id + ":" + attempt, phase: leaf.phase },
      repairOwner,
      leaf,
      repairInvariant,
      false
    );
    gate = await runLeafGate(leaf, attempt + 1, leaf.phase);
  }
  if (!gate.pass) throw new Error(leaf.id + ": interrupted repair re-gate remained red");
  await transitionLeafStatus(leaf, "complete", "repair-resume-regate-green", repair.pending);
}

function requireFullValidation(result, label) {
  if (
    !resultPassed(result) ||
    result.commands.length !== FULL_GATE_COMMANDS.length ||
    result.commands.some((receipt, index) => {
      const expected = FULL_GATE_COMMANDS[index];
      const expectedStatus = expected.id === "strictScan" ? 1 : 0;
      return (
        receipt.id !== expected.id ||
        receipt.command !== expected.command ||
        receipt.status !== expectedStatus
      );
    }) ||
    result.database.configured !== true ||
    result.database.reachable !== true ||
    result.database.selectOne !== 1
  ) {
    throw new Error(label + ": full command receipt mismatch");
  }
  const findings = result.strictScan.externalFindings;
  const finding = findings[0];
  if (
    result.strictScan.exitCode !== 1 ||
    result.strictScan.green !== false ||
    result.strictScan.classification !== "external-non-green" ||
    result.strictScan.task540Findings !== 0 ||
    result.strictScan.toolingFailure ||
    result.strictScan.suppressed ||
    findings.length !== 1 ||
    finding.scanner !== KNOWN_STRICT_FINDING.scanner ||
    finding.rule !== KNOWN_STRICT_FINDING.rule ||
    finding.file !== KNOWN_STRICT_FINDING.file ||
    finding.line !== KNOWN_STRICT_FINDING.line ||
    finding.owner !== KNOWN_STRICT_FINDING.owner
  ) {
    throw new Error(label + ": strict scan must be the sole exact external non-green finding");
  }
  return result;
}

async function runFullValidation(label, phaseName) {
  void phaseName;
  const execution = await runLocalCommandSequence(FULL_GATE_COMMANDS, {
    label,
    allowStrictScan: true,
  });
  const dbReceipt = execution.receipts.find(({ id }) => id === "dbPreflight");
  const database = dbReceipt
    ? parseDatabasePreflightReceipt(dbReceipt, label + ":dbPreflight")
    : Object.freeze({ configured: false, reachable: false, selectOne: 0 });
  const pass =
    execution.failedReceipt === null &&
    execution.receipts.length === FULL_GATE_COMMANDS.length &&
    execution.authority.unchanged &&
    execution.strictScan?.accepted === true;
  const result = Object.freeze({
    pass,
    summary: pass
      ? "TASK-540 orchestrator-local full validation passed with exact external strict finding"
      : "TASK-540 orchestrator-local full validation failed",
    errors: pass
      ? []
      : [
          "TASK-540 local full validation stopped at " +
            (execution.failedReceipt?.id ?? "incomplete-command-matrix"),
        ],
    commands: execution.receipts,
    isolationCommands: execution.isolationReceipts,
    database,
    strictScan:
      execution.strictScan ??
      Object.freeze({
        accepted: false,
        exitCode: execution.failedReceipt?.status ?? -1,
        green: false,
        classification: "rejected",
        task540Findings: 1,
        toolingFailure: true,
        suppressed: false,
        externalFindings: [],
      }),
    authority: execution.authority,
  });
  return requireFullValidation(result, label);
}

const POST_AUDIT_LENSES = Object.freeze([
  [
    "schema-url",
    "Fixed-kind recursive reject-unknown, route/domain error split, legacy read repair, URL policy, byte identity, binding GC.",
  ],
  [
    "tabs-renderer",
    "Tab/slot identity, host-owned builder state, roving keyboard/ARIA/DOM IDs, direct-image versus media-field UUID semantics, non-interactive wrappers.",
  ],
  [
    "async-dirty-cache",
    "Entry/media promise authority and exact identity, one forced read per unique target, request/attempt cancellation, all subscriptions, commit-time dirty generations, navigation bypass only after successful create.",
  ],
  [
    "preferences-responsive-security",
    "Narrow/wide geometry and landmark role; isolated per-user settings with no localStorage/aggregate leak; a no-user toggle is hook-mount-local in-memory fallback that issues zero isolated GET/PATCH requests, writes zero browser storage, and resets on remount; direct provider A→B publishes B without an intermediate null while explicit sign-out/null and provider unmount still publish null; malformed GET/PATCH responses are rejected, and a malformed PATCH retains the exact optimistic intent as unsynced without automatic replay; central 400 mapping plus auth/CSRF/rate/self-scope route proof.",
  ],
  [
    "tests-docs-scope",
    "Single-writer ownership, correct Vitest/Bun lanes, non-weakened tests, product/cache/API/user docs, forbidden Page/widget paths, task/changelog reservation and executable smoke feasibility only; runtime evidence does not exist yet.",
  ],
]);

async function authorizeClosureLeafRepair(repairPending, priorGate, label) {
  const anchorSnapshot = await captureClosureAnchorSnapshot(
    "TASK-540 closure-leaf repair pre-authorization",
    "anchor-only"
  );
  const anchor = await readClosureAnchor({
    required: true,
    label: "TASK-540 closure-leaf repair authorization",
  });
  const priorGateHash = hashedGateReceipt(priorGate);
  if (!equalHashedGateReceipts(anchor.closureControl.gateReceipt, priorGateHash)) {
    throw new Error("TASK-540 closure-leaf repair prior gate differs from durable control");
  }
  const successorGate = Object.freeze({
    field: "Revalidation Passed",
    value: repairGateValue(repairPending),
  });
  const repairAuthorization = Object.freeze({
    repairPendingSha256: hashRepairPendingReceipt(repairPending),
    priorGate: priorGateHash,
    successorGate: hashedGateReceipt(successorGate),
  });
  const authorizedAnchor = buildClosureAnchor(
    anchor.evidenceSha256,
    anchor.closureControl,
    repairAuthorization
  );
  const anchorLine = formatClosureAnchor(authorizedAnchor);
  let mutationError = null;
  try {
    await runMutatingAgent(
      "Repository " +
        ROOT +
        ". Authorize only the exact TASK-540 closure-leaf gate repair before task-state reopen. " +
        "Edit only _docs/_CHANGELOG/README.md. Replace the single TASK-540 closure anchor with this " +
        "exact standalone line: `" +
        anchorLine +
        "`. Preserve every other byte, row, reservation, task, changelog file, source, test, stage, " +
        "and commit. Authorization label: " +
        label +
        ".",
      { label: "closure-repair-authorization:540:" + label, phase: "Final drift" },
      closureRepairAuthorizationOwner,
      false
    );
  } catch (error) {
    mutationError = error;
  }
  let verificationError = null;
  try {
    await verifyClosureAnchor(authorizedAnchor, "TASK-540 closure-leaf repair authorization");
  } catch (error) {
    verificationError = error;
  }
  if (mutationError || verificationError) {
    const primaryError =
      mutationError && verificationError
        ? new AggregateError(
            [mutationError, verificationError],
            "TASK-540 repair authorization mutation and verification both failed"
          )
        : (mutationError ?? verificationError);
    try {
      await restoreClosureAnchorSnapshot(anchorSnapshot, "repair-authorization:" + label);
    } catch (rollbackError) {
      throw new AggregateError(
        [primaryError, rollbackError],
        "TASK-540 repair authorization and exact anchor rollback both failed"
      );
    }
    throw primaryError;
  }
  return Object.freeze({ authorizedAnchor, successorGate });
}

async function reopenClosureLeafUngated(leaf, label, phaseName) {
  const group = LEAF_STATUS_GROUPS[leaf.id];
  if (leaf.id !== "540-06-L01" || !group) {
    throw new Error("TASK-540 ungated remediation requires the closure leaf");
  }
  if (await readSharedClosurePending()) {
    throw new Error("TASK-540 ungated closure remediation cannot run after Closure Pending");
  }
  const indexState = classifyClosureEvidenceIndex(
    await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8"),
    "TASK-540 ungated closure remediation authority"
  );
  if (indexState.kind !== "reserved" || EXISTING_CHANGELOG_REL) {
    throw new Error("TASK-540 ungated closure remediation requires reserved/no-anchor authority");
  }
  const owner = Object.freeze({
    id: "reopen-ungated-" + leaf.id,
    allowedFiles: Object.freeze([ROOT_TASK_PATH, group.childPath, group.leafPath]),
    requiredFiles: Object.freeze([]),
    taskContractMutations: Object.freeze([
      Object.freeze({
        relativePath: ROOT_TASK_PATH,
        tableTaskIds: [group.childId],
        mutableFields: [],
      }),
      Object.freeze({
        relativePath: group.childPath,
        tableTaskIds: [leaf.id],
        mutableFields: Object.freeze(["Fix Started", "Implementation Complete"]),
      }),
      Object.freeze({
        relativePath: group.leafPath,
        tableTaskIds: [],
        mutableFields: Object.freeze([
          "Fix Started",
          "Implementation Complete",
          "Targeted Gate Passed",
          "Revalidation Passed",
        ]),
      }),
    ]),
  });
  const rollbackOwner = Object.freeze({
    id: owner.id + "-rollback",
    allowedFiles: Object.freeze([...owner.allowedFiles, "_docs/_TASKS/README.md"]),
    requiredFiles: Object.freeze([]),
  });
  const transactionSnapshot = await captureExactRollbackFiles(
    rollbackOwner.allowedFiles,
    "TASK-540 ungated closure repair pre-dispatch"
  );
  const boardBefore = requireExactRollbackSnapshotUtf8(
    transactionSnapshot,
    "_docs/_TASKS/README.md",
    "TASK-540 ungated closure repair"
  );
  if (readTask540BoardState(boardBefore).bucket !== "inProgress") {
    throw new Error("TASK-540 ungated closure remediation requires an active board row");
  }
  const closureReceiptsBefore = await captureClosureContractReceipts();
  const closureLeafSnapshot = requireExactRollbackSnapshotEntry(
    transactionSnapshot,
    group.leafPath,
    "TASK-540 ungated closure repair"
  );
  const oldGate = readClosureLeafGateReceipt(
    parseCanonicalTaskStatusSource(
      exactRollbackEntryUtf8(closureLeafSnapshot, "TASK-540 ungated closure repair"),
      group.leafPath
    ).source,
    "TASK-540 ungated closure repair"
  );

  let mutationError = null;
  try {
    await runMutatingAgent(
      "Repository " +
        ROOT +
        ". Prepare only TASK-540-06-L01 for pre-closure ungated remediation. Edit only " +
        JSON.stringify(owner.allowedFiles) +
        ". Keep root, TASK-540-06, and TASK-540-06-L01 canonically 🚧 In Progress and synchronize " +
        "only their existing root/child table rows. Preserve every root metadata field. On only the " +
        "closure parent and leaf write `**Fix Started:** " +
        RUN_DATE +
        "`. Remove the leaf's exact old gate `**" +
        oldGate.field +
        ":** " +
        oldGate.value +
        "`; remove Implementation Complete from the active closure parent and leaf, and do not write Targeted Gate Passed, Revalidation Passed, Repair Pending, Completed, " +
        "or any closure receipt. Preserve the task board and every unrelated byte. Never edit the " +
        "changelog, source, tests, product docs, workflow, stage, or commit. Reason: " +
        label +
        ".",
      { label: "reopen-ungated:" + leaf.id + ":" + label, phase: phaseName },
      owner,
      false
    );
  } catch (error) {
    mutationError = error;
  }

  let verificationError = null;
  try {
    const [rootState, childState, leafState, boardSource] = await Promise.all([
      readCanonicalTaskStatus(ROOT_TASK_PATH),
      readCanonicalTaskStatus(group.childPath),
      readCanonicalTaskStatus(group.leafPath),
      readFile(TASKS + "/README.md", "utf8"),
    ]);
    for (const [index, state] of [rootState, childState, leafState].entries()) {
      requireAbsentCompleted(
        readTaskMetadataField(state.source, "Completed"),
        "TASK-540 ungated closure repair contract " + index
      );
      requireAbsentImplementationComplete(
        readTaskMetadataField(state.source, "Implementation Complete"),
        "TASK-540 ungated closure repair contract " + index
      );
    }
    if (
      [rootState, childState, leafState].some(
        ({ status, source }) =>
          status !== RESUME_TASK_STATUS.active || readTaskMetadataField(source, "Repair Pending")
      ) ||
      readTaskMetadataField(childState.source, "Fix Started") !== RUN_DATE ||
      readTaskMetadataField(leafState.source, "Fix Started") !== RUN_DATE ||
      CLOSURE_GATE_FIELDS.some((field) => readTaskMetadataField(leafState.source, field))
    ) {
      throw new Error("TASK-540 pre-closure ungated repair state is not exact");
    }
    requireTableStatus(childState.source, leaf.id, RESUME_TASK_STATUS.active, "TASK-540 child");
    requireTableStatus(rootState.source, group.childId, RESUME_TASK_STATUS.active, "TASK-540 root");
    if (boardSource !== boardBefore) {
      throw new Error("TASK-540 ungated closure repair changed the board or statistics");
    }
    await verifyClosureContractReceipts(
      closureReceiptsBefore,
      "TASK-540 pre-closure ungated repair",
      { allowGateChange: true }
    );
  } catch (error) {
    verificationError = error;
  }

  if (mutationError || verificationError) {
    const primaryError =
      mutationError && verificationError
        ? new AggregateError(
            [mutationError, verificationError],
            "TASK-540 ungated repair mutation and verification both failed"
          )
        : (mutationError ?? verificationError);
    try {
      await restoreExactRollbackFiles(
        transactionSnapshot,
        rollbackOwner,
        "TASK-540 ungated closure repair rollback"
      );
    } catch (rollbackError) {
      throw new AggregateError(
        [primaryError, rollbackError],
        "TASK-540 ungated repair failure and exact transaction rollback both failed"
      );
    }
    throw primaryError;
  }
  return Object.freeze({ mode: "ungated-closure", repairPending: null });
}

async function reopenLeafForRepair(leaf, label, phaseName) {
  const group = LEAF_STATUS_GROUPS[leaf.id];
  if (!group) throw new Error("TASK-540 repair owner is missing for " + leaf.id);
  const isClosureLeaf = leaf.id === "540-06-L01";
  if (isClosureLeaf && !(await readSharedClosurePending())) {
    const indexState = classifyClosureEvidenceIndex(
      await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8"),
      "TASK-540 pre-closure repair authority"
    );
    if (indexState.kind === "reserved") {
      if (EXISTING_CHANGELOG_REL) {
        throw new Error("TASK-540 reserved pre-closure repair found an unowned changelog draft");
      }
      return reopenClosureLeafUngated(leaf, label, phaseName);
    }
  }
  const owner = Object.freeze({
    id: "reopen-" + leaf.id,
    allowedFiles: Object.freeze([ROOT_TASK_PATH, group.childPath, group.leafPath]),
    requiredFiles: Object.freeze([]),
    taskContractMutations: Object.freeze([
      Object.freeze({
        relativePath: ROOT_TASK_PATH,
        tableTaskIds: [group.childId],
        mutableFields: [],
      }),
      Object.freeze({
        relativePath: group.childPath,
        tableTaskIds: [leaf.id],
        mutableFields: Object.freeze(["Fix Started", "Implementation Complete", "Completed"]),
      }),
      Object.freeze({
        relativePath: group.leafPath,
        tableTaskIds: [],
        mutableFields: Object.freeze([
          "Fix Started",
          "Implementation Complete",
          "Completed",
          "Targeted Gate Passed",
          "Revalidation Passed",
          "Repair Pending",
        ]),
      }),
    ]),
  });
  const rollbackOwner = Object.freeze({
    id: owner.id + "-rollback",
    allowedFiles: Object.freeze([
      ...owner.allowedFiles,
      "_docs/_TASKS/README.md",
      ...(isClosureLeaf ? ["_docs/_CHANGELOG/README.md"] : []),
    ]),
    requiredFiles: Object.freeze([]),
  });
  const transactionSnapshot = await captureExactRollbackFiles(
    rollbackOwner.allowedFiles,
    "TASK-540 source repair pre-authorization " + leaf.id
  );
  const boardSourceBefore = requireExactRollbackSnapshotUtf8(
    transactionSnapshot,
    "_docs/_TASKS/README.md",
    "TASK-540 source repair"
  );
  if (readTask540BoardState(boardSourceBefore).bucket !== "inProgress") {
    throw new Error("TASK-540 source repair requires the board already In Progress");
  }
  const closureReceiptsBefore = await captureClosureContractReceipts();
  const repairPending =
    "generation " +
    randomUUID().replaceAll("-", "") +
    " / token " +
    randomUUID().replaceAll("-", "");
  parseRepairPending(repairPending, "TASK-" + leaf.id + " generated repair");
  let closureAuthorization = null;
  let reopenMutationError = null;
  try {
    if (isClosureLeaf) {
      const closureLeafSnapshot = requireExactRollbackSnapshotEntry(
        transactionSnapshot,
        group.leafPath,
        "TASK-540 closure-leaf repair"
      );
      closureAuthorization = await authorizeClosureLeafRepair(
        repairPending,
        readClosureLeafGateReceipt(
          parseCanonicalTaskStatusSource(
            exactRollbackEntryUtf8(closureLeafSnapshot, "TASK-540 closure-leaf repair"),
            group.leafPath
          ).source,
          "TASK-540 closure-leaf repair"
        ),
        label
      );
    }
    await runMutatingAgent(
      "Repository " +
        ROOT +
        ". Reopen only the verified TASK-540 final-drift source owner " +
        leaf.id +
        " for repair. Read the root, exact child/leaf and task board fresh. Edit only " +
        JSON.stringify(owner.allowedFiles) +
        ". Set the exact leaf, its child and root TASK-540 to 🚧 In Progress; synchronize their " +
        "status tables; require TASK-540's board row to already be 🚧 In progress and preserve the " +
        "entire board byte-identically, including statistics. Preserve every root metadata field " +
        "byte-identically. On only the exact child and leaf add/update a dedicated Fix Started field dated " +
        RUN_DATE +
        ". On the exact leaf write `**Repair Pending:** " +
        repairPending +
        "`; remove its Completed, Targeted Gate Passed, and Revalidation Passed fields so no old " +
        "gate can satisfy this repair. Remove Implementation Complete from the active leaf and remove " +
        "Completed plus Implementation Complete from the active direct child. Keep unrelated " +
        "task/changelog state byte-identical. Never edit source/tests here, stage, " +
        "or commit. Reason: " +
        label +
        ".",
      { label: "reopen:" + leaf.id + ":" + label, phase: phaseName },
      owner,
      false
    );
  } catch (error) {
    reopenMutationError = error;
  }

  let reopenVerificationError = null;
  try {
    const [rootState, childState, leafState, boardSource] = await Promise.all([
      readCanonicalTaskStatus(ROOT_TASK_PATH),
      readCanonicalTaskStatus(group.childPath),
      readCanonicalTaskStatus(group.leafPath),
      readFile(TASKS + "/README.md", "utf8"),
    ]);
    if (
      rootState.status !== "🚧 In Progress" ||
      childState.status !== "🚧 In Progress" ||
      leafState.status !== "🚧 In Progress"
    ) {
      throw new Error("TASK-540 failed to reopen source owner " + leaf.id);
    }
    requireTableStatus(childState.source, leaf.id, "🚧 In Progress", "TASK-540 child");
    requireTableStatus(rootState.source, group.childId, "🚧 In Progress", "TASK-540 root");
    requireAbsentCompleted(
      readTaskMetadataField(rootState.source, "Completed"),
      "TASK-540 reopened root"
    );
    requireAbsentCompleted(
      readTaskMetadataField(childState.source, "Completed"),
      "TASK-540 reopened child " + group.childId
    );
    requireAbsentCompleted(
      readTaskMetadataField(leafState.source, "Completed"),
      "TASK-540 reopened leaf " + leaf.id
    );
    requireAbsentImplementationComplete(
      readTaskMetadataField(rootState.source, "Implementation Complete"),
      "TASK-540 reopened root"
    );
    requireAbsentImplementationComplete(
      readTaskMetadataField(childState.source, "Implementation Complete"),
      "TASK-540 reopened child " + group.childId
    );
    requireAbsentImplementationComplete(
      readTaskMetadataField(leafState.source, "Implementation Complete"),
      "TASK-540 reopened leaf " + leaf.id
    );
    if (
      readTaskMetadataField(leafState.source, "Repair Pending") !== repairPending ||
      readTaskMetadataField(leafState.source, "Targeted Gate Passed") ||
      readTaskMetadataField(leafState.source, "Revalidation Passed") ||
      readTaskMetadataField(rootState.source, "Repair Pending") ||
      readTaskMetadataField(childState.source, "Repair Pending") ||
      readTaskMetadataField(childState.source, "Fix Started") !== RUN_DATE ||
      readTaskMetadataField(leafState.source, "Fix Started") !== RUN_DATE
    ) {
      throw new Error("TASK-540 invalid persisted repair state for " + leaf.id);
    }
    if (boardSource !== boardSourceBefore) {
      throw new Error("TASK-540 source repair changed the board or its statistics");
    }
    const boardState = readTask540BoardState(boardSource);
    if (boardState.bucket !== "inProgress") {
      throw new Error("TASK-540 board was not reopened for source repair");
    }
    await verifyClosureContractReceipts(
      closureReceiptsBefore,
      "TASK-540 source repair reopen " + leaf.id,
      { allowGateChange: isClosureLeaf }
    );
    if (isClosureLeaf) {
      if (!closureAuthorization) {
        throw new Error("TASK-540 closure-leaf repair lost its prior authorization");
      }
      await verifyClosureAnchor(
        closureAuthorization.authorizedAnchor,
        "TASK-540 closure-leaf repair persisted authorization"
      );
    }
  } catch (error) {
    reopenVerificationError = error;
  }

  if (reopenMutationError || reopenVerificationError) {
    const primaryError =
      reopenMutationError && reopenVerificationError
        ? new AggregateError(
            [reopenMutationError, reopenVerificationError],
            "TASK-540 source repair reopen dispatch and persisted-state verification both failed"
          )
        : (reopenMutationError ?? reopenVerificationError);
    try {
      await restoreExactRollbackFiles(
        transactionSnapshot,
        rollbackOwner,
        "TASK-540 source repair rollback " + leaf.id
      );
    } catch (rollbackError) {
      throw new AggregateError(
        [primaryError, rollbackError],
        "TASK-540 source repair failure and exact transaction rollback both failed"
      );
    }
    throw primaryError;
  }
  return Object.freeze({ mode: "repair-pending", repairPending });
}

async function capturePersistedRepairInvariant(leaf, repairPending) {
  const group = LEAF_STATUS_GROUPS[leaf.id];
  if (!group) throw new Error("TASK-540 repair invariant owner is missing");
  const closureReceipts = await Promise.all(
    closureContractPaths().map(async (relativePath) => {
      const { source } = await readCanonicalTaskStatus(relativePath);
      return Object.freeze({
        relativePath,
        closurePending: readTaskMetadataField(source, "Closure Pending"),
        closureEvidence: readTaskMetadataField(source, "Closure Evidence SHA-256"),
        closureGeneration: readTaskMetadataField(source, "Closure Generation"),
        closureBoardBaseline: readTaskMetadataField(source, "Closure Board Baseline"),
        closureChangelogPath: readTaskMetadataField(source, CLOSURE_CHANGELOG_PATH_FIELD),
        targetedGate: readTaskMetadataField(source, "Targeted Gate Passed"),
        revalidation: readTaskMetadataField(source, "Revalidation Passed"),
      });
    })
  );
  const resume = await resolveLeafResumeState();
  const changelog = await resolveChangelogResumeState(resume);
  await validateResumeGraphCoverage(
    resume,
    changelog,
    "TASK-540 persisted repair invariant " + leaf.id
  );
  if (
    resume.mode !== "repair" ||
    resume.repair?.id !== leaf.id ||
    resume.repair?.pending !== repairPending
  ) {
    throw new Error("TASK-540 persisted repair is not exactly resumable for " + leaf.id);
  }
  return Object.freeze({
    repairPending,
    closureReceipts: JSON.stringify(closureReceipts),
  });
}

async function verifyPersistedRepairInvariant(leaf, invariant) {
  const current = await capturePersistedRepairInvariant(leaf, invariant.repairPending);
  if (current.closureReceipts !== invariant.closureReceipts) {
    throw new Error("TASK-540 repair fixer changed a closure receipt for " + leaf.id);
  }
}

async function runRepairMutationWithInvariant(
  prompt,
  options,
  owner,
  leaf,
  invariant,
  requireOwned = false
) {
  const group = LEAF_STATUS_GROUPS[leaf.id];
  if (!group) throw new Error(options.label + ": repair rollback status group is missing");
  const taskAuthorityPaths = [ROOT_TASK_PATH, group.childPath, group.leafPath];
  const ownedTaskAuthorityPaths = taskAuthorityPaths.filter((relativePath) =>
    owner.allowedFiles.includes(relativePath)
  );
  if (
    ownedTaskAuthorityPaths.length > 0 &&
    ownedTaskAuthorityPaths.length !== taskAuthorityPaths.length
  ) {
    throw new Error(options.label + ": repair fixer has only partial task authority");
  }
  const protectsTaskAuthority = ownedTaskAuthorityPaths.length === taskAuthorityPaths.length;
  const rollbackAuthorityPaths = protectsTaskAuthority
    ? [...taskAuthorityPaths, "_docs/_TASKS/README.md"]
    : [];
  const rollbackOwner = protectsTaskAuthority
    ? Object.freeze({
        id: options.label + "-task-authority-rollback",
        allowedFiles: Object.freeze(rollbackAuthorityPaths),
        requiredFiles: Object.freeze([]),
      })
    : null;
  const authoritySnapshot = protectsTaskAuthority
    ? await captureExactRollbackFiles(
        rollbackAuthorityPaths,
        options.label + " task-authority pre-fixer"
      )
    : null;
  const authorityPathSet = new Set(rollbackAuthorityPaths);
  const allowedResidualPaths = protectsTaskAuthority
    ? owner.allowedFiles.filter((relativePath) => !authorityPathSet.has(relativePath))
    : [];
  let mutationResult = null;
  let mutationError = null;
  try {
    mutationResult = await runMutatingAgent(prompt, options, owner, requireOwned);
  } catch (error) {
    mutationError = error;
  }

  let invariantError = null;
  try {
    await verifyPersistedRepairInvariant(leaf, invariant);
  } catch (error) {
    invariantError = error;
  }

  const primaryError =
    mutationError && invariantError
      ? new AggregateError(
          [mutationError, invariantError],
          options.label + ": mutation failed and persisted repair verification also failed"
        )
      : (mutationError ?? invariantError);
  if (primaryError) {
    if (authoritySnapshot && rollbackOwner) {
      try {
        await restoreExactRollbackFiles(
          authoritySnapshot,
          rollbackOwner,
          options.label + " task-authority rollback",
          { allowedResidualPaths }
        );
      } catch (rollbackError) {
        throw new AggregateError(
          [primaryError, rollbackError],
          options.label + ": repair failure and task-authority rollback both failed"
        );
      }
    }
    throw primaryError;
  }
  return mutationResult;
}

async function fixAuditFindings(findings, label, phaseName, { afterClosure = false } = {}) {
  if (findings.some((finding) => finding.owner === "orchestrator")) {
    throw new Error(label + ": task/workflow contract drift requires orchestrator intervention");
  }
  for (const ownerId of LEAF_ORDER) {
    const owned = findings.filter((finding) => finding.owner === ownerId);
    if (owned.length === 0) continue;
    const leaf = LEAF_BY_ID.get(ownerId);
    const fixOwner = effectiveRepairMutationOwner(leaf, { afterClosure });
    const remediation = await reopenLeafForRepair(leaf, label + "-verified-fix", phaseName);
    const fixPrompt =
      COMMON +
      "\n\nFix only these verified " +
      label +
      " findings owned by " +
      ownerId +
      ". Edit only " +
      JSON.stringify(fixOwner.allowedFiles) +
      leafRestrictionPrompt(leaf) +
      (afterClosure
        ? " The exact root/child/leaf task files are allowed only for findings evidenced in those contracts; keep their active repair statuses and unrelated rows unchanged until the status transition closes this exact owner."
        : "") +
      (remediation.mode === "ungated-closure"
        ? " The pre-closure closure leaf is deliberately active and ungated: do not add Repair Pending, a gate receipt, closure authorization, Completed, or closure receipts during this source/test/docs fixer."
        : "") +
      ". Findings: " +
      JSON.stringify(owned);
    if (remediation.mode === "repair-pending") {
      const repairInvariant = await capturePersistedRepairInvariant(
        leaf,
        remediation.repairPending
      );
      await runRepairMutationWithInvariant(
        fixPrompt,
        { label: label + ":fix:" + ownerId, phase: phaseName },
        fixOwner,
        leaf,
        repairInvariant,
        false
      );
    } else if (
      remediation.mode === "ungated-closure" &&
      ownerId === "540-06-L01" &&
      remediation.repairPending === null
    ) {
      await runMutatingAgent(
        fixPrompt,
        { label: label + ":fix:" + ownerId, phase: phaseName },
        fixOwner,
        false
      );
    } else {
      throw new Error(label + ": unsupported remediation mode for " + ownerId);
    }
    const gate = await runLeafGate(leaf, label, phaseName);
    if (!gate.pass) throw new Error(label + ": owner re-gate failed for " + ownerId);
    await transitionLeafStatus(
      leaf,
      "complete",
      label + "-regate-green",
      remediation.mode === "repair-pending" ? remediation.repairPending : null
    );
    if (ownerId !== "540-06-L01" && sourceOwnerTestHashesAtClosureBoundary !== null) {
      await captureSourceOwnerTestHashBoundary(label + ":source-regate:" + ownerId);
    }
  }
}

async function runPostAudit() {
  phase("Post-audit");
  for (let round = 1; round <= 2; round += 1) {
    const results = await Promise.all(
      POST_AUDIT_LENSES.map(async ([id, lens]) => ({
        id,
        result: await runReadOnlyAgent(
          "Fresh read-only TASK-540 post-audit round " +
            round +
            " at " +
            ROOT +
            ". Read every TASK-540 contract, current source/tests/docs, HEAD/status/full diff. " +
            "Lens: " +
            lens +
            " Return every evidence-backed HIGH/MEDIUM/LOW with concrete file:line and assign " +
            "the exact sole owner leaf; use owner=orchestrator only for immutable task/workflow " +
            "drift. This pre-smoke pass checks source/tests/docs and smoke feasibility only and " +
            "must not claim runtime receipts, screenshots, or browser evidence. No edits.",
          {
            label: "post-audit:" + id + ":" + round,
            phase: "Post-audit",
            schema: AUDIT_SCHEMA,
          }
        ),
      }))
    );
    requireAllResults(
      results,
      POST_AUDIT_LENSES.map(([id]) => id),
      "TASK-540 post-audit round " + round
    );
    const findings = results.flatMap(({ result }) => result.findings);
    if (findings.length === 0) return;
    if (round === 2) throw new Error("TASK-540 post-audit remained non-clean");
    await fixAuditFindings(findings, "post-audit-" + round, "Post-audit");
  }
}

function recursivelyFrozen(value, seen = new WeakSet()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return true;
  if (seen.has(value)) return true;
  if (!Object.isFrozen(value)) return false;
  seen.add(value);
  return Reflect.ownKeys(value).every((key) => recursivelyFrozen(value[key], seen));
}

let sealedSmokeEvidenceKeys = null;

function assertExecutorSafeProjection(value, label) {
  if (hasSensitiveEvidenceDeep(value)) {
    throw new Error(label + ": executor safe projection contains a sensitive value");
  }
  return value;
}

function canonicalSmokeEvidence(smoke) {
  if (
    !smoke ||
    typeof smoke !== "object" ||
    Array.isArray(smoke) ||
    smoke.schemaVersion !== 1 ||
    smoke.pass !== true ||
    typeof smoke.prefix !== "string" ||
    !/^wf540-[0-9a-f]{12}$/.test(smoke.prefix) ||
    !smoke.finalization ||
    !Array.isArray(smoke.finalization.screenshots) ||
    smoke.finalization.screenshots.length !== 13 ||
    Object.hasOwn(smoke, "closureControl") ||
    !recursivelyFrozen(smoke)
  ) {
    throw new Error("TASK-540 executor returned invalid canonical smoke evidence");
  }
  if (hasSensitiveEvidenceDeep(smoke)) {
    throw new Error("TASK-540 canonical smoke evidence contains a sensitive value");
  }
  const keys = Object.freeze(Object.keys(smoke));
  if (sealedSmokeEvidenceKeys === null) {
    sealedSmokeEvidenceKeys = keys;
  } else if (JSON.stringify(sealedSmokeEvidenceKeys) !== JSON.stringify(keys)) {
    throw new Error("TASK-540 canonical smoke evidence key set changed within one invocation");
  }
  return smoke;
}

const CLOSURE_CONTROL_KEYS = Object.freeze([
  "schemaVersion",
  "generation",
  "boardBaseline",
  "changelogPath",
  "gateReceipt",
]);
const CLOSURE_CONTROL_GATE_KEYS = Object.freeze(["field", "valueSha256"]);
const CLOSURE_ANCHOR_KEYS = Object.freeze([
  "schemaVersion",
  "evidenceSha256",
  "closureControl",
  "repairAuthorization",
]);
const REPAIR_AUTHORIZATION_KEYS = Object.freeze([
  "repairPendingSha256",
  "priorGate",
  "successorGate",
]);

function requireExactObjectKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + ": expected an object");
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(label + ": object keys are not exact");
  }
}

function closureGateValueHash(receipt) {
  if (!receipt || !CLOSURE_GATE_FIELDS.includes(receipt.field) || !receipt.value) {
    throw new Error("TASK-540 cannot hash an invalid closure gate receipt");
  }
  return createHash("sha256").update(receipt.value).digest("hex");
}

function hashRepairPendingReceipt(value) {
  parseRepairPending(value, "TASK-540 repair authorization");
  return createHash("sha256").update(value).digest("hex");
}

function hashedGateReceipt(receipt) {
  return Object.freeze({
    field: receipt.field,
    valueSha256: closureGateValueHash(receipt),
  });
}

function equalHashedGateReceipts(left, right) {
  return Boolean(
    left && right && left.field === right.field && left.valueSha256 === right.valueSha256
  );
}

function buildClosureControl(generation) {
  if (!closureBoardBaseline || !closureLeafGateReceipt) {
    throw new Error("TASK-540 cannot build closure control without its baseline and gate pin");
  }
  parsePositiveClosureGeneration(String(generation), "TASK-540 closure control");
  parseClosureBoardBaseline(closureBoardBaseline, "TASK-540 closure control");
  return Object.freeze({
    schemaVersion: 1,
    generation,
    boardBaseline: closureBoardBaseline,
    changelogPath: requireSafeTask540ChangelogPath(CHANGELOG_REL, "TASK-540 closure control"),
    gateReceipt: Object.freeze({
      field: closureLeafGateReceipt.field,
      valueSha256: closureGateValueHash(closureLeafGateReceipt),
    }),
  });
}

function validateGateHashReceipt(receipt, label) {
  requireExactObjectKeys(receipt, CLOSURE_CONTROL_GATE_KEYS, label);
  if (
    !CLOSURE_GATE_FIELDS.includes(receipt.field) ||
    typeof receipt.valueSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(receipt.valueSha256)
  ) {
    throw new Error(label + ": invalid hashed gate receipt");
  }
  return Object.freeze({ field: receipt.field, valueSha256: receipt.valueSha256 });
}

function validateClosureControl(control, label) {
  requireExactObjectKeys(control, CLOSURE_CONTROL_KEYS, label);
  if (control.schemaVersion !== 1) {
    throw new Error(label + ": unsupported schemaVersion");
  }
  const generation = parsePositiveClosureGeneration(String(control.generation), label);
  if (generation !== control.generation) {
    throw new Error(label + ": generation must be a positive integer number");
  }
  parseClosureBoardBaseline(control.boardBaseline, label);
  const changelogPath = requireSafeTask540ChangelogPath(control.changelogPath, label);
  if (changelogPath !== CHANGELOG_REL) {
    throw new Error(label + ": changelog path differs from the immutable program pin");
  }
  return Object.freeze({
    schemaVersion: 1,
    generation,
    boardBaseline: control.boardBaseline,
    changelogPath,
    gateReceipt: validateGateHashReceipt(control.gateReceipt, label + ".gateReceipt"),
  });
}

function parseClosureControlFromEvidenceBlock(block, label) {
  if ((block.match(/"closureControl"\s*:/g) ?? []).length !== 1) {
    throw new Error(label + ": closureControl is missing or duplicated");
  }
  const prefix = EVIDENCE_BEGIN + "\n```json\n";
  const suffix = "\n```\n" + EVIDENCE_END;
  if (!block.startsWith(prefix) || !block.endsWith(suffix)) {
    throw new Error(label + ": malformed canonical evidence framing");
  }
  let evidence;
  try {
    evidence = JSON.parse(block.slice(prefix.length, -suffix.length));
  } catch (error) {
    throw new Error(label + ": canonical evidence JSON is invalid", { cause: error });
  }
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new Error(label + ": canonical evidence payload is not an object");
  }
  if (sealedSmokeEvidenceKeys !== null) {
    requireExactObjectKeys(
      evidence,
      [...sealedSmokeEvidenceKeys, "closureControl"],
      label + " evidence"
    );
  }
  return validateClosureControl(evidence.closureControl, label + " closureControl");
}

function validateRepairAuthorization(value, label) {
  if (value === null) return null;
  requireExactObjectKeys(value, REPAIR_AUTHORIZATION_KEYS, label);
  if (
    typeof value.repairPendingSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.repairPendingSha256)
  ) {
    throw new Error(label + ": invalid Repair Pending hash");
  }
  return Object.freeze({
    repairPendingSha256: value.repairPendingSha256,
    priorGate: validateGateHashReceipt(value.priorGate, label + ".priorGate"),
    successorGate: validateGateHashReceipt(value.successorGate, label + ".successorGate"),
  });
}

function parseClosureAnchor(source, label, { required = false } = {}) {
  const matches = source.split("\n").filter((line) => line.startsWith(CLOSURE_ANCHOR_PREFIX));
  if (matches.length === 0) {
    if (required) throw new Error(label + ": closure anchor is missing");
    return null;
  }
  if (matches.length !== 1 || !matches[0].endsWith(CLOSURE_ANCHOR_SUFFIX)) {
    throw new Error(label + ": closure anchor is duplicated or malformed");
  }
  const exactSlot = "## Index\n" + matches[0] + "\n\n";
  if (source.split(exactSlot).length - 1 !== 1) {
    throw new Error(label + ": closure anchor is outside its exact index slot");
  }
  const json = matches[0].slice(CLOSURE_ANCHOR_PREFIX.length, -CLOSURE_ANCHOR_SUFFIX.length);
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(label + ": closure anchor JSON is invalid", { cause: error });
  }
  requireExactObjectKeys(parsed, CLOSURE_ANCHOR_KEYS, label + " anchor");
  if (
    parsed.schemaVersion !== 1 ||
    typeof parsed.evidenceSha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(parsed.evidenceSha256)
  ) {
    throw new Error(label + ": closure anchor header is invalid");
  }
  return Object.freeze({
    schemaVersion: 1,
    evidenceSha256: parsed.evidenceSha256,
    closureControl: validateClosureControl(parsed.closureControl, label + ".closureControl"),
    repairAuthorization: validateRepairAuthorization(
      parsed.repairAuthorization,
      label + ".repairAuthorization"
    ),
  });
}

function formatClosureAnchor(anchor) {
  return CLOSURE_ANCHOR_PREFIX + JSON.stringify(anchor) + CLOSURE_ANCHOR_SUFFIX;
}

async function readClosureAnchor({ required = false, label = "TASK-540" } = {}) {
  return parseClosureAnchor(await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8"), label, {
    required,
  });
}

function buildClosureAnchor(evidenceSha256, closureControl, repairAuthorization = null) {
  return Object.freeze({
    schemaVersion: 1,
    evidenceSha256,
    closureControl: validateClosureControl(closureControl, "TASK-540 anchor build"),
    repairAuthorization: validateRepairAuthorization(
      repairAuthorization,
      "TASK-540 anchor build repairAuthorization"
    ),
  });
}

async function verifyClosureAnchor(expected, label) {
  const actual = await readClosureAnchor({ required: true, label });
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(label + ": closure anchor differs from the expected durable control");
  }
  return actual;
}

function classifyClosureEvidenceIndex(source, label) {
  projectTask540IndexUnrelatedBytes(source, "evidence", label);
  const tableStart = source.indexOf("| No. | Date | Title | Type |");
  const prose = source.slice(0, tableStart);
  const starts = [
    prose.indexOf("Changelogs 1251, 1252, 1254, and 1257 remain reserved"),
    prose.indexOf("Changelog 1252 is consumed by the completed TASK-540 family."),
  ].filter((index) => index >= 0);
  const end = starts.length === 1 ? prose.indexOf(TASK_540_INDEX_SLOT_END, starts[0]) : -1;
  if (starts.length !== 1 || end < 0) {
    throw new Error(label + ": evidence index has no exact TASK-540 prose state");
  }
  const proseSlot = normalizeProse(prose.slice(starts[0], end));
  const reservedSlot = normalizeProse(TASK_540_RESERVED_PROSE);
  const consumedSlot = normalizeProse(
    TASK_540_CONSUMED_PROSE + " " + TASK_540_REMAINING_RESERVED_PROSE
  );
  const rows1252 = source.match(/^\| 1252 \|.*$/gm) ?? [];
  const anchor = parseClosureAnchor(source, label, { required: false });
  if (proseSlot === reservedSlot && rows1252.length === 0 && anchor === null) {
    return Object.freeze({ kind: "reserved", anchor: null });
  }
  if (
    proseSlot === consumedSlot &&
    rows1252.length === 1 &&
    isCanonicalTask540IndexRow(rows1252[0]) &&
    anchor
  ) {
    return Object.freeze({ kind: "consumed", anchor });
  }
  throw new Error(label + ": evidence index mixes reserved and consumed TASK-540 state");
}

async function captureClosureAnchorSnapshot(
  label,
  projectionMode,
  { includeChangelog = false } = {}
) {
  if (projectionMode !== "evidence" && projectionMode !== "anchor-only") {
    throw new Error(label + ": unsupported closure snapshot projection mode");
  }
  if (projectionMode === "evidence" && !includeChangelog) {
    throw new Error(label + ": evidence rollback must snapshot the pinned changelog file");
  }
  const relativePaths = ["_docs/_CHANGELOG/README.md"];
  if (includeChangelog) relativePaths.push(CHANGELOG_REL);
  const fileSnapshot = await captureExactRollbackFiles(relativePaths, label, {
    allowMissing: includeChangelog ? [CHANGELOG_REL] : [],
  });
  const source = exactRollbackEntryUtf8(fileSnapshot.entries[0], label);
  const evidenceIndexState = classifyClosureEvidenceIndex(source, label);
  if (projectionMode === "anchor-only" && evidenceIndexState.kind !== "consumed") {
    throw new Error(label + ": anchor-only rollback requires a canonical consumed index");
  }
  const indexState =
    projectionMode === "evidence"
      ? evidenceIndexState
      : Object.freeze({ kind: "anchor-only", anchor: evidenceIndexState.anchor });
  if (projectionMode === "anchor-only") {
    projectTask540IndexUnrelatedBytes(source, "anchor-only", label);
  }
  return Object.freeze({ projectionMode, indexState, fileSnapshot });
}

async function restoreClosureAnchorSnapshot(snapshot, label) {
  const rollbackOwner =
    snapshot.projectionMode === "evidence"
      ? closureEvidenceRollbackOwner
      : closureAnchorRollbackOwner;
  let mutationError = null;
  try {
    await restoreExactRollbackFiles(snapshot.fileSnapshot, rollbackOwner, label + " exact files");
  } catch (error) {
    mutationError = error;
  }
  let verificationError = null;
  try {
    const source = await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8");
    const restoredState =
      snapshot.projectionMode === "evidence"
        ? classifyClosureEvidenceIndex(source, label + " restored")
        : Object.freeze({
            kind: "anchor-only",
            anchor: parseClosureAnchor(source, label + " restored", { required: true }),
          });
    if (JSON.stringify(restoredState) !== JSON.stringify(snapshot.indexState)) {
      throw new Error(label + ": restored closure index state differs from its exact snapshot");
    }
    await verifyExactRollbackFiles(snapshot.fileSnapshot, label + " restored");
  } catch (error) {
    verificationError = error;
  }
  if (mutationError && verificationError) {
    throw new AggregateError(
      [mutationError, verificationError],
      label + ": exact rollback mutation and persisted verification both failed"
    );
  }
  if (mutationError) throw mutationError;
  if (verificationError) throw verificationError;
}

function smokeEvidenceBlock(smoke, closureControl) {
  const evidence = { ...canonicalSmokeEvidence(smoke), closureControl };
  return (
    EVIDENCE_BEGIN + "\n```json\n" + JSON.stringify(evidence, null, 2) + "\n```\n" + EVIDENCE_END
  );
}

function smokeEvidenceHash(smoke, closureControl) {
  return createHash("sha256").update(smokeEvidenceBlock(smoke, closureControl)).digest("hex");
}

async function readChangelogEvidenceControl(relativePath, label) {
  const source = await readFile(ROOT + "/" + relativePath, "utf8");
  if (hasSensitiveEvidenceDeep(source)) {
    throw new Error(label + ": changelog failed value-aware redaction");
  }
  const beginCount = source.split(EVIDENCE_BEGIN).length - 1;
  const endCount = source.split(EVIDENCE_END).length - 1;
  const start = source.indexOf(EVIDENCE_BEGIN);
  const end = source.indexOf(EVIDENCE_END, start + EVIDENCE_BEGIN.length);
  if (beginCount !== 1 || endCount !== 1 || start < 0 || end < 0) {
    throw new Error(label + ": canonical evidence block is missing or duplicated");
  }
  return parseClosureControlFromEvidenceBlock(
    source.slice(start, end + EVIDENCE_END.length),
    label
  );
}

async function verifyChangelogEvidence(smoke, closureControl) {
  const source = await readFile(ROOT + "/" + CHANGELOG_REL, "utf8");
  if (hasSensitiveEvidenceDeep(source)) {
    throw new Error("TASK-540 changelog failed value-aware redaction");
  }
  const expected = smokeEvidenceBlock(smoke, closureControl);
  const beginCount = source.split(EVIDENCE_BEGIN).length - 1;
  const endCount = source.split(EVIDENCE_END).length - 1;
  const start = source.indexOf(EVIDENCE_BEGIN);
  const end = source.indexOf(EVIDENCE_END, start + EVIDENCE_BEGIN.length);
  const actual =
    start >= 0 && end >= 0 ? source.slice(start, end + EVIDENCE_END.length) : "<missing>";
  if (beginCount !== 1 || endCount !== 1 || actual !== expected) {
    throw new Error("TASK-540 changelog smoke evidence block is not byte-identical");
  }
  const parsedControl = parseClosureControlFromEvidenceBlock(actual, "TASK-540 changelog");
  if (JSON.stringify(parsedControl) !== JSON.stringify(closureControl)) {
    throw new Error("TASK-540 changelog closureControl differs from the pinned control");
  }
  const expectedAnchor = buildClosureAnchor(
    createHash("sha256").update(expected).digest("hex"),
    closureControl,
    null
  );
  await verifyClosureAnchor(expectedAnchor, "TASK-540 changelog evidence");
  return expected;
}

function createSmokeExecutionController(execute) {
  if (typeof execute !== "function") {
    throw new Error("TASK-540 smoke execution controller requires one executor");
  }
  let invoked = false;
  return Object.freeze({
    async execute(input) {
      if (invoked) {
        throw new Error("TASK-540 smoke executor may run only once per top-level invocation");
      }
      invoked = true;
      return await execute(input);
    },
    hasExecuted() {
      return invoked;
    },
  });
}

const smokeExecutionController = createSmokeExecutionController(executeTask540SmokePlan);

function requireCleanSmokeEvidenceAudit(audit, label) {
  if (!audit || !Array.isArray(audit.findings)) {
    throw new Error(label + ": smoke evidence audit result is invalid");
  }
  if (audit.findings.length > 0) {
    throw new Error(
      label + ": smoke evidence audit found drift; this invocation stops without retry or fixer"
    );
  }
  return audit;
}

async function executeAndAuditSmokeEvidenceOnce({
  label,
  validation,
  nonce,
  plan,
  controller,
  snapshotRepository,
  auditRunner,
  phaseReporter,
}) {
  if (
    typeof label !== "string" ||
    label.length === 0 ||
    typeof nonce !== "string" ||
    !/^[0-9a-f]{12}$/.test(nonce) ||
    !plan ||
    !Array.isArray(plan.requiredScreenshotPaths) ||
    typeof snapshotRepository !== "function" ||
    typeof auditRunner !== "function" ||
    typeof phaseReporter !== "function"
  ) {
    throw new Error("TASK-540 one-shot smoke dependencies are invalid");
  }
  const screenshotPaths = Object.freeze([...plan.requiredScreenshotPaths]);
  if (
    screenshotPaths.length !== 13 ||
    new Set(screenshotPaths).size !== screenshotPaths.length ||
    screenshotPaths.some(
      (relativePath) =>
        typeof relativePath !== "string" ||
        !/^_docs\/_workflows\/_smoke\/task-540-[a-z0-9-]+\.png$/.test(relativePath)
    )
  ) {
    throw new Error("TASK-540 contract-derived screenshot path set is invalid");
  }
  const smoke = canonicalSmokeEvidence(
    await controller.execute({
      root: ROOT,
      nonce,
      assertSafeEvidence: assertExecutorSafeProjection,
      snapshotRepository,
    })
  );
  if (smoke.prefix !== "wf540-" + nonce) {
    throw new Error("TASK-540 executor evidence prefix differs from the one-shot plan");
  }
  const evidenceScreenshotPaths = smoke.finalization.screenshots.map(({ path }) => path);
  if (!sameUniqueSet(evidenceScreenshotPaths, screenshotPaths)) {
    throw new Error("TASK-540 executor screenshot evidence differs from the pure plan");
  }

  phaseReporter("Smoke evidence audit");
  const audit = requireCleanSmokeEvidenceAudit(
    await auditRunner(
      "Fresh read-only TASK-540 smoke evidence audit " +
        label +
        " at " +
        ROOT +
        ". Inspect the actual PNGs at the exact contract-derived paths " +
        JSON.stringify(screenshotPaths) +
        " and compare them to the sealed executor-owned canonical evidence. Verify the manifest " +
        "hash, contiguous browser/runtime receipts, visible/ARIA/computed/geometry/persistence " +
        "observations, exact route and authentication state transitions, fixture acquisition and " +
        "reverse cleanup/absence, terminal browser cleanup, screenshot identity/hash evidence, " +
        "owned host/process/port absence, restored bootstrap state, and zero unexpected console, " +
        "warning, or page-error channels. Return every H/M/L with concrete evidence. Assign source " +
        "drift to its exact TASK-540 leaf and executor/runtime/evidence drift to owner=orchestrator " +
        "with area=runtime-evidence. Do not edit, start runtime, execute browser commands, recover, " +
        "retry, or request a fixer. Any finding stops this top-level invocation. Evidence: " +
        JSON.stringify(smoke),
      {
        label: "smoke-evidence-audit:540:" + label,
        phase: "Smoke evidence audit",
        schema: AUDIT_SCHEMA,
      }
    ),
    "TASK-540 " + label
  );
  return Object.freeze({ smoke, audit, fullValidation: validation });
}

async function runSmokeEvidenceOnce(label, validation) {
  phase("Smoke");
  const nonce = randomUUID().replaceAll("-", "").slice(0, 12);
  const plan = buildTask540SmokePlan({ nonce });
  const screenshotPaths = Object.freeze([...plan.requiredScreenshotPaths]);
  return await executeAndAuditSmokeEvidenceOnce({
    label,
    validation,
    nonce,
    plan,
    controller: smokeExecutionController,
    snapshotRepository: () =>
      worktreeSnapshot("TASK-540 one-shot smoke repository snapshot", screenshotPaths),
    auditRunner: runReadOnlyAgent,
    phaseReporter: phase,
  });
}

const closureEvidenceOwner = Object.freeze({
  id: "540-06-L01-evidence",
  allowedFiles: Object.freeze(["_docs/_CHANGELOG/README.md", CHANGELOG_REL]),
  requiredFiles: Object.freeze([]),
  changelogIndexMutation: "evidence",
});
const closureRepairAuthorizationOwner = Object.freeze({
  id: "540-06-L01-repair-authorization",
  allowedFiles: Object.freeze(["_docs/_CHANGELOG/README.md"]),
  requiredFiles: Object.freeze([]),
  changelogIndexMutation: "anchor-only",
});
const closureAnchorRollbackOwner = Object.freeze({
  id: "540-06-L01-anchor-rollback",
  allowedFiles: Object.freeze(["_docs/_CHANGELOG/README.md"]),
  requiredFiles: Object.freeze([]),
  changelogIndexMutation: "anchor-recovery",
  skipChangelogIndexProjection: true,
});
const closureEvidenceRollbackOwner = Object.freeze({
  id: "540-06-L01-evidence-rollback",
  allowedFiles: closureEvidenceOwner.allowedFiles,
  requiredFiles: Object.freeze([]),
  changelogIndexMutation: "evidence",
  skipChangelogIndexProjection: true,
});
const CLOSURE_TASK_PATHS = Object.freeze([
  ROOT_TASK_PATH,
  LEAF_STATUS_GROUPS["540-06-L01"].childPath,
  LEAF_STATUS_GROUPS["540-06-L01"].leafPath,
]);
const CLOSURE_TASK_PATH_SET = new Set(CLOSURE_TASK_PATHS);
const SOURCE_DESCENDANT_TASK_PATHS = Object.freeze(
  TASK_PATHS.filter((relativePath) => !CLOSURE_TASK_PATH_SET.has(relativePath))
);
const closurePendingStatusOwner = Object.freeze({
  id: "540-06-L01-closure-pending",
  allowedFiles: Object.freeze([...CLOSURE_TASK_PATHS, "_docs/_TASKS/README.md"]),
  requiredFiles: CLOSURE_TASK_PATHS,
  taskContractMutations: Object.freeze([
    Object.freeze({
      relativePath: CLOSURE_TASK_PATHS[0],
      tableTaskIds: ["540-06"],
      mutableFields: ["Completed", ...CLOSURE_RECEIPT_FIELDS],
    }),
    Object.freeze({
      relativePath: CLOSURE_TASK_PATHS[1],
      tableTaskIds: ["540-06-L01"],
      mutableFields: ["Completed", ...CLOSURE_RECEIPT_FIELDS],
    }),
    Object.freeze({
      relativePath: CLOSURE_TASK_PATHS[2],
      tableTaskIds: [],
      mutableFields: ["Completed", ...CLOSURE_RECEIPT_FIELDS],
    }),
  ]),
});
const FULL_STATUS_ROLLBACK_PATHS = Object.freeze([...TASK_PATHS, "_docs/_TASKS/README.md"]);
const closureStatusRollbackOwner = Object.freeze({
  id: "540-06-L01-closure-rollback",
  allowedFiles: FULL_STATUS_ROLLBACK_PATHS,
  requiredFiles: Object.freeze([]),
  skipTaskBoardProjection: true,
});
const closurePendingStatusRollbackOwner = Object.freeze({
  id: "540-06-L01-pending-closure-rollback",
  allowedFiles: Object.freeze([
    ...closurePendingStatusOwner.allowedFiles,
    "_docs/_CHANGELOG/README.md",
  ]),
  requiredFiles: Object.freeze([]),
  skipTaskBoardProjection: true,
  skipChangelogIndexProjection: true,
});

function buildClosureStatusOwner(graph) {
  const activePathSet = new Set(graph.activePaths);
  if (
    !activePathSet.has(ROOT_TASK_PATH) ||
    !CLOSURE_TASK_PATHS.every((relativePath) => activePathSet.has(relativePath))
  ) {
    throw new Error("TASK-540 final status owner requires the active closure/root frontier");
  }
  const orderedActivePaths = FAMILY_STATUS_ORDER.filter((relativePath) =>
    activePathSet.has(relativePath)
  );
  if (orderedActivePaths.length !== activePathSet.size) {
    throw new Error("TASK-540 final status owner contains an unknown active path");
  }
  const activeLeafIds = new Set(graph.activeLeafIds);
  const activeChildIds = new Set(graph.activeChildIds);
  return Object.freeze({
    id: "540-06-L01-closure",
    allowedFiles: Object.freeze([...orderedActivePaths, "_docs/_TASKS/README.md"]),
    requiredFiles: Object.freeze([...orderedActivePaths]),
    taskContractMutations: Object.freeze(
      orderedActivePaths.map((relativePath) => {
        const leafId = LEAF_ORDER.find(
          (candidate) => LEAF_STATUS_GROUPS[candidate].leafPath === relativePath
        );
        const childId = CHILD_IDS_IN_LAND_ORDER.find((candidate) => {
          const candidateLeafId = LEAF_ORDER.find(
            (id) => LEAF_STATUS_GROUPS[id].childId === candidate
          );
          return LEAF_STATUS_GROUPS[candidateLeafId].childPath === relativePath;
        });
        const tableTaskIds = leafId
          ? []
          : relativePath === ROOT_TASK_PATH
            ? CHILD_IDS_IN_LAND_ORDER.filter((id) => activeChildIds.has(id))
            : LEAF_ORDER.filter(
                (id) => childId === LEAF_STATUS_GROUPS[id].childId && activeLeafIds.has(id)
              );
        return Object.freeze({
          relativePath,
          tableTaskIds: Object.freeze(tableTaskIds),
          mutableFields: Object.freeze([
            "Completed",
            ...(CLOSURE_TASK_PATH_SET.has(relativePath) ? CLOSURE_RECEIPT_FIELDS : []),
          ]),
        });
      })
    ),
  });
}

function assertTask540AtomicClosureContract() {
  const exactTasksLine =
    "Tasks: TASK-540, TASK-540-01, TASK-540-01-L01, TASK-540-02, TASK-540-02-L01, TASK-540-03, TASK-540-03-L01, TASK-540-04, TASK-540-04-L01, TASK-540-04-L02, TASK-540-04-L03, TASK-540-04-L04, TASK-540-05, TASK-540-05-L01, TASK-540-05-L02, TASK-540-06, TASK-540-06-L01";
  const expectedPendingFiles = [...CLOSURE_TASK_PATHS, "_docs/_TASKS/README.md"];
  const graph = (activeLeafIds, activeChildIds) => {
    const activePathSet = new Set([
      ...activeLeafIds.map((leafId) => LEAF_STATUS_GROUPS[leafId].leafPath),
      ...activeChildIds.map((childId) => {
        const leafId = LEAF_ORDER.find(
          (candidate) => LEAF_STATUS_GROUPS[candidate].childId === childId
        );
        return LEAF_STATUS_GROUPS[leafId].childPath;
      }),
      ROOT_TASK_PATH,
    ]);
    return Object.freeze({
      activePaths: Object.freeze(
        FAMILY_STATUS_ORDER.filter((relativePath) => activePathSet.has(relativePath))
      ),
      activeLeafIds: Object.freeze([...activeLeafIds]),
      activeChildIds: Object.freeze([...activeChildIds]),
    });
  };
  const initialOwner = buildClosureStatusOwner(
    graph([...LEAF_ORDER], [...CHILD_IDS_IN_LAND_ORDER])
  );
  const terminalReopenOwner = buildClosureStatusOwner(graph(["540-06-L01"], ["540-06"]));
  const sourceRepairOwner = buildClosureStatusOwner(
    graph(["540-04-L03", "540-06-L01"], ["540-04", "540-06"])
  );
  const expectedTerminalOrder = [
    LEAF_STATUS_GROUPS["540-06-L01"].leafPath,
    LEAF_STATUS_GROUPS["540-06-L01"].childPath,
    ROOT_TASK_PATH,
    "_docs/_TASKS/README.md",
  ];
  const expectedSourceRepairOrder = [
    LEAF_STATUS_GROUPS["540-04-L03"].leafPath,
    LEAF_STATUS_GROUPS["540-06-L01"].leafPath,
    LEAF_STATUS_GROUPS["540-04-L03"].childPath,
    LEAF_STATUS_GROUPS["540-06-L01"].childPath,
    ROOT_TASK_PATH,
    "_docs/_TASKS/README.md",
  ];
  const cases = [
    {
      label: "family changelog covers every physical contract in canonical order",
      pass: CHANGELOG_TASKS_LINE === exactTasksLine,
    },
    {
      label: "all-active final owner is mechanically leaf-child-root ordered",
      pass:
        JSON.stringify(initialOwner.allowedFiles) ===
          JSON.stringify([...FAMILY_STATUS_ORDER, "_docs/_TASKS/README.md"]) &&
        JSON.stringify(initialOwner.requiredFiles) === JSON.stringify(FAMILY_STATUS_ORDER),
    },
    {
      label: "pending owner remains limited to the three closure contracts and board",
      pass:
        JSON.stringify(closurePendingStatusOwner.allowedFiles) ===
          JSON.stringify(expectedPendingFiles) &&
        JSON.stringify(closurePendingStatusOwner.requiredFiles) ===
          JSON.stringify(CLOSURE_TASK_PATHS),
    },
    {
      label: "terminal reclosure owns only its covered active frontier in land order",
      pass:
        JSON.stringify(terminalReopenOwner.allowedFiles) === JSON.stringify(expectedTerminalOrder),
    },
    {
      label: "source repair reclosure owns repaired and closure frontiers in land order",
      pass:
        JSON.stringify(sourceRepairOwner.allowedFiles) ===
        JSON.stringify(expectedSourceRepairOrder),
    },
    {
      label: "source repair reclosure mutates only active child and root table rows",
      pass:
        JSON.stringify(
          sourceRepairOwner.taskContractMutations.map(({ relativePath, tableTaskIds }) => [
            relativePath,
            tableTaskIds,
          ])
        ) ===
        JSON.stringify([
          [LEAF_STATUS_GROUPS["540-04-L03"].leafPath, []],
          [LEAF_STATUS_GROUPS["540-06-L01"].leafPath, []],
          [LEAF_STATUS_GROUPS["540-04-L03"].childPath, ["540-04-L03"]],
          [LEAF_STATUS_GROUPS["540-06-L01"].childPath, ["540-06-L01"]],
          [ROOT_TASK_PATH, ["540-04", "540-06"]],
        ]),
    },
    {
      label: "final status cannot rewrite a leaf gate receipt",
      pass: [initialOwner, terminalReopenOwner, sourceRepairOwner].every((owner) =>
        owner.taskContractMutations.every(
          ({ mutableFields }) =>
            !mutableFields.includes("Targeted Gate Passed") &&
            !mutableFields.includes("Revalidation Passed") &&
            mutableFields.includes("Completed")
        )
      ),
    },
    {
      label: "final-status rollback owns the full 17-contract snapshot and board",
      pass:
        JSON.stringify(closureStatusRollbackOwner.allowedFiles) ===
        JSON.stringify(FULL_STATUS_ROLLBACK_PATHS),
    },
  ];
  for (const testCase of cases) {
    if (!testCase.pass) {
      throw new Error("TASK-540 atomic closure self-test failed: " + testCase.label);
    }
  }
  return cases.length;
}

function assertTask540CoverageContract() {
  const landed = (id, overrides = {}) => ({
    id,
    status: RESUME_TASK_STATUS.active,
    landed: true,
    completed: null,
    implementationComplete: implementationCompleteValue("2026-07-14"),
    targetedGate: "gate green",
    revalidation: null,
    repairPending: null,
    closurePending: null,
    ...overrides,
  });
  const expectRejected = (label, states, options) => {
    try {
      validateResumeLeafCoverageContract(states, options);
    } catch {
      return;
    }
    throw new Error("TASK-540 coverage self-test failed to reject: " + label);
  };
  const currentRepair = LEAF_ORDER.map((id) =>
    id === "540-04-L03"
      ? landed(id, {
          landed: false,
          implementationComplete: null,
          targetedGate: null,
          repairPending:
            "generation aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa / token bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        })
      : id === "540-06-L01"
        ? landed(id, {
            landed: false,
            implementationComplete: null,
            targetedGate: null,
          })
        : landed(id)
  );
  validateResumeLeafCoverageContract(currentRepair, {
    repairId: "540-04-L03",
    startLeafId: "540-04-L03",
  });

  const allActiveLanded = LEAF_ORDER.map((id) => landed(id));
  const allActiveSummary = validateResumeLeafCoverageContract(allActiveLanded, {
    startLeafId: null,
  });
  if (allActiveSummary.landedCount !== LEAF_ORDER.length || allActiveSummary.doneCount !== 0) {
    throw new Error("TASK-540 coverage self-test failed: all-active landed frontier");
  }

  const coveredDone = allActiveLanded.map((state) => ({
    ...state,
    status: RESUME_TASK_STATUS.done,
    completed: "2026-07-15",
  }));
  validateResumeLeafCoverageContract(coveredDone, { allowCoveredDone: true });
  expectRejected("pre-1252 Done", coveredDone, { allowCoveredDone: false });
  expectRejected(
    "Done without a gate",
    coveredDone.map((state, index) => (index === 0 ? { ...state, targetedGate: null } : state)),
    { allowCoveredDone: true }
  );
  expectRejected(
    "both gate fields",
    allActiveLanded.map((state, index) =>
      index === 0 ? { ...state, revalidation: "second gate" } : state
    ),
    {}
  );
  expectRejected(
    "active Completed",
    allActiveLanded.map((state, index) =>
      index === 0 ? { ...state, completed: "2026-07-15" } : state
    ),
    {}
  );
  const closurePending = allActiveLanded.map((state) =>
    state.id === "540-06-L01" ? { ...state, closurePending: "generation 1 / abcdef123456" } : state
  );
  expectRejected("uncovered Closure Pending", closurePending, {});
  validateResumeLeafCoverageContract(closurePending, { allowCoveredDone: true });
  const gateReceipt = Object.freeze({ field: "Targeted Gate Passed", value: "gate green" });
  const canonicalBoardBaseline = formatClosureBoardBaseline({
    toDo: 1,
    inProgress: 2,
    done: 3,
  });
  const closureControl = Object.freeze({
    schemaVersion: 1,
    generation: 3,
    boardBaseline: canonicalBoardBaseline,
    changelogPath: CHANGELOG_REL,
    gateReceipt: hashedGateReceipt(gateReceipt),
  });
  const canonicalAnchor = buildClosureAnchor("a".repeat(64), closureControl, null);
  const coveredAuthority = Object.freeze({
    mode: "terminal-reopen",
    path: CHANGELOG_REL,
    closurePending: null,
    generation: 3,
    evidenceHash: "a".repeat(64),
    boardBaseline: closureControl.boardBaseline,
    changelogPath: CHANGELOG_REL,
    gateReceipt,
    closureControl,
    anchor: canonicalAnchor,
  });
  if (!hasIndependentTask540CoverageAuthority(coveredAuthority)) {
    throw new Error("TASK-540 coverage self-test rejected independent terminal authority");
  }
  if (
    hasIndependentTask540CoverageAuthority({
      ...coveredAuthority,
      evidenceHash: "b".repeat(64),
    })
  ) {
    throw new Error("TASK-540 coverage self-test accepted tampered terminal authority");
  }
  if (
    hasIndependentTask540CoverageAuthority({
      ...coveredAuthority,
      boardBaseline: "To Do=1 / In Progress=2 / Done=3",
    })
  ) {
    throw new Error("TASK-540 coverage self-test accepted a non-canonical board baseline");
  }
  if (
    hasIndependentTask540CoverageAuthority({
      ...coveredAuthority,
      closureControl: { ...closureControl, unexpected: true },
    })
  ) {
    throw new Error("TASK-540 coverage self-test accepted mutated closure authority");
  }
  return 12;
}

function assertTask540CompletionMetadataContract() {
  const expectRejected = (label, callback) => {
    try {
      callback();
    } catch {
      return;
    }
    throw new Error("TASK-540 completion metadata self-test failed to reject: " + label);
  };
  const receiptDateAtOffset = (days) =>
    new Date(Date.parse(RUN_DATE + "T00:00:00.000Z") + days * 86_400_000)
      .toISOString()
      .slice(0, 10);
  const priorDate = receiptDateAtOffset(-1);
  const futureDate = receiptDateAtOffset(1);
  const path = LEAF_STATUS_GROUPS["540-04-L03"].leafPath;
  requireCanonicalCompleted(priorDate, "TASK-540 metadata self-test prior");
  requireCanonicalCompleted(RUN_DATE, "TASK-540 metadata self-test current");
  requireCanonicalImplementationComplete(
    implementationCompleteValue(priorDate),
    "TASK-540 metadata self-test prior"
  );
  requireCanonicalImplementationComplete(
    implementationCompleteValue(RUN_DATE),
    "TASK-540 metadata self-test current"
  );
  requireAbsentCompleted(null, "TASK-540 metadata self-test absent");
  requireAbsentImplementationComplete(null, "TASK-540 metadata self-test absent");
  requireFinalCompletedForEntry(
    path,
    RUN_DATE,
    {
      statusByPath: { [path]: RESUME_TASK_STATUS.active },
      completedByPath: { [path]: null },
    },
    "TASK-540 metadata self-test active"
  );
  requireFinalCompletedForEntry(
    path,
    priorDate,
    {
      statusByPath: { [path]: RESUME_TASK_STATUS.done },
      completedByPath: { [path]: priorDate },
    },
    "TASK-540 metadata self-test covered"
  );
  expectRejected("future Completed", () =>
    requireCanonicalCompleted(futureDate, "TASK-540 metadata self-test")
  );
  expectRejected("malformed Completed", () =>
    requireCanonicalCompleted("2026-7-15", "TASK-540 metadata self-test")
  );
  expectRejected("future Implementation Complete", () =>
    requireCanonicalImplementationComplete(
      futureDate + IMPLEMENTATION_COMPLETE_SUFFIX,
      "TASK-540 metadata self-test"
    )
  );
  expectRejected("non-canonical Implementation Complete suffix", () =>
    requireCanonicalImplementationComplete(
      priorDate + " — implementation complete",
      "TASK-540 metadata self-test"
    )
  );
  expectRejected("unexpected Completed", () =>
    requireAbsentCompleted(priorDate, "TASK-540 metadata self-test")
  );
  expectRejected("unexpected Implementation Complete", () =>
    requireAbsentImplementationComplete(
      implementationCompleteValue(priorDate),
      "TASK-540 metadata self-test"
    )
  );
  expectRejected("newly active prior Completed", () =>
    requireFinalCompletedForEntry(
      path,
      priorDate,
      {
        statusByPath: { [path]: RESUME_TASK_STATUS.active },
        completedByPath: { [path]: null },
      },
      "TASK-540 metadata self-test"
    )
  );
  expectRejected("covered Done changed Completed", () =>
    requireFinalCompletedForEntry(
      path,
      RUN_DATE,
      {
        statusByPath: { [path]: RESUME_TASK_STATUS.done },
        completedByPath: { [path]: priorDate },
      },
      "TASK-540 metadata self-test"
    )
  );
  return 16;
}

function assertTask540BoardStateContract() {
  const expectRejected = (label, source) => {
    try {
      readTask540BoardState(source);
    } catch {
      return;
    }
    throw new Error("TASK-540 board-state self-test failed to reject: " + label);
  };
  const row = (notes, extraCell = "") =>
    "| TASK-540 | Synthetic title | High | Large | " +
    notes +
    (extraCell ? " | " + extraCell : "") +
    " |";
  const source = (bucket, taskRow, duplicate = false) => {
    const stats = "- **To Do:** 1 tasks\n- **In Progress:** 2 tasks\n- **Done:** 3 tasks\n\n";
    const rowsByBucket = {
      toDo: bucket === "toDo" ? taskRow : "",
      inProgress: bucket === "inProgress" ? taskRow : "",
      done: bucket === "done" ? taskRow : "",
    };
    if (duplicate) rowsByBucket[bucket] += "\n" + taskRow;
    return (
      stats +
      "## To Do\n" +
      rowsByBucket.toDo +
      "\n\n## In Progress\n" +
      rowsByBucket.inProgress +
      "\n\n## Done\n" +
      rowsByBucket.done +
      "\n"
    );
  };
  const valid = [
    ["toDo", row("⏳ To Do synthetic")],
    ["inProgress", row("🚧 In progress synthetic")],
    ["done", row("✅ Done synthetic")],
  ];
  for (const [bucket, taskRow] of valid) {
    const state = readTask540BoardState(source(bucket, taskRow));
    if (state.bucket !== bucket || state.cells.length !== 5) {
      throw new Error("TASK-540 board-state self-test rejected canonical " + bucket + " row");
    }
  }
  expectRejected(
    "marker merely later in Notes",
    source("inProgress", row("Repair pending; 🚧 In progress synthetic"))
  );
  expectRejected("wrong bucket marker", source("toDo", row("🚧 In progress synthetic")));
  expectRejected("six cells", source("inProgress", row("🚧 In progress synthetic", "unexpected")));
  expectRejected("duplicate row", source("inProgress", row("🚧 In progress synthetic"), true));
  expectRejected("non-boundary marker prefix", source("done", row("✅ Donex synthetic")));
  return 8;
}
let closureGeneration = 0;
let closureBoardBaseline = null;
let closureLeafGateReceipt = null;

function seedClosureGeneration(resumeState) {
  const generation = resumeState.generation ?? 0;
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new Error("TASK-540 cannot seed an invalid closure generation");
  }
  closureGeneration = Math.max(closureGeneration, generation);
  const boardBaseline = resumeState.boardBaseline ?? null;
  const changelogPath = resumeState.changelogPath ?? null;
  const gateReceipt = resumeState.gateReceipt ?? null;
  if ((gateReceipt || changelogPath) && !boardBaseline) {
    throw new Error("TASK-540 closure receipt cannot resume without its board baseline");
  }
  if (boardBaseline) {
    if (
      !changelogPath ||
      requireSafeTask540ChangelogPath(changelogPath, "TASK-540 closure seed") !== CHANGELOG_REL
    ) {
      throw new Error("TASK-540 closure seed lost its pinned changelog path");
    }
    parseClosureBoardBaseline(boardBaseline, "TASK-540 closure seed");
    if (closureBoardBaseline && closureBoardBaseline !== boardBaseline) {
      throw new Error("TASK-540 attempted to reseed a different closure board baseline");
    }
    if (
      gateReceipt &&
      closureLeafGateReceipt &&
      !equalClosureGateReceipts(closureLeafGateReceipt, gateReceipt)
    ) {
      throw new Error("TASK-540 attempted to reseed a different closure leaf gate receipt");
    }
    closureBoardBaseline = boardBaseline;
    if (gateReceipt) closureLeafGateReceipt = Object.freeze({ ...gateReceipt });
  }
}

async function verifyClosureEntryGraph(label) {
  const resumeState = await resolveLeafResumeState();
  const changelogState = await resolveChangelogResumeState(resumeState);
  const graph = await validateResumeGraphCoverage(
    resumeState,
    changelogState,
    "TASK-540 closure entry " + label
  );
  const closureLeaf = resumeState.leafStates.find(({ id }) => id === "540-06-L01");
  if (
    resumeState.mode !== "initial" ||
    resumeState.repair ||
    resumeState.startIndex !== LEAVES.length ||
    graph.leafSummary.landedCount !== LEAVES.length ||
    !closureLeaf ||
    closureLeaf.status !== RESUME_TASK_STATUS.active ||
    Number(Boolean(closureLeaf.targetedGate)) + Number(Boolean(closureLeaf.revalidation)) !== 1 ||
    !closureLeaf.implementationComplete ||
    !graph.activePaths.includes(ROOT_TASK_PATH) ||
    !CLOSURE_TASK_PATHS.every((relativePath) => graph.activePaths.includes(relativePath))
  ) {
    throw new Error("TASK-540 closure entry graph is not fully landed and active at its frontier");
  }
  return Object.freeze({ resumeState, changelogState, graph });
}

async function pinClosureControlFromActiveGraph(generation) {
  const boardState = readTask540BoardState(await readFile(TASKS + "/README.md", "utf8"));
  if (boardState.bucket !== "inProgress") {
    throw new Error("TASK-540 closure control must be pinned from the active board graph");
  }
  const boardBaseline = formatClosureBoardBaseline(boardState.stats);
  if (closureBoardBaseline && closureBoardBaseline !== boardBaseline) {
    throw new Error("TASK-540 active board differs from the already pinned closure baseline");
  }
  closureBoardBaseline = boardBaseline;
  const leafState = await readCanonicalTaskStatus(LEAF_STATUS_GROUPS["540-06-L01"].leafPath);
  requireAbsentCompleted(
    readTaskMetadataField(leafState.source, "Completed"),
    "TASK-540 closure control leaf"
  );
  requireCanonicalImplementationComplete(
    readTaskMetadataField(leafState.source, "Implementation Complete"),
    "TASK-540 closure control leaf"
  );
  if (leafState.status !== RESUME_TASK_STATUS.active) {
    throw new Error("TASK-540 closure leaf is not active while pinning closure control");
  }
  const gateReceipt = readClosureLeafGateReceipt(leafState.source, "TASK-540 closure control pin");
  if (closureLeafGateReceipt && !equalClosureGateReceipts(closureLeafGateReceipt, gateReceipt)) {
    throw new Error("TASK-540 closure leaf differs from the already pinned gate receipt");
  }
  closureLeafGateReceipt = Object.freeze({ ...gateReceipt });
  return buildClosureControl(generation);
}

async function setClosurePendingState(label, generation = closureGeneration) {
  if (!Number.isSafeInteger(generation) || generation < 1) {
    throw new Error("TASK-540 closure pending requires a positive durable generation");
  }
  const preDispatchProjection = await captureExactClosureStatusProjection(
    "TASK-540 closure-pending pre-dispatch " + label
  );
  const token = randomUUID().replaceAll("-", "").slice(0, 12);
  const pendingValue = "generation " + generation + " / " + token;
  const closureReceiptsBefore = await captureClosureContractReceipts();
  const boardBefore = readTask540BoardState(await readFile(TASKS + "/README.md", "utf8"));
  if (boardBefore.bucket !== "inProgress" && boardBefore.bucket !== "done") {
    throw new Error("TASK-540 closure-pending transition started from an invalid board bucket");
  }
  const closureLeafBefore = await readCanonicalTaskStatus(
    LEAF_STATUS_GROUPS["540-06-L01"].leafPath
  );
  if (closureLeafBefore.status === RESUME_TASK_STATUS.done) {
    requireCanonicalCompleted(
      readTaskMetadataField(closureLeafBefore.source, "Completed"),
      "TASK-540 closure-pending prior leaf"
    );
  } else {
    requireAbsentCompleted(
      readTaskMetadataField(closureLeafBefore.source, "Completed"),
      "TASK-540 closure-pending prior leaf"
    );
  }
  requireCanonicalImplementationComplete(
    readTaskMetadataField(closureLeafBefore.source, "Implementation Complete"),
    "TASK-540 closure-pending prior leaf"
  );
  const gateReceiptBefore = readClosureLeafGateReceipt(
    closureLeafBefore.source,
    "TASK-540 closure-pending transition"
  );
  if (!closureLeafGateReceipt) {
    closureLeafGateReceipt = Object.freeze({ ...gateReceiptBefore });
  } else if (!equalClosureGateReceipts(closureLeafGateReceipt, gateReceiptBefore)) {
    throw new Error("TASK-540 closure leaf gate receipt changed before closure-pending");
  }
  if (!closureBoardBaseline) {
    if (boardBefore.bucket !== "inProgress") {
      throw new Error("TASK-540 cannot derive its first closure baseline from a Done board");
    }
    closureBoardBaseline = formatClosureBoardBaseline(boardBefore.stats);
  }
  const boardBaselineValue = closureBoardBaseline;
  for (const receipt of closureReceiptsBefore) {
    const priorBaseline = receipt.receipts["Closure Board Baseline"];
    const priorPath = receipt.receipts[CLOSURE_CHANGELOG_PATH_FIELD];
    if (
      (priorBaseline !== null && priorBaseline !== boardBaselineValue) ||
      (priorPath !== null && priorPath !== CHANGELOG_REL)
    ) {
      throw new Error("TASK-540 closure-pending transition found a changed baseline/path receipt");
    }
  }
  const expectedActiveStats = parseClosureBoardBaseline(
    boardBaselineValue,
    "TASK-540 closure-pending transition"
  );
  const expectedBeforeStats =
    boardBefore.bucket === "done"
      ? closedBoardStatsFromBaseline(expectedActiveStats, "TASK-540 closure-pending transition")
      : expectedActiveStats;
  if (JSON.stringify(boardBefore.stats) !== JSON.stringify(expectedBeforeStats)) {
    throw new Error("TASK-540 board drifted from its pinned closure baseline");
  }
  const sourceHashesBefore = await hashFiles(SOURCE_DESCENDANT_TASK_PATHS);
  let mutationError = null;
  try {
    await runMutatingAgent(
      "Repository " +
        ROOT +
        ". TASK-540 closure-pending transition for " +
        label +
        ". Read all 17 physical task files and the board fresh, but edit only " +
        JSON.stringify(closurePendingStatusOwner.allowedFiles) +
        ". In one mutation touch exactly the root, TASK-540-06 parent, and TASK-540-06-L01 leaf; " +
        "set those three statuses to 🚧 In Progress, synchronize only their root/child rows, and " +
        "add/update exact field `**Closure Pending:** " +
        pendingValue +
        "`, exact field `**Closure Board Baseline:** " +
        boardBaselineValue +
        "`, and exact field `**" +
        CLOSURE_CHANGELOG_PATH_FIELD +
        ":** " +
        CHANGELOG_REL +
        "`. Remove Completed from those three active closure contracts. Preserve canonical " +
        "Implementation Complete on the closure parent and leaf and keep it absent on the root. " +
        "Move only TASK-540's board row to 🚧 In progress and restore the exact pinned baseline " +
        "statistics. Preserve " +
        "every prior Closure Evidence SHA-256 and Closure Generation value byte-identically. " +
        "Preserve the exact closure-leaf gate receipt `**" +
        closureLeafGateReceipt.field +
        ":** " +
        closureLeafGateReceipt.value +
        "` and do not add the other gate field. Preserve every TASK-540-01 through TASK-540-05 " +
        "source descendant byte-identically, including its exact current status, Completed state, and gate evidence. Never " +
        "edit changelog/source/tests/product docs/workflow, stage, or commit.",
      { label: "closure-pending:540:" + label + ":" + token, phase: "Closure" },
      closurePendingStatusOwner
    );
  } catch (error) {
    mutationError = error;
  }

  let verificationError = null;
  let persistedPendingProjection = null;
  try {
    const sourceHashesAfter = await hashFiles(SOURCE_DESCENDANT_TASK_PATHS);
    if (!equalHashMaps(sourceHashesBefore, sourceHashesAfter)) {
      throw new Error("TASK-540 closure-pending transition changed a source descendant");
    }
    const [rootState, childState, leafState] = await Promise.all(
      CLOSURE_TASK_PATHS.map(readCanonicalTaskStatus)
    );
    const states = [rootState, childState, leafState];
    for (const [index, state] of states.entries()) {
      requireAbsentCompleted(
        readTaskMetadataField(state.source, "Completed"),
        "TASK-540 closure-pending contract " + index
      );
      if (index === 0) {
        requireAbsentImplementationComplete(
          readTaskMetadataField(state.source, "Implementation Complete"),
          "TASK-540 closure-pending root"
        );
      } else {
        requireCanonicalImplementationComplete(
          readTaskMetadataField(state.source, "Implementation Complete"),
          "TASK-540 closure-pending contract " + index
        );
      }
    }
    const receiptsAfter = await captureClosureContractReceipts();
    for (let index = 0; index < CLOSURE_TASK_PATHS.length; index += 1) {
      const relativePath = CLOSURE_TASK_PATHS[index];
      const state = states[index];
      const beforeReceipt = closureReceiptsBefore[index];
      const afterReceipt = receiptsAfter[index];
      if (
        state.status !== RESUME_TASK_STATUS.active ||
        readTaskMetadataField(state.source, "Closure Pending") !== pendingValue ||
        readTaskMetadataField(state.source, "Closure Board Baseline") !== boardBaselineValue ||
        readTaskMetadataField(state.source, CLOSURE_CHANGELOG_PATH_FIELD) !== CHANGELOG_REL ||
        beforeReceipt.receipts["Closure Evidence SHA-256"] !==
          afterReceipt.receipts["Closure Evidence SHA-256"] ||
        beforeReceipt.receipts["Closure Generation"] !==
          afterReceipt.receipts["Closure Generation"] ||
        JSON.stringify(beforeReceipt.gates) !== JSON.stringify(afterReceipt.gates)
      ) {
        throw new Error("TASK-540 closure-pending mismatch: " + relativePath);
      }
    }
    requireTableStatus(
      childState.source,
      "540-06-L01",
      RESUME_TASK_STATUS.active,
      "TASK-540 closure child"
    );
    requireTableStatus(
      rootState.source,
      "540-06",
      RESUME_TASK_STATUS.active,
      "TASK-540 closure root"
    );
    if (
      !equalClosureGateReceipts(
        readClosureLeafGateReceipt(leafState.source, "TASK-540 closure-pending transition"),
        closureLeafGateReceipt
      )
    ) {
      throw new Error("TASK-540 closure-pending transition lost its closure leaf gate receipt");
    }
    const boardAfter = readTask540BoardState(await readFile(TASKS + "/README.md", "utf8"));
    requireBoardRowMarker(boardAfter, "TASK-540 closure-pending transition");
    if (
      boardAfter.bucket !== "inProgress" ||
      JSON.stringify(boardAfter.stats) !== JSON.stringify(expectedActiveStats)
    ) {
      throw new Error("TASK-540 closure-pending board row/statistics mismatch");
    }
    await readSharedClosurePending({ required: true });
    persistedPendingProjection = await captureExactPendingClosureProjection(
      "TASK-540 durable closure-pending " + label
    );
  } catch (error) {
    verificationError = error;
  }
  if (mutationError || verificationError) {
    const primaryError =
      mutationError && verificationError
        ? new AggregateError(
            [mutationError, verificationError],
            "TASK-540 closure-pending dispatch and semantic verification both failed"
          )
        : (mutationError ?? verificationError);
    try {
      await restoreExactClosureStatusProjection(preDispatchProjection, "closure-pending:" + label);
    } catch (rollbackError) {
      throw new AggregateError(
        [primaryError, rollbackError],
        "TASK-540 closure-pending failure and exact rollback both failed"
      );
    }
    throw primaryError;
  }
  if (!persistedPendingProjection) {
    throw new Error("TASK-540 closure-pending transition lost its exact durable projection");
  }
  return persistedPendingProjection;
}

function readExactTaskTableRow(source, taskId, label) {
  const rows = source.split("\n").filter((line) => line.startsWith("| TASK-" + taskId + " |"));
  if (rows.length !== 1) throw new Error(label + ": expected one TASK-" + taskId + " row");
  return rows[0];
}

function requireBoardRowMarker(board, label) {
  requireTask540BoardNotesMarker(board.notes, board.bucket, label);
}

async function captureExactClosureStatusProjection(label, { requirePending = false } = {}) {
  if (requirePending) await readSharedClosurePending({ required: true });
  const snapshotPaths = [
    ...CLOSURE_TASK_PATHS,
    "_docs/_TASKS/README.md",
    ...(requirePending ? ["_docs/_CHANGELOG/README.md"] : []),
  ];
  const fileSnapshot = await captureExactRollbackFiles(snapshotPaths, label);
  const contractSources = CLOSURE_TASK_PATHS.map((relativePath) =>
    requireExactRollbackSnapshotUtf8(fileSnapshot, relativePath, label)
  );
  if (requirePending) {
    requireExactRollbackSnapshotUtf8(fileSnapshot, "_docs/_CHANGELOG/README.md", label);
  }
  const contracts = CLOSURE_TASK_PATHS.map((relativePath, index) => {
    const { source, status } = parseCanonicalTaskStatusSource(contractSources[index], relativePath);
    const tableTaskIds = index === 0 ? ["540-06"] : index === 1 ? ["540-06-L01"] : [];
    return Object.freeze({
      relativePath,
      status,
      metadata: Object.freeze(
        Object.fromEntries(
          TASK_STATUS_MUTABLE_METADATA_FIELDS.map((field) => [
            field,
            readTaskMetadataField(source, field),
          ])
        )
      ),
      tableRows: Object.freeze(
        Object.fromEntries(
          tableTaskIds.map((taskId) => [
            taskId,
            readExactTaskTableRow(source, taskId, label + " " + relativePath),
          ])
        )
      ),
      unrelatedProjection: projectTaskContractUnrelatedBytes(
        source,
        { tableTaskIds },
        label + " " + relativePath
      ),
    });
  });
  requireTableStatus(contractSources[0], "540-06", contracts[1].status, label + " root");
  requireTableStatus(contractSources[1], "540-06-L01", contracts[2].status, label + " child");
  if (requirePending) {
    for (let index = 0; index < contracts.length; index += 1) {
      const contract = contracts[index];
      if (contract.status !== RESUME_TASK_STATUS.active) {
        throw new Error(label + ": pre-final-status contracts are not exactly active");
      }
      requireAbsentCompleted(contract.metadata.Completed, label + " pending contract " + index);
      if (index === 0) {
        requireAbsentImplementationComplete(
          contract.metadata["Implementation Complete"],
          label + " pending root"
        );
      } else {
        requireCanonicalImplementationComplete(
          contract.metadata["Implementation Complete"],
          label + " pending contract " + index
        );
      }
    }
  }
  const boardSource = requireExactRollbackSnapshotUtf8(
    fileSnapshot,
    "_docs/_TASKS/README.md",
    label
  );
  const board = readTask540BoardState(boardSource);
  requireBoardRowMarker(board, label);
  if (requirePending && board.bucket !== "inProgress") {
    throw new Error(label + ": pre-final-status board is not active");
  }
  return Object.freeze({
    requirePending,
    contracts,
    fileSnapshot,
    board: Object.freeze({
      bucket: board.bucket,
      row: board.row,
      stats: board.stats,
      unrelatedProjection: projectTaskBoardUnrelatedBytes(boardSource),
    }),
  });
}

async function restoreExactClosureStatusProjection(projection, label) {
  let mutationError = null;
  try {
    await restoreExactRollbackFiles(
      projection.fileSnapshot,
      projection.requirePending ? closurePendingStatusRollbackOwner : closureStatusRollbackOwner,
      "closure-exact-rollback:540:" + label
    );
  } catch (error) {
    mutationError = error;
  }
  let verificationError = null;
  try {
    const restored = await captureExactClosureStatusProjection(label + " restored", {
      requirePending: projection.requirePending,
    });
    if (JSON.stringify(restored) !== JSON.stringify(projection)) {
      throw new Error(label + ": exact closure-status projection was not restored");
    }
  } catch (error) {
    verificationError = error;
  }
  if (mutationError && verificationError) {
    throw new AggregateError(
      [mutationError, verificationError],
      label + ": rollback mutation and persisted rollback verification both failed"
    );
  }
  if (mutationError) throw mutationError;
  if (verificationError) throw verificationError;
}

async function captureExactPendingClosureProjection(label) {
  return captureExactClosureStatusProjection(label, { requirePending: true });
}

async function restoreExactPendingClosureProjection(projection, label) {
  return restoreExactClosureStatusProjection(projection, label);
}

async function verifyClosureState(evidenceHash, generation, entryGraph = null) {
  if (!closureBoardBaseline || !closureLeafGateReceipt) {
    throw new Error("TASK-540 closure verifier is missing its pinned baseline or gate receipt");
  }
  const leafPathSet = new Set(LEAF_TASK_PATHS);
  const childPathSet = new Set(CHILD_TASK_PATHS);
  for (const relativePath of TASK_PATHS) {
    const { source, status } = await readCanonicalTaskStatus(relativePath);
    const completed = readTaskMetadataField(source, "Completed");
    const implementationComplete = readTaskMetadataField(source, "Implementation Complete");
    requireFinalCompletedForEntry(relativePath, completed, entryGraph, "TASK-540 closed");
    if (leafPathSet.has(relativePath) || childPathSet.has(relativePath)) {
      requireCanonicalImplementationComplete(
        implementationComplete,
        "TASK-540 closed " + relativePath
      );
    } else {
      requireAbsentImplementationComplete(implementationComplete, "TASK-540 closed root");
    }
    if (status !== RESUME_TASK_STATUS.done || readTaskMetadataField(source, "Repair Pending")) {
      throw new Error("TASK-540 incomplete closure state: " + relativePath);
    }
    const gateReceipts = readTaskGateReceipts(source);
    if (leafPathSet.has(relativePath)) {
      if (gateReceipts.length !== 1) {
        throw new Error("TASK-540 closed leaf lacks its unique landed receipt: " + relativePath);
      }
    } else if (gateReceipts.length !== 0) {
      throw new Error("TASK-540 closed non-leaf retained a leaf-only gate: " + relativePath);
    }
  }
  for (const relativePath of SOURCE_DESCENDANT_TASK_PATHS) {
    const { source } = await readCanonicalTaskStatus(relativePath);
    if (
      [
        "Closure Pending",
        "Closure Evidence SHA-256",
        "Closure Generation",
        "Closure Board Baseline",
        CLOSURE_CHANGELOG_PATH_FIELD,
      ].some((field) => readTaskMetadataField(source, field))
    ) {
      throw new Error(
        "TASK-540 source descendant retained a closure-only receipt: " + relativePath
      );
    }
  }
  for (const relativePath of CLOSURE_TASK_PATHS) {
    const { source } = await readCanonicalTaskStatus(relativePath);
    const boardBaseline = readTaskMetadataField(source, "Closure Board Baseline");
    if (
      readTaskMetadataField(source, "Closure Evidence SHA-256") !== evidenceHash ||
      readTaskMetadataField(source, "Closure Generation") !== String(generation) ||
      boardBaseline !== closureBoardBaseline ||
      readTaskMetadataField(source, CLOSURE_CHANGELOG_PATH_FIELD) !== CHANGELOG_REL ||
      readTaskMetadataField(source, "Closure Pending")
    ) {
      throw new Error("TASK-540 incomplete closure receipt: " + relativePath);
    }
  }
  const closureLeafState = await readCanonicalTaskStatus(LEAF_STATUS_GROUPS["540-06-L01"].leafPath);
  if (
    !equalClosureGateReceipts(
      readClosureLeafGateReceipt(closureLeafState.source, "TASK-540 closure"),
      closureLeafGateReceipt
    )
  ) {
    throw new Error("TASK-540 closure changed the pinned closure leaf gate receipt");
  }
  const closureControl = await readChangelogEvidenceControl(CHANGELOG_REL, "TASK-540 closed graph");
  const closureAnchor = await readClosureAnchor({
    required: true,
    label: "TASK-540 closed graph",
  });
  if (
    closureAnchor.evidenceSha256 !== evidenceHash ||
    closureAnchor.repairAuthorization !== null ||
    JSON.stringify(closureAnchor.closureControl) !== JSON.stringify(closureControl) ||
    closureControl.generation !== generation ||
    closureControl.boardBaseline !== closureBoardBaseline ||
    closureControl.changelogPath !== CHANGELOG_REL ||
    closureControl.gateReceipt.field !== closureLeafGateReceipt.field ||
    closureControl.gateReceipt.valueSha256 !== closureGateValueHash(closureLeafGateReceipt)
  ) {
    throw new Error("TASK-540 closed graph differs from independent closureControl");
  }
  const rootState = await readCanonicalTaskStatus(ROOT_TASK_PATH);
  for (const leaf of LEAVES) {
    const group = LEAF_STATUS_GROUPS[leaf.id];
    const childState = await readCanonicalTaskStatus(group.childPath);
    requireTableStatus(childState.source, leaf.id, RESUME_TASK_STATUS.done, "TASK-540 child");
    requireTableStatus(rootState.source, group.childId, RESUME_TASK_STATUS.done, "TASK-540 root");
  }
  const boardState = readTask540BoardState(await readFile(TASKS + "/README.md", "utf8"));
  requireBoardRowMarker(boardState, "TASK-540 closure");
  const baseline = parseClosureBoardBaseline(closureBoardBaseline, "TASK-540 closure");
  const expectedClosedStats = closedBoardStatsFromBaseline(baseline, "TASK-540 closure");
  if (
    boardState.bucket !== "done" ||
    JSON.stringify(boardState.stats) !== JSON.stringify(expectedClosedStats)
  ) {
    throw new Error("TASK-540 board row/statistics mismatch after closure");
  }
  await requireTask540ChangelogIndex();
}

async function runClosure(smoke, fullValidation, label, findings = []) {
  phase("Closure");
  const sourceOwnerTestHashesBefore = requireSourceOwnerTestHashBoundary(
    "TASK-540 closure " + label
  );
  const closureOwnerTestHashesBefore = await hashFiles(CLOSURE_OWNER_TEST_FILES);
  if (closureGeneration >= Number.MAX_SAFE_INTEGER) {
    throw new Error("TASK-540 closure generation cannot advance safely");
  }
  closureGeneration += 1;
  const generation = closureGeneration;
  let pendingEstablished = false;
  let durablePendingProjection = null;
  let fullStatusRollbackCompleted = false;
  try {
    const closureEntry = await verifyClosureEntryGraph(label);
    const entryGraphDescription = closureEntry.graph.allActive
      ? "All 17 physical TASK-540 contracts remain In Progress with no Completed field"
      : "Only the validated active frontier remains In Progress: " +
        JSON.stringify(closureEntry.graph.activePaths) +
        "; every other physical contract is covered Done with Completed under the independently validated changelog 1252 authority";
    const pendingBeforeEvidence = await readSharedClosurePending();
    const evidenceSnapshot = await captureClosureAnchorSnapshot(
      "TASK-540 pre-evidence " + label,
      "evidence",
      { includeChangelog: true }
    );
    if (pendingBeforeEvidence && evidenceSnapshot.indexState.kind !== "consumed") {
      throw new Error("TASK-540 pending reclosure has no exact consumed evidence snapshot");
    }
    const closureControl = await pinClosureControlFromActiveGraph(generation);
    const evidenceBlock = smokeEvidenceBlock(smoke, closureControl);
    const evidenceHash = smokeEvidenceHash(smoke, closureControl);
    const closureAnchor = buildClosureAnchor(evidenceHash, closureControl, null);
    const closureAnchorLine = formatClosureAnchor(closureAnchor);
    let evidenceMutationError = null;
    try {
      await runMutatingAgent(
        COMMON +
          "\n\nTASK-540 closure evidence stage " +
          label +
          ". Read _docs/_CHANGELOG/README.md and the pinned changelog fresh. Edit only " +
          JSON.stringify(closureEvidenceOwner.allowedFiles) +
          ". Create or update exactly " +
          CHANGELOG_REL +
          " with exact H1 `# 1252 - " +
          CHANGELOG_TITLE_PREFIX +
          "`, Date matching its filename, Version Unreleased, and exactly one task metadata line " +
          "byte-identical to `" +
          CHANGELOG_TASKS_LINE +
          "`. " +
          "Create exactly one four-cell index row ordered numerically between 1253 and 1250: its " +
          "title starts `" +
          CHANGELOG_TITLE_PREFIX +
          " —` and its exact Type cell is `" +
          CHANGELOG_TYPE +
          "`. Add exact prose `Changelog 1252 is consumed by the completed TASK-540 family.` and " +
          "replace the reservation mapping with exact prose `Changelogs 1251, 1254, and 1257 " +
          "remain reserved for the implementation closure of TASK-539, TASK-542, and TASK-545, " +
          "respectively.` Preserve every other pinned number. Immediately after the exact `## Index` " +
          "heading write exactly one standalone control line, followed by one blank line, byte-identical to `" +
          closureAnchorLine +
          "`; remove any prior TASK-540 closure-anchor line. " +
          entryGraphDescription +
          "; every landed implementation leaf retains " +
          "exactly one current Targeted Gate Passed or Revalidation Passed receipt. Replace any " +
          "prior evidence region with the exact byte sequence below; keep one BEGIN/END marker and " +
          "self-read it byte-for-byte. Record truthful prior validation, seven flows, " +
          smoke.finalization.screenshots.length +
          " PNGs, " +
          "zero browser channels, exact cleanup, and generation " +
          generation +
          ". Strict scan remains external non-green with sole exact finding " +
          JSON.stringify(KNOWN_STRICT_FINDING) +
          ". Do not edit task/status/board/source/test/product docs, stage, or commit. Metadata " +
          "findings: " +
          JSON.stringify(findings) +
          ". The embedded closureControl must remain byte-identical to this independently pinned " +
          "value: " +
          JSON.stringify(closureControl) +
          ". Prior validation receipt: " +
          JSON.stringify(fullValidation) +
          ". Exact evidence block follows; delimiters are not written:\n<exact-evidence>\n" +
          evidenceBlock +
          "\n</exact-evidence>",
        { label: "closure-evidence:540:" + label, phase: "Closure" },
        closureEvidenceOwner,
        false
      );
    } catch (error) {
      evidenceMutationError = error;
    }
    let evidenceVerificationError = null;
    try {
      await verifyChangelogEvidence(smoke, closureControl);
      await requireTask540ChangelogIndex();
    } catch (error) {
      evidenceVerificationError = error;
    }
    if (evidenceMutationError || evidenceVerificationError) {
      const primaryError =
        evidenceMutationError && evidenceVerificationError
          ? new AggregateError(
              [evidenceMutationError, evidenceVerificationError],
              "TASK-540 evidence dispatch and semantic verification both failed"
            )
          : (evidenceMutationError ?? evidenceVerificationError);
      try {
        await restoreClosureAnchorSnapshot(evidenceSnapshot, "evidence:" + label);
      } catch (rollbackError) {
        throw new AggregateError(
          [primaryError, rollbackError],
          "TASK-540 evidence failure and exact index/changelog rollback both failed"
        );
      }
      throw primaryError;
    }

    durablePendingProjection = await setClosurePendingState("pre-status:" + label, generation);
    pendingEstablished = true;

    phase("Final validation");
    const closureValidation = await runFullValidation(
      "full-validation:before-status-closure:" + generation + ":" + label,
      "Final validation"
    );

    const finalStatusEntry = await verifyClosureEntryGraph("pre-final-status:" + label);
    const closureStatusOwner = buildClosureStatusOwner(finalStatusEntry.graph);
    const finalStatusSnapshot = await captureExactRollbackFiles(
      FULL_STATUS_ROLLBACK_PATHS,
      "TASK-540 final-status pre-dispatch " + label
    );
    let statusClosureMutationError = null;
    try {
      await runMutatingAgent(
        "Repository " +
          ROOT +
          ". TASK-540 atomic status closure " +
          label +
          ". Canonical evidence and the complete full validation have passed. The independently " +
          "validated active frontier is " +
          JSON.stringify(finalStatusEntry.graph.activePaths) +
          "; all omitted contracts are already covered Done and must remain byte-identical. Read all " +
          "17 TASK-540 files and the board fresh. Edit only " +
          JSON.stringify(closureStatusOwner.allowedFiles) +
          ". In one atomic mutation follow the exact owner order (active leaves, then active direct " +
          "children, then root, then board), preserve every leaf's exact sole current gate receipt, " +
          "and add exact `**Completed:** " +
          RUN_DATE +
          "` only to those newly active contracts. Preserve every covered Done contract and its " +
          "canonical historical Completed date byte-identically. Update only TASK-540-06-L01, " +
          "TASK-540-06, and the root with exact " +
          "`**Closure Evidence SHA-256:** " +
          evidenceHash +
          "` and `**Closure Generation:** " +
          generation +
          "`, preserve the identical existing Closure Board Baseline and exact `**" +
          CLOSURE_CHANGELOG_PATH_FIELD +
          ":** " +
          CHANGELOG_REL +
          "` on those three, remove Closure " +
          "Pending from those three, preserve the exact closure-leaf gate receipt `**" +
          closureLeafGateReceipt.field +
          ":** " +
          closureLeafGateReceipt.value +
          "` without adding the other gate field. The resulting graph must have every physical " +
          "TASK-540 contract Done. Synchronize only the owned active child/root rows, move only " +
          "TASK-540's board row to ✅ Done, and recalculate " +
          "statistics. Apply closure-metadata findings " +
          JSON.stringify(findings) +
          ". Never edit changelog/source/tests/product docs/workflow, stage, or commit.",
        { label: "closure-status:540:" + label, phase: "Closure" },
        closureStatusOwner
      );
    } catch (error) {
      statusClosureMutationError = error;
    }
    let statusClosureVerificationError = null;
    try {
      await verifyClosureState(evidenceHash, generation, finalStatusEntry.graph);
      await verifyChangelogEvidence(smoke, closureControl);
    } catch (error) {
      statusClosureVerificationError = error;
    }
    const finalStatusError =
      statusClosureMutationError && statusClosureVerificationError
        ? new AggregateError(
            [statusClosureMutationError, statusClosureVerificationError],
            "TASK-540 final-status dispatch and semantic verification both failed"
          )
        : (statusClosureMutationError ?? statusClosureVerificationError);
    if (finalStatusError) {
      try {
        await restoreExactRollbackFiles(
          finalStatusSnapshot,
          closureStatusRollbackOwner,
          "TASK-540 final-status rollback " + label
        );
        fullStatusRollbackCompleted = true;
      } catch (rollbackError) {
        throw new AggregateError(
          [finalStatusError, rollbackError],
          "TASK-540 final-status failure and complete family rollback both failed"
        );
      }
      throw finalStatusError;
    }
    const mechanicalGate = await runReadOnlyAgent(
      "Read-only TASK-540 post-status mechanical graph gate at " +
        ROOT +
        ". Verify all 17 statuses/tables are Done, the evidence hash/generation exists exactly on " +
        "TASK-540-06-L01, TASK-540-06, and the root with identical board-baseline/changelog-path " +
        "pins and a strict matching independent closureControl. Verify board row/statistics, " +
        "changelog 1252/index, the exact initial Git index baseline remains unchanged with no " +
        "agent index write or commit, and run exactly: " +
        WORKFLOW_MECHANICAL_GATE_COMMAND +
        ". Do not edit.",
      {
        label: "closure-mechanical:540:" + generation + ":" + label,
        phase: "Closure",
        schema: RESULT_SCHEMA,
      }
    );
    if (!resultPassed(mechanicalGate)) {
      throw new Error("TASK-540 post-status mechanical graph gate failed");
    }
    const sourceOwnerTestHashesAfter = await hashFiles(SOURCE_OWNER_TEST_FILES);
    if (!equalHashMaps(sourceOwnerTestHashesBefore, sourceOwnerTestHashesAfter)) {
      throw new Error("TASK-540 closure changed a source-owner test after its boundary");
    }
    const closureOwnerTestHashesAfter = await hashFiles(CLOSURE_OWNER_TEST_FILES);
    if (!equalHashMaps(closureOwnerTestHashesBefore, closureOwnerTestHashesAfter)) {
      throw new Error("TASK-540 closure changed its aggregate test after runClosure entry");
    }
    return closureValidation;
  } catch (error) {
    if (!pendingEstablished) throw error;
    if (fullStatusRollbackCompleted) throw error;
    try {
      await restoreExactPendingClosureProjection(durablePendingProjection, "rollback:" + label);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "TASK-540 closure failed and atomic rollback also failed"
      );
    }
    throw error;
  }
}

const FINAL_LENSES = Object.freeze([
  [
    "graph-board-changelog",
    "All 17 task files terminal; exact evidence/generation/baseline/changelog-path receipts exist only on TASK-540-06-L01, TASK-540-06, and the root; board row/statistics and strict independent changelog closureControl/index exact; no other task changed.",
  ],
  [
    "evidence-security",
    "Changelog canonical block is byte-faithful to final browser/runtime evidence; strict scan is explicitly external non-green with sole TASK-545 owner; auth/CSRF/rate/self-scope and no-secret claims are accurate.",
  ],
  [
    "scope-tests-docs",
    "Single-writer code/tests and product/cache/API/user docs match implementation; screenshots are real/distinct; forbidden Page/widget paths, commits, and agent index writes are absent, and the exact initial Git index baseline is unchanged.",
  ],
  [
    "preference-identity-recovery",
    "The final implementation/tests/evidence prove hook-mount-local no-user in-memory fallback with zero isolated GET/PATCH requests, zero browser storage, and remount reset; direct provider A→B has no transitional null while explicit sign-out/null/provider-unmount remain valid null boundaries; malformed GET/PATCH responses are rejected, and malformed PATCH retains the exact optimistic intent as unsynced with no automatic replay; the live route matrix proves the same sole first A PATCH hit before and after release, zero queued-A dispatch, and B default unchanged after release and before unroute.",
  ],
]);

function classifyFinalDriftFindings(findings) {
  const sourceFindings = findings.filter((finding) => finding.owner !== "orchestrator");
  const runtimeFindings = findings.filter(
    (finding) => finding.owner === "orchestrator" && finding.area === "runtime-evidence"
  );
  const metadataFindings = findings.filter(
    (finding) => finding.owner === "orchestrator" && finding.area === "closure-metadata"
  );
  const invalidOrchestratorFindings = findings.filter(
    (finding) =>
      finding.owner === "orchestrator" &&
      finding.area !== "runtime-evidence" &&
      finding.area !== "closure-metadata"
  );
  if (invalidOrchestratorFindings.length > 0) {
    throw new Error("TASK-540 final audit returned an invalid orchestrator finding area");
  }
  return Object.freeze({
    sourceFindings: Object.freeze(sourceFindings),
    runtimeFindings: Object.freeze(runtimeFindings),
    metadataFindings: Object.freeze(metadataFindings),
  });
}

function planFinalDriftRound(round, classification) {
  if (![1, 2].includes(round)) throw new Error("TASK-540 final drift round is invalid");
  const hasSource = classification.sourceFindings.length > 0;
  const hasRuntime = classification.runtimeFindings.length > 0;
  const requiresFreshTopLevelSmoke = hasSource || hasRuntime;
  const actions = ["establish-closure-pending"];
  if (hasSource) actions.push("reopen-fix-regate-source", "full-validation");
  if (round === 2 || requiresFreshTopLevelSmoke) {
    if (hasSource) actions.push("recapture-pending-after-source");
    actions.push("stop-pending");
    return Object.freeze({
      actions: Object.freeze(actions),
      repairSourceBeforeStop: hasSource,
      requiresFreshTopLevelSmoke,
      reuseSealedEvidence: false,
      runReclosure: false,
      stopPending: true,
      sourceStatusAtStop: hasSource ? RESUME_TASK_STATUS.active : null,
    });
  }
  actions.push("reclosure-same-evidence");
  return Object.freeze({
    actions: Object.freeze(actions),
    repairSourceBeforeStop: false,
    requiresFreshTopLevelSmoke: false,
    reuseSealedEvidence: true,
    runReclosure: true,
    stopPending: false,
    sourceStatusAtStop: null,
  });
}

function invalidatePreRepairPendingProjectionAfterFreshGate(roundPlan, projection) {
  if (!roundPlan || typeof roundPlan.repairSourceBeforeStop !== "boolean") {
    throw new Error("TASK-540 final-drift Pending invalidation plan is invalid");
  }
  return roundPlan.repairSourceBeforeStop ? null : projection;
}

async function reacquireCurrentPendingProjection(
  label,
  {
    capturePending = captureExactPendingClosureProjection,
    establishPending = setClosurePendingState,
  } = {}
) {
  if (
    typeof label !== "string" ||
    label.length === 0 ||
    typeof capturePending !== "function" ||
    typeof establishPending !== "function"
  ) {
    throw new Error("TASK-540 durable pending reacquisition contract is invalid");
  }
  let captureError;
  try {
    return Object.freeze({
      projection: await capturePending(label),
      captureError: null,
    });
  } catch (error) {
    captureError = error;
  }
  try {
    return Object.freeze({
      projection: await establishPending(label + ":recapture-recovery"),
      captureError,
    });
  } catch (establishError) {
    throw new AggregateError(
      [captureError, establishError],
      "TASK-540 current durable Pending recapture and recovery both failed"
    );
  }
}

async function assertTask540FinalDriftRoundContract() {
  const source = Object.freeze([
    Object.freeze({ owner: "540-04-L03", area: "scope", finding: "synthetic source drift" }),
  ]);
  const runtime = Object.freeze([
    Object.freeze({
      owner: "orchestrator",
      area: "runtime-evidence",
      finding: "synthetic runtime drift",
    }),
  ]);
  const metadata = Object.freeze([
    Object.freeze({
      owner: "orchestrator",
      area: "closure-metadata",
      finding: "synthetic metadata drift",
    }),
  ]);
  const roundTwoSource = planFinalDriftRound(2, classifyFinalDriftFindings(source));
  const roundTwoRuntime = planFinalDriftRound(2, classifyFinalDriftFindings(runtime));
  const roundOneMixed = planFinalDriftRound(
    1,
    classifyFinalDriftFindings([...source, ...runtime, ...metadata])
  );
  const roundOneMetadata = planFinalDriftRound(1, classifyFinalDriftFindings(metadata));
  const staleProjection = Object.freeze({ generation: "stale" });
  const currentProjection = Object.freeze({ generation: "current" });
  const syntheticCaptureError = new Error("synthetic pending recapture failure");
  let durableProjection = staleProjection;
  let captureCalls = 0;
  let establishCalls = 0;
  durableProjection = null;
  const recoveredRecapture = await reacquireCurrentPendingProjection(
    "TASK-540 final-drift self-test",
    {
      capturePending: async () => {
        captureCalls += 1;
        throw syntheticCaptureError;
      },
      establishPending: async () => {
        establishCalls += 1;
        return currentProjection;
      },
    }
  );
  durableProjection = recoveredRecapture.projection;
  let successEstablishCalls = 0;
  const directRecapture = await reacquireCurrentPendingProjection(
    "TASK-540 final-drift direct recapture self-test",
    {
      capturePending: async () => currentProjection,
      establishPending: async () => {
        successEstablishCalls += 1;
        return staleProjection;
      },
    }
  );
  let aggregateFailure = null;
  try {
    await reacquireCurrentPendingProjection("TASK-540 final-drift double-failure self-test", {
      capturePending: async () => {
        throw syntheticCaptureError;
      },
      establishPending: async () => {
        throw new Error("synthetic pending recovery failure");
      },
    });
  } catch (error) {
    aggregateFailure = error;
  }
  const projectionObservedBySyntheticFailure = async (stage) => {
    let pendingProjection = staleProjection;
    pendingProjection = invalidatePreRepairPendingProjectionAfterFreshGate(
      roundOneMixed,
      pendingProjection
    );
    try {
      throw new Error("synthetic " + stage + " failure");
    } catch {
      return pendingProjection;
    }
  };
  const pendingAtValidationFailure = await projectionObservedBySyntheticFailure("validation");
  const pendingAtPostGateFailure = await projectionObservedBySyntheticFailure("post-gate");
  const cases = [
    {
      label: "round-two source is repaired and validated before stop",
      pass:
        JSON.stringify(roundTwoSource.actions) ===
        JSON.stringify([
          "establish-closure-pending",
          "reopen-fix-regate-source",
          "full-validation",
          "recapture-pending-after-source",
          "stop-pending",
        ]),
    },
    {
      label: "round-two source cannot remain Done",
      pass:
        roundTwoSource.repairSourceBeforeStop &&
        roundTwoSource.sourceStatusAtStop === RESUME_TASK_STATUS.active,
    },
    {
      label: "round-two residual requires no in-process smoke or reclosure",
      pass:
        roundTwoSource.requiresFreshTopLevelSmoke &&
        !roundTwoSource.runReclosure &&
        roundTwoRuntime.requiresFreshTopLevelSmoke &&
        !roundTwoRuntime.runReclosure,
    },
    {
      label: "round-one source/runtime drift stops under Pending for a fresh top-level smoke",
      pass:
        roundOneMixed.repairSourceBeforeStop &&
        roundOneMixed.requiresFreshTopLevelSmoke &&
        !roundOneMixed.reuseSealedEvidence &&
        !roundOneMixed.runReclosure &&
        roundOneMixed.stopPending,
    },
    {
      label: "round-one metadata-only drift recloses with the same sealed evidence",
      pass:
        !roundOneMetadata.repairSourceBeforeStop &&
        !roundOneMetadata.requiresFreshTopLevelSmoke &&
        roundOneMetadata.reuseSealedEvidence &&
        roundOneMetadata.runReclosure &&
        !roundOneMetadata.stopPending,
    },
    {
      label: "failed recapture invalidates the stale projection and retains current Pending",
      pass:
        durableProjection === currentProjection &&
        durableProjection !== staleProjection &&
        recoveredRecapture.captureError === syntheticCaptureError &&
        captureCalls === 1 &&
        establishCalls === 1,
    },
    {
      label: "successful recapture never establishes a replacement Pending",
      pass:
        directRecapture.projection === currentProjection &&
        directRecapture.captureError === null &&
        successEstablishCalls === 0,
    },
    {
      label: "failed recapture and failed recovery preserve both causes",
      pass:
        aggregateFailure instanceof AggregateError &&
        aggregateFailure.errors.length === 2 &&
        aggregateFailure.errors[0] === syntheticCaptureError,
    },
    {
      label: "fresh source gate invalidates stale Pending before full validation can fail",
      pass: pendingAtValidationFailure === null,
    },
    {
      label: "fresh source gate keeps stale Pending invalid through later failure",
      pass: pendingAtPostGateFailure === null,
    },
  ];
  for (const testCase of cases) {
    if (!testCase.pass) {
      throw new Error("TASK-540 final-drift self-test failed: " + testCase.label);
    }
  }
  return cases.length;
}

async function runFinalAudit(round) {
  phase("Final drift");
  const results = await Promise.all(
    FINAL_LENSES.map(async ([id, lens]) => ({
      id,
      result: await runReadOnlyAgent(
        "Fresh read-only TASK-540 final closure audit round " +
          round +
          " at " +
          ROOT +
          ". Read all task/docs/changelog/source/test state and full status/diff. Lens: " +
          lens +
          " Report every H/M/L with concrete file:line. Assign a source/test/product-doc defect " +
          "to its exact source-owning 540 leaf. Assign browser/runtime/receipt/screenshot/fixture/" +
          "cleanup evidence defects to owner=orchestrator and area exactly runtime-evidence. " +
          "Assign a defect in a TASK-540-01 through TASK-540-05 source contract to its exact leaf " +
          "owner even when the defect is task metadata. Assign only TASK-540-06/root/changelog/" +
          "index/board defects to owner=orchestrator and area exactly closure-metadata. Do not " +
          "edit or start runtime.",
        {
          label: "final-drift:" + id + ":" + round,
          phase: "Final drift",
          schema: AUDIT_SCHEMA,
        }
      ),
    }))
  );
  requireAllResults(
    results,
    FINAL_LENSES.map(([id]) => id),
    "TASK-540 final drift round " + round
  );
  return results.flatMap(({ result }) => result.findings);
}

async function hashFiles(paths) {
  const hashes = {};
  for (const path of paths) hashes[path] = await hashPath(path);
  return hashes;
}

async function captureSourceOwnerTestHashBoundary(label) {
  if (typeof label !== "string" || label.length === 0) {
    throw new Error("TASK-540 source-owner hash boundary requires a label");
  }
  sourceOwnerTestHashesAtClosureBoundary = Object.freeze({
    ...(await hashFiles(SOURCE_OWNER_TEST_FILES)),
  });
}

function requireSourceOwnerTestHashBoundary(label) {
  if (!sourceOwnerTestHashesAtClosureBoundary) {
    throw new Error(label + ": source-owner test hash boundary is missing");
  }
  return { ...sourceOwnerTestHashesAtClosureBoundary };
}

function equalHashMaps(left, right) {
  return (
    Object.keys(left).length === Object.keys(right).length &&
    Object.keys(left).every((key) => left[key] === right[key])
  );
}

async function assertTask540SmokeExecutionOnceContract() {
  const nonce = "0123456789ab";
  const empty = Object.freeze([]);
  const screenshots = Object.freeze(
    Array.from({ length: 13 }, (_, index) =>
      Object.freeze({
        path: `_docs/_workflows/_smoke/task-540-self-test-${index + 1}.png`,
        size: index + 1,
        sha256: String(index).padStart(64, "0"),
      })
    )
  );
  const evidence = Object.freeze({
    schemaVersion: 1,
    pass: true,
    prefix: "wf540-" + nonce,
    manifestSha256: "0".repeat(64),
    browserReceipts: empty,
    runtimeReceipts: empty,
    fixtureSubjects: empty,
    cleanupReceipts: empty,
    finalization: Object.freeze({ screenshots }),
    captureProjection: empty,
  });
  const plan = Object.freeze({
    requiredScreenshotPaths: Object.freeze(screenshots.map(({ path }) => path)),
  });
  const snapshotRepository = async () => Object.freeze({ paths: empty, hashes: Object.freeze({}) });
  const cleanAuditRunner = async () => Object.freeze({ findings: empty });
  const phaseReporter = () => {};
  const validation = Object.freeze({ pass: true });

  let successExecutions = 0;
  const successController = createSmokeExecutionController(async (input) => {
    successExecutions += 1;
    await input.snapshotRepository();
    input.assertSafeEvidence(evidence, "TASK-540 smoke once self-test");
    return evidence;
  });
  const success = await executeAndAuditSmokeEvidenceOnce({
    label: "self-test-success",
    validation,
    nonce,
    plan,
    controller: successController,
    snapshotRepository,
    auditRunner: cleanAuditRunner,
    phaseReporter,
  });
  let duplicateRejected = false;
  try {
    await successController.execute({});
  } catch {
    duplicateRejected = true;
  }

  let failedExecutions = 0;
  let failedAuditCalls = 0;
  const failureController = createSmokeExecutionController(async () => {
    failedExecutions += 1;
    throw new Error("synthetic executor failure");
  });
  let executorFailureRejected = false;
  try {
    await executeAndAuditSmokeEvidenceOnce({
      label: "self-test-executor-failure",
      validation,
      nonce,
      plan,
      controller: failureController,
      snapshotRepository,
      auditRunner: async () => {
        failedAuditCalls += 1;
        return Object.freeze({ findings: empty });
      },
      phaseReporter,
    });
  } catch {
    executorFailureRejected = true;
  }

  let findingExecutions = 0;
  let findingAuditCalls = 0;
  const findingController = createSmokeExecutionController(async () => {
    findingExecutions += 1;
    return evidence;
  });
  let findingRejected = false;
  try {
    await executeAndAuditSmokeEvidenceOnce({
      label: "self-test-audit-finding",
      validation,
      nonce,
      plan,
      controller: findingController,
      snapshotRepository,
      auditRunner: async () => {
        findingAuditCalls += 1;
        return Object.freeze({
          findings: Object.freeze([
            Object.freeze({ owner: "orchestrator", area: "runtime-evidence" }),
          ]),
        });
      },
      phaseReporter,
    });
  } catch {
    findingRejected = true;
  }

  const cases = [
    {
      label: "successful executor is called exactly once",
      pass:
        successExecutions === 1 &&
        successController.hasExecuted() &&
        success.smoke === evidence &&
        duplicateRejected,
    },
    {
      label: "executor failure is never retried and never reaches audit",
      pass: executorFailureRejected && failedExecutions === 1 && failedAuditCalls === 0,
    },
    {
      label: "evidence audit finding stops without a second execution",
      pass:
        findingRejected &&
        findingExecutions === 1 &&
        findingAuditCalls === 1 &&
        findingController.hasExecuted(),
    },
    {
      label: "canonical metadata reuses the same sealed evidence identity",
      pass:
        canonicalSmokeEvidence(evidence) === evidence &&
        canonicalSmokeEvidence(success.smoke) === success.smoke,
    },
  ];
  for (const testCase of cases) {
    if (!testCase.pass) {
      throw new Error("TASK-540 one-shot smoke self-test failed: " + testCase.label);
    }
  }
  return cases.length;
}

if (process.argv.includes("--self-test-repair-siblings")) {
  const cases = assertTask540RepairSiblingStateContract();
  const l03RepairCases = assertTask540L03RepairSiblingContract();
  const effectiveRepairOwnerCases = assertTask540L03EffectiveRepairOwnerContract();
  const namedFileIsolationCases = assertTask540L03GateIsolationContract();
  const smokeExecutionOnceCases = await assertTask540SmokeExecutionOnceContract();
  const atomicClosureCases = assertTask540AtomicClosureContract();
  const coverageCases = assertTask540CoverageContract();
  const completionMetadataCases = assertTask540CompletionMetadataContract();
  const boardStateCases = assertTask540BoardStateContract();
  const finalDriftRoundCases = await assertTask540FinalDriftRoundContract();
  const gitIndexBaselineCases = await assertTask540GitIndexBaselineContract();
  process.stdout.write(
    JSON.stringify({
      pass: true,
      cases,
      l03RepairCases,
      effectiveRepairOwnerCases,
      namedFileIsolationCases,
      smokeExecutionOnceCases,
      atomicClosureCases,
      coverageCases,
      completionMetadataCases,
      boardStateCases,
      finalDriftRoundCases,
      gitIndexBaselineCases,
    })
  );
  process.exit(0);
}

const currentResumeSelfTest = process.argv.find((value) =>
  value.startsWith("--self-test-current-resume=")
);
if (currentResumeSelfTest) {
  const expectedMode = currentResumeSelfTest.slice("--self-test-current-resume=".length);
  if (!new Set(["initial", "repair", "terminal"]).has(expectedMode)) {
    throw new Error("TASK-540 current-resume self-test mode is invalid");
  }
  const currentResume = await resolveLeafResumeState();
  const currentChangelog = await resolveChangelogResumeState(currentResume);
  await validateResumeGraphCoverage(
    currentResume,
    currentChangelog,
    "TASK-540 current-resume self-test"
  );
  if (currentResume.mode !== expectedMode) {
    throw new Error(
      "TASK-540 current-resume self-test expected " + expectedMode + ", got " + currentResume.mode
    );
  }
  if (
    expectedMode === "repair" &&
    (currentResume.startLeafId !== "540-04-L03" ||
      currentResume.repair?.id !== "540-04-L03" ||
      JSON.stringify(currentResume.remainingLeafIds) !== JSON.stringify(["540-04-L03"]) ||
      JSON.stringify(currentResume.landedLeafIds) !==
        JSON.stringify([
          "540-01-L01",
          "540-02-L01",
          "540-03-L01",
          "540-04-L01",
          "540-04-L02",
          "540-04-L04",
          "540-05-L01",
          "540-05-L02",
        ]))
  ) {
    throw new Error("TASK-540 current-resume repair cursor is not exact");
  }
  if (
    expectedMode === "initial" &&
    (currentResume.startIndex !== LEAVES.length - 1 ||
      currentResume.startLeafId !== "540-06-L01" ||
      currentResume.repair !== null ||
      JSON.stringify(currentResume.landedLeafIds) !==
        JSON.stringify([
          "540-01-L01",
          "540-02-L01",
          "540-03-L01",
          "540-04-L01",
          "540-04-L02",
          "540-04-L03",
          "540-04-L04",
          "540-05-L01",
          "540-05-L02",
        ]) ||
      JSON.stringify(currentResume.remainingLeafIds) !== JSON.stringify(["540-06-L01"]))
  ) {
    throw new Error("TASK-540 current-resume initial cursor is not exact");
  }
  process.stdout.write(
    JSON.stringify({
      pass: true,
      mode: currentResume.mode,
      startLeafId: currentResume.startLeafId,
      landedLeafIds: currentResume.landedLeafIds,
      remainingLeafIds: currentResume.remainingLeafIds,
    })
  );
  process.exit(0);
}

await captureInitialGitIndexBaseline("TASK-540 workflow initial Git index baseline");
const workflowBranch = (await git(["branch", "--show-current"])).trim();
if (workflowBranch !== EXPECTED_BRANCH) {
  throw new Error(
    "TASK-540 workflow requires exact branch " + EXPECTED_BRANCH + ", got " + workflowBranch
  );
}
phase("Start gate");
const resumeState = await resolveLeafResumeState();
const changelogResumeState = await resolveChangelogResumeState(resumeState);
await validateResumeGraphCoverage(resumeState, changelogResumeState, "TASK-540 startup");
seedClosureGeneration(changelogResumeState);
const startGate = await runReadOnlyAgent(
  "Read-only TASK-540 start gate at " +
    ROOT +
    ". Read all 17 physical TASK-540 files plus board/changelog indexes and both workflow files " +
    "fresh. The orchestrator deterministically resolved this resume state: " +
    JSON.stringify(resumeState) +
    ". The pinned changelog state is " +
    JSON.stringify(changelogResumeState) +
    ". In terminal mode verify all 17 contracts and the board are Done, the three closure " +
    "contracts share the exact validated evidence hash/generation and pinned board baseline/" +
    "changelog path, the closure leaf preserves one exact gate field/value, and the single " +
    "changelog block hashes to that receipt with a strict matching closureControl. Startup will " +
    "scoped-reopen only closure/root before rerunning " +
    "post-audit, full validation, smoke, closure, and final gates. In initial mode before independent " +
    "changelog 1252 authority, require every landed leaf to remain In Progress with no Completed, " +
    "canonical Implementation Complete, and exactly one Targeted Gate Passed/Revalidation Passed " +
    "field. Accept Done only in a closure-restart graph whose consumed anchor and strict " +
    "closureControl independently cover it. No startup normalization may manufacture or rerun " +
    "landed evidence. In repair mode require exactly the named active " +
    "Repair Pending owner using exact `generation <32 lowercase hex> / token <32 lowercase hex>`, " +
    "no Completed or old gate receipt on any active repair root/child/owner/closure sibling, every " +
    "other source leaf either gated In Progress before family closure or Done with Completed after " +
    "a validated family closure, and the closure leaf active with no gate before closure or its one " +
    "pinned gate plus durable Closure Pending after closure; only that exact owner will be repaired/" +
    "re-gated. A closure-leaf repair without Closure Pending is valid only for a consumed " +
    "evidence-before-pending anchor whose exact repairAuthorization binds the pending hash, prior " +
    "control gate, and successor Revalidation hash. A reserved/no-anchor closure remediation stays " +
    "ungated and uses the exact deterministic preClosureRegateValue of its persisted matching Fix " +
    "Started date. In initial mode the " +
    "first unlanded leaf is the resume cursor and every later leaf remains To Do, with no skipped " +
    "dependency. Verify every parent/child table and the exact strict land order is " +
    JSON.stringify(LEAF_ORDER) +
    ", changelog 1252 is either absent/reserved, the exact authorized evidence-before-pending " +
    "repair, or the exact single reused closure-restart file with matching Closure Pending " +
    "receipts; duplicates are forbidden. TASK-543 is complete, HEAD " +
    "is current, branch is exactly `" +
    EXPECTED_BRANCH +
    "`, and the exact initial Git index baseline is unchanged with no agent index write. " +
    "task-540-implement.mjs is the canonical remaining " +
    "program owner. The current mutable task-540-fix.mjs is completed evidence only for the " +
    "R01-before-R03 URL-control correction and is not an active or conflicting owner. Earlier " +
    "five-owner corrective work, including R04/R05, is durable only in the affected task files' " +
    "Revalidation/Post-Audit metadata and current gates, not attributed to the current workflow file. " +
    "Do not edit.",
  { label: "start-gate:540", phase: "Start gate", schema: RESULT_SCHEMA }
);
if (!resultPassed(startGate)) throw new Error("TASK-540 start gate failed");

const verifiedResumeState = await resolveLeafResumeState();
const verifiedChangelogResumeState = await resolveChangelogResumeState(verifiedResumeState);
await validateResumeGraphCoverage(
  verifiedResumeState,
  verifiedChangelogResumeState,
  "TASK-540 verified startup"
);
if (
  JSON.stringify(verifiedResumeState) !== JSON.stringify(resumeState) ||
  JSON.stringify(verifiedChangelogResumeState) !== JSON.stringify(changelogResumeState)
) {
  throw new Error("TASK-540 resume state changed during the read-only start gate");
}
seedClosureGeneration(verifiedChangelogResumeState);

if (verifiedResumeState.mode === "terminal") {
  await captureSourceOwnerTestHashBoundary("closure-terminal-reopen");
}

if (verifiedResumeState.mode === "repair" && verifiedResumeState.repair?.id === "540-06-L01") {
  await captureSourceOwnerTestHashBoundary("closure-repair-resume");
}

if (verifiedResumeState.mode === "repair") {
  await resumeInterruptedRepair(verifiedResumeState);
} else if (verifiedResumeState.mode === "terminal") {
  await setClosurePendingState("startup-reopen:terminal", closureGeneration);
}
const executionResumeState = await resolveLeafResumeState();
if (executionResumeState.mode !== "initial") {
  throw new Error("TASK-540 persisted repair did not close after its fresh matching re-gate");
}
if (verifiedResumeState.mode === "terminal" && executionResumeState.startIndex !== LEAVES.length) {
  throw new Error("TASK-540 terminal reopen changed the fully landed leaf cursor");
}
const executionChangelogResumeState = await resolveChangelogResumeState(executionResumeState);
await validateResumeGraphCoverage(
  executionResumeState,
  executionChangelogResumeState,
  "TASK-540 execution resume"
);
seedClosureGeneration(executionChangelogResumeState);
if (
  (verifiedResumeState.mode === "initial" &&
    executionResumeState.startIndex !== verifiedResumeState.startIndex) ||
  (verifiedResumeState.mode === "initial" &&
    executionResumeState.startLeafId !== verifiedResumeState.startLeafId)
) {
  throw new Error("TASK-540 resume cursor changed during the read-only startup boundary");
}

for (const leaf of LEAVES.slice(executionResumeState.startIndex)) {
  if (leaf.id === "540-06-L01" && sourceOwnerTestHashesAtClosureBoundary === null) {
    await captureSourceOwnerTestHashBoundary("closure-leaf-entry");
  }
  const persistedState = executionResumeState.leafStates.find(({ id }) => id === leaf.id);
  if (persistedState?.status === RESUME_TASK_STATUS.active && !persistedState.landed) {
    await resumeActiveUngatedLeaf(leaf);
  } else {
    await implementAndGate(leaf);
  }
}

if (sourceOwnerTestHashesAtClosureBoundary === null) {
  await captureSourceOwnerTestHashBoundary("closure-post-resume-entry");
}

await runPostAudit();

phase("Full validation");
let fullValidation = await runFullValidation("full-validation:post-audit", "Full validation");

const smokeCycle = await runSmokeEvidenceOnce("initial", fullValidation);
const smoke = smokeCycle.smoke;
fullValidation = smokeCycle.fullValidation;

fullValidation = await runClosure(smoke, fullValidation, "initial");

let finalDurablePendingProjection = null;
let finalPendingTransitionSelfRestored = false;
try {
  let finalDriftClean = false;
  for (let round = 1; round <= 2; round += 1) {
    const findings = await runFinalAudit(round);
    if (findings.length === 0) {
      finalDriftClean = true;
      break;
    }
    const classification = classifyFinalDriftFindings(findings);
    const roundPlan = planFinalDriftRound(round, classification);
    const { sourceFindings, metadataFindings } = classification;

    // A non-clean final audit reopens only the closure contracts. Exact source
    // owners are reopened later, after findings have been classified.
    try {
      finalDurablePendingProjection = await setClosurePendingState("final-drift:" + round);
    } catch (error) {
      finalPendingTransitionSelfRestored = true;
      throw error;
    }

    if (roundPlan.repairSourceBeforeStop) {
      await fixAuditFindings(sourceFindings, "final-drift-" + round, "Final drift", {
        afterClosure: true,
      });
      // The successful fixer includes the fresh owner gate/completion transition.
      // From this point onward a pre-repair closure snapshot is never rollback
      // authority, including if full validation fails before recapture.
      finalDurablePendingProjection = invalidatePreRepairPendingProjectionAfterFreshGate(
        roundPlan,
        finalDurablePendingProjection
      );
      fullValidation = await runFullValidation(
        "full-validation:after-final-source-fix:" + round,
        "Final validation"
      );
    }

    if (roundPlan.stopPending) {
      let pendingRecaptureError = null;
      if (roundPlan.repairSourceBeforeStop) {
        // The pre-repair projection is no longer rollback authority once the
        // repaired source owner has a fresh gate/completion receipt.
        finalDurablePendingProjection = null;
        const reacquiredPending = await reacquireCurrentPendingProjection(
          "TASK-540 repaired-source durable pending " + round
        );
        finalDurablePendingProjection = reacquiredPending.projection;
        pendingRecaptureError = reacquiredPending.captureError;
      }
      const stopError = new Error(
        sourceFindings.length > 0
          ? "TASK-540 source drift was repaired/re-gated and fully validated; workflow stopped under durable Closure Pending and requires a fresh top-level one-shot smoke"
          : roundPlan.requiresFreshTopLevelSmoke
            ? "TASK-540 runtime evidence drift requires a fresh top-level invocation; workflow stopped under durable Closure Pending without retry"
            : "TASK-540 round-two closure metadata drift remained; workflow stopped under durable Closure Pending"
      );
      if (pendingRecaptureError) {
        throw new AggregateError(
          [stopError, pendingRecaptureError],
          "TASK-540 repaired-source recapture failed after fresh Pending recovery"
        );
      }
      throw stopError;
    }

    if (!roundPlan.runReclosure) {
      throw new Error("TASK-540 final drift plan unexpectedly omitted reclosure");
    }
    if (!roundPlan.reuseSealedEvidence || canonicalSmokeEvidence(smoke) !== smoke) {
      throw new Error("TASK-540 metadata-only reclosure did not retain the same sealed evidence");
    }

    finalDurablePendingProjection = null;
    const preReclosurePending = await reacquireCurrentPendingProjection(
      "TASK-540 final-remediation durable pending " + round
    );
    finalDurablePendingProjection = preReclosurePending.projection;
    if (preReclosurePending.captureError) {
      throw new AggregateError(
        [preReclosurePending.captureError],
        "TASK-540 final remediation recapture failed after fresh Pending recovery"
      );
    }
    try {
      fullValidation = await runClosure(
        smoke,
        fullValidation,
        "final-remediation-" + round,
        metadataFindings
      );
      finalDurablePendingProjection = null;
    } catch (error) {
      try {
        finalDurablePendingProjection = null;
        const failedReclosurePending = await reacquireCurrentPendingProjection(
          "TASK-540 failed final-remediation durable pending " + round
        );
        finalDurablePendingProjection = failedReclosurePending.projection;
        if (failedReclosurePending.captureError) {
          throw new AggregateError(
            [error, failedReclosurePending.captureError],
            "TASK-540 final remediation failed and fresh Pending required recovery"
          );
        }
      } catch (captureError) {
        throw new AggregateError(
          [error, captureError],
          "TASK-540 final remediation failed and its durable Pending recapture also failed"
        );
      }
      throw error;
    }
  }
  if (!finalDriftClean) {
    throw new Error("TASK-540 final drift loop ended without a clean fresh round");
  }

  phase("Final gate");
  const finalGate = await runReadOnlyAgent(
    "Read-only final TASK-540 mechanical gate at " +
      ROOT +
      ". Run exactly: " +
      WORKFLOW_MECHANICAL_GATE_COMMAND +
      ". Confirm the full task graph/changelog evidence remains closed, " +
      "including identical changelog-path pins and strict closureControl binding. Confirm HEAD/" +
      "branch and exact initial Git index baseline unchanged, with no agent index write or " +
      "commit. Do not edit.",
    { label: "final-gate:540", phase: "Final gate", schema: RESULT_SCHEMA }
  );
  if (!resultPassed(finalGate)) throw new Error("TASK-540 final mechanical gate failed");
} catch (error) {
  if (finalPendingTransitionSelfRestored) throw error;
  try {
    if (finalDurablePendingProjection) {
      await restoreExactPendingClosureProjection(
        finalDurablePendingProjection,
        "post-status-failure"
      );
    } else {
      finalDurablePendingProjection = await setClosurePendingState("post-status-failure");
    }
  } catch (rollbackError) {
    throw new AggregateError(
      [error, rollbackError],
      "TASK-540 post-status failure and mandatory rollback both failed"
    );
  }
  throw error;
}
