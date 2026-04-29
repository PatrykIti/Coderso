# TASK-220-03: Cache Hydration Hooks and List Mount Refresh
# FileName: TASK-220-03_Cache_Hydration_Hooks_and_List_Mount_Refresh.md

**Priority:** High
**Category:** Admin Cache + React Hooks Compiler
**Estimated Effort:** Large
**Dependencies:** TASK-220-01, TASK-206
**Status:** Done (2026-04-29)

---

## Overview

Fix React Hooks Compiler findings in shared admin cache hooks, list mount
refresh flows, cached detail hydration, and visible-selection trimming. This is
the most contract-sensitive slice because `_docs/ADMIN_CACHE.md` requires cache
hits to render immediately while background refresh avoids dirty-state
overwrites.

## Sub-Tasks

- [ ] TASK-220-03-01: Shared Cached List Hooks Mount Refresh
- [ ] TASK-220-03-02: Admin List Page Mount Refresh and Selection Trim
- [ ] TASK-220-03-03: Cached Detail and Editor Hydration

## Security Contract

- Visibility: internal admin cache/list/detail surfaces.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged per resource family.
- CSRF: no new writes.
- Rate-limit bucket: existing admin read buckets.
- Reject-unknown validation: unchanged.
- Anti-abuse: prevent mount-force refetch loops, request amplification, and
  dirty-state overwrites from background cache events.
- Secret handling: do not add secrets or privileged settings to browser cache.

## Testing Requirements

- Existing cache hydration and cache-bus Vitest suites.
- Focused UI suites for touched list/editor resources.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo`
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if cache semantics change.
- `_docs/ADMIN_CACHE_MAP.md` if ownership changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Cache-present mounts render cached data without foreground loading.
2. Cache-miss mounts still foreground load.
3. Cache-bus events refresh in the background without clobbering dirty editors.
4. Listed hooks/list/detail files are lint-clean under React Hooks Compiler rules.
