# TASK-252-08: QA, Docs, Changelog, and Board Closure

# FileName: TASK-252-08_QA_Docs_Changelog_and_Board_Closure.md

**Priority:** Medium
**Category:** Widgets + QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-03, TASK-252-04, TASK-252-05, TASK-252-06, TASK-252-07
**Status:** To Do

---

## Overview

Close TASK-252 only after the right-inspector IA, Hero, Timeline, and the
remaining Pages widget editor families are validated, documented, and reflected
in the task board and changelog.

This closure task owns final proof. It is not a substitute for targeted tests in
the implementation subtasks.

## Business Requirements

- Confirm every Pages-publishable widget has:
  - a documented `Wizard / Visual / Advanced` ownership model;
  - accessible labels and automation metadata for its main controls;
  - matching runtime/schema/default/normalizer/editor/docs updates when its
    data model changed.
- Confirm right-panel UX:
  - no large persistent instructional cards above tabs except blocking warnings;
  - info/help is available through compact information affordances;
  - slot/region controls are inside a named editor section.
- Confirm research artifacts:
  - `_docs/_WIDGETS/tmp/**` contains only license-safe summaries or permitted
    source;
  - every artifact has URL/access/license/copy-policy metadata.
  - every Pages-publishable widget has its own research folder with at least ten
    credible patterns or a widget-local `SHORTFALL.md`;
  - every final widget option list is backed by Keep/Adapt/Reject decisions.
- Confirm missing widget docs are created:
  - `TABS.md`
  - `ACCORDION.md`
  - `TOGGLE_BLOCK.md`
  - `PRODUCT_GALLERY.md`
  - `PRODUCT_COMPARE.md`
  - `PRODUCT_TABLE.md`
  - `LISTING_FILTERS.md`
  - `SEARCH_BOX.md`
  - `BOOKING_CALENDAR.md`
  - `APPOINTMENT_FORM.md`
- Add a changelog entry and sync `_docs/_TASKS/README.md` when the family is
  completed.

## Sub-Tasks

- [ ] Build the final per-widget validation matrix.
- [ ] Verify right-inspector IA acceptance criteria across representative
  widgets.
- [ ] Verify every Pages-publishable widget has research archive coverage,
  license/source metadata, and Keep/Adapt/Reject decisions.
- [ ] Verify all missing `_docs/_WIDGETS` docs were created.
- [ ] Run required lint/type/test/gate commands or record exact blockers.
- [ ] Mark TASK-252 task files Done, sync board statistics, and add changelog.

## Files to Change

- `_docs/_TASKS/TASK-252*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- a new numbered `_docs/_CHANGELOG/*.md` entry on completion, using the next
  index from `_docs/_CHANGELOG/README.md` and the actual completion date.
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md`
- all touched `_docs/_WIDGETS/*.md`
- final validation notes in this task file.

## Implementation Pseudocode

Build a final widget proof matrix.

```md
| Widget | Research proof | Editor IA proof | Runtime proof | Docs | Notes |
|---|---|---|---|---|---|
| hero | tmp/hero matrix | hero-editor-wave | hero.test | HERO.md | badge supported |
| timeline | tmp/timeline matrix | timeline-editor-wave | timeline.test | TIMELINE.md | chronology modes |
```

Then close statuses only after validation. Use the actual completion date from
the final validation run, compute the changelog number from
`_docs/_CHANGELOG/README.md`, and keep the validation summary explicit rather
than referencing an undefined variable.

```ts
const taskIds = parseTaskReadmeRows("_docs/_TASKS/README.md")
  .filter((row) => row.id === "TASK-252" || row.id.startsWith("TASK-252-"))
  .map((row) => row.id);
const completedOn = getActualCompletionDateFromFinalGateRun();
const changelogNumber = getHighestChangelogIndexNumber("_docs/_CHANGELOG/README.md") + 1;
const changelogPath = `_docs/_CHANGELOG/${changelogNumber}-${completedOn}-task-252-widget-editor-implementation.md`;
const validationSummary = summarizeExecutedCommandsAndKnownBlockers({
  requiredGates: ["bun --cwd core lint", "bun --cwd core lint:types", "bun run test:vitest", "bun run gates:coderso"],
  focusedSuites: collectFocusedSuitesFromCompletedLeaves(taskIds),
});

for (const id of taskIds) {
  markTaskDone(id, completedOn);
  moveReadmeRow(id, "To Do", "Done");
}
recomputeTaskReadmeStatisticsFromRows();
writeChangelogEntry(changelogPath, {
  number: changelogNumber,
  date: completedOn,
  title: "TASK-252 widget editor implementation",
  tasks: taskIds,
  validation: validationSummary,
});
addChangelogIndexRow({ number: changelogNumber, date: completedOn, title: "TASK-252 widget editor implementation", type: "CMS Widgets/Admin UI" });
```

## Security Contract

- Visibility:
  - closure docs are internal project docs;
  - widget output remains public runtime output.
- Auth model:
  - no new endpoint.
- RBAC:
  - unchanged.
- CSRF:
  - unchanged.
- Rate-limit bucket:
  - unchanged.
- Reject-unknown validation:
  - closure must verify changed widget schemas still reject unknown fields.
- Anti-abuse:
  - closure must verify presentational/external form widgets were not
    misdocumented as Coderso-owned public-write endpoints;
  - closure must verify any Coderso-owned public-write endpoint touched by
    TASK-252 keeps nonce + signature/HMAC via
    the endpoint-specific nonce bridge (`core/services/booking/bookingSubmissionNonce.ts`
    for `/api/booking/reservations`, `core/services/forms/submissionNonce.ts`
    for form submission routes), optional reCAPTCHA policy, existing public
    rate-limit buckets, strict reject-unknown validation, and
    `tests/security/codersoSecurityGate.test.ts`.
- Third-party artifacts:
  - closure must verify no proprietary source was committed into research
    folders.

## Testing Requirements

- Baseline gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run test:vitest`
- Focused suites from all implementation subtasks must pass.
- Run Bun-owned suites for touched runtime/data/public-write widgets:
  - content/posts/commerce/booking/forms/search/listing owner suites named in
    TASK-252-07.
- Run registry/contract suites:
  - `bun test tests/unit/widgets/registry.test.ts`
  - `bun test tests/unit/widgets/runtimeRegistry.test.ts`
  - `bun test tests/unit/widgets/validator.test.ts`
  - `bun test tests/unit/widgets/modulePackMatrix.test.ts`
- Run `bun run gates:coderso` before closure or document the exact blocker.
- If DB-backed tests are required and `DATABASE_URL` is available, load env with
  `set -a && source .env && set +a` before the command.
- Docs/research validation:
  - verify every Pages-publishable widget has a `_docs/_WIDGETS/tmp/<widget>/`
    folder;
  - verify each folder has ten research cards or a documented `SHORTFALL.md`;
  - verify final widget docs cite the relevant research decisions for new or
    rejected options.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md`
- every changed `_docs/_WIDGETS/*.md`
- `_docs/_TASKS/TASK-252*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog entry for TASK-252.
- `_docs/_WIDGETS/tmp/<widget>/**` research folders for every
  Pages-publishable widget.

## Acceptance Criteria

- All TASK-252 task files are marked Done only after implementation and
  validation are complete.
- Board statistics match task statuses.
- Changelog entry references TASK-252 and summarizes validation.
- Final documentation tells implementers and users how widget configuration is
  structured across Wizard, Visual, and Advanced.
- Final validation proves every Pages-publishable widget option list is
  research-backed, including explicit rejections for noisy or ill-fitting
  options.
