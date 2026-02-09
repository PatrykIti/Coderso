# TASK-100: Runtime Base URL + Auth TTL + Setup Wizard
# FileName: TASK-100_Runtime_BaseUrl_Security_TTL_and_Setup_Wizard.md

**Priority:** High  
**Category:** Core/Security + Core/Settings + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-004, TASK-007, TASK-020-10, TASK-047, TASK-046  
**Status:** To Do

---

## Overview

TASK-100 domyka konfiguracje runtime i security policy przez Settings (DB),
z pelna kontrola z panelu admina, bez wymagania restartu aplikacji.

Docelowy efekt:
- Publiczny URL runtime ma jedno, przewidywalne zrodlo prawdy.
- TTL sesji i TTL reset tokenu nie sa hardcoded.
- Pierwsze uruchomienie prowadzi admina przez konfiguracje krytycznych ustawien.
- Zachowane sa fallbacki kompatybilnosciowe (ENV + legacy key), ale DB jest nadrzedne.

---

## Scope

1. Canonical runtime URL:
- preferowany key: `site.publicBaseUrl` (juz obecny)
- kompatybilnosc: opcjonalny alias write/read dla `site.baseUrl`

2. Auth TTL runtime:
- `auth.sessionTtlDays` (global auth TTL)
- `auth.resetTtlMinutes` (reset token TTL)
- fallback do bezpiecznych defaultow

3. Setup state:
- `setup.completed` (wizard gate)

4. First-run Setup Wizard:
- prowadzi przez base URL + locale + auth TTL + site name
- zapis przez bulk `PATCH /settings`
- tylko dla uwierzytelnionego admina

---

## Current vs Target

| Area | Current | Target |
| --- | --- | --- |
| Public URL resolver | `site.publicBaseUrl` + ENV fallback | canonical resolver + route/request fallback + shared helper |
| Session TTL | z `security.settings.session.ttlDays` | auth-level TTL w `settings` + bezpieczny fallback i precedence |
| Reset TTL | hardcoded `DEFAULT_RESET_TTL_MS` | runtime z `auth.resetTtlMinutes` |
| Setup gate | brak | `setup.completed` + wizard |
| UX pierwszego uruchomienia | reczna konfiguracja | guided setup flow |

---

## Architecture (Target)

```txt
core/services/settings/settingsService.ts
  -> nowe keys + walidacja + aliasy

core/server/utils/publicBaseUrl.ts
  -> canonical resolver (settings > env > request)

core/services/auth/sessionService.ts
core/services/auth/passwordResetService.ts
  -> TTL z settings (fallback-safe)

core/admin/ui/settings/GeneralSettingsPage.tsx
core/admin/ui/settings/SecuritySettingsPage.tsx
  -> pola runtime URL + auth TTL

core/admin/ui/setup/SetupWizard.tsx
core/admin/app/AdminApp.tsx
  -> first-run gate i zapis setup.completed
```

---

## Physical Sub-Tasks

- `TASK-100-01_Settings_Keys_and_Runtime_Validation.md`
- `TASK-100-02_Public_Base_Url_Resolver_and_Consumers.md`
- `TASK-100-03_Auth_TTL_Runtime_Sources.md`
- `TASK-100-04_Admin_UI_Runtime_URL_and_Auth_TTL_Wiring.md`
- `TASK-100-05_First_Run_Setup_Wizard_and_Gating.md`

---

## Implementation Order

1. `100-01` kontrakty settings i walidacja.
2. `100-02` resolver URL i konsumenci preview/reset.
3. `100-03` TTL runtime w auth services.
4. `100-04` admin UI wiring i walidacja formularzy.
5. `100-05` wizard + gate + final integration.

---

## Security Requirements

- Brak cichych fallbackow do niepoprawnych wartosci (walidacja strict).
- Brak ujawniania sekretnych/politykowych wartosci w logach bledow.
- Wizard dostepny tylko po auth.
- Bulk update wizarda idempotentny i transakcyjny.
- TTL limits: minimalne i maksymalne progi, aby uniknac niebezpiecznych konfiguracji.

---

## Testing Strategy

- Unit: settings validation, URL resolver, TTL calculations.
- Integration: auth/login + reset token expiry behavior.
- UI: general/security forms + setup wizard gate.
- Regression: preview URL contracts dla page/content/widget-template.

---

## Documentation Updates Required (After Each Sub-Task)

- Po `100-01`: `_docs/CMS_API.md`, `_docs/SECURITY_SPEC.md`
- Po `100-02`: `_docs/CMS_API.md`, `_docs/PREVIEW_SPEC.md`
- Po `100-03`: `_docs/SECURITY_SPEC.md`, `_docs/AUTH_SPEC.md`
- Po `100-04`: `_docs/UI` sekcje ustawien + `_docs/CMS_API.md`
- Po `100-05`: `_docs/ARCHITECTURE.md`, `_docs/CMS_SPEC.md`
- Po calosci: `_docs/_TASKS/README.md` + nowy wpis `_docs/_CHANGELOG/*`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-runtime-baseurl-auth-ttl-setup-wizard.md`
