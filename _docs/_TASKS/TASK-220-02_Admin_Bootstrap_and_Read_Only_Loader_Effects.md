# TASK-220-02: Admin Bootstrap and Read-Only Loader Effects
# FileName: TASK-220-02_Admin_Bootstrap_and_Read_Only_Loader_Effects.md

**Priority:** High
**Category:** Admin/UI + React Hooks Compiler
**Estimated Effort:** Large
**Dependencies:** TASK-220-01
**Status:** To Do

---

## Overview

Fix `react-hooks/set-state-in-effect` findings in admin bootstrap and
read-only loader pages. These are the highest request-amplification risk because
many effects call a loader on mount and the loader synchronously sets loading or
error state before any async boundary.

## Sub-Tasks

- [ ] TASK-220-02-01: AdminApp Auth, Settings, and Theme Bootstrap Effects
- [ ] TASK-220-02-02: Read-Only Dashboard, Audit, Security, and Settings Loaders
- [ ] TASK-220-02-03: Analytics Memoization and KPI Derived State

## Security Contract

- Visibility: internal admin UI only.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged; each read keeps its current backend permission boundary.
- CSRF: no new writes.
- Rate-limit bucket: existing admin read buckets.
- Reject-unknown validation: unchanged.
- Anti-abuse: prevent mount-time request amplification and render repair loops;
  do not move privileged settings into browser cache.
- Secret handling: preserve backend-only secret redaction.

## Testing Requirements

- Focused Vitest for changed loader components where existing coverage exists.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/README.md` on status changes.
- `_docs/ADMIN_CACHE.md` only if bootstrap/read-through cache semantics change.

## Acceptance Criteria

1. Loader effects no longer synchronously set local React state on mount.
2. Existing protected-route, settings, theme, and read-only page behavior remains
   unchanged.
3. No lint rules are disabled to clear this subtask.
