# TASK-172-01: Blueprint Pack Contract and Shared Builder Expansion
# FileName: TASK-172-01_Blueprint_Pack_Contract_and_Shared_Builder_Expansion.md

**Priority:** High  
**Category:** Assistant/Product + Blueprint Contracts  
**Estimated Effort:** Medium  
**Dependencies:** TASK-172, TASK-170  
**Status:** Done (2026-04-12)

---

## Overview

Define a reusable contract for business blueprint packs before adding more presets. The contract must keep packs composite-first, deterministic, and beginner-friendly.

## Sub-Tasks

No child task files. The pack-specific files under `TASK-172-02..07` are the leaves for this umbrella.

## Pseudocode

```ts
type BusinessBlueprintPack = {
  id: string;
  intentFamily: AssistantIntentFamily;
  schema: ContentTypeSchema;
  surfaces: BlueprintSurface[];
  refinements: BlueprintRefinement[];
  tests: BlueprintAcceptanceMatrix;
};

buildBlueprintPlan(pack, context) {
  return normalizeAssistantActionPlan(pack.toActions(context));
}
```

## Files to Change

- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
- `core/services/assistant/blueprints/catalogFamilyPresets.ts`
- possible new `core/services/assistant/blueprints/businessBlueprintTypes.ts`
- `core/services/assistant/actionPlannerService.ts`
- `tests/vitest/assistant/catalogBlueprintEngine.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Security Contract

- Visibility: internal planning/dry-run/execute through existing assistant action endpoints.
- Auth model: admin session.
- RBAC: pack contract declares resource permissions; route/domain checks enforce them.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: pack outputs strict typed actions only.
- Anti-abuse: no public write endpoint; public forms reuse existing form hardening.
- Idempotency: execute remains replay-safe by actor/plan/hash.
- Secret handling: pack definitions must not include secrets or privileged settings.

## Testing Requirements

- Vitest:
  - pack schema validates required fields,
  - builder outputs stable action order,
  - unsupported pack id returns `needs_input`.
- Bun:
  - deferred to pack-specific runtime acceptance leaves.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` for pack contract when implemented.
- `_docs/ASSISTANT_SITE_BUILDER.md` if shared with site-kit guide entrypoint.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Packs share a typed builder contract.
2. Pack outputs are strict action plans, not bespoke write flows.
3. Pack leaves can add business scenarios without duplicating planner plumbing.

## Completion Notes (2026-04-12)

- Added `businessBlueprintTypes.ts` with shared `AssistantBusinessBlueprintPack` contract.
- Wrapped existing catalog-family presets as ready business blueprint packs.
- Kept generated catalog plans backward-compatible with direct `buildCatalogFamilyPlan` output.
- Added Vitest coverage for pack listing, lookup, strict plan output, and unknown pack fallback.
