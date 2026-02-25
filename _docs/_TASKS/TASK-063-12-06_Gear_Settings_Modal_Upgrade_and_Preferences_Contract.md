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

## Current State Analysis (Repo)
1. `PostEditorSettingsDialog` ma obecnie 3 przełączniki (`focusModeOnOpen`, `compactSidePanels`, `showOutlineHints`) i prosty footer reset/done.
2. Preferences sa trzymane lokalnie w `PostBlockEditorShell` przez:
   - `nextless.posts.editor.preferences.v1`,
   - `nextless.posts.editor.focusMode`.
3. Persistencja przez `userSettingsClient` nie jest obecnie podlaczona.
4. Test `post-editor-settings-dialog` pokrywa render i podstawowe interaction, ale nie testuje migracji schemy.

---

## Delta vs Reference
1. Referencja oczekuje bardziej „centralnego” settings experience pod gear icon (lepsza struktura i hierarchia opcji).
2. Brak opcji `editor density`.
3. Brak jawnego kontraktu migracji wersji preferences.

---

## Final Implementation Decisions
1. Source of truth pozostaje localStorage + SPA cache behavior (brak backend changes w tej fazie).
2. Rozszerzamy schema o:
   - `editorDensity: "comfortable" | "compact"`.
3. Zachowujemy backward compatibility przez migracje `v1 -> v2` w resolverze preferences.
4. `userSettingsClient` jest poza zakresem tej iteracji (defer), aby utrzymac brak reloadow i szybki client-side restore.
5. Modal dostaje sekcje i copy zgodne z `editor UX settings` (zamiast listy rownych toggli).
6. Gear modal moze zawierac dodatkowe globalne opcje edytora postow (bez API changes), np.:
   - `showKeyboardHints`,
   - `defaultInspectorTab` (`post`/`block`),
   - `restoreLastSidebarsState` (on/off).

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/settings/PostEditorSettingsDialog.tsx`
   - przebudowac na grouped sections i dodac `editorDensity`.
2. `core/admin/ui/posts/editor/PostBlockEditorShell.tsx`
   - podniesc schema preferences i resolver migracji,
   - utrzymac current keys + kompatybilnosc.
3. `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
   - upewnic sie, ze gear trigger jest primary i stabilny.
4. `tests/integration/ui/post-editor-settings-dialog.test.tsx`
   - dopisac testy density + migration defaults.
5. `tests/unit/posts/post-editor-layout-state.test.ts`
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
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/integration/ui/post-editor-settings-dialog.test.tsx tests/unit/posts/post-editor-layout-state.test.ts`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md` (settings modal + preferences persistence)
- `_docs/CMS_API.md` (optional internal user-settings reference)
- `_docs/CODERSO_MODULES.md`
