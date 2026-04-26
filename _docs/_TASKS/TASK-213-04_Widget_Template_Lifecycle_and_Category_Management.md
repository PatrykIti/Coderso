# TASK-213-04: Widget Template Lifecycle and Category Management
# FileName: TASK-213-04_Widget_Template_Lifecycle_and_Category_Management.md

**Priority:** Medium
**Category:** Widget Templates + Admin/UI + CRUD
**Estimated Effort:** Large
**Dependencies:** TASK-213, TASK-174-03-03, TASK-208
**Status:** To Do

---

## Overview

Repair the template lifecycle and category-management UX findings from
`SUMMARY-WIDGETS.md`:

- `Save Template` and create flows need shared success/error feedback;
- `New Template` needs to read as the primary Templates-tab CTA, not as a weak
  link hidden beside filters;
- template rows need lifecycle actions such as Edit, Duplicate, and Delete
  without requiring editors to open each template one by one;
- template cleanup needs a visible bulk-select/delete path for test templates
  so `UX-6` is not silently reduced to row-only cleanup;
- duplicate template names should be rejected or made visibly unique before save;
- category inline edit and delete states need distinct visual treatment so
  users do not confuse editing with deletion.

The business outcome is that editors can clean test templates, save reusable
templates confidently, and manage categories without ambiguity.

## Sub-Tasks

- `TASK-213-04-01_Template_Save_Toasts_Row_Actions_and_Name_Guards.md`
- `TASK-213-04-02_Template_Category_Inline_Mode_Visual_Contract.md`

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/widgets/WidgetTemplateCategoryDrawer.tsx`
- `core/admin/services/widgetTemplatesClient.ts`
- `core/admin/services/widgetTemplateCategoriesClient.ts`
- `core/services/widgets/widgetTemplateService.ts`
- `core/services/widgets/widgetTemplateCategoryService.ts`
- `core/server/routes/widgetTemplateRoutes.ts`
- `core/server/routes/widgetTemplateCategoryRoutes.ts`
- `core/server/validation/widgetSchemas.ts`
- `tests/vitest/ui/widget-template-editor.test.tsx`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
- `tests/vitest/admin/widgetTemplateCategoriesClient.test.ts`
- `tests/unit/widgets/widgetTemplateService.test.ts`
- `tests/unit/widgets/widgetTemplateCategoryService.test.ts`
- `tests/integration/routes/widgetTemplates.test.ts`
- `tests/integration/routes/widgetTemplateCategories.test.ts`

## Implementation Direction

Prefer existing template route/service seams. Add list row actions in the
library layer; keep route modules orchestration-only.

Bulk selection/delete should follow the current admin-list pattern from Forms,
Entries, Content Types, Pages, and Posts: local visible-row selection, a focused
bulk action bar owned by the list surface, `Promise.allSettled` summaries for
partial failures, and `ConfirmActionDialog` before destructive mutation. Do not
introduce a second global bulk-action framework just for widget templates.

Pseudocode for save feedback:

```ts
try {
  const result = isNew ? await createWidgetTemplate(input) : await updateWidgetTemplate(id, input);
  widgetTemplateToasts.success(isNew ? "create" : "update", result.name);
  if (isNew) navigate(templateEditHref(result.id));
} catch (error) {
  widgetTemplateToasts.error(isNew ? "create" : "update", error);
  setError(resolveBoundedError(error));
}
```

Template tab CTA:

```tsx
{activeScope === "templates" ? (
  <Button size="sm" variant="default" asChild>
    <AdminLink href={templateCreateHref}>
      <Plus className="h-4 w-4" />
      New Template
    </AdminLink>
  </Button>
) : null}
```

Pseudocode for row actions:

```tsx
<DropdownMenu>
  <DropdownMenuItem onSelect={() => edit(template.id)}>Edit</DropdownMenuItem>
  <DropdownMenuItem onSelect={() => duplicate(template.id)}>Duplicate</DropdownMenuItem>
  <DropdownMenuItem variant="destructive" onSelect={() => confirmDelete(template)}>
    Delete
  </DropdownMenuItem>
</DropdownMenu>
```

For duplicate/name guards, use service-owned validation and route-owned mapping:

```ts
if (await nameExists(input.name, { excludingId })) {
  throw new WidgetTemplateError("widget_template_name_conflict");
}
```

## Security Contract

- Endpoint visibility: internal admin routes only (`/admin/api/widget-templates`,
  `/admin/api/widgets/templates`, and `/admin/api/widget-template-categories`);
  this task must not add public write endpoints.
- Auth model: existing admin session or internal API-key scope; no public
  nonce/HMAC/reCAPTCHA flow is applicable because there is no public write mode.
- RBAC: `widgets:read` for listing and `widgets:write` for create/update/delete.
- CSRF: all template/category writes keep CSRF.
- Rate-limit bucket: existing admin read/write buckets.
- Reject-unknown validation:
  - duplicate/create/update payloads must remain schema-first in
    `core/server/validation/widgetSchemas.ts`;
  - routes map known domain errors through centralized route error mapping.
- Anti-abuse:
  - destructive delete uses shared confirmation;
  - delete/duplicate re-checks current id/name/status/category before mutation;
  - toast/error copy must not expose raw template block payloads, stack traces,
    SQL, auth headers, or private settings values.

## Testing Requirements

- `tests/vitest/ui/widget-template-editor.test.tsx`
  - create/update success emits shared feedback;
  - create name conflict shows bounded error and does not navigate falsely.
- `tests/vitest/ui/widget-library.test.tsx`
  - `New Template` is rendered as the Templates-tab primary CTA and remains
    reachable beside category filters;
  - template row/card exposes Edit/Duplicate/Delete actions;
  - bulk selection exposes confirmed Delete selected for selected templates;
  - delete confirmation is required before destructive mutation.
- Client tests:
  - duplicate/delete/category updates patch or invalidate caches correctly.
- Bun route tests:
  - route registration still exposes the intended widget-template and category
    endpoints only under the internal admin router;
  - centralized `mapWidgetTemplateError` / category-error mapping covers known
    duplicate, not-found, invalid, and conflict cases;
  - name conflict maps to a machine-readable route error;
  - duplicate/delete require auth/RBAC/CSRF and preserve cache events.
- Manual Playwright:
  - save new template shows toast after navigation;
  - delete a test template from the list with confirmation;
  - category edit/delete modes are visually distinct.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-template-editor.md`
- `docs/coderso/widget-library.md`
- `_docs/CMS_API.md` if route payloads/errors change
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache behavior changes
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Template create/update has visible shared success and bounded error feedback.
2. `New Template` is a clear primary action in the Templates tab.
3. Template list supports row and bulk cleanup actions without opening each
   editor first.
4. Duplicate names are handled intentionally.
5. Category edit/delete states are visually and accessibly distinct.
