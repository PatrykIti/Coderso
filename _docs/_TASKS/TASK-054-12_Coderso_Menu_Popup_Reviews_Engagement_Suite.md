# TASK-054-12: Coderso Menu, Popup, Reviews, Engagement Suite
# FileName: TASK-054-12_Coderso_Menu_Popup_Reviews_Engagement_Suite.md

**Priority:** Medium  
**Category:** CMS/UX + Marketing  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-06, TASK-054-07  
**Status:** Done (2026-02-19)

---

## Goal
Add engagement modules similar to JetMenu + JetPopup + JetReviews to improve conversion and trust.

## Features
- Mega menu builder with conditional items and badges.
- Popup builder with triggers (time, scroll, exit intent, CTA click).
- Reviews/ratings module with moderation and schema-ready output.
- UX utility widgets (tabs, accordions, toggles) as reusable presets.

## Files to Change
- `core/services/menus/*`
- `core/services/popups/*` (new)
- `core/services/reviews/*` (new)
- `core/server/routes/popupsRoutes.ts` (new)
- `core/server/routes/reviewsRoutes.ts` (new)
- `core/admin/ui/popups/*` (new)
- `core/admin/ui/reviews/*` (new)

## Pseudocode
```ts
const popup = resolvePopup({ page, userSegment, trigger, frequencyRules });
if (popup) enqueueClientPopup(popup);

const reviews = await listReviews({ entityType, entityId, status: "approved" });
```

## Acceptance Criteria
1. Non-technical users can build menus/popups/reviews without coding.
2. Popup frequency and consent-safe behavior are configurable.
3. Review moderation and publishing flow are test-covered.

## Sub-Tasks
- `TASK-054-12-01`: Engagement domain and DB schema (menus metadata + popups + reviews)
- `TASK-054-12-02`: Popup and reviews services + validation contract
- `TASK-054-12-03`: Popup and reviews API routes + RBAC
- `TASK-054-12-04`: Admin UI for popups and reviews modules
- `TASK-054-12-05`: Mega menu UX extensions + utility widgets presets
- `TASK-054-12-06`: QA matrix, docs, and changelog closure

## Progress Update (2026-02-19)
- Completed `TASK-054-12-01`:
  - added engagement DB foundation (`menu_items.settings`, `popups`, `reviews`),
  - generated migration 0043 + snapshot + journal update,
  - added DB schema test coverage for engagement tables.
- Completed `TASK-054-12-02`:
  - implemented popup/review domain contracts with normalization/validation services,
  - added popup/review CRUD + lifecycle service layer,
  - extended menu item normalization to persist mega-menu metadata settings.
- Completed `TASK-054-12-03`:
  - added internal admin API routes for popup/review CRUD and moderation status changes,
  - added popup/review route validation contracts and stable domain error mapping,
  - registered routes in the global router and extended permission catalog with popup/review RBAC scopes.
- Completed `TASK-054-12-04`:
  - delivered Coderso popups/reviews admin screens (list/editor/moderation),
  - wired cache + prefetch + route aliases for popup/review surfaces,
  - enabled popups/reviews in Coderso navigation with permission-aware visibility.
- Completed `TASK-054-12-05`:
  - delivered mega-menu metadata editing (visibility/badge/description/icon) with strict validation and persistence,
  - mapped deterministic menu metadata into navigation runtime items,
  - added utility widgets (`tabs`, `accordion`, `toggle-block`) with runtime renderers and Wizard/Visual/Advanced editors.
- Completed `TASK-054-12-06`:
  - executed QA closure matrix (`lint`, `lint:types`, full `bun test`),
  - synchronized API/architecture/module docs with final engagement contracts,
  - finalized changelog + kanban closure for the full `054-12` suite.
