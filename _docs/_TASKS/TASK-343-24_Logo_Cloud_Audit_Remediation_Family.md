# TASK-343-24: Logo Cloud Audit Remediation Family

# FileName: TASK-343-24_Logo_Cloud_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Logo Cloud + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343, TASK-343-30, TASK-343-31
**Status:** Done (2026-05-30)

---

## Overview

Close Logo Cloud truthfulness drift where logo-count reduction silently
truncates content, Strip-specific saved values are summarized as effective in
Grid, disabled hover-color state can remain checked, and theme-token colors are
misclassified as custom values.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_LOGO_CLOUD_WIDGET.md:222-282`
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`
- `core/widgets/core/logoCloud.tsx`

## Sub-Tasks

- [x] Add confirmation/recovery for destructive logo-count reduction.
- [x] Separate saved Strip motion values from effective Grid behavior in Visual
  and Advanced summaries.
- [x] Make `Colorize on hover` unchecked or explicitly inactive when grayscale
  is off.
- [x] Route default color state truthfulness through `TASK-343-30` and keep
  Logo Cloud-specific regression coverage.
- [x] Route the shared MediaPicker dialog warning from this report through
  `TASK-343-31`; do not duplicate the fix in Logo Cloud.

## Implementation Notes

- Logo count reductions now confirm before truncating saved logo rows, with
  removed logo labels summarized in the native confirmation prompt.
- Visual and Advanced now distinguish effective Strip behavior from saved Strip
  row/motion settings when the active variant is Grid or Dense.
- Turning grayscale off also clears the saved hover-color flag, and the disabled
  `Colorize on hover` switch renders unchecked while inactive.
- Advanced color summaries reuse the shared color-state classifier, so theme
  tokens are no longer described as custom color values.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` | Fix count truncation UX, effective-state copy, disabled hover state, and color labels. |
| `core/widgets/core/logoCloud.tsx` | Touch only if runtime effective-state data attributes need alignment. |
| `tests/vitest/widgets/logoCloud.test.tsx` | Cover effective strip/grid output and preserved safe link behavior. |
| `tests/vitest/ui/logo-cloud-editor-wave.test.tsx` | Cover destructive count reduction, disabled hover state, and color-state labels. |

## Implementation Pseudocode

```ts
function updateLogoCount(current: LogoCloudData, nextCount: number) {
  if (nextCount < current.logos.length && hasAuthoredLogoData(current.logos.slice(nextCount))) {
    return { mode: "confirm_truncate", nextCount };
  }
  return { mode: "apply", logos: resizeLogoItems(current.logos, nextCount) };
}

function resolveLogoCloudEffectiveMotion(data: LogoCloudData) {
  return data.variant === "strip" ? data.style?.motionMode : "not_applicable_in_grid";
}
```

## Regression Test Shape

- Count reduction cannot silently discard authored logos.
- Grid summaries do not claim Strip motion is visually active.
- Grayscale-off hover color state is truthful.

## Security Contract

No API routes are added. Existing safe href/media picker constraints stay
unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_LOGO_CLOUD_WIDGET.md`.
- Update `_docs/_WIDGETS/LOGO_CLOUD.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Logo count changes are recoverable or explicitly confirmed.
- Saved-vs-effective Logo Cloud states are readable and truthful.
