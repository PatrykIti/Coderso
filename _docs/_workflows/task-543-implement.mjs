// TASK-543 implementation workflow entry (single owner: TASK-545-02-L02).
//
// Thin orchestration only: meta, fixed task constants, phase order, agent
// dispatch, and calls to the flat tracked libraries under ./lib/. All gate
// schemas/receipt validation live in task-543-gate-contracts.mjs; smoke
// schemas/validation in the task-543-smoke-* libraries; prompts and declared
// lenses in task-543-prompts-and-closure.mjs; the CodeQL self-test in
// task-543-codeql-self-test.mjs. Post-audit and final-drift phases run through
// the canonical lib/post-audit.mjs driver. Agents never stage or commit.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  AUDIT_SCHEMA,
  FINGERPRINT_SCHEMA,
  FIXER_RESULT_SCHEMA,
  FULL_GATE_COMMANDS,
  FULL_GATE_SCHEMA,
  RESULT_SCHEMA,
  requirePassingResult,
  sameUniqueSet,
  validateFullGates,
  validatePassErrorContract,
} from "./lib/task-543-gate-contracts.mjs";
import { NONCE_GENERATION_COMMAND, SMOKE_SCREENSHOT_ROOT } from "./lib/task-543-smoke-schema.mjs";
import { SMOKE_SCHEMA } from "./lib/task-543-smoke-failure-schema.mjs";
import { validateSmoke } from "./lib/task-543-smoke-timeline.mjs";
import { runTask543CodeQlSelfTest } from "./lib/task-543-codeql-self-test.mjs";
import { runCanonicalPostAudit } from "./lib/post-audit.mjs";
import {
  CHANGELOG,
  CLOSURE_ALLOWED,
  FINAL_LENSES,
  POST_LENSES,
  closurePrompt,
  crossLaneGatePrompt,
  finalDriftFixPrompt,
  finalMetadataGatePrompt,
  fingerprintPrompt,
  fullGatesPrompt,
  postAuditFixPrompt,
  smokeAuditPrompt,
  smokePrompt,
  startGatePrompt,
} from "./lib/task-543-prompts-and-closure.mjs";

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

// Post-audit lens inputs: every lens fingerprints its owned input files. The
// fixer declares affectedLensKeys from the same mapping, and the canonical
// driver requires declared === derived before any receipt is reused.
const POST_LENS_INPUTS = Object.freeze({
  "snapshot-queue": Object.freeze(LEAVES[0].allowed),
  "response-identity": Object.freeze(LEAVES[0].allowed),
  "close-errors": Object.freeze(LEAVES[0].allowed),
  "table-a11y": Object.freeze(LEAVES[1].allowed),
  "test-integrity": Object.freeze([...LEAVES[0].allowed, ...LEAVES[1].allowed]),
});

const LEAF_LENS_KEYS = Object.freeze({
  "543-01-L01": Object.freeze(["snapshot-queue", "response-identity", "close-errors", "test-integrity"]),
  "543-02-L01": Object.freeze(["table-a11y", "test-integrity"]),
});

const FINAL_LENS_INPUTS = Object.freeze({
  graph: Object.freeze([
    "_docs/_TASKS/TASK-543_Posts_Exit_Safety_and_List_Accessibility.md",
    "_docs/_TASKS/TASK-543-01-Autosave-Flush-Before-Close.md",
    "_docs/_TASKS/TASK-543-01-L01-Wait-For-Dirty-Draft-And-Remain-On-Failure.md",
    "_docs/_TASKS/TASK-543-02-Posts-Table-Keyboard-And-Metadata-Parity.md",
    "_docs/_TASKS/TASK-543-02-L01-Remove-Row-Click-And-Restore-Mid-Viewport-Metadata.md",
    "_docs/_TASKS/TASK-543-03-Tests-Smoke-And-Closure.md",
    "_docs/_TASKS/TASK-543-03-L01-Close-Failure-Keyboard-Viewport-Flows-And-Closure.md",
    "_docs/_TASKS/README.md",
  ]),
  changelog: Object.freeze(["_docs/_CHANGELOG/README.md", CHANGELOG.slice(ROOT.length + 1)]),
  guides: Object.freeze([
    "docs/guide/coderso/post-editor-preview-revisions-and-settings.md",
    "docs/guide/coderso/posts-list-and-creation.md",
  ]),
  evidence: Object.freeze([
    "_docs/_workflows/task-543-implement.mjs",
    "_docs/_workflows/_smoke",
  ]),
  scope: Object.freeze([
    ...LEAVES.flatMap((leaf) => leaf.allowed),
    "_docs/_TASKS/README.md",
    "_docs/_CHANGELOG/README.md",
    CHANGELOG.slice(ROOT.length + 1),
    "_docs/_workflows/task-543-implement.mjs",
  ]),
});

// ---- Environment-bound fingerprints for the canonical post-audit driver ----

function runGit(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
}

function digestFileBytes(relativePath) {
  try {
    return createHash("sha256").update(readFileSync(path.join(ROOT, relativePath))).digest("hex");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return "";
    throw error;
  }
}

// The audited universe: workflow bytes plus the tracked working-tree diff plus
// non-ignored status lines. Read-only audits never change it; a verified
// fixer-owned change always does.
function treeDigest() {
  const hash = createHash("sha256");
  hash.update(runGit(["diff", "--binary", "HEAD"]));
  hash.update(readFileSync(WORKFLOW));
  hash.update(runGit(["status", "--porcelain=v1", "--untracked-files=all"]));
  return hash.digest("hex");
}

function lensInputFingerprint(lens, inputsByKey) {
  const hash = createHash("sha256");
  for (const file of [...(inputsByKey[lens.key] ?? [])].sort()) {
    hash.update(digestFileBytes(file));
  }
  hash.update(lens.scope);
  return hash.digest("hex");
}

function everyLensInputFingerprints(lenses, inputsByKey) {
  return Object.fromEntries(lenses.map((lens) => [lens.key, lensInputFingerprint(lens, inputsByKey)]));
}

// ---- Lazy dynamic resume call sites (owned by TASK-545-03-L01) ----

async function createTask543ResumeCheckpoint(runtimeResult) {
  const { createResumeCheckpoint } = await import("./lib/smoke-evidence.mjs");
  return createResumeCheckpoint({
    repoRoot: ROOT,
    expectedTask: "TASK-543",
    pinnedChangelogNumber: 1255,
    pinnedChangelogSlug: "task-543-posts-exit-safety-and-list-accessibility",
    expectedWorkflowRole: "implement",
    executingImportMetaUrl: import.meta.url,
    expectedSuite: "wf543smoke",
    expectedProfile: "certification",
    expectedSession: "wf543smoke",
    runtimeResult,
  });
}

async function openTask543ClosureResume(resume) {
  const { openWorkflowClosureResume } = await import("./lib/smoke-evidence.mjs");
  return openWorkflowClosureResume({
    repoRoot: ROOT,
    expectedTask: "TASK-543",
    checkpointPath: resume.checkpointPath,
    checkpointSha256: resume.checkpointSha256,
    runId: resume.runId,
    expectedSession: "wf543smoke",
    expectedWorkflowRole: "implement",
    executingImportMetaUrl: import.meta.url,
  });
}

// ---- Agent dispatch helpers ----

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
const startGate = await agent(startGatePrompt(), {
  label: "start-gate:543",
  phase: "Start gate",
  schema: RESULT_SCHEMA,
});
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
const crossLane = await agent(crossLaneGatePrompt(), {
  label: "gate:543-cross-lane",
  phase: "Cross-lane gate",
  schema: RESULT_SCHEMA,
});
requirePassingResult(crossLane, "TASK-543 cross-lane gate");

phase("Post-audit");
const postAudit = await runCanonicalPostAudit({
  lenses: POST_LENSES.map(([key, scope]) => Object.freeze({ key, scope })),
  runLens: (lens, pass) =>
    agent(
      `Fresh read-only TASK-543 post-audit pass ${pass} at ${ROOT}. Read all task contracts, ` +
        `source/tests and git diff/status. Lens: ${lens.scope} Report evidence-backed H/M/L with file:line. No edits.`,
      { label: `post-audit:${lens.key}:${pass}`, phase: "Post-audit", schema: AUDIT_SCHEMA }
    ),
  fix: async (blocking) => {
    const affectedLensKeys = [];
    for (const leaf of LEAVES) {
      const fixResult = await agent(
        postAuditFixPrompt(COMMON, leaf, blocking, LEAF_LENS_KEYS[leaf.id]),
        { label: `post-audit-fix:${leaf.id}`, phase: "Post-audit", schema: FIXER_RESULT_SCHEMA }
      );
      affectedLensKeys.push(...(fixResult.affectedLensKeys ?? []));
    }
    return { affectedLensKeys: [...new Set(affectedLensKeys)] };
  },
  validate: async (fixResult) => {
    const owningLeaves = new Set(
      LEAVES.filter((leaf) => fixResult.affectedLensKeys.some((key) => LEAF_LENS_KEYS[leaf.id].includes(key)))
        .map((leaf) => leaf.id)
    );
    const cumulativeAllowed = LEAVES.filter((leaf) => owningLeaves.has(leaf.id)).flatMap(
      ({ allowed }) => allowed
    );
    await runScopeGate(cumulativeAllowed, `post-audit-fix:${[...owningLeaves].join("+")}`);
    for (const leaf of LEAVES.filter((lens) => owningLeaves.has(lens.id))) {
      const fixedGate = await runGate(leaf, "post-audit");
      if (!fixedGate.pass) {
        throw new Error(`${leaf.id}: post-audit fix gate failed: ${fixedGate.errors.join("; ")}`);
      }
    }
  },
  fingerprint: treeDigest,
  fingerprintUniverse: treeDigest,
  fingerprintEveryLensInput: (lenses) => everyLensInputFingerprints(lenses, POST_LENS_INPUTS),
  maximumFixPasses: 1,
  label: "TASK-543 post-audit",
});
if (!postAudit.pass) throw new Error("TASK-543 post-audit remained non-clean");

phase("Full gates");
const fullGates = await agent(fullGatesPrompt(FULL_GATE_COMMANDS), {
  label: "full-gates:543",
  phase: "Full gates",
  schema: FULL_GATE_SCHEMA,
});
validateFullGates(fullGates);

const preSmokeFingerprint = await agent(fingerprintPrompt(), {
  label: "fingerprint:pre-smoke",
  phase: "Smoke",
  schema: FINGERPRINT_SCHEMA,
});

phase("Smoke");
const smoke = await agent(smokePrompt(NONCE_GENERATION_COMMAND, SMOKE_SCREENSHOT_ROOT), {
  label: "smoke:543",
  phase: "Smoke",
  schema: SMOKE_SCHEMA,
});
await validateSmoke(smoke);
const postSmokeFingerprint = await agent(fingerprintPrompt(), {
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
const smokeAudit = await agent(smokeAuditPrompt(smoke), {
  label: "smoke-audit:543",
  phase: "Smoke",
  schema: AUDIT_SCHEMA,
});
if (smokeAudit.findings.length > 0) throw new Error("TASK-543 smoke evidence drift");

const task543Resume = await createTask543ResumeCheckpoint(smoke);

phase("543-03-L01 close");
await openTask543ClosureResume(task543Resume);
await agent(closurePrompt(COMMON, fullGates, smoke), {
  label: "close:543",
  phase: "543-03-L01 close",
});

phase("Final drift");
const finalDrift = await runCanonicalPostAudit({
  lenses: FINAL_LENSES.map(([key, scope]) => Object.freeze({ key, scope })),
  runLens: (lens, pass) =>
    agent(
      `Fresh read-only TASK-543 final working-tree audit pass ${pass} at ${ROOT}. Lens: ${lens.scope} ` +
        "Read task graph, source/tests/guides/changelog/index, full git diff/status, structured " +
        `validation ${JSON.stringify(fullGates)} and smoke ${JSON.stringify(smoke)}. ` +
        "Report all H/M/L with file:line. Do not edit.",
      { label: `final-audit:${lens.key}:${pass}`, phase: "Final drift", schema: AUDIT_SCHEMA }
    ),
  fix: (blocking) =>
    agent(finalDriftFixPrompt(COMMON, blocking), {
      label: "final-drift-fix",
      phase: "Final drift",
      schema: FIXER_RESULT_SCHEMA,
    }),
  validate: async (fixResult) => {
    await runScopeGate(CLOSURE_ALLOWED, "final-drift-fix");
  },
  fingerprint: treeDigest,
  fingerprintUniverse: treeDigest,
  fingerprintEveryLensInput: (lenses) => everyLensInputFingerprints(lenses, FINAL_LENS_INPUTS),
  maximumFixPasses: 1,
  label: "TASK-543 final drift",
});
if (!finalDrift.pass) throw new Error("TASK-543 final drift is not clean");

phase("Final metadata gate");
const finalGate = await agent(finalMetadataGatePrompt(WORKFLOW), {
  label: "final-gate:543",
  phase: "Final metadata gate",
  schema: RESULT_SCHEMA,
});
requirePassingResult(finalGate, "TASK-543 final metadata gate");
