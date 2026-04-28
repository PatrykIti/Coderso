# TASK-214-03-01: Template Filter Model and View Component
# FileName: TASK-214-03-01_Template_Filter_Model_and_View_Component.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-214-03
**Status:** Done (2026-04-26)

---

## Overview

Add a compact filter strip for listing templates that follows the Pages list
pattern while using template-specific fields.

## Sub-Tasks

- [x] Add `filterListingTemplates` as a pure exported helper.
- [x] Support search by template `name`, `slug`, and `description`.
- [x] Support layout filter: all, grid, list, table, calendar, map.
- [x] Reset pagination and trim selected template ids when filter state
  changes.
- [x] Keep layout labels sourced from `listingLayoutOptions`.
- [x] Keep template filter state, pagination reset keys, visible ids, and
  `selectedTemplateIds` owned by `ListingListPage` or by a shell-owned hook
  called from `ListingListPage`. `ListingTemplateManager` may render the filter
  component, but it must not become the hidden owner of selection trimming or
  active-tab bulk metadata.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
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
const [templateSearch, setTemplateSearch] = useState("");
const [templateLayout, setTemplateLayout] = useState("all");

const filteredTemplates = filterListingTemplates(
  templateItems,
  templateSearch,
  templateLayout
);

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
- Changing template filters resets template pagination and trims hidden
  `selectedTemplateIds` through the shell-owned state path.
- `ListingListPage` can still render the Templates tab selected count and bulk
  bar in `PageHeader.actions` after filter changes without reading private
  `ListingTemplateManager` state.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Template filters are small, resource-specific, and client-side.
2. Filter changes cannot leave hidden templates selected.
3. Template filter, pagination, and selection metadata remains visible to the
   active-tab shell owner.
