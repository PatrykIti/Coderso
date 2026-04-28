# TASK-049-06: Widget Template Editor UI
# FileName: TASK-049-06_Widget_Template_Editor_UI.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-049-03, TASK-010  
**Status:** Done (2026-02-02)

---

## Overview

Allow editing a **widget template** using the existing Page Builder UI.
Templates store `blocks` and can be inserted into pages later.

---

## UI/UX

- Route: `/widgets/templates/:id`
- Layout reuses Page Builder:
  - left: widget library (core)
  - center: canvas
  - right: inspector
- Save button persists to `PATCH /widgets/templates/:id` (`blocks` only).
- Breadcrumb: `Widgets / Templates / {templateName}`

**User-friendly guidance:**
- Show template name + description at top with inline edit.
- Provide visual “empty state” explaining how to add widgets.
- Include “Preview” (opens modal) using existing preview renderer.

---

## UI Layout (detailed)

**Header bar**
- Left: breadcrumb + template status pill (draft/published).
- Center: template name (inline editable) + description (inline editable).
- Right: `Preview` + `Save` + `Discard`.

**Canvas**
- Uses Page Builder center column.
- Empty state: “Drag widgets here to build a reusable template.”

**Right panel (Details)**
- Same inspector as Page Builder (Wizard/Visual/Advanced).
- Small sticky header: active widget name + quick actions.

**Mobile behavior**
- Canvas only by default.
- Two floating actions: `Widgets` and `Details` (open drawers).

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx` | create | builder reuse |
| `core/admin/app/AdminApp.tsx` | add route | `/widgets/templates/:id` |
| `core/admin/services/widgetClient.ts` | add `getTemplate` + `updateTemplate` | API wiring |
| `core/admin/ui/pages/builder/*` | reuse | no duplication |

---

## Example Save Flow (pseudo)

```ts
const template = await getWidgetTemplate(id);
setBlocks(template.blocks ?? []);

const handleSave = async () => {
  await updateWidgetTemplate(id, { blocks });
  toast.success("Template saved");
};
```

---

## Testing Requirements

- `tests/integration/ui/widget-template-editor.test.tsx`
  - loads template
  - save sends PATCH

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-template-editor-ui.md`
