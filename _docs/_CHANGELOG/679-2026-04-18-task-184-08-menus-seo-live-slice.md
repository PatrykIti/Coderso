# 679. TASK-184-08 menus seo media live matrix

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-08

## Key Changes

### Assistant/QA

- Added a DB-backed OpenAI/OpenRouter live matrix for menu items, SEO documents, and media references.
- The live matrix covers menu item inspection, menu item update, menu item delete, SEO document update, SEO document delete without deleting the target page, media reference attach to an existing entry field, state verification, and cleanup.
- Media reference coverage uses a fixture content type, entry, and existing media DB row; no upload bytes are accepted through the assistant action.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/assistant-live/menusSeoLiveMatrix.test.ts`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
