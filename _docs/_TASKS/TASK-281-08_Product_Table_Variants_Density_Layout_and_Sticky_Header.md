# TASK-281-08: Product Table Variants Density Layout and Sticky Header

# FileName: TASK-281-08_Product_Table_Variants_Density_Layout_and_Sticky_Header.md

**Priority:** Medium
**Category:** Widgets + Commerce + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-281-02, TASK-281-05, TASK-256-02
**Status:** To Do

---

## Overview

Add Product Table-owned layout and table-style options for dense catalog use
cases. This leaf covers `UX-01`, `BF-05`, `BF-06`, `BF-08`, `BF-09`, `BF-10`,
`BF-12`, and the report-summary `UX-10` alias for row hover from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current state: Product Table has only the `default` variant, hardcoded cell
padding/typography, no zebra striping, no hover treatment, no sticky header, and
no Product Table-local width controls.

## Scope Boundary

In scope:

- bounded variants such as `default`, `compact`, and `striped`;
- row density tokens such as `compact`, `comfortable`, and `spacious`;
- zebra/hover/sticky-header toggles or presets;
- Product Table max-width/alignment controls if global page container is not
  enough for table readability;
- bounded typography presets for header/cell text.

Out of scope:

- raw Tailwind class input or arbitrary CSS;
- global page/container redesign;
- mobile transformation into unrelated card/kanban widgets unless a later task
  explicitly adds that variant with tests.

## Sub-Tasks

- [ ] Add bounded Product Table variant/density/style token enums.
- [ ] Render density, zebra, hover, width, typography, and sticky-header options
  through fixed maps.
- [ ] Add editor controls for the new bounded layout/style fields.
- [ ] Preserve the current default and mobile horizontal-scroll behavior.
- [ ] Add renderer/editor/registry tests for variants and style tokens.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add variant/style token enums, schema/defaults/normalizer, and renderer class maps. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Add Visual controls for variant, density, zebra/hover/sticky behavior, width, and typography presets. |
| `core/widgets/core/index.ts` | Update widget variant metadata if new variants are added. |
| `core/widgets/modulePackMatrix.ts` | Update only if Product Table readiness/completeness changes. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert variant metadata, bounded class maps, sticky/header/density output, and legacy defaults. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Assert editor controls and normalized payloads for new style tokens. |
| `tests/unit/widgets/registry.test.ts` | Run/update if variant registration changes. |

## Implementation Pseudocode

Token maps:

```ts
type ProductTableDensity = "compact" | "comfortable" | "spacious";
type ProductTableVisualVariant = "default" | "compact" | "striped";

const densityCellClassMap: Record<ProductTableDensity, string> = {
  compact: "px-2 py-1.5 text-xs",
  comfortable: "px-3 py-2 text-sm",
  spacious: "px-4 py-3 text-sm",
};

const tableWidthClassMap = {
  full: "w-full",
  readable: "mx-auto max-w-5xl",
  wide: "mx-auto max-w-7xl",
} as const;
```

Normalizer flow:

```ts
function normalizeProductTableStyle(style: ProductTableData["style"]) {
  return {
    ...normalizeExistingSurfaceStyle(style),
    density: oneOf(style?.density, ["compact", "comfortable", "spacious"], "comfortable"),
    rowTreatment: oneOf(style?.rowTreatment, ["plain", "striped", "hover"], "plain"),
    stickyHeader: style?.stickyHeader === true,
  };
}
```

Error handling:

- Unknown token values normalize to current default output.
- Sticky header must remain optional because nested scroll containers can create
  layout traps.
- Hover states must not be the only indicator for interactive rows.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: all layout/style tokens must be added to
  `productTableSchema` and reject unknown fields.
- Anti-abuse: no arbitrary classes, CSS blocks, or inline scripts.
- Secret handling: no secrets in style data or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun test tests/unit/widgets/registry.test.ts` if variant metadata changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with variants, density, width, and
  sticky header behavior.
- Update `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness changes.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` relevant UX/BF rows
  after implementation.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Product Table exposes bounded layout/style choices without raw class input.
- Compact/striped/sticky behavior is opt-in and covered by SSR/editor tests.
- Existing default Product Table output remains backward compatible.
- Mobile horizontal overflow continues to work after density/layout changes.
