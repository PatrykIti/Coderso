# TASK-100-04: Admin UI Runtime URL and Auth TTL Wiring
# FileName: TASK-100-04_Admin_UI_Runtime_URL_and_Auth_TTL_Wiring.md

**Priority:** High  
**Category:** Admin/UI + Core/Settings  
**Estimated Effort:** Medium  
**Dependencies:** TASK-100-01, TASK-100-03, TASK-006-33, TASK-006-18  
**Status:** To Do

---

## Overview

Dodajemy pelne UI wiring dla runtime URL i auth TTL:
- user-friendly pola,
- czytelne helpery i walidacja,
- poprawne mapowanie payloadu `PATCH /settings`.

---

## UX Requirements

### General Settings

- Pole: `Public Site URL`
- Placeholder: `https://example.com`
- Helper: "Used for preview links, reset links, and runtime absolute URLs."
- Validation:
  - accept empty (null) lub poprawny `http/https`
  - inline error przed save

### Security Settings

- Pole: `Auth session TTL (days)`
- Pole: `Password reset TTL (minutes)`
- Validation:
  - integers w zakresie (days: 1..365, minutes: 5..1440)
  - inline error + block save/autosave on invalid

---

## Pseudo-Implementation

```ts
// core/admin/app/AdminApp.tsx
const resolveSettingsPayload = (payload) => ({
  // existing...
  publicBaseUrl: normalizeOptionalString(payload["site.publicBaseUrl"]),
  authSessionTtlDays: normalizeBoundedInt(payload["auth.sessionTtlDays"], 1, 365, 14),
  authResetTtlMinutes: normalizeBoundedInt(payload["auth.resetTtlMinutes"], 5, 1440, 60),
});
```

```ts
// save mapping (General + Security UI)
await updateSettings({
  "site.publicBaseUrl": normalizeBaseUrlInput(form.publicBaseUrl),
  "auth.sessionTtlDays": Number(form.authSessionTtlDays),
  "auth.resetTtlMinutes": Number(form.authResetTtlMinutes),
});
```

---

## Physical Files

| File | Action | Notes |
| --- | --- | --- |
| `core/admin/ui/settings/GeneralSettingsPage.tsx` | update | add/edit public URL field + validation copy |
| `core/admin/ui/settings/SecuritySettingsPage.tsx` | update | auth TTL fields + validation |
| `core/admin/app/AdminApp.tsx` | update | settings payload mapping for new keys |
| `core/admin/services/settingsClient.ts` | update | typed contracts for new keys |
| `tests/unit/ui/general-settings.test.tsx` | update | render + validation hints |
| `tests/unit/ui/security-settings.test.tsx` | update | render auth TTL inputs |
| `tests/integration/ui/settings.test.tsx` | update | basic screen parity |

---

## Acceptance Criteria

- Admin moze ustawic runtime public URL bez edycji ENV.
- Admin moze ustawic oba auth TTL z walidacja zakresow.
- Save/autosave nie wysyla niepoprawnych wartosci.
- UI jest spojne z tokenized theme i stylem panelu.

---

## Testing Requirements

- Unit UI:
  - new fields visible
  - validation errors shown for invalid values
- Unit admin client:
  - payload includes new keys
- Integration UI:
  - settings screen renders without regressions

---

## Documentation Updates Required

- `_docs/CMS_API.md` (example payload z nowymi keys)
- `_docs/SECURITY_SPEC.md` (auth TTL admin-managed)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-task-100-04-admin-ui-runtime-url-auth-ttl.md`
