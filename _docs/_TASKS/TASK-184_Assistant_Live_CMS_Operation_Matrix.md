# TASK-184: Assistant Live CMS Operation Matrix
# FileName: TASK-184_Assistant_Live_CMS_Operation_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Live Provider E2E
**Estimated Effort:** Large
**Dependencies:** TASK-178, TASK-179, TASK-180, TASK-181, TASK-183
**Status:** Done (2026-04-18)

---

## Overview

Build a live OpenAI/OpenRouter acceptance matrix that proves `LLM Guide` can operate across the full Admin UI menu before changes reach a shared test environment.

Current live tests cover natural read-only inspection prompts. They do not yet run realistic create/search/update/delete/archive flows against an isolated fixture dataset, nor do they cover the full navigation surface: Main, Coderso, Store, Visual, Tools, Admin, and Settings subpages. This task expands live validation from "can the model understand a prompt" to "can the model plan and safely execute or safely refuse reviewed typed operations across the product surface".

Required product behavior:

- create deterministic fixture resources with a unique test run prefix,
- ask the live provider natural prompts in Polish/English,
- verify search/filter results only include matching resources,
- dry-run and execute safe typed actions,
- verify cache/action summaries and final resource state,
- clean up created resources through the same safe action/domain paths,
- run the same scenario set for OpenAI and OpenRouter using `.env` test variables.

## Sub-Tasks

- `TASK-184-01_Live_CMS_Matrix_Harness_and_Fixture_Isolation.md`
- `TASK-184-02_Pages_Live_CMS_Operation_Matrix.md`
- `TASK-184-03_Content_Types_and_Entries_Live_CMS_Operation_Matrix.md`
- `TASK-184-04_Custom_Screens_Live_CMS_Operation_Matrix.md`
- `TASK-184-05_Forms_Live_CMS_Operation_Matrix.md`
- `TASK-184-06_Listings_Live_CMS_Operation_Matrix.md`
- `TASK-184-07_Widget_Templates_Live_CMS_Operation_Matrix.md`
- `TASK-184-08_Menus_SEO_and_Media_Live_CMS_Operation_Matrix.md`
- `TASK-184-09_Bulk_Follow_Up_and_Safety_Live_Matrix.md`
- `TASK-184-10_Posts_Media_and_Admin_Search_Live_Matrix.md`
- `TASK-184-11_Coderso_Operations_Modules_Live_Matrix.md`
- `TASK-184-12_Store_Themes_Dashboard_and_Analytics_Live_Matrix.md`
- `TASK-184-13_Tools_Redirects_Backups_and_Import_Export_Live_Matrix.md`
- `TASK-184-14_Admin_Users_Roles_Audit_and_Access_Logs_Live_Matrix.md`
- `TASK-184-15_Settings_Live_Matrix.md`
- `TASK-184-16_Navigation_Coverage_Map_and_Planned_Modules.md`
- `TASK-184-17_Docs_Commands_and_Closure.md`

## Architecture

The suite should use the existing assistant action flow:

`provider draft -> strict local validation -> target resolution -> typed action plan -> dry-run -> execute -> verify state -> cleanup`

The live matrix must not introduce provider-only execution, broad destructive operations, or mutable tests that depend on pre-existing user content. Every test-created resource must use a unique prefix such as `llm-live-${runId}` and must be cleaned up even on partial failure.

Provider coverage:

- OpenAI: `TEST_OPENAI_API_KEY`, `TEST_OPENAI_MODEL`
- OpenRouter: `TEST_OPENROUTER_API_KEY`, `TEST_OPENROUTER_MODEL`

Execution coverage:

- Read/search by title, slug, name, description, status, visibility.
- Single create/update/delete/archive where action families support it.
- Multi-target create/update/delete/archive where the safe action contract supports it.
- Follow-up target memory, for example "tak, te dwie, usun je".
- Negative safety prompts for broad or mismatched operations.
- Admin UI guidance for read-only or unsupported surfaces:
  - dashboard, analytics, audit/access logs,
  - settings/integrations/security surfaces,
  - plugin store/theme/admin utility surfaces,
  - planned/disabled menu modules.

## Security Contract

- Visibility: test-only internal admin flows.
- Auth model: test harness must run with a test admin actor/session equivalent.
- RBAC: every dry-run/execute path must still enforce action-family permissions.
- CSRF: route-level tests must use existing CSRF handling or service-level executor paths that match route contracts.
- Rate-limit bucket: external provider and local assistant rate limits apply; tests must be opt-in and not part of default CI unless explicitly configured.
- Reject-unknown validation: live provider output remains untrusted and must pass local strict schemas before dry-run/execute.
- Anti-abuse:
  - never run against production data,
  - unique run prefix required,
  - cleanup required,
  - broad prompts must return `needs_input`,
  - destructive operations require exact target count and reviewed plan.
- Secret handling:
  - never log provider API keys,
  - never store provider raw payloads in snapshots,
  - never include form submissions, cookies, CSRF tokens, signed URLs, webhook secrets, or privileged settings in provider prompts/assertions.

## Testing Requirements

- New Bun integration live suites, likely under `tests/integration/routes/assistant-live-cms-*.test.ts` or `tests/integration/assistant-live/*`.
- Shared live matrix helper for OpenAI/OpenRouter provider execution.
- DB-backed fixture setup/cleanup; load `.env` before tests.
- Commands to add:
  - `test:assistant:live:cms`
  - provider-specific variants if useful.
- Baseline local validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - targeted non-live Vitest tests for helper logic
  - `set -a && source .env && set +a && bun run test:assistant:live:cms`

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entries when leaves complete

## Completion Notes (2026-04-18)

- Completed live OpenAI/OpenRouter matrix coverage from `TASK-184-01` through `TASK-184-17`.
- Added DB-backed live execution coverage for pages, content types/entries, custom screens, forms, listings, widget templates, menus, SEO, media references, and bulk/follow-up safety.
- Added live-gated/read-only coverage for Posts, Admin Search, Coderso operations modules, Store, Themes, Dashboard, Analytics, Tools, Admin Security, and Settings surfaces.
- Added `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` plus a static route coverage test.
- Added `test:assistant:live:cms` command family.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/live-cms-harness.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-planning-state.test.ts tests/vitest/ui/settings-sidebar.test.tsx`
- `set -a && source .env && set +a && bun run test:assistant:live:cms`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
