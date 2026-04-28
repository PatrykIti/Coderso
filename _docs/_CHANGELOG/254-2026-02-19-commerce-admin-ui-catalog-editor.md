# 254 - Commerce Admin UI Catalog and Editor

- **Date:** 2026-02-19
- **Version:** 0.1.254
- **Tasks:** TASK-054-11, TASK-054-11-05, TASK-054-11-05-01, TASK-054-11-05-02, TASK-054-11-05-03, TASK-054-11-05-04

## Key Changes

### Commerce Admin Client and Cache
- Added typed admin commerce client for products and collections.
- Added cache policy keys, local cache hydration, and cache invalidation flow for commerce datasets.
- Added commerce route prefetch and canonical path alias support.
- Files:
  - `core/admin/services/commerceClient.ts`
  - `core/admin/services/cachePolicy.ts`
  - `core/admin/utils/adminPrefetch.ts`
  - `core/admin/utils/adminPaths.ts`

### Commerce List and Editor UI
- Added Coderso commerce list page with table-first workflow and product title navigation to editor.
- Added commerce editor page with modular sections for identity, pricing, stock, publish status, and collection assignment.
- Added responsive side-panel behavior for desktop/mobile consistency.
- Files:
  - `core/admin/ui/commerce/CommerceListPage.tsx`
  - `core/admin/ui/commerce/CommerceTable.tsx`
  - `core/admin/ui/commerce/CommerceEditorPage.tsx`
  - `core/admin/ui/commerce/components/*`
  - `core/admin/ui/commerce/hooks/useCommerceCatalog.ts`
  - `core/admin/ui/commerce/commerceEditorModel.ts`
  - `core/admin/app/AdminApp.tsx`
  - `core/admin/ui/navigation/codersoModules.ts`

### Tests
- Added/updated tests for commerce client, route alias/prefetch, navigation, and list/editor rendering:
  - `tests/unit/admin/commerceClient.test.ts`
  - `tests/unit/admin/adminPaths.test.ts`
  - `tests/unit/admin/adminPrefetch.test.ts`
  - `tests/unit/ui/commerce-page.test.tsx`
  - `tests/unit/ui/admin-shell-nav.test.tsx`
  - `tests/unit/ui/coderso-modules.test.ts`
