# TASK-174-05: Site-Kit Rollback Bridge
# FileName: TASK-174-05_Site_Kit_Rollback_Bridge.md

**Priority:** High  
**Category:** Assistant/Core + Solution Kits  
**Estimated Effort:** Medium  
**Dependencies:** TASK-174-01, TASK-174-02  
**Status:** To Do

---

## Overview

Connect assistant cleanup to the existing solution-kit rollback system for `site-kit.install` actions.

This task must reuse the solution-kit installer rollback contract instead of duplicating rollback logic in assistant code.

## Sub-Tasks

No child task files.

## Architecture

When an assistant execution result contains `results[].details.siteKit.execution`:
- persist the solution-kit install run id in the assistant undo manifest,
- mark the undo strategy as `rollback-site-kit`,
- dry-run cleanup shows the solution-kit rollback preview,
- execute cleanup delegates to `POST /solution-kits/:id/rollback` equivalent service behavior or the underlying domain service,
- cleanup result stores rollback item statuses.

## Pseudocode

```ts
const siteKitUndo = createSiteKitUndoItem({
  assistantExecutionId,
  solutionKitRunId: result.details.siteKit.execution.runId,
});

const rollback = await rollbackSolutionKitRun({
  runId: siteKitUndo.solutionKitRunId,
  actorId,
  idempotencyKey,
});
```

## Files to Change

- `core/services/assistant/actionUndoManifest.ts`
- `core/services/assistant/actionUndoPlanner.ts`
- `core/services/assistant/actionUndoExecutor.ts`
- `core/services/assistant/siteBuilderExecutor.ts` only if run metadata must be exposed more explicitly
- `core/services/kits/solutionKitsInstallService.ts` only if a service-level rollback helper needs to be exported
- `tests/unit/assistant/actionExecutorService.test.ts`
- `tests/unit/assistant/actionUndoExecutor.test.ts`
- `tests/integration/routes/assistant.test.ts`

## Security Contract

- Visibility: internal assistant cleanup execute flow; underlying solution-kit rollback remains admin-only.
- Auth model: existing admin session.
- RBAC: requires `solution-kits:write` for execute cleanup and `solution-kits:read` for dry-run preview.
- CSRF: execute route remains CSRF-protected.
- Rate-limit bucket: `assistant`; existing solution-kit route limits remain unchanged.
- Reject-unknown validation: clients may pass only persisted assistant execution/undo item references, not arbitrary solution-kit run ids.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/HMAC/reCAPTCHA path,
  - cannot rollback a solution-kit run that is not linked to the selected assistant execution manifest.
- Idempotency: cleanup execute must pass a stable idempotency key to assistant cleanup; solution-kit rollback idempotency must remain deterministic.
- Secret handling: solution-kit rollback metadata must remain redacted and must not expose integration credentials.

## Testing Requirements

- Bun:
  - dry-run shows site-kit rollback impact,
  - execute delegates to solution-kit rollback,
  - arbitrary/unlinked solution-kit run ids are rejected,
  - rollback replay is idempotent,
  - route permissions include `solution-kits:write`.
- Vitest:
  - pure manifest/preview helper tests if extracted.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. Assistant cleanup can roll back assistant-triggered site-kit installs through the existing rollback contract.
2. The assistant cannot rollback arbitrary solution-kit runs by client-supplied id.
3. Rollback preview and execution results appear in assistant cleanup review/result payloads.
