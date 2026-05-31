# TASK-190-02-01: Prompt Candidate Extraction and Ranking
# FileName: TASK-190-02-01_Prompt_Candidate_Extraction_and_Ranking.md

**Priority:** High
**Category:** Assistant/Core + Planner Routing
**Estimated Effort:** Large
**Dependencies:** TASK-190-01
**Status:** Done (2026-05-05)

---

## Overview

Implement deterministic candidate extraction over capability manifests. The
resolver should select a primary capability and optional adjunct capabilities
based on prompt signals and bounded route/context hints.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintPromptSignals.ts`
- Add `core/services/assistant/blueprints/blueprintCandidateResolver.ts`
- Add `tests/vitest/assistant/blueprint-candidate-resolver.test.ts`

## Technical Scope

Signals:
- domain nouns: house, product, service, portfolio, article, booking, lead,
- outcome verbs: create, add, configure, refine,
- module words: form, filters, blog, FAQ, booking, testimonials, contact,
- media words: upload, attach, gallery, hero image, replace image, remove image,
  use existing media, use selected gallery items,
- style/reference phrases: "like Mabudo", "catalog plus inquiry",
- current admin route/context.

Scoring:
- primary domain match,
- exact capability alias,
- route/context boost,
- adjunct module match,
- media intent match for capability scoring only,
- gated capability penalty,
- deterministic tie-break order.

## Pseudocode

```ts
export const resolveBlueprintCandidates = (input: {
  prompt: string;
  context: AssistantActionContext;
  capabilities: BlueprintCapability[];
}): BlueprintCandidate[] => {
  const signals = extractPromptSignals(input.prompt, input.context);
  return capabilities
    .map((capability) => scoreCapability(capability, signals))
    .filter((candidate) => candidate.score > 0)
    .sort(compareCandidates);
};
```

## Security Contract

- Visibility: internal planner only.
- Auth model: existing assistant plan route.
- RBAC: candidate selection reads metadata only.
- CSRF: unchanged.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: no provider payload in this leaf.
- Anti-abuse: candidate resolver emits no actions.
- Secret handling: no secret context in signals.

## Testing Requirements

- Single-primary prompts.
- Multi-module prompts.
- Existing prompt routing remains stable.
- Media prompt signals remain advisory in this leaf; action gating stays in later
  composition/execution slices.

## Documentation Updates Required

- Add candidate routing notes in `_docs/ASSISTANT_SITE_BUILDER.md`.
