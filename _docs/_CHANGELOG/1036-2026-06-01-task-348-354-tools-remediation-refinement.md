# 1036 - TASK-348-354 Tools remediation refinement

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-348, TASK-349, TASK-350, TASK-351, TASK-352, TASK-353, TASK-354

## Key Changes

### Refinement

- Folded local, sub-agent, and Claude CLI drift findings into TASK-348 through
  TASK-354 without expanding beyond the assigned task-number scope.
- Refined Search tasks for `SearchBar` compatibility, empty-index metadata, and
  CMS API/Search spec updates.
- Refined SEO Manager tasks for root `publishedData.seo` terminology,
  server-side public HTML cache invalidation, and CMS API/Page Model docs.
- Refined Analytics tasks for active range export semantics and totals-aware
  empty-state behavior.
- Refined Backups, Import / Export, and Redirects tasks for current service
  architecture, bundle shape, persisted reference validation, chain-loop
  handling, route error mapping, admin cache decisions, and security docs.
- Refined cross-Tools tasks for controlled option payload truthfulness,
  runtime-effect matrix evidence, Backups pagination coverage, pepper-aware
  seed-admin path tests, and audit-run security contracts.
- Consolidated the previous per-family planning/refinement changelog entries
  into changelog numbers 1035 and 1036 so the remaining assigned numbers stay
  available for final closure entries.

## Validation

- Three read-only sub-agent drift passes checked the task leaves against
  reports, source files, tests, API docs, architecture docs, testing strategy,
  admin cache docs, and security expectations.
- Claude CLI was available; the first read-only run exceeded the configured
  budget, and the second shorter read-only run returned no additional findings.
- A final local audit confirmed the 28 execution leaves include pseudocode,
  data-flow notes, error-handling notes, regression-test shapes, and explicit
  security contracts.
