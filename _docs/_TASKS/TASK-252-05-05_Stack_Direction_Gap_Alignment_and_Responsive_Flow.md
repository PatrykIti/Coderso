# TASK-252-05-05: Stack Direction Gap Alignment and Responsive Flow

# FileName: TASK-252-05-05_Stack_Direction_Gap_Alignment_and_Responsive_Flow.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-05
**Status:** To Do

---

## Overview

Make Stack a predictable flow primitive with direction, gap, alignment, justification, and responsive direction controls.

This is an execution leaf under `TASK-252-05`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/stack/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/stack/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/stack/MATRIX.md` as the binding research evidence for the final option set.
- Consume shared TASK-252 editor sections, rows, labels, info tips, and `data-widget-control` metadata from TASK-252-01; do not create a widget-local control framework.
- Keep schema/default/normalizer/render/editor/docs changes together and preserve existing saved payload compatibility.
- Keep layout choices beginner-readable through presets and bounded tokens rather than arbitrary CSS controls.

## Research Decisions

- Keep: direction, schema-validated responsive direction, gap, alignment, and
  justification from `_docs/_WIDGETS/tmp/stack/MATRIX.md`; preserve the current
  `wrap` field as backward-compatible data only and do not expand wrap behavior
  in this leaf.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat
  wrap/group behavior, optional separators/dividers, and joined-item style as
  conditional; implement only when schema/defaults/normalizer/render/editor/
  tests move together.
- Reject: turning Stack into an all-purpose layout engine.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `stack`.
- `Visual`: `Direction`, `Gap and spacing`, `Alignment`, `Responsive flow`.
- `Advanced`: `Legacy gap tokens`, `Nested child diagnostics`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/stack.tsx`
- `core/admin/ui/widgets/editors/StackEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if slot or shared renderer output changes.
- `tests/unit/widgets/validator.test.ts` when schema validation or slot normalization changes.
- `tests/vitest/widgets/stack.test.tsx`
- `tests/vitest/ui/stack-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/STACK.md`
- `_docs/_WIDGETS/tmp/stack/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-05-05_Stack_Direction_Gap_Alignment_and_Responsive_Flow.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeStackData(data: StackData): StackData {
  return {
    direction: normalizeStackResponsiveDirection(data.direction, {
      desktop: "column",
      tablet: "column",
      mobile: "column",
    }),
    gap: normalizeStackGap(data.gap),
    align: normalizeStackAlign(data.align),
    justify: normalizeStackJustify(data.justify),
    wrap: normalizeStackWrap(data.wrap),
  };
}

function StackVisualEditor(props: WidgetEditorProps<StackData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="stack.direction" title="Responsive flow">
      <WidgetControlRow id="stack.direction.desktop" label="Desktop direction" data-widget-control="stack.direction.desktop">
        <SegmentedControl value={value.direction?.desktop ?? "column"} onChange={handleControlChange} />
      </WidgetControlRow>
      <WidgetControlRow id="stack.direction.mobile" label="Mobile direction" data-widget-control="stack.direction.mobile">
        <SegmentedControl value={value.direction?.mobile ?? "column"} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/stack/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/stack.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/StackEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `stack` output is public page/runtime output.
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
  - changed `stack` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/stack.tsx`.
- Anti-abuse:
  - No raw class-name interpolation from user-controlled fields.
  - No public write endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/STACK.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-05-05_Stack_Direction_Gap_Alignment_and_Responsive_Flow.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `stack` Visual mode is sectioned, accessible, and metadata-backed.
- Final `stack` options match Keep/Adapt/Reject decisions from the research matrix.
- Existing saved widget payloads remain backward compatible.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
