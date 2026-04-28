# TASK-009-11: Widgets UI Wiring
# FileName: TASK-009-11_Widgets_UI_Wiring.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-009-01..10, TASK-010  
**Status:** Done (2026-01-30)  

---

## Overview

Po implementacji widgetów core, trzeba je podpiąć do UI Page Buildera:
- lista widgetów (library) z registry,
- tworzenie bloków z defaults,
- edytory wizard/visual/advanced pobierane z registry,
- live preview w Page Builder.

---

## Implementation Checklist

| File | Change | Notes |
| --- | --- | --- |
| `core/ui/pages/builder/BlockLibrary.tsx` | update | lista widgetów z registry |
| `core/ui/pages/builder/BlockList.tsx` | update | render block labels z registry |
| `core/ui/pages/builder/WizardPanel.tsx` | update | dynamic editor wizard |
| `core/ui/pages/builder/VisualPanel.tsx` | update | dynamic editor visual |
| `core/ui/pages/builder/AdvancedPanel.tsx` | update | dynamic editor advanced |
| `core/ui/widgets/WidgetLibraryPage.tsx` | update | kategorie + registry |
| `tests/unit/pageBuilder/*` | update | registry integration |

---

## UX Rules

- Widgety pojawiają się w library z tytułem + opisem + kategorią.
- Dodanie widgetu do strony tworzy blok z `defaults`.
- Zmiana wariantu aktualizuje blok + edytor.
- Wizard/Visual/Advanced korzystają z `definition.editor.*`.

---

## Testing Requirements

- Widget library renders registry items
- Wizard panel loads correct editor for selected widget
- Switching variant updates block data

---

## Docs

- `_docs/WIDGETS.md` (UI wiring section)

---

## Changelog (planned)

- `_docs/_CHANGELOG/{N}-YYYY-MM-DD-widget-registry-and-core-widgets.md`
