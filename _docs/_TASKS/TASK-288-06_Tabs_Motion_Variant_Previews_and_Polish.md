# TASK-288-06: Tabs Motion Variant Previews and Polish

# FileName: TASK-288-06_Tabs_Motion_Variant_Previews_and_Polish.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render + UX Polish
**Estimated Effort:** Large
**Dependencies:** TASK-288-03, TASK-288-05, TASK-288
**Status:** To Do

---

## Overview

Add Tabs motion and variant-preview polish from
`_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows W11 and U1.

The current variant picker displays text descriptions only, and panel changes
are immediate because panels are toggled through `hidden`. After the core
activation and layout model is stable, Tabs can add bounded preview cards and
reduced-motion-safe transition options.

## Scope Boundary

This leaf owns Tabs polish only. It must not introduce global animation
frameworks, raw transition class persistence, or a shared variant-preview
system. If a reusable widget preview-card component already exists by
implementation time, consume it without changing other widgets.

## Sub-Tasks

- [ ] Add visual variant previews for `pills`, `underline`, and `minimal` in
  the Tabs variant picker.
- [ ] Add a bounded transition option such as `none`, `fade`, and `slide`
  without making motion required.
- [ ] Respect `prefers-reduced-motion` by disabling or simplifying transitions.
- [ ] Ensure hidden/inactive panels remain inaccessible according to the final
  TASK-256/TASK-288-03 activation contract.
- [ ] Keep transition classes deterministic and derived from normalized enum
  values only.
- [ ] Add editor and runtime tests for variant preview copy/markup and motion
  class output.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | Add visual variant miniatures and a bounded motion control. |
| `core/widgets/core/tabs.tsx` | Add motion enum/default/normalizer and deterministic runtime classes or data markers. |
| `tests/vitest/ui/tabs-editor-wave.test.tsx` | Add variant preview and motion-control assertions. |
| `tests/vitest/widgets/tabs.test.tsx` | Add SSR/normalization assertions for transition data/classes and reduced-motion-safe output. |
| `tests/unit/widgets/validator.test.ts` | Run and update if schema fields are added. |

## Implementation Pseudocode

```ts
type TabsMotion = "none" | "fade" | "slide";

function resolveTabsMotion(value: unknown): TabsMotion {
  if (value === "fade" || value === "slide") return value;
  return "none";
}

const panelMotionClassMap = {
  none: "",
  fade: "motion-safe:transition-opacity motion-safe:duration-150",
  slide: "motion-safe:transition motion-safe:duration-150 motion-safe:translate-y-0",
} as const;
```

Variant preview shape:

```tsx
function TabsVariantPreview({ option, selected }: TabsVariantPreviewProps) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      <span className={resolvePreviewTriggerClass(option.id, selected, true)} />
      <span className={resolvePreviewTriggerClass(option.id, selected, false)} />
    </span>
  );
}
```

Error handling:

- Unknown motion values normalize to `none`.
- Transitions must not leave inactive panels focusable.
- Motion settings must be optional and backward compatible.
- Preview miniatures are decorative and must not replace accessible labels.

## Regression Test Shape

- `tests/vitest/ui/tabs-editor-wave.test.tsx`: assert each variant card renders a
  miniature preview plus text label, and the motion control persists only
  bounded values.
- `tests/vitest/widgets/tabs.test.tsx`: assert SSR/data markers for motion enum
  output, reduced-motion-safe classes, and inactive-panel inaccessibility.
- `tests/unit/widgets/validator.test.ts`: extend schema coverage only if a new
  motion field lands.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update `tabsSchema` for motion fields.
- Anti-abuse: motion and preview output must come from bounded enum class maps;
  no raw classes, scripts, style strings, or HTML.
- Secret handling: no secrets in widget data, DOM markers, diagnostics, or
  reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema changes
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TABS.md` with variant preview and motion behavior.
- Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows W11 and U1 after
  validation.

## Changelog Policy

- Covered by the TASK-288 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Variant cards show visual previews without losing text labels.
- Tabs motion is optional, bounded, reduced-motion-safe, and tested.
- Inactive panels remain inaccessible according to the final activation model.
- No global animation or preview system is invented for this Tabs-only scope.
