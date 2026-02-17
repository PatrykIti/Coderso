# TASK-038-06: Form Embed Widget and Page Editor Tab
# FileName: TASK-038-06_Form_Embed_Widget_and_Page_Editor_Tab.md

**Priority:** Medium  
**Category:** CMS/Forms  
**Estimated Effort:** Large  
**Dependencies:** TASK-038-05, TASK-078, TASK-129  
**Status:** Planned

---

## Overview
Add a reusable Form Embed widget and a new “Forms” tab in the Page Editor’s left library panel. This allows editors to insert a form block directly into pages and reuse existing form definitions.

## Goals
- A first-class Form Embed widget that renders real form definitions.
- Page Editor library gains a “Forms” tab (Widgets / Templates / Forms).
- Editors can select a form and insert it into the page with one click.
- Runtime submissions continue to use `/forms/:id/submissions` with bot protection.
- Rich widget controls (layout + style) to match other widgets.

## Runtime Strategy (Internal Only)
- No public read endpoint for form definitions.
- Public render resolves form + fields internally (published only).
- Preview mode can resolve drafts for authenticated preview.
- This mirrors existing runtime hydration (content list, entry teaser, navigation) in `core/server/publicSite.tsx`.

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/services/forms/formRuntimeResolver.ts` | New helper to resolve published form + fields (and draft for preview). |
| `core/server/publicSite.tsx` | Hydrate `form-embed` blocks via `resolveFormRuntimeData`. |
| `core/widgets/core/formEmbed.tsx` | New widget rendering a form from resolved schema. |
| `core/widgets/registry.ts` | Register widget under category `forms`. |
| `core/admin/ui/widgets/editors/FormEmbedEditors.tsx` | Editor UI: select form, labels, success message, layout + style controls. |
| `core/admin/ui/pages/builder/LibraryPanel.tsx` | Add a `Forms` tab (third tab). |
| `core/admin/ui/pages/builder/FormPicker.tsx` | New picker list + search using `listFormsCached`. Render cards for each form. |
| `core/admin/ui/pages/PageEditor.tsx` | Wire `onAddForm` to insert Form Embed widget data. |
| `core/admin/ui/widgets/WidgetLibraryPage.tsx` | Ensure the form widget is visible in the library under Forms. |
| `tests/unit/widgets/formEmbed.test.tsx` | Widget schema + render rules. |
| `tests/unit/ui/form-picker.test.tsx` | Picker renders cards + emits add action. |

## Forms Tab (Cards UX)
- Render cards for each form with:
  - Title = `form.name`
  - Subtitle = `form.description`
  - Status badge + last updated
  - Quick action: “Insert”
- Search + empty states consistent with Templates picker.
- Responsive grid (1 col mobile, 2–3 cols desktop).

## Form Embed Widget (Richer Controls)
Suggested options in `FormEmbedEditors`:
- Form selection + optional override title/subtitle.
- Layout: single column / two column.
- Show labels toggle.
- Show required indicator toggle.
- Button label override + alignment.
- Success message text.
- Spacing: compact / comfortable.
- Visual: background style (none / card), border radius, input size.

## Pseudocode

### Insert form from picker
```ts
onSelect(form) => {
  onAddWidget("form-embed", {
    formId: form.id,
    title: form.name,
  });
}
```

### Runtime hydration (internal)
```ts
const resolved = await resolveFormRuntimeData(formId, { preview });
block.data = { ...data, resolved };
```

## UX Notes
- Empty state in Forms tab should prompt to create a form (link to `/admin/forms`).
- If selected form is deleted, show a warning + allow reselect.
- Surface submission success + error states consistently with other widgets.

## Documentation Updates Required
- `_docs/_WIDGETS/FORM_EMBED.md` (new widget contract)
- `_docs/ADMIN_CACHE_MAP.md` (forms picker cache usage)

## Changelog Entry (planned)
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-forms-embed-widget.md`
