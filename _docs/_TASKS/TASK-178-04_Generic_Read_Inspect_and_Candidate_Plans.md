# TASK-178-04: Generic Read, Inspect, and Candidate Plans
# FileName: TASK-178-04_Generic_Read_Inspect_and_Candidate_Plans.md

**Priority:** High
**Category:** Assistant/Core + Admin UX
**Estimated Effort:** Medium
**Dependencies:** TASK-178-01, TASK-178-02, TASK-178-03
**Status:** To Do

---

## Overview

Add first-class read-only plans for CMS inspection prompts:

- "czy widzisz strone 'pysiek mysiek' w Pages?",
- "jakie ekrany widzisz z prefixem House Projects?",
- "ktore formularze sa opublikowane?",
- "czy jest listing query dla produktow?".

These plans must answer from trusted resource catalogs/details and never show dry-run/execute as if a mutation was pending.

## Sub-Tasks

No child task files.

## Architecture

Introduce a read-only plan shape or metadata flag for plans with no mutations:

- operation: `inspect` / `find`,
- candidates,
- match confidence,
- no executable actions,
- optional next-step question when the user likely wants a follow-up mutation.

Admin UI must distinguish:

- read-only answer,
- needs input before mutation,
- ready mutation plan,
- blocked mutation plan.

This prevents cases where a simple "what do you see?" prompt falls into catalog-creation clarification.

## Integration with Current Code

- Extend `AssistantActionPlan` in `actionPlanTypes.ts` with metadata/details for non-mutating inspection results, or add a strict compatible field that `actionPlanSchema.ts` owns.
- Do not add read-only pseudo-actions to `assistantActionTypes` unless they are explicitly non-executable and blocked from dry-run/execute.
- Update `ActionPlanReview.tsx` so read-only plans render as answers/candidates and hide dry-run/execute controls.
- Update `AssistantPanel.tsx` only enough to preserve the single plan rendering flow.
- Read-only plans must be returned from `planAssistantActions`; do not route these prompts to `/assistant/chat`.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/cmsTargetResolver.ts`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/vitest/assistant/action-plan-schema.test.ts`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`

## Acceptance Criteria

1. "czy widzisz..." and "jakie ... widzisz..." prompts return read-only/candidate plans for registered CMS resources.
2. Read-only plans do not enable dry-run or execute.
3. Candidate lists are bounded, redacted, and include enough identity to ask a safe follow-up.
4. No-match responses explain what was searched and do not ask the user what catalog to create.
5. Existing ready mutation plans still render with dry-run/execute controls.

## Security Contract

- Visibility: internal-only through `/admin/api/assistant/actions/plan`.
- Auth model: existing admin session.
- RBAC: read-only inspection requires read permission for the resource family.
- CSRF: existing assistant action plan CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: read-only plan metadata rejects unknown fields.
- Anti-abuse:
  - no execution for read-only plans,
  - broad inspection results are bounded and paginated/truncated,
  - no full payload dumps.
- Secret handling:
  - summaries only,
  - no form submissions, secrets, access logs, tokens, cookies, provider keys, or raw settings blobs.

## Testing Requirements

- Vitest planner tests for inspection prompts across at least:
  - pages,
  - custom screens,
  - forms,
  - listings.
- UI tests showing no dry-run/execute controls for read-only plans.
- Redaction tests for inspection summaries.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- relevant `docs/` assistant corpus pages
- task/changelog entries on completion
