# TASK-063-11: Post Editor Strict HTML Parity and Unified Article Canvas
# FileName: TASK-063-11_Post_Editor_Strict_HTML_Parity_and_Unified_Article_Canvas.md

**Priority:** High  
**Category:** Admin/UI + Authoring UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-10, TASK-063-07  
**Status:** Done (2026-02-24)

---

## Overview
Dowozenie scislej (visual-first) parytetowej implementacji widoku post editora na bazie:
- `_docs/UI/admin_panel/46-post-editor/code.html`

Wymaganie biznesowe:
- po lewej zostaje globalne menu admina,
- po prawej uruchamia sie layout post editora jak w referencyjnym HTML,
- logika Nextless pozostaje wpieta w odpowiednie regiony (save/autosave/preview/publish/revisions/runtime).

---

## UX Contract (Target)
1. Lewy panel post editora: `Document Outline` + **plusik do dodawania blokow** (primary insert entrypoint).
2. Srodek: jeden spojny canvas artykulu (bez widocznych kart/ramek per block).
3. Prawy panel: tabs `Post` i `Block` (document-level settings vs selected block settings).
4. Bloki media (image/embed/video) pokazuja placeholdery na canvasie i pozwalaja kliknac w miejsce, aby skonfigurowac zawartosc.
5. Header: po prawej `Preview`, `Publish`, ikona zebatki.
6. Ikona zebatki otwiera popup z globalnymi ustawieniami edytora.

---

## Scope
1. Dowozenie strict visual parity dla layoutu i spacingu (bez przepisania backendu).
2. Przeniesienie primary insert trigger do left outline panel.
3. Borderless article canvas z inline placeholders dla media blocks.
4. Utrwalenie kontraktu `Post/Block` tabs po prawej.
5. Dolozenie `Editor settings` dialog (gear icon).
6. Pelna regresja testowa + docs + changelog + kanban sync.

---

## Security Contract
- **Visibility:** internal (`/admin/*`).
- **Auth model:** authenticated admin session / admin API key scopes.
- **Rate-limit bucket:** `admin_read` / `admin_write`.
- **Public hardening:** brak nowych public endpointow.
- **Optional persistence endpoints:** tylko `user-settings` (internal).

---

## Detailed Sub-Tasks
- `TASK-063-11-01_Visual_Parity_Shell_and_Tokens.md`
- `TASK-063-11-02_Left_Outline_Primary_Insert_Flow.md`
- `TASK-063-11-03_Unified_Borderless_Canvas_and_Media_Placeholders.md`
- `TASK-063-11-04_Right_Sidebar_Post_Block_Tabs_and_Context.md`
- `TASK-063-11-05_Header_Preview_Publish_Gear_and_Editor_Settings_Dialog.md`
- `TASK-063-11-06_QA_Docs_Changelog_and_Closure.md`

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/PostEditorTopBar.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/ui/posts/editor/header/PostEditorDocumentTools.tsx`
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `core/admin/ui/posts/editor/blocks/PostListViewPanel.tsx`
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/settings/PostEditorSettingsDialog.tsx` (new)
- `tests/unit/posts/post-editor-layout-state.test.ts`
- `tests/integration/ui/post-editor-layout-shell.test.tsx`
- `tests/integration/ui/post-editor-canvas-shared.test.tsx`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`
- `tests/integration/ui/post-editor-listview-outline.test.tsx`
- `tests/integration/ui/post-editor-smoke-regression.test.tsx`

---

## Pseudocode
```ts
<PostEditorLayout>
  <Header rightActions={["preview", "publish", "gear"]} />
  <LeftOutlinePanel
    onInsertFromPlus={(type, anchor) => insertBlock(type, anchor)}
  />
  <UnifiedArticleCanvas borderless mediaPlaceholdersClickable />
  <RightInspector tabs={["post", "block"]} />
</PostEditorLayout>
```

```ts
onGearClick() {
  openEditorSettingsDialog();
}

onMediaPlaceholderClick(blockId) {
  selectBlock(blockId);
  openRightSidebarTab("block");
}
```

---

## Acceptance Criteria
1. Widok post editora jest zgodny z referencyjnym `code.html` (strict visual parity target).
2. Primary insert jest w left `Document Outline` (plus button).
3. Canvas pokazuje spojny artykul bez kart/obramowan per block.
4. Prawy panel ma tabs `Post`/`Block` z poprawnym kontekstowym przejsciem.
5. Header ma `Preview`, `Publish`, `Gear`; gear otwiera popup ustawien edytora.
6. Brak regresji save/autosave/preview/publish/revisions/runtime.

---

## Testing Requirements
- Unit:
  - layout state (tabs/focus/settings dialog state)
  - insert target resolution for outline plus
- Integration UI:
  - outline plus insertion
  - unified borderless canvas rendering
  - media placeholder click flow
  - right tabs context switch
  - header gear -> settings dialog
- Final gate:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
