import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  constants,
  chmodSync,
  closeSync,
  fstatSync,
  mkdtempSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const meta = Object.freeze({
  name: "task-493-author-audit",
  description: "Verify TASK-493 bootstrap, then run fresh read-only contract and reconcile audits.",
  phases: Object.freeze([
    Object.freeze({ title: "Bootstrap verification" }),
    Object.freeze({ title: "Contract audit" }),
    Object.freeze({ title: "Cross-file reconcile" }),
  ]),
});

const ROOT = "/home/coder/project/Coderso-493";
export const TASK_493_BASELINE_SHA = "3c4700929fc288fbf067e19b91ee62587154116d";
export const TASK_493_WORKFLOW_PATHS = Object.freeze([
  "_docs/_workflows/task-493-author-audit.mjs",
  "_docs/_workflows/task-493-implement.mjs",
  "_docs/_workflows/task-493-fix.mjs",
  "_docs/_workflows/task-493-closeout.mjs",
]);
export const TASK_493_AUTHOR_AUDIT_LENS_IDS = Object.freeze([
  "task-493:audit:security",
  "task-493:audit:ui",
  "task-493:audit:workflow",
]);
const SELF_TEST_ARG = "--task-493-bootstrap-self-test";
const VERIFY_ARG = "--task-493-bootstrap-verify";
export const TASK_493_AUTHOR_RECEIPT_PATH =
  "_docs/_workflows/_smoke/task-493/author-audit-receipt.json";
const AUTHOR_ALLOWED_DIRTY_PATHS = Object.freeze([
  "_TMP-task-dispatch-plan-2026-08-10.md",
  "_docs/_TASKS/README.md",
  "_docs/_TASKS/TASK-493_SEO_Indexing_And_Search_Performance_Pipeline.md",
]);
const AUTHOR_FORBIDDEN_PATHS = Object.freeze([
  "core/services/content/postsService.ts",
  "core/services/content/postMutationService.ts",
  "core/admin/services/seoClient.ts",
  "_docs/_TASKS/TASK-414",
  "_docs/_TASKS/TASK-547",
  "_docs/_CHANGELOG/1308-",
]);
const MAX_WORKFLOW_TREE_ENTRIES = 4096;
const MAX_WORKFLOW_TREE_DEPTH = 64;
const MAX_TMP_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_AUDIT_FINDINGS = 40;
const MAX_AUDIT_FIELD_LENGTH = 2048;

function runGit(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitStatus(root, args) {
  try {
    runGit(root, args);
    return 0;
  } catch (error) {
    return typeof error?.status === "number" ? error.status : 255;
  }
}

function parseMode() {
  const args = process.argv.slice(2);
  if (args.length === 0) return "run";
  if (args.length === 1 && args[0] === SELF_TEST_ARG) return "self-test";
  if (args.length === 1 && args[0] === VERIFY_ARG) return "verify";
  throw new Error(`task_493_unknown_arguments:${args.join(",")}`);
}

function assertGitPathIsClean(root, relativePath) {
  if (gitStatus(root, ["diff", "--quiet", "--", relativePath]) !== 0) {
    throw new Error(`task_493_workflow_dirty:${relativePath}`);
  }
  if (gitStatus(root, ["diff", "--cached", "--quiet", "--", relativePath]) !== 0) {
    throw new Error(`task_493_workflow_staged_dirty:${relativePath}`);
  }
}

function gitNulPaths(root, args) {
  return runGit(root, args).toString("utf8").split("\0").filter(Boolean);
}

function pathMatches(paths, relativePath) {
  return paths.some((entry) => relativePath === entry || relativePath.startsWith(entry));
}

function currentAuthorDirtyPaths(root) {
  return [
    ...new Set([
      ...gitNulPaths(root, ["diff", "--name-only", "-z"]),
      ...gitNulPaths(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
    ]),
  ].sort((left, right) => left.localeCompare(right));
}

function assertAuthorDispatchState(root = ROOT) {
  if (gitStatus(root, ["diff", "--cached", "--quiet"]) !== 0)
    throw new Error("task_493_author_staged_changes_forbidden");
  const dirty = currentAuthorDirtyPaths(root);
  const forbidden = dirty.filter((relativePath) =>
    pathMatches(AUTHOR_FORBIDDEN_PATHS, relativePath)
  );
  const unexpected = dirty.filter(
    (relativePath) => !AUTHOR_ALLOWED_DIRTY_PATHS.includes(relativePath)
  );
  if (forbidden.length || unexpected.length) {
    throw new Error(
      `task_493_author_dirty_state_invalid:${JSON.stringify({ forbidden, unexpected })}`
    );
  }
  return Object.freeze(dirty);
}

function workflowTreePaths(root) {
  const base = path.join(root, "_docs/_workflows");
  const entries = [];
  const visit = (absolutePath, depth) => {
    if (depth > MAX_WORKFLOW_TREE_DEPTH || entries.length >= MAX_WORKFLOW_TREE_ENTRIES)
      throw new Error("task_493_workflow_tree_limit");
    let stats;
    try {
      stats = lstatSync(absolutePath);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT" && absolutePath === base)
        return;
      throw error;
    }
    const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
    if (
      !relativePath ||
      relativePath.startsWith("../") ||
      path.posix.isAbsolute(relativePath) ||
      relativePath.includes("\0")
    )
      throw new Error("task_493_workflow_tree_escape");
    entries.push(relativePath);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return;
    for (const name of readdirSync(absolutePath).sort((left, right) => left.localeCompare(right)))
      visit(path.join(absolutePath, name), depth + 1);
  };
  visit(base, 0);
  return entries;
}

function tmpNode(stats) {
  return Object.freeze({ dev: stats.dev, ino: stats.ino, mode: stats.mode, nlink: stats.nlink });
}

function sameTmpNode(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}

function fingerprintTmpFile(absolutePath) {
  const initial = lstatSync(absolutePath);
  if (
    !initial.isFile() ||
    initial.isSymbolicLink() ||
    initial.nlink !== 1 ||
    initial.size > MAX_TMP_ENTRY_BYTES
  )
    throw new Error("task_493_author_tmp_entry_invalid");
  let handle;
  try {
    handle = openSync(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
    const before = fstatSync(handle);
    if (!before.isFile() || before.nlink !== 1 || before.size > MAX_TMP_ENTRY_BYTES)
      throw new Error("task_493_author_tmp_entry_invalid");
    const bytes = Buffer.from(readFileSync(handle));
    const after = fstatSync(handle);
    const final = lstatSync(absolutePath);
    const node = tmpNode(before);
    if (
      !sameTmpNode(tmpNode(initial), node) ||
      !sameTmpNode(node, tmpNode(after)) ||
      !sameTmpNode(node, tmpNode(final)) ||
      bytes.byteLength !== after.size
    )
      throw new Error("task_493_author_tmp_entry_changed");
    return `file:${node.dev}:${node.ino}:${node.mode}:${node.nlink}:${createHash("sha256").update(bytes).digest("hex")}`;
  } finally {
    if (handle !== undefined) closeSync(handle);
  }
}

function captureTmpAuditEntries(root) {
  const directory = path.join(root, ".tmp");
  let initial;
  try {
    initial = lstatSync(directory);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return [".tmp\0missing"];
    throw error;
  }
  if (!initial.isDirectory() || initial.isSymbolicLink())
    throw new Error("task_493_author_tmp_root_invalid");
  const entries = [`.tmp\0directory:${initial.dev}:${initial.ino}:${initial.mode}`];
  const visit = (absolutePath, relativePath, depth) => {
    if (depth > MAX_WORKFLOW_TREE_DEPTH || entries.length >= MAX_WORKFLOW_TREE_ENTRIES)
      throw new Error("task_493_author_tmp_tree_limit");
    const stats = lstatSync(absolutePath);
    if (stats.isSymbolicLink()) throw new Error("task_493_author_tmp_entry_invalid");
    if (stats.isDirectory()) {
      const node = tmpNode(stats);
      entries.push(`${relativePath}\0directory:${node.dev}:${node.ino}:${node.mode}`);
      for (const name of readdirSync(absolutePath).sort((left, right) => left.localeCompare(right)))
        visit(path.join(absolutePath, name), `${relativePath}/${name}`, depth + 1);
      if (
        node.dev !== lstatSync(absolutePath).dev ||
        node.ino !== lstatSync(absolutePath).ino ||
        node.mode !== lstatSync(absolutePath).mode
      )
        throw new Error("task_493_author_tmp_ancestor_changed");
      return;
    }
    if (!stats.isFile()) throw new Error("task_493_author_tmp_entry_invalid");
    entries.push(`${relativePath}\0${fingerprintTmpFile(absolutePath)}`);
  };
  for (const name of readdirSync(directory).sort((left, right) => left.localeCompare(right)))
    visit(path.join(directory, name), `.tmp/${name}`, 1);
  if (
    tmpNode(initial).dev !== lstatSync(directory).dev ||
    tmpNode(initial).ino !== lstatSync(directory).ino ||
    tmpNode(initial).mode !== lstatSync(directory).mode
  )
    throw new Error("task_493_author_tmp_ancestor_changed");
  return entries;
}

function captureAuditFingerprint(root, excludedPaths = []) {
  const excluded = new Set(excludedPaths);
  const paths = [
    ...new Set([
      ...gitNulPaths(root, ["ls-files", "-co", "--exclude-standard", "-z"]),
      ...workflowTreePaths(root),
    ]),
  ].sort();
  return paths
    .filter((relativePath) => !excluded.has(relativePath))
    .map((relativePath) => {
      const absolutePath = path.join(root, relativePath);
      try {
        const stats = lstatSync(absolutePath);
        const value = stats.isSymbolicLink()
          ? `symlink:${stats.mode}:${readlinkSync(absolutePath)}`
          : stats.isFile()
            ? `file:${stats.mode}:${createHash("sha256").update(readFileSync(absolutePath)).digest("hex")}`
            : `non_regular:${stats.mode}`;
        return `${relativePath}\0${value}`;
      } catch (error) {
        if (error && typeof error === "object" && error.code === "ENOENT")
          return `${relativePath}\0missing`;
        throw error;
      }
    })
    .concat(captureTmpAuditEntries(root))
    .join("\0");
}

function auditFingerprintDigest(root) {
  return createHash("sha256")
    .update(captureAuditFingerprint(root, [TASK_493_AUTHOR_RECEIPT_PATH]))
    .digest("hex");
}

function assertNofollowDirectory(root, relativeDirectory, create = false) {
  let directory = root;
  for (const component of relativeDirectory.split("/")) {
    directory = path.join(directory, component);
    let stats;
    try {
      stats = lstatSync(directory);
    } catch (error) {
      if (!error || typeof error !== "object" || error.code !== "ENOENT") throw error;
      if (!create) throw new Error(`task_493_author_receipt_ancestor_missing:${relativeDirectory}`);
      mkdirSync(directory, { mode: 0o700 });
      stats = lstatSync(directory);
    }
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error(`task_493_author_receipt_ancestor_invalid:${relativeDirectory}`);
    }
  }
  return directory;
}

function assertReceiptTarget(root, create = false) {
  const target = path.join(
    assertNofollowDirectory(root, path.dirname(TASK_493_AUTHOR_RECEIPT_PATH), create),
    path.basename(TASK_493_AUTHOR_RECEIPT_PATH)
  );
  try {
    const stats = lstatSync(target);
    if (!stats.isFile() || stats.isSymbolicLink())
      throw new Error("task_493_author_receipt_not_regular");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return target;
    throw error;
  }
  return target;
}

function exactReceipt(value) {
  const keys = ["schemaVersion", "task", "baseline", "head", "fingerprint", "lenses", "reconcile"];
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    return false;
  return (
    value.schemaVersion === 1 &&
    value.task === "TASK-493" &&
    value.baseline === TASK_493_BASELINE_SHA &&
    typeof value.head === "string" &&
    /^[a-f0-9]{40}$/u.test(value.head) &&
    typeof value.fingerprint === "string" &&
    /^[a-f0-9]{64}$/u.test(value.fingerprint) &&
    Array.isArray(value.lenses) &&
    value.lenses.length === TASK_493_AUTHOR_AUDIT_LENS_IDS.length &&
    value.lenses.every((identity, index) => identity === TASK_493_AUTHOR_AUDIT_LENS_IDS[index]) &&
    value.reconcile === "task-493:audit:reconcile"
  );
}

function writeAuthorAuditReceipt(root, lenses) {
  const target = assertReceiptTarget(root, true);
  const receipt = Object.freeze({
    schemaVersion: 1,
    task: "TASK-493",
    baseline: TASK_493_BASELINE_SHA,
    head: runGit(root, ["rev-parse", "HEAD"]).toString("utf8").trim(),
    fingerprint: auditFingerprintDigest(root),
    lenses: lenses.map((lens) => lens.identity),
    reconcile: "task-493:audit:reconcile",
  });
  const staged = `${target}.tmp`;
  try {
    lstatSync(staged);
    throw new Error("task_493_author_receipt_staging_exists");
  } catch (error) {
    if (!error || typeof error !== "object" || error.code !== "ENOENT") throw error;
  }
  writeFileSync(staged, `${JSON.stringify(receipt)}\n`, {
    encoding: "utf8",
    mode: 0o600,
    flag: "wx",
  });
  renameSync(staged, target);
  return receipt;
}

function assertAuthorAuditReceiptInputs(lenses, reconcile) {
  if (!Array.isArray(lenses) || lenses.length !== TASK_493_AUTHOR_AUDIT_LENS_IDS.length)
    throw new Error("task_493_author_receipt_inputs_invalid");
  const checkedLenses = lenses.map((lens, index) =>
    assertAuditClean(`task_493_audit_${index + 1}`, TASK_493_AUTHOR_AUDIT_LENS_IDS[index], lens)
  );
  const checkedReconcile = assertAuditClean(
    "task_493_reconcile",
    "task-493:audit:reconcile",
    reconcile
  );
  return Object.freeze({ lenses: Object.freeze(checkedLenses), reconcile: checkedReconcile });
}

export function recordTask493AuthorAuditReceipt(root = ROOT, lenses, reconcile) {
  assertTask493Bootstrap(root);
  assertAuthorDispatchState(root);
  return writeAuthorAuditReceipt(root, assertAuthorAuditReceiptInputs(lenses, reconcile).lenses);
}

export function assertTask493AuthorAuditReceipt(root = ROOT) {
  let receipt;
  try {
    const target = assertReceiptTarget(root);
    const handle = openSync(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      if (!fstatSync(handle).isFile()) throw new Error("task_493_author_receipt_not_regular");
      receipt = JSON.parse(readFileSync(handle, "utf8"));
    } finally {
      closeSync(handle);
    }
  } catch (error) {
    if (
      (error && typeof error === "object" && error.code === "ENOENT") ||
      String(error?.message).startsWith("task_493_author_receipt_ancestor_missing:")
    )
      throw new Error("task_493_author_receipt_missing");
    throw error;
  }
  if (!exactReceipt(receipt)) throw new Error("task_493_author_receipt_invalid");
  if (
    receipt.head !== runGit(root, ["rev-parse", "HEAD"]).toString("utf8").trim() ||
    receipt.fingerprint !== auditFingerprintDigest(root)
  ) {
    throw new Error("task_493_author_receipt_stale");
  }
  return Object.freeze(receipt);
}

async function assertReadOnlyAudit(label, work, root = ROOT) {
  assertAuthorDispatchState(root);
  const before = captureAuditFingerprint(root);
  try {
    return await work();
  } finally {
    assertAuthorDispatchState(root);
    if (captureAuditFingerprint(root) !== before)
      throw new Error(`task_493_audit_mutated_repository:${label}`);
  }
}

export function assertTask493Bootstrap(root = ROOT) {
  if (gitStatus(root, ["cat-file", "-e", `${TASK_493_BASELINE_SHA}^{commit}`]) !== 0) {
    throw new Error(`task_493_baseline_missing:${TASK_493_BASELINE_SHA}`);
  }
  if (gitStatus(root, ["merge-base", "--is-ancestor", TASK_493_BASELINE_SHA, "HEAD"]) !== 0) {
    throw new Error(`task_493_baseline_not_ancestor:${TASK_493_BASELINE_SHA}`);
  }

  const tracked = runGit(root, ["ls-files", "--", "_docs/_workflows"])
    .toString("utf8")
    .split("\n")
    .filter(Boolean);
  const actualTaskEntries = tracked.filter((entry) =>
    entry.startsWith("_docs/_workflows/task-493")
  );
  if (
    actualTaskEntries.length !== TASK_493_WORKFLOW_PATHS.length ||
    TASK_493_WORKFLOW_PATHS.some((entry) => !actualTaskEntries.includes(entry))
  ) {
    throw new Error(`task_493_workflow_inventory_invalid:${actualTaskEntries.join(",")}`);
  }

  for (const relativePath of TASK_493_WORKFLOW_PATHS) {
    if (gitStatus(root, ["ls-files", "--error-unmatch", "--", relativePath]) !== 0) {
      throw new Error(`task_493_workflow_untracked:${relativePath}`);
    }
    const absolutePath = path.join(root, relativePath);
    let stats;
    try {
      stats = lstatSync(absolutePath);
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        throw new Error(`task_493_workflow_missing:${relativePath}`);
      }
      throw error;
    }
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new Error(`task_493_workflow_not_regular_file:${relativePath}`);
    }
    const headBytes = runGit(root, ["show", `HEAD:${relativePath}`]);
    const worktreeBytes = readFileSync(absolutePath);
    if (!headBytes.equals(worktreeBytes)) {
      throw new Error(`task_493_workflow_head_bytes_mismatch:${relativePath}`);
    }
    assertGitPathIsClean(root, relativePath);
  }
  return Object.freeze({ baseline: TASK_493_BASELINE_SHA, paths: TASK_493_WORKFLOW_PATHS });
}

async function bootstrapSelfTest() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "task-493-bootstrap-"));
  try {
    runGit(tempRoot, ["init", "-q"]);
    runGit(tempRoot, ["config", "user.email", "task-493@example.invalid"]);
    runGit(tempRoot, ["config", "user.name", "TASK-493 bootstrap self-test"]);
    for (const relativePath of TASK_493_WORKFLOW_PATHS) {
      const absolutePath = path.join(tempRoot, relativePath);
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, `// ${relativePath}\n`, "utf8");
    }
    runGit(tempRoot, ["add", ...TASK_493_WORKFLOW_PATHS]);
    runGit(tempRoot, ["commit", "-qm", "bootstrap"]);
    writeFileSync(path.join(tempRoot, ".gitignore"), "_docs/_workflows/\n.tmp\n", "utf8");
    runGit(tempRoot, ["add", ".gitignore"]);
    runGit(tempRoot, ["commit", "-qm", "ignore workflows"]);
    const auditStagingBefore = readFileSync(path.join(tempRoot, TASK_493_WORKFLOW_PATHS[0]));
    let stagedAuditRejected = false;
    try {
      await assertReadOnlyAudit(
        "staged_audit",
        async () => {
          writeFileSync(
            path.join(tempRoot, TASK_493_WORKFLOW_PATHS[0]),
            "// staged audit side effect\n",
            "utf8"
          );
          runGit(tempRoot, ["add", TASK_493_WORKFLOW_PATHS[0]]);
          writeFileSync(path.join(tempRoot, TASK_493_WORKFLOW_PATHS[0]), auditStagingBefore);
        },
        tempRoot
      );
    } catch (error) {
      if (!String(error?.message).startsWith("task_493_author_staged_changes_forbidden"))
        throw error;
      stagedAuditRejected = true;
    }
    if (!stagedAuditRejected) throw new Error("task_493_author_self_test_staged_audit");
    runGit(tempRoot, ["reset", "--", TASK_493_WORKFLOW_PATHS[0]]);
    writeFileSync(
      path.join(tempRoot, TASK_493_WORKFLOW_PATHS[0]),
      runGit(tempRoot, ["show", `HEAD:${TASK_493_WORKFLOW_PATHS[0]}`])
    );
    const originalBaseline = TASK_493_BASELINE_SHA;
    const head = runGit(tempRoot, ["rev-parse", "HEAD"]).toString("utf8").trim();
    // The self-test validates the same inventory/byte logic against a disposable Git repo.
    const verifierSource = readFileSync(new URL(import.meta.url), "utf8").replace(
      originalBaseline,
      head
    );
    const verifierPath = path.join(tempRoot, "bootstrap-verifier.mjs");
    writeFileSync(verifierPath, verifierSource, "utf8");
    const importOptions = {
      encoding: "utf8",
      env: { ...process.env, TASK_493_WORKFLOW_IMPORT: "1" },
    };
    const verify = () =>
      execFileSync(
        "node",
        [
          "--input-type=module",
          "--eval",
          `
        import { assertTask493Bootstrap } from ${JSON.stringify(`file://${verifierPath}`)};
        assertTask493Bootstrap(${JSON.stringify(tempRoot)});
      `,
        ],
        importOptions
      );
    const expectFailure = (prefix) =>
      execFileSync(
        "node",
        [
          "--input-type=module",
          "--eval",
          `
        import { assertTask493Bootstrap } from ${JSON.stringify(`file://${verifierPath}`)};
        try { assertTask493Bootstrap(${JSON.stringify(tempRoot)}); } catch (error) {
          if (String(error?.message).startsWith(${JSON.stringify(prefix)})) process.exit(0);
          throw error;
        }
        process.exit(1);
      `,
        ],
        { ...importOptions, stdio: ["ignore", "pipe", "pipe"] }
      );
    verify();

    const auditIdentity = "task-493:audit:self-test";
    const lowOnly = {
      pass: true,
      summary: "low only",
      findings: [
        {
          severity: "LOW",
          area: "test",
          finding: "test",
          evidence: "test:1",
          recommendation: "test",
        },
      ],
    };
    normalizeAuthorAuditResult(auditIdentity, lowOnly);
    const expectAuditFailure = (value, prefix) => {
      try {
        normalizeAuthorAuditResult(auditIdentity, value);
      } catch (error) {
        if (String(error?.message).startsWith(prefix)) return;
        throw error;
      }
      throw new Error(`task_493_author_self_test_expected_failure:${prefix}`);
    };
    expectAuditFailure({ ...lowOnly, findings: undefined }, "task_493_author_audit_invalid");
    expectAuditFailure({ ...lowOnly, findings: {} }, "task_493_author_audit_invalid");
    expectAuditFailure({ ...lowOnly, identity: auditIdentity }, "task_493_author_audit_invalid");
    expectAuditFailure({ ...lowOnly, unexpected: true }, "task_493_author_audit_invalid");
    expectAuditFailure(
      { ...lowOnly, summary: "x".repeat(MAX_AUDIT_FIELD_LENGTH + 1) },
      "task_493_author_audit_invalid"
    );
    expectAuditFailure(
      {
        ...lowOnly,
        findings: Array.from({ length: MAX_AUDIT_FINDINGS + 1 }, () => lowOnly.findings[0]),
      },
      "task_493_author_audit_invalid"
    );
    expectAuditFailure(
      { ...lowOnly, findings: [{ ...lowOnly.findings[0], severity: "OTHER" }] },
      "task_493_author_finding_invalid"
    );
    expectAuditFailure(
      {
        ...lowOnly,
        findings: [{ ...lowOnly.findings[0], evidence: "x".repeat(MAX_AUDIT_FIELD_LENGTH + 1) }],
      },
      "task_493_author_finding_invalid"
    );
    expectAuditFailure({ ...lowOnly, pass: false }, "task_493_author_audit_inconsistent");
    const receiptLensPayloads = TASK_493_AUTHOR_AUDIT_LENS_IDS.map(() => ({
      pass: true,
      summary: "clean",
      findings: [],
    }));
    const receiptReconcilePayload = { pass: true, summary: "clean", findings: [] };
    const receiptLenses = assertAuthorAuditReceiptInputs(
      receiptLensPayloads,
      receiptReconcilePayload
    ).lenses;
    let receiptInputsRejected = false;
    try {
      assertAuthorAuditReceiptInputs(receiptLensPayloads.slice(1), receiptReconcilePayload);
    } catch (error) {
      if (!String(error?.message).startsWith("task_493_author_receipt_inputs_invalid")) throw error;
      receiptInputsRejected = true;
    }
    if (!receiptInputsRejected) throw new Error("task_493_author_self_test_receipt_inputs");

    const auditFingerprint = captureAuditFingerprint(tempRoot);
    writeFileSync(
      path.join(tempRoot, "_docs/_workflows/ignored-audit-side-effect.mjs"),
      "export const sideEffect = true;\n",
      "utf8"
    );
    if (captureAuditFingerprint(tempRoot) === auditFingerprint)
      throw new Error("task_493_author_self_test_ignored_fingerprint");
    rmSync(path.join(tempRoot, "_docs/_workflows/ignored-audit-side-effect.mjs"));
    const emptyWorkflowDirectory = path.join(tempRoot, "_docs/_workflows/empty-audit-side-effect");
    mkdirSync(emptyWorkflowDirectory);
    if (captureAuditFingerprint(tempRoot) === auditFingerprint)
      throw new Error("task_493_author_self_test_empty_directory_fingerprint");
    rmSync(emptyWorkflowDirectory, { recursive: true });
    const tmpAuditFingerprint = captureAuditFingerprint(tempRoot);
    mkdirSync(path.join(tempRoot, ".tmp"));
    writeFileSync(
      path.join(tempRoot, ".tmp/ignored-audit-side-effect.txt"),
      "audit side effect\n",
      "utf8"
    );
    if (captureAuditFingerprint(tempRoot) === tmpAuditFingerprint)
      throw new Error("task_493_author_self_test_tmp_fingerprint");
    rmSync(path.join(tempRoot, ".tmp"), { recursive: true, force: true });
    const externalReceiptRoot = mkdtempSync(path.join(os.tmpdir(), "task-493-receipt-external-"));
    const receiptAncestor = path.join(tempRoot, "_docs/_workflows/_smoke/task-493");
    mkdirSync(path.dirname(receiptAncestor), { recursive: true });
    symlinkSync(externalReceiptRoot, receiptAncestor, "dir");
    let receiptAncestorSymlinkRejected = false;
    try {
      writeAuthorAuditReceipt(tempRoot, receiptLenses);
    } catch (error) {
      if (!String(error?.message).startsWith("task_493_author_receipt_ancestor_invalid:"))
        throw error;
      receiptAncestorSymlinkRejected = true;
    }
    if (!receiptAncestorSymlinkRejected || readdirSync(externalReceiptRoot).length !== 0)
      throw new Error("task_493_author_self_test_receipt_ancestor_symlink");
    rmSync(receiptAncestor);
    rmSync(externalReceiptRoot, { recursive: true, force: true });
    const receipt = writeAuthorAuditReceipt(tempRoot, [
      { identity: "task-493:audit:security" },
      { identity: "task-493:audit:ui" },
      { identity: "task-493:audit:workflow" },
    ]);
    if (assertTask493AuthorAuditReceipt(tempRoot).fingerprint !== receipt.fingerprint)
      throw new Error("task_493_author_self_test_receipt");
    const receiptTarget = assertReceiptTarget(tempRoot);
    const receiptBytes = readFileSync(receiptTarget);
    const forgedReceipt = JSON.parse(receiptBytes.toString("utf8"));
    forgedReceipt.lenses[2] = "task-493:audit:forged";
    writeFileSync(receiptTarget, `${JSON.stringify(forgedReceipt)}\n`, "utf8");
    let forgedLensRejected = false;
    try {
      assertTask493AuthorAuditReceipt(tempRoot);
    } catch (error) {
      if (!String(error?.message).startsWith("task_493_author_receipt_invalid")) throw error;
      forgedLensRejected = true;
    }
    if (!forgedLensRejected) throw new Error("task_493_author_self_test_receipt_lenses");
    writeFileSync(receiptTarget, receiptBytes);
    mkdirSync(path.join(tempRoot, "core"), { recursive: true });
    writeFileSync(
      path.join(tempRoot, "core/receipt-drift.ts"),
      "export const drift = true;\n",
      "utf8"
    );
    let staleReceiptRejected = false;
    try {
      assertTask493AuthorAuditReceipt(tempRoot);
    } catch (error) {
      if (!String(error?.message).startsWith("task_493_author_receipt_stale")) throw error;
      staleReceiptRejected = true;
    }
    if (!staleReceiptRejected) throw new Error("task_493_author_self_test_receipt_stale");
    rmSync(path.join(tempRoot, "core/receipt-drift.ts"));
    const modeBefore = captureAuditFingerprint(tempRoot);
    chmodSync(path.join(tempRoot, TASK_493_WORKFLOW_PATHS[0]), 0o755);
    if (captureAuditFingerprint(tempRoot) === modeBefore)
      throw new Error("task_493_author_self_test_mode_fingerprint");
    chmodSync(path.join(tempRoot, TASK_493_WORKFLOW_PATHS[0]), 0o644);
    writeFileSync(path.join(tempRoot, "core/target-a.ts"), "export const target = 'a';\n", "utf8");
    writeFileSync(path.join(tempRoot, "core/target-b.ts"), "export const target = 'b';\n", "utf8");
    const linkPath = path.join(tempRoot, "core/target.ts");
    symlinkSync("target-a.ts", linkPath);
    const symlinkBefore = captureAuditFingerprint(tempRoot);
    unlinkSync(linkPath);
    symlinkSync("target-b.ts", linkPath);
    if (captureAuditFingerprint(tempRoot) === symlinkBefore)
      throw new Error("task_493_author_self_test_symlink_fingerprint");
    unlinkSync(linkPath);

    const localExtra = path.join(tempRoot, "_docs/_workflows/task-493-local-only.mjs");
    writeFileSync(localExtra, "// ignored/local is non-authorizing\n", "utf8");
    verify();

    const firstPath = TASK_493_WORKFLOW_PATHS[0];
    const firstAbsolute = path.join(tempRoot, firstPath);
    const firstHeadBytes = runGit(tempRoot, ["show", `HEAD:${firstPath}`]);
    writeFileSync(firstAbsolute, "// dirty workflow\n", "utf8");
    expectFailure("task_493_workflow_head_bytes_mismatch:");
    writeFileSync(firstAbsolute, firstHeadBytes);

    rmSync(firstAbsolute);
    symlinkSync(path.basename(TASK_493_WORKFLOW_PATHS[1]), firstAbsolute);
    expectFailure("task_493_workflow_not_regular_file:");
    rmSync(firstAbsolute);
    writeFileSync(firstAbsolute, firstHeadBytes);

    rmSync(firstAbsolute);
    expectFailure("task_493_workflow_missing:");
    writeFileSync(firstAbsolute, firstHeadBytes);

    const lookalike = path.join(tempRoot, "_docs/_workflows/task-493-lookalike.js");
    const nested = path.join(tempRoot, "_docs/_workflows/task-493-nested/entry.mjs");
    mkdirSync(path.dirname(nested), { recursive: true });
    writeFileSync(lookalike, "// tracked lookalike\n", "utf8");
    writeFileSync(nested, "// tracked nested entry\n", "utf8");
    runGit(tempRoot, [
      "add",
      "-f",
      "_docs/_workflows/task-493-local-only.mjs",
      "_docs/_workflows/task-493-lookalike.js",
      "_docs/_workflows/task-493-nested/entry.mjs",
    ]);
    expectFailure("task_493_workflow_inventory_invalid:");
    const divergentRoot = mkdtempSync(path.join(os.tmpdir(), "task-493-divergent-"));
    try {
      runGit(divergentRoot, ["init", "-q"]);
      runGit(divergentRoot, ["config", "user.email", "task-493@example.invalid"]);
      runGit(divergentRoot, ["config", "user.name", "TASK-493 divergent self-test"]);
      for (const relativePath of TASK_493_WORKFLOW_PATHS) {
        const absolutePath = path.join(divergentRoot, relativePath);
        mkdirSync(path.dirname(absolutePath), { recursive: true });
        writeFileSync(absolutePath, `// ${relativePath}\n`, "utf8");
      }
      runGit(divergentRoot, ["add", ...TASK_493_WORKFLOW_PATHS]);
      runGit(divergentRoot, ["commit", "-qm", "baseline"]);
      const divergentBaseline = runGit(divergentRoot, ["rev-parse", "HEAD"])
        .toString("utf8")
        .trim();
      runGit(divergentRoot, ["checkout", "--orphan", "divergent"]);
      runGit(divergentRoot, ["add", ...TASK_493_WORKFLOW_PATHS]);
      runGit(divergentRoot, ["commit", "-qm", "divergent head"]);
      const divergentVerifierPath = path.join(divergentRoot, "bootstrap-verifier.mjs");
      writeFileSync(divergentVerifierPath, verifierSource.replace(head, divergentBaseline), "utf8");
      execFileSync(
        "node",
        [
          "--input-type=module",
          "--eval",
          `
        import { assertTask493Bootstrap } from ${JSON.stringify(`file://${divergentVerifierPath}`)};
        try { assertTask493Bootstrap(${JSON.stringify(divergentRoot)}); } catch (error) {
          if (String(error?.message).startsWith("task_493_baseline_not_ancestor:")) process.exit(0);
          throw error;
        }
        process.exit(1);
      `,
        ],
        { ...importOptions, stdio: ["ignore", "pipe", "pipe"] }
      );
    } finally {
      rmSync(divergentRoot, { recursive: true, force: true });
    }
    return Object.freeze({
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
    summary: { type: "string", minLength: 1, maxLength: MAX_AUDIT_FIELD_LENGTH },
    findings: {
      type: "array",
      maxItems: MAX_AUDIT_FINDINGS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "area", "finding", "evidence", "recommendation"],
        properties: {
          severity: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          area: { type: "string", minLength: 1, maxLength: MAX_AUDIT_FIELD_LENGTH },
          finding: { type: "string", minLength: 1, maxLength: MAX_AUDIT_FIELD_LENGTH },
          evidence: { type: "string", minLength: 1, maxLength: MAX_AUDIT_FIELD_LENGTH },
          recommendation: { type: "string", minLength: 1, maxLength: MAX_AUDIT_FIELD_LENGTH },
        },
      },
    },
  },
});

const AUDIT_RESULT_KEYS = Object.freeze(["pass", "summary", "findings"]);
const AUDIT_FINDING_KEYS = Object.freeze([
  "severity",
  "area",
  "finding",
  "evidence",
  "recommendation",
]);

function hasExactKeys(value, keys) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

export function normalizeAuthorAuditResult(identity, audit) {
  if (
    !hasExactKeys(audit, AUDIT_RESULT_KEYS) ||
    typeof audit.pass !== "boolean" ||
    typeof audit.summary !== "string" ||
    audit.summary.trim().length === 0 ||
    audit.summary.length > MAX_AUDIT_FIELD_LENGTH ||
    !Array.isArray(audit.findings) ||
    audit.findings.length > MAX_AUDIT_FINDINGS
  )
    throw new Error("task_493_author_audit_invalid");
  for (const finding of audit.findings) {
    if (
      !hasExactKeys(finding, AUDIT_FINDING_KEYS) ||
      !["HIGH", "MEDIUM", "LOW"].includes(finding.severity) ||
      AUDIT_FINDING_KEYS.slice(1).some(
        (key) =>
          typeof finding[key] !== "string" ||
          finding[key].trim().length === 0 ||
          finding[key].length > MAX_AUDIT_FIELD_LENGTH
      )
    )
      throw new Error("task_493_author_finding_invalid");
  }
  const blockers = audit.findings.filter(
    (finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM"
  );
  if (audit.pass !== (blockers.length === 0)) throw new Error("task_493_author_audit_inconsistent");
  return Object.freeze({ identity, ...audit });
}

function assertAuditClean(label, identity, audit) {
  const normalized = normalizeAuthorAuditResult(identity, audit);
  const blockers = normalized.findings.filter(
    (finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM"
  );
  if (blockers.length) throw new Error(`${label}:blocked:${JSON.stringify(blockers)}`);
  return normalized;
}

const COMMON = `Repository: ${ROOT}
Baseline: ${TASK_493_BASELINE_SHA}; task: TASK-493; changelog: 1309.
Read current HEAD, status and diff first. The pre-existing untracked
_TMP-task-dispatch-plan-2026-08-10.md is owner state and must stay untouched.
Read root AGENTS.md, TASK-493, task board, related TASK-545/548/551 contracts,
README/CONTRIBUTING, architecture/API/RBAC/security/testing docs, current source
and tests. No files may be edited. Ground every finding against current bytes
with file:line evidence, order findings by severity, and do not expose secrets,
credentials, private data, or raw sensitive logs. pass=true means zero HIGH or
MEDIUM findings; LOW remains visible. Verify cache scope stays with TASK-551-09-L02,
the pure browser-safe contract boundary, exact one-snapshot RBAC, present-only
payload behavior, hydration/draft preservation, static smoke seam ownership,
workflow bootstrap, validation lanes, and line-count limits.`;

// The three TASK-493 author/audit lenses, each pinned to a real declared
// audited file so the canonical driver's trusted `file:<path>` identity holds.
// The audit itself stays lens-scoped (the TASK-493 receipt records exactly
// these three lens identities plus the reconcile identity).
const AUTHOR_AUDIT_LENS_GROUPS = Object.freeze([
  Object.freeze({
    repoRelativePath: "_docs/_TASKS/TASK-493_SEO_Indexing_And_Search_Performance_Pipeline.md",
    identity: TASK_493_AUTHOR_AUDIT_LENS_IDS[0],
    prompt:
      "Audit SEO routes/GSC/sitemap schema, route auth/RBAC/CSRF, error mapping and real HTTP test feasibility.",
  }),
  Object.freeze({
    repoRelativePath: "core/admin/services/seoClient.ts",
    identity: TASK_493_AUTHOR_AUDIT_LENS_IDS[1],
    prompt:
      "Audit Admin SEO client, SeoManagerPage real-data rewire, cache behavior, and browser-boundary tests.",
  }),
  Object.freeze({
    repoRelativePath: "_docs/_workflows/task-493-author-audit.mjs",
    identity: TASK_493_AUTHOR_AUDIT_LENS_IDS[2],
    prompt:
      "Audit workflow, smoke architecture, task graph, writer ownership, validation and closure rules.",
  }),
]);

function currentAuditContext() {
  const head = runGit(ROOT, ["rev-parse", "HEAD"]).toString("utf8").trim();
  const dirty = runGit(ROOT, ["status", "--porcelain"])
    .toString("utf8")
    .split("\n")
    .filter(Boolean)
    .sort();
  return `Repository: ${ROOT}\nHEAD: ${head}\nDirty: ${JSON.stringify(dirty)}`;
}

async function runWorkflow() {
  // Lazy dynamic import: the bootstrap self-test copies this module into a
  // disposable repo that contains only the four workflow entries, so a static
  // top-level import of lib/audit-rounds.mjs would fail its verifier. The
  // canonical driver is only needed on the live run path.
  const { runCanonicalAuditRounds } = await import("./lib/audit-rounds.mjs");
  phase("Bootstrap verification");
  const bootstrap = assertTask493Bootstrap();
  assertAuthorDispatchState();
  phase("Contract audit");
  const auditPayloads = new Map();
  const drift = await runCanonicalAuditRounds({
    // Read-only pre-implementation audit: one complete pass, then a blocking
    // fixer so any HIGH/MEDIUM finding aborts exactly like the historical
    // assertAuditClean throw instead of being silently repaired.
    maximumFixPasses: 1,
    groups: AUTHOR_AUDIT_LENS_GROUPS,
    auditFile: async (group) => {
      assertTask493Bootstrap();
      assertAuthorDispatchState();
      const payload = await assertReadOnlyAudit(`contract_audit:${group.repoRelativePath}`, () =>
        agent(
          `${currentAuditContext()}\n${COMMON}\n${group.prompt}\nReturn only the declared audit payload.`,
          { label: group.identity, phase: "Contract audit", schema: AUDIT_SCHEMA }
        )
      );
      auditPayloads.set(group.identity, payload);
      return normalizeAuthorAuditResult(group.identity, payload);
    },
    reconcile: async () => {
      assertTask493Bootstrap();
      assertAuthorDispatchState();
      const payload = await assertReadOnlyAudit("reconcile", () =>
        agent(
          `${currentAuditContext()}\n${COMMON}\nRead only the shared contracts/seams. Reconcile type names, allowed fields, ownership, test paths, exact seven smoke IDs, writer order, land order, exact calendar parsing, Post cache generation, snapshot authority, and pinned closure deltas. Return only the declared audit payload.`,
          { label: "task-493:audit:reconcile", phase: "Cross-file reconcile", schema: AUDIT_SCHEMA }
        )
      );
      auditPayloads.set("task-493:audit:reconcile", payload);
      return normalizeAuthorAuditResult("task-493:audit:reconcile", payload);
    },
    fix: async (actionable, round) => {
      // No fixer exists for a read-only contract audit: blockers abort and
      // require owner-driven repair before a fresh complete pass.
      throw new Error(`task_493_author_audit_blocked:round=${round}:${JSON.stringify(actionable)}`);
    },
    fingerprint: () => auditFingerprintDigest(ROOT),
    fingerprintUniverse: () => auditFingerprintDigest(ROOT),
    fingerprintEveryScope: () =>
      Object.fromEntries(
        AUTHOR_AUDIT_LENS_GROUPS.map((group) => [
          group.repoRelativePath,
          auditFingerprintDigest(ROOT),
        ])
      ),
    label: "task-493:author-audit",
  });
  if (!drift.pass) {
    return Object.freeze({ pass: false, reason: "audit_not_converged", findings: drift.findings });
  }
  const lensPayloads = TASK_493_AUTHOR_AUDIT_LENS_IDS.map((identity) =>
    auditPayloads.get(identity)
  );
  const reconcilePayload = auditPayloads.get("task-493:audit:reconcile");
  if (lensPayloads.some((payload) => payload === undefined) || reconcilePayload === undefined) {
    throw new Error("task_493_author_audit_missing_results");
  }
  const checked = assertAuthorAuditReceiptInputs(lensPayloads, reconcilePayload);
  const receipt = recordTask493AuthorAuditReceipt(ROOT, lensPayloads, reconcilePayload);
  return Object.freeze({
    pass: true,
    bootstrap,
    lenses: checked.lenses,
    reconcile: checked.reconcile,
    receipt,
  });
}

const importedForVerification = process.env.TASK_493_WORKFLOW_IMPORT === "1";
const isDirectInvocation = () => {
  try {
    return (
      typeof process.argv[1] === "string" &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
};
if (importedForVerification && isDirectInvocation())
  throw new Error("task_493_workflow_import_direct_invocation");
const mode = importedForVerification ? "import" : parseMode();
export const result =
  mode === "self-test"
    ? await bootstrapSelfTest()
    : mode === "verify"
      ? assertTask493Bootstrap()
      : importedForVerification
        ? null
        : await runWorkflow();
if (mode !== "run" && mode !== "import") process.stdout.write(`${JSON.stringify(result)}\n`);
