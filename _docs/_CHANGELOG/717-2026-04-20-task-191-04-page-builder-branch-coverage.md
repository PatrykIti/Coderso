# 717. TASK-191-04 page builder branch coverage

Date: 2026-04-20
Version: unreleased
Tasks: TASK-191-04

## Key Changes

### QA / Page Builder

- Expanded Page Builder helper coverage for stable no-op branches, fallback
  insertion, invalid repeatable slot paths, parent-to-descendant move
  prevention, flatten traversal, and nested editor stripping.
- Added AdvancedPanel fallback coverage for missing variant, missing visibility,
  and invalid layout sanitization.
- Raised focused Page Builder coverage for `core/admin/ui/pages/builder/*` to
  above 96% lines and 80% branches.

## Validation

- `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/pageBuilder`
- `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts --coverage tests/vitest/pageBuilder`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
