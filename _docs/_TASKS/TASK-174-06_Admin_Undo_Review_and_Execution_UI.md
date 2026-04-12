# TASK-174-06: Admin Undo Review and Execution UI
# FileName: TASK-174-06_Admin_Undo_Review_and_Execution_UI.md

**Priority:** High  
**Category:** Admin/UI + Assistant  
**Estimated Effort:** Large  
**Dependencies:** TASK-174-02, TASK-174-03, TASK-174-04, TASK-174-05  
**Status:** To Do

---

## Overview

Add an admin UI path for reviewing and executing assistant cleanup plans.

The UI must never auto-execute cleanup. It must show what will be removed/restored, what is blocked, and why.

## Sub-Tasks

No child task files.

## Architecture

UI surfaces:
- execution result shows created resources and cleanup availability,
- cleanup dry-run CTA opens/reuses the existing plan review surface,
- cleanup plan review lists each undo item,
- blocked items show machine-readable reason plus user-facing explanation,
- execute cleanup requires explicit confirmation and idempotency key,
- partial cleanup result shows `removed`, `restored`, `archived`, `detached`, `blocked`, and `failed` counts.

## Pseudocode

```tsx
if (execution.undo?.available) {
  return <Button onClick={() => dryRunCleanup(execution.id)}>Review cleanup</Button>;
}

return <UndoStatus conflicts={execution.undo?.conflicts ?? []} />;
```

## Files to Change

- `core/admin/services/assistantClient.ts`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- optional new `core/admin/ui/assistant/components/ActionUndoReview.tsx`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`

## Security Contract

- Visibility: admin UI only.
- Auth model: existing admin session.
- RBAC: UI only reflects backend permission decisions; it must not infer permission grants.
- CSRF: cleanup execute uses the existing assistant client CSRF flow.
- Rate-limit bucket: backend route remains `assistant`; UI must handle rate-limit errors.
- Reject-unknown validation: UI must not assemble raw resource maps; it passes execution/undo item identifiers expected by backend schemas.
- Anti-abuse:
  - no public write path,
  - no automatic retry or automatic cleanup,
  - user must explicitly confirm cleanup execute.
- Idempotency: UI must send a fresh idempotency key for cleanup execute and handle replay diagnostics.
- Secret handling: UI must not display raw snapshots, secret-like values, form submissions, cookies, CSRF tokens, or provider metadata.

## Testing Requirements

- Vitest:
  - execution result renders cleanup availability,
  - cleanup dry-run CTA calls the client with execution id only,
  - review renders delete/archive/detach/restore/blocked item states,
  - execute cleanup requires explicit click,
  - partial cleanup results render blocked/failed reasons,
  - secret-like metadata is not rendered.
- Bun:
  - no Bun tests unless client/route contract changes require route smoke coverage in this leaf.

## Documentation Updates Required

- relevant `docs/` assistant/admin corpus pages if user-facing copy changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Admin users can review cleanup impact before executing.
2. UI does not allow autonomous cleanup without confirmation.
3. Blocked cleanup items are understandable and do not hide partial failure.
4. UI does not leak sensitive snapshot data.
