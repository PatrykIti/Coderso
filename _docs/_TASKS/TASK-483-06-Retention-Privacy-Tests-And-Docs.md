# TASK-483-06: Retention, Privacy, Tests And Docs
# FileName: TASK-483-06-Retention-Privacy-Tests-And-Docs.md

**Parent Task:** TASK-483
**Priority:** High
**Category:** Tools / Analytics / Privacy / Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-483-02, TASK-483-04, TASK-483-05
**Status:** ⏳ To Do
**Started:** ``
**Completed:** ``

---

## Overview

Close the pipeline: prune raw traffic rows beyond a configurable retention
window, consolidate the privacy/DNT/consent posture and IP-hash salt rotation,
run the full cross-lane test matrix and security gates, and update the
source-of-truth docs.

## Sub-Tasks

| ID | Title | Effort | Status |
|---|---|---|---|
| TASK-483-06-L01 | Retention Pruning And Privacy Enforcement | Medium | ⏳ To Do |
| TASK-483-06-L02 | Test Matrix And Documentation Closure | Medium | ⏳ To Do |

## Dependencies

- TASK-483-02 (ingestion), TASK-483-04 (aggregation), TASK-483-05 (UI). L02
  depends on L01.

## Testing Requirements

- **Bun** for L01 (DB-backed pruning with scoped fixtures + security gate for
  salt/PII handling).
- **Bun + Vitest** consolidation in L02 across the route, security, perf, and
  Vitest suites touched by the family.
- Docs: `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`.
