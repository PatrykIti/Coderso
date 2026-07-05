# 1220 - TASK-482 Setup & Onboarding Wizard (Two-Phase Installer + Configuration)

**Date:** 2026-07-05
**Version:** Unreleased
**Tasks:** TASK-482 (01-09)
**Type:** Admin/Onboarding/Auth/Security/Settings/Docs/Task Board

## Overview

A fresh Coderso install previously dropped the first operator onto `/login` with
no account to log in with (the only bootstrap path was the env-driven
`seedAdmin()`). TASK-482 delivers a two-phase onboarding experience so a
brand-new operator can go from empty DB to a configured, content-seeded site
without touching env vars or the seed script:

- **Phase 1 — pre-login installer (fresh install only).** When the DB has zero
  users (`isFirstRun`), a public, session-less installer creates the very first
  admin, then hands off to `/login`. Self-disables permanently once any user
  exists.
- **Phase 2 — post-login configuration wizard.** A multi-track stepper: a Basic
  track (branding / identity / locale / timezone / public + admin URLs, optional
  starter content via the Solution Kit installer) and an optional Advanced track
  (email / storage / security / assistant). Finalize sets `setup.completed` and
  the wizard never reappears.

## Changes

### Phase 1 — pre-auth installer (01-03)

- `core/services/admin/firstRunService.ts` — `isFirstRun` / `countUsers`
  first-run detection and `createFirstAdmin` (role `["*"]`, `status: "active"`,
  argon2 hash) with a fail-closed no-users precondition: cheap pre-check plus an
  in-transaction TOCTOU re-check under `pg_advisory_xact_lock`, so concurrent
  installers cannot create two admins or run after setup. Injectable seams for
  non-destructive testing.
- `core/server/routes/installRoutes.ts` + `core/server/validation/installSchemas.ts`
  — public `GET /auth/install/status` (`{ available }`, rejects unknown query)
  and session-less `POST /auth/install/admin` (strict reject-unknown schema,
  password `minLength 8`); `mapInstallRouteError` (`ApiError | null` convention)
  maps `first_run_unavailable` → `install_unavailable` (409) and
  `first_admin_invalid` → `install_admin_invalid` (400); audit
  `auth.install.admin.created` / `auth.install.blocked`.
- `core/server/httpServer.ts` — `/auth/install/*` excluded from the email-based
  rate-limit identifier (installer buckets by IP on the `auth` bucket).
- `core/admin/ui/setup/InstallerWizard.tsx` + `installerValidation.ts` +
  `core/admin/services/installClient.ts`; `core/admin/app/AdminApp.tsx` gate
  ordering renders the installer before the unauthenticated → `/login` redirect,
  fail-closed (a status fetch failure treats the installer as unavailable).

### Phase 2 — configuration wizard (04-08)

- `core/admin/ui/setup/SetupWizard.tsx` generalized into a multi-track stepper
  (`wizardMachine.ts`, `wizardSteps.ts`, `steps/*`) with per-step validation,
  resume/dirty, and a Basic/Advanced toggle; restyled onto the TASK-479 auth/
  wizard primitives.
- `core/services/settings/settingsService.ts` — new `site.timezone` key
  (default `UTC`, IANA-validated via `Intl.DateTimeFormat`) added to
  `DEFAULT_SETTINGS` + the write-time normalizer (KV row, no migration).
- `core/services/setup/starterContentService.ts` +
  `core/server/routes/setupRoutes.ts` + `core/server/validation/setupSchemas.ts`
  — internal `POST /setup/starter-content/preview` (`solution-kits:write`) and
  `.../apply` (`solution-kits:write` + `settings:write`) over the Solution Kit
  installer, with dry-run, apply (`actorId`), site-shell wiring
  (`site.homepageId` / `navigationMenuId` / `footerTemplateId`) and rollback;
  server-chosen blueprint only; audit `setup.starter_content.applied`.
- `core/services/auth/sessionTtl.ts` — session-TTL precedence + clamp (`1..365`)
  extracted into one pure resolver reused by runtime and the Advanced track;
  the wizard writes only the canonical `auth.sessionTtlDays`.
- Finalize / install-lock via `setup.completed`.

### Tests (09-L01)

- `tests/integration/routes/onboardingFlow.test.ts` — end-to-end onboarding
  flow via an injected-service, in-memory stub-router harness (installer →
  session transition → Basic incl. `site.timezone` → starter preview/apply →
  Advanced strict-reject → finalize + self-disable), driving the real
  `registerInstallRoutes` chain (seamed) and reusing the real validation / key-
  resolution / error-mapping / RBAC helpers for Phase 2 with persistence
  redirected to an in-memory world. Non-destructive on the shared remote DB
  (the no-users state is simulated only via `isFirstRun` / `createFirstAdmin`
  seams; `users` is never truncated and shared settings rows are never reset).

### Docs (09-L02)

- `_docs/AUTH_SPEC.md` — first-run installer flow, `/auth/install/*`, no-users
  fail-closed boundary, `seedAdmin()` coexistence.
- `_docs/SECURITY_SPEC.md` — pre-auth first-admin threat model (session-less ⇒
  CSRF exempt-by-absence scoped to one path; boundary = no-users gate re-checked
  in tx under advisory lock + `auth` rate-limit + strong password + audit;
  self-disable; no secret leakage).
- `_docs/CMS_SPEC.md` — two-phase onboarding overview + `site.timezone`.
- `_docs/CMS_API.md` — `/auth/install/status`, `/auth/install/admin`,
  `/setup/starter-content/preview`, `.../apply` request/response + error codes.
- `_docs/SETTINGS.md` — new `site.timezone` (default `UTC`, IANA-validated).
- `_docs/AUDIT_SPEC.md` — `auth.install.admin.created`, `auth.install.blocked`,
  `setup.starter_content.applied` taxonomy + metadata rules.

## Validation

- Bun lane: `tests/integration/routes/onboardingFlow.test.ts` (3),
  `install.test.ts`, `setupStarterContent.test.ts`, `starterContent.test.ts`,
  `setupAdvancedWizardPayloads.test.ts`, and the security suites
  (`installAdmin.test.ts`, `firstAdminRace.test.ts`,
  `installerSelfDisable.test.ts`, `setupStarterContent.security.test.ts`) — all
  green (43 + 3).
- Vitest lane: setup/installer/wizard suites (`tests/vitest/setup/*`,
  `tests/vitest/ui-integration/*`, `shouldShowInstaller`,
  `sessionTtlReconciliation`) — 61 green.
- Types: root `tsc -p tsconfig.json --noEmit` clean (includes `tests/`).
- Runtime onboarding smoke (fresh-DB Playwright walk-through) is deferred to a
  supervised run and is not part of this closure.

## Security

- The pre-auth `POST /auth/install/admin` is the only session-less surface that
  can create a privileged account; its boundary is the fail-closed no-users gate
  (re-checked in-transaction under `pg_advisory_xact_lock`), the `auth`
  rate-limit bucket, strict-schema strong-password validation, and an audit
  trail. It self-disables the instant any user exists. CSRF is exempt only by
  absence of a session (`csrf.ts` skips session-less requests); every
  session-bound mutation still requires a token. Responses never echo secrets.
- No DB migration: settings are KV rows; the first admin uses the existing
  `users` table.
