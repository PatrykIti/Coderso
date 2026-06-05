# TASK-404-04: Admin UX Validation and Closure
# FileName: TASK-404-04-Admin-UX-Validation-and-Closure.md

**Parent Task:** TASK-404
**Priority:** High
**Category:** Settings / Admin UX / QA
**Estimated Effort:** Large
**Dependencies:** TASK-404-01, TASK-404-02, TASK-404-03
**Status:** ✅ Done
**Completed:** 2026-06-05

---

## Overview

Make the admin UI provider-aware and close the family with docs, changelog,
scanner checks, and board synchronization.

This subtask owns the visible UX: provider selection in Settings -> Email,
hiding manual SMTP fields for Resend, Resend integration affordances, provider
labels in delivery logs, dirty-state/autosave behavior, and final validation.

---

## Security Contract

- **Endpoint visibility:** no new endpoints in the UI leaves.
- **Auth model:** unchanged admin session.
- **RBAC:** unchanged; UI calls existing `settings:read`/`settings:write`
  endpoints through existing admin clients.
- **CSRF:** unchanged; writes keep existing client `withCsrf` behavior.
- **Rate-limit bucket:** unchanged; test-send remains `admin_write`.
- **Validation:** browser forms must align with backend strict DTOs and must not
  invent extra fields such as `baseUrl`.
- **Anti-abuse controls:** no public write surface is added.
- **Secret handling:** no Resend API key, SMTP password, bearer token, or
  decrypted integration config may appear in React state that is cached to
  browser storage, DOM text, confirmation copy, delivery log rows, debug output,
  or localStorage.

---

## Sub-Tasks

- `TASK-404-04-L01-Email-Settings-Provider-UX.md`
- `TASK-404-04-L02-Integrations-Provider-UX.md`
- `TASK-404-04-L03-Validation-Docs-Changelog-and-Board-Closure.md`

---

## Testing Requirements

- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/email-settings.test.tsx tests/vitest/ui/integrations.test.tsx tests/vitest/ui/integration-drawer-secrets.test.tsx`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/emailSettings.test.tsx tests/vitest/ui-integration/integrations.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:gitleaks:worktree`
- `bun run scan:semgrep`
- `bun run gates:coderso`

---

## Documentation Updates Required

- `docs/guide/screens/email-settings.md`
- `docs/guide/screens/integrations.md`
- `_docs/CMS_API.md`
- `_docs/INTEGRATIONS.md`
- `_docs/SETTINGS.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a task-linked changelog entry on closure.
