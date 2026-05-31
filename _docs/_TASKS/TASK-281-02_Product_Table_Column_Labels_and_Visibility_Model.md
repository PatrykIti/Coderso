# TASK-281-02: Product Table Column Labels and Visibility Model

# FileName: TASK-281-02_Product_Table_Column_Labels_and_Visibility_Model.md

**Priority:** High
**Category:** Widgets + Commerce + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-256-01, TASK-256-02
**Status:** Done (2026-05-21)

---

## Overview

Complete the schema-owned Product Table column label and visibility model. This
leaf covers `BUG-01`, `BUG-04`, and the label part of `BF-13` from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current state: `productTableSchema` and `productTableDefaults` already include
labels for `slug`, `stock`, `compareAt`, and `collections`, but the Visual
editor exposes controls only for `title`, `price`, and `status`. Title and
price columns are always rendered.

## Scope Boundary

In scope:

- editor controls for every existing schema-owned label;
- a bounded visibility policy for title and price columns;
- a single column registry/helper used by the renderer and editor so future
  column leaves do not duplicate keys;
- backward compatibility for existing payloads where title/price remain visible
  by default.

Out of scope:

- adding new media, excerpt, action, pagination, or search columns;
- generic Clear/none token behavior;
- public sorting/search/filter behavior.

## Sub-Tasks

- [x] Define a single Product Table column metadata list for existing columns.
- [x] Add editor controls for all schema-owned labels:
  `title`, `slug`, `price`, `compareAt`, `status`, `stock`, and `collections`.
- [x] Decide and implement the guarded title/price visibility policy.
- [x] Keep legacy payloads defaulting to current visible title/price behavior.
- [x] Add renderer/editor/validator coverage for label and visibility changes.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add `showTitle` and `showPrice` only if the product UX decision accepts hiding core columns; otherwise add explicit non-hideable column metadata and editor copy. Keep labels normalized for all seven existing columns. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Render all label controls and any approved title/price visibility controls in the correct mode. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert labels normalize/render for all existing columns and legacy payloads keep current defaults. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert all label inputs are visible, editable, and normalized through `onChange`. |
| `tests/unit/widgets/validator.test.ts` | Run/update if schema fields are added. |

## Implementation Pseudocode

Column metadata:

```ts
type ProductTableColumnKey =
  | "title"
  | "slug"
  | "price"
  | "compareAt"
  | "status"
  | "stock"
  | "collections";

const productTableColumns: ProductTableColumnDefinition[] = [
  { key: "title", labelKey: "title", required: true },
  { key: "slug", labelKey: "slug", visibilityKey: "showSlug" },
  { key: "price", labelKey: "price", required: true },
  { key: "compareAt", labelKey: "compareAt", visibilityKey: "showCompareAt" },
  { key: "status", labelKey: "status", visibilityKey: "showStatus" },
  { key: "stock", labelKey: "stock", visibilityKey: "showStock" },
  { key: "collections", labelKey: "collections", visibilityKey: "showCollectionCount" },
];
```

Visibility guard if title/price become hideable:

```ts
function normalizeProductTableFields(fields: ProductTableData["fields"]) {
  const next = normalizeExistingFields(fields);
  const visibleIdentity = next.showTitle !== false || next.showSlug !== false;
  const visibleValue = next.showPrice !== false || next.showCompareAt === true;
  return {
    ...next,
    showTitle: visibleIdentity ? next.showTitle !== false : true,
    showPrice: visibleValue ? next.showPrice !== false : true,
  };
}
```

Error handling:

- Blank label inputs normalize to defaults.
- Unknown persisted fields are rejected by schema validation.
- If hiding title/price would create a table without identity or price context,
  the normalizer restores the safest default and editor copy explains why.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any new `fields` keys must be added to
  `productTableSchema` with `additionalProperties: false`.
- Anti-abuse: labels remain plain text and must not render as HTML.
- Secret handling: no secrets or privileged diagnostics in labels.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema keys change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with the final shared column label
  and guarded visibility model.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` with `BUG-01`,
  `BUG-04`, and `BF-13` evidence after implementation.
- Keep `_docs/_TASKS/README.md` synchronized with the leaf status transition.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Editors expose every existing Product Table column label that the schema
  already supports.
- Runtime table headers use the same normalized label registry as the editor.
- Title/price visibility is either intentionally supported with guardrails or
  explicitly documented as non-hideable with no misleading missing controls.
- Legacy Product Table payloads render exactly as before unless users opt into
  new visibility settings.


## Validation Evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`

## Closure Notes

- Product Table now owns a shared `productTableColumns` registry that drives
  renderer headers/cells and Visual editor controls from the same normalized
  label and visibility contract.
- `showTitle` and `showPrice` are now schema-owned toggles with guardrails:
  Product restores when Slug is also hidden, and Price restores when Compare at
  is also hidden.
- Visual mode now exposes label inputs for `title`, `slug`, `price`,
  `compareAt`, `status`, `stock`, and `collections`, closing the editor drift
  behind the Collections count header context.
