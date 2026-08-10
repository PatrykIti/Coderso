# TASK-545-01-L01: Add `requireAllResults` Helper

# FileName: TASK-545-01-L01-Add-Require-All-Results-Helper.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-01
**Priority:** High
**Category:** Workflow Infrastructure / Reliability
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Add the pure identity-aware all-results guard that every TASK-545 workflow
driver will use to fail closed before flattening or classifying agent results.

## Sub-Tasks

None; this is an executable leaf with the exclusive file ownership below.

## Exclusive ownership

- new `_docs/_workflows/lib/workflow-contracts.mjs`
- new `_docs/_workflows/lib/workflow-contracts.d.mts`
- new `tests/unit/workflows/workflowContracts.test.ts`
- helper-unit fixtures under `tests/fixtures/workflows/results/` if required

No workflow script or live-tree static test is edited here. The declaration
types every runtime export consumed by strict TypeScript tests; tests import the
`.mjs` owner and never add a local substitute declaration.

## Grounded anchors

- Tracked false-clean pattern:
  `_docs/_workflows/task-522-author.mjs:168-179`.
- Tracked local guards that TASK-545 will replace live in
  `_docs/_workflows/task-543-implement.mjs:1986-2035`.
- Historical examples such as `task-drift-audit-only.mjs` and
  `task-531-534-author.mjs` were removed by `5facaf32`; they may be read from its
  parent commit as design evidence but are not implementation targets.
- Structured output contracts are already used by current workflows; the helper
  validates collection completeness, not finding schemas.

## Implementation Pseudocode

```js
export class WorkflowResultError extends Error {
  constructor(code, label, detail) {
    super(`${code}:${label}:${detail}`);
    this.name = "WorkflowResultError";
    this.code = code;
    this.label = label;
  }
}

export function requireAllResults(results, expectedIdentities, label) {
  if (!Array.isArray(results)) {
    throw new WorkflowResultError("workflow_results_invalid", label, "not_array");
  }
  if (!Array.isArray(expectedIdentities) ||
      expectedIdentities.some((id) => !isSafeWorkflowIdentity(id)) ||
      new Set(expectedIdentities).size !== expectedIdentities.length) {
    throw new WorkflowResultError("workflow_expected_identities_invalid", label, "identity_set");
  }
  if (results.length !== expectedIdentities.length) {
    throw new WorkflowResultError(
      "workflow_result_count_mismatch", label,
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
```

Every parallel job is wrapped by trusted caller code as
`{ identity: stableExpectedIdentity, value: agentResult }`; the agent schema owns only
`value`. Null and undefined wrapped values are missing results and always reject before
payload flattening. Do not use broader payload truthiness: valid values such as `false`,
`0`, or an empty string remain complete unless the caller's payload schema rejects them. Freeze neither
array nor members. Return the same typed envelope-array reference so scripts can flatten
validated `.value` payloads without casts/copies.

`isSafeWorkflowIdentity` accepts at most 240 ASCII characters and exactly one of
`reconcile`, `file:<normalized-repository-relative-path>`, or
`lens:<lowercase-kebab-or-underscore-key>`. It rejects empty suffixes, absolute paths,
backslashes, `.`/`..` path segments, control characters, query/fragment delimiters, and
non-ASCII confusables. `isResultEnvelope` requires a non-null own-property object with
exact own keys `identity` and `value`; `requireAllResults` then rejects a nullish `value`
without rejecting other falsey payloads. These
helpers are private to the module and are covered through `requireAllResults` rather than
exported as a second public contract.

Errors expose only label/count/index metadata, never stringify agent result contents or
agent-controlled identity text. Expected identities are bounded caller-owned labels. The
helper is environment-neutral ESM and has no repository/global agent dependency, so Node
and Bun unit tests can import it directly.

## Error/compatibility flow

- Wrong container/count/null/undefined, invalid/wrong/duplicate/reordered identity, or an
  invalid expected identity set throws synchronously and prevents clean classification.
- Exact complete arrays pass unchanged.
- Job identities are deterministic (`file:<repo-relative-path>`, `reconcile`, or
  `lens:<stable-key>`) and attached outside agent output.

## Regression-test shape owned by this leaf

`tests/unit/workflows/workflowContracts.test.ts` tests non-array, short, long, sparse,
null/undefined array entries, envelopes whose wrapped value is null/undefined,
invalid/duplicate expected identities, missing/invalid/wrong/
duplicate/reordered result identities, complete structured envelopes, false/zero/empty
payload values, same-array identity return, stable machine-readable codes, and absence of
serialized payload or agent-controlled identity content in error messages. Driver-shaped
fixtures prove a wrapped nullish return throws before `collectStructuredFindings` or any
clean classification callback is invoked.

## Testing Requirements

```bash
node --check _docs/_workflows/lib/workflow-contracts.mjs
bun run lint:repo:types
bun test tests/unit/workflows/workflowContracts.test.ts
git diff --check
```

Because `_docs/_workflows/` is globally ignored, the new runtime and declaration
are an explicit owner-review/force-track handoff. The implementing agent returns
`owner_action_required` and stops; after the owner records it, a fresh run must
prove `git ls-files --error-unmatch` and `git show HEAD:<path>` byte parity before
any dependent migration imports it. Agents never invoke `git add`.

## Documentation Updates Required

- No shared documentation edit in this leaf.
- Report validation to the parent; TASK-545-04-L03 owns board and changelog 1257.
