# 715. TASK-191-02 public page runtime coverage

Date: 2026-04-20
Version: unreleased
Tasks: TASK-191-02

## Key Changes

### QA / Runtime Pages

- Added Bun runtime coverage for public Pages rendering through
  `handlePublicRequest`.
- Verified published pages render `publishedData`, while tokenized preview
  renders current draft data.
- Covered draft/public safety, disabled preview mode, expired preview tokens,
  invalid preview query state, and content-route precedence over page slugs.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts tests/unit/pages/previewService.test.ts tests/unit/pages/pageService.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
