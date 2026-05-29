# TASK-343-28: Split Layout Audit Remediation Family

# FileName: TASK-343-28_Split_Layout_Audit_Remediation_Family.md

**Priority:** Medium
**Category:** Widgets + Split Layout + Admin UI + UX + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Close Split Layout UX truthfulness drift where disclosure can simultaneously
say the phone split is saved and matches the starter, a base preset can reset
device overrides without warning, and the highlighted variant can diverge from
the effective desktop ratio.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_SPLIT_LAYOUT_WIDGET.md:285-309`
- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
- `core/widgets/core/splitLayout.tsx`

## Sub-Tasks

- [ ] Make ratio disclosure distinguish explicit saved overrides from effective
  equality with the starter.
- [ ] Confirm or preserve device-specific overrides when a preset card would
  reset them.
- [ ] Make variant-card selected state derive from effective desktop ratio or
  clearly state that it is the saved seed variant only.
- [ ] Add regression coverage for starter/preset/ratio disclosure.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | Fix disclosure copy, preset override guard, and variant/effective-ratio state. |
| `core/widgets/core/splitLayout.tsx` | Touch only if effective ratio diagnostics need renderer data attributes. |
| `tests/vitest/widgets/splitLayout.test.tsx` | Cover effective ratio and responsive output invariants. |
| `tests/vitest/ui/split-layout-editor-wave.test.tsx` | Cover disclosure and destructive preset reset behavior. |

## Implementation Pseudocode

```ts
function resolveSplitRatioDisclosure(ratio: SplitRatio, starter: SplitRatio) {
  const explicit = hasExplicitDeviceRatio(ratio);
  const effectiveMatch = ratiosEqual(resolveEffectiveRatio(ratio), starter);
  return { explicit, effectiveMatch };
}

function applySplitPresetWithGuard(current: SplitLayoutData, preset: SplitPreset) {
  if (hasDeviceOverrides(current.ratio) && presetWouldResetOverrides(current, preset)) {
    return { mode: "confirm_reset_overrides", preset };
  }
  return { mode: "apply", data: applySplitPreset(current, preset) };
}
```

## Regression Test Shape

- Disclosure cannot simultaneously imply independent phone split and starter
  match without explaining the distinction.
- Preset cards cannot silently discard device overrides.
- Variant selected state is truthful for the effective layout.

## Security Contract

No API routes are added. Nested slot rendering and widget composition safety
remain unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_SPLIT_LAYOUT_WIDGET.md`.
- Update `_docs/_WIDGETS/SPLIT_LAYOUT.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Split Layout disclosure and preset actions match the effective saved layout.
- Device overrides are not silently lost.
