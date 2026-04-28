# TASK-174-06-01: Resource Operation Review UI States
# FileName: TASK-174-06-01_Resource_Operation_Review_UI_States.md

**Priority:** High
**Category:** Assistant/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-174-06
**Status:** Done (2026-04-14)

---

## Overview

Update plan/result UI states for edit, delete, archive, detach, restore, and blocked resource operations.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`

## Security Contract

- Visibility: admin UI only.
- Auth model: existing admin session.
- RBAC: UI reflects backend decisions only.
- CSRF: execute continues using existing CSRF flow.
- Rate-limit bucket: backend remains `assistant`.
- Reject-unknown validation: UI sends typed plan/execute payloads only.
- Anti-abuse: destructive operations require preview and explicit execute confirmation.
- Idempotency: UI sends idempotency keys for execute.
- Secret handling: no raw snapshots/secrets displayed.

## Testing Requirements

- Vitest:
  - operation badges render correctly,
  - destructive warning renders,
  - partial result counts render,
  - blocked/conflict copy is visible.
- Bun:
  - none unless API contract changes.

## Documentation Updates Required

- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. UI distinguishes setup/create from resource edit/delete operations.
2. Destructive operations are visibly review-gated.
3. Partial results do not hide blocked/failed items.

## Progress Notes

- 2026-04-14: Completed resource operation review UI states. Review cards now show operation badges for create/update/delete/archive/detach/restore/blocked, destructive warning copy, preview warnings, blocked conflict state, and neutral `Execute reviewed actions` wording. Execution results now show action-oriented summaries, archive/detach/restore counts, failed counts, and secret-like dynamic text redaction.
- 2026-04-14: Validation passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx`
