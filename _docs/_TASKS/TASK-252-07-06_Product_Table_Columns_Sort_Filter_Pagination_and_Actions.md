# TASK-252-07-06: Product Table Columns Sort Filter Pagination and Actions

# FileName: TASK-252-07-06_Product_Table_Columns_Sort_Filter_Pagination_and_Actions.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Add product-table column, sort/filter, pagination, image column, and action column controls while keeping bulk selection as an admin-only pattern.

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

- Keep: columns, sort/filter, pagination, image/action columns.
- Adapt: column presets and product field visibility through commerce resolver fields.
- Reject: bulk selection and admin table actions in public widget output.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `product-table`.
- `Visual`: `Source`, `Columns`, `Sort and filters`, `Pagination`, `Actions`.
- `Advanced`: `Commerce diagnostics`, `Column mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/productTable.tsx`
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
- `_docs/_TASKS/TASK-252-07-06_Product_Table_Columns_Sort_Filter_Pagination_and_Actions.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeProductTableData(raw: unknown): ProductTableData {
  return {
    source: normalizeWidgetSource(raw.source),
    display: normalizeDisplayOptions(raw.display),
    copy: normalizeStateCopy(raw.copy),
  };
}

function ProductTableVisualEditor(props: WidgetEditorProps<ProductTableData>) {
  return (
    <WidgetEditorSection id="product-table.source" title="Source">
      <WidgetControlRow id="product-table.source.type" label="Source">
        <Select value={props.value.source?.type} onValueChange={...} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/product-table/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/productTable.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
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
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
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
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-06_Product_Table_Columns_Sort_Filter_Pagination_and_Actions.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `product-table` editor exposes research-backed source/display/state controls with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
