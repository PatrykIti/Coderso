# TASK-275-06: Navigation Report, Docs, Changelog, and Closure

# FileName: TASK-275-06_Navigation_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Navigation + QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-275-01, TASK-275-02, TASK-275-03, TASK-275-04, TASK-275-05
**Status:** To Do

---

## Overview

Close the Navigation Playwright follow-up family after implementation leaves
land. Refresh the source report, widget docs, task board, and changelog with
textual evidence instead of committing local PNG captures.

This leaf is not a catch-all for unfinished implementation. If a report row is
still unfixed, classify it as fixed, deferred with a reason, routed to TASK-256,
or split into a new physical task before marking this family done.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:337-362` - screenshots are local
  labels only and should not be committed as evidence.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:397-442` - prioritized rows that
  must be fixed, deferred, or routed.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:448-460` - final summary names
  critical behavior that needs closure proof.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Add final fixed/deferred/routed status for every report finding. Include textual admin/frontend evidence, DOM excerpts, and validation commands. Do not commit PNG files. |
| `_docs/_WIDGETS/NAVIGATION.md` | Sync final schema, editor, runtime, mobile, dropdown, metadata, and style behavior. |
| `_docs/WIDGETS.md` | Update only if the Navigation work changed the shared widget source-of-truth contract. |
| `_docs/WIDGET_PACK_MATRIX.md` and `core/widgets/modulePackMatrix.ts` | Update only if Navigation pack readiness/completeness changes. |
| `_docs/_TASKS/TASK-275*.md` | Mark completed leaves `Done (YYYY-MM-DD)` only when their implementation and validation have landed. |
| `_docs/_TASKS/README.md` | Move completed TASK-275 rows to Done and update statistics. |
| `_docs/_CHANGELOG/{N}-YYYY-MM-DD-task-275-navigation-widget-playwright-product-followups.md` | Add a final changelog entry describing what changed and how it was validated. |
| `_docs/_CHANGELOG/README.md` | Add the changelog entry in the correct numbered position. |

## Implementation Pseudocode

```md
## Fixed / Deferred / Routed Status

| Finding | Status | Evidence |
|---|---|---|
| Logo link | Fixed | SSR test + admin/frontend DOM proof |
| Sticky frontend blocker | Routed | Section/layout owner task, not TASK-275 |
| Mega menu/search/dark switch | Deferred | Out of current Navigation v1 contract |
```

```sh
git status --short --branch
bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx
bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx
bun test tests/unit/navigation/navigationRuntimeResolver.test.ts
bun --cwd core lint
bun --cwd core lint:types
bun run scan:security:strict
bun run precommit
```

Error handling:

- If local Playwright/frontend replay is unavailable, record the exact blocker
  and keep the row open or deferred instead of claiming browser proof.
- If broad repo gates fail for unrelated reasons, isolate targeted Navigation
  suites and document the unrelated failure separately.
- Do not move TASK-275 to Done while any high/medium report row is unclassified.

## Security Contract

This closure leaf does not add API routes.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: closure must verify all new schema fields keep
  strict validation coverage.
- Anti-abuse: reports and docs must not include secrets, privileged settings,
  raw tokens, or screenshot files.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun test tests/unit/navigation/navigationRuntimeResolver.test.ts` if any
  implementation leaf touched source resolution or metadata mapping.
- `bun test tests/unit/widgets/validator.test.ts` if any implementation leaf
  changed schema/defaults.
- `bun test tests/unit/widgets/registry.test.ts` if widget registration,
  variants, slots, or editor capabilities changed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` plus targeted release-gate suites when runtime output,
  accessibility, security, performance, or reliability contracts changed.
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/WIDGETS.md` only if shared widget contract text changes
- `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness changes
- `_docs/_TASKS/TASK-275*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-task-275-navigation-widget-playwright-product-followups.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Every `REPORT_NAVIGATION_WIDGET.md` finding is fixed, deferred, or routed with
  a concrete reason and owner.
- The final report contains textual evidence for admin and frontend behavior.
- TASK-275 and completed leaves are synchronized across task files, board,
  changelog, and widget docs.
- Required targeted tests and repo gates are recorded with exact command output.
- No Playwright PNG files or unrelated task-family changes enter the commit.
