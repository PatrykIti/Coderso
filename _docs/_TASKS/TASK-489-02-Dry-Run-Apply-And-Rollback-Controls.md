# TASK-489-02: Strict Internal API and Identity-Safe Browser State
# FileName: TASK-489-02-Dry-Run-Apply-And-Rollback-Controls.md

**Parent Task:** TASK-489
**Priority:** High
**Category:** Solution Kits / Internal API / Admin Cache / Security
**Estimated Effort:** Large
**Dependencies:** All TASK-489 parent-level start gates; TASK-489-01; TASK-547 done; complete terminal TASK-551 and terminal TASK-414-03-L03 receipts
**Status:** ⏳ To Do
**Changelog:** 1268 (pinned; closure only)

---

## Overview

Expose the safe service through strict prefixless internal routes, then consume
those DTOs through the terminal TASK-551 Admin cache authority and a race-safe
history/detail hook. This child does not add apply, dry-run, rerun, latest
rollback, public access, or API-key access. Its route leaf also repairs the
existing Setup apply boundary so service-owned atomic completion cannot be
followed by a duplicate route audit that makes committed success look failed.

## Sub-Tasks

| Order | ID | File | Status |
|---:|---|---|---|
| 3 | TASK-489-02-L01 | `TASK-489-02-L01-Dry-Run-And-Apply-Controls.md` | ⏳ To Do |
| 4 | TASK-489-02-L02 | `TASK-489-02-L02-Rollback-Control-With-Confirm.md` | ⏳ To Do |

## Route Contract

- Prefixless registration only: `GET /solution-kits/runs`,
  `GET /solution-kits/runs/:runId`, and
  `POST /solution-kits/runs/:runId/rollback`.
- The shared Admin router supplies `/admin/api`; no route literal duplicates it.
- GET normalized query is strict reject-unknown. Rollback requires an actual
  `application/json` body exactly `{}` and source identity comes only from the
  path. The obsolete kit-key/latest rollback route is removed.
- Terminal TASK-414 wire syntax/cap runs before session/RBAC/rate/CSRF/content
  selection/parse, with the descriptor's exact safe `parseErrorCode`; this child
  never reconstructs that transport order.
- Read RBAC is `solution-kits:read`; rollback is require-all
  `solution-kits:write` plus `settings:write`.
- Rollback success/failed return HTTP 200; a durable claimed owner whose terminal
  state cannot be proven returns strict HTTP 202 `recovery_required` with
  `summary:null`. All use validated no-store responses.
- The same route leaf is the sole TASK-489 writer of `setupRoutes.ts`. It removes
  the route-owned `setup.starter_content.applied` audit and maps every Setup
  recovery/conflict code named by L01/L02 to fixed safe responses. A resolved
  `applyStarterContent` result is returned directly with no throwing post-service
  audit/cache work.

## Browser Contract

- Cache keys include the canonical package-scope/cursor page or exact run ID and can
  contain only validated safe DTOs.
- All installation, hydration, and in-flight completion behavior consumes the
  terminal TASK-551-09-L04 authority/token/reset seam.
- Auth/deployment/permission transition makes prior values inaccessible,
  cancels installation of stale completions, and clears route-local selection.
- Rollback invalidates every global history page, every page for the returned
  authoritative source package, and the exact source/new rollback detail keys
  after `success`, `failed`, or claimed-owner `recovery_required`. The first two
  return HTTP 200 with terminal summaries; recovery returns HTTP 202 with the
  durable rollback run ID and `summary:null`. Cursor expiry/key-rotation maps to
  one safe code and causes at most one guarded page-one reset with a persistent
  non-destructive notice. Cache failure never changes an authoritative result into
  an API failure.
- Terminal failed means locked zero-net/full compensation: refresh keeps the
  source active and may re-enable a new exact retry with a new rollback owner.
  Recovery means partial/unresolved or uncertain state: it retains the same
  running owner and duplicate mutation stays disabled.

## Security Contract

- **Visibility:** internal session-only Admin routes.
- **RBAC:** reads `solution-kits:read`; rollback require-all both writes.
- **CSRF/rate limit:** rollback CSRF plus `admin_write`; GET uses `admin_read`.
- **Validation:** strict normalized query, terminal signed cursor, canonical UUID,
  exact JSON empty body, safe DTOs.
- **Anti-abuse:** keyset limits and exact-source write; no public/API-key mode.
- **Data:** TASK-489 history/detail/rollback cache and UI state persist no actor/
  options/snapshots/rollback payload/raw error. Retained apply response contracts
  outside these surfaces are not reclassified by this child.

## Testing Requirements

Each leaf runs its route/client/hook suites, full lint/types, touched-file line
counts, and `git diff --check`. L02 lands only after L01 is green.

## Documentation Updates Required

TASK-489-03-L02 owns final API, security, Admin cache-map, Solution Kits,
changelog, board, and closure documentation. This child hands off its route
matrix, response schemas, cache keys, identity reset, race, and invalidation
contracts.

## Forbidden Paths

Domain read/dispatcher sources owned by TASK-489-01, UI composition,
runtime-smoke, docs/changelog/board, DB schema/migrations, TASK-551 cache
authority/retention owners, apply/dry-run paths, public router, and
TASK-555/TASK-556.
