# TASK-174-03-01: Custom Screen Delete Action
# FileName: TASK-174-03-01_Custom_Screen_Delete_Action.md

**Priority:** High
**Category:** Assistant/Core + Custom Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-174-01, TASK-174-03
**Status:** Done (2026-04-12)

---

## Overview

Add the first executable delete adapter for `LLM Guide`: `custom-screen.delete`.

The action is intended for explicit custom screen deletion requests such as deleting screens whose names match a clear prefix. Planning must resolve target screens from the server-side resource catalog and execution must re-check the target id/name before deleting.

## Sub-Tasks

No child task files.

## Architecture

- `custom-screen.delete` is a strict typed action.
- Planner support is limited to custom screens from `context.resourceCatalog.customScreens`.
- If a prefix matches a different count than requested, the planner returns `needs_input`.
- Dry-run returns a `delete` operation and shows sidebar visibility warnings.
- Execute calls the existing `deleteCustomScreen` domain service.
- Execute revalidates id, expected name, and expected prefix before mutation.

## Pseudocode

```ts
const matches = resourceCatalog.customScreens.filter((screen) =>
  screen.name.toLowerCase().startsWith(prefix.toLowerCase())
);

if (requestedCount !== null && matches.length !== requestedCount) {
  return needsInput();
}

return matches.map((screen) => ({
  type: "custom-screen.delete",
  input: { id: screen.id, name: screen.name, expectedNamePrefix: prefix },
}));
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionPlanHeuristics.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionDiffService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/admin/ui/assistant/AssistantPanel.tsx`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`
- `core/admin/ui/assistant/components/ActionExecutionResult.tsx`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/vitest/assistant/action-registry.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal-only through existing `/admin/api/assistant/actions/*`.
- Auth model: existing admin session.
- RBAC:
  - plan/dry-run requires `content:read`,
  - execute requires `content:write`.
- CSRF: existing assistant action POST endpoints remain CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict `custom-screen.delete` schema rejects unknown fields.
- Anti-abuse:
  - no public write endpoint,
  - no nonce/HMAC/reCAPTCHA path,
  - planner targets only server-side resource catalog screen ids,
  - executor rechecks id/name/prefix before deletion.
- Idempotency: existing assistant execute idempotency applies.
- Secret handling: no secret-bearing payload is added.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest:
  - planner resolves prefix-matched custom screen delete actions,
  - registry includes `custom-screen.delete`,
  - strict schema still rejects invalid actions.
- Bun:
  - executor dry-runs and deletes a selected custom screen through `deleteCustomScreen`,
  - route permission smoke stays green.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry.

## Acceptance Criteria

1. The prompt "delete two custom screens with prefix House Projects" can produce a ready reviewed action plan when exactly two server-side catalog screens match.
2. Dry-run displays a `delete` operation.
3. Execute deletes through the existing custom screen domain service.
4. Mismatched id/name/prefix blocks execution with `assistant_action_dependency_missing`.

## Completion Notes (2026-04-12)

- Added `custom-screen.delete` as the first executable delete action.
- Added planner support for prefix-matched custom screen deletion from resource catalog context.
- Added dry-run and execute adapter coverage.
- Updated assistant UI labels and execution summary copy to include delete operations.
