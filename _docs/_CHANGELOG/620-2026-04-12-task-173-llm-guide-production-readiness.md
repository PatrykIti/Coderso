# 620. TASK-173 LLM Guide production readiness closure

**Date:** 2026-04-12
**Version:** 0.1.0
**Tasks:** TASK-173, TASK-173-06

## Key Changes

### Assistant Docs
- Updated assistant corpus pages to describe `Docs only` vs `LLM Guide`
  capability boundaries.
- Documented that docs-only answers remain read-only and LLM Guide mutation
  requires reviewed typed actions.
- Documented gated follow-up capabilities:
  - booking resources,
  - checkout/payment,
  - webhook automation,
  - nested page widget patches,
  - installed solution-kit refinements.

### Source Of Truth
- Updated architecture, API, security, site-builder, and acceptance matrix docs
  with the declared supported and gated capability set.
- Closed `TASK-173-06` and the parent `TASK-173` readiness wave.

### Validation
- Ran:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts tests/unit/assistant/actionExecutorService.test.ts tests/security/codersoSecurityGate.test.ts tests/perf/codersoPerformanceGate.test.ts tests/integration/routes/assistant-rate-limit.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/assistant/actionExecutorService.db.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/assistant/assistantMetrics.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/assistantRedaction.test.ts tests/vitest/assistant/action-diff-service.test.ts`
