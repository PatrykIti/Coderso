# TASK-213-04-01: Template Save Toasts Row Actions and Name Guards
# FileName: TASK-213-04-01_Template_Save_Toasts_Row_Actions_and_Name_Guards.md

**Priority:** Medium
**Category:** Widget Templates + Admin/UI + Notifications
**Estimated Effort:** Large
**Dependencies:** TASK-213-04, TASK-174-03-03, TASK-208
**Status:** To Do

---

## Overview

Fix `BUG-3`, `BUG-4`, `BUG-6`, and `UX-6` from the Widget Library report.

Template save/create needs visible feedback. Template lists need row actions for
Edit, Duplicate, and Delete so editors can clean duplicated/test templates
without opening each editor. The Templates tab also needs `New Template` to read
as the primary creation CTA rather than a weak link beside filters. Duplicate
names should not silently create multiple indistinguishable rows.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/services/widgetTemplatesClient.ts`
- `core/services/widgets/widgetTemplateService.ts`
- `core/server/routes/widgetTemplateRoutes.ts`
- `tests/vitest/ui/widget-template-editor.test.tsx`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
- `tests/integration/routes/widgetTemplates.test.ts`

## Implementation Direction

Use existing template service/route owners. Add helpers only where the same
logic is reused by create/update/duplicate/delete.

Pseudocode:

```ts
async function handleSave() {
  const action = isNew ? "create" : "update";
  try {
    const saved = await saveTemplate(input);
    widgetTemplateToasts.success(action, saved.name);
    if (isNew) navigate(templateEditHref(saved.id));
  } catch (error) {
    widgetTemplateToasts.error(action, error);
    setError(resolveWidgetTemplateError(error));
  }
}
```

Duplicate service:

```ts
const source = await getWidgetTemplate(id);
const name = await buildUniqueTemplateName(`${source.name} copy`);
return createWidgetTemplate({ ...source, id: undefined, name, status: "draft" });
```

Templates-tab CTA:

```tsx
<Button variant="default" asChild>
  <AdminLink href={templateCreateHref}>
    <Plus className="h-4 w-4" />
    New Template
  </AdminLink>
</Button>
```

Keep the CTA in the list header/action area, not hidden inside the category
filter cluster.

Delete action:

```tsx
<ConfirmActionDialog
  title={`Delete ${template.name}?`}
  onConfirm={() => deleteWidgetTemplate(template.id)}
/>
```

## Security Contract

- Visibility: internal admin widget templates.
- Auth model: existing admin session/API-key path.
- RBAC: `widgets:read` for list/edit, `widgets:write` for create/update/delete.
- CSRF: all writes keep CSRF.
- Rate-limit bucket: existing admin write bucket.
- Reject-unknown validation:
  - create/update/duplicate payloads use route schemas;
  - name conflicts map to `widget_template_conflict` or equivalent known code.
- Anti-abuse:
  - delete/duplicate re-check current id/name/status/category;
  - toasts do not include raw blocks/settings payloads;
  - duplicate does not copy volatile revision/runtime preview tokens.

## Testing Requirements

- `tests/vitest/ui/widget-template-editor.test.tsx`
  - create/update success and error toasts;
  - duplicate-name guard display.
- `tests/vitest/ui/widget-library.test.tsx`
  - `New Template` appears as the primary Templates-tab action;
  - row actions are present and delete is confirmed.
- `tests/vitest/admin/widgetTemplatesClient.test.ts`
  - duplicate/delete cache invalidation or update behavior.
- `tests/integration/routes/widgetTemplates.test.ts`
  - duplicate/name conflict route behavior;
  - delete auth/RBAC/CSRF behavior.
- Manual Playwright:
  - save template, duplicate template, delete template from list.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-template-editor.md`
- `_docs/CMS_API.md` if duplicate/name-conflict route contract changes
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache behavior changes

## Acceptance Criteria

1. Template create/update emits visible shared feedback.
2. `New Template` is exposed as the clear primary creation action.
3. Template list exposes Edit/Duplicate/Delete row actions.
4. Delete is confirmed and bounded.
5. Duplicate names are handled intentionally and tested.
