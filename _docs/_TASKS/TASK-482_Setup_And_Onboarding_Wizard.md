# TASK-482: Setup & Onboarding Wizard (Two-Phase Installer + Configuration)
# FileName: TASK-482_Setup_And_Onboarding_Wizard.md

**Priority:** High
**Category:** Admin / Onboarding / Auth
**Estimated Effort:** Very Large
**Dependencies:** TASK-479-29 (Auth screen restyle — shares `AuthBrandPanel.tsx` + auth primitives; reskin only, this task is the feature)
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Business Goal

A fresh Coderso install today drops the first operator straight onto the admin
`/login` screen with **no account to log in with** — the only bootstrap path is
the env-driven `seedAdmin()` (`core/db/seed.ts`), which is a CI/Docker concern,
not a product onboarding flow. The existing `SetupWizard` (`core/admin/ui/setup/SetupWizard.tsx`)
is a 5-field **post-login** config step (site identity / runtime URL / security
TTL) that presumes an authenticated admin already exists.

This task delivers a **two-phase onboarding experience**:

- **Phase 1 — Pre-login installer (fresh install only).** When the database has
  zero users (`isFirstRun`), serve a public installer that creates the very
  first admin account, then hands off to `/login`. Self-disables permanently
  once any user exists.
- **Phase 2 — Post-login configuration wizard.** After login, a multi-track
  stepper covering a **Basic** track (branding / identity / locale / timezone /
  public + admin URLs; optional starter content via the Solution Kit system) and
  an optional **Advanced** track (email / storage / security / assistant). On
  finish it sets `setup.completed` and never reappears.

The outcome: a brand-new operator can go from empty DB to a configured,
content-seeded site without touching env vars or the seed script.

## Scope

### In scope (feature work this task adds)

- A fail-closed, pre-auth first-run detection service + `/auth/install` route
  namespace (status + first-admin creation).
- First-admin bootstrap that mirrors the seed pattern (role `admin` `['*']`,
  status `active`, argon2 hash) with a TOCTOU-safe no-users precondition.
- A pre-login `InstallerWizard.tsx` and the `AdminApp.tsx` gate ordering that
  shows it **before** the unauthenticated → `/login` redirect.
- Generalising `SetupWizard.tsx` into a multi-track stepper (step registry,
  per-step validation, resume/dirty, Basic/Advanced toggle).
- A new `site.timezone` setting key (currently **missing** from
  `DEFAULT_SETTINGS`) plus optional branding/logo key, wired through the
  normalizer + validation.
- A server-side starter-content service over the kit installer, with dry-run,
  apply (with `actorId`), site-shell wiring, and rollback.
- Advanced-track adapters over the existing `/settings/email`,
  `/settings/storage`, `/settings/security` and assistant settings, plus
  reconciliation of the duplicate session-TTL sources.
- Finalize / install-lock / self-disable plumbing.
- E2E coverage + source-of-truth doc updates.

### Out of scope

- **Visual restyle of the resulting wizard** — that is **TASK-479-29 / TASK-479**
  (the soft/violet admin redesign). This task wires behaviour and may consume
  TASK-479 primitives, but does not own the design-token program.
- New MFA factors, SSO providers, or changes to the login/reset flows beyond
  reusing their components.
- Multi-tenant / multi-site installers (single-site assumption holds).
- Replacing `seedAdmin()` — it remains a coexisting CI/Docker path; the
  installer simply self-disables once any user (seeded or installer-created)
  exists.

### What TASK-479-29 already covers vs what this task adds

| Concern | TASK-479-29 (reskin) | TASK-482 (this feature) |
| --- | --- | --- |
| Auth shell / brand panel | Owns `AuthBrandPanel.tsx` restyle | **Reuses** it for the installer |
| Login / 2FA / reset visuals | Restyled | Unchanged; installer hands off to it |
| Setup wizard look | N/A (post-login wizard untouched by 479-29) | Adds two-phase behaviour + restyle to 479 primitives |
| First-admin creation | — | **New** pre-auth flow |
| Starter content / advanced config | — | **New** |

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-482-01 | Pre-auth installer foundation (first-run service + `/auth/install` status) | Medium | ⏳ To Do |
| TASK-482-02 | First-admin bootstrap + `POST /auth/install/admin` | Large | ⏳ To Do |
| TASK-482-03 | Pre-login installer UI + `AdminApp` gate ordering | Large | ⏳ To Do |
| TASK-482-04 | Phase-2 wizard shell + step framework | Medium | ⏳ To Do |
| TASK-482-05 | Phase-2 Basic steps + `site.timezone` settings key | Medium | ⏳ To Do |
| TASK-482-06 | Starter content via Solution Kits | Large | ⏳ To Do |
| TASK-482-07 | Advanced track steps + session-TTL reconciliation | Large | ⏳ To Do |
| TASK-482-08 | Install-lock / finalize / self-disable | Medium | ⏳ To Do |
| TASK-482-09 | E2E tests + documentation | Medium | ⏳ To Do |

## Testing Requirements

- **Bun lane** (`tests/integration/routes/*`, `tests/security/*`) for every
  route, the kit install/rollback lifecycle, the no-users fail-closed gate, the
  TOCTOU concurrency race, and the full fresh-DB E2E.
- **Vitest lane** (`tests/vitest/*`, `tests/vitest/ui-integration/*`) for the
  first-run service logic, the settings-key normalizer/validation, the stepper
  state machine, and all React render flows (installer + wizard).
- No DB migration is required for the new setting key — `settings` is a generic
  KV table (`settings(key, value)`). Any leaf that *does* touch the schema must
  ship full migration artifacts (SQL + `meta/*_snapshot.json` + `meta/_journal.json`);
  none currently do.
- Security gate (`tests/security/codersoSecurityGate.test.ts`) must stay green;
  the new public route is added to its expectations.

## Documentation Updates Required

- `_docs/AUTH_SPEC.md` — first-run installer flow, `/auth/install/*` endpoints,
  the no-users fail-closed boundary, seed coexistence.
- `_docs/SECURITY_SPEC.md` — the pre-auth route's threat model (no session ⇒ no
  CSRF; boundary = no-users gate + `auth` rate-limit + strong password + audit).
- `_docs/CMS_SPEC.md` — two-phase onboarding overview.
- `_docs/CMS_API.md` — `/auth/install/status`, `/auth/install/admin`, and the
  internal starter-content endpoint.
- `_docs/SETTINGS.md` / settings key list — new `site.timezone` (+ optional
  branding key).
- `_docs/AUDIT_SPEC.md` — `auth.install.*` taxonomy entries.

## Notes

- **Grounding corrections applied during discovery:**
  - The kit lifecycle entrypoints `applySolutionKitInstall` /
    `rollbackSolutionKitInstall` live in
    `core/services/kits/solutionKitsInstallService.ts`. `kitInstaller.ts`
    exports the higher-level wrappers `applyKitInstall` / `rollbackKitInstall`
    (which additionally build the manifest + template seeds). Starter content
    should call the **wrappers**.
  - `site.timezone` is **not** in `DEFAULT_SETTINGS` today (verified in
    `settingsService.ts` lines 48-82) — it is genuinely new.
  - `usersService.createUser` (line 124) defaults `status: "pending"` and a
    `randomBytes(16)` password — unusable for a first admin, hence a dedicated
    `createFirstAdmin`.
  - `settingsBulkSchema` uses `additionalProperties: true`; unknown-key
    rejection happens at the service layer via `resolveSettingKey`
    (`settings_key_invalid`). Validation contracts below rely on that seam.
- **Key risk encoded throughout:** the pre-auth first-admin route has **no CSRF**
  (it is session-less by definition). Its only boundary is the fail-closed
  no-users gate (re-checked inside the create transaction), the `auth`
  rate-limit bucket, strong password validation, and an audit trail. It
  self-disables the instant any user exists.
- Dependency order: 01 → 02 → 03 (Phase 1) then 04 → 05 → 06 → 07 → 08 (Phase 2)
  then 09. Phase-1 leaves are independently shippable before Phase-2 begins.
