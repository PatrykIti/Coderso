# TASK-007-05: Settings UI Wiring
# FileName: TASK-007-05_Settings_UI_Wiring.md

**Priority:** Medium  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-007-02, TASK-007-04  
**Status:** Done (2026-01-29)  

---

## Overview

Podlaczenie UI ustawien do realnych endpointow `/settings` oraz
`/settings/:key`. Zastepujemy mocki i stale danymi z API.

**Scope:**
- `/admin/settings` (Design Tokens) pobiera/synchronizuje `design.tokens`.
- `/admin/settings/general` zapisuje `site.name`, `site.locale`.
- Obsluga stanu loading/error/success.

---

## Architecture

```
core/admin/services/settingsClient.ts
core/admin/ui/settings/SettingsPage.tsx
core/admin/ui/settings/GeneralSettingsPage.tsx
core/admin/app/AdminApp.tsx
tests/unit/admin/settingsClient.test.ts
tests/integration/ui/settings.test.tsx
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/services/settingsClient.ts` | add `getSettings`, `updateSettings`, `getSetting` | reuse CSRF |
| `core/admin/app/AdminApp.tsx` | hydrate settings + tokens | pass props to SettingsPage |
| `core/admin/ui/settings/SettingsPage.tsx` | use real data | loading + save |
| `core/admin/ui/settings/GeneralSettingsPage.tsx` | bind inputs | save to `/settings` |
| `tests/unit/admin/settingsClient.test.ts` | new endpoints | GET/PATCH |
| `tests/integration/ui/settings.test.tsx` | wiring smoke | settings render + save |

### API payloads

**Bulk update** (`PATCH /settings`):
```json
{
  "site.name": "Nextless",
  "site.locale": "pl-PL",
  "design.tokens": { "colors": { "primary": "#000" } }
}
```

**Single update** (`PATCH /settings/:key`):
```json
{ "value": "pl-PL" }
```

---

## UI behavior

- `/admin/settings` pokazuje aktualne `design.tokens` (merged).
- Save zapisuje overrides do `settings["design.tokens"]`.
- Reset usuwa overrides (send `{ "design.tokens": {} }`).
- `/admin/settings/general` zapisuje `site.name` i `site.locale`.
- Stany: loading spinner, error banner, success toast (lub alert).

---

## Testing Requirements

- Unit:
  - `settingsClient` GET `/settings`
  - `settingsClient` PATCH `/settings`
- Integration UI:
  - SettingsPage renders fetched tokens
  - GeneralSettingsPage save triggers PATCH

---

## Documentation Updates Required

- `_docs/CMS_API.md` (confirm settings endpoints usage)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-settings-ui-wiring.md`
