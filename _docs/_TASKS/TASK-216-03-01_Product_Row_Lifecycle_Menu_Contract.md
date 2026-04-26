# TASK-216-03-01: Product Row Lifecycle Menu Contract
# FileName: TASK-216-03-01_Product_Row_Lifecycle_Menu_Contract.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-216-03
**Status:** Done (2026-04-26)

---

## Overview

Create a controlled Commerce row action menu that exposes product-safe
lifecycle actions without adding unsupported Commerce features.

## Sub-Tasks

- [x] Keep Edit as the first action and route through the admin router or
  `AdminLink`.
- [x] Show Publish when `status !== "published"`.
- [x] Show Move to draft when `status === "published" || status === "archived"`.
- [x] Show Archive when `status !== "archived"`.
- [x] Show Delete as destructive and delegate confirmation to the shell.
- [x] Map shell-owned Publish, Move to draft, and Archive callbacks to
  `updateCommerceProduct(id, { status })`.
- [x] Refresh products with `{ force: true, background: true }` after
  successful lifecycle mutations.
- [x] Create or reuse the base Commerce list toast adapter for row lifecycle
  success/error feedback; TASK-216-04-03 can extend the same owner for bulk
  summaries and route-error coverage.
- [x] Do not add Duplicate, storefront preview, copy ID, checkout, or collection
  actions in this task.

## Files to Change

- `core/admin/ui/commerce/CommerceTable.tsx`
- `core/admin/ui/commerce/CommerceRowActions.tsx` if extracted.
- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/ui/commerce/commerceActionToasts.ts` if extracted.
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/commerce-list-page-wave.test.tsx` if added.

## Security Contract

- Visibility: internal admin UI.
- Auth model: unchanged.
- RBAC: row lifecycle callbacks require `commerce:write` when they execute.
- CSRF: lifecycle writes continue through `updateCommerceProduct`.
- Rate-limit bucket: existing `admin_write` when callbacks execute.
- Reject-unknown validation: callbacks send only `status` patches using
  `draft | published | archived`.
- Anti-abuse: action labels must not expose raw product metadata/data payloads.

## Pseudocode

```tsx
<DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
{status !== "published" ? (
  <DropdownMenuItem onClick={onPublish}>Publish</DropdownMenuItem>
) : null}
{status !== "draft" ? (
  <DropdownMenuItem onClick={onMoveToDraft}>Move to draft</DropdownMenuItem>
) : null}
{status !== "archived" ? (
  <DropdownMenuItem onClick={onArchive}>Archive</DropdownMenuItem>
) : null}
<DropdownMenuItem variant="destructive" onClick={onRequestDelete}>
  Delete
</DropdownMenuItem>
```

## Testing Requirements

- Draft products show Publish, Archive, Delete, and Edit.
- Published products show Move to draft, Archive, Delete, and Edit.
- Archived products show Publish, Move to draft, Delete, and Edit.
- Lifecycle callbacks pass the product id to the shell and the shell sends only
  the expected `status` patch.
- Lifecycle success/error feedback comes from the Commerce list toast owner.
- No unsupported duplicate/preview/copy actions appear.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Product row actions match the current Commerce lifecycle.
2. Unsupported actions remain explicit non-goals.
3. Mutation execution stays in the list shell.

## Closure Evidence

- Completed on 2026-04-26 as part of TASK-216 Commerce catalog list parity.
- Validation: `bun --cwd core lint`, `bun --cwd core lint:types`, targeted Vitest Commerce UI/admin/pagination/toast/prefetch suites, `bun test tests/integration/routes/commerceRoutes.test.ts` outside sandbox with repo env, and Commerce runtime smoke tests outside sandbox with repo env.
- Gate note: `bun run gates:coderso` was attempted and remains blocked by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*`; current matching UI suites live under `tests/vitest/ui/*`.
