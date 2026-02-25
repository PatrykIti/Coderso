# TASK-063-12-07: Responsive Parity, Focus Mode, and Sheets
# FileName: TASK-063-12-07_Responsive_Parity_FocusMode_and_Sheets.md

**Priority:** High  
**Category:** Admin/UI + Responsive UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-03, TASK-063-12-04, TASK-063-12-06  
**Status:** To Do

---

## Overview
Domknac parity behavior dla desktop/tablet/mobile:
- desktop: stabilny 3-column layout jak referencja,
- mobile/tablet: side panels jako sheets bez utraty flow,
- focus mode: deterministic hide/show side rails + persistencja.

---

## Scope
1. Ustalic responsive breakpoints i widths regionow.
2. Zapewnic spojnosc content order miedzy desktop i mobile.
3. Ujednolicic focus mode interaction z sidebars i sheets.
4. Ograniczyc layout jumps i preserve scroll context.

---

## Sub-Tasks
1. Refactor `PostEditorLayout` breakpoint logic.
2. Ujednolicic region wrappers (`PostEditorRegions`) pod parity spacing.
3. Dopasowac sheet semantics i accessibility labels.
4. Dodac regression tests dla responsive + focus mode.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `tests/integration/ui/post-editor-layout-responsive.test.tsx`
- `tests/integration/ui/post-editor-smoke-regression.test.tsx`

---

## Pseudocode
```ts
if (desktop && !focusMode) {
  showLeftRail(64);
  showRightRail(80);
}
if (mobile && !focusMode) {
  showLeftSheet();
  showRightSheet();
}
if (focusMode) {
  hideLeftAndRight();
  keepPrimaryHeaderActions();
}
```

---

## Acceptance Criteria
1. Desktop layout zachowuje staly kontrakt width i hierarchy.
2. Mobile sheets zachowuja ten sam logiczny flow paneli.
3. Focus mode dziala przewidywalnie i nie gubi state paneli.

---

## Testing Requirements
- Integration UI:
  - desktop rail visibility and widths
  - mobile sheets open/close behavior
  - focus mode transition behavior
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-layout-responsive.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (responsive/focus contracts)
- `_docs/CODERSO_MODULES.md`
