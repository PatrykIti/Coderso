# TASK-059-04: Posts Admin UI Decoupling From Entries
# FileName: TASK-059-04_Posts_Admin_UI_Decoupling_From_Entries.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-059-03  
**Status:** Done (2026-02-22)

---

## Overview
Przebudowac UI posts tak, aby nie korzystal z `EntryEditor` ani helperow entries-content-type.

## Scope
1. Lista posts:
   - pozostaje dedykowana (`PostsListPage`), ale czyta tylko nowy posts API.
2. Edytor posts:
   - block editor dziala jak dotychczas,
   - fallback/classic nie opiera sie na `EntryEditor mode="posts"`.
3. Routing i nawigacja:
   - utrzymac obecny UX,
   - usunac logike `mode === "posts"` z `EntryEditor`.
4. Local cache/prefetch:
   - zachowac cache keys `posts:list`, `posts:detail:*`,
   - utrzymac istniejące wzorce z TASK-058.

## Files to Create / Change
- `core/admin/ui/posts/PostEditorPage.tsx`
- `core/admin/ui/posts/editor/*`
- `core/admin/ui/entries/EntryEditor.tsx` (usuniecie branchy posts)
- `core/admin/services/postsClient.ts`
- `core/admin/utils/adminPrefetch.ts` (jesli mapping trzeba dopracowac)
- `tests/unit/ui/post-editor-page.test.tsx`
- `tests/unit/ui/post-block-editor-shell.test.tsx`
- `tests/unit/ui/posts-list.test.tsx`

## Pseudocode
```ts
if (editorMode === "classic") {
  return <ClassicPostEditor postId={id} />;
}
return <PostBlockEditorShell postId={id} />;

// EntryEditor no longer handles posts mode
type EditorRouteMode = "entries";
```

## Acceptance Criteria
1. W UI posts nie ma runtime dependency od `EntryEditor`.
2. Posts list/editor działa end-to-end na nowym API.
3. Cache/prefetch dla posts dziala jak dla innych ekranow list/edit.
4. Testy UI przechodza bez fallbackow test-only.

## Testing Requirements
- Unit:
  - posts list/editor rendering,
  - route mode resolution bez `entries`.
- Integration UI:
  - create/edit/publish/preview post flow.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_CACHE.md` (jesli zmienią się refresh points)
- `_docs/_TASKS/README.md`

## Completion Notes
1. `PostEditorPage` nie korzysta juz z `EntryEditor mode=\"posts\"`; classic fallback ma dedykowany komponent `PostClassicEditorShell`.
2. `EntryEditor` zostal uproszczony do sciezki entries-only (usuniete branch-e posts mode i route resolution dla posts).
3. Classic posts shell korzysta z posts API/cache (`postsClient`) oraz utrzymuje save/publish/preview + metadata panel.
4. UI smoke tests posts i unit tests entries/posts list przechodza po decouplingu.
