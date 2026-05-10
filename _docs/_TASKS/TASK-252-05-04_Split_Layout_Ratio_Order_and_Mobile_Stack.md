# TASK-252-05-04: Split Layout Ratio Order and Mobile Stack

# FileName: TASK-252-05-04_Split_Layout_Ratio_Order_and_Mobile_Stack.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-05
**Status:** To Do

---

## Overview

Keep Split Layout as a two-slot layout primitive with media/content order and
mobile stacking rules. Ratio presets stay bounded Adapt scope and runtime resize
handles stay rejected.

This is an execution leaf under `TASK-252-05`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/split-layout/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/split-layout/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/split-layout/MATRIX.md` as the binding research evidence for the final option set.
- Consume shared TASK-252 editor sections, rows, labels, info tips, and `data-widget-control` metadata from TASK-252-01; do not create a widget-local control framework.
- Keep schema/default/normalizer/render/editor/docs changes together and preserve existing saved payload compatibility.
- Keep layout choices beginner-readable through presets and bounded tokens rather than arbitrary CSS controls.

## Research Decisions

- Keep: two named slots, media/content orientation, and mobile stack order from
  `_docs/_WIDGETS/tmp/split-layout/MATRIX.md`; map them to `collapseMobile`,
  `reverseOnMobile`, and any new `mobileOrder`/slot-label fields owned in
  `core/widgets/core/splitLayout.tsx`.
- Adapt: ratio presets and marketing split polish remain conditional; implement
  only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: runtime resize handles and arbitrary grid/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `split-layout`.
- `Visual`: `Ratio and orientation`, `Slot order`, `Mobile stack`, `Gap and alignment`.
- `Advanced`: `Legacy slot mapping`, `Responsive diagnostics`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/splitLayout.tsx`
- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if slot or shared renderer output changes.
- `tests/unit/widgets/validator.test.ts` when schema validation or slot normalization changes.
- `tests/vitest/widgets/splitLayout.test.tsx`
- `tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/_WIDGETS/tmp/split-layout/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-05-04_Split_Layout_Ratio_Order_and_Mobile_Stack.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeSplitLayoutData(data: SplitLayoutData): SplitLayoutData {
  return {
    ratio: normalizeSplitLayoutRatio(data.ratio),
    collapseMobile: normalizeSplitLayoutCollapseMobile(data.collapseMobile),
    reverseOnMobile: normalizeSplitLayoutReverseOnMobile(data.reverseOnMobile),
    gap: normalizeSplitLayoutGap(data.gap),
    verticalAlign: normalizeSplitLayoutVerticalAlign(data.verticalAlign),
  };
}

function SplitLayoutVisualEditor(props: WidgetEditorProps<SplitLayoutData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="split-layout.ratio" title="Ratio and order">
      <WidgetControlRow id="split-layout.ratio.desktop" label="Desktop ratio" data-widget-control="split-layout.ratio.desktop">
        <SegmentedControl value={value.ratio?.desktop ?? "50-50"} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/split-layout/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/splitLayout.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `split-layout` output is public page/runtime output.
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
  - changed `split-layout` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/splitLayout.tsx`.
- Anti-abuse:
  - No raw class-name interpolation from user-controlled fields.
  - No public write endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-05-04_Split_Layout_Ratio_Order_and_Mobile_Stack.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `split-layout` Visual mode is sectioned, accessible, and metadata-backed.
- Final `split-layout` options match Keep/Adapt/Reject decisions from the research matrix.
- Existing saved widget payloads remain backward compatible.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
