# TASK-290-08: Testimonials Report Docs Changelog and Closure

# FileName: TASK-290-08_Testimonials_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Testimonials + Documentation + Playwright QA
**Estimated Effort:** Medium
**Dependencies:** TASK-290-01, TASK-290-02, TASK-290-03, TASK-290-04, TASK-290-05, TASK-290-06, TASK-290-07
**Status:** Done (2026-05-22)

---

## Overview

Close the Testimonials Playwright product follow-up family after implementation
leaves land by refreshing report evidence, docs, changelog, and task-board
state.

This leaf covers final status for all TASK-290-owned rows in
`_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` and records any explicit
deferrals that remain after implementation.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` - source report and final
  priority matrix.
- `_docs/_TASKS/TASK-290_Testimonials_Widget_Playwright_Product_Followups.md` -
  TASK-290 ownership matrix and completion umbrella.
- `_docs/_TASKS/README.md` - board/statistics owner.
- `_docs/_CHANGELOG/README.md` - changelog numbering/index owner.

## Scope Boundary

In scope:

- Refresh `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` with textual fixed,
  no-action, TASK-256-owned, or deferred notes.
- Update `_docs/_WIDGETS/TESTIMONIALS.md` with final schema/editor/runtime
  behavior, and correct any stale data model examples that still use `items`
  instead of the live `testimonials` key.
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

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md` | Add final fixed/deferred/TASK-256-owned status notes for every relevant report row. |
| `_docs/_WIDGETS/TESTIMONIALS.md` | Document final schema, editor mode, runtime, import/export, CTA, style, and rating behavior; replace stale `items` examples with `testimonials`. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if engagement pack readiness/completeness changes. |
| `_docs/_CHANGELOG/<next>-YYYY-MM-DD-task-290-testimonials-widget-product-followups.md` | Add final changelog entry using the actual closure date when TASK-290 closes. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row. |
| `_docs/_TASKS/TASK-290*.md` | Move statuses to `Done (YYYY-MM-DD)` only after validation. |
| `_docs/_TASKS/README.md` | Move rows from To Do to Done and recompute statistics. |

## Implementation Pseudocode

Closure matrix:

```md
| Report row | Final owner | Evidence | Status |
|---|---|---|---|
| UX-04 rating/role/source | TASK-290-01 | test command + file refs | Fixed |
| UX-04 avatar | TASK-290-03 | test command + file refs | Fixed |
| BUG-03 | TASK-256-06-03 | task ref | Excluded from TASK-290 |
```

Validation checklist:

```sh
git status --short --branch
git diff --check
bun --cwd core lint
bun --cwd core lint:types
bun run lint
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
- `bun run lint`
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
- A final closing drift pass corrected local editor/import-export drift, refreshed the report current-state summary, renumbered the TASK-290 changelog entry to `924`, normalized the physical TASK-290 leaf files, and split the remaining shared residuals to `TASK-334`, `TASK-335`, and `TASK-333` before the follow-up commit
- A subsequent TASK-290 drift pass then fixed `quoteHtml`-only import acceptance, synchronized the Visual avatar/background picker draft state with the persisted payload, and closed the remaining local proof gaps for rating-display branches, runtime style output, import/export branches, and Visual variant-count sync

## Documentation Updates Required

- Refresh `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md`.
- Refresh `_docs/_WIDGETS/TESTIMONIALS.md`.
- Update `_docs/WIDGET_PACK_MATRIX.md` only when pack readiness changes.
- Add the final TASK-290 changelog entry and index row.
- Keep `_docs/_TASKS/README.md` synchronized with final statuses.

## Changelog Policy

- This leaf creates or verifies the final TASK-290 changelog entry before the
  family moves to `Done`.

## Current Audit Notes (2026-05-22)

- The pre-implementation doc drift audit landed earlier in this worktree as
  commit `96354105` (`docs(task-290): tighten testimonials followup plan`), so
  the final closure reuses an already-correct scope split instead of closing
  against stale report language.
- The finished TASK-290 wave now spans runtime schema ownership,
  Wizard/Visual/Advanced editor parity, a Bun-free import/export owner module,
  focused Vitest coverage, report/doc sync, board movement, and changelog entry
  `924-2026-05-22-task-290-testimonials-widget-product-followups.md`.
- A follow-up drift pass after commit `b3371149` found three residual follow-ups and one local doc residue: unchecked done-leaf execution lists were normalized in place; the still-duplicated Visual/Advanced controls, the contextual avatar-alt accessibility gap, and the shared changelog numbering/index integrity drift were split out to `TASK-334`, `TASK-335`, and `TASK-333` instead of being patched inside TASK-290.

## Acceptance Criteria

- Every Testimonials report finding is mapped to TASK-256, TASK-290 evidence,
  no-action, or explicit deferral.
- The task board, task files, widget docs, report, and changelog agree.
- Final validation output is recorded in the closure note.

## Validation Notes

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/widgets/testimonials.test.tsx`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/widgets/renderer.test.tsx`
- `set -a && source .env && set +a && NODE_ENV=test bunx vitest run --config vitest.config.ts tests/vitest/widgets/styleNoneTokens.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts`
- `bun run gates:coderso`
- `bun run scan:security:strict` still exits non-zero only because local `semgrep`, `trivy`, and `gitleaks` tooling is unavailable or incompatible; `bun audit` ran inside the command before exit
- `bun run precommit`
- A final closing drift pass corrected local editor/import-export drift, refreshed the report current-state summary, renumbered the TASK-290 changelog entry to `924`, normalized the physical TASK-290 leaf files, and split the remaining shared residuals to `TASK-334`, `TASK-335`, and `TASK-333` before the follow-up commit
