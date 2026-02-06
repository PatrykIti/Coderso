# TASK-050: Widget Templates Preview and Revision History
# FileName: TASK-050_Widget_Templates_Preview_and_Revisions.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-049-03, TASK-049-06  
**Status:** In Progress (Phase 2)

---

## Overview

Phase 1 delivered preview + revisions. Phase 2 expands the widget system with
slot-based nesting and richer, document-driven widget configuration for
Hero, Navigation, and Footer (wizard/visual/advanced).

---

## Sub-Tasks

- **TASK-050-01:** Widget Template Preview
- **TASK-050-02:** Widget Template Revision History
- **TASK-050-03:** Widget Nesting (Insert Into Existing Block)
- **TASK-050-04:** Slot System Core (block model + insert UI + rendering)
- **TASK-050-05:** Hero Widget Expansion + Slots
- **TASK-050-05-01:** Hero Widget Bugfixes and UX Hardening
- **TASK-050-05-02:** Hero Widget Visual Rebuild and Advanced Cleanup
- **TASK-050-06:** Navigation Widget Expansion + Slots
- **TASK-050-07:** Footer Widget Expansion + Slots
- **TASK-050-08:** Timeline Widget Expansion
- **TASK-050-09:** Compare Timeline Widget Expansion
- **TASK-050-10:** Newsletter Widget Expansion
- **TASK-050-11:** Contact Widget Expansion

---

## Testing Requirements

- Each sub-task must list and implement unit + integration tests.
- Run lint and typecheck for admin + server changes.

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (slot model + widget definition updates)
- `_docs/PAGE_MODEL.md` (slot-based blocks schema)
- `_docs/_WIDGETS/HERO.md` (expanded wizard/visual/advanced + slots)
- `_docs/_WIDGETS/NAVIGATION.md` (expanded wizard/visual/advanced + slots)
- `_docs/_WIDGETS/FOOTER.md` (expanded wizard/visual/advanced + slots)
- `_docs/_WIDGETS/TIMELINE.md` (expanded wizard/visual/advanced)
- `_docs/_WIDGETS/COMPARE_TIMELINE.md` (expanded wizard/visual/advanced)
- `_docs/_WIDGETS/NEWSLETTER.md` (expanded wizard/visual/advanced)
- `_docs/_WIDGETS/CONTACT.md` (expanded wizard/visual/advanced)
- `_docs/README.md` (index if new docs are added)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-template-preview-revisions.md`
