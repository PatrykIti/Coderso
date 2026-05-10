# TASK-252-05-06: Spacer Size Tokens Custom Height and Canvas Affordance

# FileName: TASK-252-05-06_Spacer_Size_Tokens_Custom_Height_and_Canvas_Affordance.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Small
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-05
**Status:** To Do

---

## Overview

Keep Spacer intentionally small: size token, custom height, responsive override, and strong canvas affordance.

This is an execution leaf under `TASK-252-05`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/spacer/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/spacer/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/spacer/MATRIX.md` as the binding research evidence for the final option set.
- Consume shared TASK-252 editor sections, rows, labels, info tips, and `data-widget-control` metadata from TASK-252-01; do not create a widget-local control framework.
- Keep schema/default/normalizer/render/editor/docs changes together and preserve existing saved payload compatibility.
- Keep layout choices beginner-readable through presets and bounded tokens rather than arbitrary CSS controls.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/spacer/MATRIX.md`; for this leaf, start from the current owner fields `height`, `showGuideInEditor` and add only the schema fields that the matrix explicitly keeps.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat custom pixel height only through the current bounded token-or-px normalizer as conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: decorative content, arbitrary CSS, and layout semantics beyond spacing.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `spacer`.
- `Visual`: `Size`, `Responsive height`, `Canvas label`.
- `Advanced`: `Safe length diagnostics`, `Legacy zero/none behavior`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/spacer.tsx`
- `core/admin/ui/widgets/editors/SpacerEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if slot or shared renderer output changes.
- `tests/unit/widgets/validator.test.ts` when schema validation or slot normalization changes.
- `tests/vitest/widgets/spacer.test.tsx`
- `tests/vitest/ui/spacer-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SPACER.md`
- `_docs/_WIDGETS/tmp/spacer/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-05-06_Spacer_Size_Tokens_Custom_Height_and_Canvas_Affordance.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeSpacerData(data: SpacerData): SpacerData {
  return {
    height: normalizeSpacerHeight(data.height),
    showGuideInEditor: normalizeSpacerShowGuideInEditor(data.showGuideInEditor),
  };
}

function SpacerVisualEditor(props: WidgetEditorProps<SpacerData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="spacer.height" title="Height">
      <WidgetControlRow id="spacer.height.desktop" label="Desktop height" data-widget-control="spacer.height.desktop">
        <Input value={value.height?.desktop ?? "16"} onChange={...} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/spacer/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/spacer.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/SpacerEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `spacer` output is public page/runtime output.
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
  - changed `spacer` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/spacer.tsx`.
- Anti-abuse:
  - No raw class-name interpolation from user-controlled fields.
  - No public write endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SPACER.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-05-06_Spacer_Size_Tokens_Custom_Height_and_Canvas_Affordance.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `spacer` Visual mode is sectioned, accessible, and metadata-backed.
- Final `spacer` options match Keep/Adapt/Reject decisions from the research matrix.
- Existing saved widget payloads remain backward compatible.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
