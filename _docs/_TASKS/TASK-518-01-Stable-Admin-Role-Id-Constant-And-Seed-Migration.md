# TASK-518-01: Stable Admin-Role Id Constant + Seed Migration

# FileName: TASK-518-01-Stable-Admin-Role-Id-Constant-And-Seed-Migration.md

**Parent Task:** TASK-518
**Priority:** High
**Category:** Auth / RBAC / Data / Installer
**Estimated Effort:** Small
**Dependencies:** none hard
**Status:** ✅ Done
**Completed:** 2026-08-14
**Changelog:** 1231 (pinned; closure only)

---

## Overview

Own the stable admin-role identity and the migration that guarantees it. The
default `admin` role (`permissions: ["*"]`) is today created ad-hoc with a
random UUID in `createFirstAdmin` (`firstRunService.ts`) and `seedAdmin()`
(`seed.ts`). This leaf introduces ONE fixed UUID constant used by the
migration and (in TASK-518-02) by both consumers, so a fresh `db:migrate`
without `db:seed` already has exactly one `admin` role with the stable id.

## Exclusive ownership

- new `core/db/seedConstants.ts` (the single `DEFAULT_ADMIN_ROLE_ID` constant,
  stable UUID literal, exported; one source of truth)
- new migration files: SQL + `meta/<idx>_snapshot.json` + `meta/_journal.json`
  entry (full artifacts, additive + idempotent `ON CONFLICT DO NOTHING` on the
  stable id and `name`)
- `core/db/migrations/meta/_journal.json` (append-only, next free index at
  implement time — grep the dir, do NOT hardcode a colliding index; 480 owns
  0066, 512/513/514 reserved 0067/0068/0069, 511 takes next after those, 518
  takes the next free after all landed)
- tests for the migration contract (fresh-schema migrate yields one admin role
  with the stable id; idempotent re-run is a no-op; legacy-id role is NOT
  renumbered/duplicated)

## Implementation Pseudocode

```ts
// core/db/seedConstants.ts
export const DEFAULT_ADMIN_ROLE_ID = "<fixed-uuid>"; // one stable literal
```

Migration (verify real `roles` columns at implement: id uuid pk, name text
unique, permissions jsonb, description?, created_at/updated_at?):

```sql
INSERT INTO roles (id, name, permissions, created_at, updated_at)
VALUES ('<DEFAULT_ADMIN_ROLE_ID>', 'admin', '["*"]', now(), now())
ON CONFLICT (id) DO NOTHING;
```

Also guard the `name` unique path: if a legacy role with `name='admin'` but a
random id already exists, do NOT insert a duplicate (the migration must be
non-destructive). Prefer `ON CONFLICT (name) DO NOTHING` semantics via a
`WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin')` guard, or two
idempotent statements — pick the exact shape that matches the real schema and
is provably idempotent.

Generate via `bun run db:generate` flow (root package.json), verify it applies
cleanly against the shared REMOTE test DB (`DATABASE_DIRECT_URL`). The
migration is additive; tests use scoped fixtures and never truncate `roles`.

## Regression-test shape

- Fresh-schema `db:migrate` (no seed): exactly one `admin` role with
  `DEFAULT_ADMIN_ROLE_ID`.
- Re-running the migration is a no-op (still exactly one admin role).
- A pre-existing legacy-id admin role is left untouched (no duplicate, no
  renumber) — simulate by inserting a legacy role first, then migrating.

## Security Contract

- No new route. No privilege change: the admin role keeps `permissions: ["*"]`
  (unchanged semantics). No secrets. Idempotent + non-destructive.

## Testing Requirements

- `set -a && source .env && set +a && TMPDIR=/tmp bun test <owned test file(s)>`
- `bun --cwd core lint` + `bun --cwd core lint:types`
- `git diff --check`; every file <=1000 lines
- Migration applies cleanly to the remote DB (or a dedicated worker schema)
