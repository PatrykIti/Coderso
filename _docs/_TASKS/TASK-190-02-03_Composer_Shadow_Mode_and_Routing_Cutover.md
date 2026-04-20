# TASK-190-02-03: Composer Shadow Mode and Routing Cutover
# FileName: TASK-190-02-03_Composer_Shadow_Mode_and_Routing_Cutover.md

**Priority:** High
**Category:** Assistant/Core + Planner Rollout Safety
**Estimated Effort:** Large
**Dependencies:** TASK-190-02-01, TASK-190-02-02
**Status:** To Do

---

## Overview

Introduce a safe rollout path for the blueprint composer. The composer must first
run in shadow mode beside the current single-blueprint planner so we can compare
candidate selection, generated graph, conflicts, and action assembly without
changing user-visible behavior.

This prevents a big-bang cutover in `actionPlannerService.ts`.

## Sub-Tasks

No child task files.

## Business Behavior

Before cutover:
- existing single-blueprint prompts still return current plans,
- composer runs and records comparison metadata in tests/diagnostics only,
- mismatches become fixtures, not production regressions.

During cutover:
- selected prompt families can opt into composer routing one by one,
- fallback to legacy blueprint builder remains available for a bounded period,
- no provider-generated action payloads are introduced.

After cutover:
- composer is the primary blueprint setup path,
- legacy direct preset routing is removed or reduced to wrapper compatibility.

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/blueprints/blueprintCandidateResolver.ts`
- `core/services/assistant/blueprints/blueprintCompositionGraph.ts`
- Add `core/services/assistant/blueprints/blueprintComposerShadow.ts`
- Add `tests/vitest/assistant/blueprint-composer-shadow.test.ts`
- Add `tests/vitest/assistant/blueprint-composer-cutover.test.ts`

## Technical Scope

Add:
- `runBlueprintComposerShadow(input)`
- `compareBlueprintPlans(currentPlan, composerPlan)`
- `shouldUseBlueprintComposer(input, featureFlags?)`
- test-only diagnostic snapshot fields:
  - current `intentId`,
  - composer primary candidate,
  - adjunct candidate ids,
  - graph conflicts,
  - planned action type list,
  - mismatch reason.

Feature/cutover controls:
- default off for production until tests cover parity,
- env/test override for fixtures,
- per-family allowlist for progressive rollout.

## Pseudocode

```ts
export const planAssistantActions = (input) => {
  const context = buildAssistantAdminContext(input.context);

  const currentPlan = planWithCurrentBlueprintRouting(input, context);

  if (shouldRunBlueprintComposerShadow(input)) {
    const composerPlan = tryPlanWithBlueprintComposer(input, context);
    recordShadowComparison({
      prompt: input.prompt,
      currentPlan,
      composerPlan,
    });
  }

  if (shouldUseBlueprintComposer(input)) {
    const composerPlan = tryPlanWithBlueprintComposer(input, context);
    if (composerPlan) return normalizeAssistantActionPlan(composerPlan);
  }

  return currentPlan;
};
```

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: no new permissions; shadow mode cannot execute.
- CSRF: unchanged.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: composer output must pass strict schema before
  comparison or cutover.
- Anti-abuse: shadow mode cannot mutate and cannot call execute/dry-run.
- Public-write hardening: not applicable.
- Secret handling: shadow diagnostics must not include provider keys, sessions,
  cookies, raw submissions, or secret-like settings.

## Testing Requirements

- Existing single-blueprint fixtures match current plan action types in shadow.
- Composer mismatch fixtures are deterministic.
- Cutover flag routes only allowlisted families.
- Fallback path remains available when composer returns conflicts.
- No shadow metadata leaks into production response unless explicitly enabled in
  test-only diagnostics.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/TESTING_STRATEGY.md`
