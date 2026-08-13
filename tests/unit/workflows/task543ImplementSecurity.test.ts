import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dir, "../../..");
const workflowPath = path.join(root, "_docs/_workflows/task-543-implement.mjs");
const libDir = path.join(root, "_docs/_workflows/lib");

function readWorkflow(): string {
  return readFileSync(workflowPath, "utf8");
}

function readLib(name: string): string {
  return readFileSync(path.join(libDir, name), "utf8");
}

test("TASK-543 CodeQL self-test passes before workflow side effects", () => {
  const result = spawnSync("node", [workflowPath, "--codeql-self-test"], {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
  });

  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  const output = JSON.parse(result.stdout);
  expect(output).toMatchObject({
    pass: true,
    evidenceOperations: 7,
    transientOperations: 4,
    zeroTransientKinds: 3,
    resetOperations: 1,
    compiledOperations: 12,
    credentialDigestCalls: 0,
    ordinaryDigestCalls: 2,
    negativeCases: 26,
  });
  expect(output.maximumCommandBytes).toBeGreaterThan(0);
  expect(output.maximumCommandBytes).toBeLessThan(10_000);

  const source = readWorkflow();
  const branchIndex = source.indexOf('if (process.argv.includes("--codeql-self-test"))');
  const phaseIndex = source.indexOf('phase("Start gate")');
  const dispatchIndex = source.indexOf("await agent(", phaseIndex);
  expect(branchIndex).toBeGreaterThan(0);
  expect(branchIndex).toBeLessThan(phaseIndex);
  expect(branchIndex).toBeLessThan(dispatchIndex);
});

test("scenario values cross the run-code boundary only as bounded canonical data", () => {
  const source = readLib("task-543-smoke-operation-code.mjs");

  expect(source).toContain("function validateEvidenceOperationPayload(operation, input)");
  expect(source).toContain("function canonicalEvidenceOperationEncoding(operation, input)");
  expect(source).toContain("function codeQlSafeJavaScriptStringLiteral(value)");
  expect(source).toContain("function buildEvidenceOperationRunCodeSource(operation, input)");
  expect(source).toContain('return source.replace(/\\r?\\n[\\t ]*/gu, " ")');
  expect(readLib("task-543-smoke-schema.mjs")).toContain("const RUN_CODE_COMMAND_MAX_BYTES = 10_000");
  expect(source).toContain('Buffer.byteLength(command, "utf8") >= RUN_CODE_COMMAND_MAX_BYTES');
  expect(source).toContain('Buffer.byteLength(json, "utf8") > RUN_CODE_PAYLOAD_MAX_BYTES');
  expect(source).toContain('decoded.toString("base64url") !== encoded');
  expect(source).toContain('.replace(/</gu, "\\\\u003c")');
  expect(source).toContain('.replace(/\\//gu, "\\\\u002f")');
  expect(source).toContain("canonical(envelope) !== json");
  expect(source).toContain('!value.includes("\\\\0")');
  expect(source).not.toContain("function evidenceAssertionBody(");
  expect(source).not.toContain("function transientAssertionBody(");
  expect(source).not.toContain("${evidenceAssertionBody(");
  expect(source).not.toContain("${transientAssertionBody(");
  expect(source).not.toContain("const body = transientAssertionBody");
  expect(source).not.toContain("eval(");
  expect(source).not.toContain("new Function(");
});

test("host switch emits one complete bounded source per operation", () => {
  const source = readLib("task-543-smoke-operation-code.mjs");
  const start = source.indexOf("function buildEvidenceOperationRunCodeSource(operation, input)");
  const end = source.indexOf("function smokeRunOperation(operation, input)", start);
  const builder = source.slice(start, end);

  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  expect(builder).toContain("switch (operation)");
  expect(builder.match(/^    case "(?:assert-|reset-scenario)/gmu)).toHaveLength(12);
  expect(builder.match(/const operationMarker = "wf543-operation:/gu)).toHaveLength(12);
  expect(builder.match(/source = `async \(page\) => \{/gu)).toHaveLength(12);
  expect(builder).not.toContain("const operationKinds =");
  expect(builder).not.toContain("if (operation ===");
  expect(readLib("task-543-codeql-self-test.mjs")).toContain(
    "contains the ${otherOperation} operation marker"
  );
  expect(readLib("task-543-smoke-scenario-validation.mjs")).toContain(
    "isFullSmokeCliCommand(command)"
  );
});

test("all final, transient, zero-command, and reset operations are closed mappings", () => {
  const source = readLib("task-543-smoke-scenario-validation.mjs");

  for (const operation of [
    "assert-clean-close",
    "assert-dirty-delayed-close",
    "assert-pending-revert-restoration",
    "assert-failure-retry",
    "assert-double-close",
    "assert-table-keyboard",
    "assert-mid-viewport-metadata",
    "assert-transient-dirty-delayed-close",
    "assert-transient-pending-revert-restoration",
    "assert-transient-failure-retry",
    "assert-transient-double-close",
    "reset-scenario",
  ]) {
    expect(source).toContain(`"${operation}"`);
  }

  expect(source).toContain('case "clean-close":\n      return smokeRunOperation');
  expect(source).toContain(
    'case "table-keyboard":\n    case "mid-viewport-metadata":\n      return [];'
  );
  expect(source).toContain('return smokeRunOperation("reset-scenario", {');
  expect(source).toContain('throw new Error("unknown TASK-543 smoke kind")');
});

test("password receipts are classified before secret-free SHA-256 integrity", () => {
  const source = readLib("task-543-smoke-timeline.mjs");

  expect(source).toContain("function credentialReceiptValidWithoutDigest(");
  expect(source).toContain("function bootstrapPasswordReceiptValid(smoke)");
  expect(source).toContain("function successTimelineReceiptIntegrityValid(");
  expect(source).toContain("function failurePrefixTimelineReceiptIntegrityValid(");
  expect(source).toContain('record?.scope === "browser:password" ||');
  expect(source).toContain("record?.command === SMOKE_PASSWORD_FILL_COMMAND");
  expect(source).toContain("bootstrapPasswordReceiptValid(smoke) &&");
  expect(source).toContain("successTimelineReceiptIntegrityValid(record, smoke) &&");
  expect(readLib("task-543-smoke-cleanup-validation.mjs")).toContain(
    "failurePrefixTimelineReceiptIntegrityValid(record, smoke)"
  );
  expect(source).toContain(
    "return timelineReceiptIntegrityValid(record, SMOKE_PASSWORD_FILL_COMMAND, digest)"
  );
  expect(source).toContain("receipt.stdoutSha256 === EMPTY_SHA256");
  expect(source).toContain("receipt.stderrSha256 === EMPTY_SHA256");
  expect(source).not.toContain("receiptIntegrityValid(smoke.bootstrap.passwordFill)");
  expect(source).not.toContain("sha256Text(smoke.bootstrap.passwordFill");
});

test("self-test covers hostile data, decoder rejection, and digest cardinality", () => {
  const source = readLib("task-543-codeql-self-test.mjs");

  for (const marker of [
    "</script>",
    ");globalThis.__wf543Injected=true;//",
    "noncanonical base64url",
    "malformed base64url",
    "invalid UTF-8",
    "unknown decoded operation",
    "unknown decoded key",
    "decoded NUL",
    "decoded over-budget payload",
    "final command contract",
    "transient command contract",
    "reset command contract",
    '"nondigit code"',
    '"unsafe integer"',
    "credentialDigestCalls === 0",
    "ordinaryDigestInputs",
  ]) {
    expect(source).toContain(marker);
  }
});
