# TASK-190-03-01: Composition Graph Contract and Deterministic Order
# FileName: TASK-190-03-01_Composition_Graph_Contract_and_Deterministic_Order.md

**Priority:** High
**Category:** Assistant/Core + Composition Graph
**Estimated Effort:** Medium
**Dependencies:** TASK-190-02
**Status:** Done (2026-05-05)

---

## Overview

Create the graph representation that sits between candidate selection and action
assembly.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintCompositionGraph.ts`
- Add `tests/vitest/assistant/blueprint-composition-graph.test.ts`

## Pseudocode

```ts
export const buildBlueprintCompositionGraph = (input: {
  candidates: BlueprintCandidate[];
  promptKind: AssistantPromptKind;
  intentFamily: AssistantIntentFamily;
}): BlueprintCompositionGraph => {
  const nodes = orderAndDedupeCandidates(input.candidates);
  const primary = firstPrimary(nodes);
  const adjuncts = nodes.filter((node) => node.role === "adjunct");
  const gated = nodes.filter((node) => node.role === "gated");
  return {
    primary,
    adjuncts,
    gated,
    resources: collectResourceNodes(primary, adjuncts, gated),
    conflicts: detectDuplicateActionConflicts(primary, adjuncts),
    fragments: buildTypedPlanFragments(primary, adjuncts, input.promptKind, input.intentFamily),
    selectedCapabilityIds: selectedIds(primary, adjuncts, gated),
  };
};
```

## Security Contract

- Visibility: internal graph.
- Auth model: unchanged.
- RBAC: graph records required permissions only.
- CSRF: not applicable.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: graph nodes from normalized manifests only.
- Anti-abuse: graph cannot execute.
- Secret handling: graph excludes secrets.
- Media handling: graph nodes may carry trusted media ids and target metadata,
  but never raw bytes, base64 payloads, upload tokens, or signed/private URLs.

## Testing Requirements

- Stable order snapshots.
- Primary before adjunct.
- Gated nodes preserved.
- Duplicate nodes deduped by capability id.
- Fragments and selected capability ids stay deterministic regardless of input
  candidate order.

## Documentation Updates Required

- Parent architecture docs only.
