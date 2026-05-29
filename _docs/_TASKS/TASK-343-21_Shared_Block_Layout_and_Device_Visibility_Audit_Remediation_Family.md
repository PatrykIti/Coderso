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
| `core/admin/ui/pages/builder/blockUtils.ts` | Distinguish inherited vs saved layout/visibility state. |
| `core/widgets/renderers/widgetRenderer.tsx` | Align public SSR visibility filtering with editor summaries or document no-op behavior. |
| `tests/vitest/ui/block-layout-shared-wave.test.tsx` | Cover inherited layout copy and first-edit override behavior. |
| `tests/vitest/widgets/widgetRenderer.test.tsx` | Cover public visibility filtering semantics. |

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

function shouldRenderForDevice(visibility: BlockVisibility, device: PreviewDevice | "public") {
  if (!visibility.devices?.length) return true;
  return !visibility.devices.includes(device);
}
```

## Regression Test Shape

- Advanced cannot label inherited padding as a saved `MD` override when runtime
  renders inherited `XL`.
- First layout edit has explicit override semantics.
- Empty Device Visibility renders as "visible on all devices" or equivalent,
  and public SSR behavior matches the label.

## Security Contract

No API routes are added. Visibility changes must not expose hidden privileged
content in admin-only previews; public SSR behavior must be deterministic.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/block-layout-shared-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/widgetRenderer.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_PRODUCT_COMPARE_WIDGET.md`.
- Update `_docs/ADMIN_CACHE.md` only if shared block cache behavior changes.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Shared block layout summaries no longer imply false saved values.
- Device Visibility labels and public SSR behavior are aligned and tested.
