# TASK-190-02-03: Composer Candidate Shadow Mode and Deferred Routing Cutover
# FileName: TASK-190-02-03_Composer_Shadow_Mode_and_Routing_Cutover.md

**Priority:** High
**Category:** Assistant/Core + Planner Rollout Safety
**Estimated Effort:** Large
**Dependencies:** TASK-190-02-01, TASK-190-02-02
**Status:** To Do

---

## Overview

Introduce the first safe rollout step for the blueprint composer.

This leaf is **candidate/draft shadow mode only**. It runs the new capability
candidate resolver beside the current single-blueprint planner and records
comparison diagnostics without changing user-visible behavior.

Full composed plan cutover is explicitly deferred until graph, merge engines,
page/detail/admin composition, action assembly, no-duplicate checks, and fixture
coverage exist (`TASK-190-03` through `TASK-190-07`, validated in
`TASK-190-08`).

This prevents a big-bang cutover in `actionPlannerService.ts`.

## Sub-Tasks

No child task files.

## Business Behavior

Before full composer availability:
- existing single-blueprint prompts still return current plans,
- candidate composer runs and records comparison metadata in test-only planner
  diagnostics only,
- generic CMS/admin provider planning keeps the existing `cms_operation_draft`
  contract and does not switch response shape in this leaf,
- shadow diagnostics compare:
  - current `intentFamily`,
  - current `intentId`,
  - selected primary capability id,
  - selected adjunct capability ids,
  - selected gated capability ids,
  - candidate score/reason snapshots,
- mismatches become fixtures, not production regressions,
- no graph, merge, action assembly, dry-run, execute, or user-visible plan
  routing changes happen in this leaf.

Deferred full plan cutover:
- selected prompt families may opt into composer routing only after
  `TASK-190-03..190-07` are implemented,
- assembled composer plans must pass `normalizeAssistantActionPlan`,
- dry-run parity and no-duplicate checks must be green,
- fallback to legacy blueprint builder remains available for a bounded period,
- no provider-generated action payloads are introduced.

After cutover:
- composer is the primary blueprint setup path,
- legacy direct preset routing is removed or reduced to wrapper compatibility.

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/blueprints/blueprintCandidateResolver.ts`
- Add `core/services/assistant/blueprints/blueprintComposerShadow.ts`
- Update `tests/vitest/assistant/actionPlannerService.test.ts`
- Add `tests/vitest/assistant/blueprint-composer-shadow.test.ts`
- Add `tests/vitest/assistant/blueprint-candidate-shadow.test.ts`

## Technical Scope

Add:
- `runBlueprintCandidateShadow(input)`
- `compareBlueprintCandidateSelection(currentPlan, candidates)`
- `shouldRunBlueprintCandidateShadow(input, featureFlags?)`
- test-only diagnostic snapshot fields:
  - current `intentId`,
  - current `intentFamily`,
  - composer primary candidate,
  - adjunct candidate ids,
  - gated candidate ids,
  - candidate scores,
  - candidate reasons,
  - mismatch reason.

Feature/cutover controls:
- candidate shadow mode default off outside tests and explicit local debug
  toggles,
- env/test override for fixtures,
- per-family allowlist for candidate shadow diagnostics,
- any provider-backed capability-id suggestion remains test/dev/shadow only in
  this slice,
- full `shouldUseBlueprintComposer(...)` plan routing remains hard-disabled in
  this leaf and moves to the action-assembly/evaluation closure after
  `TASK-190-07`.

## Pseudocode

```ts
export const planAssistantActions = (input) => {
  const context = buildAssistantAdminContext(input.context);

  const currentPlan = planWithCurrentBlueprintRouting(input, context);

  if (shouldRunBlueprintCandidateShadow(input)) {
    const candidates = resolveBlueprintCandidates({
      prompt: input.prompt,
      context,
    });
    recordCandidateShadowComparison({
      currentPlan,
      candidates,
    });
  }

  // Full plan routing remains owned by TASK-190-07/190-08 after graph,
  // merge engines, action assembly, and no-duplicate checks exist.
  return currentPlan;
};
```

Full routing cutover pseudocode belongs to `TASK-190-07` / `TASK-190-08`:

```ts
if (shouldUseBlueprintComposer(input) && composerPlanIsReady(input)) {
  const composerPlan = composeBlueprintActionPlan(input, context);
  return normalizeAssistantActionPlan(composerPlan);
}
```

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: no new permissions; shadow mode cannot execute.
- CSRF: unchanged.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: provider/candidate draft output must pass strict
  candidate schema before comparison.
- Anti-abuse: candidate shadow mode cannot assemble actions, mutate, dry-run,
  execute, or route user-visible responses.
- Public-write hardening: not applicable.
- Secret handling: shadow diagnostics must not include provider keys, sessions,
  cookies, raw submissions, or secret-like settings.

## Testing Requirements

- Existing single-blueprint fixtures keep current plan action types while
  candidate shadow runs.
- Candidate selection snapshots are deterministic.
- Candidate shadow flag runs only allowlisted families.
- Full plan routing stays disabled in this leaf.
- No candidate shadow metadata leaks into production response unless explicitly
  enabled by a local debug flag exercised in Vitest.
- Full composed plan cutover tests are deferred to `TASK-190-07` and
  `TASK-190-08`.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/TESTING_STRATEGY.md`
