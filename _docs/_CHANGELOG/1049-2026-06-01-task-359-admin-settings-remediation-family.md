# 1049 - TASK-359 Admin Settings remediation family

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-359, TASK-359-01, TASK-359-02, TASK-359-03, TASK-359-04, TASK-359-05, TASK-359-06, TASK-359-07

## Key Changes

### Planning / QA

- Added the report-driven remediation family for the Admin Settings audit.
- Captured execution-ready scope for Settings RBAC gating, SPA navigation,
  dirty-state protection, mobile section navigation, redacted settings cache,
  placeholder cleanup, high-risk confirmation, drawer accessibility, external
  action truthfulness, and assistant reindex confirmation.
- Recorded the security contract for settings, security, sessions, API keys,
  webhooks, IP allowlist, storage/email/integrations, assistant reindex,
  secret redaction, lockout prevention, and audit events.
- Split the family into physical execution leaf files:
  `TASK-359-01` through `TASK-359-07`, each with pseudocode, data flow, error
  handling, security contract, tests, docs plan, and acceptance criteria.
- Refined drift found by agent/Claude review: aligned Settings rate buckets
  with `admin_read`, `admin_write`, and `assistant`, clarified current
  `settings:write` security-session RBAC, assigned raw sidebar anchor cleanup,
  and made Max Sessions restoration owner explicit.
- Follow-up drift pass replaced nonexistent Settings guide paths with the real
  per-screen docs, normalized redacted bot-protection cache naming to
  `botProtectionConfigured` from `botProtection.secretKey.configured`, and
  separated webhook delete ownership from external webhook test side effects.

### TASK-359-01 Settings RBAC Guard and Bootstrap Discipline

- Kept `/admin/settings/**` fail-closed through the shared permission snapshot:
  users without `settings:read` now see the shared `Access denied` state before
  Settings shell content or section-specific Settings effects can run.
- Gated global Settings bootstrap so restricted admin sessions do not perform a
  normal-UX `GET /admin/api/settings` and receive avoidable 403s.
- Strengthened Settings route tests from guard-order proof to a behavioral 403
  chain that stops before the read handler.
- Fixed a real Playwright drift missed by the initial nav test: Users/Roles
  breadcrumbs used the `Settings` label, which the shared breadcrumb mapper
  linked to `/admin/settings` for `roles:read` users. Those breadcrumbs now use
  `Admin`.
- Fixed the same final-review drift for `audit:read` users: Audit Logs and
  Access Logs used the `Security` breadcrumb label, which mapped to
  `/admin/settings/security`. Those breadcrumbs now use `Admin`.
- Preemptively moved the currently unrouted Theme Editor breadcrumb from
  `Settings` to `Admin` so future `themes:read` routing does not reintroduce a
  Settings breadcrumb link.
- Added restricted-user Playwright evidence for no Settings links on
  `/admin/roles`, `/admin/audit`, and `/admin/access-logs`, direct
  `/admin/settings` access denied, zero Settings API requests/responses, and no
  auth 429 loop.
- Updated the Settings and aggregate Admin UI reports plus the RBAC spec with
  the closed route/bootstrap contract.

### TASK-359-02 Settings SPA Navigation, Dirty Guard, and Mobile Navigation

- Replaced the raw Settings sidebar anchors with `AdminLink` + `prefetch` so
  Settings section switches use the shared admin SPA navigation path.
- Added a settings-scoped dirty navigation guard with boolean-only dirty state,
  beforeunload protection, shared router blocker registration, and a discard
  confirm that preserves drafts on cancel.
- Extended `AdminRouterContext` with inert navigation blockers so Settings can
  protect direct `AdminLink` navigation and browser Back/Forward without
  changing other admin surfaces.
- Registered dirty state for General, Assistant, Site, Security, Email,
  Storage, Login Alerts, API key creation, webhook, integration request/config,
  and IP allowlist drafts. Secret-bearing fields are reduced to sentinel
  booleans for dirty comparison.
- Restored mobile Settings navigation below `lg` and added direct sidebar
  entries for Security subroutes: Sessions, Login Alerts, and IP Allowlist.
- Converted Site Settings empty-state admin links to `AdminLink` so they no
  longer bypass the shared navigation contract.
- Added Vitest coverage for router blockers, Settings dirty cancel/discard,
  beforeunload protection, mobile section navigation, Settings sidebar links,
  and the affected Settings screen smoke tests.
- Added Playwright evidence for desktop Settings section switching with
  `authMeRequests: 0`, `documentLoadEvents: 0`, no auth 429, no login redirect,
  dirty link cancel/confirm, dirty Back cancel/confirm, and mobile navigation
  to Storage with all Settings links visible.

### TASK-359-03 Redacted Settings Cache Contract

- Added `settings:redacted` as the Settings browser-cache owner for non-secret
  UX values only, with schema versioning, strict allowlist validation, and
  unsafe nested-key scanning.
- Added cached wrappers for global Settings and Site Settings so safe values
  hydrate immediately from cache and revalidate through `/settings`.
- Kept credential-bearing Settings payloads out of browser storage:
  storage/email/integration/webhook/API-key credentials, bot-protection secret,
  provider keys, tokens, and connection strings are not cached.
- Wired Settings/Site mutations to prime `settings:redacted` from server
  responses and broadcast cacheBus `update`; Security mutations patch only
  boolean configured flags or invalidate when no safe cache entry exists.
- Updated `AdminApp` to use cached Settings after permission-gated bootstrap,
  preserving the `settings:read` guard from `TASK-359-01`.
- Updated `SiteSettingsPage` to hydrate Settings, pages, and content types from
  cache, revalidate Settings in the background, avoid force-refetching fresh
  selector caches on every mount, and ignore background cache updates while the
  form is dirty.
- Added `/settings` and `/settings/site` prefetch warmup through shared admin
  prefetch helpers; Site prefetch warms Settings, pages, and content types with
  `{ force: false }`.
- Synchronized `_docs/ADMIN_CACHE.md`, `_docs/ADMIN_CACHE_MAP.md`,
  `_docs/SECURITY_SPEC.md`, the Settings report, and the aggregate Admin UI
  report with the redacted cache contract.

### TASK-359-04 General and Site Placeholder Truthfulness

- Disabled General logo upload, favicon upload/remove, and timezone controls
  with explicit unavailable copy tied to `TASK-359-04`.
- Kept Site Performance as truthful future-state copy instead of an active
  placeholder control.
- Added `Review site routing changes` for admin path, admin base URL,
  homepage/404, preview, and content-route changes so routing-sensitive edits
  require an explicit review before saving.
- Updated Site auto-save snapshot handling so a cancelled risky review does not
  trigger a duplicate save.

### TASK-359-05 Security, Sessions, API Keys, Webhooks, and IP Allowlist Confirms

- Added `Review security policy changes` for high-risk Security saves, with
  typed `APPLY` confirmation before security-sensitive policy changes are
  applied.
- Added cancel-safe confirmation for session revoke/revoke-all actions while
  preserving current-session self-protection and disabled unavailable
  destinations.
- Added cancel-safe confirmation for API key rotate/revoke while preserving
  one-time secret display and cleanup.
- Added cancel-safe confirmation for webhook delete/edit-save/test actions and
  IP allowlist remove actions, including lockout warning copy.

### TASK-359-06 Email, Storage, Integrations, and Assistant Action Truthfulness

- Added confirmation for `Send Test Email`; cancelled dialogs do not send test
  mail.
- Kept Email `Export Logs` and Storage `Test Connection` disabled with
  owning-task copy while those actions remain unwired.
- Kept Storage Local/S3/Azure provider switching truthful in the UI, with S3
  and Azure secrets masked as bullets and security summary showing only
  configured/missing state.
- Added redacted integration secret review dialogs that show provider/field
  labels without repeating secret values.
- Added assistant reindex confirmation when the action is enabled and preserved
  disabled state when the assistant is unavailable.

### TASK-359-07 Login Alerts and Sessions Placeholder Cleanup

- Disabled unsupported Login Alerts tabs, brute-force threshold, admin-only
  recipients, email/webhook channels, and sticky discard/save actions with
  explicit unavailable copy tied to `TASK-359-07`.
- Kept supported Login Alerts notification switches available while shared
  no-op gate coverage protects unsupported controls.
- Disabled Sessions link-buttons for unavailable destinations and kept current
  session revoke truthfully unavailable.
- Updated guide pages for the changed Settings confirm and disabled-state UX.

## Validation

- `bun run test:vitest -- tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/ui/permissions-matrix-page-wave.test.tsx tests/vitest/ui/users-roles-page-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/settings.test.ts`
- `set -a && source .env && set +a && bun .tmp/task-359-01-fixture.ts cleanup && set -a && source .env && set +a && bun .tmp/task-359-01-fixture.ts && bun .tmp/task-359-01-playwright-runner.ts; status=$?; set -a && source .env && set +a && bun .tmp/task-359-01-fixture.ts cleanup; exit $status`
  passed with `settingsLinksOnAllowedRoute: 0`, `settingsRequests: []`, and
  `settingsResponses: []`. Evidence screenshot:
  `.tmp/task-359-01-settings-rbac.png`.
- `set -a && source .env && set +a && bun .tmp/task-359-01-audit-fixture.ts cleanup && set -a && source .env && set +a && bun .tmp/task-359-01-audit-fixture.ts && bun .tmp/task-359-01-audit-playwright-runner.ts; status=$?; set -a && source .env && set +a && bun .tmp/task-359-01-audit-fixture.ts cleanup; exit $status`
  passed with empty Settings links on Audit Logs and Access Logs plus
  `settingsRequests: []` and `settingsResponses: []`. Evidence screenshot:
  `.tmp/task-359-01-audit-rbac.png`.
- Claude read-only review for `TASK-359-01` confirmed the Settings route guard,
  sidebar filtering, and bootstrap gating were code-complete but required fresh
  report/changelog evidence before closure.
- Subagent read-only review for `TASK-359-01` flagged missing subroute coverage,
  backend 403 behavior, and stale report evidence; the final implementation
  added those tests and report updates.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`.

### TASK-359-02 validation

- `bun run test:vitest -- tests/vitest/ui/admin-router-context.test.tsx tests/vitest/ui/admin-router-context-blocker.test.tsx tests/vitest/ui/settings-sidebar.test.tsx tests/vitest/ui/settings-shell.test.tsx tests/vitest/ui/general-settings.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui/site-settings.test.tsx tests/vitest/ui/security-settings.test.tsx tests/vitest/ui/email-settings.test.tsx tests/vitest/ui/storage-settings.test.tsx tests/vitest/ui-integration/settings.test.tsx tests/vitest/ui-integration/emailSettings.test.tsx tests/vitest/ui-integration/security-settings.test.tsx`
  passed with 13 files / 24 tests.
- `bun run test:vitest -- tests/vitest/ui/admin-link.test.tsx tests/vitest/ui/adminLink.test.tsx tests/vitest/ui/admin-router-context.test.tsx tests/vitest/ui/admin-router-context-blocker.test.tsx tests/vitest/admin/adminApp.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx tests/vitest/ui/settings-sidebar.test.tsx tests/vitest/ui/settings-shell.test.tsx`
  passed with 8 files / 38 tests.
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Playwright CLI `task-359-02-settings` passed with `errors: []`,
  `authMeRequests: 0`, `documentLoadEvents: 0`, `auth429Responses: 0`,
  dirty cancel/confirm and Back cancel/confirm all true, plus 12 visible mobile
  Settings links. Evidence screenshots:
  `.tmp/task-359-02-settings-desktop.png` and
  `.tmp/task-359-02-settings-mobile.png`.

### TASK-359-03 validation

- `bun run test:vitest -- tests/vitest/admin/settingsClient.test.ts tests/vitest/admin/siteSettingsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/ui/site-settings.test.tsx tests/vitest/admin/adminApp.test.tsx`
  passed with 5 files / 51 tests.
- `bun test tests/perf/admin-prefetch-budget.test.ts` passed.
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- `git diff --check` passed.
- `bun run gates:coderso` passed: functional, ux, performance, security, and
  reliability gates all PASS.
- Playwright UI pass `task-359-03-settings-cache` passed with first Site load
  `settings: 1`, `pages: 1`, `contentTypes: 1`, `authMe: 0`; cached
  General -> Site navigation `settings: 1`, `pages: 0`, `contentTypes: 0`,
  `authMe: 0`; `markerPreserved: true`, `unsafeSettingsCachePaths: []`, and
  dirty TTL draft preserved. Evidence screenshot:
  `.tmp/task-359-03-settings-cache.png`.
- Claude read-only review flagged the original narrow pseudocode as
  insufficient for Site hydration; final implementation uses a broader
  allowlist while preserving the secret denylist.
- Subagent read-only review confirmed the original Settings/Site cache drift
  and recommended redacted cache, mutation invalidation, and dirty-form
  non-overwrite coverage.

### TASK-359-04 through TASK-359-07 validation

- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/api-keys.test.tsx tests/vitest/ui/security-sessions.test.tsx tests/vitest/ui/ip-allowlist.test.tsx tests/vitest/ui/security-settings.test.tsx tests/vitest/ui/site-settings.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui/email-settings.test.tsx tests/vitest/ui/webhooks.test.tsx tests/vitest/ui/integration-drawer-secrets.test.tsx tests/vitest/ui/drawers.test.tsx tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx tests/vitest/ui/login-alerts.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx`
  passed.
- `bun run gates:coderso` passed.
- `bun run scan:semgrep` passed.
- `bun run scan:trivy:secret` passed.
- `bun run scan:gitleaks:worktree` passed.
- `git diff --check` passed.
- Playwright final smoke `codex-02-06-admin-final` and
  `codex-02-06-physical` clicked Settings subroutes, confirmed disabled states,
  opened and cancelled risky dialogs, and reported 0 console errors/warnings.
- Claude physical Playwright pass `claude-02-06-admin-physical` clicked the
  Settings subroutes, cancelled risky dialogs, confirmed secret masking, and
  observed all post-login requests as `200`.
