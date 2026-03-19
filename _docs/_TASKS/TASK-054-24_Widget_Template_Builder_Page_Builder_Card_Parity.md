# TASK-054-24: Widget Template Builder Page Builder Card Parity
# FileName: TASK-054-24_Widget_Template_Builder_Page_Builder_Card_Parity.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-054-14, TASK-054-23  
**Status:** Done (2026-03-19)

---

## Overview

Widget template builder mial inny renderer kart po lewej stronie niz page builder.
To tworzylo niepotrzebna niespojnosc wizualna i interakcyjna, mimo ze oba flow
operuja na tym samym katalogu page/template widgets.

Celem bylo przepiecie template buildera na ten sam `WidgetPicker` / card pattern co
page builder, bez zmiany source listy widgetow.

## Sub-Tasks

1. Przepiac lewy panel biblioteki w `WidgetTemplateEditorPage` na `WidgetPicker`.
2. Zachowac filtrowanie po kategorii i drag-and-drop insert flow.
3. Potwierdzic testami, ze page builder nie regreuje, a template builder renderuje ten sam picker pattern.

## Testing Requirements

- `bun run vitest run tests/vitest/pageBuilder/pickers.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`

## Completion Notes (2026-03-19)

- `WidgetTemplateEditorPage` now reuses `WidgetPicker`.
- Template builder keeps its own widget source and category filter, but the cards now match page builder visually and structurally.
