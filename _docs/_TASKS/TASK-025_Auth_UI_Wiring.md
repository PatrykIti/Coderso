# TASK-025: Auth UI Wiring (Functional)
# FileName: TASK-025_Auth_UI_Wiring.md

**Priority:** High  
**Category:** CMS/Auth  
**Estimated Effort:** Medium  
**Dependencies:** TASK-004, TASK-020, TASK-024, TASK-006-09, TASK-006-10, TASK-006-11, TASK-006-12  
**Status:** To Do

---

## Overview

Podlaczenie ekranow auth (login, 2FA, reset, set password) do REST API
oraz CSRF/session flow. UI ma obslugiwac loading, bledy, redirecty i
stany sukcesu zgodnie z AUTH_SPEC.

**Goals:**
- Formularze wysylaja requesty do `/admin/api/auth/*`.
- CSRF token jest pobierany i dolaczany do mutacji.
- UI pokazuje bledy walidacji i error states.
- Obsluga 2FA (OTP + recovery codes).

---

## Architecture

```
core/admin/services/
  apiClient.ts
  authClient.ts
core/admin/ui/auth/
  LoginPage.tsx
  TwoFactorPage.tsx
  ResetPasswordPage.tsx
  SetPasswordPage.tsx

tests/unit/authUi/
  authClient.test.ts
  loginForm.test.tsx
  twoFactorForm.test.tsx
```

---

## Sub-Tasks

### TASK-025-01_API_client_and_CSRF

**Status:** To Do

- Dodaj `apiClient` (fetch wrapper + JSON parse + error shape).
- Dodaj `authClient` (login/logout/me/csrf/otp/reset/set).
- Ujednolic error mapping do UI.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/services/apiClient.ts` | fetch wrapper + error parsing |
| `core/admin/services/authClient.ts` | funkcje auth (login, csrf, otp, reset) |

Client sketch:

```ts
export async function apiRequest<T>(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}
```

---

### TASK-025-02_Login_and_session_UI

**Status:** To Do

- LoginPage wysyla `POST /auth/login`.
- Po sukcesie redirect do `/admin`.
- Bledy walidacji wyswietlane pod polami.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/auth/LoginPage.tsx` | submit handler + error state |

---

### TASK-025-03_Two_factor_and_recovery

**Status:** To Do

- TwoFactorPage wysyla OTP do `/auth/verify-otp`.
- Obsłuż recovery codes.
- Blad OTP pokazuje inline.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/auth/TwoFactorPage.tsx` | OTP submit + recovery toggle |

---

### TASK-025-04_Reset_and_set_password

**Status:** To Do

- ResetPasswordPage wysyla `POST /auth/reset`.
- SetPasswordPage wysyla `POST /auth/reset/confirm`.
- UI pokazuje sukces (email sent / password updated).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/admin/ui/auth/ResetPasswordPage.tsx` | submit handler |
| `core/admin/ui/auth/SetPasswordPage.tsx` | submit handler |

---

## Testing Requirements

- [ ] `tests/unit/authUi/authClient.test.ts` poprawne payloady i error mapping.
- [ ] `tests/unit/authUi/loginForm.test.tsx` login submit pokazuje error.
- [ ] `tests/unit/authUi/twoFactorForm.test.tsx` OTP submit + recovery.

---

## Documentation Updates Required

- `_docs/AUTH_SPEC.md` (UI flow + errors).
- `_docs/CMS_API.md` (auth payload examples).
- `_docs/SECURITY_SPEC.md` (CSRF notes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-auth-ui-wiring.md`
- Notes: auth UI connected to REST API.

---

## Additional Docs

- `_docs/CMS_SPEC.md`
