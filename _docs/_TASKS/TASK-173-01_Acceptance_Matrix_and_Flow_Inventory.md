# TASK-173-01: Acceptance Matrix and Flow Inventory
# FileName: TASK-173-01_Acceptance_Matrix_and_Flow_Inventory.md

**Priority:** High  
**Category:** QA/Assistant + Product Acceptance  
**Estimated Effort:** Medium  
**Dependencies:** TASK-173  
**Status:** Done (2026-04-12)

---

## Overview

Create the acceptance matrix for every declared `LLM Guide` capability so production readiness is measured against supported flows, not vague LLM autonomy.

## Sub-Tasks

- `TASK-173-01-01_Docs_Only_Cannot_Mutate_Regression.md`
- `TASK-173-01-02_Action_Family_Route_Error_Matrix.md`

## Pseudocode

```ts
const acceptanceMatrix = supportedGuideFlows.map((flow) => ({
  prompt: flow.prompt,
  plan: expectReadyPlan(flow.intent),
  dryRun: expectPreview(flow.expectedChanges),
  execute: expectExecution(flow.expectedResources),
  runtime: expectPublicOrAdminSurface(flow.expectedRoutes),
}));
```

## Files to Change

- new acceptance matrix docs under `_docs/_TASKS/` or `_docs/` if promoted to source-of-truth
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/integration/server/*assistant*`

## Security Contract

- Visibility: validates internal action endpoints and public runtime reads.
- Auth model: admin session for setup.
- RBAC: every matrix row records required permissions.
- CSRF: action endpoints remain CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: matrix includes negative cases.
- Anti-abuse: public write flows must list nonce/captcha/access evaluator coverage.
- Idempotency: every mutating flow records replay/no-duplicate expectations.
- Secret handling: acceptance asserts redacted UI/API/audit payloads where relevant.

## Testing Requirements

- Vitest:
  - planner/UI rows for each supported flow.
- Bun:
  - route/executor/runtime acceptance rows for executable flows.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/TESTING_STRATEGY.md` if acceptance lane ownership changes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Every supported capability maps to explicit tests.
2. Unsupported capability prompts map to typed questions or docs-only answers.
3. Matrix states Bun vs Vitest ownership per flow.

## Completion Notes (2026-04-12)

- Added `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`.
- Matrix covers executable actions, business blueprint packs, gated flows, negative contracts, and known gaps.
- Added explicit docs-only non-mutation regression and unsupported action route error coverage.
