# 513. TASK-114 assistant DB-only enforcement

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-114, TASK-114-01, TASK-114-02, TASK-114-03, TASK-114-04

## Key Changes

### Assistant Docs Runtime
- Removed active official assistant support for the legacy `_docs/filesystem` model.
- Official assistant runtime now enforces the `docs -> DB seeded corpus` path only.
- Missing seeded DB corpus now remains a `not ready` state without filesystem fallback.

### Settings and Migration
- Added normalization for legacy assistant docs settings so old `_docs/filesystem` values no longer control runtime behavior.
- Kept Assistant Settings focused on the DB-seeded `docs/` contract and removed the remaining implied support for legacy docs mode.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/admin/assistantClient.test.ts tests/vitest/ui/assistant-settings.test.tsx tests/vitest/ui-integration/admin-shell-request-budget.test.tsx`
  - `bun run vitest run tests/vitest/assistant/docsIngestService.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/openRouterProvider.test.ts`
  - `bun test tests/unit/assistant/assistantService.test.ts tests/unit/settings/settingsService.test.ts tests/integration/routes/assistant.test.ts`
