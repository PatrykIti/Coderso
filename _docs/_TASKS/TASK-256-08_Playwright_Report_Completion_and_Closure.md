# TASK-256-08: Playwright Report Completion and Closure

# FileName: TASK-256-08_Playwright_Report_Completion_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-04, TASK-256-05, TASK-256-05-01, TASK-256-05-02, TASK-256-05-03, TASK-256-05-04, TASK-256-06, TASK-256-06-01, TASK-256-06-02, TASK-256-06-03, TASK-256-06-04, TASK-256-07
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

- `_docs/PLAYWRIGHT/REPORT_RICH_TEXT_SECTION_WIDGET.md:3` is now completed and
  must be classified against shared-contract TASK-256 scope before closure.
- `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:3` is completed, but its findings
  still need fixed/deferred closure classification after implementation.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:3` is completed, but its
  findings still need fixed/deferred closure classification after
  implementation.
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md:3` is completed, but its
  commerce/runtime findings still need fixed/deferred closure classification
  against the shared widget contracts before any product expansion is opened.
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md:3` is completed, but its
  commerce/runtime findings still need fixed/deferred closure classification
  against the shared widget contracts before any product expansion is opened.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:3` is completed, but its
  dynamic/runtime findings still need fixed/deferred closure classification
  against the shared widget contracts before any product expansion is opened.
- `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:3` is completed, but its
  dynamic/runtime findings still need fixed/deferred closure classification
  against the shared widget contracts before any product expansion is opened.
- `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md:3` is completed, but its
  dynamic/runtime findings still need fixed/deferred closure classification
  against the shared widget contracts before any product expansion is opened.
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md:3` is completed, but its
  commerce/runtime findings still need fixed/deferred closure classification
  against the shared widget contracts before any product expansion is opened.
- `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md:3`,
  and `_docs/PLAYWRIGHT/REPORT_FOOTER_WIDGET.md:3` are completed and require
  shared-contract classification before TASK-256 closure.
- `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md:3` remains in progress, so
  TASK-256-08 must refresh the report or mark any unverified rows as
  `needs-refresh`; it must not mark those rows fixed without runtime evidence.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:3` is completed, but constrained
  comparison evidence has also been completed:
  `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:220` and
  `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:306` both require final
  fixed/deferred classification during closure.
- The following structural report findings still need fixed/deferred status
  refreshed after implementation:
  `_docs/PLAYWRIGHT/REPORT_GRID_COLUMNS_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:5`,
  `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md:5`,
  `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md:3`, and
  `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:5`.
- The following marketing/content report findings still need fixed/deferred
  status refreshed after implementation:
  `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_TESTIMONIALS_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_PRICING_PLANS_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_FAQ_ACCORDION_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md:3`, and
  `_docs/PLAYWRIGHT/REPORT_TEAM_WIDGET.md:3`.
- The following dynamic report findings still need fixed/deferred status
  refreshed after implementation:
  `_docs/PLAYWRIGHT/REPORT_CONTENT_LIST_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_POSTS_FEED_WIDGET.md:3`,
  `_docs/PLAYWRIGHT/REPORT_ENTRY_TEASER_WIDGET.md:3`, and
  `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:3`.

## Sub-Tasks

- [ ] Re-run or refresh every widget report touched by TASK-256.
- [ ] Mark each report finding as fixed, deferred, not reproducible, or future
  product scope.
- [ ] Verify that every high/medium/low shared-contract finding from completed
  reports maps to an executable TASK-256 physical leaf before closure, or is
  explicitly marked not reproducible/resolved/future physical task when no
  current TASK-256 leaf owns it.
- [ ] Add follow-up task files for deferred product work and for any
  shared-contract row that no current TASK-256 physical leaf owns executably.
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
| `_docs/PLAYWRIGHT/REPORT_*_WIDGET.md` | Add final textual admin/frontend evidence, fixed/deferred status, and run URLs/log snippets where applicable. Screenshot filenames may remain as local capture labels, but PNG files under `_docs/PLAYWRIGHT` are temporary and must not be committed. |
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
- Secret handling: redact logs/report snippets if they contain sensitive values;
  do not commit Playwright screenshot artifacts.

## Testing Requirements

- Run every targeted suite listed in completed TASK-256 leaves.
- Late-report closure must follow the TASK-256-07 execution routing matrix:
  when a report row is classified as `future physical task`, create that task
  with owner/test rows before marking it deferred; when a row is classified as
  fixed by an existing TASK-256 physical leaf, run that leaf's exact suites plus
  the matching report-group smoke listed below.
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
- No completed report contains an unclassified high/medium/low
  shared-contract finding.
- Deferred items have physical follow-up tasks.
- Changelog and task board statistics are synchronized.
- Required validation gates are green or explicitly blocked with final rerun
  evidence before closure.
