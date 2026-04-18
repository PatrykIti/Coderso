# 679. TASK-184-08 menus seo live slice

Date: 2026-04-18
Version: unreleased
Tasks: TASK-184-08

## Key Changes

### Assistant/QA

- Added a DB-backed OpenAI/OpenRouter live matrix slice for menu items and SEO documents.
- The live slice covers menu item inspection, menu item update, menu item delete, SEO document update, SEO document delete without deleting the target page, state verification, and cleanup.

## Pending

- Media reference live coverage remains pending in TASK-184-08 and needs a dedicated safe media/storage fixture.

## Validation

- `set -a && source .env && set +a && bun test tests/integration/assistant-live/menusSeoLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
