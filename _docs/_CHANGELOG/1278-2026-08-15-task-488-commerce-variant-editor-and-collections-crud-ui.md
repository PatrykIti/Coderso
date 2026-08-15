# 1278 - TASK-488 Commerce: Variant Editor & Collections CRUD UI

**Date:** 2026-08-15
**Version:** Unreleased
**Tasks:** TASK-488, TASK-488-01, TASK-488-01-L01, TASK-488-01-L02, TASK-488-02, TASK-488-02-L01, TASK-488-02-L02, TASK-488-03, TASK-488-03-L01, TASK-488-03-L02

## Key Changes

### Commerce (admin UI)
- Product editor gains a variant authoring surface: `CommerceVariantsCard` + `AttributesEditor` (add/remove variant, SKU-level pricing/stock, metadata attributes), backed by pure draft-model helpers (`commerceEditorModel.ts`: createEmptyVariant/addVariant/updateVariantAt/removeVariantAt/setDefaultVariantAt/attribute helpers/serializeDraftVariants/parseIntegerOrNull, single-writer per audit).
- Collections CRUD UI: new `/advanced/commerce/collections` route (literal before `/advanced/commerce/:id`; AdminApp split below 1000 lines into adminRoutes.tsx per the line gate) + `CommerceCollectionsPage` + `CommerceCollectionsPanel` with create/update/delete via the cached client + cache-bus events; `commerceCollectionModel.ts` draft model.
- Docs: CMS_API/CMS_SPEC commerce section + ADMIN_CACHE/ADMIN_CACHE_MAP collections cache family.

## Validation
- `bun --cwd core lint` + `lint:types` green; Vitest model/UI/ui-integration suites green (incl. commerce-page, commerce-variant-editor, commerce-collections-manager).
- Runtime smoke (wf488smoke, 5 scenarios): login, commerce list → Manage collections route, create collection (POST 200, visible + assignable), variant editor (Add variant → Default variant 1 card with remove/inventory/attributes), dark-mode parity; 0 feature-related console errors. Screenshots `_docs/_workflows/_smoke/488-*`.
