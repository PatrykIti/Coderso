# TASK-216-02-02: Product Table Selection and Commerce Columns
# FileName: TASK-216-02-02_Product_Table_Selection_and_Commerce_Columns.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-216-02-01
**Status:** To Do

---

## Overview

Upgrade `CommerceTable` to a controlled Pages-style table with checkbox
selection, selected-row styling, Commerce summary columns, and controlled row
actions.

## Sub-Tasks

- [ ] Add select-all checkbox for visible products.
- [ ] Add per-row checkbox with accessible `Select <title>` labels.
- [ ] Apply selected-row styling consistent with Pages.
- [ ] Preserve product title `AdminLink` to
  `/coderso/commerce/:id` with `prefetch`.
- [ ] Preserve status, price, stock, and updated columns.
- [ ] Add collection summary column using the view-model labels from
  TASK-216-02-01.
- [ ] Move row action execution out of the table. The table should call
  callbacks; the shell owns mutations and feedback.

## Files to Change

- `core/admin/ui/commerce/CommerceTable.tsx`
- `core/admin/ui/commerce/CommerceRowActions.tsx` if extracted.
- `core/admin/ui/commerce/CommerceListPage.tsx`
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/commerce-list-page-wave.test.tsx` if added.

## Security Contract

- Visibility: internal admin UI.
- Auth model: unchanged.
- RBAC: `commerce:read` for table rendering; mutation callbacks are handled by
  later row/bulk leaves.
- CSRF: no writes in table rendering.
- Rate-limit bucket: no new server request.
- Reject-unknown validation: table renders normalized client records only.
- Anti-abuse: collection/missing labels and product text must remain bounded UI
  copy and must not expose raw metadata/data payloads.

## Pseudocode

```tsx
<TableHead className="w-10 pl-4">
  <Checkbox
    aria-label="Select all products"
    checked={isIndeterminate ? "indeterminate" : isAllSelected}
    onCheckedChange={onToggleAll}
  />
</TableHead>
{rows.map((row) => (
  <TableRow key={row.product.id} className={selectedIds.includes(row.product.id) ? "bg-muted/30" : undefined}>
    <TableCell>
      <Checkbox
        aria-label={`Select ${row.product.title}`}
        checked={selectedIds.includes(row.product.id)}
        onCheckedChange={() => onToggleProduct(row.product.id)}
      />
    </TableCell>
  </TableRow>
))}
```

## Testing Requirements

- Select-all controls visible products only.
- Per-row checkboxes toggle product ids.
- Table row link uses canonical `AdminLink` with prefetch.
- Collection labels render from cached collection records.
- Missing collection ids render bounded fallback copy.
- Empty table copy remains useful for both empty catalog and filtered-empty
  states.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The product table is controlled and selection-aware.
2. Product summary columns remain Commerce-specific.
3. Row action callbacks are owned by the shell, not by the table.
