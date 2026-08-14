# 1231 - TASK-518 Seed Default Admin Role via Migration (Stable ID, Admin-Only)

**Date:** 2026-08-14
**Version:** Unreleased
**Tasks:** TASK-518, TASK-518-01, TASK-518-02

## Key Changes

- **Stable admin-role identity**: `core/db/seedConstants.ts` exports the one fixed
  `DEFAULT_ADMIN_ROLE_ID` UUID (`a0000000-0000-4000-8000-000000000001`) as the single
  source of truth.
- **Migration-guaranteed role**: migration `0071_seed_admin_role` seeds the `admin`
  role (`permissions: ["*"]`) with the stable id, idempotently (`WHERE NOT EXISTS
  (name='admin')` + `ON CONFLICT (id) DO NOTHING`), so a fresh `db:migrate` without
  `db:seed` already has exactly one admin role. A pre-existing legacy random-id admin
  role is never duplicated or renumbered. Full SQL + snapshot + journal artifacts.
- **Consumers aligned**: `createFirstAdmin` (firstRunService) and `seedAdmin()`
  (seed.ts) now resolve the admin role by the stable id first, falling back to
  select-by-name for legacy installs; no ad-hoc role creation remains.
- **Cross-reference**: with a stable admin-role id, TASK-511-04 RBAC backup/restore
  lands `user_roles` against the same role id across installs.

## Validation

- Migration tests 2/2 (fresh migrate -> one stable-id admin role; idempotent re-run
  no-op; legacy random-id role untouched on a separate throwaway schema).
- Consumer tests 6/6 DB-backed (fresh empty DB assigns the stable-id role, legacy
  resolves, idempotent) + 27/27 Vitest `createFirstAdmin` tests.
- Core lint, lint:types, repo tsc, git diff --check clean; all files <=1,000 lines.

## Notes

- Admin role only, per owner decision: no editor/viewer/richer matrix. No privilege
  change (`permissions: ["*"]` unchanged), no new route, no secrets.
