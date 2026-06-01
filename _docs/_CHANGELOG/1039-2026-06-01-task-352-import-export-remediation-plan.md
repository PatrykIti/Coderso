# 1039 - TASK-352 Import Export remediation plan

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-352

## Key Changes

### Planning

- Added the TASK-352 Import / Export remediation family from the Tools
  Playwright report and Claude UX review.
- Split work into leaves for export target/include behavior, import bundle
  validation/error mapping, activity/progress/retry UX, file-type/options
  truthfulness, and final QA/docs closure.
- Captured the internal import/export security contract for settings RBAC,
  strict validation, CSRF-protected apply, and secret-safe bundle/error handling.

## Validation

- Planning was based on the Import / Export report, Tools overview report,
  Claude UX addendum, current Import / Export UI/client/route/service files,
  current tests, and the repo task/changelog format rules.
