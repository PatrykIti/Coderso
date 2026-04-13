# TASK-174-06: Admin Resource Operations Review UI
# FileName: TASK-174-06_Admin_Resource_Operations_Review_UI.md

**Priority:** High
**Category:** Admin/UI + Assistant
**Estimated Effort:** Large
**Dependencies:** TASK-174-02, TASK-174-03, TASK-174-04, TASK-174-05
**Status:** To Do

---

## Overview

Update the assistant review UI so edit/delete/cleanup plans are first-class, not setup-only.

The UI must show target resources, operation type, before/after intent, public/data-loss warnings, blocked items, and partial execution results.

## Sub-Tasks

- `TASK-174-06-01_Resource_Operation_Review_UI_States.md`

## Architecture

UI surfaces:
- active context summary: "You are on Pages > Contact" / "Widget template: Hero Landing",
- plan review cards for `create`, `update`, `delete`, `archive`, `detach`, `restore`,
- destructive-operation warnings,
- target ambiguity prompts,
- execute confirmation for all mutations,
- partial result counts for `created`, `updated`, `deleted`, `archived`, `detached`, `restored`, `blocked`, `failed`.

## Pseudocode

```tsx
<ActionPlanReview
  activeContext={activeContextSummary}
  plan={plan}
  preview={preview}
  destructive={preview.changes.some((change) => change.operation === "delete")}
/>
```

## Files to Change

- `core/admin/services/assistantClient.ts`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- optional new operation-specific UI components
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`

## Security Contract

- Visibility: admin UI only.
- Auth model: existing admin session.
- RBAC: UI only reflects backend permission decisions; it must not infer permission grants.
- CSRF: execute uses the existing assistant client CSRF flow.
- Rate-limit bucket: backend routes remain `assistant`.
- Reject-unknown validation: UI sends typed plan/execute payloads only.
- Anti-abuse:
  - no autonomous cleanup/delete/edit,
  - no one-click destructive execution without preview,
  - no raw resource maps assembled client-side.
- Idempotency: UI sends fresh idempotency keys for execute.
- Secret handling: UI must not render raw snapshots, submissions, cookies, CSRF tokens, provider metadata, or secret-like values.

## Testing Requirements

- Vitest:
  - delete/edit operation badges,
  - active-context summary,
  - destructive warning rendering,
  - partial result rendering,
  - no secret-like metadata rendering.
- Bun:
  - no Bun tests unless route/client contracts change.

## Documentation Updates Required

- relevant `docs/` assistant/admin corpus pages if copy changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Admin users can review edit/delete/resource-operation impact before execute.
2. UI treats destructive operations as explicit reviewed mutations.
3. Partial results are clear and do not hide blocked/failed work.
4. UI remains redacted and permission-safe.
