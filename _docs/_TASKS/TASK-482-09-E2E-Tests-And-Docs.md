# TASK-482-09: E2E tests + documentation
# FileName: TASK-482-09-E2E-Tests-And-Docs.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-01, TASK-482-02, TASK-482-03, TASK-482-04, TASK-482-05, TASK-482-06, TASK-482-07, TASK-482-08
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Prove the whole two-phase flow works end to end against a fresh database and
update the source-of-truth docs so the new endpoints, settings key, audit
taxonomy, and security trade-offs are recorded.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-09-L01 | Fresh-DB E2E onboarding flow (installer → login → Basic → starter → Advanced → finalize) | Medium | ⏳ To Do |
| TASK-482-09-L02 | Documentation updates | Small | ⏳ To Do |

## Dependencies

- All prior TASK-482 subtasks.

## Testing Requirements

- L01: Bun integration lane — full runtime flow against a fresh DB.
- L02: docs only (no test lane); cross-check that every cited route/key/audit
  action exists.
