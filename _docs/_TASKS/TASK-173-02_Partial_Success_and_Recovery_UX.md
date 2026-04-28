# TASK-173-02: Partial Success and Recovery UX
# FileName: TASK-173-02_Partial_Success_and_Recovery_UX.md

**Priority:** Medium  
**Category:** Admin/UI + Assistant Recovery  
**Estimated Effort:** Medium  
**Dependencies:** TASK-173-01, TASK-170-04  
**Status:** Done (2026-04-12)

---

## Overview

Improve assistant execution result UX for partial success, failed actions, retry guidance, and safe next steps.

## Sub-Tasks

No child task files.

## Pseudocode

```tsx
if (summary.failed > 0) {
  return <RecoveryPanel failed={failedResults} successful={successfulResults} />;
}

return <SuccessLinks results={successfulResults} />;
```

## Files to Change

- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx` if retry previews are shown
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`

## Security Contract

- Visibility: admin UI only.
- Auth model: existing admin session.
- RBAC: UI recovery does not grant permissions; retry must call server again.
- CSRF: unchanged for retry/execute calls.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: UI must handle unknown failed result details safely.
- Anti-abuse: no public write path.
- Idempotency: retry guidance must require a new idempotency key unless server replay is intended.
- Secret handling: failure details must be redacted before rendering.

## Testing Requirements

- Vitest:
  - partial success renders successful links and failed reasons,
  - retry guidance is visible but not auto-executed,
  - secret-like failed details are not rendered.
- Bun:
  - route/executor tests only if result shape changes.

## Documentation Updates Required

- relevant `docs/` assistant guidance if UX copy changes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Partial success state is clear to non-technical users.
2. Failed actions are not silently hidden.
3. Retry paths remain explicit and idempotency-safe.

## Completion Notes (2026-04-12)

- Added a partial-failure recovery alert to `ActionExecutionResult`.
- The alert summarizes succeeded/failed actions, lists failed action labels/error codes/messages, and instructs users to run a fresh dry-run before retrying.
- No automatic retry button was added; retry remains explicit and goes through the existing dry-run/confirm/execute flow.
- Added Vitest coverage for mixed success/failure rendering and recovery guidance.
