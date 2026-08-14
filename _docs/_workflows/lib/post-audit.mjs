// TASK-545 canonical post-audit driver: exact declared lens identity, bounded
// finding-driven fix loops with affected-lens-only reruns, and strict
// revision/fixer/validation guards.
//
// Environment-neutral ESM: no repository, runtime, server, or global agent
// dependency, so Node and Bun unit tests import it directly. It imports the
// shared result contracts (requireAllResults, collectStructuredFindings,
// highMedium, WorkflowResultError) from the single owner
// lib/workflow-contracts.mjs and never redefines them. The parallel dispatch
// helper is a harness-injected global resolved at call time (the same free
// `parallel` used by the tracked workflow scripts).
//
// Every dispatch runs exactly `pending.length` lens jobs. Identities come from
// trusted `lens:<key>` wrappers constructed here, never from agent payloads.
// A missing, nullish, count-mismatched, wrong, duplicate, or reordered result
// fails before findings are flattened or classified as clean.

import {
  WorkflowResultError,
  collectStructuredFindings,
  highMedium,
  requireAllResults,
} from "./workflow-contracts.mjs";

const DEFAULT_LABEL = "runCanonicalPostAudit";
const MAX_LENS_KEY_CHARS = 240;

// A lens key is the trusted `lens:<key>` identity suffix: lowercase kebab or
// underscore words. It matches the workflow-contracts lens identity contract so
// identities stay safe and stable.
function isSafeLensKey(key) {
  if (typeof key !== "string" || key.length === 0 || key.length > MAX_LENS_KEY_CHARS) {
    return false;
  }
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(key);
}

// Every declared lens must be a non-empty object with a safe, unique key. No
// arbitrary minimum; a single lens is a valid non-empty exact identity set.
function requireNonEmptyUniqueDeclaredLensKeys(lenses, label) {
  if (!Array.isArray(lenses) || lenses.length === 0) {
    throw new WorkflowResultError("workflow_lenses_invalid", label, "empty_or_not_array");
  }
  const seen = new Set();
  for (let index = 0; index < lenses.length; index += 1) {
    const lens = lenses[index];
    const key = lens && typeof lens === "object" ? lens.key : undefined;
    if (!isSafeLensKey(key)) {
      throw new WorkflowResultError("workflow_lenses_invalid", label, `index=${index}`);
    }
    if (seen.has(key)) {
      throw new WorkflowResultError("workflow_lenses_invalid", label, `duplicate:${index}`);
    }
    seen.add(key);
  }
}

// The bounded fix budget is exactly 1..3 passes. Exhaustion returns explicit
// non-convergence instead of an unbounded loop.
function requireBoundedMaximumFixPasses(maximumFixPasses, label) {
  if (!Number.isSafeInteger(maximumFixPasses) || maximumFixPasses < 1 || maximumFixPasses > 3) {
    throw new WorkflowResultError(
      "workflow_maximum_fix_passes_invalid",
      label,
      `value=${maximumFixPasses}`
    );
  }
}

function parallelRunner() {
  const runner = typeof globalThis.parallel === "function" ? globalThis.parallel : undefined;
  if (!runner) {
    throw new WorkflowResultError("workflow_parallel_missing", DEFAULT_LABEL, "global_parallel");
  }
  return runner;
}

// Validates the fixer's declared affected-lens claim and returns the
// deduplicated declared lens keys. The declaration is a checked claim, never
// authority: missing, non-array, empty, unknown, or duplicate sets reject.
export function requireNonEmptyAffectedLensSubset(fixResult, lenses, label) {
  if (!fixResult || typeof fixResult !== "object" || Array.isArray(fixResult)) {
    throw new WorkflowResultError("workflow_post_declared_scope_invalid", label, "missing_result");
  }
  const declared = fixResult.affectedLensKeys;
  if (!Array.isArray(declared) || declared.length === 0) {
    throw new WorkflowResultError("workflow_post_declared_scope_invalid", label, "empty");
  }
  const known = new Set(lenses.map((lens) => lens.key));
  const seen = new Set();
  for (let index = 0; index < declared.length; index += 1) {
    const lensKey = declared[index];
    if (typeof lensKey !== "string" || !known.has(lensKey)) {
      throw new WorkflowResultError(
        "workflow_post_declared_scope_invalid",
        label,
        `unknown:${index}`
      );
    }
    if (seen.has(lensKey)) {
      throw new WorkflowResultError(
        "workflow_post_declared_scope_invalid",
        label,
        `duplicate:${index}`
      );
    }
    seen.add(lensKey);
  }
  return [...seen].sort((left, right) => left.localeCompare(right));
}

// Derives the actually changed lens keys from before/after per-lens input
// fingerprints. A lens changed when its fingerprint differs or when it exists
// on exactly one side. Returns a sorted, deduplicated key set.
export function deriveChangedLensKeys(beforeByLens, afterByLens) {
  const before = beforeByLens && typeof beforeByLens === "object" ? beforeByLens : {};
  const after = afterByLens && typeof afterByLens === "object" ? afterByLens : {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [];
  for (const key of keys) {
    if (before[key] !== after[key]) changed.push(key);
  }
  return changed.sort((left, right) => left.localeCompare(right));
}

// Requires the declared and actual affected-lens identity sets to be exactly
// equal. Under-declared (declared `A` with actual `A+B`), over-declared
// (declared `A+B` with actual `A`), duplicate, and mismatched sets reject
// before any receipt is reused.
export function requireExactIdentitySet(declared, actual, label) {
  const declaredSet = new Set(declared ?? []);
  const actualSet = new Set(actual ?? []);
  if (declaredSet.size !== (declared?.length ?? 0) || actualSet.size !== (actual?.length ?? 0)) {
    throw new WorkflowResultError("workflow_post_declared_scope_mismatch", label, "duplicate_ids");
  }
  if (declaredSet.size !== actualSet.size) {
    throw new WorkflowResultError(
      "workflow_post_declared_scope_mismatch",
      label,
      `declared=${[...declaredSet].sort().join(",")},actual=${[...actualSet].sort().join(",")}`
    );
  }
  for (const key of declaredSet) {
    if (!actualSet.has(key)) {
      throw new WorkflowResultError(
        "workflow_post_declared_scope_mismatch",
        label,
        `declared=${[...declaredSet].sort().join(",")},actual=${[...actualSet].sort().join(",")}`
      );
    }
  }
}

// Requires a current receipt for every declared lens. Unaffected clean receipts
// are retained across narrow reruns; affected receipts are replaced by fresh
// results. A missing receipt means the driver cannot present a complete pass.
function requireEveryDeclaredLensReceipt(currentReceipts, lenses, label) {
  const receipts = {};
  for (const lens of lenses) {
    const value = currentReceipts.get(`lens:${lens.key}`);
    if (value === undefined) {
      throw new WorkflowResultError(
        "workflow_post_receipt_missing",
        label,
        `lens:${lens.key}`
      );
    }
    receipts[lens.key] = value;
  }
  return receipts;
}

export async function runCanonicalPostAudit({
  lenses,
  runLens,
  fix,
  validate,
  fingerprint,
  fingerprintUniverse,
  fingerprintEveryLensInput,
  maximumFixPasses,
  label = DEFAULT_LABEL,
}) {
  requireNonEmptyUniqueDeclaredLensKeys(lenses, label);
  requireBoundedMaximumFixPasses(maximumFixPasses, label);
  if (typeof runLens !== "function" || typeof fix !== "function" || typeof validate !== "function") {
    throw new WorkflowResultError("workflow_driver_contract_invalid", label, "callbacks");
  }
  if (typeof fingerprint !== "function") {
    throw new WorkflowResultError("workflow_driver_contract_invalid", label, "fingerprint");
  }
  const parallel = parallelRunner();

  const passes = [];
  const currentReceipts = new Map();
  let expectedRevision = await fingerprint();
  let pending = lenses;
  for (let pass = 0; pass <= maximumFixPasses; pass += 1) {
    const before = await fingerprint();
    if (before !== expectedRevision) {
      throw new WorkflowResultError("workflow_post_revision_changed", label, `pass=${pass}`);
    }
    const jobs = pending.map((lens) => ({
      identity: `lens:${lens.key}`,
      run: () => runLens(lens, pass),
    }));
    const results = await parallel(
      jobs.map((job) => async () => ({
        identity: job.identity, // trusted wrapper, never agent-authored
        value: await job.run(),
      }))
    );
    requireAllResults(
      results,
      jobs.map((job) => job.identity),
      `${label}:post-audit:${pass}`
    );
    const after = await fingerprint();
    if (after !== before) {
      throw new WorkflowResultError("workflow_post_revision_changed", label, `pass=${pass}`);
    }
    for (const result of results) currentReceipts.set(result.identity, result.value);
    const findings = collectStructuredFindings([...currentReceipts.values()]);
    const blocking = highMedium(findings);
    passes.push({
      pass,
      expected: pending.length,
      fingerprint: after,
      lensKeys: pending.map((lens) => lens.key),
      findings,
    });
    if (blocking.length === 0) {
      return {
        pass: true,
        passes,
        findings,
        receipts: requireEveryDeclaredLensReceipt(currentReceipts, lenses, label),
      };
    }
    if (pass === maximumFixPasses) {
      return { pass: false, passes, findings, reason: "post_audit_not_converged" };
    }
    const beforeFixUniverse = await fingerprintUniverse?.(lenses);
    const beforeByLens = await fingerprintEveryLensInput?.(lenses);
    const fixResult = await fix(blocking);
    const declaredAffectedLensKeys = requireNonEmptyAffectedLensSubset(fixResult, lenses, label);
    const afterByLens = await fingerprintEveryLensInput?.(lenses);
    const fixed = await fingerprintUniverse?.(lenses);
    if (
      beforeFixUniverse === undefined ||
      beforeByLens === undefined ||
      afterByLens === undefined ||
      fixed === undefined
    ) {
      throw new WorkflowResultError("workflow_fixer_fingerprint_missing", label, `pass=${pass}`);
    }
    const actualAffectedLensKeys = deriveChangedLensKeys(beforeByLens, afterByLens);
    requireExactIdentitySet(declaredAffectedLensKeys, actualAffectedLensKeys, `${label}:post-fix:${pass}`);
    if (fixed === beforeFixUniverse) {
      // The fixer changed nothing: a true no-op can never be presented as a
      // verified fixer-owned change.
      throw new WorkflowResultError("workflow_post_fixer_no_change", label, `pass=${pass}`);
    }
    await validate({ ...fixResult, affectedLensKeys: actualAffectedLensKeys });
    const validated = await fingerprintUniverse(lenses);
    if (validated !== fixed) {
      // Validation may write excluded reports but must never mutate the
      // audited contract set.
      throw new WorkflowResultError(
        "workflow_post_validation_mutated_contract",
        label,
        `pass=${pass}`
      );
    }
    pending = lenses.filter((lens) => actualAffectedLensKeys.includes(lens.key));
    for (const lens of pending) currentReceipts.delete(`lens:${lens.key}`);
    expectedRevision = validated;
  }
  throw new WorkflowResultError("workflow_post_audit_unreachable", label, "state");
}
