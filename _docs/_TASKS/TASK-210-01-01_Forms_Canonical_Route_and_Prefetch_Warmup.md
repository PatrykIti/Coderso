# TASK-210-01-01: Forms Canonical Route and Prefetch Warmup
# FileName: TASK-210-01-01_Forms_Canonical_Route_and_Prefetch_Warmup.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Admin Navigation
**Estimated Effort:** Small
**Dependencies:** TASK-210-01
**Status:** To Do

---

## Overview

Make the Forms list use `/admin/coderso/forms` as the active route and keep the
legacy `/admin/forms` path as an alias only. This leaf owns route/navigation
parity before cache or table changes land.

The goal is not to add another routing layer. Use the existing `adminPaths`,
`AdminLink`, and `prefetchAdminRoute` contracts.

## Sub-Tasks

- [ ] Change `FormListPage` `AdminShell.activeHref` to
  `/admin/coderso/forms`.
- [ ] Normalize touched row/editor navigation to `/coderso/forms/:id`.
- [ ] Keep `/forms/:id` working through `adminPaths` alias tests, but do not
  add new alias literals in modified list code.
- [ ] Assert `/admin/forms` and `/admin/coderso/forms` resolve to the same
  active nav item.
- [ ] Assert Forms prefetch matches `/coderso/forms` and calls
  `listFormsCached({ force: false })`.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/utils/adminPaths.ts` only if an alias regression is found.
- `core/admin/utils/adminPrefetch.ts` only if the current warmup entry is
  missing or wrong.
- `tests/vitest/admin/adminPaths.test.ts`
- `tests/vitest/admin/adminPrefetch.test.ts`
- `tests/vitest/ui/forms-pages-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI route.
- Auth model: unchanged authenticated admin UI.
- RBAC: list/detail navigation still depends on existing `forms:read` route
  permissions.
- CSRF: no writes in this leaf.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: unchanged.
- Anti-abuse: no public route or write path is added.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/ui/forms-pages-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_NAVIGATION.md` only if route wording changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `/admin/coderso/forms` is the active href used by the Forms list.
2. `/admin/forms` remains accepted only through alias normalization.
3. Row/editor links resolve to canonical Coderso Forms paths.
4. Prefetch warms `forms:list` through `listFormsCached({ force: false })`.
