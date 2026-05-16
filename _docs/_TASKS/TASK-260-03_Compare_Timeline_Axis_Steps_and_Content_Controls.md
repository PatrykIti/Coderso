# TASK-260-03: Compare Timeline Axis Steps and Content Controls

# FileName: TASK-260-03_Compare_Timeline_Axis_Steps_and_Content_Controls.md

**Priority:** High
**Category:** Widgets + Admin UI + Data Model
**Estimated Effort:** Large
**Dependencies:** TASK-260, TASK-260-01, TASK-260-02
**Status:** To Do

---

## Overview

Add Compare Timeline-specific axis and step-content controls from
`REPORT_COMPARE_TIMELINE_WIDGET.md`.

This leaf covers C4, C5, W6, W10, and W12. It keeps the axis model bounded and
schema-owned instead of creating a generic timeline/content-list contract.

## Sub-Tasks

- [ ] Add Visual editor `Add step` and `Remove step` buttons near the axis step
  count control, with min/max disabled states.
- [ ] Add Wizard/Visual step `description` fields so editors do not need
  Advanced mode for user-facing descriptions.
- [ ] Decide whether the step-count range should expand beyond `3-6`; if yes,
  update constants, schema `maxItems`, normalizer, renderer grid behavior, and
  tests together.
- [ ] Add optional step icon/emoji fields only if the final contract keeps them
  plain-text, bounded, and renderer-safe.
- [ ] Add optional safe CTA/link fields for steps or segments only if they use
  the existing safe-href helper and do not create a public write flow.
- [ ] Keep old payloads with label-only steps rendering exactly as before.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/compareTimeline.tsx` | Extend `CompareAxisStep` and schema only for approved fields; update constants/normalizer/render if range/icons/links are added. |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Add Visual add/remove step buttons and Wizard/Visual description controls; add optional icon/link controls only after schema is finalized. |
| `tests/vitest/widgets/compareTimeline.test.tsx` | Add schema/normalizer/render coverage for descriptions, new step range, icons, and safe links where implemented. |
| `tests/vitest/ui/compare-timeline-editor-wave.test.tsx` | Add editor-flow coverage for Visual buttons, min/max disabled state, and Wizard/Visual description editing. |
| `tests/unit/widgets/validator.test.ts` | Run and update when schema/defaults change. |

## Implementation Pseudocode

```tsx
function AxisStepCountControls({ value, onChange }: AxisStepCountControlProps) {
  const normalized = normalizeCompareTimelineData(value);
  const count = normalized.axis.steps.length;

  return (
    <div>
      <Select value={String(count)} onValueChange={(next) => setAxisStepCount(value, onChange, Number(next))} />
      <Button disabled={count <= compareAxisStepMin} onClick={() => removeAxisStep(value, onChange)}>
        Remove step
      </Button>
      <Button disabled={count >= compareAxisStepMax} onClick={() => addAxisStep(value, onChange)}>
        Add step
      </Button>
    </div>
  );
}

function updateAxisDescription(index: number, description: string) {
  updateAxisStep(value, onChange, index, { description });
}
```

Data flow:

1. `setAxisStepCount()` remains the single path for add/remove/dropdown changes.
2. The normalizer clamps step count and trims optional user-facing fields.
3. Markers and segments are re-normalized after step-count changes so indexes
   remain valid.
4. Optional safe links render only through the existing safe-href output helper.

Error handling:

- Min/max buttons are disabled and no-op at bounds.
- Empty descriptions normalize to `undefined`.
- Optional icon values must be bounded text; invalid link protocols must be
  dropped or rejected through the existing safe-href contract.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new step fields and expanded count limits must be
  represented in schema and validator tests.
- Anti-abuse: optional links must use existing safe-href normalization; icons
  remain plain text and no raw HTML/script is allowed.
- Secret handling: no secrets in widget data, links, diagnostics, or report
  evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if rendered
  link/icon output changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` rows C4, C5, W6,
  W10, and W12 after validation.
- Update `_docs/_WIDGETS/COMPARE_TIMELINE.md` data model and editor mode notes
  for axis descriptions, count limits, and optional icon/link support.
- Update `_docs/WIDGETS.md` only if the accepted step-control model becomes a
  shared widget contract.

## Changelog Policy

- Covered by the TASK-260 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Visual editor offers add/remove step buttons with correct guard rails.
- Wizard/Visual editors can edit rendered step descriptions.
- Any expanded step count, icon, or link field is schema-owned, normalized,
  tested, and documented.
- Existing label-only Compare Timeline payloads stay compatible.
