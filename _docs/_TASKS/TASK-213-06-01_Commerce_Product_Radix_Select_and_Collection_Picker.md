# TASK-213-06-01: Commerce Product Radix Select and Collection Picker
# FileName: TASK-213-06-01_Commerce_Product_Radix_Select_and_Collection_Picker.md

**Priority:** Medium
**Category:** Commerce Widgets + Admin/UI + Widget Editors
**Estimated Effort:** Large
**Dependencies:** TASK-213-06
**Status:** To Do

---

## Overview

Fix the Product Gallery/Product Compare/Product Table editor inconsistency from
the widget audit.

These widgets use native `<select>` controls and raw collection ID/CSV fields in
places where the rest of the widget editor surface uses shared Radix Select
controls and picker-style inputs. The goal is control consistency first, then a
typed collection picker that still persists through the existing normalized
commerce widget source contract.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx`
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
- `core/widgets/core/commerceWidgetShared.ts`
- `core/widgets/core/productGallery.tsx`
- `core/widgets/core/productCompare.tsx`
- `core/widgets/core/productTable.tsx`
- commerce/listing client modules only if an existing collection-list client is
  missing
- `tests/vitest/widgets/productGallery.test.tsx`
- `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/vitest/widgets/productTable.test.tsx`
- new focused UI wave tests for Product Compare/Table if current coverage does
  not exercise editor controls.

## Implementation Direction

Phase 1: replace native selects with shared Select wrappers without changing
stored data.

Pseudocode:

```tsx
<WidgetSelectField
  label="Columns"
  value={normalized.style?.columns ?? "3"}
  options={[
    { value: "2", label: "2 columns" },
    { value: "3", label: "3 columns" },
    { value: "4", label: "4 columns" },
  ]}
  onChange={(columns) => update({ style: { ...style, columns } })}
/>
```

Phase 2: replace CSV collection IDs with a typed picker when collection data is
available.

```ts
const collectionIds = normalizeCollectionIds(source.collectionIds);
toggleCollection(id) {
  updateSource({ ...source, collectionIds: toggle(collectionIds, id) });
}
```

If a collection-list API is not available, keep this leaf limited to Radix
control unification and create a follow-up task for the API-backed picker rather
than inventing fake client data.

## Security Contract

- Visibility: internal admin widget editors plus public commerce widget
  rendering.
- Auth model: existing admin session/API-key collection/product reads.
- RBAC: existing commerce read permission for picker data.
- CSRF: no write route changes unless a collection picker creates resources.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation:
  - picker output must normalize to existing `source.collectionIds` or an
    explicitly schema-added field;
  - arbitrary CSV strings should not bypass normalization.
- Anti-abuse:
  - do not expose private product payloads or internal collection metadata in
    widget data;
  - public runtime hydration must still resolve data server-side through current
    commerce runtime services.

## Testing Requirements

- Product widget tests prove:
  - no native `<select>` remains in the audited wizard controls;
  - source normalization clamps limit/sort/collection ids;
  - picker toggles produce deterministic arrays.
- Targeted suites:
  - `tests/vitest/widgets/productGallery.test.tsx`
  - `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  - `tests/vitest/widgets/productCompare.test.tsx`
  - `tests/vitest/widgets/productTable.test.tsx`
- Manual Playwright:
  - Product Gallery/Compare/Table controls visually match other widget selects;
  - collection selection does not require raw CSV typing if picker scope lands.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- affected `_docs/_WIDGETS/*` commerce docs
- `_docs/CMS_API.md` if collection picker API contract changes.

## Acceptance Criteria

1. Product widget wizard selects use shared Radix UI controls.
2. Collection selection is typed and normalized, or explicitly deferred with an
   API-owner follow-up.
3. Stored commerce widget data remains backward-compatible.
