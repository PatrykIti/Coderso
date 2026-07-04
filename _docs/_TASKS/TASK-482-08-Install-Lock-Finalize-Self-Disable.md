# TASK-482-08: Install-lock / finalize / self-disable
# FileName: TASK-482-08-Install-Lock-Finalize-Self-Disable.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-05, TASK-482-06, TASK-482-07
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Close both phases out. Extend `completeSetup` so finishing the multi-track wizard
sets `setup.completed = true` (and persists any not-yet-saved Basic values) so
the wizard never reappears, and assert the cross-cutting self-disable invariant:
once any user exists OR setup is completed, neither the installer nor the wizard
re-opens — defended both client-side (gates) and server-side (the `/auth/install`
status + create endpoints fail closed).

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-08-L01 | Finalize multi-track `completeSetup` + install-lock | Small | ⏳ To Do |
| TASK-482-08-L02 | Self-disable boundary assertions (installer + wizard) | Medium | ⏳ To Do |

## Dependencies

- TASK-482-05 / 06 / 07 (all Phase-2 tracks must be persistable before finalize).
- TASK-482-01 / 02 (installer endpoints to assert disabled).

## Testing Requirements

- L01: Vitest ui-integration that finishing the wizard PATCHes `setup.completed`
  and the wizard no longer renders.
- L02: Bun security lane that `/auth/install/status` reports `available:false`
  and `POST /auth/install/admin` returns 409 once a user exists / setup
  completed.
