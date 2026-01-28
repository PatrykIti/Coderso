# TASK-006-33: General Settings UI (Visual)
# FileName: TASK-006-33_General_Settings_UI.md

**Priority:** Medium  
**Category:** Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007, TASK-024  
**Status:** To Do

---

## Overview

Create the “Settings → General” screen (site name, locale, timezone, logo).
Visual-only layer until settings endpoints are wired.

## Reference UI

- `_docs/UI/admin_panel/33-general-settings/code.html`
- `_docs/UI/admin_panel/33-general-settings/screen.png`

## UI Composition

**Wrapper:** `SettingsShell`

**Sections:**
- Site identity card (name, locale, timezone).
- Logo + favicon upload panel.
- Save bar.

## Shadcn Components

- `Card`, `Button`, `Input`, `Select`, `Separator`.

## File Plan

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/GeneralSettingsPage.tsx` | create | main layout |
| `core/admin/ui/settings/BrandingCard.tsx` | create | name/locale/timezone |
| `core/admin/ui/settings/LogoUploadCard.tsx` | create | uploads |

## Data + State

- `GET /settings/general`
- `PATCH /settings/general`

## Unit Tests

- `tests/unit/ui/general-settings.test.tsx` renders cards.

## Documentation Updates Required

- None (UI only).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-general-settings-ui.md`
