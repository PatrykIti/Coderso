# Screen Field Group Widget (v1)

**Status:** Retired after TASK-468; kept only as legacy Custom Screens migration
input for V4 `field-group` blocks.

## Purpose

Legacy section wrapper for grouping related `screen-field-value` widgets and
other screen-safe children into one admin panel. Active V4 Custom Screens use
native `field-group` blocks instead.

## Widget ID

`screen-field-group`

## Surfaces and Data Access

- surfaces: retired `custom-screen-builder`, retired `admin-editor-view`
- data access: `selected-content-type` (`read`)
- selected-entry binding cards: not exposed; `title` and `description` stay
  layout-owned copy unless an old saved binding is being preserved only as
  compatibility data.

## Variants (v1)

- `card`: framed section with stronger separation from the canvas
- `subtle`: lighter grouping chrome for dense admin layouts

## Slots

- `content`: fixed slot for nested screen widgets

## Editor Modes

### Wizard

- group variant
- `title`
- `description`

### Visual

- primary copy editing for `title` and `description`
- slot guidance for grouping related field widgets into one deliberate section

### Advanced

- clearable frame tokens:
  `frameBackground`, `frameBorderColor`

## Nested Rendering

- The `content` slot renders nested screen widgets through the shared screen
  read-only bridge in preview and the read-only portions of the record editor.
- Nested child widgets are rendered as separate canvas blocks instead of being
  flattened into one parent-only surface.

## Clear Controls

- Clearing `frameBackground` or `frameBorderColor` removes the nested style key
  instead of writing `transparent` or another sentinel value.

## Data Model (summary)

```json
{
  "title": "Field group",
  "description": "Group related record fields and widgets into one admin panel.",
  "style": {
    "frameBackground": "color-mix(in srgb, var(--color-bg) 80%, transparent)",
    "frameBorderColor": "color-mix(in srgb, var(--color-border) 70%, transparent)"
  }
}
```
