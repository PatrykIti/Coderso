# TASK-190-02-03: Composer Candidate Shadow Mode and Deferred Routing Cutover
# FileName: TASK-190-02-03_Composer_Shadow_Mode_and_Routing_Cutover.md

**Priority:** High
**Category:** Assistant/Core + Planner Rollout Safety
**Estimated Effort:** Large
**Dependencies:** TASK-190-02-01, TASK-190-02-02
**Status:** Done (2026-05-06)

---

## Overview

Introduce the first safe rollout step for the blueprint composer.

This leaf is **candidate/draft shadow mode only**. It runs the new capability
candidate resolver beside the current single-blueprint planner and records
comparison diagnostics without changing user-visible behavior.

Full composed plan cutover is explicitly deferred until graph, merge engines,
page/detail/admin composition, action assembly, no-duplicate checks, and
manual collection editability exist (`TASK-190-03` through `TASK-190-07`,
including `TASK-190-06-03`), and the rollout gates are then validated in
`TASK-190-08`.

This prevents a big-bang cutover in `actionPlannerService.ts`.

## Sub-Tasks

No child task files.

## Business Behavior

Before full composer availability:
- existing single-blueprint prompts still return current plans,
- candidate composer runs and records comparison metadata in test diagnostics and
  optional debug-flag planner metadata only,
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
- generated collection outputs must already be manually editable through the
  `TASK-190-06-03` workspace/editor wave before routing flips,
- dry-run parity, no-duplicate checks, and evaluation coverage from
  `TASK-190-08` must be green,
- fallback to legacy blueprint builder remains available for a bounded period,
- no provider-generated action payloads are introduced,
- any cutover path that needs existing-resource awareness must use the reviewed
  `includeResourceCatalog` request flag plus server-injected catalog data; it
  must keep rejecting client-authored `context.resourceCatalog`,
- catalog-backed/site-kit planning keeps the existing LLM availability gate and
  does not silently switch to an under-informed local composer when the LLM Guide
  is unavailable,
- the existing `input.context.siteKit` short-circuit in `actionPlannerService.ts`
  remains authoritative for the explicit site-kit flow unless a later dedicated
  task intentionally converges site-kit and blueprint-composer routing.

After cutover:
- composer is the primary setup path for current blueprint-family packs,
- the explicit site-kit entrypoint remains separate and owned by the current
  site-kit planner until a later convergence task says otherwise,
- legacy direct preset routing for blueprint-family packs is removed or reduced
  to wrapper compatibility.

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- Add `core/services/assistant/blueprints/blueprintComposerShadow.ts`
- Update `tests/vitest/assistant/actionPlannerService.test.ts`
- Add `tests/vitest/assistant/blueprint-composer-shadow.test.ts`

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
- shadow candidate comparison must use the same normalized admin-route aliases
  the planner relies on, including `content` / `content-types` -> Engine/Entries
  canonicalization before catalog-aware family inference runs,
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
- Shadow/cutover request validation keeps rejecting client-supplied
  `context.resourceCatalog` while allowing the server-derived catalog package.
- LLM-unavailable cases block catalog-backed composer/site-kit routing with the
  existing assistant unavailable error.
- No candidate shadow metadata leaks into production response unless explicitly
  enabled by a local debug flag exercised in Vitest.
- Full composed plan cutover tests are deferred to `TASK-190-07` and
  `TASK-190-08`.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/TESTING_STRATEGY.md`
