# TASK-063-12-07: Responsive Parity, Focus Mode, and Sheets
# FileName: TASK-063-12-07_Responsive_Parity_FocusMode_and_Sheets.md

**Priority:** High  
**Category:** Admin/UI + Responsive UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-03, TASK-063-12-04, TASK-063-12-06  
**Status:** Done (2026-02-25)

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

## Current State Analysis (Repo)
1. `PostEditorLayout` uzywa jednego breakpointu `min-width: 1024px` dla desktop/mobile split.
2. Rails (`w-64`/`w-80`) sa renderowane warunkowo na desktopie, a na mobile panele ida przez `Sheet`.
3. `usePostEditorLayout` przy wlaczeniu focus mode zamyka panele, ale nie przywraca deterministycznie poprzedniego stanu po wyjsciu.
4. Testy responsive/smoke pokrywaja podstawowe scenariusze, ale nie waliduja restore state po focus mode.

---

## Delta vs Reference
1. Referencja implikuje stabilny desktopowy 3-column layout (`left rail + canvas + right rail`).
2. Aktualny layout przy pewnych toggle flow moze byc mniej stabilny geometrycznie.
3. Potrzebny jest deterministic contract dla focus mode: hide -> restore.

---

## Final Implementation Decisions
1. Desktop/tablet (`>=1024`) utrzymuje 3-column composition jako default parity mode.
2. Mobile (`<1024`) korzysta z left/right sheets.
3. Focus mode:
   - wejscie: ukrywa panele,
   - wyjscie: przywraca poprzedni stan paneli (snapshot restore).
4. Region widths pozostaja zgodne z parity (`w-64`, `w-80`), z opcjonalnym compact mode z preferences.
5. Dodajemy testy explicit dla focus restore i mobile sheet order.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
   - dopracowac logiczne rozdzielenie desktop/mobile rendering path,
   - utrzymac deterministic behavior dla sheets i rails.
2. `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
   - zablokowac parity widths i spojnosc wrappers.
3. `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
   - dodac snapshot state przed focus mode i restore po wyjsciu.
4. `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
   - upewnic sie, ze header toggles wywoluja nowy focus contract.
5. `tests/integration/ui/post-editor-layout-responsive.test.tsx`
   - dopisac przypadki focus restore i mobile panel order.
6. `tests/integration/ui/post-editor-smoke-regression.test.tsx`
   - rozszerzyc smoke o focus on/off transitions.

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
if (viewportWidth >= 1024 && !focusMode) {
  showLeftRail("w-64");
  showRightRail("w-80");
}
if (viewportWidth < 1024 && !focusMode) {
  showLeftSheet();
  showRightSheet();
}
if (focusMode) {
  cacheCurrentPanelState();
  hideLeftAndRight();
}
if (!focusMode) {
  restoreCachedPanelState();
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
  - focus mode hides rails and restores previous panel state
  - compact side panels mode still respects parity constraints
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-layout-responsive.test.tsx tests/integration/ui/post-editor-smoke-regression.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (responsive/focus contracts)
- `_docs/CODERSO_MODULES.md`
