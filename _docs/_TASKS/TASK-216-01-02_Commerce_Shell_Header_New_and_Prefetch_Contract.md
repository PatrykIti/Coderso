# TASK-216-01-02: Commerce Shell, Header New, and Prefetch Contract
# FileName: TASK-216-01-02_Commerce_Shell_Header_New_and_Prefetch_Contract.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + Navigation
**Estimated Effort:** Medium
**Dependencies:** TASK-216-01-01
**Status:** Done (2026-04-26)

---

## Overview

Normalize the Commerce catalog shell around the Pages list contract while
preserving Commerce-specific navigation. The header `New` action remains
product-scoped and routes to the existing product editor create mode.

## Sub-Tasks

- [x] Keep canonical active href `/admin/coderso/commerce`.
- [x] Keep header `New` action scoped to products and navigate through
  `useAdminRouter().navigate("/coderso/commerce/new")`.
- [x] Use Pages-style list density and max width (`max-w-6xl`) unless a proven
  Commerce column overflow requires a documented exception.
- [x] Preserve breadcrumbs and Coderso navigation through existing shared
  helpers.
- [x] Preserve `/commerce -> /coderso/commerce` alias handling through
  `adminPaths`.
- [x] Preserve `prefetchAdminRoute` warmup for products and collections with
  `prefetchWarmupOptions`.

## Files to Change

- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/utils/adminPrefetch.ts` only if the data requirements change.
- `core/admin/utils/adminPaths.ts` only if canonical behavior is broken.
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/admin/adminPrefetch.test.ts`
- `tests/vitest/admin/adminPaths.test.ts`

## Security Contract

- Visibility: internal admin UI.
- Auth model: unchanged.
- RBAC: `commerce:read` for screen load, `commerce:write` only after the editor
  create flow submits.
- CSRF: no writes in the list `New` navigation itself.
- Rate-limit bucket: existing `admin_read` for prefetch.
- Reject-unknown validation: unchanged.
- Anti-abuse: do not add raw anchors, `window.location`, or unbounded prefetch
  behavior.

## Pseudocode

```tsx
<PageHeader
  title="Commerce"
  description="Manage products and keep your catalog ready for runtime widgets."
  actions={
    <>
      {selectedCount > 0 ? <CommerceBulkActionsBar variant="inline" /> : null}
      <Button onClick={() => navigate("/coderso/commerce/new")}>
        <Plus className="h-4 w-4" />
        New
      </Button>
    </>
  }
/>
```

## Testing Requirements

- Header shows compact `New` and routes through admin router to
  `/coderso/commerce/new`.
- Active route remains `/admin/coderso/commerce`.
- `/admin/commerce` still resolves to `/admin/coderso/commerce`.
- Prefetch still warms products and collections with `{ force: false }`.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/ADMIN_CACHE_MAP.md` if prefetch wording changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Commerce uses the shared admin navigation and prefetch contract.
2. `New` remains product create navigation, not a new list drawer.
3. No raw route or alias logic is duplicated in the screen.

## Closure Evidence

- Completed on 2026-04-26 as part of TASK-216 Commerce catalog list parity.
- Validation: `bun --cwd core lint`, `bun --cwd core lint:types`, targeted Vitest Commerce UI/admin/pagination/toast/prefetch suites, `bun test tests/integration/routes/commerceRoutes.test.ts` outside sandbox with repo env, and Commerce runtime smoke tests outside sandbox with repo env.
- Gate note: `bun run gates:coderso` was attempted and remains blocked by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*`; current matching UI suites live under `tests/vitest/ui/*`.
