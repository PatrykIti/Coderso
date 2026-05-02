# 786 - TASK-157 integrations follow-up coverage and reset hardening

**Date:** 2026-05-02
**Version:** Unreleased
**Tasks:** TASK-157

## Key Changes

### Integrations assistant docs

- Refined `docs/screens/integrations.md` so it now documents the shipped search
  control, single-provider encrypted secret setup, request submit behavior, and
  the secret-only masking contract in the drawer.
- Recorded the follow-up audit and validation pass directly in
  `TASK-157_Integrations_Admin_UI_Assistant_Documentation_Refresh.md`.

### Integrations admin UI

- Reset the Integrations drawer and request dialog on close/reopen so stale
  local edits and stale backend errors do not leak into the next session.
- Cleared request errors before reopening the request dialog.

### Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/ui-integration/integrations.test.tsx tests/vitest/ui/integrations.test.tsx tests/vitest/admin/integrationsClient.test.ts` - passed.
- `bun test tests/integration/routes/integrations.test.ts` - passed.
- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `set -a && source .env && set +a && bun test tests/unit/integrations/integrationsService.test.ts` - passed with 3 skipped tests because the suite auto-skipped without an available DB connection/runtime prerequisites.
