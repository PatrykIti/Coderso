# TASK-009: Widget Registry and Core Widgets (Index)
# FileName: TASK-009_Widget_Registry_and_Core_Widgets.md

**Priority:** High  
**Category:** CMS/Widgets  
**Estimated Effort:** Large  
**Dependencies:** TASK-002, TASK-007  
**Status:** Done (2026-01-30)  

---

## Overview

Budujemy pełny system widgetów (registry + walidacja + render pipeline) oraz
bazowe widgety Core v1. Po zakończeniu tego taska można projektować i wdrażać
widgety w UI (wizard/visual/advanced) i renderować je w runtime.

Zakres obejmuje:
- kontrakt widgetu,
- rejestrację i walidację schematów,
- render pipeline bloków,
- core widgets (hero, timeline, compare timeline, newsletter, contact, navigation, footer),
- wiring z UI (page builder + widget library + editor trybów).

---

## Sub-Tasks (Physical Files)

1. `TASK-009-01_Widget_Registry.md`
2. `TASK-009-02_Widget_Schema_Validation.md`
3. `TASK-009-03_Core_Widget_Hero.md`
4. `TASK-009-04_Core_Widget_Timeline.md`
5. `TASK-009-05_Core_Widget_Compare_Timeline.md`
6. `TASK-009-06_Core_Widget_Newsletter.md`
7. `TASK-009-07_Core_Widget_Contact.md`
8. `TASK-009-08_Core_Widget_Navigation.md`
9. `TASK-009-09_Core_Widget_Footer.md`
10. `TASK-009-10_Widget_Renderer_Pipeline.md`
11. `TASK-009-11_Widgets_UI_Wiring.md`

---

## Documentation Updates Required

- `_docs/WIDGETS.md` (pełny kontrakt + authoring guide)
- `_docs/_WIDGETS/*.md` (jeśli schematy się zmienią)
- `_docs/ARCHITECTURE.md` (sekcja widgets runtime)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-widget-registry-and-core-widgets.md`
