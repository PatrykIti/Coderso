# TASK-170-02: Registry, Diff, and Preview Metadata Expansion
# FileName: TASK-170-02_Registry_Diff_and_Preview_Metadata_Expansion.md

**Priority:** High  
**Category:** Core/Assistant + Preview Contracts  
**Estimated Effort:** Medium  
**Dependencies:** TASK-170-01  
**Status:** Done (2026-04-12)

---

## Overview

Extend the formal assistant action registry and dry-run preview model so new action families expose useful conflicts, dependencies, warnings, and noop behavior before execution.

## Sub-Tasks

No child task files yet. Split later if diff logic diverges heavily by resource family.

## Pseudocode

```ts
const handler = getAssistantActionHandler(registry, action.type);
const current = await handler.loadCurrent(action.input);
const preview = handler.preview(action.input, current);

return createPreviewChange({
  actionId: action.id,
  type: action.type,
  operation: preview.operation,
  dependencies: preview.dependencies,
  conflicts: preview.conflicts,
  warnings: preview.warnings,
});
```

## Files to Change

- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionDiffService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `tests/vitest/assistant/action-registry.test.ts`
- `tests/vitest/assistant/action-diff-service.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal dry-run only through `/admin/api/assistant/actions/dry-run`.
- Auth model: admin session.
- RBAC: dry-run must keep read permissions for every resource it inspects.
- CSRF: existing POST CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: registry rejects unsupported action types before preview.
- Anti-abuse: no public write path.
- Idempotency: dry-run is read-only and does not persist idempotency.
- Secret handling: preview metadata must redact secrets and raw sensitive values.

## Testing Requirements

- Vitest:
  - registry requires handlers for every supported action type,
  - preview helpers preserve `conflicts[]` and `dependencies[]`,
  - secret-like metadata is redacted or rejected.
- Bun:
  - executor dry-run regression for action families whose current-state lookup imports DB/runtime services.

## Documentation Updates Required

- `_docs/CMS_API.md` if preview response examples change.
- `_docs/ARCHITECTURE.md` if registry handler ownership changes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Every new action family has preview metadata before execute support ships.
2. Conflicts and dependencies are machine-readable.
3. Preview never writes or exposes secrets.

## Completion Notes (2026-04-12)

- Added centralized preview metadata normalization/redaction in `actionDiffService`.
- Added `createContractOnlyActionPreviewMetadata` so contract-only action families can surface machine-readable `assistant_action_contract_only` conflicts and permission dependencies before execute adapters land.
- Revalidated existing Bun executor dry-run behavior and expanded Vitest coverage for secret-like metadata redaction.
