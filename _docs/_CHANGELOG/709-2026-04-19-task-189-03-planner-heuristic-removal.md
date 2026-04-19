# 709. TASK-189-03 planner heuristic removal

Date: 2026-04-19
Version: unreleased
Tasks: TASK-189-03

## Key Changes

### Assistant/Core

- Removed provider-side local-first helper branches for active surfaces, listing fields, read-only status/search, and generic policy pre-routing.
- Added one policy-backed local operation preplan/recovery path based on `CmsOperationDraft`, exact policy identity, resolver, safety, and mapper.
- Moved duplicated CMS resource target aliases into `assistantOperationPolicy`.
- Added provider safety handling for non-destructive counted action mismatches.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
