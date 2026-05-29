# TASK-343-07: Feature Grid Audit Remediation Family

# FileName: TASK-343-07_Feature_Grid_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Feature Grid + Admin UI + A11y + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close the Feature Grid editor drift where emoji quick actions are physically
unclickable and card-count reduction silently destroys content.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_FEATURE_GRID_WIDGET.md:203-215`
- `core/admin/ui/widgets/editors/FeatureGridEditors.tsx:359-411,739-742,964-1026,1152+`
- `core/widgets/core/featureGrid.tsx:423-466,654-724`

## Sub-Tasks

- [ ] Fix the card editor layout so emoji quick actions are not covered by the
  image picker at normal desktop widths.
- [ ] Add destructive-state confirmation or recovery semantics to count
  reduction, not only per-card remove.
- [ ] Preserve card data when count is temporarily reduced and restored, or make
  the destruction explicit and confirmed.
- [ ] Add a section accessible name for the public `<section>` container.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | Fix emoji button hit targets and destructive count-reduction UX. |
| `core/widgets/core/featureGrid.tsx` | Add an accessible section naming fallback if no labeled heading is present. |
| `tests/vitest/widgets/featureGrid.test.tsx` | Cover accessible naming and data-preservation or destructive-confirmation semantics. |
| `tests/vitest/ui/feature-grid-editor-wave.test.tsx` | Cover emoji button clickability and count-reduction UX. |

## Implementation Pseudocode

```ts
function setItemsCountSafely(current: FeatureGridData, nextCount: number) {
  if (nextCount < current.items.length) {
    return { mode: "confirm-truncate", nextCount };
  }
  return expandItemsPreservingExistingData(current.items, nextCount);
}
```

## Regression Test Shape

- Real mouse clicks reach every emoji quick button.
- Reducing card count does not silently destroy card content.
- The rendered section has an accessible name.

## Security Contract

No API routes are added. Existing URL/media safety checks stay intact.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/featureGrid.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_FEATURE_GRID_WIDGET.md`.
- Update `_docs/_WIDGETS/FEATURE_GRID.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Emoji quick actions are directly clickable.
- Count reduction is no longer a silent destructive path.
- Public Feature Grid sections expose an accessible name.

