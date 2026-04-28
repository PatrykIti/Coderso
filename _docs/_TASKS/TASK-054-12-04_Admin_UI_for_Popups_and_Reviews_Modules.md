# TASK-054-12-04: Admin UI for Popups and Reviews Modules
# FileName: TASK-054-12-04_Admin_UI_for_Popups_and_Reviews_Modules.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-12-03  
**Status:** Done (2026-02-19)

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

## Completion Notes (2026-02-19)
- Added admin clients with local cache + cross-tab sync:
  - `core/admin/services/popupsClient.ts`
  - `core/admin/services/reviewsClient.ts`
- Added cache keys and TTL wiring for popup/review list + detail payloads.
- Added Popups UI workflow:
  - list page with search/status tabs and row actions,
  - editor page for create/edit/publish/archive with trigger/targeting/content/settings sections.
- Added Reviews UI workflow:
  - moderation page with quick filters, row actions, and right-side detail panel.
- Registered routes in `AdminApp`:
  - `/coderso/popups`, `/coderso/popups/:id`, `/coderso/reviews`.
- Enabled Coderso nav modules for reviews/popups (preview/beta) with RBAC permissions.
- Added prefetch + alias support:
  - `/reviews` -> `/coderso/reviews`
  - `/popups` -> `/coderso/popups`
- Added unit/integration coverage for clients, UI rendering, nav aliases, and prefetch behavior.
