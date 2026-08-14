// Shared TASK-545 workflow contracts: identity-aware all-results guard,
// structured-findings normalizer, and HIGH/MEDIUM filter.
//
// Environment-neutral ESM: no repository, runtime, server, or global agent
// dependency, so Node and Bun unit tests import it directly. This module is
// the single owner of requireAllResults, collectStructuredFindings, and
// highMedium for every canonical workflow. It never stringifies agent result
// contents or agent-controlled identity text in errors: messages carry only
// caller-owned labels plus count/index metadata.
//
// `_docs/_workflows/` is globally ignored; this file lands through the owner's
// explicit force-track/review handoff with `git ls-files`/`git show HEAD`
// byte-parity proof before dependents import it.

const MAX_IDENTITY_CHARS = 240;
const FINDING_SEVERITIES = ["HIGH", "MEDIUM", "LOW"];

// Private identity contract. Accepts at most 240 ASCII characters and exactly
// one of `reconcile`, `file:<normalized-repository-relative-path>`, or
// `lens:<lowercase-kebab-or-underscore-key>`. Rejects empty suffixes, absolute
// paths, backslashes, `.`/`..` path segments, control characters, query and
// fragment delimiters, and non-ASCII confusables.
function isSafeWorkflowIdentity(identity) {
  if (typeof identity !== "string") return false;
  if (identity.length === 0 || identity.length > MAX_IDENTITY_CHARS) return false;
  for (let index = 0; index < identity.length; index += 1) {
    const code = identity.charCodeAt(index);
    if (code < 0x20 || code > 0x7e) return false;
  }
  if (identity === "reconcile") return true;
  if (identity.startsWith("file:")) {
    return isSafeFileIdentity(identity.slice("file:".length));
  }
  if (identity.startsWith("lens:")) {
    return isSafeLensIdentity(identity.slice("lens:".length));
  }
  return false;
}

function isSafeFileIdentity(suffix) {
  if (suffix.length === 0) return false;
  if (suffix.charCodeAt(0) === 47) return false; // absolute path
  if (suffix.includes("\\")) return false; // backslashes
  if (suffix.includes("?") || suffix.includes("#")) return false; // query/fragment
  for (const segment of suffix.split("/")) {
    if (segment.length === 0) return false; // empty segment: not normalized
    if (segment === "." || segment === "..") return false; // dot segments
  }
  return true;
}

function isSafeLensIdentity(suffix) {
  if (suffix.length === 0) return false;
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(suffix);
}

// Private envelope contract: a non-null own-property object whose exact own
// keys are `identity` and `value`. The identity is attached by the
// caller/orchestrator around the agent payload; agents never supply it.
function isResultEnvelope(envelope) {
  if (envelope === null || typeof envelope !== "object" || Array.isArray(envelope)) {
    return false;
  }
  const ownKeys = Object.keys(envelope);
  if (ownKeys.length !== 2) return false;
  return ownKeys.includes("identity") && ownKeys.includes("value");
}

export class WorkflowResultError extends Error {
  constructor(code, label, detail) {
    super(`${code}:${label}:${detail}`);
    this.name = "WorkflowResultError";
    this.code = code;
    this.label = label;
  }
}

// Identity-aware all-results guard. Throws synchronously on any missing,
// nullish, count-mismatched, invalid/wrong/duplicate/reordered identity so
// workflows fail closed before findings are flattened or classified as clean.
// Returns the same typed envelope-array reference; freezes neither the array
// nor its members.
export function requireAllResults(results, expectedIdentities, label) {
  if (!Array.isArray(results)) {
    throw new WorkflowResultError("workflow_results_invalid", label, "not_array");
  }
  if (
    !Array.isArray(expectedIdentities) ||
    expectedIdentities.some((id) => !isSafeWorkflowIdentity(id)) ||
    new Set(expectedIdentities).size !== expectedIdentities.length
  ) {
    throw new WorkflowResultError("workflow_expected_identities_invalid", label, "identity_set");
  }
  if (results.length !== expectedIdentities.length) {
    throw new WorkflowResultError(
      "workflow_result_count_mismatch",
      label,
      `expected=${expectedIdentities.length},actual=${results.length}`
    );
  }

  const seen = new Set();
  for (let index = 0; index < results.length; index += 1) {
    const envelope = results[index];
    if (!isResultEnvelope(envelope)) {
      throw new WorkflowResultError("workflow_result_missing", label, `index=${index}`);
    }
    if (envelope.value === null || envelope.value === undefined) {
      throw new WorkflowResultError("workflow_result_missing", label, `index=${index}`);
    }
    // identity is attached by the caller/orchestrator around the agent payload;
    // agents never supply or overwrite it.
    if (!isSafeWorkflowIdentity(envelope.identity)) {
      throw new WorkflowResultError("workflow_result_identity_invalid", label, `index=${index}`);
    }
    if (seen.has(envelope.identity)) {
      throw new WorkflowResultError("workflow_result_identity_duplicate", label, `index=${index}`);
    }
    seen.add(envelope.identity);
  }

  for (let index = 0; index < results.length; index += 1) {
    if (results[index].identity !== expectedIdentities[index]) {
      const code = expectedIdentities.includes(results[index].identity)
        ? "workflow_result_identity_reordered"
        : "workflow_result_identity_wrong";
      throw new WorkflowResultError(code, label, `index=${index}`);
    }
  }
  return results;
}

// Shared structured-findings normalizer (single owner: this module). Consumed
// by the audit-round and post-audit drivers BEFORE severity filtering; it must
// never drop a finding, reorder severity, or invent one. `values` is any
// subset of agent payloads shaped {severity: "HIGH"|"MEDIUM"|"LOW", area,
// finding, evidence, recommendation}. Envelopes were already validated by
// requireAllResults, so a nullish entry is skipped rather than rejected here.
export function collectStructuredFindings(values) {
  if (!Array.isArray(values)) {
    throw new WorkflowResultError("workflow_findings_invalid", "collect", "not_array");
  }
  const out = [];
  for (const value of values) {
    if (value == null) continue;
    const findings = Array.isArray(value.findings) ? value.findings : [];
    for (const finding of findings) {
      if (!finding || !FINDING_SEVERITIES.includes(finding.severity)) {
        throw new WorkflowResultError("workflow_findings_invalid", "collect", "severity");
      }
      out.push(finding);
    }
  }
  return out;
}

// Filters a validated structured-findings list down to actionable HIGH/MEDIUM
// entries, preserving order. Consumed by the audit-round and post-audit
// drivers after collectStructuredFindings.
export function highMedium(findings) {
  return findings.filter(
    (finding) => finding && (finding.severity === "HIGH" || finding.severity === "MEDIUM")
  );
}
