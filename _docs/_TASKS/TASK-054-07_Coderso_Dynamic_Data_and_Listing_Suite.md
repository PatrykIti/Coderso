# TASK-054-07: Coderso Dynamic Data and Listing Suite
# FileName: TASK-054-07_Coderso_Dynamic_Data_and_Listing_Suite.md

**Priority:** High  
**Category:** CMS/Content + Runtime + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-054-06, TASK-055  
**Status:** To Do

---

## Goal
Deliver dynamic data/listing capabilities similar to JetEngine + JetGridBuilder, built on Nextless content engine.

## Features
- Query builder for entries/posts/users/taxonomies.
- Listing views: grid, list, table, calendar timeline, map-ready output contract.
- Reusable listing templates and cards.
- Conditional visibility and dynamic field bindings.

## Files to Change
- `core/services/content/queryBuilderService.ts` (new)
- `core/services/content/listingTemplatesService.ts` (new)
- `core/server/routes/listingsRoutes.ts` (new)
- `core/admin/ui/listings/*` (new)
- `core/widgets/core/contentList.tsx`
- `core/widgets/core/entryTeaser.tsx`

## Pseudocode
```ts
const query = buildQuery({
  source: "post",
  filters: [{ field: "category", op: "in", value: ["service"] }],
  sort: [{ field: "publishedAt", dir: "desc" }],
  limit: 12,
});

const rows = await executeQuery(query);
return renderListingTemplate(templateId, { rows });
```

## Acceptance Criteria
1. Non-technical user can build list/card pages without custom code.
2. Listing templates are reusable across pages.
3. Query builder supports safe validation and server-side execution limits.
