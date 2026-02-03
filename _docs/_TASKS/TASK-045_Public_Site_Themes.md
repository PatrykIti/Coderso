# TASK-045: Public Site Themes (Index)
# FileName: TASK-045_Public_Site_Themes.md

**Priority:** 🔴 High  
**Category:** Site/Appearance  
**Estimated Effort:** Large  
**Dependencies:** TASK-044 (Public Pages Rendering), TASK-007 (Design Tokens), TASK-008-01 (Theme Registry)  
**Status:** 🟡 In Progress (2026-02-03)

---

## Overview

Wprowadza **pełny system motywów publicznego frontu** zarządzany z panelu admina (WordPress‑like), bez edycji kodu.

**Co już jest (DONE):**
- Theme registry z `/themes` + `theme.json`
- Theme profiles + routes (`theme_profiles`, `theme_routes`)
- Resolver tokenów (theme defaults + global overrides + profile overrides)
- Admin UI i API dla profili theme

**Co zostało (TODO):**
- **Publiczny build CSS** (`dist/site`) i podłączenie go w runtime publicznym
- Wstrzyknięcie aktywnego profilu (CSS variables) dla publicznych stron

**Cel UX:** prosty, prowadzony wizard + podgląd na żywo + aktywacja profilu jednym kliknięciem.

**Założenie:** wszystko sterowane z UI; na serwerze tylko krytyczne env (np. baza, storage, host).

---

## Sub-Tasks

### TASK-045-01: Site Theme DB Schema (✅ Done — 2026-01-29)
Zrealizowane przez `theme_profiles` i `theme_routes` (bez dodatkowych `site_theme_*`).

### TASK-045-02: Site Theme Service + Resolver (✅ Done — 2026-01-29)
CRUD profili + aktywny profil + resolver tokenów dla frontu.

### TASK-045-03: Public CSS Build Pipeline (🟡 To Do)
Oddzielny build publicznego CSS (Tailwind + tokens) + manifest + pliki w `dist/site`.

**Deliverables:**
- `dist/site/manifest.json` + publiczny CSS entry (nie admin build).
- `renderPublicPage` używa `dist/site` zamiast `dist/client`.
- CSS zawiera tokeny z aktywnego profilu (`getResolvedTokens()` → `toCssVariables`).
- Wpięty build step w pipeline (np. `bun --cwd core build:site`).

### TASK-045-04: Admin UI — Site Themes (✅ Done — 2026-01-29)
Sekcja UI (Visual → Themes) z kreatorem i preview.

### TASK-045-05: API Routes — Site Themes (✅ Done — 2026-01-29)
Endpointy `/themes`, `/theme-profiles`, `/theme-profiles/:id/activate`, `/theme-profiles/:id/routes`.

---

## Testing Requirements
- (DONE) Unit tests dla service/resolver.
- (DONE) Integration tests dla route wiring.
- (DONE) UI smoke tests (render, actions present).
- (TODO) Public CSS pipeline smoke test (manifest exists + CSS injected into public HTML).

---

## Documentation Updates Required
- (DONE) `_docs/THEMES_SPEC.md`, `_docs/DATA_MODEL.md`, `_docs/CMS_API.md`, `_docs/DESIGN_TOKENS.md`, `_docs/ARCHITECTURE.md`
- (TODO) `_docs/SITE_RUNTIME.md` (public CSS/manifest section)
- (TODO) `_docs/_CHANGELOG/<new>.md`
- (TODO) `_docs/README.md` (lista docs)
