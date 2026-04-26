# TASK-214-01: Listings Route, Tab Shell, and Cache Hydration
# FileName: TASK-214-01_Listings_Route_Tab_Shell_and_Cache_Hydration.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI + Admin Cache
**Estimated Effort:** Large
**Dependencies:** TASK-214
**Status:** To Do

---

## Overview

Make `/admin/coderso/listings` a Pages-style list shell that owns active tab
state, cache hydration behavior, header actions, and prefetch compatibility for
both Listings resources.

This task establishes the parent orchestration contract before individual query
and template table work starts. The tabs stay in the list page, but the shell
must stop treating `Queries` as the only resource.

## Sub-Tasks

- [ ] TASK-214-01-01: Query and Template Cache Hydration
- [ ] TASK-214-01-02: Tab State, Header New Action, and Prefetch
- [ ] Keep `AdminShell activeHref="/admin/coderso/listings"` and current
  breadcrumbs.
- [ ] Convert `Tabs defaultValue="queries"` to controlled active-tab state.
- [ ] Define parent-level active resource metadata for labels, selected count,
  header `New`, bulk bar, and error titles.
- [ ] Lift query/template selection and bulk metadata high enough for
  `PageHeader.actions` to render the active tab's bulk bar without querying
  child component internals.
- [ ] Convert `ListingTemplateManager` to a controlled child boundary for
  create/edit open requests and template row action callbacks.
- [ ] Move template list rows, loading/error state, visible ids, selection, and
  table action requests to `ListingListPage` or a shell-called hook. The final
  list tab must not depend on `ListingTemplateManager` owning
  `useListingTemplates`.
- [ ] Keep template form draft/config editing local only inside the controlled
  dialog; do not leave header, selection, or bulk state local-only in
  `ListingTemplateManager`.

## State Ownership Contract

- `ListingListPage` owns `activeTab`, selected ids per tab, active bulk action
  value per tab, pending row/bulk delete state per resource, active resource
  labels, active resource inline feedback, and the single header `New` action.
- `ListingTemplateManager` may own transient dialog form state, `BindingEditor`
  cloned config, and save progress, but it receives create/edit open state and
  action callbacks from the parent.
- `ListingTemplateManager` should receive template rows/loading/error from the
  shell after the tab refactor. It must not be the hidden owner of template
  filtering, pagination, selection, row delete, or bulk delete.
- If template table, filters, bulk bar, or dialog are extracted, they remain
  controlled children. They must not read inactive-tab selection or expose a
  second local primary `New template` action.
- The implementation may introduce a small shell-owned hook such as
  `useListingsTemplateTabState`, but the hook must still be called by
  `ListingListPage` so `PageHeader.actions` has direct access to selected
  count, bulk action state, and `onNew`.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/hooks/useListingQueries.ts`
- `core/admin/ui/listings/hooks/useListingTemplates.ts`
- `core/admin/utils/adminPrefetch.ts` only if tests prove the existing
  `/coderso/listings` prefetch is incomplete.
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-page.test.tsx`
- `tests/vitest/admin/adminPrefetch.test.ts`

## Security Contract

- Visibility: internal admin UI only; existing internal Listings API reads stay
  unchanged.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: list reads require `content:read`.
- CSRF: no writes in this shell task.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: unchanged; list reads remain queryless.
- Anti-abuse: active-tab state must not create hidden write paths or expose
  inactive-tab selected ids.

## Pseudocode

```tsx
const [activeTab, setActiveTab] = useState<"queries" | "templates">("queries");

const activeResource =
  activeTab === "queries"
    ? queryResourceState
    : templateResourceState;

const templateDialog = {
  createOpen: templateCreateOpen,
  editingTemplateId,
  onCreateOpenChange: setTemplateCreateOpen,
  onEditingTemplateIdChange: setEditingTemplateId,
};

<PageHeader
  title="Listings"
  actions={
    <>
      {activeResource.selectedCount > 0 ? activeResource.bulkBar : null}
      <Button onClick={activeResource.onNew}>
        <Plus className="h-4 w-4" />
        New
      </Button>
    </>
  }
/>

<ListingTemplateManager
  dialog={templateDialog}
  selectedIds={selectedTemplateIds}
  onSelectedIdsChange={setSelectedTemplateIds}
  onRequestDelete={setPendingTemplateDeleteId}
  onRequestBulkDelete={setPendingTemplateBulkDeleteIds}
/>
```

## Testing Requirements

- Active tab state changes which `New` handler is used.
- Template `New` is controlled from `ListingListPage` and does not depend on an
  imperative child ref or a nested primary `New template` button.
- Template selected count in `PageHeader.actions` reflects only visible
  selected template rows from the active tab.
- Query and template cached data can hydrate independently without showing a
  foreground loading state when fresh cache exists.
- Prefetch for `/coderso/listings` still warms both query and template cached
  lists with `{ force: false }`.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-page.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The Listings page shell owns active tab state and header action routing.
2. Both Listings resource caches hydrate with the shared background refresh
   policy.
3. The shell has no query-only assumptions left in header actions or errors.
