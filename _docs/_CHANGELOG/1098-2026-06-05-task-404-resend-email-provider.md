# 1098 - TASK-404 Resend email provider

Date: 2026-06-05
Version: unreleased
Tasks: TASK-404, TASK-404-01, TASK-404-01-L01, TASK-404-01-L02, TASK-404-02, TASK-404-02-L01, TASK-404-02-L02, TASK-404-02-L03, TASK-404-03, TASK-404-03-L01, TASK-404-03-L02, TASK-404-04, TASK-404-04-L01, TASK-404-04-L02, TASK-404-04-L03

## Key Changes

### Email Provider

- Added `resend` as a first-class email provider alongside SMTP while keeping
  legacy missing `email.provider` rows defaulted to `smtp`.
- Added a backend-only Resend transport that sends through the fixed
  `https://api.resend.com/emails` endpoint with bearer auth, bounded
  `User-Agent`, and capped optional idempotency keys.
- Kept SMTP settings non-destructive when switching providers, and made delivery
  logs record provider labels for SMTP and Resend.

### Integrations And Secrets

- Added built-in `resend` integration with a single encrypted secret field:
  `apiKey`. No `baseUrl` or arbitrary Resend config keys are accepted.
- Added Resend-shaped `re_...` redaction for audit payloads, audit exports, UI
  audit copy actions, delivery failures, and form-action error persistence.
- Clearing `resend.apiKey` now makes Resend disconnected without changing the
  selected Email Settings provider.

### Forms And Admin UX

- Moved form email automation from SMTP-specific transport dependencies to an
  injected provider-aware `sendEmail` path backed by `sendSystemEmail`.
- Updated Email Settings with a provider selector, Resend configured-state panel,
  canonical link to Settings → Integrations, provider-gated SMTP validation, and
  provider-labeled delivery logs.
- Updated Integrations UI so Resend appears as a Communication integration and
  the drawer never renders secret values, even if a secret field value appears in
  a malformed DTO.

### Docs

- Updated `_docs/CMS_API.md`, `_docs/INTEGRATIONS.md`, `_docs/SETTINGS.md`, and
  `_docs/SECURITY_SPEC.md` for the provider enum, Resend fixed endpoint, secret
  handling, strict validation, and uncached credential-bearing surfaces.
- Updated the admin guide pages for Email Settings and Integrations with the
  Resend setup and clear-key workflows.

## Validation

- `bun run test:vitest -- tests/vitest/email/emailProvider.test.ts tests/vitest/forms/formAutomationRunnerCore.test.ts tests/vitest/admin/emailClient.test.ts tests/vitest/admin/integrationsClient.test.ts tests/vitest/ui/email-settings.test.tsx tests/vitest/ui/integrations.test.tsx tests/vitest/ui/integration-drawer-secrets.test.tsx tests/vitest/ui-integration/emailSettings.test.tsx tests/vitest/ui-integration/integrations.test.tsx tests/vitest/ui/audit-entry-actions.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/email/emailSettingsService.test.ts tests/unit/integrations/integrationsService.test.ts tests/unit/audit/auditService.test.ts tests/unit/audit/auditExport.test.ts tests/integration/routes/emailSettings.test.ts tests/integration/routes/integrations.test.ts`
- `bun run test:vitest -- tests/vitest/ui/drawer-sheet-a11y-gate.test.tsx tests/vitest/ui/email-settings.test.tsx tests/vitest/ui/integration-drawer-secrets.test.tsx tests/vitest/ui-integration/integrations.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run scan:gitleaks:worktree`
- `bun run scan:semgrep`
- `bun run scan:trivy`
- `bun run gates:coderso`
