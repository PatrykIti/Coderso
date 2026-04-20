# TASK-190-01-01: Capability Types, Normalizer, and Invariants
# FileName: TASK-190-01-01_Capability_Types_Normalizer_and_Invariants.md

**Priority:** High
**Category:** Assistant/Core + Blueprint Manifest
**Estimated Effort:** Medium
**Dependencies:** TASK-190-01
**Status:** To Do

---

## Overview

Define the strict TypeScript contract and normalizer for blueprint capability
manifests. This leaf creates the schema that every current and future blueprint
fragment must pass before it can be considered by the composer.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintCapabilityTypes.ts`
- Add `core/services/assistant/blueprints/blueprintCapabilitySchema.ts`
- Add `tests/vitest/assistant/blueprint-capability-schema.test.ts`

## Technical Scope

Define:
- `BlueprintCapability`
- `BlueprintProvide`
- `BlueprintRequirement`
- `BlueprintResourceContribution`
- `BlueprintPageSectionContribution`
- `BlueprintAdminContribution`
- `BlueprintGatedContribution`
- `BlueprintMergePolicy`
- `normalizeBlueprintCapability(value)`
- `normalizeBlueprintCapabilities(values)`

Required invariants:
- `id` is stable kebab-case.
- `version` is `1`.
- `provides[]` is non-empty.
- executable actions must be existing assistant action types.
- gated contributions cannot include executable action payloads.
- resource keys are stable and deterministic.
- no secret-like keys in defaults.

## Pseudocode

```ts
const allowedKeys = new Set([...]);

export const normalizeBlueprintCapability = (value: unknown): BlueprintCapability => {
  const input = assertRecord(value);
  assertKeys(input, allowedKeys);
  const id = readStableId(input.id);
  const provides = normalizeProvides(input.provides);
  const resources = normalizeResources(input.resources);
  const gated = normalizeGated(input.gated);

  assertNoDuplicateIds(resources.map((item) => item.key));
  assertNoProviderActions(resources);
  assertNoSecretDefaults(input);

  return {
    id,
    version: 1,
    label: readText(input.label),
    family: readText(input.family),
    provides,
    requires: normalizeRequirements(input.requires),
    resources,
    pageSections: normalizePageSections(input.pageSections),
    adminSurfaces: normalizeAdminSurfaces(input.adminSurfaces),
    gated,
    merge: normalizeMergePolicy(input.merge),
  };
};
```

## Security Contract

- Visibility: internal metadata only.
- Auth model: no runtime route changes.
- RBAC: manifests describe permissions but cannot grant them.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: strict manifest key validation.
- Anti-abuse: no arbitrary action names or provider-defined payloads.
- Secret handling: reject secret-like defaults and labels that look like keys.

## Testing Requirements

- Valid manifest parses.
- Unknown keys reject.
- Duplicate resource keys reject.
- Unknown action type rejects.
- Secret-like defaults reject.
- Gated fragments cannot include executable payloads.

## Documentation Updates Required

- Mention manifest contract in `_docs/ASSISTANT_SITE_BUILDER.md` when the full
  business task lands.
