# TASK-190-03: Composition Graph and Conflict Policy
# FileName: TASK-190-03_Composition_Graph_and_Conflict_Policy.md

**Priority:** High
**Category:** Assistant/Core + Composition Engine
**Estimated Effort:** Large
**Dependencies:** TASK-190-01, TASK-190-02
**Status:** Done (2026-05-10)

---

## Overview

Create a deterministic composition graph from selected blueprint candidates. The
graph is the intermediate representation that merges capabilities before action
assembly.

Business value:
- Mixed prompts become explainable.
- Conflicts are visible before execution.
- Generated plans become stable across model/provider runs.

Current slice note:
- deterministic graph fragments are landed for current capability packs,
- typed route/resource/field conflicts plus blocking gated-domain surfacing are
  landed for the current capability packs,
- media missing/ambiguous/upload/delete conflicts and manifest permission gaps
  now surface through the same closed typed conflict contract before live
  cutover.

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
4. Current conflicts remain explicit and machine-readable; any future
   auto-resolution policy must stay bounded to safe owner-approved cases.
5. Unresolved conflicts stay machine-readable and can be downgraded into
   `needs_input` with questions by the assembler/planner path.
6. Media conflicts for attached files, ambiguous matches, and unsupported
   delete/upload flows surface as typed conflicts. Existing-media reuse still
   belongs to the later no-duplicate/resource-reuse leaf.

## Security Contract

- Visibility: internal planner graph only.
- Auth model: unchanged.
- RBAC: manifest permission gaps are surfaced before assembly; execute remains
  authoritative for actual route/action permission enforcement.
- CSRF: no route changes.
- Rate-limit bucket: existing assistant bucket.
- Reject-unknown validation: graph nodes and conflicts use closed typed
  contracts.
- Anti-abuse: unresolved destructive/privileged conflicts cannot auto-resolve.
- Secret handling: conflicts must redact secret-like values.

## Testing Requirements

- Deterministic graph tests.
- Conflict tests for:
  - duplicate content type slug,
  - incompatible field type,
  - duplicate page route,
  - incompatible listing template slug,
  - gated booking/checkout module,
  - media missing/ambiguous/upload/delete families,
  - permission gaps versus satisfied action-contract permissions.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
