import { createHash } from "node:crypto";
import { Script } from "node:vm";

export const meta = {
  name: "task-543-implement",
  description:
    "Implement TASK-543 sequentially: exact-revision Posts save/Close safety, passive accessible Posts rows with mid-width metadata, full gates, real Playwright smoke, and changelog 1255 closure. Agents never stage or commit.",
  phases: [
    { title: "Start gate" },
    { title: "543-01-L01" },
    { title: "543-02-L01" },
    { title: "Cross-lane gate" },
    { title: "Post-audit" },
    { title: "Full gates" },
    { title: "Smoke" },
    { title: "543-03-L01 close" },
    { title: "Final drift" },
    { title: "Final metadata gate" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = `${ROOT}/_docs/_TASKS`;
const WORKFLOW = `${ROOT}/_docs/_workflows/task-543-implement.mjs`;
const RUN_DATE = new Date().toISOString().slice(0, 10);
const CHANGELOG = `${ROOT}/_docs/_CHANGELOG/1255-${RUN_DATE}-task-543-posts-exit-safety-and-list-accessibility.md`;
const ENV_PREFIX = "set -a && source .env && set +a && ";
const TARGETED_VITEST_COMMAND =
  "bunx vitest run --config vitest.config.ts " +
  "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx " +
  "tests/vitest/ui/post-editor-state-hook-wave.test.tsx " +
  "tests/vitest/ui/post-block-editor-shell-wave.test.tsx " +
  "tests/vitest/ui/posts-editor-chrome-wave.test.tsx " +
  "tests/vitest/ui/post-block-editor-shell.test.tsx " +
  "tests/vitest/ui/posts-table-wave.test.tsx " +
  "tests/vitest/ui-integration/post-list-restyle.test.tsx " +
  "tests/vitest/ui-integration/post-autosave-flow.test.tsx " +
  "tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx " +
  "tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx " +
  "tests/vitest/ui-integration/post-editor-layout-shell.test.tsx " +
  "tests/vitest/ui/page-row-actions.test.tsx " +
  "tests/vitest/ui/page-table-wave.test.tsx";
const DB_PREFLIGHT_COMMAND =
  ENV_PREFIX +
  'bun --eval \'import { canConnect } from "./tests/utils/db"; const configured = ' +
  "Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); " +
  "process.stdout.write(JSON.stringify({ configured, reachable, selectOne: reachable ? 1 : 0 })); " +
  "if (!reachable) process.exit(1); process.exit(0)'";
const TASK_SEMGREP_COMMAND =
  "semgrep --error --timeout 120 --timeout-threshold 0 " +
  "--config .semgrep.yml --config p/owasp-top-ten --config p/security-audit " +
  "--config p/nodejs --config p/typescript " +
  "core/admin/ui/posts/editor/hooks/usePostAutosave.ts " +
  "core/admin/ui/posts/editor/hooks/usePostEditorState.ts " +
  "core/admin/ui/posts/editor/PostBlockEditorShell.tsx " +
  "core/admin/ui/posts/editor/PostEditorTopBar.tsx " +
  "core/admin/ui/posts/editor/header/PostEditorHeader.tsx " +
  "core/admin/ui/posts/PostsTable.tsx core/admin/ui/pages/PageRowActions.tsx";
const STRICT_SEMGREP_JSON_ARGS = Object.freeze([
  "semgrep",
  "--json",
  "--error",
  "--timeout",
  "120",
  "--timeout-threshold",
  "0",
  "--config",
  ".semgrep.yml",
  "--config",
  "p/owasp-top-ten",
  "--config",
  "p/security-audit",
  "--config",
  "p/nodejs",
  "--config",
  "p/typescript",
]);
const STRICT_SEMGREP_JSON_COMMAND =
  `bun --eval 'const command=${JSON.stringify(STRICT_SEMGREP_JSON_ARGS)}; ` +
  'const result=Bun.spawnSync({cmd:command,stdout:"pipe",stderr:"pipe"}); ' +
  "const decode=(value)=>new TextDecoder().decode(value); " +
  "process.stdout.write(JSON.stringify({command,exitCode:result.exitCode,stdout:decode(result.stdout),stderr:decode(result.stderr)})); " +
  "process.exit(result.exitCode)'";
const FULL_GATE_COMMANDS = Object.freeze([
  { id: "dbPreflight", command: DB_PREFLIGHT_COMMAND },
  { id: "targetedVitest", command: TARGETED_VITEST_COMMAND },
  { id: "lintTypes", command: "bun --cwd core lint:types" },
  { id: "lint", command: "bun --cwd core lint" },
  { id: "fullTest", command: ENV_PREFIX + "bun run test" },
  { id: "precommitCheck", command: "bun run precommit:check" },
  { id: "adminBuild", command: "bun --cwd core build:admin" },
  { id: "adminBoundary", command: "bun run check:admin-boundary" },
  { id: "adminBundle", command: "bun run check:admin-bundle" },
  { id: "releaseGates", command: "bun run gates:coderso" },
  { id: "targetedSemgrep", command: TASK_SEMGREP_COMMAND },
  { id: "strictScan", command: "bun run scan:security:strict" },
  { id: "strictSemgrepJson", command: STRICT_SEMGREP_JSON_COMMAND },
]);
const STRICT_COMPONENTS = Object.freeze([
  {
    id: "semgrep-sast",
    title: "Semgrep SAST rules",
    command:
      "semgrep --error --timeout 120 --timeout-threshold 0 --config .semgrep.yml " +
      "--config p/owasp-top-ten --config p/security-audit --config p/nodejs --config p/typescript",
  },
  {
    id: "bun-audit",
    title: "Bun dependency advisory audit",
    command: "bun audit --audit-level high",
  },
  {
    id: "trivy-vuln",
    title: "Trivy lockfile CVE scan",
    command:
      "trivy fs --scanners vuln --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed " +
      "--include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist " +
      "--skip-dirs build --skip-dirs .next --skip-dirs .git .",
  },
  {
    id: "trivy-config",
    title: "Trivy Docker and IaC misconfiguration scan",
    command:
      "trivy config --exit-code 1 --severity MEDIUM,HIGH,CRITICAL --skip-dirs _docs " +
      "--skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next .",
  },
  {
    id: "trivy-secret",
    title: "Trivy filesystem secret scan",
    command:
      "trivy fs --scanners secret --exit-code 1 --skip-dirs _docs --skip-dirs node_modules " +
      "--skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .",
  },
  {
    id: "gitleaks-history",
    title: "Gitleaks Git history secret scan",
    command: "gitleaks git --config .gitleaks.toml --exit-code 1 --redact=100 .",
  },
  {
    id: "gitleaks-worktree",
    title: "Gitleaks current worktree secret scan",
    command: "gitleaks dir --config .gitleaks.toml --exit-code 1 --redact=100 .",
  },
]);
const KNOWN_STRICT_FINDING = Object.freeze({
  scanner: "semgrep-sast",
  ruleId:
    "javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag",
  file: "_docs/_workflows/task-522-author.mjs",
  line: 185,
  owner: "TASK-545",
});
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

const COMMAND_RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "command", "status", "rawOutput", "rawOutputSha256"],
  properties: {
    id: { type: "string", minLength: 1 },
    command: { type: "string", minLength: 1 },
    status: { type: "integer" },
    rawOutput: { type: "string" },
    rawOutputSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
};

const STRICT_FINDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scanner", "ruleId", "file", "line", "owner"],
  properties: {
    scanner: { type: "string" },
    ruleId: { type: "string" },
    file: { type: "string" },
    line: { type: "integer", minimum: 1 },
    owner: { type: "string" },
  },
};

const FULL_GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "errors", "receipts", "database", "strictScan"],
  properties: {
    pass: { type: "boolean" },
    errors: { type: "array", items: { type: "string" } },
    receipts: {
      type: "array",
      minItems: FULL_GATE_COMMANDS.length,
      maxItems: FULL_GATE_COMMANDS.length,
      items: COMMAND_RECEIPT_SCHEMA,
    },
    database: {
      type: "object",
      additionalProperties: false,
      required: ["receiptId", "configured", "reachable", "selectOne"],
      properties: {
        receiptId: { const: "dbPreflight" },
        configured: { type: "boolean" },
        reachable: { type: "boolean" },
        selectOne: { enum: [0, 1] },
      },
    },
    strictScan: {
      type: "object",
      additionalProperties: false,
      required: ["receiptId", "semgrepJsonReceiptId", "components", "findings"],
      properties: {
        receiptId: { const: "strictScan" },
        semgrepJsonReceiptId: { const: "strictSemgrepJson" },
        components: {
          type: "array",
          minItems: STRICT_COMPONENTS.length,
          maxItems: STRICT_COMPONENTS.length,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "command",
              "exitCode",
              "rawOutput",
              "rawOutputSha256",
              "outputStart",
              "outputEnd",
              "findings",
            ],
            properties: {
              id: { type: "string" },
              command: { type: "string" },
              exitCode: { type: "integer" },
              rawOutput: { type: "string" },
              rawOutputSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
              outputStart: { type: "integer", minimum: 0 },
              outputEnd: { type: "integer", minimum: 1 },
              findings: { type: "array", items: STRICT_FINDING_SCHEMA },
            },
          },
        },
        findings: { type: "array", items: STRICT_FINDING_SCHEMA },
      },
    },
  },
};

const FINGERPRINT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fingerprint", "changedPaths"],
  properties: {
    fingerprint: { type: "string", pattern: "^[a-f0-9]{64}$" },
    changedPaths: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string" } },
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
        required: ["severity", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { enum: ["high", "medium", "low"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
};

const SMOKE_KINDS = Object.freeze([
  "clean-close",
  "dirty-delayed-close",
  "pending-revert-restoration",
  "failure-retry",
  "double-close",
  "table-keyboard",
  "mid-viewport-metadata",
]);
const TRANSIENT_SCREENSHOT_KINDS = Object.freeze([
  "dirty-delayed-close",
  "pending-revert-restoration",
  "failure-retry",
  "double-close",
]);

const SMOKE_SESSION_PREFIX = "playwright-cli -s=wf543smoke --raw ";
const RUN_CODE_PAYLOAD_MAX_BYTES = 65_536;
const RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH = 87_384;
const RUN_CODE_COMMAND_MAX_BYTES = 10_000;
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const SMOKE_SCREENSHOT_ROOT = `${ROOT}/_docs/_workflows/_smoke`;
const POSTS_LIST_URL = "http://coderso-a.localhost:5173/admin/posts";
const ADMIN_ORIGIN = "http://coderso-a.localhost:5173";
const POST_TITLE_SELECTOR = '[data-post-editor-title-input="true"]';
const POST_CLOSE_SELECTOR = '[data-post-editor-header-close="true"]';
const SMOKE_PASSWORD_FILL_COMMAND =
  'playwright-cli -s=wf543smoke --raw fill \'input[type="password"]\' "$ADMIN_PASSWORD" >/dev/null';
const SMOKE_SETUP_STORAGE_KEY = "wf543smoke-setup";
const FAILURE_BASE_OWNED_PORTS = Object.freeze([3000, 5173]);
const ADMIN_HEALTH_COMMAND =
  "curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}' " +
  "http://coderso-a.localhost:5173/admin/";
const FRONT_HEALTH_COMMAND =
  "curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}' " +
  "http://coderso-a.localhost:3000";
const NONCE_GENERATION_COMMAND =
  'node --eval \'const crypto=require("node:crypto"); ' +
  'process.stdout.write("wf543-"+crypto.randomBytes(16).toString("hex"))\'';
const RESPONSIVE_WIDTHS = Object.freeze([390, 768, 900, 1024]);
const RESPONSIVE_HEIGHT = 900;
const SMOKE_CLI_COMMAND_SCHEMA = {
  type: "string",
  pattern: "^playwright-cli -s=wf543smoke --raw [^\\n]+$",
};
const SMOKE_RUN_CODE_COMMAND_SCHEMA = {
  type: "string",
  pattern: "^playwright-cli -s=wf543smoke --raw run-code [^\\n]+$",
};
const RAW_VALUE_SCHEMA = {
  anyOf: [
    { type: "null" },
    { type: "boolean" },
    { type: "number" },
    { type: "string" },
    { type: "array" },
    { type: "object" },
  ],
};
const STRING_ARRAY_SCHEMA = { type: "array", items: { type: "string" } };
const POST_PAYLOAD_SCHEMA = { type: "object", minProperties: 1 };
const SAFE_SENTINEL_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: 120,
  pattern: "^[A-Za-z0-9 _.-]+$",
};
const THEME_APPLIED_STATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["url", "preference", "resolved"],
  properties: {
    url: { type: "string", pattern: "^http://coderso-a\\.localhost:5173/admin/" },
    preference: { enum: ["light", "dark"] },
    resolved: { enum: ["light", "dark"] },
  },
};
const THEME_RESTORE_STATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["url", "storedPreference", "darkClass", "lightClass"],
  properties: {
    url: { type: "string", pattern: "^http://coderso-a\\.localhost:5173/admin/" },
    storedPreference: { anyOf: [{ type: "null" }, { enum: ["light", "dark"] }] },
    darkClass: { type: "boolean" },
    lightClass: { type: "boolean" },
  },
};
const SETUP_STATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["url", "value"],
  properties: {
    url: { type: "string", pattern: "^http://coderso-a\\.localhost:5173/admin/" },
    value: { anyOf: [{ type: "null" }, { type: "string" }] },
  },
};
const SMOKE_LOG_OBSERVATION_START =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => { " +
  "const previous = page.__wf543LogListeners; if (previous) { " +
  'page.off("console", previous.console); page.off("pageerror", previous.pageerror); } ' +
  "page.__wf543ConsoleErrors = []; page.__wf543ConsoleWarnings = []; " +
  "page.__wf543PageErrors = []; const onConsole = (message) => { " +
  'if (message.type() === "error") page.__wf543ConsoleErrors.push(message.text()); ' +
  'if (message.type() === "warning") page.__wf543ConsoleWarnings.push(message.text()); }; ' +
  "const onPageError = (error) => page.__wf543PageErrors.push(String(error)); " +
  'page.on("console", onConsole); page.on("pageerror", onPageError); ' +
  "page.__wf543LogListeners = { console: onConsole, pageerror: onPageError }; return true; }'";
const SMOKE_LOG_RESET =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => { page.__wf543ConsoleErrors = []; " +
  "page.__wf543ConsoleWarnings = []; page.__wf543PageErrors = []; return true; }'";
const SMOKE_CONSOLE_ERROR_READ =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => page.__wf543ConsoleErrors ?? []'";
const SMOKE_CONSOLE_WARNING_READ =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => page.__wf543ConsoleWarnings ?? []'";
const SMOKE_PAGE_ERROR_READ =
  "playwright-cli -s=wf543smoke --raw run-code '(page) => page.__wf543PageErrors ?? []'";
const SMOKE_LOGIN_SUBMIT =
  "playwright-cli -s=wf543smoke --raw run-code 'async (page) => { " +
  'const button = page.getByRole("button", { name: "Sign in", exact: true }); ' +
  "await button.click(); await page.waitForURL((url) => " +
  'url.pathname.startsWith("/admin/") && !url.pathname.includes("/login")); ' +
  "return { signedIn: true, url: page.url() }; }'";
const SMOKE_RECEIPT_REQUIRED = Object.freeze([
  "command",
  "status",
  "stdout",
  "stderr",
  "stdoutSha256",
  "stderrSha256",
  "parsedOutput",
]);

function commandResultSchema(
  commandSchema = SMOKE_CLI_COMMAND_SCHEMA,
  parsedOutputSchema = RAW_VALUE_SCHEMA
) {
  return {
    type: "object",
    additionalProperties: false,
    required: [...SMOKE_RECEIPT_REQUIRED],
    properties: {
      command: commandSchema,
      status: { type: "integer" },
      stdout: { type: "string" },
      stderr: { type: "string" },
      stdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
      stderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
      parsedOutput: parsedOutputSchema,
    },
  };
}

const LOG_READ_SET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["consoleErrors", "consoleWarnings", "pageErrors"],
  properties: {
    consoleErrors: commandResultSchema({ const: SMOKE_CONSOLE_ERROR_READ }, STRING_ARRAY_SCHEMA),
    consoleWarnings: commandResultSchema(
      { const: SMOKE_CONSOLE_WARNING_READ },
      STRING_ARRAY_SCHEMA
    ),
    pageErrors: commandResultSchema({ const: SMOKE_PAGE_ERROR_READ }, STRING_ARRAY_SCHEMA),
  },
};

const OPTIONAL_LOG_READ_SET_SCHEMA = {
  anyOf: [{ type: "null" }, LOG_READ_SET_SCHEMA],
};

const COMMAND_TIMELINE_RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "sequence",
    "scope",
    "command",
    "status",
    "stdout",
    "stderr",
    "stdoutSha256",
    "stderrSha256",
    "parsedOutput",
  ],
  properties: {
    sequence: { type: "integer", minimum: 1 },
    scope: { type: "string", minLength: 1 },
    command: { type: "string", minLength: 1 },
    status: { type: "integer" },
    stdout: { type: "string" },
    stderr: { type: "string" },
    stdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    stderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    parsedOutput: RAW_VALUE_SCHEMA,
  },
};

const RESPONSIVE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "width",
    "matchedRowCount",
    "rowPostId",
    "fallbackMetadataVisible",
    "fallbackStatusVisible",
    "fallbackAuthorVisible",
    "fallbackDateVisible",
    "columnStatusVisible",
    "columnAuthorVisible",
    "columnDateVisible",
    "visibleStatusCopies",
    "visibleAuthorCopies",
    "visibleDateCopies",
    "titleAccessibleName",
    "checkboxAccessibleName",
    "actionAccessibleName",
    "nodes",
    "rowWidth",
    "tableWidth",
  ],
  properties: {
    width: { type: "integer" },
    matchedRowCount: { type: "integer", minimum: 0 },
    rowPostId: { type: "string" },
    fallbackMetadataVisible: { type: "boolean" },
    fallbackStatusVisible: { type: "boolean" },
    fallbackAuthorVisible: { type: "boolean" },
    fallbackDateVisible: { type: "boolean" },
    columnStatusVisible: { type: "boolean" },
    columnAuthorVisible: { type: "boolean" },
    columnDateVisible: { type: "boolean" },
    visibleStatusCopies: { type: "integer", minimum: 0 },
    visibleAuthorCopies: { type: "integer", minimum: 0 },
    visibleDateCopies: { type: "integer", minimum: 0 },
    titleAccessibleName: { type: "string" },
    checkboxAccessibleName: { type: "string" },
    actionAccessibleName: { type: "string" },
    nodes: {
      type: "object",
      additionalProperties: false,
      required: [
        "fallbackMetadata",
        "fallbackStatus",
        "fallbackAuthor",
        "fallbackDate",
        "columnStatus",
        "columnAuthor",
        "columnDate",
        "row",
        "table",
      ],
      properties: Object.fromEntries(
        [
          "fallbackMetadata",
          "fallbackStatus",
          "fallbackAuthor",
          "fallbackDate",
          "columnStatus",
          "columnAuthor",
          "columnDate",
          "row",
          "table",
        ].map((key) => [
          key,
          {
            type: "object",
            additionalProperties: false,
            required: [
              "exists",
              "display",
              "visibility",
              "opacity",
              "width",
              "height",
              "visible",
              "text",
            ],
            properties: {
              exists: { type: "boolean" },
              display: { type: "string" },
              visibility: { type: "string" },
              opacity: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
              visible: { type: "boolean" },
              text: { type: "string" },
            },
          },
        ])
      ),
    },
    rowWidth: { type: "number" },
    tableWidth: { type: "number" },
  },
};

const MUTATION_RECORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["method", "path", "payload"],
  properties: {
    method: { enum: ["POST", "PUT", "PATCH", "DELETE"] },
    path: { type: "string", minLength: 1 },
    payload: { anyOf: [{ type: "null" }, POST_PAYLOAD_SCHEMA] },
  },
};
const MUTATION_ARRAY_SCHEMA = { type: "array", items: MUTATION_RECORD_SCHEMA };
const NAVIGATION_ARRAY_SCHEMA = { type: "array", items: { type: "string" } };

const KIND_EVIDENCE_SCHEMAS = [
  {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "cleanBeforeClose",
      "saveRequestCount",
      "navigationCount",
      "mutations",
      "navigationUrls",
      "finalUrl",
    ],
    properties: {
      kind: { const: "clean-close" },
      cleanBeforeClose: { type: "boolean" },
      saveRequestCount: { type: "integer", minimum: 0 },
      navigationCount: { type: "integer", minimum: 0 },
      mutations: MUTATION_ARRAY_SCHEMA,
      navigationUrls: NAVIGATION_ARRAY_SCHEMA,
      finalUrl: { type: "string" },
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "saveRequestCount",
      "requestOrder",
      "requestPayload",
      "closeBusy",
      "closeDisabled",
      "nonCloseEditable",
      "navigationBeforeRelease",
      "navigationAfterRelease",
      "mutations",
      "navigationUrls",
      "finalUrl",
    ],
    properties: {
      kind: { const: "dirty-delayed-close" },
      saveRequestCount: { type: "integer", minimum: 0 },
      requestOrder: STRING_ARRAY_SCHEMA,
      requestPayload: POST_PAYLOAD_SCHEMA,
      closeBusy: { type: "boolean" },
      closeDisabled: { type: "boolean" },
      nonCloseEditable: { type: "boolean" },
      navigationBeforeRelease: { type: "integer", minimum: 0 },
      navigationAfterRelease: { type: "integer", minimum: 0 },
      mutations: MUTATION_ARRAY_SCHEMA,
      navigationUrls: NAVIGATION_ARRAY_SCHEMA,
      finalUrl: { type: "string" },
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "saveRequestCount",
      "requestOrder",
      "payloadA",
      "payloadB",
      "navigationBeforeB",
      "navigationAfterB",
      "mutations",
      "navigationUrls",
      "finalUrl",
    ],
    properties: {
      kind: { const: "pending-revert-restoration" },
      saveRequestCount: { type: "integer", minimum: 0 },
      requestOrder: STRING_ARRAY_SCHEMA,
      payloadA: POST_PAYLOAD_SCHEMA,
      payloadB: POST_PAYLOAD_SCHEMA,
      navigationBeforeB: { type: "integer", minimum: 0 },
      navigationAfterB: { type: "integer", minimum: 0 },
      mutations: MUTATION_ARRAY_SCHEMA,
      navigationUrls: NAVIGATION_ARRAY_SCHEMA,
      finalUrl: { type: "string" },
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "autosavePostCount",
      "manualPatchCount",
      "metadataPatchCount",
      "mutationCountAfterRetry",
      "alertVisible",
      "alertText",
      "draftText",
      "retryFocused",
      "navigationAfterFailure",
      "navigationAfterRetry",
      "navigationAfterClose",
      "retrySucceeded",
      "metadataRetrySucceeded",
      "alertClearedAfterRetry",
      "editorUrlAfterRetry",
      "mutations",
      "navigationUrls",
      "finalUrl",
    ],
    properties: {
      kind: { const: "failure-retry" },
      autosavePostCount: { type: "integer", minimum: 0 },
      manualPatchCount: { type: "integer", minimum: 0 },
      metadataPatchCount: { type: "integer", minimum: 0 },
      mutationCountAfterRetry: { type: "integer", minimum: 0 },
      alertVisible: { type: "boolean" },
      alertText: { type: "string" },
      draftText: { type: "string" },
      retryFocused: { type: "boolean" },
      navigationAfterFailure: { type: "integer", minimum: 0 },
      navigationAfterRetry: { type: "integer", minimum: 0 },
      navigationAfterClose: { type: "integer", minimum: 0 },
      retrySucceeded: { type: "boolean" },
      metadataRetrySucceeded: { type: "boolean" },
      alertClearedAfterRetry: { type: "boolean" },
      editorUrlAfterRetry: { type: "string" },
      mutations: MUTATION_ARRAY_SCHEMA,
      navigationUrls: NAVIGATION_ARRAY_SCHEMA,
      finalUrl: { type: "string" },
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "domClickEvents",
      "saveRequestCount",
      "navigationCount",
      "closeBusy",
      "closeDisabled",
      "closePendingData",
      "nonCloseEditable",
      "mutations",
      "navigationUrls",
      "finalUrl",
    ],
    properties: {
      kind: { const: "double-close" },
      domClickEvents: { type: "integer", minimum: 0 },
      saveRequestCount: { type: "integer", minimum: 0 },
      navigationCount: { type: "integer", minimum: 0 },
      closeBusy: { type: "boolean" },
      closeDisabled: { type: "boolean" },
      closePendingData: { type: "boolean" },
      nonCloseEditable: { type: "boolean" },
      mutations: MUTATION_ARRAY_SCHEMA,
      navigationUrls: NAVIGATION_ARRAY_SCHEMA,
      finalUrl: { type: "string" },
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "titleKey",
      "titleNavigationCount",
      "titleUrl",
      "titleAccessibleName",
      "checkboxKey",
      "checkboxToggled",
      "checkboxNavigationCount",
      "checkboxAccessibleName",
      "actionKey",
      "actionMenuOpened",
      "actionNavigationCount",
      "actionAccessibleName",
      "mutations",
      "navigationUrls",
    ],
    properties: {
      kind: { const: "table-keyboard" },
      titleKey: { type: "string" },
      titleNavigationCount: { type: "integer", minimum: 0 },
      titleUrl: { type: "string" },
      titleAccessibleName: { type: "string" },
      checkboxKey: { type: "string" },
      checkboxToggled: { type: "boolean" },
      checkboxNavigationCount: { type: "integer", minimum: 0 },
      checkboxAccessibleName: { type: "string" },
      actionKey: { type: "string" },
      actionMenuOpened: { type: "boolean" },
      actionNavigationCount: { type: "integer", minimum: 0 },
      actionAccessibleName: { type: "string" },
      mutations: MUTATION_ARRAY_SCHEMA,
      navigationUrls: NAVIGATION_ARRAY_SCHEMA,
    },
  },
  {
    type: "object",
    additionalProperties: false,
    required: ["kind", "orderedWidths", "visibleSemanticCopies", "mutations", "navigationUrls"],
    properties: {
      kind: { const: "mid-viewport-metadata" },
      orderedWidths: { type: "array", minItems: 4, maxItems: 4, items: { type: "integer" } },
      visibleSemanticCopies: {
        type: "array",
        minItems: 4,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["width", "status", "author", "date"],
          properties: {
            width: { type: "integer" },
            status: { type: "integer", minimum: 0 },
            author: { type: "integer", minimum: 0 },
            date: { type: "integer", minimum: 0 },
          },
        },
      },
      mutations: MUTATION_ARRAY_SCHEMA,
      navigationUrls: NAVIGATION_ARRAY_SCHEMA,
    },
  },
];

const SMOKE_SUCCESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "serverUp",
    "errors",
    "commands",
    "bootstrap",
    "preflightSessionList",
    "health",
    "helper",
    "state",
    "fixtures",
    "scenarios",
    "lifecycleLogReads",
    "consoleErrors",
    "consoleWarnings",
    "pageErrors",
    "screenshots",
    "commandTimeline",
    "cleanup",
    "failures",
  ],
  properties: {
    pass: { const: true },
    serverUp: { const: true },
    errors: STRING_ARRAY_SCHEMA,
    commands: {
      type: "object",
      additionalProperties: false,
      required: [
        "helper",
        "nonceGeneration",
        "adminProbe",
        "frontProbe",
        "sessionPrefix",
        "browserOpen",
        "emailFill",
        "passwordFill",
        "loginSubmit",
        "consoleObservationStart",
        "finalRouteList",
        "browserClose",
        "sessionList",
        "helperStop",
      ],
      properties: {
        helper: {
          type: "string",
          pattern:
            '^bash -lc \'CODERSO_WF543_LAUNCH_NONCE=wf543-[a-f0-9]{32} coderso-dev-core-host /home/coder/project/Coderso >/dev/null 2>&1 & printf "%s\\\\n" "\\$!"\'$',
        },
        nonceGeneration: { const: NONCE_GENERATION_COMMAND },
        adminProbe: { const: ADMIN_HEALTH_COMMAND },
        frontProbe: { const: FRONT_HEALTH_COMMAND },
        sessionPrefix: { const: "playwright-cli -s=wf543smoke --raw" },
        browserOpen: {
          const: "playwright-cli -s=wf543smoke --raw open http://coderso-a.localhost:5173/admin/",
        },
        emailFill: {
          const:
            'playwright-cli -s=wf543smoke --raw fill \'input[type="email"]\' "$ADMIN_EMAIL" >/dev/null',
        },
        passwordFill: {
          const: SMOKE_PASSWORD_FILL_COMMAND,
        },
        loginSubmit: { const: SMOKE_LOGIN_SUBMIT },
        consoleObservationStart: { const: SMOKE_LOG_OBSERVATION_START },
        finalRouteList: { const: "playwright-cli -s=wf543smoke --raw route-list" },
        browserClose: { const: "playwright-cli -s=wf543smoke --raw close" },
        sessionList: { const: "playwright-cli --raw list" },
        helperStop: { type: "string", minLength: 1 },
      },
    },
    bootstrap: {
      type: "object",
      additionalProperties: false,
      required: [
        "helperStart",
        "nonceGeneration",
        "preLaunchPortChecks",
        "browserOpen",
        "emailFill",
        "passwordFill",
        "loginSubmit",
        "consoleObservationStart",
      ],
      properties: {
        nonceGeneration: commandResultSchema(
          { const: NONCE_GENERATION_COMMAND },
          { type: "string", pattern: "^wf543-[a-f0-9]{32}$" }
        ),
        helperStart: commandResultSchema(
          { type: "string", minLength: 1 },
          { type: "string", pattern: "^[0-9]+\\n?$" }
        ),
        preLaunchPortChecks: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["port", "absent", ...SMOKE_RECEIPT_REQUIRED],
            properties: {
              port: { enum: [3000, 5173] },
              absent: { type: "boolean" },
              ...commandResultSchema(
                { type: "string" },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["absent"],
                  properties: { absent: { type: "boolean" } },
                }
              ).properties,
            },
          },
        },
        browserOpen: commandResultSchema(),
        emailFill: commandResultSchema(),
        passwordFill: commandResultSchema(),
        loginSubmit: commandResultSchema(
          { const: SMOKE_LOGIN_SUBMIT },
          {
            type: "object",
            additionalProperties: false,
            required: ["signedIn", "url"],
            properties: {
              signedIn: { const: true },
              url: { type: "string", pattern: "^http://coderso-a\\.localhost:5173/admin/" },
            },
          }
        ),
        consoleObservationStart: commandResultSchema(
          { const: SMOKE_LOG_OBSERVATION_START },
          { const: true }
        ),
      },
    },
    preflightSessionList: commandResultSchema({ const: "playwright-cli --raw list" }),
    health: {
      type: "object",
      additionalProperties: false,
      required: ["admin", "front"],
      properties: {
        admin: commandResultSchema({ const: ADMIN_HEALTH_COMMAND }),
        front: commandResultSchema({ const: FRONT_HEALTH_COMMAND }),
      },
    },
    helper: {
      type: "object",
      additionalProperties: false,
      required: [
        "serverStartedAtEpochMs",
        "serverStartTimestampReceipt",
        "launchNonce",
        "rootPid",
        "ppid",
        "startTicks",
        "cmdline",
        "cwd",
        "cmdlineSha256",
        "identityReceipts",
        "childPids",
        "ownedPorts",
        "pidTreeDiscovery",
        "portOwnershipDiscovery",
      ],
      properties: {
        serverStartedAtEpochMs: { type: "integer", minimum: 1 },
        serverStartTimestampReceipt: commandResultSchema(
          { const: "/usr/bin/date +%s%3N" },
          {
            type: "object",
            additionalProperties: false,
            required: ["epochMs"],
            properties: { epochMs: { type: "integer", minimum: 1 } },
          }
        ),
        launchNonce: { type: "string", pattern: "^wf543-[a-f0-9]{32}$" },
        rootPid: { type: "integer", minimum: 2 },
        ppid: { type: "integer", minimum: 1 },
        startTicks: { type: "string", pattern: "^[0-9]+$" },
        cmdline: { type: "string", minLength: 1 },
        cwd: { const: ROOT },
        cmdlineSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        identityReceipts: {
          type: "object",
          additionalProperties: false,
          required: ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"],
          properties: Object.fromEntries(
            ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"].map((key) => [
              key,
              commandResultSchema({ type: "string", minLength: 1 }),
            ])
          ),
        },
        childPids: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { type: "integer", minimum: 2 },
        },
        ownedPorts: {
          type: "array",
          minItems: 2,
          uniqueItems: true,
          items: { type: "integer", minimum: 1, maximum: 65535 },
        },
        pidTreeDiscovery: {
          type: "object",
          additionalProperties: false,
          required: ["discoveredPids", ...SMOKE_RECEIPT_REQUIRED],
          properties: {
            discoveredPids: {
              type: "array",
              minItems: 2,
              uniqueItems: true,
              items: { type: "integer", minimum: 2 },
            },
            ...commandResultSchema(
              { type: "string", minLength: 1 },
              {
                type: "object",
                additionalProperties: false,
                required: ["discoveredPids"],
                properties: {
                  discoveredPids: {
                    type: "array",
                    minItems: 2,
                    uniqueItems: true,
                    items: { type: "integer", minimum: 2 },
                  },
                },
              }
            ).properties,
          },
        },
        portOwnershipDiscovery: {
          type: "object",
          additionalProperties: false,
          required: ["mappings", ...SMOKE_RECEIPT_REQUIRED],
          properties: {
            mappings: {
              type: "array",
              minItems: 2,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["port", "ownerPids"],
                properties: {
                  port: { type: "integer", minimum: 1, maximum: 65535 },
                  ownerPids: {
                    type: "array",
                    minItems: 1,
                    uniqueItems: true,
                    items: { type: "integer", minimum: 2 },
                  },
                },
              },
            },
            ...commandResultSchema(
              { type: "string", minLength: 1 },
              {
                type: "object",
                additionalProperties: false,
                required: ["mappings"],
                properties: {
                  mappings: {
                    type: "array",
                    minItems: 2,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["port", "ownerPids"],
                      properties: {
                        port: { type: "integer", minimum: 1, maximum: 65535 },
                        ownerPids: {
                          type: "array",
                          minItems: 1,
                          uniqueItems: true,
                          items: { type: "integer", minimum: 2 },
                        },
                      },
                    },
                  },
                },
              }
            ).properties,
          },
        },
      },
    },
    state: {
      type: "object",
      additionalProperties: false,
      required: ["theme", "setup"],
      properties: {
        theme: {
          type: "object",
          additionalProperties: false,
          required: ["before", "restore", "after"],
          properties: {
            before: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, THEME_RESTORE_STATE_SCHEMA),
            restore: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, THEME_RESTORE_STATE_SCHEMA),
            after: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, THEME_RESTORE_STATE_SCHEMA),
          },
        },
        setup: {
          type: "object",
          additionalProperties: false,
          required: ["before", "restore", "after"],
          properties: {
            before: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, SETUP_STATE_SCHEMA),
            restore: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, SETUP_STATE_SCHEMA),
            after: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, SETUP_STATE_SCHEMA),
          },
        },
      },
    },
    fixtures: {
      type: "array",
      minItems: 1,
      maxItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "title",
          "slug",
          "editorUrl",
          "openAfterCreateEnabled",
          "createPayload",
          "cleanPayload",
          "draftTitleA",
          "draftTitleB",
          "createCommand",
          "createStatus",
          "createStdout",
          "createStderr",
          "createStdoutSha256",
          "createStderrSha256",
          "createParsedOutput",
          "createdId",
          "provenanceCommand",
          "provenanceStatus",
          "provenanceStdout",
          "provenanceStderr",
          "provenanceStdoutSha256",
          "provenanceStderrSha256",
          "provenanceParsedOutput",
          "provenanceId",
          "deleteCommand",
          "deleteStatus",
          "deleteStdout",
          "deleteStderr",
          "deleteStdoutSha256",
          "deleteStderrSha256",
          "deleteParsedOutput",
          "deletedId",
          "absenceCommand",
          "absenceStatus",
          "absenceStdout",
          "absenceStderr",
          "absenceStdoutSha256",
          "absenceStderrSha256",
          "absenceParsedOutput",
          "absenceId",
          "absent",
        ],
        properties: {
          id: { type: "string", minLength: 1 },
          title: SAFE_SENTINEL_SCHEMA,
          slug: { type: "string", pattern: "^[a-z0-9-]{1,120}$" },
          editorUrl: {
            type: "string",
            pattern: "^http://coderso-a\\.localhost:5173/admin/posts/[^/?#]+$",
          },
          openAfterCreateEnabled: { type: "boolean" },
          createPayload: POST_PAYLOAD_SCHEMA,
          cleanPayload: POST_PAYLOAD_SCHEMA,
          draftTitleA: SAFE_SENTINEL_SCHEMA,
          draftTitleB: SAFE_SENTINEL_SCHEMA,
          createCommand: SMOKE_RUN_CODE_COMMAND_SCHEMA,
          createStatus: { type: "integer" },
          createStdout: { type: "string" },
          createStderr: { type: "string" },
          createStdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          createStderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          createParsedOutput: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "responsePostId",
              "title",
              "slug",
              "cleanPayload",
              "newPostControlName",
              "drawerTitle",
              "createButtonName",
              "openAfterCreateEnabled",
              "createRequestPayload",
              "createResponseStatus",
              "createResponseUrl",
            ],
            properties: {
              id: { type: "string" },
              responsePostId: { type: "string" },
              title: { type: "string" },
              slug: { type: "string" },
              cleanPayload: POST_PAYLOAD_SCHEMA,
              newPostControlName: { const: "New post" },
              drawerTitle: { const: "Create New Post" },
              createButtonName: { const: "Create Post" },
              openAfterCreateEnabled: { type: "boolean" },
              createRequestPayload: POST_PAYLOAD_SCHEMA,
              createResponseStatus: { type: "integer" },
              createResponseUrl: { type: "string" },
            },
          },
          createdId: { type: "string" },
          provenanceCommand: SMOKE_RUN_CODE_COMMAND_SCHEMA,
          provenanceStatus: { type: "integer" },
          provenanceStdout: { type: "string" },
          provenanceStderr: { type: "string" },
          provenanceStdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          provenanceStderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          provenanceParsedOutput: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "responsePostId",
              "postCreateUrl",
              "postCreateRouteId",
              "editorUrl",
              "editorUrlId",
              "editorTitle",
              "domTitleAccessibleName",
              "domHref",
              "domHrefId",
            ],
            properties: {
              id: { type: "string" },
              responsePostId: { type: "string" },
              postCreateUrl: { type: "string" },
              postCreateRouteId: { type: "string" },
              editorUrl: {
                type: "string",
                pattern: "^http://coderso-a\\.localhost:5173/admin/posts/[^/?#]+$",
              },
              editorUrlId: { type: "string" },
              editorTitle: { type: "string" },
              domTitleAccessibleName: { type: "string" },
              domHref: { type: "string" },
              domHrefId: { type: "string" },
            },
          },
          provenanceId: { type: "string" },
          deleteCommand: SMOKE_RUN_CODE_COMMAND_SCHEMA,
          deleteStatus: { type: "integer" },
          deleteStdout: { type: "string" },
          deleteStderr: { type: "string" },
          deleteStdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          deleteStderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          deleteParsedOutput: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "deleted",
              "responseStatus",
              "responseUrl",
              "rowTitleAccessibleName",
              "domHref",
              "actionAccessibleName",
              "menuItemName",
              "dialogTitle",
              "confirmButtonName",
              "domLinkCount",
            ],
            properties: {
              id: { type: "string" },
              deleted: { type: "boolean" },
              responseStatus: { type: "integer" },
              responseUrl: { type: "string" },
              rowTitleAccessibleName: { type: "string" },
              domHref: { type: "string" },
              actionAccessibleName: { type: "string" },
              menuItemName: { const: "Delete" },
              dialogTitle: { const: "Delete post?" },
              confirmButtonName: { const: "Delete post" },
              domLinkCount: { type: "integer", minimum: 0 },
            },
          },
          deletedId: { type: "string" },
          absenceCommand: SMOKE_RUN_CODE_COMMAND_SCHEMA,
          absenceStatus: { type: "integer" },
          absenceStdout: { type: "string" },
          absenceStderr: { type: "string" },
          absenceStdoutSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          absenceStderrSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          absenceParsedOutput: {
            type: "object",
            additionalProperties: false,
            required: ["id", "absent", "listUrl", "reloaded", "domLinkCount"],
            properties: {
              id: { type: "string" },
              absent: { type: "boolean" },
              listUrl: { const: POSTS_LIST_URL },
              reloaded: { const: true },
              domLinkCount: { type: "integer", minimum: 0 },
            },
          },
          absenceId: { type: "string" },
          absent: { type: "boolean" },
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
          "fixtureId",
          "pass",
          "errors",
          "theme",
          "commands",
          "commandResults",
          "routes",
          "evidence",
          "responsive",
          "screenshotPaths",
        ],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { enum: SMOKE_KINDS },
          fixtureId: { type: "string", minLength: 1 },
          pass: { type: "boolean" },
          errors: STRING_ARRAY_SCHEMA,
          theme: { enum: ["light", "dark"] },
          commands: {
            type: "object",
            additionalProperties: false,
            required: [
              "logReset",
              "theme",
              "setup",
              "action",
              "transientAssertion",
              "assertion",
              "consoleErrorRead",
              "consoleWarningRead",
              "pageErrorRead",
              "reset",
            ],
            properties: {
              logReset: { const: SMOKE_LOG_RESET },
              theme: SMOKE_RUN_CODE_COMMAND_SCHEMA,
              setup: { type: "array", minItems: 1, items: SMOKE_CLI_COMMAND_SCHEMA },
              action: { type: "array", minItems: 1, items: SMOKE_CLI_COMMAND_SCHEMA },
              transientAssertion: {
                type: "array",
                items: SMOKE_RUN_CODE_COMMAND_SCHEMA,
              },
              assertion: {
                type: "array",
                minItems: 1,
                items: SMOKE_RUN_CODE_COMMAND_SCHEMA,
              },
              consoleErrorRead: { const: SMOKE_CONSOLE_ERROR_READ },
              consoleWarningRead: { const: SMOKE_CONSOLE_WARNING_READ },
              pageErrorRead: { const: SMOKE_PAGE_ERROR_READ },
              reset: { type: "array", minItems: 1, items: SMOKE_CLI_COMMAND_SCHEMA },
            },
          },
          commandResults: {
            type: "object",
            additionalProperties: false,
            required: [
              "logReset",
              "theme",
              "setup",
              "action",
              "transientAssertion",
              "assertion",
              "logReads",
              "boundaryLogReads",
              "reset",
            ],
            properties: {
              logReset: commandResultSchema({ const: SMOKE_LOG_RESET }),
              theme: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA, THEME_APPLIED_STATE_SCHEMA),
              setup: { type: "array", minItems: 1, items: commandResultSchema() },
              action: { type: "array", minItems: 1, items: commandResultSchema() },
              transientAssertion: {
                type: "array",
                items: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA),
              },
              assertion: {
                type: "array",
                minItems: 1,
                items: commandResultSchema(SMOKE_RUN_CODE_COMMAND_SCHEMA),
              },
              logReads: LOG_READ_SET_SCHEMA,
              boundaryLogReads: {
                type: "object",
                additionalProperties: false,
                required: ["afterUnroute", "afterReset"],
                properties: {
                  afterUnroute: OPTIONAL_LOG_READ_SET_SCHEMA,
                  afterReset: LOG_READ_SET_SCHEMA,
                },
              },
              reset: { type: "array", minItems: 1, items: commandResultSchema() },
            },
          },
          routes: {
            type: "object",
            additionalProperties: false,
            required: ["installed", "removed"],
            properties: {
              installed: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["pattern", ...SMOKE_RECEIPT_REQUIRED],
                  properties: {
                    pattern: { type: "string", minLength: 1 },
                    ...commandResultSchema(SMOKE_CLI_COMMAND_SCHEMA, {
                      type: "object",
                      additionalProperties: false,
                      required: ["pattern", "installed", "mode"],
                      properties: {
                        pattern: { type: "string" },
                        installed: { type: "boolean" },
                        mode: { enum: ["delay", "failure"] },
                      },
                    }).properties,
                  },
                },
              },
              removed: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["pattern", ...SMOKE_RECEIPT_REQUIRED],
                  properties: {
                    pattern: { type: "string", minLength: 1 },
                    ...commandResultSchema(SMOKE_CLI_COMMAND_SCHEMA, {
                      type: "object",
                      additionalProperties: false,
                      required: ["pattern", "removed", "releasedPending"],
                      properties: {
                        pattern: { type: "string" },
                        removed: { type: "boolean" },
                        releasedPending: { type: "integer", minimum: 0 },
                      },
                    }).properties,
                  },
                },
              },
            },
          },
          evidence: { oneOf: KIND_EVIDENCE_SCHEMAS },
          responsive: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["widths"],
                properties: {
                  widths: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["width", "resizeReceipt", "probeReceipt"],
                      properties: {
                        width: { type: "integer" },
                        resizeReceipt: commandResultSchema(SMOKE_CLI_COMMAND_SCHEMA, {
                          type: "null",
                        }),
                        probeReceipt: commandResultSchema(
                          SMOKE_RUN_CODE_COMMAND_SCHEMA,
                          RESPONSIVE_OUTPUT_SCHEMA
                        ),
                      },
                    },
                  },
                },
              },
            ],
          },
          screenshotPaths: {
            type: "object",
            additionalProperties: false,
            required: ["transient", "final"],
            properties: {
              transient: {
                anyOf: [
                  { type: "null" },
                  {
                    type: "string",
                    pattern:
                      "^/home/coder/project/Coderso/_docs/_workflows/_smoke/task-543-wf543smoke-[A-Za-z0-9._-]+-transient\\.png$",
                  },
                ],
              },
              final: {
                type: "string",
                pattern:
                  "^/home/coder/project/Coderso/_docs/_workflows/_smoke/task-543-wf543smoke-[A-Za-z0-9._-]+-final\\.png$",
              },
            },
          },
        },
      },
    },
    lifecycleLogReads: {
      type: "object",
      additionalProperties: false,
      required: ["afterCreate", "afterProvenance", "afterDelete", "afterAbsence", "final"],
      properties: {
        afterCreate: LOG_READ_SET_SCHEMA,
        afterProvenance: LOG_READ_SET_SCHEMA,
        afterDelete: LOG_READ_SET_SCHEMA,
        afterAbsence: LOG_READ_SET_SCHEMA,
        final: LOG_READ_SET_SCHEMA,
      },
    },
    consoleErrors: STRING_ARRAY_SCHEMA,
    consoleWarnings: STRING_ARRAY_SCHEMA,
    pageErrors: STRING_ARRAY_SCHEMA,
    screenshots: {
      type: "array",
      minItems: 11,
      maxItems: 11,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "scenarioId",
          "phase",
          "captureReceipt",
          "path",
          "size",
          "inode",
          "sha256",
          "mtimeEpochMs",
          "signatureHex",
          "statReceipt",
          "hashReceipt",
          "signatureReceipt",
        ],
        properties: {
          scenarioId: { type: "string", minLength: 1 },
          phase: { enum: ["transient", "final"] },
          captureReceipt: commandResultSchema(SMOKE_CLI_COMMAND_SCHEMA, {
            type: "object",
            additionalProperties: false,
            required: ["reportedPath"],
            properties: {
              reportedPath: {
                type: "string",
                pattern: "^_docs/_workflows/_smoke/task-543-wf543smoke-[A-Za-z0-9._-]+\\.png$",
              },
            },
          }),
          path: {
            type: "string",
            pattern:
              "^/home/coder/project/Coderso/_docs/_workflows/_smoke/task-543-wf543smoke-[A-Za-z0-9._-]+\\.png$",
          },
          size: { type: "integer", minimum: 1 },
          inode: { type: "string", minLength: 1 },
          sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          mtimeEpochMs: { type: "number", minimum: 1 },
          signatureHex: { type: "string", pattern: "^[a-f0-9]{16}$" },
          statReceipt: commandResultSchema(
            { type: "string", minLength: 1 },
            {
              type: "object",
              additionalProperties: false,
              required: ["size", "inode", "mtimeEpochMs"],
              properties: {
                size: { type: "integer", minimum: 1 },
                inode: { type: "string", minLength: 1 },
                mtimeEpochMs: { type: "number", minimum: 1 },
              },
            }
          ),
          hashReceipt: commandResultSchema(
            { type: "string", minLength: 1 },
            {
              type: "object",
              additionalProperties: false,
              required: ["sha256", "path"],
              properties: {
                sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
                path: { type: "string", minLength: 1 },
              },
            }
          ),
          signatureReceipt: commandResultSchema(
            { type: "string", minLength: 1 },
            {
              type: "object",
              additionalProperties: false,
              required: ["signatureHex"],
              properties: {
                signatureHex: { type: "string", pattern: "^[a-f0-9]{16}$" },
              },
            }
          ),
        },
      },
    },
    commandTimeline: {
      type: "array",
      minItems: 1,
      items: COMMAND_TIMELINE_RECORD_SCHEMA,
    },
    cleanup: {
      type: "object",
      additionalProperties: false,
      required: [
        "routeList",
        "browserClose",
        "sessionList",
        "helperStop",
        "processChecks",
        "portChecks",
      ],
      properties: {
        routeList: commandResultSchema({ const: "playwright-cli -s=wf543smoke --raw route-list" }),
        browserClose: commandResultSchema({ const: "playwright-cli -s=wf543smoke --raw close" }),
        sessionList: commandResultSchema({ const: "playwright-cli --raw list" }),
        helperStop: commandResultSchema({ type: "string", minLength: 1 }),
        processChecks: {
          type: "array",
          minItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["pid", "absent", ...SMOKE_RECEIPT_REQUIRED],
            properties: {
              pid: { type: "integer", minimum: 2 },
              absent: { type: "boolean" },
              ...commandResultSchema(
                { type: "string", minLength: 1 },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["absent"],
                  properties: { absent: { type: "boolean" } },
                }
              ).properties,
            },
          },
        },
        portChecks: {
          type: "array",
          minItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["port", "absent", ...SMOKE_RECEIPT_REQUIRED],
            properties: {
              port: { type: "integer", minimum: 1, maximum: 65535 },
              absent: { type: "boolean" },
              ...commandResultSchema(
                { type: "string", minLength: 1 },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["absent"],
                  properties: { absent: { type: "boolean" } },
                }
              ).properties,
            },
          },
        },
      },
    },
    failures: STRING_ARRAY_SCHEMA,
  },
};

const SMOKE_FAILURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "serverUp",
    "errors",
    "failures",
    "failedAtSequence",
    "failedScope",
    "failurePhase",
    "commandTimeline",
    "acquired",
    "cleanup",
  ],
  properties: {
    pass: { const: false },
    serverUp: { type: "boolean" },
    errors: { type: "array", minItems: 1, items: { type: "string" } },
    failures: STRING_ARRAY_SCHEMA,
    failedAtSequence: { type: "integer", minimum: 1 },
    failedScope: { type: "string", minLength: 1 },
    failurePhase: {
      enum: [
        "bootstrap",
        "health",
        "browser",
        "fixture",
        "lifecycle",
        "scenario",
        "state",
        "helper",
        "cleanup",
      ],
    },
    commandTimeline: {
      type: "array",
      minItems: 1,
      items: COMMAND_TIMELINE_RECORD_SCHEMA,
    },
    acquired: {
      type: "object",
      additionalProperties: false,
      required: [
        "helper",
        "browserSession",
        "fixtures",
        "scenarios",
        "routes",
        "themeBefore",
        "setupBefore",
      ],
      properties: {
        helper: {
          anyOf: [
            { type: "null" },
            {
              type: "object",
              additionalProperties: false,
              required: [
                "identityComplete",
                "launchNonce",
                "rootPid",
                "ppid",
                "startTicks",
                "cmdline",
                "cmdlineSha256",
                "cwd",
                "ownedPids",
                "ownedPorts",
                "reason",
              ],
              properties: {
                identityComplete: { const: false },
                launchNonce: { type: "string", pattern: "^wf543-[a-f0-9]{32}$" },
                rootPid: { anyOf: [{ type: "null" }, { type: "integer", minimum: 2 }] },
                ppid: { anyOf: [{ type: "null" }, { type: "integer", minimum: 1 }] },
                startTicks: {
                  anyOf: [{ type: "null" }, { type: "string", pattern: "^[0-9]+$" }],
                },
                cmdline: { anyOf: [{ type: "null" }, { type: "string", minLength: 1 }] },
                cmdlineSha256: {
                  anyOf: [{ type: "null" }, { type: "string", pattern: "^[a-f0-9]{64}$" }],
                },
                cwd: { anyOf: [{ type: "null" }, { const: ROOT }] },
                ownedPids: {
                  type: "array",
                  maxItems: 1,
                  uniqueItems: true,
                  items: { type: "integer", minimum: 2 },
                },
                ownedPorts: {
                  type: "array",
                  minItems: 2,
                  maxItems: 2,
                  uniqueItems: true,
                  items: { type: "integer", minimum: 1, maximum: 65535 },
                },
                reason: { type: "string", minLength: 1 },
              },
            },
            {
              type: "object",
              additionalProperties: false,
              required: [
                "identityComplete",
                "launchNonce",
                "rootPid",
                "ppid",
                "startTicks",
                "cmdline",
                "cmdlineSha256",
                "cwd",
                "ownedPids",
                "ownedPorts",
              ],
              properties: {
                identityComplete: { const: true },
                launchNonce: { type: "string", pattern: "^wf543-[a-f0-9]{32}$" },
                rootPid: { type: "integer", minimum: 2 },
                ppid: { type: "integer", minimum: 1 },
                startTicks: { type: "string", pattern: "^[0-9]+$" },
                cmdline: { type: "string", minLength: 1 },
                cmdlineSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
                cwd: { const: ROOT },
                ownedPids: {
                  type: "array",
                  minItems: 1,
                  uniqueItems: true,
                  items: { type: "integer", minimum: 2 },
                },
                ownedPorts: {
                  type: "array",
                  minItems: 2,
                  uniqueItems: true,
                  items: { type: "integer", minimum: 1, maximum: 65535 },
                },
              },
            },
          ],
        },
        browserSession: { type: "boolean" },
        fixtures: {
          type: "array",
          maxItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "title",
              "slug",
              "editorUrl",
              "openAfterCreateEnabled",
              "cleanPayload",
              "draftTitleA",
              "draftTitleB",
            ],
            properties: {
              id: { type: "string", minLength: 1 },
              title: SAFE_SENTINEL_SCHEMA,
              slug: { type: "string", pattern: "^[a-z0-9-]{1,120}$" },
              editorUrl: {
                type: "string",
                pattern: "^http://coderso-a\\.localhost:5173/admin/posts/[^/?#]+$",
              },
              openAfterCreateEnabled: { type: "boolean" },
              cleanPayload: POST_PAYLOAD_SCHEMA,
              draftTitleA: SAFE_SENTINEL_SCHEMA,
              draftTitleB: SAFE_SENTINEL_SCHEMA,
            },
          },
        },
        scenarios: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "kind", "fixtureId", "theme"],
            properties: {
              id: { type: "string", minLength: 1 },
              kind: { enum: SMOKE_KINDS },
              fixtureId: { type: "string", minLength: 1 },
              theme: { enum: ["light", "dark"] },
            },
          },
        },
        routes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["pattern", "mode"],
            properties: {
              pattern: { type: "string", minLength: 1 },
              mode: { enum: ["delay", "failure"] },
            },
          },
        },
        themeBefore: { anyOf: [{ type: "null" }, THEME_RESTORE_STATE_SCHEMA] },
        setupBefore: { anyOf: [{ type: "null" }, SETUP_STATE_SCHEMA] },
      },
    },
    cleanup: {
      type: "object",
      additionalProperties: false,
      required: ["attempted", "records", "remainingResources"],
      properties: {
        attempted: { const: true },
        records: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["sequence", "kind", "resourceId", ...SMOKE_RECEIPT_REQUIRED],
            properties: {
              sequence: { type: "integer", minimum: 1 },
              kind: {
                enum: [
                  "route",
                  "fixture-delete",
                  "fixture-absence",
                  "log",
                  "theme",
                  "setup",
                  "browser",
                  "helper",
                  "pid",
                  "port",
                ],
              },
              resourceId: { type: "string", minLength: 1 },
              ...commandResultSchema({ type: "string", minLength: 1 }).properties,
            },
          },
        },
        remainingResources: {
          type: "array",
          uniqueItems: true,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["kind", "resourceId"],
            properties: {
              kind: { enum: ["route", "fixture", "theme", "setup", "browser", "helper"] },
              resourceId: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
  },
};

const SMOKE_SCHEMA = { oneOf: [SMOKE_SUCCESS_SCHEMA, SMOKE_FAILURE_SCHEMA] };

function requireAllResults(results, expectedIds, label) {
  if (!Array.isArray(results) || results.length !== expectedIds.length) {
    throw new Error(
      `${label}: expected ${expectedIds.length} results, received ${results?.length ?? 0}`
    );
  }
  for (let index = 0; index < expectedIds.length; index += 1) {
    const item = results[index];
    if (!item || item.id !== expectedIds[index] || item.result == null) {
      throw new Error(`${label}: missing, reordered, or wrong result at ${expectedIds[index]}`);
    }
  }
  return results;
}

function validatePassErrorContract(result, label) {
  const errors = Array.isArray(result?.errors) ? result.errors : ["missing errors array"];
  if (result?.pass === true && errors.length !== 0) {
    throw new Error(`${label} returned pass=true with errors: ${errors.join("; ")}`);
  }
  if (result?.pass === false && errors.length === 0) {
    throw new Error(`${label} returned pass=false without an error`);
  }
  return result;
}

function requirePassingResult(result, label) {
  validatePassErrorContract(result, label);
  const errors = Array.isArray(result?.errors) ? result.errors : ["missing errors array"];
  if (result?.pass !== true) {
    throw new Error(`${label} failed: ${errors.join("; ") || "pass=false"}`);
  }
  return result;
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function receiptIntegrityValid(receipt, digest = sha256Text) {
  return (
    receipt &&
    typeof receipt.command === "string" &&
    Number.isInteger(receipt.status) &&
    typeof receipt.stdout === "string" &&
    typeof receipt.stderr === "string" &&
    receipt.stdoutSha256 === digest(receipt.stdout) &&
    receipt.stderrSha256 === digest(receipt.stderr) &&
    Object.prototype.hasOwnProperty.call(receipt, "parsedOutput")
  );
}

function credentialReceiptValidWithoutDigest(receipt, context, exactCommand) {
  const scopeValid =
    context === "bootstrap.passwordFill"
      ? !Object.prototype.hasOwnProperty.call(receipt ?? {}, "scope")
      : context === "timeline.browserPassword" && receipt?.scope === "browser:password";
  return (
    scopeValid &&
    exactCommand === SMOKE_PASSWORD_FILL_COMMAND &&
    receipt?.command === exactCommand &&
    receipt.status === 0 &&
    receipt.stdout === "" &&
    receipt.stderr === "" &&
    receipt.stdoutSha256 === EMPTY_SHA256 &&
    receipt.stderrSha256 === EMPTY_SHA256 &&
    Object.prototype.hasOwnProperty.call(receipt, "parsedOutput") &&
    receipt.parsedOutput === null
  );
}

function bootstrapPasswordReceiptValid(smoke) {
  return credentialReceiptValidWithoutDigest(
    smoke?.bootstrap?.passwordFill,
    "bootstrap.passwordFill",
    smoke?.commands?.passwordFill
  );
}

function timelineReceiptIntegrityValid(record, exactPasswordCommand, digest = sha256Text) {
  const hasCredentialSignal =
    record?.scope === "browser:password" || record?.command === SMOKE_PASSWORD_FILL_COMMAND;
  if (hasCredentialSignal) {
    return credentialReceiptValidWithoutDigest(
      record,
      "timeline.browserPassword",
      exactPasswordCommand
    );
  }
  return receiptIntegrityValid(record, digest);
}

function successTimelineReceiptIntegrityValid(record, smoke, digest = sha256Text) {
  return timelineReceiptIntegrityValid(record, smoke?.commands?.passwordFill, digest);
}

function failurePrefixTimelineReceiptIntegrityValid(record, _smoke, digest = sha256Text) {
  return timelineReceiptIntegrityValid(record, SMOKE_PASSWORD_FILL_COMMAND, digest);
}

function rawPlaywrightReceiptValid(receipt) {
  if (!receiptIntegrityValid(receipt)) return false;
  if (!receipt.command.startsWith("playwright-cli ") || !receipt.command.includes(" --raw ")) {
    return true;
  }
  if (receipt.command.includes(" --raw run-code ")) {
    if (receipt.stdout === "\n") return receipt.parsedOutput === null;
    try {
      const parsed = JSON.parse(receipt.stdout);
      return (
        sameRawValue(parsed, receipt.parsedOutput) &&
        receipt.stdout === `${JSON.stringify(parsed)}\n`
      );
    } catch {
      return false;
    }
  }
  if (receipt.command.includes(" --raw resize ")) {
    return receipt.stdout === "\n" && receipt.parsedOutput === null;
  }
  return true;
}

function prefixedReceipt(value, prefix) {
  return {
    command: value[`${prefix}Command`],
    status: value[`${prefix}Status`],
    stdout: value[`${prefix}Stdout`],
    stderr: value[`${prefix}Stderr`],
    stdoutSha256: value[`${prefix}StdoutSha256`],
    stderrSha256: value[`${prefix}StderrSha256`],
    parsedOutput: value[`${prefix}ParsedOutput`],
  };
}

function receiptMatches(receipt, expected, allowedStatuses = [0]) {
  return (
    receipt.id === expected.id &&
    receipt.command === expected.command &&
    allowedStatuses.includes(receipt.status) &&
    receipt.rawOutputSha256 === sha256Text(receipt.rawOutput)
  );
}

function strictComponentSections(rawOutput) {
  const summaryStart = rawOutput.indexOf("\n[security-scan] summary");
  if (summaryStart < 0) return [];
  return STRICT_COMPONENTS.map((component, index) => {
    const marker = `[security-scan] ${component.title}\n`;
    const start = rawOutput.indexOf(marker);
    const nextMarker = STRICT_COMPONENTS[index + 1]
      ? `[security-scan] ${STRICT_COMPONENTS[index + 1].title}\n`
      : null;
    const end = nextMarker ? rawOutput.indexOf(nextMarker, start + marker.length) : summaryStart;
    return { start, end };
  });
}

function strictSummaryExitCode(rawOutput, id) {
  const line = rawOutput.split(/\r?\n/).find((candidate) => candidate.startsWith(`- ${id}: `));
  if (!line) return null;
  if (line.startsWith(`- ${id}: ok `)) return 0;
  const failurePrefix = `- ${id}: non-zero:`;
  if (!line.startsWith(failurePrefix)) return null;
  const suffix = line.slice(failurePrefix.length);
  const separator = suffix.indexOf(" ");
  if (separator < 1) return null;
  const exitCodeText = suffix.slice(0, separator);
  if (!/^[0-9]+$/u.test(exitCodeText)) return null;
  const exitCode = Number(exitCodeText);
  return Number.isSafeInteger(exitCode) ? exitCode : null;
}

function parseStrictSemgrepJson(rawOutput) {
  let envelope;
  try {
    envelope = JSON.parse(rawOutput);
  } catch {
    return null;
  }
  if (
    !sameSequence(envelope?.command ?? [], STRICT_SEMGREP_JSON_ARGS) ||
    !Number.isInteger(envelope?.exitCode) ||
    typeof envelope?.stdout !== "string" ||
    typeof envelope?.stderr !== "string"
  ) {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(envelope.stdout);
  } catch {
    return null;
  }
  if (!Array.isArray(payload?.results) || !Array.isArray(payload?.errors)) return null;
  if (payload.errors.length !== 0) return null;
  const findings = [];
  for (const result of payload.results) {
    const ruleId = result?.check_id;
    const file = typeof result?.path === "string" ? result.path.replace(/^\.\//, "") : null;
    const line = result?.start?.line;
    if (typeof ruleId !== "string" || !file || !Number.isInteger(line) || line < 1) return null;
    const knownCore =
      ruleId === KNOWN_STRICT_FINDING.ruleId &&
      file === KNOWN_STRICT_FINDING.file &&
      line === KNOWN_STRICT_FINDING.line;
    findings.push({
      scanner: "semgrep-sast",
      ruleId,
      file,
      line,
      owner: knownCore ? KNOWN_STRICT_FINDING.owner : "UNOWNED",
    });
  }
  return { exitCode: envelope.exitCode, findings };
}

function validateFullGates(result) {
  requirePassingResult(result, "TASK-543 full gates");
  const receiptsValid = result.receipts.every((receipt, index) =>
    receiptMatches(
      receipt,
      FULL_GATE_COMMANDS[index],
      ["strictScan", "strictSemgrepJson"].includes(receipt.id) ? [0, 1] : [0]
    )
  );
  const databaseReceipt = result.receipts.find(({ id }) => id === "dbPreflight");
  let databaseOutput = null;
  try {
    databaseOutput = JSON.parse(databaseReceipt?.rawOutput ?? "null");
  } catch {
    databaseOutput = null;
  }
  const strictReceipt = result.receipts.find(({ id }) => id === "strictScan");
  const strictSemgrepJsonReceipt = result.receipts.find(({ id }) => id === "strictSemgrepJson");
  const strictRawOutput = strictReceipt?.rawOutput ?? "";
  const parsedSemgrep = parseStrictSemgrepJson(strictSemgrepJsonReceipt?.rawOutput ?? "");
  const strictSections = strictComponentSections(strictRawOutput);
  const componentRecordsValid = result.strictScan.components.every((component, index) => {
    const expected = STRICT_COMPONENTS[index];
    const section = strictSections[index];
    const expectedFindings = expected.id === "semgrep-sast" ? result.strictScan.findings : [];
    return (
      component.id === expected.id &&
      component.command === expected.command &&
      section?.start >= 0 &&
      section.end > section.start &&
      component.outputStart === section.start &&
      component.outputEnd === section.end &&
      component.rawOutput === strictRawOutput.slice(section.start, section.end) &&
      component.rawOutput.includes(`[security-scan] $ ${expected.command}`) &&
      component.rawOutputSha256 === sha256Text(component.rawOutput) &&
      sameRawValue(component.findings, expectedFindings) &&
      component.exitCode === strictSummaryExitCode(strictRawOutput, expected.id) &&
      (expectedFindings.length === 0 ? component.exitCode === 0 : component.exitCode === 1)
    );
  });
  const exactKnownResidual =
    result.strictScan.findings.length === 0 ||
    (result.strictScan.findings.length === 1 &&
      sameRawValue(result.strictScan.findings[0], KNOWN_STRICT_FINDING));
  const strictStatusMatches =
    strictReceipt?.status === (result.strictScan.findings.length === 0 ? 0 : 1);
  const strictSemgrepJsonStatusMatches =
    strictSemgrepJsonReceipt?.status === (result.strictScan.findings.length === 0 ? 0 : 1);
  if (
    !receiptsValid ||
    !sameSequence(
      result.receipts.map(({ id }) => id),
      FULL_GATE_COMMANDS.map(({ id }) => id)
    ) ||
    !sameRawValue(databaseOutput, {
      configured: result.database.configured,
      reachable: result.database.reachable,
      selectOne: result.database.selectOne,
    }) ||
    result.database.configured !== true ||
    result.database.reachable !== true ||
    result.database.selectOne !== 1 ||
    !componentRecordsValid ||
    !sameSequence(
      result.strictScan.components.map(({ id }) => id),
      STRICT_COMPONENTS.map(({ id }) => id)
    ) ||
    !exactKnownResidual ||
    !sameRawValue(parsedSemgrep?.findings, result.strictScan.findings) ||
    parsedSemgrep?.exitCode !== strictSemgrepJsonReceipt?.status ||
    !strictStatusMatches ||
    !strictSemgrepJsonStatusMatches ||
    result.errors.length !== 0
  ) {
    throw new Error(`TASK-543 full gates failed: ${result.errors.join("; ")}`);
  }
}

function sameUniqueSet(left, right) {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
  );
}

function expectedProcessCheckCommand(pid) {
  return `bash -lc 'if kill -0 -- ${pid} 2>/dev/null; then exit 1; fi'`;
}

function expectedPortCheckCommand(port) {
  return `/usr/bin/lsof -nP -iTCP:${port} -sTCP:LISTEN -t`;
}

function expectedHelperLaunchCommand(nonce) {
  return (
    `bash -lc 'CODERSO_WF543_LAUNCH_NONCE=${nonce} ` +
    `coderso-dev-core-host ${ROOT} >/dev/null 2>&1 & printf "%s\\n" "$!"'`
  );
}

function expectedHelperIdentityCommands(identity) {
  const pid = identity.rootPid;
  return {
    ppid:
      `node --eval 'const fs=require("node:fs"); const t=fs.readFileSync("/proc/"+process.argv[1]+"/stat","utf8"); ` +
      'process.stdout.write(t.slice(t.lastIndexOf(") ")+2).trim().split(/\\s+/)[1])\' -- ' +
      pid,
    startTicks:
      `node --eval 'const fs=require("node:fs"); const t=fs.readFileSync("/proc/"+process.argv[1]+"/stat","utf8"); ` +
      'process.stdout.write(t.slice(t.lastIndexOf(") ")+2).trim().split(/\\s+/)[19])\' -- ' +
      pid,
    cmdline: `/usr/bin/tr '\\0' ' ' </proc/${pid}/cmdline`,
    cwd: `/usr/bin/readlink -f /proc/${pid}/cwd`,
    cmdlineHash: `/usr/bin/sha256sum /proc/${pid}/cmdline`,
    nonce:
      `bash -lc '/usr/bin/tr "\\0" "\\n" </proc/${pid}/environ | ` +
      `/usr/bin/grep -Fqx "CODERSO_WF543_LAUNCH_NONCE=${identity.launchNonce}"'`,
  };
}

function expectedHelperStopCommand(identity) {
  const source =
    'const fs=require("node:fs"); const crypto=require("node:crypto"); ' +
    "const [pidText,ppid,startTicks,cmdlineHash,cwd,nonce]=process.argv.slice(1); " +
    'const pid=Number(pidText); const base="/proc/"+pid; ' +
    'const stat=fs.readFileSync(base+"/stat","utf8").slice(fs.readFileSync(base+"/stat","utf8").lastIndexOf(") ")+2).trim().split(/\\s+/); ' +
    'const actualHash=crypto.createHash("sha256").update(fs.readFileSync(base+"/cmdline")).digest("hex"); ' +
    'const env=fs.readFileSync(base+"/environ").toString("utf8").split("\\0"); ' +
    'if(stat[1]!==ppid||stat[19]!==startTicks||actualHash!==cmdlineHash||fs.realpathSync(base+"/cwd")!==cwd||!env.includes("CODERSO_WF543_LAUNCH_NONCE="+nonce)) throw new Error("wf543_helper_identity_mismatch"); ' +
    'process.kill(pid,"SIGTERM"); const deadline=Date.now()+10000; const sleeper=new Int32Array(new SharedArrayBuffer(4)); ' +
    'const sameProcess=()=>{try{const current=fs.readFileSync(base+"/stat","utf8"); return current.slice(current.lastIndexOf(") ")+2).trim().split(/\\s+/)[19]===startTicks;}catch{return false;}}; ' +
    'while(sameProcess()&&Date.now()<deadline) Atomics.wait(sleeper,0,0,25); if(sameProcess()) throw new Error("wf543_helper_stop_timeout")';
  return (
    `node --eval '${source}' -- ${identity.rootPid} ${identity.ppid} ` +
    `${identity.startTicks} ${identity.cmdlineSha256} ${identity.cwd} ${identity.launchNonce}`
  );
}

function expectedPidTreeDiscoveryCommand(pid) {
  return `/usr/bin/pstree -p ${pid}`;
}

function expectedPortOwnershipDiscoveryCommand(pids) {
  const orderedPids = [...pids].sort((left, right) => left - right).join(",");
  return `/usr/bin/lsof -nP -a -p ${orderedPids} -iTCP -sTCP:LISTEN -FpPn`;
}

function expectedScreenshotStatCommand(path) {
  return (
    'node --eval \'const s=require("node:fs").statSync(process.argv[1]); ' +
    "process.stdout.write(JSON.stringify({size:s.size,inode:String(s.ino),mtimeEpochMs:s.mtimeMs}))' " +
    `-- ${path}`
  );
}

function expectedScreenshotHashCommand(path) {
  return `/usr/bin/sha256sum ${path}`;
}

function expectedScreenshotSignatureCommand(path) {
  return `/usr/bin/xxd -p -l 8 ${path}`;
}

function expectedScreenshotCaptureCommand(path) {
  return `${SMOKE_SESSION_PREFIX}screenshot --filename ${path} --full-page`;
}

function repoRelativePath(path) {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : null;
}

function expectedScreenshotStdout(path) {
  const relativePath = repoRelativePath(path);
  return relativePath ? `- [Screenshot of full page](${relativePath})\n` : null;
}

function sameSequence(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sameRawValue(left, right) {
  return stableSerialize(left) === stableSerialize(right);
}

function smokeRunCode(source) {
  if (source.includes("'")) throw new Error("TASK-543 canonical run-code contains a shell quote");
  return `${SMOKE_SESSION_PREFIX}run-code '${source}'`;
}

function expectedResponsiveProbeCommand(fixture) {
  const titleName = JSON.stringify(`Edit post: ${fixture.title}`);
  return smokeRunCode(
    `async (page) => { const output = await page.evaluate((titleName) => { const links = [...document.querySelectorAll("a[aria-label]")].filter((link) => link.getAttribute("aria-label") === titleName); const link = links[0] ?? null; const row = link?.closest("tr") ?? null; const cells = row?.querySelectorAll("td") ?? []; const fallback = row?.querySelector("[data-post-row-metadata=\\"fallback\\"]") ?? null; const fallbackStatus = row?.querySelector("[data-post-row-status-fallback=\\"true\\"]") ?? null; const fallbackAuthor = fallback?.querySelector(":scope > span:not([aria-hidden]):not([data-post-row-status-fallback])") ?? null; const fallbackDate = fallback?.querySelector(":scope > time") ?? null; const columnStatus = cells[2] ?? null; const columnAuthor = cells[3]?.querySelector("span.text-sm") ?? null; const columnDate = cells[4] ?? null; const table = row?.closest("table") ?? null; const node = (element) => { if (!element) return { exists: false, display: "", visibility: "", opacity: 0, width: 0, height: 0, visible: false, text: "" }; const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); const opacity = Number(style.opacity); const visible = style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse" && opacity > 0 && rect.width > 0 && rect.height > 0; return { exists: true, display: style.display, visibility: style.visibility, opacity, width: rect.width, height: rect.height, visible, text: element.textContent?.trim() ?? "" }; }; const nodes = { fallbackMetadata: node(fallback), fallbackStatus: node(fallbackStatus), fallbackAuthor: node(fallbackAuthor), fallbackDate: node(fallbackDate), columnStatus: node(columnStatus), columnAuthor: node(columnAuthor), columnDate: node(columnDate), row: node(row), table: node(table) }; const href = link?.getAttribute("href") ?? ""; const rowPostId = href ? decodeURIComponent(new URL(href, window.location.origin).pathname.split("/").filter(Boolean).at(-1) ?? "") : ""; return { width: window.innerWidth, matchedRowCount: links.length, rowPostId, fallbackMetadataVisible: nodes.fallbackMetadata.visible, fallbackStatusVisible: nodes.fallbackStatus.visible, fallbackAuthorVisible: nodes.fallbackAuthor.visible, fallbackDateVisible: nodes.fallbackDate.visible, columnStatusVisible: nodes.columnStatus.visible, columnAuthorVisible: nodes.columnAuthor.visible, columnDateVisible: nodes.columnDate.visible, visibleStatusCopies: Number(nodes.fallbackStatus.visible) + Number(nodes.columnStatus.visible), visibleAuthorCopies: Number(nodes.fallbackAuthor.visible && nodes.fallbackAuthor.text.length > 0) + Number(nodes.columnAuthor.visible && nodes.columnAuthor.text.length > 0), visibleDateCopies: Number(nodes.fallbackDate.visible && nodes.fallbackDate.text.length > 0) + Number(nodes.columnDate.visible && nodes.columnDate.text.length > 0), titleAccessibleName: link?.getAttribute("aria-label") ?? "", checkboxAccessibleName: cells[0]?.querySelector("button")?.getAttribute("aria-label") ?? "", actionAccessibleName: cells[5]?.querySelector("button")?.getAttribute("aria-label") ?? "", nodes, rowWidth: nodes.row.width, tableWidth: nodes.table.width }; }, ${titleName}); const state = page.__wf543Scenario; state.responsiveOutputs = [...(state.responsiveOutputs ?? []), output]; return output; }`
  );
}

function expectedThemeStateReadCommand() {
  return smokeRunCode(
    '(page) => page.evaluate(() => ({ url: window.location.href, storedPreference: localStorage.getItem("coderso-admin-color-mode"), darkClass: document.documentElement.classList.contains("dark"), lightClass: document.documentElement.classList.contains("light") }))'
  );
}

function expectedThemeStateRestoreCommand(state) {
  const snapshot = stableSerialize({
    storedPreference: state.storedPreference,
    darkClass: state.darkClass,
    lightClass: state.lightClass,
  });
  return smokeRunCode(
    `(page) => page.evaluate((state) => { if (state.storedPreference === null) localStorage.removeItem("coderso-admin-color-mode"); else localStorage.setItem("coderso-admin-color-mode", state.storedPreference); document.documentElement.classList.toggle("dark", state.darkClass); document.documentElement.classList.toggle("light", state.lightClass); return { url: window.location.href, storedPreference: localStorage.getItem("coderso-admin-color-mode"), darkClass: document.documentElement.classList.contains("dark"), lightClass: document.documentElement.classList.contains("light") }; }, ${snapshot})`
  );
}

function expectedThemeApplyCommand(theme) {
  return smokeRunCode(
    `(page) => page.evaluate((mode) => { localStorage.setItem("coderso-admin-color-mode", mode); document.documentElement.classList.toggle("dark", mode === "dark"); document.documentElement.classList.toggle("light", mode === "light"); return { url: window.location.href, preference: localStorage.getItem("coderso-admin-color-mode") === "dark" ? "dark" : "light", resolved: document.documentElement.classList.contains("dark") ? "dark" : "light" }; }, ${JSON.stringify(theme)})`
  );
}

function expectedSetupStateReadCommand() {
  return smokeRunCode(
    `(page) => page.evaluate((key) => ({ url: window.location.href, value: sessionStorage.getItem(key) }), ${JSON.stringify(SMOKE_SETUP_STORAGE_KEY)})`
  );
}

function expectedSetupStateRestoreCommand(value) {
  const serialized = value === null ? "null" : JSON.stringify(value);
  return smokeRunCode(
    `(page) => page.evaluate(({ key, value }) => { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); return { url: window.location.href, value: sessionStorage.getItem(key) }; }, { key: ${JSON.stringify(SMOKE_SETUP_STORAGE_KEY)}, value: ${serialized} })`
  );
}

function expectedFixtureCreatePayload(fixture) {
  return {
    title: fixture.title,
    slug: fixture.slug,
    data: {},
  };
}

function expectedFixtureCleanPayload(fixture) {
  const createPayload = expectedFixtureCreatePayload(fixture);
  return {
    title: createPayload.title,
    slug: createPayload.slug,
    data: {
      document: {
        version: 1,
        blocks: [
          {
            id: "block-1",
            type: "writing-canvas",
            attrs: {
              align: "left",
              width: "auto",
              spacingTop: "md",
              spacingBottom: "md",
              textScale: "md",
              highlight: false,
              hideOnMobile: false,
            },
            content: {
              version: 1,
              nodes: [{ id: "node-1", type: "paragraph", text: "" }],
            },
          },
        ],
        meta: {
          readingTimeMinutes: 0,
          typography: { fontFamily: "sans", baseTextScale: "md" },
        },
      },
    },
    tags: [],
    taxonomy: { categoryId: null },
    seo: {
      title: null,
      description: null,
      canonicalUrl: null,
      robots: "index,follow",
    },
  };
}

function expectedFixtureCreateCommand(fixture) {
  const seed = stableSerialize({
    title: fixture.title,
    slug: fixture.slug,
    createPayload: expectedFixtureCreatePayload(fixture),
    cleanPayload: expectedFixtureCleanPayload(fixture),
  });
  return smokeRunCode(
    `async (page) => { const seed = ${seed}; await page.goto(${JSON.stringify(POSTS_LIST_URL)}); const newPost = page.getByRole("button", { name: "New post", exact: true }); const newPostControlName = (await newPost.getAttribute("aria-label")) ?? (await newPost.textContent())?.trim() ?? ""; await newPost.click(); const drawerTitle = page.getByRole("heading", { name: "Create New Post", exact: true }); await drawerTitle.waitFor(); const drawerTitleText = (await drawerTitle.textContent())?.trim() ?? ""; await page.getByPlaceholder("e.g. Product launch update").fill(seed.title); await page.getByPlaceholder("product-launch-update").fill(seed.slug); const openAfterCreate = page.getByRole("checkbox", { name: "Open in editor after create", exact: true }); const openAfterCreateEnabled = await openAfterCreate.isChecked(); const createResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && response.url().split("?")[0].endsWith("/admin/api/posts")); const createButton = page.getByRole("button", { name: "Create Post", exact: true }); const createButtonName = (await createButton.textContent())?.trim() ?? ""; await createButton.click(); const createResponse = await createResponsePromise; if (!createResponse.ok()) throw new Error("wf543 real UI fixture create failed"); const createdPost = await createResponse.json(); const responsePostId = typeof createdPost?.id === "string" ? createdPost.id : ""; if (!responsePostId) throw new Error("wf543 create response PostDetail id missing"); const createRequestPayload = createResponse.request().postDataJSON(); return { id: responsePostId, responsePostId, title: seed.title, slug: seed.slug, cleanPayload: seed.cleanPayload, newPostControlName, drawerTitle: drawerTitleText, createButtonName, openAfterCreateEnabled, createRequestPayload, createResponseStatus: createResponse.status(), createResponseUrl: createResponse.url() }; }`
  );
}

function expectedFixtureProvenanceCommand(fixture) {
  const seed = stableSerialize({
    id: fixture.id,
    responsePostId: fixture.id,
    title: fixture.title,
    editorUrl: fixture.editorUrl,
    openAfterCreateEnabled: fixture.openAfterCreateEnabled,
  });
  return smokeRunCode(
    `async (page) => { const seed = ${seed}; const expectedHref = "/admin/posts/" + encodeURIComponent(seed.responsePostId); const routeId = (value) => decodeURIComponent((value ?? "").split("?")[0].split("#")[0].split("/").filter(Boolean).at(-1) ?? ""); let postCreateUrl = page.url(); let postCreateRouteId = ""; if (seed.openAfterCreateEnabled) { await page.waitForURL(seed.editorUrl); postCreateUrl = page.url(); postCreateRouteId = routeId(postCreateUrl); } else { const createdLink = page.locator("a[href=" + JSON.stringify(expectedHref) + "]").first(); await createdLink.waitFor(); postCreateUrl = page.url(); const createdHref = await createdLink.getAttribute("href"); postCreateRouteId = routeId(createdHref); } if (postCreateRouteId !== seed.responsePostId) throw new Error("wf543 post-create route id mismatch"); await page.goto(seed.editorUrl); await page.waitForURL(seed.editorUrl); const editorUrl = page.url(); const editorUrlId = routeId(editorUrl); const title = page.locator(${JSON.stringify(POST_TITLE_SELECTOR)}); await title.waitFor(); const editorTitle = await title.inputValue(); if (editorUrlId !== seed.responsePostId || editorTitle !== seed.title) throw new Error("wf543 editor provenance mismatch"); await page.goto(${JSON.stringify(POSTS_LIST_URL)}); const link = page.locator("a[href=" + JSON.stringify(expectedHref) + "]").first(); await link.waitFor(); const domTitleAccessibleName = await link.getAttribute("aria-label"); const domHref = await link.getAttribute("href"); const domHrefId = routeId(domHref); if (domHrefId !== seed.responsePostId || domTitleAccessibleName !== "Edit post: " + seed.title) throw new Error("wf543 list provenance mismatch"); return { id: seed.id, responsePostId: seed.responsePostId, postCreateUrl, postCreateRouteId, editorUrl, editorUrlId, editorTitle, domTitleAccessibleName, domHref, domHrefId }; }`
  );
}

function expectedFixtureDeleteCommand(fixture) {
  const seed = stableSerialize({ id: fixture.id, title: fixture.title });
  return smokeRunCode(
    `async (page) => { const seed = ${seed}; await page.goto(${JSON.stringify(POSTS_LIST_URL)}); const expectedHref = "/admin/posts/" + encodeURIComponent(seed.id); const link = page.locator("a[href=" + JSON.stringify(expectedHref) + "]").first(); await link.waitFor(); const rowTitleAccessibleName = await link.getAttribute("aria-label"); const domHref = await link.getAttribute("href"); const row = link.locator("xpath=ancestor::tr"); const action = row.getByRole("button", { name: /^Actions for /u }); const actionAccessibleName = await action.getAttribute("aria-label"); await action.click(); const menuItem = page.getByRole("menuitem", { name: "Delete", exact: true }); const menuItemName = (await menuItem.textContent())?.trim() ?? ""; await menuItem.click(); const dialog = page.getByRole("dialog"); const dialogTitle = dialog.getByRole("heading", { name: "Delete post?", exact: true }); await dialogTitle.waitFor(); const dialogTitleText = (await dialogTitle.textContent())?.trim() ?? ""; const confirm = dialog.getByRole("button", { name: "Delete post", exact: true }); const confirmButtonName = (await confirm.textContent())?.trim() ?? ""; const deleteResponsePromise = page.waitForResponse((response) => response.request().method() === "DELETE" && response.url().split("?")[0].endsWith("/admin/api/posts/" + encodeURIComponent(seed.id))); await confirm.click(); const response = await deleteResponsePromise; if (!response.ok()) throw new Error("wf543 real UI fixture delete failed"); await link.waitFor({ state: "detached" }); const domLinkCount = await page.locator("a[href=" + JSON.stringify(expectedHref) + "]").count(); return { id: seed.id, deleted: domLinkCount === 0, responseStatus: response.status(), responseUrl: response.url(), rowTitleAccessibleName, domHref, actionAccessibleName, menuItemName, dialogTitle: dialogTitleText, confirmButtonName, domLinkCount }; }`
  );
}

function expectedFixtureAbsenceCommand(fixture) {
  const seed = stableSerialize({ id: fixture.id, title: fixture.title });
  return smokeRunCode(
    `async (page) => { const seed = ${seed}; await page.goto(${JSON.stringify(POSTS_LIST_URL)}); await page.reload(); await page.getByText("Loading posts...", { exact: true }).waitFor({ state: "hidden" }); const expectedHref = "/admin/posts/" + encodeURIComponent(seed.id); const domLinkCount = await page.locator("a[href=" + JSON.stringify(expectedHref) + "]").count(); if (domLinkCount !== 0) throw new Error("wf543 real UI fixture remains after reload"); return { id: seed.id, absent: true, listUrl: page.url(), reloaded: true, domLinkCount }; }`
  );
}

function expectedScenarioSpec(scenario, fixture) {
  return {
    id: scenario.id,
    kind: scenario.kind,
    fixtureId: fixture.id,
    title: fixture.title,
    editorUrl: fixture.editorUrl,
    draftTitleA: fixture.draftTitleA,
    draftTitleB: fixture.draftTitleB,
  };
}

function expectedAutosavePayload(fixture, title) {
  return { ...fixture.cleanPayload, title };
}

function expectedManualPayload(fixture, title) {
  return {
    title,
    slug: fixture.cleanPayload.slug,
    data: fixture.cleanPayload.data,
  };
}

function expectedMetadataPayload(fixture) {
  return {
    tags: fixture.cleanPayload.tags,
    taxonomy: fixture.cleanPayload.taxonomy,
    seo: fixture.cleanPayload.seo,
  };
}

function scenarioTargetUrl(scenario, fixture) {
  return ["table-keyboard", "mid-viewport-metadata"].includes(scenario.kind)
    ? POSTS_LIST_URL
    : fixture.editorUrl;
}

function expectedScenarioSetupCommand(scenario, fixture) {
  const spec = stableSerialize(expectedScenarioSpec(scenario, fixture));
  const targetUrl = JSON.stringify(scenarioTargetUrl(scenario, fixture));
  return smokeRunCode(
    `async (page) => { const previous = page.__wf543Scenario; if (previous?.listeners) { page.off("request", previous.listeners.request); page.off("framenavigated", previous.listeners.navigation); } const spec = ${spec}; const state = { spec, mutations: [], navigationUrls: [], pendingRoutes: [], routeHandlers: new Map(), routeAttempts: 0, table: {} }; const basePath = "/admin/api/posts/" + encodeURIComponent(spec.fixtureId); const onRequest = (request) => { const method = request.method(); const raw = request.url(); const index = raw.indexOf(basePath); const path = index < 0 ? "" : raw.slice(index).split("?")[0]; if (!["POST", "PUT", "PATCH", "DELETE"].includes(method) || (path !== basePath && !path.startsWith(basePath + "/"))) return; let payload = null; try { payload = request.postDataJSON() ?? null; } catch { payload = null; } state.mutations.push({ method, path, payload }); }; const onNavigation = (frame) => { if (frame === page.mainFrame()) state.navigationUrls.push(frame.url()); }; page.on("request", onRequest); page.on("framenavigated", onNavigation); state.listeners = { request: onRequest, navigation: onNavigation }; page.__wf543Scenario = state; await page.goto(${targetUrl}); const setupValue = await page.evaluate(({ key, value }) => { sessionStorage.setItem(key, value); return sessionStorage.getItem(key); }, { key: ${JSON.stringify(SMOKE_SETUP_STORAGE_KEY)}, value: spec.id }); state.navigationUrls = []; state.initialTitle = spec.kind === "table-keyboard" || spec.kind === "mid-viewport-metadata" ? spec.title : await page.locator(${JSON.stringify(POST_TITLE_SELECTOR)}).inputValue(); if (spec.kind === "double-close") await page.locator(${JSON.stringify(POST_CLOSE_SELECTOR)}).evaluate((button) => { button.dataset.wf543DomClickEvents = "0"; const listener = () => { button.dataset.wf543DomClickEvents = String(Number(button.dataset.wf543DomClickEvents ?? "0") + 1); }; button.addEventListener("click", listener); button.__wf543ClickListener = listener; }); return { url: page.url(), ready: true, scenarioId: spec.id, fixtureId: spec.fixtureId, setupValue }; }`
  );
}

function expectedRouteInstallCommand(pattern, mode) {
  return smokeRunCode(
    `async (page) => { const state = page.__wf543Scenario; if (!state) throw new Error("wf543 scenario missing"); const pattern = ${JSON.stringify(pattern)}; const mode = ${JSON.stringify(mode)}; let attempts = 0; const handler = async (route) => { attempts += 1; state.routeAttempts = attempts; if (mode === "failure" && attempts === 1) { await route.fulfill({ status: 200, contentType: "application/json", body: "{" }); return; } if (mode === "delay") await new Promise((resolve) => state.pendingRoutes.push(resolve)); await route.continue(); }; state.routeHandlers.set(pattern, handler); await page.route(pattern, handler); return { pattern, installed: true, mode }; }`
  );
}

function expectedRouteRemovalCommand(pattern) {
  return smokeRunCode(
    `async (page) => { const state = page.__wf543Scenario; const pattern = ${JSON.stringify(pattern)}; const handler = state?.routeHandlers?.get(pattern); let releasedPending = 0; while (state?.pendingRoutes?.length) { state.pendingRoutes.shift()(); releasedPending += 1; } if (handler) await page.unroute(pattern, handler); state?.routeHandlers?.delete(pattern); return { pattern, removed: true, releasedPending }; }`
  );
}

function titleFillCommand(value) {
  return smokeRunCode(
    `(page) => page.locator(${JSON.stringify(POST_TITLE_SELECTOR)}).fill(${JSON.stringify(value)})`
  );
}

function closeClickCommand() {
  return smokeRunCode(`(page) => page.locator(${JSON.stringify(POST_CLOSE_SELECTOR)}).click()`);
}

function expectedScenarioActionCommands(scenario, fixture) {
  switch (scenario.kind) {
    case "clean-close":
      return [closeClickCommand()];
    case "dirty-delayed-close":
    case "failure-retry":
      return [titleFillCommand(fixture.draftTitleA), closeClickCommand()];
    case "pending-revert-restoration":
      return [
        titleFillCommand(fixture.draftTitleA),
        smokeRunCode(
          `async (page) => { const state = page.__wf543Scenario; const deadline = Date.now() + 8000; while (state.pendingRoutes.length < 1) { if (Date.now() > deadline) throw new Error("wf543 first save did not reach delay route"); await page.waitForTimeout(25); } await page.locator(${JSON.stringify(POST_TITLE_SELECTOR)}).fill(${JSON.stringify(fixture.draftTitleB)}); await page.locator(${JSON.stringify(POST_CLOSE_SELECTOR)}).click(); return { edited: true, closeActivated: true }; }`
        ),
      ];
    case "double-close":
      return [
        titleFillCommand(fixture.draftTitleA),
        smokeRunCode(
          `(page) => page.locator(${JSON.stringify(POST_CLOSE_SELECTOR)}).evaluate((button) => { button.click(); button.click(); return { domClickEvents: Number(button.dataset.wf543DomClickEvents ?? "0") }; })`
        ),
      ];
    case "table-keyboard": {
      const titleName = `Edit post: ${fixture.title}`;
      const checkboxName = `Select ${fixture.title}`;
      const actionName = `Actions for ${fixture.title}`;
      return [
        smokeRunCode(
          `async (page) => { const state = page.__wf543Scenario; const navigationBefore = state.navigationUrls.length; await page.getByRole("link", { name: ${JSON.stringify(titleName)}, exact: true }).press("Enter"); await page.waitForURL(${JSON.stringify(fixture.editorUrl)}); state.table.titleUrl = page.url(); state.table.titleNavigationCount = state.navigationUrls.length - navigationBefore; await page.goBack(); await page.waitForURL(${JSON.stringify(POSTS_LIST_URL)}); return { key: "Enter", url: state.table.titleUrl }; }`
        ),
        smokeRunCode(
          `async (page) => { const state = page.__wf543Scenario; const checkbox = page.getByRole("checkbox", { name: ${JSON.stringify(checkboxName)}, exact: true }); const before = await checkbox.isChecked(); const navigationBefore = state.navigationUrls.length; await checkbox.press("Space"); state.table.checkboxToggled = (await checkbox.isChecked()) !== before; state.table.checkboxNavigationCount = state.navigationUrls.length - navigationBefore; return { key: "Space", toggled: state.table.checkboxToggled }; }`
        ),
        smokeRunCode(
          `async (page) => { const state = page.__wf543Scenario; const navigationBefore = state.navigationUrls.length; await page.getByRole("button", { name: ${JSON.stringify(actionName)}, exact: true }).press("Enter"); const menu = page.getByRole("menu"); state.table.actionMenuOpened = await menu.isVisible(); await page.keyboard.press("Escape"); await menu.waitFor({ state: "hidden" }); state.table.actionNavigationCount = state.navigationUrls.length - navigationBefore; return { key: "Enter", menuOpened: state.table.actionMenuOpened, dismissed: true }; }`
        ),
      ];
    }
    case "mid-viewport-metadata":
      return [
        smokeRunCode(
          `(page) => page.getByRole("link", { name: ${JSON.stringify(`Edit post: ${fixture.title}`)}, exact: true }).evaluate((link) => ({ ariaLabel: link.getAttribute("aria-label"), href: link.getAttribute("href") }))`
        ),
      ];
    default:
      return [];
  }
}

function requireExactPlainObject(value, keys, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  ) {
    throw new Error(`${label} has an invalid shape`);
  }
}

function requireBoundedRunCodeString(value, maximumLength, label) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.includes("\0")
  ) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function evidenceOperationKind(operation) {
  switch (operation) {
    case "assert-transient-dirty-delayed-close":
    case "assert-dirty-delayed-close":
      return "dirty-delayed-close";
    case "assert-transient-pending-revert-restoration":
    case "assert-pending-revert-restoration":
      return "pending-revert-restoration";
    case "assert-transient-failure-retry":
    case "assert-failure-retry":
      return "failure-retry";
    case "assert-transient-double-close":
    case "assert-double-close":
      return "double-close";
    case "assert-clean-close":
      return "clean-close";
    case "assert-table-keyboard":
      return "table-keyboard";
    case "assert-mid-viewport-metadata":
      return "mid-viewport-metadata";
    case "reset-scenario":
      return null;
    default:
      throw new Error("TASK-543 run-code operation is unknown");
  }
}

function validateEvidenceOperationPayload(operation, input) {
  const expectedKind = evidenceOperationKind(operation);
  let payload;
  if (operation === "reset-scenario") {
    const keys = ["editorUrl", "fixtureId", "scenarioId", "title"];
    requireExactPlainObject(input, keys, "TASK-543 reset payload");
    payload = {
      editorUrl: requireBoundedRunCodeString(input.editorUrl, 8_192, "reset editor URL"),
      fixtureId: requireBoundedRunCodeString(input.fixtureId, 512, "reset fixture id"),
      scenarioId: requireBoundedRunCodeString(input.scenarioId, 512, "reset scenario id"),
      title: requireBoundedRunCodeString(input.title, 32_768, "reset title"),
    };
  } else {
    requireExactPlainObject(input, ["kind"], "TASK-543 assertion payload");
    if (input.kind !== expectedKind) {
      throw new Error("TASK-543 assertion kind does not match its operation");
    }
    payload = { kind: requireBoundedRunCodeString(input.kind, 128, "assertion kind") };
  }
  const envelope = { operation, payload };
  const json = stableSerialize(envelope);
  if (Buffer.byteLength(json, "utf8") > RUN_CODE_PAYLOAD_MAX_BYTES) {
    throw new Error("TASK-543 run-code payload exceeds its byte budget");
  }
  return envelope;
}

function canonicalEvidenceOperationEncoding(operation, input) {
  const envelope = validateEvidenceOperationPayload(operation, input);
  const bytes = Buffer.from(stableSerialize(envelope), "utf8");
  const encoded = bytes.toString("base64url");
  if (
    encoded.length === 0 ||
    encoded.length > RUN_CODE_PAYLOAD_MAX_ENCODED_LENGTH ||
    !/^[A-Za-z0-9_-]+$/u.test(encoded)
  ) {
    throw new Error("TASK-543 run-code payload encoding is invalid");
  }
  const decoded = Buffer.from(encoded, "base64url");
  if (!decoded.equals(bytes) || decoded.toString("base64url") !== encoded) {
    throw new Error("TASK-543 run-code payload encoding is noncanonical");
  }
  return encoded;
}

function codeQlSafeJavaScriptStringLiteral(value) {
  if (typeof value !== "string") throw new Error("TASK-543 JavaScript literal is invalid");
  return JSON.stringify(value)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/\//gu, "\\u002f")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}

function buildEvidenceOperationRunCodeSource(operation, input) {
  const encodedLiteral = codeQlSafeJavaScriptStringLiteral(
    canonicalEvidenceOperationEncoding(operation, input)
  );
  let source;
  switch (operation) {
    case "assert-transient-dirty-delayed-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-transient-dirty-delayed-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-transient-dirty-delayed-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "dirty-delayed-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1, "wf543 delayed save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); return { kind: "dirty-delayed-close", phase: "pending", pendingRoutes: state.pendingRoutes.length, closeBusy: (await close.getAttribute("aria-busy")) === "true", closeDisabled: await close.isDisabled(), draftText: await page.locator("[data-post-editor-title-input=\\"true\\"]").inputValue(), nonCloseEditable: await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(), navigationCount: state.navigationUrls.length };
      }`;
      break;
    case "assert-transient-pending-revert-restoration":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-transient-pending-revert-restoration"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-transient-pending-revert-restoration") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "pending-revert-restoration" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1 && state.mutations.length === 1, "wf543 restoration first save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); return { kind: "pending-revert-restoration", phase: "pending", pendingRoutes: state.pendingRoutes.length, closeBusy: (await close.getAttribute("aria-busy")) === "true", closeDisabled: await close.isDisabled(), draftText: await page.locator("[data-post-editor-title-input=\\"true\\"]").inputValue(), nonCloseEditable: await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(), navigationCount: state.navigationUrls.length };
      }`;
      break;
    case "assert-transient-failure-retry":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-transient-failure-retry"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-transient-failure-retry") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "failure-retry" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; const alert = page.getByRole("alert"); const retry = page.getByRole("button", { name: "Retry now", exact: true }); await alert.waitFor(); await waitFor(() => state.mutations.length === 1, "wf543 failed autosave missing"); return { kind: "failure-retry", phase: "failure", alertVisible: await alert.isVisible(), alertText: (await alert.textContent())?.trim() ?? "", draftText: await page.locator("[data-post-editor-title-input=\\"true\\"]").inputValue(), retryFocused: await retry.evaluate((button) => document.activeElement === button), mutationCount: state.mutations.length, navigationCount: state.navigationUrls.length };
      }`;
      break;
    case "assert-transient-double-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-transient-double-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-transient-double-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "double-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1, "wf543 double-close save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); return { kind: "double-close", phase: "pending", pendingRoutes: state.pendingRoutes.length, domClickEvents: Number(await close.getAttribute("data-wf543-dom-click-events") ?? "0"), closeBusy: (await close.getAttribute("aria-busy")) === "true", closeDisabled: await close.isDisabled(), closePendingData: (await close.getAttribute("data-post-editor-close-pending")) === "true", nonCloseEditable: await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(), navigationCount: state.navigationUrls.length };
      }`;
      break;
    case "assert-clean-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-clean-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-clean-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "clean-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); const state = page.__wf543Scenario; return { kind: "clean-close", cleanBeforeClose: state.initialTitle === state.spec.title, saveRequestCount: state.mutations.length, navigationCount: state.navigationUrls.length, mutations: state.mutations, navigationUrls: state.navigationUrls, finalUrl: page.url() };
      }`;
      break;
    case "assert-dirty-delayed-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-dirty-delayed-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-dirty-delayed-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "dirty-delayed-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1, "wf543 delayed save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); const evidence = { kind: "dirty-delayed-close", saveRequestCount: state.mutations.length, requestOrder: state.mutations.map((item) => item.method + " " + item.path), requestPayload: state.mutations[0]?.payload ?? {}, closeBusy: (await close.getAttribute("aria-busy")) === "true", closeDisabled: await close.isDisabled(), nonCloseEditable: await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(), navigationBeforeRelease: state.navigationUrls.length, navigationAfterRelease: 0, mutations: [], navigationUrls: [], finalUrl: "" }; state.pendingRoutes.shift()(); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); evidence.navigationAfterRelease = state.navigationUrls.length; evidence.mutations = state.mutations; evidence.navigationUrls = state.navigationUrls; evidence.finalUrl = page.url(); return evidence;
      }`;
      break;
    case "assert-pending-revert-restoration":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-pending-revert-restoration"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-pending-revert-restoration") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "pending-revert-restoration" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; state.pendingRoutes.shift()(); await waitFor(() => state.pendingRoutes.length === 1 && state.mutations.length === 2, "wf543 restoration save missing"); const evidence = { kind: "pending-revert-restoration", saveRequestCount: state.mutations.length, requestOrder: state.mutations.map((item, index) => (index === 0 ? "A " : "B ") + item.method + " " + item.path), payloadA: state.mutations[0]?.payload ?? {}, payloadB: state.mutations[1]?.payload ?? {}, navigationBeforeB: state.navigationUrls.length, navigationAfterB: 0, mutations: [], navigationUrls: [], finalUrl: "" }; state.pendingRoutes.shift()(); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); evidence.navigationAfterB = state.navigationUrls.length; evidence.mutations = state.mutations; evidence.navigationUrls = state.navigationUrls; evidence.finalUrl = page.url(); return evidence;
      }`;
      break;
    case "assert-failure-retry":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-failure-retry"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-failure-retry") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "failure-retry" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; const alert = page.getByRole("alert"); const retry = page.getByRole("button", { name: "Retry now", exact: true }); await alert.waitFor(); await waitFor(() => state.mutations.length === 1, "wf543 failed autosave missing"); const alertVisible = await alert.isVisible(); const alertText = (await alert.textContent())?.trim() ?? ""; const draftText = await page.locator("[data-post-editor-title-input=\\"true\\"]").inputValue(); const retryFocused = await retry.evaluate((button) => document.activeElement === button); const navigationAfterFailure = state.navigationUrls.length; const responsePath = (response) => { const raw = response.url(); const marker = "/admin/api/posts/"; const index = raw.indexOf(marker); return index < 0 ? "" : raw.slice(index).split("?")[0]; }; const basePath = "/admin/api/posts/" + encodeURIComponent(state.spec.fixtureId); const baseResponsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && responsePath(response) === basePath); const metadataResponsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && responsePath(response) === basePath + "/metadata"); await retry.click(); const [retryResponse, metadataRetryResponse] = await Promise.all([baseResponsePromise, metadataResponsePromise]); if (!retryResponse.ok() || !metadataRetryResponse.ok()) throw new Error("wf543 manual retry chain failed"); await waitFor(() => state.mutations.length === 3, "wf543 manual retry base and metadata mutations missing"); const saveDraft = page.locator("[data-post-editor-save-draft=\\"true\\"]"); const saveDeadline = Date.now() + 8000; while (await saveDraft.isDisabled()) { if (Date.now() > saveDeadline) throw new Error("wf543 manual retry did not settle"); await page.waitForTimeout(25); } const mutationCountAfterRetry = state.mutations.length; await retry.waitFor({ state: "hidden" }); const alertClearedAfterRetry = (await retry.count()) === 0; const editorUrlAfterRetry = page.url(); const navigationAfterRetry = state.navigationUrls.length; await page.locator("[data-post-editor-header-close=\\"true\\"]").click(); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); return { kind: "failure-retry", autosavePostCount: state.mutations.filter((item) => item.method === "POST" && item.path.endsWith("/autosave")).length, manualPatchCount: state.mutations.filter((item) => item.method === "PATCH" && item.path === basePath).length, metadataPatchCount: state.mutations.filter((item) => item.method === "PATCH" && item.path === basePath + "/metadata").length, mutationCountAfterRetry, alertVisible, alertText, draftText, retryFocused, navigationAfterFailure, navigationAfterRetry, navigationAfterClose: state.navigationUrls.length, retrySucceeded: retryResponse.ok(), metadataRetrySucceeded: metadataRetryResponse.ok(), alertClearedAfterRetry, editorUrlAfterRetry, mutations: state.mutations, navigationUrls: state.navigationUrls, finalUrl: page.url() };
      }`;
      break;
    case "assert-double-close":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-double-close"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-double-close") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "double-close" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const waitFor = async (test, label) => { const deadline = Date.now() + 8000; while (!test()) { if (Date.now() > deadline) throw new Error(label); await page.waitForTimeout(25); } };
        const state = page.__wf543Scenario; await waitFor(() => state.pendingRoutes.length === 1, "wf543 double-close save missing"); const close = page.locator("[data-post-editor-header-close=\\"true\\"]"); const domClickEvents = Number(await close.getAttribute("data-wf543-dom-click-events") ?? "0"); const closeBusy = (await close.getAttribute("aria-busy")) === "true"; const closeDisabled = await close.isDisabled(); const closePendingData = (await close.getAttribute("data-post-editor-close-pending")) === "true"; const nonCloseEditable = await page.locator("[data-post-editor-title-input=\\"true\\"]").isEditable(); state.pendingRoutes.shift()(); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); return { kind: "double-close", domClickEvents, saveRequestCount: state.mutations.length, navigationCount: state.navigationUrls.length, closeBusy, closeDisabled, closePendingData, nonCloseEditable, mutations: state.mutations, navigationUrls: state.navigationUrls, finalUrl: page.url() };
      }`;
      break;
    case "assert-table-keyboard":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-table-keyboard"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-table-keyboard") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "table-keyboard" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const state = page.__wf543Scenario; const title = page.getByRole("link", { name: "Edit post: " + state.spec.title, exact: true }); const checkbox = page.getByRole("checkbox", { name: "Select " + state.spec.title, exact: true }); const action = page.getByRole("button", { name: "Actions for " + state.spec.title, exact: true }); return { kind: "table-keyboard", titleKey: "Enter", titleNavigationCount: state.table.titleNavigationCount ?? 0, titleUrl: state.table.titleUrl ?? "", titleAccessibleName: await title.getAttribute("aria-label") ?? "", checkboxKey: "Space", checkboxToggled: state.table.checkboxToggled === true, checkboxNavigationCount: state.table.checkboxNavigationCount ?? 0, checkboxAccessibleName: await checkbox.getAttribute("aria-label") ?? "", actionKey: "Enter", actionMenuOpened: state.table.actionMenuOpened === true, actionNavigationCount: state.table.actionNavigationCount ?? 0, actionAccessibleName: await action.getAttribute("aria-label") ?? "", mutations: state.mutations, navigationUrls: state.navigationUrls };
      }`;
      break;
    case "assert-mid-viewport-metadata":
      source = `async (page) => {
        const operationMarker = "wf543-operation:assert-mid-viewport-metadata"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "assert-mid-viewport-metadata") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["kind"]) || input.kind !== "mid-viewport-metadata" || !bounded(input.kind, 128)) fail("assertion_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const state = page.__wf543Scenario; const widths = state.responsiveOutputs ?? []; return { kind: "mid-viewport-metadata", orderedWidths: widths.map((item) => item.width), visibleSemanticCopies: widths.map((item) => ({ width: item.width, status: item.visibleStatusCopies, author: item.visibleAuthorCopies, date: item.visibleDateCopies })), mutations: state.mutations, navigationUrls: state.navigationUrls };
      }`;
      break;
    case "reset-scenario":
      source = `async (page) => {
        const operationMarker = "wf543-operation:reset-scenario"; void operationMarker;
        const encoded = ${encodedLiteral};
        const fail = (code) => { throw new Error("wf543_run_code_" + code); };
        if (typeof encoded !== "string" || encoded.length === 0 || encoded.length > 87384 || !/^[A-Za-z0-9_-]+$/u.test(encoded)) fail("encoding");
        const standard = encoded.replaceAll("-", "+").replaceAll("_", "/"); let binary;
        try { binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4)); } catch { fail("base64url"); }
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0)); if (bytes.length === 0 || bytes.length > 65536) fail("bytes");
        const canonicalEncoding = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, ""); if (canonicalEncoding !== encoded) fail("canonical_encoding");
        let json; try { json = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { fail("utf8"); }
        let envelope; try { envelope = JSON.parse(json); } catch { fail("json"); }
        const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
        const bounded = (value, maximumLength) => typeof value === "string" && value.length > 0 && value.length <= maximumLength && !value.includes("\\0");
        const canonical = (value) => { if (value === null || typeof value !== "object") return JSON.stringify(value); if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]"; return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}"; };
        if (!exact(envelope, ["operation", "payload"]) || envelope.operation !== "reset-scenario") fail("envelope");
        const input = envelope.payload; if (!exact(input, ["editorUrl", "fixtureId", "scenarioId", "title"]) || !bounded(input.editorUrl, 8192) || !bounded(input.fixtureId, 512) || !bounded(input.scenarioId, 512) || !bounded(input.title, 32768)) fail("reset_payload");
        if (canonical(envelope) !== json) fail("canonical_json");
        const state = page.__wf543Scenario; if (state?.listeners) { page.off("request", state.listeners.request); page.off("framenavigated", state.listeners.navigation); } if (state?.routeHandlers?.size) throw new Error("wf543 routes remain before reset"); const previousClose = page.locator("[data-post-editor-header-close=\\"true\\"]"); if (await previousClose.count()) await previousClose.evaluate((button) => { if (button.__wf543ClickListener) button.removeEventListener("click", button.__wf543ClickListener); delete button.__wf543ClickListener; delete button.dataset.wf543DomClickEvents; }); delete page.__wf543Scenario; await page.goto(input.editorUrl); const title = page.locator("[data-post-editor-title-input=\\"true\\"]"); await title.waitFor(); const beforeTitle = await title.inputValue(); let responsePromise = null; if (beforeTitle !== input.title) { await title.fill(input.title); responsePromise = page.waitForResponse((response) => { const method = response.request().method(); const raw = response.url(); const marker = "/admin/api/posts/" + encodeURIComponent(input.fixtureId); const index = raw.indexOf(marker); const path = index < 0 ? "" : raw.slice(index).split("?")[0]; return (method === "PATCH" && path === marker) || (method === "POST" && path === marker + "/autosave"); }); } await page.locator("[data-post-editor-header-close=\\"true\\"]").click(); const response = responsePromise ? await responsePromise : null; if (response && !response.ok()) throw new Error("wf543 real UI fixture reset failed"); await page.waitForURL("http://coderso-a.localhost:5173/admin/posts"); const row = page.getByRole("link", { name: "Edit post: " + input.title, exact: true }); await row.waitFor(); return { url: page.url(), reset: true, scenarioId: input.scenarioId, fixtureId: input.fixtureId, titleRestored: (await row.getAttribute("aria-label")) === "Edit post: " + input.title, rowAccessibleName: await row.getAttribute("aria-label"), restorationWrite: response ? { status: response.status(), url: response.url() } : null };
      }`;
      break;
    default:
      throw new Error("TASK-543 run-code operation is unknown");
  }
  return source.replace(/\r?\n[\t ]*/gu, " ");
}

function smokeRunOperation(operation, input) {
  const command = smokeRunCode(buildEvidenceOperationRunCodeSource(operation, input));
  if (Buffer.byteLength(command, "utf8") >= RUN_CODE_COMMAND_MAX_BYTES) {
    throw new Error("TASK-543 run-code command exceeds its byte budget");
  }
  return command;
}

function expectedTransientAssertionCommands(scenario) {
  switch (scenario.kind) {
    case "dirty-delayed-close":
      return [smokeRunOperation("assert-transient-dirty-delayed-close", { kind: scenario.kind })];
    case "pending-revert-restoration":
      return [
        smokeRunOperation("assert-transient-pending-revert-restoration", {
          kind: scenario.kind,
        }),
      ];
    case "failure-retry":
      return [smokeRunOperation("assert-transient-failure-retry", { kind: scenario.kind })];
    case "double-close":
      return [smokeRunOperation("assert-transient-double-close", { kind: scenario.kind })];
    case "clean-close":
    case "table-keyboard":
    case "mid-viewport-metadata":
      return [];
    default:
      throw new Error("unknown TASK-543 smoke kind");
  }
}

function transientEvidenceValid(scenario, fixture) {
  const results = scenario.commandResults.transientAssertion;
  if (!TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)) return results.length === 0;
  if (results.length !== 1) return false;
  const output = results[0].parsedOutput;
  if (
    output?.kind !== scenario.kind ||
    output.navigationCount !== 0 ||
    output.draftText !==
      (scenario.kind === "pending-revert-restoration" ? fixture.draftTitleB : fixture.draftTitleA)
  ) {
    return false;
  }
  if (scenario.kind === "failure-retry") {
    return (
      output.phase === "failure" &&
      output.alertVisible === true &&
      typeof output.alertText === "string" &&
      output.alertText.trim().length > 0 &&
      output.retryFocused === true &&
      output.mutationCount === 1
    );
  }
  return (
    output.phase === "pending" &&
    output.pendingRoutes === 1 &&
    output.closeBusy === true &&
    output.closeDisabled === true &&
    output.nonCloseEditable === true &&
    (scenario.kind !== "double-close" ||
      (output.domClickEvents === 2 && output.closePendingData === true))
  );
}

function expectedEvidenceAssertionCommand(scenario) {
  switch (scenario.kind) {
    case "clean-close":
      return smokeRunOperation("assert-clean-close", { kind: scenario.kind });
    case "dirty-delayed-close":
      return smokeRunOperation("assert-dirty-delayed-close", { kind: scenario.kind });
    case "pending-revert-restoration":
      return smokeRunOperation("assert-pending-revert-restoration", { kind: scenario.kind });
    case "failure-retry":
      return smokeRunOperation("assert-failure-retry", { kind: scenario.kind });
    case "double-close":
      return smokeRunOperation("assert-double-close", { kind: scenario.kind });
    case "table-keyboard":
      return smokeRunOperation("assert-table-keyboard", { kind: scenario.kind });
    case "mid-viewport-metadata":
      return smokeRunOperation("assert-mid-viewport-metadata", { kind: scenario.kind });
    default:
      throw new Error("unknown TASK-543 smoke kind");
  }
}

function expectedScenarioResetCommand(scenario, fixture) {
  return smokeRunOperation("reset-scenario", {
    scenarioId: scenario.id,
    fixtureId: fixture.id,
    title: fixture.title,
    editorUrl: fixture.editorUrl,
  });
}

function resetEvidenceValid(output, scenario, fixture) {
  if (
    output?.reset !== true ||
    output?.scenarioId !== scenario.id ||
    output?.fixtureId !== fixture.id ||
    output?.titleRestored !== true ||
    output?.rowAccessibleName !== `Edit post: ${fixture.title}` ||
    output?.url !== POSTS_LIST_URL
  ) {
    return false;
  }
  const requiresRestorationWrite = [
    "dirty-delayed-close",
    "failure-retry",
    "double-close",
  ].includes(scenario.kind);
  if (!requiresRestorationWrite) return output.restorationWrite === null;
  const write = output.restorationWrite;
  if (!Number.isInteger(write?.status) || write.status < 200 || write.status >= 300) {
    return false;
  }
  return (
    urlPathMatches(write.url, `/admin/api/posts/${encodeURIComponent(fixture.id)}`) ||
    urlPathMatches(write.url, `/admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`)
  );
}

function isFullSmokeCliCommand(command) {
  return (
    typeof command === "string" &&
    command.startsWith(SMOKE_SESSION_PREFIX) &&
    !command.includes("\n")
  );
}

function isUserActionCommand(command) {
  if (!isFullSmokeCliCommand(command)) return false;
  const action = command.slice(SMOKE_SESSION_PREFIX.length);
  return (
    /^(?:click|dblclick|fill|type|press|keydown|keyup|check|uncheck|goto|reload)\b/.test(action) ||
    (action.startsWith("run-code ") &&
      [".click(", ".fill(", ".press(", ".check(", ".uncheck(", ".goto(", ".reload("].some((token) =>
        action.includes(token)
      ))
  );
}

function commandResultsMatch(commands, results) {
  return (
    commands.length === results.length &&
    results.every(
      (receipt, index) =>
        receipt.command === commands[index] &&
        receipt.status === 0 &&
        rawPlaywrightReceiptValid(receipt)
    )
  );
}

function logReadSetValid(set) {
  if (!set) return false;
  return [
    [set.consoleErrors, SMOKE_CONSOLE_ERROR_READ],
    [set.consoleWarnings, SMOKE_CONSOLE_WARNING_READ],
    [set.pageErrors, SMOKE_PAGE_ERROR_READ],
  ].every(
    ([receipt, command]) =>
      receipt?.command === command &&
      receipt.status === 0 &&
      rawPlaywrightReceiptValid(receipt) &&
      Array.isArray(receipt.parsedOutput)
  );
}

function pushLogReadSet(push, scope, set) {
  push(`${scope}:console-errors`, set.consoleErrors);
  push(`${scope}:console-warnings`, set.consoleWarnings);
  push(`${scope}:page-errors`, set.pageErrors);
}

function aggregateLogReadSets(sets, key) {
  return sets.flatMap((set) => set[key].parsedOutput);
}

function lifecycleLogCommandValid(record) {
  const expectedCommand = record.scope.endsWith(":console-errors")
    ? SMOKE_CONSOLE_ERROR_READ
    : record.scope.endsWith(":console-warnings")
      ? SMOKE_CONSOLE_WARNING_READ
      : record.scope.endsWith(":page-errors")
        ? SMOKE_PAGE_ERROR_READ
        : null;
  return expectedCommand !== null && record.command === expectedCommand;
}

function lifecycleLogReceiptValid(record) {
  return (
    lifecycleLogCommandValid(record) &&
    record.status === 0 &&
    rawPlaywrightReceiptValid(record) &&
    Array.isArray(record.parsedOutput)
  );
}

function sessionListContains(output, sessionName) {
  return parsedSessionNames(output).includes(sessionName);
}

function parseSessionListOutput(output) {
  if (output === "  (no browsers)\n") return [];
  if (typeof output !== "string") return null;
  const lines = String(output).split("\n");
  if (lines.pop() !== "" || lines.shift() !== "### Browsers" || lines.length === 0) {
    return null;
  }
  const sessions = [];
  while (lines.length > 0) {
    const nameMatch = /^- ([A-Za-z0-9._-]+):$/u.exec(lines.shift() ?? "");
    if (!nameMatch || sessions.includes(nameMatch[1])) return null;
    sessions.push(nameMatch[1]);
    if (lines.shift() !== "  - status: open") return null;
    if (/^  - version: v[^\r\n]+ \[incompatible please re-open\]$/u.test(lines[0] ?? "")) {
      lines.shift();
    }
    const browserTypeMatch = /^  - browser-type: [A-Za-z0-9._-]+( \(attached\))?$/u.exec(
      lines[0] ?? ""
    );
    const attached = browserTypeMatch?.[1] !== undefined;
    if (browserTypeMatch) lines.shift();
    if (attached) continue;
    if (!/^  - user-data-dir: (?:<in-memory>|[^\r\n]+)$/u.test(lines.shift() ?? "")) {
      return null;
    }
    if (/^  - headed: (?:true|false)$/u.test(lines[0] ?? "")) lines.shift();
  }
  return sessions;
}

function parsedSessionNames(output) {
  return parseSessionListOutput(output) ?? [];
}

function sessionListOutputValid(output) {
  return parseSessionListOutput(output) !== null;
}

function sessionListReceiptValid(receipt) {
  return (
    receiptIntegrityValid(receipt) &&
    receipt.status === 0 &&
    sessionListOutputValid(receipt.stdout) &&
    sameRawValue(receipt.parsedOutput, {
      sessions: parsedSessionNames(receipt.stdout),
    })
  );
}

function browserOpenReceiptValid(receipt) {
  if (!receiptIntegrityValid(receipt) || receipt.status !== 0) return false;
  const match =
    /^### Browser `wf543smoke` opened with pid (\d+)\.\n### Ran Playwright code\n```js\nawait page\.goto\('http:\/\/coderso-a\.localhost:5173\/admin\/'\);\n```\n### Page\n- Page URL: (http:\/\/coderso-a\.localhost:5173\/admin\/[^\n]*)\n(?:- Page Title: ([^\r\n]+)\n)?### Snapshot\n- \[Snapshot\]\((\.playwright-cli\/page-[A-Za-z0-9:._-]+\.yml)\)\n$/u.exec(
      receipt.stdout
    );
  return (
    match !== null &&
    sameRawValue(receipt.parsedOutput, {
      session: "wf543smoke",
      pid: Number(match[1]),
      pageUrl: match[2],
      pageTitle: match[3] ?? null,
      snapshotPath: match[4],
    })
  );
}

function browserCloseReceiptValid(receipt) {
  return (
    receiptIntegrityValid(receipt) &&
    receipt.status === 0 &&
    receipt.stdout === "Browser 'wf543smoke' closed\n\n" &&
    sameRawValue(receipt.parsedOutput, { session: "wf543smoke", closed: true })
  );
}

function emptyRouteListOutput(output) {
  return output === "No active routes\n";
}

function uniqueNumbers(values) {
  return [...new Set(values)];
}

function parsePstreePids(output) {
  return uniqueNumbers([...String(output).matchAll(/\((\d+)\)/g)].map((match) => Number(match[1])));
}

function parseLsofOwnerPids(output) {
  return uniqueNumbers(
    String(output)
      .split(/\r?\n/)
      .filter((line) => /^p\d+$/.test(line))
      .map((line) => Number(line.slice(1)))
  );
}

function parseLsofPorts(output) {
  return uniqueNumbers(
    String(output)
      .split(/\r?\n/)
      .filter((line) => line.startsWith("n"))
      .map((line) => /:(\d+)(?:\s|$)/.exec(line)?.[1])
      .filter(Boolean)
      .map(Number)
  );
}

function parseLsofMappings(output) {
  const mappings = new Map();
  let currentPid = null;
  for (const line of String(output).split(/\r?\n/)) {
    if (/^p\d+$/.test(line)) {
      currentPid = Number(line.slice(1));
      continue;
    }
    const port = line.startsWith("n") ? Number(/:(\d+)(?:\s|$)/.exec(line)?.[1]) : NaN;
    if (currentPid !== null && Number.isInteger(port)) {
      const owners = mappings.get(port) ?? [];
      owners.push(currentPid);
      mappings.set(port, uniqueNumbers(owners));
    }
  }
  return mappings;
}

function computedNodeValid(node, expectedVisible) {
  const derivedVisible =
    node.exists === true &&
    node.display !== "none" &&
    node.visibility !== "hidden" &&
    node.visibility !== "collapse" &&
    node.opacity > 0 &&
    node.width > 0 &&
    node.height > 0;
  return (
    node.exists === true &&
    node.visible === derivedVisible &&
    node.visible === expectedVisible &&
    (expectedVisible ? node.text.length > 0 : true)
  );
}

function responsiveEvidenceValid(responsive, evidence, fixture) {
  if (
    !responsive ||
    evidence.kind !== "mid-viewport-metadata" ||
    !sameSequence(
      responsive.widths.map(({ width }) => width),
      RESPONSIVE_WIDTHS
    ) ||
    !sameSequence(evidence.orderedWidths, RESPONSIVE_WIDTHS) ||
    evidence.visibleSemanticCopies.length !== RESPONSIVE_WIDTHS.length
  ) {
    return false;
  }
  return responsive.widths.every((record, index) => {
    const { width, resizeReceipt, probeReceipt } = record;
    const rawProbeOutput = probeReceipt.parsedOutput;
    const semantic = evidence.visibleSemanticCopies[index];
    const fallbackMetadataVisible = width < 1024;
    const fallbackStatusVisible = width < 768;
    const columnStatusVisible = width >= 768;
    const columnAuthorDateVisible = width >= 1024;
    return (
      resizeReceipt.command ===
        `playwright-cli -s=wf543smoke --raw resize ${width} ${RESPONSIVE_HEIGHT}` &&
      resizeReceipt.status === 0 &&
      rawPlaywrightReceiptValid(resizeReceipt) &&
      resizeReceipt.stdout === "\n" &&
      resizeReceipt.parsedOutput === null &&
      probeReceipt.command === expectedResponsiveProbeCommand(fixture) &&
      probeReceipt.status === 0 &&
      rawPlaywrightReceiptValid(probeReceipt) &&
      rawProbeOutput.width === width &&
      rawProbeOutput.matchedRowCount === 1 &&
      rawProbeOutput.rowPostId === fixture.id &&
      rawProbeOutput.fallbackMetadataVisible === fallbackMetadataVisible &&
      rawProbeOutput.fallbackStatusVisible === fallbackStatusVisible &&
      rawProbeOutput.fallbackAuthorVisible === fallbackMetadataVisible &&
      rawProbeOutput.fallbackDateVisible === fallbackMetadataVisible &&
      rawProbeOutput.columnStatusVisible === columnStatusVisible &&
      rawProbeOutput.columnAuthorVisible === columnAuthorDateVisible &&
      rawProbeOutput.columnDateVisible === columnAuthorDateVisible &&
      rawProbeOutput.visibleStatusCopies === 1 &&
      rawProbeOutput.visibleAuthorCopies === 1 &&
      rawProbeOutput.visibleDateCopies === 1 &&
      rawProbeOutput.titleAccessibleName === `Edit post: ${fixture.title}` &&
      rawProbeOutput.checkboxAccessibleName === `Select ${fixture.title}` &&
      rawProbeOutput.actionAccessibleName === `Actions for ${fixture.title}` &&
      computedNodeValid(rawProbeOutput.nodes.fallbackMetadata, fallbackMetadataVisible) &&
      computedNodeValid(rawProbeOutput.nodes.fallbackStatus, fallbackStatusVisible) &&
      computedNodeValid(rawProbeOutput.nodes.fallbackAuthor, fallbackMetadataVisible) &&
      computedNodeValid(rawProbeOutput.nodes.fallbackDate, fallbackMetadataVisible) &&
      computedNodeValid(rawProbeOutput.nodes.columnStatus, columnStatusVisible) &&
      computedNodeValid(rawProbeOutput.nodes.columnAuthor, columnAuthorDateVisible) &&
      computedNodeValid(rawProbeOutput.nodes.columnDate, columnAuthorDateVisible) &&
      computedNodeValid(rawProbeOutput.nodes.row, true) &&
      computedNodeValid(rawProbeOutput.nodes.table, true) &&
      rawProbeOutput.rowWidth > 0 &&
      rawProbeOutput.tableWidth > 0 &&
      semantic.width === width &&
      semantic.status === rawProbeOutput.visibleStatusCopies &&
      semantic.author === rawProbeOutput.visibleAuthorCopies &&
      semantic.date === rawProbeOutput.visibleDateCopies
    );
  });
}

function expectedMutationSequence(kind, fixture) {
  const basePath = `/admin/api/posts/${encodeURIComponent(fixture.id)}`;
  const autosavePath = `${basePath}/autosave`;
  switch (kind) {
    case "clean-close":
    case "table-keyboard":
    case "mid-viewport-metadata":
      return [];
    case "dirty-delayed-close":
    case "double-close":
      return [
        {
          method: "POST",
          path: autosavePath,
          payload: expectedAutosavePayload(fixture, fixture.draftTitleA),
        },
      ];
    case "pending-revert-restoration":
      return [
        {
          method: "POST",
          path: autosavePath,
          payload: expectedAutosavePayload(fixture, fixture.draftTitleA),
        },
        {
          method: "POST",
          path: autosavePath,
          payload: expectedAutosavePayload(fixture, fixture.draftTitleB),
        },
      ];
    case "failure-retry":
      return [
        {
          method: "POST",
          path: autosavePath,
          payload: expectedAutosavePayload(fixture, fixture.draftTitleA),
        },
        {
          method: "PATCH",
          path: basePath,
          payload: expectedManualPayload(fixture, fixture.draftTitleA),
        },
        {
          method: "PATCH",
          path: `${basePath}/metadata`,
          payload: expectedMetadataPayload(fixture),
        },
      ];
    default:
      return [];
  }
}

function expectedNavigationSequence(kind, fixture) {
  if (kind === "table-keyboard") return [fixture.editorUrl, POSTS_LIST_URL];
  if (kind === "mid-viewport-metadata") return [];
  return [POSTS_LIST_URL];
}

function validateScenarioByKind(scenario, fixture) {
  const evidence = scenario.evidence;
  if (
    !fixture ||
    evidence.kind !== scenario.kind ||
    !sameRawValue(evidence.mutations, expectedMutationSequence(scenario.kind, fixture)) ||
    !sameSequence(evidence.navigationUrls, expectedNavigationSequence(scenario.kind, fixture))
  ) {
    return false;
  }
  switch (scenario.kind) {
    case "clean-close":
      return (
        evidence.cleanBeforeClose === true &&
        evidence.saveRequestCount === 0 &&
        evidence.navigationCount === 1 &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "dirty-delayed-close":
      return (
        evidence.saveRequestCount === 1 &&
        sameSequence(evidence.requestOrder, [
          `POST /admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`,
        ]) &&
        sameRawValue(
          evidence.requestPayload,
          expectedAutosavePayload(fixture, fixture.draftTitleA)
        ) &&
        evidence.closeBusy === true &&
        evidence.closeDisabled === true &&
        evidence.nonCloseEditable === true &&
        evidence.navigationBeforeRelease === 0 &&
        evidence.navigationAfterRelease === 1 &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "pending-revert-restoration":
      return (
        fixture.draftTitleB === fixture.title &&
        evidence.saveRequestCount === 2 &&
        sameSequence(evidence.requestOrder, [
          `A POST /admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`,
          `B POST /admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`,
        ]) &&
        sameRawValue(evidence.payloadA, expectedAutosavePayload(fixture, fixture.draftTitleA)) &&
        sameRawValue(evidence.payloadB, expectedAutosavePayload(fixture, fixture.draftTitleB)) &&
        !sameRawValue(evidence.payloadA, evidence.payloadB) &&
        evidence.navigationBeforeB === 0 &&
        evidence.navigationAfterB === 1 &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "failure-retry":
      return (
        evidence.autosavePostCount === 1 &&
        evidence.manualPatchCount === 1 &&
        evidence.metadataPatchCount === 1 &&
        evidence.mutationCountAfterRetry === 3 &&
        evidence.alertVisible === true &&
        evidence.alertText.trim().length > 0 &&
        evidence.draftText === fixture.draftTitleA &&
        evidence.retryFocused === true &&
        evidence.navigationAfterFailure === 0 &&
        evidence.navigationAfterRetry === 0 &&
        evidence.navigationAfterClose === 1 &&
        evidence.retrySucceeded === true &&
        evidence.metadataRetrySucceeded === true &&
        evidence.alertClearedAfterRetry === true &&
        evidence.editorUrlAfterRetry === fixture.editorUrl &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "double-close":
      return (
        evidence.domClickEvents === 2 &&
        evidence.saveRequestCount === 1 &&
        evidence.navigationCount === 1 &&
        evidence.closeBusy === true &&
        evidence.closeDisabled === true &&
        evidence.closePendingData === true &&
        evidence.nonCloseEditable === true &&
        evidence.finalUrl === POSTS_LIST_URL
      );
    case "table-keyboard":
      return (
        evidence.titleKey === "Enter" &&
        evidence.titleNavigationCount === 1 &&
        evidence.titleUrl === fixture.editorUrl &&
        evidence.titleAccessibleName === `Edit post: ${fixture.title}` &&
        evidence.checkboxKey === "Space" &&
        evidence.checkboxToggled === true &&
        evidence.checkboxNavigationCount === 0 &&
        evidence.checkboxAccessibleName === `Select ${fixture.title}` &&
        evidence.actionKey === "Enter" &&
        evidence.actionMenuOpened === true &&
        evidence.actionNavigationCount === 0 &&
        evidence.actionAccessibleName === `Actions for ${fixture.title}`
      );
    case "mid-viewport-metadata":
      return responsiveEvidenceValid(scenario.responsive, evidence, fixture);
    default:
      return false;
  }
}

function expectedScenarioRouteMode(kind) {
  if (["dirty-delayed-close", "pending-revert-restoration", "double-close"].includes(kind)) {
    return "delay";
  }
  return kind === "failure-retry" ? "failure" : null;
}

function expectedScenarioRoutePattern(fixture) {
  return `**/admin/api/posts/${encodeURIComponent(fixture.id)}/autosave`;
}

function scenarioCommandEvidenceValid(scenario, fixture) {
  if (!fixture) return false;
  const { commands, commandResults, routes } = scenario;
  const installedPatterns = routes.installed.map(({ pattern }) => pattern);
  const removedPatterns = routes.removed.map(({ pattern }) => pattern);
  const expectedRouteMode = expectedScenarioRouteMode(scenario.kind);
  const expectedRoutePattern = expectedScenarioRoutePattern(fixture);
  const expectedActions = expectedScenarioActionCommands(scenario, fixture);
  const expectedTransientAssertions = expectedTransientAssertionCommands(scenario);
  const expectedAssertion = expectedEvidenceAssertionCommand(scenario);
  const expectedSetup = expectedScenarioSetupCommand(scenario, fixture);
  const expectedReset = expectedScenarioResetCommand(scenario, fixture);
  const assertionContainsTypedEvidence = commandResults.assertion.some(({ parsedOutput }) =>
    sameRawValue(parsedOutput, scenario.evidence)
  );
  return (
    fixture &&
    fixture.id === scenario.fixtureId &&
    scenario.pass === true &&
    scenario.errors.length === 0 &&
    commands.logReset === SMOKE_LOG_RESET &&
    commandResults.logReset.command === commands.logReset &&
    commandResults.logReset.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.logReset) &&
    commands.theme === expectedThemeApplyCommand(scenario.theme) &&
    commandResults.theme.command === commands.theme &&
    commandResults.theme.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.theme) &&
    commandResults.theme.parsedOutput.preference === scenario.theme &&
    commandResults.theme.parsedOutput.resolved === scenario.theme &&
    commandResults.theme.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    sameSequence(commands.setup, [expectedSetup]) &&
    commandResultsMatch(commands.setup, commandResults.setup) &&
    commandResults.setup[0]?.parsedOutput?.ready === true &&
    commandResults.setup[0]?.parsedOutput?.scenarioId === scenario.id &&
    commandResults.setup[0]?.parsedOutput?.fixtureId === fixture.id &&
    commandResults.setup[0]?.parsedOutput?.setupValue === scenario.id &&
    commandResults.setup[0]?.parsedOutput?.url === scenarioTargetUrl(scenario, fixture) &&
    sameSequence(commands.action, expectedActions) &&
    commandResultsMatch(commands.action, commandResults.action) &&
    sameSequence(commands.transientAssertion, expectedTransientAssertions) &&
    commandResultsMatch(commands.transientAssertion, commandResults.transientAssertion) &&
    transientEvidenceValid(scenario, fixture) &&
    sameSequence(commands.assertion, [expectedAssertion]) &&
    commandResultsMatch(commands.assertion, commandResults.assertion) &&
    assertionContainsTypedEvidence &&
    commandResults.logReads.consoleErrors.command === commands.consoleErrorRead &&
    commandResults.logReads.consoleErrors.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.logReads.consoleErrors) &&
    Array.isArray(commandResults.logReads.consoleErrors.parsedOutput) &&
    commandResults.logReads.consoleErrors.parsedOutput.length === 0 &&
    commandResults.logReads.consoleWarnings.command === commands.consoleWarningRead &&
    commandResults.logReads.consoleWarnings.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.logReads.consoleWarnings) &&
    Array.isArray(commandResults.logReads.consoleWarnings.parsedOutput) &&
    commandResults.logReads.consoleWarnings.parsedOutput.length === 0 &&
    commandResults.logReads.pageErrors.command === commands.pageErrorRead &&
    commandResults.logReads.pageErrors.status === 0 &&
    rawPlaywrightReceiptValid(commandResults.logReads.pageErrors) &&
    Array.isArray(commandResults.logReads.pageErrors.parsedOutput) &&
    commandResults.logReads.pageErrors.parsedOutput.length === 0 &&
    (expectedRouteMode === null
      ? commandResults.boundaryLogReads.afterUnroute === null
      : logReadSetValid(commandResults.boundaryLogReads.afterUnroute)) &&
    logReadSetValid(commandResults.boundaryLogReads.afterReset) &&
    sameSequence(commands.reset, [expectedReset]) &&
    commandResultsMatch(commands.reset, commandResults.reset) &&
    resetEvidenceValid(commandResults.reset[0]?.parsedOutput, scenario, fixture) &&
    sameSequence(installedPatterns, removedPatterns) &&
    routes.installed.every(
      (receipt) =>
        rawPlaywrightReceiptValid(receipt) &&
        (({ pattern, command, status, parsedOutput }) =>
          status === 0 &&
          pattern === expectedRoutePattern &&
          command === expectedRouteInstallCommand(pattern, expectedRouteMode) &&
          parsedOutput.pattern === pattern &&
          parsedOutput.installed === true &&
          parsedOutput.mode === expectedRouteMode)(receipt)
    ) &&
    routes.removed.every(
      (receipt) =>
        rawPlaywrightReceiptValid(receipt) &&
        (({ pattern, command, status, parsedOutput }) =>
          status === 0 &&
          pattern === expectedRoutePattern &&
          command === expectedRouteRemovalCommand(pattern) &&
          parsedOutput.pattern === pattern &&
          parsedOutput.removed === true &&
          parsedOutput.releasedPending === 0)(receipt)
    ) &&
    (expectedRouteMode === null
      ? routes.installed.length === 0 && routes.removed.length === 0
      : routes.installed.length === 1 && routes.removed.length === 1) &&
    (scenario.kind === "mid-viewport-metadata"
      ? scenario.responsive !== null
      : scenario.responsive === null) &&
    validateScenarioByKind(scenario, fixture)
  );
}

function stateRestored(record, kind) {
  const beforeCommand =
    kind === "theme" ? expectedThemeStateReadCommand() : expectedSetupStateReadCommand();
  const afterCommand = beforeCommand;
  const restoreCommand =
    kind === "theme"
      ? expectedThemeStateRestoreCommand(record.before.parsedOutput)
      : expectedSetupStateRestoreCommand(record.before.parsedOutput.value);
  const valuesRestored =
    kind === "theme"
      ? record.before.parsedOutput.storedPreference ===
          record.restore.parsedOutput.storedPreference &&
        record.before.parsedOutput.storedPreference ===
          record.after.parsedOutput.storedPreference &&
        record.before.parsedOutput.darkClass === record.restore.parsedOutput.darkClass &&
        record.before.parsedOutput.darkClass === record.after.parsedOutput.darkClass &&
        record.before.parsedOutput.lightClass === record.restore.parsedOutput.lightClass &&
        record.before.parsedOutput.lightClass === record.after.parsedOutput.lightClass
      : record.before.parsedOutput.value === record.restore.parsedOutput.value &&
        record.before.parsedOutput.value === record.after.parsedOutput.value;
  return (
    record.before.status === 0 &&
    record.restore.status === 0 &&
    record.after.status === 0 &&
    rawPlaywrightReceiptValid(record.before) &&
    rawPlaywrightReceiptValid(record.restore) &&
    rawPlaywrightReceiptValid(record.after) &&
    record.before.command === beforeCommand &&
    record.restore.command === restoreCommand &&
    record.after.command === afterCommand &&
    record.before.parsedOutput !== null &&
    record.before.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    record.restore.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    record.after.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    valuesRestored
  );
}

function screenshotReceiptValid(screenshot, scenario, serverStartedAtEpochMs) {
  const relativePath = repoRelativePath(screenshot.path);
  const expectedPath = scenario.screenshotPaths[screenshot.phase];
  return (
    expectedPath === screenshot.path &&
    relativePath !== null &&
    screenshot.captureReceipt.command === expectedScreenshotCaptureCommand(screenshot.path) &&
    screenshot.captureReceipt.status === 0 &&
    receiptIntegrityValid(screenshot.captureReceipt) &&
    screenshot.captureReceipt.stdout === expectedScreenshotStdout(screenshot.path) &&
    sameRawValue(screenshot.captureReceipt.parsedOutput, { reportedPath: relativePath }) &&
    screenshot.size > 45 &&
    screenshot.mtimeEpochMs > serverStartedAtEpochMs &&
    screenshot.signatureHex === "89504e470d0a1a0a" &&
    screenshot.statReceipt.command === expectedScreenshotStatCommand(screenshot.path) &&
    screenshot.statReceipt.status === 0 &&
    receiptIntegrityValid(screenshot.statReceipt) &&
    screenshot.statReceipt.stdout ===
      JSON.stringify({
        size: screenshot.size,
        inode: screenshot.inode,
        mtimeEpochMs: screenshot.mtimeEpochMs,
      }) &&
    sameRawValue(screenshot.statReceipt.parsedOutput, {
      size: screenshot.size,
      inode: screenshot.inode,
      mtimeEpochMs: screenshot.mtimeEpochMs,
    }) &&
    screenshot.hashReceipt.command === expectedScreenshotHashCommand(screenshot.path) &&
    screenshot.hashReceipt.status === 0 &&
    receiptIntegrityValid(screenshot.hashReceipt) &&
    screenshot.hashReceipt.stdout === `${screenshot.sha256}  ${screenshot.path}\n` &&
    sameRawValue(screenshot.hashReceipt.parsedOutput, {
      sha256: screenshot.sha256,
      path: screenshot.path,
    }) &&
    screenshot.signatureReceipt.command === expectedScreenshotSignatureCommand(screenshot.path) &&
    screenshot.signatureReceipt.status === 0 &&
    receiptIntegrityValid(screenshot.signatureReceipt) &&
    screenshot.signatureReceipt.stdout === `${screenshot.signatureHex}\n` &&
    sameRawValue(screenshot.signatureReceipt.parsedOutput, {
      signatureHex: screenshot.signatureHex,
    })
  );
}

function expectedScreenshotPhases(kind) {
  return TRANSIENT_SCREENSHOT_KINDS.includes(kind) ? ["transient", "final"] : ["final"];
}

function failurePhaseMatchesScope(phase, scope) {
  const prefix = scope.split(":", 1)[0];
  if (phase === "bootstrap") return prefix === "bootstrap" || scope === "browser:preflight";
  return prefix === phase;
}

function failureEarlyPrefixValid(smoke) {
  const attempted = smoke.commandTimeline.slice(0, smoke.failedAtSequence);
  const nonceReceipt = attempted.find(({ scope }) => scope === "bootstrap:nonce");
  const helperReceipt = attempted.find(({ scope }) => scope === "bootstrap:helper");
  const nonce = typeof nonceReceipt?.parsedOutput === "string" ? nonceReceipt.parsedOutput : null;
  const rootPid =
    smoke.acquired.helper?.rootPid ??
    (Number.isInteger(Number(helperReceipt?.parsedOutput))
      ? Number(helperReceipt.parsedOutput)
      : null);
  const expected = [
    { scope: "browser:preflight", command: "playwright-cli --raw list" },
    { scope: "bootstrap:port", command: expectedPortCheckCommand(3000) },
    { scope: "bootstrap:port", command: expectedPortCheckCommand(5173) },
    { scope: "bootstrap:nonce", command: NONCE_GENERATION_COMMAND },
    { scope: "bootstrap:timestamp", command: "/usr/bin/date +%s%3N" },
  ];
  if (nonce !== null) {
    expected.push({ scope: "bootstrap:helper", command: expectedHelperLaunchCommand(nonce) });
  }
  if (Number.isInteger(rootPid) && rootPid >= 2 && nonce !== null) {
    const commands = expectedHelperIdentityCommands({ rootPid, launchNonce: nonce });
    for (const key of ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"]) {
      expected.push({ scope: `bootstrap:identity:${key}`, command: commands[key] });
    }
    expected.push(
      { scope: "health:admin", command: ADMIN_HEALTH_COMMAND },
      { scope: "health:front", command: FRONT_HEALTH_COMMAND },
      {
        scope: "browser:open",
        command: "playwright-cli -s=wf543smoke --raw open http://coderso-a.localhost:5173/admin/",
      },
      {
        scope: "browser:email",
        command:
          'playwright-cli -s=wf543smoke --raw fill \'input[type="email"]\' "$ADMIN_EMAIL" >/dev/null',
      },
      {
        scope: "browser:password",
        command: SMOKE_PASSWORD_FILL_COMMAND,
      },
      { scope: "browser:login", command: SMOKE_LOGIN_SUBMIT },
      { scope: "browser:logs", command: SMOKE_LOG_OBSERVATION_START },
      { scope: "state:theme-before", command: expectedThemeStateReadCommand() },
      { scope: "state:setup-before", command: expectedSetupStateReadCommand() }
    );
  }
  const earlyScope =
    /^(?:browser:preflight|bootstrap:|health:|browser:(?:open|email|password|login|logs)|state:(?:theme|setup)-before)/u;
  const firstLaterIndex = attempted.findIndex((record) => !earlyScope.test(record.scope));
  const earlyAttempted = firstLaterIndex === -1 ? attempted : attempted.slice(0, firstLaterIndex);
  if (firstLaterIndex !== -1 && earlyAttempted.length !== expected.length) return false;
  if (earlyAttempted.length > expected.length) return false;
  return earlyAttempted.every(
    (record, index) =>
      record.scope === expected[index].scope && record.command === expected[index].command
  );
}

function failureIdentityReceiptValid(record, helper) {
  if (!helper || helper.rootPid === null) return false;
  const match = /^bootstrap:identity:(ppid|startTicks|cmdline|cwd|cmdlineHash|nonce)$/u.exec(
    record.scope
  );
  if (!match || record.command !== expectedHelperIdentityCommands(helper)[match[1]]) {
    return false;
  }
  if (record.status !== 0 || !receiptIntegrityValid(record)) return false;
  switch (match[1]) {
    case "ppid":
      return (
        helper.ppid !== null &&
        record.stdout === String(helper.ppid) &&
        String(record.parsedOutput) === String(helper.ppid)
      );
    case "startTicks":
      return (
        helper.startTicks !== null &&
        record.stdout === helper.startTicks &&
        record.parsedOutput === helper.startTicks
      );
    case "cmdline":
      return (
        helper.cmdline !== null &&
        record.stdout.trim() === helper.cmdline.trim() &&
        String(record.parsedOutput).trim() === helper.cmdline.trim()
      );
    case "cwd":
      return (
        helper.cwd !== null &&
        record.stdout === `${helper.cwd}\n` &&
        record.parsedOutput === helper.cwd
      );
    case "cmdlineHash":
      return (
        helper.cmdlineSha256 !== null &&
        record.stdout === `${helper.cmdlineSha256}  /proc/${helper.rootPid}/cmdline\n` &&
        record.parsedOutput === helper.cmdlineSha256
      );
    case "nonce":
      return (
        record.stdout === "" &&
        sameRawValue(record.parsedOutput, {
          present: true,
          nonce: helper.launchNonce,
        })
      );
    default:
      return false;
  }
}

function failurePrefixReceiptsValid(smoke, digest = sha256Text) {
  return smoke.commandTimeline.slice(0, smoke.failedAtSequence - 1).every((record) => {
    if (!failurePrefixTimelineReceiptIntegrityValid(record, smoke, digest)) return false;
    if (record.scope === "browser:preflight") {
      return sessionListReceiptValid(record) && !sessionListContains(record.stdout, "wf543smoke");
    }
    if (record.scope === "bootstrap:port") {
      return (
        record.status === 1 &&
        record.stdout === "" &&
        sameRawValue(record.parsedOutput, { absent: true })
      );
    }
    if (record.scope === "bootstrap:nonce") {
      return (
        record.status === 0 &&
        /^wf543-[a-f0-9]{32}$/u.test(record.stdout) &&
        record.stdout === record.parsedOutput &&
        !/^wf543-0{32}$/u.test(record.stdout)
      );
    }
    if (record.scope === "bootstrap:timestamp") {
      const epochMs = Number(record.stdout.trim());
      return (
        record.status === 0 &&
        /^\d+\n$/u.test(record.stdout) &&
        Number.isInteger(epochMs) &&
        epochMs >= 1 &&
        sameRawValue(record.parsedOutput, { epochMs })
      );
    }
    if (record.scope.startsWith("bootstrap:identity:")) {
      return failureIdentityReceiptValid(record, smoke.acquired.helper);
    }
    if (record.scope === "health:admin" || record.scope === "health:front") {
      return (
        record.status === 0 &&
        record.stdout === "200" &&
        sameRawValue(record.parsedOutput, { httpStatus: 200 })
      );
    }
    if (record.scope === "browser:open") return browserOpenReceiptValid(record);
    if (record.scope === "browser:password") return true;
    if (record.scope === "browser:email") {
      return record.status === 0 && record.stdout === "" && record.parsedOutput === null;
    }
    if (record.scope === "browser:login") {
      return (
        record.status === 0 &&
        rawPlaywrightReceiptValid(record) &&
        record.parsedOutput?.signedIn === true &&
        typeof record.parsedOutput?.url === "string" &&
        record.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
        !record.parsedOutput.url.includes("/login")
      );
    }
    if (record.scope === "browser:logs") {
      return (
        record.status === 0 && rawPlaywrightReceiptValid(record) && record.parsedOutput === true
      );
    }
    if (record.scope.startsWith("state:")) return failureStateReceiptValid(record, smoke);
    if (record.scope.startsWith("helper:")) return failureHelperReceiptValid(record, smoke);
    if (/^fixture:[^:]+:(?:create|provenance|delete|absence)$/u.test(record.scope)) {
      return failureFixtureReceiptValid(record, smoke);
    }
    if (/^(?:lifecycle:|scenario:[^:]+:after-(?:unroute|reset):)/u.test(record.scope)) {
      return lifecycleLogReceiptValid(record);
    }
    if (record.scope.startsWith("scenario:")) {
      return failureScenarioReceiptValid(record, smoke);
    }
    return (
      record.status === 0 &&
      (!record.command.startsWith("playwright-cli ") || rawPlaywrightReceiptValid(record))
    );
  });
}

function failedReceiptShowsFailure(receipt) {
  if (receipt.scope === "bootstrap:port") {
    return (
      receipt.status > 1 ||
      (receipt.status === 0 &&
        receipt.stdout.trim().length > 0 &&
        sameRawValue(receipt.parsedOutput, { absent: false }))
    );
  }
  return receipt.status !== 0;
}

function failureStateReceiptValid(record, smoke) {
  if (record.status !== 0 || !rawPlaywrightReceiptValid(record)) return false;
  const output = record.parsedOutput;
  if (record.scope === "state:theme-before") {
    return (
      record.command === expectedThemeStateReadCommand() &&
      sameRawValue(output, smoke.acquired.themeBefore)
    );
  }
  if (record.scope === "state:setup-before") {
    return (
      record.command === expectedSetupStateReadCommand() &&
      sameRawValue(output, smoke.acquired.setupBefore)
    );
  }
  if (record.scope === "state:theme-restore" || record.scope === "state:theme-after") {
    const before = smoke.acquired.themeBefore;
    if (!before) return false;
    return (
      record.command ===
        (record.scope.endsWith("restore")
          ? expectedThemeStateRestoreCommand(before)
          : expectedThemeStateReadCommand()) &&
      output?.storedPreference === before.storedPreference &&
      output?.darkClass === before.darkClass &&
      output?.lightClass === before.lightClass &&
      typeof output?.url === "string" &&
      output.url.startsWith(`${ADMIN_ORIGIN}/admin/`)
    );
  }
  if (record.scope === "state:setup-restore" || record.scope === "state:setup-after") {
    const before = smoke.acquired.setupBefore;
    if (!before) return false;
    return (
      record.command ===
        (record.scope.endsWith("restore")
          ? expectedSetupStateRestoreCommand(before.value)
          : expectedSetupStateReadCommand()) &&
      output?.value === before.value &&
      typeof output?.url === "string" &&
      output.url.startsWith(`${ADMIN_ORIGIN}/admin/`)
    );
  }
  return false;
}

function failureHelperReceiptValid(record, smoke) {
  const helper = smoke.acquired.helper;
  if (!helper || helper.rootPid === null || record.status !== 0 || !receiptIntegrityValid(record)) {
    return false;
  }
  if (record.scope === "helper:pid-tree") {
    const discoveredPids = parsePstreePids(record.stdout);
    return (
      record.command === expectedPidTreeDiscoveryCommand(helper.rootPid) &&
      sameUniqueSet(discoveredPids, helper.ownedPids) &&
      sameRawValue(record.parsedOutput, { discoveredPids })
    );
  }
  if (record.scope !== "helper:port-ownership") return false;
  const rawMappings = parseLsofMappings(record.stdout);
  const parsedMappings = record.parsedOutput?.mappings;
  const mappedOwnerPids = Array.isArray(parsedMappings)
    ? uniqueNumbers(parsedMappings.flatMap(({ ownerPids }) => ownerPids ?? []))
    : [];
  return (
    record.command === expectedPortOwnershipDiscoveryCommand(helper.ownedPids) &&
    Array.isArray(parsedMappings) &&
    sameUniqueSet(parseLsofOwnerPids(record.stdout), mappedOwnerPids) &&
    mappedOwnerPids.every((pid) => helper.ownedPids.includes(pid)) &&
    sameUniqueSet(parseLsofPorts(record.stdout), helper.ownedPorts) &&
    parsedMappings.every(
      ({ port, ownerPids }) =>
        Number.isInteger(port) &&
        Array.isArray(ownerPids) &&
        sameUniqueSet(ownerPids, rawMappings.get(port) ?? []) &&
        ownerPids.every((pid) => helper.ownedPids.includes(pid)) &&
        helper.ownedPorts.includes(port)
    ) &&
    parsedMappings.length === helper.ownedPorts.length
  );
}

function canonicalFixtureCreateCommandValid(command) {
  const startMarker = "const seed = ";
  const endMarker = `; await page.goto(${JSON.stringify(POSTS_LIST_URL)})`;
  const start = command.indexOf(startMarker);
  const end = command.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) return false;
  let seed;
  try {
    seed = JSON.parse(command.slice(start + startMarker.length, end));
  } catch {
    return false;
  }
  if (
    typeof seed?.title !== "string" ||
    !/^[A-Za-z0-9 _.-]{1,120}$/u.test(seed.title) ||
    typeof seed?.slug !== "string" ||
    !/^[a-z0-9-]{1,120}$/u.test(seed.slug)
  ) {
    return false;
  }
  const fixture = { title: seed.title, slug: seed.slug };
  return (
    sameRawValue(seed.createPayload, expectedFixtureCreatePayload(fixture)) &&
    sameRawValue(seed.cleanPayload, expectedFixtureCleanPayload(fixture)) &&
    command === expectedFixtureCreateCommand(fixture)
  );
}

function failureScenarioCommandValid(record, smoke) {
  const match = /^scenario:([^:]+):(.+)$/u.exec(record.scope);
  if (!match) return false;
  const scenario = smoke.acquired.scenarios.find(({ id }) => id === match[1]);
  if (!scenario) return false;
  const fixture = smoke.acquired.fixtures.find(({ id }) => id === scenario.fixtureId);
  if (!fixture) return false;
  const suffix = match[2];
  const screenshotPath = (phase) =>
    `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-${phase}.png`;
  const simple = new Map([
    ["log-reset", SMOKE_LOG_RESET],
    ["theme", expectedThemeApplyCommand(scenario.theme)],
    ["setup", expectedScenarioSetupCommand(scenario, fixture)],
    ["assertion", expectedEvidenceAssertionCommand(scenario)],
    ["console-errors", SMOKE_CONSOLE_ERROR_READ],
    ["console-warnings", SMOKE_CONSOLE_WARNING_READ],
    ["page-errors", SMOKE_PAGE_ERROR_READ],
    ["reset", expectedScenarioResetCommand(scenario, fixture)],
  ]);
  if (simple.has(suffix)) return record.command === simple.get(suffix);
  if (suffix === "action") {
    return expectedScenarioActionCommands(scenario, fixture).includes(record.command);
  }
  if (suffix === "transient-assertion") {
    return expectedTransientAssertionCommands(scenario).includes(record.command);
  }
  if (suffix === "route") {
    const mode = expectedScenarioRouteMode(scenario.kind);
    return (
      mode !== null &&
      record.command === expectedRouteInstallCommand(expectedScenarioRoutePattern(fixture), mode)
    );
  }
  if (suffix === "unroute") {
    return record.command === expectedRouteRemovalCommand(expectedScenarioRoutePattern(fixture));
  }
  if (/^after-(?:unroute|reset):console-errors$/u.test(suffix)) {
    return record.command === SMOKE_CONSOLE_ERROR_READ;
  }
  if (/^after-(?:unroute|reset):console-warnings$/u.test(suffix)) {
    return record.command === SMOKE_CONSOLE_WARNING_READ;
  }
  if (/^after-(?:unroute|reset):page-errors$/u.test(suffix)) {
    return record.command === SMOKE_PAGE_ERROR_READ;
  }
  const responsiveMatch = /^(resize|probe):(390|768|900|1024)$/u.exec(suffix);
  if (responsiveMatch) {
    const width = Number(responsiveMatch[2]);
    return responsiveMatch[1] === "resize"
      ? record.command === `playwright-cli -s=wf543smoke --raw resize ${width} ${RESPONSIVE_HEIGHT}`
      : record.command === expectedResponsiveProbeCommand(fixture);
  }
  const screenshotMatch = /^(transient|final)-screenshot(?:-(stat|hash|signature))?$/u.exec(suffix);
  if (screenshotMatch) {
    const path = screenshotPath(screenshotMatch[1]);
    if (screenshotMatch[1] === "transient" && !TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)) {
      return false;
    }
    if (!screenshotMatch[2]) return record.command === expectedScreenshotCaptureCommand(path);
    if (screenshotMatch[2] === "stat")
      return record.command === expectedScreenshotStatCommand(path);
    if (screenshotMatch[2] === "hash")
      return record.command === expectedScreenshotHashCommand(path);
    return record.command === expectedScreenshotSignatureCommand(path);
  }
  return false;
}

function urlPathMatches(value, expectedPath) {
  try {
    return new URL(value).pathname === expectedPath;
  } catch {
    return false;
  }
}

function fixtureCreateOutputValid(output, fixture) {
  return (
    output?.id === fixture.id &&
    output?.responsePostId === fixture.id &&
    output?.title === fixture.title &&
    output?.slug === fixture.slug &&
    sameRawValue(output?.cleanPayload, fixture.cleanPayload) &&
    output?.newPostControlName === "New post" &&
    output?.drawerTitle === "Create New Post" &&
    output?.createButtonName === "Create Post" &&
    output?.openAfterCreateEnabled === fixture.openAfterCreateEnabled &&
    sameRawValue(output?.createRequestPayload, expectedFixtureCreatePayload(fixture)) &&
    Number.isInteger(output?.createResponseStatus) &&
    output.createResponseStatus >= 200 &&
    output.createResponseStatus < 300 &&
    urlPathMatches(output?.createResponseUrl, "/admin/api/posts")
  );
}

function fixtureProvenanceOutputValid(output, fixture) {
  const expectedHref = `/admin/posts/${encodeURIComponent(fixture.id)}`;
  return (
    output?.id === fixture.id &&
    output?.responsePostId === fixture.id &&
    output?.postCreateRouteId === fixture.id &&
    output?.postCreateUrl ===
      (fixture.openAfterCreateEnabled ? fixture.editorUrl : POSTS_LIST_URL) &&
    output?.editorUrl === fixture.editorUrl &&
    output?.editorUrlId === fixture.id &&
    output?.editorTitle === fixture.title &&
    output?.domTitleAccessibleName === `Edit post: ${fixture.title}` &&
    output?.domHref === expectedHref &&
    output?.domHrefId === fixture.id
  );
}

function failureFixtureReceiptValid(record, smoke) {
  const match = /^fixture:([^:]+):(create|provenance|delete|absence)$/u.exec(record.scope);
  if (!match || record.status !== 0 || !rawPlaywrightReceiptValid(record)) return false;
  const fixture = smoke.acquired.fixtures.find(({ id }) => id === match[1]);
  if (!fixture || !sameRawValue(fixture.cleanPayload, expectedFixtureCleanPayload(fixture))) {
    return false;
  }
  const output = record.parsedOutput;
  if (match[2] === "create") {
    return (
      record.command === expectedFixtureCreateCommand(fixture) &&
      fixtureCreateOutputValid(output, fixture)
    );
  }
  if (match[2] === "provenance") {
    return (
      record.command === expectedFixtureProvenanceCommand(fixture) &&
      fixtureProvenanceOutputValid(output, fixture)
    );
  }
  if (match[2] === "delete") {
    return (
      record.command === expectedFixtureDeleteCommand(fixture) &&
      output?.id === fixture.id &&
      output?.deleted === true &&
      Number.isInteger(output?.responseStatus) &&
      output.responseStatus >= 200 &&
      output.responseStatus < 300 &&
      urlPathMatches(output?.responseUrl, `/admin/api/posts/${encodeURIComponent(fixture.id)}`) &&
      output?.rowTitleAccessibleName === `Edit post: ${fixture.title}` &&
      output?.domHref === `/admin/posts/${encodeURIComponent(fixture.id)}` &&
      output?.actionAccessibleName === `Actions for ${fixture.title}` &&
      output?.menuItemName === "Delete" &&
      output?.dialogTitle === "Delete post?" &&
      output?.confirmButtonName === "Delete post" &&
      output?.domLinkCount === 0
    );
  }
  return (
    record.command === expectedFixtureAbsenceCommand(fixture) &&
    output?.id === fixture.id &&
    output?.absent === true &&
    output?.listUrl === POSTS_LIST_URL &&
    output?.reloaded === true &&
    output?.domLinkCount === 0
  );
}

function failureResponsiveEvidence(smoke, scenario, fixture) {
  const prefix = `scenario:${scenario.id}:`;
  const records = smoke.commandTimeline.slice(0, smoke.failedAtSequence - 1);
  const widths = RESPONSIVE_WIDTHS.map((width) => ({
    width,
    resizeReceipt: records.find(({ scope }) => scope === `${prefix}resize:${width}`),
    probeReceipt: records.find(({ scope }) => scope === `${prefix}probe:${width}`),
  }));
  if (widths.some(({ resizeReceipt, probeReceipt }) => !resizeReceipt || !probeReceipt)) {
    return null;
  }
  return { widths };
}

function failureScenarioReceiptValid(record, smoke) {
  if (
    record.status !== 0 ||
    !rawPlaywrightReceiptValid(record) ||
    !failureScenarioCommandValid(record, smoke)
  ) {
    return false;
  }
  const match = /^scenario:([^:]+):(.+)$/u.exec(record.scope);
  const scenario = smoke.acquired.scenarios.find(({ id }) => id === match?.[1]);
  const fixture = smoke.acquired.fixtures.find(({ id }) => id === scenario?.fixtureId);
  if (!match || !scenario || !fixture) return false;
  const suffix = match[2];
  const output = record.parsedOutput;
  if (suffix === "log-reset") return output === true;
  if (suffix === "theme") {
    return (
      output?.preference === scenario.theme &&
      output?.resolved === scenario.theme &&
      typeof output?.url === "string" &&
      output.url.startsWith(`${ADMIN_ORIGIN}/admin/`)
    );
  }
  if (suffix === "setup") {
    return (
      output?.ready === true &&
      output?.scenarioId === scenario.id &&
      output?.fixtureId === fixture.id &&
      output?.setupValue === scenario.id &&
      output?.url === scenarioTargetUrl(scenario, fixture)
    );
  }
  if (suffix === "route") {
    return (
      output?.pattern === expectedScenarioRoutePattern(fixture) &&
      output?.installed === true &&
      output?.mode === expectedScenarioRouteMode(scenario.kind)
    );
  }
  if (suffix === "unroute") {
    return (
      output?.pattern === expectedScenarioRoutePattern(fixture) &&
      output?.removed === true &&
      output?.releasedPending === 0
    );
  }
  if (suffix === "transient-assertion") {
    return transientEvidenceValid(
      { ...scenario, commandResults: { transientAssertion: [record] } },
      fixture
    );
  }
  if (suffix === "assertion") {
    const responsive =
      scenario.kind === "mid-viewport-metadata"
        ? failureResponsiveEvidence(smoke, scenario, fixture)
        : null;
    return validateScenarioByKind({ ...scenario, evidence: output, responsive }, fixture);
  }
  if (["console-errors", "console-warnings", "page-errors"].includes(suffix)) {
    return Array.isArray(output) && output.length === 0;
  }
  if (/^after-(?:unroute|reset):(?:console-errors|console-warnings|page-errors)$/u.test(suffix)) {
    return lifecycleLogReceiptValid(record);
  }
  if (suffix === "reset") {
    return resetEvidenceValid(output, scenario, fixture);
  }
  const responsiveMatch = /^(resize|probe):(390|768|900|1024)$/u.exec(suffix);
  if (responsiveMatch?.[1] === "resize") {
    return record.stdout === "\n" && output === null;
  }
  if (responsiveMatch?.[1] === "probe") {
    const width = Number(responsiveMatch[2]);
    const nodeKeys = [
      "fallbackMetadata",
      "fallbackStatus",
      "fallbackAuthor",
      "fallbackDate",
      "columnStatus",
      "columnAuthor",
      "columnDate",
      "row",
      "table",
    ];
    return (
      output?.width === width &&
      output?.matchedRowCount === 1 &&
      output?.rowPostId === fixture.id &&
      output?.titleAccessibleName === `Edit post: ${fixture.title}` &&
      output?.checkboxAccessibleName === `Select ${fixture.title}` &&
      output?.actionAccessibleName === `Actions for ${fixture.title}` &&
      output?.rowWidth > 0 &&
      output?.tableWidth > 0 &&
      nodeKeys.every((key) => output?.nodes?.[key]?.exists === true)
    );
  }
  const screenshotMatch = /^(transient|final)-screenshot(?:-(stat|hash|signature))?$/u.exec(suffix);
  if (screenshotMatch) {
    const path = `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-${screenshotMatch[1]}.png`;
    if (!screenshotMatch[2]) {
      return (
        record.stdout === expectedScreenshotStdout(path) &&
        sameRawValue(output, { reportedPath: repoRelativePath(path) })
      );
    }
    if (screenshotMatch[2] === "stat") {
      return (
        Number.isInteger(output?.size) &&
        output.size > 45 &&
        typeof output?.inode === "string" &&
        Number.isFinite(output?.mtimeEpochMs) &&
        record.stdout === JSON.stringify(output)
      );
    }
    if (screenshotMatch[2] === "hash") {
      return (
        /^[a-f0-9]{64}$/u.test(output?.sha256 ?? "") &&
        output?.path === path &&
        record.stdout === `${output.sha256}  ${path}\n`
      );
    }
    return output?.signatureHex === "89504e470d0a1a0a" && record.stdout === "89504e470d0a1a0a\n";
  }
  if (suffix !== "action") return false;
  const actionIndex =
    smoke.commandTimeline
      .slice(0, record.sequence)
      .filter(({ scope }) => scope === `scenario:${scenario.id}:action`).length - 1;
  if (actionIndex < 0) return false;
  if (
    ["clean-close", "dirty-delayed-close", "failure-retry"].includes(scenario.kind) ||
    (scenario.kind === "double-close" && actionIndex === 0) ||
    (scenario.kind === "pending-revert-restoration" && actionIndex === 0)
  ) {
    return record.stdout === "\n" && output === null;
  }
  if (scenario.kind === "pending-revert-restoration") {
    return output?.edited === true && output?.closeActivated === true;
  }
  if (scenario.kind === "double-close") return output?.domClickEvents === 2;
  if (scenario.kind === "table-keyboard") {
    if (actionIndex === 0) return output?.key === "Enter" && output?.url === fixture.editorUrl;
    if (actionIndex === 1) return output?.key === "Space" && output?.toggled === true;
    return (
      actionIndex === 2 &&
      output?.key === "Enter" &&
      output?.menuOpened === true &&
      output?.dismissed === true
    );
  }
  return (
    scenario.kind === "mid-viewport-metadata" &&
    output?.ariaLabel === `Edit post: ${fixture.title}` &&
    output?.href === `/admin/posts/${encodeURIComponent(fixture.id)}`
  );
}

function failureNeedsProvenanceCleanupLogs(smoke) {
  const attempted = smoke.commandTimeline.slice(0, smoke.failedAtSequence);
  const provenanceIndex = attempted.findIndex(({ scope }) =>
    /^fixture:[^:]+:provenance$/u.test(scope)
  );
  if (provenanceIndex < 0) return false;
  const expectedScopes = [
    "lifecycle:after-provenance:console-errors",
    "lifecycle:after-provenance:console-warnings",
    "lifecycle:after-provenance:page-errors",
  ];
  const boundary = attempted.slice(provenanceIndex + 1, provenanceIndex + 4);
  return !expectedScopes.every(
    (scope, index) => boundary[index]?.scope === scope && lifecycleLogReceiptValid(boundary[index])
  );
}

function failureCleanupCommandValid(record, smoke) {
  const expected = new Map();
  const addLogCommands = (resourceId) => {
    for (const entry of expectedLogReadPlan(`cleanup:log:${resourceId}`)) {
      expected.set(entry.scope, entry.command);
    }
  };
  if (failureNeedsProvenanceCleanupLogs(smoke)) {
    addLogCommands("after-provenance");
  }
  for (const route of smoke.acquired.routes) {
    expected.set(`cleanup:route:${route.pattern}`, expectedRouteRemovalCommand(route.pattern));
    addLogCommands(`route:${route.pattern}:after-unroute`);
  }
  for (const fixture of smoke.acquired.fixtures) {
    expected.set(`cleanup:fixture-delete:${fixture.id}`, expectedFixtureDeleteCommand(fixture));
    addLogCommands(`fixture:${fixture.id}:after-delete`);
    expected.set(`cleanup:fixture-absence:${fixture.id}`, expectedFixtureAbsenceCommand(fixture));
    addLogCommands(`fixture:${fixture.id}:after-absence`);
  }
  if (smoke.acquired.themeBefore) {
    expected.set(
      "cleanup:theme:admin-theme",
      expectedThemeStateRestoreCommand(smoke.acquired.themeBefore)
    );
  }
  if (smoke.acquired.setupBefore) {
    expected.set(
      `cleanup:setup:${SMOKE_SETUP_STORAGE_KEY}`,
      expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value)
    );
  }
  if (smoke.acquired.browserSession) {
    addLogCommands("final");
    expected.set("cleanup:route:route-list", "playwright-cli -s=wf543smoke --raw route-list");
    expected.set("cleanup:browser:wf543smoke", "playwright-cli -s=wf543smoke --raw close");
    expected.set("cleanup:browser:session-list", "playwright-cli --raw list");
  }
  const helper = smoke.acquired.helper;
  if (helper?.identityComplete === true) {
    expected.set(`cleanup:helper:${helper.rootPid}`, expectedHelperStopCommand(helper));
  }
  for (const pid of helper?.ownedPids ?? []) {
    expected.set(`cleanup:pid:${pid}`, expectedProcessCheckCommand(pid));
  }
  for (const port of helper?.ownedPorts ?? []) {
    expected.set(`cleanup:port:${port}`, expectedPortCheckCommand(port));
  }
  return record.command === expected.get(record.scope);
}

function expectedLogReadPlan(scope) {
  return [
    { scope: `${scope}:console-errors`, command: SMOKE_CONSOLE_ERROR_READ },
    { scope: `${scope}:console-warnings`, command: SMOKE_CONSOLE_WARNING_READ },
    { scope: `${scope}:page-errors`, command: SMOKE_PAGE_ERROR_READ },
  ];
}

function expectedFailureScenarioPlan(scenario, fixture) {
  const scope = `scenario:${scenario.id}`;
  const plan = [
    { scope: `${scope}:log-reset`, command: SMOKE_LOG_RESET },
    { scope: `${scope}:theme`, command: expectedThemeApplyCommand(scenario.theme) },
    { scope: `${scope}:setup`, command: expectedScenarioSetupCommand(scenario, fixture) },
  ];
  const routeMode = expectedScenarioRouteMode(scenario.kind);
  if (routeMode !== null) {
    plan.push({
      scope: `${scope}:route`,
      command: expectedRouteInstallCommand(expectedScenarioRoutePattern(fixture), routeMode),
    });
  }
  for (const command of expectedScenarioActionCommands(scenario, fixture)) {
    plan.push({ scope: `${scope}:action`, command });
  }
  for (const command of expectedTransientAssertionCommands(scenario)) {
    plan.push({ scope: `${scope}:transient-assertion`, command });
  }
  const screenshotEntries = (phase) => {
    const path = `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-${phase}.png`;
    return [
      { scope: `${scope}:${phase}-screenshot`, command: expectedScreenshotCaptureCommand(path) },
      { scope: `${scope}:${phase}-screenshot-stat`, command: expectedScreenshotStatCommand(path) },
      { scope: `${scope}:${phase}-screenshot-hash`, command: expectedScreenshotHashCommand(path) },
      {
        scope: `${scope}:${phase}-screenshot-signature`,
        command: expectedScreenshotSignatureCommand(path),
      },
    ];
  };
  if (TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)) {
    plan.push(...screenshotEntries("transient"));
  }
  if (scenario.kind === "mid-viewport-metadata") {
    for (const width of RESPONSIVE_WIDTHS) {
      plan.push(
        {
          scope: `${scope}:resize:${width}`,
          command: `playwright-cli -s=wf543smoke --raw resize ${width} ${RESPONSIVE_HEIGHT}`,
        },
        { scope: `${scope}:probe:${width}`, command: expectedResponsiveProbeCommand(fixture) }
      );
    }
  }
  plan.push(
    { scope: `${scope}:assertion`, command: expectedEvidenceAssertionCommand(scenario) },
    { scope: `${scope}:console-errors`, command: SMOKE_CONSOLE_ERROR_READ },
    { scope: `${scope}:console-warnings`, command: SMOKE_CONSOLE_WARNING_READ },
    { scope: `${scope}:page-errors`, command: SMOKE_PAGE_ERROR_READ },
    ...screenshotEntries("final")
  );
  if (routeMode !== null) {
    plan.push({
      scope: `${scope}:unroute`,
      command: expectedRouteRemovalCommand(expectedScenarioRoutePattern(fixture)),
    });
    plan.push(...expectedLogReadPlan(`${scope}:after-unroute`));
  }
  plan.push(
    { scope: `${scope}:reset`, command: expectedScenarioResetCommand(scenario, fixture) },
    ...expectedLogReadPlan(`${scope}:after-reset`)
  );
  return plan;
}

function expectedFailureLaterPlan(smoke) {
  const plan = [];
  for (const fixture of smoke.acquired.fixtures) {
    plan.push(
      {
        scope: `fixture:${fixture.id}:create`,
        command: expectedFixtureCreateCommand(fixture),
      },
      ...expectedLogReadPlan("lifecycle:after-create"),
      {
        scope: `fixture:${fixture.id}:provenance`,
        command: expectedFixtureProvenanceCommand(fixture),
      },
      ...expectedLogReadPlan("lifecycle:after-provenance")
    );
  }
  for (const scenario of smoke.acquired.scenarios) {
    const fixture = smoke.acquired.fixtures.find(({ id }) => id === scenario.fixtureId);
    if (!fixture) return [];
    plan.push(...expectedFailureScenarioPlan(scenario, fixture));
  }
  for (const fixture of smoke.acquired.fixtures) {
    plan.push(
      {
        scope: `fixture:${fixture.id}:delete`,
        command: expectedFixtureDeleteCommand(fixture),
      },
      ...expectedLogReadPlan("lifecycle:after-delete"),
      {
        scope: `fixture:${fixture.id}:absence`,
        command: expectedFixtureAbsenceCommand(fixture),
      },
      ...expectedLogReadPlan("lifecycle:after-absence")
    );
  }
  if (smoke.acquired.themeBefore !== null) {
    plan.push(
      {
        scope: "state:theme-restore",
        command: expectedThemeStateRestoreCommand(smoke.acquired.themeBefore),
      },
      { scope: "state:theme-after", command: expectedThemeStateReadCommand() }
    );
  }
  if (smoke.acquired.setupBefore !== null) {
    plan.push(
      {
        scope: "state:setup-restore",
        command: expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value),
      },
      { scope: "state:setup-after", command: expectedSetupStateReadCommand() }
    );
  }
  if (smoke.acquired.helper?.rootPid !== null && smoke.acquired.helper !== null) {
    plan.push(
      {
        scope: "helper:pid-tree",
        command: expectedPidTreeDiscoveryCommand(smoke.acquired.helper.rootPid),
      },
      {
        scope: "helper:port-ownership",
        command: expectedPortOwnershipDiscoveryCommand(smoke.acquired.helper.ownedPids),
      }
    );
  }
  if (smoke.acquired.browserSession) {
    plan.push(...expectedLogReadPlan("lifecycle:final"));
  }
  if (failureNeedsProvenanceCleanupLogs(smoke)) {
    plan.push(...expectedLogReadPlan("cleanup:log:after-provenance"));
  }
  for (const route of smoke.acquired.routes) {
    plan.push(
      {
        scope: `cleanup:route:${route.pattern}`,
        command: expectedRouteRemovalCommand(route.pattern),
      },
      ...expectedLogReadPlan(`cleanup:log:route:${route.pattern}:after-unroute`)
    );
  }
  for (const fixture of smoke.acquired.fixtures) {
    plan.push(
      {
        scope: `cleanup:fixture-delete:${fixture.id}`,
        command: expectedFixtureDeleteCommand(fixture),
      },
      ...expectedLogReadPlan(`cleanup:log:fixture:${fixture.id}:after-delete`),
      {
        scope: `cleanup:fixture-absence:${fixture.id}`,
        command: expectedFixtureAbsenceCommand(fixture),
      },
      ...expectedLogReadPlan(`cleanup:log:fixture:${fixture.id}:after-absence`)
    );
  }
  if (smoke.acquired.themeBefore !== null) {
    plan.push({
      scope: "cleanup:theme:admin-theme",
      command: expectedThemeStateRestoreCommand(smoke.acquired.themeBefore),
    });
  }
  if (smoke.acquired.setupBefore !== null) {
    plan.push({
      scope: `cleanup:setup:${SMOKE_SETUP_STORAGE_KEY}`,
      command: expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value),
    });
  }
  if (smoke.acquired.browserSession) {
    plan.push(
      ...expectedLogReadPlan("cleanup:log:final"),
      {
        scope: "cleanup:route:route-list",
        command: "playwright-cli -s=wf543smoke --raw route-list",
      },
      {
        scope: "cleanup:browser:wf543smoke",
        command: "playwright-cli -s=wf543smoke --raw close",
      },
      { scope: "cleanup:browser:session-list", command: "playwright-cli --raw list" }
    );
  }
  const helper = smoke.acquired.helper;
  if (helper?.identityComplete === true) {
    plan.push({
      scope: `cleanup:helper:${helper.rootPid}`,
      command: expectedHelperStopCommand(helper),
    });
  }
  for (const pid of helper?.ownedPids ?? []) {
    plan.push({ scope: `cleanup:pid:${pid}`, command: expectedProcessCheckCommand(pid) });
  }
  for (const port of helper?.ownedPorts ?? []) {
    plan.push({ scope: `cleanup:port:${port}`, command: expectedPortCheckCommand(port) });
  }
  return plan;
}

function failureLaterPrefixValid(smoke) {
  const attempted = smoke.commandTimeline.slice(0, smoke.failedAtSequence);
  const later = attempted.filter(
    ({ scope }) =>
      !/^(?:browser:preflight|bootstrap:|health:|browser:(?:open|email|password|login|logs)|state:(?:theme|setup)-before)/u.test(
        scope
      )
  );
  const recordsValid = later.every((record) => {
    if (
      /^(?:browser:preflight|bootstrap:|health:|browser:(?:open|email|password|login|logs)|state:(?:theme|setup)-before)/u.test(
        record.scope
      )
    ) {
      return true;
    }
    const fixtureMatch = /^fixture:([^:]+):(create|provenance|delete|absence)$/u.exec(record.scope);
    if (fixtureMatch) {
      const fixture = smoke.acquired.fixtures.find(({ id }) => id === fixtureMatch[1]);
      if (fixtureMatch[2] === "create") {
        return fixture
          ? record.command === expectedFixtureCreateCommand(fixture)
          : canonicalFixtureCreateCommandValid(record.command);
      }
      if (!fixture) return false;
      if (fixtureMatch[2] === "provenance") {
        return record.command === expectedFixtureProvenanceCommand(fixture);
      }
      return (
        record.command ===
        (fixtureMatch[2] === "delete"
          ? expectedFixtureDeleteCommand(fixture)
          : expectedFixtureAbsenceCommand(fixture))
      );
    }
    if (
      /^lifecycle:(?:after-create|after-provenance|after-delete|after-absence|final):/u.test(
        record.scope
      )
    ) {
      return record.sequence === smoke.failedAtSequence
        ? lifecycleLogCommandValid(record)
        : lifecycleLogReceiptValid(record);
    }
    if (record.scope.startsWith("scenario:")) {
      return failureScenarioCommandValid(record, smoke);
    }
    if (record.scope === "state:theme-restore") {
      return (
        smoke.acquired.themeBefore !== null &&
        record.command === expectedThemeStateRestoreCommand(smoke.acquired.themeBefore)
      );
    }
    if (record.scope === "state:theme-after") {
      return record.command === expectedThemeStateReadCommand();
    }
    if (record.scope === "state:setup-restore") {
      return (
        smoke.acquired.setupBefore !== null &&
        record.command === expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value)
      );
    }
    if (record.scope === "state:setup-after") {
      return record.command === expectedSetupStateReadCommand();
    }
    if (record.scope === "helper:pid-tree") {
      return (
        smoke.acquired.helper?.rootPid !== null &&
        record.command === expectedPidTreeDiscoveryCommand(smoke.acquired.helper.rootPid)
      );
    }
    if (record.scope === "helper:port-ownership") {
      return (
        smoke.acquired.helper !== null &&
        record.command === expectedPortOwnershipDiscoveryCommand(smoke.acquired.helper.ownedPids)
      );
    }
    if (record.scope.startsWith("cleanup:")) {
      return failureCleanupCommandValid(record, smoke);
    }
    return false;
  });
  if (!recordsValid) return false;
  const expected = expectedFailureLaterPlan(smoke);
  return later.every((record, index) => {
    if (record.scope === expected[index]?.scope && record.command === expected[index]?.command) {
      return true;
    }
    return (
      index === later.length - 1 &&
      record.sequence === smoke.failedAtSequence &&
      /^fixture:[^:]+:create$/u.test(record.scope) &&
      canonicalFixtureCreateCommandValid(record.command) &&
      index === smoke.acquired.fixtures.length
    );
  });
}

function failureHelperOwnershipMatchesTimeline(prefix, helper, helperAttempts) {
  const firstCleanupIndex = prefix.findIndex(({ scope }) => scope.startsWith("cleanup:"));
  const evidencePrefix = firstCleanupIndex < 0 ? prefix : prefix.slice(0, firstCleanupIndex);
  if (
    firstCleanupIndex >= 0 &&
    prefix
      .slice(firstCleanupIndex)
      .some(({ scope }) => scope === "helper:pid-tree" || scope === "helper:port-ownership")
  ) {
    return false;
  }
  const successfulPidTreeReceipts = evidencePrefix.filter(
    ({ scope, status }) => scope === "helper:pid-tree" && status === 0
  );
  const successfulPortReceipts = evidencePrefix.filter(
    ({ scope, status }) => scope === "helper:port-ownership" && status === 0
  );
  if (helper === null) {
    return (
      helperAttempts.length === 0 &&
      successfulPidTreeReceipts.length === 0 &&
      successfulPortReceipts.length === 0
    );
  }
  if (
    helperAttempts.length !== 1 ||
    successfulPidTreeReceipts.length > 1 ||
    successfulPortReceipts.length > 1
  ) {
    return false;
  }

  const launch = helperAttempts[0];
  const launchedRootPid =
    launch.status === 0 && /^\d+\n$/u.test(launch.stdout) ? Number(launch.stdout.trim()) : null;
  if (
    (launchedRootPid === null && helper.rootPid !== null) ||
    (launchedRootPid !== null &&
      (helper.rootPid !== launchedRootPid ||
        String(launch.parsedOutput).trim() !== String(launchedRootPid)))
  ) {
    return false;
  }

  let evidencedPids = launchedRootPid === null ? [] : [launchedRootPid];
  const pidTreeReceipt = successfulPidTreeReceipts[0];
  if (pidTreeReceipt && helper.identityComplete !== true) return false;
  if (pidTreeReceipt) {
    const rawPids = parsePstreePids(pidTreeReceipt.stdout);
    if (
      launchedRootPid === null ||
      pidTreeReceipt.command !== expectedPidTreeDiscoveryCommand(launchedRootPid) ||
      !receiptIntegrityValid(pidTreeReceipt) ||
      !rawPids.includes(launchedRootPid) ||
      !sameUniqueSet(rawPids, pidTreeReceipt.parsedOutput?.discoveredPids ?? [])
    ) {
      return false;
    }
    evidencedPids = rawPids;
  }

  let evidencedPorts = [...FAILURE_BASE_OWNED_PORTS];
  const portReceipt = successfulPortReceipts[0];
  if (portReceipt && !pidTreeReceipt) return false;
  if (portReceipt) {
    const rawMappings = parseLsofMappings(portReceipt.stdout);
    const rawOwnerPids = parseLsofOwnerPids(portReceipt.stdout);
    const rawPorts = parseLsofPorts(portReceipt.stdout);
    const parsedMappings = portReceipt.parsedOutput?.mappings;
    const parsedPorts = Array.isArray(parsedMappings) ? parsedMappings.map(({ port }) => port) : [];
    const parsedOwnerPids = Array.isArray(parsedMappings)
      ? uniqueNumbers(parsedMappings.flatMap(({ ownerPids }) => ownerPids ?? []))
      : [];
    if (
      portReceipt.command !== expectedPortOwnershipDiscoveryCommand(evidencedPids) ||
      !receiptIntegrityValid(portReceipt) ||
      !Array.isArray(parsedMappings) ||
      !FAILURE_BASE_OWNED_PORTS.every((port) => rawPorts.includes(port)) ||
      !sameUniqueSet(rawPorts, parsedPorts) ||
      !sameUniqueSet(rawOwnerPids, parsedOwnerPids) ||
      !parsedOwnerPids.every((pid) => evidencedPids.includes(pid)) ||
      !parsedMappings.every(
        ({ port, ownerPids }) =>
          Number.isInteger(port) &&
          Array.isArray(ownerPids) &&
          sameUniqueSet(ownerPids, rawMappings.get(port) ?? []) &&
          ownerPids.every((pid) => evidencedPids.includes(pid))
      )
    ) {
      return false;
    }
    evidencedPorts = rawPorts;
  }

  return (
    sameUniqueSet(helper.ownedPids, evidencedPids) &&
    sameUniqueSet(helper.ownedPorts, evidencedPorts)
  );
}

function failureInventoryMatchesTimeline(smoke) {
  const prefix = smoke.commandTimeline.slice(0, smoke.failedAtSequence);
  const helperAttempts = prefix.filter((record) => record.scope === "bootstrap:helper");
  const browserOpened = prefix.some(
    (record) => record.scope === "browser:open" && record.status === 0
  );
  const createdIds = prefix
    .filter(
      (record) =>
        /^fixture:[^:]+:create$/u.test(record.scope) &&
        record.status === 0 &&
        typeof record.parsedOutput?.id === "string"
    )
    .map((record) => record.parsedOutput.id);
  const installedRouteRecords = prefix
    .filter(
      (record) =>
        /^scenario:[^:]+:route$/u.test(record.scope) &&
        record.status === 0 &&
        record.parsedOutput?.installed === true
    )
    .map((record) => ({
      pattern: record.parsedOutput.pattern,
      mode: record.parsedOutput.mode,
    }));
  const installedRoutePatterns = [...new Set(installedRouteRecords.map(({ pattern }) => pattern))];
  const attemptedScenarioIds = [
    ...new Set(
      prefix.flatMap((record) => {
        const match = /^scenario:([^:]+):/u.exec(record.scope);
        return match ? [match[1]] : [];
      })
    ),
  ];
  const themeBefore = prefix.find(
    (record) => record.scope === "state:theme-before" && record.status === 0
  );
  const setupBefore = prefix.find(
    (record) => record.scope === "state:setup-before" && record.status === 0
  );
  const helper = smoke.acquired.helper;
  const helperLaunchValid =
    helper === null
      ? helperAttempts.length === 0
      : helperAttempts.length === 1 &&
        helperAttempts[0].command === expectedHelperLaunchCommand(helper.launchNonce) &&
        ((helper.identityComplete === false &&
          helperAttempts[0].status !== 0 &&
          helper.rootPid === null) ||
          (helper.rootPid !== null &&
            helperAttempts[0].status === 0 &&
            helperAttempts[0].stdout === `${helper.rootPid}\n` &&
            String(helperAttempts[0].parsedOutput).trim() === String(helper.rootPid)));
  const identityKeys = ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"];
  const successfulIdentityKeys = prefix
    .filter((record) => record.status === 0 && record.scope.startsWith("bootstrap:identity:"))
    .map((record) => record.scope.slice("bootstrap:identity:".length));
  const identityInventoryValid =
    helper === null
      ? successfulIdentityKeys.length === 0
      : sameSequence(
          successfulIdentityKeys,
          identityKeys.slice(0, successfulIdentityKeys.length)
        ) &&
        helper.identityComplete === (successfulIdentityKeys.length === identityKeys.length) &&
        (helper.ppid !== null) === successfulIdentityKeys.includes("ppid") &&
        (helper.startTicks !== null) === successfulIdentityKeys.includes("startTicks") &&
        (helper.cmdline !== null) === successfulIdentityKeys.includes("cmdline") &&
        (helper.cwd !== null) === successfulIdentityKeys.includes("cwd") &&
        (helper.cmdlineSha256 !== null) === successfulIdentityKeys.includes("cmdlineHash");
  const acquiredFixtureIds = smoke.acquired.fixtures.map(({ id }) => id);
  const acquiredRoutePatterns = smoke.acquired.routes.map(({ pattern }) => pattern);
  const acquiredScenarioIds = smoke.acquired.scenarios.map(({ id }) => id);
  const acquiredScenarioKinds = smoke.acquired.scenarios.map(({ kind }) => kind);
  const acquiredScenariosValid =
    new Set(acquiredScenarioIds).size === acquiredScenarioIds.length &&
    sameUniqueSet(attemptedScenarioIds, acquiredScenarioIds) &&
    sameSequence(acquiredScenarioKinds, SMOKE_KINDS.slice(0, acquiredScenarioKinds.length)) &&
    smoke.acquired.scenarios.every((scenario) => {
      const fixture = smoke.acquired.fixtures.find(({ id }) => id === scenario.fixtureId);
      return fixture?.id === scenario.fixtureId;
    });
  const acquiredFixturesValid = smoke.acquired.fixtures.every(
    (fixture) =>
      fixture.editorUrl === `${POSTS_LIST_URL}/${encodeURIComponent(fixture.id)}` &&
      sameRawValue(fixture.cleanPayload, expectedFixtureCleanPayload(fixture)) &&
      fixture.draftTitleA !== fixture.title &&
      fixture.draftTitleB === fixture.title
  );
  const acquiredRoutesValid = smoke.acquired.routes.every((route) => {
    const latest = installedRouteRecords.findLast(({ pattern }) => pattern === route.pattern);
    return latest?.mode === route.mode;
  });
  return (
    helperLaunchValid &&
    identityInventoryValid &&
    failureHelperOwnershipMatchesTimeline(prefix, helper, helperAttempts) &&
    acquiredScenariosValid &&
    acquiredFixturesValid &&
    acquiredRoutesValid &&
    browserOpened === smoke.acquired.browserSession &&
    sameUniqueSet(createdIds, acquiredFixtureIds) &&
    sameUniqueSet(installedRoutePatterns, acquiredRoutePatterns) &&
    (themeBefore
      ? sameRawValue(themeBefore.parsedOutput, smoke.acquired.themeBefore)
      : smoke.acquired.themeBefore === null) &&
    (setupBefore
      ? sameRawValue(setupBefore.parsedOutput, smoke.acquired.setupBefore)
      : smoke.acquired.setupBefore === null)
  );
}

function validateFailureCleanup(smoke) {
  const failedReceipt = smoke.commandTimeline[smoke.failedAtSequence - 1];
  const timelineValid =
    smoke.commandTimeline.length === smoke.failedAtSequence + smoke.cleanup.records.length &&
    smoke.commandTimeline.every(
      (record, index) =>
        record.sequence === index + 1 && failurePrefixTimelineReceiptIntegrityValid(record, smoke)
    ) &&
    failedReceipt?.scope === smoke.failedScope &&
    failedReceiptShowsFailure(failedReceipt) &&
    failurePhaseMatchesScope(smoke.failurePhase, smoke.failedScope) &&
    failureEarlyPrefixValid(smoke) &&
    failurePrefixReceiptsValid(smoke) &&
    failureLaterPrefixValid(smoke) &&
    failureInventoryMatchesTimeline(smoke);
  if (!timelineValid) return false;

  const expected = [];
  const resourceResults = new Map();
  const addExpected = (item, resource) => {
    expected.push({ ...item, resource });
    if (!resourceResults.has(resource)) resourceResults.set(resource, true);
  };
  const addExpectedLogReads = (resourceId, resource) => {
    const reads = [
      ["console-errors", SMOKE_CONSOLE_ERROR_READ],
      ["console-warnings", SMOKE_CONSOLE_WARNING_READ],
      ["page-errors", SMOKE_PAGE_ERROR_READ],
    ];
    for (const [suffix, command] of reads) {
      addExpected(
        {
          kind: "log",
          resourceId: `${resourceId}:${suffix}`,
          command,
          proof: false,
          succeeded: (record) =>
            lifecycleLogReceiptValid({
              ...record,
              scope: `cleanup:log:${resourceId}:${suffix}`,
            }),
        },
        resource
      );
    }
  };
  if (failureNeedsProvenanceCleanupLogs(smoke)) {
    addExpectedLogReads("after-provenance", "browser:wf543smoke");
  }
  for (const route of smoke.acquired.routes) {
    addExpected(
      {
        kind: "route",
        resourceId: route.pattern,
        command: expectedRouteRemovalCommand(route.pattern),
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.pattern === route.pattern &&
          record.parsedOutput?.removed === true &&
          Number.isInteger(record.parsedOutput?.releasedPending) &&
          record.parsedOutput.releasedPending >= 0,
      },
      `route:${route.pattern}`
    );
    addExpectedLogReads(`route:${route.pattern}:after-unroute`, `route:${route.pattern}`);
  }
  for (const fixture of smoke.acquired.fixtures) {
    const resource = `fixture:${fixture.id}`;
    addExpected(
      {
        kind: "fixture-delete",
        resourceId: fixture.id,
        command: expectedFixtureDeleteCommand(fixture),
        proof: false,
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.id === fixture.id &&
          record.parsedOutput?.deleted === true &&
          typeof record.parsedOutput?.rowTitleAccessibleName === "string" &&
          record.parsedOutput.rowTitleAccessibleName.startsWith("Edit post: ") &&
          record.parsedOutput?.domHref === `/admin/posts/${encodeURIComponent(fixture.id)}` &&
          record.parsedOutput?.actionAccessibleName ===
            `Actions for ${record.parsedOutput.rowTitleAccessibleName.slice("Edit post: ".length)}` &&
          record.parsedOutput?.menuItemName === "Delete" &&
          record.parsedOutput?.dialogTitle === "Delete post?" &&
          record.parsedOutput?.confirmButtonName === "Delete post" &&
          record.parsedOutput?.domLinkCount === 0,
      },
      resource
    );
    addExpectedLogReads(`fixture:${fixture.id}:after-delete`, resource);
    addExpected(
      {
        kind: "fixture-absence",
        resourceId: fixture.id,
        command: expectedFixtureAbsenceCommand(fixture),
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.id === fixture.id &&
          record.parsedOutput?.absent === true &&
          record.parsedOutput?.listUrl === POSTS_LIST_URL &&
          record.parsedOutput?.reloaded === true &&
          record.parsedOutput?.domLinkCount === 0,
      },
      resource
    );
    addExpectedLogReads(`fixture:${fixture.id}:after-absence`, resource);
  }
  if (smoke.acquired.themeBefore) {
    addExpected(
      {
        kind: "theme",
        resourceId: "admin-theme",
        command: expectedThemeStateRestoreCommand(smoke.acquired.themeBefore),
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.storedPreference === smoke.acquired.themeBefore.storedPreference &&
          record.parsedOutput?.darkClass === smoke.acquired.themeBefore.darkClass &&
          record.parsedOutput?.lightClass === smoke.acquired.themeBefore.lightClass,
      },
      "theme:admin-theme"
    );
  }
  if (smoke.acquired.setupBefore) {
    addExpected(
      {
        kind: "setup",
        resourceId: SMOKE_SETUP_STORAGE_KEY,
        command: expectedSetupStateRestoreCommand(smoke.acquired.setupBefore.value),
        succeeded: (record) =>
          record.status === 0 &&
          rawPlaywrightReceiptValid(record) &&
          record.parsedOutput?.value === smoke.acquired.setupBefore.value,
      },
      `setup:${SMOKE_SETUP_STORAGE_KEY}`
    );
  }
  if (smoke.acquired.browserSession) {
    addExpectedLogReads("final", "browser:wf543smoke");
    addExpected(
      {
        kind: "route",
        resourceId: "route-list",
        command: "playwright-cli -s=wf543smoke --raw route-list",
        proof: false,
        succeeded: (record) =>
          record.status === 0 &&
          receiptIntegrityValid(record) &&
          emptyRouteListOutput(record.stdout) &&
          sameRawValue(record.parsedOutput, { patterns: [] }),
      },
      "browser:wf543smoke"
    );
    addExpected(
      {
        kind: "browser",
        resourceId: "wf543smoke",
        command: "playwright-cli -s=wf543smoke --raw close",
        proof: false,
        succeeded: (record) => browserCloseReceiptValid(record),
      },
      "browser:wf543smoke"
    );
    addExpected(
      {
        kind: "browser",
        resourceId: "session-list",
        command: "playwright-cli --raw list",
        succeeded: (record) =>
          record.status === 0 &&
          sessionListReceiptValid(record) &&
          !sessionListContains(record.stdout, "wf543smoke"),
      },
      "browser:wf543smoke"
    );
  }
  const helper = smoke.acquired.helper;
  if (helper?.identityComplete === true) {
    addExpected(
      {
        kind: "helper",
        resourceId: String(helper.rootPid),
        command: expectedHelperStopCommand(helper),
        proof: false,
        succeeded: (record) =>
          record.status === 0 &&
          receiptIntegrityValid(record) &&
          record.stdout === "" &&
          record.parsedOutput === null,
      },
      `helper:${helper.rootPid}`
    );
    for (const pid of helper.ownedPids) {
      addExpected(
        {
          kind: "pid",
          resourceId: String(pid),
          command: expectedProcessCheckCommand(pid),
          succeeded: (record) =>
            record.status === 0 &&
            receiptIntegrityValid(record) &&
            record.stdout === "" &&
            sameRawValue(record.parsedOutput, { absent: true }),
        },
        `helper:${helper.rootPid}`
      );
    }
    for (const port of helper.ownedPorts) {
      addExpected(
        {
          kind: "port",
          resourceId: String(port),
          command: expectedPortCheckCommand(port),
          succeeded: (record) =>
            record.status === 1 &&
            receiptIntegrityValid(record) &&
            record.stdout === "" &&
            sameRawValue(record.parsedOutput, { absent: true }),
        },
        `helper:${helper.rootPid}`
      );
    }
  } else if (helper) {
    const resource = `helper:${helper.rootPid ?? helper.launchNonce}`;
    resourceResults.set(
      resource,
      helper.rootPid !== null && helper.ownedPids.includes(helper.rootPid)
    );
    for (const pid of helper.ownedPids) {
      addExpected(
        {
          kind: "pid",
          resourceId: String(pid),
          command: expectedProcessCheckCommand(pid),
          succeeded: (record) =>
            record.status === 0 &&
            receiptIntegrityValid(record) &&
            record.stdout === "" &&
            sameRawValue(record.parsedOutput, { absent: true }),
        },
        resource
      );
    }
    for (const port of helper.ownedPorts) {
      addExpected(
        {
          kind: "port",
          resourceId: String(port),
          command: expectedPortCheckCommand(port),
          succeeded: (record) =>
            record.status === 1 &&
            receiptIntegrityValid(record) &&
            record.stdout === "" &&
            sameRawValue(record.parsedOutput, { absent: true }),
        },
        resource
      );
    }
  }
  const recordsValid =
    smoke.cleanup.records.length === expected.length &&
    smoke.cleanup.records.every((record, index) => {
      const item = expected[index];
      const matches =
        record.sequence === smoke.failedAtSequence + index + 1 &&
        record.kind === item.kind &&
        record.resourceId === item.resourceId &&
        record.command === item.command &&
        receiptIntegrityValid(record) &&
        (item.kind !== "log" || record.status !== 0 || item.succeeded(record)) &&
        sameRawValue(smoke.commandTimeline[smoke.failedAtSequence + index], {
          sequence: record.sequence,
          scope: `cleanup:${record.kind}:${record.resourceId}`,
          command: record.command,
          status: record.status,
          stdout: record.stdout,
          stderr: record.stderr,
          stdoutSha256: record.stdoutSha256,
          stderrSha256: record.stderrSha256,
          parsedOutput: record.parsedOutput,
        });
      if (item.proof !== false) {
        resourceResults.set(
          item.resource,
          resourceResults.get(item.resource) === true && matches && item.succeeded(record)
        );
      }
      return matches;
    });
  if (resourceResults.get("browser:wf543smoke") === true) {
    for (const resource of resourceResults.keys()) {
      if (resource.startsWith("route:")) resourceResults.set(resource, true);
    }
  }
  const expectedRemaining = [...resourceResults]
    .filter(([, cleared]) => !cleared)
    .map(([resource]) => {
      const separator = resource.indexOf(":");
      return { kind: resource.slice(0, separator), resourceId: resource.slice(separator + 1) };
    });
  const actualRemaining = smoke.cleanup.remainingResources.map(
    ({ kind, resourceId }) => `${kind}:${resourceId}`
  );
  const expectedRemainingKeys = expectedRemaining.map(
    ({ kind, resourceId }) => `${kind}:${resourceId}`
  );
  const nonceReceipts = smoke.commandTimeline.filter(
    ({ command }) => command === NONCE_GENERATION_COMMAND
  );
  const nonceReceipt = nonceReceipts[0];
  const helperAttempt = helper
    ? smoke.commandTimeline.find((record) => record.scope === "bootstrap:helper")
    : null;
  const helperNonceValid =
    !helper ||
    (nonceReceipts.length === 1 &&
      nonceReceipt !== undefined &&
      nonceReceipt.status === 0 &&
      receiptIntegrityValid(nonceReceipt) &&
      nonceReceipt.stdout === helper.launchNonce &&
      nonceReceipt.parsedOutput === helper.launchNonce &&
      !/^wf543-0{32}$/u.test(helper.launchNonce) &&
      helperAttempt !== null &&
      helperAttempt.command === expectedHelperLaunchCommand(helper.launchNonce) &&
      receiptIntegrityValid(helperAttempt) &&
      ((helper.identityComplete === false &&
        helperAttempt.status !== 0 &&
        helper.rootPid === null) ||
        (helper.rootPid !== null &&
          helperAttempt.status === 0 &&
          helperAttempt.stdout === `${helper.rootPid}\n` &&
          String(helperAttempt.parsedOutput).trim() === String(helper.rootPid))));
  return (
    smoke.cleanup.attempted === true &&
    new Set(smoke.acquired.routes.map(({ pattern }) => pattern)).size ===
      smoke.acquired.routes.length &&
    new Set(smoke.acquired.fixtures.map(({ id }) => id)).size === smoke.acquired.fixtures.length &&
    (!helper || helper.identityComplete === false || helper.ownedPids.includes(helper.rootPid)) &&
    (!helper || FAILURE_BASE_OWNED_PORTS.every((port) => helper.ownedPorts.includes(port))) &&
    helperNonceValid &&
    recordsValid &&
    sameUniqueSet(actualRemaining, expectedRemainingKeys)
  );
}

function expectedSuccessCommandTimeline(smoke) {
  const expected = [];
  const push = (scope, record) => {
    expected.push({
      sequence: expected.length + 1,
      scope,
      command: record.command,
      status: record.status,
      stdout: record.stdout,
      stderr: record.stderr,
      stdoutSha256: record.stdoutSha256,
      stderrSha256: record.stderrSha256,
      parsedOutput: record.parsedOutput,
    });
  };
  push("browser:preflight", smoke.preflightSessionList);
  for (const check of smoke.bootstrap.preLaunchPortChecks) push("bootstrap:port", check);
  push("bootstrap:nonce", smoke.bootstrap.nonceGeneration);
  push("bootstrap:timestamp", smoke.helper.serverStartTimestampReceipt);
  push("bootstrap:helper", smoke.bootstrap.helperStart);
  for (const key of ["ppid", "startTicks", "cmdline", "cwd", "cmdlineHash", "nonce"]) {
    push(`bootstrap:identity:${key}`, smoke.helper.identityReceipts[key]);
  }
  push("health:admin", smoke.health.admin);
  push("health:front", smoke.health.front);
  push("browser:open", smoke.bootstrap.browserOpen);
  push("browser:email", smoke.bootstrap.emailFill);
  push("browser:password", smoke.bootstrap.passwordFill);
  push("browser:login", smoke.bootstrap.loginSubmit);
  push("browser:logs", smoke.bootstrap.consoleObservationStart);
  push("state:theme-before", smoke.state.theme.before);
  push("state:setup-before", smoke.state.setup.before);
  for (const fixture of smoke.fixtures) {
    push(`fixture:${fixture.id}:create`, prefixedReceipt(fixture, "create"));
  }
  pushLogReadSet(push, "lifecycle:after-create", smoke.lifecycleLogReads.afterCreate);
  for (const fixture of smoke.fixtures) {
    push(`fixture:${fixture.id}:provenance`, prefixedReceipt(fixture, "provenance"));
  }
  pushLogReadSet(push, "lifecycle:after-provenance", smoke.lifecycleLogReads.afterProvenance);
  for (const scenario of smoke.scenarios) {
    const scope = `scenario:${scenario.id}`;
    push(`${scope}:log-reset`, scenario.commandResults.logReset);
    push(`${scope}:theme`, scenario.commandResults.theme);
    for (const record of scenario.commandResults.setup) push(`${scope}:setup`, record);
    for (const record of scenario.routes.installed) push(`${scope}:route`, record);
    for (const record of scenario.commandResults.action) push(`${scope}:action`, record);
    for (const record of scenario.commandResults.transientAssertion) {
      push(`${scope}:transient-assertion`, record);
    }
    const transientScreenshot = smoke.screenshots.find(
      ({ scenarioId, phase }) => scenarioId === scenario.id && phase === "transient"
    );
    if (TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)) {
      if (!transientScreenshot) return [];
      push(`${scope}:transient-screenshot`, transientScreenshot.captureReceipt);
      push(`${scope}:transient-screenshot-stat`, transientScreenshot.statReceipt);
      push(`${scope}:transient-screenshot-hash`, transientScreenshot.hashReceipt);
      push(`${scope}:transient-screenshot-signature`, transientScreenshot.signatureReceipt);
    } else if (transientScreenshot) {
      return [];
    }
    for (const width of scenario.responsive?.widths ?? []) {
      push(`${scope}:resize:${width.width}`, width.resizeReceipt);
      push(`${scope}:probe:${width.width}`, width.probeReceipt);
    }
    for (const record of scenario.commandResults.assertion) push(`${scope}:assertion`, record);
    push(`${scope}:console-errors`, scenario.commandResults.logReads.consoleErrors);
    push(`${scope}:console-warnings`, scenario.commandResults.logReads.consoleWarnings);
    push(`${scope}:page-errors`, scenario.commandResults.logReads.pageErrors);
    const screenshot = smoke.screenshots.find(
      ({ scenarioId, phase }) => scenarioId === scenario.id && phase === "final"
    );
    if (!screenshot) return [];
    push(`${scope}:final-screenshot`, screenshot.captureReceipt);
    push(`${scope}:final-screenshot-stat`, screenshot.statReceipt);
    push(`${scope}:final-screenshot-hash`, screenshot.hashReceipt);
    push(`${scope}:final-screenshot-signature`, screenshot.signatureReceipt);
    for (const record of scenario.routes.removed) push(`${scope}:unroute`, record);
    if (scenario.routes.removed.length > 0) {
      pushLogReadSet(
        push,
        `${scope}:after-unroute`,
        scenario.commandResults.boundaryLogReads.afterUnroute
      );
    }
    for (const record of scenario.commandResults.reset) push(`${scope}:reset`, record);
    pushLogReadSet(
      push,
      `${scope}:after-reset`,
      scenario.commandResults.boundaryLogReads.afterReset
    );
  }
  for (const fixture of smoke.fixtures) {
    push(`fixture:${fixture.id}:delete`, prefixedReceipt(fixture, "delete"));
    pushLogReadSet(push, "lifecycle:after-delete", smoke.lifecycleLogReads.afterDelete);
    push(`fixture:${fixture.id}:absence`, prefixedReceipt(fixture, "absence"));
    pushLogReadSet(push, "lifecycle:after-absence", smoke.lifecycleLogReads.afterAbsence);
  }
  push("state:theme-restore", smoke.state.theme.restore);
  push("state:theme-after", smoke.state.theme.after);
  push("state:setup-restore", smoke.state.setup.restore);
  push("state:setup-after", smoke.state.setup.after);
  push("helper:pid-tree", smoke.helper.pidTreeDiscovery);
  push("helper:port-ownership", smoke.helper.portOwnershipDiscovery);
  pushLogReadSet(push, "lifecycle:final", smoke.lifecycleLogReads.final);
  push("cleanup:route-list", smoke.cleanup.routeList);
  push("cleanup:browser-close", smoke.cleanup.browserClose);
  push("cleanup:session-list", smoke.cleanup.sessionList);
  push("cleanup:helper-stop", smoke.cleanup.helperStop);
  for (const record of smoke.cleanup.processChecks) push(`cleanup:pid:${record.pid}`, record);
  for (const record of smoke.cleanup.portChecks) push(`cleanup:port:${record.port}`, record);
  return expected;
}

function successCommandTimelineValid(smoke) {
  const expected = expectedSuccessCommandTimeline(smoke);
  return (
    expected.length > 0 &&
    smoke.commandTimeline.length === expected.length &&
    smoke.commandTimeline.every(
      (record, index) =>
        record.sequence === index + 1 &&
        record.scope === expected[index].scope &&
        record.command === expected[index].command &&
        record.status === expected[index].status &&
        record.stdout === expected[index].stdout &&
        record.stderr === expected[index].stderr &&
        record.stdoutSha256 === expected[index].stdoutSha256 &&
        record.stderrSha256 === expected[index].stderrSha256 &&
        successTimelineReceiptIntegrityValid(record, smoke) &&
        sameRawValue(record.parsedOutput, expected[index].parsedOutput)
    )
  );
}

function validateSmoke(smoke) {
  validatePassErrorContract(smoke, "TASK-543 smoke");
  if (smoke.pass !== true) {
    if (!validateFailureCleanup(smoke)) {
      throw new Error("TASK-543 smoke failure cleanup evidence is incomplete");
    }
    throw new Error(`TASK-543 smoke failed: ${smoke.errors.join("; ")}`);
  }

  const kinds = smoke.scenarios.map(({ kind }) => kind);
  const scenarioIds = smoke.scenarios.map(({ id }) => id);
  const themes = smoke.scenarios.map(({ theme }) => theme);
  const fixtureIds = smoke.fixtures.map(({ id }) => id);
  const scenarioFixtureIds = smoke.scenarios.map(({ fixtureId }) => fixtureId);
  const fixturesById = new Map(smoke.fixtures.map((fixture) => [fixture.id, fixture]));
  const scenariosById = new Map(smoke.scenarios.map((scenario) => [scenario.id, scenario]));
  const sharedFixture = smoke.fixtures[0];
  const fixtureTitles = smoke.fixtures.map(({ title }) => title);
  const fixtureSlugs = smoke.fixtures.map(({ slug }) => slug);
  const draftTitlesA = smoke.fixtures.map(({ draftTitleA }) => draftTitleA);
  const independentSentinels = [...fixtureTitles, ...fixtureSlugs, ...draftTitlesA];
  const ownedPids = [smoke.helper.rootPid, ...smoke.helper.childPids];
  const checkedPids = smoke.cleanup.processChecks.map(({ pid }) => pid);
  const checkedPorts = smoke.cleanup.portChecks.map(({ port }) => port);
  const declaredPorts = smoke.helper.ownedPorts;
  const discoveredPorts = smoke.helper.portOwnershipDiscovery.mappings.map(({ port }) => port);
  const rawDiscoveredPorts = parseLsofPorts(smoke.helper.portOwnershipDiscovery.stdout);
  const rawOwnerPids = parseLsofOwnerPids(smoke.helper.portOwnershipDiscovery.stdout);
  const rawPortMappings = parseLsofMappings(smoke.helper.portOwnershipDiscovery.stdout);
  const mappedOwnerPids = uniqueNumbers(
    smoke.helper.portOwnershipDiscovery.mappings.flatMap(({ ownerPids }) => ownerPids)
  );
  const allOwnedPids = new Set(ownedPids);
  const helperIdentity = {
    launchNonce: smoke.helper.launchNonce,
    rootPid: smoke.helper.rootPid,
    ppid: smoke.helper.ppid,
    startTicks: smoke.helper.startTicks,
    cmdlineSha256: smoke.helper.cmdlineSha256,
    cwd: smoke.helper.cwd,
  };
  const helperIdentityCommands = expectedHelperIdentityCommands(helperIdentity);
  const urlPathEquals = (value, expected) => {
    try {
      return new URL(value).pathname === expected;
    } catch {
      return false;
    }
  };
  const fixturesValid = smoke.fixtures.every((fixture) => {
    const create = prefixedReceipt(fixture, "create");
    const provenance = prefixedReceipt(fixture, "provenance");
    const deletion = prefixedReceipt(fixture, "delete");
    const absence = prefixedReceipt(fixture, "absence");
    return (
      create.status === 0 &&
      provenance.status === 0 &&
      deletion.status === 0 &&
      absence.status === 0 &&
      rawPlaywrightReceiptValid(create) &&
      rawPlaywrightReceiptValid(provenance) &&
      rawPlaywrightReceiptValid(deletion) &&
      rawPlaywrightReceiptValid(absence) &&
      fixture.createdId === fixture.id &&
      fixture.provenanceId === fixture.id &&
      fixture.deletedId === fixture.id &&
      fixture.absenceId === fixture.id &&
      fixture.absent === true &&
      sameRawValue(fixture.createPayload, expectedFixtureCreatePayload(fixture)) &&
      sameRawValue(fixture.cleanPayload, expectedFixtureCleanPayload(fixture)) &&
      fixture.createCommand === expectedFixtureCreateCommand(fixture) &&
      fixture.provenanceCommand === expectedFixtureProvenanceCommand(fixture) &&
      fixture.deleteCommand === expectedFixtureDeleteCommand(fixture) &&
      fixture.absenceCommand === expectedFixtureAbsenceCommand(fixture) &&
      fixtureCreateOutputValid(fixture.createParsedOutput, fixture) &&
      fixtureProvenanceOutputValid(fixture.provenanceParsedOutput, fixture) &&
      fixture.draftTitleA !== fixture.title &&
      fixture.draftTitleB === fixture.title &&
      fixture.editorUrl === `${POSTS_LIST_URL}/${encodeURIComponent(fixture.id)}` &&
      fixture.deleteParsedOutput.id === fixture.id &&
      fixture.deleteParsedOutput.deleted === true &&
      fixture.deleteParsedOutput.responseStatus >= 200 &&
      fixture.deleteParsedOutput.responseStatus < 300 &&
      urlPathEquals(
        fixture.deleteParsedOutput.responseUrl,
        `/admin/api/posts/${encodeURIComponent(fixture.id)}`
      ) &&
      fixture.deleteParsedOutput.rowTitleAccessibleName === `Edit post: ${fixture.title}` &&
      fixture.deleteParsedOutput.domHref === `/admin/posts/${encodeURIComponent(fixture.id)}` &&
      fixture.deleteParsedOutput.actionAccessibleName === `Actions for ${fixture.title}` &&
      fixture.deleteParsedOutput.menuItemName === "Delete" &&
      fixture.deleteParsedOutput.dialogTitle === "Delete post?" &&
      fixture.deleteParsedOutput.confirmButtonName === "Delete post" &&
      fixture.deleteParsedOutput.domLinkCount === 0 &&
      fixture.absenceParsedOutput.id === fixture.id &&
      fixture.absenceParsedOutput.absent === true &&
      fixture.absenceParsedOutput.listUrl === POSTS_LIST_URL &&
      fixture.absenceParsedOutput.reloaded === true &&
      fixture.absenceParsedOutput.domLinkCount === 0
    );
  });

  const expectedScreenshotKeys = smoke.scenarios.flatMap((scenario) =>
    expectedScreenshotPhases(scenario.kind).map((phase) => `${scenario.id}:${phase}`)
  );
  const actualScreenshotKeys = smoke.screenshots.map(
    ({ scenarioId, phase }) => `${scenarioId}:${phase}`
  );
  const screenshotPaths = smoke.screenshots.map(({ path }) => path);
  const screenshotInodes = smoke.screenshots.map(({ inode }) => inode);
  const screenshotHashes = smoke.screenshots.map(({ sha256 }) => sha256);
  const scenarioScreenshotPathsValid = smoke.scenarios.every((scenario) => {
    const expectedTransient = TRANSIENT_SCREENSHOT_KINDS.includes(scenario.kind)
      ? `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-transient.png`
      : null;
    const expectedFinal = `${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-${scenario.id}-final.png`;
    return (
      scenario.screenshotPaths.transient === expectedTransient &&
      scenario.screenshotPaths.final === expectedFinal
    );
  });
  const screenshotsValid = smoke.screenshots.every((screenshot) => {
    const scenario = scenariosById.get(screenshot.scenarioId);
    return (
      scenario !== undefined &&
      expectedScreenshotPhases(scenario.kind).includes(screenshot.phase) &&
      screenshotReceiptValid(screenshot, scenario, smoke.helper.serverStartedAtEpochMs)
    );
  });
  const lifecycleLogSets = [
    smoke.lifecycleLogReads.afterCreate,
    smoke.lifecycleLogReads.afterProvenance,
    ...smoke.scenarios.flatMap((scenario) => [
      scenario.commandResults.logReads,
      ...(scenario.commandResults.boundaryLogReads.afterUnroute
        ? [scenario.commandResults.boundaryLogReads.afterUnroute]
        : []),
      scenario.commandResults.boundaryLogReads.afterReset,
    ]),
    smoke.lifecycleLogReads.afterDelete,
    smoke.lifecycleLogReads.afterAbsence,
    smoke.lifecycleLogReads.final,
  ];
  const lifecycleLogsValid = lifecycleLogSets.every(logReadSetValid);
  const derivedConsoleErrors = aggregateLogReadSets(lifecycleLogSets, "consoleErrors");
  const derivedConsoleWarnings = aggregateLogReadSets(lifecycleLogSets, "consoleWarnings");
  const derivedPageErrors = aggregateLogReadSets(lifecycleLogSets, "pageErrors");

  const timestamp = smoke.helper.serverStartTimestampReceipt;
  const nonce = smoke.bootstrap.nonceGeneration;
  const helperStart = smoke.bootstrap.helperStart;
  const helperIdentityValid =
    smoke.commands.nonceGeneration === NONCE_GENERATION_COMMAND &&
    nonce.command === NONCE_GENERATION_COMMAND &&
    nonce.status === 0 &&
    receiptIntegrityValid(nonce) &&
    nonce.stdout === smoke.helper.launchNonce &&
    nonce.parsedOutput === smoke.helper.launchNonce &&
    !/^wf543-0{32}$/u.test(smoke.helper.launchNonce) &&
    timestamp.command === "/usr/bin/date +%s%3N" &&
    timestamp.status === 0 &&
    receiptIntegrityValid(timestamp) &&
    timestamp.stdout === `${smoke.helper.serverStartedAtEpochMs}\n` &&
    sameRawValue(timestamp.parsedOutput, {
      epochMs: smoke.helper.serverStartedAtEpochMs,
    }) &&
    smoke.commands.helper === expectedHelperLaunchCommand(smoke.helper.launchNonce) &&
    helperStart.command === smoke.commands.helper &&
    helperStart.status === 0 &&
    receiptIntegrityValid(helperStart) &&
    helperStart.stdout === `${smoke.helper.rootPid}\n` &&
    String(helperStart.parsedOutput).trim() === String(smoke.helper.rootPid) &&
    smoke.helper.identityReceipts.ppid.command === helperIdentityCommands.ppid &&
    smoke.helper.identityReceipts.ppid.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.ppid) &&
    smoke.helper.identityReceipts.ppid.stdout === String(smoke.helper.ppid) &&
    String(smoke.helper.identityReceipts.ppid.parsedOutput) === String(smoke.helper.ppid) &&
    smoke.helper.identityReceipts.startTicks.command === helperIdentityCommands.startTicks &&
    smoke.helper.identityReceipts.startTicks.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.startTicks) &&
    smoke.helper.identityReceipts.startTicks.stdout === smoke.helper.startTicks &&
    smoke.helper.identityReceipts.startTicks.parsedOutput === smoke.helper.startTicks &&
    smoke.helper.identityReceipts.cmdline.command === helperIdentityCommands.cmdline &&
    smoke.helper.identityReceipts.cmdline.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.cmdline) &&
    smoke.helper.identityReceipts.cmdline.stdout.trim() === smoke.helper.cmdline.trim() &&
    String(smoke.helper.identityReceipts.cmdline.parsedOutput).trim() ===
      smoke.helper.cmdline.trim() &&
    smoke.helper.identityReceipts.cwd.command === helperIdentityCommands.cwd &&
    smoke.helper.identityReceipts.cwd.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.cwd) &&
    smoke.helper.identityReceipts.cwd.stdout === `${smoke.helper.cwd}\n` &&
    smoke.helper.identityReceipts.cwd.parsedOutput === smoke.helper.cwd &&
    smoke.helper.identityReceipts.cmdlineHash.command === helperIdentityCommands.cmdlineHash &&
    smoke.helper.identityReceipts.cmdlineHash.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.cmdlineHash) &&
    smoke.helper.identityReceipts.cmdlineHash.stdout ===
      `${smoke.helper.cmdlineSha256}  /proc/${smoke.helper.rootPid}/cmdline\n` &&
    smoke.helper.identityReceipts.cmdlineHash.parsedOutput === smoke.helper.cmdlineSha256 &&
    smoke.helper.identityReceipts.nonce.command === helperIdentityCommands.nonce &&
    smoke.helper.identityReceipts.nonce.status === 0 &&
    receiptIntegrityValid(smoke.helper.identityReceipts.nonce) &&
    smoke.helper.identityReceipts.nonce.stdout === "" &&
    sameRawValue(smoke.helper.identityReceipts.nonce.parsedOutput, {
      present: true,
      nonce: smoke.helper.launchNonce,
    });

  const preLaunchValid =
    sameSequence(
      smoke.bootstrap.preLaunchPortChecks.map(({ port }) => port),
      [3000, 5173]
    ) &&
    smoke.bootstrap.preLaunchPortChecks.every(
      (record) =>
        record.command === expectedPortCheckCommand(record.port) &&
        record.status === 1 &&
        receiptIntegrityValid(record) &&
        record.stdout === "" &&
        record.absent === true &&
        sameRawValue(record.parsedOutput, { absent: true })
    );
  const bootstrapBrowserValid =
    smoke.bootstrap.browserOpen.command === smoke.commands.browserOpen &&
    browserOpenReceiptValid(smoke.bootstrap.browserOpen) &&
    smoke.bootstrap.emailFill.command === smoke.commands.emailFill &&
    smoke.bootstrap.emailFill.status === 0 &&
    receiptIntegrityValid(smoke.bootstrap.emailFill) &&
    smoke.bootstrap.emailFill.stdout === "" &&
    smoke.bootstrap.emailFill.parsedOutput === null &&
    bootstrapPasswordReceiptValid(smoke) &&
    smoke.bootstrap.loginSubmit.command === smoke.commands.loginSubmit &&
    smoke.bootstrap.loginSubmit.status === 0 &&
    rawPlaywrightReceiptValid(smoke.bootstrap.loginSubmit) &&
    smoke.bootstrap.loginSubmit.parsedOutput.signedIn === true &&
    smoke.bootstrap.loginSubmit.parsedOutput.url.startsWith(`${ADMIN_ORIGIN}/admin/`) &&
    smoke.bootstrap.consoleObservationStart.command === smoke.commands.consoleObservationStart &&
    smoke.bootstrap.consoleObservationStart.status === 0 &&
    rawPlaywrightReceiptValid(smoke.bootstrap.consoleObservationStart) &&
    smoke.bootstrap.consoleObservationStart.parsedOutput === true;

  const healthValid = [
    [smoke.health.admin, smoke.commands.adminProbe],
    [smoke.health.front, smoke.commands.frontProbe],
  ].every(
    ([receipt, command]) =>
      receipt.command === command &&
      receipt.status === 0 &&
      receiptIntegrityValid(receipt) &&
      receipt.stdout === "200" &&
      sameRawValue(receipt.parsedOutput, { httpStatus: 200 })
  );
  const pidTreeValid =
    smoke.helper.pidTreeDiscovery.command ===
      expectedPidTreeDiscoveryCommand(smoke.helper.rootPid) &&
    smoke.helper.pidTreeDiscovery.status === 0 &&
    receiptIntegrityValid(smoke.helper.pidTreeDiscovery) &&
    smoke.helper.pidTreeDiscovery.stdout.length > 0 &&
    sameUniqueSet(smoke.helper.pidTreeDiscovery.discoveredPids, ownedPids) &&
    sameRawValue(smoke.helper.pidTreeDiscovery.parsedOutput, {
      discoveredPids: smoke.helper.pidTreeDiscovery.discoveredPids,
    }) &&
    sameUniqueSet(parsePstreePids(smoke.helper.pidTreeDiscovery.stdout), ownedPids);
  const portOwnershipValid =
    smoke.helper.portOwnershipDiscovery.command ===
      expectedPortOwnershipDiscoveryCommand(ownedPids) &&
    smoke.helper.portOwnershipDiscovery.status === 0 &&
    receiptIntegrityValid(smoke.helper.portOwnershipDiscovery) &&
    smoke.helper.portOwnershipDiscovery.stdout.length > 0 &&
    sameRawValue(smoke.helper.portOwnershipDiscovery.parsedOutput, {
      mappings: smoke.helper.portOwnershipDiscovery.mappings,
    }) &&
    sameUniqueSet(discoveredPorts, declaredPorts) &&
    sameUniqueSet(rawDiscoveredPorts, declaredPorts) &&
    sameUniqueSet(rawOwnerPids, mappedOwnerPids) &&
    smoke.helper.portOwnershipDiscovery.mappings.every(
      ({ port, ownerPids }) =>
        smoke.helper.portOwnershipDiscovery.stdout.includes(`:${port}`) &&
        sameUniqueSet(rawPortMappings.get(port) ?? [], ownerPids) &&
        ownerPids.every(
          (pid) =>
            allOwnedPids.has(pid) && smoke.helper.portOwnershipDiscovery.stdout.includes(`p${pid}`)
        )
    );
  const cleanupChecksValid =
    sameUniqueSet(ownedPids, checkedPids) &&
    sameUniqueSet(smoke.helper.ownedPorts, checkedPorts) &&
    smoke.cleanup.processChecks.every(
      (record) =>
        record.command === expectedProcessCheckCommand(record.pid) &&
        record.status === 0 &&
        receiptIntegrityValid(record) &&
        record.stdout === "" &&
        record.absent === true &&
        sameRawValue(record.parsedOutput, { absent: true })
    ) &&
    smoke.cleanup.portChecks.every(
      (record) =>
        record.command === expectedPortCheckCommand(record.port) &&
        record.status === 1 &&
        receiptIntegrityValid(record) &&
        record.stdout === "" &&
        record.absent === true &&
        sameRawValue(record.parsedOutput, { absent: true })
    );
  const finalCleanupValid =
    smoke.cleanup.routeList.command === smoke.commands.finalRouteList &&
    smoke.cleanup.routeList.status === 0 &&
    receiptIntegrityValid(smoke.cleanup.routeList) &&
    emptyRouteListOutput(smoke.cleanup.routeList.stdout) &&
    sameRawValue(smoke.cleanup.routeList.parsedOutput, { patterns: [] }) &&
    smoke.cleanup.browserClose.command === smoke.commands.browserClose &&
    browserCloseReceiptValid(smoke.cleanup.browserClose) &&
    smoke.cleanup.sessionList.command === smoke.commands.sessionList &&
    sessionListReceiptValid(smoke.cleanup.sessionList) &&
    !sessionListContains(smoke.cleanup.sessionList.stdout, "wf543smoke") &&
    smoke.commands.helperStop === expectedHelperStopCommand(helperIdentity) &&
    smoke.cleanup.helperStop.command === smoke.commands.helperStop &&
    smoke.cleanup.helperStop.status === 0 &&
    receiptIntegrityValid(smoke.cleanup.helperStop) &&
    smoke.cleanup.helperStop.stdout === "" &&
    smoke.cleanup.helperStop.parsedOutput === null;

  if (
    smoke.serverUp !== true ||
    smoke.errors.length !== 0 ||
    smoke.failures.length !== 0 ||
    smoke.preflightSessionList.command !== smoke.commands.sessionList ||
    !sessionListReceiptValid(smoke.preflightSessionList) ||
    sessionListContains(smoke.preflightSessionList.stdout, "wf543smoke") ||
    !healthValid ||
    !preLaunchValid ||
    !helperIdentityValid ||
    !bootstrapBrowserValid ||
    !sameSequence(kinds, SMOKE_KINDS) ||
    new Set(scenarioIds).size !== scenarioIds.length ||
    !themes.includes("light") ||
    !themes.includes("dark") ||
    !smoke.scenarios.every((scenario) =>
      scenarioCommandEvidenceValid(scenario, fixturesById.get(scenario.fixtureId))
    ) ||
    !sameUniqueSet(expectedScreenshotKeys, actualScreenshotKeys) ||
    !scenarioScreenshotPathsValid ||
    new Set(screenshotPaths).size !== screenshotPaths.length ||
    new Set(screenshotInodes).size !== screenshotInodes.length ||
    new Set(screenshotHashes).size !== screenshotHashes.length ||
    !screenshotsValid ||
    !lifecycleLogsValid ||
    !sameRawValue(smoke.consoleErrors, derivedConsoleErrors) ||
    !sameRawValue(smoke.consoleWarnings, derivedConsoleWarnings) ||
    !sameRawValue(smoke.pageErrors, derivedPageErrors) ||
    !successCommandTimelineValid(smoke) ||
    smoke.fixtures.length !== 1 ||
    new Set(fixtureIds).size !== smoke.fixtures.length ||
    new Set(independentSentinels).size !== independentSentinels.length ||
    !scenarioFixtureIds.every((fixtureId) => fixtureId === sharedFixture?.id) ||
    !fixturesValid ||
    !stateRestored(smoke.state.theme, "theme") ||
    !stateRestored(smoke.state.setup, "setup") ||
    !isUserActionCommand(smoke.commands.loginSubmit) ||
    !smoke.helper.ownedPorts.includes(3000) ||
    !smoke.helper.ownedPorts.includes(5173) ||
    smoke.helper.childPids.includes(smoke.helper.rootPid) ||
    !pidTreeValid ||
    !portOwnershipValid ||
    !cleanupChecksValid ||
    !finalCleanupValid ||
    smoke.consoleErrors.length !== 0 ||
    smoke.consoleWarnings.length !== 0 ||
    smoke.pageErrors.length !== 0
  ) {
    throw new Error("TASK-543 smoke invariant failed");
  }
}

const COMMON = `
Repository: ${ROOT}; branch feature/tasks-fixes. Read root AGENTS.md, the full TASK-543
parent/child/leaf contract, current source/tests, required architecture/product/testing docs,
git status and full diff before editing. Build on current on-disk state. Preserve unrelated
work. Code/comments are English. Never stage, commit, push, reset, checkout, suppress a scan,
or touch another task family. Configurable widgets remain Admin Dashboard-only; TASK-543 adds
no widget/editor surface, route, schema, RBAC, CSRF, rate-limit, endpoint, or migration. Use
AdminLink/admin path helpers. Follow React Hooks Compiler rules; never weaken tests. Re-run a
named failing file alone before classifying it. Return exact files changed and exact commands
run; do not claim unexecuted validation.`;

const ORCHESTRATOR_DIRTY = [
  "_docs/_TASKS/TASK-543_Posts_Exit_Safety_and_List_Accessibility.md",
  "_docs/_TASKS/TASK-543-01-Autosave-Flush-Before-Close.md",
  "_docs/_TASKS/TASK-543-01-L01-Wait-For-Dirty-Draft-And-Remain-On-Failure.md",
  "_docs/_TASKS/TASK-543-02-Posts-Table-Keyboard-And-Metadata-Parity.md",
  "_docs/_TASKS/TASK-543-02-L01-Remove-Row-Click-And-Restore-Mid-Viewport-Metadata.md",
  "_docs/_TASKS/TASK-543-03-Tests-Smoke-And-Closure.md",
  "_docs/_TASKS/TASK-543-03-L01-Close-Failure-Keyboard-Viewport-Flows-And-Closure.md",
  "_docs/_TASKS/README.md",
  "_docs/_workflows/task-543-implement.mjs",
];

const LEAVES = [
  {
    id: "543-01-L01",
    contract: `${TASKS}/TASK-543-01-L01-Wait-For-Dirty-Draft-And-Remain-On-Failure.md`,
    allowed: [
      "core/admin/ui/posts/editor/hooks/usePostAutosave.ts",
      "core/admin/ui/posts/editor/hooks/usePostEditorState.ts",
      "core/admin/ui/posts/editor/PostBlockEditorShell.tsx",
      "core/admin/ui/posts/editor/PostEditorTopBar.tsx",
      "core/admin/ui/posts/editor/header/PostEditorHeader.tsx",
      "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx",
      "tests/vitest/ui/post-editor-state-hook-wave.test.tsx",
      "tests/vitest/ui/post-block-editor-shell-wave.test.tsx",
      "tests/vitest/ui-integration/post-autosave-flow.test.tsx",
    ],
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && bunx vitest run --config vitest.config.ts " +
      "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx " +
      "tests/vitest/ui/post-editor-state-hook-wave.test.tsx " +
      "tests/vitest/ui/post-block-editor-shell-wave.test.tsx " +
      "tests/vitest/ui-integration/post-autosave-flow.test.tsx",
  },
  {
    id: "543-02-L01",
    contract: `${TASKS}/TASK-543-02-L01-Remove-Row-Click-And-Restore-Mid-Viewport-Metadata.md`,
    allowed: [
      "core/admin/ui/posts/PostsTable.tsx",
      "core/admin/ui/pages/PageRowActions.tsx",
      "tests/vitest/ui/posts-table-wave.test.tsx",
      "tests/vitest/ui-integration/post-list-restyle.test.tsx",
      "tests/vitest/ui/page-row-actions.test.tsx",
    ],
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && bunx vitest run --config vitest.config.ts " +
      "tests/vitest/ui/posts-table-wave.test.tsx " +
      "tests/vitest/ui-integration/post-list-restyle.test.tsx " +
      "tests/vitest/ui/page-row-actions.test.tsx " +
      "tests/vitest/ui/page-table-wave.test.tsx",
  },
];

function extractSmokeRunCodeSource(command) {
  const prefix = `${SMOKE_SESSION_PREFIX}run-code '`;
  if (!command.startsWith(prefix) || !command.endsWith("'")) {
    throw new Error("TASK-543 self-test run-code command is invalid");
  }
  return command.slice(prefix.length, -1);
}

async function runTask543CodeQlSelfTest() {
  const assert = (condition, label) => {
    if (!condition) throw new Error(`TASK-543 CodeQL self-test failed: ${label}`);
  };
  const expectFailure = async (operation, label) => {
    let failed = false;
    try {
      await operation();
    } catch {
      failed = true;
    }
    assert(failed, label);
  };
  const finalOperations = {
    "clean-close": "assert-clean-close",
    "dirty-delayed-close": "assert-dirty-delayed-close",
    "pending-revert-restoration": "assert-pending-revert-restoration",
    "failure-retry": "assert-failure-retry",
    "double-close": "assert-double-close",
    "table-keyboard": "assert-table-keyboard",
    "mid-viewport-metadata": "assert-mid-viewport-metadata",
  };
  const transientOperations = {
    "dirty-delayed-close": "assert-transient-dirty-delayed-close",
    "pending-revert-restoration": "assert-transient-pending-revert-restoration",
    "failure-retry": "assert-transient-failure-retry",
    "double-close": "assert-transient-double-close",
  };
  const zeroTransientKinds = ["clean-close", "table-keyboard", "mid-viewport-metadata"];
  const operationIds = [
    ...Object.values(finalOperations),
    ...Object.values(transientOperations),
    "reset-scenario",
  ];
  let maximumCommandBytes = 0;
  const selfTestFixture = {
    id: "fixture-1",
    title: "Original title",
    editorUrl: `${POSTS_LIST_URL}/fixture-1`,
    draftTitleA: "Draft A",
    draftTitleB: "Original title",
    cleanPayload: {
      slug: "original-title",
      data: { version: 1 },
      tags: ["self-test"],
      taxonomy: { category: "security" },
      seo: { title: "Original title" },
    },
  };
  const compileCommand = (command, label) => {
    const source = extractSmokeRunCodeSource(command);
    const commandBytes = Buffer.byteLength(command, "utf8");
    maximumCommandBytes = Math.max(maximumCommandBytes, commandBytes);
    assert(isFullSmokeCliCommand(command), `${label} is not a complete smoke command`);
    assert(commandBytes < RUN_CODE_COMMAND_MAX_BYTES, `${label} command exceeds its byte budget`);
    assert(source.includes(`wf543-operation:${label}`), `${label} operation marker is absent`);
    for (const otherOperation of operationIds) {
      if (otherOperation !== label) {
        assert(
          !source.includes(`wf543-operation:${otherOperation}`),
          `${label} contains the ${otherOperation} operation marker`
        );
      }
    }
    const execute = new Script(`(${source})`, {
      filename: `task-543-${label}.codeql-self-test.js`,
    }).runInThisContext();
    assert(typeof execute === "function", `${label} did not compile to a function`);
    return { execute, source };
  };
  const createAssertionPage = (kind, transient) => {
    const basePath = `/admin/api/posts/${encodeURIComponent(selfTestFixture.id)}`;
    const draftText =
      kind === "pending-revert-restoration"
        ? selfTestFixture.draftTitleB
        : selfTestFixture.draftTitleA;
    const initialMutations =
      kind === "clean-close" || kind === "table-keyboard" || kind === "mid-viewport-metadata"
        ? []
        : kind === "pending-revert-restoration" && !transient
          ? [
              {
                method: "POST",
                path: `${basePath}/autosave`,
                payload: expectedAutosavePayload(selfTestFixture, selfTestFixture.draftTitleA),
              },
              {
                method: "POST",
                path: `${basePath}/autosave`,
                payload: expectedAutosavePayload(selfTestFixture, selfTestFixture.draftTitleB),
              },
            ]
          : [
              {
                method: "POST",
                path: `${basePath}/autosave`,
                payload: expectedAutosavePayload(selfTestFixture, draftText),
              },
            ];
    const pendingCount =
      kind === "pending-revert-restoration" && !transient
        ? 2
        : ["dirty-delayed-close", "pending-revert-restoration", "double-close"].includes(kind)
          ? 1
          : 0;
    const state = {
      spec: { fixtureId: selfTestFixture.id, title: selfTestFixture.title },
      initialTitle: selfTestFixture.title,
      mutations: initialMutations,
      navigationUrls: kind === "table-keyboard" ? [selfTestFixture.editorUrl, POSTS_LIST_URL] : [],
      pendingRoutes: Array.from({ length: pendingCount }, () => () => {}),
      table: {
        titleNavigationCount: 1,
        titleUrl: selfTestFixture.editorUrl,
        checkboxToggled: true,
        checkboxNavigationCount: 0,
        actionMenuOpened: true,
        actionNavigationCount: 0,
      },
      responsiveOutputs: RESPONSIVE_WIDTHS.map((width) => ({
        width,
        visibleStatusCopies: 1,
        visibleAuthorCopies: 1,
        visibleDateCopies: 1,
      })),
    };
    let currentUrl = selfTestFixture.editorUrl;
    const closeLocator = {
      async getAttribute(name) {
        if (name === "aria-busy") return "true";
        if (name === "data-wf543-dom-click-events") return "2";
        if (name === "data-post-editor-close-pending") return "true";
        return null;
      },
      async isDisabled() {
        return true;
      },
      async click() {},
    };
    const titleLocator = {
      async inputValue() {
        return draftText;
      },
      async isEditable() {
        return true;
      },
    };
    const retry = {
      async waitFor() {},
      async evaluate() {
        return true;
      },
      async click() {
        state.mutations.push(
          {
            method: "PATCH",
            path: basePath,
            payload: expectedManualPayload(selfTestFixture, draftText),
          },
          {
            method: "PATCH",
            path: `${basePath}/metadata`,
            payload: expectedMetadataPayload(selfTestFixture),
          }
        );
      },
      async count() {
        return 0;
      },
    };
    return {
      __wf543Scenario: state,
      async waitForTimeout() {},
      async waitForURL(url) {
        currentUrl = url;
        state.navigationUrls.push(url);
      },
      url() {
        return currentUrl;
      },
      locator(selector) {
        if (selector === POST_CLOSE_SELECTOR) return closeLocator;
        if (selector === POST_TITLE_SELECTOR) return titleLocator;
        if (selector === '[data-post-editor-save-draft="true"]') {
          return {
            async isDisabled() {
              return false;
            },
          };
        }
        throw new Error(`unexpected self-test locator: ${selector}`);
      },
      getByRole(role, options = {}) {
        if (role === "alert") {
          return {
            async waitFor() {},
            async isVisible() {
              return true;
            },
            async textContent() {
              return "Save failed";
            },
          };
        }
        if (role === "button" && options.name === "Retry now") return retry;
        return {
          async getAttribute(name) {
            return name === "aria-label" ? (options.name ?? "") : null;
          },
        };
      },
      async waitForResponse() {
        return {
          ok() {
            return true;
          },
          status() {
            return 200;
          },
          url() {
            return `${ADMIN_ORIGIN}${basePath}`;
          },
        };
      },
    };
  };

  let compiledOperations = 0;
  for (const [kind, operation] of Object.entries(finalOperations)) {
    const command = expectedEvidenceAssertionCommand({ kind });
    assert(isFullSmokeCliCommand(command), `${kind} final command contract`);
    const encoding = canonicalEvidenceOperationEncoding(operation, { kind });
    assert(command.includes(codeQlSafeJavaScriptStringLiteral(encoding)), `${kind} encoding`);
    const { execute } = compileCommand(command, operation);
    const output = await execute(createAssertionPage(kind, false));
    const finalSemanticsValid =
      kind === "mid-viewport-metadata"
        ? sameRawValue(output, {
            kind,
            orderedWidths: RESPONSIVE_WIDTHS,
            visibleSemanticCopies: RESPONSIVE_WIDTHS.map((width) => ({
              width,
              status: 1,
              author: 1,
              date: 1,
            })),
            mutations: [],
            navigationUrls: [],
          })
        : validateScenarioByKind({ kind, evidence: output }, selfTestFixture);
    assert(finalSemanticsValid, `${kind} final semantics`);
    compiledOperations += 1;
  }
  for (const [kind, operation] of Object.entries(transientOperations)) {
    const commands = expectedTransientAssertionCommands({ kind });
    assert(commands.length === 1, `${kind} transient command count`);
    assert(isFullSmokeCliCommand(commands[0]), `${kind} transient command contract`);
    const encoding = canonicalEvidenceOperationEncoding(operation, { kind });
    assert(commands[0].includes(codeQlSafeJavaScriptStringLiteral(encoding)), `${kind} encoding`);
    const { execute } = compileCommand(commands[0], operation);
    const output = await execute(createAssertionPage(kind, true));
    const transientSemanticsValid =
      kind === "double-close"
        ? sameRawValue(output, {
            kind,
            phase: "pending",
            pendingRoutes: 1,
            domClickEvents: 2,
            closeBusy: true,
            closeDisabled: true,
            closePendingData: true,
            nonCloseEditable: true,
            navigationCount: 0,
          })
        : transientEvidenceValid(
            { kind, commandResults: { transientAssertion: [{ parsedOutput: output }] } },
            selfTestFixture
          );
    assert(transientSemanticsValid, `${kind} transient semantics`);
    compiledOperations += 1;
  }
  for (const kind of zeroTransientKinds) {
    assert(expectedTransientAssertionCommands({ kind }).length === 0, `${kind} transient absence`);
  }

  const hostile =
    `""''\`\`\\\\\r\n\u2028\u2029</script>;&|$() ` + `);globalThis.__wf543Injected=true;//`;
  const resetInput = {
    scenarioId: `scenario-${hostile}`,
    fixtureId: `fixture-${hostile}`,
    title: `title-${hostile}`,
    editorUrl: `https://example.test/${hostile}`,
  };
  const resetCommand = smokeRunOperation("reset-scenario", resetInput);
  assert(isFullSmokeCliCommand(resetCommand), "reset command contract");
  const { execute: executeReset, source: resetSource } = compileCommand(
    resetCommand,
    "reset-scenario"
  );
  assert(!resetSource.includes(hostile), "hostile reset value entered executable source");
  const resetCalls = [];
  let resetUrl = resetInput.editorUrl;
  const resetPage = {
    __wf543Scenario: { routeHandlers: new Map() },
    off() {},
    locator(selector) {
      if (selector === POST_CLOSE_SELECTOR) {
        return {
          async count() {
            return 0;
          },
          async click() {
            resetCalls.push(["click", selector]);
          },
        };
      }
      if (selector === POST_TITLE_SELECTOR) {
        return {
          async waitFor() {},
          async inputValue() {
            return "pre-reset-title";
          },
          async fill(value) {
            resetCalls.push(["fill", value]);
          },
        };
      }
      throw new Error(`unexpected reset locator: ${selector}`);
    },
    async goto(url) {
      resetUrl = url;
      resetCalls.push(["goto", url]);
    },
    async waitForURL(url) {
      resetUrl = url;
    },
    async waitForResponse(predicate) {
      const response = {
        request() {
          return { method: () => "PATCH" };
        },
        url() {
          return `${ADMIN_ORIGIN}/admin/api/posts/${encodeURIComponent(resetInput.fixtureId)}`;
        },
        ok() {
          return true;
        },
        status() {
          return 200;
        },
      };
      assert(predicate(response), "reset response predicate");
      resetCalls.push(["response", response.url()]);
      return response;
    },
    url() {
      return resetUrl;
    },
    getByRole(role, options) {
      assert(role === "link", "reset row role");
      return {
        async waitFor() {},
        async getAttribute(name) {
          return name === "aria-label" ? options.name : null;
        },
      };
    },
  };
  globalThis.__wf543Injected = false;
  const resetOutput = await executeReset(resetPage);
  assert(globalThis.__wf543Injected === false, "reset injection sentinel changed");
  delete globalThis.__wf543Injected;
  assert(
    resetCalls.some(([name, value]) => name === "goto" && value === resetInput.editorUrl) &&
      resetCalls.some(([name, value]) => name === "fill" && value === resetInput.title) &&
      resetCalls.some(
        ([name, value]) =>
          name === "response" &&
          value === `${ADMIN_ORIGIN}/admin/api/posts/${encodeURIComponent(resetInput.fixtureId)}`
      ) &&
      resetEvidenceValid(
        resetOutput,
        { id: resetInput.scenarioId, kind: "dirty-delayed-close" },
        { id: resetInput.fixtureId, title: resetInput.title }
      ),
    "reset payload did not round-trip byte-identically"
  );
  compiledOperations += 1;

  let negativeCases = 0;
  assert(strictSummaryExitCode("- semgrep: ok (0 findings)", "semgrep") === 0, "strict ok");
  assert(
    strictSummaryExitCode("- semgrep: non-zero:7 (blocked)", "semgrep") === 7,
    "strict non-zero"
  );
  for (const [label, output] of [
    ["missing code", "- semgrep: non-zero: (blocked)"],
    ["nondigit code", "- semgrep: non-zero:7x (blocked)"],
    ["unsafe integer", `- semgrep: non-zero:${"9".repeat(400)} (blocked)`],
  ]) {
    assert(strictSummaryExitCode(output, "semgrep") === null, `strict ${label}`);
    negativeCases += 1;
  }
  for (const [label, operation] of [
    ["unknown kind", () => expectedEvidenceAssertionCommand({ kind: "unknown" })],
    [
      "unknown key",
      () => smokeRunOperation("assert-clean-close", { kind: "clean-close", unknown: true }),
    ],
    ["NUL", () => smokeRunOperation("reset-scenario", { ...resetInput, title: "bad\0title" })],
    [
      "over budget",
      () => smokeRunOperation("reset-scenario", { ...resetInput, title: "x".repeat(32_769) }),
    ],
  ]) {
    await expectFailure(async () => operation(), `host ${label}`);
    negativeCases += 1;
  }

  const safeOperation = "assert-clean-close";
  const safeInput = { kind: "clean-close" };
  const safeEncoding = canonicalEvidenceOperationEncoding(safeOperation, safeInput);
  const safeSource = buildEvidenceOperationRunCodeSource(safeOperation, safeInput);
  const executeMutatedEncoding = async (encoded, label) => {
    let pageCalls = 0;
    const page = new Proxy(
      {},
      {
        get() {
          pageCalls += 1;
          return () => {};
        },
      }
    );
    const mutantSource = safeSource.replace(
      codeQlSafeJavaScriptStringLiteral(safeEncoding),
      codeQlSafeJavaScriptStringLiteral(encoded)
    );
    const execute = new Script(`(${mutantSource})`, {
      filename: `task-543-${label}.negative-self-test.js`,
    }).runInThisContext();
    await expectFailure(async () => execute(page), label);
    assert(pageCalls === 0, `${label} reached page interaction`);
    negativeCases += 1;
  };
  await executeMutatedEncoding("A", "noncanonical base64url");
  await executeMutatedEncoding("not+base64", "malformed base64url");
  await executeMutatedEncoding(Buffer.from([0xc3, 0x28]).toString("base64url"), "invalid UTF-8");
  await executeMutatedEncoding(
    Buffer.from(
      stableSerialize({ operation: "unknown-operation", payload: { kind: "clean-close" } }),
      "utf8"
    ).toString("base64url"),
    "unknown decoded operation"
  );
  await executeMutatedEncoding(
    Buffer.from(
      stableSerialize({ operation: safeOperation, payload: { kind: "clean-close", extra: true } }),
      "utf8"
    ).toString("base64url"),
    "unknown decoded key"
  );
  await executeMutatedEncoding(
    Buffer.from(
      stableSerialize({
        operation: "reset-scenario",
        payload: { ...resetInput, title: "bad\0title" },
      }),
      "utf8"
    ).toString("base64url"),
    "decoded NUL"
  );
  await executeMutatedEncoding(
    Buffer.from(
      stableSerialize({
        operation: "reset-scenario",
        payload: { ...resetInput, title: "x".repeat(65_536) },
      }),
      "utf8"
    ).toString("base64url"),
    "decoded over-budget payload"
  );

  const nestedCredentialReceipt = {
    command: SMOKE_PASSWORD_FILL_COMMAND,
    status: 0,
    stdout: "",
    stderr: "",
    stdoutSha256: EMPTY_SHA256,
    stderrSha256: EMPTY_SHA256,
    parsedOutput: null,
  };
  const timelineCredentialReceipt = {
    ...nestedCredentialReceipt,
    sequence: 1,
    scope: "browser:password",
  };
  const credentialSmoke = {
    commands: { passwordFill: SMOKE_PASSWORD_FILL_COMMAND },
    bootstrap: { passwordFill: nestedCredentialReceipt },
  };
  const failureCredentialSmoke = {
    commandTimeline: [timelineCredentialReceipt],
    failedAtSequence: 2,
  };
  let credentialDigestCalls = 0;
  const digestSpy = () => {
    credentialDigestCalls += 1;
    return "0".repeat(64);
  };
  assert(bootstrapPasswordReceiptValid(credentialSmoke), "nested credential receipt");
  assert(
    successTimelineReceiptIntegrityValid(timelineCredentialReceipt, credentialSmoke, digestSpy),
    "success timeline credential receipt"
  );
  assert(
    failurePrefixReceiptsValid(failureCredentialSmoke, digestSpy),
    "failure-prefix timeline credential receipt"
  );
  const missingScopeReceipt = { ...timelineCredentialReceipt };
  delete missingScopeReceipt.scope;
  for (const [label, receipt] of [
    ["missing timeline scope", missingScopeReceipt],
    ["wrong timeline scope", { ...timelineCredentialReceipt, scope: "browser:email" }],
    [
      "timeline command drift",
      { ...timelineCredentialReceipt, command: `${SMOKE_PASSWORD_FILL_COMMAND} drift` },
    ],
  ]) {
    assert(
      !successTimelineReceiptIntegrityValid(receipt, credentialSmoke, digestSpy),
      `success timeline accepted ${label}`
    );
    assert(
      !failurePrefixReceiptsValid({ commandTimeline: [receipt], failedAtSequence: 2 }, digestSpy),
      `failure timeline accepted ${label}`
    );
    negativeCases += 2;
  }
  assert(credentialDigestCalls === 0, "credential receipt reached a fast digest");
  for (const [label, receipt, context, command] of [
    [
      "nested as timeline",
      nestedCredentialReceipt,
      "timeline.browserPassword",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
    [
      "timeline as nested",
      timelineCredentialReceipt,
      "bootstrap.passwordFill",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
    [
      "wrong scope",
      { ...timelineCredentialReceipt, scope: "browser:email" },
      "timeline.browserPassword",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
    [
      "wrong command",
      timelineCredentialReceipt,
      "timeline.browserPassword",
      `${SMOKE_PASSWORD_FILL_COMMAND} drift`,
    ],
    [
      "nonempty stdout",
      { ...timelineCredentialReceipt, stdout: "drift" },
      "timeline.browserPassword",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
    [
      "wrong digest",
      { ...timelineCredentialReceipt, stderrSha256: "0".repeat(64) },
      "timeline.browserPassword",
      SMOKE_PASSWORD_FILL_COMMAND,
    ],
  ]) {
    assert(
      !credentialReceiptValidWithoutDigest(receipt, context, command),
      `credential mutation accepted: ${label}`
    );
    negativeCases += 1;
  }

  const normalReceipt = {
    command: "printf evidence",
    status: 0,
    stdout: "evidence stdout",
    stderr: "evidence stderr",
    stdoutSha256: sha256Text("evidence stdout"),
    stderrSha256: sha256Text("evidence stderr"),
    parsedOutput: { ok: true },
  };
  const ordinaryDigestInputs = [];
  assert(
    receiptIntegrityValid(normalReceipt, (value) => {
      ordinaryDigestInputs.push(value);
      return sha256Text(value);
    }),
    "normal secret-free receipt"
  );
  assert(
    sameSequence(ordinaryDigestInputs, [normalReceipt.stdout, normalReceipt.stderr]),
    "normal receipt digest order"
  );
  assert(
    !receiptIntegrityValid({ ...normalReceipt, stdoutSha256: "0".repeat(64) }) &&
      !receiptIntegrityValid({ ...normalReceipt, stderrSha256: "0".repeat(64) }),
    "normal receipt digest mismatch"
  );

  return {
    pass: true,
    evidenceOperations: Object.keys(finalOperations).length,
    transientOperations: Object.keys(transientOperations).length,
    zeroTransientKinds: zeroTransientKinds.length,
    resetOperations: 1,
    compiledOperations,
    credentialDigestCalls,
    ordinaryDigestCalls: ordinaryDigestInputs.length,
    negativeCases,
    maximumCommandBytes,
  };
}

async function runGate(leaf, attempt) {
  const result = await agent(
    `Read-only gate from ${ROOT}; do not edit. Run exactly: ${leaf.gate}. ` +
      "Return pass=true only if every command exits zero. Re-run a named failure alone once.",
    { label: `gate:${leaf.id}:${attempt}`, phase: leaf.id, schema: RESULT_SCHEMA }
  );
  return validatePassErrorContract(result, `gate:${leaf.id}:${attempt}`);
}

async function runScopeGate(allowed, label) {
  const expected = [...new Set([...ORCHESTRATOR_DIRTY, ...allowed])];
  const result = await agent(
    `Read-only TASK-543 scope gate at ${ROOT}. Inspect git status and diff names. Current changed ` +
      `paths must be a subset of ${JSON.stringify(expected)}; no staged files are allowed. ` +
      "Return pass=false for every extra path. Do not edit.",
    { label: `scope:${label}`, phase: label, schema: RESULT_SCHEMA }
  );
  requirePassingResult(result, `${label}: scope gate`);
}

if (process.argv.includes("--codeql-self-test")) {
  process.stdout.write(JSON.stringify(await runTask543CodeQlSelfTest()));
  process.exit(0);
}

phase("Start gate");
const startGate = await agent(
  `Read-only TASK-543 start gate at ${ROOT}. Verify all seven physical TASK-543 files are ` +
    "In Progress with the same Started date, the sole board row is In Progress, changelog 1255 " +
    "remains reserved and no changelog file exists. Verify HEAD descends from completed TASK-544. " +
    "Do not edit.",
  { label: "start-gate:543", phase: "Start gate", schema: RESULT_SCHEMA }
);
requirePassingResult(startGate, "TASK-543 start gate");

for (const leaf of LEAVES) {
  phase(leaf.id);
  await agent(
    `${COMMON}\nImplement ${leaf.id} strictly from ${leaf.contract}. ` +
      `Edit only ${JSON.stringify(leaf.allowed)}. Read every file fresh and add all required ` +
      "changed-behavior tests before the source gate. Do not edit tasks/docs/workflow.",
    { label: `impl:${leaf.id}`, phase: leaf.id }
  );
  const cumulativeAllowed = LEAVES.slice(0, LEAVES.indexOf(leaf) + 1).flatMap(
    ({ allowed }) => allowed
  );
  await runScopeGate(cumulativeAllowed, `${leaf.id}:implementation`);
  let gate = await runGate(leaf, 1);
  for (let attempt = 1; !gate.pass && attempt <= 3; attempt += 1) {
    await agent(
      `${COMMON}\nFix only verified ${leaf.id} gate failures within ${JSON.stringify(leaf.allowed)}. ` +
        `Do not weaken assertions. Failures:\n${gate.errors.map((error) => `- ${error}`).join("\n")}`,
      { label: `fix:${leaf.id}:${attempt}`, phase: leaf.id }
    );
    await runScopeGate(cumulativeAllowed, `${leaf.id}:fix:${attempt}`);
    gate = await runGate(leaf, attempt + 1);
  }
  if (!gate.pass) throw new Error(`${leaf.id}: targeted gate remained red`);
}

phase("Cross-lane gate");
const crossLane = await agent(
  `Read-only TASK-543 cross-lane gate at ${ROOT}. Run the canonical 13-file Vitest matrix from ` +
    `${TASKS}/TASK-543-03-L01-Close-Failure-Keyboard-Viewport-Flows-And-Closure.md, then ` +
    "bun --cwd core lint:types, bun --cwd core lint, and git diff --check. Do not edit. " +
    "Return pass=true only when every command exits zero.",
  { label: "gate:543-cross-lane", phase: "Cross-lane gate", schema: RESULT_SCHEMA }
);
requirePassingResult(crossLane, "TASK-543 cross-lane gate");

const POST_LENSES = [
  [
    "snapshot-queue",
    "Exact immutable payload/signature, synchronous mutation revision, ascending exact-revision save queue, conflicting-predecessor restoration, pre-request authoritative barrier ordering, first-owner endpoint, cross-mode coalescing.",
  ],
  [
    "response-identity",
    "Response-derived normalized persisted baseline, current/newer branches, route-authorized post-identity transition, success/error/finally generation guards, unmount/stale refresh/restore isolation, no newer draft/history overwrite.",
  ],
  [
    "close-errors",
    "Real flush promise, background rejection ownership, Close coalescing/navigation-once, Close-only pending ARIA, bounded failure, Retry focus and retry success.",
  ],
  [
    "table-a11y",
    "Passive table rows, canonical title AdminLink, checkbox/actions isolation, exactly one semantic status/author/date copy and md..lg visibility.",
  ],
  [
    "test-integrity",
    "All required races, cacheBus refresh gating, authoritative barrier and response normalization for both transports, exact wire order, focus/ARIA, structural UI assertions and real-browser keyboard/viewport assertions; correct Vitest lane; no weakened legacy assertions.",
  ],
];

phase("Post-audit");
for (let round = 1; round <= 2; round += 1) {
  const results = await Promise.all(
    POST_LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        `Fresh read-only TASK-543 post-audit round ${round} at ${ROOT}. Read all task contracts, ` +
          `source/tests and git diff/status. Lens: ${lens} Report evidence-backed H/M/L with file:line. No edits.`,
        { label: `post-audit:${id}:${round}`, phase: "Post-audit", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    results,
    POST_LENSES.map(([id]) => id),
    `TASK-543 post-audit ${round}`
  );
  const findings = results.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-543 post-audit remained non-clean");
  for (const leaf of LEAVES) {
    await agent(
      `${COMMON}\nFix only verified post-audit findings that belong to ${leaf.id}. Edit only ` +
        `${JSON.stringify(leaf.allowed)}; leave findings owned by the other leaf untouched. ` +
        `Findings:\n${findings
          .map((finding) => `- [${finding.severity}] ${finding.evidence}: ${finding.finding}`)
          .join("\n")}`,
      { label: `post-audit-fix:${leaf.id}:${round}`, phase: "Post-audit" }
    );
    await runScopeGate(
      LEAVES.flatMap(({ allowed }) => allowed),
      `post-audit-fix:${leaf.id}:${round}`
    );
    const fixedGate = await runGate(leaf, `post-audit-${round}`);
    if (!fixedGate.pass) {
      throw new Error(`${leaf.id}: post-audit fix gate failed: ${fixedGate.errors.join("; ")}`);
    }
  }
}

phase("Full gates");
const fullGates = await agent(
  `Final read-only TASK-543 validation at ${ROOT}. Run every command in this exact order and do ` +
    `not stop after a failure: ${JSON.stringify(FULL_GATE_COMMANDS)}. For each command return its ` +
    "exact id/command/exit status, unmodified captured stdout+stderr text, and SHA-256 of those exact " +
    "raw bytes. Never replace a receipt with a boolean. Parse the DB preflight JSON into database and " +
    "require configured/reachable/selectOne exactly. The task-scoped Semgrep command is exact and exits " +
    "zero only with no TASK-543 finding. For strict scan, split the retained raw output into the seven " +
    `ordered component records ${JSON.stringify(STRICT_COMPONENTS)} with each exact command, exit code, ` +
    "raw text/hash and findings. Each component must carry the exact start/end string offsets of " +
    "its canonical `[security-scan] <title>` section in the retained strict receipt; its raw text must equal " +
    "that exact slice, and its exit code must equal the matching retained summary line. The only permitted " +
    "non-zero strict result is the single exact finding. The separately pinned `strictSemgrepJson` command " +
    "must retain its exact command/exit/stdout/stderr envelope; derive every finding from the nested Semgrep " +
    "JSON result (rule ID, normalized path, and start line) with zero Semgrep errors. Agent-supplied finding " +
    "metadata that is not equal to that machine output fails. The allowed finding is " +
    `${JSON.stringify(KNOWN_STRICT_FINDING)}; every other component must be clean. Return pass=false with ` +
    "errors and all collected receipts on any mismatch. Do not edit or suppress/configure scanners.",
  { label: "full-gates:543", phase: "Full gates", schema: FULL_GATE_SCHEMA }
);
validateFullGates(fullGates);

const fingerprintPrompt =
  `At ${ROOT}, read-only, compute a deterministic tracked-working-tree fingerprint as the ` +
  "SHA-256 of the exact bytes emitted by `git diff --binary HEAD` followed by `sha256sum " +
  "_docs/_workflows/task-543-implement.mjs`; list every non-ignored changed/untracked path from " +
  "`git status --porcelain=v1 --untracked-files=all`, sorted and unique. Do not edit.";
const preSmokeFingerprint = await agent(fingerprintPrompt, {
  label: "fingerprint:pre-smoke",
  phase: "Smoke",
  schema: FINGERPRINT_SCHEMA,
});

phase("Smoke");
const smoke = await agent(
  `Final TASK-543 real browser smoke at ${ROOT}. Read 543-03-L01 in full. Load .env without ` +
    "printing credentials. Every command receipt stores exact unmodified stdout and stderr separately, " +
    "the SHA-256 of each exact stream, and a separately derived `parsedOutput`; never merge streams or " +
    "replace source bytes with parsed JSON. Run every Playwright command using the canonical `--raw` " +
    "spelling. Successful `run-code` stdout is exactly compact JSON plus LF (or LF for undefined), and " +
    "parsedOutput must be derived from those bytes. The CLI skill-version warning remains in command " +
    "stderr and is not a browser console warning. Record the preflight `playwright-cli --raw list` receipt and " +
    "require only wf543smoke absent; clear any old task listeners. Before launch prove ports 3000/5173 " +
    `absent with the canonical lsof checks, execute the exact crypto nonce command ${JSON.stringify(NONCE_GENERATION_COMMAND)}, ` +
    "require one non-zero `wf543-` plus 32-hex value, record " +
    "`/usr/bin/date +%s%3N`, then execute the canonical nonce-bound background-spawn command emitted by " +
    "`expectedHelperLaunchCommand` (it invokes `coderso-dev-core-host /home/coder/project/Coderso`, redirects " +
    "the child streams, prints only `$!`, and lets the launcher shell exit). " +
    "Retain root/child PIDs and owned ports, " +
    "verify http://coderso-a.localhost:5173/admin/ and http://coderso-a.localhost:3000. Use only " +
    "separate full `playwright-cli -s=wf543smoke --raw ...` commands; credential-fill stdout goes to " +
    "`/dev/null`. Execute the workflow's exact login run-code. Record both streams/hashes/parsedOutput " +
    "for helper launch, browser open, both credential " +
    "fills, login activation and console-listener installation. The browser-open parsed output must be " +
    "derived from the exact CLI envelope: session, PID, final " +
    "admin URL, optional emitted Page Title, and snapshot path. Shared session-list parsing must retain " +
    "valid attached and incompatible-version owner sessions while requiring only wf543smoke absent. " +
    "The helper spawn receipt status belongs only to the short launcher shell and its stdout must be the " +
    "root PID plus LF; it is not a process-exit " +
    "claim. Separate " +
    "canonical `/proc` receipts must bind nonce, PID, PPID, start ticks, exact cmdline and its hash, cwd, " +
    "and start time; do not claim long-running process exit. Create exactly one uniquely titled shared " +
    "fixture through the real Admin UI and reuse its UI-response-derived ID across all seven scenarios. " +
    "Its title, slug and draft-A sentinel are pairwise distinct; restoration draft B aliases the clean title. " +
    "Execute the byte-exact canonical create builder: open Posts, activate New post, fill the visible title " +
    "and slug controls, preserve the existing Open in editor after create preference, activate Create Post, " +
    "await the successful UI-triggered response JSON and immediately return its PostDetail ID as the canonical " +
    "fixture acquisition. Put that exact ID in acquired inventory before any later command. After the three " +
    "after-create raw log reads, execute the separate canonical provenance command: require the preserved " +
    "post-create editor URL or exact created-row href ID, the explicit editor URL ID, and the final list href " +
    "ID all to equal the response ID. Immediately retain a separate after-provenance error, warning and " +
    "page-error read set before the first scenario log reset, so provenance diagnostics cannot be erased. " +
    "A later provenance failure must retain the acquired fixture and trigger " +
    "UI deletion plus reload-absence cleanup. Retain the response status/URL without issuing page-evaluate " +
    "fetches. The independent " +
    "clean-payload oracle includes the editor-normalized writing-canvas layout attrs rather than copying the " +
    "real UI create payload's `{}` data. Every scenario fixtureId must equal that single shared ID; derive " +
    "later editor URLs, routes, reset, deletion and absence proofs from it. The canonical reset command must " +
    "restore the fixture's clean title through the editor UI after each flow before the next scenario starts. " +
    "Execute at least seven canonical flows: clean Close; " +
    "dirty delayed-save Close; pending-write clean-revert restoration; save failure stays then Retry; " +
    "double Close coalescing; native title/checkbox/action keyboard behavior; responsive metadata at " +
    "390/768/900/1024. Cover light/dark. Assert visible URL, exact request order/count/payload, Close-only " +
    "busy/disabled, alert/Retry focus, retained draft, DOM/computed visibility and accessible names. " +
    "The setup listener records every POST/PUT/PATCH/DELETE whose pathname is the exact fixture post " +
    "base or descendant; typed evidence must contain the complete method/path/payload sequence with no " +
    "extra mutation. Record every main-frame URL transition in order and reject any detour. " +
    "Return the kind-discriminated evidence required by the schema: clean Close=0 writes/1 list " +
    "navigation; dirty delay=one exact payload plus busy/disabled/non-Close-editable and no pre-release " +
    "navigation; clean revert=exact A then B payloads; failure=one failed autosave POST, visible alert/" +
    "retained draft/Retry focus, then one successful manual base PATCH with the editor URL unchanged and " +
    "alert cleared, followed by a separate Back-to-posts activation that adds no write and navigates once; " +
    "double Close=two actual DOM click events but one write/navigation plus disabled/aria-busy/pending-data " +
    "DOM state; the focused Vitest assertion, not smoke counters, owns internal chain coalescing; keyboard=real Enter/" +
    "Space outcomes and exact accessible names (dismiss the modal action menu with Escape before querying " +
    "the underlying row again); responsive=one visible semantic status/author/date copy. " +
    "Transient assertions are read-only: dirty/double capture one pending route and pending Close DOM; " +
    "restoration captures authored draft B while save A is still pending; failure captures the visible " +
    "alert, retained draft and focused Retry before clicking Retry. Capture the transient screenshot " +
    "immediately after that assertion; only the later final assertion may release a route, retry, or navigate. " +
    "For the six non-responsive flows the final live assertion parsed from exact raw stdout must equal " +
    "this typed evidence; the responsive summary must exactly match its four parsed raw probes. A generic " +
    "body/goto observation fails. " +
    "Execute the byte-exact commands emitted by this workflow's canonical scenario setup, route, " +
    "action, assertion, state and reset builders for each recorded fixture; a token-equivalent command " +
    'fails validation. Bind every Close action to `[data-post-editor-header-close="true"]` and every ' +
    'title edit to `[data-post-editor-title-input="true"]`; Retry uses its exact accessible name. ' +
    'For keyboard evidence bind `.press("Enter")` to the exact Edit-post link and Actions button ' +
    'locators and `.press("Space")` to the exact Select checkbox locator. Dirty/revert/failure/' +
    "double flows also need a real editable " +
    "fill/type/press. Live assertion code must read its typed keys plus URL and flow DOM state (aria-busy/" +
    "disabled, alert/draft, or aria-label/checked) exactly as required by `validateScenarioByKind`; " +
    "Close-flow mutations and navigation sequences come from task-scoped `page.__wf543*` Playwright-side " +
    "listeners that reset removes, not literal or synthetic counters. " +
    "For every scenario return each actual separate full CLI command in execution order: log reset, " +
    "theme/setup, route installation when the flow uses a fault or delay, action, the canonical transient " +
    "assertion plus transient PNG before any route release/retry/navigation for dirty-delay, restoration, " +
    "failure, and double-Close, then the final live DOM assertion, the three canonical log reads, final " +
    "PNG, unroute when installed, its three raw log reads, state reset, and its three raw log reads. Every " +
    "recorded browser command must begin with the full " +
    "`playwright-cli -s=wf543smoke --raw ` prefix; do not replace " +
    "commands or live outputs with prose assertions/booleans. Assertion commands must read live DOM/" +
    "URL/computed/geometry state and their recorded outputs must match the structured evidence. Pair every " +
    "installed route pattern with the identical recorded unroute pattern; record exact streams/hashes and parsed output for " +
    "each install as `{pattern,installed:true,mode}` (`delay` or `failure`) and each removal as " +
    "`{pattern,removed:true,releasedPending}`; delayed flows require delay and Retry requires failure. " +
    "The failure route returns HTTP 200 with intentionally invalid JSON so application parsing fails without " +
    "creating a browser network-console error; an HTTP 4xx/5xx fault is not equivalent. " +
    "Record exact receipt streams/hashes/parsedOutput for " +
    "setup/action/transient-assertion/final-assertion/log/reset commands. At least one setup parsed output is live " +
    "`{url, ready:true}` and one reset parsed output is live `{url, reset:true}` for the admin route. Record " +
    "command/status/stdout/stderr/hash-backed health probes with parsed `{httpStatus:200}`, exact " +
    "shared-fixture canonical real-UI create/delete/reload-absence ID, commands, UI-triggered response " +
    "URLs/statuses and row/action-menu/dialog DOM provenance, plus theme/setup before, restore, and after values. " +
    "Theme restore preserves the exact nullable stored preference and original dark/light root classes; " +
    "setup restore preserves the exact nullable task session value. Return typed non-null live objects. " +
    "For the responsive scenario execute and record exactly `resize <width> 900` plus the canonical " +
    "live apply probe for each width 390, 768, 900, and 1024; return actual applied width, fallback/" +
    "column visibility and non-zero row/table geometry for every width. Locate only the fixture-owned row " +
    "through its exact Edit-post accessible name and require exact fixture ID plus exact title/checkbox/" +
    "action names. Every fallback/status/author/date/row/table node records computed display, visibility, " +
    "opacity and geometry; fallback author/date come from the concrete span/time nodes. Reset and read canonical " +
    "console/warning/page-error arrays for every flow; require empty. Also retain receipt-bound canonical " +
    "console/warning/page-error reads immediately after fixture creation, immediately after provenance and " +
    "before any scenario reset, every unroute, every reset, fixture deletion, reload-absence, and once finally " +
    "before browser close. Derive the top-level consoleErrors, " +
    "consoleWarnings and pageErrors arrays only by aggregating those receipt parsed outputs; caller-supplied " +
    "summary assertions are not evidence. Capture exactly eleven distinct PNGs: " +
    "one final PNG per flow plus one transient PNG for each of the four pending/failure flows, under the " +
    `absolute ${SMOKE_SCREENSHOT_ROOT}/task-543-wf543smoke-<scenario>-<phase>.png path. ` +
    "The actual screenshot CLI stdout reports the repo-relative path; retain and hash that exact stdout, " +
    "parse its `reportedPath`, and independently stat/hash/signature-check the absolute file path. For every " +
    "PNG record exact screenshot/stat/sha256/first-eight-byte xxd receipts immediately after capture; " +
    "require a post-server-start mtime and PNG signature " +
    "89504e470d0a1a0a. Return the single global `commandTimeline` in the exact order emitted by " +
    "`expectedSuccessCommandTimeline`: monotonically consecutive sequence numbers plus scope, exact command, " +
    "status, exact stdout/stderr and both hashes plus parsedOutput for every startup, identity, health, browser, state, fixture, scenario, PNG, and " +
    "cleanup receipt. Per-phase label arrays are not chronology evidence. " +
    "Always cleanup in finally: release/remove routes, delete the exact fixture through its row Actions menu " +
    "and Delete post confirmation, then run the separate list-reload DOM-absence proof, " +
    "but if provenance or its three-read boundary failed, first capture all three canonical " +
    "`cleanup:log:after-provenance:*` receipts before cleanup navigation can obscure diagnostics. " +
    "restore theme/setup in that order, close/list wf543smoke, stop exact helper PID tree, prove PIDs and ports " +
    "3000/5173/all owned alternates absent. Before stopping, record `/usr/bin/pstree -p <rootPid>` plus " +
    "the exact discovered root/child PID set, then run `/usr/bin/lsof -nP -a -p <comma-separated-owned-" +
    "PIDs> -iTCP -sTCP:LISTEN -FpPn` once and retain its exact stdout plus parsed PID/port ownership mappings. Its discovered " +
    "port set must exactly equal every declared port. Record one exact process guard command `bash -lc " +
    "'if kill -0 -- <pid> 2>/dev/null; then exit 1; fi'` with status 0/empty output for every " +
    "owned PID, and one exact `/usr/bin/lsof -nP -iTCP:<port> -sTCP:LISTEN -t` with status 1/empty " +
    "output for every owned port. Record the exact final full route-list, browser-close, session-list, " +
    "helper-stop, PID-check and port-check commands and their outputs. Helper stop must use the canonical " +
    "identity-guarded SIGTERM command (the background launcher makes inherited SIGINT ignored) and refuse " +
    "to signal a PID whose nonce/PPID/start ticks/cmdline hash/cwd differ; " +
    "only `wf543smoke` must be absent " +
    "from the final `playwright-cli --raw list` stdout because other owner sessions may remain. Do not summarize " +
    "cleanup as booleans alone. On startup or flow failure, inventory every actually acquired helper/" +
    "browser/fixture/route/theme/setup resource and return the discriminated `pass:false` branch with at " +
    "least one error, a global timeline through and including the failing command, then the exact ordered " +
    "cleanup receipts as the timeline suffix. `failedAtSequence` and `failedScope` identify that failing " +
    "record; cleanup record sequence values continue globally and their timeline scopes are exactly " +
    "`cleanup:<kind>:<resourceId>`. The pre-failure prefix must be the same byte-exact canonical startup " +
    "prefix as success, with every earlier receipt proving command-specific success and honest raw " +
    "Playwright parsing. Identity outputs must equal acquired PPID/start/cmdline/cwd/hash/nonce fields, " +
    "and later fixture/scenario receipts must be an ordered canonical success-flow prefix. `failurePhase` " +
    "matches the failed scope, including lifecycle/state/helper scopes. The failed receipt is genuinely non-zero, " +
    "except that an occupied pre-launch port is the explicit status-0/`{absent:false}` semantic failure. " +
    "Every successful helper launch/browser open/fixture create/route install and captured theme/setup " +
    "state must be present in acquired inventory, and every acquired browser/fixture/route/scenario entry " +
    "must have the matching attempted or successful timeline acquisition: inventory equality is bidirectional, " +
    "so fabricated extras fail. A successful create followed by a failed provenance command is the explicit " +
    "partial-acquisition case. Helper ownership is also bidirectionally exact against pre-cleanup evidence. " +
    "Before a successful pid-tree receipt, `ownedPids` is exactly the command-backed root PID (or empty when " +
    "the launcher failed and no PID was returned); only the exact parsed `/usr/bin/pstree` PID set may expand it. " +
    "Before a successful lsof ownership receipt, `ownedPorts` is exactly `[3000,5173]`; only the exact parsed " +
    "port set from the canonical lsof receipt may expand it, and every mapped owner must belong to the proven " +
    "PID set. Discovery must occur before `failedAtSequence`; cleanup PID/port checks never establish ownership " +
    "and phantom PID/port entries fail. " +
    "Partial helper acquisition uses `identityComplete:false`; never signal it without the full guard " +
    "identity. Non-zero cleanup attempts remain in the receipts, and `remainingResources` must exactly list " +
    "every resource whose canonical cleanup/absence proof did not succeed (it is empty only if cleanup " +
    "actually completed); never fabricate the success " +
    "shape. The workflow rejects that honest failure after retaining diagnostics. You may write only " +
    "the task-scoped PNG files; do not edit source/tests/docs/tasks/workflow. " +
    "Return the exact structured result.",
  { label: "smoke:543", phase: "Smoke", schema: SMOKE_SCHEMA }
);
validateSmoke(smoke);
const postSmokeFingerprint = await agent(fingerprintPrompt, {
  label: "fingerprint:post-smoke",
  phase: "Smoke",
  schema: FINGERPRINT_SCHEMA,
});
if (
  postSmokeFingerprint.fingerprint !== preSmokeFingerprint.fingerprint ||
  !sameUniqueSet(postSmokeFingerprint.changedPaths, preSmokeFingerprint.changedPaths)
) {
  throw new Error("TASK-543 smoke changed tracked/non-ignored working-tree state");
}
const smokeAudit = await agent(
  `Fresh read-only TASK-543 smoke evidence audit at ${ROOT}. Inspect actual PNG files and ` +
    "stat/hash/signature metadata and fresh mtimes; all eleven transient/final screenshot phases; every " +
    "per-flow setup/route/action/transient-assertion/final-assertion/log-read/screenshot/unroute/reset " +
    "command with exact stdout/stderr, both hashes and parsedOutput; prove transient capture precedes " +
    "route release/retry/navigation; kind-specific behavioral evidence; " +
    "the ordered exact fixture-row 390/768/900/1024 computed-style/geometry probes; full mutation and " +
    "main-frame navigation sequences without extras; corrected Retry manual-PATCH-then-separate-Close " +
    "behavior; zero receipt-derived aggregate logs; one shared fixture's canonical real-UI New-post create " +
    "response JSON ID acquisition followed by separate response-ID-equal URL/editor/list provenance and its " +
    "own pre-reset log-read boundary, per-flow " +
    "UI reset, row Actions-menu Delete/confirmation and reload-absence response/DOM provenance; raw log-read " +
    "receipts after create, after provenance before any reset, every unroute/reset, delete, absence and finally " +
    "before close; theme/setup before/" +
    "after records; the globally consecutive commandTimeline with exact byte-for-byte grouped-record " +
    "parity, bidirectionally exact acquired inventory, failed-provenance partial acquisition, and honest " +
    "failure-prefix/cleanup-suffix semantics, including exact pre-cleanup pstree/lsof-derived helper PID/port " +
    "ownership with no cleanup-backfilled or phantom entries, and first-in-cleanup provenance log reads when its normal " +
    "boundary did not finish; command-backed unique nonce/PID/PPID/" +
    "start/cmdline/cwd helper identity, pre-stop PID-tree/port-owner mappings; " +
    "and final route-list/browser-" +
    "close/session-list/helper/PID/port cleanup. Confirm only wf543smoke absence is required when auditing " +
    "shared sessions. Evidence: " +
    JSON.stringify(smoke) +
    ". Report every H/M/L; do not edit or start runtime.",
  { label: "smoke-audit:543", phase: "Smoke", schema: AUDIT_SCHEMA }
);
if (smokeAudit.findings.length > 0) throw new Error("TASK-543 smoke evidence drift");

phase("543-03-L01 close");
const closureAllowed = [
  "docs/guide/coderso/post-editor-preview-revisions-and-settings.md",
  "docs/guide/coderso/posts-list-and-creation.md",
  "_docs/_TASKS/README.md",
  "_docs/_CHANGELOG/README.md",
  CHANGELOG.slice(ROOT.length + 1),
  ...[
    "TASK-543_Posts_Exit_Safety_and_List_Accessibility.md",
    "TASK-543-01-Autosave-Flush-Before-Close.md",
    "TASK-543-01-L01-Wait-For-Dirty-Draft-And-Remain-On-Failure.md",
    "TASK-543-02-Posts-Table-Keyboard-And-Metadata-Parity.md",
    "TASK-543-02-L01-Remove-Row-Click-And-Restore-Mid-Viewport-Metadata.md",
    "TASK-543-03-Tests-Smoke-And-Closure.md",
    "TASK-543-03-L01-Close-Failure-Keyboard-Viewport-Flows-And-Closure.md",
  ].map((file) => `_docs/_TASKS/${file}`),
];

await agent(
  `${COMMON}\nTASK-543 source gates, post-audit and smoke passed. Read indexes fresh. Edit only ` +
    `${JSON.stringify(closureAllowed)}. Update both required guide contracts. Record the already ` +
    `verified structured full-gate evidence ${JSON.stringify(fullGates)} and smoke evidence ` +
    `${JSON.stringify(smoke)}, including honest strict-scan qualification without suppression. Create ` +
    `${CHANGELOG}; mark leaves, then children, then parent Done; move only TASK-543 board row and ` +
    "statistics; consume 1255 while preserving 1251-1252,1254,1257 reservations and next 1258. " +
    "Do not edit source/tests/workflow, stage, or commit. Report the exact closure paths changed and " +
    "the exact task commit scope to the owner; only the owner runs `bun run precommit`, stages, and commits.",
  { label: "close:543", phase: "543-03-L01 close" }
);

const FINAL_LENSES = [
  [
    "graph",
    "Seven physical TASK-543 files, parent/child rows, board bucket/statistics and all terminal statuses.",
  ],
  [
    "changelog",
    "One changelog 1255 with all seven IDs, exact validation/smoke evidence, reservations and index ordering.",
  ],
  [
    "guides",
    "Both required guide updates accurately describe awaited Close/failure Retry and title-only navigation/mid-width metadata.",
  ],
  [
    "evidence",
    "Full gates, strict scan qualification, seven canonical flows, unique PNG hashes and complete cleanup are truthful.",
  ],
  [
    "scope",
    "Final diff preserves single writers, no source mutation after smoke, no other task/widget/route/migration/status change.",
  ],
];

phase("Final drift");
for (let round = 1; round <= 2; round += 1) {
  const finalResults = await Promise.all(
    FINAL_LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        `Fresh read-only TASK-543 final working-tree audit round ${round} at ${ROOT}. Lens: ${lens} ` +
          "Read task graph, source/tests/guides/changelog/index, full git diff/status, structured " +
          `validation ${JSON.stringify(fullGates)} and smoke ${JSON.stringify(smoke)}. ` +
          "Report all H/M/L with file:line. Do not edit.",
        { label: `final-audit:${id}:${round}`, phase: "Final drift", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    finalResults,
    FINAL_LENSES.map(([id]) => id),
    `TASK-543 final drift ${round}`
  );
  const finalFindings = finalResults.flatMap(({ result }) => result.findings);
  if (finalFindings.length === 0) break;
  if (round === 2) throw new Error("TASK-543 final drift is not clean");
  await agent(
    `${COMMON}\nFix only closure-owned task/guide/changelog/index evidence drift within ` +
      `${JSON.stringify(closureAllowed)}. Never edit source/tests/workflow or fabricate evidence. ` +
      `If a finding requires source/test mutation, return without editing so the next audit fails. ` +
      `Findings:\n${finalFindings
        .map((finding) => `- [${finding.severity}] ${finding.evidence}: ${finding.finding}`)
        .join("\n")}`,
    { label: `final-drift-fix:${round}`, phase: "Final drift" }
  );
}

phase("Final metadata gate");
const finalGate = await agent(
  `Final read-only TASK-543 metadata gate at ${ROOT}. Run exactly: node --check ${WORKFLOW} && ` +
    "git diff --check. Verify no staged files. Return pass=true only if all pass; do not edit.",
  { label: "final-gate:543", phase: "Final metadata gate", schema: RESULT_SCHEMA }
);
requirePassingResult(finalGate, "TASK-543 final metadata gate");
