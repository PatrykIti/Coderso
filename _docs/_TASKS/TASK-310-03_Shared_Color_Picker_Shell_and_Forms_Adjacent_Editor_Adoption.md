# TASK-310-03: Shared Color Picker Shell and Forms-Adjacent Editor Adoption

# FileName: TASK-310-03_Shared_Color_Picker_Shell_and_Forms_Adjacent_Editor_Adoption.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Shared Design Tokens
**Estimated Effort:** Large
**Dependencies:** TASK-310, TASK-305
**Status:** To Do

---

## Overview

Adopt the landed shared color-field seam in the shell/forms-adjacent editors
that still duplicate local `resolvePickerColor()` / `ColorField` behavior.

Current adopter scope for this leaf:

- `ContactEditors.tsx`
- `FooterEditors.tsx`
- `NavigationEditors.tsx`
- `NewsletterEditors.tsx`
- `PricingPlansEditors.tsx`

This leaf intentionally excludes Form Embed, which already uses the shared
lower-level helper surface.

## Scope Boundary

This leaf owns:

- removing local `resolvePickerColor()` / `ColorField` clones in the listed
  shell/forms-adjacent editors;
- reusing `SharedColorControl` or `SharedColorFieldInputs` with the existing
  clear/token semantics;
- focused editor-wave updates for the listed adopters.

This leaf does not own:

- Form Embed, Booking Calendar, Entry Teaser, or Gallery Mosaic;
- new widget-local product/style fields;
- broader shell/navigation IA changes outside shared color-field behavior.

## Sub-Tasks

- [ ] Replace local `resolvePickerColor()` / `ColorField` helpers in the listed
  shell/forms-adjacent editors.
- [ ] Reuse the landed shared helper seam without changing widget-local schema
  ownership or style defaults.
- [ ] Update focused UI tests and shared helper tests only where behavior
  changes.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/FooterEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/PricingPlansEditors.tsx` | Replace the local color-field helper with the landed shared seam. |
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Touch only if these adopters prove the shared lower-level helper still lacks bounded required behavior. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Touch only if these adopters need additive full-control behavior consistent with `TASK-305`. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/footer-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/pricing-plans-editor-wave.test.tsx` | Update shared color-field expectations when the editor behavior changes. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Update only if the shared helper surface changes. |

## Implementation Pseudocode

```tsx
function SharedShellColorField(props: {
  label: string;
  value: string | undefined;
  placeholder: string;
  pickerFallback: string;
  onChange: (next: string) => void;
  onClear?: () => void;
}) {
  return (
    <SharedColorControl
      label={props.label}
      value={props.value}
      onChange={props.onChange}
      onClear={props.onClear}
      placeholder={props.placeholder}
      pickerFallback={props.pickerFallback}
    />
  );
}
```

Error handling:

- CSS variables and custom token text must remain visible after swatch
  interaction.
- Clear must delete the configured style key, not replace it with an empty
  string sentinel.
- Do not change widget-local defaults or add new shell/forms-adjacent style
  controls in this leaf.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged admin UI only.
- Reject-unknown validation: unchanged; this leaf only rewires editor helper
  usage for existing allowlisted style fields.
- Anti-abuse: no raw style-object injection or script behavior is introduced.
- Secret handling: no secrets or privileged tokens appear in editor state,
  tests, or docs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/footer-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
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

- The listed shell/forms-adjacent editors no longer duplicate local
  `resolvePickerColor()` / `ColorField` helpers.
- CSS-variable/custom token text remains truthful after swatch interaction in
  every listed adopter.
- Clear behavior is consistent with the landed shared seam across the listed
  editors.
