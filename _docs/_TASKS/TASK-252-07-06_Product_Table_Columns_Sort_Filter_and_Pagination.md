# TASK-252-07-06: Product Table Columns Sort Filter and Pagination

# FileName: TASK-252-07-06_Product_Table_Columns_Sort_Filter_and_Pagination.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** Done
**Started:** 2026-05-12
**Completed:** 2026-05-12

---

## Overview

Add product-table column visibility/labels, allowlisted sort/filter controls,
pagination, and empty-state handling while keeping image/action columns and
bulk selection outside required scope.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/product-table/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/product-table/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/product-table/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: stable column visibility/labels plus allowlisted sort/filter/limit
  controls from `_docs/_WIDGETS/tmp/product-table/MATRIX.md`; start from the
  current owner fields `source`, `fields`, `labels`, `emptyState`, `style`, and
  `resolved`.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat image/action columns and richer client-side affordances as conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `product-table`.
- `Visual`: `Source`, `Columns`, `Sort and filters`, `Pagination`, `Empty state`.
- `Advanced`: `Commerce diagnostics`, `Column mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/productTable.tsx`
- `core/widgets/core/commerceWidgetShared.ts` when source sorting/filter/
  pagination fields extend the shared commerce widget source contract.
- `core/services/commerce/commerceQueryService.ts` when runtime product query
  normalization needs new allowlisted sort/filter/pagination fields.
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/productTable.test.tsx`
- `tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `tests/vitest/ui/product-table-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/PRODUCT_TABLE.md`
- `_docs/_WIDGETS/tmp/product-table/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-06_Product_Table_Columns_Sort_Filter_and_Pagination.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## New Files to Create

- `_docs/_WIDGETS/PRODUCT_TABLE.md`

## Implementation Pseudocode

```tsx
function normalizeProductTableData(data: ProductTableData): ProductTableData {
  return {
    source: normalizeCommerceWidgetSource(data.source, {
      limit: productTableDefaults.source?.limit ?? 12,
      sortField: "updatedAt",
      sortDir: "desc",
    }),
    fields: normalizeProductTableFields(data.fields),
    labels: normalizeProductTableLabels(data.labels),
    emptyState: normalizeProductTableEmptyState(data.emptyState),
    style: normalizeProductTableStyle(data.style),
    resolved: normalizeProductTableResolved(data.resolved),
  };
}

function ProductTableVisualEditor(props: WidgetEditorProps<ProductTableData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="product-table.source" title="Table source">
      <WidgetControlRow id="product-table.source.limit" label="Rows per page" data-widget-control="product-table.source.limit">
        <NumberInput value={value.source?.limit ?? 12} onChange={(limit) => props.onChange(updateProductTableSource(value, { limit }))} />
      </WidgetControlRow>
      <WidgetControlRow id="product-table.source.sortField" label="Sort field" data-widget-control="product-table.source.sortField">
        <Select value={value.source?.sortField ?? "updatedAt"} onChange={(sortField) => props.onChange(updateProductTableSource(value, { sortField }))} />
      </WidgetControlRow>
      <WidgetControlRow id="product-table.source.sortDir" label="Sort direction" data-widget-control="product-table.source.sortDir">
        <SegmentedControl value={value.source?.sortDir ?? "desc"} onChange={(sortDir) => props.onChange(updateProductTableSource(value, { sortDir }))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/product-table/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/productTable.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Keep column visibility/labels local to `productTable.tsx`, but route any
  source-level sorting, filtering, or pagination fields through the shared
  commerce query owners (`commerceWidgetShared.ts` and
  `commerceQueryService.ts`) instead of inventing a widget-local query shape.
- Use existing shared source fields first: `source.limit`, `source.search`,
  `source.collectionIds`, `source.status`, `source.sortField`, and
  `source.sortDir`. Treat a separate pagination display mode as deferred Adapt
  scope unless the same implementation extends `CommerceWidgetSource`,
  `NormalizedCommerceWidgetSource`, and `buildCommerceWidgetQueryInput` before
  adding editor controls.
- Refactor `core/admin/ui/widgets/editors/ProductTableEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `product-table` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `product-table` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/productTable.tsx`.
- Anti-abuse:
  - limits and sort/filter values must stay clamped
  - bulk mutation actions are not allowed in the public widget

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceQueryService.test.ts` when shared
  commerce query sorting/filter/pagination normalization changes.
- Add regressions proving product-table editor controls write through
  `source.*` and `buildCommerceWidgetQueryInput`, not widget-local
  `sorting`/`filters`/`pagination` objects.
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/PRODUCT_TABLE.md`
- `_docs/_WIDGETS/README.md` with a `PRODUCT_TABLE.md` entry before leaf
  completion.
- `_docs/_TASKS/TASK-252-07-06_Product_Table_Columns_Sort_Filter_and_Pagination.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `_docs/_WIDGETS/README.md` includes the `PRODUCT_TABLE.md` entry before this
  leaf is marked `Done`.
- `product-table` editor exposes the research-backed controls named in this leaf with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
