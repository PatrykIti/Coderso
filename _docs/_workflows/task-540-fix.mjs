import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readlink } from "node:fs/promises";
import { promisify } from "node:util";

export const meta = {
  name: "task-540-fix",
  description:
    "Repair the current TASK-540 Screen URL control-character finding in strict single-writer order: R01 rejects ASCII controls before shared-helper delegation and pins normalization evidence, then R03 pins final Button/Image DOM sinks. Previously completed R04/R05 repairs remain read-only. Gate both active owners and finish with fresh structured audits. Agents never stage or commit.",
  phases: [
    { title: "Corrective start gate" },
    { title: "540-01-L01 URL control repair + gate" },
    { title: "540-03-L01 final-sink regressions + gate" },
    { title: "Post-audit" },
  ],
};

const execFileAsync = promisify(execFile);
const ROOT = "/home/coder/project/Coderso";
const TASKS = ROOT + "/_docs/_TASKS";
const MAX_GATE_FIX_ROUNDS = 3;

const TASK_STATUS_FILES = Object.freeze({
  "TASK-540": "TASK-540_Custom_Screens_Functional_and_Data_Integrity_Remediation.md",
  "TASK-540-01": "TASK-540-01-Strict-Screen-Data-Urls-Tabs-And-Binding-Gc.md",
  "TASK-540-01-L01": "TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md",
  "TASK-540-02": "TASK-540-02-Button-Binding-And-Tabs-Authoring.md",
  "TASK-540-02-L01": "TASK-540-02-L01-Expose-Link-Binding-And-Complete-Tab-Slot-Editing.md",
  "TASK-540-03": "TASK-540-03-Accessible-Tabs-And-Selection-Semantics.md",
  "TASK-540-03-L01": "TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md",
  "TASK-540-04": "TASK-540-04-Dirty-Navigation-And-Async-Cache-Recovery.md",
  "TASK-540-04-L01": "TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md",
  "TASK-540-04-L02": "TASK-540-04-L02-Cancel-And-Retry-Related-Entry-Loads.md",
  "TASK-540-04-L03": "TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md",
  "TASK-540-04-L04": "TASK-540-04-L04-Guard-Screen-Builder-Drafts.md",
  "TASK-540-05": "TASK-540-05-Responsive-Canvas-Aria-And-User-Preferences.md",
  "TASK-540-05-L01": "TASK-540-05-L01-Keep-Screen-Canvas-Usable-And-Aria-Valid.md",
  "TASK-540-05-L02": "TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md",
  "TASK-540-06": "TASK-540-06-Tests-Smoke-And-Closure.md",
  "TASK-540-06-L01": "TASK-540-06-L01-Six-Builder-Save-Entry-Flows-And-Closure.md",
});

const EXPECTED_TASK_STATUSES = Object.freeze({
  "TASK-540": "🚧 In Progress",
  "TASK-540-01": "🚧 In Progress",
  "TASK-540-01-L01": "🚧 In Progress",
  "TASK-540-02": "✅ Done",
  "TASK-540-02-L01": "✅ Done",
  "TASK-540-03": "🚧 In Progress",
  "TASK-540-03-L01": "🚧 In Progress",
  "TASK-540-04": "✅ Done",
  "TASK-540-04-L01": "✅ Done",
  "TASK-540-04-L02": "✅ Done",
  "TASK-540-04-L03": "✅ Done",
  "TASK-540-04-L04": "✅ Done",
  "TASK-540-05": "✅ Done",
  "TASK-540-05-L01": "✅ Done",
  "TASK-540-05-L02": "✅ Done",
  "TASK-540-06": "🚧 In Progress",
  "TASK-540-06-L01": "🚧 In Progress",
});

const LINT_TYPES = "bun --cwd core lint:types";
const LINT = "bun --cwd core lint";
const ROOT_TSC = "./node_modules/.bin/tsc -p tsconfig.json --noEmit";
const PRECOMMIT_CHECK = "bun run precommit:check";
const DIFF_CHECK = "git diff --check";
const ENV = "set -a && source .env && set +a && ";
const DB_PREFLIGHT =
  ENV +
  'bun --eval \'import { canConnect } from "./tests/utils/db"; ' +
  "const configured = Boolean(process.env.DATABASE_URL?.trim()); " +
  "const reachable = configured && await canConnect(); " +
  "process.stdout.write(JSON.stringify({ configured, reachable, selectOne: reachable ? 1 : 0 })); " +
  "if (!reachable) process.exit(1); process.exit(0)'";

function command(id, value) {
  return Object.freeze({ id, command: value });
}

function vitestCommand(files) {
  return "./node_modules/.bin/vitest run --config vitest.config.ts " + files.join(" ");
}

const R01 = Object.freeze({
  id: "540-01-L01",
  phase: "540-01-L01 repair",
  gatePhase: "540-01-L01 gate",
  taskFile: "TASK-540-01-L01-Reject-Unknown-Sanitize-Urls-Unique-Tabs-And-Prune-Ghosts.md",
  allowedFiles: Object.freeze([
    "core/services/customScreens/customScreenSchemas.ts",
    "tests/vitest/customScreens/screen-document-image-src.test.ts",
  ]),
  requiredFiles: Object.freeze([]),
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
    command("diffCheck", DIFF_CHECK),
  ]),
});

const R03 = Object.freeze({
  id: "540-03-L01",
  phase: "540-03-L01 repair",
  gatePhase: "540-03-L01 gate",
  taskFile: "TASK-540-03-L01-Functional-Tabs-And-No-Nested-Interactive-Space-Trap.md",
  allowedFiles: Object.freeze([
    "tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx",
  ]),
  requiredFiles: Object.freeze([]),
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
    command("diffCheck", DIFF_CHECK),
  ]),
});

const R04L01 = Object.freeze({
  id: "540-04-L01",
  phase: "540-04-L01 repair",
  gatePhase: "540-04-L01 gate",
  taskFile: "TASK-540-04-L01-Make-Related-Entry-Promise-Caches-Retryable.md",
  allowedFiles: Object.freeze([
    "core/admin/services/entriesClient.ts",
    "tests/vitest/admin/entriesClient.test.ts",
  ]),
  requiredFiles: Object.freeze([]),
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
    command("diffCheck", DIFF_CHECK),
  ]),
});

const R04L03 = Object.freeze({
  id: "540-04-L03",
  phase: "540-04-L03 repair",
  gatePhase: "540-04-L03 gate",
  taskFile: "TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md",
  allowedFiles: Object.freeze([
    "core/admin/services/customScreensClient.ts",
    "tests/vitest/admin/customScreensClient.test.ts",
  ]),
  requiredFiles: Object.freeze([]),
  commands: Object.freeze([
    command("lintTypes", LINT_TYPES),
    command("lint", LINT),
    command("rootTsc", ROOT_TSC),
    command(
      "ownedVitest",
      vitestCommand([
        "tests/vitest/admin/cacheBus.test.ts",
        "tests/vitest/admin/customScreensClient.test.ts",
        "tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx",
        "tests/vitest/ui/custom-screen-entry-draft.test.ts",
        "tests/vitest/ui/custom-screen-entry-navigation-guard.test.tsx",
        "tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts",
      ])
    ),
    command(
      "rendererPrerequisite",
      vitestCommand(["tests/vitest/ui-integration/custom-screen-runtime-renderer.test.tsx"])
    ),
    command(
      "previewPrerequisites",
      vitestCommand([
        "tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx",
        "tests/vitest/widgets/screenWidgets.test.tsx",
      ])
    ),
    command("precommitCheck", PRECOMMIT_CHECK),
    command("diffCheck", DIFF_CHECK),
  ]),
});

const R05 = Object.freeze({
  id: "540-05-L02",
  phase: "540-05-L02 repair",
  gatePhase: "540-05-L02 gate",
  taskFile: "TASK-540-05-L02-Scope-Screen-Preferences-Through-User-Settings.md",
  allowedFiles: Object.freeze([
    "core/services/settings/securitySettings.ts",
    "core/server/middleware/cors.ts",
    "tests/integration/routes/cors.test.ts",
  ]),
  requiredFiles: Object.freeze([]),
  commands: Object.freeze([
    command("lintTypes", LINT_TYPES),
    command("lint", LINT),
    command("rootTsc", ROOT_TSC),
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
    command("dbPreflight", DB_PREFLIGHT),
    command(
      "bun",
      ENV +
        "bun test tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts tests/integration/routes/cors.test.ts"
    ),
    command("diffCheck", DIFF_CHECK),
  ]),
});

const OWNER_BY_ID = new Map([
  [R01.id, R01],
  [R03.id, R03],
]);
const REPAIR_OWNERS = Object.freeze([...OWNER_BY_ID.values()]);

const FORBIDDEN_PATHS = Object.freeze([
  "every path outside the active owner's exact allowedFiles list",
  "_docs/_TASKS/** and _docs/_CHANGELOG/**",
  "_docs/_workflows/task-540-implement.mjs and every workflow except this already-authored fix workflow",
  "core/admin/ui/custom-screens/routeParams.ts and its test (read-only landed prerequisite)",
  "core/admin/ui/pages/**, core/services/pages/**, core/widgets/**, dashboard widget surfaces",
  "core/db/**, packages/**, store/**, package.json, core/package.json, bun.lock",
  "scanner configuration, ignore files, task families other than TASK-540",
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
          owner: { enum: [...OWNER_BY_ID.keys(), "orchestrator"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
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
  return result?.pass === true && Array.isArray(result.errors) && result.errors.length === 0;
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
  const statuses = {};
  for (const [id, file] of Object.entries(TASK_STATUS_FILES)) {
    const source = await readFile(TASKS + "/" + file, "utf8");
    statuses[id] = source.match(/^\*\*Status:\*\*\s*(.+)$/m)?.[1] ?? "<missing>";
  }
  return statuses;
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
    "\n\nCurrent root-local state captured immediately before dispatch. The dirty worktree is " +
    "intentional and must be preserved; it is context, not permission to alter unrelated work:\n" +
    JSON.stringify(await repoContext())
  );
}

async function runReadOnlyAgent(prompt, options) {
  const before = await worktreeSnapshot();
  const result = await agent(await groundedPrompt(prompt), options);
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
  const result = await agent(await groundedPrompt(prompt), {
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

function validateGateReceipt(result, owner) {
  if (result.pass) {
    if (
      !resultPassed(result) ||
      result.failureKind !== "none" ||
      result.failedCommand !== null ||
      result.commands.length !== owner.commands.length ||
      result.commands.some((receipt, index) => {
        const expected = owner.commands[index];
        return (
          receipt.id !== expected.id || receipt.command !== expected.command || receipt.status !== 0
        );
      })
    ) {
      throw new Error(owner.id + ": passing gate receipt mismatch");
    }
    return result;
  }

  const prefixValid =
    result.commands.length <= owner.commands.length &&
    result.commands.every((receipt, index) => {
      const expected = owner.commands[index];
      return receipt.id === expected.id && receipt.command === expected.command;
    });
  if (!prefixValid || result.failureKind === "none" || typeof result.failedCommand !== "string") {
    throw new Error(owner.id + ": failing gate receipt mismatch");
  }
  return result;
}

async function runGate(owner, attempt, labelPrefix = "gate") {
  const result = await runReadOnlyAgent(
    "Read-only corrective gate attempt " +
      attempt +
      " for TASK-" +
      owner.id +
      ". Read its current task contract and current diff first. Run this exact fail-fast " +
      "ordered command list from " +
      ROOT +
      ":\n" +
      owner.commands.map(({ id, command: value }) => id + ": " + value).join("\n") +
      "\nReturn one receipt per command actually reached, in order. A pass requires every " +
      "command status 0. Before classifying a named test failure, rerun that exact file once " +
      "in isolation and include the confirmation in errors. Missing executables/resources are " +
      "infrastructure. Do not edit, stage, commit, or print environment values.",
    {
      label: labelPrefix + ":" + owner.id + ":" + attempt,
      phase: owner.gatePhase,
      schema: GATE_SCHEMA,
    }
  );
  return validateGateReceipt(result, owner);
}

const COMMON_IMPLEMENTATION_PROMPT =
  "Repository " +
  ROOT +
  ". Read root AGENTS.md, the TASK-540 parent, the exact child/leaf, current " +
  "source/tests, HEAD/status/full diff before editing. Build on the current dirty worktree; " +
  "never revert or overwrite earlier/user work. Implement the full correction, not a smaller " +
  "MVP. Code/comments are English. Never stage, commit, push, reset, checkout, change branch, " +
  "change dependencies, weaken a behavior assertion, edit tasks/changelog/workflows, suppress " +
  "a scanner, or print secrets. Configurable widgets remain Dashboard-only; Custom Screens " +
  "remain section/block-owned. Forbidden paths: " +
  JSON.stringify(FORBIDDEN_PATHS) +
  ".";

async function fixGateFailures(owner, gate, round, labelPrefix = "gate-fix") {
  return await runMutatingAgent(
    COMMON_IMPLEMENTATION_PROMPT +
      "\n\nFix only the confirmed TASK-" +
      owner.id +
      " code/test failures inside this exact single-writer set: " +
      JSON.stringify(owner.allowedFiles) +
      ". Prefer the source when behavior diverges; re-baseline a test only for the intended " +
      "contract and never weaken it. Failures:\n- " +
      gate.errors.join("\n- "),
    { label: labelPrefix + ":" + owner.id + ":" + round, phase: owner.gatePhase },
    owner,
    false
  );
}

async function runGateWithFixLoop(owner, labelPrefix = "gate") {
  let gate = await runGate(owner, 1, labelPrefix);
  for (let round = 1; !gate.pass && round <= MAX_GATE_FIX_ROUNDS; round += 1) {
    if (gate.failureKind === "infrastructure") {
      throw new Error(owner.id + ": infrastructure gate failure: " + gate.errors.join("; "));
    }
    await fixGateFailures(owner, gate, round, labelPrefix + ":fix");
    gate = await runGate(owner, round + 1, labelPrefix);
  }
  if (!gate.pass) {
    throw new Error(owner.id + ": gate remained red after " + MAX_GATE_FIX_ROUNDS + " fix rounds");
  }
  return gate;
}

async function implementOwner(owner, correctiveScope) {
  phase(owner.phase);
  return await runMutatingAgent(
    COMMON_IMPLEMENTATION_PROMPT +
      "\n\nImplement exactly the reopened corrective scope of TASK-" +
      owner.id +
      " from " +
      TASKS +
      "/" +
      owner.taskFile +
      ". " +
      correctiveScope +
      " Edit exactly these single-writer files and no others: " +
      JSON.stringify(owner.allowedFiles) +
      ". Read each fresh before editing and return exact repo-relative touchedFiles. This " +
      "workflow is resumable: if a file already satisfies the complete contract, preserve it " +
      "and report no touch for that file; the owner gate remains authoritative.",
    { label: "repair:" + owner.id, phase: owner.phase },
    owner,
    false
  );
}

const AUDIT_LENSES = Object.freeze([
  [
    "screen-url-wrapper",
    "Verify sanitizeScreenAuthoringUrl rejects every U+0000..U+001F and U+007F code point, plus every backslash, against the original string before trim or shared-helper delegation; safe existing values remain canonical; Page-owned sanitizer source is untouched.",
  ],
  [
    "normalization-evidence",
    "Verify the exact TAB/LF/CR protocol-relative-confusion corpus plus NUL/DEL is covered in screen-document-image-src.test.ts for both URL profiles: direct sanitizer null, direct Button/Image write rejection with exact non-echo paths, stored-read omission, and compatibility-alias empty result. Preserve all prior safe/backslash/non-string/idempotence evidence.",
  ],
  [
    "renderer-final-sinks",
    "Verify the existing runtime-renderer test injects the exact control-confused corpus at final sinks and proves Button is an aria-disabled non-anchor while Image shows data-image-disabled placeholder with no img. R03 does not duplicate R01 normalization tests or edit renderer production when the corrected imported wrapper is sufficient.",
  ],
  [
    "regression-integrity",
    "Verify the exact R01 schema/image/DB gate and R03 renderer/interaction/image gate preserve prior Tabs provenance, schema, accessibility, selection, UUID/image precedence, safe URL, and non-string assertions without re-baselining or weakening them.",
  ],
  [
    "scope-and-gates",
    "Verify sole-writer ownership and exact current repair order 540-01-L01→540-03-L01; R01 writes only the Screen schema owner and screen-document-image-src test, R03 writes only the existing renderer test, completed R04/R05 owners stay Done/read-only, and no Page/widget/dashboard/API/DB/migration/task/changelog expansion occurs.",
  ],
]);

async function runPostAuditRound(round) {
  const results = await parallel(
    AUDIT_LENSES.map(([id, lens]) => async () => ({
      id,
      result: await runReadOnlyAgent(
        "Fresh read-only TASK-540 corrective post-audit round " +
          round +
          ". Read root AGENTS.md, both reopened TASK-540 URL repair contracts, current source, " +
          "tests, workflow, HEAD/status/full diff and latest gate evidence. Lens: " +
          lens +
          " Return every real HIGH/MEDIUM/LOW finding with concrete file:line evidence. " +
          "Assign source/test findings to the exact repair owner; assign " +
          "task/workflow-only drift to orchestrator. Empty findings means this lens is clean. " +
          "Do not edit, stage, commit, or print secrets.",
        { label: "post-audit:" + id + ":" + round, phase: "Post-audit", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    results,
    AUDIT_LENSES.map(([id]) => id),
    "TASK-540 corrective post-audit round " + round
  );
  return results.flatMap(({ result }) => result.findings);
}

async function fixAuditFindings(findings) {
  const orchestratorFindings = findings.filter((finding) => finding.owner === "orchestrator");
  if (orchestratorFindings.length > 0) {
    throw new Error(
      "Corrective post-audit found task/workflow drift requiring orchestrator review: " +
        JSON.stringify(orchestratorFindings)
    );
  }

  for (const owner of REPAIR_OWNERS) {
    const ownerFindings = findings.filter((finding) => finding.owner === owner.id);
    if (ownerFindings.length === 0) continue;
    await runMutatingAgent(
      COMMON_IMPLEMENTATION_PROMPT +
        "\n\nFix every verified TASK-" +
        owner.id +
        " post-audit finding within only " +
        JSON.stringify(owner.allowedFiles) +
        ". Findings: " +
        JSON.stringify(ownerFindings),
      { label: "post-audit-fix:" + owner.id, phase: "Post-audit" },
      owner,
      false
    );
    await runGateWithFixLoop(owner, "post-audit-regate");
  }
}

phase("Corrective start gate");
const initialSnapshot = await worktreeSnapshot();
if (initialSnapshot.branch !== "feature/tasks-fixes") {
  throw new Error("TASK-540 corrective workflow requires feature/tasks-fixes");
}
if (initialSnapshot.staged.length > 0) {
  throw new Error("TASK-540 corrective workflow requires an empty staging area");
}
const initialStatuses = await taskStatusState();
for (const [id, expected] of Object.entries(EXPECTED_TASK_STATUSES)) {
  if (initialStatuses[id] !== expected) {
    throw new Error(id + ": expected status " + expected + ", got " + initialStatuses[id]);
  }
}

const startGate = await runReadOnlyAgent(
  "Read-only final TASK-540 corrective start gate. Verify: branch feature/tasks-fixes; " +
    "empty staging area; intentional dirty worktree is preserved; TASK-540 root In Progress; " +
    "the exact R01 and R03 repair leaves and parents are In Progress, every R04/R05 leaf and " +
    "parent remains Done, other landed siblings are Done, " +
    "and closure remains In Progress; changelog 1252 remains pinned without a closure file; " +
    "single-writer repair order is 540-01-L01 then 540-03-L01; task-540-fix.mjs owns this " +
    "URL-specific repair pass and task-540-implement.mjs resumes only after both leaves return " +
    "to Done. Verify every allowed file and command " +
    "matches the current task contracts. Read all relevant files fresh. Do not edit.",
  { label: "start-gate:540-fix", phase: "Corrective start gate", schema: RESULT_SCHEMA }
);
if (!resultPassed(startGate)) {
  throw new Error("TASK-540 corrective start gate failed: " + startGate.errors.join("; "));
}

const CORRECTIVE_SCOPES = new Map([
  [
    R01.id,
    "Reject every ASCII control U+0000..U+001F plus U+007F, and every backslash, against the original Screen URL string before trim/shared-helper delegation. Add the exact TAB/LF/CR protocol-relative-confusion plus NUL/DEL direct sanitizer/write/stored-read/compatibility-alias matrix without changing Page-owned helpers.",
  ],
  [
    R03.id,
    "Consume the corrected Screen wrapper and add only the existing renderer suite's final-sink regressions: each control-confused Button is an aria-disabled non-anchor and each Image is a data-image-disabled placeholder with no img. Do not edit renderer production when the wrapper fix suffices.",
  ],
]);

const ownerGates = {};
for (const owner of REPAIR_OWNERS) {
  await implementOwner(owner, CORRECTIVE_SCOPES.get(owner.id));
  phase(owner.gatePhase);
  ownerGates[owner.id] = await runGateWithFixLoop(owner);
}

phase("Post-audit");
let postAuditFindings = await runPostAuditRound(1);
let postAuditRounds = 1;
if (postAuditFindings.length > 0) {
  await fixAuditFindings(postAuditFindings);
  postAuditFindings = await runPostAuditRound(2);
  postAuditRounds = 2;
}
if (postAuditFindings.length > 0) {
  throw new Error(
    "TASK-540 corrective post-audit remained non-clean: " + JSON.stringify(postAuditFindings)
  );
}

export const result = {
  pass: true,
  summary:
    "Both current TASK-540 URL-control repair owners passed their exact gates in R01-before-R03 order and a fresh zero-finding post-audit.",
  errors: [],
  order: REPAIR_OWNERS.map(({ id }) => id),
  gateFixRoundLimit: MAX_GATE_FIX_ROUNDS,
  ownerGates,
  postAuditRounds,
  postAuditFindings,
};
