# TASK-197: Pages Builder Library Panel Scroll Containment
# FileName: TASK-197_Page_Builder_Library_Panel_Scroll_Containment.md

**Priority:** Medium
**Category:** CMS/Pages + Builder + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-194-04-02
**Status:** Done (2026-04-23)

---

## Overview

Repair the Pages editor left builder rail so the library list actually scrolls.

The shipped builder already uses the correct surface split:

- `PageEditor` owns the shell and mobile sheet,
- `LibraryPanel` owns the `Widgets / Templates / Forms` tabs,
- each picker owns its searchable list through a `ScrollArea`.

The regression is layout-level, not product-level: the tab/picker stack was not
fully height-constrained, so the scroll gesture could land on an outer wrapper
instead of the list viewport. The fix must keep the current surface and only
restore predictable scroll containment.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/builder/LibraryPanel.tsx`
  - constrain the tab shell with `min-h-0` / `overflow-hidden`,
  - keep the tab strip fixed while the active picker owns scrolling.
- `core/admin/ui/pages/builder/WidgetPicker.tsx`
  - keep the search/header area `shrink-0` so the list viewport consumes the
    remaining height.
- `core/admin/ui/pages/builder/TemplatePicker.tsx`
  - match the widget-picker height contract and ensure the template list
    scrolls inside its own `ScrollArea`.
- `core/admin/ui/pages/builder/FormPicker.tsx`
  - match the same height/scroll contract for forms.
- `core/admin/ui/pages/PageEditor.tsx`
  - keep the mobile builder sheet bounded so it reuses the same internal scroll
    surface instead of introducing a second scrolling parent.
- `tests/vitest/pageBuilder/pickers.test.tsx`
  - lock the picker root layout contract (`min-h-0`, `overflow-hidden`) so the
    regression cannot come back through a CSS-only refactor.
- `tests/vitest/ui/page-editor.test.tsx`
  - verify the real Pages editor HTML keeps the tab shell and active scroll area
    height-constrained.

## Implementation Direction

- Do not introduce a new dialog, wrapper route, or second library surface.
- Keep the current ownership chain:
  - `PageEditor` owns desktop/mobile shell placement,
  - `LibraryPanel` owns tab containment,
  - `WidgetPicker` / `TemplatePicker` / `FormPicker` own their list viewport.
- Prefer the existing repo pattern used in other editor surfaces:
  - fixed header/tab strip,
  - `min-h-0` on flex children,
  - `overflow-hidden` on the bounded parent,
  - `ScrollArea` as the only scrolling child for long lists.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/pageBuilder/pickers.test.tsx tests/vitest/ui/page-editor.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-editor-shell-wave.test.tsx`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/724-2026-04-23-task-197-pages-builder-library-scroll-containment.md`

## Acceptance Criteria

1. In the Pages editor left rail, the visible library list scrolls for
   `Widgets`, `Templates`, and `Forms`.
2. The tab strip and search field stay fixed while the list moves.
3. Mobile sheet parity uses the same contained-scroll contract.
4. The fix does not introduce a new builder surface or change insert behavior.
