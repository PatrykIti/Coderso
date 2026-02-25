# TASK-063-12-03: Left Outline Parity with Optional List Tab
# FileName: TASK-063-12-03_Left_Outline_Parity_with_Optional_List_Tab.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-01, TASK-063-12-02  
**Status:** To Do

---

## Overview
Ustalic lewy panel edytora jako `Document Outline` first.
Dozwolone jest pozostawienie dodatkowej zakladki `List view`, ale:
- `Outline` ma byc domyslny,
- visual hierarchy ma pozostac zgodna z referencja.

---

## Scope
1. Dopasowac shell left rail (naglowek, spacing, insert `+`, list item rhythm).
2. Ustawic `Outline` jako domyslny tab.
3. Utrzymac drag/reorder i list tooling jako rozszerzenie, nie primary path.
4. Zapewnic parity focus i keyboard behavior.

---

## Current State Analysis (Repo)
1. `PostListViewSidebar` renderuje tabs `List view`/`Outline` o rownej wadze wizualnej.
2. `PostDocumentOutline` korzysta z jednolitej prezentacji icon/row i nie mapuje visual language referencji dla roznych typow wierszy.
3. `PostListViewPanel` jest relatywnie „ciezki” wizualnie jak na secondary mode.
4. `usePostEditorLayout` nie trzyma wyraznego kontraktu `left rail primary mode`, przez co `Outline` nie jest wymuszone jako canonical default.

---

## Delta vs Reference
1. Referencja to prosty, lekki `Document Outline` rail bez rownowaznych tabow.
2. Aktualny panel ma rozbudowane controls jako first impression, co odsuwa `Outline-first` flow.
3. Referencja ma bardziej subtelne row states i mniejszy noise na lewej szynie.

---

## Final Implementation Decisions
1. `Outline` pozostaje domyslny i primary; `List view` jest secondary capability.
2. Tabs zostaja (dozwolone odchylenie), ale `Outline` ma byc wizualnie uprzywilejowany.
3. Left rail insert `+` zostaje jako primary insert trigger.
4. Dodajemy jawny state `leftRailMode` (`outline` | `list-view`) w layout hooku.
5. Zmieniamy visual states row (`active/hover/muted`) pod lekki kontrakt referencji.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
   - przeprojektowac naglowek i tabs hierarchy,
   - ustawic `Outline` jako domyslny selection,
   - zachowac insert dropdown i flow `outline-plus`.
2. `core/admin/ui/posts/editor/outline/PostDocumentOutline.tsx`
   - dodac mapowanie ikon/row semantics dla outline entries,
   - dopracowac stany active/hover bez ciezkiego border noise.
3. `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx`
   - uproscic chrome i helper text, aby pozostal secondary.
4. `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
   - wprowadzic `leftRailMode` + akcje reducera,
   - zapewnic deterministic restore do `outline`.
5. `tests/integration/ui/post-editor-listview-outline.test.tsx`
   - dodac asercje default mode i visual priority.
6. `tests/integration/ui/post-editor-layout-shell.test.tsx`
   - sprawdzic integracje left rail state z shell.

---

## Sub-Tasks
1. Refactor header left rail + outline list items.
2. Ujednolicic style item states (active, hover, muted).
3. Ograniczyc visual noise list-view controls.
4. Zaktualizowac testy outline/list behavior.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `core/admin/ui/posts/editor/outline/PostDocumentOutline.tsx`
- `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- `tests/integration/ui/post-editor-listview-outline.test.tsx`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`

---

## Pseudocode
```ts
const DEFAULT_LEFT_RAIL_MODE = "outline";

<LeftRail title="Document Outline">
  <PrimaryInsertPlus />
  <Tabs value={leftRailMode} onValueChange={setLeftRailMode}>
    <Tab value="outline" priority="primary" />
    <Tab value="list" priority="secondary" />
  </Tabs>
</LeftRail>
```

---

## Acceptance Criteria
1. `Document Outline` jest primary mode i domyslnym widokiem.
2. Opcjonalny `List view` nie zmienia primary UX flow.
3. Insert `+` i selection behavior pozostaja kompatybilne z obecna logika.

---

## Testing Requirements
- Integration UI:
  - default left mode is `Outline`
  - outline selection + insert trigger stays primary
  - list tab remains available and reorder behavior works
  - mode restore after panel reopen
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-listview-outline.test.tsx tests/integration/ui/post-editor-layout-shell.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (left rail ownership and default mode)
- `_docs/CMS_API.md` (outline insert orchestration notes)
