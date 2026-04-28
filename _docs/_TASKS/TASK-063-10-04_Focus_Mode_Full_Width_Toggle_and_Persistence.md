# TASK-063-10-04: Focus Mode Full Width Toggle and Persistence
# FileName: TASK-063-10-04_Focus_Mode_Full_Width_Toggle_and_Persistence.md

**Priority:** High  
**Category:** Admin/UI + UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-02, TASK-063-07, TASK-063-10-02  
**Status:** Done (2026-02-24)

---

## Overview
Dodac przycisk w gornej czesci widoku post editora do wlaczania `Focus mode`.

`Focus mode`:
- ukrywa panele boczne,
- rozszerza canvas na pelna dostepna szerokosc,
- daje maksymalna przestrzen do pisania.

---

## Scope
1. Dodac toggle w header actions (desktop + mobile parity).
2. Rozszerzyc layout state o `focusMode`.
3. Zdefiniowac zachowanie paneli w focus mode (zamkniete, bez side effects).
4. Dodac persistence preferencji (local/session lub user-settings) i restore przy ponownym wejsciu.

---

## Security Contract
- **Visibility:** internal (`/admin/api/user-settings` jesli persistence serwerowa).
- **Auth model:** admin session / API key admin scope.
- **Rate-limit bucket:** `admin_read`/`admin_write`.
- **Public hardening:** nie dotyczy (brak public route).

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/services/userSettingsClient.ts` (optional if server persistence)
- `tests/unit/posts/post-editor-layout-state.test.ts`
- `tests/integration/ui/post-editor-header-workflow.test.tsx`
- `tests/integration/ui/post-editor-layout-responsive.test.tsx`

---

## Pseudocode
```ts
const [focusMode, setFocusMode] = usePersistedFlag("posts.editor.focusMode", false);

function toggleFocusMode() {
  setFocusMode((prev) => !prev);
  if (!focusMode) {
    closePanel("left");
    closePanel("right");
  }
}

layout.center = focusMode ? "full" : "default";
```

---

## Acceptance Criteria
1. Jest widoczny i dzialajacy przycisk `Focus mode` w headerze.
2. Po wlaczeniu focus mode canvas ma pelna szerokosc.
3. Po odswiezeniu widoku preferencja focus mode jest przywracana.
4. Wyjscie z focus mode przywraca poprzedni workflow bez regresji.

---

## Testing Requirements
- Unit:
  - reducer/hook `focusMode` transitions,
  - persistence restore.
- Integration:
  - header toggle + layout changes,
  - mobile/desktop behavior.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (layout state contract)
- `_docs/CODERSO_MODULES.md` (posts focus mode UX)
