# TASK-063-12-06: Gear Settings Modal Upgrade and Preferences Contract
# FileName: TASK-063-12-06_Gear_Settings_Modal_Upgrade_and_Preferences_Contract.md

**Priority:** High  
**Category:** Admin/UI + Preferences  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-02, TASK-063-12-05  
**Status:** To Do

---

## Overview
Wzmocnic role ikony `Gear` jako glownego wejscia do globalnych ustawien post editora:
- modal estetycznie zgodny z referencja i shell,
- porzadek opcji UX (focus mode, compact rails, outline hints, density),
- stabilna persistencja preferencji (local storage + optional internal user settings).

---

## Security Contract
- **Visibility:** internal (`/admin/*`, optional `/admin/api/user-settings`).
- **Auth model:** authenticated admin session / API key scope `admin:*`.
- **Rate-limit bucket:** `admin_read` / `admin_write`.
- **Anti-abuse controls:** brak public write; nonce/HMAC/reCAPTCHA nie dotyczy.

---

## Scope
1. Redesign `PostEditorSettingsDialog` pod referencyjny look-and-feel.
2. Uporzadkowac schema preferencji i defaults.
3. Ujednolicic save/load mechanizm dla preferences.
4. Zachowac backward compatibility istniejacych kluczy preference.

---

## Sub-Tasks
1. Rozszerzyc model preference state i validacje.
2. Przebudowac modal sections + opisy pod UX non-technical user.
3. Dodac reset defaults i deterministic migration starych prefs.
4. Rozszerzyc testy dialogu i persistence.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/settings/PostEditorSettingsDialog.tsx`
- `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/services/userSettingsClient.ts` (optional)
- `tests/integration/ui/post-editor-settings-dialog.test.tsx`
- `tests/unit/posts/post-editor-layout-state.test.ts`

---

## Pseudocode
```ts
type PostEditorPreferences = {
  focusModeOnOpen: boolean;
  compactSidePanels: boolean;
  showOutlineHints: boolean;
  editorDensity: "comfortable" | "compact";
};

function savePreferences(next: PostEditorPreferences) {
  localStorage.setItem(KEY, JSON.stringify(next));
  maybeSyncUserSettings(next); // internal only
}
```

---

## Acceptance Criteria
1. Gear otwiera modal ustawien zgodny z visual language edytora.
2. Preferencje sa poprawnie zapisywane, odczytywane i resetowane.
3. Brak regresji w open/close flow i focus management modalu.

---

## Testing Requirements
- Integration UI:
  - open gear -> modal visible
  - change preferences -> persist after remount
  - reset defaults behavior
- Unit:
  - preference parsing/migration/defaults
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-settings-dialog.test.tsx`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (settings modal + preferences persistence)
- `_docs/CMS_API.md` (optional internal user-settings reference)
- `_docs/CODERSO_MODULES.md`
