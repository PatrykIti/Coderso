# TASK-054-26: Widget Library CTA Clarity and Template-Only Authoring
# FileName: TASK-054-26_Widget_Library_CTA_Clarity_and_Template_Only_Authoring.md

**Priority:** Medium  
**Category:** Admin/UI + Documentation  
**Estimated Effort:** Small  
**Dependencies:** TASK-054-24, TASK-054-25  
**Status:** Done (2026-03-19)

---

## Overview

Przycisk `Create Widget` w `Widget Library` byl mylacy, bo nie tworzyl nowego
widget type w registry. W praktyce otwieral dialog zapisujacy `widget_template`.

To wprowadzało falszywe oczekiwanie, ze admin moze z UI stworzyc nowy realny widget,
podczas gdy obecny flow wspiera tylko:
- przegladanie core widgets,
- wstawianie widgetow do pages/templates,
- tworzenie reusable templates przez `New Template`.

## Sub-Tasks

1. Usunac CTA `Create Widget` z `Widget Library`.
2. Zostawic `New Template` jako jedyny jawny authoring CTA w tym obszarze.
3. Dopisac docs, ze nowe widget types nie sa tworzone z admin UI.

## Testing Requirements

- `bun run vitest run tests/vitest/ui/widget-library.test.tsx tests/vitest/ui/widgetLibraryUtils.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`

## Completion Notes (2026-03-19)

- Removed the misleading `Create Widget` CTA from `Widget Library`.
- `New Template` remains the explicit authoring path for reusable admin-created structures.
- Documented that real widget types are still code/plugin-authored, not admin-authored.
