# TASK-190-01-02: Migrate Current Blueprints to Capability Registry
# FileName: TASK-190-01-02_Migrate_Current_Blueprints_to_Capability_Registry.md

**Priority:** High
**Category:** Assistant/Core + Blueprint Registry
**Estimated Effort:** Medium
**Dependencies:** TASK-190-01-01
**Status:** Done (2026-05-05)

---

## Overview

Register current blueprint packs as capabilities without changing their generated
actions. This is a metadata migration only.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintCapabilityRegistry.ts`
- Add `tests/vitest/assistant/blueprint-capability-registry.test.ts`

This slice derives from the existing pack/preset exports and keeps those owner
modules unchanged.

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
pack before the detail-page runtime/action/admin slices land, and it must not
introduce a second detail-page contract under `assistant/blueprints`.

Owner rule:

- `businessBlueprintTypes.ts` remains the current owner of pack identity,
  surfaces, action types, and pack listing/lookup helpers introduced by
  `TASK-172-01`.
- `blueprintCapabilityRegistry.ts` layers manifest metadata on top of those
  existing packs; it must not create a second drifting source of truth for pack
  ids, titles, or intent-family coverage.
- Capability registration should derive from existing pack/preset exports where
  practical, not from duplicated hardcoded tables.

## Pseudocode

```ts
const packs = listBusinessBlueprintPacks();

export const blueprintCapabilities = normalizeBlueprintCapabilities(
  packs.flatMap((pack) => capabilitiesForPack(pack))
);

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
- Registry metadata for `detail-page` points at the existing content-domain
  resource concept; it does not define a parallel schema owner in blueprint
  files.
- Registry ids are unique.
- Current blueprint builder output is unchanged.
- Pack lookup/listing in `businessBlueprintTypes.ts` remains consistent with the
  derived capability registry.
- Gated booking/payment capabilities are non-executable.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` registry overview in parent task.
