import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { lstat, readFile, readdir, readlink, realpath, stat } from "node:fs/promises";
import { promisify } from "node:util";

export const meta = {
  name: "task-544-implement",
  description:
    "Implement TASK-544 sequentially: owned PostgreSQL slug-race mapping, retryable folder-cache dedupe, accessible state-preserving UI recovery, five-flow live smoke, and changelog 1256 closure. Agents never stage or commit.",
  phases: [
    { title: "Start" },
    { title: "544-01-L01" },
    { title: "544-02-L01" },
    { title: "544-03-L01" },
    { title: "544-04 prepare" },
    { title: "Post-audit" },
    { title: "Full validation" },
    { title: "Smoke" },
    { title: "Final drift" },
    { title: "Final closure" },
    { title: "Final gate" },
    { title: "Owner handoff" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const ENV = "set -a && source .env && set +a && ";
const SMOKE_PREFIX = ROOT + "/_docs/_workflows/_smoke/task-544-wf544smoke-";
const TODO_STATUS = "⏳ To Do";
const ACTIVE_STATUS = "🚧 In Progress";
const DONE_STATUS = "✅ Done";
const execFileAsync = promisify(execFile);

const utcDate = () => new Date().toISOString().slice(0, 10);
const changelogFileFor = (date) =>
  "_docs/_CHANGELOG/1256-" + date + "-task-544-media-folder-reliability-and-error-recovery.md";

const TASK_FILES = Object.freeze([
  "TASK-544_Media_Folder_Reliability_and_Error_Recovery.md",
  "TASK-544-01-Folder-Slug-Race-Mapping.md",
  "TASK-544-01-L01-Map-Create-And-Update-Constraint-Races-To-409.md",
  "TASK-544-02-Retryable-Folder-Cache-Dedupe.md",
  "TASK-544-02-L01-Clear-Settled-Promises-With-Identity-Guard.md",
  "TASK-544-03-Visible-Retryable-Folder-Ui-Errors.md",
  "TASK-544-03-L01-Recover-Create-Rename-Reorder-Delete-Without-State-Loss.md",
  "TASK-544-04-Tests-Smoke-And-Closure.md",
  "TASK-544-04-L01-Service-Route-Client-Ui-Smoke-And-Closure.md",
]);

const TASK_GRAPH = Object.freeze([
  {
    id: "TASK-544",
    file: TASK_FILES[0],
    parentTask: null,
    parentSubtask: null,
  },
  {
    id: "TASK-544-01",
    file: TASK_FILES[1],
    parentTask: "TASK-544",
    parentSubtask: null,
  },
  {
    id: "TASK-544-01-L01",
    file: TASK_FILES[2],
    parentTask: "TASK-544",
    parentSubtask: "TASK-544-01",
  },
  {
    id: "TASK-544-02",
    file: TASK_FILES[3],
    parentTask: "TASK-544",
    parentSubtask: null,
  },
  {
    id: "TASK-544-02-L01",
    file: TASK_FILES[4],
    parentTask: "TASK-544",
    parentSubtask: "TASK-544-02",
  },
  {
    id: "TASK-544-03",
    file: TASK_FILES[5],
    parentTask: "TASK-544",
    parentSubtask: null,
  },
  {
    id: "TASK-544-03-L01",
    file: TASK_FILES[6],
    parentTask: "TASK-544",
    parentSubtask: "TASK-544-03",
  },
  {
    id: "TASK-544-04",
    file: TASK_FILES[7],
    parentTask: "TASK-544",
    parentSubtask: null,
  },
  {
    id: "TASK-544-04-L01",
    file: TASK_FILES[8],
    parentTask: "TASK-544",
    parentSubtask: "TASK-544-04",
  },
]);

const PARENT_ROWS = Object.freeze(["TASK-544-01", "TASK-544-02", "TASK-544-03", "TASK-544-04"]);

const CHILD_LEAF_ROWS = Object.freeze({
  "TASK-544-01": "TASK-544-01-L01",
  "TASK-544-02": "TASK-544-02-L01",
  "TASK-544-03": "TASK-544-03-L01",
  "TASK-544-04": "TASK-544-04-L01",
});

const ACTIVATION_PREFIXES = Object.freeze([
  {
    key: "start",
    activeIds: Object.freeze(["TASK-544", "TASK-544-01", "TASK-544-01-L01"]),
    activeParentRows: Object.freeze(["TASK-544-01"]),
    activeLeafRows: Object.freeze(["TASK-544-01-L01"]),
    allowedFiles: Object.freeze([
      "_docs/_TASKS/" + TASK_FILES[0],
      "_docs/_TASKS/" + TASK_FILES[1],
      "_docs/_TASKS/" + TASK_FILES[2],
      "_docs/_TASKS/README.md",
    ]),
  },
  {
    key: "544-02-L01",
    activeIds: Object.freeze([
      "TASK-544",
      "TASK-544-01",
      "TASK-544-01-L01",
      "TASK-544-02",
      "TASK-544-02-L01",
    ]),
    activeParentRows: Object.freeze(["TASK-544-01", "TASK-544-02"]),
    activeLeafRows: Object.freeze(["TASK-544-01-L01", "TASK-544-02-L01"]),
    allowedFiles: Object.freeze([
      "_docs/_TASKS/" + TASK_FILES[0],
      "_docs/_TASKS/" + TASK_FILES[3],
      "_docs/_TASKS/" + TASK_FILES[4],
    ]),
  },
  {
    key: "544-03-L01",
    activeIds: Object.freeze([
      "TASK-544",
      "TASK-544-01",
      "TASK-544-01-L01",
      "TASK-544-02",
      "TASK-544-02-L01",
      "TASK-544-03",
      "TASK-544-03-L01",
    ]),
    activeParentRows: Object.freeze(["TASK-544-01", "TASK-544-02", "TASK-544-03"]),
    activeLeafRows: Object.freeze(["TASK-544-01-L01", "TASK-544-02-L01", "TASK-544-03-L01"]),
    allowedFiles: Object.freeze([
      "_docs/_TASKS/" + TASK_FILES[0],
      "_docs/_TASKS/" + TASK_FILES[5],
      "_docs/_TASKS/" + TASK_FILES[6],
    ]),
  },
  {
    key: "544-04-L01",
    activeIds: Object.freeze(TASK_GRAPH.map(({ id }) => id)),
    activeParentRows: PARENT_ROWS,
    activeLeafRows: Object.freeze(Object.values(CHILD_LEAF_ROWS)),
    allowedFiles: Object.freeze([
      "_docs/_TASKS/" + TASK_FILES[0],
      "_docs/_TASKS/" + TASK_FILES[7],
      "_docs/_TASKS/" + TASK_FILES[8],
    ]),
  },
]);

const ACTIVATION_STEPS = Object.freeze([
  { kind: "status", id: "TASK-544", file: "_docs/_TASKS/" + TASK_FILES[0] },
  { kind: "board", id: "TASK-544", file: "_docs/_TASKS/README.md" },
  ...PARENT_ROWS.flatMap((childId) => {
    const child = TASK_GRAPH.find((entry) => entry.id === childId);
    const leafId = CHILD_LEAF_ROWS[childId];
    const leaf = TASK_GRAPH.find((entry) => entry.id === leafId);
    if (!child || !leaf) throw new Error("TASK-544 activation graph definition mismatch");
    return [
      { kind: "status", id: childId, file: "_docs/_TASKS/" + child.file },
      { kind: "parentRow", id: childId, file: "_docs/_TASKS/" + TASK_FILES[0] },
      { kind: "status", id: leafId, file: "_docs/_TASKS/" + leaf.file },
      { kind: "leafRow", id: leafId, file: "_docs/_TASKS/" + child.file },
    ];
  }),
]);

const ACTIVATION_END = Object.freeze({
  start: 6,
  "544-02-L01": 10,
  "544-03-L01": 14,
  "544-04-L01": 18,
});

const TASK_PATHS = Object.freeze(TASK_FILES.map((file) => "_docs/_TASKS/" + file));

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

const LEAF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors", "touchedFiles"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    touchedFiles: { type: "array", items: { type: "string", minLength: 1 } },
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
          area: { type: "string", minLength: 1 },
          finding: { type: "string", minLength: 1 },
          evidence: { type: "string", minLength: 1 },
          recommendation: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "summary",
    "errors",
    "commands",
    "testFiles",
    "passed",
    "failed",
    "skipped",
    "failureKind",
    "failureCommandId",
    "failureEvidence",
  ],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    commands: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "command", "passed"],
        properties: {
          id: { type: "string", minLength: 1 },
          command: { type: "string", minLength: 1 },
          passed: { type: "boolean" },
        },
      },
    },
    testFiles: { type: "array", items: { type: "string", minLength: 1 } },
    passed: { type: "integer", minimum: 0 },
    failed: { type: "integer", minimum: 0 },
    skipped: { type: "integer", minimum: 0 },
    failureKind: { enum: ["none", "code-test", "infrastructure"] },
    failureCommandId: {
      anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
    },
    failureEvidence: {
      anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
    },
  },
};

const VALIDATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "summary",
    "errors",
    "commands",
    "commandOutcomes",
    "targetedFiles",
    "targetedPassed",
    "targetedFailed",
    "targetedSkipped",
    "fullBunPassed",
    "fullBunFailed",
    "fullBunSkipped",
    "fullVitestFiles",
    "fullVitestPassed",
    "fullVitestFailed",
    "fullVitestSkipped",
    "releaseGatesPassed",
    "strictScan",
  ],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    commands: {
      type: "array",
      minItems: 15,
      maxItems: 15,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "command", "passed"],
        properties: {
          id: { type: "string", minLength: 1 },
          command: { type: "string", minLength: 1 },
          passed: { type: "boolean" },
        },
      },
    },
    commandOutcomes: {
      type: "object",
      additionalProperties: false,
      required: [
        "dbPreflight",
        "lintTypes",
        "lint",
        "rootTsc",
        "targetedBun",
        "targetedVitest",
        "adminBuild",
        "adminBoundary",
        "adminBundle",
        "targetedSemgrep",
        "fullTest",
        "precommitCheck",
        "releaseGates",
        "strictScanExecuted",
        "diffCheck",
      ],
      properties: Object.fromEntries(
        [
          "dbPreflight",
          "lintTypes",
          "lint",
          "rootTsc",
          "targetedBun",
          "targetedVitest",
          "adminBuild",
          "adminBoundary",
          "adminBundle",
          "targetedSemgrep",
          "fullTest",
          "precommitCheck",
          "releaseGates",
          "strictScanExecuted",
          "diffCheck",
        ].map((key) => [key, { const: true }])
      ),
    },
    targetedFiles: { type: "array", minItems: 7, maxItems: 7, items: { type: "string" } },
    targetedPassed: { type: "integer", minimum: 1 },
    targetedFailed: { const: 0 },
    targetedSkipped: { const: 0 },
    fullBunPassed: { type: "integer", minimum: 1680 },
    fullBunFailed: { const: 0 },
    fullBunSkipped: { type: "integer", minimum: 0, maximum: 1 },
    fullVitestFiles: { type: "integer", minimum: 836 },
    fullVitestPassed: { type: "integer", minimum: 6746 },
    fullVitestFailed: { const: 0 },
    fullVitestSkipped: { const: 0 },
    releaseGatesPassed: { const: 5 },
    strictScan: {
      type: "object",
      additionalProperties: false,
      required: ["exitCode", "task544Findings", "toolingFailure", "externalFindings"],
      properties: {
        exitCode: { type: "integer" },
        task544Findings: { const: 0 },
        toolingFailure: { const: false },
        externalFindings: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["owner", "file", "rule"],
            properties: {
              owner: { enum: ["TASK-545"] },
              file: { const: "_docs/_workflows/task-522-author.mjs" },
              rule: {
                const:
                  "javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag",
              },
            },
          },
        },
      },
    },
  },
};

const HANDOFF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors", "commitFiles", "ownerSteps"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    commitFiles: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 },
    },
    ownerSteps: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: { type: "string", minLength: 1 },
    },
  },
};

const SMOKE_KINDS = Object.freeze([
  "list-retry",
  "create-retry",
  "rename-retry",
  "reorder-retry",
  "delete-retry",
]);

const FOLDER_OPERATION_MESSAGES = Object.freeze({
  load: "Folders could not be loaded. Retry the request.",
  create: "Folder could not be created. Retry when ready.",
  createConflict: "A folder with this slug already exists. Change the name or retry.",
  rename: "Folder could not be renamed. Retry when ready.",
  reorder: "Folder order could not be saved. Retry the same order.",
  delete: "Folder could not be deleted. Retry when ready.",
});

const FOLDER_RETRY_NAMES = Object.freeze({
  load: "Retry loading folders",
  create: "Retry creating folder",
  rename: "Retry renaming folder",
  reorder: "Retry saving folder order",
  deletePrefix: "Retry deleting ",
});

const NULLABLE_STRING_SCHEMA = {
  anyOf: [{ type: "string" }, { type: "null" }],
};

const TOKEN_SCHEMA = {
  anyOf: [{ type: "integer" }, { type: "string", minLength: 1 }],
};

const FORM_TARGET_SCHEMA = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "name", "parentId", "formGeneration"],
      properties: {
        kind: { const: "create" },
        name: { type: "string", minLength: 1 },
        parentId: NULLABLE_STRING_SCHEMA,
        formGeneration: { type: "integer", minimum: 1 },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["kind", "folderId", "name", "formGeneration"],
      properties: {
        kind: { const: "rename" },
        folderId: { type: "string", minLength: 1 },
        name: { type: "string", minLength: 1 },
        formGeneration: { type: "integer", minimum: 1 },
      },
    },
  ],
};
const NULLABLE_FORM_TARGET_SCHEMA = {
  anyOf: [FORM_TARGET_SCHEMA, { type: "null" }],
};
const NULLABLE_REORDER_ACTION_SCHEMA = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["rowId", "rowName", "direction"],
      properties: {
        rowId: { type: "string", minLength: 1 },
        rowName: { type: "string", minLength: 1 },
        direction: { enum: ["up", "down"] },
      },
    },
    { type: "null" },
  ],
};

const SMOKE_MATRIX = Object.freeze([
  {
    id: "list-retry-light-wide",
    kind: "list-retry",
    theme: "light",
    viewport: "wide",
    method: "GET",
    pattern: "**/admin/api/media/folders",
    targetRequired: false,
    attempts: 2,
  },
  {
    id: "create-retry-dark-narrow",
    kind: "create-retry",
    theme: "dark",
    viewport: "narrow",
    method: "POST",
    pattern: "**/admin/api/media/folders",
    targetRequired: false,
    attempts: 1,
  },
  {
    id: "rename-retry-dark-wide",
    kind: "rename-retry",
    theme: "dark",
    viewport: "wide",
    method: "PATCH",
    pattern: null,
    targetRequired: true,
    attempts: 1,
  },
  {
    id: "reorder-retry-light-narrow",
    kind: "reorder-retry",
    theme: "light",
    viewport: "narrow",
    method: "POST",
    pattern: "**/admin/api/media/folders/reorder",
    targetRequired: false,
    attempts: 1,
  },
  {
    id: "delete-retry-light-wide",
    kind: "delete-retry",
    theme: "light",
    viewport: "wide",
    method: "DELETE",
    pattern: null,
    targetRequired: true,
    attempts: 1,
  },
]);

const EMPTY_STRING_ARRAY_SCHEMA = { type: "array", maxItems: 0 };
const CLI_COMMAND_SCHEMA = {
  type: "string",
  pattern: "^playwright-cli -s=wf544smoke ",
};
const NULLABLE_CLI_COMMAND_SCHEMA = {
  anyOf: [CLI_COMMAND_SCHEMA, { type: "null" }],
};
const SMOKE_LOG_OBSERVATION_START =
  "playwright-cli -s=wf544smoke run-code '(page) => { " +
  "const previous = page.__wf544LogListeners; if (previous) { " +
  'page.off("console", previous.console); page.off("pageerror", previous.pageerror); } ' +
  "page.__wf544ConsoleErrors = []; page.__wf544ConsoleWarnings = []; " +
  "page.__wf544PageErrors = []; const onConsole = (message) => { " +
  'if (message.type() === "error") page.__wf544ConsoleErrors.push(message.text()); ' +
  'if (message.type() === "warning") page.__wf544ConsoleWarnings.push(message.text()); }; ' +
  "const onPageError = (error) => page.__wf544PageErrors.push(String(error)); " +
  'page.on("console", onConsole); page.on("pageerror", onPageError); ' +
  "page.__wf544LogListeners = { console: onConsole, pageerror: onPageError }; return true; }'";
const SMOKE_CONSOLE_ERROR_READ =
  "playwright-cli -s=wf544smoke run-code '(page) => page.__wf544ConsoleErrors ?? []'";
const SMOKE_CONSOLE_WARNING_READ =
  "playwright-cli -s=wf544smoke run-code '(page) => page.__wf544ConsoleWarnings ?? []'";
const SMOKE_PAGE_ERROR_READ =
  "playwright-cli -s=wf544smoke run-code '(page) => page.__wf544PageErrors ?? []'";
const SMOKE_LIST_REPRESENTATIVE_DISABLED_COMMAND =
  'playwright-cli -s=wf544smoke run-code \'(page) => page.locator("[data-media-folder-actions] button[aria-label^=\\"Delete \"]").first().isDisabled()\'';
const SMOKE_LIST_REPRESENTATIVE_SECOND_ACTIVATION_COMMAND =
  'playwright-cli -s=wf544smoke run-code \'(page) => page.locator("[data-media-folder-actions] button[aria-label^=\\"Delete \"]").first().evaluate((element) => { if (!(element instanceof HTMLButtonElement) || !element.disabled) return false; element.click(); return true; })\'';
const SMOKE_LIST_MUTATION_COUNTER_PATTERN = "**/admin/api/media/folders/*";
const SMOKE_RAIL_BUSY_COMMAND =
  'playwright-cli -s=wf544smoke run-code \'(page) => page.locator("[data-media-folder-rail]").getAttribute("aria-busy")\'';
const SMOKE_CONFIRM_CANCEL_COMMAND =
  "playwright-cli -s=wf544smoke run-code '(page) => page.evaluate(() => { window.confirm = () => false; return true; })'";
const SMOKE_CONFIRM_ACCEPT_COMMAND =
  "playwright-cli -s=wf544smoke run-code '(page) => page.evaluate(() => { window.confirm = () => true; return true; })'";
const SMOKE_CONFIRM_GUARD_COMMAND =
  "playwright-cli -s=wf544smoke run-code '(page) => page.evaluate(() => { window.confirm = () => { throw new Error(\"Unexpected delete confirmation\"); }; return true; })'";
const SMOKE_CONFIRM_RESTORE_COMMAND = "playwright-cli -s=wf544smoke reload";
const SMOKE_CONFIRM_EXECUTION_ORDER = Object.freeze([
  "cancelOverride",
  "cancelClick",
  "cancelDeleteCountRead",
  "acceptOverride",
  "faultDelete",
  "guardOverride",
  "retry",
  "successProbe",
  "screenshot",
  "nativeRestore",
]);
const SMOKE_GLOBAL_PAGE_UNROUTE_COMMAND =
  "playwright-cli -s=wf544smoke run-code '(page) => (async () => { await page.unrouteAll({ behavior: \"wait\" }); return true; })()'";

const FORBIDDEN_RECORDED_CLI_COMMANDS = Object.freeze([
  {
    label: "native dialog CLI",
    pattern: /\bdialog-(?:accept|dismiss)\b/i,
  },
  {
    label: "one-shot dialog handler",
    pattern: /page\s*\.\s*once\s*\(\s*(["'])dialog\1/i,
  },
  {
    label: "page-side smoke/evidence identifier",
    pattern: /(?:page|window|globalThis|self|document)\s*\.\s*__[$\w]*(?:smoke|evidence)[$\w]*/i,
  },
  {
    label: "page-side smoke/evidence bracket identifier",
    pattern:
      /(?:page|window|globalThis|self|document)\s*\[\s*(["'])[^"']*(?:smoke|evidence)[^"']*\1\s*\]/i,
  },
]);

function expectedInitialListCacheEventCommand(attemptId) {
  const safeSourceId = JSON.stringify(attemptId).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => page.evaluate((sourceId) => { " +
    'const channel = new BroadcastChannel("coderso.admin.cache"); ' +
    'channel.postMessage({ key: "media:folders", action: "invalidate", sourceId, ts: Date.now() }); ' +
    "channel.close(); return true; }, " +
    safeSourceId +
    ")'"
  );
}

function expectedRouteFaultCommand(attemptId, method, pattern) {
  const safeAttemptId = JSON.stringify(attemptId).replaceAll("'", "\\u0027");
  const safeMethod = JSON.stringify(method).replaceAll("'", "\\u0027");
  const safePattern = JSON.stringify(pattern).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => { const key = " +
    safeAttemptId +
    "; const pattern = " +
    safePattern +
    "; const method = " +
    safeMethod +
    "; page.__wf544FaultHits ??= {}; page.__wf544FaultRelease ??= {}; " +
    "page.__wf544FaultHits[key] = 0; return page.route(pattern, async (route) => { " +
    "const request = route.request(); if (request.method() !== method) return route.continue(); " +
    "page.__wf544FaultHits[key] += 1; if (page.__wf544FaultHits[key] > 1) { " +
    'await route.fulfill({ status: 200, contentType: "application/json", body: "{" }); return; } ' +
    "await new Promise((resolve) => { page.__wf544FaultRelease[key] = resolve; }); " +
    'await route.fulfill({ status: 200, contentType: "application/json", body: "{" }); }); }\''
  );
}

function expectedListMutationCounterSetupCommand(attemptId) {
  const safeAttemptId = JSON.stringify(attemptId).replaceAll("'", "\\u0027");
  const safePattern = JSON.stringify(SMOKE_LIST_MUTATION_COUNTER_PATTERN).replaceAll(
    "'",
    "\\u0027"
  );
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => { const key = " +
    safeAttemptId +
    "; const pattern = " +
    safePattern +
    "; page.__wf544MutationHits ??= {}; page.__wf544MutationHits[key] = 0; " +
    'return page.route(pattern, async (route) => { if (route.request().method() !== "DELETE") ' +
    "return route.continue(); page.__wf544MutationHits[key] += 1; " +
    'await route.fulfill({ status: 200, contentType: "application/json", body: "{" }); }); }\''
  );
}

function expectedListMutationCounterReadAndCleanupCommand(attemptId) {
  const safeAttemptId = JSON.stringify(attemptId).replaceAll("'", "\\u0027");
  const safePattern = JSON.stringify(SMOKE_LIST_MUTATION_COUNTER_PATTERN).replaceAll(
    "'",
    "\\u0027"
  );
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => (async () => { const key = " +
    safeAttemptId +
    "; const pattern = " +
    safePattern +
    "; const hits = page.__wf544MutationHits?.[key] ?? 0; await page.unroute(pattern); " +
    "return hits; })()'"
  );
}

function expectedPageUnrouteCommand(pattern) {
  const safePattern = JSON.stringify(pattern).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => (async () => { await page.unroute(" +
    safePattern +
    "); return true; })()'"
  );
}

function expectedFaultHitReadCommand(attemptId) {
  const safeAttemptId = JSON.stringify(attemptId).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => " +
    "page.__wf544FaultHits[" +
    safeAttemptId +
    "] ?? 0'"
  );
}

const SMOKE_CONFIRM_EVIDENCE_SCHEMA = {
  anyOf: [
    { type: "null" },
    {
      type: "object",
      additionalProperties: false,
      required: [
        "executionOrder",
        "cancelOverrideCommand",
        "cancelOverrideOutput",
        "cancelClickCommand",
        "cancelClickCompleted",
        "cancelDeleteCountReadCommand",
        "cancelDeleteCountReadOutput",
        "acceptOverrideCommand",
        "acceptOverrideOutput",
        "faultDeleteCommand",
        "guardOverrideCommand",
        "guardOverrideOutput",
        "retryCommand",
        "successProbeCommand",
        "screenshotCommand",
        "nativeRestoreCommand",
        "nativeRestoreCompleted",
      ],
      properties: {
        executionOrder: { const: SMOKE_CONFIRM_EXECUTION_ORDER },
        cancelOverrideCommand: { const: SMOKE_CONFIRM_CANCEL_COMMAND },
        cancelOverrideOutput: { const: true },
        cancelClickCommand: CLI_COMMAND_SCHEMA,
        cancelClickCompleted: { const: true },
        cancelDeleteCountReadCommand: {
          type: "string",
          pattern: "^playwright-cli -s=wf544smoke run-code ",
        },
        cancelDeleteCountReadOutput: { const: 0 },
        acceptOverrideCommand: { const: SMOKE_CONFIRM_ACCEPT_COMMAND },
        acceptOverrideOutput: { const: true },
        faultDeleteCommand: CLI_COMMAND_SCHEMA,
        guardOverrideCommand: { const: SMOKE_CONFIRM_GUARD_COMMAND },
        guardOverrideOutput: { const: true },
        retryCommand: CLI_COMMAND_SCHEMA,
        successProbeCommand: {
          type: "string",
          pattern: "^playwright-cli -s=wf544smoke run-code ",
        },
        screenshotCommand: {
          type: "string",
          pattern: "^playwright-cli -s=wf544smoke screenshot --filename ",
        },
        nativeRestoreCommand: { const: SMOKE_CONFIRM_RESTORE_COMMAND },
        nativeRestoreCompleted: { const: true },
      },
    },
  ],
};
const LOG_READ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "consoleCommand",
    "consoleOutput",
    "warningCommand",
    "warningOutput",
    "pageErrorCommand",
    "pageErrorOutput",
  ],
  properties: {
    consoleCommand: { const: SMOKE_CONSOLE_ERROR_READ },
    consoleOutput: EMPTY_STRING_ARRAY_SCHEMA,
    warningCommand: { const: SMOKE_CONSOLE_WARNING_READ },
    warningOutput: EMPTY_STRING_ARRAY_SCHEMA,
    pageErrorCommand: { const: SMOKE_PAGE_ERROR_READ },
    pageErrorOutput: EMPTY_STRING_ARRAY_SCHEMA,
  },
};
const RECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["x", "y", "width", "height", "right", "bottom"],
  properties: Object.fromEntries(
    ["x", "y", "width", "height", "right", "bottom"].map((key) => [key, { type: "number" }])
  ),
};
const SMOKE_STATE_SNAPSHOT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "input",
    "order",
    "selection",
    "activeFolderId",
    "mediaFilterStateFolderId",
    "knownRows",
    "rows",
    "childParent",
    "focusedElement",
    "formOpen",
  ],
  properties: {
    input: NULLABLE_STRING_SCHEMA,
    order: { type: "array", items: { type: "string" } },
    selection: NULLABLE_STRING_SCHEMA,
    activeFolderId: NULLABLE_STRING_SCHEMA,
    mediaFilterStateFolderId: NULLABLE_STRING_SCHEMA,
    knownRows: { type: "array", items: { type: "string" } },
    rows: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "parentId"],
        properties: {
          id: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          parentId: NULLABLE_STRING_SCHEMA,
        },
      },
    },
    childParent: NULLABLE_STRING_SCHEMA,
    focusedElement: NULLABLE_STRING_SCHEMA,
    formOpen: { type: "boolean" },
  },
};

const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "adminUp",
    "frontUp",
    "commands",
    "helper",
    "scenarios",
    "consoleErrors",
    "consoleWarnings",
    "pageErrors",
    "screenshots",
    "fixtureIds",
    "fixtureCleanup",
    "visualMatrix",
    "finalRouteListOutput",
    "finalRouteListEmpty",
    "themeBefore",
    "themeReadResult",
    "themeAfter",
    "themeRestoreResult",
    "routesCleared",
    "browserClosed",
    "serverStopped",
    "failures",
  ],
  properties: {
    pass: { type: "boolean" },
    adminUp: { const: true },
    frontUp: { const: true },
    commands: {
      type: "object",
      additionalProperties: false,
      required: [
        "helperStart",
        "adminHealth",
        "frontHealth",
        "browserOpen",
        "loginEmail",
        "loginPassword",
        "loginSubmit",
        "consoleObservationStart",
        "routeCleanup",
        "finalRouteList",
        "themeRead",
        "themeRestore",
        "browserClose",
        "sessionList",
        "helperStop",
      ],
      properties: {
        helperStart: { const: "coderso-dev-core-host /home/coder/project/Coderso" },
        adminHealth: {
          const:
            "curl --fail --silent --show-error http://coderso-a.localhost:5173/admin/ >/dev/null",
        },
        frontHealth: {
          const: "curl --fail --silent --show-error http://coderso-a.localhost:3000 >/dev/null",
        },
        browserOpen: {
          const:
            'playwright-cli -s=wf544smoke open http://coderso-a.localhost:5173/admin/media --device "iPhone 15"',
        },
        loginEmail: {
          const:
            'playwright-cli -s=wf544smoke fill \'input[type="email"]\' "$ADMIN_EMAIL" >/dev/null',
        },
        loginPassword: {
          const:
            'playwright-cli -s=wf544smoke fill \'input[type="password"]\' "$ADMIN_PASSWORD" >/dev/null',
        },
        loginSubmit: { type: "string", pattern: "^playwright-cli -s=wf544smoke click " },
        consoleObservationStart: { const: SMOKE_LOG_OBSERVATION_START },
        routeCleanup: { type: "array", minItems: 5, items: CLI_COMMAND_SCHEMA },
        finalRouteList: { const: "playwright-cli -s=wf544smoke route-list" },
        themeRead: CLI_COMMAND_SCHEMA,
        themeRestore: CLI_COMMAND_SCHEMA,
        browserClose: { const: "playwright-cli -s=wf544smoke close" },
        sessionList: { const: "playwright-cli list" },
        helperStop: { type: "string", minLength: 1 },
      },
    },
    helper: {
      type: "object",
      additionalProperties: false,
      required: [
        "pid",
        "childPids",
        "ownedPortsBefore",
        "processesAbsent",
        "ports",
        "processChecks",
        "portChecks",
        "sessionListOutput",
        "sessionAbsent",
      ],
      properties: {
        pid: { type: "integer", minimum: 1 },
        childPids: { type: "array", minItems: 1, items: { type: "integer", minimum: 1 } },
        ownedPortsBefore: {
          type: "array",
          minItems: 2,
          items: { type: "integer", minimum: 1, maximum: 65535 },
        },
        processesAbsent: { const: true },
        ports: {
          type: "array",
          minItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["port", "ownerBefore", "stopped"],
            properties: {
              port: { type: "integer", minimum: 1, maximum: 65535 },
              ownerBefore: { type: "integer", minimum: 1 },
              stopped: { const: true },
            },
          },
        },
        processChecks: {
          type: "array",
          minItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["pid", "command", "absent"],
            properties: {
              pid: { type: "integer", minimum: 1 },
              command: { type: "string", minLength: 1 },
              absent: { const: true },
            },
          },
        },
        portChecks: {
          type: "array",
          minItems: 2,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["port", "command", "absent"],
            properties: {
              port: { type: "integer", minimum: 1, maximum: 65535 },
              command: { type: "string", minLength: 1 },
              absent: { const: true },
            },
          },
        },
        sessionListOutput: { type: "string" },
        sessionAbsent: { const: true },
      },
    },
    scenarios: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "kind",
          "theme",
          "viewport",
          "targetId",
          "targetName",
          "childId",
          "successTargetId",
          "expectedName",
          "reorderAction",
          "mismatchDraft",
          "ownedFixtureIds",
          "probeExecutionOrder",
          "viewportCommand",
          "viewportApplied",
          "themeCommand",
          "themeApplied",
          "setupCommands",
          "confirmCancelCommand",
          "confirmAcceptCommand",
          "confirmGuardCommand",
          "confirmRestoreCommand",
          "confirmEvidence",
          "attempts",
          "tokenBefore",
          "failureTokens",
          "finalRetry",
          "finalRetryRequests",
          "state",
          "formEvidence",
          "requestEvidence",
          "geometry",
          "mediaQueries",
          "beforeProbeCommand",
          "beforeProbeOutput",
          "assertionProbeCommand",
          "assertionProbeOutput",
          "makeDraftMismatchCommand",
          "makeDraftMismatchOutput",
          "restoreMatchingFormCommand",
          "restoreMatchingFormOutput",
          "successProbeCommand",
          "successProbeOutput",
          "logReads",
          "consoleErrors",
          "consoleWarnings",
          "pageErrors",
          "screenshotCommands",
          "screenshots",
        ],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { enum: SMOKE_KINDS },
          theme: { enum: ["light", "dark"] },
          viewport: { enum: ["wide", "narrow"] },
          targetId: NULLABLE_STRING_SCHEMA,
          targetName: NULLABLE_STRING_SCHEMA,
          childId: NULLABLE_STRING_SCHEMA,
          successTargetId: NULLABLE_STRING_SCHEMA,
          expectedName: NULLABLE_STRING_SCHEMA,
          reorderAction: NULLABLE_REORDER_ACTION_SCHEMA,
          mismatchDraft: NULLABLE_STRING_SCHEMA,
          ownedFixtureIds: {
            type: "array",
            minItems: 1,
            uniqueItems: true,
            items: { type: "string", minLength: 1 },
          },
          probeExecutionOrder: {
            const: [
              "beforeProbe",
              "faultAttempts",
              "makeDraftMismatchIfNeeded",
              "assertionProbe",
              "restoreMatchingFormIfNeeded",
              "finalRetry",
              "successProbe",
            ],
          },
          viewportCommand: CLI_COMMAND_SCHEMA,
          viewportApplied: { enum: ["1440x900", "390x844"] },
          themeCommand: CLI_COMMAND_SCHEMA,
          themeApplied: { enum: ["light", "dark"] },
          setupCommands: { type: "array", minItems: 2, items: CLI_COMMAND_SCHEMA },
          confirmCancelCommand: NULLABLE_CLI_COMMAND_SCHEMA,
          confirmAcceptCommand: NULLABLE_CLI_COMMAND_SCHEMA,
          confirmGuardCommand: NULLABLE_CLI_COMMAND_SCHEMA,
          confirmRestoreCommand: NULLABLE_CLI_COMMAND_SCHEMA,
          confirmEvidence: SMOKE_CONFIRM_EVIDENCE_SCHEMA,
          attempts: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "id",
                "phase",
                "method",
                "pattern",
                "targetId",
                "fault",
                "faultHits",
                "executionOrder",
                "commands",
                "actionOutput",
                "pending",
                "releaseResult",
                "hitReadResult",
                "pageUnrouteResult",
                "failureProbeCommand",
                "failureProbeOutput",
                "routeListOutput",
                "routeAbsent",
                "unrouted",
              ],
              properties: {
                id: { type: "string", minLength: 1 },
                phase: { enum: ["initial", "retry"] },
                method: { enum: ["GET", "POST", "PATCH", "DELETE"] },
                pattern: { type: "string", minLength: 1 },
                targetId: NULLABLE_STRING_SCHEMA,
                fault: { const: "syntactically-invalid-json-200" },
                faultHits: { const: 1 },
                executionOrder: {
                  const: [
                    "routeFault",
                    "mutationCounterSetupIfNeeded",
                    "action",
                    "pendingRailBusy",
                    "pendingControlProbe",
                    "pendingSecondActivationIfNeeded",
                    "pendingMutationCounterReadAndCleanupIfNeeded",
                    "pendingHitRead",
                    "release",
                    "failureProbe",
                    "hitRead",
                    "unroute",
                    "pageUnroute",
                    "routeList",
                  ],
                },
                commands: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "routeFault",
                    "mutationCounterSetup",
                    "action",
                    "pending",
                    "release",
                    "hitRead",
                    "unroute",
                    "pageUnroute",
                    "routeList",
                  ],
                  properties: {
                    routeFault: {
                      type: "string",
                      pattern: "^playwright-cli -s=wf544smoke run-code ",
                    },
                    mutationCounterSetup: NULLABLE_CLI_COMMAND_SCHEMA,
                    action: CLI_COMMAND_SCHEMA,
                    pending: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "railBusy",
                        "controlProbe",
                        "secondActivation",
                        "mutationCounterReadAndCleanup",
                        "hitRead",
                      ],
                      properties: {
                        railBusy: CLI_COMMAND_SCHEMA,
                        controlProbe: CLI_COMMAND_SCHEMA,
                        secondActivation: NULLABLE_CLI_COMMAND_SCHEMA,
                        mutationCounterReadAndCleanup: NULLABLE_CLI_COMMAND_SCHEMA,
                        hitRead: {
                          type: "string",
                          pattern: "^playwright-cli -s=wf544smoke run-code ",
                        },
                      },
                    },
                    release: {
                      type: "string",
                      pattern: "^playwright-cli -s=wf544smoke run-code ",
                    },
                    hitRead: {
                      type: "string",
                      pattern: "^playwright-cli -s=wf544smoke run-code ",
                    },
                    unroute: {
                      type: "string",
                      pattern: "^playwright-cli -s=wf544smoke unroute ",
                    },
                    pageUnroute: {
                      type: "string",
                      pattern: "^playwright-cli -s=wf544smoke run-code ",
                    },
                    routeList: { const: "playwright-cli -s=wf544smoke route-list" },
                  },
                },
                actionOutput: { anyOf: [{ type: "null" }, { const: true }, { const: 1 }] },
                pending: {
                  oneOf: [
                    {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "mode",
                        "railAriaBusyOutput",
                        "controlProbeOutput",
                        "secondActivationOutput",
                        "representativeMutationRequestCount",
                        "hitReadOutput",
                      ],
                      properties: {
                        mode: { const: "initiating-control-disabled" },
                        railAriaBusyOutput: { const: "true" },
                        controlProbeOutput: { const: true },
                        secondActivationOutput: { const: true },
                        representativeMutationRequestCount: {
                          anyOf: [{ const: 0 }, { type: "null" }],
                        },
                        hitReadOutput: { const: 1 },
                      },
                    },
                    {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "mode",
                        "railAriaBusyOutput",
                        "controlProbeOutput",
                        "secondActivationOutput",
                        "representativeMutationRequestCount",
                        "hitReadOutput",
                      ],
                      properties: {
                        mode: { const: "consumed-retry-absent" },
                        railAriaBusyOutput: { const: "true" },
                        controlProbeOutput: { const: 0 },
                        secondActivationOutput: { type: "null" },
                        representativeMutationRequestCount: { type: "null" },
                        hitReadOutput: { const: 1 },
                      },
                    },
                  ],
                },
                releaseResult: { const: true },
                hitReadResult: { const: 1 },
                pageUnrouteResult: { const: true },
                failureProbeCommand: {
                  type: "string",
                  pattern: "^playwright-cli -s=wf544smoke run-code ",
                },
                failureProbeOutput: {
                  type: "object",
                  additionalProperties: false,
                  required: [
                    "alertText",
                    "retryName",
                    "token",
                    "visible",
                    "input",
                    "focusedElement",
                  ],
                  properties: {
                    alertText: { type: "string", minLength: 1, maxLength: 96 },
                    retryName: { type: "string", minLength: 1 },
                    token: TOKEN_SCHEMA,
                    visible: { const: true },
                    input: NULLABLE_STRING_SCHEMA,
                    focusedElement: NULLABLE_STRING_SCHEMA,
                  },
                },
                routeListOutput: { type: "string" },
                routeAbsent: { const: true },
                unrouted: { const: true },
              },
            },
          },
          tokenBefore: {
            anyOf: [{ type: "null" }, { type: "integer" }, { type: "string", minLength: 1 }],
          },
          failureTokens: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: { anyOf: [{ type: "integer" }, { type: "string", minLength: 1 }] },
          },
          finalRetry: CLI_COMMAND_SCHEMA,
          finalRetryRequests: { const: 1 },
          state: {
            type: "object",
            additionalProperties: false,
            required: [
              "alertText",
              "retryName",
              "successVisible",
              "exactFocusedElement",
              "focusRetained",
              "inputBefore",
              "inputOnFailure",
              "orderBefore",
              "orderOnFailure",
              "orderAfter",
              "selectionBefore",
              "selectionOnFailure",
              "selectionAfter",
              "activeFolderIdBefore",
              "activeFolderIdOnFailure",
              "activeFolderIdAfter",
              "mediaFilterStateFolderIdBefore",
              "mediaFilterStateFolderIdOnFailure",
              "mediaFilterStateFolderIdAfter",
              "knownRowsBefore",
              "knownRowsOnFailure",
              "knownRowsAfter",
              "capturedOrder",
              "childParentBefore",
              "childParentOnFailure",
              "childParentAfter",
            ],
            properties: {
              alertText: { type: "string", minLength: 1, maxLength: 96 },
              retryName: { type: "string", minLength: 1 },
              successVisible: { const: true },
              exactFocusedElement: NULLABLE_STRING_SCHEMA,
              focusRetained: { type: "boolean" },
              inputBefore: NULLABLE_STRING_SCHEMA,
              inputOnFailure: NULLABLE_STRING_SCHEMA,
              orderBefore: { type: "array", items: { type: "string" } },
              orderOnFailure: { type: "array", items: { type: "string" } },
              orderAfter: { type: "array", items: { type: "string" } },
              selectionBefore: NULLABLE_STRING_SCHEMA,
              selectionOnFailure: NULLABLE_STRING_SCHEMA,
              selectionAfter: NULLABLE_STRING_SCHEMA,
              activeFolderIdBefore: NULLABLE_STRING_SCHEMA,
              activeFolderIdOnFailure: NULLABLE_STRING_SCHEMA,
              activeFolderIdAfter: NULLABLE_STRING_SCHEMA,
              mediaFilterStateFolderIdBefore: NULLABLE_STRING_SCHEMA,
              mediaFilterStateFolderIdOnFailure: NULLABLE_STRING_SCHEMA,
              mediaFilterStateFolderIdAfter: NULLABLE_STRING_SCHEMA,
              knownRowsBefore: { type: "array", items: { type: "string" } },
              knownRowsOnFailure: { type: "array", items: { type: "string" } },
              knownRowsAfter: { type: "array", items: { type: "string" } },
              capturedOrder: { type: "array", items: { type: "string" } },
              childParentBefore: NULLABLE_STRING_SCHEMA,
              childParentOnFailure: NULLABLE_STRING_SCHEMA,
              childParentAfter: NULLABLE_STRING_SCHEMA,
            },
          },
          formEvidence: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: [
                  "operationKind",
                  "errorToken",
                  "retryTarget",
                  "currentTargetSnapshot",
                  "currentDraft",
                  "draftMismatchVisible",
                ],
                properties: {
                  operationKind: { enum: ["create", "rename"] },
                  errorToken: TOKEN_SCHEMA,
                  retryTarget: FORM_TARGET_SCHEMA,
                  currentTargetSnapshot: FORM_TARGET_SCHEMA,
                  currentDraft: { type: "string", minLength: 1 },
                  draftMismatchVisible: { const: true },
                },
              },
            ],
          },
          requestEvidence: {
            type: "object",
            additionalProperties: false,
            required: [
              "faultedRequests",
              "successfulRetryRequests",
              "deleteCancelRequests",
              "secondDeleteDialogCount",
            ],
            properties: {
              faultedRequests: { type: "integer", minimum: 1, maximum: 2 },
              successfulRetryRequests: { const: 1 },
              deleteCancelRequests: { const: 0 },
              secondDeleteDialogCount: { const: 0 },
            },
          },
          geometry: {
            type: "object",
            additionalProperties: false,
            required: [
              "rail",
              "alert",
              "action",
              "clientWidth",
              "scrollWidth",
              "tokenClasses",
              "computed",
            ],
            properties: {
              rail: RECT_SCHEMA,
              alert: RECT_SCHEMA,
              action: RECT_SCHEMA,
              clientWidth: { type: "number", minimum: 1 },
              scrollWidth: { type: "number", minimum: 1 },
              tokenClasses: { type: "array", minItems: 2, items: { type: "string" } },
              computed: {
                type: "object",
                additionalProperties: false,
                required: ["background", "foreground", "display", "visibility"],
                properties: {
                  background: { type: "string", pattern: "^rgba?\\(" },
                  foreground: { type: "string", pattern: "^rgba?\\(" },
                  display: { type: "string", minLength: 1 },
                  visibility: { type: "string", minLength: 1 },
                },
              },
            },
          },
          mediaQueries: {
            type: "object",
            additionalProperties: false,
            required: ["touch", "hoverNone", "coarsePointer"],
            properties: {
              touch: { const: true },
              hoverNone: { const: true },
              coarsePointer: { const: true },
            },
          },
          beforeProbeCommand: {
            type: "string",
            pattern: "^playwright-cli -s=wf544smoke run-code ",
          },
          beforeProbeOutput: SMOKE_STATE_SNAPSHOT_SCHEMA,
          assertionProbeCommand: {
            type: "string",
            pattern: "^playwright-cli -s=wf544smoke run-code ",
          },
          assertionProbeOutput: {
            type: "object",
            additionalProperties: false,
            required: ["state", "formEvidence", "geometry", "mediaQueries"],
            properties: {
              state: SMOKE_STATE_SNAPSHOT_SCHEMA,
              formEvidence: {
                anyOf: [
                  { type: "null" },
                  {
                    type: "object",
                  },
                ],
              },
              geometry: { type: "object" },
              mediaQueries: { type: "object" },
            },
          },
          makeDraftMismatchCommand: NULLABLE_CLI_COMMAND_SCHEMA,
          makeDraftMismatchOutput: NULLABLE_FORM_TARGET_SCHEMA,
          restoreMatchingFormCommand: NULLABLE_CLI_COMMAND_SCHEMA,
          restoreMatchingFormOutput: NULLABLE_FORM_TARGET_SCHEMA,
          successProbeCommand: {
            type: "string",
            pattern: "^playwright-cli -s=wf544smoke run-code ",
          },
          successProbeOutput: SMOKE_STATE_SNAPSHOT_SCHEMA,
          logReads: LOG_READ_SCHEMA,
          consoleErrors: EMPTY_STRING_ARRAY_SCHEMA,
          consoleWarnings: EMPTY_STRING_ARRAY_SCHEMA,
          pageErrors: EMPTY_STRING_ARRAY_SCHEMA,
          screenshotCommands: { type: "array", minItems: 1, items: CLI_COMMAND_SCHEMA },
          screenshots: { type: "array", minItems: 1, items: { type: "string" } },
        },
      },
    },
    visualMatrix: {
      type: "object",
      additionalProperties: false,
      required: ["wideRailWidthPx", "narrowOverflow", "lightActive", "darkActive"],
      properties: {
        wideRailWidthPx: { const: 200 },
        narrowOverflow: { const: false },
        lightActive: {
          type: "object",
          additionalProperties: false,
          required: ["background", "foreground"],
          properties: {
            background: { type: "string", pattern: "^rgba?\\(" },
            foreground: { type: "string", pattern: "^rgba?\\(" },
          },
        },
        darkActive: {
          type: "object",
          additionalProperties: false,
          required: ["background", "foreground"],
          properties: {
            background: { type: "string", pattern: "^rgba?\\(" },
            foreground: { type: "string", pattern: "^rgba?\\(" },
          },
        },
      },
    },
    finalRouteListOutput: { type: "string" },
    finalRouteListEmpty: { const: true },
    consoleErrors: EMPTY_STRING_ARRAY_SCHEMA,
    consoleWarnings: EMPTY_STRING_ARRAY_SCHEMA,
    pageErrors: EMPTY_STRING_ARRAY_SCHEMA,
    screenshots: { type: "array", minItems: 5, items: { type: "string" } },
    fixtureIds: {
      type: "object",
      additionalProperties: false,
      required: ["created", "deleted", "verifiedAbsent"],
      properties: {
        created: { type: "array", minItems: 4, items: { type: "string" } },
        deleted: { type: "array", minItems: 4, items: { type: "string" } },
        verifiedAbsent: { type: "array", minItems: 4, items: { type: "string" } },
      },
    },
    fixtureCleanup: {
      type: "array",
      minItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "deleteCommand", "verifyCommand", "deleted", "absent"],
        properties: {
          id: { type: "string", minLength: 1 },
          deleteCommand: CLI_COMMAND_SCHEMA,
          verifyCommand: CLI_COMMAND_SCHEMA,
          deleted: { const: true },
          absent: { const: true },
        },
      },
    },
    themeBefore: { enum: ["light", "dark"] },
    themeReadResult: {
      type: "object",
      additionalProperties: false,
      required: ["preference", "resolved"],
      properties: {
        preference: { enum: ["light", "dark"] },
        resolved: { enum: ["light", "dark"] },
      },
    },
    themeAfter: { enum: ["light", "dark"] },
    themeRestoreResult: {
      type: "object",
      additionalProperties: false,
      required: ["preference", "resolved"],
      properties: {
        preference: { enum: ["light", "dark"] },
        resolved: { enum: ["light", "dark"] },
      },
    },
    routesCleared: { const: true },
    browserClosed: { const: true },
    serverStopped: { const: true },
    failures: { type: "array", maxItems: 0 },
  },
};

const SMOKE_CLEANUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "errors",
    "browserWasPresent",
    "commands",
    "latchesReleased",
    "routeListOutput",
    "routesEmpty",
    "browserClosed",
    "sessionListOutput",
    "sessionAbsent",
    "helperRootPid",
    "helperPids",
    "ports",
    "verifiedAbsentPorts",
    "processChecks",
    "portChecks",
    "helperStopped",
    "processesAbsent",
    "processCheckPassed",
    "portCheckPassed",
    "failures",
  ],
  properties: {
    pass: { const: true },
    errors: EMPTY_STRING_ARRAY_SCHEMA,
    browserWasPresent: { type: "boolean" },
    commands: {
      type: "object",
      additionalProperties: false,
      required: [
        "release",
        "unroute",
        "pageUnroute",
        "routeList",
        "browserClose",
        "sessionList",
        "helperStop",
      ],
      properties: {
        release: NULLABLE_CLI_COMMAND_SCHEMA,
        unroute: NULLABLE_CLI_COMMAND_SCHEMA,
        pageUnroute: NULLABLE_CLI_COMMAND_SCHEMA,
        routeList: NULLABLE_CLI_COMMAND_SCHEMA,
        browserClose: NULLABLE_CLI_COMMAND_SCHEMA,
        sessionList: { const: "playwright-cli list" },
        helperStop: NULLABLE_STRING_SCHEMA,
      },
    },
    latchesReleased: { const: true },
    routeListOutput: { type: "string" },
    routesEmpty: { const: true },
    browserClosed: { const: true },
    sessionListOutput: { type: "string" },
    sessionAbsent: { const: true },
    helperRootPid: {
      anyOf: [{ type: "integer", minimum: 1 }, { type: "null" }],
    },
    helperPids: { type: "array", items: { type: "integer", minimum: 1 } },
    ports: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["port", "ownerBefore", "stopped"],
        properties: {
          port: { type: "integer", minimum: 1, maximum: 65535 },
          ownerBefore: { type: "integer", minimum: 1 },
          stopped: { const: true },
        },
      },
    },
    verifiedAbsentPorts: {
      type: "array",
      minItems: 2,
      uniqueItems: true,
      items: { type: "integer", minimum: 1, maximum: 65535 },
    },
    processChecks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pid", "command", "absent"],
        properties: {
          pid: { type: "integer", minimum: 1 },
          command: { type: "string", minLength: 1 },
          absent: { const: true },
        },
      },
    },
    portChecks: {
      type: "array",
      minItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["port", "command", "absent"],
        properties: {
          port: { type: "integer", minimum: 1, maximum: 65535 },
          command: { type: "string", minLength: 1 },
          absent: { const: true },
        },
      },
    },
    helperStopped: { const: true },
    processesAbsent: { const: true },
    processCheckPassed: { const: true },
    portCheckPassed: { const: true },
    failures: EMPTY_STRING_ARRAY_SCHEMA,
  },
};

const DB_PREFLIGHT =
  ENV +
  'bun --eval \'import { canConnect } from "./tests/utils/db"; ' +
  'if (!(await canConnect())) throw new Error("task_544_db_unreachable"); process.exit(0)\'';
const LINT_TYPES = "bun --cwd core lint:types";
const LINT = "bun --cwd core lint";
const ROOT_TSC = "bun x tsc -p tsconfig.json --noEmit";
const SERVICE_TESTS =
  ENV +
  "bun test --timeout=15000 tests/unit/media/mediaFoldersService.test.ts " +
  "tests/integration/routes/media-folders.test.ts";
const CLIENT_TESTS =
  ENV +
  "NODE_ENV=test bunx vitest run --config vitest.config.ts " +
  "tests/vitest/admin/mediaFoldersClient.test.ts";
const UI_TESTS =
  ENV +
  "NODE_ENV=test bunx vitest run --config vitest.config.ts " +
  "tests/vitest/ui/media-folder-rail.test.tsx " +
  "tests/vitest/ui/media-library.test.tsx " +
  "tests/vitest/mediaUi/mediaLibrary.test.tsx";
const CLOSURE_BUN_TESTS =
  ENV +
  "bun test --timeout=15000 tests/unit/media/mediaFoldersService.test.ts " +
  "tests/integration/routes/media-folders.test.ts tests/integration/routes/media.test.ts";
const TARGETED_VITEST =
  ENV +
  "NODE_ENV=test bunx vitest run --config vitest.config.ts " +
  "tests/vitest/admin/mediaFoldersClient.test.ts " +
  "tests/vitest/ui/media-folder-rail.test.tsx " +
  "tests/vitest/ui/media-library.test.tsx " +
  "tests/vitest/mediaUi/mediaLibrary.test.tsx";
const TARGETED_SEMGREP =
  "semgrep --error --timeout 120 --timeout-threshold 0 " +
  "--config .semgrep.yml --config p/owasp-top-ten --config p/security-audit " +
  "--config p/nodejs --config p/typescript " +
  "core/services/media/mediaFoldersService.ts " +
  "core/admin/services/mediaFoldersClient.ts " +
  "core/admin/ui/media/MediaLibraryPage.tsx " +
  "core/admin/ui/media/MediaFolderRail.tsx";

const FULL_COMMANDS = Object.freeze([
  { id: "dbPreflight", command: DB_PREFLIGHT },
  { id: "lintTypes", command: LINT_TYPES },
  { id: "lint", command: LINT },
  { id: "rootTsc", command: ROOT_TSC },
  { id: "targetedBun", command: CLOSURE_BUN_TESTS },
  { id: "targetedVitest", command: TARGETED_VITEST },
  { id: "adminBuild", command: "bun --cwd core build:admin" },
  { id: "adminBoundary", command: "bun run check:admin-boundary" },
  { id: "adminBundle", command: "bun run check:admin-bundle" },
  { id: "targetedSemgrep", command: TARGETED_SEMGREP },
  { id: "fullTest", command: ENV + "bun run test" },
  { id: "precommitCheck", command: ENV + "bun run precommit:check" },
  { id: "releaseGates", command: ENV + "bun run gates:coderso" },
  { id: "strictScanExecuted", command: "bun run scan:security:strict" },
  { id: "diffCheck", command: "git diff --check" },
]);

const LEAVES = Object.freeze([
  {
    id: "544-01-L01",
    file: "TASK-544-01-L01-Map-Create-And-Update-Constraint-Races-To-409.md",
    allowedFiles: Object.freeze([
      "core/services/media/mediaFoldersService.ts",
      "tests/unit/media/mediaFoldersService.test.ts",
      "tests/integration/routes/media-folders.test.ts",
    ]),
    requiredTouched: Object.freeze([
      "core/services/media/mediaFoldersService.ts",
      "tests/unit/media/mediaFoldersService.test.ts",
      "tests/integration/routes/media-folders.test.ts",
    ]),
    testFiles: Object.freeze([
      "tests/unit/media/mediaFoldersService.test.ts",
      "tests/integration/routes/media-folders.test.ts",
    ]),
    gateCommands: Object.freeze(["lintTypes", "lint", "dbPreflight", "bun"]),
    exactCommands: Object.freeze([LINT_TYPES, LINT, DB_PREFLIGHT, SERVICE_TESTS]),
  },
  {
    id: "544-02-L01",
    file: "TASK-544-02-L01-Clear-Settled-Promises-With-Identity-Guard.md",
    allowedFiles: Object.freeze([
      "core/admin/services/mediaFoldersClient.ts",
      "tests/vitest/admin/mediaFoldersClient.test.ts",
    ]),
    requiredTouched: Object.freeze([
      "core/admin/services/mediaFoldersClient.ts",
      "tests/vitest/admin/mediaFoldersClient.test.ts",
    ]),
    testFiles: Object.freeze(["tests/vitest/admin/mediaFoldersClient.test.ts"]),
    gateCommands: Object.freeze(["lintTypes", "lint", "vitest"]),
    exactCommands: Object.freeze([LINT_TYPES, LINT, CLIENT_TESTS]),
  },
  {
    id: "544-03-L01",
    file: "TASK-544-03-L01-Recover-Create-Rename-Reorder-Delete-Without-State-Loss.md",
    allowedFiles: Object.freeze([
      "core/admin/ui/media/MediaLibraryPage.tsx",
      "core/admin/ui/media/MediaFolderRail.tsx",
      "tests/vitest/ui/media-folder-rail.test.tsx",
      "tests/vitest/ui/media-library.test.tsx",
      "tests/vitest/mediaUi/mediaLibrary.test.tsx",
    ]),
    requiredTouched: Object.freeze([
      "core/admin/ui/media/MediaLibraryPage.tsx",
      "core/admin/ui/media/MediaFolderRail.tsx",
      "tests/vitest/ui/media-folder-rail.test.tsx",
      "tests/vitest/ui/media-library.test.tsx",
    ]),
    testFiles: Object.freeze([
      "tests/vitest/ui/media-folder-rail.test.tsx",
      "tests/vitest/ui/media-library.test.tsx",
      "tests/vitest/mediaUi/mediaLibrary.test.tsx",
    ]),
    gateCommands: Object.freeze(["lintTypes", "lint", "vitest"]),
    exactCommands: Object.freeze([LINT_TYPES, LINT, UI_TESTS]),
  },
]);

const TARGETED_FILES = Object.freeze([
  "tests/unit/media/mediaFoldersService.test.ts",
  "tests/integration/routes/media-folders.test.ts",
  "tests/integration/routes/media.test.ts",
  "tests/vitest/admin/mediaFoldersClient.test.ts",
  "tests/vitest/ui/media-folder-rail.test.tsx",
  "tests/vitest/ui/media-library.test.tsx",
  "tests/vitest/mediaUi/mediaLibrary.test.tsx",
]);

const CLOSURE_PREP_OWNER = Object.freeze({
  id: "544-04-L01",
  allowedFiles: Object.freeze([
    "tests/integration/routes/media.test.ts",
    "_docs/MEDIA_SPEC.md",
    "_docs/ADMIN_CACHE.md",
    "_docs/ADMIN_CACHE_MAP.md",
  ]),
  requiredTouched: Object.freeze([
    "tests/integration/routes/media.test.ts",
    "_docs/MEDIA_SPEC.md",
    "_docs/ADMIN_CACHE.md",
    "_docs/ADMIN_CACHE_MAP.md",
  ]),
  testFiles: TARGETED_FILES,
  gateCommands: Object.freeze(["lintTypes", "lint", "dbPreflight", "bun", "vitest", "diffCheck"]),
  exactCommands: Object.freeze([
    LINT_TYPES,
    LINT,
    DB_PREFLIGHT,
    CLOSURE_BUN_TESTS,
    TARGETED_VITEST,
    "git diff --check",
  ]),
});

const FIX_OWNERS = Object.freeze([
  ...LEAVES.map((leaf) => ({
    id: leaf.id,
    allowedFiles: leaf.allowedFiles,
    requiredTouched: Object.freeze([]),
  })),
  {
    id: CLOSURE_PREP_OWNER.id,
    allowedFiles: CLOSURE_PREP_OWNER.allowedFiles,
    requiredTouched: Object.freeze([]),
  },
]);

const finalClosureOwner = (changelogFile) =>
  Object.freeze({
    id: "final-closure",
    allowedFiles: Object.freeze([
      ...TASK_PATHS,
      "_docs/_TASKS/README.md",
      changelogFile,
      "_docs/_CHANGELOG/README.md",
    ]),
    requiredTouched: Object.freeze([
      ...TASK_PATHS,
      "_docs/_TASKS/README.md",
      changelogFile,
      "_docs/_CHANGELOG/README.md",
    ]),
  });

const FORBIDDEN = Object.freeze([
  "core/server/routes/mediaRoutes.ts",
  "core/db/schema.ts",
  "core/db/migrations/**",
  "core/admin/services/cachePolicy.ts",
  "core/admin/utils/cacheBus.ts",
  "core/admin/components/**",
  "core/admin/ui/components/**",
  "core/widgets/**",
  "packages/**",
  "store/**",
  "package.json",
  "core/package.json",
  "bun.lock",
  ".gitignore",
  ".semgrep.yml",
  ".gitleaks.toml",
  "_docs/_TASKS/TASK-536*",
  "_docs/_TASKS/TASK-537*",
  "_docs/_TASKS/TASK-538*",
  "_docs/_TASKS/TASK-539*",
  "_docs/_TASKS/TASK-540*",
  "_docs/_TASKS/TASK-541*",
  "_docs/_TASKS/TASK-542*",
  "_docs/_TASKS/TASK-543*",
  "_docs/_TASKS/TASK-545*",
  "all _docs/_TASKS files except the nine TASK-544 files and their sole board row",
  "all _docs/_CHANGELOG files except pinned 1256 at final closure and its index row",
  "_docs/_workflows/task-544-implement.mjs after this audited workflow starts",
]);

function sameUniqueSet(actual, expected) {
  return (
    actual.length === expected.length &&
    new Set(actual).size === actual.length &&
    actual.every((value) => expected.includes(value))
  );
}

function requireAllResults(results, expected, label) {
  if (!Array.isArray(results) || results.length !== expected.length) {
    throw new Error(label + ": missing result count");
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (!results[index] || results[index].id !== expected[index] || results[index].result == null) {
      throw new Error(label + ": missing/reordered result " + expected[index]);
    }
  }
  return results;
}

function resultPassed(result) {
  return result.pass === true && result.errors.length === 0;
}

function requireLeaf(result, leaf, label, requireAllRequired = true, allowEmpty = false) {
  if (!resultPassed(result)) throw new Error(label + ": agent reported failure");
  if (
    (!allowEmpty && result.touchedFiles.length === 0) ||
    new Set(result.touchedFiles).size !== result.touchedFiles.length ||
    !result.touchedFiles.every((file) => leaf.allowedFiles.includes(file)) ||
    (requireAllRequired &&
      !leaf.requiredTouched.every((file) => result.touchedFiles.includes(file)))
  ) {
    throw new Error(label + ": file ownership mismatch");
  }
}

async function gitOutput(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

function parsePorcelainV1Z(source) {
  const tokens = source.split("\0");
  const records = new Map();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) continue;
    if (token.length < 4 || token[2] !== " ") {
      throw new Error("TASK-544 malformed git porcelain record");
    }
    const status = token.slice(0, 2);
    const primary = token.slice(3);
    const paths = [primary];
    if (status.includes("R") || status.includes("C")) {
      const secondary = tokens[index + 1];
      if (!secondary) throw new Error("TASK-544 incomplete git rename/copy record");
      paths.push(secondary);
      index += 1;
    }
    const record = status + "\0" + paths.join("\0");
    for (const path of paths) {
      if (path.startsWith("/") || path.split("/").includes("..")) {
        throw new Error("TASK-544 unsafe git status path");
      }
      const current = records.get(path) ?? [];
      current.push(record);
      records.set(path, current);
    }
  }
  return records;
}

async function pathStateFingerprint(path, statusRecords) {
  const absolute = ROOT + "/" + path;
  let workingTree;
  try {
    const entry = await lstat(absolute);
    const base = {
      mode: entry.mode,
      size: entry.size,
      type: entry.isSymbolicLink()
        ? "symlink"
        : entry.isFile()
          ? "file"
          : entry.isDirectory()
            ? "directory"
            : "other",
    };
    if (entry.isSymbolicLink()) {
      workingTree = { ...base, target: await readlink(absolute) };
    } else if (entry.isFile()) {
      const bytes = await readFile(absolute);
      workingTree = {
        ...base,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    } else if (entry.isDirectory()) {
      workingTree = { ...base, entries: (await readdir(absolute)).sort() };
    } else {
      workingTree = base;
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      workingTree = { type: "missing" };
    } else {
      throw error;
    }
  }
  const index = await gitOutput(["ls-files", "--stage", "--", path]);
  return JSON.stringify({ statusRecords: [...statusRecords].sort(), workingTree, index });
}

async function repoMutationSnapshot() {
  const [porcelain, head] = await Promise.all([
    gitOutput(["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
    gitOutput(["rev-parse", "HEAD"]),
  ]);
  const records = parsePorcelainV1Z(porcelain);
  const states = new Map();
  for (const [path, statusRecords] of [...records.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    states.set(path, await pathStateFingerprint(path, statusRecords));
  }
  return { head: head.trim(), porcelain, states };
}

function changedPathsBetween(before, after) {
  if (before.head !== after.head) {
    throw new Error("TASK-544 mutating agent changed HEAD/created a commit");
  }
  const paths = new Set([...before.states.keys(), ...after.states.keys()]);
  return [...paths].filter((path) => before.states.get(path) !== after.states.get(path)).sort();
}

async function runMutatingAgent(
  prompt,
  options,
  owner,
  label,
  requireAllRequired = true,
  allowEmpty = false
) {
  const before = await repoMutationSnapshot();
  let result;
  try {
    result = await agent(prompt, options);
  } catch (error) {
    const afterFailure = await repoMutationSnapshot();
    const changedAfterFailure = changedPathsBetween(before, afterFailure);
    if (changedAfterFailure.length > 0) {
      throw new Error(
        label + ": agent failed after changing repo paths: " + JSON.stringify(changedAfterFailure),
        { cause: error }
      );
    }
    throw error;
  }
  const after = await repoMutationSnapshot();
  const actualChangedPaths = changedPathsBetween(before, after);
  requireLeaf(result, owner, label, requireAllRequired, allowEmpty);
  if (!sameUniqueSet(actualChangedPaths, result.touchedFiles)) {
    throw new Error(
      label +
        ": actual git/content delta does not match touchedFiles: " +
        JSON.stringify({ actualChangedPaths, reported: result.touchedFiles })
    );
  }
  return result;
}

function requireGate(result, leaf, label) {
  if (
    !resultPassed(result) ||
    result.failed !== 0 ||
    result.skipped !== 0 ||
    result.failureKind !== "none" ||
    result.failureCommandId !== null ||
    result.failureEvidence !== null
  ) {
    throw new Error(label + ": gate failed/skipped");
  }
  if (
    !sameSequence(
      result.commands.map((command) => command.id),
      leaf.gateCommands
    ) ||
    result.commands.length !== leaf.exactCommands.length
  ) {
    throw new Error(label + ": ordered command set mismatch");
  }
  for (let index = 0; index < leaf.gateCommands.length; index += 1) {
    const id = leaf.gateCommands[index];
    const command = result.commands[index];
    if (!command || command.command !== leaf.exactCommands[index] || command.passed !== true) {
      throw new Error(label + ": exact command outcome mismatch: " + id);
    }
  }
  if (!sameUniqueSet(result.testFiles, leaf.testFiles)) {
    throw new Error(label + ": test file set mismatch");
  }
}

function classifyFailedGate(result, leaf, label) {
  if (
    result.pass ||
    result.errors.length === 0 ||
    result.failureKind === "none" ||
    result.failed < 1 ||
    result.skipped !== 0
  ) {
    throw new Error(label + ": failed gate lacks a truthful failure classification");
  }
  if (!result.failureCommandId || !result.failureEvidence) {
    throw new Error(label + ": failed gate lacks command/evidence");
  }
  const failedIndex = leaf.gateCommands.indexOf(result.failureCommandId);
  if (failedIndex < 0 || result.commands.length !== failedIndex + 1) {
    throw new Error(label + ": failed gate command prefix mismatch");
  }
  for (let index = 0; index < result.commands.length; index += 1) {
    const command = result.commands[index];
    if (
      command.id !== leaf.gateCommands[index] ||
      command.command !== leaf.exactCommands[index] ||
      command.passed !== index < failedIndex
    ) {
      throw new Error(label + ": failed gate exact command outcome mismatch");
    }
  }
  if (!sameUniqueSet(result.testFiles, leaf.testFiles)) {
    throw new Error(label + ": failed gate test file set mismatch");
  }
  if (result.failureKind === "infrastructure") {
    throw new Error(
      label +
        ": infrastructure/preflight/tooling failure; workflow stopped without invoking an edit fixer: " +
        result.failureEvidence
    );
  }
  if (result.failureKind !== "code-test") {
    throw new Error(label + ": unknown gate failure kind");
  }
}

function readStats(board) {
  const value = (label) => {
    const match = board.match(new RegExp("^- \\*\\*" + label + ":\\*\\* (\\d+) tasks$", "m"));
    if (!match) throw new Error("TASK-544 board statistic missing: " + label);
    return Number(match[1]);
  };
  return { toDo: value("To Do"), inProgress: value("In Progress"), done: value("Done") };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactLineCount(source, line) {
  return (source.match(new RegExp("^" + escapeRegExp(line) + "$", "gm")) ?? []).length;
}

function readTaskStatus(source, file) {
  const statuses = [...source.matchAll(/^\*\*Status:\*\* (.+)$/gm)].map((match) => match[1]);
  if (statuses.length !== 1) throw new Error("TASK-544 status count mismatch: " + file);
  return statuses[0];
}

function assertTaskIdentity(source, node) {
  const expectedH1 = "# " + node.id + ":";
  if (!source.startsWith(expectedH1) || exactLineCount(source, "# FileName: " + node.file) !== 1) {
    throw new Error("TASK-544 identity mismatch: " + node.file);
  }
  if (node.parentTask) {
    if (exactLineCount(source, "**Parent Task:** " + node.parentTask) !== 1) {
      throw new Error("TASK-544 parent task mismatch: " + node.file);
    }
  } else if (/^\*\*Parent Task:\*\*/m.test(source)) {
    throw new Error("TASK-544 parent task unexpected: " + node.file);
  }
  if (node.parentSubtask) {
    if (exactLineCount(source, "**Parent Subtask:** " + node.parentSubtask) !== 1) {
      throw new Error("TASK-544 parent subtask mismatch: " + node.file);
    }
  } else if (/^\*\*Parent Subtask:\*\*/m.test(source)) {
    throw new Error("TASK-544 parent subtask unexpected: " + node.file);
  }
  if ((source.match(/^\*\*Changelog:\*\* 1256(?: .*|)$/gm) ?? []).length !== 1) {
    throw new Error("TASK-544 changelog pin mismatch: " + node.file);
  }
}

function readParentRowStatus(parent, id) {
  const rows = [...parent.matchAll(new RegExp("^\\| " + escapeRegExp(id) + " \\|.*$", "gm"))];
  if (rows.length !== 1) throw new Error("TASK-544 parent row mismatch: " + id);
  const status = rows[0][0].match(/(⏳ To Do|🚧 In Progress|✅ Done)/)?.[1];
  if (!status) throw new Error("TASK-544 parent row status missing: " + id);
  return status;
}

function readChildLeafRowStatus(child, childId, leafId) {
  const status = readParentRowStatus(child, leafId);
  if (
    exactLineCount(child, "| Leaf | Scope | Source ownership | Status |") !== 1 ||
    exactLineCount(child, "|---|---|---|---|") !== 1
  ) {
    throw new Error("TASK-544 child leaf table mismatch: " + childId);
  }
  return status;
}

async function readTaskGraph() {
  const entries = [];
  for (const node of TASK_GRAPH) {
    const source = await readFile(TASKS + "/" + node.file, "utf8");
    assertTaskIdentity(source, node);
    entries.push({ ...node, source, status: readTaskStatus(source, node.file) });
  }
  const parent = entries.find((entry) => entry.id === "TASK-544");
  if (!parent) throw new Error("TASK-544 parent missing");
  const parentRows = Object.fromEntries(
    PARENT_ROWS.map((id) => [id, readParentRowStatus(parent.source, id)])
  );
  const leafRows = Object.fromEntries(
    Object.entries(CHILD_LEAF_ROWS).map(([childId, leafId]) => {
      const child = entries.find((entry) => entry.id === childId);
      if (!child) throw new Error("TASK-544 child missing: " + childId);
      return [leafId, readChildLeafRowStatus(child.source, childId, leafId)];
    })
  );
  return { entries, parentRows, leafRows };
}

async function boardState() {
  const board = await readFile(TASKS + "/README.md", "utf8");
  const matches = [...board.matchAll(/^\| TASK-544 \|.*$/gm)];
  if (matches.length !== 1) throw new Error("TASK-544 board row missing/duplicated");
  const index = matches[0].index ?? -1;
  const toDo = board.indexOf("## To Do");
  const inProgress = board.indexOf("## In Progress");
  const done = board.indexOf("## Done");
  const bucket =
    index > toDo && index < inProgress
      ? "toDo"
      : index > inProgress && index < done
        ? "inProgress"
        : index > done
          ? "done"
          : null;
  if (!bucket) throw new Error("TASK-544 board bucket mismatch");
  return { bucket, stats: readStats(board), source: board, row: matches[0][0] };
}

function activationValue(step, graph, board) {
  if (step.kind === "board") return board.bucket;
  if (step.kind === "parentRow") return graph.parentRows[step.id];
  if (step.kind === "leafRow") return graph.leafRows[step.id];
  return graph.entries.find((entry) => entry.id === step.id)?.status;
}

function describeActivationStep(step) {
  if (step.kind === "board") return "TASK-544 board To Do -> In Progress";
  return step.file + " " + step.kind + " " + step.id + " To Do -> In Progress";
}

function requireCanonicalActivationPrefix(graph, board, label) {
  for (const entry of graph.entries) {
    const started = (entry.source.match(/^\*\*Started:\*\* \d{4}-\d{2}-\d{2}$/gm) ?? []).length;
    if (
      (entry.status === ACTIVE_STATUS && started !== 1) ||
      (entry.status === TODO_STATUS && started !== 0) ||
      (entry.status !== TODO_STATUS && entry.status !== ACTIVE_STATUS) ||
      /^\*\*Completed:\*\*/m.test(entry.source)
    ) {
      throw new Error(label + ": task activation metadata mismatch: " + entry.file);
    }
  }
  let missingSeen = false;
  let completed = 0;
  for (const step of ACTIVATION_STEPS) {
    const value = activationValue(step, graph, board);
    const from = step.kind === "board" ? "toDo" : TODO_STATUS;
    const to = step.kind === "board" ? "inProgress" : ACTIVE_STATUS;
    if (value !== from && value !== to) {
      throw new Error(
        label + ": non-canonical activation value at " + describeActivationStep(step)
      );
    }
    if (value === to && missingSeen) {
      throw new Error(label + ": activation advanced past an incomplete prefix at " + step.file);
    }
    if (value === from) missingSeen = true;
    else completed += 1;
  }
  return completed;
}

async function readActivationPlan(label, key) {
  const targetEnd = ACTIVATION_END[key];
  const prefixIndex = ACTIVATION_PREFIXES.findIndex((prefix) => prefix.key === key);
  if (!targetEnd || prefixIndex < 0) throw new Error(label + ": activation contract missing");
  const [graph, board] = await Promise.all([readTaskGraph(), boardState()]);
  const completed = requireCanonicalActivationPrefix(graph, board, label);
  const previousEnd =
    prefixIndex === 0 ? 0 : ACTIVATION_END[ACTIVATION_PREFIXES[prefixIndex - 1].key];
  if (completed < previousEnd) throw new Error(label + ": activation prerequisite is incomplete");
  const missingSteps = completed >= targetEnd ? [] : ACTIVATION_STEPS.slice(completed, targetEnd);
  return {
    active: missingSteps.length === 0,
    graph,
    board,
    missingFiles: [...new Set(missingSteps.map((step) => step.file))],
    missingOperations: missingSteps.map(describeActivationStep),
  };
}

async function runActivationPrefix(label, key, initial) {
  const prefix = ACTIVATION_PREFIXES.find((candidate) => candidate.key === key);
  if (!prefix) throw new Error(label + ": activation prefix missing");
  const plan = await readActivationPlan(label, key);
  if (!plan.active) {
    if (
      plan.missingFiles.length === 0 ||
      !plan.missingFiles.every((file) => prefix.allowedFiles.includes(file))
    ) {
      throw new Error(label + ": resumable activation ownership mismatch");
    }
    const owner = Object.freeze({
      id: "activation:" + key,
      allowedFiles: Object.freeze(plan.missingFiles),
      requiredTouched: Object.freeze(plan.missingFiles),
    });
    await runMutatingAgent(
      "Resume only the validated TASK-544 activation prefix at " +
        ROOT +
        ". Execute these missing metadata operations in the listed order: " +
        JSON.stringify(plan.missingOperations) +
        ". Add exactly one actual Started date only when transitioning a task status. Preserve " +
        "earlier In Progress and later To Do states. Move the sole board row/statistics only when " +
        "that listed operation is missing. Touch exactly " +
        JSON.stringify(plan.missingFiles) +
        ". Do not edit source/tests/product docs/changelog/workflow, stage, or commit. Return exact touchedFiles.",
      { label: "activate:" + key, phase: label, schema: LEAF_SCHEMA },
      owner,
      label + " activation"
    );
  }
  const active = await readActivationPlan(label + " verified", key);
  if (!active.active) throw new Error(label + ": activation writer left an incomplete prefix");
  const expectedStats =
    initial.board.bucket === "toDo"
      ? {
          toDo: initial.board.stats.toDo - 1,
          inProgress: initial.board.stats.inProgress + 1,
          done: initial.board.stats.done,
        }
      : initial.board.stats;
  if (
    active.board.bucket !== "inProgress" ||
    JSON.stringify(active.board.stats) !== JSON.stringify(expectedStats)
  ) {
    throw new Error(label + ": activation board delta mismatch");
  }
}

async function requirePreGraph() {
  const onDisk = (await readdir(TASKS))
    .filter((name) => /^TASK-544(?:[-_].*)?\.md$/.test(name))
    .sort();
  if (!sameUniqueSet(onDisk, [...TASK_FILES].sort())) {
    throw new Error("TASK-544 physical graph mismatch");
  }
  const graph = await readTaskGraph();
  for (const entry of graph.entries) {
    if (entry.status !== TODO_STATUS && entry.status !== ACTIVE_STATUS) {
      throw new Error("TASK-544 pre-closure status mismatch: " + entry.file);
    }
  }
  for (const id of PARENT_ROWS) {
    if (graph.parentRows[id] !== TODO_STATUS && graph.parentRows[id] !== ACTIVE_STATUS) {
      throw new Error("TASK-544 pre-closure parent row mismatch: " + id);
    }
  }
  for (const id of Object.values(CHILD_LEAF_ROWS)) {
    if (graph.leafRows[id] !== TODO_STATUS && graph.leafRows[id] !== ACTIVE_STATUS) {
      throw new Error("TASK-544 pre-closure leaf row mismatch: " + id);
    }
  }
  const [task537, task543, board, changelogIndex] = await Promise.all([
    readFile(
      TASKS + "/TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
      "utf8"
    ),
    readFile(TASKS + "/TASK-543_Posts_Exit_Safety_and_List_Accessibility.md", "utf8"),
    boardState(),
    readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8"),
  ]);
  if (readTaskStatus(task537, "TASK-537") !== DONE_STATUS) {
    throw new Error("TASK-537 dependency is not Done");
  }
  if (readTaskStatus(task543, "TASK-543") !== TODO_STATUS) {
    throw new Error("TASK-543 must remain To Do before TASK-544 closure");
  }
  if (board.bucket !== "toDo" && board.bucket !== "inProgress") {
    throw new Error("TASK-544 board is not resumable");
  }
  if (!board.row.includes("Changelog 1256 pinned. 4 children + 4 leaves.")) {
    throw new Error("TASK-544 board row contract mismatch");
  }
  if (
    !board.source.includes(
      "TASK-538 → TASK-536 → TASK-541 → TASK-537 → TASK-544 → TASK-543 → TASK-540 →"
    ) ||
    !board.source.includes("TASK-539 → TASK-542 → TASK-545")
  ) {
    throw new Error("TASK-544 program land order mismatch");
  }
  if (
    !/Changelogs 1251–1252 and 1254–1257 remain reserved, respectively, for the\s+implementation closure of TASK-539, TASK-540, TASK-542, TASK-543, TASK-544, and\s+TASK-545\./m.test(
      changelogIndex
    ) ||
    !changelogIndex.includes("Use 1258 for the next unreserved changelog entry.")
  ) {
    throw new Error("TASK-544 pre-closure changelog reservation mismatch");
  }
  const changelogs = (await readdir(ROOT + "/_docs/_CHANGELOG")).filter((name) =>
    name.startsWith("1256-")
  );
  if (changelogs.length !== 0) throw new Error("changelog 1256 exists before closure");
  requireCanonicalActivationPrefix(graph, board, "TASK-544 pre-graph");
  return { board, graph };
}

async function requireFullyActiveGraph(initial) {
  await runActivationPrefix("TASK-544 fully active", "544-04-L01", initial);
  const state = await readActivationPlan("TASK-544 fully active verified", "544-04-L01");
  if (
    requireCanonicalActivationPrefix(state.graph, state.board, "TASK-544 fully active") !==
    ACTIVATION_STEPS.length
  ) {
    throw new Error("TASK-544 full activation prefix mismatch");
  }
  return state.board;
}

async function requireCompletedGraph(preFinalBoard, closureDate, changelogFile) {
  const graph = await readTaskGraph();
  const ids = [];
  for (const entry of graph.entries) {
    ids.push(entry.id);
    if (
      entry.status !== DONE_STATUS ||
      exactLineCount(entry.source, "**Completed:** " + closureDate) !== 1 ||
      exactLineCount(entry.source, "**Changelog:** 1256") !== 1 ||
      !/^\*\*Started:\*\* \d{4}-\d{2}-\d{2}$/m.test(entry.source)
    ) {
      throw new Error("TASK-544 completed metadata mismatch: " + entry.file);
    }
  }
  for (const id of PARENT_ROWS) {
    if (graph.parentRows[id] !== DONE_STATUS) {
      throw new Error("TASK-544 completed parent row mismatch: " + id);
    }
  }
  for (const id of Object.values(CHILD_LEAF_ROWS)) {
    if (graph.leafRows[id] !== DONE_STATUS) {
      throw new Error("TASK-544 completed leaf row mismatch: " + id);
    }
  }
  const finalBoard = await boardState();
  if (
    preFinalBoard.bucket !== "inProgress" ||
    finalBoard.bucket !== "done" ||
    finalBoard.stats.toDo !== preFinalBoard.stats.toDo ||
    finalBoard.stats.inProgress !== preFinalBoard.stats.inProgress - 1 ||
    finalBoard.stats.done !== preFinalBoard.stats.done + 1
  ) {
    throw new Error("TASK-544 closure board delta mismatch");
  }
  const changelogs = (await readdir(ROOT + "/_docs/_CHANGELOG")).filter((name) =>
    name.startsWith("1256-")
  );
  if (changelogs.length !== 1 || changelogs[0] !== changelogFile.split("/").at(-1)) {
    throw new Error("TASK-544 changelog filename mismatch");
  }
  const changelog = await readFile(ROOT + "/_docs/_CHANGELOG/" + changelogs[0], "utf8");
  if (
    exactLineCount(changelog, "Date: " + closureDate) !== 1 ||
    exactLineCount(changelog, "Version: Unreleased") !== 1
  ) {
    throw new Error("TASK-544 changelog date/version mismatch");
  }
  const listed = (changelog.match(/^Tasks: ([\s\S]*?)\n\n/m)?.[1] ?? "")
    .replace(/\n/g, " ")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (!sameUniqueSet(listed, ids)) throw new Error("TASK-544 changelog task IDs mismatch");
  const index = await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8");
  if (
    (index.match(/^\| 1256 \|/gm) ?? []).length !== 1 ||
    index.indexOf("| 1256 |") > index.indexOf("| 1253 |") ||
    !/Changelogs 1251–1252, 1254–1255, and 1257 remain reserved, respectively, for the\s+implementation closure of TASK-539, TASK-540, TASK-542, TASK-543, and\s+TASK-545\./m.test(
      index
    ) ||
    !index.includes("Use 1258 for the next unreserved changelog entry.")
  ) {
    throw new Error("TASK-544 changelog index order/count mismatch");
  }
  const boardProgramText = finalBoard.source.replace(/^>\s?/gm, "");
  if (
    !/Changelogs 1248–1250, 1253, and 1256 are\s+consumed by TASK-536, TASK-537, TASK-538, TASK-541, and TASK-544;/m.test(
      boardProgramText
    ) ||
    !/1251–1252,\s+1254–1255, and 1257 remain reserved/m.test(boardProgramText)
  ) {
    throw new Error("TASK-544 board program reservation mismatch");
  }
  const task543 = await readFile(
    TASKS + "/TASK-543_Posts_Exit_Safety_and_List_Accessibility.md",
    "utf8"
  );
  if (readTaskStatus(task543, "TASK-543") !== TODO_STATUS) {
    throw new Error("TASK-543 changed during TASK-544 closure");
  }
}

const COMMON =
  "Repo: " +
  ROOT +
  ". Implement TASK-544 only. Read current files before editing. Preserve the existing " +
  "internal Admin route surface, session/RBAC/CSRF/rate limits, prototype layout, and success-only " +
  "cache broadcasts. No endpoint, migration, dependency, generic widget, scanner exception, staging, " +
  "or commit. Never touch forbidden paths: " +
  JSON.stringify(FORBIDDEN) +
  ". Preserve every unrelated dirty-tree edit. Read HEAD/status/diff and every owned file fresh. " +
  "Re-run a named failure once in isolation before classifying it. Return exact repo-relative " +
  "touchedFiles; never print env values.";

async function runLeafGate(leaf, attempt) {
  const commandText = leaf.exactCommands.join(" && ");
  return agent(
    "Read-only gate attempt " +
      attempt +
      " for " +
      leaf.id +
      " at " +
      ROOT +
      ". Run this exact fail-fast command chain (literal &&, never semicolons):\n" +
      commandText +
      "\nReturn each exact command and id in this order with its truthful pass result, exact " +
      "test files/counts and no edits. On success set failureKind=none and both failure fields " +
      "to null. On failure stop the chain, return only the executed ordered prefix, set pass=false, " +
      "name the failed command/evidence, and classify infrastructure for unavailable DB/network/" +
      "executable/tooling versus code-test for a verified source/test defect. Never edit for an " +
      "infrastructure failure. Contract: " +
      JSON.stringify({ ids: leaf.gateCommands, commands: leaf.exactCommands }),
    { label: "gate:" + leaf.id + ":" + attempt, phase: leaf.id, schema: GATE_SCHEMA }
  );
}

async function runClosureGate(attempt, phaseName = "544-04 prepare") {
  const chain = CLOSURE_PREP_OWNER.exactCommands.join(" && ");
  const result = await agent(
    "Read-only TASK-544-04 gate attempt " +
      attempt +
      " at " +
      ROOT +
      ". Run this exact fail-fast command chain (literal &&, never semicolons):\n" +
      chain +
      "\nReturn exact ordered command ids/strings, exact seven test files and truthful counts. " +
      "On success use failureKind=none and null failure fields. On failure stop the chain, return " +
      "only its executed prefix and classify unavailable DB/network/executable/tooling as " +
      "infrastructure; only a verified source/test defect is code-test. Re-run a named test failure " +
      "once alone before classification. Do not edit.",
    { label: "gate:544-04:" + attempt, phase: phaseName, schema: GATE_SCHEMA }
  );
  return result;
}

async function runFullValidation(label, phaseName) {
  const result = await agent(
    "Read-only full TASK-544 validation at " +
      ROOT +
      ". Run these exact commands sequentially, stopping on any failure except the explicitly " +
      "classified strict-scan case. Never print loaded env values:\n" +
      FULL_COMMANDS.map(({ id, command }) => id + ": " + command).join("\n") +
      "\nA strict exit 1 is accepted only for the exact unchanged TASK-545-owned " +
      "task-522 workflow finding. Return exact counts and all outcomes. Do not edit. Expected files: " +
      JSON.stringify(TARGETED_FILES),
    { label, phase: phaseName, schema: VALIDATION_SCHEMA }
  );
  if (
    !resultPassed(result) ||
    !Object.values(result.commandOutcomes).every((value) => value === true) ||
    result.fullVitestFailed !== 0 ||
    result.fullVitestSkipped !== 0
  ) {
    throw new Error(label + ": validation failed");
  }
  if (
    result.commands.length !== FULL_COMMANDS.length ||
    result.commands.some(
      (command, index) =>
        command.id !== FULL_COMMANDS[index].id ||
        command.command !== FULL_COMMANDS[index].command ||
        command.passed !== true
    )
  ) {
    throw new Error(label + ": exact ordered FULL_COMMANDS mismatch");
  }
  if (!sameUniqueSet(result.targetedFiles, TARGETED_FILES)) {
    throw new Error(label + ": targeted file set mismatch");
  }
  const strict = result.strictScan;
  const strictAccepted =
    (strict.exitCode === 0 && strict.externalFindings.length === 0) ||
    (strict.exitCode === 1 && strict.externalFindings.length === 1);
  if (!strictAccepted || strict.task544Findings !== 0 || strict.toolingFailure) {
    throw new Error(label + ": strict scan mismatch");
  }
  return result;
}

async function runOwnedFixers(findings, label, phaseName) {
  const results = [];
  for (const owner of FIX_OWNERS) {
    const result = await runMutatingAgent(
      COMMON +
        " Fix only verified " +
        label +
        " findings owned by " +
        owner.id +
        ". Touch no path outside " +
        JSON.stringify(owner.allowedFiles) +
        ". If no finding belongs to this owner, make no edit and return an empty touchedFiles " +
        "array. Never rebaseline an assertion to hide a defect. Findings: " +
        JSON.stringify(findings),
      { label: label + ":" + owner.id, phase: phaseName, schema: LEAF_SCHEMA },
      owner,
      label + " " + owner.id,
      false,
      true
    );
    results.push({ id: owner.id, result });
  }
  requireAllResults(
    results,
    FIX_OWNERS.map((owner) => owner.id),
    label + " owner results"
  );

  for (const leaf of LEAVES) {
    const ownerResult = results.find((entry) => entry.id === leaf.id)?.result;
    if (ownerResult && ownerResult.touchedFiles.length > 0) {
      const gate = await runLeafGate(leaf, label + "-fix");
      if (gate.pass) requireGate(gate, leaf, label + " re-gate " + leaf.id);
      else classifyFailedGate(gate, leaf, label + " re-gate " + leaf.id);
    }
  }
  const closureResult = results.find((entry) => entry.id === CLOSURE_PREP_OWNER.id)?.result;
  if (closureResult && closureResult.touchedFiles.length > 0) {
    const gate = await runClosureGate(label + "-fix", phaseName);
    if (gate.pass) requireGate(gate, CLOSURE_PREP_OWNER, label + " closure re-gate");
    else classifyFailedGate(gate, CLOSURE_PREP_OWNER, label + " closure re-gate");
  }
  return results.flatMap(({ result }) => result.touchedFiles);
}

function sameSequence(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function boundedFolderDisplayName(value) {
  const normalized = value.replace(/[\u0000-\u001f\u007f\s]+/g, " ").trim();
  const characters = Array.from(normalized);
  return characters.length <= 48 ? normalized : characters.slice(0, 47).join("") + "…";
}

function expectedFinalRetryCommand(accessibleName) {
  const safeName = JSON.stringify(accessibleName).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => " +
    'page.getByRole("button", { name: ' +
    safeName +
    ", exact: true }).click()'"
  );
}

function expectedRetryDoubleActivationCommand(accessibleName) {
  const safeName = JSON.stringify(accessibleName).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => (async () => { const retry = " +
    'page.getByRole("button", { name: ' +
    safeName +
    ", exact: true }); const capturedRetryCount = await retry.count(); " +
    'if (capturedRetryCount !== 1) throw new Error("Expected exactly one Retry control"); ' +
    "await retry.evaluate((element) => { if (!(element instanceof HTMLButtonElement)) " +
    'throw new Error("Expected Retry button"); element.click(); element.click(); }); ' +
    "return capturedRetryCount; })()'"
  );
}

function expectedRetryAbsentCommand(accessibleName) {
  const safeName = JSON.stringify(accessibleName).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => " +
    'page.getByRole("button", { name: ' +
    safeName +
    ", exact: true }).count()'"
  );
}

function expectedButtonDisabledCommand(accessibleName) {
  const safeName = JSON.stringify(accessibleName).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => " +
    'page.getByRole("button", { name: ' +
    safeName +
    ", exact: true }).isDisabled()'"
  );
}

function expectedDisabledButtonSecondActivationCommand(accessibleName) {
  const safeName = JSON.stringify(accessibleName).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => " +
    'page.getByRole("button", { name: ' +
    safeName +
    ", exact: true }).evaluate((element) => { " +
    "if (!(element instanceof HTMLButtonElement) || !element.disabled) " +
    'throw new Error("Expected disabled initiating control"); element.click(); return true; })\''
  );
}

function expectedReorderAccessibleName(scenario) {
  const action = scenario.reorderAction;
  const before = scenario.beforeProbeOutput;
  if (
    scenario.kind !== "reorder-retry" ||
    !action ||
    !before ||
    !Array.isArray(before.order) ||
    !Array.isArray(before.rows) ||
    !Array.isArray(scenario.state?.capturedOrder) ||
    before.order.length < 2 ||
    before.order.length !== scenario.state.capturedOrder.length
  ) {
    return null;
  }
  const index = before.order.indexOf(action.rowId);
  const adjacentIndex = index + (action.direction === "up" ? -1 : 1);
  if (index < 0 || adjacentIndex < 0 || adjacentIndex >= before.order.length) return null;
  const row = before.rows.find(({ id }) => id === action.rowId);
  const adjacent = before.rows.find(({ id }) => id === before.order[adjacentIndex]);
  if (!row || !adjacent || row.name !== action.rowName || row.parentId !== adjacent.parentId) {
    return null;
  }
  const expectedOrder = [...before.order];
  [expectedOrder[index], expectedOrder[adjacentIndex]] = [
    expectedOrder[adjacentIndex],
    expectedOrder[index],
  ];
  if (!sameSequence(expectedOrder, scenario.state.capturedOrder)) return null;
  return "Move " + action.rowName + " " + action.direction;
}

function expectedInitialAccessibleName(scenario) {
  if (scenario.kind === "create-retry") return "Create folder";
  if (scenario.kind === "rename-retry") return "Save folder name";
  if (scenario.kind === "delete-retry" && typeof scenario.targetName === "string") {
    return "Delete " + scenario.targetName;
  }
  if (scenario.kind === "reorder-retry") return expectedReorderAccessibleName(scenario);
  return null;
}

function expectedInitialAttemptCommands(scenario, attemptId) {
  if (scenario.kind === "list-retry") {
    return {
      action: expectedInitialListCacheEventCommand(attemptId),
      controlProbe: SMOKE_LIST_REPRESENTATIVE_DISABLED_COMMAND,
      secondActivation: SMOKE_LIST_REPRESENTATIVE_SECOND_ACTIVATION_COMMAND,
    };
  }
  const accessibleName = expectedInitialAccessibleName(scenario);
  if (accessibleName === null) return null;
  return {
    action: expectedFinalRetryCommand(accessibleName),
    controlProbe: expectedButtonDisabledCommand(accessibleName),
    secondActivation: expectedDisabledButtonSecondActivationCommand(accessibleName),
  };
}

function initialAttemptCommandsMatch(commands, scenario, attemptId) {
  const expected = expectedInitialAttemptCommands(scenario, attemptId);
  return (
    expected !== null &&
    commands.action === expected.action &&
    commands.pending.controlProbe === expected.controlProbe &&
    commands.pending.secondActivation === expected.secondActivation
  );
}

function routeFaultCommandMatches(command, attemptId, method, pattern) {
  return command === expectedRouteFaultCommand(attemptId, method, pattern);
}

function assertCanonicalSmokeCommandNegativeProbes() {
  const reorderScenario = {
    kind: "reorder-retry",
    reorderAction: { rowId: "row-a", rowName: "Alpha", direction: "down" },
    beforeProbeOutput: {
      order: ["row-a", "row-b"],
      rows: [
        { id: "row-a", name: "Alpha", parentId: null },
        { id: "row-b", name: "Beta", parentId: null },
      ],
    },
    state: { capturedOrder: ["row-b", "row-a"] },
  };
  const scenarios = [
    { kind: "create-retry" },
    { kind: "rename-retry" },
    { kind: "delete-retry", targetName: "Exact target" },
    reorderScenario,
  ];
  for (const scenario of scenarios) {
    const expected = expectedInitialAttemptCommands(scenario, "negative-probe");
    if (!expected) throw new Error("canonical initial command probe could not derive target");
    const commands = {
      action: expected.action,
      pending: {
        controlProbe: expected.controlProbe,
        secondActivation: expected.secondActivation,
      },
    };
    if (!initialAttemptCommandsMatch(commands, scenario, "negative-probe")) {
      throw new Error("canonical initial command positive probe failed");
    }
    if (
      initialAttemptCommandsMatch(
        { ...commands, action: commands.action + " " },
        scenario,
        "negative-probe"
      )
    ) {
      throw new Error("canonical initial command accepted a tampered action");
    }
  }
  if (
    expectedReorderAccessibleName({
      ...reorderScenario,
      reorderAction: { ...reorderScenario.reorderAction, rowName: "Wrong" },
    }) !== null
  ) {
    throw new Error("reorder command accepted row evidence with a mismatched name");
  }
  const routeCommand = expectedRouteFaultCommand(
    "negative-probe",
    "GET",
    "**/admin/api/media/folders"
  );
  if (
    !routeFaultCommandMatches(
      routeCommand,
      "negative-probe",
      "GET",
      "**/admin/api/media/folders"
    ) ||
    routeFaultCommandMatches(
      routeCommand.replace("+= 1", "+= 2"),
      "negative-probe",
      "GET",
      "**/admin/api/media/folders"
    )
  ) {
    throw new Error("route-fault exact-command negative probe failed");
  }
}

function expectedDeleteClickCommand(targetName) {
  const accessibleName = "Delete " + targetName;
  const safeName = JSON.stringify(accessibleName).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => " +
    'page.getByRole("button", { name: ' +
    safeName +
    ", exact: true }).click()'"
  );
}

function collectRecordedCliCommands(value, path = "result", commands = []) {
  if (typeof value === "string") {
    if (value.startsWith("playwright-cli ")) commands.push({ path, command: value });
    return commands;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectRecordedCliCommands(entry, path + "[" + index + "]", commands)
    );
    return commands;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      collectRecordedCliCommands(entry, path + "." + key, commands);
    }
  }
  return commands;
}

function assertRecordedCliCommandsSafe(value, label) {
  for (const { path, command } of collectRecordedCliCommands(value, label)) {
    const forbidden = FORBIDDEN_RECORDED_CLI_COMMANDS.find(({ pattern }) => pattern.test(command));
    if (forbidden) {
      throw new Error(
        label + ": forbidden " + forbidden.label + " in recorded CLI command at " + path
      );
    }
  }
}

function expectedThemeCommand(theme) {
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => page.evaluate((theme) => { " +
    'document.documentElement.classList.toggle("dark", theme === "dark"); ' +
    "document.documentElement.style.colorScheme = theme; return theme; }, " +
    JSON.stringify(theme) +
    ")'"
  );
}

function expectedThemeReadCommand() {
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => page.evaluate(() => { " +
    'const stored = localStorage.getItem("coderso-admin-color-mode"); ' +
    'const preference = stored === "dark" ? "dark" : "light"; ' +
    'const resolved = document.documentElement.classList.contains("dark") ? "dark" : "light"; ' +
    "return { preference, resolved }; })'"
  );
}

function expectedThemeRestoreCommand(preference) {
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => page.evaluate((preference) => { " +
    'const key = "coderso-admin-color-mode"; ' +
    "localStorage.setItem(key, preference); " +
    "const resolved = preference; " +
    'document.documentElement.classList.toggle("dark", resolved === "dark"); ' +
    'document.documentElement.classList.toggle("light", resolved === "light"); ' +
    "document.documentElement.style.colorScheme = resolved; " +
    "return { preference, resolved }; }, " +
    JSON.stringify(preference) +
    ")'"
  );
}

function expectedFailureProbeCommand(accessibleName) {
  const safeName = JSON.stringify(accessibleName).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => (async () => { " +
    'const alert = page.locator("[role=\\"alert\\"][data-folder-error-token][data-folder-error-kind]"); ' +
    'const message = alert.locator("[data-folder-error-message]"); ' +
    'const retry = page.getByRole("button", { name: ' +
    safeName +
    ", exact: true }); " +
    'const form = page.locator("[data-folder-form-kind]"); ' +
    'const inputLocator = form.locator("input").first(); ' +
    "const input = (await form.count()) > 0 && (await inputLocator.count()) > 0 ? await inputLocator.inputValue() : null; " +
    "const focusedElement = await page.evaluate(() => { const element = document.activeElement; " +
    'if (!(element instanceof HTMLElement)) return null; return element.getAttribute("aria-label") ' +
    '?? element.getAttribute("data-media-folder-id") ?? (element.id || element.tagName.toLowerCase()); }); ' +
    'return { alertText: ((await message.textContent()) ?? "").trim(), ' +
    'retryName: ((await retry.getAttribute("aria-label")) ?? ' +
    '(await retry.textContent()) ?? "").trim(), ' +
    'token: (await alert.getAttribute("data-folder-error-token")) ?? "", ' +
    "visible: (await alert.isVisible()) && (await retry.isVisible()), input, focusedElement }; })()'"
  );
}

function stateProbeStatements(childId) {
  const safeChildId = JSON.stringify(childId).replaceAll("'", "\\u0027");
  return [
    'const rail = page.locator("[data-media-folder-rail]");',
    'const library = page.locator("[data-media-filter-folder-id]");',
    'const rowLocator = page.locator("[data-media-folder-id]");',
    "const rows = await rowLocator.evaluateAll((nodes) => nodes.map((node) => ({ " +
      'id: node.getAttribute("data-media-folder-id") ?? "", ' +
      'name: node.getAttribute("data-media-folder-name") ?? "", ' +
      'parentId: node.getAttribute("data-media-folder-parent-id") || null })));',
    'const selectedLocator = page.locator("[data-media-folder-id][aria-current=\\"true\\"]");',
    "const selection = (await selectedLocator.count()) > 0 ? " +
      'await selectedLocator.first().getAttribute("data-media-folder-id") : null;',
    'const activeFolderId = (await rail.getAttribute("data-active-folder-id")) || null;',
    "const mediaFilterStateFolderId = " +
      '(await library.getAttribute("data-media-filter-folder-id")) || null;',
    'const form = page.locator("[data-folder-form-kind]");',
    'const inputLocator = form.locator("input").first();',
    "const input = (await form.count()) > 0 && (await inputLocator.count()) > 0 " +
      "? await inputLocator.inputValue() : null;",
    "const focusedElement = await page.evaluate(() => { const element = document.activeElement; " +
      'if (!(element instanceof HTMLElement)) return null; return element.getAttribute("aria-label") ' +
      '?? element.getAttribute("data-media-folder-id") ?? (element.id || element.tagName.toLowerCase()); });',
    "const formOpen = (await form.count()) > 0 && await form.first().isVisible();",
    "const childId = " + safeChildId + ";",
    "const childParent = childId === null ? null : " +
      "(rows.find((row) => row.id === childId)?.parentId ?? null);",
    "const state = { input, order: rows.map((row) => row.id), selection, activeFolderId, " +
      "mediaFilterStateFolderId, knownRows: rows.map((row) => row.id), rows, childParent, " +
      "focusedElement, formOpen };",
  ].join(" ");
}

function expectedStateProbeCommand(childId) {
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => (async () => { " +
    stateProbeStatements(childId) +
    " return state; })()'"
  );
}

function expectedAssertionProbeCommand(accessibleName, childId) {
  const safeName = JSON.stringify(accessibleName).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => (async () => { " +
    stateProbeStatements(childId) +
    ' const alert = page.locator("[role=\\"alert\\"][data-folder-error-token][data-folder-error-kind]"); ' +
    'const retry = page.getByRole("button", { name: ' +
    safeName +
    ', exact: true }); const activeRow = page.locator("[data-media-folder-id][aria-current=\\"true\\"]").first(); ' +
    'const action = page.locator("[data-media-folder-actions]:visible").first(); ' +
    'const retryKind = await retry.getAttribute("data-folder-retry-kind"); ' +
    'const retryTarget = retryKind === "create" ? { kind: "create", ' +
    'name: (await retry.getAttribute("data-folder-retry-name")) ?? "", ' +
    'parentId: (await retry.getAttribute("data-folder-retry-parent-id")) || null, ' +
    'formGeneration: Number(await retry.getAttribute("data-folder-retry-form-generation")) } ' +
    ': retryKind === "rename" ? { kind: "rename", ' +
    'folderId: (await retry.getAttribute("data-folder-retry-target-id")) ?? "", ' +
    'name: (await retry.getAttribute("data-folder-retry-name")) ?? "", ' +
    'formGeneration: Number(await retry.getAttribute("data-folder-retry-form-generation")) } : null; ' +
    'const formKind = (await form.count()) > 0 ? await form.first().getAttribute("data-folder-form-kind") : null; ' +
    'const currentTargetSnapshot = formKind === "create" ? { kind: "create", name: state.input ?? "", ' +
    'parentId: (await form.first().getAttribute("data-folder-form-parent-id")) || null, ' +
    'formGeneration: Number(await form.first().getAttribute("data-folder-form-generation")) } ' +
    ': formKind === "rename" ? { kind: "rename", ' +
    'folderId: (await form.first().getAttribute("data-folder-form-target-id")) ?? "", ' +
    'name: state.input ?? "", formGeneration: Number(await form.first().getAttribute("data-folder-form-generation")) } : null; ' +
    "const formEvidence = retryTarget && currentTargetSnapshot ? { operationKind: retryKind, " +
    'errorToken: (await alert.getAttribute("data-folder-error-token")) ?? "", retryTarget, ' +
    'currentTargetSnapshot, currentDraft: state.input ?? "", draftMismatchVisible: state.formOpen } : null; ' +
    "const rect = async (locator) => locator.evaluate((element) => { const value = element.getBoundingClientRect(); " +
    "return { x: value.x, y: value.y, width: value.width, height: value.height, right: value.right, bottom: value.bottom }; }); " +
    "const railMetrics = await rail.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })); " +
    "const activePresentation = await activeRow.evaluate((element) => { const style = getComputedStyle(element); " +
    "return { tokenClasses: Array.from(element.classList), computed: { background: style.backgroundColor, " +
    "foreground: style.color, display: style.display, visibility: style.visibility } }; }); " +
    "const geometry = { rail: await rect(rail), alert: await rect(alert), action: await rect(action), " +
    "clientWidth: railMetrics.clientWidth, scrollWidth: railMetrics.scrollWidth, " +
    "tokenClasses: activePresentation.tokenClasses, computed: activePresentation.computed }; " +
    "const mediaQueries = await page.evaluate(() => ({ touch: navigator.maxTouchPoints > 0, " +
    'hoverNone: matchMedia("(hover: none)").matches, coarsePointer: matchMedia("(pointer: coarse)").matches })); ' +
    "return { state, formEvidence, geometry, mediaQueries }; })()'"
  );
}

function expectedSetFormDraftCommand(target, draft) {
  const safeKind = JSON.stringify(target.kind).replaceAll("'", "\\u0027");
  const safeDraft = JSON.stringify(draft).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => (async () => { " +
    'const form = page.locator("[data-folder-form-kind=\\"' +
    target.kind +
    '\\"]").first(); const input = form.locator("input").first(); await input.fill(' +
    safeDraft +
    "); const kind = " +
    safeKind +
    '; const name = await input.inputValue(); const formGeneration = Number(await form.getAttribute("data-folder-form-generation")); ' +
    (target.kind === "create"
      ? 'const parentId = (await form.getAttribute("data-folder-form-parent-id")) || null; return { kind, name, parentId, formGeneration }; '
      : 'const folderId = (await form.getAttribute("data-folder-form-target-id")) ?? ""; return { kind, folderId, name, formGeneration }; ') +
    "})()'"
  );
}

function expectedMakeDraftMismatchCommand(target, mismatchDraft) {
  return expectedSetFormDraftCommand(target, mismatchDraft);
}

function expectedRestoreMatchingFormCommand(target) {
  return expectedSetFormDraftCommand(target, target.name);
}

function expectedFixtureDeleteCommand(id) {
  const safeId = JSON.stringify(id).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => (async () => { const id = " +
    safeId +
    '; return page.evaluate(async (folderId) => { const listResponse = await fetch("/admin/api/media/folders", ' +
    '{ method: "GET", credentials: "include", cache: "no-store" }); if (!listResponse.ok) return false; ' +
    "const folders = await listResponse.json(); if (!Array.isArray(folders)) return false; " +
    'if (!folders.some((folder) => folder && typeof folder === "object" && folder.id === folderId)) return true; ' +
    'const csrfResponse = await fetch("/admin/api/auth/csrf", { method: "GET", credentials: "include", cache: "no-store" }); ' +
    "if (!csrfResponse.ok) return false; const csrf = await csrfResponse.json(); " +
    'if (!csrf || typeof csrf.token !== "string") return false; ' +
    "const response = await fetch(`/admin/api/media/folders/${encodeURIComponent(folderId)}`, " +
    '{ method: "DELETE", credentials: "include", headers: { "X-CSRF-Token": csrf.token } }); ' +
    "return response.ok; }, id); })()'"
  );
}

function expectedFixtureVerifyCommand(id) {
  const safeId = JSON.stringify(id).replaceAll("'", "\\u0027");
  return (
    "playwright-cli -s=wf544smoke run-code '(page) => (async () => { const id = " +
    safeId +
    '; return page.evaluate(async (folderId) => { const response = await fetch("/admin/api/media/folders", ' +
    '{ method: "GET", credentials: "include", cache: "no-store" }); if (!response.ok) return false; ' +
    "const folders = await response.json(); return Array.isArray(folders) && " +
    '!folders.some((folder) => folder && typeof folder === "object" && folder.id === folderId); }, id); })()\''
  );
}

function expectedHelperStopCommand(pid) {
  return "kill -INT -- " + pid;
}

function expectedProcessCheckCommand(pid) {
  return "bash -lc 'if kill -0 -- " + pid + " 2>/dev/null; then exit 1; fi'";
}

function expectedPortCheckCommand(port) {
  return (
    "bash -lc 'output=$(/usr/bin/lsof -nP -iTCP:" +
    port +
    ' -sTCP:LISTEN -t 2>&1); status=$?; if [ "$status" -eq 1 ] && [ -z "$output" ]; ' +
    "then exit 0; fi; exit 1'"
  );
}

function smokeStateValid(scenario) {
  const state = scenario.state;
  const formKind = scenario.kind === "create-retry" || scenario.kind === "rename-retry";
  const reorderContractValid =
    scenario.kind === "reorder-retry"
      ? expectedReorderAccessibleName(scenario) !== null
      : scenario.reorderAction === null;
  const messageValid =
    scenario.kind === "list-retry"
      ? state.alertText === FOLDER_OPERATION_MESSAGES.load
      : scenario.kind === "create-retry"
        ? state.alertText === FOLDER_OPERATION_MESSAGES.create
        : scenario.kind === "rename-retry"
          ? state.alertText === FOLDER_OPERATION_MESSAGES.rename
          : scenario.kind === "reorder-retry"
            ? state.alertText === FOLDER_OPERATION_MESSAGES.reorder
            : state.alertText === FOLDER_OPERATION_MESSAGES.delete;
  const expectedRetryName =
    scenario.kind === "list-retry"
      ? FOLDER_RETRY_NAMES.load
      : scenario.kind === "create-retry"
        ? FOLDER_RETRY_NAMES.create
        : scenario.kind === "rename-retry"
          ? FOLDER_RETRY_NAMES.rename
          : scenario.kind === "reorder-retry"
            ? FOLDER_RETRY_NAMES.reorder
            : null;
  const expectedDeleteRetryName =
    scenario.kind === "delete-retry" && typeof scenario.targetName === "string"
      ? FOLDER_RETRY_NAMES.deletePrefix + boundedFolderDisplayName(scenario.targetName)
      : null;
  const form = scenario.formEvidence;
  const expectedFormKind = scenario.kind === "create-retry" ? "create" : "rename";
  if (
    !messageValid ||
    (expectedRetryName !== null && state.retryName !== expectedRetryName) ||
    (scenario.kind === "delete-retry" &&
      (expectedDeleteRetryName === null || state.retryName !== expectedDeleteRetryName)) ||
    !state.successVisible ||
    typeof state.exactFocusedElement !== "string" ||
    state.exactFocusedElement.length === 0 ||
    !state.focusRetained ||
    !reorderContractValid ||
    scenario.failureTokens.length !== scenario.attempts.length ||
    new Set(scenario.failureTokens).size !== scenario.failureTokens.length ||
    (scenario.tokenBefore !== null && scenario.failureTokens.includes(scenario.tokenBefore)) ||
    scenario.requestEvidence.faultedRequests !== scenario.attempts.length ||
    scenario.requestEvidence.successfulRetryRequests !== 1 ||
    scenario.finalRetryRequests !== 1 ||
    (formKind &&
      (!form ||
        form.operationKind !== expectedFormKind ||
        form.errorToken !== scenario.failureTokens.at(-1) ||
        form.retryTarget.kind !== expectedFormKind ||
        form.currentTargetSnapshot.kind !== expectedFormKind ||
        sameSequence(form.retryTarget, form.currentTargetSnapshot) ||
        form.retryTarget.name === form.currentTargetSnapshot.name ||
        form.retryTarget.formGeneration !== form.currentTargetSnapshot.formGeneration ||
        (expectedFormKind === "create" &&
          form.retryTarget.parentId !== form.currentTargetSnapshot.parentId) ||
        (expectedFormKind === "rename" &&
          form.retryTarget.folderId !== form.currentTargetSnapshot.folderId) ||
        form.currentTargetSnapshot.name !== form.currentDraft ||
        state.inputBefore !== form.retryTarget.name ||
        form.currentDraft !== state.inputOnFailure ||
        (expectedFormKind === "rename" && form.retryTarget.folderId !== scenario.targetId) ||
        form.retryTarget.name !== scenario.expectedName ||
        !form.draftMismatchVisible)) ||
    (!formKind && scenario.formEvidence !== null)
  ) {
    return false;
  }
  if (scenario.kind === "list-retry") {
    return (
      state.knownRowsBefore.length > 0 &&
      sameSequence(state.knownRowsBefore, state.knownRowsOnFailure) &&
      sameSequence(state.knownRowsBefore, state.knownRowsAfter)
    );
  }
  if (scenario.kind === "create-retry" || scenario.kind === "rename-retry") {
    return (
      typeof state.inputBefore === "string" &&
      state.inputBefore.length > 0 &&
      typeof state.inputOnFailure === "string" &&
      state.inputOnFailure.length > 0 &&
      state.inputBefore !== state.inputOnFailure &&
      state.focusRetained
    );
  }
  if (scenario.kind === "reorder-retry") {
    return (
      state.orderBefore.length > 1 &&
      sameSequence(state.orderBefore, state.orderOnFailure) &&
      state.capturedOrder.length > 1 &&
      sameSequence(state.orderAfter, state.capturedOrder) &&
      !sameSequence(state.orderBefore, state.capturedOrder)
    );
  }
  return (
    scenario.kind === "delete-retry" &&
    typeof state.selectionBefore === "string" &&
    state.selectionBefore.length > 0 &&
    state.selectionBefore === state.selectionOnFailure &&
    state.selectionAfter === null &&
    state.activeFolderIdBefore === state.selectionBefore &&
    state.mediaFilterStateFolderIdBefore === state.selectionBefore &&
    state.activeFolderIdOnFailure === state.activeFolderIdBefore &&
    state.mediaFilterStateFolderIdOnFailure === state.mediaFilterStateFolderIdBefore &&
    state.activeFolderIdAfter === null &&
    state.mediaFilterStateFolderIdAfter === null &&
    state.selectionBefore === scenario.targetId &&
    state.activeFolderIdBefore === scenario.targetId &&
    state.mediaFilterStateFolderIdBefore === scenario.targetId &&
    state.childParentBefore === scenario.targetId &&
    state.childParentOnFailure === scenario.targetId &&
    state.childParentAfter === null &&
    scenario.requestEvidence.deleteCancelRequests === 0 &&
    scenario.requestEvidence.secondDeleteDialogCount === 0
  );
}

function fullSmokeCommand(command, verb) {
  const prefix = "playwright-cli -s=wf544smoke " + verb;
  return (
    typeof command === "string" &&
    command.startsWith(prefix) &&
    command.length > prefix.length &&
    !command.includes("\n")
  );
}

function expectedSmokePattern(expected, scenario) {
  if (!expected.targetRequired) return expected.pattern;
  if (typeof scenario.targetId !== "string" || scenario.targetId.length === 0) return null;
  return "**/admin/api/media/folders/" + encodeURIComponent(scenario.targetId);
}

function rectInside(outer, inner) {
  return (
    inner.x >= outer.x - 1 &&
    inner.y >= outer.y - 1 &&
    inner.right <= outer.right + 1 &&
    inner.bottom <= outer.bottom + 1
  );
}

function emptyRouteListOutput(output) {
  const normalized = output
    .replace(/\u001b\[[0-9;]*m/g, "")
    .trim()
    .toLowerCase();
  return (
    normalized === "" ||
    normalized === "[]" ||
    /^(?:(?:#+\s*)?routes?\s*:?\s*)?(?:\[\]|none|empty|no routes?(?: registered| found)?\.?)$/.test(
      normalized
    )
  );
}

function smokeGeometryValid(scenario) {
  const geometry = scenario.geometry;
  const computed = geometry.computed;
  return (
    geometry.rail.width > 0 &&
    geometry.alert.width > 0 &&
    geometry.action.width > 0 &&
    rectInside(geometry.rail, geometry.alert) &&
    rectInside(geometry.rail, geometry.action) &&
    geometry.scrollWidth <= geometry.clientWidth &&
    geometry.tokenClasses.includes("bg-primary-soft") &&
    geometry.tokenClasses.includes("text-primary-soft-foreground") &&
    computed.display !== "none" &&
    computed.visibility === "visible" &&
    computed.background !== "rgba(0, 0, 0, 0)" &&
    computed.foreground !== "rgba(0, 0, 0, 0)" &&
    (scenario.viewport !== "wide" || geometry.rail.width === 200) &&
    scenario.mediaQueries.touch === true &&
    scenario.mediaQueries.hoverNone === true &&
    scenario.mediaQueries.coarsePointer === true &&
    scenario.consoleErrors.length === 0 &&
    scenario.consoleWarnings.length === 0 &&
    scenario.pageErrors.length === 0
  );
}

function smokeLogReadsValid(scenario) {
  const reads = scenario.logReads;
  return (
    reads.consoleCommand === SMOKE_CONSOLE_ERROR_READ &&
    reads.warningCommand === SMOKE_CONSOLE_WARNING_READ &&
    reads.pageErrorCommand === SMOKE_PAGE_ERROR_READ &&
    reads.consoleOutput.length === 0 &&
    reads.warningOutput.length === 0 &&
    reads.pageErrorOutput.length === 0 &&
    sameSequence(reads.consoleOutput, scenario.consoleErrors) &&
    sameSequence(reads.warningOutput, scenario.consoleWarnings) &&
    sameSequence(reads.pageErrorOutput, scenario.pageErrors)
  );
}

function smokeConfirmEvidenceValid(scenario) {
  const evidence = scenario.confirmEvidence;
  if (scenario.kind !== "delete-retry") return evidence === null;
  if (
    !evidence ||
    typeof scenario.targetName !== "string" ||
    scenario.attempts.length !== 1 ||
    scenario.screenshotCommands.length !== 1
  ) {
    return false;
  }
  const attempt = scenario.attempts[0];
  const deleteClickCommand = expectedDeleteClickCommand(scenario.targetName);
  const deleteCountReadCommand = expectedFaultHitReadCommand(attempt.id);
  return (
    sameSequence(evidence.executionOrder, SMOKE_CONFIRM_EXECUTION_ORDER) &&
    evidence.cancelOverrideCommand === SMOKE_CONFIRM_CANCEL_COMMAND &&
    evidence.cancelOverrideOutput === true &&
    evidence.cancelClickCommand === deleteClickCommand &&
    evidence.cancelClickCompleted === true &&
    evidence.cancelDeleteCountReadCommand === deleteCountReadCommand &&
    evidence.cancelDeleteCountReadOutput === 0 &&
    evidence.acceptOverrideCommand === SMOKE_CONFIRM_ACCEPT_COMMAND &&
    evidence.acceptOverrideOutput === true &&
    evidence.faultDeleteCommand === deleteClickCommand &&
    attempt.commands.action === deleteClickCommand &&
    attempt.commands.hitRead === deleteCountReadCommand &&
    evidence.guardOverrideCommand === SMOKE_CONFIRM_GUARD_COMMAND &&
    evidence.guardOverrideOutput === true &&
    evidence.retryCommand === scenario.finalRetry &&
    evidence.successProbeCommand === scenario.successProbeCommand &&
    evidence.screenshotCommand === scenario.screenshotCommands[0] &&
    evidence.nativeRestoreCommand === SMOKE_CONFIRM_RESTORE_COMMAND &&
    evidence.nativeRestoreCompleted === true &&
    scenario.requestEvidence.deleteCancelRequests === evidence.cancelDeleteCountReadOutput
  );
}

function smokeAttemptValid(attempt, expected, scenario, index) {
  const phaseName = index === 0 ? "initial" : "retry";
  const commands = attempt.commands;
  const pattern = expectedSmokePattern(expected, scenario);
  const formFlow = scenario.kind === "create-retry" || scenario.kind === "rename-retry";
  const initialListAttempt = scenario.kind === "list-retry" && index === 0;
  const retryTriggeredAttempt = phaseName === "retry";
  const initialCommands = retryTriggeredAttempt
    ? null
    : expectedInitialAttemptCommands(scenario, attempt.id);
  const retryDoubleActivationCommand = expectedRetryDoubleActivationCommand(
    scenario.state.retryName
  );
  const retryAbsentCommand = expectedRetryAbsentCommand(scenario.state.retryName);
  const initialPendingEvidenceValid =
    !retryTriggeredAttempt &&
    initialCommands !== null &&
    initialAttemptCommandsMatch(commands, scenario, attempt.id) &&
    attempt.actionOutput === (initialListAttempt ? true : null) &&
    attempt.pending.mode === "initiating-control-disabled" &&
    attempt.pending.controlProbeOutput === true &&
    attempt.pending.secondActivationOutput === true &&
    (initialListAttempt
      ? commands.mutationCounterSetup === expectedListMutationCounterSetupCommand(attempt.id) &&
        commands.pending.mutationCounterReadAndCleanup ===
          expectedListMutationCounterReadAndCleanupCommand(attempt.id) &&
        attempt.pending.representativeMutationRequestCount === 0
      : commands.mutationCounterSetup === null &&
        commands.pending.mutationCounterReadAndCleanup === null &&
        attempt.pending.representativeMutationRequestCount === null);
  const retryPendingEvidenceValid =
    retryTriggeredAttempt &&
    commands.action === retryDoubleActivationCommand &&
    attempt.actionOutput === 1 &&
    attempt.pending.mode === "consumed-retry-absent" &&
    commands.pending.controlProbe === retryAbsentCommand &&
    attempt.pending.controlProbeOutput === 0 &&
    commands.pending.secondActivation === null &&
    attempt.pending.secondActivationOutput === null &&
    commands.mutationCounterSetup === null &&
    commands.pending.mutationCounterReadAndCleanup === null &&
    attempt.pending.representativeMutationRequestCount === null;
  return (
    pattern !== null &&
    attempt.id === expected.id + "-" + phaseName + "-fault" &&
    attempt.phase === phaseName &&
    attempt.method === expected.method &&
    attempt.pattern === pattern &&
    attempt.targetId === scenario.targetId &&
    attempt.fault === "syntactically-invalid-json-200" &&
    attempt.faultHits === 1 &&
    sameSequence(attempt.executionOrder, [
      "routeFault",
      "mutationCounterSetupIfNeeded",
      "action",
      "pendingRailBusy",
      "pendingControlProbe",
      "pendingSecondActivationIfNeeded",
      "pendingMutationCounterReadAndCleanupIfNeeded",
      "pendingHitRead",
      "release",
      "failureProbe",
      "hitRead",
      "unroute",
      "pageUnroute",
      "routeList",
    ]) &&
    attempt.unrouted === true &&
    attempt.routeAbsent === true &&
    attempt.releaseResult === true &&
    attempt.hitReadResult === 1 &&
    attempt.pageUnrouteResult === true &&
    attempt.failureProbeCommand === expectedFailureProbeCommand(scenario.state.retryName) &&
    attempt.failureProbeOutput.alertText === scenario.state.alertText &&
    attempt.failureProbeOutput.retryName === scenario.state.retryName &&
    attempt.failureProbeOutput.token === scenario.failureTokens[index] &&
    attempt.failureProbeOutput.visible === true &&
    (!formFlow ||
      (attempt.failureProbeOutput.input === scenario.beforeProbeOutput.input &&
        attempt.failureProbeOutput.focusedElement === scenario.beforeProbeOutput.focusedElement &&
        attempt.failureProbeOutput.focusedElement ===
          scenario.assertionProbeOutput.state.focusedElement)) &&
    !attempt.routeListOutput.includes(pattern) &&
    attempt.pending.railAriaBusyOutput === "true" &&
    attempt.pending.hitReadOutput === 1 &&
    (initialPendingEvidenceValid || retryPendingEvidenceValid) &&
    fullSmokeCommand(commands.release, "run-code ") &&
    commands.release.includes("__wf544FaultRelease") &&
    commands.release.includes(attempt.id) &&
    routeFaultCommandMatches(commands.routeFault, attempt.id, expected.method, pattern) &&
    fullSmokeCommand(commands.action, "") &&
    commands.pending.railBusy === SMOKE_RAIL_BUSY_COMMAND &&
    fullSmokeCommand(commands.pending.controlProbe, "") &&
    (commands.pending.secondActivation === null ||
      fullSmokeCommand(commands.pending.secondActivation, "")) &&
    commands.pending.hitRead === expectedFaultHitReadCommand(attempt.id) &&
    commands.hitRead === expectedFaultHitReadCommand(attempt.id) &&
    commands.unroute === "playwright-cli -s=wf544smoke unroute '" + pattern + "'" &&
    commands.pageUnroute === expectedPageUnrouteCommand(pattern) &&
    commands.routeList === "playwright-cli -s=wf544smoke route-list"
  );
}

function snapshotRowsValid(snapshot) {
  return (
    snapshot.rows.length === snapshot.order.length &&
    snapshot.rows.length === snapshot.knownRows.length &&
    new Set(snapshot.rows.map(({ id }) => id)).size === snapshot.rows.length &&
    sameSequence(
      snapshot.rows.map(({ id }) => id),
      snapshot.order
    ) &&
    sameSequence(snapshot.order, snapshot.knownRows)
  );
}

function visibleMutationValid(scenario, before, failure, success) {
  if (!sameSequence(before.rows, failure.rows)) return false;
  if (scenario.kind === "list-retry") {
    return (
      scenario.childId === null &&
      scenario.successTargetId === null &&
      scenario.expectedName === null &&
      success.rows.length > 0 &&
      sameSequence(success.rows, before.rows)
    );
  }
  if (scenario.kind === "create-retry") {
    if (
      typeof scenario.successTargetId !== "string" ||
      typeof scenario.expectedName !== "string" ||
      scenario.childId !== null ||
      before.rows.some(({ id }) => id === scenario.successTargetId)
    ) {
      return false;
    }
    const created = success.rows.find(({ id }) => id === scenario.successTargetId);
    return (
      created?.name === scenario.expectedName &&
      created.parentId === scenario.formEvidence?.retryTarget.parentId &&
      success.rows.length === before.rows.length + 1 &&
      sameSequence(
        success.rows.filter(({ id }) => id !== scenario.successTargetId),
        before.rows
      )
    );
  }
  if (scenario.kind === "rename-retry") {
    if (
      scenario.successTargetId !== scenario.targetId ||
      typeof scenario.expectedName !== "string" ||
      scenario.childId !== null
    ) {
      return false;
    }
    const beforeTarget = before.rows.find(({ id }) => id === scenario.targetId);
    const successTarget = success.rows.find(({ id }) => id === scenario.targetId);
    return (
      beforeTarget !== undefined &&
      beforeTarget.name !== scenario.expectedName &&
      successTarget?.name === scenario.expectedName &&
      successTarget.parentId === beforeTarget.parentId &&
      sameSequence(
        success.rows.filter(({ id }) => id !== scenario.targetId),
        before.rows.filter(({ id }) => id !== scenario.targetId)
      )
    );
  }
  if (scenario.kind === "reorder-retry") {
    return (
      scenario.childId === null &&
      scenario.successTargetId === null &&
      scenario.expectedName === null &&
      sameSequence(
        success.rows.map(({ id }) => id),
        scenario.state.capturedOrder
      )
    );
  }
  return (
    scenario.kind === "delete-retry" &&
    typeof scenario.childId === "string" &&
    scenario.successTargetId === null &&
    scenario.expectedName === null &&
    before.rows.some(({ id }) => id === scenario.targetId) &&
    before.rows.some(
      ({ id, parentId }) => id === scenario.childId && parentId === scenario.targetId
    ) &&
    !success.rows.some(({ id }) => id === scenario.targetId) &&
    success.rows.length === before.rows.length - 1 &&
    success.rows.some(
      ({ id, name, parentId }) =>
        id === scenario.childId &&
        name === before.rows.find((row) => row.id === scenario.childId)?.name &&
        parentId === null
    ) &&
    sameSequence(
      success.rows.filter(({ id }) => id !== scenario.childId),
      before.rows.filter(({ id }) => id !== scenario.targetId && id !== scenario.childId)
    )
  );
}

function smokeAssertionProbeValid(scenario) {
  const before = scenario.beforeProbeOutput;
  const failure = scenario.assertionProbeOutput.state;
  const success = scenario.successProbeOutput;
  const state = scenario.state;
  const formKind = scenario.kind === "create-retry" || scenario.kind === "rename-retry";
  return (
    scenario.beforeProbeCommand === expectedStateProbeCommand(scenario.childId) &&
    scenario.assertionProbeCommand ===
      expectedAssertionProbeCommand(scenario.state.retryName, scenario.childId) &&
    (formKind
      ? scenario.formEvidence !== null &&
        typeof scenario.mismatchDraft === "string" &&
        scenario.mismatchDraft.length > 0 &&
        scenario.mismatchDraft !== scenario.formEvidence.retryTarget.name &&
        scenario.makeDraftMismatchCommand ===
          expectedMakeDraftMismatchCommand(
            scenario.formEvidence.retryTarget,
            scenario.mismatchDraft
          ) &&
        sameSequence(
          scenario.makeDraftMismatchOutput,
          scenario.formEvidence.currentTargetSnapshot
        ) &&
        scenario.makeDraftMismatchOutput?.name === scenario.mismatchDraft &&
        scenario.restoreMatchingFormCommand ===
          expectedRestoreMatchingFormCommand(scenario.formEvidence.retryTarget) &&
        sameSequence(scenario.restoreMatchingFormOutput, scenario.formEvidence.retryTarget)
      : scenario.mismatchDraft === null &&
        scenario.makeDraftMismatchCommand === null &&
        scenario.makeDraftMismatchOutput === null &&
        scenario.restoreMatchingFormCommand === null &&
        scenario.restoreMatchingFormOutput === null) &&
    scenario.successProbeCommand === expectedStateProbeCommand(scenario.childId) &&
    sameSequence(scenario.probeExecutionOrder, [
      "beforeProbe",
      "faultAttempts",
      "makeDraftMismatchIfNeeded",
      "assertionProbe",
      "restoreMatchingFormIfNeeded",
      "finalRetry",
      "successProbe",
    ]) &&
    snapshotRowsValid(before) &&
    snapshotRowsValid(failure) &&
    snapshotRowsValid(success) &&
    visibleMutationValid(scenario, before, failure, success) &&
    before.input === state.inputBefore &&
    failure.input === state.inputOnFailure &&
    sameSequence(before.order, state.orderBefore) &&
    sameSequence(failure.order, state.orderOnFailure) &&
    sameSequence(success.order, state.orderAfter) &&
    before.selection === state.selectionBefore &&
    failure.selection === state.selectionOnFailure &&
    success.selection === state.selectionAfter &&
    before.activeFolderId === state.activeFolderIdBefore &&
    failure.activeFolderId === state.activeFolderIdOnFailure &&
    success.activeFolderId === state.activeFolderIdAfter &&
    before.mediaFilterStateFolderId === state.mediaFilterStateFolderIdBefore &&
    failure.mediaFilterStateFolderId === state.mediaFilterStateFolderIdOnFailure &&
    success.mediaFilterStateFolderId === state.mediaFilterStateFolderIdAfter &&
    sameSequence(before.knownRows, state.knownRowsBefore) &&
    sameSequence(failure.knownRows, state.knownRowsOnFailure) &&
    sameSequence(success.knownRows, state.knownRowsAfter) &&
    before.childParent === state.childParentBefore &&
    failure.childParent === state.childParentOnFailure &&
    success.childParent === state.childParentAfter &&
    failure.focusedElement === state.exactFocusedElement &&
    (!formKind ||
      (before.focusedElement !== null &&
        before.focusedElement === failure.focusedElement &&
        state.focusRetained === true)) &&
    (!formKind || (before.formOpen && failure.formOpen && !success.formOpen)) &&
    sameSequence(scenario.assertionProbeOutput.formEvidence, scenario.formEvidence) &&
    sameSequence(scenario.assertionProbeOutput.geometry, scenario.geometry) &&
    sameSequence(scenario.assertionProbeOutput.mediaQueries, scenario.mediaQueries) &&
    state.successVisible === true
  );
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parsePng(bytes) {
  if (bytes.length < 45 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("invalid PNG signature/length");
  }
  let offset = 8;
  let chunks = 0;
  let width = 0;
  let height = 0;
  let sawIhdr = false;
  let sawIdat = false;
  let sawIend = false;
  while (offset < bytes.length) {
    if (chunks >= 10000 || offset + 12 > bytes.length) throw new Error("invalid PNG chunk bounds");
    const length = bytes.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    if (length > 64 * 1024 * 1024 || crcOffset + 4 > bytes.length) {
      throw new Error("invalid PNG chunk length");
    }
    const type = bytes.subarray(typeStart, dataStart).toString("ascii");
    const expectedCrc = bytes.readUInt32BE(crcOffset);
    if (crc32(bytes.subarray(typeStart, dataEnd)) !== expectedCrc) {
      throw new Error("invalid PNG chunk CRC");
    }
    if (chunks === 0) {
      if (type !== "IHDR" || length !== 13) throw new Error("invalid PNG IHDR");
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      if (width < 1 || height < 1 || width > 32768 || height > 32768) {
        throw new Error("invalid PNG dimensions");
      }
      sawIhdr = true;
    } else if (type === "IHDR") {
      throw new Error("duplicate PNG IHDR");
    }
    if (type === "IDAT") sawIdat = true;
    if (type === "IEND") {
      if (length !== 0 || crcOffset + 4 !== bytes.length) throw new Error("invalid PNG IEND");
      sawIend = true;
    }
    offset = crcOffset + 4;
    chunks += 1;
    if (sawIend) break;
  }
  if (!sawIhdr || !sawIdat || !sawIend || offset !== bytes.length) {
    throw new Error("incomplete PNG structure");
  }
  return { width, height, chunks };
}

async function runSmokePrimary() {
  assertCanonicalSmokeCommandNegativeProbes();
  const smoke = await agent(
    "Run the canonical TASK-544 live smoke at " +
      ROOT +
      ". Start exactly `coderso-dev-core-host /home/coder/project/Coderso`; verify Admin " +
      "http://coderso-a.localhost:5173/admin/ and front http://coderso-a.localhost:3000. " +
      "Use credentials sourced from .env without printing them. Every browser operation must be a " +
      "separate full `playwright-cli -s=wf544smoke ...` command. Execute this exact ordered scenario " +
      "matrix: " +
      JSON.stringify(SMOKE_MATRIX) +
      ". For rename/delete record targetId first and derive the only accepted route pattern as " +
      "`**/admin/api/media/folders/${encodeURIComponent(targetId)}`; no wildcard or placeholder. " +
      "For delete also record the exact full fixture targetName; derive its Retry accessible name " +
      "from the fixed delete prefix plus bounded-folder normalization. " +
      ". Each scenario returns an attempts array. List has two distinct one-shot fault attempts: initial " +
      "load and the first failed Retry; mutation scenarios have one. Name each attempt exactly " +
      "`<scenario-id>-initial-fault` or `<scenario-id>-retry-fault`. For every attempt record the " +
      "ordered routeFault, optional list mutation-counter setup, action, pending rail/control/" +
      "optional mutation-counter cleanup-read/hit probes, release, failureProbe, hitRead, " +
      "quoted CLI unroute, canonical pageUnroute, and " +
      "route-list commands. Immediately after each released failure, run one separate full " +
      "failureProbeCommand in the workflow's exact generated form; it reads the live alert role, " +
      "exact Retry button accessible name, " +
      "fresh failure token, visibility, current form input, and focused element from the browser. " +
      "For create/rename this immediate failure output must equal the before-probe input/focus; " +
      "only afterward edit the draft for the assertion mismatch. Return its exact six-field output. " +
      "Return the schema-required action output plus actual outputs for the pending rail/control/" +
      "second-activation-if-needed/hit probes, release, post-failure hit-read, failure, " +
      "and route-list probes already required by the schema. Use the workflow-generated routeFault " +
      "command byte-for-byte. Its guarded handler uses the attempt id, `__wf544FaultRelease`, and " +
      "`__wf544FaultHits`; matches the exact method/path; increments the counter for EVERY matching " +
      "request before branching; latches only hit 1; and fulfills every matching duplicate with " +
      'status 200, application/json and literal malformed body `"{"` without ever continuing it ' +
      "to the backend. Only a method mismatch may continue. The first hit uses the same malformed " +
      "response after release (playwright-cli callbacks do not expose Node Buffer). The release and hitRead run-code " +
      "commands must address that attempt id, and hitRead must prove exactly one hit. Run the exact " +
      "CLI command `playwright-cli -s=wf544smoke unroute '<pattern>'`, then the workflow-generated " +
      "full run-code command awaiting `page.unroute(<pattern>)` with result true, then prove an empty " +
      "matching route-list after every fault. Only after both list faults are independently " +
      "released, counted and unrouted may its separate finalRetry command succeed. Each mutation also " +
      "uses a separate finalRetry after its one removed fault. Every finalRetry is the exact full " +
      "getByRole(button,{name,exact:true}) run-code command derived from the recorded Retry accessible " +
      "name. For the first list attempt, the action is the real external cacheBus event; use a named " +
      "retained-row mutation action as the representative disabled control and attempt that disabled " +
      "action. Before that external event, install the exact workflow-generated DELETE-only " +
      "`__wf544MutationHits` counter on `**/admin/api/media/folders/*`; it must never pass matching " +
      "DELETE traffic to the backend. After attempting the representative disabled Delete locator, " +
      "run the exact generated counter read+page.unroute command and record 0 independently of the " +
      "GET fault hit. Record the cacheBus action's actual `true` output. For every mutation's initial " +
      "non-Retry action, record null action output and use exact full equality for one accessible-name " +
      "target across action, disabled probe and disabled second activation: `Create folder`, `Save " +
      "folder name`, `Delete <exact targetName>`, or `Move <row name> up|down`. For reorder return the " +
      "structured reorderAction rowId/rowName/direction; it must identify same-parent adjacent rows in " +
      "beforeProbeOutput and its one swap must equal capturedOrder. The workflow derives the only " +
      "accepted Move name from that evidence; every non-reorder scenario returns reorderAction null. " +
      "The list retry-fault attempt is different: " +
      "run the workflow-generated action that captures the exact Retry locator once and calls click() " +
      "twice synchronously on that captured element; record captured count 1. While its request latch " +
      "is held, run the exact generated Retry count command and record 0 because consumed feedback is " +
      "absent, record rail aria-busy output `true`, and run the exact attempt-key hit-read command with " +
      "output 1. Do not replace those command outputs with boolean self-claims. Do not use valid " +
      "wrong-shape JSON. Assert visible errors and success, retained focus/value/order/selection, " +
      "aria-busy plus initiating-control-disabled or consumed-Retry-absent pending state. " +
      "Do not return a prose/boolean `duplicatePendingRequests` claim: the every-match fault counter " +
      "output 1, and the separate list DELETE counter output 0, are the source evidence. Mechanically " +
      "record reachable row actions at 1440x900 with coarse pointer/no hover and at " +
      "390x844 touch/no hover; alert and rail pixel bounds with alert width <= rail width; both " +
      "activeFolderId and mediaFilterState.folderId unchanged after failed delete and null after success; " +
      "compact rail geometry; active computed foreground/background in both themes; " +
      "and zero console errors/warnings/page errors. Start the canonical interval with the exact " +
      "SMOKE_LOG_OBSERVATION_START command, then after every scenario run the exact three full " +
      "run-code read commands from the schema and return their array outputs; do not self-report " +
      "empty arrays without those probes. Create uniquely prefixed folders and record exact " +
      "IDs. For every scenario run and record the exact 1440x900 or 390x844 resize command and a full " +
      "workflow-generated page-evaluate theme command, plus their applied results. Require the fixed alert " +
      "messages and operation-specific Retry names from the workflow constants. Return the token before " +
      "faulting plus structured fresh token after every failure, exact " +
      "focused element/form generation/draft-mismatch " +
      "proof including kind/token/immutable target/current target/current generation/current draft and " +
      "a deliberately mismatched draft whose form remains open; stale completion and target/generation " +
      "races remain direct Vitest coverage, not browser-smoke claims, " +
      "captured reorderAction plus adjacent-swap target, exact request-counter outputs (including " +
      "delete cancel=0, retry=1, no second dialog), delete child " +
      "unparenting, exact DOMRects/clientWidth/scrollWidth/classes/computed styles, and empty per-scenario " +
      "console arrays. In every scenario run a full beforeProbeCommand immediately before " +
      "faulting, a full assertionProbeCommand while the final fault and any deliberately " +
      "mismatched/reopened form remain visible, and a full successProbeCommand immediately " +
      "after the final successful Retry, in the exact probeExecutionOrder from the schema. For " +
      "create/rename run the exact generated makeDraftMismatchCommand after the immediate failure " +
      "probe; retain its DOM-read output and make the mismatch draft-only (same kind, target/parent, " +
      "and generation), then run assertionProbe, then " +
      "run the exact generated restoreMatchingFormCommand, retain its DOM-read target output equal " +
      "to the immutable Retry target, and only then click finalRetry; other flows return null restore " +
      "fields. Use only " +
      "the workflow-generated exact state/assertion commands parameterized by the recorded childId " +
      "and Retry accessible name; alternate code is invalid. The three live DOM snapshots must " +
      "exactly source the " +
      "aggregated before/failure/after state. The failure assertion reads form evidence plus " +
      "getBoundingClientRect, " +
      "getComputedStyle, and matchMedia results in one browser evaluation. Read only the literal " +
      "data-media-folder-rail/filter/folder/actions and data-folder-error/retry/form attributes " +
      "defined by TASK-544-03 through page.locator/getAttribute/textContent; do not create or read " +
      "a page-side smoke/evidence global and do not return constants in place of live DOM reads. " +
      "Return the exact " +
      "state/formEvidence/geometry/mediaQueries object also used by the scenario fields. Every row " +
      "snapshot contains DOM-read id/name/parentId. For create record the new successTargetId and " +
      "expectedName equal to the Retry target name and preserve its Retry parentId; for rename record " +
      "targetId as successTargetId and expectedName equal to the Retry target name; prove exact " +
      "one-row add or target-only name delta. For delete record the exact childId. Record a unique " +
      "ownedFixtureIds list per scenario; their duplicate-free union equals the top-level fixture set " +
      "and includes every target/child/success target. Use only the workflow-generated id-bound " +
      "authenticated admin-API fixture delete/absence commands; they list first, fetch CSRF only for " +
      "an existing exact id, and never install page.once dialog handlers. For the canonical delete " +
      "scenario use the exact workflow-generated confirmCancel, confirmAccept, confirmGuard and " +
      "confirmRestore commands; the throwing guard must remain armed across the labelled Retry and " +
      "produce no page error, then full CLI reload restores native confirm. Return those four command " +
      "fields for delete; all other scenarios return null for all four. Also return delete-only " +
      "confirmEvidence with the exact ordered sequence cancelOverride, cancelClick, " +
      "cancelDeleteCountRead, acceptOverride, faultDelete, guardOverride, retry, successProbe, " +
      "screenshot, nativeRestore. Install the delete attempt routeFault before this sequence, use " +
      "the same exact workflow-generated Delete button command for cancelClick and faultDelete, " +
      "and execute the workflow-generated __wf544FaultHits read immediately after cancelClick; its " +
      "live output must be 0. Record true run-code outputs for each override and true completion for " +
      "the click/reload. confirmEvidence is null for every non-delete scenario. Native dialog commands are " +
      "forbidden because the available CLI closes or poisons the named session on repeated dialogs. Record " +
      "every full health/login/setup/cleanup command with credentials as env " +
      "references, never values; both credential fill commands redirect CLI output to /dev/null so " +
      "generated literal values never enter evidence. Record helper/child PIDs and owners of ports " +
      "3000/5173/alternates; exact fixture " +
      "delete/absence commands/results. Report the exact unique helper-owned ports discovered before " +
      "shutdown and prove every one stopped. Primary shutdown itself is PID/port-bound: use the " +
      "workflow-generated `kill -INT -- <rootPid>`, one exact kill-0 absence probe per root/child PID, " +
      "and one exact absolute-/usr/bin/lsof absence probe per owned port; broad process-name commands " +
      "are forbidden. Run the workflow's exact themeRead command before " +
      "overrides; the product contract is light/dark and an absent/invalid storage value resolves to " +
      "light. Record that original preference/resolved result and restore it with the workflow's " +
      "exact generated command and " +
      "return its preference/resolved result. Delete all fixtures, restore theme, clear routes, run one " +
      "final full route-list command and return its globally empty output, close browser, " +
      "stop helper, verify ports/process/session absent. Capture at least five distinct PNGs under the task-544 session " +
      "prefix. Do not create TASK-545 manifest or edit files except local ignored PNG evidence.",
    { label: "smoke:544", phase: "Smoke", schema: SMOKE_SCHEMA }
  );
  assertRecordedCliCommandsSafe(smoke, "TASK-544 primary smoke");
  const observedMatrix = smoke.scenarios.map(({ id, kind, theme, viewport }) => ({
    id,
    kind,
    theme,
    viewport,
  }));
  const expectedMatrix = SMOKE_MATRIX.map(({ id, kind, theme, viewport }) => ({
    id,
    kind,
    theme,
    viewport,
  }));
  const scenarioScreenshots = smoke.scenarios.flatMap((scenario) => scenario.screenshots);
  const requestEvidenceValid = smoke.scenarios.every((scenario, scenarioIndex) => {
    const expected = SMOKE_MATRIX[scenarioIndex];
    const viewportSize = scenario.viewport === "wide" ? "1440x900" : "390x844";
    const viewportCommand =
      scenario.viewport === "wide"
        ? "playwright-cli -s=wf544smoke resize 1440 900"
        : "playwright-cli -s=wf544smoke resize 390 844";
    return (
      expected &&
      (expected.targetRequired
        ? typeof scenario.targetId === "string" && scenario.targetId.length > 0
        : scenario.targetId === null) &&
      (scenario.kind === "delete-retry"
        ? typeof scenario.targetName === "string" &&
          boundedFolderDisplayName(scenario.targetName).length > 0
        : scenario.targetName === null) &&
      scenario.viewportCommand === viewportCommand &&
      scenario.viewportApplied === viewportSize &&
      scenario.themeCommand === expectedThemeCommand(scenario.theme) &&
      scenario.themeApplied === scenario.theme &&
      scenario.setupCommands.includes(viewportCommand) &&
      scenario.setupCommands.includes(scenario.themeCommand) &&
      (scenario.kind === "delete-retry"
        ? scenario.confirmCancelCommand === SMOKE_CONFIRM_CANCEL_COMMAND &&
          scenario.confirmAcceptCommand === SMOKE_CONFIRM_ACCEPT_COMMAND &&
          scenario.confirmGuardCommand === SMOKE_CONFIRM_GUARD_COMMAND &&
          scenario.confirmRestoreCommand === SMOKE_CONFIRM_RESTORE_COMMAND
        : scenario.confirmCancelCommand === null &&
          scenario.confirmAcceptCommand === null &&
          scenario.confirmGuardCommand === null &&
          scenario.confirmRestoreCommand === null) &&
      scenario.attempts.length === expected.attempts &&
      scenario.attempts.every((attempt, attemptIndex) =>
        smokeAttemptValid(attempt, expected, scenario, attemptIndex)
      ) &&
      new Set(scenario.attempts.map((attempt) => attempt.id)).size === expected.attempts &&
      scenario.finalRetry === expectedFinalRetryCommand(scenario.state.retryName) &&
      scenario.attempts.every((attempt) => attempt.commands.action !== scenario.finalRetry) &&
      scenario.screenshotCommands.length === scenario.screenshots.length &&
      scenario.screenshotCommands.every(
        (command, index) =>
          command.startsWith("playwright-cli -s=wf544smoke screenshot --filename ") &&
          command.includes(scenario.screenshots[index]) &&
          command.endsWith(" --full-page")
      ) &&
      smokeConfirmEvidenceValid(scenario) &&
      smokeStateValid(scenario) &&
      smokeGeometryValid(scenario) &&
      smokeAssertionProbeValid(scenario) &&
      smokeLogReadsValid(scenario)
    );
  });
  const visualMatrixValid =
    smoke.visualMatrix.wideRailWidthPx === 200 &&
    !smoke.visualMatrix.narrowOverflow &&
    smoke.visualMatrix.lightActive.background !== "rgba(0, 0, 0, 0)" &&
    smoke.visualMatrix.darkActive.background !== "rgba(0, 0, 0, 0)" &&
    (smoke.visualMatrix.lightActive.background !== smoke.visualMatrix.darkActive.background ||
      smoke.visualMatrix.lightActive.foreground !== smoke.visualMatrix.darkActive.foreground);
  const cleanupIds = smoke.fixtureCleanup.map(({ id }) => id);
  const scenarioFixtureIds = smoke.scenarios.flatMap(({ ownedFixtureIds }) => ownedFixtureIds);
  const requiredPortsStopped = [3000, 5173].every((port) =>
    smoke.helper.ports.some((entry) => entry.port === port && entry.stopped)
  );
  const observedOwnedPorts = smoke.helper.ports.map(({ port }) => port);
  const ownedPids = new Set([smoke.helper.pid, ...smoke.helper.childPids]);
  const primaryProcessCheckPids = smoke.helper.processChecks.map(({ pid }) => pid);
  const primaryPortCheckPorts = smoke.helper.portChecks.map(({ port }) => port);
  const routeCleanupCommands = smoke.scenarios.flatMap((scenario) =>
    scenario.attempts.flatMap((attempt) => [attempt.commands.unroute, attempt.commands.pageUnroute])
  );
  const finalLogReads = smoke.scenarios.at(-1)?.logReads;
  if (
    !smoke.pass ||
    !sameSequence(observedMatrix, expectedMatrix) ||
    !requestEvidenceValid ||
    !visualMatrixValid ||
    !sameUniqueSet(scenarioScreenshots, smoke.screenshots) ||
    smoke.consoleErrors.length !== 0 ||
    smoke.consoleWarnings.length !== 0 ||
    smoke.pageErrors.length !== 0 ||
    !finalLogReads ||
    !sameSequence(smoke.consoleErrors, finalLogReads.consoleOutput) ||
    !sameSequence(smoke.consoleWarnings, finalLogReads.warningOutput) ||
    !sameSequence(smoke.pageErrors, finalLogReads.pageErrorOutput) ||
    !sameUniqueSet(smoke.fixtureIds.created, smoke.fixtureIds.deleted) ||
    !sameUniqueSet(smoke.fixtureIds.created, smoke.fixtureIds.verifiedAbsent) ||
    !sameUniqueSet(smoke.fixtureIds.created, scenarioFixtureIds) ||
    !smoke.scenarios.every((scenario) =>
      [scenario.targetId, scenario.childId, scenario.successTargetId]
        .filter((id) => id !== null)
        .every((id) => scenario.ownedFixtureIds.includes(id))
    ) ||
    !sameUniqueSet(smoke.fixtureIds.created, cleanupIds) ||
    !smoke.fixtureCleanup.every(
      ({ id, deleteCommand, verifyCommand, deleted, absent }) =>
        deleteCommand === expectedFixtureDeleteCommand(id) &&
        verifyCommand === expectedFixtureVerifyCommand(id) &&
        deleted &&
        absent
    ) ||
    !sameSequence(smoke.commands.routeCleanup, routeCleanupCommands) ||
    smoke.commands.finalRouteList !== "playwright-cli -s=wf544smoke route-list" ||
    !smoke.finalRouteListEmpty ||
    !emptyRouteListOutput(smoke.finalRouteListOutput) ||
    !requiredPortsStopped ||
    !sameUniqueSet(smoke.helper.ownedPortsBefore, observedOwnedPorts) ||
    smoke.commands.helperStop !== expectedHelperStopCommand(smoke.helper.pid) ||
    !sameUniqueSet(primaryProcessCheckPids, [...ownedPids]) ||
    !smoke.helper.processChecks.every(
      ({ pid, command, absent }) => command === expectedProcessCheckCommand(pid) && absent === true
    ) ||
    !sameUniqueSet(primaryPortCheckPorts, smoke.helper.ownedPortsBefore) ||
    !smoke.helper.portChecks.every(
      ({ port, command, absent }) => command === expectedPortCheckCommand(port) && absent === true
    ) ||
    !smoke.helper.ports.every(
      ({ ownerBefore, stopped }) => ownedPids.has(ownerBefore) && stopped
    ) ||
    !smoke.helper.processesAbsent ||
    !smoke.helper.sessionAbsent ||
    smoke.helper.sessionListOutput.includes("wf544smoke") ||
    smoke.commands.themeRead !== expectedThemeReadCommand() ||
    smoke.themeReadResult.preference !== smoke.themeBefore ||
    smoke.themeReadResult.resolved !== smoke.themeBefore ||
    smoke.commands.themeRestore !== expectedThemeRestoreCommand(smoke.themeBefore) ||
    smoke.themeBefore !== smoke.themeAfter ||
    smoke.themeRestoreResult.preference !== smoke.themeBefore ||
    smoke.themeRestoreResult.resolved !== smoke.themeBefore ||
    !smoke.routesCleared ||
    !smoke.browserClosed ||
    !smoke.serverStopped ||
    smoke.failures.length !== 0
  ) {
    throw new Error("TASK-544 smoke invariant failed");
  }
  const paths = new Set();
  const inodes = new Set();
  const hashes = new Set();
  const screenshotEvidence = [];
  for (const screenshot of smoke.screenshots) {
    const [link, canonical, file] = await Promise.all([
      lstat(screenshot),
      realpath(screenshot),
      stat(screenshot),
    ]);
    if (file.size < 45 || file.size > 64 * 1024 * 1024) {
      throw new Error("TASK-544 smoke screenshot size invalid: " + screenshot);
    }
    const bytes = await readFile(screenshot);
    const png = parsePng(bytes);
    const inode = file.dev + ":" + file.ino;
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (
      link.isSymbolicLink() ||
      !file.isFile() ||
      file.size === 0 ||
      !canonical.startsWith(SMOKE_PREFIX) ||
      !canonical.endsWith(".png") ||
      paths.has(canonical) ||
      inodes.has(inode) ||
      hashes.has(hash)
    ) {
      throw new Error("TASK-544 smoke screenshot integrity failed: " + screenshot);
    }
    paths.add(canonical);
    inodes.add(inode);
    hashes.add(hash);
    screenshotEvidence.push({ path: canonical, sha256: hash, inode, size: file.size, ...png });
  }
  const audit = await agent(
    "Fresh read-only TASK-544 smoke evidence audit at " +
      ROOT +
      ". Verify all five scenarios, full CLI/helper usage, visible assertions, PNG identity/hash, " +
      "console/page arrays, exact fixture cleanup, route/theme restoration, and shutdown. No edits. " +
      "Report every H/M/L with file/path evidence. Evidence: " +
      JSON.stringify({ smoke, screenshots: screenshotEvidence }),
    { label: "smoke-audit:544", phase: "Smoke", schema: AUDIT_SCHEMA }
  );
  if (audit.findings.length !== 0) throw new Error("TASK-544 smoke evidence drift");
  return { smoke, screenshots: screenshotEvidence };
}

async function runSmokeCleanup() {
  const cleanup = await agent(
    "Mandatory idempotent TASK-544 smoke cleanup at " +
      ROOT +
      ". Run this even when setup, smoke, schema validation, assertions, screenshots, or the smoke " +
      "agent failed. Discover only the exact named `wf544smoke` session and the exact " +
      "`coderso-dev-core-host /home/coder/project/Coderso` helper process tree; never stop unrelated " +
      "processes. If the named browser exists, use separate full commands to release every function " +
      "stored in page.__wf544FaultRelease, clear that object, run exactly " +
      "`playwright-cli -s=wf544smoke unroute`, then the canonical workflow-generated full run-code " +
      "`page.unrouteAll` command, then the full route-list command and prove it globally " +
      "empty, then close the named browser. If it is already absent, return null for those five " +
      "commands and an empty route-list output. Always run full `playwright-cli list` and prove the " +
      "session absent. Stop the retained/discovered exact helper normally, await it, enumerate its " +
      "descendant PIDs and owned ports before stopping, then prove every such process and port absent. " +
      "Always probe ports 3000 and 5173 and return both in verifiedAbsentPorts, even when setup " +
      "failed before any helper PID was retained; include every discovered helper-owned alternate " +
      "port too. Set processCheckPassed and portCheckPassed only from successful command results, " +
      "never by inferring success from an empty PID or port list. Use exactly `kill -INT -- <rootPid>` " +
      "for the owned helper root, exactly `bash -lc 'if kill -0 -- <pid> 2>/dev/null; then exit 1; fi'` " +
      "for every retained/discovered helper PID, and exactly the workflow-generated absolute " +
      "`/usr/bin/lsof -nP -iTCP:<port> -sTCP:LISTEN -t` status/output guard for every verified " +
      "port; only status 1 with empty combined output proves absence, and every other status/output " +
      "combination fails cleanup. Return each " +
      "PID/port with its exact command and successful absent result. " +
      "Return truthful commands/evidence; no repo edits, staging, commits, manifests, or screenshots.",
    { label: "smoke-cleanup:544", phase: "Smoke", schema: SMOKE_CLEANUP_SCHEMA }
  );
  assertRecordedCliCommandsSafe(cleanup, "TASK-544 mandatory smoke cleanup");
  const commands = cleanup.commands;
  const browserCommandsValid = cleanup.browserWasPresent
    ? typeof commands.release === "string" &&
      commands.release.startsWith("playwright-cli -s=wf544smoke run-code ") &&
      commands.release.includes("__wf544FaultRelease") &&
      commands.unroute === "playwright-cli -s=wf544smoke unroute" &&
      commands.pageUnroute === SMOKE_GLOBAL_PAGE_UNROUTE_COMMAND &&
      commands.routeList === "playwright-cli -s=wf544smoke route-list" &&
      commands.browserClose === "playwright-cli -s=wf544smoke close"
    : commands.release === null &&
      commands.unroute === null &&
      commands.pageUnroute === null &&
      commands.routeList === null &&
      commands.browserClose === null;
  const helperPids = new Set(cleanup.helperPids);
  const processCheckPids = cleanup.processChecks.map(({ pid }) => pid);
  const portCheckPorts = cleanup.portChecks.map(({ port }) => port);
  if (
    !cleanup.pass ||
    cleanup.errors.length !== 0 ||
    cleanup.failures.length !== 0 ||
    !browserCommandsValid ||
    !cleanup.latchesReleased ||
    !cleanup.routesEmpty ||
    !emptyRouteListOutput(cleanup.routeListOutput) ||
    !cleanup.browserClosed ||
    commands.sessionList !== "playwright-cli list" ||
    !cleanup.sessionAbsent ||
    cleanup.sessionListOutput.includes("wf544smoke") ||
    new Set(cleanup.helperPids).size !== cleanup.helperPids.length ||
    !sameUniqueSet(processCheckPids, cleanup.helperPids) ||
    !cleanup.processChecks.every(
      ({ pid, command, absent }) => command === expectedProcessCheckCommand(pid) && absent === true
    ) ||
    new Set(cleanup.ports.map(({ port }) => port)).size !== cleanup.ports.length ||
    !cleanup.ports.every(({ ownerBefore, stopped }) => helperPids.has(ownerBefore) && stopped) ||
    !cleanup.verifiedAbsentPorts.includes(3000) ||
    !cleanup.verifiedAbsentPorts.includes(5173) ||
    !cleanup.ports.every(({ port }) => cleanup.verifiedAbsentPorts.includes(port)) ||
    !sameUniqueSet(portCheckPorts, cleanup.verifiedAbsentPorts) ||
    !cleanup.portChecks.every(
      ({ port, command, absent }) => command === expectedPortCheckCommand(port) && absent === true
    ) ||
    (cleanup.helperPids.length === 0
      ? cleanup.helperRootPid !== null || commands.helperStop !== null
      : cleanup.helperRootPid === null ||
        !helperPids.has(cleanup.helperRootPid) ||
        commands.helperStop !== expectedHelperStopCommand(cleanup.helperRootPid)) ||
    !cleanup.helperStopped ||
    !cleanup.processesAbsent ||
    !cleanup.processCheckPassed ||
    !cleanup.portCheckPassed ||
    cleanup.processChecks.some(({ absent }) => !absent) ||
    cleanup.portChecks.some(({ absent }) => !absent)
  ) {
    throw new Error("TASK-544 mandatory smoke cleanup failed");
  }
  return cleanup;
}

async function runSmoke() {
  let evidence;
  let primaryError;
  try {
    evidence = await runSmokePrimary();
  } catch (error) {
    primaryError = error;
  }

  let cleanup;
  try {
    cleanup = await runSmokeCleanup();
  } catch (cleanupError) {
    if (primaryError) {
      throw new AggregateError(
        [primaryError, cleanupError],
        "TASK-544 smoke failed and mandatory cleanup also failed"
      );
    }
    throw cleanupError;
  }
  if (primaryError) throw primaryError;
  return { ...evidence, cleanup };
}

const initialState = await requirePreGraph();

phase("Start");
await runActivationPrefix("TASK-544 start", "start", initialState);

for (const leaf of LEAVES) {
  phase(leaf.id);
  await runActivationPrefix(
    leaf.id + " activation",
    leaf.id === "544-01-L01" ? "start" : leaf.id,
    initialState
  );
  await runMutatingAgent(
    COMMON +
      " Implement " +
      TASKS +
      "/" +
      leaf.file +
      " fully. Touch only " +
      JSON.stringify(leaf.allowedFiles) +
      ". Do not edit task/docs/changelog/workflow. Return exact touched files.",
    { label: "implement:" + leaf.id, phase: leaf.id, schema: LEAF_SCHEMA },
    leaf,
    leaf.id + " implementation"
  );
  let green = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const gate = await runLeafGate(leaf, attempt);
    if (gate.pass) {
      requireGate(gate, leaf, leaf.id + " gate " + attempt);
      green = true;
      break;
    }
    classifyFailedGate(gate, leaf, leaf.id + " gate " + attempt);
    if (attempt === 3) throw new Error(leaf.id + " exhausted three verified code/test gates");
    await runMutatingAgent(
      COMMON +
        " Fix only the verified code/test " +
        leaf.id +
        " gate failure. Prefer source fixes; do not weaken assertions. Never edit for an " +
        "infrastructure/preflight/tooling failure. Allowed paths: " +
        JSON.stringify(leaf.allowedFiles) +
        ". Gate: " +
        JSON.stringify(gate),
      { label: "fix:" + leaf.id + ":" + attempt, phase: leaf.id, schema: LEAF_SCHEMA },
      leaf,
      leaf.id + " fixer",
      false
    );
  }
  if (!green) throw new Error(leaf.id + " did not reach green gate");
}

phase("544-04 prepare");
await runActivationPrefix("TASK-544-04 activation", "544-04-L01", initialState);
await runMutatingAgent(
  COMMON +
    " Implement TASK-544-04-L01 preparation: add only broad folder route registration coverage to " +
    "tests/integration/routes/media.test.ts and update MEDIA_SPEC/ADMIN_CACHE/ADMIN_CACHE_MAP for " +
    "owned 409, item-validated retryable dedupe, success-only broadcasts, and visible state-preserving " +
    "recovery. Touch exactly within " +
    JSON.stringify(CLOSURE_PREP_OWNER.allowedFiles) +
    ". Do not edit production, source-owned tests, tasks, indexes, changelog, or workflow. Keep all " +
    "TASK-544 statuses In Progress; do not create changelog 1256 or close the board. Return exact " +
    "touchedFiles.",
  { label: "prepare:544-04", phase: "544-04 prepare", schema: LEAF_SCHEMA },
  CLOSURE_PREP_OWNER,
  "TASK-544 closure preparation"
);
let closureGateGreen = false;
for (let attempt = 1; attempt <= 3; attempt += 1) {
  const gate = await runClosureGate(attempt);
  if (gate.pass) {
    requireGate(gate, CLOSURE_PREP_OWNER, "TASK-544-04 gate " + attempt);
    closureGateGreen = true;
    break;
  }
  classifyFailedGate(gate, CLOSURE_PREP_OWNER, "TASK-544-04 gate " + attempt);
  if (attempt === 3) throw new Error("TASK-544-04 exhausted three verified code/test gates");
  await runMutatingAgent(
    COMMON +
      " Fix only the verified code/test TASK-544-04 gate failure inside " +
      JSON.stringify(CLOSURE_PREP_OWNER.allowedFiles) +
      ". Never edit for an infrastructure/preflight/tooling failure. Do not edit source-owned " +
      "tests or weaken assertions. Return exact touchedFiles.",
    { label: "fix:544-04:" + attempt, phase: "544-04 prepare", schema: LEAF_SCHEMA },
    CLOSURE_PREP_OWNER,
    "TASK-544-04 gate fixer",
    false
  );
}
if (!closureGateGreen) throw new Error("TASK-544-04 did not reach green gate");

const LENSES = Object.freeze([
  [
    "db-specificity",
    "constraint_name/code specificity, bounded cause walk, deterministic write barrier, raw-error redaction",
  ],
  [
    "promise-identity",
    "item validation, rejection retry, force/clear generation and old/new request identity",
  ],
  [
    "safe-cache-projection",
    "descriptor-safe item projection at both network and persisted-cache validators; malformed storage eviction, no getter execution or raw-payload rendering",
  ],
  [
    "ui-state",
    "token/unmount guards, exact retry protocol, draft/order/selection retention and post-success load split",
  ],
  [
    "accessibility",
    "keyboard/touch reachability, focus, aria-busy/alert, destructive retry confirmation and prototype geometry",
  ],
  [
    "test-integrity",
    "runner ownership, fixture isolation, cache timing, route registration and no weakened assertions",
  ],
]);

phase("Post-audit");
let validation;
for (let round = 1; round <= 2; round += 1) {
  const results = await Promise.all(
    LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        "Fresh read-only TASK-544 post-audit round " +
          round +
          " at " +
          ROOT +
          ". Lens: " +
          lens +
          ". Read tasks/source/tests/docs/diff and report every H/M/L with file:line. No edits.",
        { label: "post:" + id + ":" + round, phase: "Post-audit", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    results,
    LENSES.map(([id]) => id),
    "TASK-544 post-audit " + round
  );
  const findings = results.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-544 post-audit remained non-clean");
  await runOwnedFixers(findings, "post-fix:544", "Post-audit");
}

phase("Full validation");
validation = await runFullValidation("validation:544", "Full validation");

phase("Smoke");
let smokeEvidence = await runSmoke();

phase("Final drift");
const finalLenses = Object.freeze([
  ["implementation", "final service/client/UI code and single-writer scope"],
  ["evidence", "targeted/full validation, strict scan, smoke PNGs, cleanup and zero-error truth"],
  [
    "graph",
    "all nine files still provisional In Progress, board/changelog reservation and closure readiness",
  ],
]);
for (let round = 1; round <= 2; round += 1) {
  const results = await Promise.all(
    finalLenses.map(async ([id, lens]) => ({
      id,
      result: await agent(
        "Fresh read-only final TASK-544 drift round " +
          round +
          " at " +
          ROOT +
          ". Lens: " +
          lens +
          ". Report every H/M/L with file:line. No edits.",
        { label: "final:" + id + ":" + round, phase: "Final drift", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    results,
    finalLenses.map(([id]) => id),
    "TASK-544 final drift " + round
  );
  const findings = results.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-544 final drift remained non-clean");
  const touchedFiles = await runOwnedFixers(findings, "final-fix:544", "Final drift");
  validation = await runFullValidation("validation:544:final-fix", "Final drift");
  if (touchedFiles.some((file) => file.startsWith("core/") || file.startsWith("tests/"))) {
    smokeEvidence = await runSmoke();
  }
}

const preFinalBoard = await requireFullyActiveGraph(initialState);

phase("Final closure");
const closureDate = utcDate();
const changelogFile = changelogFileFor(closureDate);
const closureOwner = finalClosureOwner(changelogFile);
await runMutatingAgent(
  "Fresh-read task and changelog indexes at " +
    ROOT +
    ". Close TASK-544 only on UTC date " +
    closureDate +
    ": record actual validation/smoke/audit evidence, mark four leaves then four " +
    "children then parent Done with Completed date, move the sole board row In Progress→Done with " +
    "exact statistics delta, create exactly " +
    changelogFile +
    " with `Date: " +
    closureDate +
    "`, Version Unreleased, and all nine IDs exactly once; add one index row before 1253. In the " +
    "changelog index use exactly: `Changelogs 1251–1252, 1254–1255, and 1257 remain reserved, " +
    "respectively, for the implementation closure of TASK-539, TASK-540, TASK-542, TASK-543, and " +
    "TASK-545.` Keep 1258 next unreserved. Update the board program note so its aggregated " +
    "consumed list includes 1248–1250, 1253, and 1256 for TASK-536/537/538/541/544, while " +
    "1251–1252, 1254–1255, and 1257 remain reserved, without changing land " +
    "order. Touch only " +
    JSON.stringify(closureOwner.allowedFiles) +
    ". Do not edit source/tests/workflow/TASK-543, stage, or commit. Return exact touchedFiles. " +
    "Evidence: " +
    JSON.stringify({ validation, smoke: smokeEvidence }),
  { label: "close:544", phase: "Final closure", schema: LEAF_SCHEMA },
  closureOwner,
  "TASK-544 closure"
);
await requireCompletedGraph(preFinalBoard, closureDate, changelogFile);

const closureLenses = Object.freeze([
  [
    "graph",
    "9/9 terminal files, child tables, board/statistics, one changelog/index row with all IDs",
  ],
  ["claims", "closure validation/security/smoke/cleanup claims match retained evidence"],
]);
for (let round = 1; round <= 2; round += 1) {
  const closureResults = await Promise.all(
    closureLenses.map(async ([id, lens]) => ({
      id,
      result: await agent(
        "Fresh read-only post-closure TASK-544 audit round " +
          round +
          " at " +
          ROOT +
          ". Lens: " +
          lens +
          ". Report every H/M/L with file:line. No edits.",
        { label: "post-close:" + id + ":" + round, phase: "Final closure", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    closureResults,
    closureLenses.map(([id]) => id),
    "TASK-544 post-close " + round
  );
  const findings = closureResults.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-544 post-closure drift remained non-clean");
  await runMutatingAgent(
    "Fix only verified TASK-544 terminal graph/evidence/index drift at " +
      ROOT +
      ". Touch only " +
      JSON.stringify(closureOwner.allowedFiles) +
      ". Do not edit source/tests/workflow, alter validated behavior, stage, or commit. Return exact " +
      "touchedFiles. Findings: " +
      JSON.stringify(findings),
    { label: "post-close-fix:544", phase: "Final closure", schema: LEAF_SCHEMA },
    closureOwner,
    "TASK-544 post-closure fixer",
    false
  );
  await requireCompletedGraph(preFinalBoard, closureDate, changelogFile);
}
await requireCompletedGraph(preFinalBoard, closureDate, changelogFile);

phase("Final gate");
const finalGate = await agent(
  "Read-only final mechanical TASK-544 gate at " +
    ROOT +
    ". Run node --check _docs/_workflows/task-544-implement.mjs and git diff --check. Verify clean " +
    "nine-file terminal graph, board/statistics, changelog 1256 exact IDs/index/reservations, local PNG " +
    "integrity and fixture/session/server cleanup. Do not edit.",
  { label: "final-gate:544", phase: "Final gate", schema: RESULT_SCHEMA }
);
if (!resultPassed(finalGate)) throw new Error("TASK-544 final gate failed");

phase("Owner handoff");
const ownerSteps = Object.freeze([
  "Stage only the reported TASK-544 commit files.",
  "Run bun run precommit after staging and require exit zero.",
  "Create one task-scoped manual TASK-544 commit; workflow agents do not commit.",
  "Run a fresh read-only post-commit audit on the final committed HEAD and clean status.",
]);
const commitAllowed = new Set([
  "_docs/_workflows/task-544-implement.mjs",
  ...LEAVES.flatMap((leaf) => leaf.allowedFiles),
  ...CLOSURE_PREP_OWNER.allowedFiles,
  ...closureOwner.allowedFiles,
]);
const commitRequired = [
  "_docs/_workflows/task-544-implement.mjs",
  ...new Set([
    ...LEAVES.flatMap((leaf) => leaf.requiredTouched),
    ...CLOSURE_PREP_OWNER.requiredTouched,
    ...closureOwner.requiredTouched,
  ]),
];
const handoff = await agent(
  "Read-only owner handoff for completed TASK-544 at " +
    ROOT +
    ". Run `git status --porcelain=v1 --untracked-files=all` and return every exact unique " +
    "task-scoped tracked or untracked commitFile parsed from it. They must be " +
    "within the supplied allowed scope, include the audited workflow, nine task files, board, " +
    "changelog 1256/index, required production/tests/docs, and exclude ignored PNGs/unrelated work. " +
    "Do not stage or commit. Return these four ownerSteps exactly: " +
    JSON.stringify(ownerSteps) +
    ". Allowed scope: " +
    JSON.stringify([...commitAllowed]),
  { label: "handoff:544", phase: "Owner handoff", schema: HANDOFF_SCHEMA }
);
const handoffStatus = await repoMutationSnapshot();
const actualHandoffFiles = [...handoffStatus.states.keys()].sort();
if (
  !resultPassed(handoff) ||
  !sameSequence(handoff.ownerSteps, ownerSteps) ||
  new Set(handoff.commitFiles).size !== handoff.commitFiles.length ||
  !sameUniqueSet(handoff.commitFiles, actualHandoffFiles) ||
  !handoff.commitFiles.every((file) => commitAllowed.has(file)) ||
  !commitRequired.every((file) => handoff.commitFiles.includes(file))
) {
  throw new Error("TASK-544 owner handoff scope mismatch");
}
