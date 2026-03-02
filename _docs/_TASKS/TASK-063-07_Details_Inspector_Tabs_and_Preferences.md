# TASK-063-07: Details Inspector Tabs and Preferences
# FileName: TASK-063-07_Details_Inspector_Tabs_and_Preferences.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-02, TASK-063-03  
**Status:** Done (2026-03-02)

---

## Overview
Ujednolicic prawy panel `Details`:
- tabs `Document` / `Block`,
- przewidywalne sekcje i kolejność,
- zapamietywanie preferencji widoku (np. aktywny tab, otwarte panele).

---

## Scope
1. Przebudowac inspector na model tabbed-sidebar.
2. Dla braku selekcji bloku fallback do `Document`.
3. Dodac persistence preferencji po stronie user settings.
4. Zredukowac duplikacje logiki miedzy `DocumentInspector` i `BlockInspector`.

---

## Security Contract
- **Visibility:** internal (`/admin/api/user-settings`, `/admin/api/settings/*` jesli uzyte).
- **Auth model:** authenticated admin session / API key scope admin.
- **Rate-limit bucket:** `admin_read` / `admin_write`.
- **Anti-abuse:** brak public write; nonce/HMAC/reCAPTCHA nie dotyczy.

---

## Detailed Sub-Tasks
- `TASK-063-07-01_Tabbed_Details_Sidebar_Shell.md`
- `TASK-063-07-02_Inspector_Refactor_Document_vs_Block.md`
- `TASK-063-07-03_Details_Preferences_Persistence.md`

---

## Files to Create / Change
- `core/admin/ui/posts/editor/inspector/DocumentInspector.tsx`
- `core/admin/ui/posts/editor/inspector/BlockInspector.tsx`
- `core/admin/ui/posts/editor/inspector/PostDetailsSidebar.tsx` (new)
- `core/admin/ui/posts/editor/hooks/usePostEditorPreferences.ts` (new)
- `core/admin/services/userSettingsClient.ts`
- `tests/integration/ui/post-editor-details-tabs.test.tsx` (new)
- `tests/unit/posts/post-editor-preferences.test.ts` (new)

---

## Pseudocode
```ts
const tab = selectedBlock ? pref.tab : "document";

return (
  <TabbedSidebar
    tabs={[
      { id: "document", panel: <DocumentInspector /> },
      { id: "block", panel: <BlockInspector block={selectedBlock} /> },
    ]}
    activeTab={tab}
    onTabChange={savePreference}
  />
);
```

---

## Acceptance Criteria
1. Details ma czytelny model `Document/Block` bez chaosu.
2. Preferowany tab jest zapamietywany.
3. Brak regressji metadanych i ustawien blokow.

---

## Testing Requirements
- Integration UI:
  - tab switching,
  - fallback when no block selected,
  - preference persistence.
- Unit:
  - preference store/hook.

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (details inspector ownership)
- `_docs/CMS_API.md` (user settings keys, if expanded)
