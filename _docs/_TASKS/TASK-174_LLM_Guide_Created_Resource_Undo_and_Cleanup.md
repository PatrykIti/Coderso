# TASK-174: LLM Guide Created Resource Undo and Cleanup
# FileName: TASK-174_LLM_Guide_Created_Resource_Undo_and_Cleanup.md

**Priority:** High  
**Category:** Assistant/Core + Reliability + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-170, TASK-172, TASK-173  
**Status:** In Progress (2026-04-12)

---

## Overview

Give `LLM Guide` a safe, auditable way to remove or undo resources that the assistant created.

This is not a generic "delete anything by prompt" capability. The contract is:
- the assistant records server-side provenance for every executed action result,
- cleanup is scoped to a specific assistant execution/run,
- dry-run shows the exact resources and risks before mutation,
- execute can remove created resources or reverse safe patches only when current state still matches the recorded assistant-owned state,
- unsafe cleanup returns machine-readable conflicts instead of guessing.

The product goal is that a user can say "remove what you created" and the system can produce a reliable cleanup plan for that assistant run.

## Sub-Tasks

- `TASK-174-01_Provenance_Undo_Manifest_and_Persistence.md`
- `TASK-174-02_Cleanup_Dry_Run_Planner_and_Dependency_Order.md`
- `TASK-174-03_Create_Resource_Delete_Adapters.md`
- `TASK-174-04_Inverse_Patch_and_Attach_Adapters.md`
- `TASK-174-05_Site_Kit_Rollback_Bridge.md`
- `TASK-174-06_Admin_Undo_Review_and_Execution_UI.md`
- `TASK-174-07_Security_Gates_Docs_and_Closure.md`

## Architecture

Core model:
- every successful execute result gets undo provenance items,
- each item identifies the resource, operation, ownership, fingerprint, dependencies, and undo strategy,
- cleanup plans are built from persisted server-side provenance, not from client-supplied resource IDs,
- cleanup execution revalidates current resource state before deletion or restoration,
- partial cleanup is allowed only when each item reports a clear status.

Undo strategy vocabulary:
- `delete`: remove an assistant-created resource that has no unsafe external dependency,
- `archive`: change status instead of hard deleting when data retention matters,
- `detach`: remove an assistant-created reference without deleting the referenced asset,
- `restore-snapshot`: restore a previous resource snapshot for assistant-updated resources,
- `restore-tree`: restore structured tree data such as menu items,
- `rollback-site-kit`: delegate to the existing solution-kit rollback path,
- `blocked`: show a conflict and require manual handling.

Initial supported resource groups:
- content type,
- custom screen,
- listing query,
- listing template,
- page,
- form,
- entry draft,
- menu item,
- SEO document,
- media reference,
- page widget block,
- form automation action,
- site-kit execution.

## Pseudocode

```ts
const execution = await getAssistantExecution(executionId);
const undoItems = await listUndoItemsForExecution(execution.id);

const plan = buildUndoPlan({
  execution,
  undoItems,
  currentState: await loadCurrentResourceState(undoItems),
});

if (plan.conflicts.some((conflict) => conflict.severity === "blocking")) {
  return { readyToExecute: false, conflicts: plan.conflicts };
}

await executeUndoPlan({
  plan,
  idempotencyKey,
  actorId,
});
```

## Files to Change

- `core/db/schema.ts`
- `core/db/migrations/*`
- `core/db/migrations/meta/*_snapshot.json`
- `core/db/migrations/meta/_journal.json`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutionStore.ts`
- `core/services/assistant/actionExecutorService.ts`
- new `core/services/assistant/actionUndo*` modules as needed
- `core/server/routes/assistantRoutes.ts`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/services/assistantClient.ts`
- relevant existing domain services; do not bypass them with assistant-only direct DB writes

## Security Contract

- Visibility: internal-only admin endpoints under `/admin/api/assistant/actions/*`.
- Auth model: existing admin session.
- RBAC:
  - dry-run cleanup requires the read permissions for all resources in the persisted undo plan,
  - execute cleanup requires the write/delete equivalent permissions for every item,
  - site-kit cleanup requires `solution-kits:write`.
- CSRF: all POST cleanup routes and execute calls require existing admin CSRF handling.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict cleanup action schemas; reject unknown fields and client-supplied resource maps.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/HMAC/reCAPTCHA path because this remains internal admin-only,
  - cleanup can only target persisted assistant-owned undo items for the selected execution.
- Idempotency:
  - execute cleanup requires `idempotencyKey`,
  - replay/conflict semantics remain actor/plan/hash scoped,
  - cleanup execution must be replay-safe.
- Secret handling:
  - persisted undo metadata must not store provider keys, session data, CSRF tokens, form submissions, API keys, or unredacted secret-like settings,
  - snapshots must be sanitized before persistence and API/UI response.

## Implementation Order

1. Persist undo provenance and fingerprints for existing execute results.
2. Build cleanup dry-run planner and dependency ordering.
3. Add delete/archive adapters for resources that the assistant creates.
4. Add inverse adapters for references and patches.
5. Bridge site-kit cleanup to existing rollback.
6. Add admin review/execute UI.
7. Revalidate security/performance/docs and close the wave.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - undo manifest normalizers,
  - strict schema rejection,
  - cleanup dependency ordering,
  - assistant UI review/partial cleanup states.
- Bun:
  - executor cleanup adapters,
  - route registration and `map*Error` coverage,
  - DB-backed provenance persistence,
  - idempotent cleanup replay/conflict,
  - security and performance gates for assistant action routes.
- DB-backed tests must load env first:
  - `set -a && source .env && set +a && bun test ...`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- relevant `docs/` assistant corpus pages
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and a changelog entry for each completed leaf

## Acceptance Criteria

1. The assistant can produce a cleanup dry-run for resources created by a specific assistant execution.
2. Cleanup execute can remove or reverse supported assistant-owned resources without accepting arbitrary client-supplied resource IDs.
3. Unsafe cleanup states are blocked with machine-readable conflicts and clear UI copy.
4. Cleanup is idempotent, audited, rate-limited, CSRF-protected, and permission-checked per resource.
5. Existing domain services own resource deletion/restoration behavior; no assistant-only direct DB write bypass is introduced.

## Progress Notes

- 2026-04-12: Completed `TASK-174-01`; fresh assistant action executions now persist sanitized undo manifest items for later cleanup planning.
- 2026-04-12: Completed `TASK-174-03-01`; custom screen delete requests can now produce executable reviewed `custom-screen.delete` plans when targets are resolved from server-side resource catalog context.
