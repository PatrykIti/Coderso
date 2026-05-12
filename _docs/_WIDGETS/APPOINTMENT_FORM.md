# Appointment Form Widget (v1)

## Purpose

Collect booking customer details for a previously selected slot through the
booking submission contract.

## Widget ID

`appointment-form`

## Variants (v1)

- `default`

## Editor Modes

### Wizard
- title/copy basics
- field visibility

### Visual
- copy and placeholders
- optional fields
- summary and submit styling

### Advanced
- resolved nonce payload
- diagnostics

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-nextless-appointment-form`
  - `data-booking-selected-slot`
  - `data-booking-form-error`
  - `data-booking-form-success`
  - `data-booking-submit`
- Selected-slot summary is read from the booking runtime state.
- Submission nonce and runtime errors stay in the resolved payload.

## Clear Controls

- `style.frameBackground`, `style.summaryBackground`, and
  `style.submitBackground` are clearable.

## Data Model (summary)

```json
{
  "flowId": "booking-flow",
  "title": "Appointment details",
  "description": "Provide contact details and confirm the selected slot.",
  "slotSummaryLabel": "Selected slot",
  "customerNameLabel": "Full name",
  "customerEmailLabel": "Email",
  "customerPhoneLabel": "Phone",
  "notesLabel": "Notes",
  "submitLabel": "Book appointment",
  "showPhone": true,
  "showNotes": true,
  "submissionEndpoint": "/api/booking/reservations"
}
```
