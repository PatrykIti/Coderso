# TASK-252-05-07: Divider Orientation Style Tone and Label

# FileName: TASK-252-05-07_Divider_Orientation_Style_Tone_and_Label.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Small
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-05
**Status:** To Do

---

## Overview

Keep Divider simple around line orientation, style, thickness, and spacing;
optional label/tone controls stay bounded Adapt scope where the runtime can
render them accessibly.

This is an execution leaf under `TASK-252-05`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/divider/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/divider/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/divider/MATRIX.md` as the binding research evidence for the final option set.
- Consume shared TASK-252 editor sections, rows, labels, info tips, and `data-widget-control` metadata from TASK-252-01; do not create a widget-local control framework.
- Keep schema/default/normalizer/render/editor/docs changes together and preserve existing saved payload compatibility.
- Keep layout choices beginner-readable through presets and bounded tokens rather than arbitrary CSS controls.

## Research Decisions

- Keep: orientation, line style, thickness, spacing, semantic vs decorative
  behavior, and the existing label/color/width spacing fields from
  `_docs/_WIDGETS/tmp/divider/MATRIX.md`; add schema-owned `orientation` and
  `semanticRole` fields in `core/widgets/core/divider.tsx` while preserving
  legacy horizontal visual-only payloads.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat
  optional label and visual tone controls as bounded style additions; implement
  only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: decorative flourishes, raw HTML labels, and arbitrary border CSS.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `divider`.
- `Visual`: `Line style`, `Tone and thickness`, `Spacing`, `Optional label`.
- `Advanced`: `Accessibility diagnostics`, `Legacy spacing tokens`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/divider.tsx`
- `core/admin/ui/widgets/editors/DividerEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if slot or shared renderer output changes.
- `tests/unit/widgets/validator.test.ts` when schema validation or slot normalization changes.
- `tests/vitest/widgets/divider.test.tsx`
- `tests/vitest/ui/divider-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/DIVIDER.md`
- `_docs/_WIDGETS/tmp/divider/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-05-07_Divider_Orientation_Style_Tone_and_Label.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeDividerData(data: DividerData): DividerData {
  return {
    orientation: normalizeDividerOrientation(data.orientation ?? "horizontal"),
    semanticRole: normalizeDividerSemanticRole(data.semanticRole ?? inferDividerRole(data.label)),
    label: normalizeDividerLabel(data.label),
    thickness: normalizeDividerThickness(data.thickness),
    color: normalizeDividerColor(data.color),
    width: normalizeDividerWidth(data.width),
    customWidth: normalizeDividerCustomWidth(data.customWidth),
    marginTop: normalizeDividerMarginTop(data.marginTop),
    marginBottom: normalizeDividerMarginBottom(data.marginBottom),
  };
}

function DividerVisualEditor(props: WidgetEditorProps<DividerData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="divider.divider" title="Line and label">
      <WidgetControlRow id="divider.label" label="Label" data-widget-control="divider.label">
        <Input value={value.label ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
      <WidgetControlRow id="divider.orientation" label="Orientation" data-widget-control="divider.orientation">
        <SegmentedControl value={value.orientation ?? "horizontal"} onChange={(orientation) => props.onChange(updateDividerOrientation(value, orientation))} />
      </WidgetControlRow>
      <WidgetControlRow id="divider.semanticRole" label="Semantic role" data-widget-control="divider.semanticRole">
        <SegmentedControl value={value.semanticRole ?? "decorative"} onChange={(semanticRole) => props.onChange(updateDividerRole(value, semanticRole))} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/divider/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/divider.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/DividerEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `divider` output is public page/runtime output.
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
  - changed `divider` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/divider.tsx`.
- Anti-abuse:
  - No raw class-name interpolation from user-controlled fields.
  - No public write endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/divider.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/DIVIDER.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-05-07_Divider_Orientation_Style_Tone_and_Label.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `divider` Visual mode is sectioned, accessible, and metadata-backed.
- Final `divider` options match Keep/Adapt/Reject decisions from the research matrix.
- Existing saved widget payloads remain backward compatible.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
