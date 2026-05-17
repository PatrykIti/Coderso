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
  deleting child blocks;
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

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:63` - W4 custom region names
  missing.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:35-36` - current repeatable region
  slot model.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:146-153` - add/remove min/max
  behavior already works and must be preserved.

## Sub-Tasks

- [ ] Define a `regions` metadata object or array under `SectionData` that maps
  stable region instance IDs to author labels without replacing the slot map.
- [ ] Add normalizer logic that keeps metadata for existing slots and ignores or
  prunes orphan labels only through an explicit safe rule.
- [ ] Add editor controls for region labels near the builder-owned repeatable
  slot controls or in a Section-owned structure panel, following existing
  `WidgetEditorContext.slotTargets` patterns if available.
- [ ] Render labels only in admin/editor affordances unless a user-facing region
  caption field is explicitly added in a future leaf.
- [ ] Add tests for label normalization, add/remove behavior, and no public
  admin-copy leakage.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Extend schema/types/defaults/normalizer with region metadata and safe render markers if needed. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add region label controls or integrate with existing slot target context. |
| `core/admin/ui/pages/builder/BlockSettings.tsx` | Touch only if Section labels must flow through shared repeatable slot target metadata. |
| `tests/vitest/widgets/section.test.tsx` | Add normalization/render assertions for custom labels and public leakage. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Add editor coverage for label editing and metadata preservation. |

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
  regions: unknown,
  slotTargets: Array<{ slotId: string }>
): SectionRegionMeta[] {
  const existingById = new Map(parseRegionMeta(regions).map((region) => [region.id, region]));
  return slotTargets.map((target, index) => {
    const id = parseRepeatableSlotId(target.slotId)?.instanceId ?? String(index + 1);
    return {
      id,
      label: normalizePlainText(existingById.get(id)?.label),
    };
  });
}
```

Error handling:

- Labels are plain text and trimmed; empty labels fall back to `Region N` in the
  editor only.
- Unknown region IDs in metadata are ignored in render and preserved only if the
  existing editor pattern preserves legacy slot metadata.
- Region label edits must not recreate slot IDs or reorder child content.

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
- `bun --cwd core lint`
- `bun --cwd core lint:types`
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
