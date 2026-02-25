# TASK-063-12-02: Header Parity and Action Hierarchy
# FileName: TASK-063-12-02_Header_Parity_and_Action_Hierarchy.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-01  
**Status:** To Do

---

## Overview
Przywrocic header post editora do docelowego kontraktu referencyjnego:
- wyrazny lewy kontekst (close/back + breadcrumb + status),
- prosty prawy action cluster (`Preview`, `Publish/Update`, `Gear`),
- dodatkowe akcje operacyjne poza glownym klastrem, aby nie zaburzac visual parity.

---

## Scope
1. Refactor `PostEditorHeader` pod nowa hierarchie wizualna.
2. Ograniczyc glowny prawy klaster do akcji referencyjnych.
3. Przeniesc `Outline/Details/Focus/Revisions` do secondary controls.
4. Dopiac a11y labels i keyboard titles bez zmian API behavior.

---

## Sub-Tasks
1. Przebudowac layout header region (wysokosc, spacing, alignment).
2. Rozdzielic `primary actions` i `secondary controls`.
3. Zachowac save/publish/preview wiring 1:1 z obecna logika.
4. Zaktualizowac testy integracyjne header workflow.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`

---

## Pseudocode
```ts
renderHeader({
  left: [CloseBack, Breadcrumb, StatusPill],
  rightPrimary: [Preview, PublishOrUpdate, Gear],
  rightSecondary: [OutlineToggle, DetailsToggle, FocusToggle, Revisions],
});
```

---

## Acceptance Criteria
1. Header wyglada i zachowuje hierarchy zblizona do referencji.
2. `Preview`, `Publish/Update`, `Gear` sa primary actions.
3. Brak regresji w publish/preview/revision/open-details flow.

---

## Testing Requirements
- Integration UI:
  - primary action order and visibility
  - secondary control availability
  - preview/publish/gear wiring
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-header-workflow.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (header region ownership)
- `_docs/CMS_API.md` (header action flow notes)
