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
This leaf adds success, error, warning, and info Sonner variables without
inventing a new Admin UI Theme token family. Success, warning, and error map to
the existing `state.success`, `state.warning`, and `state.danger` tokens. Info
uses the neutral popover/background token set unless a separate token-contract
task adds a first-class Admin UI Theme info state. Sonner's documented
`richColors` prop reads these state variables when rendering typed
`toast.success`, `toast.error`, `toast.warning`, and `toast.info`
notifications. It must preserve the existing dynamic theme handoff from
`useTheme()` so Admin UI Theme mode changes update all toast states through
runtime CSS variables. The visual contract covers the entire floating toast
window: shell, title, description text, border, close button, focus state, and
typed state colors must all derive from the active Admin UI Theme
template/profile.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Keep this logic in the shared Sonner wrapper, not in Pages/Posts/Menus/Engine
  or Entries components.
- Keep `richColors` on the shared `AdminApp` toaster. The wrapper's job is to
  override Sonner's rich-color variables with Admin UI Theme variables.
- Preserve the current dynamic `useTheme()` behavior. Do not hard-code
  `theme="light"` or any other fixed mode in the wrapper.
- Preserve the shared wrapper ownership when forwarding props. Destructure
  caller `className` and `style`, merge `className` so the `.toaster` selector is
  never lost, and merge styles as `{ ...adminToastStyle, ...style }` so callers
  can extend layout variables without removing the token-backed defaults.
- Reference Admin UI Theme CSS variables directly in the style map so the active
  theme profile/template can update toast colors without remounting or rewriting
  resource components.
- Treat Sonner's bundled CSS as hostile to the Admin UI Theme contract wherever
  it hard-codes visible colors. Override any hard-coded description,
  close-button, border, focus, or state selector through the shared wrapper or a
  `.toaster`-scoped block in `core/admin/styles/globals.css`.
- Use existing token variables:
  - `--popover`,
  - `--popover-foreground`,
  - `--border`,
  - `--ring`,
  - `--radius`,
  - `--admin-state-success`,
  - `--admin-state-danger`,
  - `--admin-state-warning`.
- Do not introduce `--admin-state-info` in this task. Map Sonner's `--info-*`
  variables to neutral Admin UI Theme variables unless the Admin UI Theme token
  schema is extended by a separate task.
- Prefer the wrapper `style` map because Sonner applies it to the toaster host
  and its rich-color selectors read CSS variables from that host. Add a shared
  selector block in `core/admin/styles/globals.css` scoped to
  `.toaster [data-sonner-toast]` when Sonner's stylesheet hard-codes visible
  sub-parts that cannot be overridden by host variables alone.
- Do not hard-code Tailwind color families such as `emerald`, `rose`, `red`,
  `green`, `slate`, or `amber`.

## Pseudocode

```tsx
// core/admin/components/ui/sonner.tsx
const { className, style, ...sonnerProps } = props;
const { theme = "system" } = useTheme();

const adminToastStyle = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--normal-border-hover": "var(--border)",
  "--normal-bg-hover": "color-mix(in srgb, var(--popover-foreground) 6%, var(--popover))",
  "--gray12": "var(--popover-foreground)",
  "--gray5": "var(--border)",
  "--gray4": "var(--border)",
  "--gray2": "color-mix(in srgb, var(--popover-foreground) 6%, var(--popover))",
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
    {...sonnerProps}
    theme={theme as ToasterProps["theme"]}
    className={className ? `toaster group ${className}` : "toaster group"}
    style={{ ...adminToastStyle, ...style }}
  />
);
```

Shared CSS for hard-coded Sonner sub-parts that are not fully controlled by host
variables:

```css
.toaster [data-sonner-toast][data-styled="true"] [data-description] {
  color: var(--popover-foreground);
  opacity: 0.82;
}

.toaster [data-sonner-toast][data-styled="true"] [data-close-button] {
  background: var(--popover);
  color: var(--popover-foreground);
  border-color: var(--border);
}

.toaster [data-sonner-toast][data-styled="true"]:focus-visible,
.toaster [data-sonner-toast][data-styled="true"] [data-close-button]:focus-visible {
  box-shadow: 0 0 0 2px var(--ring);
}

.toaster [data-sonner-toast][data-styled="true"]:hover [data-close-button]:hover {
  background: color-mix(in srgb, var(--popover-foreground) 6%, var(--popover));
  border-color: var(--border);
}

.toaster [data-sonner-toast][data-type="success"] {
  background: var(--success-bg);
  color: var(--success-text);
  border-color: var(--success-border);
}

.toaster [data-rich-colors="true"][data-sonner-toast][data-type="success"] [data-close-button] {
  background: var(--success-bg);
  color: var(--success-text);
  border-color: var(--success-border);
}
```

## Testing Requirements

- `tests/vitest/admin/sonner.test.tsx`
  - render the wrapper directly or through a focused mock,
  - assert success/error/warning variables contain Admin UI state token names
    and info variables contain neutral Admin UI popover token names,
  - assert normal, state, description, border, and close-button styling is
    backed by Admin UI Theme variables or by `.toaster`-scoped shared CSS,
  - assert toast and close-button focus rings plus close-button hover styling do
    not rely on Sonner's bundled gray/rgba palette,
  - use a custom Admin UI Theme token fixture with intentionally non-Sonner
    values so the test fails if the rendered floating toast falls back to
    Sonner's bundled palette,
  - assert state styling is compatible with the shared host's `richColors`
    configuration and does not use Sonner's bundled HSL palette values,
  - assert the wrapper forwards the dynamic `useTheme()` value instead of a
    hard-coded literal theme,
  - assert caller `className` and `style` props are merged without dropping the
    `.toaster` selector or the token-backed default CSS variables.

## Documentation Updates Required in This Round

- `_docs/DESIGN_TOKENS.md`
  - add a short section that Admin UI floating toasts are backed by shared
    Sonner variables and Admin UI Theme state tokens.
  - document that new/custom Admin UI Theme modes propagate through CSS
    variables and must not require per-resource toast styling.
  - document that the floating toast description, close button, border, and
    focus styling are part of the Admin UI Theme surface, not Sonner defaults.

## Acceptance Criteria

1. Success, error, warning, info, and normal toast state variables are mapped to
   Admin UI Theme tokens.
2. Description text, close button, border, and focus styling are token-backed or
   overridden through shared `.toaster`-scoped CSS.
3. Light Admin UI themes no longer inherit Sonner's bundled state palettes unless
   the active token set explicitly defines that look.
4. The mapping is shared and resource-neutral.
5. Theme mode changes propagate through dynamic Admin UI Theme variables and the
   shared wrapper, not through hard-coded state palettes.
6. Forwarded `className` and `style` props cannot remove the `.toaster` selector
   or replace the shared token variable map.
