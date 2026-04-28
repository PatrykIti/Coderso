# TASK-007-04: Settings UI and Tokens UI
# FileName: TASK-007-04_Settings_UI_and_Tokens_UI.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007-02, TASK-024, TASK-006-08  
**Status:** Done (2026-01-29)  

---

## Overview

Warstwa UI dla ustawien globalnych oraz edycji tokenow. UI musi byc spojne
z `SettingsShell` i Sidebar. Zapewnia edycje podstawowych ustawien oraz
podglad zmian tokenow.

---

## Architecture

```
core/admin/ui/settings/
  SettingsPage.tsx
  DesignTokensEditor.tsx
  DesignTokensPreview.tsx
  GeneralSettingsPage.tsx
  SettingsSidebar.tsx
core/admin/app/AdminApp.tsx
tests/unit/ui/
  themeTokens.test.ts
  settings-sidebar.test.tsx
```

---

## UI Behavior

- `/admin/settings` pokazuje edytor tokenow + preview.
- `/admin/settings/general` zawiera podstawowe ustawienia (nazwa, locale).
- Sidebar z `SettingsSidebar` kontroluje aktywne zakladki.

**Wiring:**
- UI odbiera `values` i `tokens` jako propsy.
- Save -> callback `onSave()` przekazuje mapy ustawien + tokenow.
- Reset -> `onResetTokens()` czyści overrides.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/SettingsPage.tsx` | design tokens UI | preview + save |
| `core/admin/ui/settings/DesignTokensEditor.tsx` | editor | JSON-based |
| `core/admin/ui/settings/DesignTokensPreview.tsx` | live preview | cards |
| `core/admin/ui/settings/GeneralSettingsPage.tsx` | basic settings form | site name/locale |
| `core/admin/ui/settings/SettingsSidebar.tsx` | navigation list | activeId |
| `core/admin/app/AdminApp.tsx` | route mapping | settings routes |

---

## Testing Requirements

- `tests/unit/ui/themeTokens.test.ts` (CSS vars render)
- `tests/unit/ui/settings-sidebar.test.tsx` (sidebar entries)
- Snapshot/renders dla SettingsPage, GeneralSettingsPage

---

## Documentation Updates Required

- `_docs/DESIGN_TOKENS.md` (editor UX)
- `_docs/CMS_API.md` (settings UI uses `/settings` endpoints)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-settings-and-design-tokens.md`
