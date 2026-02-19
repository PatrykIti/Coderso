# TASK-054-12-04: Admin UI for Popups and Reviews Modules
# FileName: TASK-054-12-04_Admin_UI_for_Popups_and_Reviews_Modules.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-12-03  
**Status:** To Do

---

## Goal
Deliver WordPress-like list/editor workflows for popups and reviews in Coderso navigation.

## Scope
1. Popups list/editor screens (create/edit/publish/archive).
2. Reviews list/moderation screen (approve/reject/spam, quick filters).
3. Cache/prefetch wiring like other Coderso modules.
4. Route and navigation registration.

## Files
- `core/admin/services/popupsClient.ts` (new)
- `core/admin/services/reviewsClient.ts` (new)
- `core/admin/ui/popups/*` (new)
- `core/admin/ui/reviews/*` (new)
- `core/admin/app/AdminApp.tsx`
- `core/admin/ui/navigation/codersoModules.ts`
- `core/admin/utils/adminPrefetch.ts`
- `core/admin/services/cachePolicy.ts`

## Pseudocode
```tsx
<PopupsListPage />
<PopupEditorPage />
<ReviewsModerationPage />
```

## Acceptance Criteria
1. Non-technical users can manage popups and reviews from Coderso screens.
2. Navigation/prefetch/cache behavior matches existing modules.
3. UI tests cover rendering and key interactions.
