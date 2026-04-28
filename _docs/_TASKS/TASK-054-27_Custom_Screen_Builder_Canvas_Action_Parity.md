# TASK-054-27: Custom Screen Builder Canvas Action Parity
# FileName: TASK-054-27_Custom_Screen_Builder_Canvas_Action_Parity.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Small  
**Dependencies:** TASK-054-23, TASK-054-24  
**Status:** Done (2026-03-19)

---

## Overview

`Custom Screen Builder` mial glówne akcje (`Back`, `Save/Create`, `Open records`)
w topbarze shell, podczas gdy `PageEditor` i pozostale buildery grupowaly primary actions
w sticky top sekcji canvasu.

To tworzylo niespojnosc layoutu builderow i rozbijalo rytm UI.

## Sub-Tasks

1. Usunac primary actions z `CustomScreenShell` topbara.
2. Przeniesc je do sticky top canvas section w `CustomScreenEditorPage`.
3. Ulozyc action cluster podobnie do `PageEditor`.
4. Dodac regression test dla nowego układu.

## Testing Requirements

- `bun run vitest run tests/vitest/ui/custom-screens-page.test.tsx`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*.md`

## Completion Notes (2026-03-19)

- `CustomScreenShell` no longer owns save/back actions.
- `CustomScreenEditorPage` now renders builder/preview and save/back actions in the sticky top canvas area.
- The screen builder now follows the same action placement pattern as page builder.
