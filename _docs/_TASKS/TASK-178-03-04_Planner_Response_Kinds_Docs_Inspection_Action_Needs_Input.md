# TASK-178-03-04: Planner Response Kinds for Docs, Inspection, Action, and Needs Input
# FileName: TASK-178-03-04_Planner_Response_Kinds_Docs_Inspection_Action_Needs_Input.md

**Priority:** High
**Category:** Assistant/Core + Admin UX
**Estimated Effort:** Medium
**Dependencies:** TASK-178-03-01, TASK-178-03-02, TASK-178-04
**Status:** To Do

---

## Overview

Move "what kind of response is this?" into the backend planner for `LLM Guide`.

The plan endpoint must be able to return:

- docs-style guidance when the prompt is truly documentation/help oriented,
- read-only inspection/candidate plan,
- ready typed action plan,
- `needs_input`,
- gated unsupported operation.

This avoids sending ambiguous CMS prompts to docs RAG from the browser.

## Sub-Tasks

No child task files.

## Architecture

Define explicit planner response kinds, either as strict `AssistantActionPlan` metadata or a small route response extension that remains backward-compatible with `ActionPlanReview`.

The response must make UI decisions deterministic:

- docs guidance: render assistant message without action review,
- inspection: render candidate review without controls,
- action plan: render review/dry-run/execute,
- needs input: render questions and disabled controls,
- gated: render reason and no execution.

## Integration with Current Code

- Extend `AssistantActionPlan` metadata only if it stays compatible with `actionPlanSchema`.
- Keep `ActionPlanReview` as the review renderer for inspection/action/needs-input.
- Keep `AssistantMessage` for docs-style guidance if planner returns a non-action answer.
- Avoid a second `/assistant/chat` call from `LLM Guide` UI just to classify intent.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `tests/vitest/assistant/action-plan-schema.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`

## Acceptance Criteria

1. Planner can classify true docs/help prompts without the browser routing them to RAG first.
2. CMS inspection prompts return inspection/candidates.
3. Mutation prompts return typed action plan or needs-input.
4. UI rendering is driven by strict planner response shape.
5. Backward compatibility is preserved for existing action plan clients.

## Security Contract

- Visibility: internal-only assistant planner response contract.
- Auth model: existing admin session.
- RBAC: response kind does not override route/domain permissions.
- CSRF: unchanged plan endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: response metadata rejects unknown fields.
- Anti-abuse: docs-style response cannot mutate; action response cannot execute without review.
- Secret handling: all response text/details still pass redaction rules where dynamic backend data is included.

## Testing Requirements

- Vitest planner tests for docs guidance vs CMS inspection vs action plan vs needs-input.
- UI tests for each response kind.
- Route tests for backward-compatible response validation.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- task/changelog entries on completion
