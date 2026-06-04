# TASK-402: reCAPTCHA Runtime Configuration and Eager Client Loading
# FileName: TASK-402_Recaptcha_Runtime_Configuration_and_Eager_Client_Loading.md

**Priority:** High
**Category:** Core/Security + Admin UI + Widgets/Runtime
**Estimated Effort:** Medium
**Dependencies:** TASK-020-11, TASK-269-05, TASK-394-03, TASK-396-04
**Status:** Done (2026-06-04)

---

## Overview

Production and local operators configure Google reCAPTCHA v3 from Admin
Settings -> Security, persisted in `security.settings.botProtection`. That
backend-owned contract already projects only the safe public `siteKey` to
`/auth/bot-protection` and public form/booking runtime data while keeping the
secret server-only.

The broken behavior was in the client load path: admin auth pages and public
runtime scripts loaded Google's v3 client only at submit time. That can still
support token generation, but it does not make the v3 badge visible when an
enabled protected login or public form first renders.

This task keeps reCAPTCHA configuration backend-owned and eagerly loads the v3
client only when a safe public site key has already been projected by the
backend.

---

## Security Contract

- **Endpoint visibility:** `GET /auth/bot-protection` remains public read-only;
  `POST /auth/login`, `POST /auth/reset`, `POST /forms/:id/submissions`, and
  `POST /api/booking/reservations` keep their existing public write visibility.
- **Auth model:** login/reset remain anonymous auth endpoints; internal/admin
  form/booking modes continue to require admin session or API key scope and
  skip captcha by default.
- **RBAC:** no new admin resource or permission is introduced.
- **CSRF:** no new admin mutation is introduced; existing admin settings writes
  continue to require session plus CSRF.
- **Rate-limit bucket:** login/reset keep `auth`; public forms/booking keep
  `public_write`; bot-protection config stays public read.
- **Validation:** route schemas continue to reject unknown fields; captcha
  tokens remain bounded string inputs.
- **Anti-abuse controls:** public write paths keep nonce/signature/HMAC plus
  optional reCAPTCHA according to backend-owned `security.settings`.
  Only public site keys may reach browser HTML/cache; secret/private keys remain
  server-only and must not be emitted to localStorage, debug payloads, HTML, or
  API responses.

---

## Sub-Tasks

- [x] Keep bot-protection configuration backend-owned through
  `security.settings.botProtection`; do not bootstrap reCAPTCHA keys from ENV.
- [x] Add reusable client helpers that can preload the Google v3 script from a
  projected site key and execute tokens after `grecaptcha.ready`.
- [x] Eagerly preload reCAPTCHA on admin login/reset when `/auth/bot-protection`
  reports an enabled config with a site key.
- [x] Eagerly preload reCAPTCHA for public Forms and Appointment Form runtime
  nodes when their resolved data contains a captcha site key.
- [x] Add focused Bun/Vitest coverage for backend settings behavior, auth helper
  preloading, and public runtime eager script insertion.
- [x] Verify locally with `playwright-cli` against localhost/coderso-a.localhost
  without printing any reCAPTCHA secret values.

---

## Implementation Pseudocode

```ts
export async function preloadRecaptcha(siteKey: string): Promise<void> {
  await loadScript(siteKey);
  await waitForReady();
}

export async function executeRecaptcha(siteKey: string, action: string) {
  await preloadRecaptcha(siteKey);
  return window.grecaptcha.execute(siteKey, { action });
}
```

Runtime script flow:

```js
const preloadRuntimeRecaptcha = (form) => {
  const siteKey = form.dataset.formCaptchaSiteKey || form.dataset.captchaSiteKey;
  if (siteKey) loadRecaptcha(siteKey).catch(() => undefined);
};

bindForm(form) {
  preloadRuntimeRecaptcha(form);
  form.addEventListener("submit", async () => {
    const token = await executeRecaptcha(siteKey, action);
  });
}
```

Error handling:

- Missing backend-stored key pair leaves bot protection disabled by default, and
  enabling bot protection without stored keys keeps the existing fail-fast
  validation.
- Script preload failures are swallowed during eager loading so page rendering is
  not blocked; submit still surfaces the existing verification error.
- Existing `recaptcha_load_failed`, `recaptcha_unavailable`, and backend
  `bot_protection_*` error codes remain stable.

Regression-test shape:

- Pure defaults test: reCAPTCHA-related ENV values do not configure
  bot-protection; only backend-owned settings do.
- Auth helper test: `preloadRecaptcha` appends one encoded Google script and
  waits for `grecaptcha.ready`; `executeRecaptcha` reuses the same promise.
- Login/reset UI test or helper-level coverage: enabled bot config with site key
  starts preload after config resolution.
- Form runtime script test: installing a public form with `botProtection.siteKey`
  appends the Google script before submit and still sends `captchaToken` on
  submit.
- Booking runtime script test: appointment form with resolved captcha preloads
  before submit and keeps internal selected services captcha-free.

---

## Testing Requirements

- `bun test tests/unit/security/securitySettings.test.ts`
- `bun run test:vitest -- tests/vitest/ui/recaptcha-block-dnd.test.ts tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts tests/vitest/forms/formRuntimeResolver.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted `playwright-cli` smoke against localhost for `/admin/login` and at
  least one public page/form path where fixture data is available.

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`: document backend-owned bot-protection configuration
  and clarify that only public site keys are projected to clients.
- `docs/develop/security.md`: mirror the developer-facing reCAPTCHA runtime
  configuration guidance.
- `_docs/_CHANGELOG/`: add a task-linked entry at closure.
- `_docs/_TASKS/README.md`: keep board status and statistics synchronized.
