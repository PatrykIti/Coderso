# Screen Record Header Widget (v1)

## Purpose

Selected-entry summary header for Custom Screens `Editor View` and the
dedicated record editor.

## Widget ID

`screen-record-header`

## Surfaces and Data Access

- surfaces: `custom-screen-builder`, `admin-editor-view`
- data access: `selected-entry` (`read`)

## Variants (v1)

- `card`: fuller record summary with larger frame chrome
- `compact`: tighter header for dense admin layouts

## Editor Modes

### Wizard

- header variant
- primary content: `title`, `subtitle`
- optional chrome copy: `eyebrow`, `badge`

### Visual

- binding-aware content controls for:
  `eyebrow`, `title`, `subtitle`, `description`, `badge`
- `Data` shortcuts can jump to the matching binding card for the current
  `propPath`
- binding-state badges can surface `Literal`, `Bound`, or `Mixed` when editor
  context is available

### Advanced

- alignment (`start`, `center`)
- clearable frame tokens:
  `frameBackground`, `frameGradient`, `frameBorderColor`
- clearable badge tokens:
  `badgeBackground`, `badgeBorderColor`

## Binding Behavior

- The widget itself stays literal-safe, but Visual mode is aware of the current
  binding state for each displayed prop.
- Binding ownership remains in the shared `Data` tab; the widget editor only
  exposes jump/focus affordances and state hints.

## Clear Controls

- Clearing `frameBackground`, `frameGradient`, `frameBorderColor`,
  `badgeBackground`, or `badgeBorderColor` removes the nested style key instead
  of writing `transparent` or another sentinel value.
- A deliberate authored color string remains valid data and is not treated as a
  clear state.

## Data Model (summary)

```json
{
  "eyebrow": "Record overview",
  "title": "Untitled record",
  "subtitle": "Preview the primary content fields in one place.",
  "description": "Use bindings to map the header title, subtitle, description, and badge to entry fields.",
  "badge": "Draft",
  "align": "start",
  "style": {
    "frameGradient": "linear-gradient(135deg, var(--color-bg), var(--color-bg), color-mix(in srgb, var(--color-muted) 30%, transparent))",
    "frameBorderColor": "color-mix(in srgb, var(--color-border) 70%, transparent)",
    "badgeBackground": "color-mix(in srgb, var(--color-muted) 60%, transparent)",
    "badgeBorderColor": "color-mix(in srgb, var(--color-border) 70%, transparent)"
  }
}
```
