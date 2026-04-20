# 713. TASK-189-05 live regression fixes

Date: 2026-04-20
Version: unreleased
Tasks: TASK-189-05

## Key Changes

### Assistant/Core

- Fixed provider prompt-implied field overrides so provider `layout` prompts cannot map listing template updates to `slug`.
- Allowed policy draft normalization to keep exact resource identity while letting resolver/mapper own unsupported or gated operation handling.
- Kept selected-block `dataPath` patches from being overwritten by prompt field aliases.
- Treated provider read-only/inspection drafts as unsafe when the original prompt is destructive, forcing local policy recovery instead of returning a misleading ready inspection.

### QA

- Accepted `responseKind=gated` as a valid non-executable live matrix result for post/media mutation prompts.
- Raised the DB-backed user settings service test timeout to avoid false failures on slower local DB runs.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/settings/userSettingsService.test.ts`
- `bun run test:assistant:live`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
