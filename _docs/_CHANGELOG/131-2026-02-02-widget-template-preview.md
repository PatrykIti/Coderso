# Widget template preview

## Summary
- Added server-side widget template preview rendering via runtime `WidgetRenderer`.
- Wired admin preview dialog with device switcher and iframe rendering.
- Added validation, client wiring, and tests for preview endpoint.

## Tasks
- TASK-050-01

## Files touched
- `core/services/widgets/widgetTemplatePreviewService.tsx`
- `core/server/routes/widgetTemplateRoutes.ts`
- `core/server/validation/widgetSchemas.ts`
- `core/admin/services/widgetTemplatePreviewClient.ts`
- `core/admin/ui/widgets/WidgetTemplatePreviewDialog.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx`
- `tests/unit/widgets/widgetTemplatePreviewService.test.ts`
- `tests/unit/admin/widgetTemplatePreviewClient.test.ts`
- `tests/integration/routes/widgetTemplatePreview.test.ts`
- `_docs/WIDGETS.md`
- `_docs/PREVIEW_SPEC.md`
