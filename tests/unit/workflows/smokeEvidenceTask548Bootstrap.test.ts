// TASK-545-03-L05 TASK-548 committed bootstrap gate tests (Bun lane). Reuses
// the TASK-545-03-L01/L03 temporary Git-repository corpus pattern: the six
// TASK-548 files do not exist in the real repository, so every authorization
// fixture builds and commits them in an isolated temporary repo and verifies
// the branded receipt against the live Git proof. Owns: receipt round-trip,
// every root/nested key/path/order/hash/HEAD/parent/aggregate/workflow-entry
// mutation rejection, missing/stale/wrong-entry rejection, reordering,
// intervening-action and unknown-phase-1-option rejection, the
// createResumeCheckpoint rejection, and the branded receipt only after live
// direct-parent/diff/tracked-byte checks.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";

import { createResumeCheckpoint } from "../../../_docs/_workflows/lib/smoke-evidence-checkpoint.mjs";
import { SmokeEvidenceError, canonicalJson } from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import {
  TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1,
  normalizeTask548CommittedSixPathBootstrapReceiptV1,
  requireTask548CommittedSixPathBootstrapAuthorizationV1,
} from "../../../_docs/_workflows/lib/smoke-evidence-task548.mjs";
import {
  TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1 as reexportedPaths,
  normalizeTask548CommittedSixPathBootstrapReceiptV1 as reexportedNormalize,
  requireTask548CommittedSixPathBootstrapAuthorizationV1 as reexportedRequire,
} from "../../../_docs/_workflows/lib/smoke-evidence.mjs";
import type {
  Task548CommittedBootstrapFileV1,
  Task548CommittedBootstrapSixFilesV1,
  Task548CommittedSixPathBootstrapReceiptV1,
  VerifiedTask548CommittedSixPathBootstrapReceiptV1,
} from "../../../_docs/_workflows/lib/smoke-evidence-task548.mjs";

const FIXTURES = resolve(import.meta.dir, "../../fixtures/workflows/smoke-evidence/task548");
const SIX_PATHS = TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1;
const RECEIPT_SCHEMA = "coderso.task548-committed-bootstrap@v1";
const WORKFLOW_ENTRY = "_docs/_workflows/task-548-implement.mjs";
const CLOSEOUT_ENTRY = "_docs/_workflows/task-548-closeout.mjs";

const sha = (text: string): string => createHash("sha256").update(text).digest("hex");

// Deterministic synthetic TASK-548 file contents. The implement entry must
// import a canonical `./lib/` driver and carry no staging pattern so the
// static/import gate is green by default; every other file is inert.
const CONTENT: Record<string, string> = {
  "_docs/_workflows/lib/task-548-contract.mjs": "export const TASK_548_CONTRACT = 1;\n",
  "_docs/_workflows/task-548-author-audit.mjs": "export async function authorAudit() { return true; }\n",
  "_docs/_workflows/task-548-fix.mjs": "export async function fix() { return true; }\n",
  "_docs/_workflows/task-548-implement.mjs": [
    'import { normalizeTask548CommittedSixPathBootstrapReceiptV1 } from "./lib/smoke-evidence-task548.mjs";',
    "export async function phase1(receipt) {",
    "  return normalizeTask548CommittedSixPathBootstrapReceiptV1(receipt);",
    "}",
    "",
  ].join("\n"),
  "tests/unit/workflows/task548AuthorAudit.test.ts": "import { test } from 'bun:test';\ntest('audit', () => {});\n",
  "tests/unit/workflows/task548WorkflowContracts.test.ts": "import { test } from 'bun:test';\ntest('contracts', () => {});\n",
};

let fixture: Task548CommittedSixPathBootstrapReceiptV1 | undefined;
async function loadFixture(): Promise<Task548CommittedSixPathBootstrapReceiptV1> {
  if (fixture === undefined) {
    fixture = JSON.parse(await readFile(join(FIXTURES, "receipt-v1.json"), "utf8")) as Task548CommittedSixPathBootstrapReceiptV1;
  }
  return fixture;
}

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof SmokeEvidenceError) return error.code;
    throw error;
  }
  throw new Error("expected SmokeEvidenceError");
}

async function errorCodeAsync(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof SmokeEvidenceError) return error.code;
    throw error;
  }
  throw new Error("expected SmokeEvidenceError");
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" },
  }).trim();
}

const tempRoots: string[] = [];

async function makeRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "smoke-task548-test-"));
  tempRoots.push(root);
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  await writeFile(join(root, "source.txt"), "v1\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "init"]);
  return root;
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function contentFor(path: string, implementSource?: string): string {
  return path === WORKFLOW_ENTRY && implementSource !== undefined ? implementSource : CONTENT[path];
}

function sixFilesFor(implementSource?: string): Task548CommittedBootstrapSixFilesV1 {
  const entry = (path: (typeof SIX_PATHS)[number]): Task548CommittedBootstrapFileV1 => ({
    path,
    sha256: sha(contentFor(path, implementSource)),
  });
  return [
    entry(SIX_PATHS[0]),
    entry(SIX_PATHS[1]),
    entry(SIX_PATHS[2]),
    entry(SIX_PATHS[3]),
    entry(SIX_PATHS[4]),
    entry(SIX_PATHS[5]),
  ];
}

function computeReceipt(
  priorHead: string,
  head: string,
  files: Task548CommittedBootstrapSixFilesV1,
): Task548CommittedSixPathBootstrapReceiptV1 {
  const aggregateSha256 = sha(`${canonicalJson({ priorHead, files })}\n`);
  return {
    schema: RECEIPT_SCHEMA,
    taskId: "TASK-548",
    priorHead,
    head,
    workflowEntry: WORKFLOW_ENTRY,
    files,
    aggregateSha256,
  };
}

async function commitBootstrap(
  root: string,
  overrides: { implementSource?: string; extraFiles?: string[] } = {},
): Promise<{ root: string; priorHead: string; head: string; receipt: Task548CommittedSixPathBootstrapReceiptV1 }> {
  const priorHead = git(root, ["rev-parse", "HEAD"]).trim();
  for (const path of SIX_PATHS) {
    const absolute = join(root, ...path.split("/"));
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, contentFor(path, overrides.implementSource));
  }
  const addPaths: string[] = [...SIX_PATHS];
  for (const extra of overrides.extraFiles ?? []) {
    const absolute = join(root, ...extra.split("/"));
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, "extra\n");
    addPaths.push(extra);
  }
  git(root, ["add", ...addPaths]);
  git(root, ["commit", "-q", "-m", "task-548 bootstrap"]);
  const head = git(root, ["rev-parse", "HEAD"]).trim();
  const files = sixFilesFor(overrides.implementSource);
  return { root, priorHead, head, receipt: computeReceipt(priorHead, head, files) };
}

function authorize(root: string, receipt: unknown): Promise<VerifiedTask548CommittedSixPathBootstrapReceiptV1> {
  return requireTask548CommittedSixPathBootstrapAuthorizationV1({ repoRoot: root, receipt });
}

describe("TASK_548_COMMITTED_BOOTSTRAP_PATHS_V1", () => {
  test("is the exact order-sensitive six-path committed bootstrap set", () => {
    expect([...SIX_PATHS]).toEqual([
      "_docs/_workflows/lib/task-548-contract.mjs",
      "_docs/_workflows/task-548-author-audit.mjs",
      "_docs/_workflows/task-548-fix.mjs",
      "_docs/_workflows/task-548-implement.mjs",
      "tests/unit/workflows/task548AuthorAudit.test.ts",
      "tests/unit/workflows/task548WorkflowContracts.test.ts",
    ]);
    expect(Object.isFrozen(SIX_PATHS)).toBe(true);
    expect(SIX_PATHS).not.toContain(CLOSEOUT_ENTRY);
    expect(new Set(SIX_PATHS).size).toBe(6);
  });
});

describe("normalizeTask548CommittedSixPathBootstrapReceiptV1", () => {
  test("round-trips the committed-bootstrap receipt fixture", async () => {
    const base = await loadFixture();
    const normalized = normalizeTask548CommittedSixPathBootstrapReceiptV1(JSON.parse(JSON.stringify(base)));
    expect(normalized).toEqual(base);
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(Object.isFrozen(normalized.files)).toBe(true);
    expect(Object.isFrozen(normalized.files[0])).toBe(true);
    expect(JSON.parse(canonicalJson(normalized))).toEqual(JSON.parse(canonicalJson(base)));
    expect(normalized.schema).toBe(RECEIPT_SCHEMA);
    expect(normalized.taskId).toBe("TASK-548");
    expect(normalized.workflowEntry).toBe(WORKFLOW_ENTRY);
  });

  test("rejects unknown or missing root fields and non-record input", async () => {
    const base = await loadFixture();
    const withExtra = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    withExtra.override = true;
    expect(errorCode(() => normalizeTask548CommittedSixPathBootstrapReceiptV1(withExtra))).toBe("smoke_schema_invalid");
    const missing = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    delete missing.files;
    expect(errorCode(() => normalizeTask548CommittedSixPathBootstrapReceiptV1(missing))).toBe("smoke_schema_invalid");
    expect(errorCode(() => normalizeTask548CommittedSixPathBootstrapReceiptV1("not a record"))).toBe("smoke_schema_invalid");
    expect(errorCode(() => normalizeTask548CommittedSixPathBootstrapReceiptV1(null))).toBe("smoke_schema_invalid");
  });

  test("rejects every root key mutation", async () => {
    const base = await loadFixture();
    const cases: Array<[string, (value: unknown) => unknown, string]> = [
      ["schema", () => "coderso.task548-committed-bootstrap@v2", "smoke_task548_schema_invalid"],
      ["schema", () => 42, "smoke_task548_schema_invalid"],
      ["taskId", () => "TASK-549", "smoke_task548_schema_invalid"],
      ["taskId", () => 548, "smoke_task548_schema_invalid"],
      ["priorHead", () => "0".repeat(39), "smoke_task548_hash_invalid"],
      ["priorHead", () => "A1".repeat(20), "smoke_task548_hash_invalid"],
      ["priorHead", () => null, "smoke_task548_hash_invalid"],
      ["head", () => "0".repeat(39), "smoke_task548_hash_invalid"],
      ["head", () => "z".repeat(40), "smoke_task548_hash_invalid"],
      ["workflowEntry", () => CLOSEOUT_ENTRY, "smoke_task548_schema_invalid"],
      ["workflowEntry", () => "task-548-implement.mjs", "smoke_task548_schema_invalid"],
      ["aggregateSha256", () => "0".repeat(63), "smoke_task548_hash_invalid"],
      ["aggregateSha256", () => "0".repeat(64), "smoke_task548_aggregate_mismatch"],
    ];
    for (const [key, mutate, code] of cases) {
      const copy = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
      copy[key] = mutate(copy[key]);
      expect(errorCode(() => normalizeTask548CommittedSixPathBootstrapReceiptV1(copy)), `root key ${key}`).toBe(code);
    }
  });

  test("rejects every nested files mutation", async () => {
    const base = await loadFixture();
    const files = (): Task548CommittedBootstrapFileV1[] => JSON.parse(JSON.stringify(base.files));
    const cases: Array<[string, (value: Task548CommittedBootstrapFileV1[]) => unknown, string]> = [
      ["not an array", () => "nope", "smoke_task548_schema_invalid"],
      ["too few", (value) => value.slice(0, 5), "smoke_task548_schema_invalid"],
      ["too many", (value) => [...value, { ...value[0] }], "smoke_task548_schema_invalid"],
      ["entry not a record", (value) => [value[0], "x", value[2], value[3], value[4], value[5]], "smoke_schema_invalid"],
      ["entry unknown key", (value) => [value[0], { ...value[1], extra: 1 }, value[2], value[3], value[4], value[5]], "smoke_schema_invalid"],
      ["entry missing key", (value) => [value[0], { path: value[1].path }, value[2], value[3], value[4], value[5]], "smoke_schema_invalid"],
      ["hash grammar", (value) => [value[0], { ...value[1], sha256: "0".repeat(63) }, value[2], value[3], value[4], value[5]], "smoke_task548_hash_invalid"],
      ["reordered", (value) => [value[1], value[0], value[2], value[3], value[4], value[5]], "smoke_task548_path_invalid"],
      ["substituted path", (value) => [value[0], { ...value[1], path: CLOSEOUT_ENTRY }, value[2], value[3], value[4], value[5]], "smoke_task548_path_invalid"],
      ["duplicate path", (value) => [value[0], value[0], value[2], value[3], value[4], value[5]], "smoke_task548_path_invalid"],
      ["valid-hash mutation", (value) => [value[0], { ...value[1], sha256: sha("other content") }, value[2], value[3], value[4], value[5]], "smoke_task548_aggregate_mismatch"],
    ];
    for (const [label, mutate, code] of cases) {
      const copy = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
      copy.files = mutate(files());
      expect(errorCode(() => normalizeTask548CommittedSixPathBootstrapReceiptV1(copy)), label).toBe(code);
    }
  });

  test("a grammar-valid HEAD mutation passes schema but is caught live", async () => {
    const base = await loadFixture();
    const copy = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    copy.head = "c3".repeat(20);
    const normalized = normalizeTask548CommittedSixPathBootstrapReceiptV1(copy);
    expect(normalized.head).toBe("c3".repeat(20));
  });

  test("a grammar-valid priorHead mutation breaks the recomputed aggregate", async () => {
    const base = await loadFixture();
    const copy = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
    copy.priorHead = "c3".repeat(20);
    expect(errorCode(() => normalizeTask548CommittedSixPathBootstrapReceiptV1(copy))).toBe("smoke_task548_aggregate_mismatch");
  });

  test("receipt type is a strict literal contract", async () => {
    const base = await loadFixture();
    const typed: Task548CommittedSixPathBootstrapReceiptV1 = base;
    void typed;
    const files: Task548CommittedBootstrapSixFilesV1 = base.files;
    void files;
    const first: Task548CommittedBootstrapFileV1 = base.files[0];
    void first;
    // @ts-expect-error schema is the literal v1 value
    const badSchema: Task548CommittedSixPathBootstrapReceiptV1 = { ...base, schema: "coderso.task548-committed-bootstrap@v2" };
    void badSchema;
    // @ts-expect-error taskId is the literal TASK-548 value
    const badTask: Task548CommittedSixPathBootstrapReceiptV1 = { ...base, taskId: "TASK-549" };
    void badTask;
    // @ts-expect-error workflowEntry is the literal implement path
    const badEntry: Task548CommittedSixPathBootstrapReceiptV1 = { ...base, workflowEntry: CLOSEOUT_ENTRY };
    void badEntry;
  });
});

describe("requireTask548CommittedSixPathBootstrapAuthorizationV1", () => {
  test("brands the receipt only after the live committed-bootstrap proof", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    const verified = await authorize(root, receipt);
    expect(Object.isFrozen(verified)).toBe(true);
    expect(Object.isFrozen(verified.files)).toBe(true);
    expect(Object.getOwnPropertySymbols(verified)).toHaveLength(1);
    expect(JSON.parse(canonicalJson(verified))).toEqual(JSON.parse(canonicalJson(receipt)));
    const typed: VerifiedTask548CommittedSixPathBootstrapReceiptV1 = verified;
    void typed;
    // idempotent: a branded receipt re-authorizes
    const again = await authorize(root, verified);
    expect(Object.getOwnPropertySymbols(again)).toHaveLength(1);
  });

  test("rejects a missing receipt option and a non-record receipt", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    expect(
      await errorCodeAsync(() =>
        requireTask548CommittedSixPathBootstrapAuthorizationV1({ repoRoot: root } as never),
      ),
    ).toBe("smoke_schema_invalid");
    expect(await errorCodeAsync(() => authorize(root, "not a receipt"))).toBe("smoke_schema_invalid");
    expect(await errorCodeAsync(() => authorize(root, null))).toBe("smoke_schema_invalid");
  });

  test("rejects an unknown phase-1 option", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    expect(
      await errorCodeAsync(() =>
        requireTask548CommittedSixPathBootstrapAuthorizationV1({ repoRoot: root, receipt, nonce: "x" } as never),
      ),
    ).toBe("smoke_schema_invalid");
  });

  test("rejects a stale current HEAD", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    await writeFile(join(root, "unrelated.txt"), "x\n");
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "intervening commit"]);
    expect(await errorCodeAsync(() => authorize(root, receipt))).toBe("smoke_task548_head_stale");
  });

  test("rejects when priorHead is not the single direct parent", async () => {
    const root = await makeRepo();
    const { priorHead, receipt } = await commitBootstrap(root);
    await writeFile(join(root, "extra.txt"), "x\n");
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "extra commit"]);
    const laterHead = git(root, ["rev-parse", "HEAD"]).trim();
    const bogus = computeReceipt(priorHead, laterHead, [...receipt.files]);
    expect(await errorCodeAsync(() => authorize(root, bogus))).toBe("smoke_task548_parent_mismatch");
  });

  test("rejects when the committed diff is not exactly the six paths", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root, { extraFiles: [CLOSEOUT_ENTRY] });
    expect(await errorCodeAsync(() => authorize(root, receipt))).toBe("smoke_task548_diff_mismatch");
  });

  test("rejects a faked tracked byte hash", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    const [f0, f1, f2, f3, f4, f5] = receipt.files;
    const forgedFiles: Task548CommittedBootstrapSixFilesV1 = [
      f0,
      f1,
      f2,
      { path: f3.path, sha256: sha("different content") },
      f4,
      f5,
    ];
    const forged = computeReceipt(receipt.priorHead, receipt.head, forgedFiles);
    expect(await errorCodeAsync(() => authorize(root, forged))).toBe("smoke_task548_byte_mismatch");
  });

  test("rejects a dirty worktree for one of the six paths", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    await appendFile(join(root, ...SIX_PATHS[2].split("/")), "// dirty\n");
    expect(await errorCodeAsync(() => authorize(root, receipt))).toBe("smoke_task548_dirty");
  });

  test("rejects a symlinked six-path entry", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    const target = join(root, ...SIX_PATHS[4].split("/"));
    await rm(target);
    await symlink(join(root, "source.txt"), target);
    expect(await errorCodeAsync(() => authorize(root, receipt))).toBe("smoke_task548_entry_symlink");
  });

  test("rejects a workflow entry that fails the static/import gates", async () => {
    const root = await makeRepo();
    const noImport = "export async function phase1() { return true; }\n";
    const { receipt: badImportReceipt } = await commitBootstrap(root, { implementSource: noImport });
    expect(await errorCodeAsync(() => authorize(root, badImportReceipt))).toBe("smoke_task548_static_contract");

    const root2 = await makeRepo();
    const staged = [
      'import { normalizeTask548CommittedSixPathBootstrapReceiptV1 } from "./lib/smoke-evidence-task548.mjs";',
      'execSync("git add .");',
      "",
    ].join("\n");
    const { receipt: stagedReceipt } = await commitBootstrap(root2, { implementSource: staged });
    expect(await errorCodeAsync(() => authorize(root2, stagedReceipt))).toBe("smoke_task548_static_contract");
  });

  test("rejects when the live Git proof is absent", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    const fresh = await makeRepo();
    expect(await errorCodeAsync(() => authorize(fresh, receipt))).toBe("smoke_task548_head_stale");
  });

  test("rejects a wrong-entry receipt", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    const wrongEntry = { ...receipt, workflowEntry: CLOSEOUT_ENTRY };
    expect(await errorCodeAsync(() => authorize(root, wrongEntry))).toBe("smoke_task548_schema_invalid");
  });

  test("rejects reordered six paths", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    const reordered = computeReceipt(receipt.priorHead, receipt.head, [
      receipt.files[1], receipt.files[0], receipt.files[2], receipt.files[3], receipt.files[4], receipt.files[5],
    ]);
    expect(await errorCodeAsync(() => authorize(root, reordered))).toBe("smoke_task548_path_invalid");
  });

  test("rejects an intervening action between the gate and the phase-1 call", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    const verified = await authorize(root, receipt);
    // intervening worktree edit on one of the six files
    await appendFile(join(root, ...SIX_PATHS[0].split("/")), "// touched\n");
    expect(await errorCodeAsync(() => authorize(root, verified))).toBe("smoke_task548_dirty");

    const root2 = await makeRepo();
    const second = await commitBootstrap(root2);
    const verified2 = await authorize(root2, second.receipt);
    // intervening commit between the gate and the phase-1 call
    await writeFile(join(root2, "extra.txt"), "x\n");
    git(root2, ["add", "."]);
    git(root2, ["commit", "-q", "-m", "intervening commit"]);
    expect(await errorCodeAsync(() => authorize(root2, verified2))).toBe("smoke_task548_head_stale");
  });

  test("rejects passing the receipt into createResumeCheckpoint", async () => {
    const root = await makeRepo();
    const { receipt } = await commitBootstrap(root);
    expect(await errorCodeAsync(() => createResumeCheckpoint(receipt as never))).toBe("smoke_schema_invalid");
    const verified = await authorize(root, receipt);
    expect(await errorCodeAsync(() => createResumeCheckpoint(verified as never))).toBe("smoke_schema_invalid");
  });
});

describe("smoke-evidence.mjs thin re-export surface", () => {
  test("exposes the exact three TASK-548 entry points", () => {
    expect(reexportedPaths).toEqual(SIX_PATHS);
    expect(reexportedPaths).toBe(SIX_PATHS);
    expect(reexportedNormalize).toBe(normalizeTask548CommittedSixPathBootstrapReceiptV1);
    expect(reexportedRequire).toBe(requireTask548CommittedSixPathBootstrapAuthorizationV1);
  });
});
