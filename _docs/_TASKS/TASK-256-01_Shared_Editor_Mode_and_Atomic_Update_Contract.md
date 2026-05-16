# TASK-256-01: Shared Editor Mode and Atomic Update Contract

# FileName: TASK-256-01_Shared_Editor_Mode_and_Atomic_Update_Contract.md

**Priority:** High
**Category:** Widgets + Page Builder + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256
**Status:** To Do

---

## Overview

Repair shared editor-mode update drift across `Wizard`, `Visual`, and
`Advanced`.

The main risk is that several editors write `variant` and `data` through
separate callbacks. When an editor owns variant selection and also normalizes
data for the new variant, the current `VisualPanel` spread-based callback can
drop one update. The Timeline report confirms this behavior, and other reports
show mode controls that look editable but either duplicate Visual or do nothing.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md:145` confirms that Advanced can
  change the timeline mode correctly while Visual races `onVariantChange`.
- `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md:162-171` reports Advanced always
  renders responsive height controls even when the widget variant is fixed.
- `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md:71-72` reports an Advanced variant
  select whose `onValueChange` is a no-op.
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:180-182` reports Advanced
  repeats Visual controls plus JSON without meaningful Advanced ownership.
- `_docs/WIDGETS.md:54-105` is the source contract for mode ownership and
  stable editor metadata.

## Sub-Tasks

- [ ] Add shared atomic block update helpers for builder panels.
- [ ] Replace spread-based `variant`/`data` callbacks in shared panels.
- [ ] Update widget-owned variant controls to emit a single atomic result when
  changing variant also changes normalized data.
- [ ] Convert no-op Advanced controls to working controls, read-only summaries,
  or remove them.
- [ ] Make Advanced controls variant-aware where the active variant changes what
  fields are meaningful.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/pages/builder/VisualPanel.tsx` | 94-99 | Replace `onChange({ ...block, data })` and `onChange({ ...block, variant: next })` with updater-style helpers that compose with the latest block state. |
| `core/admin/ui/pages/builder/WizardPanel.tsx` | 55-60 | Apply the same atomic helper contract for wizard-owned variant changes. |
| `core/admin/ui/pages/builder/AdvancedPanel.tsx` | 43-48 | Apply the same atomic helper contract for advanced-owned variant or data edits. |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | variant/change handlers | Emit a single variant+data update when timeline mode changes. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | 202-205 and Advanced editor render site | Pass the actual variant into `ResponsiveHeights` or render fixed-aware Advanced controls. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | 118-149 and Advanced variant select | Remove no-op `onValueChange` or wire it to real variant ownership. |
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | Advanced editor sections | Keep only true advanced fields or convert duplicated Visual controls into read-only diagnostics. |

## Implementation Pseudocode

```tsx
type BlockPatch =
  | Partial<WidgetBlock>
  | ((current: WidgetBlock) => WidgetBlock);

function applyWidgetBlockPatch(current: WidgetBlock, patch: BlockPatch): WidgetBlock {
  return typeof patch === "function" ? patch(current) : { ...current, ...patch };
}

function createBlockChangeHandlers(block: WidgetBlock, onChange: (next: WidgetBlock) => void) {
  return {
    updateData(nextData: Record<string, unknown>) {
      onChange(applyWidgetBlockPatch(block, (current) => ({ ...current, data: nextData })));
    },
    updateVariant(nextVariant: string) {
      onChange(applyWidgetBlockPatch(block, (current) => ({ ...current, variant: nextVariant })));
    },
    updateVariantAndData(nextVariant: string, nextData: Record<string, unknown>) {
      onChange(
        applyWidgetBlockPatch(block, (current) => ({
          ...current,
          variant: nextVariant,
          data: nextData,
        }))
      );
    },
  };
}
```

Widget editor shape:

```tsx
function TimelineVisualEditor({ value, variant, onChange, onVariantChange }: WidgetEditorProps<TimelineData>) {
  function handleModeChange(nextVariant: TimelineVariantId) {
    const nextData = normalizeTimelineDataForVariant(value, nextVariant);
    onVariantChange?.(nextVariant, nextData);
  }

  return <VariantCards value={variant} onChange={handleModeChange} />;
}
```

Error handling:

- If an editor receives an unsupported variant, normalize through the widget
  owner and keep the previous data fields that are still valid.
- If a widget cannot support atomic variant+data callback immediately, keep the
  public signature backward compatible and add an adapter in the shared panel.
- Do not add test-only fallbacks in widget editors.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin page-builder UI.
- Reject-unknown validation: unchanged unless a widget schema changes in a
  dependent leaf.
- Anti-abuse: not applicable.
- Secret handling: no secrets in editor mode payloads or diagnostics.

## Testing Requirements

- Update `tests/vitest/pageBuilder/visualPanel.test.tsx` for atomic
  variant+data updates.
- Update `tests/vitest/pageBuilder/wizardPanel.test.tsx` and
  `tests/vitest/pageBuilder/advancedPanel.test.tsx` for the shared callback
  contract.
- Update `tests/vitest/ui/timeline-editor-wave.test.tsx` to cover Visual mode
  changes preserving normalized timeline data.
- Update `tests/vitest/ui/spacer-editor-wave.test.tsx`,
  `divider-editor-wave.test.tsx`, and `split-layout-editor-wave.test.tsx` for
  no inert or misleading Advanced controls.
- Run the targeted Vitest suites plus `bun --cwd core lint` and
  `bun --cwd core lint:types`.

## Documentation Updates Required

- Update `_docs/WIDGETS.md` only if the editor prop contract changes.
- Update affected Playwright reports with fixed evidence.
- Update this task and `_docs/_TASKS/README.md` during status changes.

## Acceptance Criteria

- Timeline Visual mode changes no longer lose the paired data update.
- Shared panels support atomic data, variant, and variant+data updates.
- Advanced does not show controls that are editable-looking but inert.
- Spacer Advanced reflects fixed vs responsive variants.
- Tests prove the shared callback contract and the affected widget regressions.
