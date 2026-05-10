# TASK-252-05-01: Section Regions Semantics and Spacing

# FileName: TASK-252-05-01_Section_Regions_Semantics_and_Spacing.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-05
**Status:** To Do

---

## Overview

Move region/slot controls into the Visual IA and keep Section focused on semantic page regions, anchors, width, and spacing.

This is an execution leaf under `TASK-252-05`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/section/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/section/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/section/MATRIX.md` as the binding research evidence for the final option set.
- Consume shared TASK-252 editor sections, rows, labels, info tips, and `data-widget-control` metadata from TASK-252-01; do not create a widget-local control framework.
- Keep schema/default/normalizer/render/editor/docs changes together and preserve existing saved payload compatibility.
- Keep layout choices beginner-readable through presets and bounded tokens rather than arbitrary CSS controls.

## Research Decisions

- Keep: region/slot model, semantic wrapper/anchor controls, constrained
  `containerWidth`/`maxWidth`, and gutter/padding presets from
  `_docs/_WIDGETS/tmp/section/MATRIX.md`; start from the current owner fields
  `heading`, `semantics`, `style` plus the existing `sectionRegionSlot`, then
  add only schema-owned width/spacing fields that the matrix keeps.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat
  cover/background media, template/preset insertion, and dense layout polish as
  conditional; implement only when schema/defaults/normalizer/render/editor/
  tests move together.
- Reject: per-CSS editing, arbitrary class names, and making Section a low-level style editor.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `section`.
- `Visual`: `Variant and structure`, `Heading and intro`, `Semantics and anchor`, `Width and spacing`, `Surface and borders`, `Regions`.
- `Advanced`: `Slot compatibility`, `Stable IDs and diagnostics`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/section.tsx`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/builder/VisualPanel.tsx`
- `core/widgets/slots.ts` only if the existing slot helper contract needs a
  narrow extraction for reuse.
- `core/admin/ui/widgets/editors/SectionEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if slot or shared renderer output changes.
- `tests/unit/widgets/validator.test.ts` when schema validation or slot normalization changes.
- `tests/vitest/widgets/section.test.tsx`
- `tests/vitest/ui/section-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SECTION.md`
- `_docs/_WIDGETS/tmp/section/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-05-01_Section_Regions_Semantics_and_Spacing.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeSectionData(data: SectionData): SectionData {
  return {
    heading: normalizeSectionHeading(data.heading),
    semantics: normalizeSectionSemantics(data.semantics),
    layout: normalizeSectionLayout({
      containerWidth: data.layout?.containerWidth ?? "content",
      maxWidth: data.layout?.maxWidth ?? "7xl",
      paddingBlock: data.layout?.paddingBlock ?? "lg",
      paddingInline: data.layout?.paddingInline ?? "default",
    }),
    style: normalizeSectionStyle(data.style),
  };
}

function SectionVisualEditor(props: WidgetEditorProps<SectionData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="section.semantics" title="Semantics and anchor">
      <WidgetControlRow id="section.semantics.anchorId" label="Anchor ID" data-widget-control="section.semantics.anchorId">
        <Input value={value.semantics?.anchorId ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
      <WidgetControlRow id="section.layout.containerWidth" label="Container width" data-widget-control="section.layout.containerWidth">
        <Select value={value.layout?.containerWidth ?? "content"} onChange={handleControlChange} />
      </WidgetControlRow>
      <WidgetControlRow id="section.layout.paddingBlock" label="Vertical padding" data-widget-control="section.layout.paddingBlock">
        <Select value={value.layout?.paddingBlock ?? "lg"} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}

function resolveBuilderSlotMap(block: Block): Record<string, Block[]> {
  if (block.slots && typeof block.slots === "object" && !Array.isArray(block.slots)) {
    return block.slots as Record<string, Block[]>;
  }
  return Array.isArray(block.children) ? { default: block.children } : {};
}

function WidgetSlotControls({ widget, block, onChange }: WidgetSlotControlsProps) {
  const slotMap = resolveBuilderSlotMap(block);
  const slotDefinitions = widget.slots ?? [];
  const slotTargets = resolveWidgetSlotTargets(slotDefinitions, slotMap);
  if (slotTargets.length === 0 && !widget.canHaveChildren) return null;
  return (
    <WidgetEditorSection id="section.regions" title="Regions">
      {slotTargets.map((slot) => (
        <WidgetControlRow key={slot.slotId} id={`slots.${slot.slotId}`} label={`${slot.label} region`}>
          {() => (
            <SlotSummary
              slot={slot}
              count={slotMap[slot.slotId]?.length ?? 0}
              onAddRepeatable={() => addRepeatableSlotInstance(widget, block, onChange, slot.definitionId)}
              onRemoveRepeatable={() => removeRepeatableSlotInstance(widget, block, onChange, slot.slotId)}
            />
          )}
        </WidgetControlRow>
      ))}
    </WidgetEditorSection>
  );
}

function addRepeatableSlotInstance(
  widget: WidgetDefinition,
  block: Block,
  onChange: (next: Block) => void,
  definitionId: string,
) {
  const slotMap = resolveBuilderSlotMap(block);
  const definition = (widget.slots ?? []).find((slot) => slot.id === definitionId);
  if (!definition || getWidgetSlotKind(definition) !== "repeatable") return;
  const existing = getRepeatableSlotIds(definition, slotMap);
  const maximum = Number.isFinite(definition.maxItems)
    ? Math.max(0, Math.floor(definition.maxItems ?? 0))
    : undefined;
  if (typeof maximum === "number" && existing.length >= maximum) return;
  const nextSlotId = buildRepeatableSlotId(
    definitionId,
    getNextRepeatableSlotInstanceId(definitionId, slotMap),
  );
  onChange({ ...block, slots: { ...slotMap, [nextSlotId]: [] }, children: undefined });
}

function removeRepeatableSlotInstance(
  widget: WidgetDefinition,
  block: Block,
  onChange: (next: Block) => void,
  slotId: string,
) {
  const parsed = parseRepeatableSlotId(slotId);
  if (!parsed) return;
  const slotMap = resolveBuilderSlotMap(block);
  const definition = (widget.slots ?? []).find((slot) => slot.id === parsed.definitionId);
  if (!definition || getWidgetSlotKind(definition) !== "repeatable") return;
  const existing = getRepeatableSlotIds(definition, slotMap);
  const minimum = Number.isFinite(definition.minItems)
    ? Math.max(0, Math.floor(definition.minItems ?? 0))
    : 0;
  if (existing.length <= minimum || !(slotId in slotMap)) return;
  const nextSlots = { ...slotMap };
  delete nextSlots[slotId];
  onChange({ ...block, slots: nextSlots, children: undefined });
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/section/MATRIX.md` before changing the schema or editor.
- Add width/gutter fields as bounded schema tokens such as
  `layout.containerWidth`, `layout.maxWidth`, `layout.paddingBlock`, and
  `layout.paddingInline`; do not expose arbitrary CSS width, margin, or padding
  strings.
- Extend or reorganize `core/widgets/core/section.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/SectionEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Move Regions/slot controls through the builder-owned slot component from
  TASK-252-01. The component must derive `slotMap` from `block.slots` with
  `children -> slots.default` compatibility, use the existing helpers from
  `core/widgets/slots.ts` for repeatable ids/min/max handling, and write back
  `{ ...block, slots: nextSlots, children: undefined }` only when a slot map is
  intentionally updated.
- Do not read `props.context.widget` inside `SectionEditors.tsx`; current
  `WidgetEditorContext` does not provide the active widget definition.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `section` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `section` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/section.tsx`.
- Anti-abuse:
  - No raw class-name interpolation from user-controlled fields.
  - No public write endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SECTION.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-05-01_Section_Regions_Semantics_and_Spacing.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `section` Visual mode is sectioned, accessible, and metadata-backed.
- Final `section` options match Keep/Adapt/Reject decisions from the research matrix.
- Existing saved widget payloads remain backward compatible.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
