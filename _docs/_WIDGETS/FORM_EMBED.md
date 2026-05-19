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

- form selection
- selected-form diagnostics and no-form CTA
- title, description, submit label, and success-message copy
- basic layout and field-label controls

### Visual

- selected-form diagnostics with field count/type summary
- layout controls, including spacing, padding, field gap, and button alignment
- field label toggles
- surface, border, title, helper, and submit-button styling
- multi-step navigation labels and submit behavior controls

### Advanced

- selected-form diagnostics and runtime projection state
- read-only normalized payload snapshot

## Supported Field Types

Current Form Embed runtime support matches the live Forms field model:

- `text`
- `email`
- `phone`
- `date`
- `textarea`
- `checkbox`
- `select`

Unsupported legacy/runtime payload types render a visible non-submitting
diagnostic instead of silently coercing to a different control. Future field
model expansion for:

- `radio` and grouped choice semantics is routed through `TASK-311-01`
- `number`, `time`, `range`, and `rating` is routed through `TASK-311-02`
- `hidden` and `file` is routed through `TASK-311-03`

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
- Shared public HTML cache freshness for nonce-bearing Form Embed runtime is
  tracked outside the widget-local surface in `TASK-301`.

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
fields it controls, while shared CSS-variable swatch behavior remains owned by
the shared color-field helper introduced through `TASK-310`.

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
