# TASK-188-09: Policy Engine Cutover and Heuristic Removal
# FileName: TASK-188-09_Policy_Engine_Cutover_and_Heuristic_Removal.md

**Priority:** High
**Category:** Assistant/Core + Refactor
**Estimated Effort:** Large
**Dependencies:** TASK-188-03, TASK-188-04, TASK-188-05, TASK-188-06, TASK-188-07
**Status:** To Do

---

## Overview

Cut over planner/resolver/mapper to the policy engine and remove duplicated ad hoc heuristics.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. Current live matrix remains green.
2. Removed duplicate alias/filter/field lists from old modules.
3. Provider prompt, resolver, mapper, and coverage docs use policy as source of truth.
4. No behavior regression for TASK-184/TASK-185/TASK-186/TASK-187 cases.

## Files to Remove or Reduce

Candidates for deletion or thin re-export after cutover:

- `core/services/assistant/cmsResourceRegistry.ts`
  - Delete if all consumers use policy lookup.
  - Or keep as compatibility re-export from `operationPolicy`.

Functions/lists to remove or delegate:

- `cmsTargetResolver.ts`
  - signal arrays,
  - filter-specific branches,
  - surface-only hard-coded word lists.
- `cmsOperationActionMapper.ts`
  - hard-coded action builder branching where policy owns mapping.
- `cmsPlanningState.ts`
  - pronoun/count lists.
- `actionPlannerService.ts`
  - provider preferred local guards that policy can express,
  - post/media/settings hard-coded gated checks,
  - listing layout/limit post-validation guards.

## Cutover Pseudocode

```ts
const policy = assistantOperationPolicy;
const draft = normalizeDraftWithPolicy(rawDraft, policy);
const targetResolution = resolveTargetsWithPolicy(draft, context, policy);
const safety = evaluateSafetyWithPolicy(draft, targetResolution, policy);
if (!safety.ok) return buildNeedsInputFromPolicy(safety);
const actions = mapActionsWithPolicy(draft, targetResolution, policy);
return normalizeAssistantActionPlan({ ...basePlan, actions });
```

## Migration Guardrails

- Keep old and new paths side-by-side behind a test-only flag if needed.
- Remove test flag before closing.
- Do not change route contracts.
- Do not change action schemas unless a leaf explicitly requires it.

## Security Contract

- Visibility: internal assistant core.
- Auth model: no runtime change.
- RBAC: no weakening.
- CSRF: no route change.
- Rate-limit bucket: no route change.
- Reject-unknown validation: strict schema remains final.
- Anti-abuse: destructive denial defaults preserved.
- Secret handling: redaction unchanged or stronger.

## Testing Requirements

- Full targeted assistant Vitest suite.
- Full live assistant matrix:
  - `set -a && source .env && set +a && bun run test:assistant:live`
- Lint/typecheck.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- changelog on completion
