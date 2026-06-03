# 1035 - TASK-348-354 Tools remediation planning

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-348, TASK-349, TASK-350, TASK-351, TASK-352, TASK-353, TASK-354

## Key Changes

### Planning

- Added the seven Tools remediation task families from the 2026-05-31
  Playwright reports and 2026-06-01 Claude UX review: Search, SEO Manager,
  Analytics, Backups, Import / Export, Redirects, and cross-Tools UX/bootstrap.
- Split the work into 28 execution leaves across TASK-348 through TASK-354,
  preserving the assigned task-number scope for concurrent branch work.
- Captured per-family implementation order, pseudocode expectations, data flow,
  error handling, regression-test shapes, documentation plans, and closure
  criteria.
- Added explicit security contracts for each leaf that touches API routes or
  runtime-visible behavior, including endpoint visibility, auth, RBAC, CSRF,
  rate limits, strict validation, and anti-abuse expectations where applicable.
- Kept these entries as planning/refinement records only; final family closure
  notes should use separate changelog numbers when each family is implemented.

## Validation

- Planning was based on the individual Tools Playwright reports, the Tools
  overview report, the Claude UX addendum, related source files, related tests,
  architecture/API/cache/security/testing docs, and the repo task/changelog
  format rules.
- The task board and task metadata were synchronized with the new TASK-348
  through TASK-354 family files and execution leaves.
