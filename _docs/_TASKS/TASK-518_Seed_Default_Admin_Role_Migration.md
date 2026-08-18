# TASK-518: Seed Default Admin Role via Migration (stable id, admin-only)

# FileName: TASK-518_Seed_Default_Admin_Role_Migration.md

**Priority:** High
**Category:** Auth / RBAC / Data / Installer
**Estimated Effort:** Small
**Dependencies:** none hard (relates to TASK-482 installer + TASK-511-04 RBAC backup/restore)
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** 2026-07-06

---

## Overview

Today the default `admin` role (`permissions: ["*"]`) is created **ad-hoc in two places**
with a **random UUID each time**: `createFirstAdmin` (`firstRunService.ts:113-117`,
select-by-name-`"admin"`-else-insert) and `seedAdmin()` (`seed.ts:24-37`, same pattern).
Nothing in the migrations guarantees it, so:
- a fresh `db:migrate` WITHOUT running `db:seed` yields an empty `roles` table (the
  installer's `createFirstAdmin` self-heals it, but the baseline is not migration-guaranteed);
- the `admin` role gets a **different id on every install**, which makes cross-install
  RBAC backup/restore (TASK-511-04, users + user_roles include) inconsistent — the same
  logical "admin" role has a different primary key on source vs target.

TASK-518 seeds the default **`admin`** role via a **migration** with a **STABLE, fixed id**
(idempotent `ON CONFLICT DO NOTHING`), and points `createFirstAdmin` + `seedAdmin()` at the
seeded role instead of ad-hoc-creating it. **Owner decision (2026-07-06): admin role ONLY —
NO editor/viewer/richer matrix (security first);** a broader role matrix, if ever wanted, is
a separate future task.

## Coordination (pinned facts)

- **Changelog number:** closure creates `_docs/_CHANGELOG/1231-*.md` (next free after
  517=1230, 511=1229, 512–516=1224–1228, 480=1223). Only the closure subtask edits
  `_docs/_TASKS/*` + `_docs/_CHANGELOG/*`.
- **Branch/worktree:** dedicated `feature/task-518` worktree from `feature/tasks` HEAD.
- **DB migration required (full artifacts):** SQL + `meta/<idx>_snapshot.json` +
  `meta/_journal.json` entry. Use the **next-free index at implement time** — 480 owns
  `0066` (staged), 512/513/514 are reserved `0067`/`0068`/`0069`, 511 takes the next after
  those; 518 takes the next free after all landed migrations (grep the migrations dir +
  journal at land — do NOT hardcode a colliding index). Generate via the repo `bun run
  db:generate` flow, verified to apply cleanly.
- **Shared REMOTE test DB:** the migration is additive + idempotent (`ON CONFLICT DO
  NOTHING` on the stable id/name); tests use scoped fixtures + never truncate `roles`.

## Design

- **Stable id:** a fixed UUID constant (e.g. `DEFAULT_ADMIN_ROLE_ID`) exported from a
  single owner module (e.g. `core/db/seedConstants.ts` or `rolesService.ts`), used by the
  migration seed, `createFirstAdmin`, and `seedAdmin()` — one source of truth.
- **Migration:** `INSERT INTO roles (id, name, permissions, ...) VALUES
  (<DEFAULT_ADMIN_ROLE_ID>, 'admin', '["*"]', ...) ON CONFLICT DO NOTHING;` (match the real
  `roles` columns — verify `name` uniqueness + `permissions` jsonb shape + any
  `description`/timestamps at implement).
- **Consumers updated (non-destructive, backward-compatible):** `createFirstAdmin` +
  `seedAdmin()` resolve the admin role by the stable id (fall back to select-by-name for
  pre-existing installs whose admin role has a legacy random id — do NOT duplicate or
  renumber an existing admin role). Existing installs keep working; new installs get the
  stable id.
- **Interaction with TASK-511-04:** with a stable admin-role id, a users+RBAC restore onto
  a fresh install lands `user_roles` against the same admin role id — consistent. Note this
  cross-reference (do not implement 511 here).

## Security Contract

- No new route. Migration + seed/first-run service edits only. The `admin` role keeps
  `permissions: ["*"]` (unchanged semantics). No privilege change, no new capability — this
  only makes the EXISTING default role migration-guaranteed with a stable id.
- No secrets involved. Idempotent + non-destructive (never deletes/renumbers an existing role).

## Sub-Tasks (break down at authoring)

| ID | Title | Priority | Effort | Status |
|----|-------|----------|--------|--------|
| TASK-518-01 | Stable admin-role id constant + seed migration (full artifacts) | High | Small | ✅ Done |
| TASK-518-02 | Point createFirstAdmin + seedAdmin at the stable role + tests/docs/closure | High | Small | ✅ Done |

Land order 01→02. Bun lane (DB + first-run/seed). Run the standard pipeline; regression
tests: fresh-schema `db:migrate` (no seed) has exactly one `admin` role with the stable id;
`createFirstAdmin` on an empty DB assigns that role (no duplicate role, no random id);
pre-existing legacy-id admin role still resolves; idempotent re-run of the migration is a no-op.
