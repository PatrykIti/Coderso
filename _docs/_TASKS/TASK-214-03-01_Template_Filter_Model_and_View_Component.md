# TASK-214-03-01: Template Filter Model and View Component
# FileName: TASK-214-03-01_Template_Filter_Model_and_View_Component.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-214-03
**Status:** To Do

---

## Overview

Add a compact filter strip for listing templates that follows the Pages list
pattern while using template-specific fields.

## Sub-Tasks

- [ ] Add `filterListingTemplates` as a pure exported helper.
- [ ] Support search by template `name`, `slug`, and `description`.
- [ ] Support layout filter: all, grid, list, table, calendar, map.
- [ ] Reset pagination and trim selected template ids when filter state
  changes.
- [ ] Keep layout labels sourced from `listingLayoutOptions`.

## Files to Change

- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/ListingTemplateFilters.tsx` if extracted.
- `core/admin/ui/listings/defaults.ts` only if labels need central reuse.
- `tests/vitest/ui/listings-cluster-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI filter state only.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: unchanged `content:read`.
- CSRF: no writes.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: no route params are introduced; filtering is
  client-side over already authorized rows.
- Anti-abuse: filter text must not be sent to any new endpoint in this leaf.

## Pseudocode

```tsx
<ListingTemplateFilters
  search={templateSearch}
  layout={templateLayout}
  onSearchChange={setTemplateSearch}
  onLayoutChange={setTemplateLayout}
/>
```

## Testing Requirements

- Search matches template name.
- Search matches template slug.
- Search matches template description.
- Layout filter narrows to the selected layout.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Template filters are small, resource-specific, and client-side.
2. Filter changes cannot leave hidden templates selected.
