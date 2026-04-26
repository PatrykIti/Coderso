# TASK-213-04-03: Template Row and Bulk Cleanup Actions
# FileName: TASK-213-04-03_Template_Row_and_Bulk_Cleanup_Actions.md

**Priority:** Medium
**Category:** Widget Templates + Admin/UI + CRUD
**Estimated Effort:** Medium
**Dependencies:** TASK-213-04, TASK-213-04-04, TASK-208
**Status:** To Do

---

## Overview

Fix the cleanup-action parts of `BUG-4` and `UX-6` from the Widget Library
report.

Business outcome: editors can clean duplicated or test templates from the
Templates tab without opening every template editor one by one.

Technical contract: keep lifecycle actions owned by the widget-template list
surface and existing client/service routes. Reuse the repo's visible-selection,
confirmation, partial-failure, and shared-toast patterns from Pages, Posts,
Forms, Entries, and Content Types. Do not introduce a second global bulk-action
framework for widget templates.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/services/widgetTemplatesClient.ts`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
- `tests/integration/routes/widgetTemplates.test.ts` if route delete/duplicate
  behavior changes while wiring the list actions

## Implementation Direction

Add row actions in the Templates tab:

```tsx
<DropdownMenu>
  <DropdownMenuItem onSelect={() => edit(template.id)}>Edit</DropdownMenuItem>
  <DropdownMenuItem onSelect={() => duplicate(template.id)}>Duplicate</DropdownMenuItem>
  <DropdownMenuItem
    variant="destructive"
    onSelect={() => openDeleteDialog(template)}
  >
    Delete
  </DropdownMenuItem>
</DropdownMenu>
```

Use list-local selection for bulk cleanup:

```ts
const visibleIds = templatesOnCurrentPage.map((item) => item.id);
const selectedVisibleIds = selectedIds.filter((id) => visibleIds.includes(id));

async function deleteSelectedTemplates() {
  const results = await Promise.allSettled(
    selectedVisibleIds.map((id) => deleteWidgetTemplate(id))
  );
  widgetTemplateListToasts.bulkDelete(results);
  trimSelectionToFailedIds(results);
}
```

Destructive actions must go through `ConfirmActionDialog`. Duplicate uses the
service/client contract from `TASK-213-04-04`; this leaf only wires it into the
list UX and feedback.

## Security Contract

- Endpoint visibility: existing internal admin template routes only.
- Auth model: existing admin session or internal API-key scope.
- RBAC: `widgets:read` for list/edit and `widgets:write` for duplicate/delete.
- CSRF: delete/duplicate writes keep CSRF.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation:
  - duplicate/delete payloads, if any, remain strict and route-owned;
  - list code must not construct ad hoc route payloads outside the client
    contract.
- Anti-abuse:
  - destructive delete always requires shared confirmation;
  - delete/duplicate re-checks current id/name/status server-side;
  - bulk feedback reports partial failures without leaking raw payloads.

## Testing Requirements

- `tests/vitest/ui/widget-library.test.tsx`
  - row menu exposes Edit/Duplicate/Delete;
  - Delete opens `ConfirmActionDialog` and does not call delete before confirm;
  - bulk selection uses visible template ids only;
  - filters/page changes trim hidden selection;
  - partial failures keep failed rows selected and show bounded feedback.
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
  - delete/duplicate invalidates or patches template caches correctly.
- `tests/integration/routes/widgetTemplates.test.ts` if route behavior changes:
  - delete/duplicate remain internal-admin scoped and require auth/RBAC/CSRF.
- Manual Playwright:
  - delete one test template from the list;
  - bulk delete selected test templates;
  - verify duplicate action creates an editable draft once `TASK-213-04-04`
    lands.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-library.md`
- `docs/coderso/widget-template-editor.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache behavior
  changes

## Acceptance Criteria

1. Template rows expose Edit, Duplicate, and Delete without opening the editor.
2. Row and bulk deletes require confirmation.
3. Bulk cleanup mutates only visible selected ids and handles partial failures
   truthfully.
4. Shared Admin UI feedback covers row and bulk outcomes.
