// Type declarations for _docs/_workflows/lib/audit-rounds.mjs (single owner:
// TASK-545-02-L01). Covers every runtime export consumed by strict TypeScript
// tests and by the TASK-545-02 driver suites. The result-collection contract
// types come from lib/workflow-contracts.mjs; they are never redefined here.

import type { WorkflowStructuredFinding } from "./workflow-contracts.mjs";

// One audited unit. `repoRelativePath` is the normalized repository-relative
// path that forms the trusted `file:<path>` identity; extra group fields are an
// open subset owned by the caller.
export interface CanonicalAuditGroup {
  repoRelativePath: string;
  [key: string]: unknown;
}

// A single complete or affected pass outcome. `expected` is the number of
// dispatched jobs (groups plus exactly one reconcile). `actionable` are the
// HIGH/MEDIUM findings routed to the fixer; `retainedLow` are the genuine LOW
// findings that stay visible without blocking convergence.
export interface CanonicalAuditRound {
  round: number;
  expected: number;
  fingerprint: string;
  findings: WorkflowStructuredFinding[];
  actionable: WorkflowStructuredFinding[];
  retainedLow: WorkflowStructuredFinding[];
}

// Result of runCanonicalAuditRounds. `pass: true` means the audited set
// converged clean; `pass: false` means `reason` is `audit_not_converged` after
// the bounded fix-pass budget.
export interface CanonicalAuditResult {
  pass: boolean;
  rounds: CanonicalAuditRound[];
  findings: WorkflowStructuredFinding[];
  reason?: "audit_not_converged";
}

export interface CanonicalAuditRoundsOptions {
  // Number of fixer opportunities after each non-clean pass; the driver runs at
  // most `maximumFixPasses + 1` passes total. Defaults to 8.
  maximumFixPasses?: number;
  // Every declared audited unit. Initial pass audits all of them; verified
  // fixer-owned changes rerun only the affected groups plus one reconcile.
  groups: readonly CanonicalAuditGroup[];
  // Audits one group and returns an agent payload whose findings are collected.
  auditFile: (group: CanonicalAuditGroup, round: number) => Promise<unknown> | unknown;
  // Cross-file reconcile; invoked exactly once per complete or affected pass.
  reconcile: (context: {
    round: number;
    changedScopes: readonly CanonicalAuditGroup[];
  }) => Promise<unknown> | unknown;
  // Applies HIGH/MEDIUM fixes and returns a result whose `affectedScopeIds`
  // claim is checked exactly against the before/after-derived scope set.
  fix: (
    actionable: readonly WorkflowStructuredFinding[],
    round: number
  ) => Promise<unknown> | unknown;
  // SHA-256 over the current scopes' sorted audited paths and bytes, plus HEAD
  // and relevant porcelain dirty context. Called before and after every pass;
  // a difference aborts the pass as `workflow_audit_revision_changed`.
  fingerprint: (scopes: readonly CanonicalAuditGroup[]) => Promise<string> | string;
  // Full-universe fingerprint: every declared group, current HEAD, and
  // porcelain dirty context, excluding generated audit output. Required when a
  // fixer round actually runs.
  fingerprintUniverse?: (
    groups: readonly CanonicalAuditGroup[]
  ) => Promise<string> | string;
  // Per-scope fingerprints keyed by `repoRelativePath`. Required when a fixer
  // round actually runs.
  fingerprintEveryScope?: (
    groups: readonly CanonicalAuditGroup[]
  ) => Promise<Record<string, string>>;
  // Caller-owned label carried in every WorkflowResultError.
  label?: string;
}

// Runs the canonical audit-round loop. Throws WorkflowResultError on missing/
// invalid/duplicate/reordered results, audited-bytes/HEAD/dirty changes during
// dispatch, and invalid/unknown/no-op/mismatched/unmappable fixer changes.
export function runCanonicalAuditRounds(
  options: CanonicalAuditRoundsOptions
): Promise<CanonicalAuditResult>;

// Validates the fixer's declared `affectedScopeIds` against the declared
// groups. Rejects a missing/non-array/empty/unknown/duplicate claim and returns
// the deduplicated, sorted declared ids.
export function requireDeclaredAffectedScopeIds(
  fixResult: unknown,
  groups: readonly CanonicalAuditGroup[],
  label: string
): string[];

// Derives the actually changed scope ids from before/after per-scope
// fingerprints. A scope changed when its fingerprint differs or appears on
// exactly one side. Returns a sorted, deduplicated identity set.
export function deriveChangedScopeIds(
  beforeByScope: Record<string, string>,
  afterByScope: Record<string, string>
): string[];

// Requires the declared and actual affected-scope sets to be exactly equal;
// under-declared, over-declared, duplicate, or mismatched sets reject.
export function requireExactIdentitySet(
  declared: readonly string[],
  actual: readonly string[],
  label: string
): void;

// Selects the groups whose scope actually changed, preserving declared group
// order. Only these groups plus one fresh reconcile are classified next.
export function selectVerifiedAffectedGroups(
  groups: readonly CanonicalAuditGroup[],
  actualScopeIds: readonly string[]
): CanonicalAuditGroup[];
