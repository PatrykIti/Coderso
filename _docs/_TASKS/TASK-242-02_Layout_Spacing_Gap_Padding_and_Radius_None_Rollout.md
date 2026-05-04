# TASK-242-02: Layout, Spacing, Gap, Padding, and Radius None Rollout

# FileName: TASK-242-02_Layout_Spacing_Gap_Padding_and_Radius_None_Rollout.md

**Priority:** High
**Category:** Widgets + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-242-01
**Status:** Done (2026-04-29)

---

## Overview

Update widget schema/type/normalizer/render contracts for layout-facing visual
tokens. This subtask owns spacing, gaps, padding, radius, and off aliases for
numeric zero tokens.

## Sub-Tasks

- [x] TASK-242-02-01: Flow Layout and Container Widget None Tokens
- [x] TASK-242-02-02: Content, Form, Timeline, and Composite Widget None Tokens

## Security Contract

- Visibility: public runtime rendering plus internal admin editing.
- Auth model: no new endpoint.
- RBAC: unchanged page/template edit permissions.
- CSRF: unchanged admin saves.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: each schema enum must explicitly list `none`.
- Anti-abuse: render maps must map only known tokens to known class strings.

## Pseudocode

```ts
const gapClassMap: Record<WidgetGap, string> = {
  none: "gap-0",
  sm: "gap-3",
  md: "gap-5",
  lg: "gap-7",
};

const radiusClassMap: Record<WidgetRadius, string> = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};
```

## Testing Requirements

- Widget normalizer/render tests for each changed token family.
- Focused editor tests are owned by TASK-242-03.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Impacted `_docs/_WIDGETS/*.md` token examples.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Runtime renderers accept and render `none` for all spacing/gap/padding/radius
   fields in scope.
2. Existing default output remains unchanged.
3. Legacy `"0"` spacing data remains backward compatible.
