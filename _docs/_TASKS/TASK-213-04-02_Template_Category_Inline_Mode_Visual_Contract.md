# TASK-213-04-02: Template Category Inline Mode Visual Contract
# FileName: TASK-213-04-02_Template_Category_Inline_Mode_Visual_Contract.md

**Priority:** Medium
**Category:** Widget Templates + Categories + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-213-04
**Status:** To Do

---

## Overview

Fix `UX-7` from the Widget Library report.

The category drawer's edit and delete inline modes both replace the category row
content, making it easy to misread an edit click as deletion. Keep the inline
workflow, but make the visual states unmistakable and accessible.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx`
- `core/admin/services/widgetTemplateCategoriesClient.ts` only if error mapping
  needs bounded helper copy
- `tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`
- `tests/vitest/ui/widget-library.test.tsx` or a new focused
  `tests/vitest/ui/widget-template-category-drawer.test.tsx`
- `tests/integration/routes/widgetTemplateCategories.test.ts` only if route
  errors change.

## Implementation Direction

Edit mode should keep the original category identity visible. Delete mode should
use destructive styling and explicit confirmation copy.

Pseudocode:

```tsx
{isEditing ? (
  <div>
    <span className="text-muted-foreground line-through?">{category.name}</span>
    <Input aria-label={`New name for ${category.name}`} ... />
  </div>
) : null}

{isDeleting ? (
  <div className="border-destructive bg-destructive/5">
    <span>Delete category "{category.name}"?</span>
    <Button variant="destructive">Delete</Button>
  </div>
) : null}
```

Do not use `window.confirm`. Keep shared buttons and bounded inline action
errors.

## Security Contract

- Endpoint visibility: internal admin template-category route only
  (`/admin/api/widget-template-categories`) if route error handling changes;
  this leaf must not add public write endpoints.
- Auth model: existing admin session or internal API-key scope. Public
  nonce/HMAC/reCAPTCHA hardening is not applicable because category management
  remains an internal admin write flow.
- RBAC: `widgets:write`.
- CSRF: category writes keep CSRF.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation: category name remains service-validated,
  non-empty, and bounded.
- Anti-abuse: inline errors must not expose raw settings payloads, stack traces,
  SQL, or auth headers.

## Testing Requirements

- Focused drawer/UI test:
  - edit mode keeps original category context visible;
  - delete mode has destructive styling and exact category name;
  - save/cancel/delete buttons have accessible names;
  - action errors render bounded copy.
- Client/route tests remain green for create/update/delete.
- Manual Playwright:
  - pencil does not look like delete;
  - trash displays an obvious destructive confirmation.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-library.md` only if user-facing category management flow
  changes.

## Acceptance Criteria

1. Edit and delete inline modes are visually distinct.
2. Category identity remains visible during edit/delete confirmation.
3. Destructive action requires explicit confirmation.
4. Tests cover the visual/accessibility contract.
