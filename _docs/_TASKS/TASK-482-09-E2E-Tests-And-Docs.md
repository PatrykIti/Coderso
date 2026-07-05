# TASK-482-09: E2E tests + documentation
# FileName: TASK-482-09-E2E-Tests-And-Docs.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-01, TASK-482-02, TASK-482-03, TASK-482-04, TASK-482-05, TASK-482-06, TASK-482-07, TASK-482-08
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

Prove the whole two-phase flow works end to end and update the source-of-truth
docs so the new endpoints, settings key, audit taxonomy, and security
trade-offs are recorded. **Shared-DB constraint:** all TASK-482/483/484 streams
and the owner share ONE remote Postgres (render.com, `DATABASE_URL` in `.env`);
the E2E flow is therefore exercised through service-level seams (dependency
injection) — never by truncating/resetting the real `users` table or flipping
the shared DB into a no-users install state (see TASK-482-09-L01).

This subtask is also the **closure subtask** for the whole TASK-482 tree: it
alone writes the changelog entry and board updates (see Closure below).

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-09-L01 | E2E onboarding flow via injected-service harness (installer → login → Basic → starter → Advanced → finalize) | Medium | ✅ Done |
| TASK-482-09-L02 | Documentation updates | Small | ✅ Done |

## Closure (board + changelog — performed by TASK-482-09 itself, after L01 + L02)

Per the parent task's pinned board/changelog discipline
(`TASK-482_Setup_And_Onboarding_Wizard.md`), the closure step is IN scope for
this subtask and is executed here (not by an external orchestrator), after both
leaves land:

1. Create `_docs/_CHANGELOG/1220-<YYYY-MM-DD>-task-482-setup-and-onboarding-wizard.md`
   — **pinned changelog number 1220**. Numbers **1219** (TASK-510, in flight in
   the shared main tree — may be absent from this worktree's checkout; do NOT
   reallocate it), **1221** (TASK-483) and **1222** (TASK-484) are RESERVED by
   parallel streams and must not be taken.
2. Update `_docs/_TASKS/README.md` — touch ONLY the TASK-482 rows and the
   statistics deltas they imply; do not restructure or touch other tasks' rows.
3. Flip the **Status** / **Started** / **Completed** fields in the TASK-482
   task files to reflect completion.

ONLY this closure step edits `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`;
implementation subtasks (01–08) and the two leaves below never touch them.

## Dependencies

- All prior TASK-482 subtasks.

## Testing Requirements

- L01: Bun integration lane — full flow through the DI stub-router harness with
  injected services (non-destructive on the shared remote DB; see L01 for the
  harness anchors and shared-DB safety rules).
- L02: docs only (no test lane); cross-check that every cited route/key/audit
  action exists.
- Closure step: no test lane; verify the changelog file number is exactly 1220
  and the README diff touches only TASK-482 rows + statistics.
