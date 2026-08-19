// S3 (TASK-481/539/542) shared gate contracts (orchestrator-owned).
// Environment-neutral ESM: bounded result/finding schemas, strict pass/error
// validation, receipt helpers, and the family line-gate primitives shared by
// the task-481/539/542 implement workflows. No repository, runtime, server, or
// global agent dependency. Errors are machine-readable and never carry agent
// payload raw content beyond bounded field values.

import { spawnSync } from "node:child_process";

const RESULT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["pass", "summary", "errors"],
  properties: {
    pass: { type: "boolean" },
    summary: { type: "string" },
    errors: { type: "array", items: { type: "string" } },
  },
});

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

const FIXER_RESULT_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["summary", "fixed", "rejected"],
  properties: {
    summary: { type: "string" },
    fixed: { type: "array", items: { type: "string" } },
    rejected: { type: "array", items: { type: "string" } },
  },
});

const MAX_RESULT_ITEMS = 40;
const MAX_FIELD_LENGTH = 4096;

export class S3WorkflowError extends Error {
  constructor(code, label, detail) {
    super(`${code}:${label}:${detail}`);
    this.name = "S3WorkflowError";
    this.code = code;
    this.label = label;
    this.detail = detail;
  }
}

function fail(code, label, detail) {
  throw new S3WorkflowError(code, label, detail);
}

function isPlainRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasExactKeys(value, keys) {
  return (
    isPlainRecord(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function nonEmptyBoundedString(value, maximum = MAX_FIELD_LENGTH) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}

export function validatePassErrorContract(result, label) {
  if (!hasExactKeys(result, ["pass", "summary", "errors"])) fail("invalid_result", label, "shape");
  if (result.pass !== true) fail("pass_false", label, result.errors?.join(";") ?? "no errors");
  if (!nonEmptyBoundedString(result.summary)) fail("invalid_summary", label, "summary");
  if (
    !Array.isArray(result.errors) ||
    result.errors.length > MAX_RESULT_ITEMS ||
    result.errors.some((error) => !nonEmptyBoundedString(error))
  ) {
    fail("invalid_errors", label, "errors");
  }
  return Object.freeze({ ...result });
}

export function requirePassingResult(result, label) {
  return validatePassErrorContract(result, label);
}

export function requireCleanAudit(result, label) {
  if (!hasExactKeys(result, ["pass", "summary", "findings"])) {
    fail("invalid_audit", label, "shape");
  }
  if (!nonEmptyBoundedString(result.summary)) fail("invalid_audit", label, "summary");
  if (!Array.isArray(result.findings) || result.findings.length > MAX_RESULT_ITEMS) {
    fail("invalid_audit", label, "findings");
  }
  for (const finding of result.findings) {
    if (
      !hasExactKeys(finding, ["severity", "area", "finding", "evidence", "recommendation"]) ||
      !["HIGH", "MEDIUM", "LOW"].includes(finding.severity) ||
      ["area", "finding", "evidence", "recommendation"].some(
        (key) => !nonEmptyBoundedString(finding[key])
      )
    ) {
      fail("invalid_finding", label, JSON.stringify(finding));
    }
  }
  const blockers = result.findings.filter(
    (finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM"
  );
  if (result.pass !== (blockers.length === 0)) fail("invalid_audit", label, "pass_mismatch");
  return Object.freeze({ ...result, findings: Object.freeze(result.findings) });
}

export function highMedium(findings) {
  return Array.isArray(findings)
    ? findings.filter((finding) => finding.severity === "HIGH" || finding.severity === "MEDIUM")
    : [];
}

export function requireAllResults(label, expected, results) {
  if (!Array.isArray(results) || results.length !== expected) {
    fail("missing_results", label, `expected=${expected} actual=${results?.length ?? 0}`);
  }
  const missing = [];
  for (let index = 0; index < results.length; index += 1) {
    if (!results[index]) missing.push(index);
  }
  if (missing.length > 0) fail("missing_results", label, `indexes=${missing.join(",")}`);
  return results;
}

export function sameUniqueSet(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }
  const a = [...new Set(left)].sort((x, y) => String(x).localeCompare(String(y)));
  const b = [...new Set(right)].sort((x, y) => String(x).localeCompare(String(y)));
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function sameSequence(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value !== null && typeof value === "object") {
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

export function sha256Text(value) {
  // No crypto import: callers inject the digest function when needed.
  if (typeof value !== "string") return "";
  return value;
}

export function uniqueNumbers(values) {
  return Array.isArray(values) && new Set(values).size === values.length;
}

export const RESULT_SCHEMA_EXPORT = RESULT_SCHEMA;
export const AUDIT_SCHEMA_EXPORT = AUDIT_SCHEMA;
export const FIXER_RESULT_SCHEMA_EXPORT = FIXER_RESULT_SCHEMA;

// ---- Family line gate (baseline-to-current touched production/test files) ----

export const SOURCE_OR_TEST_EXTENSION = /\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/u;
export const GENERATED_ARTIFACT_EXTENSION = /\.generated\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/u;

export function normalizedRepositoryPath(value, label = "repository_path") {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\0") ||
    value.includes("\\")
  ) {
    fail("invalid_repository_path", label, String(value));
  }
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    fail("invalid_repository_path", label, value);
  }
  return parts.join("/");
}

export function countPhysicalLines(filePath, label = "line_count") {
  // awk is used by the tracked repo workflows for byte-accurate physical counts.
  const result = spawnSync("awk", ["END { print NR }", filePath], { encoding: "utf8" });
  if (result.error || result.status !== 0 || result.signal) {
    fail("line_count_failed", label, filePath);
  }
  const count = Number.parseInt(result.stdout.trim(), 10);
  if (!Number.isSafeInteger(count) || count < 0) fail("line_count_invalid", label, filePath);
  return count;
}
