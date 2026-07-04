# TASK-482-05-L02: Basic steps UI bound to bulk `PATCH /settings`
# FileName: TASK-482-05-L02-Basic-Steps-UI.md

**Parent Subtask:** TASK-482-05
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-05-L01, TASK-482-04-L02
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Implement the Basic-track step bodies — identity (site name),
  branding (optional logo), locale, **timezone**, and public + admin URLs — and
  persist them through the bulk `PATCH /settings` endpoint via the existing admin
  settings client.
- **Owning module(s) to create/extend:**
  - Step field components under `core/admin/ui/setup/steps/` (e.g.
    `IdentityStep.tsx`, `LocaleTimezoneStep.tsx`, `UrlsStep.tsx`,
    `BrandingStep.tsx`) wired into the `renderStep` switch from 04-L02.
  - Extend `core/admin/ui/setup/setupWizardValidation.ts` /
    `wizardSteps.ts` to include the timezone field validator (reuse the
    `validatePublicBaseUrl` for URLs).
  - Reuse the existing settings client used by the general settings screen for
    `PATCH /settings` (bulk). Map wizard values → setting keys:
    `site.name`, `site.locale`, `site.timezone`, `site.publicBaseUrl`,
    `site.adminBaseUrl`/`site.adminPath`, `site.branding.logoId`.
- **Source-of-truth docs:** `_docs/SETTINGS.md`, `_docs/CMS_SPEC.md`,
  `_docs/UI/`, `_docs/CMS_API.md`.
- **Out-of-scope:** the timezone key itself (05-L01); starter content (06);
  finalize (08).

## Security Contract

- **Endpoint visibility:** internal — writes go to `/admin/api/.../settings`
  (bulk `PATCH /settings`), already RBAC + CSRF guarded.
- **Auth model:** authenticated admin session (Phase 2 is post-login).
- **RBAC permission(s):** `settings:write` for the PATCH; the wizard step should
  surface a friendly message if the logged-in user lacks it (first admin has
  `['*']` so this is an edge case for non-`*` operators).
- **CSRF on internal writes:** required — the settings client already attaches the
  session CSRF token (`/auth/csrf`); the wizard must reuse that client, not a
  bespoke fetch.
- **Rate-limit bucket:** `admin_write` (inherited).
- **Validation:** client validators mirror the server normalizers (timezone is a
  selectable IANA zone list; URLs via `validatePublicBaseUrl`); the server
  remains the source of truth (05-L01).
- **Anti-abuse:** N/A (authenticated internal write).
- **Secret/PII handling:** none — identity/branding/locale/timezone/URLs are
  non-secret. Do not cache values beyond the in-memory wizard state +
  `settingsState`.

## Implementation Pseudocode

```ts
// On step "commit" (Next from a Basic step) or on Finish, build the bulk payload:
const basicSettingsPayload = {
  "site.name": values.siteName.trim(),
  "site.locale": values.siteLocale,
  "site.timezone": values.siteTimezone,        // new (05-L01)
  "site.publicBaseUrl": values.publicBaseUrl.trim() || null,
  "site.adminBaseUrl": values.adminBaseUrl.trim() || null,
  ...(values.logoId ? { "site.branding.logoId": values.logoId } : {}),
};
await settingsClient.patchSettings(basicSettingsPayload); // bulk PATCH /settings (CSRF via client)
```

- **Data flow:** wizard values → key map → bulk PATCH → `settingsState` refresh.
- **Error handling:** map `settings_value_invalid` / `settings_key_invalid` to
  the field/banner; a 403 (missing `settings:write`) shows a permission notice.
- **Regression-test shape:** filling the Basic steps and advancing issues a bulk
  PATCH containing `site.timezone` and the URL keys; an invalid URL blocks Next;
  server `settings_value_invalid` surfaces inline.

## Testing Requirements

- **Lane:** Vitest ui-integration —
  `tests/vitest/ui-integration/setupBasicSteps.test.tsx` (mock the settings
  client). Cases: timezone select renders + persists; URL validation; bulk PATCH
  payload shape; server-error surfacing.
- No migration artifacts.
