# TASK-063-10: Post Editor Stitch Template Migration and Focus Mode
# FileName: TASK-063-10_Post_Editor_Stitch_Template_Migration_and_Focus_Mode.md

**Priority:** High  
**Category:** Admin/UI + Authoring UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-063-02, TASK-063-03, TASK-063-06, TASK-063-07  
**Status:** To Do

---

## Overview
Podmienic warstwe UI post editora na nowy template referencyjny z:
- `_docs/UI/admin_panel/46-post-editor/code.html`
- screenshot: minimalistyczny layout (left outline rail, center writing canvas, right smart inspector).

Zakres obejmuje:
1. migracje layoutu i struktury komponentow do nowego template (bez kopiowania 1:1),
2. floating appender `+` w canvas w miejscu zgodnym z UX,
3. nowy przycisk "Focus mode" (pelna szerokosc panelu centralnego) w gornej czesci ekranu,
4. zachowanie pelnej kompatybilnosci funkcjonalnej (save/autosave/preview/publish/revisions/runtime).

---

## Goals
1. UX post editora blizszy nowemu template (stitch-based reference), ale na obecnej architekturze Nextless.
2. Czytelny przeplyw dla nietechnicznego usera: outline -> writing -> details.
3. Szybsze pisanie w trybie "Focus mode" (max przestrzeni dla canvas).
4. Zero regresji funkcjonalnych w post editorze.

---

## Scope
1. Zmapowac kontrakt HTML template na istniejace regiony i komponenty React.
2. Przebudowac shell i region composition pod nowy uklad wizualny.
3. Wdrozyc floating `+` appender jako domyslny trigger insertu w canvas.
4. Dodac toggle `Focus mode` (full-width) z deterministycznym zachowaniem desktop/mobile.
5. Domknac testy, dokumentacje, changelog i kanban closure.

---

## Security Contract
- **Visibility:** internal (`/admin/*`).
- **Auth model:** authenticated admin session / API key (`admin:*` scope).
- **Rate-limit bucket:** `admin_read` / `admin_write` (bez nowych public endpointow).
- **Public hardening:** nonce/HMAC/reCAPTCHA nie dotyczy (brak nowych public routes).

---

## Detailed Sub-Tasks
- `TASK-063-10-01_Template_Contract_Mapping_and_Component_Inventory.md`
- `TASK-063-10-02_Shell_Layout_Migration_to_Stitch_Reference.md`
- `TASK-063-10-03_Floating_Appender_Plus_and_Insert_Flow.md`
- `TASK-063-10-04_Focus_Mode_Full_Width_Toggle_and_Persistence.md`
- `TASK-063-10-05_QA_Docs_Changelog_and_Closure.md`

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorLayout.tsx`
- `core/admin/ui/posts/editor/layout/PostEditorRegions.tsx`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/ui/posts/editor/header/PostEditorDocumentTools.tsx`
- `core/admin/ui/posts/editor/PostEditorCanvas.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `core/admin/ui/posts/editor/sidebars/PostListViewSidebar.tsx`
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/services/userSettingsClient.ts` (jesli persistence przez user-settings)
- `tests/integration/ui/post-editor-layout-shell.test.tsx`
- `tests/integration/ui/post-editor-canvas-shared.test.tsx`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`
- `tests/integration/ui/post-editor-layout-responsive.test.tsx`
- `tests/unit/posts/post-editor-layout-state.test.ts`

---

## Pseudocode
```ts
const layout = usePostEditorLayout();

<PostEditorHeader
  onToggleFocusMode={() => layout.setFocusMode(!layout.focusMode)}
/>

<PostEditorLayout
  leftRail={!layout.focusMode ? <PostListViewSidebar /> : null}
  canvas={<PostEditorCanvas appenderVariant="floating-plus" />}
  rightRail={!layout.focusMode ? <PostDetailsSidebar /> : null}
  maxWidth={layout.focusMode ? "100%" : "editor"}
/>
```

---

## Acceptance Criteria
1. Layout post editora jest zgodny z nowym template reference (left rail + center canvas + right details).
2. Floating `+` appender jest widoczny i dziala w miejscu insercji.
3. Przycisk `Focus mode` rozszerza obszar pisania do pelnej szerokosci admin panelu.
4. Save/autosave/preview/publish/revisions nie maja regresji.
5. Mobile behavior pozostaje responsywny i przewidywalny.

---

## Testing Requirements
- Integration UI:
  - layout composition,
  - floating appender trigger,
  - focus mode toggle,
  - regression save/publish flow.
- Unit:
  - layout state reducer/hook,
  - focus mode persistence rules.
- Final gate:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (posts editor shell regions + focus mode)
- `_docs/CODERSO_MODULES.md` (posts editor UX behavior)
- `_docs/_TASKS/README.md` (kanban sync)
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`
