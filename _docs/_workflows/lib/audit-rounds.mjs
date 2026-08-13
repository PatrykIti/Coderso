// Canonical audit-round driver (single owner: TASK-545-02-L01). Replaces the
// bespoke per-script round loops (filter(Boolean) false-clean classification,
// manual length/identity checks, reconcile outside the pass) with one
// identity-checked complete pass plus finding-driven affected-scope reruns.
//
// Environment-neutral ESM like its sibling workflow-contracts.mjs: it imports
// only the shared contracts module and touches no repository, runtime, server,
// or global agent state of its own. The caller supplies every effect
// (auditFile/reconcile/fix prompts and fingerprint functions); the driver only
// orchestrates dispatch, identity-complete validation, revision fingerprints,
// severity classification, and exact declared-versus-actual scope checks.
//
// The parallel dispatch helper is a harness-injected global (the same free
// `parallel` used by the tracked workflow scripts). It is resolved at call time
// so importing this module never couples to the harness; a missing global is a
// clear driver error, not a ReferenceError.
//
// The result-collection contract (requireAllResults, collectStructuredFindings,
// highMedium) and WorkflowResultError are imported from
// lib/workflow-contracts.mjs (single owner: TASK-545-01-L01) and are never
// redefined here. Error messages carry caller-owned labels plus count/index
// metadata; agent payload contents and agent-controlled identity text are never
// stringified.

import {
  WorkflowResultError,
  collectStructuredFindings,
  highMedium,
  requireAllResults,
} from "./workflow-contracts.mjs";

const DEFAULT_MAXIMUM_FIX_PASSES = 8;
const DEFAULT_LABEL = "runCanonicalAuditRounds";

// A LOW finding that weakens executability or test integrity must not remain
// LOW: it is classified at least MEDIUM and routed through the fixer. The
// markers are the leaf contract's reserved areas; genuine LOWs in other areas
// stay visible and never block HIGH/MEDIUM convergence.
const EXECUTABILITY_LOW_MARKERS = ["executab", "test-integrity", "test_integrity"];

function isExecutabilityLow(finding) {
  if (!finding || finding.severity !== "LOW") return false;
  const haystack = `${finding.area ?? ""} ${finding.finding ?? ""}`.toLowerCase();
  return EXECUTABILITY_LOW_MARKERS.some((marker) => haystack.includes(marker));
}

// Promotes LOW findings that weaken executability or test integrity to MEDIUM
// so they become actionable. Never drops or reorders findings; never touches
// HIGH/MEDIUM entries.
function promoteExecutabilityLows(findings) {
  return findings.map((finding) =>
    isExecutabilityLow(finding) ? { ...finding, severity: "MEDIUM" } : finding
  );
}

// Mirrors the wrapper-contract file-identity shape for the driver's OWN group
// configuration so a bad group list fails before any agent dispatch. This is
// input validation, not a redefinition of the result contract; the
// authoritative identity check still runs through requireAllResults at every
// pass.
function isNormalizedRepoRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || relativePath.length > 240) {
    return false;
  }
  for (let index = 0; index < relativePath.length; index += 1) {
    const code = relativePath.charCodeAt(index);
    if (code < 0x20 || code > 0x7e) return false;
  }
  if (relativePath.charCodeAt(0) === 47) return false; // absolute path
  if (relativePath.includes("\\")) return false; // backslashes
  if (relativePath.includes("?") || relativePath.includes("#")) return false; // query/fragment
  for (const segment of relativePath.split("/")) {
    if (segment.length === 0) return false; // empty segment: not normalized
    if (segment === "." || segment === "..") return false; // dot segments
  }
  return true;
}

function validateGroups(groups, label) {
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new WorkflowResultError("workflow_groups_invalid", label, "empty_or_not_array");
  }
  const seen = new Set();
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const relativePath = group && typeof group === "object" ? group.repoRelativePath : undefined;
    if (!isNormalizedRepoRelativePath(relativePath)) {
      throw new WorkflowResultError("workflow_groups_invalid", label, `index=${index}`);
    }
    if (seen.has(relativePath)) {
      throw new WorkflowResultError("workflow_groups_invalid", label, `duplicate:${index}`);
    }
    seen.add(relativePath);
  }
}

function validateMaximumFixPasses(maximumFixPasses, label) {
  if (!Number.isSafeInteger(maximumFixPasses) || maximumFixPasses < 0) {
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

// Validates the fixer's declared affected-scope claim and returns the
// deduplicated declared scope ids. The declaration is a checked claim, never
// authority: empty, unknown, or duplicate sets reject. Scope ids are the
// groups' normalized repo-relative paths.
export function requireDeclaredAffectedScopeIds(fixResult, groups, label) {
  if (!fixResult || typeof fixResult !== "object" || Array.isArray(fixResult)) {
    throw new WorkflowResultError("workflow_fixer_declared_scope_invalid", label, "missing_result");
  }
  const declared = fixResult.affectedScopeIds;
  if (!Array.isArray(declared) || declared.length === 0) {
    throw new WorkflowResultError("workflow_fixer_declared_scope_invalid", label, "empty");
  }
  const known = new Set(groups.map((group) => group.repoRelativePath));
  const seen = new Set();
  for (let index = 0; index < declared.length; index += 1) {
    const scopeId = declared[index];
    if (typeof scopeId !== "string" || !known.has(scopeId)) {
      throw new WorkflowResultError("workflow_fixer_declared_scope_invalid", label, `unknown:${index}`);
    }
    if (seen.has(scopeId)) {
      throw new WorkflowResultError("workflow_fixer_declared_scope_invalid", label, `duplicate:${index}`);
    }
    seen.add(scopeId);
  }
  return [...seen].sort((left, right) => left.localeCompare(right));
}

// Derives the actually changed scope ids from before/after per-scope
// fingerprints. A scope is changed when its fingerprint differs or when it
// exists on exactly one side (the mapping itself drifted). Returns a sorted,
// deduplicated identity set so the declared-versus-actual comparison is stable.
export function deriveChangedScopeIds(beforeByScope, afterByScope) {
  const before = beforeByScope && typeof beforeByScope === "object" ? beforeByScope : {};
  const after = afterByScope && typeof afterByScope === "object" ? afterByScope : {};
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = [];
  for (const id of ids) {
    if (before[id] !== after[id]) changed.push(id);
  }
  return changed.sort((left, right) => left.localeCompare(right));
}

// Requires the declared and actual affected-scope identity sets to be exactly
// equal. Under-declared (declared `A` with actual `A+B`), over-declared
// (declared `A+B` with actual `A`), and mismatched sets reject before any
// receipt is reused.
export function requireExactIdentitySet(declared, actual, label) {
  const declaredSet = new Set(declared ?? []);
  const actualSet = new Set(actual ?? []);
  if (declaredSet.size !== (declared?.length ?? 0) || actualSet.size !== (actual?.length ?? 0)) {
    throw new WorkflowResultError("workflow_fixer_declared_scope_mismatch", label, "duplicate_ids");
  }
  if (declaredSet.size !== actualSet.size) {
    throw new WorkflowResultError(
      "workflow_fixer_declared_scope_mismatch",
      label,
      `declared=${[...declaredSet].sort().join(",")},actual=${[...actualSet].sort().join(",")}`
    );
  }
  for (const id of declaredSet) {
    if (!actualSet.has(id)) {
      throw new WorkflowResultError(
        "workflow_fixer_declared_scope_mismatch",
        label,
        `declared=${[...declaredSet].sort().join(",")},actual=${[...actualSet].sort().join(",")}`
      );
    }
  }
}

// Selects the groups whose scope actually changed, preserving declared group
// order. Only these groups plus one fresh reconcile are classified next.
export function selectVerifiedAffectedGroups(groups, actualScopeIds) {
  const affected = new Set(actualScopeIds ?? []);
  return groups.filter((group) => affected.has(group.repoRelativePath));
}

export async function runCanonicalAuditRounds({
  maximumFixPasses = DEFAULT_MAXIMUM_FIX_PASSES,
  groups,
  auditFile,
  reconcile,
  fix,
  fingerprint,
  fingerprintUniverse,
  fingerprintEveryScope,
  label = DEFAULT_LABEL,
}) {
  validateMaximumFixPasses(maximumFixPasses, label);
  validateGroups(groups, label);
  if (typeof auditFile !== "function" || typeof reconcile !== "function" || typeof fix !== "function") {
    throw new WorkflowResultError("workflow_driver_contract_invalid", label, "callbacks");
  }
  if (typeof fingerprint !== "function") {
    throw new WorkflowResultError("workflow_driver_contract_invalid", label, "fingerprint");
  }
  const parallel = parallelRunner();

  const rounds = [];
  let scopes = groups;
  for (let round = 1; round <= maximumFixPasses + 1; round += 1) {
    const before = await fingerprint(scopes);
    const jobs = [
      ...scopes.map((group) => ({
        identity: `file:${group.repoRelativePath}`,
        run: () => auditFile(group, round),
      })),
      {
        identity: "reconcile",
        run: () => reconcile({ round, changedScopes: scopes }),
      }, // exactly one per complete or affected pass
    ];
    const results = await parallel(jobs.map((job) => async () => ({
      identity: job.identity, // trusted wrapper, never agent-authored
      value: await job.run(),
    })));
    requireAllResults(
      results,
      jobs.map((job) => job.identity),
      `${label}:round:${round}`
    );
    const after = await fingerprint(scopes);
    if (after !== before) {
      throw new WorkflowResultError("workflow_audit_revision_changed", label, `round=${round}`);
    }
    const collected = collectStructuredFindings(results.map((result) => result.value));
    // Executability/test-integrity impact cannot remain LOW; classify it at
    // least MEDIUM and route it through the fixer.
    const findings = promoteExecutabilityLows(collected);
    const actionable = highMedium(findings);
    const retainedLow = findings.filter((finding) => finding.severity === "LOW");
    rounds.push({
      round,
      expected: scopes.length + 1,
      fingerprint: after,
      findings,
      actionable,
      retainedLow,
    });
    if (actionable.length === 0) {
      return { pass: true, rounds, findings };
    }
    if (round > maximumFixPasses) {
      break;
    }
    const beforeFixUniverse = await fingerprintUniverse?.(groups);
    const beforeByScope = await fingerprintEveryScope?.(groups);
    const fixResult = await fix(actionable, round);
    const afterByScope = await fingerprintEveryScope?.(groups);
    const fixedUniverse = await fingerprintUniverse?.(groups);
    if (beforeFixUniverse === undefined || beforeByScope === undefined || afterByScope === undefined || fixedUniverse === undefined) {
      throw new WorkflowResultError("workflow_fixer_fingerprint_missing", label, `round=${round}`);
    }
    if (fixedUniverse === beforeFixUniverse) {
      // The fixer changed nothing: a true no-op invalidates the round and can
      // never be presented as a verified fixer-owned change.
      throw new WorkflowResultError("workflow_fixer_no_change", label, `round=${round}`);
    }
    const declaredScopeIds = requireDeclaredAffectedScopeIds(fixResult, groups, label);
    const actualScopeIds = deriveChangedScopeIds(beforeByScope, afterByScope);
    if (actualScopeIds.length === 0) {
      // The universe changed but no declared scope captured it: an unmappable
      // mutation invalidates every retained receipt.
      throw new WorkflowResultError("workflow_fixer_unmappable_change", label, `round=${round}`);
    }
    requireExactIdentitySet(declaredScopeIds, actualScopeIds, `${label}:fix:${round}`);
    scopes = selectVerifiedAffectedGroups(groups, actualScopeIds);
    // Only changed scopes plus one fresh reconcile are classified next.
  }
  const lastRound = rounds[rounds.length - 1];
  return {
    pass: false,
    rounds,
    findings: lastRound ? lastRound.findings : [],
    reason: "audit_not_converged",
  };
}
