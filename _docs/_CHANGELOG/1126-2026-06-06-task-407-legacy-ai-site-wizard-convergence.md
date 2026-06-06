# 1126 - TASK-407 legacy AI site wizard convergence

Date: 2026-06-06
Version: unreleased
Tasks: TASK-407-06-L06, TASK-407-06

## Key Changes

### Assistant Site Builder
- Retired the standalone legacy `AiSiteWizard` plan/apply/dry-run/rerun/rollback
  and clone surface so full-site generation uses one reviewed `LLM Guide` intake
  path.
- Kept Solution Kits as a read-only catalog/detail surface and added an
  `Open LLM Guide` CTA that starts the reviewed site-builder intake.
- Added a typed assistant-panel open event so admin surfaces can open the floating
  assistant in `llm-guide` mode with a starter prompt.

### API and Planner
- Removed admin-client helpers that authored executable direct `context.siteKit`
  action-plan requests.
- Updated `/assistant/actions/plan` schema and route coverage so browser/client
  payloads with direct `context.siteKit` are rejected.
- Enforced `solution-kits:read` and LLM Guide availability for reviewed
  `siteBuilderIntakeState.activeSession` planning before the planner runs.
- Preserved the reviewed active-session handoff through
  `context.siteBuilderIntakeState.activeSession` and kept planner-level direct
  `siteKit` gating as defense in depth.

### Docs and Tasks
- Updated assistant architecture/API/developer docs to distinguish backend-owned
  strict siteKit compilation from the admin HTTP payload.
- Updated public/user assistant docs and release-gate UX coverage so they point
  at the reviewed `Open LLM Guide` flow instead of the retired wizard.
- Closed TASK-407-06-L06 and TASK-407-06, synchronized the task board, and
  recorded Claude/subagent audit evidence.

## Validation

- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/assistantClient.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts tests/vitest/assistant/assistantSiteBuilderIntakePlanner.test.ts tests/vitest/assistant/assistantSiteBuilderIntakeStaticActions.test.ts tests/vitest/ui/solution-kits-page.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
  (8 files, 210 tests)
- `set -a && [ -f .env ] && source .env && set +a; NODE_ENV=test bun test tests/unit/assistant/assistantSiteBuilderIntakeDryRun.test.ts tests/unit/assistant/actionExecutorService.test.ts tests/integration/routes/assistant.test.ts`
  (3 files, 101 tests)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `bun run gates:coderso`
- `bun run precommit`
- Claude and subagent read-only audits found L06 contract drift before
  implementation; the corrected contract passed fresh read-only re-audits before
  code changes began.
- A post-commit subagent drift pass found stale release-gate, RBAC, docs, and
  TASK-407 umbrella-table drift; those findings were fixed and revalidated before
  the final committed-head drift pass was rerun.
- A later post-commit pass found only low-severity stale retired-wizard wording
  in active runtime/docs surfaces; the wording was moved to reviewed LLM Guide
  site-builder language before the final committed-head audit was rerun.
