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
UI Theme tokens. Sonner's documented `richColors` prop reads these state
variables when rendering typed `toast.success`, `toast.error`, `toast.warning`,
and `toast.info` notifications. It must preserve the existing dynamic theme
handoff from `useTheme()` so Admin UI Theme mode changes update all toast states
through runtime CSS variables.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Keep this logic in the shared Sonner wrapper, not in Pages/Posts/Menus/Engine
  or Entries components.
- Keep `richColors` on the shared `AdminApp` toaster. The wrapper's job is to
  override Sonner's rich-color variables with Admin UI Theme variables.
- Preserve the current dynamic `useTheme()` behavior. Do not hard-code
  `theme="light"` or any other fixed mode in the wrapper.
- Reference Admin UI Theme CSS variables directly in the style map so the active
  theme profile/template can update toast colors without remounting or rewriting
  resource components.
- Use existing token variables:
  - `--popover`,
  - `--popover-foreground`,
  - `--border`,
  - `--radius`,
  - `--admin-state-success`,
  - `--admin-state-danger`,
  - `--admin-state-warning`.
- Prefer the wrapper `style` map because Sonner applies it to the toaster host
  and its rich-color selectors read CSS variables from that host. Add a shared
  selector block in `core/admin/styles/globals.css` scoped to
  `.toaster [data-sonner-toast]` only if a rendered regression proves the
  variable map is not enough.
- Do not hard-code Tailwind color families such as `emerald`, `rose`, `red`,
  `green`, `slate`, or `amber`.

## Pseudocode

```tsx
// core/admin/components/ui/sonner.tsx
const { theme = "system" } = useTheme();

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
    theme={theme as ToasterProps["theme"]}
    className="toaster group"
    style={adminToastStyle}
    {...props}
  />
);
```

Fallback CSS only if a rendered regression proves the host variables are not
winning:

```css
.toaster [data-sonner-toast][data-type="success"] {
  background: var(--success-bg);
  color: var(--success-text);
  border-color: var(--success-border);
}
```

## Testing Requirements

- `tests/vitest/admin/sonner.test.tsx`
  - render the wrapper directly or through a focused mock,
  - assert success/error/warning/info variables contain Admin UI token names,
  - assert state styling is compatible with the shared host's `richColors`
    configuration and does not use Sonner's bundled HSL palette values,
  - assert the wrapper forwards the dynamic `useTheme()` value instead of a
    hard-coded literal theme.

## Documentation Updates Required in This Round

- `_docs/DESIGN_TOKENS.md`
  - add a short section that Admin UI floating toasts are backed by shared
    Sonner variables and Admin UI Theme state tokens.
  - document that new/custom Admin UI Theme modes propagate through CSS
    variables and must not require per-resource toast styling.

## Acceptance Criteria

1. Success, error, warning, info, and normal toast state variables are mapped to
   Admin UI Theme tokens.
2. Light Admin UI themes no longer inherit Sonner's bundled state palettes unless
   the active token set explicitly defines that look.
3. The mapping is shared and resource-neutral.
4. Theme mode changes propagate through dynamic Admin UI Theme variables and the
   shared wrapper, not through hard-coded state palettes.
