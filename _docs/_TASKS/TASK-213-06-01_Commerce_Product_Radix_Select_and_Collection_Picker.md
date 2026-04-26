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

Current repo verification: collection listing is already available through
`listCommerceCollectionsCached` in `core/admin/services/commerceClient.ts`, and
the product editor already uses a checkbox collection picker pattern in
`core/admin/ui/commerce/components/CommerceCollectionsPanel.tsx`. This leaf
should reuse those seams; it must not invent a second collection client or leave
collection selection as raw CSV if the existing client works.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx`
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
- `core/admin/services/commerceClient.ts` for existing cached collection reads
  only if the selector needs a thin typed wrapper
- `core/admin/ui/commerce/components/CommerceCollectionsPanel.tsx` as the
  existing UI behavior reference for collection checkbox selection
- `core/widgets/core/commerceWidgetShared.ts`
- `core/widgets/core/productGallery.tsx`
- `core/widgets/core/productCompare.tsx`
- `core/widgets/core/productTable.tsx`
- `tests/vitest/widgets/productGallery.test.tsx`
- `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `tests/vitest/ui/commerce-widget-editor-shared.test.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `tests/vitest/widgets/productTable.test.tsx`
- `tests/vitest/ui/product-table-editor-wave.test.tsx`

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
available. The current checkout already has collection data, so this phase is
in scope unless implementation discovers a concrete route/auth blocker.

```ts
const collections = await listCommerceCollectionsCached({ force: false });
const collectionIds = normalizeCollectionIds(source.collectionIds);
toggleCollection(id) {
  updateSource({ ...source, collectionIds: toggle(collectionIds, id) });
}
```

If implementation discovers that the existing collection route cannot be used
from widget editors because of auth/RBAC/route shape, do not fake client data or
silently downgrade to CSV-only. Keep Radix control unification scoped, leave the
picker portion open, and create a physical follow-up task with the API owner,
blocker, and route/security contract.

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
  - `tests/vitest/ui/commerce-widget-editor-shared.test.tsx`
  - `tests/vitest/widgets/productCompare.test.tsx`
  - `tests/vitest/ui/product-compare-editor-wave.test.tsx`
  - `tests/vitest/widgets/productTable.test.tsx`
  - `tests/vitest/ui/product-table-editor-wave.test.tsx`
- Manual Playwright:
  - Product Gallery/Compare/Table controls visually match other widget selects;
  - collection selection does not require raw CSV typing if picker scope lands.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- affected `_docs/_WIDGETS/*` commerce docs
- `_docs/CMS_API.md` if collection picker API contract changes.

## Acceptance Criteria

1. Product widget wizard selects use shared Radix UI controls.
2. Collection selection reuses the existing commerce collection cache, is typed
   and normalized, or remains open with a physical API-owner follow-up if a real
   route/security blocker is found.
3. Stored commerce widget data remains backward-compatible.
