// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.

import { createHash } from "node:crypto";

// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate-contracts (single owner: TASK-545-02-L02). Environment-neutral ESM.


// TASK-543 gate contracts: command allowlists, gate schemas, strict-scan
// projections, and gate receipt validation (single owner: TASK-545-02-L02).
// Environment-neutral ESM: no repository/runtime/agent dependency.


export const ENV_PREFIX = "set -a && source .env && set +a && ";
export const TARGETED_VITEST_COMMAND =
  "bunx vitest run --config vitest.config.ts " +
  "tests/vitest/ui/post-hooks-and-drawers-wave.test.tsx " +
  "tests/vitest/ui/post-editor-state-hook-wave.test.tsx " +
  "tests/vitest/ui/post-block-editor-shell-wave.test.tsx " +
  "tests/vitest/ui/posts-editor-chrome-wave.test.tsx " +
  "tests/vitest/ui/post-block-editor-shell.test.tsx " +
  "tests/vitest/ui/posts-table-wave.test.tsx " +
  "tests/vitest/ui-integration/post-list-restyle.test.tsx " +
  "tests/vitest/ui-integration/post-autosave-flow.test.tsx " +
  "tests/vitest/ui-integration/post-editor-smoke-regression.test.tsx " +
  "tests/vitest/ui-integration/post-editor-shell-restyle.test.tsx " +
  "tests/vitest/ui-integration/post-editor-layout-shell.test.tsx " +
  "tests/vitest/ui/page-row-actions.test.tsx " +
  "tests/vitest/ui/page-table-wave.test.tsx";
export const DB_PREFLIGHT_COMMAND =
  ENV_PREFIX +
  'bun --eval \'import { canConnect } from "./tests/utils/db"; const configured = ' +
  "Boolean(process.env.DATABASE_URL?.trim()); const reachable = configured && await canConnect(); " +
  "process.stdout.write(JSON.stringify({ configured, reachable, selectOne: reachable ? 1 : 0 })); " +
  "if (!reachable) process.exit(1); process.exit(0)'";
export const TASK_SEMGREP_COMMAND =
  "semgrep --error --timeout 120 --timeout-threshold 0 " +
  "--config .semgrep.yml --config p/owasp-top-ten --config p/security-audit " +
  "--config p/nodejs --config p/typescript " +
  "core/admin/ui/posts/editor/hooks/usePostAutosave.ts " +
  "core/admin/ui/posts/editor/hooks/usePostEditorState.ts " +
  "core/admin/ui/posts/editor/PostBlockEditorShell.tsx " +
  "core/admin/ui/posts/editor/PostEditorTopBar.tsx " +
  "core/admin/ui/posts/editor/header/PostEditorHeader.tsx " +
  "core/admin/ui/posts/PostsTable.tsx core/admin/ui/pages/PageRowActions.tsx";
export const STRICT_SEMGREP_JSON_ARGS = Object.freeze([
  "semgrep",
  "--json",
  "--error",
  "--timeout",
  "120",
  "--timeout-threshold",
  "0",
  "--config",
  ".semgrep.yml",
  "--config",
  "p/owasp-top-ten",
  "--config",
  "p/security-audit",
  "--config",
  "p/nodejs",
  "--config",
  "p/typescript",
]);
export const STRICT_SEMGREP_JSON_COMMAND =
  `bun --eval 'const command=${JSON.stringify(STRICT_SEMGREP_JSON_ARGS)}; ` +
  'const result=Bun.spawnSync({cmd:command,stdout:"pipe",stderr:"pipe"}); ' +
  "const decode=(value)=>new TextDecoder().decode(value); " +
  "process.stdout.write(JSON.stringify({command,exitCode:result.exitCode,stdout:decode(result.stdout),stderr:decode(result.stderr)})); " +
  "process.exit(result.exitCode)'";
export const FULL_GATE_COMMANDS = Object.freeze([
  { id: "dbPreflight", command: DB_PREFLIGHT_COMMAND },
  { id: "targetedVitest", command: TARGETED_VITEST_COMMAND },
  { id: "lintTypes", command: "bun --cwd core lint:types" },
  { id: "lint", command: "bun --cwd core lint" },
  { id: "fullTest", command: ENV_PREFIX + "bun run test" },
  { id: "precommitCheck", command: "bun run precommit:check" },
  { id: "adminBuild", command: "bun --cwd core build:admin" },
  { id: "adminBoundary", command: "bun run check:admin-boundary" },
  { id: "adminBundle", command: "bun run check:admin-bundle" },
  { id: "releaseGates", command: "bun run gates:coderso" },
  { id: "targetedSemgrep", command: TASK_SEMGREP_COMMAND },
  { id: "strictScan", command: "bun run scan:security:strict" },
  { id: "strictSemgrepJson", command: STRICT_SEMGREP_JSON_COMMAND },
]);
export const STRICT_COMPONENTS = Object.freeze([
  {
    id: "semgrep-sast",
    title: "Semgrep SAST rules",
    command:
      "semgrep --error --timeout 120 --timeout-threshold 0 --config .semgrep.yml " +
      "--config p/owasp-top-ten --config p/security-audit --config p/nodejs --config p/typescript",
  },
  {
    id: "bun-audit",
    title: "Bun dependency advisory audit",
    command: "bun audit --audit-level high",
  },
  {
    id: "trivy-vuln",
    title: "Trivy lockfile CVE scan",
    command:
      "trivy fs --scanners vuln --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed " +
      "--include-dev-deps --skip-dirs _docs --skip-dirs node_modules --skip-dirs dist " +
      "--skip-dirs build --skip-dirs .next --skip-dirs .git .",
  },
  {
    id: "trivy-config",
    title: "Trivy Docker and IaC misconfiguration scan",
    command:
      "trivy config --exit-code 1 --severity MEDIUM,HIGH,CRITICAL --skip-dirs _docs " +
      "--skip-dirs node_modules --skip-dirs dist --skip-dirs build --skip-dirs .next .",
  },
  {
    id: "trivy-secret",
    title: "Trivy filesystem secret scan",
    command:
      "trivy fs --scanners secret --exit-code 1 --skip-dirs _docs --skip-dirs node_modules " +
      "--skip-dirs dist --skip-dirs build --skip-dirs .next --skip-dirs .git .",
  },
  {
    id: "gitleaks-history",
    title: "Gitleaks Git history secret scan",
    command: "gitleaks git --config .gitleaks.toml --exit-code 1 --redact=100 .",
  },
  {
    id: "gitleaks-worktree",
    title: "Gitleaks current worktree secret scan",
    command: "gitleaks dir --config .gitleaks.toml --exit-code 1 --redact=100 .",
  },
]);
export const KNOWN_STRICT_FINDING = Object.freeze({
  scanner: "semgrep-sast",
  ruleId:
    "javascript.lang.security.audit.unknown-value-with-script-tag.unknown-value-with-script-tag",
  file: "_docs/_workflows/task-522-author.mjs",
  line: 185,
  owner: "TASK-545",
});

// Structured result the canonical post-audit fixer returns: the exact
// affectedLensKeys claim (validated against derived fingerprints by the driver)
// plus a bounded human-readable summary. Never carries raw findings.
export const FIXER_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["affectedLensKeys"],
  properties: {
    affectedLensKeys: { type: "array", items: { type: "string" }, uniqueItems: true },
    summary: { type: "string" },
  },
};

export const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
};

export const COMMAND_RECEIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "command", "status", "rawOutput", "rawOutputSha256"],
  properties: {
    id: { type: "string", minLength: 1 },
    command: { type: "string", minLength: 1 },
    status: { type: "integer" },
    rawOutput: { type: "string" },
    rawOutputSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
};

export const STRICT_FINDING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scanner", "ruleId", "file", "line", "owner"],
  properties: {
    scanner: { type: "string" },
    ruleId: { type: "string" },
    file: { type: "string" },
    line: { type: "integer", minimum: 1 },
    owner: { type: "string" },
  },
};

export const FULL_GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pass", "errors", "receipts", "database", "strictScan"],
  properties: {
    pass: { type: "boolean" },
    errors: { type: "array", items: { type: "string" } },
    receipts: {
      type: "array",
      minItems: FULL_GATE_COMMANDS.length,
      maxItems: FULL_GATE_COMMANDS.length,
      items: COMMAND_RECEIPT_SCHEMA,
    },
    database: {
      type: "object",
      additionalProperties: false,
      required: ["receiptId", "configured", "reachable", "selectOne"],
      properties: {
        receiptId: { const: "dbPreflight" },
        configured: { type: "boolean" },
        reachable: { type: "boolean" },
        selectOne: { enum: [0, 1] },
      },
    },
    strictScan: {
      type: "object",
      additionalProperties: false,
      required: ["receiptId", "semgrepJsonReceiptId", "components", "findings"],
      properties: {
        receiptId: { const: "strictScan" },
        semgrepJsonReceiptId: { const: "strictSemgrepJson" },
        components: {
          type: "array",
          minItems: STRICT_COMPONENTS.length,
          maxItems: STRICT_COMPONENTS.length,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "id",
              "command",
              "exitCode",
              "rawOutput",
              "rawOutputSha256",
              "outputStart",
              "outputEnd",
              "findings",
            ],
            properties: {
              id: { type: "string" },
              command: { type: "string" },
              exitCode: { type: "integer" },
              rawOutput: { type: "string" },
              rawOutputSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
              outputStart: { type: "integer", minimum: 0 },
              outputEnd: { type: "integer", minimum: 1 },
              findings: { type: "array", items: STRICT_FINDING_SCHEMA },
            },
          },
        },
        findings: { type: "array", items: STRICT_FINDING_SCHEMA },
      },
    },
  },
};

export const FINGERPRINT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fingerprint", "changedPaths"],
  properties: {
    fingerprint: { type: "string", pattern: "^[a-f0-9]{64}$" },
    changedPaths: { type: "array", minItems: 1, uniqueItems: true, items: { type: "string" } },
  },
};

export const AUDIT_SCHEMA = {
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


export function validatePassErrorContract(result, label) {
  const errors = Array.isArray(result?.errors) ? result.errors : ["missing errors array"];
  if (result?.pass === true && errors.length !== 0) {
    throw new Error(`${label} returned pass=true with errors: ${errors.join("; ")}`);
  }
  if (result?.pass === false && errors.length === 0) {
    throw new Error(`${label} returned pass=false without an error`);
  }
  return result;
}

export function requirePassingResult(result, label) {
  validatePassErrorContract(result, label);
  const errors = Array.isArray(result?.errors) ? result.errors : ["missing errors array"];
  if (result?.pass !== true) {
    throw new Error(`${label} failed: ${errors.join("; ") || "pass=false"}`);
  }
  return result;
}

export function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function receiptIntegrityValid(receipt, digest = sha256Text) {
  return (
    receipt &&
    typeof receipt.command === "string" &&
    Number.isInteger(receipt.status) &&
    typeof receipt.stdout === "string" &&
    typeof receipt.stderr === "string" &&
    receipt.stdoutSha256 === digest(receipt.stdout) &&
    receipt.stderrSha256 === digest(receipt.stderr) &&
    Object.prototype.hasOwnProperty.call(receipt, "parsedOutput")
  );
}

export function uniqueNumbers(values) {
  return [...new Set(values)];
}


export function receiptMatches(receipt, expected, allowedStatuses = [0]) {
  return (
    receipt.id === expected.id &&
    receipt.command === expected.command &&
    allowedStatuses.includes(receipt.status) &&
    receipt.rawOutputSha256 === sha256Text(receipt.rawOutput)
  );
}

export function strictComponentSections(rawOutput) {
  const summaryStart = rawOutput.indexOf("\n[security-scan] summary");
  if (summaryStart < 0) return [];
  return STRICT_COMPONENTS.map((component, index) => {
    const marker = `[security-scan] ${component.title}\n`;
    const start = rawOutput.indexOf(marker);
    const nextMarker = STRICT_COMPONENTS[index + 1]
      ? `[security-scan] ${STRICT_COMPONENTS[index + 1].title}\n`
      : null;
    const end = nextMarker ? rawOutput.indexOf(nextMarker, start + marker.length) : summaryStart;
    return { start, end };
  });
}

export function strictSummaryExitCode(rawOutput, id) {
  const line = rawOutput.split(/\r?\n/).find((candidate) => candidate.startsWith(`- ${id}: `));
  if (!line) return null;
  if (line.startsWith(`- ${id}: ok `)) return 0;
  const failurePrefix = `- ${id}: non-zero:`;
  if (!line.startsWith(failurePrefix)) return null;
  const suffix = line.slice(failurePrefix.length);
  const separator = suffix.indexOf(" ");
  if (separator < 1) return null;
  const exitCodeText = suffix.slice(0, separator);
  if (!/^[0-9]+$/u.test(exitCodeText)) return null;
  const exitCode = Number(exitCodeText);
  return Number.isSafeInteger(exitCode) ? exitCode : null;
}

export function parseStrictSemgrepJson(rawOutput) {
  let envelope;
  try {
    envelope = JSON.parse(rawOutput);
  } catch {
    return null;
  }
  if (
    !sameSequence(envelope?.command ?? [], STRICT_SEMGREP_JSON_ARGS) ||
    !Number.isInteger(envelope?.exitCode) ||
    typeof envelope?.stdout !== "string" ||
    typeof envelope?.stderr !== "string"
  ) {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(envelope.stdout);
  } catch {
    return null;
  }
  if (!Array.isArray(payload?.results) || !Array.isArray(payload?.errors)) return null;
  if (payload.errors.length !== 0) return null;
  const findings = [];
  for (const result of payload.results) {
    const ruleId = result?.check_id;
    const file = typeof result?.path === "string" ? result.path.replace(/^\.\//, "") : null;
    const line = result?.start?.line;
    if (typeof ruleId !== "string" || !file || !Number.isInteger(line) || line < 1) return null;
    const knownCore =
      ruleId === KNOWN_STRICT_FINDING.ruleId &&
      file === KNOWN_STRICT_FINDING.file &&
      line === KNOWN_STRICT_FINDING.line;
    findings.push({
      scanner: "semgrep-sast",
      ruleId,
      file,
      line,
      owner: knownCore ? KNOWN_STRICT_FINDING.owner : "UNOWNED",
    });
  }
  return { exitCode: envelope.exitCode, findings };
}

export function validateFullGates(result) {
  requirePassingResult(result, "TASK-543 full gates");
  const receiptsValid = result.receipts.every((receipt, index) =>
    receiptMatches(
      receipt,
      FULL_GATE_COMMANDS[index],
      ["strictScan", "strictSemgrepJson"].includes(receipt.id) ? [0, 1] : [0]
    )
  );
  const databaseReceipt = result.receipts.find(({ id }) => id === "dbPreflight");
  let databaseOutput = null;
  try {
    databaseOutput = JSON.parse(databaseReceipt?.rawOutput ?? "null");
  } catch {
    databaseOutput = null;
  }
  const strictReceipt = result.receipts.find(({ id }) => id === "strictScan");
  const strictSemgrepJsonReceipt = result.receipts.find(({ id }) => id === "strictSemgrepJson");
  const strictRawOutput = strictReceipt?.rawOutput ?? "";
  const parsedSemgrep = parseStrictSemgrepJson(strictSemgrepJsonReceipt?.rawOutput ?? "");
  const strictSections = strictComponentSections(strictRawOutput);
  const componentRecordsValid = result.strictScan.components.every((component, index) => {
    const expected = STRICT_COMPONENTS[index];
    const section = strictSections[index];
    const expectedFindings = expected.id === "semgrep-sast" ? result.strictScan.findings : [];
    return (
      component.id === expected.id &&
      component.command === expected.command &&
      section?.start >= 0 &&
      section.end > section.start &&
      component.outputStart === section.start &&
      component.outputEnd === section.end &&
      component.rawOutput === strictRawOutput.slice(section.start, section.end) &&
      component.rawOutput.includes(`[security-scan] $ ${expected.command}`) &&
      component.rawOutputSha256 === sha256Text(component.rawOutput) &&
      sameRawValue(component.findings, expectedFindings) &&
      component.exitCode === strictSummaryExitCode(strictRawOutput, expected.id) &&
      (expectedFindings.length === 0 ? component.exitCode === 0 : component.exitCode === 1)
    );
  });
  const exactKnownResidual =
    result.strictScan.findings.length === 0 ||
    (result.strictScan.findings.length === 1 &&
      sameRawValue(result.strictScan.findings[0], KNOWN_STRICT_FINDING));
  const strictStatusMatches =
    strictReceipt?.status === (result.strictScan.findings.length === 0 ? 0 : 1);
  const strictSemgrepJsonStatusMatches =
    strictSemgrepJsonReceipt?.status === (result.strictScan.findings.length === 0 ? 0 : 1);
  if (
    !receiptsValid ||
    !sameSequence(
      result.receipts.map(({ id }) => id),
      FULL_GATE_COMMANDS.map(({ id }) => id)
    ) ||
    !sameRawValue(databaseOutput, {
      configured: result.database.configured,
      reachable: result.database.reachable,
      selectOne: result.database.selectOne,
    }) ||
    result.database.configured !== true ||
    result.database.reachable !== true ||
    result.database.selectOne !== 1 ||
    !componentRecordsValid ||
    !sameSequence(
      result.strictScan.components.map(({ id }) => id),
      STRICT_COMPONENTS.map(({ id }) => id)
    ) ||
    !exactKnownResidual ||
    !sameRawValue(parsedSemgrep?.findings, result.strictScan.findings) ||
    parsedSemgrep?.exitCode !== strictSemgrepJsonReceipt?.status ||
    !strictStatusMatches ||
    !strictSemgrepJsonStatusMatches ||
    result.errors.length !== 0
  ) {
    throw new Error(`TASK-543 full gates failed: ${result.errors.join("; ")}`);
  }
}

export function sameUniqueSet(left, right) {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
  );
}


export function sameSequence(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sameRawValue(left, right) {
  return stableSerialize(left) === stableSerialize(right);
}

