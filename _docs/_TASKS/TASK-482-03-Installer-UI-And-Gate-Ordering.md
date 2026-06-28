# TASK-482-03: Pre-login installer UI + `AdminApp` gate ordering
# FileName: TASK-482-03-Installer-UI-And-Gate-Ordering.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-01, TASK-482-02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

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
| TASK-482-03-L01 | `InstallerWizard.tsx` create-first-admin UI | Medium | ⏳ To Do |
| TASK-482-03-L02 | `AdminApp` install-gate ordering + post-create handoff | Medium | ⏳ To Do |

## Dependencies

- TASK-482-01-L02 (`GET /auth/install/status`), TASK-482-02-L02
  (`POST /auth/install/admin`).

## Testing Requirements

- L01: Vitest ui-integration render flow (form validation, password strength,
  submit calls the install client).
- L02: Vitest ui-integration for gate ordering + a pure `shouldShowInstaller`
  helper unit test asserting it precedes the redirect/loading branches.
