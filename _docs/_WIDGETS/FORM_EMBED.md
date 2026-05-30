# Form Embed Widget (v1)

## Purpose

Embed a CMS form on a public page through the existing Forms runtime contract.

The widget resolves the selected form at runtime, renders the current supported
field model, runs conditional logic and multi-step navigation on the frontend,
and submits through `POST /forms/:id/submissions` with backend-owned
nonce/CAPTCHA enforcement.

## Widget ID

`form-embed`

## Variants

- `standard`

`card` and `inline` were historical doc drift, not shipped runtime variants in
the current product contract.

## Editor Modes

### Wizard

- form selection and first-time embed setup
- read-only selected-form diagnostics and no-form guidance

Wizard intentionally does not own copy, layout, field-label, style, navigation,
or submit-behavior controls. Those are daily editing controls and live in
Visual so the one-time Wizard lifecycle can hide setup later without trapping
routine edits.

### Visual

- read-only form preview summary with field count/type summary
- title, description, submit label, and success-message copy
- layout controls, including a spacing macro that updates vertical padding,
  explicit padding, field gap, and button alignment
- field label toggles
- surface, border, title, helper, and submit-button styling through swatches
  and clear controls, without raw CSS/token text inputs
- multi-step navigation labels and submit behavior controls

### Advanced

- read-only runtime status and compatibility notes
- read-only submission routing/access, nonce policy, bot-protection presence,
  and submit success behavior
- read-only human authoring summary for copy, layout, field display, style,
  navigation, and submit behavior
- read-only editor contract summary

Advanced must not render the form picker or any wrapper visual/copy controls.
It must not render normalized JSON payload snapshots, raw endpoints, raw form
IDs, nonce values, public site keys, or API-scope copy.

## Supported Field Types

Current Form Embed runtime support matches the live Forms field model:

- `text`
- `email`
- `phone`
- `date`
- `time`
- `number`
- `range`
- `rating`
- `textarea`
- `checkbox`
- `select`
- `radio`
- `hidden`

Unsupported legacy/runtime payload types render a visible non-submitting
diagnostic instead of silently coercing to a different control. `file` remains
explicit unsupported scope under the current trusted-field contract.

## Accessibility Contract

- The section uses accessible naming through `aria-labelledby` / fallback
  `aria-label`.
- Field labels are connected through stable `id` / `htmlFor`.
- Hidden labels fall back to `aria-label`.
- Helper copy is connected through `aria-describedby`.
- Required fields add `aria-required="true"`.
- Success and error messages are live regions.

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-nextless-form-runtime`
  - `data-form-progress-root`
  - `data-form-progress-text`
  - `data-form-progress-bar`
  - `data-form-embed-success`
  - `data-form-embed-error`
- Conditional field logic still disables hidden controls so they do not submit.
- Multi-step forms support configurable Back/Next labels, progress display, and
  saved-progress expiry.
- Success behavior is configurable:
  - hide form after success
  - reset form after success
  - keep form visible after success
- Redirects follow `runtime.redirectUrl` from the submit response.
- Shared public HTML cache freshness for nonce-bearing Form Embed runtime now
  skips site HTML caching at the shared runtime layer.
- Public unresolved/error states render user-facing unavailable messages and do
  not expose raw internal runtime error codes.

## Security Notes

No new public write endpoint is introduced by the widget.

- Nonce enforcement remains backend-owned.
- Public CAPTCHA policy remains backend-owned.
- The widget may project only safe public bot-protection metadata:
  - provider
  - public site key
  - action
- Provider secrets, nonce secrets, thresholds, and other privileged security
  settings must never appear in widget JSON or public DOM.

## Clear Controls

The current editor exposes clear behavior for the Form Embed-owned color/surface
fields it controls through the shared swatch-only color helper. Saved custom
color values can be replaced through the picker or cleared, but nontechnical
authors are not asked to type CSS variables, token names, or color code strings.
Pristine theme-token defaults are treated as `Theme default`, not saved custom
overrides. The `Background` field clears to transparent; other authored colors
remove the saved key and fall back to their runtime theme defaults.

## Data Model (summary)

```json
{
  "formId": "form-123",
  "title": "Contact us",
  "description": "We reply within one business day.",
  "submitLabel": "Send message",
  "successMessage": "Thanks for your submission.",
  "layout": {
    "alignment": "start",
    "width": "md",
    "spacing": "md",
    "sectionPaddingX": "sm",
    "sectionPaddingY": "md",
    "fieldGap": "md",
    "headingLevel": "2",
    "buttonAlignment": "start"
  },
  "fields": {
    "showLabels": true,
    "showRequiredIndicator": true
  },
  "navigation": {
    "backLabel": "Back",
    "nextLabel": "Next",
    "showProgress": true,
    "savedProgressTtlDays": 7
  },
  "submitBehavior": {
    "loadingLabel": "Sending...",
    "successBehavior": "show-message-hide-form"
  },
  "style": {
    "background": "transparent",
    "surface": "var(--color-bg)",
    "borderColor": "var(--color-border)",
    "borderWidth": "1",
    "radius": "md",
    "inputSize": "md",
    "titleColor": "var(--color-text)",
    "titleSize": "md",
    "titleWeight": "semibold",
    "labelColor": "var(--color-text)",
    "helperColor": "var(--color-text)",
    "submitBackground": "var(--color-primary)",
    "submitTextColor": "var(--color-bg)"
  }
}
```
