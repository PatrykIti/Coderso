# TASK-518-02: Point createFirstAdmin + seedAdmin at the Stable Role + Tests/Docs/Closure

# FileName: TASK-518-02-Point-CreateFirstAdmin-And-SeedAdmin-At-Stable-Role.md

**Parent Task:** TASK-518
**Priority:** High
**Category:** Auth / RBAC / Data / Installer
**Estimated Effort:** Small
**Dependencies:** TASK-518-01
**Status:** ✅ Done
**Completed:** 2026-08-14
**Changelog:** 1231 (pinned; closure only)

---

## Overview

Own the consumer updates that make `createFirstAdmin` and `seedAdmin()` use
the stable admin-role id from TASK-518-01, with a backward-compatible
select-by-name fallback for pre-existing installs whose admin role has a
legacy random id. Existing installs keep working; new installs get the stable
id. Also owns the closure: changelog 1231, board rows, TASK-518 parent status,
and the cross-reference note to TASK-511-04.

## Exclusive ownership

- `core/services/auth/firstRunService.ts` (createFirstAdmin) — resolve the
  admin role by `DEFAULT_ADMIN_ROLE_ID` first, fall back to
  select-by-name-`"admin"` for legacy installs; never create a duplicate
  role, never renumber an existing one
- `core/db/seed.ts` (seedAdmin) — same resolution, importing the constant
  from `core/db/seedConstants.ts` (owned by 518-01; this leaf only consumes
  it)
- tests for both consumers (fresh empty DB -> assigns the stable-id role;
  legacy random-id role still resolves; idempotent re-run is a no-op)
- closure: `_docs/_CHANGELOG/1231-*.md`, `_docs/_TASKS/README.md` rows +
  statistics, TASK-518 + TASK-518-01 + TASK-518-02 status transitions, board
  Done rows

## Implementation Pseudocode

```ts
// firstRunService.ts / seed.ts — shared resolution (single helper is fine)
const role = await resolveAdminRole(); // by DEFAULT_ADMIN_ROLE_ID, else by name
if (!role) throw ...; // migration guarantees it; fail loud if missing
// assign/create user with role.id — no ad-hoc role INSERT
```

The migration from 518-01 already guarantees the role exists on fresh
installs, so the consumers can resolve by stable id and only fall back to
select-by-name for legacy data. Keep both paths non-destructive and
idempotent.

## Security Contract

- No new route. No privilege change (`permissions: ["*"]` unchanged). No
  secrets. Never deletes/renumbers an existing admin role.

## Testing Requirements

- `set -a && source .env && set +a && TMPDIR=/tmp bun test <owned test file(s)>`
- `bun --cwd core lint` + `bun --cwd core lint:types`
- `git diff --check`; every file <=1000 lines
- Regression: fresh empty DB -> createFirstAdmin assigns stable-id role, no
  duplicate role, no random id; legacy-id admin role still resolves; idempotent
  re-run is a no-op
