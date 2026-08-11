import { execFileSync } from "node:child_process";
import { mkdtempSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const meta = Object.freeze({
  name: "task-554-author-audit",
  description: "Verify TASK-554 bootstrap, then run fresh read-only contract and reconcile audits.",
  phases: Object.freeze([
    Object.freeze({ title: "Bootstrap verification" }),
    Object.freeze({ title: "Contract audit" }),
    Object.freeze({ title: "Cross-file reconcile" }),
  ]),
});

const ROOT = "/home/coder/project/Coderso";
export const TASK_554_BASELINE_SHA = "f6705443e129c9e89c32763405800b72ba3a0680";
export const TASK_554_WORKFLOW_PATHS = Object.freeze([
  "_docs/_workflows/task-554-author-audit.mjs",
  "_docs/_workflows/task-554-implement.mjs",
  "_docs/_workflows/task-554-fix.mjs",
]);
const SELF_TEST_ARG = "--task-554-bootstrap-self-test";

function runGit(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] });
}

function gitStatus(root, args) {
  try {
    runGit(root, args);
    return 0;
  } catch (error) {
    return typeof error?.status === "number" ? error.status : 255;
  }
}

function assertNoUnexpectedArgs() {
  const unexpected = process.argv.slice(2).filter((arg) => arg !== SELF_TEST_ARG);
  if (unexpected.length > 0) throw new Error(`task_554_unknown_arguments:${unexpected.join(",")}`);
}

function assertGitPathIsClean(root, relativePath) {
  if (gitStatus(root, ["diff", "--quiet", "--", relativePath]) !== 0) {
    throw new Error(`task_554_workflow_dirty:${relativePath}`);
  }
  if (gitStatus(root, ["diff", "--cached", "--quiet", "--", relativePath]) !== 0) {
    throw new Error(`task_554_workflow_staged_dirty:${relativePath}`);
  }
}

export function assertTask554Bootstrap(root = ROOT) {
  if (gitStatus(root, ["cat-file", "-e", `${TASK_554_BASELINE_SHA}^{commit}`]) !== 0) {
    throw new Error(`task_554_baseline_missing:${TASK_554_BASELINE_SHA}`);
  }

  const tracked = runGit(root, ["ls-files", "--", "_docs/_workflows"])
    .toString("utf8")
    .split("\n")
    .filter(Boolean);
  const actualTaskEntries = tracked.filter((entry) => /^_docs\/_workflows\/task-554-.*\.mjs$/u.test(entry));
  if (actualTaskEntries.length !== TASK_554_WORKFLOW_PATHS.length ||
    TASK_554_WORKFLOW_PATHS.some((entry) => !actualTaskEntries.includes(entry))) {
    throw new Error(`task_554_workflow_inventory_invalid:${actualTaskEntries.join(",")}`);
  }

  for (const relativePath of TASK_554_WORKFLOW_PATHS) {
    if (gitStatus(root, ["ls-files", "--error-unmatch", "--", relativePath]) !== 0) {
      throw new Error(`task_554_workflow_untracked:${relativePath}`);
    }
    const absolutePath = path.join(root, relativePath);
    const stats = lstatSync(absolutePath);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error(`task_554_workflow_not_regular_file:${relativePath}`);
    }
    const headBytes = runGit(root, ["show", `HEAD:${relativePath}`]);
    const worktreeBytes = readFileSync(absolutePath);
    if (!headBytes.equals(worktreeBytes)) {
      throw new Error(`task_554_workflow_head_bytes_mismatch:${relativePath}`);
    }
    assertGitPathIsClean(root, relativePath);
  }
  return Object.freeze({ baseline: TASK_554_BASELINE_SHA, paths: TASK_554_WORKFLOW_PATHS });
}

function bootstrapSelfTest() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "task-554-bootstrap-"));
  try {
    runGit(tempRoot, ["init", "-q"]);
    runGit(tempRoot, ["config", "user.email", "task-554@example.invalid"]);
    runGit(tempRoot, ["config", "user.name", "TASK-554 bootstrap self-test"]);
    for (const relativePath of TASK_554_WORKFLOW_PATHS) {
      const absolutePath = path.join(tempRoot, relativePath);
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, `// ${relativePath}\n`, "utf8");
    }
    runGit(tempRoot, ["add", ...TASK_554_WORKFLOW_PATHS]);
    runGit(tempRoot, ["commit", "-qm", "bootstrap"]);
    const originalBaseline = TASK_554_BASELINE_SHA;
    const head = runGit(tempRoot, ["rev-parse", "HEAD"]).toString("utf8").trim();
    // The self-test validates the same inventory/byte logic against a disposable Git repo.
    const verifierSource = readFileSync(new URL(import.meta.url), "utf8").replace(
      originalBaseline,
      head,
    );
    const verifierPath = path.join(tempRoot, "bootstrap-verifier.mjs");
    writeFileSync(verifierPath, verifierSource, "utf8");
    const importOptions = { encoding: "utf8", env: { ...process.env, TASK_554_WORKFLOW_IMPORT: "1" } };
    const loaded = execFileSync("node", ["--input-type=module", "--eval", `
      import { assertTask554Bootstrap } from ${JSON.stringify(`file://${verifierPath}`)};
      assertTask554Bootstrap(${JSON.stringify(tempRoot)});
    `], importOptions);
    void loaded;

    const localExtra = path.join(tempRoot, "_docs/_workflows/task-554-local-only.mjs");
    writeFileSync(localExtra, "// ignored/local is non-authorizing\n", "utf8");
    execFileSync("node", ["--input-type=module", "--eval", `
      import { assertTask554Bootstrap } from ${JSON.stringify(`file://${verifierPath}`)};
      assertTask554Bootstrap(${JSON.stringify(tempRoot)});
    `], importOptions);
    runGit(tempRoot, ["add", "_docs/_workflows/task-554-local-only.mjs"]);
    const rejectionStatus = gitStatus(tempRoot, ["diff", "--cached", "--quiet", "--", "."]);
    if (rejectionStatus !== 1) throw new Error("task_554_self_test_extra_setup_failed");
    const rejected = execFileSync("node", ["--input-type=module", "--eval", `
      import { assertTask554Bootstrap } from ${JSON.stringify(`file://${verifierPath}`)};
      try { assertTask554Bootstrap(${JSON.stringify(tempRoot)}); } catch (error) {
        if (String(error?.message).startsWith("task_554_workflow_inventory_invalid:")) process.exit(0);
        throw error;
      }
      process.exit(1);
    `], { ...importOptions, stdio: ["ignore", "pipe", "pipe"] });
    void rejected;
    return Object.freeze({ pass: true, untrackedExtraIgnored: true, trackedExtraWouldReject: true });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

const AUDIT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "findings"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string" },
          recommendation: { type: "string" },
        },
      },
    },
  },
});

function assertAuditClean(label, audit) {
  const blockers = audit?.findings?.filter((finding) =>
    finding.severity === "HIGH" || finding.severity === "MEDIUM"
  ) ?? [];
  if (!audit || audit.pass !== (blockers.length === 0)) throw new Error(`${label}:invalid_result`);
  if (blockers.length) throw new Error(`${label}:blocked:${JSON.stringify(blockers)}`);
  return audit;
}

const COMMON = `Repository: ${ROOT}
Baseline: ${TASK_554_BASELINE_SHA}; task: TASK-554; changelog: 1267.
Read current HEAD, status and diff first. The pre-existing untracked
_TMP-task-dispatch-plan-2026-08-10.md is owner state and must stay untouched.
Read root AGENTS.md, TASK-554, task board, related TASK-545/548/551 contracts,
README/CONTRIBUTING, architecture/API/RBAC/security/testing docs, current source
and tests. No files may be edited. Ground every finding against current bytes
with file:line evidence, order findings by severity, and do not expose secrets,
credentials, private data, or raw sensitive logs. pass=true means zero HIGH or
MEDIUM findings; LOW remains visible. Verify cache scope stays with TASK-551-09-L02,
the pure browser-safe contract boundary, exact one-snapshot RBAC, present-only
payload behavior, hydration/draft preservation, static smoke seam ownership,
workflow bootstrap, validation lanes, and line-count limits.`;

async function runWorkflow() {
  assertNoUnexpectedArgs();
  phase("Bootstrap verification");
  const bootstrap = assertTask554Bootstrap();
  phase("Contract audit");
  const lenses = await parallel([
    () => agent(`${COMMON}\nAudit server schema/route/RBAC/CSRF/error behavior and real HTTP test feasibility.`, { label: "task-554:audit:security", phase: "Contract audit", schema: AUDIT_SCHEMA }),
    () => agent(`${COMMON}\nAudit Admin client, Classic editor baseline/dirty/race behavior, and browser-boundary tests.`, { label: "task-554:audit:ui", phase: "Contract audit", schema: AUDIT_SCHEMA }),
    () => agent(`${COMMON}\nAudit workflow, smoke architecture, task graph, writer ownership, validation and closure rules.`, { label: "task-554:audit:workflow", phase: "Contract audit", schema: AUDIT_SCHEMA }),
  ]);
  for (const [index, lens] of lenses.entries()) assertAuditClean(`task_554_audit_${index + 1}`, lens);
  phase("Cross-file reconcile");
  const reconcile = assertAuditClean("task_554_reconcile", await agent(
    `${COMMON}\nRead only the shared contracts/seams. Reconcile type names, allowed fields, ownership, test paths, exact seven smoke IDs, writer order, and land order.`,
    { label: "task-554:audit:reconcile", phase: "Cross-file reconcile", schema: AUDIT_SCHEMA },
  ));
  return Object.freeze({ pass: true, bootstrap, lenses, reconcile });
}

const selfTest = process.argv.includes(SELF_TEST_ARG);
const importedForVerification = process.env.TASK_554_WORKFLOW_IMPORT === "1";
export const result = selfTest ? bootstrapSelfTest() : importedForVerification ? null : await runWorkflow();
if (selfTest) process.stdout.write(`${JSON.stringify(result)}\n`);
