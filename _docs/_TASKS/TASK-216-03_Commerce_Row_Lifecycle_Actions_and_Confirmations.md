# TASK-216-03: Commerce Row Lifecycle Actions and Confirmations
# FileName: TASK-216-03_Commerce_Row_Lifecycle_Actions_and_Confirmations.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + Safety
**Estimated Effort:** Large
**Dependencies:** TASK-216-02, TASK-208
**Status:** Done (2026-04-26)

---

## Overview

Replace the current immediate Commerce row delete with Pages-style controlled
row lifecycle actions and confirmed destructive flow.

## Sub-Tasks

- [x] TASK-216-03-01: Product Row Lifecycle Menu Contract
- [x] TASK-216-03-02: Product Delete Confirmation Contract

## Security Contract

- Visibility: internal Commerce admin UI and existing product API.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: `commerce:write` for lifecycle and delete mutations.
- CSRF: all writes continue through `commerceClient` helpers with
  `withCsrf: true`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: row actions send only allowed status patches or
  delete requests to existing route schemas.
- Anti-abuse: destructive delete requires explicit confirmation and bounded
  user-facing copy.

## Testing Requirements

- Row menu exposes actions valid for the product status.
- Publish/draft/archive actions call `updateCommerceProduct` with only
  `{ status }`.
- Delete opens `ConfirmActionDialog` and does not mutate until confirmed.
- Success and failure states stay recoverable.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/commerceClient.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Row lifecycle actions are status-aware and Commerce-specific.
2. Row delete cannot execute without confirmation.
3. Product editor, API, and cache contracts remain backward compatible.

## Closure Evidence

- Completed on 2026-04-26 as part of TASK-216 Commerce catalog list parity.
- Validation: `bun --cwd core lint`, `bun --cwd core lint:types`, targeted Vitest Commerce UI/admin/pagination/toast/prefetch suites, `bun test tests/integration/routes/commerceRoutes.test.ts` outside sandbox with repo env, and Commerce runtime smoke tests outside sandbox with repo env.
- Gate note: `bun run gates:coderso` was attempted and remains blocked by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*`; current matching UI suites live under `tests/vitest/ui/*`.
