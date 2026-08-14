// Type declarations for _docs/_workflows/lib/workflow-contracts.mjs (single
// owner: TASK-545-01-L01). Covers every runtime export consumed by strict
// TypeScript tests and by the TASK-545-02 driver suites.

export type WorkflowFindingSeverity = "HIGH" | "MEDIUM" | "LOW";

// A structured agent finding. `severity` is validated by
// collectStructuredFindings; the remaining fields are an open subset.
export interface WorkflowStructuredFinding {
  severity: WorkflowFindingSeverity;
  area?: string;
  finding?: string;
  evidence?: string;
  recommendation?: string;
}

// Caller/orchestrator-owned wrapper around an agent payload. The identity is
// attached by trusted caller code and is never agent-authored.
export interface WorkflowResultEnvelope<T = unknown> {
  identity: string;
  value: T;
}

export class WorkflowResultError extends Error {
  constructor(code: string, label: string, detail: string);
  readonly name: "WorkflowResultError";
  code: string;
  label: string;
}

// Validates that `results` is a complete, ordered envelope array matching
// `expectedIdentities`, then returns the SAME array reference. Throws a
// WorkflowResultError with a stable machine-readable code on any missing,
// nullish, count-mismatched, invalid/wrong/duplicate/reordered result. Never
// stringifies agent payload contents or agent-controlled identity text.
export function requireAllResults<T>(
  results: readonly WorkflowResultEnvelope<T>[],
  expectedIdentities: readonly string[],
  label: string
): WorkflowResultEnvelope<T>[];

// Normalizes an array of agent payloads into the structured findings list.
// Validates severity, never drops or reorders findings, and returns the
// findings in encounter order.
export function collectStructuredFindings(
  values: readonly unknown[]
): WorkflowStructuredFinding[];

// Filters a validated structured-findings list down to HIGH/MEDIUM entries,
// preserving encounter order.
export function highMedium<T extends WorkflowStructuredFinding>(
  findings: readonly T[]
): T[];
