# TASK-178-06: Conversation State and Follow-Up Target Memory
# FileName: TASK-178-06_Conversation_State_and_Follow_Up_Target_Memory.md

**Priority:** High
**Category:** Assistant/Core + Admin UX
**Estimated Effort:** Medium
**Dependencies:** TASK-178-01, TASK-178-02, TASK-178-04
**Status:** Done (2026-04-17)

---

## Overview

Preserve bounded planning state across follow-up turns so the assistant can understand prompts like:

- user: "usun ekrany nazwane House Projects xxxx"
- assistant: "nie znalazlem dokladnego dopasowania, widze takie kandydaty..."
- user: "no to jakie widzisz z prefixem House Projects?"
- user: "usun te dwa pierwsze"

The assistant must not treat follow-ups as unrelated catalog setup requests.

## Sub-Tasks

No child task files.

## Architecture

Add a bounded conversation planning state for the floating assistant:

- last operation,
- last resource kind,
- last target query,
- candidate resource ids/names,
- required clarification,
- active plan id/hash,
- expiry and route binding.

State must be stored client-side only for transient UI continuity or server-side only if a safe persistence contract is explicitly added. It must not include secrets or full resource payloads.

The planner should combine:

`current prompt + active route + resource catalog + previous candidate state`

to resolve pronouns and follow-ups such as "te", "pierwszy", "oba", "tamten".

## Integration with Current Code

- Extend `AssistantActionContext` with a bounded optional planning state; schema ownership stays in assistant action validation.
- `AssistantPanel.tsx` may keep the latest planning state from the previous `AssistantActionPlan` and include it in the next `/assistant/actions/plan` request.
- `assistantRoutes.ts` must treat client-supplied planning state as advisory and rehydrate candidates through the current resource resolver.
- `actionPlannerService.ts` consumes the normalized planning state only after route/catalog/active-surface context is rebuilt.
- Do not persist conversation planning state in DB unless a later task adds an explicit storage, expiry, and audit contract.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/server/validation/assistantActionSchemas.ts`
- `core/server/routes/assistantRoutes.ts`
- `core/services/assistant/adminContextService.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/cmsPlanningState.ts` (new)
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/services/assistantClient.ts`
- `tests/vitest/assistant/cms-planning-state.test.ts` (new)
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `tests/integration/routes/assistant.test.ts`

## Acceptance Criteria

1. Follow-up prompts can reuse previous candidate context without reclassifying as setup requests.
2. Candidate state is bounded, expires, and is tied to route/resource context.
3. Client-supplied candidate ids cannot bypass server-side target re-resolution.
4. Polish follow-ups such as "te dwa", "pierwszy", "oba", and "tamten" are covered by fixtures.
5. No secrets or full resource payloads are stored in planning state.

## Security Contract

- Visibility: internal-only assistant planning context.
- Auth model: existing admin session.
- RBAC: stored candidate ids remain advisory and must be rehydrated through current permissions before any mutation.
- CSRF: existing assistant action route CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: conversation state schema rejects unknown fields and clamps candidate counts.
- Anti-abuse:
  - expired/stale route state cannot authorize mutation,
  - destructive follow-ups still require review/dry-run,
  - stale candidates are re-resolved before execution.
- Secret handling: no secrets, submissions, credentials, cookies, provider keys, or full resource data in state.

## Testing Requirements

- Vitest state normalization and expiry tests.
- UI interaction tests for follow-up target selection.
- Planner tests for Polish pronoun follow-ups and candidate reuse.
- Route tests that client-supplied state cannot bypass server-side resource checks.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/SECURITY_SPEC.md`
- task/changelog entries on completion

## Completion Notes (2026-04-17)

- Added `cmsPlanningState.ts` for bounded, expiring, redacted planning state.
- `AssistantPanel` now derives planning state from read-only inspection plans and sends it with the next `/assistant/actions/plan` request.
- Server-side context normalization validates and clamps client-supplied planning state before planner use.
- Planner follow-up handling can resolve Polish candidate references such as `pierwszy` and `te dwa pierwsze` through the existing target resolver and typed action mapper.
- Added Vitest state normalization, planner follow-up, and UI interaction coverage.
