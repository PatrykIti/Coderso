# TASK-256-08: Playwright Report Completion and Closure

# FileName: TASK-256-08_Playwright_Report_Completion_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-04, TASK-256-05, TASK-256-06, TASK-256-07
**Status:** To Do

---

## Overview

Complete the Playwright report audit loop and close TASK-256 only after reports,
tests, docs, changelog, and task board agree with the implemented behavior.

Several current reports are still marked in progress, are authentication-limited,
or were completed after the first TASK-256 draft. This closure leaf converts the
audit archive into final evidence: fixed findings, intentionally deferred
findings, exact validation commands, and follow-up tasks for product expansions
that are not contract repairs.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:3` is still marked
  `W toku`.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:3` is still marked `W toku`.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:220,258` contains
  authentication-limited comparison sections that require final classification.
- Completed reports such as CTA banner, logo cloud, team, stack,
  testimonials, and pricing plans need their fixed/deferred status refreshed
  after the implementation leaves land.
- Other reports need fixed/deferred status updates after implementation leaves.

## Sub-Tasks

- [ ] Re-run or refresh every widget report touched by TASK-256.
- [ ] Mark each report finding as fixed, deferred, not reproducible, or future
  product scope.
- [ ] Add follow-up task files for deferred work that is not a shared-contract
  repair.
- [ ] Add a page-shell follow-up task if Hero report findings around history
  auth, preview toolbar, discard, or viewport controls are still reproducible
  after widget-local fixes.
- [ ] Record git-scope preflight before every closure commit and stage only
  explicit TASK-256/report/docs/changelog files.
- [ ] Update source-of-truth widget docs and pack matrix where behavior changed.
- [ ] Add changelog entry and synchronize `_docs/_CHANGELOG/README.md`.
- [ ] Move all TASK-256 task files and `_docs/_TASKS/README.md` rows to Done.

## Files to Change

| File group | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md` | Add final admin/frontend evidence, fixed/deferred status, and screenshots/URLs where applicable. |
| `_docs/_WIDGETS/*.md` | Update widget contracts for changed schema/editor/runtime behavior. |
| `_docs/WIDGETS.md` | Update only if shared contracts changed. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if readiness/completeness changes. |
| `_docs/_TASKS/TASK-256*.md` | Update status, dates, validation evidence, and remaining follow-ups. |
| `_docs/_TASKS/README.md` | Move tasks from To Do/In Progress to Done and update statistics. |
| `_docs/_CHANGELOG/*.md` and `_docs/_CHANGELOG/README.md` | Add final TASK-256 changelog entry. |

## Implementation Pseudocode

Template only, not final evidence:

```md
## Final TASK-256 Evidence

| Finding | Status | Fix owner | Test evidence | Deferred task |
|---|---|---|---|---|
| Public empty placeholder | <fixed/deferred/not-reproducible/future-scope> | <TASK-256-03 or leaf> | <command + result> | <n/a or task id> |
| True carousel controls | <future-scope> | n/a | n/a | <physical follow-up task id> |
```

Closure helper shape:

```ts
type ReportFindingStatus = "fixed" | "deferred" | "not-reproducible" | "future-scope";

function classifyFinding(finding: Finding, implementedFixes: FixMap): ReportFindingStatus {
  if (implementedFixes.has(finding.id)) return "fixed";
  if (finding.requiresNewProductScope) return "future-scope";
  if (finding.wasNotReproduced) return "not-reproducible";
  return "deferred";
}
```

Error handling:

- Do not mark a report as fixed unless there is matching code/test evidence or a
  verified non-reproducible note.
- Do not close TASK-256 while any child task remains To Do/In Progress.
- If a broad repo gate fails for unrelated reasons, isolate and record it; do
  not hide the failure in report prose.
- If `git status --short --branch` shows unrelated dirty files, leave them
  unstaged and state that they were not part of closure evidence.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added by this closure task.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: closure must verify schema tests for leaves that
  changed schemas.
- Anti-abuse: final reports must not include secrets, tokens, private URLs, or
  privileged debug payloads.
- Secret handling: redact screenshots/logs if they contain sensitive values.

## Testing Requirements

- Run every targeted suite listed in completed TASK-256 leaves.
- Dynamic/content closure must include:
  - `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/contentList.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/menu-editor-validation.test.ts`
- Schema/default/runtime registration changes must include:
  - `bun test tests/unit/widgets/validator.test.ts`
  - `bun test tests/unit/widgets/registry.test.ts`
  - `bun test tests/unit/widgets/runtimeRegistry.test.ts`
- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`
- Run Bun registry/validator tests when any widget schema/default/runtime
  registration changed.
- If DB-backed or network-backed gates are unavailable, record the exact blocker
  and rerun before final closure.

## Documentation Updates Required

- All touched Playwright reports.
- All touched widget source-of-truth docs.
- `_docs/_TASKS/README.md`.
- `_docs/_CHANGELOG/README.md` and the new changelog entry.
- `_docs/WIDGET_PACK_MATRIX.md` only if readiness changed.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every TASK-256 child task is Done with validation evidence.
- Every report finding has a final status and owner.
- Deferred items have physical follow-up tasks.
- Changelog and task board statistics are synchronized.
- Required validation gates are green or explicitly blocked with final rerun
  evidence before closure.
