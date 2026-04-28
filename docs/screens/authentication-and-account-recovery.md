---
title: "Authentication and Account Recovery"
audience: "admin"
productArea: "auth"
language: "en"
keywords:
  - login
  - 2fa
  - reset
  - recovery
---

# Basic

Authentication and Account Recovery covers the pre-admin access flow: sign in,
two-factor verification, password reset request, and password reset
confirmation. It is the route cluster used before a user reaches the main admin
workspace again.

In the current UI, this flow includes:
- `/login`
- `/2fa`
- `/reset`
- `/reset/confirm`

The shipped screens currently provide:
- classic email/password sign-in,
- SSO entry points,
- authenticator-app and recovery-code verification,
- reset-link request,
- new-password confirmation with live strength rules.

Use these screens when onboarding a user, troubleshooting access, rotating
credentials, or validating that security policies still allow legitimate
admins to sign in.

# Medium

The auth flow is not one page. It is a staged access journey:
- `Login`:
  primary credentials and SSO
- `Two-factor authentication`:
  authenticator code or recovery code
- `Reset password`:
  request a secure reset link
- `Set new password`:
  confirm the new password and regain access

The current product emphasizes:
- expected transition from password entry into 2FA,
- recovery-code fallback when the authenticator is unavailable,
- short-lived reset-link behavior,
- live password-strength guidance before final reset confirmation.

# Instruction

1. Start on `Login` when the user still has valid credentials.
2. On `Login`, review:
   - email,
   - password,
   - `Remember me`,
   - `Forgot password?`,
   - available SSO options.
3. Use `Sign in` when email and password are ready.
4. If the account requires the next step, continue into
   `Two-factor authentication`.
5. In `Two-factor authentication`, follow the current two-step structure:
   - scan QR code in an authenticator app,
   - enter the verification code.
6. Use `Use a recovery code` when the authenticator path is unavailable.
7. Review the `Recovery Codes` panel carefully and treat those codes as
   one-time recovery secrets.
8. Use `Copy` or `Download` when the user needs to store the recovery codes
   safely.
9. If the user cannot sign in with the current password, move to
   `Reset password`.
10. In `Reset password`, provide the account email and use `Send reset link`.
11. Treat the reset-link timing note seriously:
    the current UI says the link expires in 1 hour.
12. Use `Back to login` when recovery is no longer needed.
13. In `Set new password`, review:
    - new password,
    - password strength rules,
    - confirm password.
14. Use the live rules to check:
    - at least 8 characters,
    - at least 1 number,
    - at least 1 special character.
15. Use `Update password` only after both password fields match and the reset
    token is valid.
16. Return to `Back to login` when the password update is complete.

Use this safe auth/recovery order when you want fewer access mistakes:
1. Try normal sign-in first.
2. Complete 2FA if prompted.
3. Use reset request only when credentials are no longer usable.
4. Set the new password carefully.
5. Store recovery material safely.

# Advanced

- `Forgot password?` and `Use a recovery code` solve different problems: one is
  credential recovery, the other is second-factor recovery.
- The 2FA screen is intentionally multi-mode. Authenticator code is the default
  path, but the recovery-code fallback is part of the shipped flow.
- Recovery codes are shown as one-time-use tokens, so they should be handled as
  security material, not convenience notes.
- Reset request timing matters. The current UI repeatedly emphasizes the
  1-hour expiry, which means support and ops guidance should not ignore token
  lifetime.
- Password reset confirmation is stronger than a simple form because it includes
  live strength guidance before submission.

# Troubleshooting

- A 2FA prompt appears after correct login:
  that is expected when the account requires second-factor verification.
- The authenticator is unavailable:
  use the recovery-code path instead of treating the account as locked out.
- The reset email was requested but access still fails:
  confirm the link has not expired and the user is on the right reset-confirm
  screen.
- Password reset confirmation fails immediately:
  check whether the token is missing or expired before debugging the password
  itself.
- The user thinks reset is the only option:
  check whether the issue is really missing password vs missing second factor.

# Decision Guide

- Choose normal login vs reset:
  use login when credentials still exist; use reset when the password is no
  longer usable.
- Choose authenticator code vs recovery code:
  use authenticator code by default; use recovery code only when the normal
  second-factor path is unavailable.
- Choose SSO vs email/password:
  use the organization’s intended access path instead of mixing identity methods
  casually.

# Checklist

1. Confirm whether the user needs login, 2FA, or reset.
2. Confirm the correct auth path is being used.
3. Confirm recovery codes are stored safely if shown.
4. Confirm reset links are used within the expected time window.
5. Confirm the new password meets the visible strength rules.

# Security

- Authentication and recovery screens are pre-admin access surfaces and should
  be treated as high-sensitivity security entry points.
- Recovery codes, reset links, and new passwords are all security material and
  should never be handled casually or shared insecurely.
- Bot protection, TTL policies, and other security-side controls can influence
  these screens even when the UI still looks straightforward.
