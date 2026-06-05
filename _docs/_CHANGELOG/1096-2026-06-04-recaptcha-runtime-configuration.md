# 1096 - reCAPTCHA backend configuration and eager loading

Date: 2026-06-04
Version: Unreleased
Tasks: TASK-402

## Key Changes

### Security / Runtime

- Kept reCAPTCHA v3 configuration backend-owned through
  `security.settings.botProtection`, without ENV bootstrap paths for site or
  secret keys.
- Preserved the existing server-only secret handling and public site-key
  projection.
- Documented that runtime bot-protection keys are managed from Admin Settings
  -> Security.

### Admin UI / Widgets

- Added reusable reCAPTCHA preload handling that loads the Google v3 client with
  an encoded site key, waits for `grecaptcha.ready`, and retries after script
  load failures.
- Eagerly preloads reCAPTCHA on admin login/reset once `/auth/bot-protection`
  reports an enabled config with a site key.
- Eagerly preloads reCAPTCHA for public Forms and Appointment Form runtime nodes
  when their resolved runtime data includes a captcha site key.

### QA

- Added focused Bun and Vitest coverage for backend settings behavior, auth
  helper preload semantics, and public runtime eager script insertion.
- Verified the runtime locally through `coderso-dev-core-host` and
  `playwright-cli` on admin login plus a public appointment form page without
  exposing secret values.

## Validation

- `set -a && source .env && set +a && bun test tests/unit/security/securitySettings.test.ts`
- `bun run test:vitest -- tests/vitest/ui/recaptcha-block-dnd.test.ts tests/vitest/widgets/formRuntimeScript.test.ts tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts tests/vitest/forms/formRuntimeResolver.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun test tests/security/codersoSecurityGate.test.ts`
- `bun run gates:coderso`
- `bun run scan:security`
- `coderso-dev-core-host`
- `playwright-cli` smoke for `/admin/login`
- `playwright-cli` smoke for `/test-appointment-form-0516`
