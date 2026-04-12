# TASK-173: LLM Guide Production Readiness and Acceptance
# FileName: TASK-173_LLM_Guide_Production_Readiness_and_Acceptance.md

**Priority:** High  
**Category:** QA/Assistant + Security + Product Acceptance  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09, TASK-170, TASK-171, TASK-172  
**Status:** To Do

---

## Overview

`TASK-101-09` delivers a solid typed action engine and a safe first product slice. The remaining gap is not the foundation, but production confidence across more scenarios: broader acceptance matrices, failure handling, observability, docs, and guardrails as new action families and blueprints are added.

This umbrella covers the hardening layer that should run alongside the next capability waves instead of being postponed until the end.

## Goal

Po tej fali `LLM Guide` should be demonstrably production-ready for its declared capability set:
- every supported business flow has plan/dry-run/execute/runtime acceptance coverage,
- failure and partial-success states are understandable to the user,
- audit/idempotency/metrics are usable for support,
- docs and admin copy describe what the assistant can and cannot do,
- security gates are aligned with current action families.

## Target Capability Areas

Kandydaci do przyszlych subtaskow:
- acceptance matrix for each supported intent family and blueprint pack,
- route/error mapping coverage for every new action family,
- partial success and recovery UX in `ActionExecutionResult`,
- idempotency replay diagnostics and support-friendly metadata,
- assistant metrics/audit dashboard hooks if current observability is insufficient,
- security/performance gates for action endpoints,
- assistant docs corpus updates for new capabilities and explicit limitations,
- regression fixtures proving docs-only cannot mutate resources.

## Architecture

Current owner modules to audit or extend:
- `core/services/assistant/actionExecutionStore.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/assistant/actionDiffService.ts`
- `core/services/assistant/assistantMetrics.ts`
- `core/services/assistant/assistantRedaction.ts`
- `core/server/routes/assistantRoutes.ts`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- `tests/vitest/assistant/*`
- `tests/vitest/ui/assistant*.test.tsx`
- `tests/unit/assistant/*`
- `tests/integration/routes/assistant.test.ts`
- `tests/integration/server/*assistant*`

Rules:
- production readiness is measured per declared capability, not by claiming broad LLM autonomy,
- tests must follow the Bun/Vitest ownership model,
- security scanner/gate changes require owner, reason, expiry, and ticket notes,
- docs must state unsupported scenarios clearly instead of implying unlimited assistant intelligence.

## Pseudocode

```ts
for (const capability of declaredGuideCapabilities) {
  await assertPlanDryRunExecuteAcceptance(capability);
  await assertSecurityNegativeCases(capability);
  await assertDocsDescribeCapabilityAndLimits(capability);
}
```

## Files to Change

- `core/services/assistant/actionExecutionStore.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/assistant/actionDiffService.ts`
- `core/services/assistant/assistantMetrics.ts`
- `core/services/assistant/assistantRedaction.ts`
- `core/server/routes/assistantRoutes.ts`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- `tests/vitest/assistant/*`
- `tests/vitest/ui/assistant*.test.tsx`
- `tests/unit/assistant/*`
- `tests/integration/routes/assistant.test.ts`
- `tests/integration/server/*assistant*`

## Security Contract

- Visibility: internal-only action endpoints remain under `/admin/api/assistant/actions/*`.
- Auth model: existing admin session.
- RBAC: readiness tests must prove route/domain permissions still gate plan/dry-run/execute for each supported action family.
- CSRF: readiness tests must preserve CSRF requirements on all action endpoints.
- Rate-limit bucket: `assistant`; performance/security tests must verify the current bucket where feasible.
- Reject-unknown validation: acceptance tests must include unknown context fields, unsupported action types, and malformed provider drafts.
- Anti-abuse:
  - no public write surface in this umbrella,
  - any future public form/write path acceptance must use shared nonce/captcha/public access evaluators.
- Idempotency: readiness must include replay, conflict, and support diagnostics for actor/plan/hash mismatches.
- Secret handling: validation must prove secrets and raw sensitive context are absent from UI payloads, audit/idempotency metadata, provider prompts, and error responses.

## Sub-Tasks

- `TASK-173-01_Acceptance_Matrix_and_Flow_Inventory.md`
  - `TASK-173-01-01_Docs_Only_Cannot_Mutate_Regression.md`
  - `TASK-173-01-02_Action_Family_Route_Error_Matrix.md`
- `TASK-173-02_Partial_Success_and_Recovery_UX.md`
- `TASK-173-03_Idempotency_Replay_Diagnostics_and_Support_Metadata.md`
- `TASK-173-04_Security_and_Performance_Gates_for_Action_Endpoints.md`
- `TASK-173-05_Observability_Audit_and_Admin_Diagnostics.md`
- `TASK-173-06_Docs_Corpus_Capability_Limits_and_Closure.md`

## Implementation Order

1. Build the acceptance matrix and route/security negative cases in `TASK-173-01`.
2. Improve partial-success and recovery UX in `TASK-173-02`.
3. Harden idempotency diagnostics in `TASK-173-03`.
4. Add security/performance gates in `TASK-173-04`.
5. Add observability/audit diagnostics only where current signals are insufficient in `TASK-173-05`.
6. Close with docs corpus, architecture/security docs, board, and changelog in `TASK-173-06`.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - assistant UI partial-success/recovery states,
  - redaction/metrics helpers,
  - docs-only vs LLM Guide mode behavior where Bun-free.
- Bun:
  - route registration and error mapping,
  - DB-backed idempotency replay/conflict,
  - runtime acceptance for generated surfaces,
  - relevant `tests/security/*`, `tests/perf/*`, and release gates when contracts change.
- For auth, secret-handling, scanner config, or public-write changes, run local Semgrep/Trivy/Gitleaks commands from `_docs/SECURITY_SPEC.md` when feasible or document CI-only validation.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/TESTING_STRATEGY.md` if lane ownership changes
- `_docs/ASSISTANT_SITE_BUILDER.md`
- relevant `docs/` assistant corpus pages
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry when each implementation task is completed
