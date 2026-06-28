# TASK-482-07-L01: Advanced step adapters over email/storage/security/assistant
# FileName: TASK-482-07-L01-Advanced-Steps-Adapters.md

**Parent Subtask:** TASK-482-07
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Large
**Dependencies:** TASK-482-04-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

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
    - `PATCH /settings/security` (`securitySettingsSchema`).
    - Email settings via `core/server/routes/emailSettingsRoutes.ts`
      (`/settings/email`).
    - Assistant via the assistant settings keys (`assistant.*` in
      `settingsService.ts`, saved through the existing `saveAssistantSettings`
      path in `AdminApp.tsx`).
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
  assistant API keys must follow the existing redaction seams (the GET endpoints
  return masked secrets; writes are write-only). The wizard must:
  - Never display a previously stored secret in plaintext (show "configured" +
    a replace affordance, exactly as the standalone screens do).
  - Never write a secret into `settingsState`, localStorage, the admin theme
    cache, or logs.
  - Treat empty secret fields as "leave unchanged" (do not overwrite a stored
    secret with an empty string).

## Implementation Pseudocode

```tsx
// Each advanced step delegates to the existing settings form + client.
function EmailStep({ values, onSaved }) {
  // Reuse the existing email settings form component if present; else compose its fields.
  return <ExistingEmailSettingsForm
    initial={maskedEmailSettings}              // secrets shown as "configured", never plaintext
    onSubmit={async (patch) => {
      const safePatch = stripUnchangedSecrets(patch); // empty secret => omit
      await emailSettingsClient.patch(safePatch);      // CSRF via client
      onSaved();
    }} />;
}
// StorageStep / SecurityStep / AssistantStep follow the same adapter shape.
```

- **Data flow:** existing GET (masked) → adapter form → existing PATCH
  (write-only secrets) → step marked complete.
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
