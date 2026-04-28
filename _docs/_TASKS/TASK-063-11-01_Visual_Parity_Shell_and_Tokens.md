# TASK-063-11-01: Visual Parity Shell and Tokens
# FileName: TASK-063-11-01_Visual_Parity_Shell_and_Tokens.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-10-02  
**Status:** Done (2026-02-24)

---

## Overview
Ustawic shell/layout/tokens post editora tak, aby wygladal jak referencyjny `code.html`:
- struktura paneli,
- spacing,
- density,
- typography,
- border/shadow rules.

---

## Scope
1. Mapowanie visual tokens (font sizes, uppercase labels, separators, borders).
2. Ujednolicenie lewego i prawego raila pod reference proportions.
3. Uporzadkowanie header spacing i alignment.
4. Zero ingerencji w backend/API.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`

---

## Pseudocode
```ts
layout.columns = {
  left: "256px",
  center: "fluid",
  right: "320px",
};

applyEditorThemeClass("post-editor-parity");
```

---

## Acceptance Criteria
1. Region proportions i hierarchy odpowiadaja referencji.
2. Header i sidebars maja przewidywalny spacing i typografie.
3. Brak regresji routingu i renderu shella.

---

## Testing Requirements
- Integration UI: layout shell snapshot/assertions for region structure.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
