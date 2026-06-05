# TASK-404-04-L03: Validation Docs Changelog and Board Closure
# FileName: TASK-404-04-L03-Validation-Docs-Changelog-and-Board-Closure.md

**Parent Subtask:** TASK-404-04
**Priority:** High
**Category:** QA / Docs / Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-404-01-L01, TASK-404-01-L02, TASK-404-02-L01, TASK-404-02-L02, TASK-404-02-L03, TASK-404-03-L01, TASK-404-03-L02, TASK-404-04-L01, TASK-404-04-L02
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Close the Resend Email Provider family only after implementation, targeted tests,
security scans, docs, changelog, and task board status transitions are complete.

Files to inspect/change:

- `_docs/CMS_API.md`
- `_docs/INTEGRATIONS.md`
- `_docs/SETTINGS.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `docs/guide/screens/email-settings.md`
- `docs/guide/screens/integrations.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<next>-2026-06-05-task-404-resend-email-provider.md`

---

## Security Contract

- **Endpoint visibility:** no new endpoints in this closure leaf.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** docs must match strict schemas and reject-unknown behavior from
  implemented leaves.
- **Anti-abuse controls:** document that nonce/signature/HMAC/reCAPTCHA are not
  applicable because no public write endpoint was added.
- **Secret handling:** docs and changelog must state that Resend API keys stay
  encrypted/backend-only and credential-bearing Email/Integration endpoints stay
  uncached in browser storage.

---

## Sub-Tasks

None. This is an execution leaf.

---

## Implementation Pseudocode

Closure checklist shape:

```md
- [ ] All TASK-404 leaf files are terminal (`✅ Done`, `⏭️ Superseded`, or `❌ Cancelled`).
- [ ] `_docs/_TASKS/README.md` counts match table rows.
- [ ] Changelog entry lists TASK-404 and every closed leaf id.
- [ ] Docs describe SMTP and Resend setup paths.
- [ ] Final validation commands and scanner outcomes are recorded.
```

Docs data flow:

- API docs describe `provider: "smtp" | "resend"`, provider-aware `status`, and
  Resend summary object without secrets.
- Integration docs describe Resend `apiKey` secret only and no `baseUrl`.
- Security docs describe fixed Resend endpoint and uncached credential-bearing
  endpoints.
- Guide docs show end-user setup: configure Resend in Integrations, then select
  Resend in Email Settings.

Error handling:

- If broad suites fail for unrelated pre-existing reasons, isolate and record
  targeted suite status separately.
- If DB-backed tests cannot run because `DATABASE_URL` is unavailable or
  unreachable, state that explicitly and leave closure incomplete until rerun or
  accepted by project rules.
- Do not move parent `TASK-404` to Done while any physical descendant remains
  open.

Regression-test shape:

- Final docs/changelog task does not add production behavior by itself.
- Validation uses the targeted leaf suites plus lint/types/scanners/gates.
- Board count verification proves To Do/In Progress/Done counts match rows.

---

## Testing Requirements

- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun test tests/unit/email/emailSettingsService.test.ts tests/unit/integrations/integrationsService.test.ts tests/unit/audit/auditService.test.ts tests/unit/audit/auditExport.test.ts tests/integration/routes/emailSettings.test.ts tests/integration/routes/integrations.test.ts`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/email/emailProvider.test.ts tests/vitest/forms/formAutomationRunnerCore.test.ts tests/vitest/admin/emailClient.test.ts tests/vitest/admin/integrationsClient.test.ts tests/vitest/ui/email-settings.test.tsx tests/vitest/ui/integrations.test.tsx tests/vitest/ui/integration-drawer-secrets.test.tsx tests/vitest/ui-integration/emailSettings.test.tsx tests/vitest/ui-integration/integrations.test.tsx`
- `bun run scan:gitleaks:worktree`
- `bun run scan:semgrep`
- `bun run gates:coderso`

---

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/INTEGRATIONS.md`
- `_docs/SETTINGS.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` only if cache behavior
  changes; otherwise leave credential-bearing endpoints explicitly uncached.
- `docs/guide/screens/email-settings.md`
- `docs/guide/screens/integrations.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<next>-2026-06-05-task-404-resend-email-provider.md`
- `_docs/_TASKS/README.md`
