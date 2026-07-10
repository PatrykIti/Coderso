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

## Exclusive ownership

- new `_docs/_workflows/lib/audit-rounds.mjs`;
- new `tests/unit/workflows/auditRounds.test.ts`;
- exactly these 24 current scripts:

```text
task-482-author-audit.mjs
task-483-author-audit.mjs
task-484-author-audit.mjs
task-499-preaudit-map.mjs
task-500-author-audit.mjs
task-501-author-audit.mjs
task-502-author-audit.mjs
task-503-author-audit.mjs
task-504-author-audit.mjs
task-505-author-audit.mjs
task-506-author-audit.mjs
task-508-author-audit.mjs
task-511-author-audit.mjs
task-517-author.mjs
task-519-520-author.mjs
task-521-author.mjs
task-522-author.mjs
task-524-author.mjs
task-525-author.mjs
task-531-534-author.mjs
task-536-545-author-audit.mjs
task-contract-converge.mjs
task-drift-audit-only.mjs
task-screen-author-audit.mjs
```

Combined `*-full.mjs` and every `*implement*`, `*impl*`, `*fix*`, or
`*remediation*` file belong to L02, even when they contain an author/audit phase.
Immediately before editing, compare this 24-file list plus L02's 44-file list with
every active top-level `.mjs`. A missing/new file is blocking contract drift requiring
explicit assignment and fresh audit; neither leaf silently widens a wildcard.

## Grounded files requiring minimum-round repair

- `task-517-author.mjs:168` (maximum 4).
- `task-524-author.mjs:79`, `task-525-author.mjs:70`, and
  `task-531-534-author.mjs:113` (maximum 3).
- `task-531-534-author.mjs:103-138` reconciles once before the loop and filters
  missing results.
- Other author/audit scripts with `.filter(Boolean)` include the 500–508,
  511, 519–522 families and must import `requireAllResults` even when their round
  count was already sufficient.
- `task-511-author-audit.mjs:17,56,66` also has stale removed-worktree/HEAD/pin
  facts; update factual orchestration only and keep TASK-511 To Do/obsolete audit.
- `task-522-author.mjs:185` is the second current strict-Semgrep finding: a
  prompt-only false positive caused by dynamic finding text sharing a template
  literal with scanner-sensitive markup language. Rewrite the prompt structure
  non-suppressively and prove the targeted scan is clean.

## Implementation Pseudocode

```js
// audit-rounds.mjs
export async function runCanonicalAuditRounds({
  minimumRounds = 5,
  maximumRounds = 8,
  groups,
  auditFile,
  reconcile,
  fix,
  fingerprint, // SHA-256 over sorted audited file paths + bytes, HEAD and dirty status
  label,
}) {
  const rounds = [];
  for (let round = 1; round <= maximumRounds; round += 1) {
    const before = await fingerprint(groups);
    const jobs = [
      ...groups.map((group) => ({
        identity: `file:${group.repoRelativePath}`,
        run: () => auditFile(group, round),
      })),
      { identity: "reconcile", run: () => reconcile(round) }, // exactly one
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
    const after = await fingerprint(groups);
    if (after !== before) {
      throw new WorkflowResultError("workflow_audit_revision_changed", label, `round=${round}`);
    }
    const findings = collectStructuredFindings(results.map((result) => result.value));
    const blocking = highMedium(findings);
    const executionWeakeningLow = findings.filter(
      (finding) => finding.severity === "LOW" && finding.weakensExecutability === true
    );
    const actionable = [...blocking, ...executionWeakeningLow];
    const retainedLow = findings.filter(
      (finding) => finding.severity === "LOW" && finding.weakensExecutability !== true
    );
    rounds.push({
      round,
      expected: groups.length + 1,
      fingerprint: after,
      findings,
      actionable,
      retainedLow,
    });
    if (round >= minimumRounds && actionable.length === 0) {
      return { pass: true, rounds, findings };
    }
    if (actionable.length > 0) {
      await fix(actionable, round);
      const fixed = await fingerprint(groups);
      if (fixed === after) {
        throw new WorkflowResultError("workflow_fixer_no_change", label, `round=${round}`);
      }
      // The changed contract is never classified by this pass; the next round is fresh.
    }
  }
  return { pass: false, rounds, reason: "audit_not_converged" };
}
```

## Mandatory staged implementation order

1. Create `audit-rounds.mjs` and `auditRounds.test.ts` only.
2. Run the helper contract plus the synthetic driver suite and require both green.
3. Only then migrate the 24 enumerated scripts in lexical order.
4. Re-run the same behavior suites, `node --check` every owned script, the inventory
   comparison, targeted Semgrep, and diff checks.

The driver test is the sole behavioral owner for the canonical round engine. It uses
synthetic jobs/fingerprints only and must not import live workflow scripts. A failing
driver contract blocks migration; script migration never serves as the first test of the
new engine.

The fingerprint includes all files assigned to the round, current HEAD, and porcelain
dirty context; it excludes only generated audit output outside the contract set. The
driver must not early-exit before round 5. A round contains exactly one
reconcile invocation, not one reconcile outside the loop. A missing result
or wrong/duplicate/reordered stable identity throws before payload flattening. File-job
identities use normalized repo-relative paths; reconcile is exactly `reconcile`, and those
identities are attached by the orchestrator wrapper rather than trusted from agent output.
The structured finding schema includes the explicit
`weakensExecutability` boolean for LOW findings; only evidence-backed LOW findings may set
it. HIGH/MEDIUM plus those LOW findings form `actionable`, block a clean result, and go to
the fixer. Preserve all other LOW findings in `retainedLow` rather than silently dropping
or promoting them.

Each migrated prompt includes current repo path, HEAD, dirty status, task IDs,
read-only/no-edit instruction, severity ordering, concrete file:line evidence,
and secret redaction. Replace stale dynamic changelog language with the literal
task pin or actual historical pin. TASK-511's old audit is recorded obsolete; do
not imply its security-blocked contract passed on current HEAD.

For `task-522-author.mjs`, pass findings as a separately serialized structured
payload (for example a bounded JSON field produced by a pure formatter) and keep
scanner-sensitive static security guidance out of the interpolated template. Do
not delete the security requirement, add a Semgrep ignore, weaken the ruleset, or
encode/bypass the scanner. Targeted Semgrep plus prompt-output tests must prove
the rewrite preserves meaning and removes the false positive.

## Error/compatibility flow

- Missing agent/reconcile result aborts false-clean classification.
- Any audited-byte/HEAD/dirty-context change during dispatch aborts the round before
  findings are flattened or classified; the orchestrator starts a fresh round.
- Non-convergence returns explicit failure/residual findings.
- An executability-weakening LOW finding blocks clean classification and reaches the
  fixer; an informational LOW remains visible in the round result.
- Any fixer change forces a fresh subsequent audit/reconcile.
- Existing structured result schemas stay; unstructured scripts gain schemas
  rather than parsing prose.

## Synthetic behavior tests owned by this leaf

`tests/unit/workflows/auditRounds.test.ts` covers five rounds clean, missing per-file,
missing reconcile, correctly identified envelopes carrying null/undefined values that abort
before `collectStructuredFindings`, wrong/duplicate/reordered file identities, two reconciles rejected by
wrapper contract, round-4 clean
still continues, audited bytes changing during dispatch abort before classification,
HIGH/MEDIUM and execution-weakening LOW trigger a fixer and fresh round, retained LOW does
not disappear or block clean, fixer change forces a new fingerprinted round, fixer no-op,
and maximum-round failure.

## Validation

```bash
node --check _docs/_workflows/lib/audit-rounds.mjs
for file in _docs/_workflows/*.mjs; do node --check "$file"; done
bun test tests/unit/workflows/workflowContracts.test.ts \
  tests/unit/workflows/auditRounds.test.ts
rg -n -F '.filter(Boolean)' _docs/_workflows -g '*.mjs'  # inventory only; final zero after L02
semgrep --error --config .semgrep.yml _docs/_workflows/task-522-author.mjs
git diff --check
```
