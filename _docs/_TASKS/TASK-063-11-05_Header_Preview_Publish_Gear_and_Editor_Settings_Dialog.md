# TASK-063-11-05: Header Preview Publish Gear and Editor Settings Dialog
# FileName: TASK-063-11-05_Header_Preview_Publish_Gear_and_Editor_Settings_Dialog.md

**Priority:** High  
**Category:** Admin/UI + Preferences  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-03-02, TASK-063-11-01  
**Status:** To Do

---

## Overview
Header ma miec po prawej:
- `Preview`,
- `Publish`,
- `Gear`.

Klik w `Gear` otwiera popup z globalnymi ustawieniami edytora (zaawansowane opcje UI/UX).

---

## Scope
1. Ustalic finalny układ prawych akcji w headerze.
2. Dodac `PostEditorSettingsDialog` (modal).
3. Zdefiniowac minimalny kontrakt ustawien (np. show guides, compact chrome, focus on open).
4. Persistencja ustawien (local storage lub user settings) bez nowych public API.

---

## Security Contract
- **Visibility:** internal.
- **Auth model:** admin session/API key.
- **Rate-limit:** `admin_read/admin_write` dla opcjonalnych `user-settings`.

---

## Physical Files (Planned)
- `core/admin/ui/posts/editor/header/PostEditorHeader.tsx`
- `core/admin/ui/posts/editor/header/PostEditorActionCluster.tsx`
- `core/admin/ui/posts/editor/settings/PostEditorSettingsDialog.tsx` (new)
- `core/admin/ui/posts/editor/hooks/usePostEditorLayout.ts`
- `core/admin/services/userSettingsClient.ts` (optional)
- `tests/integration/ui/post-editor-header-workflow.test.tsx`
- `tests/unit/posts/post-editor-layout-state.test.ts`

---

## Pseudocode
```ts
<Button onClick={openEditorSettings} aria-label="Editor settings">
  <Settings />
</Button>

<PostEditorSettingsDialog
  open={settingsOpen}
  values={editorPrefs}
  onChange={setEditorPrefs}
/>
```

---

## Acceptance Criteria
1. Header ma docelowy układ `Preview`, `Publish`, `Gear` po prawej.
2. Gear otwiera modal z ustawieniami globalnymi edytora.
3. Ustawienia sa trwale i odtwarzane po ponownym otwarciu.

---

## Testing Requirements
- Integration: gear opens modal and applies settings.
- Unit: preference state and persistence logic.

---

## Documentation Updates Required
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
