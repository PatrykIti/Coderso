# Appointment Form Widget (v1)

## Purpose

Collect booking customer details for a previously selected slot and submit the
reservation through the bounded booking public-write contract.

## Widget ID

`appointment-form`

## Variants (current)

- `default`
- `compact`
- `inline`
- `sidebar`
- `card-summary`

`multi-step` is not part of the current Appointment Form contract. That remains
future product scope rather than an implicit variant of this widget.

## Editor Modes

### Wizard
- Booking Calendar picker; the technical pairing key is managed by the builder
- same-surface pairing feedback

### Visual
- variant selection
- form language preset
- page-first after-submit destination picker
- title/description
- submit/loading/success copy
- slot summary copy
- no-selection error copy
- optional service/resource summary context
- name mode (`full` or `split`)
- truthful field visibility and required toggles
- phone validation presets and help copy
- notes length limit
- consent label/required plus page-first privacy/terms pickers
- custom fields
- surface color swatches, including submit text color

### Advanced
- read-only reservation route status and booking flow summary
- read-only runtime diagnostics for submission nonce, captcha presence, and runtime error

Wizard/Visual do not ask nontechnical editors to type regex patterns or CSS
tokens, raw URLs, flow keys, or endpoint paths. Advanced diagnostics redact
server-injected nonce values and show presence only.

## Runtime Behavior Notes

- Server/admin markup starts with a disabled submit button until a slot exists.
- Runtime clears stale API errors on the first user edit after a failed submit.
- Successful submission clears the selected booking slot from shared runtime
  state before re-enabling the form.
- Selected-slot summary can render service/resource context and uses the widget
  locale override when configured.
- Success redirect and consent links are authored through page pickers in
  Wizard/Visual. Legacy custom destinations remain compatible as replace-or-
  clear state.
- Consent metadata and CAPTCHA token acquisition stay backend-owned; widget data
  does not store provider secrets.

## Runtime Markers

- `data-nextless-appointment-form`
- `data-booking-selected-slot`
- `data-booking-form-error`
- `data-booking-form-success`
- `data-booking-submit`
- `data-booking-notes-counter`
- `data-booking-consent-input`

## Clear Controls

- `style.frameBackground`
- `style.frameBorderColor`
- `style.summaryBackground`
- `style.summaryBorderColor`
- `style.submitBackground`
- `style.submitTextColor`

Configured-vs-default style state indicators are not widget-owned here. That
shared control state is routed to `TASK-256-02`.

## Current Data Model (summary)

```json
{
  "flowId": "booking-flow",
  "title": "Appointment details",
  "description": "Provide contact details and confirm the selected slot.",
  "slotSummaryLabel": "Selected slot",
  "slotSummaryEmptyMessage": "Select a slot in Booking Calendar first.",
  "noSelectionMessage": "Select a slot first.",
  "showServiceInSummary": true,
  "showResourceInSummary": true,
  "locale": "",
  "successRedirectUrl": "",
  "nameMode": "full",
  "customerNameLabel": "Full name",
  "customerFirstNameLabel": "First name",
  "customerLastNameLabel": "Last name",
  "showEmail": true,
  "requiredEmail": false,
  "showPhone": true,
  "requiredPhone": false,
  "phonePattern": "^\\+?[0-9()\\-.\\s]{7,20}$",
  "phonePatternMessage": "Use digits, spaces, parentheses, or an optional leading +.",
  "showNotes": true,
  "notesMaxLength": 500,
  "consent": {
    "enabled": false,
    "label": "I agree to the booking terms.",
    "required": true,
    "privacyUrl": "",
    "termsUrl": ""
  },
  "submitLabel": "Book appointment",
  "loadingMessage": "Booking...",
  "successMessage": "Appointment booked successfully.",
  "submissionEndpoint": "/api/booking/reservations"
}
```

## Shared Contract Notes

- Same-surface booking flow pairing feedback is now exposed through shared
  `WidgetEditorContext.bookingFlows`.
- Bounded custom-field answers now serialize into `metadata.customFields` using
  the existing public booking metadata contract.
- Shared public runtime nonce-cache freshness is handled at the site runtime
  cache layer.
- `UX-04` clearable style inheritance-state indicators route through
  `TASK-256-02`.
- Style fields are optional and absent by default. Runtime theme classes provide
  the default frame, summary, and submit appearance until an author chooses
  explicit swatches in Visual.
