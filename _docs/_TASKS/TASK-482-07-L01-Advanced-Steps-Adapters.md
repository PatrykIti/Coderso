# TASK-482-07-L01: Advanced step adapters over email/storage/security/assistant
# FileName: TASK-482-07-L01-Advanced-Steps-Adapters.md

**Parent Subtask:** TASK-482-07
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-04-L02 (renderStep); lands strictly after TASK-482-05/06 — TASK-482-05-L02 wires the Basic steps into the **same** `renderStep` switch/file, so the pinned land order 04 → 05 → 06 → 07 → 08 (single writer per file) applies. See the parent's "Coordination Pins" section (changelog 1220 pinned; forbidden paths; shared remote test DB; additive-only shared surfaces).
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Render Advanced-track wizard steps that reuse the existing dedicated
  settings surfaces — email, storage, security, assistant — as thin adapters.
  The wizard collects values and writes them through the same endpoints the
  standalone settings screens use, inheriting their validation and **secret
  redaction** (no plaintext secrets are ever read back to the client).
- **Owning module(s) to create/extend:**
  - Adapter step components under `core/admin/ui/setup/steps/advanced/`
    (`EmailStep.tsx`, `StorageStep.tsx`, `SecurityStep.tsx`, `AssistantStep.tsx`)
    wired into `renderStep` (04-L02) for `track: "advanced"` steps.
  - Reuse existing admin clients/forms backing:
    - `PATCH /settings/storage` (`storageSettingsSchema`, `settingsRoutes.ts`).
    - `PATCH /settings/security` (`securitySettingsSchema`). The `SecurityStep`
      ALSO surfaces the two auth-TTL fields — `auth.sessionTtlDays` and the
      re-homed `auth.resetTtlMinutes` — which are written via bulk
      `PATCH /settings` (not `/settings/security`); their ownership, precedence
      and validators are defined by 07-L02 (the Basic finalize no longer
      persists them, so the Advanced Security step is their sole wizard home).
    - Email settings via **`PUT /settings/email`**
      (`core/server/routes/emailSettingsRoutes.ts:61`) through the existing
      `updateEmailSettings()` client in `core/admin/services/emailClient.ts`
      (method `PUT`, `withCsrf: true`). Note: the method is PUT, not PATCH —
      the Bun wiring test `tests/integration/routes/emailSettings.test.ts:40`
      asserts `"PUT /settings/email"`.
    - Assistant toggles/limits via the assistant settings keys (`assistant.*`
      in `settingsService.ts` — enabled/provider/model/limits only, **no API
      key among them**), saved through the existing `saveAssistantSettings`
      path in `AdminApp.tsx` (bulk `PATCH /settings`).
    - **Provider API keys** (openai/openrouter for the assistant; resend for
      email) live in the **integrations** surface, not in `assistant.*`:
      `GET /settings/integrations/:id` returns masked config (a `configured`
      flag, never the secret) and `PATCH /settings/integrations/:id`
      (`integrationUpdateSchema`) writes them, both in
      `core/server/routes/integrationsRoutes.ts`. The assistant consumes them
      at runtime via `getIntegrationRuntimeConfig("openai" | "openrouter")`
      (`core/services/assistant/providers/index.ts`). If the `AssistantStep`
      offers API-key entry, it writes through that integrations PATCH — do not
      invent a new key path.
  - Prefer composing the **existing** settings form components rather than
    duplicating fields, to keep redaction + validation in one place.
- **Source-of-truth docs:** `_docs/SECURITY_SPEC.md`, `_docs/INTEGRATIONS.md`,
  `_docs/ASSISTANT_GUIDE.md`, `_docs/MEDIA_SPEC.md` (storage), `_docs/SETTINGS.md`,
  `_docs/CMS_API.md`.
- **Out-of-scope:** TTL reconciliation (07-L02); changing the underlying
  settings schemas (reuse as-is).

## Security Contract

- **Endpoint visibility:** internal — all writes go to existing `/admin/api/.../settings/*`
  endpoints. No new endpoints are introduced here.
- **Auth model:** authenticated admin session (Phase 2).
- **RBAC permission(s):** `settings:write` (per the existing routes); each step
  surfaces a permission notice if absent.
- **CSRF on internal writes:** required — reuse the existing settings clients that
  attach the session CSRF token; do not hand-roll fetches.
- **Rate-limit bucket:** `admin_write` (inherited).
- **Validation schema-owner module:** the existing per-domain schemas remain the
  owners — `storageSettingsSchema`, `securitySettingsSchema`, the email schema,
  assistant normalizers in `settingsService.ts`. The wizard adapters add only
  client-side guidance; they must not redeclare server schemas.
- **Anti-abuse:** N/A (authenticated internal writes).
- **Secret/PII handling — critical:** SMTP passwords, storage access keys, and
  provider API keys (via `PATCH /settings/integrations/:id` — see Overview; the
  `assistant.*` settings keys carry no secrets) must follow the existing
  redaction seams (the GET endpoints return masked secrets/`configured` flags;
  writes are write-only). The wizard must:
  - Never display a previously stored secret in plaintext (show "configured" +
    a replace affordance, exactly as the standalone screens do).
  - Never write a secret into `settingsState`, localStorage, the admin theme
    cache, or logs.
  - Treat empty secret fields as "leave unchanged" by **omitting** the key from
    the payload. Caution: the email server treats an explicit empty string or
    `null` `smtp.password` as **"clear the stored secret"**
    (`normalizeString("")` → `null` → the stored value is set to `null` in
    `core/services/email/emailSettingsService.ts`), so passing `""` through
    would wipe a configured password — `stripUnchangedSecrets` must drop
    untouched secret keys, never forward `""`.

## Implementation Pseudocode

```tsx
// Each advanced step delegates to the existing settings form + client.
function EmailStep({ values, onSaved }) {
  // Reuse the existing email settings form component if present; else compose its fields.
  return <ExistingEmailSettingsForm
    initial={maskedEmailSettings}              // secrets shown as "configured", never plaintext
    onSubmit={async (patch) => {
      // Omit untouched secret keys entirely: the server clears the stored SMTP
      // password when it receives "" or null, so "" must never pass through.
      const safePatch = stripUnchangedSecrets(patch);
      await updateEmailSettings(safePatch); // PUT /settings/email, CSRF via emailClient.ts
      onSaved();
    }} />;
}
// StorageStep / SecurityStep follow the same adapter shape over their existing
// PATCH clients; AssistantStep writes assistant.* via saveAssistantSettings and
// (if key entry is surfaced) API keys via PATCH /settings/integrations/:id.
```

- **Data flow:** existing GET (masked) → adapter form → existing write endpoint
  (**PUT** for email via `updateEmailSettings`; **PATCH** for
  storage/security/integrations; write-only secrets, empty/omitted keys never
  echo or clear unintentionally) → step marked complete.
- **Error handling:** surface the domain validation codes already returned by the
  underlying routes (`settings_value_invalid`, storage/security/email codes) at
  the field/banner.
- **Regression-test shape:** an Advanced step renders a stored secret as masked,
  not plaintext; submitting with an empty secret field does **not** clear the
  stored secret; a valid patch hits the correct existing endpoint.

## Testing Requirements

- **Lane:** Vitest ui-integration —
  `tests/vitest/ui-integration/setupAdvancedSteps.test.tsx` (mock the existing
  settings clients). Cases: masked-secret display; empty-secret = no-op; correct
  endpoint per step; validation-error surfacing.
- **Lane (smoke):** Bun route-integration — reuse/extend existing
  email/storage/security route tests to assert the wizard's payload shape is
  accepted and secrets are not echoed back. Runtime route flow ⇒ Bun.
- No migration artifacts.
