# TASK-190-06-01: Admin Screen Layout Composer
# FileName: TASK-190-06-01_Admin_Screen_Layout_Composer.md

**Priority:** High
**Category:** Assistant/Core + Custom Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-190-03-01, TASK-190-04
**Status:** Done (2026-05-10)

---

## Overview

Compose custom screen blocks from multiple capabilities into one coherent admin
surface.

The output remains a normal custom-screen definition. This leaf must compose
with widgets allowed by the current `custom-screen-builder` surface contract and
preserve compatibility with existing catalog/admin screen layouts.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintAdminSurfaceComposer.ts`
- Update `core/admin/ui/widgets/registry.ts` only if the current screen-widget
  surface needs a small helper seam for composer eligibility checks
- Add `tests/vitest/assistant/blueprint-admin-surface-composer.test.ts`

## Pseudocode

```ts
export const composeAdminSurface = (graph) => {
  const groups = groupAdminContributions(graph.adminSections);
  return {
    blocks: groups.flatMap(toScreenBlocks),
  };
};
```

`composeAdminSurface(...)` returns the persisted custom-screen definition
surface only. It must not invent a new top-level `layout` field unless a later
task explicitly extends the current custom-screen schema/service/API contract.

## Security Contract

- Visibility: internal admin planning.
- Auth model: unchanged.
- RBAC: custom screen write permissions unchanged.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: screen blocks pass custom screen schema.
- Anti-abuse: no raw entry payloads.
- Secret handling: secret fields excluded from screen values.

## Testing Requirements

- Merge admin groups.
- Stable block ids.
- Preserve current catalog screen output.
- Reject missing field references.
- Composed blocks stay inside the current `custom-screen-builder` widget surface
  contract.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/ARCHITECTURE.md`

## Completion Notes

- Added `blueprintAdminSurfaceComposer.ts` as the `TASK-190-06-01` owner seam
  for deterministic custom-screen block composition.
- The composer merges repeated admin group keys, validates referenced content
  schema fields, rejects secret-like field references, and verifies generated
  blocks stay inside the current `custom-screen-builder` widget surface.
- Catalog-family custom-screen blocks now use the shared composer while keeping
  the existing `custom-screen.upsert` `blocks` / `bindings` transport shape.
