# TASK-171-04: Plan Confidence, Assumptions, and UX Explanation
# FileName: TASK-171-04_Plan_Confidence_Assumptions_and_UX_Explanation.md

**Priority:** Medium  
**Category:** Assistant/Product + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-171-03  
**Status:** To Do

---

## Overview

Expose provider/local planner confidence, assumptions, and limitations in the existing action review UX so users understand what will happen before confirming.

## Sub-Tasks

No child task files.

## Pseudocode

```tsx
<ActionPlanReview
  title={plan.title}
  confidence={plan.confidence}
  assumptions={plan.assumptions}
  questions={plan.questions}
  providerDraftUsed={plan.metadata?.providerDraftUsed}
/>
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts` if metadata shape changes
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`

## Security Contract

- Visibility: admin UI only.
- Auth model: existing admin session.
- RBAC: UI explanation is not authorization.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: UI accepts only server-normalized plan shape.
- Anti-abuse: no public write path.
- Idempotency: unchanged.
- Secret handling: assumptions/explanations must not include raw provider prompt, provider response, or secret-like context.

## Testing Requirements

- Vitest:
  - assumptions render,
  - confidence renders without implying guaranteed success,
  - `needs_input` questions remain visible and non-executable.
- Bun:
  - not required for UI-only changes.

## Documentation Updates Required

- Relevant `docs/` assistant guidance if user-facing behavior changes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Review UI distinguishes ready plans from question/fallback plans.
2. Provider-assisted assumptions are visible but redacted.
3. User still must confirm before execute.
