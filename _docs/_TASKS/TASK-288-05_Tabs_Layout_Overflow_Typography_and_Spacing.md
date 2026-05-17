# TASK-288-05: Tabs Layout Overflow Typography and Spacing

# FileName: TASK-288-05_Tabs_Layout_Overflow_Typography_and_Spacing.md

**Priority:** High
**Category:** Widgets + Layout + Runtime Render + Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-02, TASK-288-01, TASK-288
**Status:** To Do

---

## Overview

Add Tabs-owned layout, overflow, typography, and spacing controls from
`_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows W3, W8, W9, W12, U6, and R1.

The current renderer uses `justify-*` for both horizontal and vertical tablists.
That works for a horizontal row but is misleading for vertical orientation
because it aligns along the column main axis instead of positioning triggers
horizontally. Several other visual choices are also hardcoded:
`text-sm`, `font-medium`, `space-y-4`, `p-4`, `gap-2`, wrapping behavior, and
full-width container layout.

## Scope Boundary

This leaf owns Tabs layout/style fields only. It must not introduce raw class
string persistence or a shared design-token model. Use bounded enum/token
fields and the existing style resolver patterns.

Generic clear/none token semantics remain TASK-256-02. If the final shared
spacing/size token helper lands there, this leaf must consume it.

## Sub-Tasks

- [ ] Fix existing vertical alignment so `alignment=center/end` maps to
  horizontal cross-axis alignment for vertical tablists.
- [ ] Add a bounded `triggerOverflow` or equivalent option for wrap vs
  horizontal scroll behavior.
- [ ] Add bounded trigger typography fields for size and weight.
- [ ] Add bounded spacing fields for container padding, tablist gap, and
  tablist-to-panel gap.
- [ ] Add a bounded `maxWidth` field for the Tabs container.
- [ ] Update editor controls in Visual/Advanced and only expose beginner-safe
  choices in Wizard if TASK-288-02 decides they belong there.
- [ ] Preserve existing default rendering for legacy payloads.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/tabs.tsx` | Extend schema/defaults/normalizer and runtime class maps for alignment, overflow, typography, spacing, and max-width. |
| `core/admin/ui/widgets/editors/TabsEditors.tsx` | Add bounded controls with labels that explain orientation-specific alignment. |
| `tests/vitest/widgets/tabs.test.tsx` | Add normalization and SSR assertions for vertical alignment, overflow, typography, spacing, and max-width. |
| `tests/vitest/ui/tabs-editor-wave.test.tsx` | Add editor coverage for new controls and enum persistence. |
| `tests/unit/widgets/validator.test.ts` | Run and update for new schema fields. |

## Implementation Pseudocode

```ts
const horizontalAlignmentClassMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const;

const verticalAlignmentClassMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;

function resolveTablistClassName(options: NormalizedTabsOptions) {
  const orientation = options.orientation ?? "horizontal";
  const alignment = options.alignment ?? "start";
  return joinClasses(
    orientation === "vertical" ? "flex flex-col" : resolveHorizontalOverflow(options.overflow),
    resolveGapClass(options.triggerGap),
    orientation === "vertical"
      ? verticalAlignmentClassMap[alignment]
      : horizontalAlignmentClassMap[alignment]
  );
}
```

Data model shape:

```ts
type TabsLayoutOptions = {
  triggerOverflow?: "wrap" | "scroll";
  maxWidth?: "full" | "3xl" | "5xl" | "readable";
  containerPadding?: "sm" | "md" | "lg";
  triggerGap?: "sm" | "md" | "lg";
  panelGap?: "sm" | "md" | "lg";
  triggerTextSize?: "xs" | "sm" | "base";
  triggerFontWeight?: "normal" | "medium" | "semibold";
};
```

Error handling:

- Unknown enum values must normalize to current defaults.
- `triggerOverflow="scroll"` must preserve keyboard focus visibility and not
  hide active triggers from horizontal scrolling.
- Vertical orientation must ignore horizontal wrapping choices that do not
  apply.
- No raw Tailwind class names are persisted.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update `tabsSchema` for each new option/style key.
- Anti-abuse: only bounded enum/token values may reach class maps; no raw CSS
  class strings, inline scripts, or user-authored HTML.
- Secret handling: no secrets in widget data, DOM markers, diagnostics, or
  reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/tabs.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/tabs-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TABS.md` with new layout, overflow, typography,
  spacing, and max-width fields.
- Update `_docs/PLAYWRIGHT/REPORT_TABS_WIDGET.md` rows W3, W8, W9, W12, U6,
  and R1 after validation.

## Changelog Policy

- Covered by the TASK-288 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Vertical Tabs alignment behaves according to the visible alignment control.
- Overflow, typography, spacing, and max-width controls are bounded and tested.
- Legacy Tabs render with the same default visual shape unless users opt into
  new fields.
- No raw class-string persistence or shared token duplication is introduced.

