# TASK-004-07: Auth UI Wiring (Functional)
# FileName: TASK-004-07_Auth_UI_Wiring.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-004-02, TASK-004-06, TASK-006-09, TASK-006-10, TASK-006-11, TASK-006-12  
**Status:** Done (2026-01-28)  

---

## Overview

Wire the authentication UI screens (login, 2FA, reset password, set password) to the real auth API. Replace mock handlers with live requests, handle API errors, and set correct redirects.

**Goal:** A user can log in, complete 2FA if required, request/reset password, and access `/admin` with a session cookie.

---

## UI Screens In Scope

- **Login:** `core/admin/ui/auth/LoginPage.tsx`
- **Two-Factor (OTP):** `core/admin/ui/auth/TwoFactorPage.tsx`
- **Reset Password Request:** `core/admin/ui/auth/ResetPasswordPage.tsx`
- **Set New Password (confirm):** `core/admin/ui/auth/SetPasswordPage.tsx`

---

## API Endpoints

- `POST /auth/login`
- `POST /auth/verify-otp`
- `POST /auth/reset`
- `POST /auth/reset/confirm`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /auth/csrf` (for POSTs with CSRF)

---

## Implementation Checklist

### 1) Auth Client Wiring
**File:** `core/admin/services/authClient.ts`
- Ensure all needed API functions exist (login, verifyOtp, requestPasswordReset, confirmPasswordReset, me, logout).
- Use `apiRequest` with `withCsrf: true` for POSTs that require CSRF.

### 2) Login Page
**File:** `core/admin/ui/auth/LoginPage.tsx`
- On submit, call `login({ email, password })`.
- If response indicates 2FA required, redirect to `/admin/2fa` (store temp session state if needed).
- On success, redirect to `/admin/`.
- Display API errors (use `toFieldErrors` for field-level messages).

### 3) Two-Factor Page
**File:** `core/admin/ui/auth/TwoFactorPage.tsx`
- On submit, call `verifyOtp({ code })` or `verifyOtp({ recoveryCode })`.
- On success, redirect to `/admin/`.
- On error, show inline error message.

### 4) Reset Password (Request)
**File:** `core/admin/ui/auth/ResetPasswordPage.tsx`
- On submit, call `requestPasswordReset({ email })`.
- Show confirmation state (message: "Check your email").

### 5) Set Password (Confirm)
**File:** `core/admin/ui/auth/SetPasswordPage.tsx`
- Read `token` from URL search params.
- On submit, call `confirmPasswordReset({ token, password })`.
- On success, redirect to `/admin/login` with success state.

### 6) Admin App Flow
**File:** `core/admin/app/AdminApp.tsx`
- Ensure `/admin/login`, `/admin/2fa`, `/admin/reset`, `/admin/reset/confirm` are treated as public routes.
- Keep `/admin` protected via `me()` check.

---

## Expected UX

- Login success -> `/admin/`
- Login requires 2FA -> `/admin/2fa`
- Reset request -> success message, no redirect
- Reset confirm -> redirect to `/admin/login`

---

## Tests

**Unit tests (UI):**
- `tests/unit/authUi/loginForm.test.tsx` (update expectations for error state when API fails)
- `tests/unit/authUi/twoFactorForm.test.tsx`
- `tests/unit/authUi/authClient.test.ts` (add cases for reset/otp if missing)

**Integration:**
- Update existing route registration tests if new endpoints are added.

---

## Documentation Updates Required

- `_docs/AUTH_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-auth-ui-wiring.md`
