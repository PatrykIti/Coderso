# TASK-101-09-06-01: Review, Confirm UX, and Partial Success States
# FileName: TASK-101-09-06-01_Review_Confirm_UX_and_Partial_Success_States.md

**Priority:** High  
**Category:** Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-09-06  
**Status:** Done (2026-04-11)

---

## Overview

Assistant UI musi pozwalac userowi:
- zobaczyc plan,
- edytowac assumptions,
- przejrzec dry-run diff,
- potwierdzic execute,
- zrozumiec partial success i failed items.

## Files to Change

- `core/admin/ui/assistant/AssistantPanel.tsx` (update, ~100-180 LOC)
- `core/admin/ui/assistant/components/ActionPlanReview.tsx` (new, ~180-280 LOC)
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx` (new, ~120-220 LOC)
- `tests/vitest/ui/assistant-action-review.test.tsx` (new, ~180-260 LOC)

## Pseudocode

```tsx
<ActionPlanReview
  plan={plan}
  dryRun={preview}
  onConfirm={executePlan}
  onAskFollowUp={sendAssistantMessage}
/>
```

## Sub-Tasks

1. Render plan cards and dry-run diff groups.
2. Render confirm/execute lifecycle.
3. Render partial success, warnings, and retry-safe result state.

## Testing Requirements

- Vitest UI for happy path.
- Vitest UI for conflict and partial success states.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`

## Completion Notes (2026-04-11)

- `ActionPlanReview` and `ActionExecutionResult` are implemented.
- Assistant panel interaction tests cover plan, dry-run, execute, and needs-input rendering.
