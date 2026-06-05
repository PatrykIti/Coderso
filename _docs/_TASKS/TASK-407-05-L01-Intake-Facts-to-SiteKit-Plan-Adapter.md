# TASK-407-05-L01: Intake Facts to SiteKit Plan Adapter
# FileName: TASK-407-05-L01-Intake-Facts-to-SiteKit-Plan-Adapter.md

**Parent Subtask:** TASK-407-05
**Priority:** High
**Category:** Assistant + SiteKit Adapter
**Estimated Effort:** Large
**Dependencies:** TASK-407-03-L04, TASK-407-04-L04
**Status:** ⏳ To Do

---

## Overview

Create the adapter that converts normalized site-builder intake facts into the
existing `AssistantSiteKitPlanInput` / `SiteBuilderPlanInput` contract for a
generic site shell. This leaf must not own content-engine decision rules beyond
the static shell.

## Sub-Tasks

- Add an adapter from `AssistantSiteBuilderIntakeFacts` to siteKit plan input.
- Preserve Basic/Advanced choices as explicit review/plan metadata.
- Map business profile, site goals, locale, kit preference, and enabled
  `siteBuilderPlanStepIds` into siteKit inputs.
- The object submitted as `context.siteKit` must match the current
  `AssistantSiteKitPlanInput` exactly: `businessType`, `goals`, `locale`,
  optional `region`, `siteName`, `preferredKitId`, `selectedKitId`, and
  `enabledStepIds`.
- Keep richer page/menu/hero/section/media/visual review data and gates in a
  sibling compile result, not inside `context.siteKit`.
- Return gates for missing required shell facts instead of inventing values.

## Security Contract

- Endpoint visibility: internal assistant action routes only.
- Auth model: existing admin session.
- RBAC: unchanged until action family assembly.
- CSRF: unchanged backend POST protection.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: adapter input must be normalized intake facts only;
  raw request payloads are rejected by earlier leaves.
- Anti-abuse: user text cannot create arbitrary adapter node types, action ids,
  widget aliases, routes, or media URLs.
- Secret handling: compiler metadata must use redacted facts and must not carry raw
  prompts, secrets, raw references, cookies, tokens, or provider keys.

## Files To Change

| Area | Files |
|---|---|
| Adapter | `core/services/assistant/assistantSiteBuilderIntakeCompiler.ts` |
| Existing siteKit planner | `core/services/kits/solutionKitTypes.ts`, `core/services/assistant/siteBuilderPlanner.ts`, `core/services/assistant/siteBuilderPlanAdapter.ts` |
| Planner | `core/services/assistant/actionPlannerService.ts` only for existing `context.siteKit` plan handoff tests |
| Tests | `tests/vitest/assistant/assistantSiteBuilderIntakeCompiler.test.ts` |

## Implementation Pseudocode

```ts
export function compileIntakeToSiteKitPlanInput(
  session: AssistantSiteBuilderIntakeSession
): AssistantSiteKitPlanInput {
  const normalized = normalizeAssistantSiteBuilderIntakeSession(session);
  assertReadyForReview(normalized);
  return buildSiteKitPlanInputFromIntakeFacts(normalized.facts, {
    supportedSteps: siteBuilderPlanStepIds,
  });
}

export function buildSiteKitPlanInputFromIntakeFacts(
  facts: AssistantSiteBuilderIntakeFacts,
  options: { supportedSteps: readonly SiteBuilderPlanStepId[] }
): AssistantSiteKitPlanInput {
  assertIntakeFactsReadyForShell(facts);
  return {
    businessType: resolveSiteKitBusinessType(facts.businessProfile),
    goals: resolveSiteKitGoals(facts.siteGoals),
    locale: facts.businessProfile.locale,
    region: facts.businessProfile.region ?? null,
    siteName: facts.businessProfile.businessName ?? null,
    preferredKitId: facts.preferredKitId ?? null,
    selectedKitId: selectSolutionKitForFacts(facts).id,
    enabledStepIds: resolveEnabledSiteBuilderPlanSteps(facts, options.supportedSteps),
  };
}

export function buildSiteBuilderIntakeCompileResult(
  facts: AssistantSiteBuilderIntakeFacts,
  deps: SiteBuilderIntakeCompileDeps
) {
  const siteKit = buildSiteKitPlanInputFromIntakeFacts(facts, {
    supportedSteps: deps.supportedSteps,
  });
  return {
    siteKit,
    reviewFacts: {
      pageRoles: facts.siteMap.pageRoles,
      menu: facts.menu,
      hero: facts.hero,
      sections: facts.homepageSections,
      mediaPolicy: facts.media,
      visualPreset: facts.visual.presetId,
    },
    gates: collectShellGates(facts),
  };
}
```

## Data Flow and Error Handling

- Normalized facts enter the adapter after review readiness is established.
- Missing required shell facts return siteKit gates or `needs_input`; malformed raw
  payloads never reach this adapter.
- `compileIntakeToSiteKitPlanInput(session)` outputs siteKit plan input only;
  `buildSiteKitPlanInputFromIntakeFacts(facts)` owns the facts-level field
  mapping. Later leaves
  may consume the sibling compile result for review/gates before strict actions
  run through the existing action planner/executor path.

## Testing Requirements

- Tests for Basic and Advanced facts mapping into the exact
  `AssistantSiteKitPlanInput` key set.
- Tests for missing facts producing gates/needs_input.
- Tests that raw prompt, review-only fields, gates, or unsafe media values are
  absent from `context.siteKit`.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` for siteKit planner handoff.

## Acceptance Criteria

- Intake facts can feed the existing siteKit planner without one-industry
  assumptions.
- `context.siteKit` output is deterministic, redacted, and schema-exact.
- Content-engine decisions remain outside this leaf.
