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

## Current State Analysis (Repo)
1. `PostEditorHeader` renderuje obecnie jeden klaster akcji bez podzialu na primary/secondary (`Outline`, `Details`, `Focus`, `Revisions`, `Preview`, `Publish`, `Gear`).
2. Left side headera pokazuje `title + status + sync label`, ale nie ma close/back i breadcrumb w samym headerze.
3. W repo istnieja `PostEditorActionCluster` i `PostEditorDocumentTools`, ale nie sa finalnie wykorzystane przez `PostEditorTopBar`.
4. Test `post-editor-header-workflow` sprawdza aktualny „flat” model przyciskow, wiec bedzie wymagac aktualizacji pod nowy kontrakt.

---

## Delta vs Reference
1. Referencja wymaga lewego kontekstu nawigacyjnego (close/back + breadcrumb + status) oraz uproszczonego prawego klastra (`Preview`, `Publish`, `Gear`).
2. Aktualny model miesza operacyjne controls i primary CTA w jednej linii.
3. Referencja nie eksponuje operacyjnych toggli obok publikacyjnych CTA.

---

## Final Implementation Decisions
1. Header bedzie dwuwarstwowy:
   - wiersz A: left context + right primary actions,
   - wiersz B: secondary controls (`Outline`, `Details`, `Focus`, `Revisions`).
2. `PostEditorActionCluster` staje sie zrodlem primary save/preview/publish behavior.
3. `Gear` zostaje po prawej stronie primary row, oddzielony pionowym separatorem.
4. `syncLabel` przechodzi do primary action cluster (nie przy tytule).
5. Brak zmian API/routes; tylko refactor UI composition.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
   - przebudowac DOM na `left-context`, `right-primary`, `secondary-controls`,
   - dodac props dla breadcrumb/close/save draft/last saved state.
2. `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
   - wykorzystac jako canonical cluster dla `Save draft`, `Preview`, `Publish/Update`.
3. `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
   - rozszerzyc kontrakt props i przekazywanie nowych handlerow.
4. `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
   - dopiac breadcrumb node, `onClose` (powrot do `/admin/posts`), `onSaveDraft`.
5. `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
   - utrzymac layout header region, ale dopasowac spacing/height do nowej kompozycji.
6. `tests/integration/ui/post-editor-header-workflow.test.tsx`
   - przepiac asercje na model `primary-actions` vs `secondary-controls`.
7. `tests/integration/ui/post-editor-layout-shell.test.tsx`
   - zaktualizowac asercje obecnosci nowej struktury header region.

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
  rowA: {
    left: [CloseBack, Breadcrumb, StatusPill],
    right: [PrimaryActionCluster, VerticalDivider, Gear],
  },
  rowB: {
    controls: [OutlineToggle, DetailsToggle, FocusToggle, Revisions],
  },
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
  - primary action order and visibility (`Preview`, `Publish/Update`, `Gear`)
  - secondary control availability in dedicated row
  - preview/publish/gear wiring after composition split
  - close/back + breadcrumb rendering in header left context
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-header-workflow.test.tsx tests/integration/ui/post-editor-layout-shell.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (header region ownership)
- `_docs/CMS_API.md` (header action flow notes)
