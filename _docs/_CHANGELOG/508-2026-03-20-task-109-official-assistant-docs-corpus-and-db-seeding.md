# 508. TASK-109 official assistant docs corpus and DB seeding

**Date:** 2026-03-20  
**Version:** 0.1.0  
**Tasks:** TASK-109, TASK-109-01, TASK-109-02, TASK-109-03, TASK-109-04, TASK-109-05, TASK-109-06

## Key Changes

### Official Assistant Corpus
- Added a new official English documentation corpus under root `docs/`.
- Added corpus structure metadata:
  - `docs/README.md`
  - `docs/_TEMPLATE.md`
  - `docs/_COVERAGE_MATRIX.md`
- Added canonical docs for core admin screens, Coderso modules, solution kits, and applied playbooks.

### Assistant Ingest and Runtime Contract
- Switched the official assistant docs source root from `_docs/_internal` to `docs/`.
- Updated assistant settings defaults so the official corpus points to:
  - `assistant.docs.backend = db`
  - `assistant.docs.sourceRoot = docs`
  - `assistant.docs.paths = ["docs"]`
- Removed official DB-to-filesystem fallback semantics for the `docs/` corpus:
  - seeded DB corpus is now the required readiness condition,
  - missing DB corpus results in `not ready` instead of filesystem fallback.

### Assistant Settings and Source-of-Truth Docs
- Updated assistant settings UI copy to describe the root `docs/` corpus and DB seeding expectation.
- Synced architecture, API, settings, security, and assistant guide docs to the new contract.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsIngestService.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/openRouterProvider.test.ts tests/vitest/ui/assistant-settings.test.tsx`
  - `bun test tests/unit/assistant/assistantService.test.ts tests/unit/settings/settingsService.test.ts`
  - docs corpus structure check for frontmatter and required sections
