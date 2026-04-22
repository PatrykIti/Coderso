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
- `BlueprintResourceKind`
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
- future resource/provide metadata may exist before execution support exists, but
  it must be expressed as gated/latent manifest metadata rather than as ready
  executable actions.
- resource keys are stable and deterministic.
- `detail-page` is a first-class resource kind, separate from `page`.
- `public-detail-page` is a first-class provide kind for catalog detail
  templates.
- UI can label `detail-page` as "Detail Template", but manifests use the
  technical kind consistently.
- relation semantics stay under content-schema field definitions and content
  validation; manifests may express relation-capable schema contributions, but
  they do not introduce a standalone `relation` resource family.
- `site-kit` manifest metadata, if present, points at the existing explicit
  site-kit entrypoint and must not be treated as proof that the composer can
  silently replace or merge that flow.
- `detail-page` in manifests is capability metadata only; the actual detail page
  document types/schema/normalizer remain owned by the content domain rather
  than a second schema in `assistant/blueprints`.
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
- Unknown resource kind rejects.
- `detail-page` resource kind accepts only detail page document contributions.
- relation-capable schema metadata is accepted only inside schema/field
  contributions; a standalone `relation` resource entry rejects.
- capability metadata for `detail-page` does not redefine the content-domain
  detail page schema/normalizer.
- current-pack detail-page metadata without a matching gated/latent declaration
  rejects.
- Secret-like defaults reject.
- Gated fragments cannot include executable payloads.

## Documentation Updates Required

- Mention manifest contract in `_docs/ASSISTANT_SITE_BUILDER.md` when the full
  business task lands.
