# TASK-214-01-02: Tab State, Header New Action, and Prefetch
# FileName: TASK-214-01-02_Tab_State_Header_New_Action_and_Prefetch.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI + Navigation
**Estimated Effort:** Medium
**Dependencies:** TASK-214-01-01
**Status:** Done (2026-04-26)

---

## Overview

Make the `Queries` / `Templates` tab value controlled by `ListingListPage` and
route the single header `New` action through the active tab.

The visible button label should stay compact (`New`) like Pages, but the click
behavior and accessible label must be resource-specific.

## Sub-Tasks

- [x] Add `activeTab` state in `ListingListPage`.
- [x] Replace `New query` header copy with compact `New`.
- [x] On `Queries`, `New` navigates to `/coderso/listings/new` through
  `useAdminRouter().navigate`.
- [x] Keep navigation canonicalized through `useAdminRouter().navigate` and
  `AdminLink`/`prefetch`; do not add raw anchors, `window.location`, or local
  route alias logic for Listings.
- [x] On `Templates`, `New` opens the template create dialog/drawer owned by
  the templates tab through parent-controlled state.
- [x] Remove the nested `New template` primary button from
  `ListingTemplateManager` or demote it only if a separate empty-state CTA is
  still needed.
- [x] Lift `templateCreateOpen` and `editingTemplateId` or an equivalent
  controlled template dialog object into `ListingListPage`.
- [x] Pass template dialog state and row action callbacks into
  `ListingTemplateManager`; do not call child methods through an imperative ref.
- [x] Verify existing `/coderso/listings` prefetch still warms both resource
  caches and does not refetch the active route from active-link hover.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/utils/adminPrefetch.ts` only if required by failing tests.
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/vitest/admin/adminPrefetch.test.ts`

## Security Contract

- Visibility: internal admin navigation and dialogs only.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: create actions still execute later through `content:write` routes.
- CSRF: no mutation in the tab switch itself.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: inactive tab selection and hidden rows must not be carried into
  the active tab action context.

## Pseudocode

```tsx
const handleNew = () => {
  if (activeTab === "queries") {
    navigate("/coderso/listings/new");
    return;
  }
  setTemplateCreateOpen(true);
};

<ListingTemplateManager
  createOpen={templateCreateOpen}
  editingTemplateId={editingTemplateId}
  onCreateOpenChange={setTemplateCreateOpen}
  onEditingTemplateIdChange={setEditingTemplateId}
/>
```

## Testing Requirements

- With `Queries` active, clicking `New` navigates to `/coderso/listings/new`.
- With `Templates` active, clicking `New` opens the template create flow and
  does not navigate to query create.
- The header button keeps compact visible copy `New` while exposing
  resource-specific accessible names or descriptions for the active tab.
- Switching tabs updates the header action context.
- Template create state is parent-controlled; closing the dialog updates the
  shell state and reopening from the header starts a fresh create form.
- Prefetch tests still prove `/coderso/listings` warms queries and templates.
- Navigation tests keep route assertions at the canonical admin path level and
  do not bypass `resolveAdminHref` / `prefetchAdminRoute` behavior.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. One header `New` action controls both resource flows.
2. The active tab, not a query-only default, decides the create behavior.
3. Prefetch remains shared and cache-safe.
