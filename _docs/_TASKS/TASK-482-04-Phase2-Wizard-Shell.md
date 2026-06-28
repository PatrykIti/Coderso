# TASK-482-04: Phase-2 wizard shell + step framework
# FileName: TASK-482-04-Phase2-Wizard-Shell.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-03
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Generalise the current fixed 3-step `SetupWizard.tsx` into a reusable multi-track
stepper: a step registry, per-step validation, dirty/resume tracking, and a
Basic/Advanced track toggle. This subtask delivers the **framework and shell
only**; the concrete Basic steps (05), starter content (06), and Advanced steps
(07) plug into the registry. The shell is restyled onto TASK-479 primitives.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-04-L01 | Step-framework state machine (registry, validation, dirty/resume, tracks) | Medium | ⏳ To Do |
| TASK-482-04-L02 | Wizard shell component + restyle to TASK-479 primitives | Medium | ⏳ To Do |

## Dependencies

- TASK-482-03 (Phase 1 lands the admin able to log in). Framework is otherwise
  self-contained; 05/06/07 depend on it.

## Testing Requirements

- L01: Vitest service/logic lane for the reducer/state machine (step transitions,
  validation gating, track toggle, resume).
- L02: Vitest ui-integration for the shell render (step nav, Basic/Advanced
  toggle, error surfacing).
