# TASK-161: Authentication and Account Recovery Admin UI Assistant Documentation Refresh
# FileName: TASK-161_Authentication_Account_Recovery_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/auth/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the authentication and account
recovery flow based on a real walkthrough of the local admin UI. The goal is to
replace the old generic auth summary with a guided document that matches the
shipped login, two-factor, reset, and reset-confirm screens.

## Scope

1. Review the current auth assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on:
   - `http://localhost:5173/admin/login`
   - `http://localhost:5173/admin/2fa`
   - `http://localhost:5173/admin/reset`
   - `http://localhost:5173/admin/reset/confirm`
   using a clean unauthenticated browser session.
3. Rewrite `docs/screens/authentication-and-account-recovery.md` using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the login flow:
   - email/password form,
   - remember-me,
   - forgot password,
   - SSO area,
   - error handling.
2. Capture the 2FA flow:
   - QR/setup panel,
   - OTP entry,
   - recovery code path,
   - recovery codes panel.
3. Capture the reset-request flow:
   - reset email request,
   - success state,
   - back-to-login.
4. Capture the reset-confirm flow:
   - new password,
   - confirm password,
   - password strength rules,
   - token-missing behavior.
5. Rewrite the doc around the real multi-screen access/recovery journey.

## Acceptance Criteria

1. The auth assistant doc describes the current shipped UI rather than the old
   generic summary.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about login, 2FA, password reset request, and password
   reset confirmation.
4. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual walkthrough of local auth UI in a clean unauthenticated browser session
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/auth/*`

## Documentation Updates Required

- `docs/screens/authentication-and-account-recovery.md`
- `_docs/_TASKS/TASK-161_Authentication_Account_Recovery_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated-free CDP walkthrough completed in a clean browser session
  against:
  - `/admin/login`
  - `/admin/2fa`
  - `/admin/reset`
  - `/admin/reset/confirm`
- The walkthrough confirmed:
  - login form, forgot-password link, and SSO area
  - 2FA QR/setup and recovery-code fallback
  - reset-request form and expiry messaging
  - reset-confirm form and live password-strength rules
- The rewritten doc was verified against:
  - `core/admin/ui/auth/LoginPage.tsx`
  - `core/admin/ui/auth/TwoFactorPage.tsx`
  - `core/admin/ui/auth/ResetPasswordPage.tsx`
  - `core/admin/ui/auth/SetPasswordPage.tsx`
  - `core/admin/ui/layouts/AuthShell.tsx`
- No automated lint or test commands were run because this was a docs-only
  change.
