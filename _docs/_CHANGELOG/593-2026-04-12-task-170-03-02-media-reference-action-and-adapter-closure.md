# 593. TASK-170-03-02 media reference action and adapter closure

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-170, TASK-170-03, TASK-170-03-02, TASK-170-03-02-03, TASK-170-03-02-04

## Key Changes

### Assistant Actions
- Promoted `media.reference.attach` from contract-only to executable `LLM Guide` action for `entry` targets.
- Added strict input normalization for:
  - `mediaId`
  - `targetType=entry`
  - `targetId`
  - `field`
- Added dry-run and execute adapter logic through existing media/entry services:
  - `getMediaById`
  - `getEntry`
  - `updateEntry`

### Safety
- The action references existing media only and never transports raw upload bytes.
- Re-execution noops when the target entry field already contains the planned media reference.
- Page/block media patching remains out of scope until a page-specific patch contract lands.

### Closure
- Marked the menu/SEO/media adapter wave done after menu item, SEO document, and entry media-reference adapters shipped.
- Left `menu.structure.patch` contract-only for a later adapter slice.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/action-family-contracts.test.ts tests/vitest/assistant/action-registry.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/action-plan-provider-adapter.test.ts tests/vitest/assistant/action-diff-service.test.ts`
  - `bun test tests/unit/assistant/actionExecutorService.test.ts`
