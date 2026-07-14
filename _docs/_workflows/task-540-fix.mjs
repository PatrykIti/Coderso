import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readlink } from "node:fs/promises";
import { promisify } from "node:util";

export const meta = {
  name: "task-540-fix",
  description:
    "Resume TASK-540 from reopened 540-04-L03/L04: land exact cache-event operation correlation first, repair Screen-builder save/hydration authority second, run owner gates, and finish with fresh structured audits. Agents never stage or commit.",
  phases: [
    { title: "Corrective start gate" },
    { title: "540-04-L03 repair" },
    { title: "540-04-L03 gate" },
    { title: "540-04-L04 repair" },
    { title: "540-04-L04 gate" },
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
  "TASK-540-01": "✅ Done",
  "TASK-540-01-L01": "✅ Done",
  "TASK-540-02": "✅ Done",
  "TASK-540-02-L01": "✅ Done",
  "TASK-540-03": "✅ Done",
  "TASK-540-03-L01": "✅ Done",
  "TASK-540-04": "🚧 In Progress",
  "TASK-540-04-L01": "✅ Done",
  "TASK-540-04-L02": "✅ Done",
  "TASK-540-04-L03": "🚧 In Progress",
  "TASK-540-04-L04": "🚧 In Progress",
  "TASK-540-05": "⏳ To Do",
  "TASK-540-05-L01": "⏳ To Do",
  "TASK-540-05-L02": "⏳ To Do",
  "TASK-540-06": "⏳ To Do",
  "TASK-540-06-L01": "⏳ To Do",
});

const LINT_TYPES = "bun --cwd core lint:types";
const LINT = "bun --cwd core lint";
const ROOT_TSC = "./node_modules/.bin/tsc -p tsconfig.json --noEmit";
const PRECOMMIT_CHECK = "bun run precommit:check";
const DIFF_CHECK = "git diff --check";

function command(id, value) {
  return Object.freeze({ id, command: value });
}

function vitestCommand(files) {
  return "./node_modules/.bin/vitest run --config vitest.config.ts " + files.join(" ");
}

const L03 = Object.freeze({
  id: "540-04-L03",
  phase: "540-04-L03 repair",
  gatePhase: "540-04-L03 gate",
  taskFile: "TASK-540-04-L03-Guard-Entry-Drafts-And-Subscribe-Related-Caches.md",
  allowedFiles: Object.freeze([
    "core/admin/utils/cacheBus.ts",
    "tests/vitest/admin/cacheBus.test.ts",
    "core/admin/services/customScreensClient.ts",
    "tests/vitest/admin/customScreensClient.test.ts",
  ]),
  requiredFiles: Object.freeze([
    "core/admin/utils/cacheBus.ts",
    "tests/vitest/admin/cacheBus.test.ts",
    "core/admin/services/customScreensClient.ts",
    "tests/vitest/admin/customScreensClient.test.ts",
  ]),
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

const L04 = Object.freeze({
  id: "540-04-L04",
  phase: "540-04-L04 repair",
  gatePhase: "540-04-L04 gate",
  taskFile: "TASK-540-04-L04-Guard-Screen-Builder-Drafts.md",
  allowedFiles: Object.freeze([
    "core/admin/ui/custom-screens/CustomScreenEditorPage.tsx",
    "tests/vitest/ui/custom-screens-page.test.tsx",
    "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
    "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
  ]),
  requiredFiles: Object.freeze([
    "core/admin/ui/custom-screens/CustomScreenEditorPage.tsx",
    "tests/vitest/ui/custom-screens-page.test.tsx",
    "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
    "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
  ]),
  commands: Object.freeze([
    command("lintTypes", LINT_TYPES),
    command("lint", LINT),
    command("rootTsc", ROOT_TSC),
    command(
      "builderVitest",
      vitestCommand([
        "tests/vitest/ui/custom-screens-page.test.tsx",
        "tests/vitest/ui/custom-screen-route-params.test.ts",
        "tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx",
        "tests/vitest/ui-integration/custom-screen-section-recovery.test.tsx",
        "tests/vitest/admin/cacheBus.test.ts",
      ])
    ),
    command("precommitCheck", PRECOMMIT_CHECK),
    command("diffCheck", DIFF_CHECK),
  ]),
});

const OWNER_BY_ID = new Map([
  [L03.id, L03],
  [L04.id, L04],
]);

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
          owner: { enum: ["540-04-L03", "540-04-L04", "orchestrator"] },
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
  ". Read root AGENTS.md, the TASK-540 parent, TASK-540-04 parent, exact leaf, current " +
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
    "operation-correlation",
    "Verify L03's exact additive API: a freshly-created opaque symbol is same-context callback metadata only; serialized event keys and storage/BroadcastChannel/network/cache/server contracts are unchanged; create/update forward the caller's exact token to both local list/detail events; omitted options remain backward compatible. Verify L04 suppresses only the exact active local token and treats remote, distinct-symbol local, and tokenless local writers as external.",
  ],
  [
    "save-hydration-authority",
    "Verify Screen save/hydration/route authority for both settlement orders: no hydration starts or commits under an active save; only identity-current settlement/discard/cleanup clears the save token; every non-self current-detail event marks ref plus render-visible unresolved authority and blocks Save without invalidating the current forced hydration; unresolved authority clears only after current forced hydration succeeds; list-only events are ignored; dirty refresh requires explicit discard confirmation and restores the persisted baseline before reading; a save may clear only non-unresolved warning state predating its captured external-event generation; A→B→A cannot directly commit stale first-A state and any successful first-A server result reaches second A only through a deferred current forced hydration.",
  ],
  [
    "mutation-diagnostics-ux",
    "Verify synchronous blank-name and missing-content-type validation invalidates older hydration before publishing exact errors; boundary move up/down semantic no-ops stay clean; real moves persist; every metadata/document/binding create-update-clear mutation advances exactly once; neutral external-warning copy is exact and accessible.",
  ],
  [
    "test-integrity",
    "Verify owned tests genuinely execute all contract paths: every deferred promise is proven consumed by its owning hydration/create/update call; four late hydration validation cases; direct production-helper Refresh guard plus handler delegation; render-visible and synchronous unresolved clean-event save block that preserves its forced GET; dirty confirm-refresh restores persisted baseline and covers success/missing/failure; remote/distinct-symbol/tokenless writers during save success and rejection; deferred real client cache hydration in A→B→A; top-level/children/slot move boundaries; bind→existing update→clear→rebind; exact-one updateEditorView→updateDefinition proof with document/binding handlers forbidden from direct dirty/generation writes and metadata handlers pinned to one markDirty; the recovery suite changes only its additive cacheBus factory mock and preserves every TASK-505 assertion; renderer/Preview suites are not weakened.",
  ],
  [
    "scope-and-gates",
    "Verify sole-writer ownership and dependency order L03 then L04; no Page/widget/dashboard/route/API/DB/migration/endpoint expansion; root TypeScript and precommit checks are included alongside the exact targeted lanes; current task statuses remain L03/L04 In Progress and later leaves To Do because this corrective workflow does not perform closure.",
  ],
]);

async function runPostAuditRound(round) {
  const results = await parallel(
    AUDIT_LENSES.map(([id, lens]) => async () => ({
      id,
      result: await runReadOnlyAgent(
        "Fresh read-only TASK-540-04 corrective post-audit round " +
          round +
          ". Read root AGENTS.md, TASK-540/TASK-540-04/L03/L04 contracts, current source, " +
          "tests, workflow, HEAD/status/full diff and latest gate evidence. Lens: " +
          lens +
          " Return every real HIGH/MEDIUM/LOW finding with concrete file:line evidence. " +
          "Assign source/test findings to the exact owner 540-04-L03 or 540-04-L04; assign " +
          "task/workflow-only drift to orchestrator. Empty findings means this lens is clean. " +
          "Do not edit, stage, commit, or print secrets.",
        { label: "post-audit:" + id + ":" + round, phase: "Post-audit", schema: AUDIT_SCHEMA }
      ),
    }))
  );
  requireAllResults(
    results,
    AUDIT_LENSES.map(([id]) => id),
    "TASK-540-04 corrective post-audit round " + round
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

  const l03Findings = findings.filter((finding) => finding.owner === L03.id);
  const l04Findings = findings.filter((finding) => finding.owner === L04.id);

  if (l03Findings.length > 0) {
    await runMutatingAgent(
      COMMON_IMPLEMENTATION_PROMPT +
        "\n\nFix every verified TASK-540-04-L03 post-audit finding within only " +
        JSON.stringify(L03.allowedFiles) +
        ". Findings: " +
        JSON.stringify(l03Findings),
      { label: "post-audit-fix:" + L03.id, phase: "Post-audit" },
      L03,
      false
    );
    await runGateWithFixLoop(L03, "post-audit-regate");
  }

  if (l04Findings.length > 0) {
    await runMutatingAgent(
      COMMON_IMPLEMENTATION_PROMPT +
        "\n\nFix every verified TASK-540-04-L04 post-audit finding within only " +
        JSON.stringify(L04.allowedFiles) +
        ". Findings: " +
        JSON.stringify(l04Findings),
      { label: "post-audit-fix:" + L04.id, phase: "Post-audit" },
      L04,
      false
    );
  }

  // L04 consumes L03. Any correction in either owner therefore ends with the L04 gate.
  if (l03Findings.length > 0 || l04Findings.length > 0) {
    await runGateWithFixLoop(L04, "post-audit-regate");
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
  "Read-only resumed TASK-540 corrective start gate. Verify: branch feature/tasks-fixes; " +
    "empty staging area; intentional dirty worktree is preserved; TASK-540 root In Progress; " +
    "all 17 physical TASK-540 statuses: 540-01 through 540-03 parents/leaves Done; " +
    "540-04 parent/L03/L04 In Progress with L01/L02 Done; 540-05/06 parents/leaves To Do; " +
    "changelog 1252 remains pinned without a closure file; L03 now solely owns " +
    "cacheBus/customScreensClient plus tests and must land before L04; L04 owns only its Page, " +
    "two primary suites, and the additive recovery-suite cacheBus mock for this correction; " +
    "task-540-implement.mjs remains the cold-start " +
    "program while task-540-fix.mjs is the resumed corrective owner. Read all relevant files " +
    "fresh. Do not edit.",
  { label: "start-gate:540-fix", phase: "Corrective start gate", schema: RESULT_SCHEMA }
);
if (!resultPassed(startGate)) {
  throw new Error("TASK-540 corrective start gate failed: " + startGate.errors.join("; "));
}

await implementOwner(
  L03,
  "Add the exact createCacheEventOperationToken/symbol operation-correlation contract to the " +
    "cache bus without serializing it; forward the optional caller token through Custom Screen " +
    "create/update local list/detail events; prove transport/cache/event JSON byte shape and " +
    "tokenless callers remain backward compatible."
);
phase(L03.gatePhase);
const l03Gate = await runGateWithFixLoop(L03);

await implementOwner(
  L04,
  "Consume L03 read-only. Suppress only exact self-token events; preserve independent local and " +
    "remote updates; close save/hydration/validation/A→B→A races; make boundary moves semantic " +
    "no-ops; use neutral external-update copy; and add the complete mounted/static regressions " +
    "including bind→existing update→clear→rebind."
);
phase(L04.gatePhase);
const l04Gate = await runGateWithFixLoop(L04);

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
    "TASK-540-04 corrective post-audit remained non-clean: " + JSON.stringify(postAuditFindings)
  );
}

export const result = {
  pass: true,
  summary:
    "TASK-540-04-L03 cache-event correlation and TASK-540-04-L04 builder authority corrections passed owner gates and a fresh zero-finding post-audit.",
  errors: [],
  order: [L03.id, L04.id],
  gateFixRoundLimit: MAX_GATE_FIX_ROUNDS,
  l03Gate,
  l04Gate,
  postAuditRounds,
  postAuditFindings,
};
