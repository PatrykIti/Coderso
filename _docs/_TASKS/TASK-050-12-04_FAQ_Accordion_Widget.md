# TASK-050-12-04: FAQ Accordion Widget
# FileName: TASK-050-12-04_FAQ_Accordion_Widget.md

**Priority:** Medium  
**Category:** CMS/Widgets + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-050-12-03  
**Status:** Done (2026-02-08)

---

## Overview

Implement FAQ Accordion widget for objection handling and support content.
Target output: expandable question/answer list with optional section CTA.

---

## Scope

- Widget ID: `faq-accordion`
- Variants:
  - `single-column`
  - `two-column`
  - `compact`
- Model:
  - header: `title`, `description`
  - items[]: `question`, `answer`
  - options: `allowMultipleOpen`, `defaultOpenIndex`
  - style: `surface`, `border`, `divider`, `spacing`
- Wizard:
  - choose layout + add first questions
- Visual:
  - Q/A management and display controls
- Advanced:
  - technical open-state and fallback controls

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/widgets/core/faqAccordion.tsx` | new widget model + schema + defaults + render | deterministic accordion behavior |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | new editors | Visual-first IA |
| `core/admin/ui/widgets/registry.ts` | register editors | wiring |
| `core/widgets/core/index.ts` | register widget definition | core catalog |
| `tests/unit/widgets/faqAccordion.test.tsx` | new tests | schema/defaults/render |
| `tests/unit/widgets/renderer.test.tsx` | add runtime assertions | markers |
| `tests/unit/ui/widget-template-editor.test.tsx` | add editor integration | visual sections |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/widgets/faqAccordion.test.tsx`
- `bun test tests/unit/widgets/renderer.test.tsx`
- `bun test tests/unit/ui/widget-template-editor.test.tsx`

---

## Documentation Updates Required

- `_docs/_WIDGETS/FAQ.md`
- `_docs/WIDGETS.md`
- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-faq-accordion-widget.md`
