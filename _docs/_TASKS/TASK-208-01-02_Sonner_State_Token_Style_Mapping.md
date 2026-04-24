# TASK-208-01-02: Sonner State Token Style Mapping
# FileName: TASK-208-01-02_Sonner_State_Token_Style_Mapping.md

**Priority:** High
**Category:** Admin/UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-208-01-01
**Status:** To Do

---

## Overview

Make `core/admin/components/ui/sonner.tsx` the shared owner for token-backed
toast state styling.

The current wrapper maps only normal toast background/text/border variables.
This leaf adds success, error, warning, and info state variables backed by Admin
UI Theme tokens.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Keep this logic in the shared Sonner wrapper, not in Pages/Posts/Menus/Engine
  or Entries components.
- Use existing token variables:
  - `--popover`,
  - `--popover-foreground`,
  - `--border`,
  - `--radius`,
  - `--admin-state-success`,
  - `--admin-state-danger`,
  - `--admin-state-warning`.
- If Sonner's inline/default styles still win, add one shared selector block in
  `core/admin/styles/globals.css` scoped to `.toaster [data-sonner-toast]`.
- Do not hard-code Tailwind color families such as `emerald`, `rose`, `red`,
  `green`, `slate`, or `amber`.

## Pseudocode

```tsx
// core/admin/components/ui/sonner.tsx
const adminToastStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--success-bg": "color-mix(in srgb, var(--admin-state-success) 12%, var(--popover))",
  "--success-text": "var(--admin-state-success)",
  "--success-border": "color-mix(in srgb, var(--admin-state-success) 35%, var(--border))",
  "--error-bg": "color-mix(in srgb, var(--admin-state-danger) 12%, var(--popover))",
  "--error-text": "var(--admin-state-danger)",
  "--error-border": "color-mix(in srgb, var(--admin-state-danger) 35%, var(--border))",
  "--warning-bg": "color-mix(in srgb, var(--admin-state-warning) 14%, var(--popover))",
  "--warning-text": "var(--admin-state-warning)",
  "--warning-border": "color-mix(in srgb, var(--admin-state-warning) 35%, var(--border))",
  "--info-bg": "var(--popover)",
  "--info-text": "var(--popover-foreground)",
  "--info-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as React.CSSProperties;

return (
  <Sonner
    theme="light"
    className="toaster group"
    style={adminToastStyle}
    {...props}
  />
);
```

Fallback CSS if needed:

```css
.toaster [data-sonner-toast][data-type="success"] {
  background: var(--success-bg);
  color: var(--success-text);
  border-color: var(--success-border);
}
```

## Testing Requirements

- `tests/vitest/admin/adminApp.test.tsx`
  - expose wrapper style props in the mock,
  - assert success/error/warning/info variables contain Admin UI token names,
  - assert no rich color prop is required for visible state styling.

## Documentation Updates Required in This Round

- `_docs/DESIGN_TOKENS.md`
  - add a short section that Admin UI floating toasts are backed by shared
    Sonner variables and Admin UI Theme state tokens.

## Acceptance Criteria

1. Success, error, warning, info, and normal toast state variables are mapped to
   Admin UI Theme tokens.
2. Light Admin UI themes no longer inherit black/default Sonner state surfaces
   unless the active token set explicitly defines that look.
3. The mapping is shared and resource-neutral.
