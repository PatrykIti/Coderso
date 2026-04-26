# TASK-216-04: Commerce Bulk Actions, Toasts, and Error Mapping
# FileName: TASK-216-04_Commerce_Bulk_Actions_Toasts_and_Error_Mapping.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + Error Handling
**Estimated Effort:** Large
**Dependencies:** TASK-216-02, TASK-216-03, TASK-208
**Status:** To Do

---

## Overview

Add Pages-style Commerce bulk actions, shared action toasts, and stable
route-error coverage for list-visible product lifecycle/delete failures.

## Sub-Tasks

- [ ] TASK-216-04-01: Product Bulk Action Bar and Visible Selection
- [ ] TASK-216-04-02: Bulk Mutation Execution and Partial Failures
- [ ] TASK-216-04-03: Commerce List Toast Adapter and Route Error Mapping

## Security Contract

- Visibility: internal Commerce admin UI and existing product API.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: `commerce:write` for product lifecycle/delete mutations.
- CSRF: all writes continue through `commerceClient` helpers with
  `withCsrf: true`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: bulk status updates send only allowed
  `draft | published | archived` status patches.
- Anti-abuse: selected ids must come from visible rows; destructive bulk delete
  requires confirmation; error copy must be bounded.

## Testing Requirements

- Bulk action bar appears only when products are selected.
- Publish, move to draft, archive, and delete operate on visible selected ids.
- Bulk delete opens confirmation before mutation.
- Partial failures emit toast and inline feedback and keep failed ids selected
  or otherwise recoverable.
- Route mapper coverage includes list-visible known Commerce errors.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts tests/vitest/admin/commerceClient.test.ts`
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/commerceRoutes.test.ts` if route mapping changes.
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_API.md` if route error behavior changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Commerce bulk actions match Pages ergonomics while using Commerce product
   lifecycle semantics.
2. Toast and inline feedback has one owner.
3. Known UI-visible Commerce errors are machine-readable and covered.
