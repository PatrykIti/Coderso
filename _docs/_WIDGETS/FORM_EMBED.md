# Form Embed Compatibility Renderer (v1)

> **Product boundary:** this is legacy implementation documentation for the existing
> public Form block/section renderer in the historical `core/widgets` namespace. It is not
> a configurable Dashboard widget and is not a surface for adding a non-dashboard widget,
> editor, preset, registry entry, or block type. New authoring work belongs to the Forms
> builder and the owning section/block contracts.

## Purpose

Embed a CMS form on a public page through the existing Forms runtime contract.

The compatibility renderer resolves the selected form at runtime, renders the current supported
field model, runs conditional logic and multi-step navigation on the frontend,
and submits through `POST /forms/:id/submissions` with backend-owned
nonce/CAPTCHA enforcement.

## Historical implementation ID

`form-embed`

## Variants

- `standard`

`card` and `inline` were historical doc drift, not shipped runtime variants in
the current product contract.

## Legacy compatibility editor modes (do not extend)

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
  submit success behavior, success-message source, and redirect policy
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
- `file` (TASK-516-07 — nonce-gated upload to `POST /forms/:id/uploads`; submitted
  value is an owned media reference, validated as such on the submission path)

Unsupported legacy/runtime payload types render a visible non-submitting
diagnostic instead of silently coercing to a different control.

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
  - `data-form-embed-runtime-boundary`
  - `data-form-progress-root`
  - `data-form-progress-text`
  - `data-form-progress-bar`
  - `data-form-embed-success`
  - `data-form-embed-error`
- Conditional field logic still disables hidden controls so they do not submit.
- Multi-step forms support configurable Back/Next labels, progress display, and
  saved-progress expiry.
- Saved progress never restores a user past an incomplete required previous
  step; submit validates all visible steps up to the current step before
  posting.
- Checkbox controls submit backend-compatible boolean values, not the browser
  default `on` string.
- A public File field uploads each selected file through
  `POST /forms/:id/uploads` before the final submission. Pending uploads disable
  Submit/Back/Next; required fields cannot submit without owned Media IDs, and a
  `multiple` field preserves selection order.
- Upload progress uses the field's accessible status node. A failed upload changes it to
  an alert, releases action locks, keeps the final submission unsent, and permits retry
  without reloading. Clearing/resetting returns the same node to its neutral screen-reader
  state and invalidates stale upload work.
- Runtime binding is idempotent. Additional Form Embed instances inserted after
  the first runtime script call the shared binder and bind independently.
- Success behavior is configurable:
  - hide form after success
  - reset form after success
  - keep form visible after success
- Widget success copy takes precedence over form/runtime response copy when it
  is configured. Otherwise the selected form/runtime response can provide the
  success message.
- Redirects follow only same-origin relative `runtime.redirectUrl` values from
  the submit response. Absolute, protocol-relative, and script URLs are ignored
  by the browser runtime and rejected at the form persistence boundary for
  form-level success redirects.
- Shared public HTML cache freshness for nonce-bearing Form Embed runtime now
  skips site HTML caching at the shared runtime layer.
- Public unresolved/error states render user-facing unavailable messages and do
  not expose raw internal runtime error codes.
- Internal-only resolved forms render a noninteractive public boundary and do
  not emit a submit form or runtime script.
- Form field settings use `formStep` for multi-step grouping and `inputStep`
  for number/range/time input increments. Legacy `settings.step` remains a
  non-destructive form-step adapter and is not used as an input increment.
- The public embed INHERITS the form-owned theme (`forms.settings.theme`,
  TASK-516) through `pageRendererV2` `mapFormBindingToEmbedData`: the form theme
  is the render BASE and the per-embed `FormEmbedStyle` OVERRIDES it per explicit
  token (form theme = base, embed wins per-token; an unset embed token falls
  through to the form theme, an unset form token to the built-in default). Every
  theme-derived color still passes `resolveClearableCssColorValue` before reaching
  an inline style.
- TASK-516 deliberately uses the shared `inherited-render` profile end to end:
  Form write normalization, persisted-read resolution, builder canvas, runtime
  preview/resolver, public renderer, and this retained bridge all accept
  canonical `currentColor` and `inherit`. The eight direct per-embed fields are
  `background`, `surface`, `borderColor`, `titleColor`, `labelColor`,
  `helperColor`, `submitBackground`, and `submitTextColor`.
- Color schema patterns are structural prefilters only. The shared semantic
  parser still enforces original-input length, ranges, function arity, and
  canonical output; rejected legacy input is omitted rather than rendered raw.
  On an authored `style` object the eight per-embed overrides remain sparse.
  A legacy record with no `style` object retains Form Embed's historical theme
  defaults (including `transparent` background); TASK-541 adds no replacement
  bytes.

## Security Notes

The existing public Form block/section runtime writes only to
`POST /forms/:id/uploads` and `POST /forms/:id/submissions`.

- Public route visibility is limited to those upload/submission paths; there is no new
  endpoint or non-dashboard widget route.
- Public submissions use the Forms access evaluator, the `public_write`
  rate-limit bucket keyed by form id, strict request schema validation, and an opaque
  server-minted form submission nonce. Its wire value is `timestamp.signature`; the
  form ID is bound inside the signed server payload and clients must not construct it.
- Nonce enforcement remains backend-owned and runtime-only.
- Public CAPTCHA policy remains backend-owned.
- Internal forms require an authenticated session or API key with the existing
  Forms submit scope; public pages fail closed to a noninteractive boundary.
- The compatibility renderer may project only safe public bot-protection metadata:
  - provider
  - public site key
  - action
- Provider secrets, nonce secrets, thresholds, privileged security settings, and
  runtime nonce strings must never be persisted in authored block/section JSON. Runtime-rendered
  nonce inputs are injected only by server-side form resolution for the current
  request.

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

Runtime resolution may provide a `resolved` object with form metadata, field
metadata, public bot-protection metadata, and a request-scoped
`submissionNonce`. The persisted widget schema rejects `resolved.submissionNonce`;
saved widget data should keep only author-owned settings such as `formId`, copy,
layout, style, navigation, and submit behavior.
