# TASK-178-03-02: Provider Operation Draft Prompt and Response Schema
# FileName: TASK-178-03-02_Provider_Operation_Draft_Prompt_and_Response_Schema.md

**Priority:** High
**Category:** Assistant/Core + LLM Provider Planning
**Estimated Effort:** Large
**Dependencies:** TASK-178-03-01, TASK-178-01, TASK-178-02
**Status:** Done (2026-04-16)

---

## Overview

Teach the configured reasoning model to return a strict CMS operation draft instead of a user-facing docs answer when `LLM Guide` planning is requested.

The model should understand natural language and output structured intent. The server validates and maps it; the model never executes anything directly.

## Sub-Tasks

No child task files.

## Architecture

Provider input should include:

- user prompt,
- assistant mode and route context,
- active surface summary,
- resource registry capabilities,
- bounded server-side resource catalog summaries,
- examples of valid `CmsOperationDraft`,
- forbidden outputs and safety constraints.

Provider output must be JSON shaped like `CmsOperationDraft` or a typed "needs clarification" draft. It must not be an executable action plan.

## Integration with Current Code

- Extend `core/services/assistant/providerPlanningContext.ts`.
- Reuse `core/services/assistant/cmsOperationDraftSchema.ts`.
- Add or extend adapter logic in `actionPlanProviderAdapter.ts` for operation drafts.
- Reuse `assistantRedaction.ts` for prompt package redaction.
- Do not add live-network assumptions to Vitest; use fake providers.

## Files to Change

- `core/services/assistant/providerPlanningContext.ts`
- `core/services/assistant/actionPlanProviderAdapter.ts`
- `core/services/assistant/cmsOperationDraftSchema.ts`
- `core/services/assistant/cmsResourceRegistry.ts`
- `tests/vitest/assistant/provider-planning-context.test.ts`
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts`
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`

## Acceptance Criteria

1. Provider prompt package describes CMS operation draft output, not freeform answer output.
2. Provider prompt package includes registry capabilities and bounded resource summaries.
3. Provider output is validated by `cmsOperationDraftSchema`.
4. Malformed provider JSON recovers to safe `needs_input` or local fallback.
5. Redaction tests prove secrets/submissions/private settings do not cross the provider boundary.

## Security Contract

- Visibility: internal-only provider planning package.
- Auth model: current admin session context only; no user credentials sent to provider.
- RBAC: only include resources allowed by plan-time read permissions.
- CSRF: unchanged, because provider planning is triggered only through current plan route.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: provider operation drafts reject unknown fields.
- Anti-abuse: provider cannot request tools, arbitrary actions, SQL, filesystem, or network operations.
- Secret handling: redact nested secret-like keys, signed URLs, form submission data, cookies, tokens, and provider credentials.

## Testing Requirements

- Vitest provider prompt package snapshots.
- Fake-provider tests for good draft, malformed JSON, unsafe fields, and clarification draft.
- Redaction tests for nested secret-like provider context.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- task/changelog entries on completion

## Completion Notes (2026-04-16)

- Provider planning prompt packages now include CMS registry capabilities and page resource summaries.
- Provider prompt instructions now request CMS operation drafts rather than executable action plans.
- `planAssistantActionsWithProviderDraft` validates provider JSON as `CmsOperationDraft` first and resolves it locally through the generic CMS planner path.
- Existing provider action-plan draft compatibility remains as fallback.
