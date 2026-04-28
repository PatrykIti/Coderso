# TASK-063-12-06: Gear Settings Modal Upgrade and Preferences Contract
# FileName: TASK-063-12-06_Gear_Settings_Modal_Upgrade_and_Preferences_Contract.md

**Priority:** High  
**Category:** Admin/UI + Preferences  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-12-02, TASK-063-12-05  
**Status:** Done (2026-02-25)

---

## Overview
Wzmocnic role ikony `Gear` jako glownego wejscia do globalnych ustawien post editora:
- modal estetycznie zgodny z referencja i shell,
- porzadek opcji UX (focus mode, compact rails, outline hints, density),
- stabilna persistencja preferencji (local storage + internal user settings sync).

---

## Security Contract
- **Visibility:** internal (`/admin/*`, `/admin/api/user-settings`).
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

## Current State Analysis (Repo)
1. `PostEditorSettingsDialog` ma obecnie 3 przełączniki (`focusModeOnOpen`, `compactSidePanels`, `showOutlineHints`) i prosty footer reset/done.
2. Preferences sa trzymane lokalnie w `PostBlockEditorShell` przez:
   - `nextless.posts.editor.preferences.v1`,
   - `nextless.posts.editor.focusMode`.
3. Persistencja przez `userSettingsClient` nie jest obecnie podlaczona dla post editora, mimo ze ten wzorzec istnieje na innych ekranach admina.
4. Test `post-editor-settings-dialog` pokrywa render i podstawowe interaction, ale nie testuje migracji schemy.

---

## Delta vs Reference
1. Referencja oczekuje bardziej „centralnego” settings experience pod gear icon (lepsza struktura i hierarchia opcji).
2. Brak opcji `editor density`.
3. Brak jawnego kontraktu migracji wersji preferences.

---

## Final Implementation Decisions
1. Source of truth dla UX pozostaje local-first (SPA), ale persistence jest dualna: `localStorage + user_settings` sync.
2. Rozszerzamy schema o:
   - `editorDensity: "comfortable" | "compact"`.
3. Zachowujemy backward compatibility przez migracje `v1 -> v2` w resolverze preferences.
4. `userSettingsClient` jest w zakresie tej iteracji:
   - optimistic update do local state/localStorage,
   - background PATCH do `/admin/api/user-settings/:key`,
   - graceful fallback do local przy błędzie sync (bez blokowania UI).
5. Modal dostaje sekcje i copy zgodne z `editor UX settings` (zamiast listy rownych toggli).
6. Gear modal moze zawierac dodatkowe globalne opcje edytora postow (bez API changes), np.:
   - `showKeyboardHints`,
   - `defaultInspectorTab` (`post`/`block`),
   - `restoreLastSidebarsState` (on/off).
7. Dodajemy nowy user setting key dla editora postow i walidacje po stronie service:
   - proponowany key: `posts.editor.preferences`.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/settings/PostEditorSettingsDialog.tsx`
   - przebudowac na grouped sections i dodac `editorDensity`.
2. `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
   - podniesc schema preferences i resolver migracji,
   - utrzymac current local keys + kompatybilnosc.
3. `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
   - upewnic sie, ze gear trigger jest primary i stabilny.
4. `core/admin/services/userSettingsClient.ts`
   - rozszerzyc typ `UserSettings` o `posts.editor.preferences`.
5. `core/services/settings/userSettingsService.ts`
   - dodac key do `UserSettingValueMap`, defaults i walidacji.
6. `tests/integration/routes/userSettings.test.ts`
   - dopisac coverage dla nowego klucza.
7. `tests/unit/settings/userSettingsService.test.ts`
   - dopisac walidacje i persistence cases.
8. `tests/unit/admin/userSettingsClient.test.ts`
   - dopisac klientowe cases dla nowego klucza.
9. `tests/integration/ui/post-editor-settings-dialog.test.tsx`
   - dopisac testy density + migration defaults.
10. `tests/unit/posts/post-editor-layout-state.test.ts`
   - dodac cases dla preference parsing i reset behavior.

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
- `core/admin/services/userSettingsClient.ts`
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
  void setUserSetting("posts.editor.preferences", next);
}

function resolvePreferences(raw: unknown): PostEditorPreferences {
  // v1 -> v2 migration, defaults fallback
  return migrateToV2(raw);
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
  - density option applies and restores
- Unit:
  - preference parsing/migration/defaults
  - user settings client + service validation for `posts.editor.preferences`
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-settings-dialog.test.tsx tests/unit/posts/post-editor-layout-state.test.ts tests/integration/routes/userSettings.test.ts tests/unit/settings/userSettingsService.test.ts tests/unit/admin/userSettingsClient.test.ts`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (settings modal + preferences persistence)
- `_docs/CMS_API.md` (internal user-settings key for posts editor preferences)
- `_docs/CODERSO_MODULES.md`
