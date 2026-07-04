# TASK-482-02: First-admin bootstrap + `POST /auth/install/admin`
# FileName: TASK-482-02-First-Admin-Bootstrap.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-01
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

The single most security-sensitive subtask: the **only** write that can create
a privileged account without an existing session. It introduces a
`createFirstAdmin` service that bootstraps a real `admin` user (role `['*']`,
status `active`, argon2 password hash) the way `seedAdmin()` does — **not** via
`usersService.createUser`, which would create a `pending` user with a random
password. The `POST /auth/install/admin` route exposes it behind the fail-closed
no-users gate, the `auth` rate-limit bucket, strong password validation, and an
audit trail. The no-users precondition is **re-checked inside the create
transaction** to close the TOCTOU window between two concurrent installer
submissions.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-02-L01 | `createFirstAdmin` service (seed pattern + TOCTOU re-check in tx) | Medium | ⏳ To Do |
| TASK-482-02-L02 | `POST /auth/install/admin` route (rate-limit + audit + optional session) | Medium | ⏳ To Do |

## Dependencies

- TASK-482-01-L01 (`countUsersTx`), TASK-482-01-L02 (`/auth/install` namespace +
  `mapInstallRouteError`).

## Testing Requirements

- L01: Vitest service lane for the happy path + the "users already exist" reject;
  Bun security lane for the concurrency/TOCTOU race (two parallel creates ⇒
  exactly one admin).
- L02: Bun route-integration + Bun security lane (fail-closed gate, rate-limit,
  weak-password rejection, audit emission).
