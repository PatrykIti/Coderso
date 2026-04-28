# TASK-046-05: Admin UI — Site Settings
# FileName: TASK-046-05_Admin_UI_Site_Settings.md

**Priority:** 🔴 High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-046-01  
**Status:** ✅ Done (2026-02-03)

---

## Overview

Dodaj **Site Settings** w panelu admina (user‑friendly):

- Base URL
- Homepage selection
- 404 page selection
- Preview toggle
- Content Type routes (list/detail)

---

## UX Requirements

1. **Wizard**
   - krok 1: Base URL
   - krok 2: Homepage + 404
   - krok 3: Content routes

2. **Guided UI**
   - dropdowny z listą stron
   - auto-sugerowane ścieżki
   - walidacja konfliktów

3. **Quick actions**
   - “Test preview URL”
   - “View homepage”

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| UI | `core/admin/ui/site/SiteSettingsPage.tsx` | main page |
| UI | `core/admin/ui/site/SiteRouteEditor.tsx` | route per content type |
| Client | `core/admin/services/siteSettingsClient.ts` | GET/PATCH |
| Nav | `core/admin/ui/settings/SettingsSidebar.tsx` | add Site entry |

---

## Testing Requirements

- UI smoke tests (render + buttons)
- Validation on save

---

## Documentation Updates Required

- `_docs/SITE_RUNTIME.md`
- `_docs/_CHANGELOG/<new>.md`
