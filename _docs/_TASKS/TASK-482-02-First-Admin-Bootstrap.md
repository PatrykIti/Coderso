# TASK-482-02: First-admin bootstrap + `POST /auth/install/admin`
# FileName: TASK-482-02-First-Admin-Bootstrap.md

**Parent Task:** TASK-482
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-01
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

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
transaction**, and — because Postgres default `READ COMMITTED` would still let
two concurrent transactions both read `count = 0` — the transaction first takes
`pg_advisory_xact_lock` on a constant key so concurrent installer submissions
are serialized and at most one can ever create an admin (see 02-L01 for the
mechanism; codebase precedent: `core/server/startupMigrations.ts:99`).

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-02-L01 | `createFirstAdmin` service (seed pattern + TOCTOU re-check in tx) | Medium | ✅ Done |
| TASK-482-02-L02 | `POST /auth/install/admin` route (rate-limit + audit + optional session) | Medium | ✅ Done |

## Dependencies

- TASK-482-01-L01 (`countUsersTx`), TASK-482-01-L02 (`/auth/install` namespace +
  `mapInstallRouteError`).

## Coordination & Pins (TASK-482 stream)

These pins bind this subtask and both leaves (02-L01, 02-L02):

- **Changelog pin:** the TASK-482 closure subtask (TASK-482-09) creates
  `_docs/_CHANGELOG/1220-*.md` and edits `_docs/_TASKS/README.md` (TASK-482 rows
  + its own statistics deltas only). Numbers **1219** (TASK-510, in flight in
  the shared main tree), **1221** (TASK-483) and **1222** (TASK-484) are
  RESERVED by parallel streams — never allocate them. Implementation subtasks
  (including this one) never touch the board or the changelog.
- **Parallel streams:** TASK-483 (analytics) and TASK-484 (backups) run
  concurrently on sibling branches/worktrees. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any
  analytics/backups route modules, `core/db/schema.ts`,
  `core/db/migrations/**`.
- **No DB migration in this tree:** first-admin creation uses the existing
  `users`/`roles`/`userRoles` tables; settings keys go through the settings
  service defaults (rows, not DDL). No 482 file may plan DDL/migration
  artifacts.
- **Shared surfaces (additive-only):** the route registration module
  `core/server/routes/index.ts`, `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`
  and `_docs/AUTH_SPEC.md` are touched by all three streams. Edits must be
  scoped to this stream's own sections/lines (new entries only) and must not
  restructure existing content. `tests/security/codersoSecurityGate.test.ts` is
  a shared surface too, but TASK-482 does **NOT** edit it — it is a
  forms/booking submission-access + nonce **service** gate with no per-route
  expectation registry to extend (matching 06-L02's stance); the install-route
  contract lives in dedicated new test files (see 02-L02 Testing Requirements),
  and 08-L02 only keeps this gate green.
- **Shared surface — ONE non-additive edit (`core/server/httpServer.ts`):** L02
  must exclude `/auth/install/` paths from the `identifierFromBody` derivation in
  the rate-limit selection block (`httpServer.ts:340-346`, the single
  `isAuthRoute && ctx.body …` expression feeding `identifier` at :344-346, bucket
  chosen at :331-339). This is a MODIFICATION of a shared conditional — not a new
  block — and sits in the same `bucket`/`isPublicWrite`/`resolvePublicWriteIdentifier`
  region that the concurrent TASK-483/484 public-route streams are most likely to
  also edit. Keep the change to a single minimal token
  (`&& !pathname.startsWith("/auth/install")`) and reconcile it against
  TASK-483/484's rate-limit/public-write edits during land (single writer per
  source file, land order below).
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`), and Bun-lane tests connect
  to it via `core/db/client` (`tests/utils/db.ts`). No test may delete/truncate
  `users`, flip the real DB into a global no-users install state, or reset
  shared settings rows. First-run/no-users gates are tested via service-level
  seams (injected deps / mock db), uniquely scoped fixtures, or self-restoring
  setup/teardown — see the leaves' Testing Requirements.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08
  (phase 2), then 09 (closure). Strictly sequential, single writer per source
  file.

## Testing Requirements

- L01: Vitest service lane (hoisted mock-db pattern) for the happy path + the
  "users already exist" reject; Bun security lane for the concurrency/TOCTOU
  race (two parallel creates with **different emails** ⇒ exactly one admin),
  run against an injected seam/fixture — never against the shared `users`
  table (see Coordination & Pins).
- L02: Bun route-integration + Bun security lane (fail-closed gate, rate-limit,
  weak-password rejection, audit emission) via an in-process router with
  injected deps — never by draining the shared DB to a no-users state.
