# TASK-008-06: Admin UI Theme Templates
# FileName: TASK-008-06_Admin_UI_Theme_Templates.md

**Priority:** High  
**Category:** Admin/UI + Theme System  
**Estimated Effort:** Large  
**Dependencies:** TASK-008-05, TASK-007-05, TASK-006-27, TASK-006-28  
**Status:** Done (2026-01-29)  

---

## Overview

Przebudowa systemu Themes tak, aby był **w pełni UI‑driven** i intuicyjny:

- **Theme Templates** (szablony) są tworzone w panelu admina, zapisane w DB.
- **Theme Profiles** wybierają tylko template + nazwa/opis + status aktywny.
- Brak edycji JSON „na żywo” (JSON tylko import/export).
- Granularne tokeny: osobne grupy dla background, border, hover, input, buttons, sidebar itd.
- Rozdzielenie pojęć: **Admin UI Theme** vs **Site Themes** (front).

---

## Target UX (User Flow)

**Visual → Admin UI Theme**

1. **Available Theme Templates**
   - Lista template’ów
   - „Create Theme Template” -> panel tworzenia (pickery)
   - Export / Import (JSON)

2. **Available Profiles**
   - Lista profili
   - „Create Profile” -> wybór template + nazwa + opis
   - Aktywacja profilu = aktywacja template’u

**Profile = tylko wybór template (bez overrides)**  
Override’y jako „Advanced” dopiero w v2.

---

## Data Model (DB)

Dodajemy osobne tabele dla admin‑theme:

### `admin_theme_templates`
- `id` (uuid)
- `name` (string, unique)
- `description` (string, nullable)
- `tokens` (jsonb, structured)
- `created_at`, `updated_at`

### `admin_theme_profiles`
- `id` (uuid)
- `name` (string)
- `description` (string, nullable)
- `template_id` (uuid FK)
- `is_active` (bool)
- `created_at`, `updated_at`

**Migration:** nowy plik SQL + snapshot.

**Optional:** migracja danych z poprzednich `theme_profiles` (jeśli istnieją)
do nowego modelu admin‑themes.

---

## Token Schema (Granular)

Nowy typ: `AdminThemeTokens` (TS + validation).
Przykładowe sekcje (minimum):

```ts
base: {
  bg: string,
  surface: string,
  text: string,
  border: string,
},
buttons: {
  primary: { bg, text, hoverBg, hoverText },
  secondary: { bg, text, hoverBg, hoverText },
  outline: { border, text, hoverBg, hoverText },
  ghost: { hoverBg, hoverText },
},
inputs: {
  bg, border, text, placeholder, focusRing
},
sidebar: {
  bg, text, activeBg, activeText, hoverBg
},
topbar: { bg, text, border },
card: { bg, border },
state: { success, warning, danger }
```

**JSON nadal istnieje** (do eksportu/importu), ale UI używa pickerów.

---

## UI Scope

### 1) Visual → Admin UI Theme (rename)
- Zmien `Themes` → `Admin UI Theme`
- Dodaj drugi blok „Theme Templates”
- Wyraźne odróżnienie od frontendowych „Site Themes”

### 2) Theme Templates CRUD
Nowe ekrany/drawery:
- `ThemeTemplateList`
- `ThemeTemplateEditor` (pickery, podgląd na żywo)
- `ThemeTemplateExportDialog`

### 3) Profiles CRUD
Update: `ThemeProfileDrawer`
- pola: name, description, template select
- brak JSON
- select z listy template

---

## API (Admin)

Nowe endpointy:

```
GET    /admin/api/admin-theme-templates
POST   /admin/api/admin-theme-templates
PATCH  /admin/api/admin-theme-templates/:id
DELETE /admin/api/admin-theme-templates/:id

GET    /admin/api/admin-theme-profiles
POST   /admin/api/admin-theme-profiles
PATCH  /admin/api/admin-theme-profiles/:id
POST   /admin/api/admin-theme-profiles/:id/activate
```

**Aktywacja profilu** → zapisuje aktywny profil + trigger `theme:updated`.

---

## Mapping → CSS Variables

Dodaj mapowanie granularnych tokenów na CSS variables:

- `--admin-bg`, `--admin-text`, `--admin-border`, itd.
- Aktualizuj `core/admin/styles/globals.css` aby Tailwind bazował na nowych varach.

Wymóg: **każdy token ma 1:1 wpływ na UI**.

---

## Files / Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/db/schema.ts` | update | admin_theme_templates + admin_theme_profiles |
| `core/db/migrations/0012_admin_themes.sql` | new | create tables |
| `core/services/adminThemes/*` | new | CRUD + validation |
| `core/server/routes/adminThemeRoutes.ts` | new | REST endpoints |
| `core/admin/services/adminThemeClient.ts` | new | API client |
| `core/admin/ui/themes/*` | update | templates + profiles split |
| `core/ui/theme/tokenCss.ts` | update | new var mapping |
| `core/admin/styles/globals.css` | update | use new vars |
| `tests/unit/admin/adminThemeClient.test.ts` | new | client |
| `tests/unit/ui/admin-theme-template.test.tsx` | new | render |
| `tests/integration/ui/themes.test.tsx` | update | new layout |

---

## Testing Requirements

- CRUD admin theme templates
- Profile create/activate
- token schema validation
- UI renders template list + profile list

---

## Documentation Updates Required

- `_docs/THEMES_SPEC.md` (admin vs site themes)
- `_docs/DESIGN_TOKENS.md` (new granular model)
- `_docs/ARCHITECTURE.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/076-2026-01-29-admin-ui-themes.md`
