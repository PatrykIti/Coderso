# Stack Widget (v1)

## Purpose

Flow layout primitive for arranging heterogeneous widgets in a predictable
one-dimensional wrapper with responsive direction, spacing, axis alignment, and
wrap control.

## Widget ID

`stack`

## Variants (v1 presets)

- `vertical`: preset column flow on all breakpoints
- `horizontal`: preset row flow on all breakpoints
- `responsive`: preset column flow on mobile and row flow on tablet/desktop

Variant selection is a starting preset, not a hard lock. Once an author edits
`direction.desktop|tablet|mobile`, the saved direction data remains the runtime
source of truth for that breakpoint.

## Slots

- `content` (fixed): single content slot for nested widgets

## Editor Modes

### Wizard
- one-time stack preset
- admin-safe `content` slot guidance
- note that Visual owns breakpoint spacing, alignment, distribution, and
  wrapping after setup

### Visual
Sections:
1. Variant and flow
2. Responsive direction
3. Responsive alignment and wrap
4. Slot guidance

Notes:
- Stack owns variant selection in Visual (`visualOwnsVariantSelection = true`).
- Variant cards include decorative miniatures for `vertical`, `horizontal`, and
  `responsive`.

### Advanced
- read-only runtime stack summaries for desktop, tablet, and mobile flow
- read-only support summary for legacy scalar compatibility and Visual ownership
- no raw payload snapshot
- no hidden editable direction/gap/alignment/wrap controls; Visual owns daily flow editing

## Runtime Behavior Notes

- Renders as a responsive flex container using per-breakpoint `direction`,
  `gap`, `align`, `justify`, and `wrap` values.
- Legacy scalar `align`, `justify`, and `wrap` values remain valid input and
  normalize to all three breakpoints.
- Compatibility markers `data-stack-align`, `data-stack-justify`, and
  `data-stack-wrap` always mirror the resolved mobile values.
- Breakpoint-specific markers expose the full responsive truth:
  - `data-stack-align-desktop|tablet|mobile`
  - `data-stack-justify-desktop|tablet|mobile`
  - `data-stack-wrap-desktop|tablet|mobile`
- Public runtime keeps a neutral empty placeholder (`Empty stack.`).
- Stack now renders nested children through the shared `row-flow-item` shell so
  row-flow layouts do not inherit the default full-width `WidgetRenderer`
  section/container wrapper inside the stack itself.
- Admin guidance for adding child widgets lives in editor surfaces, not public
  runtime output.

## Gap Token Notes

Allowlisted gap tokens:

- `none`
- `0`
- `1`
- `2`
- `3`
- `4`
- `5`
- `6`
- `8`
- `10`
- `12`

Legacy serialized `"0"` payloads still resolve to zero gap classes for backward
compatibility, but visible Stack controls now expose one canonical zero-gap
option (`none`) instead of two competing labels.

## Data Model (summary)

```json
{
  "direction": {
    "desktop": "column",
    "tablet": "column",
    "mobile": "column"
  },
  "gap": {
    "desktop": "6",
    "tablet": "6",
    "mobile": "4"
  },
  "align": {
    "desktop": "stretch",
    "tablet": "stretch",
    "mobile": "stretch"
  },
  "justify": {
    "desktop": "start",
    "tablet": "start",
    "mobile": "start"
  },
  "wrap": {
    "desktop": false,
    "tablet": false,
    "mobile": false
  }
}
```

Legacy scalar compatibility remains supported for persisted `align`, `justify`,
and `wrap` values, but editor writes now persist full breakpoint objects for the
fields they touch.
