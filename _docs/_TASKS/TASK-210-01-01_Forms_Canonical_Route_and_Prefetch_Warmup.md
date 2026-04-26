# TASK-210-01-01: Forms Canonical Route and Prefetch Warmup
# FileName: TASK-210-01-01_Forms_Canonical_Route_and_Prefetch_Warmup.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + Admin Navigation
**Estimated Effort:** Small
**Dependencies:** TASK-210-01
**Status:** Done (2026-04-26)

---

## Overview

Make the Forms list use `/admin/coderso/forms` as the active route and keep the
legacy `/admin/forms` path as an alias only. This leaf owns route/navigation
parity before cache or table changes land.

The goal is not to add another routing layer. Use the existing `adminPaths`,
`AdminLink`, and `prefetchAdminRoute` contracts.

## Sub-Tasks

- [x] Change `FormListPage` `AdminShell.activeHref` to
  `/admin/coderso/forms`.
- [x] Normalize touched row/editor navigation to `/coderso/forms/:id`.
- [x] Normalize touched action-log navigation to
  `/coderso/forms/:id/action-runs`.
- [x] Normalize `FormBuilderPage` and `FormActionLogsPage` route-shell literals
  from legacy `/admin/forms` / `/forms/*` patterns to canonical
  `/admin/coderso/forms` / `/coderso/forms/*` equivalents where they affect
  active hrefs, back links, or action-log navigation.
- [x] Keep `/forms/:id` working through `adminPaths` alias tests, but do not
  add new alias literals in modified list code.
- [x] Assert `/admin/forms` and `/admin/coderso/forms` resolve to the same
  active nav item.
- [x] Assert Forms prefetch matches `/coderso/forms` and calls
  `listFormsCached({ force: false })`.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/forms/FormTable.tsx`
- `core/admin/ui/forms/FormBuilderPage.tsx` for route-shell-only action-log
  navigation and active href cleanup.
- `core/admin/ui/forms/FormActionLogsPage.tsx` for route-shell-only back-to-form
  navigation and active href cleanup.
- `core/admin/utils/adminPaths.ts` only if an alias regression is found.
- `core/admin/utils/adminPrefetch.ts` only if the current warmup entry is
  missing or wrong.
- `tests/vitest/admin/adminPaths.test.ts`
- `tests/vitest/admin/adminPrefetch.test.ts`
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/forms-component-wave.test.tsx` if canonical links are
  normalized inside `FormTable`.
- `tests/vitest/ui-integration/forms.test.tsx`

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

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_NAVIGATION.md` only if route wording changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. `/admin/coderso/forms` is the active href used by the Forms list.
2. `/admin/forms` remains accepted only through alias normalization.
3. Row/editor/action-log links resolve to canonical Coderso Forms paths.
4. Prefetch warms `forms:list` through `listFormsCached({ force: false })`.
5. Builder/action-log route-shell cleanup does not change builder save, preview,
   fields, automation, or runtime behavior.

## Completion Notes (2026-04-26)

- Implemented in branch `task/TASK-210-forms-list-parity` with Forms list parity scoped to the refined TASK-210 contract.
- Validation:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/userSettingsClient.test.ts` - PASS (9 files, 48 tests).
  - `bun --cwd core lint` - PASS.
  - `bun --cwd core lint:types` - PASS.
  - `set -a && source ../Nextless/.env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts tests/unit/forms/submissionService.test.ts tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts` - PASS (20 tests; run outside sandbox for DB/env access).
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts` - PASS (2 files, 14 tests).
  - `set -a && source ../Nextless/.env && set +a && bun run gates:coderso` - BLOCKED after Core lint and Core typecheck passed; the gate script still points Functional UI smoke at absent `tests/unit/ui/*` files while current UI suites live under `tests/vitest/ui/*`.
- Scope notes: TASK-210 closes the Forms list/create-drawer/cache/toast/error-mapping/docs contract. Runtime preview, editor, duplicate, embed-code, and global dialog-wrapper follow-ups remain outside TASK-210 unless covered by a separate task.
