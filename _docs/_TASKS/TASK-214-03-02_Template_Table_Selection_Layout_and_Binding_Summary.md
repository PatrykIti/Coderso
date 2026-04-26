# TASK-214-03-02: Template Table Selection, Layout, and Binding Summary
# FileName: TASK-214-03-02_Template_Table_Selection_Layout_and_Binding_Summary.md

**Priority:** High
**Category:** Coderso Listings + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-214-03-01
**Status:** To Do

---

## Overview

Render listing templates in a Pages-style selectable table while preserving
template-specific signals: name, slug, layout, field binding count, and updated
date.

## Sub-Tasks

- [ ] Add header checkbox with all/indeterminate state.
- [ ] Add row checkbox and selected-row visual state.
- [ ] Use columns: Template, Layout, Bindings, Updated, Actions.
- [ ] Show `/{slug}` and optional description under the template name.
- [ ] Keep row actions: Edit and Delete.
- [ ] Keep `BindingEditor` inside the create/edit dialog, not in the list row.
- [ ] Keep selected ids, all/indeterminate checkbox state, and row action
  callbacks shell-owned in `ListingListPage`; the template table or manager
  receives them through controlled props instead of deriving private selection
  state.

## Files to Change

- `core/admin/ui/listings/ListingListPage.tsx`
- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/ListingTemplateTable.tsx` if extracted.
- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `tests/vitest/ui/listing-binding-editor.test.tsx` if extraction touches the
  binding editor contract.

## Security Contract

- Visibility: internal admin UI row selection.
- Auth model: existing authenticated admin session/admin API key path.
- RBAC: display requires `content:read`; delete remains owned by TASK-214-04.
- CSRF: no writes in this leaf.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: table events must pass row-owned template ids only.

## Pseudocode

```tsx
<ListingTemplateTable
  items={templatePagination.visibleRows}
  selectedIds={selectedTemplateIds}
  isAllSelected={isTemplateAllSelected}
  isIndeterminate={isTemplateIndeterminate}
  onToggleAll={handleToggleAllTemplates}
  onToggleItem={handleToggleTemplate}
  onEdit={openEditTemplate}
  onDelete={setPendingTemplateDeleteId}
/>
```

## Testing Requirements

- Header checkbox selects visible template rows.
- Row checkbox toggles one template row.
- Selected row gets a visible selected state.
- `ListingListPage` can render selected template count and active-tab bulk
  state from shell-owned state after table selection changes.
- Template table displays layout and field binding count.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Template table selection matches Pages table behavior.
2. Template rows keep Listings-specific layout and binding context visible.
