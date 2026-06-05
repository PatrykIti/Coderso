# TASK-407-05-L01: Guided Facts to Blueprint Graph Adapter
# FileName: TASK-407-05-L01-Guided-Facts-to-Blueprint-Graph-Adapter.md

**Parent Subtask:** TASK-407-05
**Priority:** High
**Category:** Assistant + Blueprint Adapter
**Estimated Effort:** Large
**Dependencies:** TASK-407-03-L04, TASK-407-04-L04
**Status:** ⏳ To Do

---

## Overview

Create the adapter that converts normalized `siteBuilderGuide` facts into
blueprint graph inputs for a generic site shell. This leaf must not own
content-engine decision rules beyond the static shell.

## Sub-Tasks

- Add an adapter from `GuidedSiteBuilderFacts` to blueprint shell inputs.
- Preserve Basic/Advanced choices as explicit graph metadata.
- Map business profile, site goals, page roles, menu facts, hero facts, section
  facts, media policy, and visual preset facts into graph inputs.
- Return gates for missing required shell facts instead of inventing values.

## Security Contract

- Endpoint visibility: internal assistant action routes only.
- Auth model: existing admin session.
- RBAC: unchanged until action family assembly.
- CSRF: unchanged backend POST protection.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: adapter input must be normalized guide facts only;
  raw request payloads are rejected by earlier leaves.
- Anti-abuse: user text cannot create arbitrary graph node types, action ids,
  widget aliases, routes, or media URLs.
- Secret handling: graph metadata must use redacted facts and must not carry raw
  prompts, secrets, raw references, cookies, tokens, or provider keys.

## Files To Change

| Area | Files |
|---|---|
| Adapter | `core/services/assistant/blueprints/guidedSiteBuilderGraphAdapter.ts` |
| Planner | `core/services/assistant/actionPlannerService.ts` or existing blueprint candidate resolver hook |
| Tests | `tests/vitest/assistant/guidedSiteBuilderGraphAdapter.test.ts` |

## Implementation Pseudocode

```ts
export function buildGuidedBlueprintShellInput(facts: GuidedSiteBuilderFacts) {
  assertGuideFactsReadyForShell(facts);
  return {
    businessProfile: facts.businessProfile,
    siteGoals: facts.siteGoals,
    shell: {
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
- Missing required shell facts return graph gates or `needs_input`; malformed raw
  payloads never reach this adapter.
- Output is graph input only; later leaves assemble strict actions.

## Testing Requirements

- Tests for Basic and Advanced facts mapping into shell graph input.
- Tests for missing facts producing gates/needs_input.
- Tests that raw prompt or unsafe media values are absent from graph metadata.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` for planner handoff.

## Acceptance Criteria

- Guided facts can feed a generic shell graph without one-industry assumptions.
- Adapter output is deterministic and redacted.
- Content-engine decisions remain outside this leaf.
