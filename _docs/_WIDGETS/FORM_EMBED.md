# Form Embed Widget (v1)

## Purpose

Embed a configured CMS form in a public page section with runtime submission
metadata.

## Widget ID

`form-embed`

## Variants (v1)

- `standard`: single embedded form surface
- `card`: framed form surface
- `inline`: compact form surface where supported by the form layout

## Editor Modes

### Wizard

- form selection
- title, description, and submit label
- layout basics

### Visual

- form access warning
- layout and field label controls
- style tokens

### Advanced

- normalized payload snapshot and technical tokens

## None Token Support

- `layout.width`: `none` removes the max-width preset.
- `layout.spacing`: `none` renders zero layout spacing.
- `style.radius`: `none` removes forced surface/input rounding.
- `style.inputSize`: `none` removes the input-size preset.

## Clear Controls

- `style.background` and `style.surface` are clearable; clear removes the
  section/form-surface color fields and the renderer omits the matching inline
  background styles.
- Submit button, form field accessibility, access policy, and input-size `none`
  behavior remain independent of surface clear.

## Security Notes

No new public write endpoint is introduced by the widget. Runtime submissions
continue through the form contract, including access, nonce, and CSRF/public
write hardening owned by the forms subsystem.

## Data Model (summary)

```json
{
  "formId": "",
  "title": "Form",
  "description": "",
  "submitLabel": "Submit",
  "layout": {
    "alignment": "start",
    "width": "md",
    "spacing": "md",
    "buttonAlignment": "start"
  },
  "fields": {
    "showLabels": true,
    "showRequiredIndicator": true
  },
  "style": {
    "background": "#f8fafc",
    "surface": "var(--color-bg)",
    "borderWidth": "1",
    "radius": "md",
    "inputSize": "md"
  }
}
```
