# TASK-292-06: Toggle Block Report Docs Changelog and Closure

# FileName: TASK-292-06_Toggle_Block_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Documentation + QA + Changelog + Task Board
**Estimated Effort:** Medium
**Dependencies:** TASK-292-01, TASK-292-02, TASK-292-03, TASK-292-04, TASK-292-05, TASK-256-08
**Status:** To Do

---

## Overview

Close the Toggle Block Playwright follow-up family by refreshing report
evidence, widget docs, changelog, and task-board state after implementation
leaves finish.

This leaf is the control point that prevents TASK-292 from claiming TASK-256
shared-contract fixes or overclaiming future product scope.

## Source Evidence

- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` is the source report.
- `_docs/_TASKS/TASK-256-05-04_Tabs_Accordion_and_Toggle_Block_Structural_Residuals.md`
  already routes Toggle Block helper clear, missing clear controls,
  placeholders, duplicate IDs, and ARIA/runtime root scope into TASK-256.
- `_docs/_WIDGETS/TOGGLE_BLOCK.md` is the widget docs owner.

## Scope

- Update the Playwright report with fixed, TASK-256-routed, deferred, or
  intentional-product-boundary status for every Toggle Block finding.
- Update `_docs/_WIDGETS/TOGGLE_BLOCK.md` with final data model, editor modes,
  runtime behavior, accessibility copy, motion, style, and authoring notes.
- Add changelog coverage when TASK-292 implementation work lands.
- Update `_docs/_CHANGELOG/README.md` and `_docs/_TASKS/README.md`.
- Mark TASK-292 and completed leaves `Done (YYYY-MM-DD)` only after validation
  evidence is present.

## Out of Scope

- Implementing product behavior. That belongs to TASK-292-01 through
  TASK-292-05.
- Claiming TASK-256 rows as fixed by TASK-292.
- Closing TASK-292 before TASK-256-routed rows have either concrete TASK-256
  evidence or explicit deferred status from TASK-256-08.

## Sub-Tasks

- [ ] Enumerate every finding from
  `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md`.
- [ ] Classify each finding as fixed by TASK-292, routed to TASK-256,
  intentional two-state boundary, or deferred future product scope.
- [ ] Refresh the Toggle Block report and widget docs with concrete evidence.
- [ ] Add changelog coverage and update `_docs/_CHANGELOG/README.md`.
- [ ] Move completed TASK-292 rows in `_docs/_TASKS/README.md` and recompute
  statistics.
- [ ] Record final validation commands before marking the family Done.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` | Add final status/evidence for each finding. |
| `_docs/_WIDGETS/TOGGLE_BLOCK.md` | Update final widget contract docs. |
| `_docs/_TASKS/TASK-292*.md` | Move completed tasks to Done with dates and evidence. |
| `_docs/_TASKS/README.md` | Move completed TASK-292 rows to Done and update statistics. |
| `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-292-toggle-block-widget-followups.md` | Add final changelog entry when implementation lands. |
| `_docs/_CHANGELOG/README.md` | Add the final changelog entry. |

## Implementation Pseudocode

```ts
type ToggleBlockFindingStatus =
  | "fixed-by-task-292"
  | "task-256-shared-scope"
  | "intentional-two-state-boundary"
  | "deferred-future-product-scope";

function classifyToggleBlockFinding(findingId: string): ToggleBlockFindingStatus {
  if (sharedTask256Findings.has(findingId)) return "task-256-shared-scope";
  if (twoStateBoundaryFindings.has(findingId)) return "intentional-two-state-boundary";
  if (implementedTask292Findings.has(findingId)) return "fixed-by-task-292";
  return "deferred-future-product-scope";
}

function assertClosureCoverage(findings: ToggleBlockFinding[]) {
  const uncovered = findings.filter((finding) => !classifyToggleBlockFinding(finding.id));
  if (uncovered.length > 0) {
    throw new Error(`Uncovered Toggle Block findings: ${uncovered.map((item) => item.id).join(", ")}`);
  }
}

function assertValidationEvidence(evidence: ValidationEvidence) {
  requireCommand(evidence, "git diff --check");
  requireCommand(evidence, "bun --cwd core lint");
  requireCommand(evidence, "bun --cwd core lint:types");
  requireCommand(evidence, "bun run precommit");
  requireTargetedToggleBlockSuites(evidence);
}
```

Data flow:

1. Enumerate every source-report finding before editing closure docs.
2. Classify each finding against TASK-256, TASK-292 implementation leaves,
   two-state product boundary, or deferred future product scope.
3. Mirror the classification in the report, widget docs, task files, changelog,
   and task-board rows.
4. Run validation and record exact command evidence in task/changelog notes,
   including the AGENTS baseline and targeted Toggle Block suites before any
   row moves to Done.

Error handling:

- If a report row cannot be mapped, keep TASK-292 open and create a physical
  follow-up leaf instead of silently dropping it.
- If TASK-256 evidence is missing for a shared row, record it as awaiting
  TASK-256-08 instead of marking it fixed by TASK-292.
- If board stats conflict after other agents land rows, preserve all rows and
  recompute counts from the current README state.
- If AGENTS baseline commands or targeted Toggle Block suites are missing from
  the evidence, keep TASK-292 open even if docs/report classification is
  complete.

Regression-test shape:

- Closure review checks every report row appears exactly once in the final
  fixed/routed/deferred classification.
- Task-board checks recompute README statistics after moving TASK-292 rows.
- Validation evidence checks include `git diff --check`, AGENTS baseline lint
  commands, targeted Toggle Block suites, gates/security scans where required,
  and `bun run precommit`.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model, RBAC, CSRF, and rate limits: unchanged.
- Reject-unknown validation: this closure leaf only documents final schema
  evidence; implementation leaves own schema tests.
- Anti-abuse: report/changelog must not include secrets, private URLs, tokens,
  browser storage dumps, or privileged config.
- Secret handling: no secrets in docs, reports, changelog, or task evidence.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if any TASK-292 leaf changed
  schema/defaults
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md`
- `_docs/_WIDGETS/TOGGLE_BLOCK.md`
- `_docs/_TASKS/TASK-292*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-292-toggle-block-widget-followups.md`

## Acceptance Criteria

- Every source-report finding has a concrete final status.
- TASK-292 does not claim TASK-256 shared-contract rows.
- Task board, task files, widget docs, report, and changelog agree.
- Final validation evidence is recorded before the family is marked Done.
