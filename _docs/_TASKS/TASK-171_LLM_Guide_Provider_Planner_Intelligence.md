# TASK-171: LLM Guide Provider Planner Intelligence
# FileName: TASK-171_LLM_Guide_Provider_Planner_Intelligence.md

**Priority:** High  
**Category:** Core/Assistant + LLM Planning + Security  
**Estimated Effort:** Large  
**Dependencies:** TASK-101-09, TASK-170  
**Status:** In Progress (2026-04-12)

---

## Overview

The current planner is safe and typed, but it is intentionally conservative. It has:
- strict nested plan schema,
- local prompt/context heuristics,
- a provider draft adapter that treats provider JSON as untrusted,
- recovery to typed questions for malformed or unsafe drafts,
- no live provider-driven mutation bypass.

This umbrella covers the next intelligence layer: making `LLM Guide` better at drafting useful plans from provider output while preserving the current deterministic contract. The result should be more flexible planning, not free-form execution.

## Goal

Po tej fali provider-backed planning powinien:
- use bounded admin context and docs evidence to draft plans,
- map provider output through the local strict schema only,
- ask typed follow-up questions when the plan is underspecified,
- explain assumptions and risks in the existing review UI,
- remain fully blocked from executing unsupported actions, unknown fields, secrets, or arbitrary commands.

## Target Capability Areas

Kandydaci do przyszlych subtaskow:
- prompt packaging for provider planning with bounded docs/context snippets,
- provider plan draft call with timeout, quota, redaction, and observability,
- schema-first draft repair and typed clarification questions,
- plan confidence and assumption scoring,
- multi-step context refinement without duplicate setup creation,
- evaluation fixtures for malformed, overbroad, unsafe, and partially valid drafts,
- deterministic fallback to current local planner when provider is unavailable or unsafe.

## Architecture

Current owner modules to extend:
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanProviderAdapter.ts`
- `core/services/assistant/actionPlanHeuristics.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/providers/*`
- `core/services/assistant/assistantQuota.ts`
- `core/services/assistant/assistantMetrics.ts`
- `core/services/assistant/assistantRedaction.ts`
- `core/server/routes/assistantRoutes.ts`

Rules:
- provider output is always untrusted input,
- provider draft cannot introduce new action types by itself,
- provider draft cannot include secrets or raw admin-only data in persisted metadata,
- local schema/registry remains the source of truth,
- failure, timeout, no-hit, and unsafe-output paths must return explainable `needs_input` or fallback behavior.

## Pseudocode

```ts
const promptPackage = buildRedactedProviderPlanningPrompt({ prompt, context, docs });
const providerDraft = await provider.tryCreateActionPlanDraft(promptPackage);
const adapted = adaptProviderDraftToStrictPlan(providerDraft);

return adapted.ok ? adapted.plan : buildNeedsInputPlan(adapted.questions);
```

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanProviderAdapter.ts`
- `core/services/assistant/actionPlanHeuristics.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/providers/*`
- `core/services/assistant/assistantQuota.ts`
- `core/services/assistant/assistantMetrics.ts`
- `core/services/assistant/assistantRedaction.ts`
- `core/server/routes/assistantRoutes.ts`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx` if plan explanation metadata changes

## Security Contract

- Visibility: internal only through existing `/admin/api/assistant/actions/plan`.
- Auth model: existing admin session.
- RBAC: planner keeps `settings:read` + relevant resource read permissions; provider planning does not grant execute permissions.
- CSRF: required for `POST /assistant/actions/plan`.
- Rate-limit bucket: `assistant`, plus existing LLM quota/token budget limits.
- Reject-unknown validation:
  - request context remains strict,
  - provider draft is normalized through `actionPlanProviderAdapter`,
  - unknown fields/actions recover to typed questions or safe failure.
- Anti-abuse:
  - no public write path,
  - no nonce/HMAC/reCAPTCHA because this remains internal planning,
  - provider prompt must be redacted and bounded before leaving the backend.
- Secret handling:
  - provider prompt must not include provider keys, API key material, cookies, CSRF tokens, session ids, raw permission lists, form submissions, access logs, or secret-like settings,
  - provider response and audit metadata must be redacted before persistence.
- Execution boundary:
  - provider can draft only,
  - dry-run and execute still require validated typed plan, RBAC, confirm, and idempotency.

## Sub-Tasks

- `TASK-171-01_Provider_Prompt_Context_Packaging_and_Redaction.md`
  - `TASK-171-01-01_Docs_and_Runtime_Context_Budgeting.md`
  - `TASK-171-01-02_Secret_Redaction_and_Audit_Safe_Payloads.md`
- `TASK-171-02_Provider_Draft_Execution_and_Fallback_Control.md`
- `TASK-171-03_Schema_Repair_and_Clarification_Questions.md`
- `TASK-171-04_Plan_Confidence_Assumptions_and_UX_Explanation.md`
- `TASK-171-05_Provider_Planner_Evaluation_Fixtures_and_Route_Coverage.md`

## Implementation Order

1. Build bounded/redacted provider prompt context in `TASK-171-01`.
2. Add controlled provider draft execution and fallback in `TASK-171-02`.
3. Harden schema repair and typed questions in `TASK-171-03`.
4. Surface assumptions/confidence in review UI in `TASK-171-04`.
5. Close with deterministic fixtures and route coverage in `TASK-171-05`.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - provider prompt packaging/redaction,
  - provider draft adapter and malformed recovery,
  - planner fallback paths,
  - quota/metrics updates where Bun-free.
- Bun:
  - route behavior for provider-enabled planning,
  - settings/LLM availability gates,
  - audit/metrics paths that import runtime or DB-backed services.
- No live provider network call should be required for deterministic tests; use provider fixtures/mocks.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- docs for Assistant Settings / Integrations if provider setup UX changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry when each implementation task is completed

## Progress Notes

- 2026-04-12: Completed `TASK-171-01`; provider planning prompt package helper now builds bounded/redacted docs/runtime/resource context without introducing live provider calls.
