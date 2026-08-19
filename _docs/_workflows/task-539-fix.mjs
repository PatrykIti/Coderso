// TASK-539 contract-repair workflow (orchestrator-owned).
//
// Thin orchestration only: start gate, fresh read-only contract-drift audit,
// evidence-backed fix loop restricted to TASK-539* task bytes and the S3
// workflow files, re-audit of affected scopes, and a self-test mode.
// The parent mandates that BOTH task-539-fix.mjs and task-539-implement.mjs
// exist before the first TASK-539 source edit; this file is that contract
// repair driver. It never edits production or test source and never touches
// task statuses/changelogs (orchestrator-owned). Agents never stage or commit.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  AUDIT_SCHEMA_EXPORT,
  FIXER_RESULT_SCHEMA_EXPORT,
  RESULT_SCHEMA_EXPORT,
  requirePassingResult,
} from "./lib/s3-gate-contracts.mjs";
import { noStagedChanges } from "./lib/s3-fingerprint.mjs";
import {
  s3CommonContext,
  s3PostAuditFixPrompt,
  s3PostAuditLensPrompt,
  s3StartGatePrompt,
} from "./lib/s3-prompts.mjs";
import { runCanonicalPostAudit } from "./lib/post-audit.mjs";

export const meta = {
  name: "task-539-fix",
  description:
    "Fresh-context contract-drift audit and repair for the TASK-539 family contract (task bytes + S3 workflow files only), with exact land-order/single-writer/changelog-pin checks and bounded fix loops. Never edits source or task statuses. Agents never stage or commit.",
  phases: [
    { title: "Start gate" },
    { title: "Contract-drift audit" },
    { title: "Contract repair" },
    { title: "Re-audit" },
    { title: "Metadata gate" },
  ],
};

const ROOT = "/home/coder/project/Coderso-s3";
const TASK_ID = "TASK-539";
const CHANGELOG = 1318;
const WORKFLOW = `${ROOT}/_docs/_workflows/task-539-fix.mjs`;
const IMPLEMENT_WORKFLOW = `${ROOT}/_docs/_workflows/task-539-implement.mjs`;

const COMMON = s3CommonContext({
  root: ROOT,
  taskId: TASK_ID,
  changelog: CHANGELOG,
  extra: `
Contract repair only: edit _docs/_TASKS/TASK-539*.md, _docs/_TASKS/README.md
(only TASK-539 rows/statistics), _docs/_CHANGELOG/README.md (only the 1318
reservation), and the task-539 workflow files. Never edit production/test source,
other task families, or task statuses. Land order is fixed: 01-L01 -> 01-L02 ->
02-L01 -> 02-L02 -> 03-L05 -> 03-L01 -> 03-L02 -> 03-L03 -> 03-L04 -> 04-L01 ->
04-L02 -> 05-L01 -> 05-L02 -> 06-L01 -> 06-L02 -> 07-L01 -> 07-L02 -> 08-L01.`,
});

const CONTRACT_LENSES = Object.freeze([
  {
    key: "land-order",
    scope:
      "Exact land order in the parent and every leaf; dependencies consistent; no leaf re-splits a source another leaf owns.",
  },
  {
    key: "single-writer",
    scope:
      "Every production/test path has exactly one writer leaf; reciprocal forbidden paths and collision guards (TASK-478/481/540/542/548) are copied exactly.",
  },
  {
    key: "changelog-pins",
    scope:
      "Changelog 1318 reserved with no file created; index row consistent; closure rules enumerate parent + 8 children + 18 leaves.",
  },
  {
    key: "facade-contracts",
    scope:
      "pageDocumentV2.ts 74->78 types and 125->133 runtime values; pageRendererV2.tsx 41-name surface; no export-star; direct-owner names match consumers.",
  },
  {
    key: "gates-evidence",
    scope:
      "Every leaf Validation gate is present, exact, and runnable; the aggregate gate inventory matches the 539-08-L01 contract; line receipts <=1000.",
  },
]);

const CONTRACT_LENS_INPUTS = Object.freeze({
  "land-order": Object.freeze(["_docs/_TASKS/TASK-539_Page_V2_Post_Audit_Remediation_II.md"]),
  "single-writer": Object.freeze([
    "_docs/_TASKS/TASK-539_Page_V2_Post_Audit_Remediation_II.md",
    "_docs/_TASKS/TASK-539-03-Gallery-Controls-Gating-And-Responsive-Canvas.md",
  ]),
  "changelog-pins": Object.freeze([
    "_docs/_TASKS/TASK-539_Page_V2_Post_Audit_Remediation_II.md",
    "_docs/_CHANGELOG/README.md",
  ]),
  "facade-contracts": Object.freeze([
    "_docs/_TASKS/TASK-539-01-L01-Deep-Layer-Merge-Strict-Gallery-And-Effect-Normalization.md",
    "_docs/_TASKS/TASK-539-05-L01-Stamp-And-Render-All-Page-Effects-Correctly.md",
  ]),
  "gates-evidence": Object.freeze([
    "_docs/_TASKS/TASK-539-08-L01-Nine-Flow-Page-Parity-Suite-And-Closure.md",
    IMPLEMENT_WORKFLOW,
  ]),
});

function treeDigest() {
  const hash = createHash("sha256");
  hash.update(execFileSync("git", ["diff", "--binary", "HEAD"], { cwd: ROOT }));
  hash.update(readFileSync(WORKFLOW));
  hash.update(readFileSync(IMPLEMENT_WORKFLOW));
  hash.update(
    execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: ROOT })
  );
  return hash.digest("hex");
}

function digestFileBytes(relativePath) {
  try {
    return createHash("sha256")
      .update(readFileSync(`${ROOT}/${relativePath}`))
      .digest("hex");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return "";
    throw error;
  }
}

function everyLensInputFingerprints(lenses) {
  return Object.fromEntries(
    lenses.map((lens) => {
      const hash = createHash("sha256");
      for (const file of [...(CONTRACT_LENS_INPUTS[lens.key] ?? [])].sort())
        hash.update(digestFileBytes(file));
      hash.update(lens.scope);
      return [lens.key, hash.digest("hex")];
    })
  );
}

// ---- Self-test (fail-closed) ----

function selfTest() {
  const passed = {};
  try {
    noStagedChanges(ROOT);
    passed.noStagedChanges = true;
  } catch (error) {
    passed.noStagedChanges = false;
    passed.noStagedChangesError = String(error);
  }
  const implementExists = (() => {
    try {
      return readFileSync(IMPLEMENT_WORKFLOW, "utf8").includes("check-task-family-line-limit");
    } catch {
      return false;
    }
  })();
  passed.implementWorkflowReachable = implementExists;
  const contractHasLandOrder = (() => {
    try {
      const parent = readFileSync(
        `${ROOT}/_docs/_TASKS/TASK-539_Page_V2_Post_Audit_Remediation_II.md`,
        "utf8"
      );
      return /539-01-L01 -> 539-01-L02/.test(parent) && /539-08-L01/.test(parent);
    } catch {
      return false;
    }
  })();
  passed.landOrderPinned = contractHasLandOrder;
  return Object.freeze({
    pass:
      passed.noStagedChanges === true &&
      passed.implementWorkflowReachable === true &&
      passed.landOrderPinned === true,
    ...passed,
  });
}

if (process.argv.includes("--self-test-contract-repair")) {
  process.stdout.write(`${JSON.stringify(selfTest())}\n`);
  process.exit(0);
}

if (process.argv.includes("--self-test-file-line-limit")) {
  const os = await import("node:os");
  const tempRoot = (await import("node:fs")).mkdtempSync(
    path.join(os.tmpdir(), "task-539-fix-line-")
  );
  try {
    (await import("node:fs")).writeFileSync(`${tempRoot}/core/tracked.ts`, "export const a = 1;\n");
    (await import("node:fs")).writeFileSync(`${tempRoot}/scripts/too-long.ts`, "x\n".repeat(1001));
    const { assertFamilyLineLimit } = await import("./lib/s3-fingerprint.mjs");
    const result = (() => {
      try {
        assertFamilyLineLimit(
          tempRoot,
          execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString().trim()
        );
        return { pass: true };
      } catch (error) {
        return { pass: false, error: String(error) };
      }
    })();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    (await import("node:fs")).rmSync(tempRoot, { recursive: true, force: true });
  }
  process.exit(0);
}

// ---- Main repair workflow ----

async function runWorkflow() {
  phase("Start gate");
  noStagedChanges(ROOT);
  const startGate = await agent(
    s3StartGatePrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG }),
    {
      label: "start-gate:539-fix",
      phase: "Start gate",
      schema: RESULT_SCHEMA_EXPORT,
    }
  );
  requirePassingResult(startGate, "TASK-539 contract-repair start gate");

  phase("Contract-drift audit");
  const audit = await runCanonicalPostAudit({
    lenses: CONTRACT_LENSES,
    runLens: (lens, pass) =>
      agent(s3PostAuditLensPrompt({ root: ROOT, taskId: TASK_ID }, lens), {
        label: `contract-audit:${lens.key}:${pass}`,
        phase: "Contract-drift audit",
        schema: AUDIT_SCHEMA_EXPORT,
      }),
    fix: async (blocking) => {
      const fixResult = await agent(
        s3PostAuditFixPrompt({ root: ROOT, taskId: TASK_ID, changelog: CHANGELOG }, blocking),
        {
          label: "contract-fix:539",
          phase: "Contract repair",
          schema: FIXER_RESULT_SCHEMA_EXPORT,
        }
      );
      return {
        affectedLensKeys: Array.isArray(fixResult.affectedLensKeys)
          ? fixResult.affectedLensKeys
          : [],
      };
    },
    validate: async () => {},
    fingerprint: treeDigest,
    fingerprintUniverse: treeDigest,
    fingerprintEveryLensInput: everyLensInputFingerprints,
    maximumFixPasses: 1,
    label: "TASK-539 contract repair",
  });
  if (!audit.pass) throw new Error("TASK-539 contract repair did not converge");

  phase("Metadata gate");
  const gate = await agent(
    `Read-only metadata gate for the TASK-539 contract at ${ROOT}. Verify both task-539-fix.mjs and task-539-implement.mjs are syntactically valid (node --check), the parent/child files stay ⏳ To Do, changelog 1318 stays reserved, and the working tree is clean outside orchestrator-owned paths. Do not edit.`,
    { label: "metadata-gate:539-fix", phase: "Metadata gate", schema: RESULT_SCHEMA_EXPORT }
  );
  requirePassingResult(gate, "TASK-539 contract-repair metadata gate");

  return Object.freeze({ pass: true, task: TASK_ID, audit });
}

export const result = await runWorkflow();
process.stdout.write(`${JSON.stringify(result)}\n`);
