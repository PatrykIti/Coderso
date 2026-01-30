# TASK-009-09: Core Widget – Footer
# FileName: TASK-009-09_Core_Widget_Footer.md

**Priority:** Medium  
**Category:** CMS/Widgets  
**Estimated Effort:** Medium  
**Dependencies:** TASK-009-01, TASK-009-02, TASK-006  
**Status:** To Do  

---

## Overview

Implement core widget **Footer** zgodnie z `_docs/_WIDGETS/FOOTER.md`.
Wspiera kolumny linków i dane kontaktowe.

---

## Implementation Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/widgets/core/footer.tsx` | new | schema + defaults + render + registerWidget |
| `core/ui/widgets/editors/FooterEditor.tsx` | new | wizard/visual/advanced |
| `tests/unit/widgets/footer.test.tsx` | new | render defaults |

---

## Renderer Notes

- Columns with title + links.
- Optional contact block.
- Use tokens for background/text.

---

## Editor Notes

- Wizard: number of columns + toggle contact.
- Visual: variant preview.
- Advanced: spacing, alignment.

---

## Testing Requirements

- render default footer
- validator rejects empty columns

---

## Docs

- Update `_docs/_WIDGETS/FOOTER.md` if schema changes

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
