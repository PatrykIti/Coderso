# TASK-057-05: Document and Block Inspector Panels
# FileName: TASK-057-05_Document_and_Block_Inspector_Panels.md

**Priority:** High  
**Category:** Editor UX + Metadata  
**Estimated Effort:** Medium  
**Dependencies:** TASK-057-04  
**Status:** To Do

---

## Goal
Zapewnic czytelny panel `Document / Block` jak w Gutenberg, z naciskiem na prostote dla nietechnicznego uzytkownika.

## Scope
1. `Document` tab:
   - status (draft/published/scheduled),
   - slug,
   - excerpt,
   - featured image,
   - taxonomy/tags,
   - SEO summary.
2. `Block` tab:
   - ustawienia aktywnego bloku (typ, styl, alignment, spacing, width, advanced toggles).
3. Dobre opisy i tooltipy (user friendly, nietechniczne).
4. Brak placeholderow - kazdy wspierany blok ma realne opcje.

## Files to Create / Change
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx` (new)
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx` (new)
- `core/admin/ui/posts/editor/inspector/inspectorSchemas.ts` (new)
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/services/postsClient.ts`
- `tests/integration/ui/post-document-inspector.test.tsx` (new)
- `tests/integration/ui/post-block-inspector.test.tsx` (new)

## Pseudocode
```tsx
if activeTab === "document":
  renderDocumentSettings(post, metadataDraft)

if activeTab === "block":
  block = getSelectedBlock()
  if !block: showEmptyHint("Select a block")
  else renderBlockControls(block)

onDocumentFieldChange:
  updateLocalDraft()
  markDirty("metadata")
```

## Acceptance Criteria
1. Uzytkownik bez wiedzy technicznej rozumie, gdzie ustawia dokument vs blok.
2. Wszystkie kluczowe pola dokumentu sa edytowalne bez zmiany ekranu.
3. `Block` tab nie pokazuje pustych/nieaktywnych opcji dla danego typu.
4. Testy UI pokrywaja przechodzenie miedzy tabami i zapis zmian.
