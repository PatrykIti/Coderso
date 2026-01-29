# TASK-008-07: Admin UI Theme Tokens Tabs
# FileName: TASK-008-07_Admin_UI_Theme_Tokens_Tabs.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-008-06  
**Status:** Done (2026-01-29)  

---

## Overview

Podziel UI edycji tokenów Admin UI Theme na czytelne zakładki z podglądem
„na żywo” dostosowanym do danej grupy tokenów. Celem jest skrócenie listy,
lepsza nawigacja i mniejsze ryzyko błędnej edycji kolorów.

---

## UX / Information Architecture

Zakładki (proponowane):
1. **Base** – tło, powierzchnie, teksty, obramowania
2. **Buttons** – primary/secondary/outline/ghost
3. **Inputs** – pola formularzy, placeholder, focus ring
4. **Navigation** – sidebar + topbar
5. **Cards** – card bg + border
6. **States** – success / warning / danger

Każda zakładka ma:
- własny **mini-preview** (komponenty dobrane do grupy),
- tylko pola związane z daną sekcją,
- podgląd reaguje na zmiany bez zapisu.

---

## Implementation Scope

### 1) ThemeTemplateDrawer (UI)
`core/admin/ui/themes/ThemeTemplateDrawer.tsx`

- Dodaj shadcn `Tabs` jako główny layout tokenów.
- Każda zakładka renderuje:
  - sekcję pól (ColorInput / picker),
  - dedykowany podgląd.
- Podgląd nie wymaga zapisu – aktualizuje się na zmianę stanu.

### 2) Preview components (UI)
Dodaj małe preview komponenty (można w pliku drawer albo osobne):

**BasePreview**
- karta + teksty + divider

**ButtonsPreview**
- 4 przyciski w wariantach

**InputsPreview**
- input + textarea + focus state (opcjonalnie)

**NavigationPreview**
- mini sidebar + topbar fragment

**CardsPreview**
- 2–3 karty z różnym tłem

**StatesPreview**
- badge / alert w 3 wariantach

### 3) Preview styling
Podgląd powinien korzystać z `style={toAdminThemeCssVariables(...)}` na wrapperze,
aby tokeny działały tak jak w realnym UI.

---

## Files / Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/themes/ThemeTemplateDrawer.tsx` | update | Tabs + podział tokenów + preview |
| `core/admin/ui/themes/ThemeTemplatePreview.tsx` | new (optional) | Preview per tab (jeśli wyodrębnimy) |
| `tests/unit/ui/theme-editor.test.tsx` | update | dostosować do Tabs |
| `tests/unit/ui/themes.test.tsx` | update (jeśli konieczne) | ewentualne zmiany tekstów |

---

## Testing Requirements

- `ThemeTemplateDrawer` renderuje zakładki (Tabs).
- Zmiana tokenu w zakładce aktualizuje preview tej zakładki (snapshot/contains).
- Brak regresji w testach renderu ThemesPage.

---

## Documentation Updates Required

Brak (UI-only). Jeśli pojawią się nowe nazwy w UI, dopisz w `_docs/THEMES_SPEC.md`.

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/077-2026-01-29-admin-ui-theme-tabs.md`
