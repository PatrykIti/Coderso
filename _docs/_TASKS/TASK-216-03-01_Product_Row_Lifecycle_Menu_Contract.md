# TASK-216-03-01: Product Row Lifecycle Menu Contract
# FileName: TASK-216-03-01_Product_Row_Lifecycle_Menu_Contract.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-216-03
**Status:** To Do

---

## Overview

Create a controlled Commerce row action menu that exposes product-safe
lifecycle actions without adding unsupported Commerce features.

## Sub-Tasks

- [ ] Keep Edit as the first action and route through the admin router or
  `AdminLink`.
- [ ] Show Publish when `status !== "published"`.
- [ ] Show Move to draft when `status === "published" || status === "archived"`.
- [ ] Show Archive when `status !== "archived"`.
- [ ] Show Delete as destructive and delegate confirmation to the shell.
- [ ] Do not add Duplicate, storefront preview, copy ID, checkout, or collection
  actions in this task.

## Files to Change

- `core/admin/ui/commerce/CommerceTable.tsx`
- `core/admin/ui/commerce/CommerceRowActions.tsx` if extracted.
- `core/admin/ui/commerce/CommerceListPage.tsx`
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
- Lifecycle callbacks pass the product id to the shell.
- No unsupported duplicate/preview/copy actions appear.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Product row actions match the current Commerce lifecycle.
2. Unsupported actions remain explicit non-goals.
3. Mutation execution stays in the list shell.
