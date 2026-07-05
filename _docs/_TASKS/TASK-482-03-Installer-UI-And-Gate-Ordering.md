# TASK-482-03: Pre-login installer UI + `AdminApp` gate ordering
# FileName: TASK-482-03-Installer-UI-And-Gate-Ordering.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-01, TASK-482-02
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

The client side of Phase 1. A new `InstallerWizard.tsx` renders the
create-first-admin form (reusing the centered `AuthShell` from 479-29 — which
removes `AuthBrandPanel` — and `PasswordStrengthList.tsx`),
and `AdminApp.tsx` is taught to render it **before** the existing
unauthenticated → `/login` redirect and the loading branch. The gate ordering is
the security-sensitive part: if the installer check runs *after* the redirect,
a fresh install bounces to a login screen with no account.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-03-L01 | `InstallerWizard.tsx` create-first-admin UI | Medium | ✅ Done |
| TASK-482-03-L02 | `AdminApp` install-gate ordering + post-create handoff | Medium | ✅ Done |

## Dependencies

- TASK-482-01-L02 (`GET /auth/install/status`), TASK-482-02-L02
  (`POST /auth/install/admin`).

## Coordination Pins (TASK-482 stream — binding for this subtask and its leaves)

- **Changelog:** the TASK-482 closure (TASK-482-09 only) creates
  `_docs/_CHANGELOG/1220-*.md`. Numbers **1219** (TASK-510, in flight in the
  shared main tree — do not reallocate even if absent from this worktree's
  checkout), **1221** (TASK-483) and **1222** (TASK-484) are RESERVED by
  parallel streams.
- **Parallel streams:** TASK-483 (analytics, worktree
  `/home/coder/project/Coderso-task-483`) and TASK-484 (backups,
  `/home/coder/project/Coderso-task-484`) run concurrently on sibling branches.
  FORBIDDEN PATHS for TASK-482: `core/services/analytics/**`,
  `core/services/backups/**`, any analytics/backups route modules,
  `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through
  the settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. This subtask is client-only and plans no DDL.
- **Shared surfaces (additive edits only, own sections/lines, no
  restructuring):** the server route registration module, the security-gate
  test expectations under `tests/security/`, `_docs/CMS_API.md`,
  `_docs/SECURITY_SPEC.md`, `_docs/AUTH_SPEC.md`.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Test contracts must NEVER
  delete/truncate `users`, flip the real DB into a global no-users install
  state, or reset shared settings rows — first-run/no-users gates are tested
  via service-level seams, uniquely scoped fixtures, or self-restoring
  setup/teardown. (The 03 leaves comply: their Vitest UI tests are mock-based
  and touch no shared DB.)
- **Board/changelog discipline:** ONLY TASK-482-09 edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*` (its own TASK-482 rows and
  statistics deltas only). Implementation subtasks, including this one, never
  touch them.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08
  (phase 2), then 09 (closure). Strictly sequential, single writer per source
  file.

## Testing Requirements

- L01: Vitest ui-integration render flow (form validation, password strength,
  submit calls the install client).
- L02: Vitest ui-integration for gate ordering + a pure `shouldShowInstaller`
  helper unit test asserting it precedes the redirect/loading branches.
