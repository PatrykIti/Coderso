# TASK-279-04: Product Compare Featured Column and Responsive Layouts

# FileName: TASK-279-04_Product_Compare_Featured_Column_and_Responsive_Layouts.md

**Priority:** Medium
**Category:** Widgets + Commerce + Runtime Render + Responsive UX
**Estimated Effort:** Large
**Dependencies:** TASK-279-01, TASK-279-02, TASK-279-03, TASK-279
**Status:** To Do

---

## Overview

Add Product Compare-only layout and merchandising options after the source,
attribute, media, and link contracts are stable.

Source report coverage:

- BF-06: no featured/recommended product column.
- BF-08: only one `matrix` layout variant exists.
- BF-12: no sticky header for dense/mobile compare tables.

## Scope Boundary

In scope:

- Bounded featured product/highlight model.
- Responsive compare variants that preserve the same normalized product/row
  data contract.
- Sticky header/pinned context behavior that remains keyboard accessible.

Out of scope:

- Generic editable tables.
- Arbitrary CSS class strings or raw layout code.
- Global table component extraction unless a separate shared task owns it.

## Sub-Tasks

- None. This is an execution leaf.

## Current Owner Files

- `core/widgets/core/productCompare.tsx`
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx` when registry/public rendering
  output changes.
- `tests/unit/widgets/registry.test.ts` when variants are registered.
- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/WIDGET_PACK_MATRIX.md` when pack completeness changes.

## Implementation Pseudocode

```ts
type ProductCompareVariantId = "matrix" | "cards" | "compact";

type ProductCompareLayout = {
  featuredProductId?: string;
  stickyHeader?: boolean;
  density?: "comfortable" | "compact";
};

function normalizeFeaturedProductId(value: unknown) {
  const candidate = toText(value);
  return candidate.length > 0 ? candidate : "";
}

function resolveFeaturedProductId(
  candidate: string,
  rows: CommerceWidgetRuntimeCompareRow[]
) {
  if (!candidate) return "";
  return rows.some((row) => row.id === candidate) ? candidate : "";
}

function ProductCompareBlock({ data, variant }: Props) {
  const normalized = normalizeProductCompareData(data);
  const rows = normalized.resolved?.rows ?? [];
  const featuredProductId = resolveFeaturedProductId(
    normalized.layout?.featuredProductId ?? "",
    rows
  );
  if (variant === "cards") return <ProductCompareCards data={normalized} />;
  return (
    <ScrollableCompareTable
      rows={rows}
      stickyHeader={normalized.layout?.stickyHeader === true}
      featuredProductId={featuredProductId}
      density={normalized.layout?.density ?? "comfortable"}
    />
  );
}
```

Error handling:

- Unknown variants fall back to `matrix`.
- Empty featured product ID renders no highlighted column.
- Unknown-but-nonempty featured product IDs are preserved in normalized widget
  data because admin canvas can have empty `resolved.rows`; highlight rendering
  only activates after runtime resolution confirms a matching row.
- Sticky header must disable gracefully in layouts where it harms mobile or
  keyboard navigation.

Regression shape:

- Renderer tests prove variants render from the same normalized rows.
- Renderer tests prove at least one new non-`matrix` variant ships with the
  same normalized row contract instead of leaving `BF-08` unresolved by prose.
- Accessibility tests in the renderer suite prove sticky/scroll containers keep
  `tabindex`, caption, scope, and visible product context.
- Editor wave tests prove variant previews, featured product selection, and
  density/sticky controls are bounded and do not overwrite selected products.
- Normalizer tests prove a configured featured product ID is not dropped just
  because admin preview has not resolved rows yet.

## Security Contract

This leaf does not add routes.

- Endpoint visibility: unchanged public read-only rendering and internal admin
  editing.
- Auth/RBAC/CSRF: unchanged existing widget save protections.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: variants, density, sticky, and featured product
  values must be enum/string-bounded in the schema.
- Anti-abuse: no arbitrary class names, style objects, raw HTML, or scripts in
  layout options.
- Secret handling: layout fields contain no provider or private product data.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when public
  renderer integration changes.
- `bun test tests/unit/widgets/registry.test.ts` when variant registration
  changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema changes.
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/WIDGET_PACK_MATRIX.md` if Product Compare readiness changes.
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed.

## Acceptance Criteria

- Product Compare can highlight one bounded featured product without breaking
  legacy data.
- At least one new supported non-`matrix` Product Compare layout variant lands,
  is registered, documented, editor-visible, rendered, and covered by tests;
  otherwise this leaf stays open with an explicit blocker/defer note.
- Sticky header/context behavior is responsive and keyboard-accessible.
- No layout option accepts raw class names or arbitrary style payloads.
