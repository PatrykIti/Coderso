# TASK-054-07-05: Coderso Listings Admin UI Query Builder and Template Manager
# FileName: TASK-054-07-05_Coderso_Listings_Admin_UI_Query_Builder_and_Template_Manager.md

**Priority:** High  
**Category:** Admin/UI + UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-07-04  
**Status:** Done (2026-02-18)

---

## Goal
Create full Listings admin UX for non-technical users: query builder, preview, saved queries, template manager.

## Files to Change
- `core/admin/services/listingsClient.ts` (new)
- `core/admin/ui/listings/ListingListPage.tsx` (new)
- `core/admin/ui/listings/ListingEditorPage.tsx` (new)
- `core/admin/ui/listings/ListingTemplateManager.tsx` (new)
- `core/admin/ui/listings/ListingQueryTable.tsx` (new)
- `core/admin/ui/listings/defaults.ts` (new)
- `core/admin/ui/listings/hooks/useListingQueries.ts` (new)
- `core/admin/ui/listings/hooks/useListingTemplates.ts` (new)
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/navigation/codersoModules.ts`
- `core/admin/utils/adminPaths.ts`
- `core/admin/utils/adminPrefetch.ts`
- `tests/unit/ui/listings-page.test.tsx` (new)
- `tests/unit/ui/coderso-modules.test.ts`
- `tests/unit/ui/admin-nav.test.tsx`
- `tests/unit/admin/adminPaths.test.ts`
- `tests/unit/admin/admin-router.test.ts`
- `tests/unit/admin/adminPrefetch.test.ts`

## UX Contract
- WordPress-like table for saved queries (title, source, updatedAt, actions).
- Editor with panels:
  - Source
  - Filters
  - Sort & pagination
  - Field bindings
  - Live preview
- Template manager tab with create/edit/delete and layout presets.

## Pseudocode
```tsx
<Tabs>
  <TabsTrigger value="queries">Queries</TabsTrigger>
  <TabsTrigger value="templates">Templates</TabsTrigger>
</Tabs>

<ListingPreviewPanel query={draftQuery} templateId={selectedTemplateId} />
```

## Acceptance Criteria
1. User can build query and preview without leaving page.
2. Saved queries/templates are editable and reusable.
3. Loading/empty/error states are explicit and user-friendly.
4. Listings is exposed in Coderso navigation as `preview/beta` module with SPA routes and prefetch support.
