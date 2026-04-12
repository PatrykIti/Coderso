# TASK-174-01: Provenance Undo Manifest and Persistence
# FileName: TASK-174-01_Provenance_Undo_Manifest_and_Persistence.md

**Priority:** High  
**Category:** Assistant/Core + DB + Reliability  
**Estimated Effort:** Large  
**Dependencies:** TASK-174  
**Status:** To Do

---

## Overview

Add durable server-side provenance for assistant-created and assistant-mutated resources.

This leaf does not implement cleanup execution yet. It creates the contract and persistence layer that later cleanup plans will use.

## Sub-Tasks

No child task files.

## Architecture

Add an undo manifest item for each execution result item:
- assistant execution row id,
- action id and action type,
- operation (`create`, `update`, `noop`, `attach`, `patch`),
- resource type,
- resource id,
- resource key,
- readable label,
- `createdByAssistant`,
- undo strategy,
- dependency keys,
- before/after sanitized snapshots when needed,
- after-state fingerprint,
- public impact metadata,
- status (`available`, `blocked`, `already-undone`, `manual-only`).

The persisted manifest must be loaded by execution id, not rebuilt from a prompt.

## Pseudocode

```ts
const result = await executeAssistantAction(action);

const undoItem = createAssistantUndoItem({
  executionId,
  action,
  result,
  operation: result.operation,
  resource: result.resourceId ? await resolveResource(result) : null,
});

await saveAssistantUndoItems(executionId, sanitizeUndoItems([undoItem]));
```

## Files to Change

- `core/db/schema.ts`
- `core/db/migrations/*assistant_action_undo*.sql`
- `core/db/migrations/meta/*_snapshot.json`
- `core/db/migrations/meta/_journal.json`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionExecutionStore.ts`
- new `core/services/assistant/actionUndoManifest.ts`
- `core/services/assistant/actionExecutorService.ts`
- `tests/vitest/assistant/*undo*.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts`

## Security Contract

- Visibility: internal persistence only; no public endpoint.
- Auth model: inherited from assistant execute admin session.
- RBAC: provenance records are created only after route/domain execute permissions pass.
- CSRF: unchanged; execute endpoint remains CSRF-protected.
- Rate-limit bucket: unchanged `assistant`.
- Reject-unknown validation: undo manifest data is generated server-side; API clients cannot submit undo manifest rows.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/HMAC/reCAPTCHA path,
  - manifest persistence must reject unrecognized resource types/strategies internally.
- Idempotency: repeated execute replay must not duplicate undo items.
- Secret handling: sanitize snapshots and metadata before persistence; never store raw form submissions, provider credentials, cookies, CSRF tokens, API keys, or secret-like settings.

## Testing Requirements

- Vitest:
  - normalize undo item resource types and strategies,
  - redact secret-like metadata,
  - compute stable fingerprints.
- Bun:
  - assistant execution persists undo items for create/update/patch/attach cases,
  - DB replay does not duplicate undo items,
  - persisted snapshots are sanitized,
  - migration metadata is present and journaled.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Every successful assistant execute result can be associated with persisted undo manifest items.
2. Undo manifest persistence is idempotent for replayed executions.
3. Snapshots/fingerprints are sufficient for later safety checks.
4. DB migration artifacts are complete: SQL migration, snapshot, and journal update.
