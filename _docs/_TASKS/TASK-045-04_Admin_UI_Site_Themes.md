# TASK-045-04: Admin UI — Site Themes
# FileName: TASK-045-04_Admin_UI_Site_Themes.md

**Priority:** 🔴 High  
**Category:** Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-045-01, TASK-045-02, TASK-045-03  
**Status:** 🟡 To Do

---

## Overview

Dodaj **przyjazną UI sekcję** do tworzenia i zarządzania motywami publicznego frontu.  
Bez JSON, bez kodu, tylko wizard + color picker.

Nowa sekcja w sidebarze:  
**Appearance → Site Themes**

---

## UX Requirements (must-have)

1. **Theme Template Editor**
   - Color pickery + preview
   - Sekcje: Base, Buttons, Inputs, Cards, Typography
   - “Invert colors” button per sekcja
   - Live preview (mini landing)

2. **Profiles list**
   - lista profili (nazwa, opis, aktywny)
   - przycisk “Activate”
   - aktywny zawsze 1

3. **Wizard flow**
   - krok 1: nazwa + opis
   - krok 2: wybór template
   - krok 3: podgląd

---

## Implementation Checklist

| Layer | File | Change |
|------|------|--------|
| UI Shell | `core/admin/ui/site/` | New section |
| Page | `SiteThemesPage.tsx` | List + templates |
| Drawer | `SiteThemeTemplateDrawer.tsx` | Create/edit template |
| Drawer | `SiteThemeProfileDrawer.tsx` | Create profile |
| Preview | `SiteThemePreview.tsx` | preview card |
| Client | `core/admin/services/siteThemesClient.ts` | API calls |

---

## Testing Requirements

- UI smoke tests (render + key buttons)
- No empty states

---

## Documentation Updates Required

- `_docs/SITE_THEMES.md` (UI flow)
- `_docs/_CHANGELOG/<new>.md`
