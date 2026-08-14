// Type declarations for _docs/_workflows/lib/post-audit.mjs (single owner:
// TASK-545-02-L02). Covers every runtime export consumed by strict TypeScript
// tests and by the TASK-545-02 driver suites. The result-collection contract
// types come from lib/workflow-contracts.mjs; they are never redefined here.

import type { WorkflowStructuredFinding } from "./workflow-contracts.mjs";

// One declared post-audit lens. `key` is the normalized lowercase kebab or
// underscore identity that forms the trusted `lens:<key>` identity; extra
// fields (for example an independent human-readable label) are an open subset
// owned by the caller.
export interface CanonicalPostAuditLens {
  key: string;
  [extra: string]: unknown;
}

// A single complete or affected pass outcome. `expected` is the number of
// dispatched lens jobs. `lensKeys` are the lenses dispatched in this pass.
// `findings` are the full collected findings (all severities) after this pass,
// including retained LOW findings from earlier unaffected passes.
export interface CanonicalPostAuditPass {
  pass: number;
  expected: number;
  fingerprint: string;
  lensKeys: string[];
  findings: WorkflowStructuredFinding[];
}

// Result of runCanonicalPostAudit. `pass: true` means the audited set
// converged clean and `receipts` holds one current receipt per declared lens;
// `pass: false` means `reason` is `post_audit_not_converged` after the bounded
// fix-pass budget.
export interface CanonicalPostAuditResult {
  pass: boolean;
  passes: CanonicalPostAuditPass[];
  findings: WorkflowStructuredFinding[];
  receipts?: Record<string, unknown>;
  reason?: "post_audit_not_converged";
}

export interface CanonicalPostAuditOptions {
  // Every declared lens. The initial pass audits all of them; verified
  // fixer-owned changes rerun only the fingerprint-derived affected lenses.
  lenses: readonly CanonicalPostAuditLens[];
  // Runs one lens audit and returns an agent payload whose findings are
  // collected. Receives the lens and the zero-based pass number.
  runLens: (lens: CanonicalPostAuditLens, pass: number) => Promise<unknown> | unknown;
  // Applies HIGH/MEDIUM fixes and returns a result whose `affectedLensKeys`
  // claim is checked exactly against the before/after-derived lens set.
  fix: (
    blocking: readonly WorkflowStructuredFinding[]
  ) => Promise<unknown> | unknown;
  // Post-fix targeted validation. May write excluded generated reports but
  // must never mutate the audited contract set; a mutation is rejected as
  // `workflow_post_validation_mutated_contract`.
  validate: (fixResult: Record<string, unknown>) => Promise<void> | void;
  // SHA-256 over the full audited implementation/task/test/docs universe,
  // current HEAD, and relevant porcelain dirty context. Called before and
  // after every dispatch and compared to the evolving expected revision; a
  // difference aborts as `workflow_post_revision_changed`.
  fingerprint: () => Promise<string> | string;
  // Full-universe fingerprint after a fix and after validation. Required when
  // a fixer round actually runs.
  fingerprintUniverse?: (
    lenses: readonly CanonicalPostAuditLens[]
  ) => Promise<string> | string;
  // Per-lens input fingerprints keyed by lens key. Required when a fixer
  // round actually runs; a shared input maps to every consuming lens.
  fingerprintEveryLensInput?: (
    lenses: readonly CanonicalPostAuditLens[]
  ) => Promise<Record<string, string>>;
  // Bounded fix budget: exactly 1..3 passes. Exhaustion returns explicit
  // non-convergence.
  maximumFixPasses: number;
  // Caller-owned label carried in every WorkflowResultError.
  label?: string;
}

// Runs the canonical post-audit loop. Throws WorkflowResultError on missing/
// invalid/duplicate/reordered lens results, unexpected contract/HEAD/dirty
// changes during dispatch, and invalid/unknown/no-op/mismatched fixer changes
// or post-validation mutation.
export function runCanonicalPostAudit(
  options: CanonicalPostAuditOptions
): Promise<CanonicalPostAuditResult>;

// Validates the fixer's declared `affectedLensKeys` against the declared
// lenses. Rejects a missing/non-array/empty/unknown/duplicate claim and returns
// the deduplicated, sorted declared lens keys.
export function requireNonEmptyAffectedLensSubset(
  fixResult: unknown,
  lenses: readonly CanonicalPostAuditLens[],
  label: string
): string[];

// Derives the actually changed lens keys from before/after per-lens input
// fingerprints. A lens changed when its fingerprint differs or appears on
// exactly one side. Returns a sorted, deduplicated identity set.
export function deriveChangedLensKeys(
  beforeByLens: Record<string, string>,
  afterByLens: Record<string, string>
): string[];

// Requires the declared and actual affected-lens sets to be exactly equal;
// under-declared, over-declared, duplicate, or mismatched sets reject before
// any receipt is reused.
export function requireExactIdentitySet(
  declared: readonly string[],
  actual: readonly string[],
  label: string
): void;
