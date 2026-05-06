# TASK-190-03-02: Conflict Resolver, Stable Keys, and Needs Input
# FileName: TASK-190-03-02_Conflict_Resolver_Stable_Keys_and_Needs_Input.md

**Priority:** High
**Category:** Assistant/Core + Conflict Safety
**Estimated Effort:** Large
**Dependencies:** TASK-190-03-01
**Status:** In Progress (2026-05-06)

---

## Overview

Resolve or surface conflicts in composed blueprint graphs.

Current slice note:
- stable merge keys and duplicate-action conflict detection are landed,
- typed `route_conflict`, `resource_slug_conflict`, `field_type_conflict`, and
  blocking `gated_domain` surfacing now return machine-readable conflicts
  through a closed typed contract that the assembler/planner path can downgrade
  into `needs_input` / `gated`,
- broader media and permission conflict families remain open.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintConflictResolver.ts`
- Add `tests/vitest/assistant/blueprint-conflict-resolver.test.ts`

## Conflict Types

- `resource_key_duplicate`
- `resource_slug_conflict`
- `route_conflict`
- `field_type_conflict`
- `facet_field_missing`
- `widget_capability_missing`
- `media_asset_missing`
- `media_asset_ambiguous`
- `media_upload_gated`
- `media_delete_gated`
- `permission_gap`
- `gated_domain`

## Pseudocode

```ts
export const resolveBlueprintConflicts = (graph) => {
  return detectConflicts(graph).map((conflict) =>
    normalizeBlueprintConflict(conflict)
  );
};
```

## Security Contract

- Visibility: internal planning.
- Auth model: unchanged.
- RBAC: permission gaps cannot auto-resolve.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: conflict objects use a closed typed
  code/severity contract.
- Anti-abuse: destructive/privileged conflicts always need input.
- Secret handling: conflict messages redact secret-like fields.

## Testing Requirements

- Listing-template slug conflict test.
- Field type mismatch test.
- Route collision test.
- Gated module test.
- Closed-contract regression for unknown conflict codes.
- Media and permission conflict families remain deferred to follow-up work.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
