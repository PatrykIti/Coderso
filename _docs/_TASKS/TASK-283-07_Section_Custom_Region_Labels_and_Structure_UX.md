# TASK-283-07: Section Custom Region Labels and Structure UX

# FileName: TASK-283-07_Section_Custom_Region_Labels_and_Structure_UX.md

**Priority:** Medium
**Category:** Widgets + Section + Slots + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-256-03, TASK-256-05-01, TASK-283, TASK-283-01
**Status:** To Do

---

## Overview

Add Section-owned custom region labels and structure affordances for repeatable
region slots.

This leaf covers report finding W4. It must preserve the existing
`region:<id>` slot storage model and must not re-open TASK-256 public
placeholder hiding.

## Scope Boundary

In scope:

- optional per-region editor labels that help authors distinguish repeated
  regions;
- normalized region metadata keyed by stable region instance ID;
- editor UI that lets authors rename regions without changing slot IDs or
  deleting child blocks, coordinated across `BlockSettings`,
  `VisualPanelSlotControls`, `BlockList`, and insert-slot option generation;
- optional safe data markers for runtime diagnostics only when they do not leak
  admin-only copy to public users;
- regression tests proving labels survive add/remove/reorder decisions.

Out of scope:

- changing `sectionRegionSlot.id` or the `region:<id>` slot ID contract;
- adding public captions for regions unless a future product leaf explicitly
  defines user-facing region headings;
- public `Empty region.` placeholder handling, owned by TASK-256;
- generic slot editor redesign outside Section.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:68` - W4 custom region names
  missing.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:16,42` - current repeatable region
  slot model.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:147-149` - add/remove min/max
  behavior already works and must be preserved.

## Sub-Tasks

- [ ] Define a `regions` metadata object or array under `SectionData` that maps
  stable region instance IDs to author labels without replacing the slot map.
- [ ] Add normalizer logic that keeps metadata for existing slots and ignores or
  prunes orphan labels only through an explicit safe rule.
- [ ] Add editor controls for region labels by extending the current
  `BlockSettings` -> `VisualPanelSlotControls` projection, or by passing an
  explicit Section-owned slot metadata callback; do not assume
  `WidgetEditorContext` already exposes slot targets.
- [ ] Use `section.tsx` as the persisted metadata owner and add a small pure
  Section slot-label resolver that shared builder owners can call without
  learning Section internals.
- [ ] Use `BlockSettings.tsx` as the edit projection owner: resolve slot
  targets, derive editor fallback labels, pass editable label values into
  `VisualPanelSlotControls.items`, and write changes back to
  `block.data.regions` without recreating `block.slots`.
- [ ] Thread the same derived labels through `BlockList.tsx` and insert-slot
  options so canvas slot labels, empty-slot add buttons, and the
  `WidgetInsertDialog` target selector do not keep showing stale generic
  `Region N` labels after a Section region is renamed.
- [ ] Render labels only in admin/editor affordances unless a user-facing region
  caption field is explicitly added in a future leaf.
- [ ] Add tests for label normalization, add/remove behavior, builder slot-label
  projection, VisualPanel rename controls, and no public admin-copy leakage.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Extend schema/types/defaults/normalizer with region metadata and safe render markers if needed. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add region label controls or integrate with existing slot target context. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Current owner of `resolveWidgetSlotTargets(...)` for block slot targets; extend only if Section labels must flow through shared repeatable slot metadata. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | Current `VisualPanelSlotControls` owner; extend only if the shared slot controls need label edit callbacks. |
| `core/admin/ui/pages/builder/BlockList.tsx` | Use the same Section slot-label resolver when rendering nested slot labels and empty-slot insert buttons. |
| `core/admin/ui/widgets/widgetInsertUtils.ts` | Use the same Section slot-label resolver when building target slot options for a selected Section block. |
| `core/admin/ui/widgets/WidgetInsertDialog.tsx` | Keep target-slot copy truthful through `buildSlotOptions`; touch only if the existing option contract needs additive metadata. |
| `tests/vitest/widgets/section.test.tsx` | Add normalization/render assertions for custom labels and public leakage. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Add editor coverage for label editing and metadata preservation. |
| `tests/vitest/pageBuilder/blockSettings-wave.test.tsx` | Add coverage that BlockSettings derives editable Section slot labels from `block.data.regions` and writes changes without replacing slots. |
| `tests/vitest/pageBuilder/visualPanel.test.tsx` | Add coverage for the rendered rename control/callback contract in `VisualPanelSlotControls.items`. |
| `tests/vitest/pageBuilder/blockList.test.tsx` | Add coverage that nested Section slot labels and empty-slot add copy use custom region labels. |
| `tests/vitest/ui/widgetInsertUtils.test.ts` | Add coverage that `buildSlotOptions` returns custom Section region labels without changing slot ids/counts/disabled behavior. |
| `tests/vitest/ui/page-editor-slot-insert-flow.test.tsx` | Run or update if `WidgetInsertDialog` target-slot rendering changes beyond the pure option helper. |

## Implementation Pseudocode

Data model:

```ts
type SectionRegionMeta = {
  id: string;
  label?: string;
};

type SectionData = {
  regions?: SectionRegionMeta[];
};
```

Normalizer flow:

```ts
function normalizeSectionRegions(
  regions: unknown
): SectionRegionMeta[] {
  return parseRegionMeta(regions).map((region) => ({
    id: normalizeRegionInstanceId(region.id),
    label: normalizePlainText(region.label),
  })).filter((region) => region.id.length > 0);
}

function resolveSectionSlotLabel(
  slot: ResolvedWidgetSlot,
  regions: SectionRegionMeta[]
): string {
  const id = slot.instanceId ?? parseRepeatableSlotId(slot.slotId)?.instanceId ?? "";
  const label = regions.find((region) => region.id === id)?.label?.trim();
  return label || slot.label;
}

function resolveSectionSlotLabelsForBlock(block: BlockLike): Map<string, string> {
  const regions = normalizeSectionRegions(block.data?.regions);
  return new Map(
    resolveWidgetSlotTargets([sectionRegionSlot], getSlotMap(block)).map((slot) => [
      slot.slotId,
      resolveSectionSlotLabel(slot, regions),
    ])
  );
}

function updateSectionRegionLabel(block: Block, slotId: string, label: string): Block {
  const parsed = parseRepeatableSlotId(slotId);
  if (!parsed) return block;
  return {
    ...block,
    data: {
      ...block.data,
      regions: upsertRegionMeta(block.data.regions, parsed.instanceId, label),
    },
  };
}
```

Error handling:

- Labels are plain text and trimmed; empty labels fall back to `Region N` in the
  editor only.
- Unknown region IDs in metadata are ignored in render and preserved only if the
  existing editor pattern preserves legacy slot metadata.
- Region label edits must not recreate slot IDs or reorder child content.
- If shared slot controls are extended, keep the change additive so other
  widget editors that use `WidgetEditorContext` continue to import without slot
  metadata requirements.
- If `BlockList` or insert-slot helpers are updated, preserve existing slot
  IDs, item counts, disabled reasons, drag/drop payloads, and allowed-type
  checks; only the display label should change.
- Removing a region slot should not delete unrelated metadata immediately unless
  the normalizer or projection has a tested orphan-pruning rule.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: region metadata fields must be schema-bound with
  `additionalProperties: false`.
- Anti-abuse: labels are plain text only; no raw HTML, script, event handlers,
  arbitrary classes, or secret-bearing diagnostics.
- Secret handling: no secrets in region labels or metadata.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockList.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/widgetInsertUtils.test.ts`
- `bun run test:vitest -- tests/vitest/ui/page-editor-slot-insert-flow.test.tsx` if
  `WidgetInsertDialog` rendering changes beyond the pure option helper.
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/SECTION.md` with region-label behavior and public/admin
  boundary.
- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` row W4 after validation.
- Update `_docs/WIDGETS.md` only if the shared repeatable slot contract changes.

## Acceptance Criteria

- Authors can name Section regions without changing slot IDs or losing child
  blocks.
- Public runtime does not leak editor-only labels unless a later explicit
  user-facing caption contract is added.
- Tests prove label normalization, editor updates, and slot compatibility.
