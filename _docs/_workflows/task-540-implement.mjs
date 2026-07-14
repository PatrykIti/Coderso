import { execFile, spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstat, readFile, readlink, realpath, stat } from "node:fs/promises";
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
const RUN_DATE = new Date().toISOString().slice(0, 10);
const CHANGELOG_REL =
  "_docs/_CHANGELOG/1252-" +
  RUN_DATE +
  "-task-540-custom-screens-functional-and-data-integrity-remediation.md";
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
const ROOT_TSC = "bunx tsc -p tsconfig.json --noEmit";
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
});
const ROUTE_SCENARIOS = Object.freeze({
  "media-prior-resolution": "button-image",
  "entry-save-failure": "dirty-guards",
  "related-first-failure": "related-retry-cache",
  "related-a-refresh": "related-retry-cache",
  "related-b-load": "related-retry-cache",
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
  ],
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
      minItems: 5,
      maxItems: 5,
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
    if (info.isSymbolicLink()) {
      return createHash("sha256")
        .update("symlink\0" + (await readlink(absolute)))
        .digest("hex");
    }
    if (!info.isFile()) return "non-file:" + info.mode;
    return createHash("sha256")
      .update(await readFile(absolute))
      .digest("hex");
  } catch (error) {
    if (error && error.code === "ENOENT") return "<missing>";
    throw error;
  }
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
  const before = await worktreeSnapshot();
  const result = await dispatchAgentSafely(await groundedPrompt(prompt), options);
  const after = await worktreeSnapshot();
  const delta = snapshotDelta(before, after);
  if (
    before.head !== after.head ||
    before.branch !== after.branch ||
    after.staged.length > 0 ||
    delta.length > 0
  ) {
    throw new Error(
      options.label + ": read-only agent changed repository state: " + delta.join(", ")
    );
  }
  return result;
}

async function runMutatingAgent(prompt, options, owner, requireOwned = true) {
  const before = await worktreeSnapshot();
  if (before.staged.length > 0) throw new Error(options.label + ": staged files exist");
  const result = await dispatchAgentSafely(await groundedPrompt(prompt), {
    ...options,
    schema: MUTATION_SCHEMA,
  });
  const after = await worktreeSnapshot();
  const delta = snapshotDelta(before, after);
  if (before.head !== after.head || before.branch !== after.branch || after.staged.length > 0) {
    throw new Error(options.label + ": agent staged, committed, or changed branch");
  }
  if (delta.some((path) => !owner.allowedFiles.includes(path))) {
    throw new Error(options.label + ": file ownership violation: " + delta.join(", "));
  }
  if (!sameUniqueSet(result.touchedFiles, delta)) {
    throw new Error(options.label + ": reported touchedFiles differ from worktree delta");
  }
  if (requireOwned && owner.requiredFiles.some((path) => !result.touchedFiles.includes(path))) {
    throw new Error(options.label + ": required owned file was not changed");
  }
  if (!resultPassed(result)) {
    throw new Error(options.label + ": mutation agent failed: " + result.errors.join("; "));
  }
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
        "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
        "tests/vitest/ui/custom-screen-entry-draft.test.ts",
        "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx",
        "tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts",
        "tests/vitest/admin/customScreensClient.test.ts",
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
      ]),
    },
    {
      id: "540-05-L02",
      taskFile: "TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md",
      allowedFiles: Object.freeze([
        "core/services/settings/userSettingsService.ts",
        "core/services/settings/screenEntryPreferencesContract.ts",
        "core/admin/services/userSettingsClient.ts",
        "core/admin/ui/custom-screens/hooks/useScreenEntryPreferences.ts",
        "core/server/httpServer.ts",
        "tests/unit/settings/userSettingsService.test.ts",
        "tests/vitest/admin/userSettingsClient.test.ts",
        "tests/vitest/ui/use-screen-entry-preferences.test.ts",
        "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx",
        "tests/integration/routes/userSettings.test.ts",
      ]),
      commands: Object.freeze([
        command("lintTypes", LINT_TYPES),
        command("lint", LINT),
        command(
          "vitest",
          vitestCommand([
            "tests/vitest/admin/userSettingsClient.test.ts",
            "tests/vitest/ui/use-screen-entry-preferences.test.ts",
            "tests/vitest/ui-integration/custom-screen-entry-preferences-persistence.test.tsx",
            "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
          ])
        ),
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

async function readCanonicalTaskStatus(relativePath) {
  const source = await readFile(ROOT + "/" + relativePath, "utf8");
  return {
    source,
    status: source.match(/^\*\*Status:\*\*\s*(.+)$/m)?.[1] ?? "<missing>",
  };
}

function requireTableStatus(source, taskId, status, label) {
  const row = source.split("\n").find((line) => line.startsWith("| TASK-" + taskId + " |"));
  if (!row || !row.trimEnd().endsWith("| " + status + " |")) {
    throw new Error(label + ": stale status table row for TASK-" + taskId);
  }
}

async function transitionLeafStatus(leaf, transition, reason) {
  const group = LEAF_STATUS_GROUPS[leaf.id];
  if (!group) throw new Error("Missing status group for " + leaf.id);
  const expectedLeafStatus = "🚧 In Progress";
  const owner = Object.freeze({
    id: "status-" + leaf.id,
    allowedFiles: Object.freeze([ROOT_TASK_PATH, group.childPath, group.leafPath]),
    requiredFiles: Object.freeze([]),
  });
  const action =
    transition === "start"
      ? "Keep the exact leaf and child In Progress before implementation/fix; add Started for first implementation or Fix Started for a verified repair."
      : reason.includes("regate")
        ? "Keep the exact leaf and child In Progress and add/update a dedicated Revalidation Passed field with the green re-gate evidence."
        : "Keep the exact leaf and child In Progress and add/update a dedicated Targeted Gate Passed field with the green targeted-gate evidence.";

  await runMutatingAgent(
    "Repository " +
      ROOT +
      ". TASK-540 task-state transition only. " +
      action +
      " Read the root parent, exact child, exact leaf, and _docs/_TASKS/README.md fresh. " +
      "Edit only " +
      JSON.stringify(owner.allowedFiles) +
      ". Synchronize the child leaf-status table and root subtask-status table. Keep root " +
      "TASK-540 status 🚧 In Progress and leave its board row/statistics byte-identical and " +
      "In Progress. No leaf or child may become Done before changelog 1252 exists. Use canonical " +
      "status fields and dedicated Started/Fix Started/Targeted Gate Passed/Revalidation Passed fields " +
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

  const [rootState, childState, leafState, boardSource] = await Promise.all([
    readCanonicalTaskStatus(ROOT_TASK_PATH),
    readCanonicalTaskStatus(group.childPath),
    readCanonicalTaskStatus(group.leafPath),
    readFile(TASKS + "/README.md", "utf8"),
  ]);
  if (rootState.status !== "🚧 In Progress" || leafState.status !== expectedLeafStatus) {
    throw new Error("TASK-540 status transition field mismatch for " + leaf.id);
  }
  const expectedChildStatus = "🚧 In Progress";
  if (childState.status !== expectedChildStatus) {
    throw new Error("TASK-540 child status transition mismatch for " + group.childId);
  }
  requireTableStatus(childState.source, leaf.id, expectedLeafStatus, "TASK-540 child");
  requireTableStatus(rootState.source, group.childId, expectedChildStatus, "TASK-540 root");
  if (transition === "complete") {
    const evidenceField = reason.includes("regate")
      ? "**Revalidation Passed:**"
      : "**Targeted Gate Passed:**";
    if (!leafState.source.includes(evidenceField)) {
      throw new Error("TASK-540 missing gate evidence field for " + leaf.id);
    }
  }
  const boardRow = boardSource.split("\n").find((line) => line.startsWith("| TASK-540 |"));
  if (!boardRow || !boardRow.includes("🚧 In progress")) {
    throw new Error("TASK-540 board row left In Progress contract");
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
        gate.errors.join("\n- "),
      { label: "fix:" + leaf.id + ":" + attempt, phase: leaf.phase },
      leaf,
      false
    );
    gate = await runLeafGate(leaf, attempt + 1);
  }
  if (!gate.pass) throw new Error(leaf.id + ": targeted gate remained red");
  await transitionLeafStatus(leaf, "complete", "targeted-gate-green");
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
    "Narrow/wide geometry and landmark role, isolated per-user settings with no localStorage/aggregate leak, central 400 mapping, auth/CSRF/rate/self-scope route proof.",
  ],
  [
    "tests-docs-scope",
    "Single-writer ownership, correct Vitest/Bun lanes, non-weakened tests, product/cache/API/user docs, forbidden Page/widget paths, task/changelog reservation and executable smoke feasibility only; runtime evidence does not exist yet.",
  ],
]);

async function reopenLeafForRepair(leaf, label, phaseName) {
  const group = LEAF_STATUS_GROUPS[leaf.id];
  const owner = Object.freeze({
    id: "reopen-" + leaf.id,
    allowedFiles: Object.freeze([
      ROOT_TASK_PATH,
      group.childPath,
      group.leafPath,
      "_docs/_TASKS/README.md",
    ]),
    requiredFiles: Object.freeze([]),
  });
  await runMutatingAgent(
    "Repository " +
      ROOT +
      ". Reopen only the verified TASK-540 final-drift source owner " +
      leaf.id +
      " for repair. Read the root, exact child/leaf and task board fresh. Edit only " +
      JSON.stringify(owner.allowedFiles) +
      ". Set the exact leaf, its child and root TASK-540 to 🚧 In Progress; synchronize their " +
      "status tables; move only TASK-540's board row back to 🚧 In progress and recalculate the " +
      "statistics delta. Add/update a dedicated Fix Started field dated " +
      RUN_DATE +
      ". Keep unrelated task/changelog state byte-identical. Never edit source/tests here, stage, " +
      "or commit. Reason: " +
      label +
      ".",
    { label: "reopen:" + leaf.id + ":" + label, phase: phaseName },
    owner,
    false
  );
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
  const boardRow = boardSource.split("\n").find((line) => line.startsWith("| TASK-540 |"));
  if (!boardRow?.includes("🚧 In progress")) {
    throw new Error("TASK-540 board was not reopened for source repair");
  }
}

async function fixAuditFindings(findings, label, phaseName, { afterClosure = false } = {}) {
  if (findings.some((finding) => finding.owner === "orchestrator")) {
    throw new Error(label + ": task/workflow contract drift requires orchestrator intervention");
  }
  for (const ownerId of LEAF_ORDER) {
    const owned = findings.filter((finding) => finding.owner === ownerId);
    if (owned.length === 0) continue;
    const leaf = LEAF_BY_ID.get(ownerId);
    if (afterClosure) {
      await reopenLeafForRepair(leaf, label + "-verified-fix", phaseName);
    } else {
      await transitionLeafStatus(leaf, "start", label + "-verified-fix");
    }
    await runMutatingAgent(
      COMMON +
        "\n\nFix only these verified " +
        label +
        " findings owned by " +
        ownerId +
        ". Edit only " +
        JSON.stringify(leaf.allowedFiles) +
        ". Findings: " +
        JSON.stringify(owned),
      { label: label + ":fix:" + ownerId, phase: phaseName },
      leaf,
      false
    );
    const gate = await runLeafGate(leaf, label, phaseName);
    if (!gate.pass) throw new Error(label + ": owner re-gate failed for " + ownerId);
    await transitionLeafStatus(leaf, "complete", label + "-regate-green");
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
    if (
      new Set(names).size !== names.length ||
      !REQUIRED_SMOKE_ASSERTIONS[scenario.kind].every((name) => names.includes(name)) ||
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
          ". Run the five exact method-aware interceptions and require one hit each: " +
          JSON.stringify(ROUTE_EXPECTATIONS) +
          ". Expand their exact patterns from fixture slugs/entry ID according to " +
          JSON.stringify(ROUTE_SCENARIOS) +
          ". Malformed JSON failures use HTTP 200, refuse a second hit, record hit 1, and are " +
          "unrouted in a separate full command before the real Save/Retry click. Delayed handlers " +
          "capture the old response, accept one hit, release through named latches, then unroute. " +
          "Assert the exact required visible/ARIA/computed/geometry/persisted/request-order " +
          "effects " +
          JSON.stringify(REQUIRED_SMOKE_ASSERTIONS) +
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

function smokeEvidenceBlock(smoke) {
  return (
    EVIDENCE_BEGIN +
    "\n```json\n" +
    JSON.stringify(canonicalSmokeEvidence(smoke), null, 2) +
    "\n```\n" +
    EVIDENCE_END
  );
}

function smokeEvidenceHash(smoke) {
  return createHash("sha256").update(smokeEvidenceBlock(smoke)).digest("hex");
}

async function verifyChangelogEvidence(smoke) {
  const source = await readFile(ROOT + "/" + CHANGELOG_REL, "utf8");
  if (hasSensitiveEvidenceDeep(source)) {
    throw new Error("TASK-540 changelog failed value-aware redaction");
  }
  const expected = smokeEvidenceBlock(smoke);
  const beginCount = source.split(EVIDENCE_BEGIN).length - 1;
  const endCount = source.split(EVIDENCE_END).length - 1;
  const start = source.indexOf(EVIDENCE_BEGIN);
  const end = source.indexOf(EVIDENCE_END, start + EVIDENCE_BEGIN.length);
  const actual =
    start >= 0 && end >= 0 ? source.slice(start, end + EVIDENCE_END.length) : "<missing>";
  if (beginCount !== 1 || endCount !== 1 || actual !== expected) {
    throw new Error("TASK-540 changelog smoke evidence block is not byte-identical");
  }
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
});
const closureStatusOwner = Object.freeze({
  id: "540-06-L01-closure",
  allowedFiles: Object.freeze([...TASK_PATHS, "_docs/_TASKS/README.md"]),
  // Every closure/re-closure updates the canonical receipt fields in all 17
  // physical contracts, so missing descendants can never be a false-clean pass.
  requiredFiles: Object.freeze([...TASK_PATHS]),
});
let closureGeneration = 0;

async function reopenAllTaskState(label, generation = closureGeneration) {
  const token = randomUUID().replaceAll("-", "").slice(0, 12);
  await runMutatingAgent(
    "Repository " +
      ROOT +
      ". TASK-540 mandatory atomic reopen/rollback for " +
      label +
      ". Read all 17 physical task files and the board fresh. Edit only " +
      JSON.stringify(closureStatusOwner.allowedFiles) +
      ". In one mutation touch every physical TASK-540 file, set every leaf/child/root status " +
      "to 🚧 In Progress, synchronize every descendant table, and add/update exact field " +
      "`**Closure Pending:** generation " +
      generation +
      " / " +
      token +
      "`. Move only TASK-540's board row to 🚧 In progress and recalculate statistics. Preserve " +
      "completed gate/evidence fields and unrelated state. Never edit changelog/source/tests/" +
      "product docs/workflow, stage, or commit.",
    { label: "closure-reopen:540:" + label + ":" + token, phase: "Closure" },
    closureStatusOwner
  );
  for (const relativePath of TASK_PATHS) {
    const { status } = await readCanonicalTaskStatus(relativePath);
    if (status !== "🚧 In Progress") {
      throw new Error("TASK-540 rollback did not reopen " + relativePath);
    }
  }
  const board = await readFile(TASKS + "/README.md", "utf8");
  const row = board.split("\n").find((line) => line.startsWith("| TASK-540 |"));
  if (!row?.includes("🚧 In progress")) {
    throw new Error("TASK-540 rollback did not reopen board state");
  }
}

async function verifyClosureState(evidenceHash, generation) {
  for (const relativePath of TASK_PATHS) {
    const { source, status } = await readCanonicalTaskStatus(relativePath);
    if (
      status !== "✅ Done" ||
      !source.includes("**Closure Evidence SHA-256:** " + evidenceHash) ||
      !source.includes("**Closure Generation:** " + generation)
    ) {
      throw new Error("TASK-540 incomplete closure state: " + relativePath);
    }
  }
  const board = await readFile(TASKS + "/README.md", "utf8");
  const row = board.split("\n").find((line) => line.startsWith("| TASK-540 |"));
  if (!row?.includes("✅ Done")) {
    throw new Error("TASK-540 board row is not Done after closure");
  }
}

async function runClosure(smoke, fullValidation, label, findings = []) {
  phase("Closure");
  const testHashesBefore = await hashFiles([...TARGET_VITEST_FILES, ...TARGET_BUN_FILES]);
  closureGeneration += 1;
  const generation = closureGeneration;
  const evidenceBlock = smokeEvidenceBlock(smoke);
  const evidenceHash = smokeEvidenceHash(smoke);
  try {
    await reopenAllTaskState("pre-status:" + label, generation);
    await runMutatingAgent(
      COMMON +
        "\n\nTASK-540 closure evidence stage " +
        label +
        ". Read _docs/_CHANGELOG/README.md and the pinned changelog fresh. Edit only " +
        JSON.stringify(closureEvidenceOwner.allowedFiles) +
        ". Create or update exactly " +
        CHANGELOG_REL +
        " and its single index row while every TASK-540 status remains In Progress. Replace any " +
        "prior evidence region with the exact byte sequence below; keep one BEGIN/END marker and " +
        "self-read it byte-for-byte. Record truthful prior validation, seven flows, eleven PNGs, " +
        "zero browser channels, exact cleanup, and generation " +
        generation +
        ". Strict scan remains external non-green with sole exact finding " +
        JSON.stringify(KNOWN_STRICT_FINDING) +
        ". Do not edit task/status/board/source/test/product docs, stage, or commit. Metadata " +
        "findings: " +
        JSON.stringify(findings) +
        ". Prior validation receipt: " +
        JSON.stringify(fullValidation) +
        ". Exact evidence block follows; delimiters are not written:\n<exact-evidence>\n" +
        evidenceBlock +
        "\n</exact-evidence>",
      { label: "closure-evidence:540:" + label, phase: "Closure" },
      closureEvidenceOwner,
      false
    );
    await verifyChangelogEvidence(smoke);

    phase("Final validation");
    const closureValidation = await runFullValidation(
      "full-validation:before-status-closure:" + generation + ":" + label,
      "Final validation"
    );

    await runMutatingAgent(
      "Repository " +
        ROOT +
        ". TASK-540 atomic status closure " +
        label +
        ". Canonical evidence and the complete full validation have passed while every task was " +
        "In Progress. Read all 17 TASK-540 files and the board fresh. Edit only " +
        JSON.stringify(closureStatusOwner.allowedFiles) +
        ". In one mutation update all 17 files with exact `**Closure Evidence SHA-256:** " +
        evidenceHash +
        "` and `**Closure Generation:** " +
        generation +
        "`, remove Closure Pending, preserve gate evidence, mark all leaves then children then root " +
        "Done, synchronize tables, move only TASK-540's board row to ✅ Done, and recalculate " +
        "statistics. Apply closure-metadata findings " +
        JSON.stringify(findings) +
        ". Never edit changelog/source/tests/product docs/workflow, stage, or commit.",
      { label: "closure-status:540:" + label, phase: "Closure" },
      closureStatusOwner
    );

    await verifyClosureState(evidenceHash, generation);
    await verifyChangelogEvidence(smoke);
    const mechanicalGate = await runReadOnlyAgent(
      "Read-only TASK-540 post-status mechanical graph gate at " +
        ROOT +
        ". Verify all 17 statuses/tables/evidence hash/generation, board row/statistics, changelog " +
        "1252/index, no staged files/commit, and run exactly: node --check " +
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
    try {
      await reopenAllTaskState("rollback:" + label, generation);
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
    "All 17 task files terminal with exact evidence receipt fields; board row/statistics and pinned changelog 1252/index exact; no other task changed.",
  ],
  [
    "evidence-security",
    "Changelog canonical block is byte-faithful to final browser/runtime evidence; strict scan is explicitly external non-green with sole TASK-545 owner; auth/CSRF/rate/self-scope and no-secret claims are accurate.",
  ],
  [
    "scope-tests-docs",
    "Single-writer code/tests and product/cache/API/user docs match implementation; screenshots are real/distinct; forbidden Page/widget paths and commits/staging are absent.",
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
          "Assign task/changelog/index/board-only defects to owner=orchestrator and area exactly " +
          "closure-metadata. Do not edit or start runtime.",
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

phase("Start gate");
const startGate = await runReadOnlyAgent(
  "Read-only TASK-540 start gate at " +
    ROOT +
    ". Read all 17 physical TASK-540 files plus board/changelog indexes fresh. Verify the " +
    "parent and currently active 540-01/540-01-L01 status are internally consistent, all later " +
    "leaves remain unstarted, every parent/child dependency and exact strict land order is " +
    JSON.stringify(LEAF_ORDER) +
    ", changelog 1252 is reserved and no 1252 file exists, TASK-543 is complete, HEAD/branch " +
    "are current, no staged files exist, and this workflow is the only task-540 workflow owner. " +
    "Do not edit.",
  { label: "start-gate:540", phase: "Start gate", schema: RESULT_SCHEMA }
);
if (!resultPassed(startGate)) throw new Error("TASK-540 start gate failed");

for (const leaf of LEAVES) {
  await implementAndGate(leaf);
}

await runPostAudit();

phase("Full validation");
let fullValidation = await runFullValidation("full-validation:post-audit", "Full validation");

let smokeCycle = await runSmokeEvidenceCycle("initial", fullValidation);
let smoke = smokeCycle.smoke;
fullValidation = smokeCycle.fullValidation;

fullValidation = await runClosure(smoke, fullValidation, "initial");

try {
  let finalDriftClean = false;
  for (let round = 1; round <= 2; round += 1) {
    const findings = await runFinalAudit(round);
    if (findings.length === 0) {
      finalDriftClean = true;
      break;
    }

    // A non-clean final audit immediately removes every Done marker before any
    // source, runtime-evidence, or metadata remediation begins.
    await reopenAllTaskState("final-drift:" + round);
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

    fullValidation = await runClosure(
      smoke,
      fullValidation,
      "final-remediation-" + round,
      metadataFindings
    );
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
      "HEAD/branch unchanged, no staged files and no agent commit. Do not edit.",
    { label: "final-gate:540", phase: "Final gate", schema: RESULT_SCHEMA }
  );
  if (!resultPassed(finalGate)) throw new Error("TASK-540 final mechanical gate failed");
} catch (error) {
  try {
    await reopenAllTaskState("post-status-failure");
  } catch (rollbackError) {
    throw new AggregateError(
      [error, rollbackError],
      "TASK-540 post-status failure and mandatory rollback both failed"
    );
  }
  throw error;
}
