# TASK-054-25: Widget Library Default Tab and Count Alignment
# FileName: TASK-054-25_Widget_Library_Default_Tab_and_Count_Alignment.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-054-14, TASK-054-16  
**Status:** Done (2026-03-19)

---

## Overview

Widget Library startowala z aktywnym tabem `Recommended`, co bylo zgodne z
composite-first strategy, ale w praktyce mylilo users:
- kategorie po lewej sugerowaly pelny katalog,
- prawa kolumna startowala na zawężonym zbiorze composite widgets,
- sam label `Recommended` nie byl wystarczajaco jasny bez dodatkowego kontekstu.

Ten follow-up ustawia `All widgets` jako domyslny tab i spina badge counts po lewej
z tym samym filtrem bazowym, ktory zasila grid po prawej.

## Sub-Tasks

1. Zmienic domyslny `widgetTab` na `all`.
2. Zsynchronizowac counts po lewej z tym samym filtrem co grid.
3. Dodac regression tests dla default active tab i count helpers.

## Testing Requirements

- `bun run vitest run tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widgetLibraryUtils.test.ts`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/WIDGETS_COMPOSITE_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`

## Completion Notes (2026-03-19)

- `All widgets` is now the default active tab in Widget Library.
- `Recommended` remains available as a composite-only helper filter.
- Widget category counts now use the same filter basis as the widget grid.
