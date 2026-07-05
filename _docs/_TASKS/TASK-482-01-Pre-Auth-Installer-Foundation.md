# TASK-482-01: Pre-auth installer foundation (first-run service + `/auth/install` status)
# FileName: TASK-482-01-Pre-Auth-Installer-Foundation.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
| TASK-482-01-L01 | First-run detection service (`countUsers` / `isFirstRun`) | Small | ✅ Done |
| TASK-482-01-L02 | `/auth/install` namespace + `GET /auth/install/status` + audit taxonomy | Medium | ✅ Done |

## Dependencies

- None (foundation). 02 and 03 depend on this subtask.

## Coordination (pinned facts for the TASK-482 stream)

- **Changelog number:** TASK-482 closes under `_docs/_CHANGELOG/1220-*.md`
  (created only by the closure subtask TASK-482-09). Numbers `1219`
  (TASK-510), `1221` (TASK-483) and `1222` (TASK-484) are RESERVED by
  parallel streams — never reallocate them.
- **Parallel streams / forbidden paths:** TASK-483 (analytics) and TASK-484
  (backups) run concurrently in sibling worktrees. This stream must not touch
  `core/services/analytics/**`, `core/services/backups/**`, any
  analytics/backups route modules, `core/db/schema.ts`, or
  `core/db/migrations/**`. Edits to shared surfaces
  (`core/server/routes/index.ts`, `core/server/httpServer.ts`,
  `tests/security/*`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`,
  `_docs/AUTH_SPEC.md`) must be additive and scoped to install-specific
  lines only.
- **Shared remote test DB:** all streams and the owner share ONE Postgres
  (`DATABASE_URL` in `.env`). No test in this subtask may delete/truncate
  `users` or engineer a real no-users state; first-run gates are tested via
  service-level seams and mocks (see the leaf files).

## Testing Requirements

- L01: Vitest service lane (`tests/vitest/admin/` or a new `tests/vitest/setup/`)
  for `countUsers`/`isFirstRun` against a **mocked `core/db/client`**
  (aggregate resolving to empty vs seeded counts, mirroring
  `tests/vitest/customScreens/customScreenService.test.ts`) — never a real
  seeded-vs-empty `users` table on the shared DB.
- L02: Bun route-integration lane (`tests/integration/routes/`) for the status
  endpoint shape, public reachability, and self-disable transition — all via
  the injected `isFirstRun` deps seam (fake-router harness), not real DB
  state.
