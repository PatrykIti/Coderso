# TASK-170-04: Admin Review UI for Expanded Actions
# FileName: TASK-170-04_Admin_Review_UI_for_Expanded_Actions.md

**Priority:** Medium  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-02, TASK-170-03  
**Status:** To Do

---

## Overview

Update the assistant review/confirm UI so newly supported action families remain understandable without adding a second execution UI.

## Sub-Tasks

No child task files yet. Split by component only if `ActionPlanReview` or `ActionExecutionResult` needs deeper refactor.

## Pseudocode

```tsx
function ActionPlanReview({ plan, preview }) {
  return plan.actions.map((action) => (
    <ActionRow
      label={resolveActionLabel(action.type)}
      target={resolveActionTarget(action)}
      dependencies={preview.dependencies}
      conflicts={preview.conflicts}
      warnings={preview.warnings}
    />
  ));
}
```

## Files to Change

- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- `core/admin/services/assistantClient.ts` if response shape changes
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `tests/vitest/admin/assistantClient.test.ts`

## Security Contract

- Visibility: admin UI only; no new endpoint.
- Auth model: existing admin session.
- RBAC: UI must not infer permissions beyond server response; disabled/blocked states are display-only.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unknown action types render safe fallback labels and do not become executable.
- Anti-abuse: no public write path.
- Idempotency: UI must keep using server-required idempotency key for execute.
- Secret handling: UI must not render secret-like details from preview/result payloads.

## Testing Requirements

- Vitest:
  - renders new action labels/targets,
  - shows conflicts/dependencies/warnings,
  - handles partial failures and unknown display data safely.
- Bun:
  - not required for UI-only rendering.

## Documentation Updates Required

- Relevant `docs/` assistant user guidance if user-facing copy changes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. New action families are readable in plan review.
2. Conflicts and warnings are visible before confirm.
3. UI does not expose secrets or create a parallel execution surface.
