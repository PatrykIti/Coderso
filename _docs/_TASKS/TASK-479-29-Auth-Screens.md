# TASK-479-29: Auth Screens Migration
# FileName: TASK-479-29-Auth-Screens.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479

---

## Overview

Restyle the real admin authentication screens — login, two-factor, password-reset
request, and set-new-password — plus the shared `AuthShell` layout, to the finished
visual-redesign prototype. The prototype auth flow
(`_docs/_PROTOTYPE/src/pages/auth/*` + `_docs/_PROTOTYPE/src/components/shell/AuthShell.tsx`)
uses the soft & friendly (Notion-like) language: a single **centered** card on a
warm-neutral canvas with a soft violet glow backdrop and a dotted texture, a small
`rounded-2xl` violet logo chip above the card, `rounded-2xl` cards with `shadow-card`,
violet accent links/buttons, light default with a dark toggle (top-right
`ThemeToggle`), and a quiet product/version footer label. This subtask ports that
look onto the real auth pages **without touching the auth flow** — credential submit,
CSRF, reCAPTCHA/bot-protection, rate-limit, redirect, token-error mapping, and
field-error rendering all stay exactly as today; only markup/classes change.

- **Goal:** Make `core/admin/ui/auth/{LoginPage,TwoFactorPage,ResetPasswordPage,SetPasswordPage}.tsx`
  and `core/admin/ui/layouts/AuthShell.tsx` match the prototype's centered-card,
  violet, soft-shadow look while preserving every existing auth behavior, error
  state, and canonical admin-path helper.
- **Owning module/service:** `core/admin/ui/auth/` (pages + `OtpInput`,
  `PasswordStrengthList`, `SsoButtons`, `InfoBanner`, `RecoveryCodesPanel`,
  `AuthBrandPanel`) and `core/admin/ui/layouts/AuthShell.tsx`; shared restyled
  shadcn primitives + `ThemeToggle` from TASK-479-06.
- **Source-of-truth docs:**
  - Prototype pages: `_docs/_PROTOTYPE/src/pages/auth/{LoginPage,TwoFactorPage,ResetPasswordPage,SetPasswordPage}.tsx`
  - Prototype shell: `_docs/_PROTOTYPE/src/components/shell/AuthShell.tsx` (+ `ThemeToggle.tsx`)
  - Prototype primitives: `_docs/_PROTOTYPE/src/components/ui/{card,input,label,button,checkbox,progress}.tsx`
  - Auth contract: `_docs/AUTH_SPEC.md` (login, sessions, CSRF, password reset, OTP/recovery wiring)
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
  - Shell/primitives/`ThemeToggle` landed by parent: TASK-479-06 (consume; do not redefine)
  - `_docs/TESTING_STRATEGY.md` (Vitest lane)
- **Out of scope:** No changes to `authClient` (`login`, `verifyOtp`,
  `requestPasswordReset`, `confirmPasswordReset`, `getAuthBotProtection`,
  `toFieldErrors`), `apiClient`, `recaptcha.ts`, `resolveAdminBasePath` /
  `withAdminBasePath`, or any auth endpoint/route. No new auth methods. No
  self-serve "Create account / Sign up" CTA (admin accounts are invite-only per
  `AUTH_SPEC.md` — the prototype's mock "Create one" link is dropped). No SaaS
  chrome (no workspace switcher, no plans/trial). SSO/social buttons keep their
  existing presentational behavior — do NOT wire fake OAuth. Theme tokens
  (TASK-479-05) and the shared `ThemeToggle` / restyled primitives (TASK-479-06)
  are delivered by those subtasks, not here.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Concretely for the auth surface:

- **CSRF / bot-protection / rate-limit:** untouched. Keep the `getAuthBotProtection`
  → `preloadRecaptcha` mount effect and the `executeRecaptcha(siteKey, action)`
  call inside each submit handler; CSRF is handled inside `authClient` (`X-CSRF-Token`
  from `GET /auth/csrf`) and must not be bypassed or duplicated in the view.
- **Redirects / base path:** every post-auth redirect and in-page auth link keeps
  routing through `resolveAdminBasePath()` + `withAdminBasePath(basePath, "/...")`
  — never a hand-built `/admin/...` string.
- **Token-error mapping:** preserve the stable reset token codes
  (`set_password_token_invalid|expired|used`) and the field-error rendering via
  `toFieldErrors` / `isApiClientError`.
- **Secret handling:** no tokens, recovery codes, or reCAPTCHA secrets are logged
  or persisted in client state beyond what the current pages already hold.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-29-L01 | Auth Shell & Login Restyle | ⏳ To Do |
| TASK-479-29-L02 | 2FA, Reset & Set Password Restyle | ⏳ To Do |
| TASK-479-29-L03 | Auth Tests | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/auth-shell.test.tsx tests/vitest/ui/login.test.tsx tests/vitest/ui/login-alerts.test.tsx tests/vitest/ui/reset-password.test.tsx tests/vitest/ui/otp-input.test.tsx tests/vitest/ui/two-factor.test.tsx tests/vitest/ui/set-password.test.tsx`
- The existing auth render/behavior suites under `tests/vitest/ui/` and
  `tests/vitest/authUi/` must stay green (auth flow unchanged).
- State clearly in the closeout if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics when the status
  of this subtask or its leaves changes.
- `_docs/_CHANGELOG/` — add an entry on closure, cross-linking `TASK-479` and
  `TASK-479-29` (plus the specific leaf id).
- If the documented auth look changes in any UI/admin design doc under
  `_docs/UI/admin_panel/`, note the new centered-card design language there.
  `_docs/AUTH_SPEC.md` stays unchanged (no flow/contract change).
