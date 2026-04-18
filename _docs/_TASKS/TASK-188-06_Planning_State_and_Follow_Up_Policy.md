# TASK-188-06: Planning State and Follow-Up Policy
# FileName: TASK-188-06_Planning_State_and_Follow_Up_Policy.md

**Priority:** High
**Category:** Assistant/Core + Conversation State
**Estimated Effort:** Medium
**Dependencies:** TASK-188-01, TASK-188-04, TASK-188-05
**Status:** To Do

---

## Overview

Move follow-up pronouns, count words, candidate selection, and route-binding behavior into policy-driven planning state rules.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. `je`, `te`, `tych`, `oba`, `pierwszy`, `dwom`, etc. are policy entries.
2. Follow-up target selection is resource-agnostic.
3. Empty prior query with multiple candidates targets exact prior candidates.
4. Stale/expired planning state stays rejected.

## Files to Change

- `core/services/assistant/operationPolicy/followUpPolicy.ts` (new)
- `core/services/assistant/cmsPlanningState.ts`
- `tests/vitest/assistant/cms-planning-state.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Pseudocode

```ts
export function buildDraftFromFollowUp({ prompt, state, policy }) {
  const followUp = resolveFollowUpIntent(prompt, policy.followUp);
  if (!followUp) return null;
  const selected = selectCandidates(state.candidates, followUp.selection);
  return buildDraftForSelectedCandidates({
    operation: followUp.operation,
    resourceKind: state.resourceKind,
    selected,
    query: state.query,
  });
}
```

## Remove or Delegate

- `countWords`,
- `hasFollowUpSignal`,
- local pronoun list,
- local operation signal list,
- first-label prefix fallback logic.

## Security Contract

- Visibility: internal assistant planning state.
- Auth model: existing admin session.
- RBAC: candidate ids remain advisory and are re-resolved.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: planning state schema remains strict.
- Anti-abuse: destructive follow-ups still require review/dry-run.
- Secret handling: no secrets in planning state.

## Testing Requirements

- Port planning state tests to policy-driven rules.
- UI interaction tests remain green.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- changelog on completion
