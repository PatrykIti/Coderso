# TASK-063-03: Header, DocumentTools, and Save/Publish Parity
# FileName: TASK-063-03_Header_DocumentTools_and_SavePublish_Parity.md

**Priority:** High  
**Category:** Admin/UI + Workflow  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-02  
**Status:** To Do

---

## Overview
Przebudowac gore edytora (header) na model Gutenberg-like:
- `Add` (inserter toggle),
- `Undo/Redo`,
- `Document Overview` toggle,
- saved state,
- preview,
- publish.

---

## Scope
1. Rozdzielic obecny top bar na mniejsze komponenty:
   - document tools (left cluster),
   - center context,
   - right action cluster.
2. Ujednolicic workflow save/autosave/preview/publish w headerze.
3. Dodac stabilne a11y labels i keyboard hints.

---

## Security Contract
- **Visibility:** internal only (`/admin/api/posts/*`).
- **Auth model:** authenticated session lub API key z odpowiednim zakresem admin.
- **Rate-limit bucket:** `admin_read` / `admin_write` (jak obecny policy).
- **Anti-abuse:** nonce/HMAC nie dotyczy internal admin write; brak nowych public endpointow.
- **reCAPTCHA:** nie dotyczy internal posts editor workflow.

---

## Files to Create / Change
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx` (new)
- `core/admin/ui/posts/editor/header/PostEditorDocumentTools.tsx` (new)
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx` (new)
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/services/postsClient.ts`
- `tests/integration/ui/post-editor-header-workflow.test.tsx` (new)

---

## Pseudocode
```ts
function PostEditorDocumentTools() {
  return (
    <>
      <ToolbarButton onClick={toggleInserter}>Add</ToolbarButton>
      <UndoButton />
      <RedoButton />
      <ToolbarButton onClick={toggleListView}>Document overview</ToolbarButton>
    </>
  );
}

function PostEditorActionCluster() {
  return (
    <>
      <SavedState />
      <PreviewAction />
      <PublishAction />
    </>
  );
}
```

---

## Acceptance Criteria
1. Header ma jasny podzial na narzedzia dokumentu i akcje publikacji.
2. Save/preview/publish dzialaja bez dodatkowych reloadow stanu.
3. Undo/redo/list view/inserter sa dostepne i spójne z shell state.

---

## Testing Requirements
- Integration UI:
  - add/list-view toggles,
  - undo/redo availability,
  - save/preview/publish flow.
- Service/API integration:
  - brak regresji `update/preview/publish`.

---

## Documentation Updates Required
- `_docs/CMS_API.md` (posts editor action flow)
- `_docs/ARCHITECTURE.md` (header workflow ownership)

