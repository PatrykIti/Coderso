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
drop one update. The Timeline, Feature Grid, Split Layout, and Stack reports
confirm the same variant-bound data class. Other reports show mode controls
that look editable but either duplicate Visual or do nothing.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md:145` confirms that Advanced can
  change the timeline mode correctly while Visual races `onVariantChange`.
- `_docs/PLAYWRIGHT/REPORT_FEATURE_GRID_WIDGET.md:74-83,171-176` confirms that
  variant changes and card counts can diverge between editor and renderer.
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:95,161` confirms
  variant-bound ratio/data desync for split layout.
- `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md:111` confirms
  variant-bound direction/data desync for stack.
- `_docs/PLAYWRIGHT/REPORT_SPACER_WIDGET.md:162-171` reports Advanced always
  renders responsive height controls even when the widget variant is fixed.
- `_docs/PLAYWRIGHT/REPORT_DIVIDER_WIDGET.md:71-72` reports an Advanced variant
  select whose `onValueChange` is a no-op.
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:180-182` reports Advanced
  repeats Visual controls plus JSON without meaningful Advanced ownership.
- `_docs/PLAYWRIGHT/REPORT_GALLERY_MOSAIC_WIDGET.md:48,153,226-227`,
  `_docs/PLAYWRIGHT/REPORT_LOGO_CLOUD_WIDGET.md:94-100`, and
  `_docs/PLAYWRIGHT/REPORT_STATS_KPI_WIDGET.md:82-89` report duplicated
  Advanced style controls that need an explicit owner decision.
- `_docs/WIDGETS.md:54-105` is the source contract for mode ownership and
  stable editor metadata.

## Sub-Tasks

- [ ] Add shared atomic block update helpers for builder panels.
- [ ] Thread the atomic patch callback through every live `BlockSettings` host:
  `PageEditor`, `CustomScreenEditorPage`, `DetailTemplateEditorPage`,
  `WidgetTemplateEditorPage`, and `WidgetDetailsDrawer`, then into
  `WizardPanel`, `VisualPanel`, and `AdvancedPanel`.
- [ ] Replace spread-based `variant`/`data` callbacks in shared panels.
- [ ] Update widget-owned variant controls to emit a single atomic result when
  changing variant also changes normalized data.
- [ ] Cover variant-bound data sync for feature-grid, split-layout, stack,
  timeline, stats-kpi, logo-cloud, and gallery-mosaic editors before widget
  leaves rely on shared helpers.
- [ ] Convert no-op Advanced controls to working controls, read-only summaries,
  or remove them.
- [ ] Make Advanced controls variant-aware where the active variant changes what
  fields are meaningful.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/widgets/types.ts` | 40-49 | Extend the editor prop contract with a backward-compatible atomic block patch callback, for example `onBlockPatch?: (patch: WidgetBlockPatch) => void`; do not overload the current one-argument `onVariantChange(next: string)` signature. |
| `core/admin/ui/pages/PageEditor.tsx` | 741, 970, 1205 | Add an updater-style block patch path through `handleChangeBlock`/`updateBlockById` and pass it to `BlockSettings` so panels compose edits against the latest block state. |
| `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx` | 359 and `BlockSettings` usage | Apply the same updater-style block patch path for Custom Screens so shared panel callbacks do not use stale block snapshots. |
| `core/admin/ui/content-types/DetailTemplateEditorPage.tsx` | 589 and `BlockSettings` usage | Apply the same updater-style block patch path for Detail Templates so shared panel callbacks do not use stale block snapshots. |
| `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx` | 782 and `BlockSettings` usage | Pass `onBlockPatch` through the widget template editor host so template block edits use the same atomic path as page/custom-screen/detail-template editors. |
| `core/admin/ui/widgets/WidgetDetailsDrawer.tsx` | 32 and preview `BlockSettings` usage | Pass `onBlockPatch` through the isolated preview host so the shared panel API is covered everywhere `BlockSettings` renders. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | 19-23, 157-162, 207-229 | Add `onBlockPatch` to `BlockSettingsProps`, adapt local slot/editor updates through it, and pass the callback into Wizard, Visual, and Advanced panels. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | 94-99 | Replace `onChange({ ...block, data })` and `onChange({ ...block, variant: next })` with updater-style helpers that compose with the latest block state. |
| `core/admin/ui/pages/builder/WizardPanel.tsx` | 55-60 | Apply the same atomic helper contract for wizard-owned variant changes. |
| `core/admin/ui/pages/builder/AdvancedPanel.tsx` | 43-48 | Apply the same atomic helper contract for advanced-owned variant or data edits. |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | variant/change handlers | Emit a single variant+data update when timeline mode changes. |
| `core/admin/ui/widgets/editors/FeatureGridEditors.tsx` | 435-455 and variant/count handlers | Emit variant+item-count updates atomically or disable item counts that the renderer ignores. |
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | variant/ratio handlers | Preserve ratio data when variant changes and expose only ratio controls that affect the active variant. |
| `core/admin/ui/widgets/editors/StackEditors.tsx` | variant/direction handlers | Preserve direction data when variant changes and make Advanced direction ownership explicit. |
| `core/admin/ui/widgets/editors/SpacerEditors.tsx` | 202-205 and Advanced editor render site | Pass the actual variant into `ResponsiveHeights` or render fixed-aware Advanced controls. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | 118-149 and Advanced variant select | Remove no-op `onValueChange` or wire it to real variant ownership. |
| `core/admin/ui/widgets/editors/GalleryMosaicEditors.tsx` | Advanced style controls | Keep only true raw-token controls in Advanced or mark the duplicated Visual controls as read-only diagnostics. |
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Advanced style controls | Keep only true raw-token controls in Advanced or mark the duplicated Visual controls as read-only diagnostics. |
| `core/admin/ui/widgets/editors/StatsKpiEditors.tsx` | Advanced style controls | Keep only true raw-token controls in Advanced or mark the duplicated Visual controls as read-only diagnostics. |

## Implementation Pseudocode

```tsx
type WidgetBlockPatch =
  | Partial<WidgetBlock>
  | ((current: WidgetBlock) => WidgetBlock);

function applyWidgetBlockPatch(current: WidgetBlock, patch: WidgetBlockPatch): WidgetBlock {
  return typeof patch === "function" ? patch(current) : { ...current, ...patch };
}

function createBlockChangeHandlers(onBlockPatch: (patch: WidgetBlockPatch) => void) {
  return {
    updateData(nextData: Record<string, unknown>) {
      onBlockPatch((current) => ({ ...current, data: nextData }));
    },
    updateVariant(nextVariant: string) {
      onBlockPatch((current) => ({ ...current, variant: nextVariant }));
    },
    updateVariantAndData(nextVariant: string, nextData: Record<string, unknown>) {
      onBlockPatch((current) => ({ ...current, variant: nextVariant, data: nextData }));
    },
  };
}
```

Routing through the live owner chain:

```tsx
type BlocksPatch = Block[] | ((currentBlocks: Block[]) => Block[]);

function updateBlocks(patch: BlocksPatch) {
  setBlocks((currentBlocks) => {
    const nextBlocks =
      typeof patch === "function" ? patch(currentBlocks) : patch;
    setPageData((currentPage) => ({ ...currentPage, blocks: nextBlocks }));
    setUnsavedChanges(true);
    return nextBlocks;
  });
}

function handlePatchBlock(id: string, patch: WidgetBlockPatch) {
  updateBlocks((currentBlocks) =>
    updateBlockById(currentBlocks, id, (current) => applyWidgetBlockPatch(current, patch))
  );
}

<BlockSettings
  block={selectedBlock}
  widget={selectedWidget}
  onChange={handleChangeBlock}
  onBlockPatch={(patch) => selectedBlock ? handlePatchBlock(selectedBlock.id, patch) : undefined}
/>

function BlockSettings({ block, onChange, onBlockPatch }: BlockSettingsProps) {
  const patchBlock = onBlockPatch ?? ((patch) => onChange(applyWidgetBlockPatch(block, patch)));
  return <VisualPanel block={block} onBlockPatch={patchBlock} onChange={onChange} />;
}
```

Widget editor shape:

```tsx
function TimelineVisualEditor({
  value,
  variant,
  onChange,
  onVariantChange,
  onBlockPatch,
}: WidgetEditorProps<TimelineData>) {
  function handleModeChange(nextVariant: TimelineVariantId) {
    const nextData = normalizeTimelineDataForVariant(value, nextVariant);
    if (onBlockPatch) {
      onBlockPatch((current) => ({ ...current, variant: nextVariant, data: nextData }));
      return;
    }
    onVariantChange?.(nextVariant);
    onChange(nextData);
  }

  return <VariantCards value={variant} onChange={handleModeChange} />;
}
```

Error handling:

- If an editor receives an unsupported variant, normalize through the widget
  owner and keep the previous data fields that are still valid.
- Keep the existing `onVariantChange(next: string)` signature backward
  compatible for editors that only change the variant. Atomic variant+data edits
  use the new block patch callback.
- Do not add test-only fallbacks in widget editors.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin page-builder UI.
- Reject-unknown validation: unchanged unless a widget schema changes in a
  dependent leaf.
- Anti-abuse: not applicable.
- Secret handling: no secrets in editor mode payloads or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/wizardPanel.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/advancedPanel.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/feature-grid-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/WIDGETS.md` only if the editor prop contract changes.
- Update affected Playwright reports with fixed evidence.
- Update this task and `_docs/_TASKS/README.md` during status changes.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Timeline Visual mode changes no longer lose the paired data update.
- Shared panels support atomic data, variant, and variant+data updates.
- Advanced does not show controls that are editable-looking but inert.
- Spacer Advanced reflects fixed vs responsive variants.
- Tests prove the shared callback contract and the affected widget regressions.
