# TASK-054-07-03: Coderso Listing Templates Model and Service
# FileName: TASK-054-07-03_Coderso_Listing_Templates_Model_and_Service.md

**Priority:** High  
**Category:** Core/CMS + Data Model  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-07-01, TASK-054-07-02  
**Status:** Done (2026-02-18)

---

## Goal
Provide reusable listing templates (card/list/table/calendar/map-ready output contract) with CRUD service and schema validation.

## Files to Change
- `core/db/schema.ts` (listing templates table)
- `core/db/migrations/0037_listing_templates.sql` (new)
- `core/db/migrations/meta/_journal.json`
- `core/db/migrations/meta/0037_snapshot.json` (new)
- `core/services/content/listingTemplatesService.ts` (new)
- `tests/unit/content/listingTemplatesService.test.ts` (new)

## Template Contract
- `layout`: `grid | list | table | calendar | map`
- `fields`: array of dynamic field bindings
- `itemActions`: view/edit/custom CTA definitions
- `emptyState`: title/description/cta
- `style`: spacing/columns/visual tokens

## Pseudocode
```ts
type ListingTemplate = {
  id: string;
  name: string;
  slug: string;
  layout: ListingLayout;
  config: ListingTemplateConfig;
};

function validateListingTemplateConfig(config: unknown): ListingTemplateConfig;
```

## Acceptance Criteria
1. Templates can be created/updated/deleted/listed.
2. Config is validated and normalized server-side.
3. Migration includes indices for slug and updatedAt.
4. Unit tests cover config normalization and CRUD flow (DB-conditional integration unit).
