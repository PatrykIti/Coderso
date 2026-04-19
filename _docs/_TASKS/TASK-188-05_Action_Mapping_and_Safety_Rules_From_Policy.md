# TASK-188-05: Action Mapping and Safety Rules From Policy
# FileName: TASK-188-05_Action_Mapping_and_Safety_Rules_From_Policy.md

**Priority:** High
**Category:** Assistant/Core + Action Mapping + Safety
**Estimated Effort:** Large
**Dependencies:** TASK-188-01, TASK-188-02, TASK-188-04
**Status:** Done (2026-04-19)

---

## Overview

Move action mapping and destructive/bulk safety rules into the policy engine.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. `cmsOperationActionMapper` uses policy field/action mapping where possible.
2. Destructive rules such as `allowAllWhenFiltered`, `requireExpectedCount`, and `denyAllUnfiltered` are policy-driven.
3. Provider post-validation guards are represented as policy safety checks.
4. Existing strict action schemas remain the final action validator.

## Files to Change

- `core/services/assistant/operationPolicy/actionMappingPolicy.ts` (new)
- `core/services/assistant/operationPolicy/safetyPolicy.ts` (new)
- `core/services/assistant/cmsOperationActionMapper.ts`
- `core/services/assistant/actionPlannerService.ts`
- `tests/vitest/assistant/cms-operation-action-mapper.test.ts`
- `tests/vitest/assistant/operation-policy-safety.test.ts`

## Pseudocode

```ts
export function evaluateSafety({ prompt, operation, targets, resourcePolicy }) {
  if (operation.destructive && !resourcePolicy.destructive) return deny("unsupported_destructive");
  if (isAllUnfiltered(prompt) && !resourcePolicy.destructive.allowAllUnfiltered) return deny("broad_destructive");
  if (expectedCount && expectedCount !== targets.length) return deny("count_mismatch");
  if (targets.length > 1 && !expectedCount && !isFilteredAll(prompt)) return deny("ambiguous");
  return allow();
}

export function mapPolicyAction({ operation, target, field, resourcePolicy }) {
  const action = resourcePolicy.actions[operation.type];
  return action.builder({ target, field, value: operation.value });
}
```

## Remove or Delegate

- `buildActionForExactTarget` branching where policy can own mapping,
- duplicate multi-action branches,
- `isProviderBroadDestructivePrompt`,
- `hasProviderPromptImpliedFieldMismatch`,
- other provider post-validation guards expressible in policy.

## Security Contract

- Visibility: internal action planning.
- Auth model: no runtime change.
- RBAC: route/domain permissions remain authoritative.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: no untyped actions.
- Anti-abuse: destructive rules deny by default.
- Secret handling: no secret values in action preview/diff metadata.

## Testing Requirements

- Mapper tests for all current executable resource families.
- Safety tests for broad delete, count mismatch, filtered all, read-only status questions.
- Live matrix remains green.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/CMS_API.md`
- changelog on completion

## Completion Notes (2026-04-19)

- Added `operationPolicy/actionMappingPolicy.ts` for executable action lookup and policy field intent resolution.
- Added `operationPolicy/safetyPolicy.ts` for broad destructive detection, explicit count extraction, destructive count mismatch, field-mismatch provider guards, counted multi-target allowance, and filtered-all destructive allowance.
- Updated `cmsOperationActionMapper.ts` to check policy executable actions before returning typed actions and to resolve update patch fields through policy metadata.
- Updated provider post-validation guards in `actionPlannerService.ts` to use policy safety helpers instead of local broad/count/field heuristics.
- Kept strict action schemas as the final action validator.

## Validation (2026-04-19)

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
