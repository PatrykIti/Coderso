# TASK-290-08: Testimonials Report Docs Changelog and Closure

# FileName: TASK-290-08_Testimonials_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Testimonials + Documentation + Playwright QA
**Estimated Effort:** Medium
**Dependencies:** TASK-290-01, TASK-290-02, TASK-290-03, TASK-290-04, TASK-290-05, TASK-290-06, TASK-290-07
**Status:** To Do

---

## Overview

Close the Testimonials Playwright product follow-up family after implementation
leaves land by refreshing report evidence, docs, changelog, and task-board
state.

This leaf covers final status for all TASK-290-owned rows in
`_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` and records any explicit
deferrals that remain after implementation.

## Scope Boundary

In scope:

- Refresh `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` with textual fixed,
  no-action, TASK-256-owned, or deferred notes.
- Update `_docs/_WIDGETS/TESTIMONIALS.md` with final schema/editor/runtime
  behavior.
- Update `_docs/WIDGET_PACK_MATRIX.md` if engagement pack readiness changes.
- Add the TASK-290 changelog entry and update `_docs/_CHANGELOG/README.md`.
- Move TASK-290 physical task files and `_docs/_TASKS/README.md` rows to the
  correct final status.

Out of scope:

- Implementing code changes not covered by TASK-290 leaves.
- Closing TASK-256 shared-contract rows.
- Committing Playwright PNG files; the report states those screenshots are
  local labels only.

## Sub-Tasks

- [ ] Build a finding-by-finding closure matrix against
  `REPORT_TESTIMONIALS_WIDGET.md:135-250,256-304`.
- [ ] Verify each TASK-290-owned row has code, test, and docs evidence.
- [ ] Verify each TASK-256-owned row is still excluded and referenced to the
  correct TASK-256 owner.
- [ ] Update Testimonials widget docs and any pack matrix text affected by the
  implemented leaves.
- [ ] Add changelog entry and changelog index row.
- [ ] Move task statuses and board statistics only after evidence is complete.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` | Add final fixed/deferred/TASK-256-owned status notes for every relevant report row. |
| `_docs/_WIDGETS/TESTIMONIALS.md` | Document final schema, editor mode, runtime, import/export, CTA, style, and rating behavior. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if engagement pack readiness/completeness changes. |
| `_docs/_CHANGELOG/<next>-2026-05-17-task-290-testimonials-widget-product-followups.md` | Add final changelog entry when TASK-290 closes. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row. |
| `_docs/_TASKS/TASK-290*.md` | Move statuses to `Done (YYYY-MM-DD)` only after validation. |
| `_docs/_TASKS/README.md` | Move rows from To Do to Done and recompute statistics. |

## Implementation Pseudocode

Closure matrix:

```md
| Report row | Final owner | Evidence | Status |
|---|---|---|---|
| UX-04 | TASK-290-01 | test command + file refs | Fixed |
| BUG-03 | TASK-256-06-03 | task ref | Excluded from TASK-290 |
```

Validation checklist:

```sh
git status --short --branch
git diff --check
bun --cwd core lint
bun --cwd core lint:types
bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx
bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx
bun run gates:coderso
bun run scan:security:strict
bun run precommit
```

Error handling:

- If a report row lacks implementation evidence, keep the relevant task open or
  add an explicit deferral reason.
- If broad gates fail for unrelated pre-existing reasons, isolate the focused
  Testimonials lanes and record the unrelated blocker separately.
- If `_docs/_TASKS/README.md` has concurrent rows from other agents, preserve
  those rows and recompute counts rather than replacing the table wholesale.

## Security Contract

No API routes are added by this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: verify implementation leaves updated validator
  coverage when schema fields changed.
- Anti-abuse: verify no raw HTML, script, unsafe URL, or arbitrary class payload
  reaches public runtime output.
- Secret handling: verify reports/changelog/docs do not include secrets,
  private URLs, provider tokens, or local PNG artifacts.

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  output markers changed.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  style token behavior changed.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults changed.
- `bun test tests/unit/widgets/registry.test.ts` if widget definition metadata
  changed.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Refresh `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md`.
- Refresh `_docs/_WIDGETS/TESTIMONIALS.md`.
- Update `_docs/WIDGET_PACK_MATRIX.md` only when pack readiness changes.
- Add the final TASK-290 changelog entry and index row.
- Keep `_docs/_TASKS/README.md` synchronized with final statuses.

## Changelog Policy

- This leaf creates or verifies the final TASK-290 changelog entry before the
  family moves to `Done`.

## Acceptance Criteria

- Every Testimonials report finding is mapped to TASK-256, TASK-290 evidence,
  no-action, or explicit deferral.
- The task board, task files, widget docs, report, and changelog agree.
- Final validation output is recorded in the closure note.
