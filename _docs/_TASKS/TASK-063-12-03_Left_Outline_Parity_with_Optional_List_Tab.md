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
const DEFAULT_LEFT_TAB = "outline";

<LeftRail title="Document Outline">
  <PrimaryInsertPlus />
  <Tabs defaultValue={DEFAULT_LEFT_TAB}>
    <Tab value="outline" />
    <Tab value="list" optional />
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
  - default tab state is `Outline`
  - outline selection and insert trigger
  - list tab fallback and reorder contract
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-listview-outline.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (left rail ownership and default mode)
- `_docs/CMS_API.md` (outline insert orchestration notes)
