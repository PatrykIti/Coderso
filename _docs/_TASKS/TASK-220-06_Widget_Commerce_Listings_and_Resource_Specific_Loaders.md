# TASK-220-06: Widget, Commerce, Listings, and Resource-Specific Loaders
# FileName: TASK-220-06_Widget_Commerce_Listings_and_Resource_Specific_Loaders.md

**Priority:** High
**Category:** Admin Resources + React Hooks Compiler
**Estimated Effort:** Large
**Dependencies:** TASK-220-03, TASK-220-04
**Status:** Done (2026-04-29)

---

## Overview

Fix remaining resource-specific loader effects after the shared cache/list/form
patterns land. This subtask covers Widget library/template flows, Commerce,
Listings, Forms, Menus, Posts lists, and widget editor async loaders.

## Sub-Tasks

- [ ] TASK-220-06-01: Widget Library, Template Category, and Editor Loaders
- [ ] TASK-220-06-02: Commerce, Listings, Forms, Menus, and Posts Resource Lists
- [ ] TASK-220-06-03: Widget Hero and Navigation Editor Async Loaders

## Security Contract

- Visibility: internal admin resource surfaces.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: unchanged per resource family.
- CSRF: existing writes unchanged.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation: unchanged.
- Anti-abuse: keep visible-scope bulk actions, confirmations, and background
  refresh behavior intact.
- Secret handling: no resource cache/editor state may include secrets.

## Testing Requirements

- Resource-specific Vitest suites for touched surfaces.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo`
- `git diff --check`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache semantics or
  ownership changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Resource-specific loader findings are cleared without changing API contracts.
2. Existing list parity and bulk action behavior remains intact.
3. Widget editor async loaders do not create mount request storms.
