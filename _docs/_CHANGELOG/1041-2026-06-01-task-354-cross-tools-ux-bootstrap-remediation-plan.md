# 1041 - TASK-354 cross Tools UX and bootstrap remediation plan

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-354, TASK-354-01, TASK-354-02, TASK-354-03, TASK-354-04, TASK-354-05

## Key Changes

### Planning

- Added the TASK-354 cross-tools remediation family from the Tools overview
  report and Claude UX review.
- Split shared work into leaves for action/empty-state standards,
  long-running-operation feedback, pepper-aware seed-admin credentials, the
  Tools Playwright regression matrix, and final cross-family closure.
- Recorded that TASK-348 through TASK-354 create 28 execution leaves, exceeding
  the requested minimum of 20 task refinements while keeping each report family
  isolated by the assigned task numbers.
- Tightened TASK-354-03 after follow-up audit with an explicit regression-test
  shape for pepper-aware seed-admin coverage.
- Refined TASK-354 after cross-audit with controlled option-group payload
  truthfulness, runtime-effect matrix evidence, Backups pagination coverage,
  stronger seed-admin path tests, and an explicit audit-run security contract.

## Validation

- Planning was based on the Tools overview report, Claude UX addendum, current
  Tools source files, `core/db/seed.ts`, auth password helpers, relevant tests,
  and the repo task/changelog format rules.
- Follow-up drift audit compared cross-tools findings against per-tool leaves,
  current source paths, and fixture-backed Playwright/security expectations.
