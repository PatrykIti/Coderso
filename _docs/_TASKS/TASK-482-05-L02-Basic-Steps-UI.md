# TASK-482-05-L02: Basic steps UI bound to bulk `PATCH /settings`
# FileName: TASK-482-05-L02-Basic-Steps-UI.md

**Parent Subtask:** TASK-482-05
**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Medium
**Dependencies:** TASK-482-05-L01, TASK-482-04-L02
**Status:** ✅ Done
**Started:** 2026-07-04
**Completed:** 2026-07-05

---

## Overview

- **Goal:** Implement the Basic-track step bodies — identity (site name),
  branding (optional logo), locale, **timezone**, and public + admin URLs — and
  persist them through the bulk `PATCH /settings` endpoint via the existing admin
  settings client.
- **Owning module(s) to create/extend:**
  - Step field components under `core/admin/ui/setup/steps/` (e.g.
    `IdentityStep.tsx`, `LocaleTimezoneStep.tsx`, `UrlsStep.tsx`,
    `BrandingStep.tsx`, `StarterContentStep.tsx`) wired into the `renderStep`
    switch from 04-L02.
  - **Starter-content step UI (single owner = THIS leaf).** The Basic-track
    `starter-content` step declared in 04-L01's `WIZARD_STEPS` registry
    (`wizardSteps.ts`) is rendered by `StarterContentStep.tsx` here — this leaf
    is the sole writer of the step body; 04-L02 ships only the generic
    placeholder for un-implemented steps and 06 owns solely the service +
    endpoints (no UI). The component lets the operator pick exactly one
    `kitId`/`blueprintKey`, calls **`previewStarterContent`** (dry-run) and
    **`applyStarterContent`** via the internal `POST /setup/starter-content/{preview,apply}`
    endpoints owned by 06-L02, and reuses the shared admin `apiClient`
    (`{ withCsrf: true }`) — never a bespoke fetch. Selection is limited to a
    known id/key (the server maps it to a curated definition), matching 06-L02's
    anti-abuse contract; the step is skippable (starter content is optional).
    **Temporal-inversion note (land order 04→05→06→07→08):** the
    `POST /setup/starter-content/{preview,apply}` endpoints this step calls are
    created only by **06-L02**, which lands AFTER this leaf. So
    `StarterContentStep.tsx` is authored here but is **non-functional at runtime
    until 06 lands** — there is no writer collision (ownership is disjoint:
    05-L02 owns the UI, 06-L02 owns the endpoints), only a provider-after-consumer
    ordering. This is intentional and mitigated: (a) the step is skippable, so an
    operator completing Basic onboarding before 06 lands is never blocked, and
    (b) this leaf's Vitest cases **mock the settings/starter-content client**, so
    they do not depend on the live endpoints existing. Do NOT resolve this by
    moving endpoint creation into 05 (that would violate single-writer ownership
    of `setupRoutes.ts` / `setupSchemas.ts`); the orchestrator tracks it as a
    coordination clarification only.
  - Extend `core/admin/ui/setup/setupWizardValidation.ts` /
    `wizardSteps.ts` to include the timezone field validator (reuse the
    `validatePublicBaseUrl` for URLs).
  - Reuse the existing settings client used by the general settings screen:
    `updateSettings(payload)` from `core/admin/services/settingsClient.ts`
    (line 257) is the bulk `PATCH /settings` function. Map wizard values →
    setting keys: `site.name`, `site.locale`, `site.timezone`,
    `site.publicBaseUrl`, `site.adminBaseUrl`, `site.branding.logoId`.
    **Admin-URL key pin:** the wizard writes **only `site.adminBaseUrl`**
    (nullable admin origin URL, `settingsService.ts:51`). It must NOT write
    `site.adminPath` (`settingsService.ts:53`, default `/admin`) — that is a
    distinct key with mount-path semantics (`isAdminPathKey`,
    `settingsService.ts:97`) and is out of scope for the wizard.
  - **THIS leaf owns the wizard-values → settings-keys map.** Export it as
    `toBasicSettingsPayload(values: WizardValues)` from
    `core/admin/ui/setup/setupWizardValidation.ts` (next to the existing
    `toSetupWizardSettingsPayload(values: SetupWizardValues)`, line 77, which
    it generalises). **Type reconciliation — the values type is owned by
    04-L01, not this leaf:** the parameter type is `WizardValues`, the shared
    superset that **04-L01 defines and exports from
    `core/admin/ui/setup/wizardSteps.ts`** (`SetupWizardValues` + `siteTimezone`
    + `adminBaseUrl` + optional `logoId` + advanced fields). This map reads
    `values.siteTimezone`, `values.adminBaseUrl` and `values.logoId`, which do
    NOT exist on the base `SetupWizardValues` (`setupWizardValidation.ts:1-7`) —
    so it MUST take `WizardValues`, imported from 04-L01's module. Do not
    reintroduce `SetupWizardValues` as the param or define a competing type.
    (04-L02 does not change any values type; the broadening lives in 04-L01.)
    08-L01 **imports** this function for finalize and must not redefine the
    mapping; any key added later joins the map here, in one place.
- **Coordination note (logo field):** `site.branding.logoId` / the BrandingStep
  logo field is gated on the TASK-359-04 coordination recorded in 05-L01 —
  `core/admin/ui/settings/LogoUploadCard.tsx` marks **TASK-359-04** as the
  owner of logo/favicon persistence (its upload controls are deliberate
  no-ops). Without that sign-off the branding step ships **identity-only** and
  defers logo persistence to TASK-359-04.
- **Source-of-truth docs:** `_docs/SETTINGS.md`, `_docs/CMS_SPEC.md`,
  `_docs/UI/`, `_docs/CMS_API.md`.
- **Out-of-scope:** the timezone key itself (05-L01); the starter-content
  **service + preview/apply endpoints** (06-L01/06-L02) — this leaf owns only
  the `StarterContentStep.tsx` UI that calls those endpoints; finalize (08).
- **Sequential-handoff note (multi-writer files):** this leaf lands strictly
  after 04-L01/04-L02 per the parent's land order and **extends**
  `setupWizardValidation.ts` / `wizardSteps.ts` additively (append new exported
  symbols such as `toBasicSettingsPayload` and new step entries only — do not
  restructure 04-L01's framework code). 07-L02 touches
  `setupWizardValidation.ts` after this leaf under the same rule.

## Coordination Pins (TASK-482 stream)

- **Changelog:** number **1220** is pinned for the TASK-482 closure
  (`_docs/_CHANGELOG/1220-*.md`, created by TASK-482-09 only). Numbers **1219**
  (TASK-510, in flight in the shared main tree — may be absent from this
  worktree's checkout; do NOT reallocate it), **1221** (TASK-483) and **1222**
  (TASK-484) are RESERVED by parallel streams.
- **Parallel streams / forbidden paths:** TASK-483 (analytics) and TASK-484
  (backups) run concurrently on sibling branches. FORBIDDEN PATHS for TASK-482:
  `core/services/analytics/**`, `core/services/backups/**`, any analytics/backups
  route modules, `core/db/schema.ts`, `core/db/migrations/**`.
- **No DB migration in this tree:** settings/branding/locale keys go through the
  settings service defaults (rows, not DDL); first-admin creation uses the
  existing `users` table. No 482 file plans DDL/migration artifacts.
- **Board/changelog discipline:** ONLY the closure subtask (TASK-482-09) edits
  `_docs/_TASKS/README.md` and `_docs/_CHANGELOG/*`; this leaf never touches them.
- **Shared REMOTE test database:** all three streams and the owner share ONE
  Postgres (render.com, `DATABASE_URL` in `.env`). Tests must never
  delete/truncate `users`, flip the real DB into a global no-users install state,
  or reset shared settings rows; use service-level seams, uniquely scoped
  fixtures, or self-restoring setup/teardown.
- **Land order:** 01 → 02 → 03 (phase 1), then 04 → 05 → 06 → 07 → 08 (phase 2),
  then 09 (closure). Strictly sequential, single writer per source file.

## Security Contract

- **Endpoint visibility:** internal — writes go to `/admin/api/.../settings`
  (bulk `PATCH /settings`), already RBAC + CSRF guarded.
- **Auth model:** authenticated admin session (Phase 2 is post-login).
- **RBAC permission(s):** `settings:write` for the PATCH; the wizard step should
  surface a friendly message if the logged-in user lacks it (first admin has
  `['*']` so this is an edge case for non-`*` operators).
- **CSRF on internal writes:** required — `updateSettings` already sends
  `{ withCsrf: true }` (the `apiClient` fetches `/auth/csrf`); the wizard must
  reuse that client function, not a bespoke fetch.
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
// core/admin/ui/setup/setupWizardValidation.ts — SINGLE owner of the map.
// Exported so 08-L01's finalize imports it (no second copy of the mapping).
// The param type `WizardValues` is OWNED by 04-L01 (exported from
// core/admin/ui/setup/wizardSteps.ts) and is the superset that adds
// siteTimezone/adminBaseUrl/logoId to SetupWizardValues; import it here.
// (Base SetupWizardValues lacks those three fields, so it cannot type this map.)
import type { WizardValues } from "./wizardSteps";
export const toBasicSettingsPayload = (values: WizardValues) => ({
  "site.name": values.siteName.trim(),
  "site.locale": values.siteLocale,
  "site.timezone": values.siteTimezone,        // new (05-L01)
  "site.publicBaseUrl": values.publicBaseUrl.trim() || null,
  "site.adminBaseUrl": values.adminBaseUrl.trim() || null, // NOT site.adminPath (see pin above)
  ...(values.logoId ? { "site.branding.logoId": values.logoId } : {}), // gated on TASK-359-04 coordination
});

// On step "commit" (Next from a Basic step) or on Finish:
const basicSettingsPayload = toBasicSettingsPayload(values);
// bulk PATCH /settings — updateSettings from core/admin/services/settingsClient.ts
// already handles CSRF ({ withCsrf: true }) AND the admin cache contract
// (primeSettingsCache + broadcastCacheEvent on cacheKeys.settingsRedacted);
// the wizard must NOT add a second cache-refresh path.
await updateSettings(basicSettingsPayload);
```

- **Data flow:** wizard values → key map → bulk PATCH via `updateSettings` →
  settings cache primed/broadcast by the client (no extra refresh in the
  wizard).
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
