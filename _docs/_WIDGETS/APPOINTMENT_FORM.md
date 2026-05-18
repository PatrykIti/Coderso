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
- variant selection
- flow key
- locale override
- success redirect URL
- title/description
- submit/loading/success copy
- surface colors

### Visual
- slot summary copy
- no-selection error copy
- optional service/resource summary context
- name mode (`full` or `split`)
- truthful field visibility and required toggles
- phone pattern/help
- notes length limit
- consent label/required/privacy/terms controls
- surface colors, including submit text color

### Advanced
- runtime endpoint override
- read-only runtime diagnostics for submission nonce and runtime error

## Runtime Behavior Notes

- Server/admin markup starts with a disabled submit button until a slot exists.
- Runtime clears stale API errors on the first user edit after a failed submit.
- Successful submission clears the selected booking slot from shared runtime
  state before re-enabling the form.
- Selected-slot summary can render service/resource context and uses the widget
  locale override when configured.
- Success redirect is limited to relative or same-origin targets.
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

## Deferred Follow-Ups

- `UX-02` flow-key pairing feedback now routes through `TASK-294`.
- `BF-05` custom fields now route through `TASK-295`.
- `UX-04` clearable style inheritance-state indicators route through
  `TASK-256-02`.
