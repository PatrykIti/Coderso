# TASK-054-12: Coderso Menu, Popup, Reviews, Engagement Suite
# FileName: TASK-054-12_Coderso_Menu_Popup_Reviews_Engagement_Suite.md

**Priority:** Medium  
**Category:** CMS/UX + Marketing  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-06, TASK-054-07  
**Status:** To Do

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
