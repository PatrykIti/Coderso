# TASK-421-03-L01: Section General Preset Panels
# FileName: TASK-421-03-L01-Section-General-Preset-Panels.md

**Parent Subtask:** TASK-421-03
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421-03
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Implement the section-level preset panels from the reference: layout, style,
spacing, background, responsive, and visibility. Section controls should feel
like choosing from curated page-building presets, not editing raw data.

The layout panel must cover the reference baseline with ergonomic controls:
`Wariant` as segmented options such as Split / Centered / Full width,
`Content columns` as segmented `1 / 2 / 3 / 4`, `Vertical alignment` as
Top / Center / Bottom, and `Max width` as a bounded slider/stepper with a
visible pixel value such as `1080px`.

---

## Implementation Pseudocode

```tsx
function SectionInspectorPanels({ section, controls }) {
  return (
    <>
      <LayoutPanel controls={["variant", "columns", "align", "justify", "maxWidth"]} />
      <StylePanel controls={["accent", "radius", "shadow", "cardSurface", "typography"]} />
      <SpacingPanel controls={["paddingY", "paddingX", "margin", "gap"]} />
      <BackgroundPanel controls={["backgroundType", "background", "backgroundImage"]} />
      {/* Shell + breakpoint-state readout only; panel content is owned by TASK-425. */}
      <ResponsivePanel controls={["breakpointState"]} />
      <VisibilityPanel controls={["visible", "authOnly", "dateRange", "anchor"]} />
    </>
  );
}
```

Expected data flow:

- `ResponsivePanel` here is only a category shell with the breakpoint-state
  readout (base/override/inherited). Panel content is owned by TASK-425: the
  hide-on-screen toggles, vertical-layout toggle, per-field override list,
  reset actions, and device readouts are defined by TASK-425-01-L01 and
  implemented by TASK-425-02-L01. This leaf must not add Responsive-panel
  controls.
- `variant` remains a base section value, not a responsive override.
- Columns/alignment/maxWidth remain responsive where the current registry says
  they are responsive.
- Padding controls may group top/bottom and left/right visually while writing
  existing individual paths.
- `backgroundImage`, `anchor`, `startsAt`, and `endsAt` are currently
  supplemental raw fields in `PageEditor.tsx`; this leaf must either fold them
  into the registry or render them through explicit ergonomic controls.
- `visible`, `authOnly`, and "show in date range" use toggles. Date inputs may
  appear only after the date-range toggle is enabled.
- `anchor` remains a free-form text field because the target value is an author
  supplied string, but it must stay in the visibility panel and keep validation.
- Card mode, shadow, radius, accent/background/text colors, typography, margin,
  padding, and gap are general section presets, not widget-specific advanced
  panels.

Regression-test shape:

- Tests cover changing variant, columns, align, radius, shadow, background,
  padding/gap, visibility, auth-only, date range, and anchor.
- Tests assert the layout controls render as segmented/slider primitives, not
  native selects or number-arrow inputs.

---

## Security Contract

- **Endpoint visibility:** no endpoint changes.
- **Auth model:** existing admin session.
- **RBAC:** existing Pages permissions.
- **CSRF:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Validation:** section fields go through existing Page v2 normalizers.
- **Anti-abuse controls:** no arbitrary script/style injection controls.

---

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- None beyond the parent family docs; TASK-421-05 owns board/changelog sync.

---

## Completion Notes

Completed 2026-06-11 (see TASK-421-03): all universal section panels render dedicated widgets; live classifier on hero confirms zero native selects/numbers across the 7 panels.
