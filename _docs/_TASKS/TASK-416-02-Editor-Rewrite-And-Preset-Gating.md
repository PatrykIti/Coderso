# TASK-416-02: Editor Rewrite And Preset Gating
# FileName: TASK-416-02-Editor-Rewrite-And-Preset-Gating.md

**Parent Task:** TASK-416
**Priority:** High
**Category:** CMS Widgets / Timeline / Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-416-01
**Status:** ✅ Done
**Started:** 2026-06-07
**Completed:** 2026-06-07

---

## Overview

Rewrite `core/admin/ui/widgets/editors/TimelineEditors.tsx` against the new contract
from TASK-416-01. The Visual editor's visible option list must depend on the active
preset by reading `timelineVariantCapabilities[variant]`. Reuse existing shared
controls only — no new editor framework. Keep the single-shot Wizard → Visual →
Advanced model and good authoring UX (drag reorder + button fallback, date feedback,
contrast advisories, clear affordances, per-step grouping).

## Sub-Tasks

- [ ] **Wizard**: preset gallery built from `variants` + capability descriptions
      (one-shot setup) plus minimal header + starter step count/titles. Picking a
      preset applies the variant via `onVariantChange`/block patch.
- [ ] **Visual**: sections gated by `capability.visibleFields`; the axis-position
      control offers only `capability.allowedAxisPositions`; opposite-content fields
      appear only when `oppositeContent` is visible. Add `AxisPositionControl`,
      `DotVariantControl`, `DotToneControl` (token swatch select), and per-step
      `OppositeContent` fields. Reuse `TimelineSelectControl`, `TimelineInputControl`,
      `TimelineTextareaControl`, `ColorField`/`SharedColorControl`,
      `LinkDestinationField`, `WidgetEditorSection`/`WidgetControlRow`/
      `ReadonlyWidgetSummaryRow`.
- [ ] **Advanced**: read-only diagnostics (resolved preset/orientation, axis, dot
      tone/variant counts, step normalization, safe-link coverage, capability
      snapshot). All `writablePaths: []`.
- [ ] Ensure every mutating control keeps `data-widget-control*` metadata and the
      section `data-widget-editor-section` ids match `timelineEditorContract`.

## Implementation Pseudocode

```tsx
export function TimelineVisualEditor({ value, onChange, variant, onVariantChange, onBlockPatch }) {
  const cap = resolveTimelineCapability(variant);
  return (
    <>
      <EditorSection id="timeline.visual.preset-structure" mode="visual" role="visual" title="Preset and structure">
        <TimelineVariantGallery value={variant} onChange={onVariantChange} />     {/* 6 preset cards */}
        {cap.visibleFields.has("axisPosition") && cap.allowedAxisPositions.length > 1 ? (
          <AxisPositionControl value={value.axis?.position} allowed={cap.allowedAxisPositions} onChange={...} />
        ) : null}
        <StepCountControl ... />
      </EditorSection>

      <EditorSection id="timeline.visual.steps" mode="visual" role="content" title="Steps content and order">
        {steps.map((step, i) => (
          <StepFields step={step} showOpposite={cap.visibleFields.has("oppositeContent")} ... />
        ))}
      </EditorSection>

      <EditorSection id="timeline.visual.dots-connector" mode="visual" role="visual" title="Dots and connector">
        <DotVariantControl ... /> <DotToneControl ... /> <DotSizeControl ... />
        {cap.visibleFields.has("connector") ? <ConnectorControls ... /> : null}
      </EditorSection>

      <EditorSection id="timeline.visual.appearance" mode="visual" role="visual" title="Typography, spacing and background">
        <TypographyControls ... /> <SpacingControls ... /> <BackgroundColorField ... />
      </EditorSection>
    </>
  );
}
```

Data flow: controls call `onChange(nextData)` / `onVariantChange(nextVariant)`; the
capability table decides which controls mount, so a control is only shown when its
field is consumed by the active preset's renderer (kills the "option doesn't reflect
in canvas" bug). Wizard uses block-level variant patching (mirrors
`applyWizardSelection`).

Error handling: changing preset never drops step content; switching to a preset with
a narrower `allowedAxisPositions` lets normalize coerce the stored value; cleared
colors use the shared clear affordance.

Regression-test shape (TASK-416-03): per-preset section visibility, allowed-axis
gating, wizard gallery seeding, advanced read-only scope, control metadata presence.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`

## Documentation Updates Required

- Captured under TASK-416-04 (`_docs/_WIDGETS/TIMELINE.md` editor IA, `_docs/WIDGETS.md`).
