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
