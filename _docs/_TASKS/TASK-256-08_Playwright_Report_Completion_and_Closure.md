# TASK-256-08: Playwright Report Completion and Closure

# FileName: TASK-256-08_Playwright_Report_Completion_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-04, TASK-256-05, TASK-256-05-01, TASK-256-05-02, TASK-256-05-03, TASK-256-05-04, TASK-256-06, TASK-256-06-01, TASK-256-06-02, TASK-256-06-03, TASK-256-06-04, TASK-256-07
**Status:** Done (2026-05-17)

---

## Overview

Complete the Playwright report audit loop and close TASK-256 only after reports,
tests, docs, changelog, and task board agree with the implemented behavior.

Several current reports are still marked in progress, are authentication-limited,
or were completed after the first TASK-256 draft. This closure leaf converts the
audit archive into final evidence: fixed findings, intentionally deferred
findings, exact validation commands, and follow-up tasks for product expansions
that are not contract repairs.

## Current Progress

- 2026-05-17: shared report evidence is synchronized for the implemented
  TASK-256 slices, and every touched report now carries a concrete
  `Status po TASK-256 (2026-05-17)` note instead of a placeholder handoff to
  this leaf.
- 2026-05-17: post-close follow-up fixes landed for Team, Accordion, Toggle
  Block, and Testimonials, with focused green validation on their owner suites
  after the original closure commit.
- 2026-05-17: final TASK-256 closure explicitly keeps Contact, Newsletter,
  Appointment Form, Booking Calendar, Compare Timeline, and CTA Banner in
  classification-only mode, while Form Embed remains `needs-refresh` /
  in-progress under `TASK-269` rather than fixed shared scope.

## Final Closure State

- Structural shared slices now carry fixed evidence in their report status
  sections, including the later Accordion default-open / non-collapsible repair
  and the Toggle Block helper-clear follow-up.
- Marketing/content shared slices now carry fixed evidence in their report
  status sections, including the later Team safe-link/lazy-load hardening and
  Testimonials scroll-snap / clear / accessibility follow-up.
- Classification-only late reports now state their final TASK-256 routing in the
  report status section instead of deferring ownership to this leaf. Contact
  stays in `TASK-261`, Newsletter in `TASK-276`, Appointment Form in
  `TASK-258`, Booking Calendar in `TASK-259`, Compare Timeline in `TASK-260`,
  and CTA Banner in `TASK-263`.
- Form Embed remains explicitly in progress under `TASK-269`; TASK-256 records
  its rows as `needs-refresh` / future widget scope and does not count them as
  fixed shared implementation.
- Timeline report closure remains owned by `TASK-291-07`; TASK-256 only
  references shared prerequisites already implemented under existing leaves.

## Sub-Tasks

- [x] Re-ran or refreshed every widget report touched by TASK-256 enough to
  record final shared-scope status notes.
- [x] Marked each report finding as fixed, deferred, not reproducible, or
  future product scope in the current TASK-256 status sections and follow-up
  routing.
- [x] Verified that completed-report shared findings map to executable
  TASK-256 leaves, while rows outside those leaves route to existing physical
  follow-up families.
- [x] Referenced existing follow-up task files for deferred widget-owned rows,
  including explicit classification-only late reports and Form Embed
  `needs-refresh` scope under `TASK-269`.
- [x] Kept page-shell findings outside widget leaves; Hero page-shell rows stay
  routed away from TASK-256 shared widget closure.
- [x] Recorded git-scope preflight around closure follow-up commits and staged
  only explicit TASK-256 owner files.
- [x] Updated report/task/changelog evidence for the final TASK-256 closure
  state after the post-close follow-up fixes.
- [x] Kept the TASK-256 family in `Done` only after the report status sections,
  board row, and changelog entries were synchronized.

## Files to Change

| File group | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md` | Add final textual admin/frontend evidence, fixed/deferred status, and run URLs/log snippets where applicable. Screenshot filenames may remain as local capture labels, but PNG files under `_docs/PLAYWRIGHT` are temporary and must not be committed. |
| `_docs/_WIDGETS/*.md` | Update widget contracts for changed schema/editor/runtime behavior. |
| `_docs/WIDGETS.md` | Update only if shared contracts changed. |
| `core/widgets/modulePackMatrix.ts` and `_docs/WIDGET_PACK_MATRIX.md` | Update both only if readiness/completeness changes; do not update docs without the source pack contract owner. |
| `_docs/_TASKS/TASK-256*.md` | Update status, dates, validation evidence, and remaining follow-ups. |
| `_docs/_TASKS/README.md` | Move TASK-256 rows from To Do/In Progress to Done, add any newly created follow-up task rows, and update statistics. |
| `_docs/_CHANGELOG/*.md` and `_docs/_CHANGELOG/README.md` | Add final TASK-256 changelog entry. |

## Implementation Pseudocode

Template only, not final evidence:

```md
## Final TASK-256 Evidence

| Finding | Status | Fix owner | Test evidence | Deferred task |
|---|---|---|---|---|
| Public empty placeholder | <fixed/deferred/not-reproducible/future-scope> | <TASK-256-03 or leaf> | <command + result> | <n/a or task id> |
| True carousel controls | <future-scope> | n/a | n/a | TASK-290-04 |
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
- Secret handling: redact logs/report snippets if they contain sensitive values;
  do not commit Playwright screenshot artifacts.

## Testing Requirements

- Run every targeted suite listed in completed TASK-256 leaves.
- Late-report closure must follow the TASK-256-07 execution routing matrix:
  when a report row is classified as `future physical task`, first reference
  the existing TASK-257 through TASK-292 follow-up family that owns it; create a
  new task with owner/test rows only if no existing family applies before
  marking it deferred. When a row is classified as fixed by an existing
  TASK-256 physical leaf, run that leaf's exact suites plus the matching
  report-group smoke listed below.
- Forms/public-write report smoke, when TASK-256 marks any form row fixed:
  - `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/form-embed-editor-wave.test.tsx`
  - `bun test tests/unit/forms/schema.test.ts`
  - `bun test tests/unit/forms/submissionService.test.ts`
- Booking report smoke, when TASK-256 marks any booking row fixed:
  - `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  - `bun test tests/unit/booking/bookingService.test.ts`
  - `bun test tests/unit/server/publicBookingApi.test.ts`
- Shell/content report smoke, when TASK-256 marks any footer, rich-text, or
  compare row fixed:
  - `bun run test:vitest -- tests/vitest/widgets/footer.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/richTextSection.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/rich-text-section-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- Commerce report smoke, when TASK-256 marks any commerce row fixed:
  - `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
  - `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- Dynamic/content closure must include:
  - `bun run test:vitest -- tests/vitest/ui/content-list-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/contentList.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/menu-editor-validation.test.ts`
  - `bun run test:vitest -- tests/vitest/ui/posts-feed-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/postsFeedWidget.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
  - `bun test tests/unit/widgets/entryTeaser.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
  - `bun run test:vitest -- tests/vitest/search/listingRuntimeService.test.ts`
- Schema/default/runtime registration changes must include:
  - `bun test tests/unit/widgets/validator.test.ts`
  - `bun test tests/unit/widgets/registry.test.ts`
  - `bun test tests/unit/widgets/runtimeRegistry.test.ts`
- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso` as the Coderso baseline gate for every completed
    implementation leaf;
  - `bun run scan:security:strict`
  - `bun run precommit`
- Run `bun test tests/unit/widgets/validator.test.ts`,
  `bun test tests/unit/widgets/registry.test.ts`, and
  `bun test tests/unit/widgets/runtimeRegistry.test.ts` when any widget
  schema/default/runtime registration changed.
- Run `bun test tests/unit/widgets/modulePackMatrix.test.ts` when
  `core/widgets/modulePackMatrix.ts` or `_docs/WIDGET_PACK_MATRIX.md` changes.
- If DB-backed or network-backed gates are unavailable, record the exact blocker
  and rerun before final closure.

## Documentation Updates Required

- All touched Playwright reports.
- All touched widget source-of-truth docs.
- `_docs/_TASKS/README.md`.
- `_docs/_CHANGELOG/README.md` and the new changelog entry.
- `core/widgets/modulePackMatrix.ts` and `_docs/WIDGET_PACK_MATRIX.md` together
  only if readiness changed.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Every TASK-256 child task is Done with validation evidence.
- Every report finding has a final status and owner.
- No completed report contains an unclassified high/medium/low
  shared-contract finding.
- Deferred items have physical follow-up tasks.
- Changelog and task board statistics are synchronized.
- Required validation gates are green or explicitly blocked with final rerun
  evidence before closure.
