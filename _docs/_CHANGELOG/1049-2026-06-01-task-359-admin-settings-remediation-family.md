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

## Validation

- Planning entry only; implementation validation is owned by TASK-359.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_SETTINGS.md`.
