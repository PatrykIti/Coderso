# TASK-325-04: Grid Columns Cardize Control Gating

# FileName: TASK-325-04_Grid_Columns_Cardize_Control_Gating.md

**Priority:** Medium
**Category:** Shared Widgets + Grid Columns + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-325
**Status:** Done (2026-05-21)

---

## Overview

Hide or disable inactive Grid Columns cardize-only controls when cardized
styling is off.

This leaf closes the inactive-control drift only. It must not widen into the
conditional overflow-runtime decision or final docs closure.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Gate cardize-only controls truthfully when cardized styling is off or locked on by `masonry-lite`. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Cover hidden/disabled states and explanatory copy for cardize-only controls. |

## Implementation Pseudocode

```ts
function resolveCardizeControlsState(variant: GridColumnsVariantId, cardizeColumns: boolean) {
  if (variant === "masonry-lite") return { enabled: false, lockedOn: true };
  if (!cardizeColumns) return { enabled: false, lockedOn: false };
  return { enabled: true, lockedOn: false };
}
```

## Data Flow

1. Read the resolved variant and global `cardizeColumns` state.
2. Determine whether cardize-only controls should be editable, disabled with
   explanation, or hidden entirely.
3. Keep `masonry-lite` explicit as a locked-on runtime state instead of an
   editable toggle.

Error handling:

- Do not show active-looking controls that cannot affect the current runtime.
- Do not hide the `masonry-lite` lock reason; users need explicit explanatory
  copy.
- Do not collapse this work into unrelated surface or overflow tasks.

Regression-test shape:

```ts
test("grid columns disables cardize-only controls when cardized styling is off", () => {
  expect(resolveCardizeControlsState("equal", false)).toMatchObject({ enabled: false });
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_TASKS/TASK-325*.md`.

## Acceptance Criteria

- Cardize-only controls no longer appear active when they cannot affect runtime.
- `masonry-lite` remains locked on with truthful explanatory copy.

## Completion Notes (2026-05-21)

- Visual hides cardize-only global surface controls while cardized styling is off and explains how to enable them.
- Advanced disables the cardize-only selects until cardized styling is active, while `masonry-lite` keeps the lock reason explicit in both surfaces.
