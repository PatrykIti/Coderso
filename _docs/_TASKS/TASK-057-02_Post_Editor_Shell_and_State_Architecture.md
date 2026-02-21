# TASK-057-02: Post Editor Shell and State Architecture
# FileName: TASK-057-02_Post_Editor_Shell_and_State_Architecture.md

**Priority:** High  
**Category:** Admin/UI Architecture  
**Estimated Effort:** Large  
**Dependencies:** TASK-057-01  
**Status:** Done (2026-02-21)

---

## Goal
Zbudowac modularny shell edytora posta (Gutenberg-like), ktory bedzie latwy w utrzymaniu i rozszerzaniu.

## Scope
1. Wydzielic nowy layout edytora posta (top bar + canvas + side panels + list view).
2. Dodac dedykowany store stanu edytora (selection, undo stack, dirty state, save state).
3. Podpiac routing `/admin/coderso/posts/:id` do nowego edytora.
4. Zachowac cache/prefetch i SPA behavior.

## Files to Create / Change
- `core/admin/ui/posts/PostEditorPage.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx` (new)
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx` (new)
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx` (new)
- `core/admin/ui/posts/editor/PostEditorStore.ts` (new)
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts` (new)
- `core/admin/app/AdminApp.tsx`
- `core/admin/services/postsClient.ts`
- `tests/unit/ui/post-block-editor-shell.test.tsx` (new)
- `tests/integration/ui/posts-editor-routing.test.tsx` (new)

## Pseudocode
```tsx
PostEditorPage:
  post = usePost(postId)
  document = normalizePostDocument(post.data.document)
  return <PostBlockEditorShell post={post} document={document} />

PostEditorStore:
  state = {
    doc,
    selectedBlockId,
    selectionMode, // canvas | listView
    history: { past, present, future },
    dirty,
    saving,
    lastSavedAt
  }
  actions = { insert, update, move, remove, select, undo, redo, markSaved }
```

## Acceptance Criteria
1. Edytor jest podzielony na logiczne komponenty, bez monolitu.
2. Wejscie na `/admin/coderso/posts/:id` renderuje nowy shell.
3. Edycja nie robi full reload i wspiera SPA navigation.
4. Podstawowe testy UI/store przechodza.
