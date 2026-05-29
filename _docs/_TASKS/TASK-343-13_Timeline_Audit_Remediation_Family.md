# TASK-343-13: Timeline Audit Remediation Family

# FileName: TASK-343-13_Timeline_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Timeline + Admin UI + UX + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close the confirmed Timeline editor drift where the variant cards and the
`Timeline mode` select represent the same concept but do not update state the
same way.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_TIMELINE_WIDGET.md:184-202`
- `core/admin/ui/widgets/editors/TimelineEditors.tsx:507-519,767-770,1479-1488`
- `core/widgets/core/timeline.tsx:606-627,1389-1423`

## Sub-Tasks

- [ ] Make the mode select call the same state-updater contract as the visual
  mode cards.
- [ ] Remove duplicate semantics if one of the controls cannot be kept truthful.
- [ ] Add regression coverage for mode/variant coupling.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Unify mode-card and mode-select behavior. |
| `tests/vitest/ui/timeline-editor-wave.test.tsx` | Cover select/card parity. |
| `tests/vitest/widgets/timeline.test.tsx` | Cover normalized mode/variant output. |

## Implementation Pseudocode

```ts
function updateMode(
  value: TimelineData,
  onChange: OnChange<TimelineData>,
  next: TimelineMode,
  onVariantChange?: (variant: string) => void,
  onBlockPatch?: (patch: Partial<WidgetBlock>) => void
) {
  // Both control surfaces must flow through the same helper.
}
```

## Regression Test Shape

- Cards and select yield the same `mode` + `variant` state.
- Advanced summary matches the normalized state after either control path.

## Security Contract

No API routes are added.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_TIMELINE_WIDGET.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Timeline mode controls no longer diverge in saved state.

