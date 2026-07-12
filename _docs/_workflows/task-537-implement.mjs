import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";

export const meta = {
  name: "task-537-implement",
  description:
    "Implement TASK-537 in strict leaf order: transaction-aware taxonomy and SEO plans, locked atomic entry metadata, secret-minimal projections, rollback/concurrency proof, six-flow runtime smoke, and changelog 1249 closure. Agents never stage or commit.",
  phases: [
    { title: "Start" },
    { title: "537-01-L01" },
    { title: "537-01-L02" },
    { title: "537-02-L01" },
    { title: "537-03 prepare" },
    { title: "Post-audit" },
    { title: "Smoke" },
    { title: "Smoke evidence audit" },
    { title: "537-03 close" },
    { title: "Final drift" },
    { title: "Final closure" },
    { title: "Final gate" },
  ],
};

const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const ENV = "set -a && source .env && set +a && ";
const SMOKE_PREFIX = ROOT + "/_docs/_workflows/_smoke/task-537-";
const CHANGELOG_1249_FILE =
  "_docs/_CHANGELOG/1249-2026-07-12-task-537-entry-mutation-atomicity-and-secret-minimal-projections.md";

const EXPECTED_TASK_FILES = Object.freeze([
  "TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
  "TASK-537-01-Entry-Metadata-Transaction-Boundary.md",
  "TASK-537-01-L01-Transaction-Aware-Taxonomy-Mutations.md",
  "TASK-537-01-L02-Transaction-Aware-Seo-Mutations.md",
  "TASK-537-02-Secret-Minimal-Entry-Projections.md",
  "TASK-537-02-L01-Narrow-Update-Publish-And-Delete-Projections.md",
  "TASK-537-03-Rollback-Cache-Tests-And-Closure.md",
  "TASK-537-03-L01-Db-Rollback-Cache-After-Commit-And-Closure.md",
]);

const ENTRY_GATE_TEST_FILES = Object.freeze([
  "tests/unit/content/taxonomyService.test.ts",
  "tests/unit/seo/seoService.test.ts",
  "tests/unit/content/entryService.test.ts",
  "tests/unit/auth/rbac.test.ts",
  "tests/integration/routes/contentEntriesRoutes.test.ts",
  "tests/integration/routes/contentTypes.test.ts",
  "tests/integration/runtime/detail-page-preview-cache.test.ts",
  "tests/integration/runtime/detail-page-runtime.test.ts",
  "tests/integration/runtime/detail-page-composer-runtime.test.tsx",
  "tests/security/codersoSecurityGate.test.ts",
]);

const FULL_TEST_FILES = Object.freeze([
  ...ENTRY_GATE_TEST_FILES,
  "tests/vitest/admin/entriesClient.test.ts",
]);

const EXPECTED_EXTERNAL_STRICT_FINDING = Object.freeze({
  owner: "TASK-545",
  file: "_docs/_workflows/task-522-author.mjs",
  rule: "javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag",
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

const LEAF_RESULT_SCHEMA = {
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

const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "summary",
    "errors",
    "commands",
    "testFilesExecuted",
    "skippedTests",
    "failedTests",
  ],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    commands: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "passed"],
        properties: {
          id: { type: "string", minLength: 1 },
          passed: { type: "boolean" },
        },
      },
    },
    testFilesExecuted: { type: "array", items: { type: "string", minLength: 1 } },
    skippedTests: { type: "integer", minimum: 0 },
    failedTests: { type: "integer", minimum: 0 },
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

const VALIDATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "summary",
    "errors",
    "commandOutcomes",
    "targetedPassedTests",
    "testFilesExecuted",
    "skippedTests",
    "failedTests",
    "releaseGatesPassed",
    "targetedSemgrepFindings",
    "strictScan",
  ],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
    commandOutcomes: {
      type: "object",
      additionalProperties: false,
      required: [
        "dbPreflight",
        "lintTypes",
        "lint",
        "rootTsc",
        "targetedBun",
        "securityBun",
        "clientVitest",
        "targetedSemgrep",
        "releaseGates",
        "strictScanExecuted",
        "diffCheck",
      ],
      properties: {
        dbPreflight: { type: "boolean" },
        lintTypes: { type: "boolean" },
        lint: { type: "boolean" },
        rootTsc: { type: "boolean" },
        targetedBun: { type: "boolean" },
        securityBun: { type: "boolean" },
        clientVitest: { type: "boolean" },
        targetedSemgrep: { type: "boolean" },
        releaseGates: { type: "boolean" },
        strictScanExecuted: { type: "boolean" },
        diffCheck: { type: "boolean" },
      },
    },
    targetedPassedTests: { type: "integer", minimum: 1 },
    testFilesExecuted: {
      type: "array",
      minItems: FULL_TEST_FILES.length,
      maxItems: FULL_TEST_FILES.length,
      items: { enum: FULL_TEST_FILES },
    },
    skippedTests: { const: 0 },
    failedTests: { const: 0 },
    releaseGatesPassed: { const: 5 },
    targetedSemgrepFindings: { const: 0 },
    strictScan: {
      type: "object",
      additionalProperties: false,
      required: ["exitCode", "task537Findings", "toolingFailure", "externalFindings"],
      properties: {
        exitCode: { type: "integer" },
        task537Findings: { const: 0 },
        toolingFailure: { const: false },
        externalFindings: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["owner", "file", "rule"],
            properties: {
              owner: { enum: ["TASK-545"] },
              file: { type: "string", minLength: 1 },
              rule: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
  },
};

const REQUIRED_SMOKE_KINDS = [
  "taxonomy-seo-reopen",
  "schedule-omit-preserves",
  "schedule-null-rejects",
  "password-cycle",
  "publish-invalid-taxonomy-rollback",
  "publish-front-unpublish",
];

const SMOKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "pass",
    "adminUp",
    "frontUp",
    "scenarios",
    "consoleErrors",
    "consoleWarnings",
    "pageErrors",
    "screenshots",
    "fixtureIds",
    "baseline",
    "frontBaselineRestored",
    "browserClosed",
    "serverStopped",
    "failures",
  ],
  properties: {
    pass: { type: "boolean" },
    adminUp: { type: "boolean" },
    frontUp: { type: "boolean" },
    scenarios: {
      type: "array",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "theme", "viewport", "visibleAssertions", "screenshots"],
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { enum: REQUIRED_SMOKE_KINDS },
          theme: { enum: ["light", "dark"] },
          viewport: { enum: ["narrow", "wide"] },
          visibleAssertions: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 },
          },
          screenshots: {
            type: "array",
            minItems: 1,
            items: { type: "string", minLength: 1 },
          },
        },
      },
    },
    consoleErrors: { type: "array", items: { type: "string" } },
    consoleWarnings: { type: "array", items: { type: "string" } },
    pageErrors: { type: "array", items: { type: "string" } },
    screenshots: { type: "array", minItems: 6, items: { type: "string" } },
    fixtureIds: {
      type: "object",
      additionalProperties: false,
      required: [
        "typesCreated",
        "typesDeleted",
        "entriesCreated",
        "entriesDeleted",
        "taxonomiesCreated",
        "taxonomiesDeleted",
        "termsCreated",
        "termsDeleted",
        "seoTargetsCreated",
        "seoTargetsVerifiedAbsent",
      ],
      properties: {
        typesCreated: { type: "array", minItems: 1, items: { type: "string" } },
        typesDeleted: { type: "array", minItems: 1, items: { type: "string" } },
        entriesCreated: { type: "array", minItems: 1, items: { type: "string" } },
        entriesDeleted: { type: "array", minItems: 1, items: { type: "string" } },
        taxonomiesCreated: { type: "array", minItems: 1, items: { type: "string" } },
        taxonomiesDeleted: { type: "array", minItems: 1, items: { type: "string" } },
        termsCreated: { type: "array", minItems: 1, items: { type: "string" } },
        termsDeleted: { type: "array", minItems: 1, items: { type: "string" } },
        seoTargetsCreated: { type: "array", minItems: 1, items: { type: "string" } },
        seoTargetsVerifiedAbsent: {
          type: "array",
          minItems: 1,
          items: { type: "string" },
        },
      },
    },
    baseline: {
      type: "object",
      additionalProperties: false,
      required: [
        "contentRoutesBeforeHash",
        "contentRoutesAfterHash",
        "adminThemeBefore",
        "adminThemeAfter",
        "frontBeforeHash",
        "frontAfterHash",
      ],
      properties: {
        contentRoutesBeforeHash: { type: "string", minLength: 1 },
        contentRoutesAfterHash: { type: "string", minLength: 1 },
        adminThemeBefore: { type: "string", minLength: 1 },
        adminThemeAfter: { type: "string", minLength: 1 },
        frontBeforeHash: { type: "string", minLength: 1 },
        frontAfterHash: { type: "string", minLength: 1 },
      },
    },
    frontBaselineRestored: { type: "boolean" },
    browserClosed: { type: "boolean" },
    serverStopped: { type: "boolean" },
    failures: { type: "array", items: { type: "string" } },
  },
};

function requireAllResults(results, expected, label) {
  if (!Array.isArray(results) || results.length !== expected.length) {
    throw new Error(label + ": expected " + expected.length + " results");
  }
  for (let index = 0; index < expected.length; index += 1) {
    const item = results[index];
    if (!item || item.id !== expected[index] || item.result == null) {
      throw new Error(label + ": missing/reordered result " + expected[index]);
    }
  }
  return results;
}

function resultPassed(result) {
  return result.pass === true && result.errors.length === 0;
}

function sameUniqueStringSet(left, right) {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
  );
}

function requireExactStringSet(actual, expected, label) {
  if (!sameUniqueStringSet(actual, expected)) {
    throw new Error(label + ": missing, duplicate, or unexpected values");
  }
}

function requireLeafResult(result, leaf, label, requireOwnedPair = true) {
  if (!resultPassed(result)) throw new Error(label + ": reported failure");
  if (
    result.touchedFiles.length === 0 ||
    new Set(result.touchedFiles).size !== result.touchedFiles.length ||
    !result.touchedFiles.every((file) => leaf.allowedFiles.includes(file)) ||
    (requireOwnedPair && !leaf.requiredTouched.every((file) => result.touchedFiles.includes(file)))
  ) {
    throw new Error(label + ": touched-file ownership invariant failed");
  }
  return result;
}

function requireGate(result, leaf, label) {
  if (!resultPassed(result) || result.skippedTests !== 0 || result.failedTests !== 0) {
    throw new Error(label + ": gate reported failure/skip");
  }
  requireExactStringSet(
    result.commands.map((command) => command.id),
    leaf.commandIds,
    label + " commands"
  );
  if (!result.commands.every((command) => command.passed === true)) {
    throw new Error(label + ": a command did not pass");
  }
  requireExactStringSet(result.testFilesExecuted, leaf.testFiles, label + " test files");
  return result;
}

function readBoardStats(board) {
  const read = (label) => {
    const value = board.match(new RegExp("^- \\*\\*" + label + ":\\*\\* (\\d+) tasks$", "m"))?.[1];
    if (!value) throw new Error("TASK-537 board statistic missing: " + label);
    return Number(value);
  };
  return { toDo: read("To Do"), inProgress: read("In Progress"), done: read("Done") };
}

async function readTask537BoardState() {
  const board = await readFile(TASKS + "/README.md", "utf8");
  const rows = [...board.matchAll(/^\| TASK-537 \|.*$/gm)];
  if (rows.length !== 1) {
    throw new Error("TASK-537 board row is missing or duplicated");
  }
  const rowIndex = rows[0].index ?? -1;
  const toDoStart = board.indexOf("## To Do");
  const inProgressStart = board.indexOf("## In Progress");
  const doneStart = board.indexOf("## Done");
  const bucket =
    rowIndex > toDoStart && rowIndex < inProgressStart
      ? "toDo"
      : rowIndex > inProgressStart && rowIndex < doneStart
        ? "inProgress"
        : rowIndex > doneStart
          ? "done"
          : null;
  if (!bucket) throw new Error("TASK-537 board bucket mismatch");
  return { bucket, stats: readBoardStats(board) };
}

async function requirePreImplementationTaskGraph() {
  const onDisk = (await readdir(TASKS))
    .filter((name) => /^TASK-537(?:[-_].*)?\.md$/.test(name))
    .sort();
  requireExactStringSet(onDisk, EXPECTED_TASK_FILES, "TASK-537 physical files");

  for (const file of EXPECTED_TASK_FILES) {
    const source = await readFile(TASKS + "/" + file, "utf8");
    const id = file.match(/^(TASK-537(?:-\d{2}(?:-L\d{2})?)?)/)?.[1];
    if (!id || !source.includes("# " + id + ":") || !source.includes("# FileName: " + file)) {
      throw new Error("TASK-537 identity mismatch: " + file);
    }
    if (!source.includes("**Changelog:** 1249")) {
      throw new Error("TASK-537 changelog pin mismatch: " + file);
    }
    if (!/^\*\*Status:\*\* (?:⏳ To Do|🚧 In Progress)$/m.test(source)) {
      throw new Error("TASK-537 pre-implementation status mismatch: " + file);
    }
    if (id !== "TASK-537" && !source.includes("**Parent Task:** TASK-537")) {
      throw new Error("TASK-537 parent mismatch: " + file);
    }
    const subtask = id.match(/^(TASK-537-\d{2})-L\d{2}$/)?.[1];
    if (subtask && !source.includes("**Parent Subtask:** " + subtask)) {
      throw new Error("TASK-537 parent-subtask mismatch: " + file);
    }
  }

  const boardState = await readTask537BoardState();
  if (boardState.bucket !== "toDo" && boardState.bucket !== "inProgress") {
    throw new Error("TASK-537 pre-implementation board bucket mismatch");
  }
  const changelogFiles = (await readdir(ROOT + "/_docs/_CHANGELOG")).filter((name) =>
    name.startsWith("1249-")
  );
  if (changelogFiles.length !== 0) {
    throw new Error("TASK-537 changelog 1249 exists before closure");
  }
  return boardState;
}

async function requireCompletedTaskGraph(preFinalBoardState) {
  const onDisk = (await readdir(TASKS))
    .filter((name) => /^TASK-537(?:[-_].*)?\.md$/.test(name))
    .sort();
  requireExactStringSet(onDisk, EXPECTED_TASK_FILES, "completed TASK-537 physical files");
  const expectedIds = [];
  for (const file of EXPECTED_TASK_FILES) {
    const source = await readFile(TASKS + "/" + file, "utf8");
    const id = file.match(/^(TASK-537(?:-\d{2}(?:-L\d{2})?)?)/)?.[1];
    if (!id) throw new Error("completed TASK-537 ID missing: " + file);
    expectedIds.push(id);
    if (
      !source.includes("# " + id + ":") ||
      !source.includes("# FileName: " + file) ||
      !source.includes("**Status:** ✅ Done") ||
      !/^\*\*Completed:\*\* \d{4}-\d{2}-\d{2}$/m.test(source) ||
      !source.includes("**Changelog:** 1249") ||
      /^\|.*(?:⏳ To Do|🚧 In Progress).*$/m.test(source)
    ) {
      throw new Error("completed TASK-537 metadata mismatch: " + file);
    }
  }

  const changelogFiles = (await readdir(ROOT + "/_docs/_CHANGELOG")).filter((name) =>
    name.startsWith("1249-")
  );
  const expectedChangelogName = CHANGELOG_1249_FILE.split("/").at(-1);
  if (changelogFiles.length !== 1 || changelogFiles[0] !== expectedChangelogName) {
    throw new Error("completed changelog 1249 exact filename mismatch");
  }
  const changelog = await readFile(ROOT + "/_docs/_CHANGELOG/" + changelogFiles[0], "utf8");
  const tasksBlock = changelog.match(/^Tasks: ([\s\S]*?)\n\n/m)?.[1] ?? "";
  const listed = tasksBlock
    .replace(/\n/g, " ")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  requireExactStringSet(listed, expectedIds, "changelog 1249 task IDs");

  const finalBoardState = await readTask537BoardState();
  if (finalBoardState.bucket !== "done" || preFinalBoardState.bucket !== "inProgress") {
    throw new Error("completed TASK-537 board row mismatch");
  }
  const finalStats = finalBoardState.stats;
  const expectedStats = {
    toDo: preFinalBoardState.stats.toDo,
    inProgress: preFinalBoardState.stats.inProgress - 1,
    done: preFinalBoardState.stats.done + 1,
  };
  if (JSON.stringify(finalStats) !== JSON.stringify(expectedStats)) {
    throw new Error("completed TASK-537 board statistics delta mismatch");
  }
  const changelogIndex = await readFile(ROOT + "/_docs/_CHANGELOG/README.md", "utf8");
  const row1250 = changelogIndex.indexOf("| 1250 |");
  const row1249 = changelogIndex.indexOf("| 1249 |");
  const row1248 = changelogIndex.indexOf("| 1248 |");
  if (
    (changelogIndex.match(/^\| 1249 \|/gm) ?? []).length !== 1 ||
    !(row1250 < row1249 && row1249 < row1248)
  ) {
    throw new Error("completed changelog 1249 index row mismatch");
  }
  if (
    !/Changelogs 1248, 1249, 1250, and 1253 are consumed by the completed TASK-536,\s+TASK-537, TASK-538, and TASK-541 families\./m.test(
      changelogIndex
    ) ||
    !/Changelogs 1251–1252 and 1254–1257 remain reserved, respectively, for the\s+implementation closure of TASK-539, TASK-540, TASK-542, TASK-543, TASK-544, and\s+TASK-545\./m.test(
      changelogIndex
    ) ||
    !changelogIndex.includes("Use 1258 for the next unreserved changelog entry.")
  ) {
    throw new Error("completed changelog 1249 reservation text mismatch");
  }
}

function strictScanAccepted(strictScan) {
  const external = strictScan.externalFindings;
  if (strictScan.task537Findings !== 0 || strictScan.toolingFailure !== false) return false;
  if (strictScan.exitCode === 0) return external.length === 0;
  if (strictScan.exitCode !== 1) return false;
  return (
    external.length === 1 &&
    external[0].owner === EXPECTED_EXTERNAL_STRICT_FINDING.owner &&
    external[0].file === EXPECTED_EXTERNAL_STRICT_FINDING.file &&
    external[0].rule === EXPECTED_EXTERNAL_STRICT_FINDING.rule
  );
}

function requireValidation(result, label) {
  const commandsPassed = Object.values(result.commandOutcomes).every((value) => value === true);
  if (
    !resultPassed(result) ||
    !commandsPassed ||
    result.targetedPassedTests < 1 ||
    !sameUniqueStringSet(result.testFilesExecuted, FULL_TEST_FILES) ||
    result.skippedTests !== 0 ||
    result.failedTests !== 0 ||
    result.releaseGatesPassed !== 5 ||
    result.targetedSemgrepFindings !== 0 ||
    !strictScanAccepted(result.strictScan)
  ) {
    throw new Error(label + ": structured validation invariant failed");
  }
  return result;
}

const FORBIDDEN =
  "Do not edit completed TASK-536/TASK-538/TASK-541 source or closure; TASK-517; " +
  "TASK-539/TASK-540/TASK-542/TASK-543/TASK-544/TASK-545 source/tasks; admin UI; " +
  "scanner configuration; dependencies; migrations; endpoints outside the existing " +
  "content-entry family; or any file outside the current leaf ownership. Preserve all " +
  "unrelated user/agent work in the dirty tree.";

const COMMON =
  "Repository " +
  ROOT +
  ", branch feature/tasks-fixes. Fresh-read AGENTS.md, the TASK-537 " +
  "parent/child/leaf, board state, relevant architecture/content/API/security/cache/testing " +
  "docs, current source/tests, HEAD/status/diff before editing. Implement exactly the current " +
  "leaf in strict order. Code/comments are English. Never stage, commit, reset, checkout, " +
  "print env values, suppress scanners, add a migration/dependency/endpoint, or weaken an " +
  "assertion. Source-owner behavior tests land with their source. " +
  FORBIDDEN;

const DB_PREFLIGHT =
  ENV +
  'bun --eval \'import { canConnect } from "./tests/utils/db"; ' +
  'if (!(await canConnect())) throw new Error("task_537_db_unreachable"); process.exit(0)\'';

const TARGETED_TESTS =
  ENV +
  "bun test --timeout=15000 " +
  "tests/unit/content/taxonomyService.test.ts " +
  "tests/unit/seo/seoService.test.ts " +
  "tests/unit/content/entryService.test.ts " +
  "tests/unit/auth/rbac.test.ts " +
  "tests/integration/routes/contentEntriesRoutes.test.ts " +
  "tests/integration/routes/contentTypes.test.ts " +
  "tests/integration/runtime/detail-page-preview-cache.test.ts " +
  "tests/integration/runtime/detail-page-runtime.test.ts " +
  "tests/integration/runtime/detail-page-composer-runtime.test.tsx";

const SECURITY_TEST = ENV + "bun test --timeout=15000 tests/security/codersoSecurityGate.test.ts";

const CLIENT_CACHE_TEST =
  "NODE_ENV=test bunx vitest run --config vitest.config.ts " +
  "tests/vitest/admin/entriesClient.test.ts";

const TARGETED_SEMGREP =
  "semgrep --error --timeout 120 --timeout-threshold 0 " +
  "--config .semgrep.yml --config p/owasp-top-ten --config p/security-audit " +
  "--config p/nodejs --config p/typescript " +
  "core/services/content/taxonomyService.ts core/services/seo/seoService.ts " +
  "core/services/content/entryService.ts core/server/routes/contentEntryRoutes.ts " +
  "core/server/routes/index.ts core/services/auth/roleService.ts " +
  "core/server/middleware/rbac.ts";

const LEAVES = [
  {
    id: "537-01-L01",
    file: "TASK-537-01-L01-Transaction-Aware-Taxonomy-Mutations.md",
    allowedFiles: [
      "core/services/content/taxonomyService.ts",
      "tests/unit/content/taxonomyService.test.ts",
    ],
    requiredTouched: [
      "core/services/content/taxonomyService.ts",
      "tests/unit/content/taxonomyService.test.ts",
    ],
    commandIds: ["lintTypes", "lint", "dbPreflight", "taxonomyTests"],
    testFiles: ["tests/unit/content/taxonomyService.test.ts"],
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && " +
      DB_PREFLIGHT +
      " && " +
      ENV +
      "bun test --timeout=15000 tests/unit/content/taxonomyService.test.ts",
  },
  {
    id: "537-01-L02",
    file: "TASK-537-01-L02-Transaction-Aware-Seo-Mutations.md",
    allowedFiles: ["core/services/seo/seoService.ts", "tests/unit/seo/seoService.test.ts"],
    requiredTouched: ["core/services/seo/seoService.ts", "tests/unit/seo/seoService.test.ts"],
    commandIds: ["lintTypes", "lint", "dbPreflight", "taxonomySeoTests"],
    testFiles: ["tests/unit/content/taxonomyService.test.ts", "tests/unit/seo/seoService.test.ts"],
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && " +
      DB_PREFLIGHT +
      " && " +
      ENV +
      "bun test --timeout=15000 tests/unit/content/taxonomyService.test.ts " +
      "tests/unit/seo/seoService.test.ts",
  },
  {
    id: "537-02-L01",
    file: "TASK-537-02-L01-Narrow-Update-Publish-And-Delete-Projections.md",
    allowedFiles: [
      "core/services/content/entryService.ts",
      "core/server/routes/contentEntryRoutes.ts",
      "core/server/routes/index.ts",
      "core/services/auth/roleService.ts",
      "core/server/middleware/rbac.ts",
      "tests/unit/content/entryService.test.ts",
      "tests/unit/auth/rbac.test.ts",
      "tests/integration/routes/contentEntriesRoutes.test.ts",
      "tests/integration/routes/contentTypes.test.ts",
      "tests/integration/runtime/detail-page-preview-cache.test.ts",
    ],
    requiredTouched: [
      "core/services/content/entryService.ts",
      "core/server/routes/contentEntryRoutes.ts",
      "core/server/routes/index.ts",
      "core/services/auth/roleService.ts",
      "core/server/middleware/rbac.ts",
      "tests/unit/content/entryService.test.ts",
      "tests/unit/auth/rbac.test.ts",
      "tests/integration/routes/contentEntriesRoutes.test.ts",
      "tests/integration/routes/contentTypes.test.ts",
    ],
    commandIds: [
      "lintTypes",
      "lint",
      "dbPreflight",
      "targetedTests",
      "securityTest",
      "targetedSemgrep",
    ],
    testFiles: ENTRY_GATE_TEST_FILES,
    gate:
      "bun --cwd core lint:types && bun --cwd core lint && " +
      DB_PREFLIGHT +
      " && " +
      TARGETED_TESTS +
      " && " +
      SECURITY_TEST +
      " && " +
      TARGETED_SEMGREP,
  },
];

const CLOSURE_OWNER = Object.freeze({
  allowedFiles: [
    "tests/unit/content/entryService.test.ts",
    "tests/unit/content/taxonomyService.test.ts",
    "tests/unit/seo/seoService.test.ts",
    "tests/integration/routes/contentEntriesRoutes.test.ts",
    "tests/integration/runtime/detail-page-preview-cache.test.ts",
    "tests/vitest/admin/entriesClient.test.ts",
    "_docs/CONTENT_TYPES_SPEC.md",
    "_docs/CMS_API.md",
    "_docs/SECURITY_SPEC.md",
    "_docs/ADMIN_CACHE.md",
  ],
  requiredTouched: [
    "tests/unit/content/entryService.test.ts",
    "tests/vitest/admin/entriesClient.test.ts",
    "_docs/CONTENT_TYPES_SPEC.md",
    "_docs/CMS_API.md",
    "_docs/SECURITY_SPEC.md",
    "_docs/ADMIN_CACHE.md",
  ],
});

const START_OWNER = Object.freeze({
  allowedFiles: [
    "_docs/_TASKS/TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
    "_docs/_TASKS/TASK-537-01-Entry-Metadata-Transaction-Boundary.md",
    "_docs/_TASKS/TASK-537-01-L01-Transaction-Aware-Taxonomy-Mutations.md",
    "_docs/_TASKS/README.md",
  ],
  requiredTouched: [
    "_docs/_TASKS/TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
    "_docs/_TASKS/TASK-537-01-Entry-Metadata-Transaction-Boundary.md",
    "_docs/_TASKS/TASK-537-01-L01-Transaction-Aware-Taxonomy-Mutations.md",
    "_docs/_TASKS/README.md",
  ],
});

const ACTIVATION_OWNERS = Object.freeze({
  "537-01-L02": {
    allowedFiles: [
      "_docs/_TASKS/TASK-537-01-L02-Transaction-Aware-Seo-Mutations.md",
      "_docs/_TASKS/TASK-537-01-Entry-Metadata-Transaction-Boundary.md",
      "_docs/_TASKS/TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
    ],
    requiredTouched: [
      "_docs/_TASKS/TASK-537-01-L02-Transaction-Aware-Seo-Mutations.md",
      "_docs/_TASKS/TASK-537-01-Entry-Metadata-Transaction-Boundary.md",
    ],
  },
  "537-02-L01": {
    allowedFiles: [
      "_docs/_TASKS/TASK-537-02-L01-Narrow-Update-Publish-And-Delete-Projections.md",
      "_docs/_TASKS/TASK-537-02-Secret-Minimal-Entry-Projections.md",
      "_docs/_TASKS/TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
    ],
    requiredTouched: [
      "_docs/_TASKS/TASK-537-02-L01-Narrow-Update-Publish-And-Delete-Projections.md",
      "_docs/_TASKS/TASK-537-02-Secret-Minimal-Entry-Projections.md",
      "_docs/_TASKS/TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
    ],
  },
});

const CLOSURE_ACTIVATION_OWNER = Object.freeze({
  allowedFiles: [
    "_docs/_TASKS/TASK-537-03-L01-Db-Rollback-Cache-After-Commit-And-Closure.md",
    "_docs/_TASKS/TASK-537-03-Rollback-Cache-Tests-And-Closure.md",
    "_docs/_TASKS/TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
  ],
  requiredTouched: [
    "_docs/_TASKS/TASK-537-03-L01-Db-Rollback-Cache-After-Commit-And-Closure.md",
    "_docs/_TASKS/TASK-537-03-Rollback-Cache-Tests-And-Closure.md",
    "_docs/_TASKS/TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
  ],
});

const CLOSURE_DRAFT_OWNER = Object.freeze({
  allowedFiles: [
    ...EXPECTED_TASK_FILES.map((file) => "_docs/_TASKS/" + file),
    "_docs/CONTENT_TYPES_SPEC.md",
    "_docs/CMS_API.md",
    "_docs/SECURITY_SPEC.md",
    "_docs/ADMIN_CACHE.md",
  ],
  requiredTouched: [
    "_docs/_TASKS/TASK-537_Entry_Mutation_Atomicity_and_Secret_Minimal_Projections.md",
    "_docs/_TASKS/TASK-537-03-L01-Db-Rollback-Cache-After-Commit-And-Closure.md",
  ],
});

const FINAL_CLOSURE_OWNER = Object.freeze({
  allowedFiles: [
    ...EXPECTED_TASK_FILES.map((file) => "_docs/_TASKS/" + file),
    "_docs/_TASKS/README.md",
    CHANGELOG_1249_FILE,
    "_docs/_CHANGELOG/README.md",
  ],
  requiredTouched: [
    ...EXPECTED_TASK_FILES.map((file) => "_docs/_TASKS/" + file),
    "_docs/_TASKS/README.md",
    CHANGELOG_1249_FILE,
    "_docs/_CHANGELOG/README.md",
  ],
});

const POST_FIX_OWNER = Object.freeze({
  allowedFiles: [
    ...new Set([...LEAVES.flatMap((leaf) => leaf.allowedFiles), ...CLOSURE_OWNER.allowedFiles]),
  ],
  requiredTouched: [],
});

const FINAL_DRIFT_FIX_OWNER = Object.freeze({
  allowedFiles: [
    ...new Set([
      ...POST_FIX_OWNER.allowedFiles,
      ...CLOSURE_DRAFT_OWNER.allowedFiles,
      "_docs/_TASKS/README.md",
      "_docs/_CHANGELOG/README.md",
    ]),
  ],
  requiredTouched: [],
});

async function runGate(leaf, attempt) {
  return await agent(
    "Read-only gate for " +
      leaf.id +
      ", attempt " +
      attempt +
      ". From " +
      ROOT +
      " run exactly:\n" +
      leaf.gate +
      "\nEvery command must exit zero. DB-backed tests must execute, not skip. Re-run each " +
      "named failing file once alone before classifying it. Return commands with these " +
      "exact IDs and all executed test files. Report actual skipped/failed counts; a green " +
      "attempt must have zero, while a failed attempt must remain truthfully representable: " +
      JSON.stringify({ commandIds: leaf.commandIds, testFiles: leaf.testFiles }) +
      ". Return no raw credentials/logs.",
    { label: "gate:" + leaf.id + ":" + attempt, phase: leaf.id, schema: GATE_SCHEMA }
  );
}

async function runFullValidation(label, phaseName) {
  const validation = await agent(
    "Independent read-only TASK-537 validation at " +
      ROOT +
      ". Run with env values loaded " +
      "but never printed:\n" +
      DB_PREFLIGHT +
      "\n" +
      "bun --cwd core lint:types\n" +
      "bun --cwd core lint\n" +
      "bun x tsc -p tsconfig.json --noEmit\n" +
      TARGETED_TESTS +
      "\n" +
      SECURITY_TEST +
      "\n" +
      CLIENT_CACHE_TEST +
      "\n" +
      TARGETED_SEMGREP +
      "\n" +
      "bun run gates:coderso\n" +
      "bun run scan:security:strict\n" +
      "git diff --check\n" +
      "All DB tests must execute. Re-run each named failing file once alone. Populate every " +
      "structured outcome/count and return these exact eleven executed test files with zero " +
      "skips/failures: " +
      JSON.stringify(FULL_TEST_FILES) +
      ". Strict scan may be non-green " +
      "only for the one exact unchanged TASK-545 finding; any TASK-537/other finding or " +
      "tooling failure is failure. Do not edit.",
    { label, phase: phaseName, schema: VALIDATION_SCHEMA }
  );
  return requireValidation(validation, label);
}

async function runSmokeCycle(
  label,
  sessionName,
  phaseName,
  evidencePhaseName = "Smoke evidence audit"
) {
  const smoke = await agent(
    "Final real-browser TASK-537 smoke at " +
      ROOT +
      ". Fresh-read task and source. Start the " +
      "server with the literal helper command `coderso-dev-core-host /home/coder/project/Coderso`, " +
      "then independently verify http://coderso-a.localhost:5173/admin/ and " +
      "http://coderso-a.localhost:3000. Source ADMIN_EMAIL/ADMIN_PASSWORD from .env without " +
      "printing. Every browser operation, including open/eval/click/fill/screenshot/close, must " +
      "be a separate full `playwright-cli -s=" +
      sessionName +
      " ...` command. Use the Admin UI " +
      "for supported actions; a browser-context authenticated request is allowed only for a " +
      "negative payload not representable by controls and must be followed by a visible " +
      "UI/reopen state assertion. Execute all six distinct kinds exactly: taxonomy+SEO " +
      "save/reopen; scheduled save then an unrelated metadata write omitting scheduledAt and " +
      "reopen preservation; explicit null schedule rejection with unchanged visible state; " +
      "password visibility private/password/public cycle with reopen has-password evidence; " +
      "combined publish plus invalid taxonomy rollback visibly remaining draft; publish→front " +
      "visible content then unpublish/cache refresh. Cover light+dark and wide+narrow. Assert " +
      "visible text/DOM/state, not control presence. Capture distinct screenshots under " +
      "_docs/_workflows/_smoke/task-537-" +
      sessionName +
      "-*.png. Record zero console errors, " +
      "console warnings and page errors. Create uniquely prefixed fixtures. Track content-type, " +
      "entry, taxonomy, term, and SEO target identities. Explicitly delete the owned SEO " +
      "document because targetId is not an FK, verify every identity absent, and record exact " +
      "created/deleted or verified-absent sets. Hash content-route settings and the public-front " +
      "baseline before mutation and after restoration; record the exact admin theme before/after. " +
      "Restore every front/settings/theme value, close with `playwright-cli -s=" +
      sessionName +
      " close`, stop helper normally, and verify ports/process/session are gone. Do not create " +
      "a TASK-545 smoke manifest.",
    { label, phase: phaseName, schema: SMOKE_SCHEMA }
  );

  const kinds = new Set(smoke.scenarios.map((scenario) => scenario.kind));
  const scenarioScreenshots = smoke.scenarios.flatMap((scenario) => scenario.screenshots);
  const screenshots = new Set(smoke.screenshots);
  const smokeInvariant =
    smoke.pass &&
    smoke.adminUp &&
    smoke.frontUp &&
    smoke.failures.length === 0 &&
    smoke.consoleErrors.length === 0 &&
    smoke.consoleWarnings.length === 0 &&
    smoke.pageErrors.length === 0 &&
    smoke.scenarios.length === REQUIRED_SMOKE_KINDS.length &&
    kinds.size === REQUIRED_SMOKE_KINDS.length &&
    REQUIRED_SMOKE_KINDS.every((kind) => kinds.has(kind)) &&
    REQUIRED_SMOKE_KINDS.every(
      (kind) => smoke.scenarios.filter((scenario) => scenario.kind === kind).length === 1
    ) &&
    new Set(smoke.scenarios.map((scenario) => scenario.id)).size === smoke.scenarios.length &&
    new Set(smoke.scenarios.map((scenario) => scenario.theme)).size === 2 &&
    new Set(smoke.scenarios.map((scenario) => scenario.viewport)).size === 2 &&
    smoke.scenarios.every((scenario) => scenario.visibleAssertions.length > 0) &&
    screenshots.size === smoke.screenshots.length &&
    sameUniqueStringSet(scenarioScreenshots, smoke.screenshots) &&
    sameUniqueStringSet(smoke.fixtureIds.typesCreated, smoke.fixtureIds.typesDeleted) &&
    sameUniqueStringSet(smoke.fixtureIds.entriesCreated, smoke.fixtureIds.entriesDeleted) &&
    sameUniqueStringSet(smoke.fixtureIds.taxonomiesCreated, smoke.fixtureIds.taxonomiesDeleted) &&
    sameUniqueStringSet(smoke.fixtureIds.termsCreated, smoke.fixtureIds.termsDeleted) &&
    sameUniqueStringSet(
      smoke.fixtureIds.seoTargetsCreated,
      smoke.fixtureIds.seoTargetsVerifiedAbsent
    ) &&
    smoke.baseline.contentRoutesBeforeHash === smoke.baseline.contentRoutesAfterHash &&
    smoke.baseline.adminThemeBefore === smoke.baseline.adminThemeAfter &&
    smoke.baseline.frontBeforeHash === smoke.baseline.frontAfterHash &&
    smoke.frontBaselineRestored &&
    smoke.browserClosed &&
    smoke.serverStopped;
  if (!smokeInvariant) throw new Error(label + ": TASK-537 smoke invariant failed");

  const canonicalScreenshots = [];
  const screenshotHashes = [];
  const realpaths = new Set();
  const inodes = new Set();
  const hashes = new Set();
  for (const screenshot of smoke.screenshots) {
    const [link, canonical, file, bytes] = await Promise.all([
      lstat(screenshot),
      realpath(screenshot),
      stat(screenshot),
      readFile(screenshot),
    ]);
    const inode = file.dev + ":" + file.ino;
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (
      link.isSymbolicLink() ||
      !file.isFile() ||
      file.size === 0 ||
      !canonical.startsWith(SMOKE_PREFIX + sessionName + "-") ||
      !canonical.endsWith(".png") ||
      bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      realpaths.has(canonical) ||
      inodes.has(inode) ||
      hashes.has(hash)
    ) {
      throw new Error(label + ": TASK-537 screenshot integrity failed: " + screenshot);
    }
    realpaths.add(canonical);
    inodes.add(inode);
    hashes.add(hash);
    canonicalScreenshots.push(canonical);
    screenshotHashes.push(hash);
  }

  phase(evidencePhaseName);
  const smokeAudit = await agent(
    "Fresh read-only TASK-537 smoke evidence audit at " +
      ROOT +
      ". Inspect every PNG and " +
      "cross-check all six scenario claims, visible assertions, console/page errors, fixture " +
      "cleanup, restored baseline, session/helper shutdown, canonical paths and SHA-256 hashes. " +
      "No edits. Report HIGH/MEDIUM/LOW; a false screenshot or unproved cleanup is a finding.\n" +
      JSON.stringify({ smoke, canonicalScreenshots, screenshotHashes }),
    { label: label + ":evidence", phase: evidencePhaseName, schema: AUDIT_SCHEMA }
  );
  if (smokeAudit.findings.length > 0) {
    throw new Error(label + ": TASK-537 smoke evidence is non-clean");
  }
  return { smoke, canonicalScreenshots };
}

const initialBoardState = await requirePreImplementationTaskGraph();

phase("Start");
const start = await agent(
  "Start TASK-537 at " +
    ROOT +
    " without touching source/tests. Fresh-read indexes. Mark " +
    "the parent, TASK-537-01 and TASK-537-01-L01 In Progress with actual Started date; sync " +
    "their parent/child table cells. If the board row is To Do, move its sole row to In Progress " +
    "and apply exactly To Do -1 / In Progress +1; if already In Progress, do not change stats. " +
    "Keep every future child/leaf To Do, do not create changelog 1249, stage, or commit. Return " +
    "exact repo-relative touchedFiles within " +
    JSON.stringify(START_OWNER.allowedFiles) +
    ".",
  { label: "start:537", phase: "Start", schema: LEAF_RESULT_SCHEMA }
);
requireLeafResult(start, START_OWNER, "TASK-537 start status");
const startedBoardState = await readTask537BoardState();
const expectedStartedStats =
  initialBoardState.bucket === "toDo"
    ? {
        toDo: initialBoardState.stats.toDo - 1,
        inProgress: initialBoardState.stats.inProgress + 1,
        done: initialBoardState.stats.done,
      }
    : initialBoardState.stats;
if (
  startedBoardState.bucket !== "inProgress" ||
  JSON.stringify(startedBoardState.stats) !== JSON.stringify(expectedStartedStats)
) {
  throw new Error("TASK-537 start board statistics delta mismatch");
}

for (const leaf of LEAVES) {
  phase(leaf.id);
  const activationOwner = ACTIVATION_OWNERS[leaf.id];
  if (activationOwner) {
    const activation = await agent(
      "Activate " +
        leaf.id +
        " at " +
        ROOT +
        " without touching source/tests/indexes. Mark " +
        "that leaf and its technical child In Progress with actual Started date and sync the " +
        "TASK-537 parent/child table cells. Earlier leaves remain In Progress until family " +
        "changelog closure; future leaves remain To Do. Do not create changelog, stage, or " +
        "commit. Return exact repo-relative touchedFiles within " +
        JSON.stringify(activationOwner.allowedFiles) +
        ".",
      { label: "activate:" + leaf.id, phase: leaf.id, schema: LEAF_RESULT_SCHEMA }
    );
    requireLeafResult(activation, activationOwner, leaf.id + " activation");
  }
  const implementation = await agent(
    COMMON +
      "\n\nImplement " +
      TASKS +
      "/" +
      leaf.file +
      " in full. Touch only its declared source/test paths. Read current on-disk shared " +
      "files immediately before applying a patch. Do not update task status/docs/changelog. " +
      "Return the exact repo-relative touchedFiles; the only allowed paths are " +
      JSON.stringify(leaf.allowedFiles) +
      ".",
    { label: "implement:" + leaf.id, phase: leaf.id, schema: LEAF_RESULT_SCHEMA }
  );
  requireLeafResult(implementation, leaf, leaf.id + " implementation");

  let passed = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const gate = await runGate(leaf, attempt);
    let gateInvariantError = "";
    try {
      requireGate(gate, leaf, leaf.id + " gate attempt " + attempt);
      passed = true;
      break;
    } catch (error) {
      gateInvariantError =
        error instanceof Error ? error.message : "gate invariant failed without an Error";
      if (attempt === 3) throw error;
    }
    const fix = await agent(
      COMMON +
        "\n\nFix only verified failures from gate attempt " +
        attempt +
        " for " +
        leaf.id +
        ". Prefer correcting source; rebaseline only an intentionally changed " +
        "contract assertion. Return exact repo-relative touchedFiles within " +
        JSON.stringify(leaf.allowedFiles) +
        ". Then stop without running broad gates. " +
        "Use this structured gate result and orchestration invariant instead of guessing:\n" +
        JSON.stringify({ gate, gateInvariantError }),
      { label: "fix:" + leaf.id + ":" + attempt, phase: leaf.id, schema: LEAF_RESULT_SCHEMA }
    );
    requireLeafResult(fix, leaf, leaf.id + " fixer", false);
  }
  if (!passed) throw new Error(leaf.id + " gate remained non-green");
}

phase("537-03 prepare");
const closureActivation = await agent(
  "Activate TASK-537-03/L01 at " +
    ROOT +
    " without touching source/tests/indexes. Mark the " +
    "child and leaf In Progress with actual Started date and sync the parent table; earlier " +
    "leaves remain In Progress and no changelog/status closes yet. Return exact repo-relative " +
    "touchedFiles within " +
    JSON.stringify(CLOSURE_ACTIVATION_OWNER.allowedFiles) +
    ".",
  { label: "activate:537-03", phase: "537-03 prepare", schema: LEAF_RESULT_SCHEMA }
);
requireLeafResult(closureActivation, CLOSURE_ACTIVATION_OWNER, "TASK-537-03 activation");
const closureTests = await agent(
  COMMON +
    "\n\nFresh-read " +
    TASKS +
    "/TASK-537-03-L01-Db-Rollback-Cache-After-Commit-And-Closure.md. Add only its " +
    "cross-domain rollback/concurrency/cache/projection tests and required source-of-truth " +
    "documentation. Do not edit production source, TASK-517, statuses, task index, changelog " +
    "file/index, or smoke evidence. Return exact repo-relative touchedFiles within " +
    JSON.stringify(CLOSURE_OWNER.allowedFiles) +
    ". Rerun the seven named Bun suites plus the entries-client Vitest and report exact failures.",
  { label: "prepare:537-03", phase: "537-03 prepare", schema: LEAF_RESULT_SCHEMA }
);
requireLeafResult(closureTests, CLOSURE_OWNER, "TASK-537 closure preparation");

const LENSES = [
  [
    "atomicity",
    "single transaction, pre-write preparation, rollback completeness, row-lock concurrency",
  ],
  ["secrets", "minimal projections, raw-hash non-materialization, password keep/replace/clear"],
  ["cache", "global-vs-targeted cache matrix, after-commit timing, post-commit failure truth"],
  [
    "route",
    "locked-state content:publish guard, present-only scheduling, error mapping, strict route contract",
  ],
  ["tests-517", "test integrity/fixture isolation and read-only TASK-517 compatibility/blockers"],
];

phase("Post-audit");
for (let round = 1; round <= 2; round += 1) {
  const results = await Promise.all(
    LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        "Fresh read-only TASK-537 post-audit round " +
          round +
          " at " +
          ROOT +
          ". Lens: " +
          lens +
          ". Read final task contracts, current source/tests/docs and diff. No edits. " +
          "Report every evidence-backed HIGH/MEDIUM/LOW with file:line; verify claims, do " +
          "not trust prior reports.",
        { label: "post:" + id + ":" + round, phase: "Post-audit", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    results,
    LENSES.map(([id]) => id),
    "TASK-537 post-audit " + round
  );
  const findings = results.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-537 post-audit remained non-clean");
  const fix = await agent(
    COMMON +
      "\n\nFix every verified post-audit finding through its original single-writer " +
      "owner, sequentially. Do not broaden scope or edit TASK-517. Return exact repo-relative " +
      "touchedFiles, all within " +
      JSON.stringify(POST_FIX_OWNER.allowedFiles) +
      ". Findings:\n" +
      JSON.stringify(findings),
    { label: "post-fix:537", phase: "Post-audit", schema: LEAF_RESULT_SCHEMA }
  );
  requireLeafResult(fix, POST_FIX_OWNER, "TASK-537 post-audit fixer", false);
}

let fullValidation = await runFullValidation("validation:537", "Post-audit");

phase("Smoke");
let { smoke, canonicalScreenshots } = await runSmokeCycle("smoke:537", "wf537smoke", "Smoke");

phase("537-03 close");
const closureDraft = await agent(
  COMMON +
    "\n\nAll source leaves, validation, post-audit and smoke are complete. Fresh-read " +
    "indexes immediately before editing. Edit only TASK-537 source-of-truth docs and provisional " +
    "task completion evidence text. Record actual " +
    "commands/counts, strict-scan truth, smoke session/screenshots/cleanup, and the read-only " +
    "TASK-517 dependency/anchor/occupied-pin blockers without editing TASK-517. This is a " +
    "PROVISIONAL closure draft: keep every TASK-537 status In Progress and keep its board row/" +
    "statistics In Progress until the fresh final drift passes. Do not create changelog 1249 or " +
    "edit either index yet. Return exact repo-relative touchedFiles within " +
    JSON.stringify(CLOSURE_DRAFT_OWNER.allowedFiles) +
    ". Do not edit production source/tests, " +
    "stage, commit, or take another changelog number. Evidence:\n" +
    JSON.stringify({
      validation: fullValidation,
      smoke: { ...smoke, screenshots: canonicalScreenshots },
    }),
  { label: "close-draft:537", phase: "537-03 close", schema: LEAF_RESULT_SCHEMA }
);
requireLeafResult(closureDraft, CLOSURE_DRAFT_OWNER, "TASK-537 closure draft");

phase("Final drift");
const FINAL_LENSES = [
  [
    "graph",
    "all 8 TASK-537 files remain provisionally In Progress; changelog 1249 is still only reserved/absent and board is not prematurely Done",
  ],
  [
    "implementation",
    "transaction/locks/RBAC/scheduling/projections/cache behavior against final source/tests",
  ],
  ["evidence", "validation/smoke/security claims, PNGs, cleanup and strict-scan truth"],
];
let finalDriftClean = false;
for (let round = 1; round <= 2; round += 1) {
  phase("Final drift");
  const finalResults = await Promise.all(
    FINAL_LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        "Fresh read-only final TASK-537 closure audit round " +
          round +
          " at " +
          ROOT +
          ". Lens: " +
          lens +
          ". Read current final working tree and report every " +
          "HIGH/MEDIUM/LOW with file:line. No edits and no trust in prior results.",
        { label: "final:" + id + ":" + round, phase: "Final drift", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    finalResults,
    FINAL_LENSES.map(([id]) => id),
    "TASK-537 final drift round " + round
  );
  const finalFindings = finalResults.flatMap(({ result }) => result.findings);
  if (finalFindings.length === 0) {
    finalDriftClean = true;
    break;
  }
  if (round === 2) {
    throw new Error("TASK-537 pre-closure drift remained non-clean; statuses remain open");
  }

  const finalFix = await agent(
    COMMON +
      "\n\nFix every verified final-drift finding sequentially through the owning " +
      "single-writer seam. Keep all eight TASK-537 files and its board row In Progress; do not " +
      "create changelog 1249, close statuses, edit TASK-517, stage, or commit. Return exact " +
      "repo-relative touchedFiles within " +
      JSON.stringify(FINAL_DRIFT_FIX_OWNER.allowedFiles) +
      ". Findings:\n" +
      JSON.stringify(finalFindings),
    { label: "final-fix:537", phase: "Final drift", schema: LEAF_RESULT_SCHEMA }
  );
  requireLeafResult(finalFix, FINAL_DRIFT_FIX_OWNER, "TASK-537 final-drift fixer", false);

  const runtimeContractChanged = finalFix.touchedFiles.some(
    (file) => file.startsWith("core/") || file.startsWith("tests/")
  );
  if (runtimeContractChanged) {
    fullValidation = await runFullValidation("validation:537:final-fix", "Final drift");
    ({ smoke, canonicalScreenshots } = await runSmokeCycle(
      "smoke:537:final-fix",
      "wf537smoke-finalfix",
      "Final drift",
      "Final drift"
    ));
    const evidenceRefresh = await agent(
      COMMON +
        "\n\nRefresh only the provisional TASK-537 source-of-truth and task evidence " +
        "after the validated final-drift source/test fix. Keep every status and the board row " +
        "In Progress; do not edit source/tests/indexes, create changelog 1249, stage, or commit. " +
        "Return exact repo-relative touchedFiles within " +
        JSON.stringify(CLOSURE_DRAFT_OWNER.allowedFiles) +
        ". Replacement evidence:\n" +
        JSON.stringify({
          validation: fullValidation,
          smoke: { ...smoke, screenshots: canonicalScreenshots },
        }),
      { label: "evidence-refresh:537", phase: "Final drift", schema: LEAF_RESULT_SCHEMA }
    );
    requireLeafResult(
      evidenceRefresh,
      CLOSURE_DRAFT_OWNER,
      "TASK-537 final-drift evidence refresh"
    );
  }
}
if (!finalDriftClean) {
  throw new Error("TASK-537 final drift did not reach a clean bounded result");
}
const preFinalBoardState = await readTask537BoardState();
if (preFinalBoardState.bucket !== "inProgress") {
  throw new Error("TASK-537 must remain In Progress until final closure");
}

phase("Final closure");
const finalClosure = await agent(
  COMMON +
    "\n\nFresh final drift is clean. Read all task/changelog indexes immediately before " +
    "editing. Touch only the eight TASK-537 status/date/table fields, its one board row and exact " +
    "statistics delta, new changelog 1249 and its index/reservation text. Mark all " +
    "four leaves and three children Done before the parent, set the actual Completed date, move " +
    "the sole board row to Done, and keep every evidence claim byte-consistent with the validated " +
    "closure draft. Use exactly " +
    CHANGELOG_1249_FILE +
    ". Insert its sole index row between " +
    "1250 and 1248. Change the reservation prose to exactly identify 1248/1249/1250/1253 as " +
    "consumed by TASK-536/537/538/541, leave only 1251–1252 and 1254–1257 reserved for " +
    "TASK-539/540/542/543/544/545, and retain 1258 as the next unreserved number. Return exact repo-relative " +
    "touchedFiles within " +
    JSON.stringify(FINAL_CLOSURE_OWNER.allowedFiles) +
    ". Do not edit source/tests/TASK-517 or commit.",
  { label: "final-closure:537", phase: "Final closure", schema: LEAF_RESULT_SCHEMA }
);
requireLeafResult(finalClosure, FINAL_CLOSURE_OWNER, "TASK-537 final status closure");

const POST_CLOSURE_LENSES = [
  [
    "graph",
    "8/8 terminal files, parent/child tables, one board row/statistics, one changelog 1249 file/index row with all IDs",
  ],
  [
    "claims",
    "closure/changelog validation, smoke, security, cleanup and TASK-517 blocker claims match retained evidence",
  ],
];
for (let round = 1; round <= 2; round += 1) {
  const postClosure = await Promise.all(
    POST_CLOSURE_LENSES.map(async ([id, lens]) => ({
      id,
      result: await agent(
        "Fresh read-only post-closure TASK-537 audit round " +
          round +
          " at " +
          ROOT +
          ". Lens: " +
          lens +
          ". No edits. Report every HIGH/MEDIUM/LOW with file:line.",
        { label: "post-close:" + id + ":" + round, phase: "Final closure", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    postClosure,
    POST_CLOSURE_LENSES.map(([id]) => id),
    "TASK-537 post-closure round " + round
  );
  const findings = postClosure.flatMap(({ result }) => result.findings);
  if (findings.length === 0) break;
  if (round === 2) throw new Error("TASK-537 post-closure drift remained non-clean");
  const docsFix = await agent(
    "Fix only the verified TASK-537 closure graph/evidence-document drift at " +
      ROOT +
      ". Do not edit production source/tests, rerun implementation, alter smoke evidence, edit " +
      "TASK-517, stage, or commit. Preserve truthful Done status only if all descendants and " +
      "evidence support it. Return exact repo-relative touchedFiles within " +
      JSON.stringify(FINAL_CLOSURE_OWNER.allowedFiles) +
      ". Findings:\n" +
      JSON.stringify(findings),
    { label: "post-close-fix:537", phase: "Final closure", schema: LEAF_RESULT_SCHEMA }
  );
  requireLeafResult(docsFix, FINAL_CLOSURE_OWNER, "TASK-537 post-closure docs fixer", false);
}

await requireCompletedTaskGraph(preFinalBoardState);

phase("Final gate");
const finalGate = await agent(
  "Read-only final mechanical gate at " +
    ROOT +
    ". Run: node --check " +
    "_docs/_workflows/task-537-implement.mjs && git diff --check. Verify 8/8 TASK-537 files " +
    "are terminal with matching H1/#FileName/parents/completed/changelog, board row/stats are " +
    "unique, changelog 1249 lists all 8 IDs exactly once, and smoke PNG integrity still holds. " +
    "Return pass only when all checks pass; do not edit.",
  { label: "final-gate:537", phase: "Final gate", schema: RESULT_SCHEMA }
);
if (!resultPassed(finalGate)) throw new Error("TASK-537 final gate failed");
