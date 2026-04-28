# TASK-053-01: Page Builder Templates Mode (Template Sections)
# FileName: TASK-053-01_Page_Builder_Templates_Mode.md

**Priority:** High  
**Category:** CMS/Pages + Admin/UI + Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-049-02, TASK-049-06, TASK-052-04  
**Status:** Done (2026-02-14)  

---

## Overview

Add a Templates mode to the Page Editor so users can insert **widget templates** as reusable page sections. A page can contain many template sections, reorder them, and mix them with normal widgets.

This keeps the **page wrapper template** (theme-level) as a single selection in Page Settings, but introduces **template sections** as content building blocks.

---

## Scope

1. Introduce a new core widget type: `template-section`.
2. Allow Page Editor left panel to switch between **Widgets** and **Templates**.
3. Templates tab lists widget templates and inserts them as `template-section` blocks.
4. Runtime resolves template section blocks into their blocks and renders them in order.
5. Editor supports reordering and deletion of template sections like any other block.
6. Provide a minimal editor UI for template sections (template name + change template action).

---

## Data Model

```ts
// template-section widget data
{
  templateId: string; // widget template id
  templateName?: string;
  resolved?: {
    blocks: WidgetBlock[];
  };
}
```

---

## Pseudocode

```ts
// publicSite.tsx (runtime hydration)
if (block.type === "template-section") {
  const data = ensureRecord(block.data);
  const templateId = readTemplateId(data);
  const resolved = await resolveTemplateSectionRuntimeData(templateId);
  nextBlock = {
    ...block,
    data: {
      ...data,
      resolved,
    },
  };
}
```

```tsx
// template-section renderer
if (!data.resolved?.blocks?.length) {
  return <TemplateSectionPlaceholder />;
}
return (
  <div data-template-section={data.templateId}>
    {data.resolved.blocks.map((child) => (
      <WidgetRenderer key={child.id} block={child} />
    ))}
  </div>
);
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/templateSection.tsx` | new | widget definition + schema + renderer |
| `core/widgets/core/index.ts` | update | register new widget |
| `core/widgets/runtime.tsx` | update | register new widget in runtime |
| `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx` | new | wizard/visual/advanced editors |
| `core/admin/ui/widgets/editors/index.ts` | update | export editors |
| `core/admin/ui/pages/builder/TemplatePicker.tsx` | new | list widget templates + insert |
| `core/admin/ui/pages/builder/WidgetPicker.tsx` | update | optional shared layout / tabs |
| `core/admin/ui/pages/PageEditor.tsx` | update | add Widgets/Templates tabs in left panel |
| `core/admin/services/widgetTemplatesClient.ts` | reuse | list templates for picker |
| `core/services/widgets/widgetTemplateService.ts` | reuse | load template by id |
| `core/services/widgets/templateSectionRuntime.ts` | new | resolve template blocks for runtime |
| `core/server/publicSite.tsx` | update | hydrate template-section blocks |
| `tests/unit/widgets/templateSection.test.tsx` | new | schema + renderer fallback |
| `tests/unit/site/publicRenderer.test.tsx` | update | template-section rendering path |
| `tests/unit/ui/page-editor.test.tsx` | update | tabs + template picker rendering |

---

## Acceptance Criteria

1. Page editor shows **Widgets** and **Templates** tabs on the left.
2. Templates tab lists widget templates and inserts `template-section` blocks.
3. A page can include multiple template sections and reorder them.
4. Runtime + preview render template sections deterministically.
5. Missing template produces a safe placeholder (no crash).

---

## Testing Requirements

- `bun test tests/unit/widgets/templateSection.test.tsx`
- `bun test tests/unit/site/publicRenderer.test.tsx`
- `bun test tests/unit/ui/page-editor.test.tsx`
- `bun --cwd core lint && bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (template-section block contract)
- `_docs/WIDGETS.md` (template sections overview)
- `_docs/_WIDGETS/TEMPLATE_SECTION.md` (new spec)
- `_docs/CMS_SPEC.md` (page builder templates mode)
