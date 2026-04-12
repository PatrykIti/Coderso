# TASK-174-02: Cleanup Dry-Run Planner and Dependency Order
# FileName: TASK-174-02_Cleanup_Dry_Run_Planner_and_Dependency_Order.md

**Priority:** High  
**Category:** Assistant/Core + Reliability  
**Estimated Effort:** Large  
**Dependencies:** TASK-174-01  
**Status:** To Do

---

## Overview

Implement cleanup dry-run planning from persisted assistant undo manifest items.

This leaf must only produce a plan and preview. It must not execute cleanup mutations yet.

## Sub-Tasks

No child task files.

## Architecture

The planner must:
- load undo items by assistant execution id,
- reject client-supplied resource maps,
- verify actor/permissions at route boundary,
- load current resource state,
- compare current fingerprints to persisted `afterFingerprint`,
- order cleanup from leaf resources to parent resources,
- mark unsafe items as conflicts,
- return a preview compatible with existing assistant review UI patterns.

Dependency order examples:
- page widgets/form embeds before page delete when represented as patch items,
- menu/SEO/media references before entry/page/content parents,
- page/listing query/listing template/custom screen before content type,
- form automation before form archive/delete,
- site-kit rollback as its own bridge action.

## Pseudocode

```ts
const undoItems = await listUndoItems({ executionId });
const currentState = await loadUndoCurrentState(undoItems);

const plan = createAssistantCleanupPlan({
  executionId,
  undoItems,
  currentState,
  selectedUndoItemIds,
});

return {
  readyToExecute: plan.conflicts.every((conflict) => !conflict.blocking),
  changes: orderCleanupChanges(plan.changes),
  conflicts: plan.conflicts,
};
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- new `core/services/assistant/actionUndoPlanner.ts`
- new `core/services/assistant/actionUndoStateLoader.ts`
- `core/server/routes/assistantRoutes.ts`
- `tests/vitest/assistant/*undo-planner*.test.ts`
- `tests/integration/routes/assistant.test.ts`

## Security Contract

- Visibility: internal dry-run under `/admin/api/assistant/actions/dry-run` or a narrowly scoped internal assistant cleanup route.
- Auth model: existing admin session.
- RBAC: dry-run requires read permissions for every resource family in the cleanup plan.
- CSRF: all POST dry-run routes require CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation:
  - reject unknown plan fields,
  - reject client-supplied resource IDs that do not map to persisted undo item ids,
  - reject raw resource snapshots from clients.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/HMAC/reCAPTCHA path,
  - cleanup plan cannot target resources outside the selected execution manifest.
- Idempotency: dry-run is read-only and does not require a new idempotency key.
- Secret handling: preview output must redact snapshots and secret-like metadata.

## Testing Requirements

- Vitest:
  - dependency ordering,
  - fingerprint mismatch conflicts,
  - public-impact warnings,
  - selection of a subset of undo items by persisted undo item ids.
- Bun:
  - route validation rejects unknown fields,
  - route validation rejects client-supplied resource maps,
  - route permission checks include per-resource read permissions.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Cleanup dry-run can be generated from persisted undo manifest items.
2. The plan is ordered so child/dependent resources are cleaned before parents.
3. Unsafe items return blocking conflicts instead of executable cleanup changes.
4. No client-supplied resource IDs or snapshots are trusted.
