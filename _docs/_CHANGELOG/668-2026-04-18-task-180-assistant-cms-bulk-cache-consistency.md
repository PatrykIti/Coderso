# 668. TASK-180 assistant CMS bulk cache consistency

Date: 2026-04-18
Version: unreleased
Tasks: TASK-180, TASK-180-01, TASK-180-01-01, TASK-180-01-02, TASK-180-02, TASK-180-02-01, TASK-180-02-02, TASK-180-03

## Key Changes

### Assistant/Core

- Counted CMS delete/archive/update prompts can map multiple resolved targets into reviewed typed action plans beyond the previous page-focused coverage.
- Explicit multi-create CMS drafts can map locally validated `mutation.patch.items[]` definitions into existing typed upsert/create actions.
- Broad, mismatched, unsafe, or secret-like bulk drafts return `needs_input`.

### Admin/UI

- Assistant execution now invalidates known admin cache families for successful non-noop CMS action results across content types, entries, custom screens, pages, forms, listings, widget templates, menus, and SEO.
- Failed, noop, and unknown action results do not broadcast mutation cache events.
- SEO manager now refreshes from `seo:list` and `seo:detail:<id>` cache bus events.
- Cache bus broadcasts now notify same-tab subscribers so the current admin surface can refresh after assistant execution.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/admin/cacheBus.test.ts tests/vitest/admin/assistantClient.test.ts`
- `bun run vitest run --config vitest.config.ts tests/vitest/admin/seoClient.test.ts tests/vitest/ui/seo-manager.test.tsx`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant-openai-live.test.ts tests/integration/routes/assistant-openrouter-live.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
