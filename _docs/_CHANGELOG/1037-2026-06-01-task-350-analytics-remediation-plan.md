# 1037 - TASK-350 Analytics remediation plan

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-350

## Key Changes

### Planning

- Added the TASK-350 Analytics remediation family from the Tools Playwright
  report and Claude UX review.
- Split Analytics work into execution leaves for Top Content export behavior,
  empty-data semantics, and final QA/docs closure.
- Captured the internal Analytics read-route security contract for any export
  endpoint or disabled-action decision.
- Refined Analytics leaves after drift audit to align Top Content export with
  active range semantics and distinguish no workspace data from no period
  activity.

## Validation

- Planning was based on the Analytics report, Tools overview report, Claude UX
  addendum, current Analytics UI/client/route/service files, current Analytics
  tests, and the repo task/changelog format rules.
- Follow-up drift audit checked current Analytics route/client behavior and user
  guide range wording.
