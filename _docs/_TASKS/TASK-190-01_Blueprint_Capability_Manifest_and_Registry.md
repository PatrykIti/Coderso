# TASK-190-01: Blueprint Capability Manifest and Registry
# FileName: TASK-190-01_Blueprint_Capability_Manifest_and_Registry.md

**Priority:** High
**Category:** Assistant/Core + Blueprint Architecture
**Estimated Effort:** Large
**Dependencies:** TASK-190
**Status:** To Do

---

## Overview

Introduce a declarative capability manifest for every blueprint or blueprint
fragment. This is the base layer for all future composition. Before the planner
can mix blueprint fragments, each fragment must declare what it provides, what it
requires, what resources it touches, what permissions it needs, and what must
stay gated.

Business value:
- Product teams can add future blueprint fragments without hardcoding every
  prompt combination.
- The assistant can reason about capabilities instead of only selecting one
  preset.
- Review UI and tests can explain why a module was selected.

## Sub-Tasks

- `TASK-190-01-01_Capability_Types_Normalizer_and_Invariants.md`
- `TASK-190-01-02_Migrate_Current_Blueprints_to_Capability_Registry.md`

## Architecture

New owner files:

- `core/services/assistant/blueprints/blueprintCapabilityTypes.ts`
- `core/services/assistant/blueprints/blueprintCapabilitySchema.ts`
- `core/services/assistant/blueprints/blueprintCapabilityRegistry.ts`
- `tests/vitest/assistant/blueprint-capability-schema.test.ts`
- `tests/vitest/assistant/blueprint-capability-registry.test.ts`

Manifest sketch:

```ts
export type BlueprintCapability = {
  id: string;
  version: 1;
  label: string;
  family: string;
  provides: BlueprintProvide[];
  requires: BlueprintRequirement[];
  resources: BlueprintResourceContribution[];
  pageSections: BlueprintPageSectionContribution[];
  adminSurfaces: BlueprintAdminContribution[];
  gated: BlueprintGatedContribution[];
  merge: BlueprintMergePolicy;
};
```

## Acceptance Criteria

1. Every current business blueprint has manifest metadata.
2. Manifest validation rejects unknown keys and unsafe resource declarations.
3. Registry can list capabilities by family, provide type, resource type, and
   gated/executable mode.
4. No current generated action output changes in this task.

## Security Contract

- Visibility: internal planner metadata only.
- Auth model: no route changes.
- RBAC: manifests declare required permissions but do not grant permissions.
- CSRF: not applicable; no endpoint changes.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: capability manifests use strict normalization.
- Anti-abuse: manifests cannot declare arbitrary actions; actions must map to
  current action families or explicit gated contributions.
- Public-write hardening: manifests may describe forms but cannot bypass form
  nonce/captcha/access contracts.
- Secret handling: manifests cannot contain secret values.

## Testing Requirements

- Vitest manifest normalization tests.
- Registry snapshot tests for current blueprint packs.
- Invariant tests:
  - stable ids,
  - no duplicate capability ids,
  - no executable action type outside `actionRegistry`,
  - gated domains remain gated.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/_TASKS/README.md`
