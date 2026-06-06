# 1117 - TASK-407 content-engine decision rules

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-05-L03

## Key Changes

### Assistant Site Builder
- Added a pure content-engine decision resolver for reviewed intake facts.
- Covered supported services, products, portfolio/projects, case studies,
  posts/editorial, team, locations, FAQ, and testimonials/proof engines.
- Kept decisions as review metadata for later custom-screen/action leaves; no
  content schemas, routes, plugins, or public write endpoints are generated here.

### Safety
- Unknown explicit engine ids fail closed through the existing intake option
  validation.
- Unsupported event/jobs/course-like engine needs become gates and block
  reviewed action-plan handoff.
- Text-signal decisions do not include raw user text or secrets in metadata.

### QA
- Added Vitest coverage for supported engine families, static-only pages,
  explicit and text-signal decisions, unsupported gates, compile metadata, and
  blocked handoff.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeContentEngines.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicReview.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts`
- `bun run test:vitest -- tests/vitest/assistant/assistantSiteBuilderIntakeContentEngines.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeBasicReview.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/action-plan-schema.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
