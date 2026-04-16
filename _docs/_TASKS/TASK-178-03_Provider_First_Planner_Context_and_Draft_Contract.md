# TASK-178-03: Provider-First Planner Context and Draft Contract
# FileName: TASK-178-03_Provider_First_Planner_Context_and_Draft_Contract.md

**Priority:** High
**Category:** Assistant/Core + LLM Provider Planning
**Estimated Effort:** Large
**Dependencies:** TASK-178-01, TASK-178-02, TASK-171
**Status:** To Do

---

## Overview

Make the configured reasoning model the primary planner for `LLM Guide` operation understanding, while keeping strict local validation and deterministic fallbacks.

The model should receive bounded CMS context and return a structured operation draft. The server then validates, repairs, resolves targets, and maps the draft to strict typed actions or a safe needs-input/read-only plan.

## Sub-Tasks

No child task files.

## Architecture

Extend provider planning beyond blueprint setup. The provider prompt package should include:

- current prompt,
- recent assistant/user turn summary needed for target continuity,
- active route and active resource summary,
- resource registry capabilities,
- bounded resource catalog summaries,
- examples of allowed operation draft JSON,
- explicit forbidden outputs.

Provider output must not be trusted directly. It must pass:

1. JSON parse,
2. strict draft schema,
3. target resolver,
4. typed action mapper,
5. action plan schema.

Local deterministic planner remains fallback for provider unavailable/error/malformed output.

## Integration with Current Code

- Wire provider operation planning through the existing `planAssistantActions` path, not through a new route.
- Reuse `core/services/assistant/providers/index.ts` and current assistant LLM settings from `settingsService`.
- Extend `core/services/assistant/providerPlanningContext.ts` to include registry capabilities and safe resource summaries.
- Extend `core/services/assistant/actionPlanProviderAdapter.ts` or add a sibling adapter for operation drafts; provider output must still normalize into existing `AssistantActionPlan`.
- Keep `planAssistantActionsWithProviderDraft` as the provider-aware entry point and route it from `assistantRoutes.ts` only after current LLM availability/permission checks.
- Preserve deterministic fallback when provider is disabled, unavailable, times out, or returns invalid JSON.

## Files to Change

- `core/server/routes/assistantRoutes.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/providerPlanningContext.ts`
- `core/services/assistant/actionPlanProviderAdapter.ts`
- `core/services/assistant/providers/index.ts` only if resolver wiring needs a narrow extension
- `core/services/assistant/cmsOperationDraftSchema.ts`
- `tests/vitest/assistant/provider-planning-context.test.ts`
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts`
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`
- `tests/integration/routes/assistant.test.ts`

## Acceptance Criteria

1. LLM Guide planning uses the configured provider for generic operation drafts when available.
2. Provider drafts cannot bypass strict operation draft schema, target resolver, action mapper, or action plan schema.
3. Provider unavailable/malformed/unsafe output falls back to local deterministic behavior or safe `needs_input`.
4. Provider prompt package includes capabilities and context, not full resource payloads.
5. Route tests prove provider planning remains on `/assistant/actions/plan`.

## Security Contract

- Visibility: internal-only through `/admin/api/assistant/actions/plan`.
- Auth model: existing admin session.
- RBAC: provider context must include only resource families for which plan-time read permission has passed.
- CSRF: existing assistant action plan CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation:
  - provider draft schema rejects unknown fields,
  - repaired drafts still go through the same strict schema,
  - unsupported operations become `needs_input`, not ad hoc actions.
- Anti-abuse:
  - provider cannot request arbitrary tools,
  - provider cannot bypass review or idempotency,
  - provider cannot reference resources not present in trusted context without follow-up resolution.
- Secret handling:
  - use existing redaction helpers before provider calls,
  - add tests for nested secrets, submission data, signed URLs, and private settings.

## Testing Requirements

- Vitest fake-provider fixtures for:
  - page delete by name,
  - page update by field,
  - custom screen prefix inspection,
  - form/archive request,
  - ambiguous target requiring candidates,
  - unsafe draft recovery.
- Provider prompt package snapshot tests with redaction.
- Route fallback test when provider is unavailable.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- task/changelog entries on completion
