# TASK-258-04: Consent, Custom Fields, and Public Write Hardening

# FileName: TASK-258-04_Consent_Custom_Fields_and_Public_Write_Hardening.md

**Priority:** High
**Category:** Widgets + Public Write Security + Booking API
**Estimated Effort:** Large
**Dependencies:** TASK-258, TASK-258-01, TASK-258-02
**Status:** To Do

---

## Overview

Add Appointment Form product fields that affect legal consent, custom intake
data, and public write anti-abuse without moving security secrets into widget
data.

This leaf covers:

- BF-05: no custom fields.
- BF-07: no GDPR/terms consent checkbox.
- BF-08: booking public API accepts `captchaToken`, but Appointment Form runtime
  has no UI/runtime bridge to produce or submit it.

## Files to Change

- `core/widgets/core/appointmentForm.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/widgets/core/bookingRuntimeScript.ts`
- `core/server/publicSite.tsx` when Appointment Form runtime hydration needs
  public CAPTCHA metadata in the rendered block data.
- `core/server/publicBookingApi.ts`
- `core/server/validation/bookingSchemas.ts`
- `core/services/booking/bookingRuntimeResolver.ts` when booking runtime data
  becomes the owner of public CAPTCHA metadata for booking widgets.
- `core/services/settings/securitySettings.ts` only if a typed public CAPTCHA
  projection helper must be extracted from existing security settings behavior.
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `tests/vitest/validation/bookingSchemas.test.ts`
- `tests/integration/runtime/appointment-form-runtime-hydration.test.ts`
  (create)
- `tests/unit/server/publicBookingApi.test.ts`
- `tests/security/codersoSecurityGate.test.ts`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`

## New Files to Create

- `tests/integration/runtime/appointment-form-runtime-hydration.test.ts`

## Sub-Tasks

- [ ] Add bounded custom field schema/defaults/normalizer/render/editor support
  for text, email, phone, select, checkbox, and textarea fields.
- [ ] Serialize custom fields into bounded reservation metadata rather than
  top-level unknown public API fields.
- [ ] Add consent configuration with visible label, required flag, and safe
  privacy/terms links.
- [ ] Render consent checkbox and include consent acceptance metadata in the
  public reservation payload.
- [ ] Keep CAPTCHA provider settings backend-owned; expose only the resolved
  runtime public site key/action data when needed.
- [ ] Update the booking runtime script to obtain a CAPTCHA token from the
  backend-owned provider bridge and send it as `captchaToken`.
- [ ] Tighten public booking metadata validation enough to bound custom field
  and consent payloads.
- [ ] Update both route normalization and JSON schema validation so unknown
  reservation metadata keys are rejected before service persistence.

## Implementation Pseudocode

```ts
type AppointmentCustomField = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "checkbox" | "textarea";
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  maxLength?: number;
};

type AppointmentConsent = {
  enabled: boolean;
  required: boolean;
  label: string;
  privacyUrl?: string;
  termsUrl?: string;
};

function normalizeAppointmentCustomFields(input: unknown): AppointmentCustomField[] {
  return toArray(input)
    .slice(0, APPOINTMENT_CUSTOM_FIELD_LIMIT)
    .map(normalizeField)
    .filter((field) => field.id && field.label);
}

function collectAppointmentMetadata(formData: FormData) {
  return {
    customFields: collectBoundedCustomFields(formData, "custom."),
    consent: {
      accepted: formData.get("consentAccepted") === "on",
      label: String(formData.get("consentLabel") || "").slice(0, 240),
    },
  };
}
```

CAPTCHA bridge:

```ts
type BookingRuntimeCaptcha = {
  enabled: boolean;
  provider: "recaptcha_v3";
  siteKey: string;
  action: "public_write";
};

function toBookingRuntimeCaptcha(settings: SecuritySettingsPublic): BookingRuntimeCaptcha | null {
  if (!settings.botProtection.enabled || !settings.botProtection.siteKey) return null;
  return {
    enabled: true,
    provider: "recaptcha_v3",
    siteKey: settings.botProtection.siteKey,
    action: "public_write",
  };
}

async function resolveCaptchaToken(form: HTMLFormElement): Promise<string | undefined> {
  const siteKey = form.dataset.captchaSiteKey;
  const action = form.dataset.captchaAction || "public_write";
  if (!siteKey) return undefined;
  const client = window.grecaptcha;
  if (!client?.execute) throw new Error("captcha_unavailable");
  return client.execute(siteKey, { action });
}
```

Public API validation shape:

```ts
const bookingReservationMetadataSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    flowId: { type: "string", maxLength: 120 },
    pathname: { type: "string", maxLength: 512 },
    consent: {
      type: "object",
      additionalProperties: false,
      properties: {
        accepted: { type: "boolean" },
        label: { type: "string", maxLength: 240 },
      },
    },
    customFields: {
      type: "array",
      maxItems: 12,
      items: appointmentCustomFieldSubmissionSchema,
    },
  },
};
```

This bridge must be wired through the current runtime seam. Today
`publicSite.tsx` injects only `resolved.submissionNonce`/`error` for
Appointment Form blocks, and `resolveBookingRuntimeData` has no public
bot-protection output. TASK-258-04 must implement the narrow backend-owned
bridge:

1. Extend `resolveBookingRuntimeData` with public-only CAPTCHA metadata derived
   from `getSecuritySettingsPublic` when bot protection is enabled and a public
   site key is configured.
2. Inject only that public metadata from `publicSite.tsx` into Appointment Form
   rendered data attributes; never serialize provider secrets, threshold config,
   nonce secrets, or private settings into widget JSON.
3. Update `bookingRuntimeScript.ts` to load/execute the public reCAPTCHA client
   from the resolved site key/action and submit the resulting `captchaToken`
   only for the current reservation attempt.
4. Keep `publicBookingApi.ts` as the route owner for enforcing nonce plus
   CAPTCHA before persistence; the client bridge is only a token acquisition
   path, not a security decision.

Error handling:

- If custom field ids collide, normalize to stable unique ids before rendering.
- If custom select options are empty, reject/drop that custom field during
  Appointment Form normalization and surface an editor warning; do not silently
  render it as a different field type.
- If consent is required and unchecked, HTML `required` blocks normal browser
  submission; the runtime must also avoid sending a payload when the checkbox is
  absent or false.
- If CAPTCHA is required but unavailable, show a user-facing error and do not
  submit.
- If the backend-owned public CAPTCHA metadata cannot be resolved because site
  key configuration is missing, render the existing nonce-protected form and
  surface the resolver warning through read-only diagnostics; do not let widget
  config provide a site key or bypass route enforcement.
- If DB-backed public booking route tests cannot connect to `DATABASE_URL`, keep
  route evidence blocked and still cover metadata schema/normalization with a
  non-DB test.

## Security Contract

This leaf can affect the existing public booking write route.

- Endpoint visibility: existing public `POST /api/booking/reservations`.
- Auth model: unchanged public/internal booking access evaluator.
- RBAC: internal booking writes still require `booking:write`; public writes do
  not gain admin privileges.
- CSRF: preserve booking nonce enforcement when public access policy requires
  it; do not introduce a client-generated substitute for the existing
  nonce/signature contract.
- Rate-limit bucket: `public_write`.
- Reject-unknown validation: route payload and metadata must be allowlisted;
  widget schema must reject unknown custom field config; schema tests must cover
  rejected unknown metadata keys.
- Anti-abuse: CAPTCHA token is resolved from backend-owned public config; widget
  data must not store CAPTCHA secret, provider secret, or nonce secret. Internal
  booking mode continues to use admin session or API key scope rather than
  browser nonce/CAPTCHA.
- Privacy: consent and custom-field values are personal data. Tests and docs
  must use dummy values only and must not log raw submissions.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `bun run test:vitest -- tests/vitest/validation/bookingSchemas.test.ts` for
  bounded consent/custom-field metadata acceptance and reject-unknown cases.
- `bun test tests/integration/runtime/appointment-form-runtime-hydration.test.ts`
  to prove public CAPTCHA metadata is injected into Appointment Form runtime
  markup and provider secrets are not rendered.
- `set -a && source .env && set +a` before DB-backed public booking API tests.
- `bun test tests/unit/server/publicBookingApi.test.ts`; confirm the DB-backed
  reservation assertions ran. If `DATABASE_URL` is unavailable or `canConnect()`
  skips them, record the blocker and add non-DB schema/normalization evidence for
  bounded metadata.
- `bun test tests/security/codersoSecurityGate.test.ts`
- `bun run scan:security:strict` before closure because this leaf touches
  public-write hardening.

## Documentation Updates Required

- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md` fixed evidence for
  BF-05, BF-07, and BF-08.
- `_docs/SECURITY_SPEC.md` only if public booking anti-abuse behavior changes
  beyond the existing policy.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` on completion.

## Acceptance Criteria

- Admin can configure bounded custom fields without raw scripts or arbitrary
  public payload keys.
- Rendered Appointment Form includes consent controls when configured, with safe
  terms/privacy links.
- Public runtime sends bounded custom field and consent metadata.
- CAPTCHA token acquisition remains backend-owned and never exposes secrets in
  widget data.
- Bun public API and security tests cover accepted and rejected payloads.
