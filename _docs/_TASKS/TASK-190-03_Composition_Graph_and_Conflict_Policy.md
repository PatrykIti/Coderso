# TASK-190-03: Composition Graph and Conflict Policy
# FileName: TASK-190-03_Composition_Graph_and_Conflict_Policy.md

**Priority:** High
**Category:** Assistant/Core + Composition Engine
**Estimated Effort:** Large
**Dependencies:** TASK-190-01, TASK-190-02
**Status:** To Do

---

## Overview

Create a deterministic composition graph from selected blueprint candidates. The
graph is the intermediate representation that merges capabilities before action
assembly.

Business value:
- Mixed prompts become explainable.
- Conflicts are visible before execution.
- Generated plans become stable across model/provider runs.

## Sub-Tasks

- `TASK-190-03-01_Composition_Graph_Contract_and_Deterministic_Order.md`
- `TASK-190-03-02_Conflict_Resolver_Stable_Keys_and_Needs_Input.md`

## Architecture

New owner files:

- `core/services/assistant/blueprints/blueprintCompositionGraph.ts`
- `core/services/assistant/blueprints/blueprintConflictResolver.ts`
- `tests/vitest/assistant/blueprint-composition-graph.test.ts`
- `tests/vitest/assistant/blueprint-conflict-resolver.test.ts`

Graph sketch:

```ts
type BlueprintCompositionGraph = {
  primary: BlueprintNode;
  adjuncts: BlueprintNode[];
  resources: BlueprintResourceNode[];
  pageSections: BlueprintSectionNode[];
  adminSections: BlueprintAdminNode[];
  mediaReferences: BlueprintMediaReferenceNode[];
  conflicts: BlueprintConflict[];
  gated: BlueprintGatedNode[];
};
```

## Acceptance Criteria

1. Graph order is deterministic.
2. Duplicate resources merge by stable key.
3. Conflicting slugs/routes/fields produce typed conflicts.
4. Conflicts can be auto-resolved only when policy says it is safe.
5. Unresolved conflicts return `needs_input` with questions.
6. Media conflicts distinguish existing media references from attached files
   that still need import, ambiguous existing-gallery matches, and unsupported
   media deletion/upload requests.

## Security Contract

- Visibility: internal planner graph only.
- Auth model: unchanged.
- RBAC: graph stores permission requirements, execute remains authoritative.
- CSRF: no route changes.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: graph nodes and conflicts use strict schemas.
- Anti-abuse: unresolved destructive/privileged conflicts cannot auto-resolve.
- Secret handling: conflicts must redact secret-like values.

## Testing Requirements

- Graph snapshot tests.
- Conflict tests for:
  - duplicate content type slug,
  - incompatible field type,
  - duplicate page route,
  - incompatible listing template slug,
  - ambiguous media filename/label match,
  - attached media file without trusted media-library id,
  - gated booking/checkout module.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
