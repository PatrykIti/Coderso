# TASK-547-07: Multi-Agent Workflow and Drift Evidence
# FileName: TASK-547-07-Multi-Agent-Workflow-And-Drift-Evidence.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Workflow / Audit / Collision Safety
**Estimated Effort:** Medium
**Dependencies:** None; runs throughout TASK-547
**Status:** ⏳ To Do

---

## Overview

Own the reproducible TASK-547 multi-agent orchestration, five-round contract
drift audit, implementation dispatch/gates, post-audit lenses and final smoke
evidence. This child changes workflow/evidence files only and never edits package,
installer, generator, CLI, or product test contracts.

**Single-writer ownership:** `_docs/_workflows/task-547-*.mjs` and distinct
`_docs/_workflows/_smoke/task-547/audit-evidence/*`. TASK-547-06 exclusively
writes screenshots and the scenario manifest; this child only verifies their
hashes read-only and writes separate audit evidence.

## Collision Guards

- Forbidden product paths: every file owned by TASK-547-01..06.
- Changelog 1260 is pinned; only TASK-547-06 edits task/changelog closeout.
- Each implementer receives an explicit owned-file list and reads current on-disk
  shared seams before editing.
- Missing agent output is a failed audit round, never a clean pass.

## Security Contract

No endpoint or permission changes. Audit prompts are read-only and must exclude
secrets, credentials, private keys, raw sensitive logs, submission payloads and
unredacted user data. Structured results contain file/line evidence only.

## Implementation Pseudocode

```ts
for (let round = 1; round <= 5; round += 1) {
  const perFile = await runParallelContractAudits(TASK_547_TASK_FILES);
  assertEveryAuditReturned(perFile);
  const reconcile = await runReconcileAudit({
    ownership: SINGLE_WRITER_MAP,
    sharedShapes: PACKAGE_RESOURCE_KINDS,
    landOrder: TASK_547_LAND_ORDER,
    changelog: 1260,
  });
  const findings = collectHighMedium(perFile, reconcile);
  if (findings.length) await runScopedFixers(findings);
  recordRoundEvidence(round, findings);
}
assertFinalFreshReconcilePass();
```

**Data flow:** current HEAD/status/diff + task/source/docs/tests → structured
read-only audits → verified findings → scoped fixes → fresh audits.

**Error handling:** false-clean, timeout, malformed output or missing result fails
the round. Do not implement from stale audit evidence after any contract change.

**Regression-test shape:** workflow smoke proves all-results guard, five sequential
rounds, reconcile invocation, forbidden-path enforcement, result schema and
non-zero exit on false-clean.

## Sub-Tasks

- [ ] Add `task-547-author-audit.mjs` with five sequential rounds.
- [ ] Add implementation/fix dispatch scripts with per-child gates.
- [ ] Add workflow smoke fixtures and all-results/collision assertions.
- [ ] Record pre-implementation and final drift evidence.
- [ ] Preserve final Playwright screenshot manifest hashes.

## Testing Requirements

- workflow script syntax/unit smoke
- task graph/H1/FileName/parent/status audit
- forbidden-path collision smoke
- structured-output false-clean smoke
- touched-file line counts

## Documentation Updates Required

Record audit summaries that materially changed the contract in TASK-547 and
changelog 1260 at closure.
