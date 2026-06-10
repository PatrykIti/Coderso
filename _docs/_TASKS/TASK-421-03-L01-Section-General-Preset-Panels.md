# TASK-421-03-L01: Section General Preset Panels
# FileName: TASK-421-03-L01-Section-General-Preset-Panels.md

**Parent Subtask:** TASK-421-03
**Priority:** High
**Category:** Admin UI / Pages / Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-421-03
**Status:** ⏳ To Do

---

## Overview

Implement the section-level preset panels from the reference: layout, style,
spacing, background, responsive, and visibility. Section controls should feel
like choosing from curated page-building presets, not editing raw data.

---

## Implementation Pseudocode

```tsx
function SectionInspectorPanels({ section, controls }) {
  return (
    <>
      <LayoutPanel controls={["variant", "columns", "align", "justify", "maxWidth"]} />
      <StylePanel controls={["accent", "radius", "shadow", "cardSurface"]} />
      <SpacingPanel controls={["paddingY", "paddingX", "gap"]} />
      <BackgroundPanel controls={["backgroundType", "background", "backgroundImage"]} />
      <ResponsivePanel controls={["breakpointState", "hidden", "resetOverrides"]} />
      <VisibilityPanel controls={["visible", "authOnly", "dateRange", "anchor"]} />
    </>
  );
}
```

Expected data flow:

- `variant` remains a base section value, not a responsive override.
- Columns/alignment/maxWidth remain responsive where the current registry says
  they are responsive.
- Padding controls may group top/bottom and left/right visually while writing
  existing individual paths.

Regression-test shape:

- Tests cover changing variant, columns, align, radius, shadow, background,
  padding/gap, visibility, auth-only, date range, and anchor.

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
