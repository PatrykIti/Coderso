# 719. TASK-192 assistant admin resource catalog repair

Date: 2026-04-20
Version: unreleased
Tasks: TASK-192

## Key Changes

### Assistant/Core

- Added bounded assistant resource catalog summaries for posts, entries, media, commerce products/collections, and solution kits.
- Added read-only full-menu inspection through a separate `menu` resource policy while preserving `menu-item` typed actions for item mutations.
- Added resolver candidates for posts, entries, media, menus, commerce, and solution kits.
- Adjusted read-only prompt routing so `pokaz/show/list` prompts inspect resources instead of falling into update needs-input.
- Switched assistant SEO catalog hydration to current target-aware SEO documents and prioritized matched target titles over orphan/stale SEO docs.

### QA

- Added planner/resource catalog coverage for posts and representative left-menu sections.
- Fixed the `custom-screen.delete` test type narrowing before reading `input.name`.
- Added SEO service coverage for ordering current target documents before orphan SEO documents.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/assistant/admin-context-catalog-normalizer.test.ts tests/vitest/assistant/admin-context-catalogs.test.ts`
- DB-backed `.env` smoke for `pokaz menu`, `pokaz media`, `pokaz entries`, `pokaz screens`, `pokaz commerce`, `pokaz solution kits`, and `pokaz posty`.
- DB-backed `.env` smoke for `co widzisz w seo manager?`.
- `set -a && source .env && set +a && bun test tests/unit/seo/seoService.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
