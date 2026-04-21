# TASK-190-01-02: Migrate Current Blueprints to Capability Registry
# FileName: TASK-190-01-02_Migrate_Current_Blueprints_to_Capability_Registry.md

**Priority:** High
**Category:** Assistant/Core + Blueprint Registry
**Estimated Effort:** Medium
**Dependencies:** TASK-190-01-01
**Status:** To Do

---

## Overview

Register current blueprint packs as capabilities without changing their generated
actions. This is a metadata migration only.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintCapabilityRegistry.ts`
- Update:
  - `core/services/assistant/blueprints/catalogFamilyPresets.ts`
  - `core/services/assistant/blueprints/leadCaptureBlueprint.ts`
  - `core/services/assistant/blueprints/productInquiryBlueprint.ts`
  - `core/services/assistant/blueprints/editorialContentHubBlueprint.ts`
  - `core/services/assistant/blueprints/bookingServiceBlueprint.ts`
- Add `tests/vitest/assistant/blueprint-capability-registry.test.ts`

## Technical Scope

Register capabilities for:
- house projects catalog,
- product catalog,
- portfolio projects,
- services directory,
- lead capture,
- product inquiry form,
- editorial content hub,
- booking service gated module,
- checkout/payment gated module.

Catalog-family capabilities may also declare future `detail-page` /
`public-detail-page` contributions, but only as gated/latent manifest metadata.
This task must not make detail pages look like a currently executable standalone
pack before the detail-page runtime/action/admin slices land.

## Pseudocode

```ts
export const blueprintCapabilities = normalizeBlueprintCapabilities([
  houseProjectsCatalogCapability,
  productCatalogCapability,
  portfolioProjectsCapability,
  servicesDirectoryCapability,
  leadCaptureCapability,
  inquiryFormCapability,
  editorialContentHubCapability,
  bookingServiceGatedCapability,
]);

export const listBlueprintCapabilities = () => blueprintCapabilities;
export const getBlueprintCapability = (id: string) => registryById.get(id) ?? null;
export const findCapabilitiesProviding = (provide: BlueprintProvideKind) =>
  blueprintCapabilities.filter((item) => item.provides.some((entry) => entry.kind === provide));
```

## Security Contract

- Visibility: internal planner registry.
- Auth model: no route changes.
- RBAC: registry exposes required permissions only.
- CSRF: not applicable.
- Rate-limit bucket: not applicable.
- Reject-unknown validation: registry entries pass manifest normalizer.
- Anti-abuse: no executable surface expansion.
- Secret handling: no secret defaults.

## Testing Requirements

- Registry contains all current blueprints.
- Catalog-family manifests can expose first-class `detail-page` metadata only as
  gated/latent future contributions, without changing today's executable pack
  contract.
- Registry ids are unique.
- Current blueprint builder output is unchanged.
- Gated booking/payment capabilities are non-executable.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` registry overview in parent task.
