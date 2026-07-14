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
  stat,
  unlink,
} from "node:fs/promises";
import { parseEnv, promisify } from "node:util";

export const meta = {
  name: "task-540-implement",
  description:
    "Implement TASK-540 in strict leaf order, run owner-scoped gates and five-lens audits, prove seven real Custom Screen flows, and close changelog 1252. Agents never stage or commit.",
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
const TASKS = ROOT + "/_docs/_TASKS";
const WORKFLOW_REL = "_docs/_workflows/task-540-implement.mjs";
const WORKFLOW = ROOT + "/" + WORKFLOW_REL;
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
  "tests/vitest/ui/custom-screen-route-params.test.ts",
  "tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx",
  "tests/vitest/ui/custom-screens-page.test.tsx",
  "tests/vitest/ui-integration/canvas-editor-panel-toggle-dedupe.test.tsx",
  "tests/vitest/ui-integration/canvas-editor/canvas-editor.test.tsx",
  "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
  "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
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
  "tests/integration/routes/customScreensRoutes.test.ts",
]);
const SOURCE_OWNER_TEST_FILES = Object.freeze([
  ...TARGET_VITEST_FILES.filter(
    (file) => file !== "tests/vitest/ui-integration/custom-screen-task-540-flow.test.tsx"
  ),
  ...TARGET_BUN_FILES,
]);

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

const FULL_GATE_COMMANDS = Object.freeze([
  { id: "dbPreflight", command: DB_PREFLIGHT },
  { id: "lintTypes", command: LINT_TYPES },
  { id: "lint", command: LINT },
  { id: "rootTsc", command: ROOT_TSC },
  { id: "targetedVitest", command: TARGETED_VITEST },
  { id: "targetedBun", command: TARGETED_BUN },
  { id: "fullTest", command: ENV + "bun run test" },
  { id: "precommitCheck", command: "bun run precommit:check" },
  { id: "adminBuild", command: "bun --cwd core build:admin" },
  { id: "adminBoundary", command: "bun run check:admin-boundary" },
  { id: "adminBundle", command: "bun run check:admin-bundle" },
  { id: "releaseGates", command: "bun run gates:coderso" },
  { id: "strictScan", command: "bun run scan:security:strict" },
  { id: "diffCheck", command: "git diff --check" },
]);

const KNOWN_STRICT_FINDING = Object.freeze({
  scanner: "semgrep-sast",
  rule: "javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag",
  file: "_docs/_workflows/task-522-author.mjs",
  line: 185,
  owner: "TASK-545",
});

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

const SMOKE_SESSION_PREFIX = "playwright-cli -s=wf540smoke --raw ";
const SMOKE_HELPER_COMMAND = "coderso-dev-core-host /home/coder/project/Coderso";
const ADMIN_HEALTH_URL = "http://coderso-a.localhost:5173/admin/advanced/custom-screens";
const FRONT_HEALTH_URL = "http://coderso-a.localhost:3000/";
const ADMIN_HEALTH_COMMAND =
  "curl --fail --silent --show-error " + ADMIN_HEALTH_URL + " >/dev/null";
const FRONT_HEALTH_COMMAND =
  "curl --fail --silent --show-error " + FRONT_HEALTH_URL + " >/dev/null";
const healthExecFileDescriptor = (url) =>
  "execFile:curl argv=" + JSON.stringify(["--fail", "--silent", "--show-error", url]);
const ADMIN_HEALTH_OPERATION_DESCRIPTOR = healthExecFileDescriptor(ADMIN_HEALTH_URL);
const FRONT_HEALTH_OPERATION_DESCRIPTOR = healthExecFileDescriptor(FRONT_HEALTH_URL);
const EVIDENCE_BEGIN = "<!-- TASK-540-SMOKE-EVIDENCE:BEGIN -->";
const EVIDENCE_END = "<!-- TASK-540-SMOKE-EVIDENCE:END -->";
const SMOKE_KINDS = Object.freeze([
  "button-image",
  "tabs-content",
  "tabs-keyboard-aria",
  "space-selection",
  "dirty-guards",
  "related-retry-cache",
  "responsive-users",
]);
const ROUTE_EXPECTATIONS = Object.freeze({
  "media-prior-resolution": { method: "GET", mode: "delayed-success" },
  "entry-save-failure": { method: "PATCH", mode: "malformed-json" },
  "related-first-failure": { method: "GET", mode: "malformed-json" },
  "related-a-refresh": { method: "GET", mode: "delayed-success" },
  "related-b-load": { method: "GET", mode: "delayed-success" },
  "preference-a-write-epoch": { method: "PATCH", mode: "delayed-success" },
});
const ROUTE_SCENARIOS = Object.freeze({
  "media-prior-resolution": "button-image",
  "entry-save-failure": "dirty-guards",
  "related-first-failure": "related-retry-cache",
  "related-a-refresh": "related-retry-cache",
  "related-b-load": "related-retry-cache",
  "preference-a-write-epoch": "responsive-users",
});
const SMOKE_RECEIPT_SCENARIOS = Object.freeze(["setup", ...SMOKE_KINDS, "cleanup"]);
const HELPER_PORTS = Object.freeze([3000, 5173, 5174]);
const FINAL_BROWSER_CLEANUP_COUNT = 7;
const HELPER_CHILD_KINDS = Object.freeze(["backend", "admin-vite", "site-vite"]);
const REQUIRED_RUNTIME_OPERATIONS = Object.freeze([
  "helper-launch",
  "admin-health",
  "front-health",
  "pid-lineage",
  "fixture-setup",
  "fixture-provenance",
  "entity-absence",
  "cleanup-absence",
  "helper-stop",
  "process-absence",
  "port-absence",
  "orchestrator-discovery",
  "orchestrator-identifier-validation",
  "orchestrator-exact-delete",
  "orchestrator-absence",
  "orchestrator-helper-stop",
  "orchestrator-port-probe",
]);
const ORCHESTRATION_RUNTIME_OPERATIONS = Object.freeze(REQUIRED_RUNTIME_OPERATIONS.slice(-6));
const CLEANUP_AGENT_RUNTIME_OPERATIONS = Object.freeze(
  ORCHESTRATION_RUNTIME_OPERATIONS.slice(0, 4)
);
const OUTER_HOST_RUNTIME_OPERATIONS = Object.freeze(ORCHESTRATION_RUNTIME_OPERATIONS.slice(4));
const SMOKE_AGENT_RUNTIME_OPERATIONS = Object.freeze([
  "fixture-setup",
  "fixture-provenance",
  "entity-absence",
  "cleanup-absence",
]);
const REQUIRED_FIXTURE_KINDS = Object.freeze([
  "user-a",
  "user-b",
  "content-type-editable",
  "content-type-related-a",
  "content-type-related-b",
  "related-entry-a",
  "related-entry-b",
  "editable-entry",
  "screen",
  "media",
]);
const REQUIRED_CLEANUP_RESOURCE_KINDS = Object.freeze([
  "session-user-a",
  "session-user-b",
  "setting-user-a",
  "presentation-override",
  "media-storage-object",
]);
const SCREENSHOT_PATHS = Object.freeze([
  "_docs/_workflows/_smoke/task-540-wf540smoke-button-image-light.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-media-prior-pending.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-content-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-tabs-keyboard-light.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-space-selection-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-save-failure.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-dirty-guards-final.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-related-a-stale.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-related-b-dark.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-a-light.png",
  "_docs/_workflows/_smoke/task-540-wf540smoke-responsive-user-b-dark.png",
]);
const REQUIRED_SMOKE_ASSERTIONS = Object.freeze({
  "button-image": [
    "persisted-no-empty-binding",
    "safe-link-front-url",
    "unsafe-link-disabled",
    "direct-image-safe-url",
    "missing-or-unsafe-placeholder",
    "stale-media-result-ignored",
    "media-field-keeps-uuid",
  ],
  "tabs-content": [
    "three-tabs-persisted",
    "one-panel-visible",
    "other-panels-zero-geometry",
    "armed-slot-equals-active-tab",
  ],
  "tabs-keyboard-aria": [
    "arrow-home-end-focus",
    "aria-reciprocal",
    "nested-tabs-isolated",
    "renderer-ids-unique",
  ],
  "space-selection": [
    "space-text-preserved",
    "nested-controls-do-not-select",
    "selection-handle-independent",
  ],
  "dirty-guards": [
    "builder-cancel-byte-identical",
    "builder-confirm-navigates-once",
    "entry-error-retains-both-drafts",
    "beforeunload-active",
    "successful-retry-clears-persisted-channel",
  ],
  "related-retry-cache": [
    "visible-retry-succeeds",
    "same-target-rows-refreshing",
    "target-switch-immediate-empty",
    "stale-a-cannot-commit",
    "only-b-rows-visible",
    "dirty-draft-byte-identical",
  ],
  "responsive-users": [
    "narrow-padding-and-positive-geometry",
    "wide-padding-delta-300",
    "panel-inside-viewport",
    "user-a-b-a-isolated",
    "same-user-authoritative-refresh",
    "newer-local-write-wins-refresh",
    "legacy-local-storage-absent",
    "light-and-dark-computed",
    "preference-a-write-hit-before-release",
    "preference-a-write-hit-after-release",
    "queued-a-write-zero-dispatch",
    "user-b-default-unchanged",
  ],
});

const EXACT_SMOKE_ASSERTION_OUTPUTS = Object.freeze({
  "responsive-users": Object.freeze({
    "preference-a-write-hit-before-release": "1",
    "preference-a-write-hit-after-release": "1",
    "queued-a-write-zero-dispatch": "0",
    "user-b-default-unchanged": '{"before":false,"after":false}',
  }),
});

const RUNTIME_SUBJECT_KINDS = Object.freeze([
  null,
  "helper",
  ...REQUIRED_FIXTURE_KINDS,
  ...REQUIRED_CLEANUP_RESOURCE_KINDS,
]);
const RUNTIME_RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "sequence",
    "operation",
    "operationDescriptor",
    "status",
    "evidenceSha256",
    "subjectKind",
    "subjectIdentifier",
    "sanitizedOutput",
  ],
  properties: {
    sequence: { type: "integer", minimum: 1 },
    operation: { enum: REQUIRED_RUNTIME_OPERATIONS },
    operationDescriptor: { type: "string", minLength: 1, maxLength: 8192 },
    status: { const: 0 },
    evidenceSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    subjectKind: { enum: RUNTIME_SUBJECT_KINDS },
    subjectIdentifier: { type: ["string", "null"], minLength: 1, maxLength: 240 },
    sanitizedOutput: { type: "string", maxLength: 4096 },
  },
};

const BROWSER_RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "scenario",
    "sequence",
    "operation",
    "routeKey",
    "routeMethod",
    "routePattern",
    "command",
    "status",
    "stdoutSha256",
    "stderrSha256",
    "stdoutDiscarded",
    "assertionName",
    "sanitizedOutput",
  ],
  properties: {
    scenario: { enum: SMOKE_RECEIPT_SCENARIOS },
    sequence: { type: "integer", minimum: 1 },
    operation: { type: "string", minLength: 1, maxLength: 80 },
    routeKey: { enum: [null, ...Object.keys(ROUTE_EXPECTATIONS)] },
    routeMethod: { enum: [null, "GET", "PATCH"] },
    routePattern: { type: ["string", "null"], minLength: 1, maxLength: 512 },
    command: {
      oneOf: [
        {
          type: "string",
          pattern: "^playwright-cli -s=wf540smoke --raw [^\\n]+$",
        },
        { const: "playwright-cli --raw list" },
      ],
    },
    status: { const: 0 },
    stdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    stderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    stdoutDiscarded: { type: "boolean" },
    assertionName: { type: ["string", "null"], minLength: 1, maxLength: 120 },
    sanitizedOutput: { type: "string", maxLength: 4096 },
  },
};

const ORCHESTRATION_CLEANUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "summary",
    "errors",
    "prefix",
    "browserRecoveryRequired",
    "browserRecoveryComplete",
    "browserReceipts",
    "runtimeReceipts",
  ],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    prefix: { type: "string", pattern: "^wf540-[a-zA-Z0-9_-]+$" },
    browserRecoveryRequired: { type: "boolean" },
    browserRecoveryComplete: { type: "boolean" },
    browserReceipts: {
      type: "array",
      maxItems: FINAL_BROWSER_CLEANUP_COUNT + 1,
      items: BROWSER_RECEIPT_SCHEMA,
    },
    runtimeReceipts: {
      type: "array",
      minItems: CLEANUP_AGENT_RUNTIME_OPERATIONS.length,
      maxItems: CLEANUP_AGENT_RUNTIME_OPERATIONS.length,
      items: RUNTIME_RECEIPT_SCHEMA,
    },
  },
};

const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "summary",
    "errors",
    "adminUp",
    "frontUp",
    "helper",
    "session",
    "browserReceipts",
    "runtimeReceipts",
    "routes",
    "scenarios",
    "fixtures",
    "screenshots",
    "consoleErrors",
    "consoleWarnings",
    "pageErrors",
    "themeRestored",
    "bootstrapAdminRestored",
    "legacyLocalStorageAbsent",
    "failures",
  ],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    adminUp: { type: "boolean" },
    frontUp: { type: "boolean" },
    helper: {
      type: "object",
      additionalProperties: false,
      required: [
        "launchCommand",
        "handle",
        "helperPid",
        "startedAtEpochMs",
        "adminHealthUrl",
        "adminHealthStatus",
        "frontHealthUrl",
        "frontHealthStatus",
        "stopped",
        "processesAbsent",
        "childProcesses",
        "portsAbsent",
      ],
      properties: {
        launchCommand: { const: SMOKE_HELPER_COMMAND },
        handle: { type: "string", minLength: 1 },
        helperPid: { type: "integer", minimum: 1 },
        startedAtEpochMs: { type: "integer", minimum: 1 },
        adminHealthUrl: { const: ADMIN_HEALTH_URL },
        adminHealthStatus: { const: 200 },
        frontHealthUrl: { const: FRONT_HEALTH_URL },
        frontHealthStatus: { const: 200 },
        stopped: { type: "boolean" },
        processesAbsent: { type: "boolean" },
        childProcesses: {
          type: "array",
          minItems: HELPER_CHILD_KINDS.length,
          maxItems: HELPER_CHILD_KINDS.length,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["kind", "pid", "ppid", "ancestry", "absent"],
            properties: {
              kind: { enum: HELPER_CHILD_KINDS },
              pid: { type: "integer", minimum: 1 },
              ppid: { type: "integer", minimum: 1 },
              ancestry: {
                type: "array",
                minItems: 2,
                uniqueItems: true,
                items: { type: "integer", minimum: 1 },
              },
              absent: { type: "boolean" },
            },
          },
        },
        portsAbsent: {
          type: "array",
          minItems: 0,
          maxItems: HELPER_PORTS.length,
          items: { enum: HELPER_PORTS },
        },
      },
    },
    session: {
      type: "object",
      additionalProperties: false,
      required: ["name", "opened", "routesEmpty", "closed", "finalAbsent"],
      properties: {
        name: { const: "wf540smoke" },
        opened: { type: "boolean" },
        routesEmpty: { type: "boolean" },
        closed: { type: "boolean" },
        finalAbsent: { type: "boolean" },
      },
    },
    browserReceipts: {
      type: "array",
      minItems: 30,
      items: BROWSER_RECEIPT_SCHEMA,
    },
    runtimeReceipts: {
      type: "array",
      minItems: REQUIRED_RUNTIME_OPERATIONS.length - 6,
      items: RUNTIME_RECEIPT_SCHEMA,
    },
    routes: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "key",
          "method",
          "expandedPattern",
          "mode",
          "hits",
          "installed",
          "hitRead",
          "released",
          "unrouted",
          "unroutedBeforeRetry",
        ],
        properties: {
          key: { enum: Object.keys(ROUTE_EXPECTATIONS) },
          method: { enum: ["GET", "PATCH"] },
          expandedPattern: { type: "string", minLength: 1 },
          mode: { enum: ["delayed-success", "malformed-json"] },
          hits: { const: 1 },
          installed: { const: true },
          hitRead: { const: true },
          released: { type: "boolean" },
          unrouted: { const: true },
          unroutedBeforeRetry: { type: "boolean" },
        },
      },
    },
    scenarios: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "kind",
          "theme",
          "viewports",
          "visibleAssertions",
          "screenshotPaths",
          "consoleErrors",
          "consoleWarnings",
          "pageErrors",
        ],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { enum: SMOKE_KINDS },
          theme: { enum: ["light", "dark", "light-dark"] },
          viewports: { type: "array", minItems: 1, items: { type: "string" } },
          visibleAssertions: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "actual", "pass"],
              properties: {
                name: { type: "string" },
                actual: { type: "string", minLength: 1, maxLength: 4096 },
                pass: { const: true },
              },
            },
          },
          screenshotPaths: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
          consoleErrors: { type: "array", items: { type: "string" } },
          consoleWarnings: { type: "array", items: { type: "string" } },
          pageErrors: { type: "array", items: { type: "string" } },
        },
      },
    },
    fixtures: {
      type: "object",
      additionalProperties: false,
      required: ["prefix", "items", "cleanupResources", "cleanupOrderVerified"],
      properties: {
        prefix: { type: "string", pattern: "^wf540-[a-zA-Z0-9_-]+$" },
        items: {
          type: "array",
          minItems: REQUIRED_FIXTURE_KINDS.length,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["kind", "id", "slug", "acquired", "cleaned", "absenceVerified"],
            properties: {
              kind: { enum: REQUIRED_FIXTURE_KINDS },
              id: { type: "string", minLength: 1 },
              slug: {
                type: ["string", "null"],
                pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                maxLength: 120,
              },
              acquired: { const: true },
              cleaned: { const: true },
              absenceVerified: { const: true },
            },
          },
        },
        cleanupResources: {
          type: "array",
          minItems: REQUIRED_CLEANUP_RESOURCE_KINDS.length,
          maxItems: 32,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "kind",
              "identifierType",
              "scopedIdentifier",
              "acquired",
              "cleaned",
              "absenceVerified",
              "sanitizedProbe",
            ],
            properties: {
              kind: { enum: REQUIRED_CLEANUP_RESOURCE_KINDS },
              identifierType: { enum: ["db-id", "composite-key", "storage-key"] },
              scopedIdentifier: { type: "string", minLength: 1, maxLength: 240 },
              acquired: { const: true },
              cleaned: { const: true },
              absenceVerified: { const: true },
              sanitizedProbe: { type: "string", minLength: 1, maxLength: 512 },
            },
          },
        },
        cleanupOrderVerified: { const: true },
      },
    },
    screenshots: {
      type: "array",
      minItems: SCREENSHOT_PATHS.length,
      maxItems: SCREENSHOT_PATHS.length,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "size", "sha256", "signature", "mtimeMs", "device", "inode", "command"],
        properties: {
          path: { enum: SCREENSHOT_PATHS },
          size: { type: "integer", minimum: 1 },
          sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          signature: { const: "89504e470d0a1a0a" },
          mtimeMs: { type: "number", minimum: 1 },
          device: { type: "integer", minimum: 1 },
          inode: { type: "integer", minimum: 1 },
          command: { type: "string", minLength: 1 },
        },
      },
    },
    consoleErrors: { type: "array", items: { type: "string" } },
    consoleWarnings: { type: "array", items: { type: "string" } },
    pageErrors: { type: "array", items: { type: "string" } },
    themeRestored: { type: "boolean" },
    bootstrapAdminRestored: { type: "boolean" },
    legacyLocalStorageAbsent: { type: "boolean" },
    failures: { type: "array", items: { type: "string" } },
  },
};

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
const REQUIRED_SMOKE_CREDENTIAL_KEYS = Object.freeze(["ADMIN_EMAIL", "ADMIN_PASSWORD"]);
const UUID_IDENTIFIER_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_SECRET_IDENTIFIER_PATTERN = /^(?:[a-f0-9]{32,}|[a-zA-Z0-9_+=/]{48,})$/;
const EMAIL_FILL_COMMAND =
  /^playwright-cli -s=wf540smoke --raw fill 'input\[type="email"\]' "\$(?:ADMIN_EMAIL|WF540_USER_A_EMAIL|WF540_USER_B_EMAIL)" >\/dev\/null$/;
const PASSWORD_FILL_COMMAND =
  /^playwright-cli -s=wf540smoke --raw fill 'input\[type="password"\]' "\$ADMIN_PASSWORD" >\/dev\/null$/;
const CREDENTIAL_REFERENCE_PATTERN =
  /\$(?:ADMIN_EMAIL|ADMIN_PASSWORD|WF540_USER_A_EMAIL|WF540_USER_B_EMAIL)/;
const ENV_REFERENCE_PATTERN = /\$[A-Z][A-Z0-9_]*/;
const CREDENTIAL_SELECTOR_PATTERN = /input\[type=["']?(?:email|password)["']?\]/;
const CONSOLE_CHANNEL_COMMANDS = Object.freeze({
  "console-errors": SMOKE_SESSION_PREFIX + "run-code '(page) => page.__wf540ConsoleErrors ?? []'",
  "console-warnings":
    SMOKE_SESSION_PREFIX + "run-code '(page) => page.__wf540ConsoleWarnings ?? []'",
  "page-errors": SMOKE_SESSION_PREFIX + "run-code '(page) => page.__wf540PageErrors ?? []'",
});
const LOGGER_INSTALL_COMMAND =
  SMOKE_SESSION_PREFIX +
  'run-code \'(page) => { page.__wf540ConsoleErrors = []; page.__wf540ConsoleWarnings = []; page.__wf540PageErrors = []; page.on("console", (message) => { if (message.type() === "error") page.__wf540ConsoleErrors.push(message.text()); if (message.type() === "warning") page.__wf540ConsoleWarnings.push(message.text()); }); page.on("pageerror", (error) => page.__wf540PageErrors.push(error.message)); return true; }\'';
const FINAL_BROWSER_CLEANUP = Object.freeze([
  Object.freeze({
    operation: "cleanup-release-unroute",
    command:
      SMOKE_SESSION_PREFIX +
      "run-code '(page) => (async () => { for (const release of Object.values(page.__wf540Releases ?? {})) release(); await page.unrouteAll({ behavior: \"wait\" }); return true; })()'",
    assertionName: "cleanup-release-unroute",
    sanitizedOutput: "true",
  }),
  Object.freeze({
    operation: "cleanup-route-list",
    command: SMOKE_SESSION_PREFIX + "route-list",
    assertionName: "cleanup-route-list",
    sanitizedOutput: "[]",
  }),
  Object.freeze({
    operation: "cleanup-console-errors",
    command: CONSOLE_CHANNEL_COMMANDS["console-errors"],
    assertionName: "cleanup-console-errors",
    sanitizedOutput: "[]",
  }),
  Object.freeze({
    operation: "cleanup-console-warnings",
    command: CONSOLE_CHANNEL_COMMANDS["console-warnings"],
    assertionName: "cleanup-console-warnings",
    sanitizedOutput: "[]",
  }),
  Object.freeze({
    operation: "cleanup-page-errors",
    command: CONSOLE_CHANNEL_COMMANDS["page-errors"],
    assertionName: "cleanup-page-errors",
    sanitizedOutput: "[]",
  }),
  Object.freeze({
    operation: "cleanup-close",
    command: SMOKE_SESSION_PREFIX + "close",
    assertionName: "cleanup-close",
    sanitizedOutput: "closed",
  }),
  Object.freeze({
    operation: "cleanup-session-absence",
    command: "playwright-cli --raw list",
    assertionName: "cleanup-session-absence",
    sanitizedOutput: "true",
  }),
]);

function buildSensitiveValueCorpus() {
  const values = new Set();
  const addClassifiedValue = (value) => {
    if (typeof value === "string" && value.length > 0) values.add(value);
  };

  for (const key of REQUIRED_SMOKE_CREDENTIAL_KEYS) {
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
  try {
    return requireSensitiveSafeAgentResult(await agent(prompt, options), options.label);
  } catch {
    // Agent/schema errors may contain rejected structured output. Discard the
    // original object/message before it can enter failures, logs, or a prompt.
    throw new Error(options.label + ": agent dispatch failed; details discarded");
  }
}

function isSafeEvidenceIdentifier(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 240) return false;
  if (hasSensitiveEvidence(value) || JWT_VALUE_PATTERN.test(value)) return false;
  if (UUID_IDENTIFIER_PATTERN.test(value)) return true;
  return !OPAQUE_SECRET_IDENTIFIER_PATTERN.test(value);
}

function exactReceipts(receipts, operation, predicate = () => true) {
  return receipts.filter((receipt) => receipt.operation === operation && predicate(receipt));
}

function runtimeSubjectMatches(receipt, kind, identifier) {
  return receipt.subjectKind === kind && receipt.subjectIdentifier === identifier;
}

const MAX_HOST_OUTPUT_BYTES = 64 * 1024;
const HOST_START_TIMEOUT_MS = 120_000;
const HOST_STOP_TIMEOUT_MS = 15_000;
const HOST_PROCESS_BY_PORT = Object.freeze({
  3000: "backend",
  5173: "admin-vite",
  5174: "site-vite",
});

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function makeRuntimeReceipt({
  operation,
  operationDescriptor,
  evidence,
  subjectKind,
  subjectIdentifier,
  sanitizedOutput,
}) {
  const evidenceBytes = Buffer.isBuffer(evidence) ? evidence : Buffer.from(String(evidence));
  return {
    sequence: 1,
    operation,
    operationDescriptor,
    status: 0,
    evidenceSha256: createHash("sha256").update(evidenceBytes).digest("hex"),
    subjectKind,
    subjectIdentifier,
    sanitizedOutput,
  };
}

function retainBoundedOutput(stream) {
  let retained = Buffer.alloc(0);
  stream?.on("data", (chunk) => {
    const next = Buffer.concat([retained, Buffer.from(chunk)]);
    retained =
      next.length <= MAX_HOST_OUTPUT_BYTES
        ? next
        : next.subarray(next.length - MAX_HOST_OUTPUT_BYTES);
  });
  return () => retained;
}

async function listenerPids(port) {
  try {
    const { stdout } = await execFileAsync("lsof", ["-nP", "-iTCP:" + port, "-sTCP:LISTEN", "-t"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 5_000,
    });
    return [
      ...new Set(
        stdout
          .split(/\s+/)
          .filter(Boolean)
          .map(Number)
          .filter((pid) => Number.isSafeInteger(pid) && pid > 0)
      ),
    ];
  } catch (error) {
    if (error && (error.code === 1 || error.code === "1")) return [];
    throw error;
  }
}

async function processParentPid(pid) {
  const { stdout } = await execFileAsync("ps", ["-o", "ppid=", "-p", String(pid)], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 5_000,
  });
  const ppid = Number(stdout.trim());
  if (!Number.isSafeInteger(ppid) || ppid <= 0) {
    throw new Error("TASK-540 could not resolve PPID for " + pid);
  }
  return ppid;
}

async function processAncestry(helperPid, pid) {
  const reversed = [pid];
  let current = pid;
  for (let depth = 0; current !== helperPid && depth < 32; depth += 1) {
    current = await processParentPid(current);
    reversed.push(current);
  }
  const ancestry = reversed.reverse();
  if (ancestry[0] !== helperPid || ancestry.at(-1) !== pid) {
    throw new Error("TASK-540 listener is not owned by helper PID " + helperPid);
  }
  return ancestry;
}

async function processGroupPids(groupPid) {
  const { stdout, stderr } = await execFileAsync("ps", ["-eo", "pid=,pgid="], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 5_000,
    maxBuffer: 1024 * 1024,
  });
  const pids = stdout
    .split("\n")
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter(([pid, pgid]) => Number.isSafeInteger(pid) && pid > 0 && pgid === groupPid)
    .map(([pid]) => pid);
  return { pids: [...new Set(pids)].sort((left, right) => left - right), stdout, stderr };
}

async function waitForExactHealth(commandValue, url, child) {
  const deadline = Date.now() + HOST_START_TIMEOUT_MS;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("TASK-540 helper exited before health: " + commandValue);
    }
    try {
      const result = await execFileAsync("curl", ["--fail", "--silent", "--show-error", url], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 5_000,
        maxBuffer: 1024 * 1024,
      });
      return {
        status: 200,
        evidence: Buffer.concat([Buffer.from(result.stdout), Buffer.from(result.stderr)]),
      };
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }
  throw new AggregateError(
    lastError ? [lastError] : [],
    "TASK-540 helper health timed out: " + commandValue
  );
}

async function terminateAndProveOwnedHostAbsence(child, helperPid) {
  if (helperPid) {
    signalOwnedProcessGroup(helperPid, "SIGTERM");
    if (!(await waitForChildExit(child, 5_000))) {
      signalOwnedProcessGroup(helperPid, "SIGKILL");
      await waitForChildExit(child, 5_000);
    }
  }

  const deadline = Date.now() + HOST_STOP_TIMEOUT_MS;
  let groupPids = helperPid ? [helperPid] : [];
  let portsAbsent = [];
  let observation = null;
  while (Date.now() < deadline) {
    const group = helperPid
      ? await processGroupPids(helperPid)
      : { pids: [], stdout: "", stderr: "" };
    groupPids = group.pids;
    const listeners = [];
    portsAbsent = [];
    for (const port of HELPER_PORTS) {
      const pids = await listenerPids(port);
      listeners.push({ port, pids });
      if (pids.length === 0) portsAbsent.push(port);
    }
    observation = {
      helperPid,
      childExited: child.exitCode !== null || child.signalCode !== null,
      groupPids,
      listeners,
    };
    if (
      groupPids.length === 0 &&
      portsAbsent.length === HELPER_PORTS.length &&
      (!helperPid || !processExists(helperPid))
    ) {
      return {
        groupPids,
        portsAbsent,
        evidence: Buffer.from(JSON.stringify(observation)),
      };
    }
    if (helperPid && groupPids.length > 0) signalOwnedProcessGroup(helperPid, "SIGKILL");
    await delay(100);
  }
  throw new Error(
    "TASK-540 owned helper startup/stop absence proof failed: " + JSON.stringify(observation)
  );
}

async function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.removeListener("exit", onExit);
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timer);
      resolve(true);
    };
    child.once("exit", onExit);
  });
}

function signalOwnedProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (error && error.code === "ESRCH") return false;
    throw error;
  }
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && error.code === "ESRCH") return false;
    throw error;
  }
}

async function startOwnedSmokeHost() {
  const occupied = [];
  for (const port of HELPER_PORTS) {
    if ((await listenerPids(port)).length > 0) occupied.push(port);
  }
  if (occupied.length > 0) {
    throw new Error("TASK-540 refuses to replace listeners on helper ports: " + occupied.join(","));
  }

  const startedAtEpochMs = Date.now();
  const child = spawn("coderso-dev-core-host", [ROOT], {
    cwd: ROOT,
    detached: true,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const readStdout = retainBoundedOutput(child.stdout);
  const readStderr = retainBoundedOutput(child.stderr);
  try {
    await new Promise((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    });
    if (!child.pid) throw new Error("TASK-540 helper spawn returned no PID");
    const launchEvidence = Buffer.from(
      JSON.stringify({ event: "spawn", pid: child.pid, command: SMOKE_HELPER_COMMAND })
    );
    const [adminHealth, frontHealth] = await Promise.all([
      waitForExactHealth(ADMIN_HEALTH_COMMAND, ADMIN_HEALTH_URL, child),
      waitForExactHealth(FRONT_HEALTH_COMMAND, FRONT_HEALTH_URL, child),
    ]);
    const adminHealthStatus = adminHealth.status;
    const frontHealthStatus = frontHealth.status;

    const childProcesses = [];
    const lineageReceipts = [];
    for (const port of HELPER_PORTS) {
      const pids = await listenerPids(port);
      if (pids.length !== 1) {
        throw new Error("TASK-540 expected one owned listener on port " + port);
      }
      const pid = pids[0];
      const ancestry = await processAncestry(child.pid, pid);
      const kind = HOST_PROCESS_BY_PORT[port];
      const ppid = ancestry.at(-2);
      childProcesses.push({ kind, pid, ppid, ancestry, absent: false });
      lineageReceipts.push(
        makeRuntimeReceipt({
          operation: "pid-lineage",
          operationDescriptor:
            "node-observation:listenerPids(" +
            port +
            ")+processAncestry(" +
            child.pid +
            "," +
            pid +
            ")",
          evidence: Buffer.from(JSON.stringify({ kind, pid, ppid, ancestry, port })),
          subjectKind: "helper",
          subjectIdentifier: kind + ":" + pid,
          sanitizedOutput: JSON.stringify({ kind, pid, ppid, ancestry, port }),
        })
      );
    }
    const helperPid = child.pid;
    return {
      child,
      helperPid,
      readStdout,
      readStderr,
      helper: {
        launchCommand: SMOKE_HELPER_COMMAND,
        handle: "node-child-process:" + helperPid,
        helperPid,
        startedAtEpochMs,
        adminHealthUrl: ADMIN_HEALTH_URL,
        adminHealthStatus,
        frontHealthUrl: FRONT_HEALTH_URL,
        frontHealthStatus,
        stopped: false,
        processesAbsent: false,
        childProcesses,
        portsAbsent: [],
      },
      startReceipts: [
        makeRuntimeReceipt({
          operation: "helper-launch",
          operationDescriptor: "spawn:" + SMOKE_HELPER_COMMAND,
          evidence: launchEvidence,
          subjectKind: "helper",
          subjectIdentifier: String(helperPid),
          sanitizedOutput: "started helper pid " + helperPid,
        }),
        makeRuntimeReceipt({
          operation: "admin-health",
          operationDescriptor: ADMIN_HEALTH_OPERATION_DESCRIPTOR,
          evidence: adminHealth.evidence,
          subjectKind: "helper",
          subjectIdentifier: String(helperPid),
          sanitizedOutput: "HTTP 200",
        }),
        makeRuntimeReceipt({
          operation: "front-health",
          operationDescriptor: FRONT_HEALTH_OPERATION_DESCRIPTOR,
          evidence: frontHealth.evidence,
          subjectKind: "helper",
          subjectIdentifier: String(helperPid),
          sanitizedOutput: "HTTP 200",
        }),
        ...lineageReceipts,
      ],
    };
  } catch (error) {
    let absenceProof = null;
    let cleanupError = null;
    try {
      absenceProof = await terminateAndProveOwnedHostAbsence(child, child.pid ?? null);
    } catch (caught) {
      cleanupError = caught;
    }
    const aggregate = new AggregateError(
      [
        error,
        ...(cleanupError ? [cleanupError] : []),
        new Error(
          "bounded helper output bytes stdout=" +
            readStdout().length +
            " stderr=" +
            readStderr().length
        ),
      ],
      "TASK-540 owned helper failed to start"
    );
    aggregate.hostAbsenceProven =
      absenceProof !== null &&
      absenceProof.groupPids.length === 0 &&
      absenceProof.portsAbsent.length === HELPER_PORTS.length;
    throw aggregate;
  }
}

async function stopOwnedSmokeHost(host, prefix) {
  const helperPid = host.helperPid;
  const absenceProof = await terminateAndProveOwnedHostAbsence(host.child, helperPid);
  const portsAbsent = absenceProof.portsAbsent;
  const processObservations = host.helper.childProcesses.map(({ kind, pid }) => ({
    kind,
    pid,
    exists: processExists(pid),
  }));
  const portObservations = [];
  for (const port of HELPER_PORTS) {
    portObservations.push({ port, pids: await listenerPids(port) });
  }
  const processesAbsent =
    !processExists(helperPid) && processObservations.every(({ exists }) => !exists);
  if (
    !processesAbsent ||
    absenceProof.groupPids.length !== 0 ||
    portObservations.some(({ pids }) => pids.length > 0)
  ) {
    throw new Error("TASK-540 owned helper process/group/port absence proof failed");
  }

  const stoppedChildren = host.helper.childProcesses.map((item) => ({
    ...item,
    absent: true,
  }));
  const boundedOutput = {
    stdoutBytes: host.readStdout().length,
    stderrBytes: host.readStderr().length,
  };
  const stopReceipts = [
    makeRuntimeReceipt({
      operation: "helper-stop",
      operationDescriptor: "node:terminateAndProveOwnedHostAbsence(" + helperPid + ")",
      evidence: absenceProof.evidence,
      subjectKind: "helper",
      subjectIdentifier: String(helperPid),
      sanitizedOutput: "stopped helper pid " + helperPid,
    }),
    ...stoppedChildren.map((item) =>
      makeRuntimeReceipt({
        operation: "process-absence",
        operationDescriptor: "node:processExists(" + item.pid + ")",
        evidence: Buffer.from(
          JSON.stringify(processObservations.find(({ pid }) => pid === item.pid))
        ),
        subjectKind: "helper",
        subjectIdentifier: item.kind + ":" + item.pid,
        sanitizedOutput: "absent pid " + item.pid,
      })
    ),
    ...HELPER_PORTS.map((port) =>
      makeRuntimeReceipt({
        operation: "port-absence",
        operationDescriptor: "node:listenerPids(" + port + ")",
        evidence: Buffer.from(JSON.stringify(portObservations.find((item) => item.port === port))),
        subjectKind: "helper",
        subjectIdentifier: String(port),
        sanitizedOutput: "absent listener " + port,
      })
    ),
    makeRuntimeReceipt({
      operation: OUTER_HOST_RUNTIME_OPERATIONS[0],
      operationDescriptor: "node:retained-child-handle-and-process-group-stop(" + helperPid + ")",
      evidence: absenceProof.evidence,
      subjectKind: null,
      subjectIdentifier: prefix,
      sanitizedOutput:
        "owned helper group stopped and awaited; bounded stdoutBytes=" +
        boundedOutput.stdoutBytes +
        " stderrBytes=" +
        boundedOutput.stderrBytes +
        " limit=" +
        MAX_HOST_OUTPUT_BYTES,
    }),
    makeRuntimeReceipt({
      operation: OUTER_HOST_RUNTIME_OPERATIONS[1],
      operationDescriptor: "node:listenerPids(3000,5173,5174)+processGroupPids",
      evidence: Buffer.from(
        JSON.stringify({ groupPids: absenceProof.groupPids, portObservations })
      ),
      subjectKind: null,
      subjectIdentifier: prefix,
      sanitizedOutput: "owned helper processes and ports absent",
    }),
  ];
  return {
    helper: {
      ...host.helper,
      stopped: true,
      processesAbsent: true,
      childProcesses: stoppedChildren,
      portsAbsent,
    },
    stopReceipts,
    boundedOutput,
  };
}

function fixtureItem(smoke, kind) {
  return smoke.fixtures.items.find((item) => item.kind === kind);
}

function expectedRoutePattern(smoke, key) {
  if (key === "media-prior-resolution") return "**/admin/api/media";
  if (key === "preference-a-write-epoch") {
    return "**/admin/api/user-settings/customScreens.entry.preferences";
  }
  if (key === "entry-save-failure") {
    const type = fixtureItem(smoke, "content-type-editable");
    const entry = fixtureItem(smoke, "editable-entry");
    return `**/admin/api/content/${type?.slug}/entries/${entry?.id}`;
  }
  const typeKind = key === "related-b-load" ? "content-type-related-b" : "content-type-related-a";
  const type = fixtureItem(smoke, typeKind);
  return `**/admin/api/content/${type?.slug}/entries`;
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
    maxBuffer: 32 * 1024 * 1024,
  });
  return result.stdout;
}

function splitNul(value) {
  return value.split("\0").filter(Boolean);
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

async function worktreeSnapshot() {
  const [head, branch, tracked, untracked, staged] = await Promise.all([
    git(["rev-parse", "HEAD"]),
    git(["branch", "--show-current"]),
    git(["diff", "--name-only", "-z", "HEAD"]),
    git(["ls-files", "--others", "--exclude-standard", "-z"]),
    git(["diff", "--cached", "--name-only", "-z"]),
  ]);
  const paths = [...new Set([...splitNul(tracked), ...splitNul(untracked)])].sort();
  const hashes = {};
  for (const path of paths) hashes[path] = await hashPath(path);
  return {
    head: head.trim(),
    branch: branch.trim(),
    staged: splitNul(staged).sort(),
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
    staged: Object.freeze([...snapshot.staged]),
    paths: Object.freeze([...snapshot.paths]),
    hashes: Object.freeze({ ...snapshot.hashes }),
  });
}

function equalWorktreeAuthority(left, right) {
  return (
    left.head === right.head &&
    left.branch === right.branch &&
    JSON.stringify(left.staged) === JSON.stringify(right.staged) &&
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
    worktreeSnapshot(),
    hashSensitiveEnvProjection(),
  ]);
  if (authorityBefore.staged.length > 0) {
    throw new Error(label + ": staged files exist before exact snapshot capture");
  }
  const entries = await Promise.all(
    relativePaths.map((relativePath) => readOptionalRollbackFile(relativePath, label))
  );
  for (const entry of entries) {
    if (!entry.exists && !missingAllowed.has(entry.relativePath)) {
      throw new Error(label + ": required exact-rollback file is missing: " + entry.relativePath);
    }
  }
  const [authorityAfter, sensitiveEnvAfter] = await Promise.all([
    worktreeSnapshot(),
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
    worktreeSnapshot(),
    hashSensitiveEnvProjection(),
  ]);
  if (
    currentAuthority.head !== snapshot.authority.head ||
    currentAuthority.branch !== snapshot.authority.branch ||
    JSON.stringify(currentAuthority.staged) !== JSON.stringify(snapshot.authority.staged) ||
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
      worktreeSnapshot(),
      hashSensitiveEnvProjection(),
    ]);
    const residualDelta = snapshotDelta(snapshot.authority, after);
    const authorityRestored =
      after.head === snapshot.authority.head &&
      after.branch === snapshot.authority.branch &&
      JSON.stringify(after.staged) === JSON.stringify(snapshot.authority.staged) &&
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
    staged: staged.trim(),
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
    worktreeSnapshot(),
    hashSensitiveEnvProjection(),
  ]);
  if (before.staged.length > 0) {
    throw new Error(options.label + ": read-only dispatch refused a non-empty staged pre-state");
  }
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
      worktreeSnapshot(),
      hashSensitiveEnvProjection(),
    ]);
    const delta = snapshotDelta(before, after);
    if (
      before.head !== after.head ||
      before.branch !== after.branch ||
      JSON.stringify(after.staged) !== JSON.stringify(before.staged) ||
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

async function captureFixtureOnlySources(owner) {
  const sources = new Map();
  for (const relativePath of owner.fixtureOnlyFiles ?? []) {
    sources.set(relativePath, await readFile(ROOT + "/" + relativePath, "utf8"));
  }
  return sources;
}

async function verifyFixtureOnlySources(owner, beforeSources) {
  for (const relativePath of owner.fixtureOnlyFiles ?? []) {
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
    worktreeSnapshot(),
    hashSensitiveEnvProjection(),
    captureSharedMutationProjections(owner),
  ]);
  if (before.staged.length > 0) throw new Error(options.label + ": staged files exist");
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
      worktreeSnapshot(),
      hashSensitiveEnvProjection(),
    ]);
    const delta = snapshotDelta(before, after);
    await verifyFixtureOnlySources(owner, fixtureOnlySources);
    await verifySharedMutationProjections(owner, sharedProjectionBefore, options.label);
    if (
      before.head !== after.head ||
      before.branch !== after.branch ||
      after.staged.length > 0 ||
      !equalHashMaps(sensitiveEnvBefore, sensitiveEnvAfter)
    ) {
      throw new Error(options.label + ": agent staged, committed, or changed branch");
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

function command(id, value) {
  return Object.freeze({ id, command: value });
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
        "tests/vitest/admin/custom-screen-schemas.test.ts",
        "tests/vitest/customScreens/screen-document-image-src.test.ts",
        "tests/integration/routes/customScreensRoutes.test.ts",
      ]),
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
        command("bun", ENV + "bun test tests/integration/routes/customScreensRoutes.test.ts"),
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
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
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
          ])
        ),
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
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/ui/custom-screens-page.test.tsx",
            "tests/vitest/ui/custom-screen-route-params.test.ts",
            "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
            "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
            "tests/vitest/admin/cacheBus.test.ts",
          ])
        ),
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
        "tests/unit/settings/userSettingsService.test.ts",
        "tests/vitest/admin/userSettingsClient.test.ts",
        "tests/vitest/ui/admin-auth-identity.test.tsx",
        "tests/vitest/ui/assistant-panel-interaction.test.tsx",
        "tests/vitest/ui/use-screen-entry-preferences.test.ts",
        "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx",
        "tests/integration/routes/userSettings.test.ts",
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
            "tests/integration/routes/userSettings.test.ts"
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
const leafRestrictionPrompt = (leaf) => {
  const restrictions = [];
  if (leaf.fixtureOnlyFiles?.length) {
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

function readClosureLeafGateReceipt(source, label) {
  const receipts = CLOSURE_GATE_FIELDS.flatMap((field) => {
    const value = readTaskMetadataField(source, field);
    return value ? [Object.freeze({ field, value })] : [];
  });
  if (receipts.length !== 1) {
    throw new Error(label + ": closure leaf must carry exactly one gate receipt");
  }
  return receipts[0];
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

function readTask540BoardState(source) {
  const rows = [...source.matchAll(/^\| TASK-540 \|.*$/gm)];
  if (rows.length !== 1) throw new Error("TASK-540 board row is missing or duplicated");
  const rowIndex = rows[0].index ?? -1;
  const toDoStart = source.indexOf("## To Do");
  const inProgressStart = source.indexOf("## In Progress");
  const doneStart = source.indexOf("## Done");
  const bucket =
    rowIndex > toDoStart && rowIndex < inProgressStart
      ? "toDo"
      : rowIndex > inProgressStart && rowIndex < doneStart
        ? "inProgress"
        : rowIndex > doneStart
          ? "done"
          : null;
  if (!bucket) throw new Error("TASK-540 board row is outside a canonical bucket");
  return Object.freeze({ bucket, row: rows[0][0], stats: readTaskBoardStats(source) });
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
  const taskLines = [...changelogSource.matchAll(/^Tasks:\s*(.+)$/gm)].map((match) => match[1]);
  if (
    !changelogSource.startsWith("# 1252 - " + CHANGELOG_TITLE_PREFIX + "\n") ||
    h1Lines.length !== 1 ||
    dateLines.length !== 1 ||
    dateLines[0] !== filenameDate ||
    versionLines.length !== 1 ||
    versionLines[0] !== "Unreleased" ||
    taskLines.length !== 1 ||
    !/\bTASK-540\b/.test(taskLines[0])
  ) {
    throw new Error("TASK-540 changelog metadata does not match its pinned file/index contract");
  }
  return indexRows[0][0];
}

async function validateTerminalResumeState() {
  const taskStates = await Promise.all(
    TASK_PATHS.map(async (relativePath) => ({
      relativePath,
      ...(await readCanonicalTaskStatus(relativePath)),
    }))
  );
  for (const state of taskStates) {
    if (
      state.status !== RESUME_TASK_STATUS.done ||
      !readTaskMetadataField(state.source, "Completed")
    ) {
      throw new Error("TASK-540 terminal restart found an open contract: " + state.relativePath);
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
  if (!terminalCandidate && readTaskMetadataField(rootState.source, "Completed")) {
    throw new Error("TASK-540 active root retained stale Completed evidence");
  }

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
    const targetedGate = readTaskMetadataField(state.source, "Targeted Gate Passed");
    const revalidation = readTaskMetadataField(state.source, "Revalidation Passed");
    const repairPending = readTaskMetadataField(state.source, "Repair Pending");
    if (repairPending) parseRepairPending(repairPending, "TASK-" + leaf.id);
    if (state.status === RESUME_TASK_STATUS.done && !completed) {
      throw new Error("TASK-" + leaf.id + ": Done without exact Completed evidence");
    }
    if (state.status === RESUME_TASK_STATUS.done && repairPending) {
      throw new Error("TASK-" + leaf.id + ": Done with a pending repair");
    }
    if (state.status !== RESUME_TASK_STATUS.done && completed) {
      throw new Error("TASK-" + leaf.id + ": active/unstarted contract retained Completed");
    }
    const landed =
      state.status === RESUME_TASK_STATUS.done ||
      (state.status === RESUME_TASK_STATUS.active &&
        !repairPending &&
        Boolean(targetedGate || revalidation));
    leafStates.push({
      id: leaf.id,
      status: state.status,
      landed,
      completed,
      targetedGate,
      revalidation,
      repairPending,
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
      const isClosureLeaf = state.id === "540-06-L01";
      const expectedStatus = isClosureLeaf ? RESUME_TASK_STATUS.active : RESUME_TASK_STATUS.done;
      if (
        state.status !== expectedStatus ||
        (isClosureLeaf && !state.targetedGate && !state.revalidation)
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
    if (
      expectedChildStatus === RESUME_TASK_STATUS.done &&
      !readTaskMetadataField(childState.source, "Completed")
    ) {
      throw new Error("TASK-" + childId + ": Done without exact Completed evidence");
    }
    if (
      expectedChildStatus !== RESUME_TASK_STATUS.done &&
      readTaskMetadataField(childState.source, "Completed")
    ) {
      throw new Error("TASK-" + childId + ": active/unstarted child retained Completed");
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
      leafStates.map(({ id, status, landed, evidence, repairPending }) =>
        Object.freeze({ id, status, landed, evidence, repairPending })
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
        const exactUngatedRestart =
          gateReceipts.length === 0 &&
          resumeState.mode === "initial" &&
          resumeState.startIndex === LEAVES.length - 1 &&
          resumeState.startLeafId === "540-06-L01" &&
          JSON.stringify(resumeState.remainingLeafIds) === JSON.stringify(["540-06-L01"]);
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

async function transitionLeafStatus(leaf, transition, reason, repairPending = null) {
  const group = LEAF_STATUS_GROUPS[leaf.id];
  if (!group) throw new Error("Missing status group for " + leaf.id);
  const closureReceiptsBefore = await captureClosureContractReceipts();
  const preserveResumeEvidence =
    transition === "complete" && reason.includes("resume-existing-gate");
  const repairCompletion = transition === "complete" && Boolean(repairPending);
  const closeSourceLeaf = transition === "complete" && !group.holdUntilClosure;
  const expectedLeafStatus = closeSourceLeaf ? RESUME_TASK_STATUS.done : RESUME_TASK_STATUS.active;
  const siblingStates = await Promise.all(
    group.leafIds.map(async (leafId) => {
      if (leafId === leaf.id) return { id: leafId, status: expectedLeafStatus };
      const siblingGroup = LEAF_STATUS_GROUPS[leafId];
      const siblingState = await readCanonicalTaskStatus(siblingGroup.leafPath);
      return { id: leafId, status: siblingState.status };
    })
  );
  const expectedChildStatus = siblingStates.every(
    ({ status }) => status === RESUME_TASK_STATUS.done
  )
    ? RESUME_TASK_STATUS.done
    : RESUME_TASK_STATUS.active;
  const sourceReceiptAction = closeSourceLeaf
    ? " Remove stale Closure Pending/Closure Evidence SHA-256/Closure Generation/Closure Board Baseline/Closure Changelog Path fields from the exact source leaf and, when it becomes Done, its child; those receipts belong only to the closure contracts."
    : "";
  const startMetadataField = reason.includes("repair") ? "Fix Started" : "Started";
  const childMutableFields =
    transition === "start"
      ? [startMetadataField]
      : expectedChildStatus === RESUME_TASK_STATUS.done
        ? ["Completed", ...(closeSourceLeaf ? CLOSURE_RECEIPT_FIELDS : [])]
        : [];
  const leafGateMutableFields = repairCompletion
    ? ["Targeted Gate Passed", "Revalidation Passed", "Repair Pending"]
    : preserveResumeEvidence
      ? []
      : [reason.includes("regate") ? "Revalidation Passed" : "Targeted Gate Passed"];
  const leafMutableFields =
    transition === "start"
      ? [startMetadataField]
      : [
          ...(closeSourceLeaf ? ["Completed", ...CLOSURE_RECEIPT_FIELDS] : []),
          ...leafGateMutableFields,
        ];
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
        ? group.holdUntilClosure
          ? "Keep the closure leaf and child In Progress, remove its exact Repair Pending receipt, and record a fresh matching Revalidation Passed receipt for this repair generation/token."
          : "Mark the exact repaired source leaf Done with Completed, remove its exact Repair Pending receipt, and record a fresh matching Revalidation Passed receipt. Mark its child Done with Completed only when every physical leaf under that child is Done; otherwise keep the child In Progress."
        : group.holdUntilClosure
          ? reason.includes("regate")
            ? "Keep the closure leaf and child In Progress and add/update a dedicated Revalidation Passed field with the green re-gate evidence."
            : "Keep the closure leaf and child In Progress and add/update a dedicated Targeted Gate Passed field with the green targeted-gate evidence."
          : preserveResumeEvidence
            ? "Mark the exact source leaf Done with Completed while preserving its existing exact Targeted Gate Passed or Revalidation Passed receipt. Mark its child Done with Completed only when every physical leaf under that child is Done; otherwise keep the child In Progress."
            : reason.includes("regate")
              ? "Mark the exact source leaf Done with Completed and add/update a dedicated Revalidation Passed field with the green re-gate evidence. Mark its child Done with Completed only when every physical leaf under that child is Done; otherwise keep the child In Progress."
              : "Mark the exact source leaf Done with Completed and add/update a dedicated Targeted Gate Passed field with the green targeted-gate evidence. Mark its child Done with Completed only when every physical leaf under that child is Done; otherwise keep the child In Progress.";

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
        sourceReceiptAction +
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
        "status fields and dedicated Started/Fix Started/Targeted Gate Passed/Revalidation Passed fields " +
        "plus Completed when a contract becomes Done, all dated " +
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
    if (readTaskMetadataField(rootState.source, "Completed")) {
      throw new Error("TASK-540 active root retained Completed after transition " + leaf.id);
    }
    if (childState.status !== expectedChildStatus) {
      throw new Error("TASK-540 child status transition mismatch for " + group.childId);
    }
    if (
      (expectedLeafStatus !== RESUME_TASK_STATUS.done &&
        readTaskMetadataField(leafState.source, "Completed")) ||
      (expectedChildStatus !== RESUME_TASK_STATUS.done &&
        readTaskMetadataField(childState.source, "Completed"))
    ) {
      throw new Error("TASK-540 active leaf/child retained Completed for " + leaf.id);
    }
    requireTableStatus(childState.source, leaf.id, expectedLeafStatus, "TASK-540 child");
    requireTableStatus(rootState.source, group.childId, expectedChildStatus, "TASK-540 root");
    if (transition === "complete") {
      const hasExpectedEvidence = repairCompletion
        ? readTaskMetadataField(leafState.source, "Revalidation Passed") ===
          repairGateValue(repairPending)
        : preClosureGateValue
          ? readTaskMetadataField(leafState.source, "Revalidation Passed") === preClosureGateValue
          : preserveResumeEvidence
            ? Boolean(
                readTaskMetadataField(leafState.source, "Targeted Gate Passed") ||
                readTaskMetadataField(leafState.source, "Revalidation Passed")
              )
            : Boolean(
                readTaskMetadataField(
                  leafState.source,
                  reason.includes("regate") ? "Revalidation Passed" : "Targeted Gate Passed"
                )
              );
      if (!hasExpectedEvidence) {
        throw new Error("TASK-540 missing gate evidence field for " + leaf.id);
      }
      if (leaf.id === "540-06-L01") {
        const currentGateReceipt = readClosureLeafGateReceipt(
          leafState.source,
          "TASK-540 closure leaf transition"
        );
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
      if (closeSourceLeaf && !readTaskMetadataField(leafState.source, "Completed")) {
        throw new Error("TASK-540 missing Completed evidence for " + leaf.id);
      }
      if (
        closeSourceLeaf &&
        [
          "Closure Pending",
          "Closure Evidence SHA-256",
          "Closure Generation",
          "Closure Board Baseline",
          CLOSURE_CHANGELOG_PATH_FIELD,
        ].some((field) => readTaskMetadataField(leafState.source, field))
      ) {
        throw new Error("TASK-540 source leaf retained a closure-only receipt: " + leaf.id);
      }
      if (
        expectedChildStatus === RESUME_TASK_STATUS.done &&
        !readTaskMetadataField(childState.source, "Completed")
      ) {
        throw new Error("TASK-540 missing child Completed evidence for " + group.childId);
      }
      if (
        closeSourceLeaf &&
        expectedChildStatus === RESUME_TASK_STATUS.done &&
        [
          "Closure Pending",
          "Closure Evidence SHA-256",
          "Closure Generation",
          "Closure Board Baseline",
          CLOSURE_CHANGELOG_PATH_FIELD,
        ].some((field) => readTaskMetadataField(childState.source, field))
      ) {
        throw new Error("TASK-540 source child retained a closure-only receipt: " + group.childId);
      }
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
  const result = await runReadOnlyAgent(
    "Read-only gate attempt " +
      attempt +
      " for " +
      leaf.id +
      " at " +
      ROOT +
      ". Run this exact fail-fast ordered command list using literal && between commands:\n" +
      leaf.commands.map(({ id, command: value }) => id + ": " + value).join("\n") +
      "\nReturn the exact executed command prefix and statuses. On a named test failure, " +
      "rerun that exact file alone once before classifying it. Missing DB, executable, or " +
      "network is infrastructure and must not trigger an edit. Do not edit.",
    { label: "gate:" + leaf.id + ":" + attempt, phase: phaseName, schema: GATE_SCHEMA }
  );
  if (result.pass) {
    if (
      !resultPassed(result) ||
      result.failureKind !== "none" ||
      result.failedCommand !== null ||
      result.commands.length !== leaf.commands.length ||
      result.commands.some(
        (receipt, index) =>
          receipt.id !== leaf.commands[index].id ||
          receipt.command !== leaf.commands[index].command ||
          receipt.status !== 0
      )
    ) {
      throw new Error(leaf.id + ": passing gate receipt mismatch");
    }
  } else {
    const prefixValid =
      result.commands.length <= leaf.commands.length &&
      result.commands.every(
        (receipt, index) =>
          receipt.id === leaf.commands[index].id && receipt.command === leaf.commands[index].command
      );
    if (!prefixValid || result.failureKind === "none" || typeof result.failedCommand !== "string") {
      throw new Error(leaf.id + ": failed gate receipt mismatch");
    }
  }
  return result;
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
        gate.errors.join("\n- ") +
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
        gate.errors.join("\n- ") +
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
      JSON.stringify(leaf.allowedFiles) +
      leafRestrictionPrompt(leaf) +
      ". Preserve every later Done leaf byte-identically. Return exact touchedFiles; no task, " +
      "board, changelog, workflow, stage, or commit changes.",
    { label: "repair-resume:" + leaf.id, phase: leaf.phase },
    leaf,
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
        JSON.stringify(leaf.allowedFiles) +
        leafRestrictionPrompt(leaf) +
        ". Do not weaken an assertion. Failures:\n- " +
        gate.errors.join("\n- "),
      { label: "repair-resume-fix:" + leaf.id + ":" + attempt, phase: leaf.phase },
      leaf,
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
  const result = await runReadOnlyAgent(
    "Read-only full TASK-540 validation at " +
      ROOT +
      ". Run every exact command sequentially and retain all structured receipts:\n" +
      FULL_GATE_COMMANDS.map(({ id, command: value }) => id + ": " + value).join("\n") +
      "\nThe DB preflight must report configured/reachable/selectOne and explicitly exits 0. " +
      "Rerun each named failing test file alone once. Do not edit. The strict scan is never " +
      "suppressed and must not be called green: its only accepted non-zero result is the sole " +
      "unchanged TASK-545-owned finding " +
      JSON.stringify(KNOWN_STRICT_FINDING) +
      ". Any TASK-540/new/tooling finding makes pass=false. Never print env values.",
    { label, phase: phaseName, schema: FULL_GATE_SCHEMA }
  );
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
        mutableFields: Object.freeze(["Fix Started"]),
      }),
      Object.freeze({
        relativePath: group.leafPath,
        tableTaskIds: [],
        mutableFields: Object.freeze([
          "Fix Started",
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
        "` and do not write Targeted Gate Passed, Revalidation Passed, Repair Pending, Completed, " +
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
    if (
      [rootState, childState, leafState].some(
        ({ status, source }) =>
          status !== RESUME_TASK_STATUS.active ||
          readTaskMetadataField(source, "Completed") ||
          readTaskMetadataField(source, "Repair Pending")
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
        mutableFields: Object.freeze(["Fix Started", "Completed"]),
      }),
      Object.freeze({
        relativePath: group.leafPath,
        tableTaskIds: [],
        mutableFields: Object.freeze([
          "Fix Started",
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
        "gate can satisfy this repair. Remove Completed from the active direct child. Keep unrelated " +
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
    if (
      readTaskMetadataField(leafState.source, "Repair Pending") !== repairPending ||
      readTaskMetadataField(rootState.source, "Completed") ||
      readTaskMetadataField(leafState.source, "Completed") ||
      readTaskMetadataField(leafState.source, "Targeted Gate Passed") ||
      readTaskMetadataField(leafState.source, "Revalidation Passed") ||
      readTaskMetadataField(childState.source, "Completed") ||
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
    const boardRow = boardSource.split("\n").find((line) => line.startsWith("| TASK-540 |"));
    if (!boardRow?.includes("🚧 In progress")) {
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
    const group = LEAF_STATUS_GROUPS[ownerId];
    const fixOwner = afterClosure
      ? Object.freeze({
          ...leaf,
          allowedFiles: Object.freeze([
            ...new Set([...leaf.allowedFiles, ROOT_TASK_PATH, group.childPath, group.leafPath]),
          ]),
          requiredFiles: Object.freeze([]),
        })
      : leaf;
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

async function verifyScreenshots(smoke) {
  const actualPaths = smoke.screenshots.map(({ path }) => path);
  if (!sameUniqueSet(actualPaths, SCREENSHOT_PATHS)) {
    throw new Error("TASK-540 screenshot path set mismatch");
  }
  const hashes = [];
  const canonicalPaths = [];
  const inodeIdentities = [];
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const record of smoke.screenshots) {
    const absolute = ROOT + "/" + record.path;
    const direct = await lstat(absolute);
    if (direct.isSymbolicLink()) throw new Error("TASK-540 screenshot symlink: " + record.path);
    const canonical = await realpath(absolute);
    const file = await stat(canonical);
    const bytes = await readFile(canonical);
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (
      canonical !== absolute ||
      !file.isFile() ||
      file.size !== record.size ||
      file.size === 0 ||
      file.mtimeMs < smoke.helper.startedAtEpochMs ||
      hash !== record.sha256 ||
      file.dev !== record.device ||
      file.ino !== record.inode ||
      !bytes.subarray(0, pngSignature.length).equals(pngSignature) ||
      record.signature !== "89504e470d0a1a0a" ||
      record.command !== SMOKE_SESSION_PREFIX + "screenshot --filename " + absolute + " --full-page"
    ) {
      throw new Error("TASK-540 invalid screenshot evidence: " + record.path);
    }
    hashes.push(hash);
    canonicalPaths.push(canonical);
    inodeIdentities.push(file.dev + ":" + file.ino);
  }
  if (
    new Set(hashes).size !== hashes.length ||
    new Set(canonicalPaths).size !== canonicalPaths.length ||
    new Set(inodeIdentities).size !== inodeIdentities.length
  ) {
    throw new Error("TASK-540 screenshots are not distinct by path, inode, and SHA-256");
  }
}

function validateRuntimeReceiptSafety(receipts, label) {
  if (
    !receipts.every((receipt, index) => receipt.sequence === index + 1) ||
    receipts.some(
      (receipt) =>
        receipt.status !== 0 ||
        !isSafeEvidenceIdentifier(receipt.operation) ||
        receipt.operationDescriptor.includes("\n") ||
        receipt.sanitizedOutput.length > 4096 ||
        hasSensitiveEvidence(receipt.operationDescriptor) ||
        hasSensitiveEvidence(receipt.sanitizedOutput) ||
        ENV_REFERENCE_PATTERN.test(receipt.operationDescriptor) ||
        ENV_REFERENCE_PATTERN.test(receipt.sanitizedOutput) ||
        (receipt.subjectKind !== null && !isSafeEvidenceIdentifier(receipt.subjectKind)) ||
        (receipt.subjectIdentifier !== null && !isSafeEvidenceIdentifier(receipt.subjectIdentifier))
    )
  ) {
    throw new Error("TASK-540 invalid " + label + " runtime receipt");
  }
}

function matchesCanonicalBrowserCleanup(receipts, requireTerminalOverall) {
  const cleanupReceipts = receipts.filter((receipt) => receipt.operation.startsWith("cleanup-"));
  return (
    cleanupReceipts.length === FINAL_BROWSER_CLEANUP.length &&
    (!requireTerminalOverall || cleanupReceipts.at(-1)?.sequence === receipts.length) &&
    cleanupReceipts.every((receipt, index) => {
      const expected = FINAL_BROWSER_CLEANUP[index];
      return (
        receipt.scenario === "cleanup" &&
        receipt.operation === expected.operation &&
        receipt.command === expected.command &&
        receipt.assertionName === expected.assertionName &&
        receipt.sanitizedOutput === expected.sanitizedOutput &&
        !receipt.stdoutDiscarded &&
        receipt.routeKey === null &&
        receipt.routeMethod === null &&
        receipt.routePattern === null &&
        (index === 0 || receipt.sequence === cleanupReceipts[index - 1].sequence + 1)
      );
    })
  );
}

function validateOrchestrationCleanup(cleanup, prefix, browserRecoveryRequired) {
  validateRuntimeReceiptSafety(cleanup.runtimeReceipts, "orchestration cleanup");
  const recoveryReceiptsSafe = cleanup.browserReceipts.every(
    (receipt, index) =>
      receipt.sequence === index + 1 &&
      receipt.scenario === "cleanup" &&
      receipt.status === 0 &&
      receipt.routeKey === null &&
      receipt.routeMethod === null &&
      receipt.routePattern === null &&
      isSafeEvidenceIdentifier(receipt.operation) &&
      isSafeEvidenceIdentifier(receipt.scenario) &&
      (receipt.assertionName === null || isSafeEvidenceIdentifier(receipt.assertionName)) &&
      !receipt.stdoutDiscarded &&
      !hasSensitiveEvidence(receipt.command) &&
      !hasSensitiveEvidence(receipt.sanitizedOutput) &&
      !ENV_REFERENCE_PATTERN.test(receipt.command) &&
      !ENV_REFERENCE_PATTERN.test(receipt.sanitizedOutput)
  );
  if (
    !resultPassed(cleanup) ||
    cleanup.prefix !== prefix ||
    cleanup.browserRecoveryRequired !== browserRecoveryRequired ||
    !recoveryReceiptsSafe ||
    (!browserRecoveryRequired &&
      (cleanup.browserRecoveryComplete || cleanup.browserReceipts.length !== 0)) ||
    (browserRecoveryRequired &&
      (!cleanup.browserRecoveryComplete ||
        cleanup.browserReceipts.length === 0 ||
        ![1, FINAL_BROWSER_CLEANUP_COUNT + 1].includes(cleanup.browserReceipts.length) ||
        (cleanup.browserReceipts.length === FINAL_BROWSER_CLEANUP_COUNT + 1 &&
          (cleanup.browserReceipts[0].operation !== "recovery-session-discovery" ||
            cleanup.browserReceipts[0].command !== "playwright-cli --raw list" ||
            cleanup.browserReceipts[0].sanitizedOutput !== "wf540smoke-present" ||
            !matchesCanonicalBrowserCleanup(cleanup.browserReceipts, true))) ||
        cleanup.browserReceipts.at(-1)?.operation !== "cleanup-session-absence" ||
        cleanup.browserReceipts.at(-1)?.command !== "playwright-cli --raw list" ||
        cleanup.browserReceipts.at(-1)?.sanitizedOutput !== "true")) ||
    !sameUniqueSet(
      cleanup.runtimeReceipts.map(({ operation }) => operation),
      CLEANUP_AGENT_RUNTIME_OPERATIONS
    ) ||
    !cleanup.runtimeReceipts.every(
      (receipt, index) => receipt.operation === CLEANUP_AGENT_RUNTIME_OPERATIONS[index]
    ) ||
    !cleanup.runtimeReceipts.every(
      (receipt) => receipt.subjectKind === null && receipt.subjectIdentifier === prefix
    )
  ) {
    throw new Error("TASK-540 orchestration cleanup receipt mismatch");
  }
  return cleanup;
}

async function validateSmoke(smoke, expectedPrefix) {
  // Scan the entire agent result before it can be forwarded to another agent.
  // This covers non-canonical fields such as summary as well as persisted evidence.
  if (hasSensitiveEvidenceDeep(smoke)) {
    throw new Error("TASK-540 smoke result contains a sensitive value");
  }
  const scenarioKinds = smoke.scenarios.map(({ kind }) => kind);
  const scenarioIds = smoke.scenarios.map(({ id }) => id);
  const routeKeys = smoke.routes.map(({ key }) => key);
  const fixtureKinds = smoke.fixtures.items.map(({ kind }) => kind);
  const fixtureIds = smoke.fixtures.items.map(({ id }) => id);
  const cleanupKinds = smoke.fixtures.cleanupResources.map(({ kind }) => kind);
  const cleanupIdentifiers = smoke.fixtures.cleanupResources.map(
    ({ scopedIdentifier }) => scopedIdentifier
  );
  const helperChildKinds = smoke.helper.childProcesses.map(({ kind }) => kind);
  const helperChildPids = smoke.helper.childProcesses.map(({ pid }) => pid);
  const scenarioScreenshots = smoke.scenarios.flatMap(({ screenshotPaths }) => screenshotPaths);
  const contentTypeKinds = new Set([
    "content-type-editable",
    "content-type-related-a",
    "content-type-related-b",
  ]);

  if (
    !resultPassed(smoke) ||
    smoke.fixtures.prefix !== expectedPrefix ||
    !smoke.browserReceipts.every((receipt, index) => receipt.sequence === index + 1) ||
    !smoke.adminUp ||
    !smoke.frontUp ||
    !smoke.helper.stopped ||
    !smoke.helper.processesAbsent ||
    smoke.helper.helperPid <= 0 ||
    smoke.helper.handle !== "node-child-process:" + smoke.helper.helperPid ||
    helperChildPids.includes(smoke.helper.helperPid) ||
    !sameUniqueSet(helperChildKinds, HELPER_CHILD_KINDS) ||
    new Set(helperChildPids).size !== helperChildPids.length ||
    !smoke.helper.childProcesses.every(
      (process) =>
        process.absent &&
        process.ancestry[0] === smoke.helper.helperPid &&
        process.ancestry.at(-1) === process.pid &&
        process.ancestry.at(-2) === process.ppid
    ) ||
    !sameUniqueSet(smoke.helper.portsAbsent, HELPER_PORTS) ||
    !smoke.session.opened ||
    !smoke.session.routesEmpty ||
    !smoke.session.closed ||
    !smoke.session.finalAbsent ||
    !sameUniqueSet(scenarioKinds, SMOKE_KINDS) ||
    new Set(scenarioIds).size !== scenarioIds.length ||
    !smoke.scenarios.every(
      (scenario) =>
        isSafeEvidenceIdentifier(scenario.id) &&
        scenario.viewports.every((viewport) => isSafeEvidenceIdentifier(viewport))
    ) ||
    !SMOKE_RECEIPT_SCENARIOS.every((scenario) =>
      smoke.browserReceipts.some((receipt) => receipt.scenario === scenario)
    ) ||
    !sameUniqueSet(routeKeys, Object.keys(ROUTE_EXPECTATIONS)) ||
    !sameUniqueSet(Object.keys(ROUTE_SCENARIOS), Object.keys(ROUTE_EXPECTATIONS)) ||
    Object.values(ROUTE_SCENARIOS).some((scenario) => !SMOKE_KINDS.includes(scenario)) ||
    !sameUniqueSet(fixtureKinds, REQUIRED_FIXTURE_KINDS) ||
    new Set(fixtureIds).size !== fixtureIds.length ||
    !smoke.fixtures.items.every(
      (item) =>
        item.acquired &&
        item.cleaned &&
        item.absenceVerified &&
        isSafeEvidenceIdentifier(item.id) &&
        (item.slug === null || isSafeEvidenceIdentifier(item.slug)) &&
        (contentTypeKinds.has(item.kind)
          ? typeof item.slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
          : item.slug === null)
    ) ||
    !REQUIRED_CLEANUP_RESOURCE_KINDS.every((kind) => cleanupKinds.includes(kind)) ||
    new Set(cleanupIdentifiers).size !== cleanupIdentifiers.length ||
    !smoke.fixtures.cleanupResources.every(
      (item) =>
        item.acquired &&
        item.cleaned &&
        item.absenceVerified &&
        isSafeEvidenceIdentifier(item.scopedIdentifier) &&
        item.sanitizedProbe.length > 0 &&
        !hasSensitiveEvidence(item.sanitizedProbe) &&
        !ENV_REFERENCE_PATTERN.test(item.sanitizedProbe) &&
        (!item.kind.startsWith("session-user-") ||
          (item.identifierType === "db-id" && UUID_IDENTIFIER_PATTERN.test(item.scopedIdentifier)))
    ) ||
    !smoke.fixtures.cleanupOrderVerified ||
    !smoke.themeRestored ||
    !smoke.bootstrapAdminRestored ||
    !smoke.legacyLocalStorageAbsent ||
    smoke.consoleErrors.length > 0 ||
    smoke.consoleWarnings.length > 0 ||
    smoke.pageErrors.length > 0 ||
    smoke.failures.length > 0
  ) {
    throw new Error("TASK-540 smoke top-level invariant failed");
  }

  validateRuntimeReceiptSafety(smoke.runtimeReceipts, "smoke");
  const runtimeOperations = smoke.runtimeReceipts.map(({ operation }) => operation);
  if (!REQUIRED_RUNTIME_OPERATIONS.every((operation) => runtimeOperations.includes(operation))) {
    throw new Error("TASK-540 runtime operation coverage mismatch");
  }
  const expectedRuntimeStart = [
    "helper-launch",
    "admin-health",
    "front-health",
    ...HELPER_CHILD_KINDS.map(() => "pid-lineage"),
  ];
  const expectedRuntimeEnd = [
    "helper-stop",
    ...HELPER_CHILD_KINDS.map(() => "process-absence"),
    ...HELPER_PORTS.map(() => "port-absence"),
    ...OUTER_HOST_RUNTIME_OPERATIONS,
  ];
  const cleanupStart =
    runtimeOperations.length - expectedRuntimeEnd.length - CLEANUP_AGENT_RUNTIME_OPERATIONS.length;
  if (
    !expectedRuntimeStart.every((operation, index) => runtimeOperations[index] === operation) ||
    cleanupStart < expectedRuntimeStart.length ||
    !CLEANUP_AGENT_RUNTIME_OPERATIONS.every(
      (operation, index) => runtimeOperations[cleanupStart + index] === operation
    ) ||
    !expectedRuntimeEnd.every(
      (operation, index) =>
        runtimeOperations[runtimeOperations.length - expectedRuntimeEnd.length + index] ===
        operation
    )
  ) {
    throw new Error("TASK-540 orchestrator-owned runtime receipt order mismatch");
  }

  const oneRuntime = (operation, predicate) => {
    const receipts = exactReceipts(smoke.runtimeReceipts, operation);
    return receipts.length === 1 && predicate(receipts[0]);
  };
  const helperId = String(smoke.helper.helperPid);
  if (
    !oneRuntime(
      "helper-launch",
      (receipt) =>
        receipt.operationDescriptor === "spawn:" + SMOKE_HELPER_COMMAND &&
        runtimeSubjectMatches(receipt, "helper", helperId)
    ) ||
    !oneRuntime(
      "admin-health",
      (receipt) =>
        receipt.operationDescriptor === ADMIN_HEALTH_OPERATION_DESCRIPTOR &&
        runtimeSubjectMatches(receipt, "helper", helperId)
    ) ||
    !oneRuntime(
      "front-health",
      (receipt) =>
        receipt.operationDescriptor === FRONT_HEALTH_OPERATION_DESCRIPTOR &&
        runtimeSubjectMatches(receipt, "helper", helperId)
    ) ||
    !oneRuntime("fixture-setup", (receipt) =>
      runtimeSubjectMatches(receipt, null, expectedPrefix)
    ) ||
    !oneRuntime("helper-stop", (receipt) => runtimeSubjectMatches(receipt, "helper", helperId))
  ) {
    throw new Error("TASK-540 helper/setup runtime receipt mismatch");
  }

  const lineageReceipts = exactReceipts(smoke.runtimeReceipts, "pid-lineage");
  const processAbsenceReceipts = exactReceipts(smoke.runtimeReceipts, "process-absence");
  if (
    lineageReceipts.length !== smoke.helper.childProcesses.length ||
    processAbsenceReceipts.length !== smoke.helper.childProcesses.length ||
    !smoke.helper.childProcesses.every((process) => {
      const identifier = process.kind + ":" + process.pid;
      return (
        lineageReceipts.filter((receipt) => runtimeSubjectMatches(receipt, "helper", identifier))
          .length === 1 &&
        processAbsenceReceipts.filter((receipt) =>
          runtimeSubjectMatches(receipt, "helper", identifier)
        ).length === 1
      );
    })
  ) {
    throw new Error("TASK-540 helper PID runtime receipt mismatch");
  }

  const portAbsenceReceipts = exactReceipts(smoke.runtimeReceipts, "port-absence");
  if (
    portAbsenceReceipts.length !== HELPER_PORTS.length ||
    !HELPER_PORTS.every(
      (port) =>
        portAbsenceReceipts.filter((receipt) =>
          runtimeSubjectMatches(receipt, "helper", String(port))
        ).length === 1
    )
  ) {
    throw new Error("TASK-540 helper port runtime receipt mismatch");
  }

  const provenanceReceipts = exactReceipts(smoke.runtimeReceipts, "fixture-provenance");
  const entityAbsenceReceipts = exactReceipts(smoke.runtimeReceipts, "entity-absence");
  if (
    provenanceReceipts.length !== smoke.fixtures.items.length ||
    entityAbsenceReceipts.length !== smoke.fixtures.items.length ||
    !smoke.fixtures.items.every(
      (item) =>
        provenanceReceipts.filter((receipt) => runtimeSubjectMatches(receipt, item.kind, item.id))
          .length === 1 &&
        entityAbsenceReceipts.filter((receipt) =>
          runtimeSubjectMatches(receipt, item.kind, item.id)
        ).length === 1
    )
  ) {
    throw new Error("TASK-540 fixture provenance/absence receipt mismatch");
  }

  const cleanupAbsenceReceipts = exactReceipts(smoke.runtimeReceipts, "cleanup-absence");
  if (
    cleanupAbsenceReceipts.length !== smoke.fixtures.cleanupResources.length ||
    !smoke.fixtures.cleanupResources.every(
      (item) =>
        cleanupAbsenceReceipts.filter((receipt) =>
          runtimeSubjectMatches(receipt, item.kind, item.scopedIdentifier)
        ).length === 1
    )
  ) {
    throw new Error("TASK-540 cleanup-resource absence receipt mismatch");
  }

  for (const operation of ORCHESTRATION_RUNTIME_OPERATIONS) {
    if (!oneRuntime(operation, (receipt) => runtimeSubjectMatches(receipt, null, expectedPrefix))) {
      throw new Error("TASK-540 orchestration receipt mismatch: " + operation);
    }
  }

  const routeOperationNames = new Set([
    "route-setup",
    "route-hit-read",
    "route-release",
    "unroute",
    "real-retry",
  ]);
  if (
    smoke.browserReceipts.some(
      (receipt) =>
        (receipt.routeKey === null &&
          (receipt.routeMethod !== null ||
            receipt.routePattern !== null ||
            routeOperationNames.has(receipt.operation))) ||
        (receipt.routeKey !== null &&
          (receipt.routeMethod === null ||
            receipt.routePattern === null ||
            !routeOperationNames.has(receipt.operation)))
    )
  ) {
    throw new Error("TASK-540 route receipt metadata mismatch");
  }

  for (const route of smoke.routes) {
    const expected = ROUTE_EXPECTATIONS[route.key];
    const expectedPattern = expectedRoutePattern(smoke, route.key);
    const routeReceipts = smoke.browserReceipts.filter((receipt) => receipt.routeKey === route.key);
    const expectedOperations =
      expected.mode === "malformed-json"
        ? ["route-setup", "route-hit-read", "unroute", "real-retry"]
        : ["route-setup", "route-hit-read", "route-release", "unroute"];
    const hitRead = routeReceipts.find((receipt) => receipt.operation === "route-hit-read");
    if (
      route.method !== expected.method ||
      route.mode !== expected.mode ||
      route.expandedPattern !== expectedPattern ||
      route.expandedPattern.includes("<") ||
      route.expandedPattern.includes(">") ||
      route.hits !== 1 ||
      !route.installed ||
      !route.hitRead ||
      route.released !== (expected.mode === "delayed-success") ||
      !route.unrouted ||
      route.unroutedBeforeRetry !== (expected.mode === "malformed-json") ||
      !sameUniqueSet(
        routeReceipts.map(({ operation }) => operation),
        expectedOperations
      ) ||
      !routeReceipts.every((receipt, index) => receipt.operation === expectedOperations[index]) ||
      !routeReceipts.every(
        (receipt) =>
          receipt.scenario === ROUTE_SCENARIOS[route.key] &&
          receipt.routeMethod === expected.method &&
          receipt.routePattern === expectedPattern
      ) ||
      routeReceipts.some(
        (receipt, index) => index > 0 && receipt.sequence <= routeReceipts[index - 1].sequence
      ) ||
      hitRead?.assertionName !== "route-hit:" + route.key ||
      hitRead?.sanitizedOutput.trim() !== "1"
    ) {
      throw new Error("TASK-540 route interception mismatch: " + route.key);
    }
    if (route.key === "preference-a-write-epoch") {
      const routeSetup = routeReceipts.find((receipt) => receipt.operation === "route-setup");
      const routeRelease = routeReceipts.find((receipt) => receipt.operation === "route-release");
      const unroute = routeReceipts.find((receipt) => receipt.operation === "unroute");
      const preferenceAssertions = Object.fromEntries(
        Object.keys(EXACT_SMOKE_ASSERTION_OUTPUTS["responsive-users"]).map((name) => [
          name,
          smoke.browserReceipts.filter(
            (receipt) => receipt.scenario === "responsive-users" && receipt.assertionName === name
          ),
        ])
      );
      const beforeRelease = preferenceAssertions["preference-a-write-hit-before-release"];
      const afterReleaseNames = [
        "preference-a-write-hit-after-release",
        "queued-a-write-zero-dispatch",
        "user-b-default-unchanged",
      ];
      if (
        !routeSetup ||
        !routeRelease ||
        !unroute ||
        !hitRead ||
        beforeRelease.length !== 1 ||
        afterReleaseNames.some((name) => preferenceAssertions[name].length !== 1) ||
        Object.entries(EXACT_SMOKE_ASSERTION_OUTPUTS["responsive-users"]).some(
          ([name, actual]) => preferenceAssertions[name][0]?.sanitizedOutput !== actual
        ) ||
        routeSetup.sequence >= beforeRelease[0].sequence ||
        beforeRelease[0].sequence >= routeRelease.sequence ||
        hitRead.sequence >= routeRelease.sequence ||
        afterReleaseNames.some(
          (name) =>
            preferenceAssertions[name][0].sequence <= routeRelease.sequence ||
            preferenceAssertions[name][0].sequence >= unroute.sequence
        )
      ) {
        throw new Error("TASK-540 preference write epoch evidence order mismatch");
      }
    }
  }

  const loggerReceipts = smoke.browserReceipts.filter(
    (receipt) => receipt.operation === "logger-install"
  );
  if (
    loggerReceipts.length !== 1 ||
    loggerReceipts[0].scenario !== "setup" ||
    loggerReceipts[0].command !== LOGGER_INSTALL_COMMAND ||
    loggerReceipts[0].stdoutDiscarded ||
    loggerReceipts[0].sanitizedOutput !== "true"
  ) {
    throw new Error("TASK-540 browser logger instrumentation mismatch");
  }

  if (!matchesCanonicalBrowserCleanup(smoke.browserReceipts, true)) {
    throw new Error("TASK-540 final browser cleanup receipt mismatch");
  }

  for (const scenario of smoke.scenarios) {
    const names = scenario.visibleAssertions.map(({ name }) => name);
    const exactOutputs = EXACT_SMOKE_ASSERTION_OUTPUTS[scenario.kind] ?? {};
    if (
      new Set(names).size !== names.length ||
      !REQUIRED_SMOKE_ASSERTIONS[scenario.kind].every((name) => names.includes(name)) ||
      !Object.entries(exactOutputs).every(([name, actual]) =>
        scenario.visibleAssertions.some(
          (assertion) => assertion.name === name && assertion.actual === actual
        )
      ) ||
      !scenario.visibleAssertions.every((item) => {
        const matches = smoke.browserReceipts.filter(
          (receipt) =>
            receipt.scenario === scenario.kind &&
            receipt.assertionName === item.name &&
            receipt.sanitizedOutput === item.actual &&
            !receipt.stdoutDiscarded
        );
        return item.pass && item.actual.length > 0 && matches.length === 1;
      }) ||
      scenario.consoleErrors.length > 0 ||
      scenario.consoleWarnings.length > 0 ||
      scenario.pageErrors.length > 0
    ) {
      throw new Error("TASK-540 visible scenario evidence mismatch: " + scenario.kind);
    }
    for (const [assertionName, expectedCommand] of Object.entries(CONSOLE_CHANNEL_COMMANDS)) {
      const receipts = smoke.browserReceipts.filter(
        (receipt) => receipt.scenario === scenario.kind && receipt.assertionName === assertionName
      );
      if (
        receipts.length !== 1 ||
        receipts[0].operation !== "log-read" ||
        receipts[0].command !== expectedCommand ||
        receipts[0].sanitizedOutput !== "[]" ||
        receipts[0].stdoutDiscarded ||
        receipts[0].routeKey !== null ||
        receipts[0].sequence <= loggerReceipts[0].sequence
      ) {
        throw new Error(
          "TASK-540 per-flow browser channel receipt mismatch: " +
            scenario.kind +
            ":" +
            assertionName
        );
      }
    }
  }

  const themes = new Set(smoke.scenarios.map(({ theme }) => theme));
  const responsive = smoke.scenarios.find(({ kind }) => kind === "responsive-users");
  if (
    (!themes.has("light") && !themes.has("light-dark")) ||
    (!themes.has("dark") && !themes.has("light-dark")) ||
    !["320x844", "390x844", "480x844", "1024x900", "1280x900"].every((viewport) =>
      responsive?.viewports.includes(viewport)
    ) ||
    !sameUniqueSet(scenarioScreenshots, SCREENSHOT_PATHS)
  ) {
    throw new Error("TASK-540 theme/viewport/scenario screenshot coverage mismatch");
  }

  if (
    smoke.browserReceipts.some((receipt) => {
      const exactCredentialFill =
        EMAIL_FILL_COMMAND.test(receipt.command) || PASSWORD_FILL_COMMAND.test(receipt.command);
      const mentionsCredential =
        CREDENTIAL_SELECTOR_PATTERN.test(receipt.command) ||
        CREDENTIAL_REFERENCE_PATTERN.test(receipt.command) ||
        ENV_REFERENCE_PATTERN.test(receipt.command);
      return (
        receipt.status !== 0 ||
        !isSafeEvidenceIdentifier(receipt.operation) ||
        !isSafeEvidenceIdentifier(receipt.scenario) ||
        (!receipt.command.startsWith(SMOKE_SESSION_PREFIX) &&
          receipt.command !== "playwright-cli --raw list") ||
        receipt.command.includes("\n") ||
        receipt.sanitizedOutput.length > 4096 ||
        hasSensitiveEvidence(receipt.command) ||
        hasSensitiveEvidence(receipt.sanitizedOutput) ||
        (receipt.routePattern !== null && hasSensitiveEvidence(receipt.routePattern)) ||
        (receipt.assertionName !== null && !isSafeEvidenceIdentifier(receipt.assertionName)) ||
        ENV_REFERENCE_PATTERN.test(receipt.sanitizedOutput) ||
        (receipt.assertionName !== null && receipt.sanitizedOutput.length === 0) ||
        (mentionsCredential && !exactCredentialFill) ||
        (exactCredentialFill
          ? !receipt.stdoutDiscarded || receipt.sanitizedOutput !== "[discarded]"
          : receipt.stdoutDiscarded)
      );
    }) ||
    smoke.screenshots.some(({ command: value, path }) => {
      const matches = smoke.browserReceipts.filter(
        (receipt) => receipt.command === value && receipt.operation === "screenshot"
      );
      const owningScenario = smoke.scenarios.find((scenario) =>
        scenario.screenshotPaths.includes(path)
      );
      return matches.length !== 1 || !owningScenario || matches[0].scenario !== owningScenario.kind;
    })
  ) {
    throw new Error("TASK-540 browser command receipt mismatch");
  }

  await verifyScreenshots(smoke);
  return smoke;
}

async function runSmoke(attempt) {
  phase("Smoke");
  const nonce = randomUUID().replaceAll("-", "").slice(0, 12);
  const prefix = "wf540-" + nonce;
  const before = await worktreeSnapshot();
  let host = null;
  let hostStop = null;
  let smoke = null;
  let cleanup = null;
  let startAbsenceProven = false;
  let primaryTerminalBrowserComplete = false;
  const failures = [];

  try {
    host = await startOwnedSmokeHost();
    smoke = await dispatchAgentSafely(
      await groundedPrompt(
        "Final TASK-540 real-browser smoke attempt " +
          attempt +
          " at " +
          ROOT +
          ". The orchestrator-fixed fixture prefix is exactly " +
          prefix +
          "; use it verbatim and never choose another nonce. The workflow orchestrator has " +
          "already spawned and health-checked the sole task-owned host. Attach to it; never " +
          "launch, restart, replace, signal, or stop a server/process. Echo this pre-dispatch " +
          "non-secret helper inventory exactly in the helper field: " +
          JSON.stringify(host.helper) +
          ". Read the entire 540-06-L01 Real browser smoke contract immediately before execution. " +
          "Load .env without printing or " +
          "persisting credentials. The only commands allowed to contain any literal environment " +
          "reference are exact credential fills matching " +
          EMAIL_FILL_COMMAND.source +
          " or " +
          PASSWORD_FILL_COMMAND.source +
          ". Their stdout is redirected to /dev/null, stdoutDiscarded=true, and sanitizedOutput " +
          "is exactly [discarded]. Every browser operation—open, resize, fill, click, goto, route setup/release/hit " +
          "read/unroute/route-list, assertion, log read, screenshot, sign-out/in, and close—must " +
          "be its own separate full playwright-cli -s=wf540smoke --raw command. Never combine " +
          "browser operations or substitute prose for a receipt. Install console error, console " +
          "warning, and page-error listeners once with exact logger command " +
          LOGGER_INSTALL_COMMAND +
          " and record operation=logger-install, scenario=setup, sanitizedOutput=true. After each " +
          "of the seven flows execute exactly one separate command for each channel, use " +
          "operation=log-read and the exact assertion-name/command map " +
          JSON.stringify(CONSOLE_CHANNEL_COMMANDS) +
          ", and require sanitizedOutput exactly []. Link every receipt to setup, cleanup, or one " +
          "exact scenario kind; include a bounded operation label, nullable route metadata, " +
          "contiguous sequence, assertion name, and at most 4096 characters of sanitized observed " +
          "output. Before returning evidence, reject raw secret assignments/headers/bearer or " +
          "cookie values in every browser command/output, runtime operation descriptor/output, " +
          "runtime subjectIdentifier, fixture ID/slug, cleanup scopedIdentifier, and sanitizedProbe; " +
          "benign prose naming a security concept without a value is allowed. Route operations use " +
          "exactly route-setup, route-hit-read, route-release, " +
          "unroute, and real-retry. For every route receipt set the route key, exact method and " +
          "expanded pattern; leave all three null on non-route receipts. Every required visible " +
          "assertion and route hit read needs exactly one same-scenario receipt with matching " +
          "output. Create the exact " +
          prefix +
          " fixture family with two real active Admin users named deterministically WF540 User " +
          "A/B " +
          nonce +
          " and exact inventoried content types, A/B related entries, editable entry, Screen, " +
          "media, overrides/settings. Fixture records use server IDs, safe generated slug only " +
          "for the three content-type records, and slug=null for every other kind. Capture " +
          "acquisition IDs and prove provenance. Run exactly these seven visible flows: " +
          JSON.stringify(SMOKE_KINDS) +
          ". Run the six exact method-aware interceptions and require one hit each: " +
          JSON.stringify(ROUTE_EXPECTATIONS) +
          ". Expand their exact patterns from fixture slugs/entry ID according to " +
          JSON.stringify(ROUTE_SCENARIOS) +
          ". Malformed JSON failures use HTTP 200, refuse a second hit, record hit 1, and are " +
          "unrouted in a separate full command before the real Save/Retry click. Delayed handlers " +
          "capture the old response, accept one hit, release through named latches, then unroute. " +
          "Assert the exact required visible/ARIA/computed/geometry/persisted/request-order " +
          "effects " +
          JSON.stringify(REQUIRED_SMOKE_ASSERTIONS) +
          ". For the responsive-users flow, return these exact structured observed outputs: " +
          JSON.stringify(EXACT_SMOKE_ASSERTION_OUTPUTS["responsive-users"]) +
          ". Record each as its own assertion receipt. After route setup, both the route hit-read " +
          "and preference-a-write-hit-before-release must observe exactly one first A PATCH " +
          "before route-release. Only after route-release, but before unroute, record " +
          "preference-a-write-hit-after-release=1, queued-a-write-zero-dispatch=0, and B's " +
          "default byte-identical before/after. The post-release hit value proves the same first " +
          "request remained the sole hit; never dispatch or require a second network request" +
          ", light and dark, viewports 320/390/480/1024/1280, and empty console-error, warning, " +
          "and page-error arrays after every flow. Capture exactly the eleven task-scoped PNGs " +
          JSON.stringify(SCREENSHOT_PATHS.map((path) => ROOT + "/" + path)) +
          " using separate full commands; stat, PNG-signature, mtime, device, inode, and SHA-256 " +
          "each, with distinct canonical paths, device:inode identities, and hashes. Return a " +
          "contiguous agent runtimeReceipts sequence containing exactly one fixture-setup, one " +
          "fixture-provenance and entity-absence per fixture, and one cleanup-absence per cleanup " +
          "resource. Do not fabricate helper launch/health/PID/stop/port or orchestration receipts; " +
          "the workflow itself owns those. Every runtime receipt records an operationDescriptor for " +
          "the operation that really executed and evidenceSha256 over its real captured stdout/stderr " +
          "or explicit Node/DB/storage observation bytes; never hash sanitized prose as a substitute " +
          "for operation evidence. Use null/" +
          prefix +
          " for setup; and exact kind/non-secret ID for fixture/resource receipts. In the smoke " +
          "agent's own finally release all latches, unroute all task routes, restore the original " +
          "theme, sign back in as bootstrap admin, delete only inventoried fixtures in reverse " +
          "dependency order, and return exact redacted cleanup-resource evidence for " +
          JSON.stringify(REQUIRED_CLEANUP_RESOURCE_KINDS) +
          " using only scoped non-secret DB IDs/labels/storage keys and bounded sanitized absence " +
          "probes. Session resources use DB IDs/labels, never a cookie, token, session hash, CSRF " +
          "value, or password hash. Prove each " +
          "absent, then execute this exact seven-receipt final browser cleanup matrix consecutively " +
          "with scenario=cleanup, no duplicate/extra cleanup-* operation, and exact command/output: " +
          JSON.stringify(FINAL_BROWSER_CLEANUP) +
          ". The final global list must independently prove wf540smoke absent. Leave host stop and " +
          "process/port absence to the orchestrator outer finally. You may write only " +
          "the named PNG files; never edit tracked source/tests/docs/tasks/workflow. Return the " +
          "exact structured result even on failure, with truthful cleanup and failures."
      ),
      { label: "smoke:540:" + attempt, phase: "Smoke", schema: SMOKE_SCHEMA }
    );
    primaryTerminalBrowserComplete = matchesCanonicalBrowserCleanup(smoke.browserReceipts, true);
    validateRuntimeReceiptSafety(smoke.runtimeReceipts, "agent smoke");
    if (
      smoke.runtimeReceipts.some(
        (receipt) => !SMOKE_AGENT_RUNTIME_OPERATIONS.includes(receipt.operation)
      )
    ) {
      throw new Error("TASK-540 smoke agent fabricated an orchestrator-owned receipt");
    }
    if (!resultPassed(smoke)) {
      failures.push(
        new Error("TASK-540 primary smoke reported failure: " + smoke.errors.join("; "))
      );
    }
  } catch (error) {
    if (host === null) startAbsenceProven = error?.hostAbsenceProven === true;
    failures.push(error);
  } finally {
    const cleanupAttemptErrors = [];
    try {
      if (host) {
        const browserRecoveryRequired = !primaryTerminalBrowserComplete;
        let browserRecoveryDispatched = false;
        for (let cleanupAttempt = 1; cleanupAttempt <= 2; cleanupAttempt += 1) {
          // At most one cleanup agent may receive browser authority. If that agent
          // executed terminal receipt 7 but then threw or returned an invalid result,
          // a second Playwright command would violate the terminal-absence contract.
          // The bounded second attempt is therefore resource-only and cannot turn an
          // unproven browser recovery into a successful/new-prefix-safe cleanup.
          const attemptBrowserRecoveryRequired =
            browserRecoveryRequired && !browserRecoveryDispatched;
          if (attemptBrowserRecoveryRequired) browserRecoveryDispatched = true;
          try {
            const cleanupCandidate = await dispatchAgentSafely(
              await groundedPrompt(
                "TASK-540 orchestration-level fixture cleanup and conditional browser recovery attempt " +
                  cleanupAttempt +
                  " of 2 at " +
                  ROOT +
                  " for fixed prefix " +
                  prefix +
                  ". This resource cleanup is mandatory even when the primary or prior cleanup agent " +
                  "threw, was interrupted, or failed schema validation. The orchestrator still " +
                  "owns live healthy helper PID " +
                  host.helperPid +
                  "; never signal, stop, replace, or claim process/port cleanup. Do not edit repo " +
                  "files or create screenshots. Load .env without printing values. Discover only " +
                  "rows/objects for the exact prefix, resolve each to an exact non-secret DB ID/label/storage key, " +
                  "and delete only those exact identifiers—never prefix/wildcard delete or " +
                  "truncate. Session cleanup identifiers are user/session-row DB IDs or bounded labels, " +
                  "never cookie values, session tokens/hashes, CSRF values, or credential hashes. Prove " +
                  "exact fixture/session/object absence. Return exactly four contiguous runtime receipts " +
                  "in exact set/order " +
                  JSON.stringify(CLEANUP_AGENT_RUNTIME_OPERATIONS) +
                  ". Every receipt uses subjectKind=null and subjectIdentifier=" +
                  prefix +
                  ". Each runtime receipt uses operationDescriptor (not a claimed shell command), " +
                  "evidenceSha256 over the real captured exec/Node observation bytes, and bounded " +
                  "sanitizedOutput. Discovery inventories resolved IDs; identifier-validation is an " +
                  "actually executed fail-closed ownership/non-secret check; exact-delete is truthfully a " +
                  "no-op when empty; absence proves all IDs absent. No sensitive value, raw row, " +
                  "expanded credential, or environment reference may enter an operation descriptor, " +
                  "subject identifier, command, or output. The orchestrator sets browserRecoveryRequired=" +
                  attemptBrowserRecoveryRequired +
                  ". If false, execute ZERO playwright-cli/browser operations and return " +
                  "browserReceipts=[] and browserRecoveryComplete=false. This means either the primary " +
                  "terminal matrix is canonical or a prior recovery dispatch failed; in the latter case " +
                  "this bounded retry is resource-only and must not issue any command after a possible " +
                  "terminal receipt 7. " +
                  "If true, finish all DB/storage cleanup first, then run `playwright-cli --raw list` as " +
                  "a separate real command. If wf540smoke is absent, return that one receipt as " +
                  "cleanup-session-absence with sanitizedOutput=true. If present, return the list as " +
                  "recovery-session-discovery with sanitizedOutput=wf540smoke-present, then execute and " +
                  "return the exact seven separate CLI receipts " +
                  JSON.stringify(FINAL_BROWSER_CLEANUP) +
                  ". Browser receipts retain SHA-256 of actual captured stdout/stderr, and the final " +
                  "global absence receipt must be the last browser operation/receipt. Return " +
                  "browserRecoveryComplete=true only after that real global list proof."
              ),
              {
                label: "smoke-cleanup:540:" + attempt + ":" + cleanupAttempt,
                phase: "Smoke",
                schema: ORCHESTRATION_CLEANUP_SCHEMA,
              }
            );
            validateOrchestrationCleanup(cleanupCandidate, prefix, attemptBrowserRecoveryRequired);
            if (browserRecoveryRequired && !attemptBrowserRecoveryRequired) {
              cleanupAttemptErrors.push(
                new Error(
                  "TASK-540 resource-only retry cannot replace failed browser recovery proof"
                )
              );
              cleanup = null;
              break;
            }
            cleanup = cleanupCandidate;
            break;
          } catch (error) {
            cleanup = null;
            cleanupAttemptErrors.push(error);
          }
        }
      }
    } finally {
      if (cleanupAttemptErrors.length > 0) {
        failures.push(
          new AggregateError(
            cleanupAttemptErrors,
            cleanup
              ? "TASK-540 cleanup recovered only on the bounded second exact attempt"
              : "TASK-540 cleanup failed after two exact-prefix attempts"
          )
        );
      }
      if (host) {
        try {
          hostStop = await stopOwnedSmokeHost(host, prefix);
        } catch (error) {
          failures.push(error);
        }
      }
    }
  }

  try {
    const after = await worktreeSnapshot();
    const delta = snapshotDelta(before, after);
    if (
      before.head !== after.head ||
      before.branch !== after.branch ||
      after.staged.length > 0 ||
      delta.some((path) => !SCREENSHOT_PATHS.includes(path))
    ) {
      throw new Error("TASK-540 smoke changed out-of-scope repository state: " + delta.join(", "));
    }
  } catch (error) {
    failures.push(error);
  }

  if (smoke && cleanup && host && hostStop && failures.length === 0) {
    const recoveryMatrixComplete =
      cleanup.browserRecoveryRequired &&
      cleanup.browserReceipts.length === FINAL_BROWSER_CLEANUP_COUNT + 1 &&
      matchesCanonicalBrowserCleanup(cleanup.browserReceipts, true);
    const browserReceipts = recoveryMatrixComplete
      ? [
          ...smoke.browserReceipts.map((receipt) =>
            receipt.operation.startsWith("cleanup-")
              ? { ...receipt, operation: "superseded-" + receipt.operation }
              : receipt
          ),
          ...cleanup.browserReceipts,
        ].map((receipt, index) => ({ ...receipt, sequence: index + 1 }))
      : smoke.browserReceipts;
    const runtimeReceipts = [
      ...host.startReceipts,
      ...smoke.runtimeReceipts,
      ...cleanup.runtimeReceipts,
      ...hostStop.stopReceipts,
    ].map((receipt, index) => ({ ...receipt, sequence: index + 1 }));
    smoke = {
      ...smoke,
      adminUp: true,
      frontUp: true,
      helper: hostStop.helper,
      browserReceipts,
      session: recoveryMatrixComplete
        ? {
            ...smoke.session,
            routesEmpty: true,
            closed: true,
            finalAbsent: true,
          }
        : smoke.session,
      runtimeReceipts,
    };
    try {
      return await validateSmoke(smoke, prefix);
    } catch (error) {
      failures.push(error);
    }
  }

  const aggregate = new AggregateError(
    failures,
    "TASK-540 smoke attempt " + attempt + " failed after mandatory cleanup"
  );
  aggregate.mayRetryWithNewPrefix =
    (host === null && startAbsenceProven) ||
    (host !== null &&
      cleanup !== null &&
      (primaryTerminalBrowserComplete || cleanup.browserRecoveryComplete === true) &&
      hostStop !== null);
  throw aggregate;
}

function canonicalSmokeEvidence(smoke) {
  const evidence = {
    task: "TASK-540",
    fixturePrefix: smoke.fixtures.prefix,
    browserReceipts: smoke.browserReceipts,
    runtimeReceipts: smoke.runtimeReceipts,
    routes: smoke.routes,
    fixtures: smoke.fixtures,
    helper: smoke.helper,
    session: smoke.session,
    screenshots: smoke.screenshots,
    assertions: smoke.scenarios.map((scenario) => ({
      id: scenario.id,
      kind: scenario.kind,
      theme: scenario.theme,
      viewports: scenario.viewports,
      visibleAssertions: scenario.visibleAssertions,
      screenshotPaths: scenario.screenshotPaths,
      consoleErrors: scenario.consoleErrors,
      consoleWarnings: scenario.consoleWarnings,
      pageErrors: scenario.pageErrors,
    })),
    finalState: {
      consoleErrors: smoke.consoleErrors,
      consoleWarnings: smoke.consoleWarnings,
      pageErrors: smoke.pageErrors,
      themeRestored: smoke.themeRestored,
      bootstrapAdminRestored: smoke.bootstrapAdminRestored,
      legacyLocalStorageAbsent: smoke.legacyLocalStorageAbsent,
    },
  };
  if (hasSensitiveEvidenceDeep(evidence)) {
    throw new Error("TASK-540 canonical smoke evidence contains a sensitive value");
  }
  return evidence;
}

const CANONICAL_EVIDENCE_KEYS = Object.freeze([
  "task",
  "fixturePrefix",
  "browserReceipts",
  "runtimeReceipts",
  "routes",
  "fixtures",
  "helper",
  "session",
  "screenshots",
  "assertions",
  "finalState",
  "closureControl",
]);
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
  requireExactObjectKeys(evidence, CANONICAL_EVIDENCE_KEYS, label + " evidence");
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

async function runSmokeEvidenceCycle(label, validation, { afterClosure = false } = {}) {
  let latestSmoke = null;
  let latestAudit = null;
  let latestValidation = validation;
  const attemptFailures = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      latestSmoke = await runSmoke(label + ":" + attempt);
    } catch (error) {
      attemptFailures.push(error);
      if (error?.mayRetryWithNewPrefix === false) {
        throw new AggregateError(
          attemptFailures,
          "TASK-540 refuses a new prefix because prior exact cleanup/host absence is unproven"
        );
      }
      if (attempt === 2) {
        throw new AggregateError(
          attemptFailures,
          "TASK-540 smoke execution failed after two cleanup-protected attempts"
        );
      }
      continue;
    }
    phase("Smoke evidence audit");
    latestAudit = await runReadOnlyAgent(
      "Fresh read-only TASK-540 smoke evidence audit " +
        label +
        " attempt " +
        attempt +
        " at " +
        ROOT +
        ". Inspect all actual PNGs and compare them to the structured evidence. Verify every " +
        "visible/ARIA/computed/geometry/persistence/request-order claim; exact route method, " +
        "fixture-derived pattern, operation cardinality/order and one hit; exact discarded " +
        "credential command forms; one separate console-error, console-warning and page-error " +
        "receipt with [] after each flow; sensitive-output rejection; runtime helper launch/" +
        "health/PID ancestry grounded in the orchestrator-retained Node ChildProcess; bounded " +
        "same-prefix cleanup retry; exact seven-step final browser cleanup with session absence " +
        "as the last browser receipt; fixture provenance; exact-ID reverse cleanup/absence; screenshot " +
        "device:inode identity; restored theme/bootstrap identity; empty route list; closed " +
        "wf540smoke session; orchestration-finally receipts; and stopped owned helper child " +
        "PIDs/ports 3000/5173/5174. Return every H/M/L with concrete file:line or screenshot " +
        "path. Assign a real source defect to its exact 540 leaf owner. Assign runtime/receipt/" +
        "fixture/screenshot/cleanup evidence defects to owner=orchestrator and area exactly " +
        "runtime-evidence; those findings must trigger cleanup plus a fresh smoke and must never " +
        "be routed to a repo fixer. Do not edit or start runtime. Evidence: " +
        JSON.stringify(canonicalSmokeEvidence(latestSmoke)),
      {
        label: "smoke-evidence-audit:540:" + label + ":" + attempt,
        phase: "Smoke evidence audit",
        schema: AUDIT_SCHEMA,
      }
    );
    if (latestAudit.findings.length === 0) {
      return {
        smoke: latestSmoke,
        audit: latestAudit,
        fullValidation: latestValidation,
      };
    }
    if (attempt === 2) {
      throw new Error("TASK-540 smoke evidence remained non-clean after two fresh attempts");
    }
    const sourceFindings = latestAudit.findings.filter(
      (finding) => finding.owner !== "orchestrator"
    );
    const runtimeFindings = latestAudit.findings.filter(
      (finding) => finding.owner === "orchestrator"
    );
    if (runtimeFindings.some((finding) => finding.area !== "runtime-evidence")) {
      throw new Error("TASK-540 smoke audit returned an invalid orchestrator finding area");
    }
    if (sourceFindings.length > 0) {
      await fixAuditFindings(
        sourceFindings,
        "smoke-evidence-" + label + "-" + attempt,
        "Smoke evidence audit",
        { afterClosure }
      );
      latestValidation = await runFullValidation(
        "full-validation:after-smoke-source-fix:" + label + ":" + attempt,
        "Full validation"
      );
    }
    // Runtime/evidence findings intentionally have no repository fixer. The next
    // iteration starts with runSmoke(), whose orchestration-level finally first
    // guarantees deterministic cleanup and then produces wholly fresh evidence.
  }
  throw new Error("TASK-540 smoke evidence cycle exhausted unexpectedly");
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
const closureStatusOwner = Object.freeze({
  id: "540-06-L01-closure",
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
      mutableFields: ["Completed", ...CLOSURE_RECEIPT_FIELDS, ...CLOSURE_GATE_FIELDS],
    }),
  ]),
});
const closureStatusRollbackOwner = Object.freeze({
  id: "540-06-L01-closure-rollback",
  allowedFiles: closureStatusOwner.allowedFiles,
  requiredFiles: Object.freeze([]),
  skipTaskBoardProjection: true,
});
const closurePendingStatusRollbackOwner = Object.freeze({
  id: "540-06-L01-pending-closure-rollback",
  allowedFiles: Object.freeze([...closureStatusOwner.allowedFiles, "_docs/_CHANGELOG/README.md"]),
  requiredFiles: Object.freeze([]),
  skipTaskBoardProjection: true,
  skipChangelogIndexProjection: true,
});
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

async function verifySourceDescendantsDone() {
  const rootState = await readCanonicalTaskStatus(ROOT_TASK_PATH);
  for (const relativePath of SOURCE_DESCENDANT_TASK_PATHS) {
    const { source, status } = await readCanonicalTaskStatus(relativePath);
    const hasClosureReceipt = [
      "Closure Pending",
      "Closure Evidence SHA-256",
      "Closure Generation",
      "Closure Board Baseline",
      CLOSURE_CHANGELOG_PATH_FIELD,
    ].some((field) => readTaskMetadataField(source, field));
    if (
      status !== RESUME_TASK_STATUS.done ||
      !readTaskMetadataField(source, "Completed") ||
      hasClosureReceipt
    ) {
      throw new Error("TASK-540 source descendant is not complete: " + relativePath);
    }
  }
  for (const leaf of LEAVES.filter(({ id }) => id !== "540-06-L01")) {
    const group = LEAF_STATUS_GROUPS[leaf.id];
    const childState = await readCanonicalTaskStatus(group.childPath);
    requireTableStatus(childState.source, leaf.id, RESUME_TASK_STATUS.done, "TASK-540 child");
    requireTableStatus(rootState.source, group.childId, RESUME_TASK_STATUS.done, "TASK-540 root");
  }
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
  if (
    leafState.status !== RESUME_TASK_STATUS.active ||
    readTaskMetadataField(leafState.source, "Completed")
  ) {
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
        JSON.stringify(closureStatusOwner.allowedFiles) +
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
        "`. Remove Completed from those three active closure contracts. Move only TASK-540's " +
        "board row to 🚧 In progress and restore the exact pinned baseline statistics. Preserve " +
        "every prior Closure Evidence SHA-256 and Closure Generation value byte-identically. " +
        "Preserve the exact closure-leaf gate receipt `**" +
        closureLeafGateReceipt.field +
        ":** " +
        closureLeafGateReceipt.value +
        "` and do not add the other gate field. Preserve every TASK-540-01 through TASK-540-05 " +
        "source descendant byte-identically, including Done, Completed, and gate evidence. Never " +
        "edit changelog/source/tests/product docs/workflow, stage, or commit.",
      { label: "closure-pending:540:" + label + ":" + token, phase: "Closure" },
      closureStatusOwner
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
        readTaskMetadataField(state.source, "Completed") ||
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
  const marker =
    board.bucket === "inProgress"
      ? "🚧 In progress"
      : board.bucket === "done"
        ? "✅ Done"
        : "⏳ To Do";
  if (!board.row.includes(marker)) {
    throw new Error(label + ": TASK-540 board row marker does not match its bucket");
  }
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
    if (
      contracts.some(
        (contract) =>
          contract.status !== RESUME_TASK_STATUS.active || contract.metadata.Completed !== null
      )
    ) {
      throw new Error(label + ": pre-final-status contracts are not exactly active");
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

async function verifyClosureState(evidenceHash, generation) {
  if (!closureBoardBaseline || !closureLeafGateReceipt) {
    throw new Error("TASK-540 closure verifier is missing its pinned baseline or gate receipt");
  }
  for (const relativePath of TASK_PATHS) {
    const { source, status } = await readCanonicalTaskStatus(relativePath);
    if (
      status !== RESUME_TASK_STATUS.done ||
      !readTaskMetadataField(source, "Completed") ||
      readTaskMetadataField(source, "Repair Pending")
    ) {
      throw new Error("TASK-540 incomplete closure state: " + relativePath);
    }
    if (
      (relativePath === ROOT_TASK_PATH || relativePath === CLOSURE_TASK_PATHS[1]) &&
      CLOSURE_GATE_FIELDS.some((field) => readTaskMetadataField(source, field))
    ) {
      throw new Error("TASK-540 closure root/parent retained a leaf-only gate: " + relativePath);
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
  const testHashesBefore = await hashFiles([...TARGET_VITEST_FILES, ...TARGET_BUN_FILES]);
  if (closureGeneration >= Number.MAX_SAFE_INTEGER) {
    throw new Error("TASK-540 closure generation cannot advance safely");
  }
  closureGeneration += 1;
  const generation = closureGeneration;
  let pendingEstablished = false;
  let durablePendingProjection = null;
  try {
    await verifySourceDescendantsDone();
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
          "`, Date matching its filename, Version Unreleased, and a Tasks field containing TASK-540. " +
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
          "`; remove any prior TASK-540 closure-anchor line. The root and TASK-540-06 closure " +
          "contracts remain In " +
          "Progress and every TASK-540-01 through TASK-540-05 source descendant remains Done. Replace any " +
          "prior evidence region with the exact byte sequence below; keep one BEGIN/END marker and " +
          "self-read it byte-for-byte. Record truthful prior validation, seven flows, eleven PNGs, " +
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

    let statusClosureMutationError = null;
    try {
      await runMutatingAgent(
        "Repository " +
          ROOT +
          ". TASK-540 atomic status closure " +
          label +
          ". Canonical evidence and the complete full validation have passed while only the three " +
          "closure contracts were In Progress. Read all 17 TASK-540 files and the board fresh. Edit only " +
          JSON.stringify(closureStatusOwner.allowedFiles) +
          ". Preserve every TASK-540-01 through TASK-540-05 source descendant byte-identically. In " +
          "one mutation update only TASK-540-06-L01, TASK-540-06, and the root with exact " +
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
          "` without adding the other gate field, and mark the closure leaf " +
          "then closure parent then root Done with Completed, synchronize their tables, move only " +
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
      await verifyClosureState(evidenceHash, generation);
      await verifyChangelogEvidence(smoke, closureControl);
    } catch (error) {
      statusClosureVerificationError = error;
    }
    if (statusClosureMutationError && statusClosureVerificationError) {
      throw new AggregateError(
        [statusClosureMutationError, statusClosureVerificationError],
        "TASK-540 final-status dispatch and semantic verification both failed"
      );
    }
    if (statusClosureMutationError) throw statusClosureMutationError;
    if (statusClosureVerificationError) throw statusClosureVerificationError;
    const mechanicalGate = await runReadOnlyAgent(
      "Read-only TASK-540 post-status mechanical graph gate at " +
        ROOT +
        ". Verify all 17 statuses/tables are Done, the evidence hash/generation exists exactly on " +
        "TASK-540-06-L01, TASK-540-06, and the root with identical board-baseline/changelog-path " +
        "pins and a strict matching independent closureControl. Verify board row/statistics, " +
        "changelog 1252/index, no staged files/commit, and run exactly: node --check " +
        WORKFLOW_REL +
        " && git diff --check. Do not edit.",
      {
        label: "closure-mechanical:540:" + generation + ":" + label,
        phase: "Closure",
        schema: RESULT_SCHEMA,
      }
    );
    if (!resultPassed(mechanicalGate)) {
      throw new Error("TASK-540 post-status mechanical graph gate failed");
    }
    const testHashesAfter = await hashFiles([...TARGET_VITEST_FILES, ...TARGET_BUN_FILES]);
    if (!equalHashMaps(testHashesBefore, testHashesAfter)) {
      throw new Error("TASK-540 closure changed a source-owner or aggregate test");
    }
    return closureValidation;
  } catch (error) {
    if (!pendingEstablished) throw error;
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
    "Single-writer code/tests and product/cache/API/user docs match implementation; screenshots are real/distinct; forbidden Page/widget paths and commits/staging are absent.",
  ],
  [
    "preference-identity-recovery",
    "The final implementation/tests/evidence prove hook-mount-local no-user in-memory fallback with zero isolated GET/PATCH requests, zero browser storage, and remount reset; direct provider A→B has no transitional null while explicit sign-out/null/provider-unmount remain valid null boundaries; malformed GET/PATCH responses are rejected, and malformed PATCH retains the exact optimistic intent as unsynced with no automatic replay; the live route matrix proves the same sole first A PATCH hit before and after release, zero queued-A dispatch, and B default unchanged after release and before unroute.",
  ],
]);

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

function equalHashMaps(left, right) {
  return (
    Object.keys(left).length === Object.keys(right).length &&
    Object.keys(left).every((key) => left[key] === right[key])
  );
}

const workflowBranch = (await git(["branch", "--show-current"])).trim();
if (workflowBranch !== EXPECTED_BRANCH) {
  throw new Error(
    "TASK-540 workflow requires exact branch " + EXPECTED_BRANCH + ", got " + workflowBranch
  );
}
phase("Start gate");
const resumeState = await resolveLeafResumeState();
const changelogResumeState = await resolveChangelogResumeState(resumeState);
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
    "post-audit, full validation, smoke, closure, and final gates. In initial mode verify every " +
    "landed earlier leaf is either canonical Done with exact Completed evidence " +
    "or In Progress with an exact Targeted Gate Passed/Revalidation Passed field; verify the " +
    "latter historical source-leaf state will be normalized to Done immediately after this gate " +
    "without rerunning or inventing evidence. In repair mode require exactly the named active " +
    "Repair Pending owner using exact `generation <32 lowercase hex> / token <32 lowercase hex>`, " +
    "no Completed or old gate receipt on any active repair root/child/owner/closure sibling, every " +
    "other source leaf Done, and the closure leaf active; only that exact owner will be repaired/" +
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
    "`, and no staged files exist. task-540-implement.mjs is the canonical remaining " +
    "program owner; task-540-fix.mjs is accepted completed historical corrective evidence for " +
    "540-04-L03/L04 and is not an active or conflicting owner. " +
    "Do not edit.",
  { label: "start-gate:540", phase: "Start gate", schema: RESULT_SCHEMA }
);
if (!resultPassed(startGate)) throw new Error("TASK-540 start gate failed");

const verifiedResumeState = await resolveLeafResumeState();
const verifiedChangelogResumeState = await resolveChangelogResumeState(verifiedResumeState);
if (
  JSON.stringify(verifiedResumeState) !== JSON.stringify(resumeState) ||
  JSON.stringify(verifiedChangelogResumeState) !== JSON.stringify(changelogResumeState)
) {
  throw new Error("TASK-540 resume state changed during the read-only start gate");
}
seedClosureGeneration(verifiedChangelogResumeState);

if (verifiedResumeState.mode === "repair") {
  await resumeInterruptedRepair(verifiedResumeState);
} else if (verifiedResumeState.mode === "terminal") {
  await setClosurePendingState("startup-reopen:terminal", closureGeneration);
} else {
  for (const state of verifiedResumeState.leafStates) {
    const leaf = LEAF_BY_ID.get(state.id);
    if (
      state.landed &&
      state.status === RESUME_TASK_STATUS.active &&
      !LEAF_STATUS_GROUPS[state.id].holdUntilClosure
    ) {
      await transitionLeafStatus(leaf, "complete", "resume-existing-gate");
    }
  }
}
const executionResumeState = await resolveLeafResumeState();
if (executionResumeState.mode !== "initial") {
  throw new Error("TASK-540 persisted repair did not close after its fresh matching re-gate");
}
if (verifiedResumeState.mode === "terminal" && executionResumeState.startIndex !== LEAVES.length) {
  throw new Error("TASK-540 terminal reopen changed the fully landed leaf cursor");
}
const executionChangelogResumeState = await resolveChangelogResumeState(executionResumeState);
seedClosureGeneration(executionChangelogResumeState);
if (
  (verifiedResumeState.mode === "initial" &&
    executionResumeState.startIndex !== verifiedResumeState.startIndex) ||
  (verifiedResumeState.mode === "initial" &&
    executionResumeState.startLeafId !== verifiedResumeState.startLeafId)
) {
  throw new Error("TASK-540 resume cursor changed while normalizing landed source statuses");
}

for (const leaf of LEAVES.slice(executionResumeState.startIndex)) {
  const persistedState = executionResumeState.leafStates.find(({ id }) => id === leaf.id);
  if (persistedState?.status === RESUME_TASK_STATUS.active && !persistedState.landed) {
    await resumeActiveUngatedLeaf(leaf);
  } else {
    await implementAndGate(leaf);
  }
}

await runPostAudit();

phase("Full validation");
let fullValidation = await runFullValidation("full-validation:post-audit", "Full validation");

let smokeCycle = await runSmokeEvidenceCycle("initial", fullValidation);
let smoke = smokeCycle.smoke;
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

    // A non-clean final audit reopens only the closure contracts. Exact source
    // owners are reopened later, after findings have been classified.
    try {
      finalDurablePendingProjection = await setClosurePendingState("final-drift:" + round);
    } catch (error) {
      finalPendingTransitionSelfRestored = true;
      throw error;
    }
    if (round === 2) {
      throw new Error("TASK-540 final closure drift remained non-clean after two fresh rounds");
    }

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

    if (sourceFindings.length > 0) {
      await fixAuditFindings(sourceFindings, "final-drift-" + round, "Final drift", {
        afterClosure: true,
      });
      fullValidation = await runFullValidation(
        "full-validation:after-final-source-fix:" + round,
        "Final validation"
      );
    }

    if (sourceFindings.length > 0 || runtimeFindings.length > 0) {
      smokeCycle = await runSmokeEvidenceCycle("final-remediation-" + round, fullValidation, {
        afterClosure: true,
      });
      smoke = smokeCycle.smoke;
      fullValidation = smokeCycle.fullValidation;
    }

    finalDurablePendingProjection = await captureExactPendingClosureProjection(
      "TASK-540 final-remediation durable pending " + round
    );
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
        finalDurablePendingProjection = await captureExactPendingClosureProjection(
          "TASK-540 failed final-remediation durable pending " + round
        );
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
      ". Run exactly: node --check " +
      WORKFLOW_REL +
      " && git diff --check. Confirm the full task graph/changelog evidence remains closed, " +
      "including identical changelog-path pins and strict closureControl binding. Confirm HEAD/" +
      "branch unchanged, no staged files and no agent commit. Do not edit.",
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
