# TASK-281-08: Product Table Variants Density Layout and Sticky Header

# FileName: TASK-281-08_Product_Table_Variants_Density_Layout_and_Sticky_Header.md

**Priority:** Medium
**Category:** Widgets + Commerce + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-281, TASK-281-02, TASK-281-05, TASK-281-07
**Status:** Done (2026-05-22)

---

## Overview

Add Product Table-owned layout and table-style options for dense catalog use
cases. This leaf covers `UX-01`, `BF-05`, `BF-06`, `BF-08`, `BF-09`, `BF-10`,
`BF-12`, and the report-summary `UX-10` alias for row hover from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

Current state: Product Table still has only the `default` variant, hardcoded
cell padding/typography, no zebra striping controls, no general row-hover
controls, no sticky header, and no Product Table-local width/alignment
controls. The widget already has a bounded interactive hover cue when a real
safe product link is active; this leaf must extend presentation options without
regressing that `TASK-281-04` behavior.

## Scope Boundary

In scope:

- bounded variants such as `default` and `compact`;
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

- [x] Add bounded Product Table variant and style token enums with non-overlapping ownership.
- [x] Render density, zebra, hover, width, typography, and sticky-header options
  through fixed maps.
- [x] Add editor controls for the new bounded layout/style fields.
- [x] Preserve the current default and mobile horizontal-scroll behavior.
- [x] Add renderer/editor/registry tests for variants and style tokens.

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
type ProductTableVariantId = "default" | "compact";
type ProductTableDensity = "compact" | "comfortable" | "spacious";
type ProductTableRowTreatment = "plain" | "striped";
type ProductTableTypography = "compact" | "balanced" | "prominent";
type ProductTableMaxWidth = "full" | "content" | "wide";
type ProductTableAlign = "left" | "center";

const densityCellClassMap: Record<ProductTableDensity, string> = {
  compact: "px-2 py-1.5 text-xs",
  comfortable: "px-3 py-2 text-sm",
  spacious: "px-4 py-3 text-sm",
};

const tableWidthClassMap: Record<ProductTableMaxWidth, string> = {
  full: "max-w-none",
  content: "max-w-5xl",
  wide: "max-w-7xl",
};

const tableAlignClassMap: Record<ProductTableAlign, string> = {
  left: "mr-auto",
  center: "mx-auto",
};
```

Normalizer flow:

```ts
function normalizeProductTableStyle(style: ProductTableData["style"]) {
  return {
    ...normalizeExistingSurfaceStyle(style),
    density: oneOf(style?.density, ["compact", "comfortable", "spacious"], "comfortable"),
    rowTreatment: oneOf(style?.rowTreatment, ["plain", "striped"], "plain"),
    hoverRows: style?.hoverRows === true,
    stickyHeader: style?.stickyHeader === true,
    maxWidth: oneOf(style?.maxWidth, ["full", "content", "wide"], "full"),
    align: oneOf(style?.align, ["left", "center"], "left"),
    typography: oneOf(style?.typography, ["compact", "balanced", "prominent"], "balanced"),
  };
}
```

Error handling:

- Unknown token values normalize to current default output.
- Sticky header must remain optional because nested scroll containers can create
  layout traps.
- Hover states must not be the only indicator for interactive rows.
- Widget variant stays a preset axis. Zebra and hover stay independent style
  fields so hover, density, and striping can compose instead of clobbering one
  another.

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

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` with the final variant list, density,
  zebra, hover, typography, width/alignment, sticky-header behavior, and the
  normalized style contract.
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
