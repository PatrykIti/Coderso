# TASK-252-05: Layout and Structural Widget Editor Parity

# FileName: TASK-252-05_Layout_and_Structural_Widget_Editor_Parity.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Apply the shared TASK-252 inspector IA to layout and structural Pages widgets.

These widgets shape the page but should not become noisy expert panels. Section
is the baseline because it already groups options into clear sections; the rest
of the layout/structural family should follow the same model while keeping
simple widgets intentionally simple through research-backed decisions.

## Widgets In Scope

- `section`
- `template-section`
- `grid-columns`
- `split-layout`
- `stack`
- `spacer`
- `divider`
- `tabs`
- `accordion`
- `toggle-block`

## Business Requirements

- Move `section` repeatable region controls into a named `Regions` or `Slots`
  section instead of the global top panel.
- Keep `section` as the IA reference:
  - Variant and structure;
  - Heading and intro;
  - Semantics and anchor;
  - Surface and borders;
  - Regions.
- Keep simple utility widgets simple:
  - `spacer` and `divider` should not gain unnecessary marketing features;
  - they should expose clear rhythm/visibility controls and strong labels.
- Use the completed `_docs/_WIDGETS/tmp/<widget>/` research archive for every
  widget in this family. Each implementation leaf must cite the widget-local
  Keep/Adapt/Reject matrix before finalizing its option list.
- Expand structural widgets only where it improves real page-building
  flexibility:
  - `template-section`: template reference plus category, preview label, and
    version metadata; sync/detach remains conditional on a reusable-template
    runtime/service owner.
  - `grid-columns`: simple column presets, gaps, and mobile stacking; advanced
    span/offset work is conditional.
  - `split-layout`: two slots, media/content orientation, and mobile stack
    order; ratio/span systems stay conditional.
  - `stack`: flow direction, gap, alignment, and responsive direction; nested
    layout expansion stays conditional.
  - `tabs`: horizontal/vertical mode, default tab, existing panel surface/style
    preservation, keyboard semantics; new visual panel variants stay Adapt-only.
  - `accordion`: `openMode`, `defaultOpenIds`, `collapsible`, and accessible
    disclosure behavior; panel style stays conditional.
  - `toggle-block`: comparison/toggle states, labels, default state, and
    existing panel presentation; new card/panel presentation stays Adapt-only.
- Add missing `_docs/_WIDGETS` docs for:
  - `tabs`
  - `accordion`
  - `toggle-block`
- Preserve existing slot, children, and legacy `children -> slots.default`
  compatibility from the page model.

## Sub-Tasks

This parent is now executed through physical per-widget leaves. Do not implement this parent as one broad batch; complete the leaves below in dependency order.

- [ ] TASK-252-05-01: Section Regions Semantics and Spacing
- [ ] TASK-252-05-02: Template Section Metadata Preview and Sync
- [ ] TASK-252-05-03: Grid Columns Presets Gaps and Mobile Stack
- [ ] TASK-252-05-04: Split Layout Slot Order and Mobile Stack
- [ ] TASK-252-05-05: Stack Direction Gap Alignment and Responsive Flow
- [ ] TASK-252-05-06: Spacer Size Tokens Custom Height and Canvas Affordance
- [ ] TASK-252-05-07: Divider Orientation Style Tone and Spacing
- [ ] TASK-252-05-08: Tabs Accessible Panels Default Tab and Surface
- [ ] TASK-252-05-09: Accordion Disclosure Default Open and Accessibility
- [ ] TASK-252-05-10: Toggle Block State Switch and Accessible Content Swap

## Files to Change

- `core/admin/ui/widgets/editors/SectionEditors.tsx`
- `core/admin/ui/widgets/editors/TemplateSectionEditors.tsx`
- `core/admin/ui/widgets/editors/GridColumnsEditors.tsx`
- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
- `core/admin/ui/widgets/editors/StackEditors.tsx`
- `core/admin/ui/widgets/editors/SpacerEditors.tsx`
- `core/admin/ui/widgets/editors/DividerEditors.tsx`
- `core/admin/ui/widgets/editors/TabsEditors.tsx`
- `core/admin/ui/widgets/editors/AccordionEditors.tsx`
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
- Matching widget contracts under `core/widgets/core/*.tsx` when schema/defaults
  or render output changes.
- Existing `_docs/_WIDGETS/tmp/<widget>/README.md` and `MATRIX.md` as evidence
  references; update them only if implementation finds a concrete research
  mismatch.
- `_docs/_WIDGETS/SECTION.md`
- `_docs/_WIDGETS/TEMPLATE_SECTION.md`
- `_docs/_WIDGETS/GRID_COLUMNS.md`
- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/_WIDGETS/STACK.md`
- `_docs/_WIDGETS/SPACER.md`
- `_docs/_WIDGETS/DIVIDER.md`
- new docs:
  - `_docs/_WIDGETS/TABS.md`
  - `_docs/_WIDGETS/ACCORDION.md`
  - `_docs/_WIDGETS/TOGGLE_BLOCK.md`

## Implementation Pseudocode

Use the shared editor sections from TASK-252-01.

```tsx
const SECTION_ELEMENTS = [
  { id: "section", label: "Section" },
  { id: "div", label: "Generic region" },
];

function SectionVisualEditor(props: WidgetEditorProps<SectionData>) {
  const value = props.value;

  return (
    <>
      <WidgetEditorSection id="section.semantics" title="Semantics and anchor">
        <WidgetControlRow id="section.semantics.element" label="Element" data-widget-control="section.semantics.element">
          <SegmentedControl
            options={SECTION_ELEMENTS}
            value={value.semantics?.element ?? "section"}
            onChange={(element) => props.onChange(updateSectionSemantics(value, { element }))}
          />
        </WidgetControlRow>
        <WidgetControlRow id="section.semantics.anchorId" label="Anchor" data-widget-control="section.semantics.anchorId">
          <Input value={value.semantics?.anchorId ?? ""} onChange={(anchorId) => props.onChange(updateSectionSemantics(value, { anchorId }))} />
        </WidgetControlRow>
      </WidgetEditorSection>
      <WidgetEditorSection id="section.regions" title="Regions">
        <WidgetRepeatableSlotControls
          widget={props.context.widget}
          slots={resolveSectionSlots(props.context.widget)}
          onChange={(slots) => props.onChange(updateSectionSlots(value, slots))}
        />
      </WidgetEditorSection>
    </>
  );
}
```

For missing docs, add contract pages that follow existing widget docs:

```md
# Tabs Widget

- Type: `tabs`
- Surface: Pages / widget library
- Wizard: starter tab labels and default tab
- Visual: items, orientation, existing panel surface
- Advanced: IDs, keyboard/runtime details
- Tests: `tests/vitest/widgets/tabs.test.tsx`,
  `tests/vitest/ui/tabs-editor-wave.test.tsx`
```

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered layout/structural output is public.
- Auth model:
  - no new endpoint;
  - existing page/template save calls remain authenticated admin writes.
- RBAC:
  - unchanged page/template write permissions.
- CSRF:
  - unchanged admin CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed widget schemas must reject unknown fields and preserve legacy slot
    compatibility.
- Anti-abuse:
  - no public write endpoint;
  - no raw class-name interpolation from user-controlled fields.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this task family `Done` or record the exact blocker.
- Focused runtime/editor suites as widgets are touched:
  - `tests/vitest/widgets/section.test.tsx`
  - `tests/vitest/ui/section-editor-wave.test.tsx`
  - `tests/vitest/widgets/gridColumns.test.tsx`
  - `tests/vitest/ui/grid-columns-editor-wave.test.tsx`
  - `tests/vitest/widgets/splitLayout.test.tsx`
  - `tests/vitest/ui/split-layout-editor-wave.test.tsx`
  - `tests/vitest/widgets/stack.test.tsx`
  - `tests/vitest/ui/stack-editor-wave.test.tsx`
  - `tests/vitest/widgets/spacer.test.tsx`
  - `tests/vitest/ui/spacer-editor-wave.test.tsx`
  - `tests/vitest/widgets/divider.test.tsx`
  - `tests/vitest/ui/divider-editor-wave.test.tsx`
  - `tests/vitest/widgets/tabs.test.tsx`
  - `tests/vitest/ui/tabs-editor-wave.test.tsx`
  - `tests/vitest/widgets/accordionWidget.test.tsx`
  - `tests/vitest/ui/accordion-editor-wave.test.tsx`
  - `tests/vitest/widgets/toggleBlock.test.tsx`
  - `tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx` when slot/children rendering changes.
- `bun test tests/unit/widgets/validator.test.ts` when slot normalization or
  widget validation changes.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md`
- Existing layout/structural widget docs listed above.
- New docs for `tabs`, `accordion`, and `toggle-block`.
- `_docs/_TASKS/README.md` on status, title, or board row changes.
- `_docs/_TASKS/TASK-252*.md`

## Acceptance Criteria

- Section no longer relies on top-of-panel slot controls.
- Layout/structural widgets use the shared TASK-252 control metadata and section
  IA.
- Simple widgets remain simple because their final option lists cite research
  decisions rather than assumptions.
- Missing structural widget docs are created.
