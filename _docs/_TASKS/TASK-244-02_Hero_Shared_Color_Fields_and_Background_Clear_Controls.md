# TASK-244-02: Hero, Shared Color Fields, and Background Clear Controls

# FileName: TASK-244-02_Hero_Shared_Color_Fields_and_Background_Clear_Controls.md

**Priority:** High
**Category:** Widgets + Hero + Editor Controls
**Estimated Effort:** Large
**Dependencies:** TASK-244-01
**Status:** To Do

---

## Overview

Fix the most visible surface-clear issue first: Hero background gradient and
background-related controls. Use this work to establish reusable editor patterns
for color/background clear buttons without widening into unrelated token work.

## Sub-Tasks

- [ ] TASK-244-02-01: Hero Gradient, Background, and Media Overlay Clear
- [ ] TASK-244-02-02: Shared Clear Field Controls and Section No-Regression

## Files to Change

- `core/widgets/core/hero.tsx`
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- shared editor helpers only if they avoid repeated clear-button logic without
  adding runtime coupling
- `core/widgets/core/section.tsx` only for no-regression tests or helper reuse
- `core/admin/ui/widgets/editors/SectionEditors.tsx` only if shared clear-field
  controls are introduced there too

## Implementation Order

1. Add Hero clear behavior for background gradient.
2. Add clear behavior for background color and media overlay fields where they
   are user-editable style values.
3. Ensure runtime omits `backgroundImage`, overlay DOM, and cleared inline style
   output.
4. Extract small editor helper components only after Hero behavior is proven.
5. Add Section no-regression coverage if shared helpers touch section controls.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx tests/vitest/widgets/heroEditors.test.tsx tests/vitest/ui/hero-editor-wave.test.tsx`
- Section no-regression suite if Section editor/runtime is touched.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/_WIDGETS/SECTION.md` only if shared controls or docs change
- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` status only when this subtask moves state

## Acceptance Criteria

1. Hero gradient can be cleared from the editor.
2. Clear removes Hero background style fields from emitted widget data.
3. Hero runtime does not render cleared gradient/background/overlay output.
4. Section behavior remains stable if shared controls are reused.
