# 261 - Engagement Admin UI (Popups and Reviews)

- **Date:** 2026-02-19
- **Version:** 0.1.261
- **Tasks:** TASK-054-12, TASK-054-12-04

## Key Changes

### Popups Admin UI
- Added popup admin list page with:
  - status tabs,
  - search,
  - row actions (publish/draft/archive/delete).
- Added popup editor page with sections for:
  - identity,
  - trigger,
  - targeting/frequency,
  - content,
  - display settings.
- Files:
  - `core/admin/ui/popups/PopupsListPage.tsx`
  - `core/admin/ui/popups/PopupTable.tsx`
  - `core/admin/ui/popups/PopupEditorPage.tsx`
  - `core/admin/ui/popups/components/PopupEditorForm.tsx`
  - `core/admin/ui/popups/popupEditorModel.ts`
  - `core/admin/ui/popups/hooks/usePopups.ts`

### Reviews Moderation UI
- Added reviews moderation page with:
  - status tabs,
  - search,
  - quick moderation actions,
  - details panel for selected review.
- Files:
  - `core/admin/ui/reviews/ReviewsModerationPage.tsx`
  - `core/admin/ui/reviews/ReviewTable.tsx`
  - `core/admin/ui/reviews/hooks/useReviews.ts`

### Admin Clients + Cache/Prefetch Wiring
- Added popup/review admin clients with local cache + detail cache + cache bus sync.
- Added cache keys for popup/review list/detail entries.
- Added prefetch handlers and route alias support.
- Files:
  - `core/admin/services/popupsClient.ts`
  - `core/admin/services/reviewsClient.ts`
  - `core/admin/services/cachePolicy.ts`
  - `core/admin/utils/adminPrefetch.ts`
  - `core/admin/utils/adminPaths.ts`

### Navigation and Route Registration
- Registered popup/review pages in Admin app router.
- Enabled Coderso nav modules for reviews/popups as preview modules (RBAC-aware).
- Files:
  - `core/admin/app/AdminApp.tsx`
  - `core/admin/ui/navigation/codersoModules.ts`

### Tests
- Added coverage for popup/review clients, UI rendering, nav aliases, and prefetch.
- Files:
  - `tests/unit/admin/popupsClient.test.ts`
  - `tests/unit/admin/reviewsClient.test.ts`
  - `tests/unit/ui/popups-page.test.tsx`
  - `tests/unit/ui/reviews-page.test.tsx`
  - `tests/unit/admin/adminPaths.test.ts`
  - `tests/unit/admin/admin-router.test.ts`
  - `tests/unit/admin/adminPrefetch.test.ts`
  - `tests/unit/ui/coderso-modules.test.ts`
  - `tests/unit/ui/admin-nav.test.tsx`
  - `tests/unit/ui/admin-shell-nav.test.tsx`
