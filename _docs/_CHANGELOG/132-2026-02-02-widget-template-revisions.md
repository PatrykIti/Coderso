# Widget template revisions and library fixes

## Summary
- Added widget template revisions table, service, and restore flow (with audit logging).
- Wired revision history drawer + client endpoints in the template editor.
- Hardened widget library filters and insert dialog block options.

## Tasks
- TASK-050-02

## Files touched
- `core/db/schema.ts`
- `core/db/migrations/0030_widget_template_revisions.sql`
- `core/services/widgets/widgetTemplateRevisionService.ts`
- `core/services/widgets/widgetTemplateService.ts`
- `core/server/routes/widgetTemplateRoutes.ts`
- `core/admin/services/widgetTemplateRevisionsClient.ts`
- `core/admin/ui/widgets/WidgetTemplateRevisionDrawer.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetInsertDialog.tsx`
- `core/admin/ui/widgets/widgetInsertUtils.ts`
- `core/admin/ui/widgets/widgetLibraryUtils.ts`
- `tests/unit/widgets/widgetTemplateRevisionService.test.ts`
- `tests/unit/admin/widgetTemplateRevisionsClient.test.ts`
- `tests/integration/routes/widgetTemplateRevisions.test.ts`
- `tests/unit/ui/widgetLibraryUtils.test.ts`
- `tests/unit/ui/widgetInsertUtils.test.ts`
- `tests/utils/db.ts`
- `_docs/WIDGETS.md`
- `_docs/DATA_MODEL.md`
- `_docs/AUDIT_SPEC.md`
