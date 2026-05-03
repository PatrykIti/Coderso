# Screen Field Value Widget (v1)

## Purpose

Record field row/card primitive for showing one mapped value inside the Custom
Screens `Editor View` runtime.

## Widget ID

`screen-field-value`

## Surfaces and Data Access

- surfaces: `custom-screen-builder`, `admin-editor-view`
- data access: `selected-entry` (`read`, `write`)

## Variants (v1)

- `stacked`: label above value for card-like layouts
- `inline`: compact row with label block beside the value

## Editor Modes

### Wizard

- field variant
- primary content: `label`, `value`

### Visual

- binding-aware content controls for `label`, `value`, and `helper`
- `Data` shortcuts can jump to the matching binding card for the current
  `propPath`
- literal values remain valid when the screen should override mapped content

### Advanced

- tone (`default`, `strong`, `muted`)
- clearable frame tokens:
  `frameBackground`, `frameBorderColor`

## Inline Record Editing Contract

- Widget-owned binding targets:
  - `label` -> read-only
  - `value` -> read/write
  - `helper` -> read-only
- In builder preview and other read-only contexts, the widget renders the
  normalized label/value card or row.
- In the dedicated record editor, the widget can switch into an inline field
  control only when the `value` prop has a `write` or `readwrite` binding to a
  writable schema or system field.
- `label` and `helper` stay widget-owned copy even when `value` is field-bound,
  and unsupported write modes on those props are rejected at save time.

## Clear Controls

- Clearing `frameBackground` or `frameBorderColor` removes the nested style key
  instead of writing `transparent` or another sentinel value.

## Data Model (summary)

```json
{
  "label": "Field label",
  "value": "Mapped field value",
  "helper": "Optional helper text for editors and reviewers.",
  "tone": "default",
  "style": {
    "frameBackground": "color-mix(in srgb, var(--color-bg) 70%, transparent)",
    "frameBorderColor": "color-mix(in srgb, var(--color-border) 60%, transparent)"
  }
}
```
