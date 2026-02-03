# TASK-050-01: Widget Template Preview
# FileName: TASK-050-01_Widget_Template_Preview.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-049-06, TASK-049-03  
**Status:** Done (2026-02-02)

---

## Overview

Provide a real preview for widget templates from the editor. The preview should
render the template blocks using the same widget renderer used in the runtime,
without publishing.

---

## UX Requirements

- Preview button opens a modal/drawer with a rendered template.
- Device switcher (Desktop / Tablet / Mobile) that changes the preview frame size.
- Read-only mode (no drag/drop or inline edits while preview is open).
- Clear empty-state if template has no blocks.

---

## API / Service Requirements

- Admin-only endpoint to render a template preview.
- Input: template id + optional viewport (width/height or device).
- Output: HTML string or structured blocks + rendered markup.
- Use existing widget renderer (`core/widgets/renderers/widgetRenderer.tsx`) to ensure parity.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/widgets/widgetTemplatePreviewService.ts` | create | render template blocks to HTML/JSX |
| `core/server/routes/widgetTemplateRoutes.ts` | extend | add `/widget-templates/:id/preview` endpoint |
| `core/server/validation/widgetSchemas.ts` | add schema | preview payload validation |
| `core/admin/services/widgetTemplatePreviewClient.ts` | create | call preview endpoint |
| `core/admin/ui/widgets/WidgetTemplatePreviewDialog.tsx` | create | modal with device switcher |
| `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx` | wire | connect Preview button |
| `tests/unit/widgets/widgetTemplatePreviewService.test.ts` | add | renderer output sanity checks |
| `tests/unit/admin/widgetTemplatePreviewClient.test.ts` | add | endpoint wiring |
| `tests/integration/routes/widgetTemplatePreview.test.ts` | add | route registration |

---

## Testing Requirements

- Unit: service renders blocks and handles missing template.
- Unit: client uses correct endpoint + method.
- Integration: route registered + permission guard.

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (template preview behavior)
- `_docs/PREVIEW_SPEC.md` (admin preview for templates)
- `_docs/README.md` (if a new doc file is added)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-template-preview.md`
