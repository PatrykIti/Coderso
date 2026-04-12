# TASK-171-02: Provider Draft Execution and Fallback Control
# FileName: TASK-171-02_Provider_Draft_Execution_and_Fallback_Control.md

**Priority:** High  
**Category:** Core/Assistant + Provider Runtime  
**Estimated Effort:** Large  
**Dependencies:** TASK-171-01  
**Status:** To Do

---

## Overview

Add the controlled provider call for planning drafts. Provider output may draft a plan, but it cannot bypass local schema, registry, dry-run, confirm, execute, RBAC, or idempotency.

## Sub-Tasks

No child task files yet. Split provider-specific leaves only if non-OpenRouter providers are added.

## Pseudocode

```ts
async function draftPlanWithProvider(input) {
  if (!input.llmAvailable) return localPlannerFallback(input);

  try {
    const prompt = buildRedactedProviderPlanningPrompt(input);
    const draft = await provider.createPlanDraft(prompt, { timeoutMs, maxTokens });
    return adaptProviderDraftToStrictPlan(draft, input.context);
  } catch (error) {
    recordProviderFallback(error);
    return localPlannerFallback(input);
  }
}
```

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/providers/providerTypes.ts`
- `core/services/assistant/providers/openRouterProvider.ts`
- `core/services/assistant/providers/index.ts`
- `core/services/assistant/assistantQuota.ts`
- `core/services/assistant/assistantMetrics.ts`
- `core/server/routes/assistantRoutes.ts`

## Security Contract

- Visibility: internal planning only.
- Auth model: admin session.
- RBAC: provider drafting requires only plan permissions and grants no execute permission.
- CSRF: existing plan endpoint CSRF.
- Rate-limit bucket: `assistant` plus LLM token/request budget.
- Reject-unknown validation: provider draft must pass adapter + strict schema.
- Anti-abuse: no public write path; timeout and retry policy must match assistant LLM guardrails.
- Idempotency: not applicable until execute.
- Secret handling: provider prompt and errors are redacted; provider credentials never enter frontend or audit payloads.

## Testing Requirements

- Vitest:
  - provider success maps through adapter,
  - timeout/error falls back deterministically,
  - unavailable provider uses local planner.
- Bun:
  - route-level LLM availability/settings gate if provider planning is wired in route deps.
- No live provider network call in tests; use fake provider.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md` if plan response metadata changes.
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Provider draft execution is behind existing LLM availability and quota gates.
2. Failure falls back without creating executable unsafe plans.
3. Tests do not depend on live network/provider access.
