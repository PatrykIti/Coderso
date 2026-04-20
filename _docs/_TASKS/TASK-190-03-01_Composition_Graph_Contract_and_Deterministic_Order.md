# TASK-190-03-01: Composition Graph Contract and Deterministic Order
# FileName: TASK-190-03-01_Composition_Graph_Contract_and_Deterministic_Order.md

**Priority:** High
**Category:** Assistant/Core + Composition Graph
**Estimated Effort:** Medium
**Dependencies:** TASK-190-02
**Status:** To Do

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
  primary: BlueprintCandidate;
  adjuncts: BlueprintCandidate[];
  registry: BlueprintCapabilityRegistry;
}): BlueprintCompositionGraph => {
  const nodes = orderNodes([input.primary, ...input.adjuncts]);
  return {
    primary: toNode(input.primary),
    adjuncts: input.adjuncts.map(toNode),
    resources: collectResourceNodes(nodes),
    pageSections: collectPageSections(nodes),
    adminSections: collectAdminSections(nodes),
    gated: collectGatedNodes(nodes),
    conflicts: [],
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

## Testing Requirements

- Stable order snapshots.
- Primary before adjunct.
- Gated nodes preserved.
- Duplicate nodes deduped by capability id.

## Documentation Updates Required

- Parent architecture docs only.
