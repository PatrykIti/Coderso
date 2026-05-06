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
- full typed `needs_input` surfacing for the broader conflict families remains
  open.

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
export const resolveBlueprintConflicts = (graph, context) => {
  const conflicts = detectConflicts(graph, context);
  const resolved = conflicts.map((conflict) =>
    canAutoResolve(conflict) ? autoResolve(conflict) : conflict
  );
  return unresolved(resolved).length > 0
    ? buildNeedsInputCompositionPlan(resolved)
    : applyConflictResolutions(graph, resolved);
};
```

## Security Contract

- Visibility: internal planning.
- Auth model: unchanged.
- RBAC: permission gaps cannot auto-resolve.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: conflict objects strict.
- Anti-abuse: destructive/privileged conflicts always need input.
- Secret handling: conflict messages redact secret-like fields.

## Testing Requirements

- Slug collision test.
- Field type mismatch test.
- Route collision test.
- Permission gap test.
- Gated module test.
- Media conflict tests for missing asset id, ambiguous filename/label matches,
  attached files that need media import first, and asset deletion requests that
  lack an executable media-service action.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
