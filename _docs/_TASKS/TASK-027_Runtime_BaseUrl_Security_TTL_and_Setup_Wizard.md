# TASK-027: Runtime Base URL + Auth TTL + Setup Wizard
# FileName: TASK-027_Runtime_BaseUrl_Security_TTL_and_Setup_Wizard.md

**Priority:** Medium  
**Category:** Core/Settings + Admin UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-004, TASK-007, TASK-002, TASK-003, TASK-006-33, TASK-006-18  
**Status:** To Do  

---

## Overview

Cel: przeniesc krytyczne, ale nie-infrastrukturalne parametry do Settings (DB)
i umozliwic ich konfiguracje z Admin UI. To pozwoli ustawic m.in. publiczny
baseUrl dla preview/linkow oraz polityki sesji i resetu hasla bez restartu.

Dodatkowo dodajemy lekki Setup Wizard przy pierwszym logowaniu, ktory poprosi
o uzupelnienie tych kluczowych ustawien.

**Zakres:**
- `site.baseUrl` w settings (zamiast `PUBLIC_BASE_URL`) + UI.
- `auth.sessionTtlDays` + `auth.resetTtlMinutes` w settings + Security UI.
- Setup Wizard (first-run) do ustawienia: baseUrl, locale, session TTL,
  reset TTL, opcjonalnie site name.
- Zachowac fallback na ENV dla infrastruktury (DB, master key itd).

---

## Architecture

```
core/services/settings/
  settingsService.ts         # rozszerzenie o nowe klucze
core/server/utils/
  publicBaseUrl.ts            # helper do budowania base url
core/server/routes/
  pageRoutes.ts               # preview url z helpera
  contentEntryRoutes.ts       # preview url z helpera
  authRoutes.ts               # reset linki z helpera (jesli wysylamy)
core/admin/ui/settings/
  GeneralSettingsPage.tsx     # dodanie site.baseUrl
  SecuritySettingsPage.tsx    # dodanie ttl fields
core/admin/ui/setup/
  SetupWizard.tsx             # nowy wizard
core/admin/AdminApp.tsx       # uruchomienie wizarda przy first-run
```

---

## Sub-Tasks

### TASK-027-01: Settings keys for baseUrl + auth TTL

**Goal:** Dodac nowe klucze settings i ich walidacje.

**Keys:**
- `site.baseUrl` (string | null)
- `auth.sessionTtlDays` (number, > 0)
- `auth.resetTtlMinutes` (number, > 0)
- `setup.completed` (boolean) - pomocnicze do Setup Wizard

**Files to update:**
- `core/services/settings/settingsService.ts`
  - dodaj defaulty do `DEFAULT_SETTINGS`
  - walidacja typow (string/number/boolean)
  - `listSettings()` zwraca nowe klucze
- `core/services/settings/settingsService.test.ts`
  - testy: set/get dla nowych kluczy + walidacja

**Example:**
```ts
const DEFAULT_SETTINGS = {
  "site.name": "Nextless",
  "site.locale": "en",
  "site.baseUrl": null,
  "design.tokens": {},
  "auth.sessionTtlDays": 14,
  "auth.resetTtlMinutes": 60,
  "setup.completed": false,
};
```

---

### TASK-027-02: Public base URL resolver

**Goal:** Jeden helper do budowania publicznego URL (preview, reset, itp).

**New file:**
- `core/server/utils/publicBaseUrl.ts`

**Behavior:**
1. jeśli `site.baseUrl` w settings -> uzyj tego
2. else jeśli `PUBLIC_BASE_URL` w ENV -> uzyj (kompat)
3. else zbuduj z request (`host`, `x-forwarded-proto`)
4. fallback: `/admin`

**Usage updates:**
- `core/server/routes/pageRoutes.ts`
- `core/server/routes/contentEntryRoutes.ts`
- `core/server/routes/authRoutes.ts` (jesli generujemy reset URL)

**Example:**
```ts
export async function resolvePublicBaseUrl(ctx: RouteContext): Promise<string> {
  const settings = await listSettings();
  if (settings["site.baseUrl"]) return settings["site.baseUrl"];
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
  const host = ctx.headers?.host;
  const proto = ctx.headers?.["x-forwarded-proto"] ?? "http";
  if (host) return `${proto}://${host}`;
  return "/admin";
}
```

---

### TASK-027-03: Session TTL + Reset TTL in auth services

**Goal:** TTL sterowane z settings.

**Updates:**
- `core/services/auth/sessionService.ts`
  - `createSession()` czyta `auth.sessionTtlDays` z settings
- `core/services/auth/passwordResetService.ts`
  - `createResetToken()` uzywa `auth.resetTtlMinutes`
- `core/server/routes/authRoutes.ts`
  - usuwa hardcoded TTL, polega na service layer

**Tests:**
- `tests/unit/auth/sessionService.test.ts` (TTL z settings)
- `tests/unit/auth/passwordResetService.test.ts` (TTL z settings)

---

### TASK-027-04: Admin UI wiring for baseUrl + auth TTL

**General Settings:**
- `core/admin/ui/settings/GeneralSettingsPage.tsx`
  - pole `Site Base URL` (helper text: required for preview/reset links)

**Security Settings:**
- `core/admin/ui/settings/SecuritySettingsPage.tsx`
  - `Session TTL (days)`
  - `Reset token TTL (minutes)`

**Admin API:**
Korzystamy z istniejacych `/settings` endpoints, tylko nowe klucze.

**Tests:**
- UI tests (snapshot / render) dla nowych pol.
- `tests/unit/admin/settingsClient.test.ts` jesli trzeba.

---

### TASK-027-05: First-run Setup Wizard

**Goal:** Po pierwszym logowaniu user widzi wizard, ktory zbiera
`site.baseUrl`, `site.locale`, `site.name`, `auth.sessionTtlDays`,
`auth.resetTtlMinutes`, i zapisuje `setup.completed=true`.

**UI:**
- Nowy komponent: `core/admin/ui/setup/SetupWizard.tsx`
- Renderowany nad `AdminApp` jesli `setup.completed === false`

**Flow:**
1. `AdminApp` pobiera `/settings` przy starcie.
2. Jesli `setup.completed=false` -> pokaz Wizard.
3. Wizard zapisuje `/settings` (bulk) i zamyka sie.

**Security:**
Wizard dostepny tylko po zalogowaniu (admin UI).

**Tests:**
- UI test: wizard renderuje sie gdy `setup.completed=false`
- UI test: wizard nie renderuje sie gdy `setup.completed=true`

---

## Testing Requirements

- Unit tests dla settings keys + TTL behavior
- Unit tests dla `resolvePublicBaseUrl`
- UI tests dla General/Security settings i Setup Wizard
- Integracyjny test route preview (opcjonalnie) dla baseUrl

---

## Documentation Updates Required

- `_docs/CMS_API.md` (nowe settings keys)
- `_docs/ARCHITECTURE.md` (baseUrl z settings)
- `_docs/SECURITY_SPEC.md` (TTL z settings)
- `_docs/README.md` lub `_docs/_TASKS/README.md` (status)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-runtime-baseurl-auth-ttl-setup-wizard.md`
