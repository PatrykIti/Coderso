# TASK-310-01: Shared Color Picker Layout and Interactive Editor Adoption

# FileName: TASK-310-01_Shared_Color_Picker_Layout_and_Interactive_Editor_Adoption.md

**Priority:** High
**Category:** Widgets + Admin UI + Shared Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-310, TASK-305
**Status:** Done (2026-05-19)

---

## Overview

Adopt the landed shared color-field seam in the layout/interactive editors that
still duplicate local `resolvePickerColor()` / `ColorField` behavior.

Current adopter scope for this leaf:

- `AccordionEditors.tsx`
- `CompareTimelineEditors.tsx`
- `DividerEditors.tsx`
- `FaqAccordionEditors.tsx`
- `GridColumnsEditors.tsx`
- `SectionEditors.tsx`
- `TimelineEditors.tsx`

These editors all own bounded color fields already. This leaf only replaces the
duplicated swatch/text helper path with the shared owner seam; it does not add
new style fields, contrast policy, motion policy, or runtime behavior.

## Scope Boundary

This leaf owns:

- removing local `resolvePickerColor()` / `ColorField` clones in the listed
  editors;
- reusing `SharedColorControl` or `SharedColorFieldInputs` with the existing
  clear/token semantics;
- focused editor-wave updates for the listed adopters.

This leaf does not own:

- Booking Calendar, which remains under `TASK-297`;
- Form Embed or Entry Teaser, which already use the landed shared seam;
- Gallery Mosaic overlay alpha behavior, which remains a special-case owner
  under `TASK-312` / `TASK-270`;
- contrast guidance (`TASK-299`) or motion work (`TASK-300`).

## Sub-Tasks

- [x] Replace local `resolvePickerColor()` / `ColorField` helpers in the listed
  layout/interactive editors.
- [x] Reuse `SharedColorControl` or `SharedColorFieldInputs` without widening
  widget-local schemas or style ownership.
- [x] Update focused UI tests and shared helper tests only where behavior
  changes.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/DividerEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/GridColumnsEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Touch only if these adopters prove the shared lower-level helper still lacks bounded required behavior. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Touch only if these adopters need additive full-control behavior consistent with `TASK-305`. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/compare-timeline-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/divider-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/faq-accordion-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/grid-columns-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/timeline-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Update only if the shared helper surface changes. |

## Implementation Pseudocode

```tsx
function SharedLayoutColorField(props: {
  label: string;
  value: string | undefined;
  placeholder: string;
  pickerFallback: string;
  onChange: (next: string) => void;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-2">
      <ClearableFieldHeader label={props.label} value={props.value} onClear={props.onClear} />
      <SharedColorFieldInputs
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        pickerFallback={props.pickerFallback}
      />
    </div>
  );
}
```

Error handling:

- CSS variables and custom token text must remain visible after swatch
  interaction.
- Clear must delete the configured style key, not replace it with an empty
  string sentinel.
- Do not change widget-local defaults or introduce new style controls in this
  leaf.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged admin UI only.
- Reject-unknown validation: unchanged; this leaf only rewires editor helper
  usage for existing allowlisted style fields.
- Anti-abuse: no raw style-object injection or script behavior is introduced.
- Secret handling: no secrets or privileged tokens appear in editor state,
  tests, or docs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/divider-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/grid-columns-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx` when the
  shared helper surface changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update touched widget docs or Playwright reports only when visible editor
  behavior or routed ownership notes change.
- Update `_docs/_TASKS/README.md` when this leaf status changes.
- Add a changelog entry and update `_docs/_CHANGELOG/README.md` when the leaf
  is completed.

## Acceptance Criteria

- The listed layout/interactive editors no longer duplicate local
  `resolvePickerColor()` / `ColorField` helpers.
- CSS-variable/custom token text remains truthful after swatch interaction in
  every listed adopter.
- Clear behavior is consistent with the landed shared seam across the listed
  editors.
