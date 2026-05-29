# TASK-343-21: Shared Block Layout and Device Visibility Audit Remediation Family

# FileName: TASK-343-21_Shared_Block_Layout_and_Device_Visibility_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Shared Block Inspector + Runtime Wrapper + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Promote the shared-owner drift proven most clearly by the Product Compare
report: inherited block layout values are summarized as saved values and can be
silently changed by the first edit, while Device Visibility can say "Hidden on
all devices" without actually hiding public SSR output.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_PRODUCT_COMPARE_WIDGET.md:260-281`
- Repeated shared visibility notes in reports for appointment-form,
  form-embed, navigation, template-section, timeline, toggle-block, and others.
- `core/admin/ui/pages/builder/blockUtils.ts`
- `core/admin/ui/pages/builder/AdvancedPanel.tsx`
- `core/admin/ui/pages/builder/VisualPanel.tsx`
- `core/admin/ui/pages/builder/LayoutPanel.tsx`
- `core/widgets/renderers/widgetRenderer.tsx`

## Sub-Tasks

- [ ] Separate inherited block-layout display values from saved override values
  in Visual and Advanced summaries.
- [ ] Prevent the first layout edit from silently shrinking inherited padding
  without clear "save as override" semantics.
- [ ] Fix or explicitly document Device Visibility semantics for empty device
  arrays, editor labels, and public SSR behavior.
- [ ] Add shared wrapper regression coverage that uses Product Compare as the
  primary reproducer and at least one non-commerce widget as a control.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/builder/blockUtils.ts` | Preserve `inherit` layout tokens and expose helper state that distinguishes inherited effective values from saved overrides. |
| `core/admin/ui/pages/builder/AdvancedPanel.tsx` | Stop summarizing inherited layout as saved `MD` values and label visibility semantics from the normalized helper. |
| `core/admin/ui/pages/builder/VisualPanel.tsx` | Keep device toggles and first-edit layout behavior aligned with the shared helper state. |
| `core/admin/ui/pages/builder/LayoutPanel.tsx` | Apply explicit override semantics when an inherited value is changed from the UI. |
| `core/widgets/renderers/widgetRenderer.tsx` | Align preview/public visibility filtering with editor summaries or document the public SSR no-device boundary in the UI. |
| `tests/vitest/ui/block-layout-shared-wave.test.tsx` | Create a new shared builder UI suite for inherited layout copy and first-edit override behavior. |
| `tests/vitest/widgets/renderer.test.tsx` | Extend existing WidgetRenderer coverage for public/preview visibility semantics. |

## Implementation Pseudocode

```ts
type SharedBlockValue<T> =
  | { source: "inherited"; effective: T }
  | { source: "saved"; saved: T; effective: T };

function resolveSharedBlockLayoutState(block: WidgetBlock, defaults: BlockLayoutDefaults) {
  return {
    padding: block.layout?.padding
      ? { source: "saved", saved: block.layout.padding, effective: block.layout.padding }
      : { source: "inherited", effective: defaults.padding },
  };
}

function isVisibleInPreviewDevice(visibility: BlockVisibility, device: PreviewDevice) {
  if (visibility.enabled === false) return false;
  const shownDevices = visibility.devices ?? ["desktop", "tablet", "mobile"];
  return shownDevices.includes(device);
}

function resolvePublicVisibilityPolicy(visibility: BlockVisibility) {
  if (visibility.enabled === false) return { render: false };
  if (visibility.devices?.length === 0) return { render: false };
  return { render: true, deviceSpecific: Boolean(visibility.devices) };
}
```

## Regression Test Shape

- Advanced cannot label inherited padding as a saved `MD` override when runtime
  renders inherited `XL`.
- First layout edit has explicit override semantics.
- Empty Device Visibility either hides the block consistently or is relabeled so
  the public SSR no-device boundary is explicit and not presented as live hiding.

## Security Contract

No API routes are added. Visibility changes must not expose hidden privileged
content in admin-only previews; public SSR behavior must be deterministic.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/block-layout-shared-wave.test.tsx` after adding the new shared builder UI suite.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_PRODUCT_COMPARE_WIDGET.md`.
- Update `_docs/ADMIN_CACHE.md` only if shared block cache behavior changes.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Shared block layout summaries no longer imply false saved values.
- Device Visibility labels and public SSR behavior are aligned and tested.
