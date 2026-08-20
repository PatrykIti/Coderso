import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dir, "../../..");
const workflowPath = path.join(root, "_docs/_workflows/task-493-author-audit.mjs");

function readWorkflow() {
  return readFileSync(workflowPath, "utf8");
}

test("TASK-493 bootstrap rejects a tracked extra while ignoring a local untracked extra", () => {
  const result = spawnSync("node", [workflowPath, "--task-493-bootstrap-self-test"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
  });

  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  expect(JSON.parse(result.stdout)).toEqual({
    pass: true,
    untrackedExtraIgnored: true,
    dirtyNamedRejected: true,
    symlinkRejected: true,
    missingNamedRejected: true,
    divergentBaselineRejected: true,
    trackedExtraWouldReject: true,
    strictAuditResultRejected: true,
    boundedAuditResultRejected: true,
    agentIdentityRejected: true,
    ignoredWorkflowMutationRejected: true,
    emptyWorkflowDirectoryMutationRejected: true,
    tmpMutationRejected: true,
    authorReceiptBound: true,
    receiptInputsValidated: true,
    receiptAncestorSymlinkRejected: true,
    forgedReceiptLensesRejected: true,
    stagedAuditRejected: true,
    modeAndSymlinkFingerprintRejected: true,
  });
});

test("TASK-493 author/audit workflow accepts exactly one explicit mode", () => {
  for (const args of [
    ["--unexpected"],
    ["--task-493-bootstrap-verify", "--unexpected"],
    ["--task-493-bootstrap-self-test", "--task-493-bootstrap-verify"],
  ]) {
    const result = spawnSync("node", [workflowPath, ...args], {
      cwd: root,
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`task_493_unknown_arguments:${args.join(",")}`);
  }
});

test("TASK-493 bootstrap pins the exact regular tracked files and HEAD bytes", () => {
  const source = readWorkflow();

  for (const pathName of [
    "_docs/_workflows/task-493-author-audit.mjs",
    "_docs/_workflows/task-493-implement.mjs",
    "_docs/_workflows/task-493-fix.mjs",
    "_docs/_workflows/task-493-closeout.mjs",
  ]) {
    expect(source).toContain(pathName);
  }
  expect(source).toContain("TASK_493_BASELINE_SHA");
  expect(source).toContain('"merge-base", "--is-ancestor"');
  expect(source).toContain('"ls-files", "--error-unmatch"');
  expect(source).toContain("task_493_workflow_inventory_invalid");
  expect(source).toContain("task_493_workflow_missing");
  expect(source).toContain("task_493_workflow_head_bytes_mismatch");
  expect(source).toContain("stats.isFile() || stats.isSymbolicLink()");
  expect(source).toContain("task_493_workflow_staged_dirty");
  expect(source).toContain("function parseMode()");
  expect(source).toContain("task_493_audit_mutated_repository");
  expect(source).toContain("assertTask493AuthorAuditReceipt");
  expect(source).toContain("TASK_493_AUTHOR_AUDIT_LENS_IDS");
  expect(source).toContain("task_493_author_staged_changes_forbidden");
  expect(source).toContain("task_493_author_dirty_state_invalid");
  expect(source).toContain("task_493_workflow_tree_limit");
  expect(source).toContain("assertAuthorAuditReceiptInputs");
  expect(source).toContain("author-audit-receipt.json");
  expect(source).toContain("normalizeAuthorAuditResult");
  expect(source).toContain("MAX_AUDIT_FIELD_LENGTH");
  expect(source).toContain("MAX_AUDIT_FINDINGS");
  expect(source).toContain("maxLength: MAX_AUDIT_FIELD_LENGTH");
  expect(source).toContain('required: ["pass", "summary", "findings"]');
  expect(source).toContain("return Object.freeze({ identity, ...audit })");
  expect(source).toContain("task_493_author_audit_invalid");
  expect(source).toContain("workflowTreePaths");
  expect(source).toContain("captureTmpAuditEntries");
  expect(source).toContain("task_493_author_tmp_entry_invalid");
  expect(source).toContain("constants.O_NOFOLLOW");
  expect(source).toContain("assertNofollowDirectory");
  expect(source).not.toContain("git add");
  expect(source).not.toContain("git commit");
  expect(source).not.toContain("git push");
});
