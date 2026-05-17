# TASK-288-02: Tabs Wizard Layout, Default Tab, and Slot Guidance

# FileName: TASK-288-02_Tabs_Wizard_Layout_Default_Tab_and_Slot_Guidance.md

**Priority:** High
**Category:** Widgets + Admin UI + Page Builder UX
**Estimated Effort:** Large
**Dependencies:** TASK-256-03, TASK-256-05-04, TASK-288
**Status:** To Do

---

## Overview

Add Tabs-specific Wizard guidance from
`_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows W2, U4, U5, and U9.

The Wizard currently edits variant, tab count, labels, descriptions, and the
default tab. It does not expose the two layout choices that define the most
visible Tabs shape, and it does not clearly explain the impact of changing tab
count on repeatable panel slots.

## Scope Boundary

This leaf may improve Tabs-specific editor copy and choices. It must not change
the shared repeatable-slot owner, shared slot deletion behavior, or public
placeholder policy. Friendly slot labels and placeholder gating remain
TASK-256-03 and TASK-256-05-04.

If a safe deletion preview requires shared page-builder slot metadata that does
not exist, split that helper to TASK-256 instead of adding a Tabs-only duplicate.

## Sub-Tasks

- [ ] Add a compact Wizard layout row for `options.orientation` and
  `options.alignment` using the same enum values as Visual.
- [ ] Show a default-tab preview marker beside the item currently selected by
  `defaultItemId`.
- [ ] Replace the confusing description placeholder with copy that matches the
  final TASK-288-04 decision (`Panel intro text`, `Trigger subtitle`, or a split
  pair of fields).
- [ ] Add panel-slot guidance that explains each tab owns a matching repeatable
  panel slot without exposing raw slot IDs as primary copy.
- [ ] When tab count is reduced, surface which tab labels/panels are removed
  before applying the change, or use the existing shared confirmation pattern if
  one exists.
- [ ] Preserve keyboard and screen-reader semantics of the editor controls.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | Add Wizard layout controls, default markers, slot guidance, and safe count-change impact copy. |
| `tests/vitest/ui/tabs-editor-wave.test.tsx` | Add Wizard coverage for layout changes, default markers, slot guidance, and count-reduction copy. |
| `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` | Only if this leaf touches shared slot-control rendering. |

## Implementation Pseudocode

```tsx
function TabsWizardLayoutSection({ value, onChange }: TabsSectionProps) {
  const normalized = normalizeTabsData(value);
  return (
    <WidgetEditorSection id="tabs.wizard-layout" title="Layout">
      <SegmentedSelect
        label="Orientation"
        value={normalized.options?.orientation ?? "horizontal"}
        options={orientationOptions}
        onChange={(orientation) => updateOptions(value, onChange, { orientation })}
      />
      <SegmentedSelect
        label="Alignment"
        value={normalized.options?.alignment ?? "start"}
        options={alignmentOptions}
        onChange={(alignment) => updateOptions(value, onChange, { alignment })}
      />
    </WidgetEditorSection>
  );
}

function resolveRemovedTabs(currentItems: NormalizedTabsItem[], nextCount: number) {
  if (nextCount >= currentItems.length) return [];
  return currentItems.slice(nextCount).map((item, index) => ({
    id: item.id,
    label: item.label || `Tab ${nextCount + index + 1}`,
  }));
}
```

Error handling:

- Invalid layout enum values still normalize through `normalizeTabsData()`.
- Count changes below `tabsItemMin` or above `tabsItemMax` continue to clamp.
- Removed-tab guidance must be derived from normalized item labels, not raw
  untrusted JSON.
- If confirmation is added, cancellation must leave the existing value
  unchanged.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless item metadata changes in a later
  leaf.
- Anti-abuse: editor guidance is plain text; do not render user-authored HTML
  from tab labels or descriptions.
- Secret handling: no secrets in diagnostics, labels, or slot guidance.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  only if shared slot controls change
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TABS.md` with Wizard layout and slot-guidance behavior.
- Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows W2, U4, U5, and U9 after
  validation.

## Changelog Policy

- Covered by the TASK-288 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- A beginner can set the Tabs orientation/alignment from Wizard without opening
  Visual.
- The selected default tab is visible in the item list.
- Tab-count reduction clearly communicates panel impact before data is removed.
- The leaf does not modify the shared repeatable-slot contract outside the
  existing owner.

