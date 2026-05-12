# Booking Calendar Widget (v1)

## Purpose

Render booking service/resource/date selection with slot refresh against the
 booking runtime flow contract.

## Widget ID

`booking-calendar`

## Variants (v1)

- `default`

## Editor Modes

### Wizard
- booking flow basics
- title/copy basics

### Visual
- labels and copy
- defaults and refresh behavior
- frame styling

### Advanced
- resolved services/resources payload
- diagnostics

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-nextless-booking-calendar`
  - `data-widget="booking-calendar"`
  - `data-booking-service`
  - `data-booking-resource`
  - `data-booking-date`
  - `data-booking-refresh`
  - `data-booking-slots-status`
  - `data-booking-selected-summary`
  - `data-booking-slots`
- Service/resource payloads are normalized before render.
- Slot refresh behavior is delegated to the booking runtime client script.

## Clear Controls

- `style.frameBackground` is clearable.

## Data Model (summary)

```json
{
  "flowId": "booking-flow",
  "title": "Choose appointment slot",
  "description": "Pick service, resource, and date to see available time slots.",
  "serviceLabel": "Service",
  "resourceLabel": "Resource",
  "dateLabel": "Date",
  "refreshLabel": "Refresh slots",
  "intervalMinutes": 15,
  "slotsEndpoint": "/api/booking/slots"
}
```
