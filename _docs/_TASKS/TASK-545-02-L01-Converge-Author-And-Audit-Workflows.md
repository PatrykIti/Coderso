# TASK-545-02-L01: Converge Author and Audit Workflows

# FileName: TASK-545-02-L01-Converge-Author-And-Audit-Workflows.md

**Parent Task:** TASK-545
**Parent Subtask:** TASK-545-02
**Priority:** High
**Category:** Workflow Orchestration / Pre-Implementation Audit
**Estimated Effort:** Large
**Dependencies:** TASK-545-01-L01
**Status:** ⏳ To Do
**Changelog:** 1257 (pinned; closure only)

---

## Overview

Converge the author, pre-audit, and audit workflow inventory on one complete
identity-checked round plus finding-driven affected-scope reconciliation.

## Sub-Tasks

None; this is an executable leaf with the exclusive script inventory below.

## Exclusive ownership

- new `_docs/_workflows/lib/audit-rounds.mjs`;
- new `_docs/_workflows/lib/audit-rounds.d.mts`;
- new `tests/unit/workflows/auditRounds.test.ts`;
- exactly these two tracked author/audit entries after security-first TASK-554 lands:

```text
task-522-author.mjs
task-554-author-audit.mjs
```

Combined `*implement*`, `*impl*`, `*full*`, `*fix*`, and `*remediation*`
entries belong to L02. Immediately before editing, derive the top-level
executable inventory from `git ls-files`, classify every tracked entry, and
compare it with L01's two files plus L02's three files. A missing or additional
tracked entry is blocking contract drift requiring explicit assignment and a
fresh affected audit; neither leaf silently widens a wildcard. Ignored local
scripts and scripts removed by `5facaf32` are diagnostics/history only and must
not be modified or counted as migrated.

## Grounded files requiring canonical-pass repair

- `task-522-author.mjs:159-194` owns a bespoke fixed five-round loop, uses
  `audits.filter(Boolean)`, and can classify a partial result set as clean.
- TASK-546/changelog 1259 already remediated the former prompt-injection/Semgrep
  finding through tracked `lib/task-522-findings-prompt.mjs` plus
  `tests/unit/workflows/task522FindingsPrompt.test.ts`; current line 183 calls
  that formatter. Both are read-only regression inputs for this leaf. Preserve
  their contract and prove the focused test plus targeted scan remain green.
- TASK-554's terminal author/audit entry is expected to use the agreed
  structured result shape; TASK-545 reads its committed bytes fresh and migrates
  only verified differences from the canonical driver.

**Progress (2026-07-22):** The TASK-522 prompt formatter/helper repair is complete
and recorded by changelog 1259. The tracked author entry still contains the
independent false-clean result filter and bespoke round loop, so this leaf stays
`⏳ To Do` without reopening the completed security repair.

## Implementation Pseudocode

```js
// audit-rounds.mjs
export async function runCanonicalAuditRounds({
  maximumFixPasses = 8,
  groups,
  auditFile,
  reconcile,
  fix,
  fingerprint, // SHA-256 over sorted audited file paths + bytes, HEAD and dirty status
  label,
}) {
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
    const findings = collectStructuredFindings(results.map((result) => result.value));
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
    const beforeFixUniverse = await fingerprintUniverse(groups);
    const beforeByScope = await fingerprintEveryScope(groups);
    const fixResult = await fix(actionable, round);
    const declaredScopeIds = requireDeclaredAffectedScopeIds(fixResult, groups);
    const afterByScope = await fingerprintEveryScope(groups);
    const fixedUniverse = await fingerprintUniverse(groups);
    const actualScopeIds = deriveChangedScopeIds(beforeByScope, afterByScope);
    requireExactIdentitySet(
      declaredScopeIds,
      actualScopeIds,
      `${label}:fix:${round}`,
    );
    scopes = selectVerifiedAffectedGroups(groups, actualScopeIds);
    if (scopes.length === 0 || fixedUniverse === beforeFixUniverse) {
      throw new WorkflowResultError("workflow_fixer_no_change", label, `round=${round}`);
    }
    // Only changed scopes plus one fresh reconcile are classified next.
  }
  return { pass: false, rounds, reason: "audit_not_converged" };
}
```

## Mandatory staged implementation order

1. Create `audit-rounds.mjs` and `auditRounds.test.ts` only.
2. Run the helper contract plus the synthetic driver suite and require both green.
3. Only then migrate the two enumerated tracked scripts in lexical order.
4. Re-run the same behavior suites, `node --check` every owned script, the inventory
   comparison, targeted Semgrep, and diff checks.

The driver test is the sole behavioral owner for the canonical round engine. It uses
synthetic jobs/fingerprints only and must not import live workflow scripts. A failing
driver contract blocks migration; script migration never serves as the first test of the
new engine.

The full-universe fingerprint includes every declared group, current HEAD, and
porcelain dirty context; each per-scope fingerprint includes that scope's exact
normalized path set and bytes. It excludes only generated audit output outside
the contract set. Before and after a fixer, the driver computes both layers
itself. The actual changed-scope identity set must equal the fixer's declared set
exactly. Declaring `A` while changing `A+B`, declaring `A+B` while changing only
`A`, changing an unowned path, or changing a shared input with no complete scope
mapping invalidates retained receipts and requires one fresh complete pass after
correction. The
initial pass contains every declared group and may exit clean immediately. Every
complete or affected pass contains exactly one reconcile invocation, never one
reconcile outside the driver. A missing result
or wrong/duplicate/reordered stable identity throws before payload flattening. File-job
identities use normalized repo-relative paths; reconcile is exactly `reconcile`, and those
identities are attached by the orchestrator wrapper rather than trusted from agent output.
HIGH/MEDIUM findings form `actionable`, block a clean result, and go to the
fixer. Preserve LOW findings in `retainedLow` rather than silently dropping or
promoting them. A fixer's changed-scope declaration is a checked claim, never
authority. Empty, unknown, unchanged, under-declared, or over-declared sets
reject; only an exact before/after-derived set reruns those scopes plus one
reconcile.

Each migrated prompt includes current repo path, HEAD, dirty status, task IDs,
read-only/no-edit instruction, severity ordering, concrete file:line evidence,
and secret redaction. Replace stale dynamic changelog language with the literal
task pin or actual historical pin.

For `task-522-author.mjs`, preserve the existing separately serialized bounded
finding payload and `buildTask522FixPrompt` call while replacing only the audit
round machinery. Do not edit/rebaseline the formatter or its focused test, move
agent-controlled findings back into a script-bearing interpolation, add a
Semgrep ignore, weaken the ruleset, or encode/bypass the scanner. Targeted
Semgrep plus the existing prompt-output test are regression gates, not work
claimed by TASK-545.

## Error/compatibility flow

- Missing agent/reconcile result aborts false-clean classification.
- Any audited-byte/HEAD/dirty-context change during dispatch aborts the round before
  findings are flattened or classified; the orchestrator starts a fresh round.
- Non-convergence returns explicit failure/residual findings.
- A finding that weakens executability or test integrity cannot remain LOW;
  classify it at least MEDIUM and route it through the fixer. A genuine LOW
  remains visible and follows the repository's exact TASK-9999 disposition
  rules without blocking HIGH/MEDIUM convergence by itself.
- A verified fixer-owned change forces only the affected-scope audit plus one
  fresh reconcile. An unexpected or undeclared change invalidates the complete
  pass.
- Existing structured result schemas stay; unstructured scripts gain schemas
  rather than parsing prose.

## Synthetic behavior tests owned by this leaf

`tests/unit/workflows/auditRounds.test.ts` covers one complete clean pass, missing per-file,
missing reconcile, correctly identified envelopes carrying null/undefined values that abort
before `collectStructuredFindings`, wrong/duplicate/reordered file identities, two reconciles rejected by
wrapper contract, audited bytes changing during dispatch abort before classification,
HIGH/MEDIUM trigger a fixer and only the fingerprint-derived affected scopes plus
reconcile rerun, unchanged clean scopes do not replay, retained genuine LOW does not
disappear or block HIGH/MEDIUM convergence, executability/test-integrity impact
cannot be labeled LOW, unexpected change forces a complete pass, fixer no-op/
unknown scope rejects, declared `A` with actual `A+B` and declared `A+B` with
actual `A` both reject before receipt reuse, unmappable mutation invalidates all
retained receipts, and maximum-fix-pass failure is explicit.

## Testing Requirements

```bash
node --check _docs/_workflows/lib/audit-rounds.mjs
bun run lint:repo:types
git ls-files -z -- '_docs/_workflows/*.mjs' '_docs/_workflows/lib/*.mjs' |
  xargs -0 -r -n1 node --check
bun test tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts \
  tests/unit/workflows/task522FindingsPrompt.test.ts
if rg -n '\b(?:audits|results|responses)\.filter\(Boolean\)' \
  _docs/_workflows/task-522-author.mjs \
  _docs/_workflows/task-554-author-audit.mjs; then exit 1; fi
semgrep --error --config .semgrep.yml _docs/_workflows/task-522-author.mjs
git diff --check
```

The static checker targets agent-result collection and canonical-driver use; it
must not reject unrelated `.filter(Boolean)` calls in domain/browser/process
data. Before either new ignored library/declaration or TASK-554 entry is consumed, return an
`owner_action_required` handoff and require owner force-tracking plus committed
`git ls-files`/`git show HEAD` byte parity. Agents never stage files.

## Documentation Updates Required

- No shared documentation edit in this leaf; keep the owned script inventory
  current in this contract.
- TASK-545-04-L03 owns board and changelog 1257 closure evidence.
