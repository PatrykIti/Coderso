# TASK-279-07: Product Compare Editor IA and Source Guidance

# FileName: TASK-279-07_Product_Compare_Editor_IA_and_Source_Guidance.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Editor IA
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-279-01, TASK-279-06, TASK-324, TASK-279
**Status:** To Do

---

## Overview

Apply the settled shared editor-mode policy to Product Compare and add
Product Compare-specific guidance for dense compare limits and commerce source
filters.

Source report coverage:

- UX-02: Wizard contains advanced surface color fields.
- UX-06: limit guidance does not warn when the table becomes too dense.
- UX-07: source filters have limited placeholder/help copy.

## Scope Boundary

In scope:

- Product Compare-local mode layout after re-checking the current shared
  editor-mode policy and already-landed helpers.
- Dynamic dense-compare guidance based on selected product count/limit.
- Source filter helper copy that explains search/status/collection/product IDs
  without requiring API knowledge.
- Backward-compatible shared `CommerceSourceFields` copy/prop changes only when
  the live source field owner still owns the relevant UX.

Out of scope:

- New shared editor primitives.
- Shared clear/color-picker behavior, which stays in TASK-256-02.
- Local wrappers that fork `CommerceSourceFields` behavior instead of extending
  the shared owner or splitting a dedicated shared task.
- Global source picker redesign outside Product Compare.

## Sub-Tasks

- None. This is an execution leaf.

## Current Owner Files

- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx`
- `core/widgets/core/productCompare.tsx`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `tests/vitest/ui/commerce-widget-editor-shared.test.tsx` when shared source
  field behavior changes.
- `tests/vitest/ui/product-gallery-editor-wave.test.tsx` and
  `tests/vitest/ui/product-table-editor-wave.test.tsx` when shared commerce
  editor changes affect those widgets.
- `tests/vitest/widgets/productCompare.test.tsx`
- `_docs/_WIDGETS/PRODUCT_COMPARE.md`

## Implementation Pseudocode

```tsx
function ProductCompareWizardEditor(props: WidgetEditorProps<ProductCompareData>) {
  const normalized = normalizeProductCompareData(props.value);
  const source = normalizeSourceForEditor(normalized.source, productCompareSourceDefaults);
  const dense = source.limit > 5 || (source.productIds?.length ?? 0) > 5;

  return (
    <>
      <CommerceEditorSection title="Comparison source">
        <CommerceSourceFields
          source={source}
          help={{
            search: "Matches product title or slug.",
            status: "Use Published for public-ready comparisons.",
            collectionIds: "Use collection IDs or pick products directly.",
          }}
        />
      </CommerceEditorSection>
      <Guidance tone={dense ? "warning" : "info"}>
        {dense ? "More than 5 products can be hard to compare on mobile." : "2-5 products compare best."}
      </Guidance>
    </>
  );
}

function ProductCompareVisualEditor(props: WidgetEditorProps<ProductCompareData>) {
  return (
    <>
      <AttributeRows />
      <SectionCopy />
      <SurfaceFields />
    </>
  );
}
```

Error handling:

- If the smallest correct fix still belongs to shared mode/source helpers, split
  that work into a dedicated shared task instead of duplicating behavior in
  Product Compare.
- Dense guidance must be advisory and must not silently rewrite user limits or
  selected products.
- Source help text must not reveal internal table names or provider details.

Regression shape:

- Editor wave tests prove Wizard no longer owns advanced surface controls after
  the shared policy lands.
- Editor wave tests prove dense-limit guidance changes tone/copy above the
  Product Compare readability threshold.
- Editor tests prove source help/placeholder copy resolves UX-07 while any
  shared `CommerceSourceFields` change stays explicitly covered for Product
  Compare and adjacent commerce widgets.

## Security Contract

This leaf does not add routes.

- Endpoint visibility: unchanged internal admin editing and public rendering.
- Auth/RBAC/CSRF: unchanged existing page/template/widget save protections.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: no new schema fields unless needed for editor
  display; any additions must be declared in `productCompareSchema`.
- Anti-abuse: guidance/copy must not introduce raw endpoint URLs, provider
  settings, scripts, or unbounded class names.
- Secret handling: source help must not expose private provider or query
  internals.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/commerce-widget-editor-shared.test.tsx`
  when shared source-field behavior changes.
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  and `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
  when shared commerce editor behavior affects those widgets.
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx` when
  defaults/schema affect editor output.
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed.

## Acceptance Criteria

- Product Compare Wizard stays focused on first-run source setup and guidance.
- Advanced surface/color controls are no longer exposed in Wizard once the
  current shared mode policy has been re-checked and applied locally.
- Dense compare limits warn editors before they create unreadable mobile
  tables.
- Source guidance explains current filters without exposing backend internals,
  and any shared source-field changes are either cross-widget tested or split
  into a dedicated shared follow-up instead of being hidden locally.
