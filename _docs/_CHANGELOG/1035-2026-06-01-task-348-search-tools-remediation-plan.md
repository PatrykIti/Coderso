# 1035 - TASK-348 Search Tools remediation plan

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-348

## Key Changes

### Planning

- Added the TASK-348 Search remediation family from the 2026-05-31 Tools
  Playwright report and 2026-06-01 Claude UX review.
- Split Search work into execution leaves for date-range API/service behavior,
  empty-state and suggestion UX, and final navigation proof/docs closure.
- Captured the internal admin Search security contract so date-range changes
  preserve session auth, `content:read` RBAC, `admin_read` rate limiting, and
  strict enum validation.
- Refined the Search leaves after drift audit to include SearchBar compatibility,
  aggregate empty-index metadata, and `_docs/CMS_API.md` / `_docs/SEARCH_SPEC.md`
  updates for API-visible changes.

## Validation

- Planning was based on the Search report, Tools overview report, Claude UX
  addendum, current Search UI/client/route/service files, current Search tests,
  and the repo task/changelog format rules.
- Follow-up drift audit compared the leaves with current `SearchBar`,
  `searchRoutes`, `searchService`, and Search specs.
