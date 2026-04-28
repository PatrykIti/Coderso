# TASK-008-05: Themes Admin UI Wiring
# FileName: TASK-008-05_Themes_Admin_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-008-04, TASK-006-27, TASK-006-28  
**Status:** Done (2026-01-29)  

---

## Overview

Podlaczenie istniejącego UI Themes do realnego API. Wymagane stany loading/error,
CRUD profili oraz edycja routes i tokenów profilu.

---

## UI Targets

- `core/admin/ui/themes/ThemesPage.tsx`
  - list themes
  - list profiles
  - activate profile
  - create profile
- `core/admin/ui/themes/ThemeEditorPage.tsx`
  - edycja tokenów profilu
  - edycja routes

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/services/themeClient.ts` | new | GET/POST/PATCH routes |
| `core/admin/ui/themes/ThemesPage.tsx` | wire data | real lists + actions |
| `core/admin/ui/themes/ThemeEditorPage.tsx` | wire editor | save tokens/routes |
| `tests/unit/admin/themeClient.test.ts` | new | endpoints |
| `tests/integration/ui/themes.test.tsx` | update | render with data |

**UI behavior:**
- profile activation -> API call + optimistic update
- create profile -> dialog, then refresh list
- route editor -> validates unique paths

---

## Testing Requirements

- ThemeClient GET/PATCH/POST
- ThemesPage renders profiles from API
- ThemeEditor saves tokens/routes

---

## Documentation Updates Required

- `_docs/THEMES_SPEC.md`
- `_docs/CMS_API.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-themes-ui-wiring.md`
