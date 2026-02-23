# TASK-063-05: List View, Outline, and Document Stats
# FileName: TASK-063-05_ListView_Outline_and_Document_Stats.md

**Priority:** High  
**Category:** Admin/UI + Authoring  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-02, TASK-062  
**Status:** To Do

---

## Overview
Wdrozyc sidebar `Document Overview` i panel statystyk dokumentu:
- tab `List View`,
- tab `Outline`,
- statystyki: words, characters, read time, headings, paragraphs, blocks,
- spojnosc z TOC/anchors (`TASK-062`).

---

## Scope
1. Dodac sidebar list-view z tabami (`list`, `outline`).
2. Zbudowac selector stats na podstawie `PostBlockDocument`.
3. Dodac outline validation hints (empty heading, skipped levels, multiple H1).
4. Spiac outline nawigacje z selekcja bloku i scroll into view.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx` (new)
- `core/admin/ui/posts/editor/outline/PostDocumentOutline.tsx` (new)
- `core/admin/ui/posts/editor/outline/PostDocumentStats.tsx` (new)
- `core/services/posts/editor/postDocumentOutline.ts` (new)
- `core/services/posts/editor/postDocumentStats.ts` (new)
- `tests/unit/posts/post-document-outline.test.ts` (new)
- `tests/unit/posts/post-document-stats.test.ts` (new)
- `tests/integration/ui/post-editor-listview-outline.test.tsx` (new)

---

## Pseudocode
```ts
const stats = computePostDocumentStats(document);
const outline = buildPostDocumentOutline(document); // uses heading + writing-canvas nodes

renderTabs([
  { id: "list", panel: <BlockListView /> },
  { id: "outline", panel: <OutlineView items={outline.items} /> }
]);

renderStatsPopover(stats);
```

---

## Acceptance Criteria
1. `Document Overview` ma osobne widoki list i outline.
2. Outline poprawnie wykrywa heading anomalies.
3. Stats sa aktualne po edycji i nie wymagaja recznego refreshu.

---

## Testing Requirements
- Unit:
  - outline builder rules,
  - stats counters.
- Integration UI:
  - tab switch,
  - select heading -> focus block,
  - empty-state behavior.

---

## Documentation Updates Required
- `_docs/CMS_API.md` (outline/stats computed behavior)
- `_docs/ARCHITECTURE.md` (document selectors)

