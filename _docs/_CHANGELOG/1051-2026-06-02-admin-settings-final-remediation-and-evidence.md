# 1051 - Admin Settings final remediation and Admin UI evidence closure

Date: 2026-06-02
Version: Unreleased
Tasks: TASK-359, TASK-359-04, TASK-359-05, TASK-359-06, TASK-359-07, TASK-360, TASK-360-07

## Key Changes

### Admin Settings

- Closed the remaining Settings remediation leaves for General/Site,
  Security/Sessions/API Keys/Webhooks/IP Allowlist, Email/Storage/Integrations/
  Assistant, and Login Alerts/Sessions placeholders.
- Added cancel-safe confirm flows for high-risk Settings saves, session revoke
  actions, API key rotate/revoke, webhook delete/test/edit save, email test
  send, integration secret saves, and assistant reindex.
- Kept unsupported or not-yet-wired Settings controls truthfully unavailable:
  General logo/favicon/timezone, Site Performance, Storage test connection,
  Email export logs, Login Alerts advanced controls/sticky actions, and
  Sessions unavailable tab/link destinations.
- Preserved redacted/one-time secret handling for API keys, integrations,
  storage credentials, and browser settings cache.

### QA / Docs

- Updated all six Admin Playwright reports plus the report README with final
  2026-06-02 Playwright evidence.
- Recorded the local QA override `Max sessions per user = 30` with owner,
  date, and reason instead of treating the dashboard warning as a product bug.
- Added a final independent Claude UI-click pass
  `claude-02-06-admin-physical` alongside the Codex physical pass
  `codex-02-06-physical`.
- Updated user guide pages for the changed Settings confirm/disabled-state UX.
- Moved `TASK-359`, `TASK-359-04` through `TASK-359-07`, `TASK-360`, and
  `TASK-360-07` to Done in the task board.

## Validation

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/api-keys.test.tsx tests/vitest/ui/security-sessions.test.tsx tests/vitest/ui/ip-allowlist.test.tsx tests/vitest/ui/security-settings.test.tsx tests/vitest/ui/site-settings.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui/email-settings.test.tsx tests/vitest/ui/webhooks.test.tsx tests/vitest/ui/integration-drawer-secrets.test.tsx tests/vitest/ui/drawers.test.tsx tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx tests/vitest/ui/login-alerts.test.tsx tests/vitest/ui/admin-no-op-control-gate.test.tsx`
- `bun run gates:coderso`
- `bun run scan:semgrep`
- `bun run scan:trivy:secret`
- `bun run scan:gitleaks:worktree`
- `git diff --check`
- Playwright final smoke:
  `codex-02-06-admin-final`, `codex-02-06-admin-final-areas`, and
  `codex-02-06-physical`.
- Claude physical Playwright pass: `claude-02-06-admin-physical` clicked the
  Admin routes and Settings subroutes, cancelled risky dialogs, reported 0
  console errors/warnings, and observed all post-login requests as `200`.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/`.
