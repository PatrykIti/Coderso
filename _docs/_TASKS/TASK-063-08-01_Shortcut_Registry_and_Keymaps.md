# TASK-063-08-01: Shortcut Registry and Keymaps
# FileName: TASK-063-08-01_Shortcut_Registry_and_Keymaps.md

**Priority:** High  
**Category:** Accessibility + UX  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-08  
**Status:** Done (2026-03-02)

---

## Overview
Dodac centralny registry skrotow klawiaturowych dla posts editora.

---

## Scope
1. Skroty dla inserter/list view/details, plus core formatting.
2. Unikac kolizji ze skrotami przegladarki/systemu.
3. Expose helper do help modal/tooltip hints.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/hooks/usePostEditorShortcuts.ts`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `tests/integration/ui/post-editor-keyboard-a11y.test.tsx`

---

## Pseudocode
```ts
register("mod+shift+i", toggleInserter)
register("mod+shift+o", toggleListView)
register("esc", closeActivePanel)
```

---

## Acceptance Criteria
1. Skroty dzialaja i nie konfliktuja z input typing.
2. Mozna je centralnie utrzymywac.

---

## Testing Requirements
- Integration: shortcut dispatch per panel state.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
