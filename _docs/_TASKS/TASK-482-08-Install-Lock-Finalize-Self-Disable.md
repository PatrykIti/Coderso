# TASK-482-08: Install-lock / finalize / self-disable
# FileName: TASK-482-08-Install-Lock-Finalize-Self-Disable.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-05, TASK-482-06, TASK-482-07
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
| TASK-482-08-L01 | Finalize multi-track `completeSetup` + install-lock | Small | ✅ Done |
| TASK-482-08-L02 | Self-disable boundary assertions (installer + wizard) | Medium | ✅ Done |

## Dependencies

- TASK-482-05 / 06 / 07 (all Phase-2 tracks must be persistable before finalize).
- TASK-482-01 / 02 (installer endpoints to assert disabled).

## Coordination Pins (TASK-482 stream)

- **Changelog:** the closure subtask (TASK-482-09) allocates changelog **1220**
  (`_docs/_CHANGELOG/1220-*.md`). Numbers 1219 (TASK-510, shared main tree),
  1221 (TASK-483) and 1222 (TASK-484) are RESERVED by parallel streams — never
  reallocate them.
- **Parallel streams:** TASK-483 (analytics) and TASK-484 (backups) run
  concurrently in sibling worktrees. FORBIDDEN paths for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any
  analytics/backups route modules, `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings keys go through the settings
  service defaults (rows, not DDL); first-admin creation uses the existing
  `users` table.
- **Shared remote test DB:** one Postgres (render.com, `DATABASE_URL` in
  `.env`) is shared with the owner and both sibling streams. No test may
  delete/truncate `users`, flip a global no-users install state, or reset
  shared settings rows — use service seams, uniquely scoped fixtures, or
  self-restoring setup/teardown (see 08-L02's shared-DB pin).
- **Board/changelog discipline:** only TASK-482-09 edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; implementation subtasks
  (including 08) never touch them.
- **Land order:** 01 → 02 → 03, then 04 → 05 → 06 → 07 → **08**, then 09 —
  strictly sequential, single writer per source file.

## Testing Requirements

- L01: Vitest ui-integration that finishing the wizard PATCHes `setup.completed`
  and the wizard no longer renders.
- L02: Bun security lane that `/auth/install/status` reports `available:false`
  and `POST /auth/install/admin` returns 409 once a user exists / setup
  completed — asserted via the fake-router + injected first-run seams
  (01-L02/02-L01), never by mutating the shared remote DB (see 08-L02).
