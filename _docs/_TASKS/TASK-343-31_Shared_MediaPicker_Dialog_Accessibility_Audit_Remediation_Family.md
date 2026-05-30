# TASK-343-31: Shared MediaPicker Dialog Accessibility Audit Remediation Family

# FileName: TASK-343-31_Shared_MediaPicker_Dialog_Accessibility_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Shared MediaPicker + Admin UI + Accessibility + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Promote the repeated shared MediaPicker/Dialog accessibility warning from the
28-05 audit wave. Multiple widget authoring flows open the shared media dialog
and trigger the same Radix `DialogContent` warning because the dialog lacks an
accessible description or explicit `aria-describedby={undefined}` policy.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_HERO_WIDGET.md:218-240` (MediaPicker
  warning noted during Hero media picker coverage)
- `_docs/PLAYWRIGHT/28-05-2026/REPORT_LOGO_CLOUD_WIDGET.md:222-282`
- `_docs/PLAYWRIGHT/28-05-2026/REPORT_FOOTER_WIDGET.md:320-328`
- Shared owner: `core/admin/ui/media/MediaPicker.tsx` and dialog primitives used
  by widget media-selection flows.

## Sub-Tasks

- [ ] Add an accessible description to the shared Media Library dialog, or set an
  explicit no-description policy only if the design system contract requires it.
- [ ] Keep dialog title, description, and focus management stable for all widget
  media picker entry points.
- [ ] Add a shared regression test that opens MediaPicker from at least two
  widget editor surfaces and asserts no Radix description warning is emitted.
- [ ] Document the shared owner so future widget reports do not route this
  warning to individual widget families.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/media/MediaPicker.tsx` | Add or explicitly configure dialog description semantics. |
| Shared dialog primitives if applicable | Keep Radix description policy consistent across dialog consumers. |
| `tests/vitest/ui/media-picker.test.tsx` | Extend existing MediaPicker coverage for warning-free dialog description semantics. |
| Optional new MediaPicker dialog a11y suite | Add only if cross-widget entry-point coverage becomes too broad for the existing MediaPicker suite. |
| Affected widget editor tests | Add smoke coverage only where needed to prove entry-point integration. |

## Implementation Pseudocode

```tsx
function MediaPicker(props: MediaPickerProps) {
  const descriptionId = useId();
  return (
    <DialogContent aria-describedby={descriptionId}>
      <DialogTitle>Media library</DialogTitle>
      <DialogDescription id={descriptionId}>
        Choose an existing media asset for the selected widget field.
      </DialogDescription>
      { /* existing MediaPicker content remains unchanged */ }
    </DialogContent>
  );
}
```

Apply the change inline in `core/admin/ui/media/MediaPicker.tsx` unless the
implementation intentionally extracts a reusable dialog-content component. The
current code imports `DialogTitle` but not `DialogDescription`.

## Regression Test Shape

- Opening MediaPicker from Hero media fields does not log the Radix missing
  description warning.
- Opening MediaPicker from Logo Cloud or Footer media fields uses the same
  description contract.
- Focus return and selection behavior remain unchanged.

## Security Contract

No API routes are added. Media selection permissions, accepted MIME filters,
public URL handling, and upload restrictions remain unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/media-picker.test.tsx`
- Run the new MediaPicker dialog a11y suite if one is added.
- Relevant widget editor smoke tests for touched entry points.
- `git diff --check`

## Documentation Updates Required

- Update affected `_docs/PLAYWRIGHT/28-05-2026/REPORT_*_WIDGET.md` files when
  implementation lands.
- Update shared admin/dialog documentation if the MediaPicker dialog contract is
  documented elsewhere.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Shared MediaPicker no longer emits the missing dialog description warning in
  audited widget authoring flows.
- Individual widget families do not duplicate this shared accessibility owner.
