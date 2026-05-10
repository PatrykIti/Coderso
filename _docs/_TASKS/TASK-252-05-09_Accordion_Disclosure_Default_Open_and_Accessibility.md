# TASK-252-05-09: Accordion Disclosure Default Open and Accessibility

# FileName: TASK-252-05-09_Accordion_Disclosure_Default_Open_and_Accessibility.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-05
**Status:** To Do

---

## Overview

Make Accordion a first-class disclosure widget with single/multiple open behavior, default open items, collapsible state, and accessible panel styling.

This is an execution leaf under `TASK-252-05`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/accordion/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/accordion/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/accordion/MATRIX.md` as the binding research evidence for the final option set.
- Consume shared TASK-252 editor sections, rows, labels, info tips, and `data-widget-control` metadata from TASK-252-01; do not create a widget-local control framework.
- Keep schema/default/normalizer/render/editor/docs changes together and preserve existing saved payload compatibility.
- Keep layout choices beginner-readable through presets and bounded tokens rather than arbitrary CSS controls.

## Research Decisions

- Keep: repeatable items, single/multiple open behavior, default open item(s),
  collapsible semantics, and accessibility behavior from
  `_docs/_WIDGETS/tmp/accordion/MATRIX.md`; map them to `items`,
  `options.initiallyOpenId`, `options.allowMultiple`, any new
  `options.collapsible`, and the existing `accordionItemSlot`.
- Adapt: panel style changes and visual variants remain conditional; implement
  only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: nested accordions by default and arbitrary disclosure scripting.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `accordion`.
- `Visual`: `Items`, `Open behavior`, `Panel surface`, `Icons`.
- `Advanced`: `A11y diagnostics`, `Legacy expanded item mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/accordion.tsx`
- `core/admin/ui/widgets/editors/AccordionEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if slot or shared renderer output changes.
- `tests/unit/widgets/validator.test.ts` when schema validation or slot normalization changes.
- `tests/vitest/widgets/accordionWidget.test.tsx`
- `tests/vitest/ui/accordion-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/ACCORDION.md`
- `_docs/_WIDGETS/tmp/accordion/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-05-09_Accordion_Disclosure_Default_Open_and_Accessibility.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeAccordionData(data: AccordionData): AccordionData {
  return {
    items: normalizeAccordionItems(data.items),
    options: normalizeAccordionOptions(data.options),
    style: normalizeAccordionStyle(data.style),
  };
}

function AccordionVisualEditor(props: WidgetEditorProps<AccordionData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="accordion.options" title="Disclosure behavior">
      <WidgetControlRow id="accordion.options.initiallyOpenId" label="Default open item" data-widget-control="accordion.options.initiallyOpenId">
        <Select value={value.options?.initiallyOpenId ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/accordion/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/accordion.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/AccordionEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `accordion` output is public page/runtime output.
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
  - changed `accordion` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/accordion.tsx`.
- Anti-abuse:
  - No raw class-name interpolation from user-controlled fields.
  - No public write endpoint is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/ACCORDION.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-05-09_Accordion_Disclosure_Default_Open_and_Accessibility.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `accordion` Visual mode is sectioned, accessible, and metadata-backed.
- Final `accordion` options match Keep/Adapt/Reject decisions from the research matrix.
- Existing saved widget payloads remain backward compatible.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
