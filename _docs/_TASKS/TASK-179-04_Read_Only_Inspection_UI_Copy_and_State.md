# TASK-179-04: Read-Only Inspection UI Copy and State
# FileName: TASK-179-04_Read_Only_Inspection_UI_Copy_and_State.md

**Priority:** High
**Category:** Admin/UI + Assistant UX
**Estimated Effort:** Medium
**Dependencies:** TASK-179-03, TASK-178-04
**Status:** To Do

---

## Overview

Make read-only inspection look like inspection, not an executable plan.

Current copy can show:

- `LLM Guide Plan`
- `Planned actions`
- `No changes are planned for this response.`

For a read-only result, this should become:

- `LLM Guide Inspection`
- `Read-only`
- candidate list,
- no planned actions section.

## Sub-Tasks

No child task files.

## Architecture

`ActionPlanReview` should branch by `responseKind`:

- `inspection`: inspection card, read-only badge, candidate list, no action section.
- `needs_input`: clarification card with disabled action controls if it is mutation-oriented.
- `action_plan`: existing action review.
- `docs`: rendered by `AssistantPanel` as message.
- `gated`: blocked/gated card.

## Integration with Current Code

- Keep `ActionPlanReview.tsx` as the shared component.
- Do not add a separate preview/result component.
- Preserve existing destructive/blocked action plan states.
- Keep `AssistantPanel` state model unchanged unless needed for response kind.

## Files to Change

- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx` only if needed
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`

## Acceptance Criteria

1. Inspection plans show `LLM Guide Inspection`, not `LLM Guide Plan`.
2. Inspection plans show `Read-only`.
3. Inspection plans do not render `Planned actions`.
4. Needs-input/action-plan existing behavior remains unchanged.
5. Screen-reader/text content remains stable for tests.

## Security Contract

- Visibility: admin UI only.
- Auth model: existing admin session.
- RBAC: UI copy does not grant permissions.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: UI only renders server-validated plan objects.
- Anti-abuse: read-only UI cannot trigger execute.
- Secret handling: existing UI redaction remains active.

## Testing Requirements

- Vitest UI tests for inspection, needs-input, action plan, blocked/destructive states.
- Interaction test for natural prompt inspection result.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- task/changelog entries on completion
