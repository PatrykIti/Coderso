# TASK-482-01: Pre-auth installer foundation (first-run service + `/auth/install` status)
# FileName: TASK-482-01-Pre-Auth-Installer-Foundation.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Build the read-only foundation of Phase 1: a race-safe first-run detection
service and the public `/auth/install` route namespace exposing
`GET /auth/install/status`. The status endpoint is the contract the installer UI
(03) and the create endpoint (02) both depend on, and it is the canonical
self-disable signal: once the DB holds any user, `isFirstRun` is `false` and the
installer must report itself closed.

This subtask introduces the `auth.install.*` audit taxonomy and registers the
namespace in the route index, but performs **no writes** to users.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-01-L01 | First-run detection service (`countUsers` / `isFirstRun`) | Small | ⏳ To Do |
| TASK-482-01-L02 | `/auth/install` namespace + `GET /auth/install/status` + audit taxonomy | Medium | ⏳ To Do |

## Dependencies

- None (foundation). 02 and 03 depend on this subtask.

## Testing Requirements

- L01: Vitest service lane (`tests/vitest/admin/` or a new `tests/vitest/setup/`)
  for `countUsers`/`isFirstRun` against a seeded vs empty users table.
- L02: Bun route-integration lane (`tests/integration/routes/`) for the status
  endpoint shape, public reachability, and self-disable transition.
