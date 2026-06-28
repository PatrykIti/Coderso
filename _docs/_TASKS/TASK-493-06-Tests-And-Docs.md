# TASK-493-06: Tests & Documentation
# FileName: TASK-493-06-Tests-And-Docs.md

**Parent Task:** TASK-493
**Priority:** Medium
**Category:** Tools / SEO
**Estimated Effort:** Medium
**Dependencies:** TASK-493-01, TASK-493-02, TASK-493-03, TASK-493-04, TASK-493-05
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Close the pipeline with a cross-cutting end-to-end test + perf/security gate and
finalize the source-of-truth docs. Each prior leaf carries its own unit/route
tests; this subtask adds the integration that proves schema → sync → aggregate →
sitemap works together, and brings the four docs in line with the shipped
contract.

---

## Sub-Tasks

| LNN | Title | Lane | Status |
|-----|-------|------|--------|
| L01 | Pipeline integration + perf/security gate tests | Bun | ⏳ To Do |
| L02 | Documentation finalization (DATA_MODEL / CMS_API / SEARCH_SPEC / SECURITY_SPEC) | docs | ⏳ To Do |

---

## Dependencies

- All of 01–05 implemented.

---

## Testing Requirements

- L01 — Bun integration (`tests/integration/*`) for the full flow + a
  `tests/perf/*` budget for `/sitemap.xml` and the overview route, and a
  `tests/security/*` sweep for secret-never-to-client across the new routes.
- L02 — doc edits only; verified by review against the implemented endpoints.
