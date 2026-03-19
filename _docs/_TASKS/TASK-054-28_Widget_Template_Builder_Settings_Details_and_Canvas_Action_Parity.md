# TASK-054-28: Widget Template Builder Settings, Details, and Canvas Action Parity
# FileName: TASK-054-28_Widget_Template_Builder_Settings_Details_and_Canvas_Action_Parity.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-24, TASK-054-27  
**Status:** Done (2026-03-19)

---

## Overview

`WidgetTemplateEditorPage` ma jeszcze niespojną kompozycję buildera względem `PageEditor`
i poprawionego `CustomScreenEditorPage`:
- template-level metadata (`name`, `description`, `category`) siedzi nad canvasem,
- prawa kolumna jest tylko dla block details,
- główne akcje buildera siedzą w topbarze shell zamiast w sticky canvas area.

Celem follow-upu jest:
- przenieść template-level metadata do prawej kolumny jako tab `Settings`,
- zachować tab `Details` wyłącznie dla aktywnego widgetu,
- ustawić `Settings` jako domyślny tab po wejściu,
- przenieść główne akcje do sticky top sekcji canvasu, zgodnie z patternem builderów.

## Sub-Tasks

1. Dodać prawy panel z tabami `Settings` / `Details`.
2. Przenieść `name`, `description`, `category` i template-level layout settings do `Settings`.
3. Zostawić `Details` jako panel opcji aktywnego widgetu.
4. Przenieść `Runtime Preview`, `Discard`, `Save Template` z shell topbara do sticky canvas area.
5. Dodać regresję dla nowego układu.

## Testing Requirements

- `bun run vitest run tests/vitest/ui/widget-template-editor.test.tsx`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`

## Completion Notes (2026-03-19)

- `WidgetTemplateEditorPage` now defaults the right column to `Settings`.
- Template metadata (`name`, `description`, `category`, `status`) moved into the `Settings` tab.
- Block-level options now live under `Details`.
- Primary actions were moved out of shell topbar and into the sticky canvas action area.
