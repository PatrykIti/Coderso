# TASK-215-04-03: Template Bulk Actions, Confirmations, and Toasts
# FileName: TASK-215-04-03_Template_Bulk_Actions_Confirmations_and_Toasts.md

**Priority:** High
**Category:** Coderso Widgets + Templates + Bulk Actions
**Estimated Effort:** Medium
**Dependencies:** TASK-215-04, TASK-208, TASK-213-04-03
**Status:** To Do

---

## Overview

Preserve and upgrade template bulk delete in the new Pages-style shell. The
bulk action bar operates only on visible selected template rows, uses
`ConfirmActionDialog`, waits for all mutations to settle, reports partial
failure clearly, and refreshes caches.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetLibraryBulkActionsBar.tsx` if extracted.
- `core/admin/ui/shared/ConfirmActionDialog.tsx` only if a shared defect is
  found and fixed.
- `core/admin/services/widgetTemplatesClient.ts`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`

## Security Contract

- Visibility: internal admin UI and existing internal template API.
- Auth model: existing admin session/admin API key path.
- RBAC: `widgets:write` for delete mutations.
- CSRF: `deleteWidgetTemplate` keeps existing CSRF handling.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: delete ids come from visible template rows.
- Anti-abuse: destructive bulk delete requires explicit confirmation and never
  includes hidden rows or rows from another section.

## Pseudocode

```ts
const results = await Promise.allSettled(
  visibleSelectedTemplateIds.map((id) => deleteWidgetTemplate(id))
);
```

## Testing Requirements

- Bulk delete button appears only with visible selected templates.
- Confirmation dialog names the selected count.
- Successful deletes clear selected ids and refresh caches.
- Partial failures keep failed rows selected and show bounded feedback.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx tests/vitest/admin/widgetTemplatesClient.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Template bulk delete is visible-scope safe.
2. Destructive actions are confirmed.
3. Partial failures are visible and recoverable.
