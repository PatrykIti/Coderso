# TASK-482-04: Phase-2 wizard shell + step framework
# FileName: TASK-482-04-Phase2-Wizard-Shell.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-03
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
| TASK-482-04-L01 | Step-framework state machine (registry, validation, dirty/resume, tracks) | Medium | ✅ Done |
| TASK-482-04-L02 | Wizard shell component + restyle to TASK-479 primitives | Medium | ✅ Done |

## Dependencies

- TASK-482-03 (Phase 1 lands the admin able to log in). Framework is otherwise
  self-contained; 05/06/07 depend on it.

## Coordination Pins (TASK-482 stream)

- **Changelog:** number **1220** is pinned for the TASK-482 closure
  (`_docs/_CHANGELOG/1220-*.md`, created by TASK-482-09 only). Numbers **1219**
  (TASK-510, in flight in the shared main tree — may be absent from this
  worktree's checkout; do NOT reallocate it), **1221** (TASK-483) and **1222**
  (TASK-484) are RESERVED by parallel streams.
- **Parallel streams / forbidden paths:** TASK-483 (analytics) and TASK-484
  (backups) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any analytics/backups
  route modules, `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through the
  settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. No 482 file plans DDL/migration artifacts.
- **Board/changelog discipline:** ONLY the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; this subtask never touches
  them.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Tests must never
  delete/truncate `users`, flip the real DB into a global no-users install state,
  or reset shared settings rows; use service-level seams, uniquely scoped
  fixtures, or self-restoring setup/teardown.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08 (phase 2),
  then 09 (closure). Strictly sequential, single writer per source file.

## Testing Requirements

- L01: Vitest service/logic lane for the reducer/state machine (step transitions,
  validation gating, track toggle, resume).
- L02: Vitest ui-integration for the shell render (step nav, Basic/Advanced
  toggle, error surfacing).
