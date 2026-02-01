# TASK-045: Public Site Themes (Index)
# FileName: TASK-045_Public_Site_Themes.md

**Priority:** 🔴 High  
**Category:** Site/Appearance  
**Estimated Effort:** Large  
**Dependencies:** TASK-044 (Public Pages Rendering), TASK-007 (Design Tokens), TASK-010 (Page Builder UI)  
**Status:** 🟡 To Do

---

## Overview

Wprowadza **pełny system motywów frontendu** (public site) zarządzany w 100% z panelu admina — bez edycji kodu.

**Cel UX:** prosty, prowadzony wizard + podgląd na żywo + aktywacja profilu jednym kliknięciem.

**Kluczowe założenia:**
- Użytkownik końcowy nie edytuje JSON; tylko UI (color pickery, suwaki, preset).
- Dwa poziomy:
  1) **Theme Template** (zestaw tokenów / kolorów / typografii)
  2) **Theme Profile** (nazwa + template + aktywacja)
- Public site używa **osobnego CSS (nie z admin UI)**.

---

## Sub-Tasks

### TASK-045-01: Site Theme DB Schema
Dodaj tabele `site_theme_templates` i `site_theme_profiles` + migracje.

### TASK-045-02: Site Theme Service + Resolver
Serwis do CRUD template/profiles + resolver aktywnego profilu i generowania CSS variables.

### TASK-045-03: Frontend CSS Build Pipeline
Oddzielny build publicznego CSS (Tailwind + tokens) + manifest + pliki w `dist/site`.

### TASK-045-04: Admin UI — Site Themes
Nowa sekcja UI (Appearance → Site Themes) z kreatorem i preview.

### TASK-045-05: API Routes — Site Themes
Endpointy do listowania, edycji i aktywacji profili.

---

## Testing Requirements
- Unit tests dla service/resolver.
- Integration tests dla route wiring.
- UI smoke tests (render, actions present).

---

## Documentation Updates Required
- `_docs/CMS_API.md`
- `_docs/DATA_MODEL.md`
- `_docs/SITE_THEMES.md` (nowy)
- `_docs/_CHANGELOG/<nowy>.md`
