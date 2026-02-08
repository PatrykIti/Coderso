# TASK-050-13-05: Rich Text Section Widget
# FileName: TASK-050-13-05_Rich_Text_Section_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-13-04  
**Status:** Done (2026-02-08)

---

## Overview

Implement Rich Text Section widget for long-form content blocks inside templates.

---

## Scope

- Widget ID: `rich-text-section`
- Variants: `single-column`, `two-column`, `article`
- Model:
  - title block: `eyebrow`, `title`
  - body: `html` or structured rich text payload
  - options: `dropcap`, `toc`, `maxWidth`
  - style: `fontScale`, `lineHeight`, `textColor`, `background`, `spacing`
- Wizard: basic title + body quick start
- Visual: rich text editing + typography controls
- Advanced: technical output options and fallback mode

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/richTextSection.tsx` | new model/schema/defaults/render | secure rendering strategy |
| `core/admin/ui/widgets/editors/RichTextSectionEditors.tsx` | new editors | Visual + formatting controls |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register definition | catalog |
| `tests/unit/widgets/richTextSection.test.tsx` | new tests | schema/defaults/render/sanitization |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | markers + sanitization |
| `tests/unit/ui/widget-template-editor.test.tsx` | add editor integration | visual sections |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/richTextSection.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/RICH_TEXT_SECTION.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-rich-text-section-widget.md`
