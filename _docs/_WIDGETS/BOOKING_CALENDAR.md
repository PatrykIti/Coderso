# Booking Calendar Widget (v2)

## Purpose

Render booking service/resource/date selection with resolved catalog context,
bounded public slot lookup, and runtime slot handoff to `appointment-form`.

## Widget ID

`booking-calendar`

## Variants

- `default`
- `compact`
- `inline`
- `horizontal`

## Editor Modes

### Wizard
- flow key
- title/description/labels
- frame and selected-slot style surface controls
- slot interval
- `defaultDate`, `minDate`, `maxDate`

### Visual
- variant ownership
- status copy plus user-facing empty state
- service context toggles (`price`, `duration`, `description`, `timezone`)
- summary locale/date style
- date picker mode (`native` / `week`)
- slot interval mode (`fixed`, `service-duration`, `non-overlapping`)

### Advanced
- slots endpoint override
- catalog-aware default service/resource pickers
- resolved runtime/admin-preview diagnostics
- layout and visibility through shared builder panels

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-nextless-booking-calendar`
  - `data-widget="booking-calendar"`
  - `data-booking-service`
  - `data-booking-resource`
  - `data-booking-date`
  - `data-booking-refresh`
  - `data-booking-clear-selection`
  - `data-booking-slots-status`
  - `data-booking-loading-skeleton`
  - `data-booking-selected-summary`
  - `data-booking-service-context`
  - `data-booking-resource-timezone`
  - `data-booking-week-picker`
  - `data-booking-week-days`
  - `data-booking-slots`
- Admin page-builder preview hydrates a catalog-only `resolved` payload from
  booking admin caches without persisting preview data into page JSON.
- Public slot reads remain server-authoritative for past-date blocking. Signed
  slot tokens add optional `minDate` / `maxDate` claims when the widget uses an
  explicit date range.
- `slotIntervalMode` changes the public query interval:
  - `fixed` uses `intervalMinutes`
  - `service-duration` uses the selected service duration
  - `non-overlapping` uses `max(intervalMinutes, serviceDuration)`
- `datePickerMode="week"` renders a bounded seven-day picker and fetches
  per-day availability counts through the existing public slots route.
- Runtime preserves the current selection when the refreshed slot list still
  contains it, otherwise clears selection and emits
  `nextless:booking-slot-selected` with `selection: null`.
- `appointment-form` compatibility remains additive: the shared runtime event
  still carries `serviceId`, `resourceId`, `startsAt`, `endsAt`, and `timezone`.

## Clear Controls

- `style.frameBackground` is clearable.
- `style.frameBorderColor` is clearable.
- `style.selectedSlotBackground` is clearable.
- `style.selectedSlotBorderColor` is clearable.
- `style.slotHoverBorderColor` is clearable.

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
  "missingSelectionMessage": "Choose service, resource, and date first.",
  "emptySlotsMessage": "No available slots for selected date.",
  "loadingMessage": "Loading slots...",
  "errorMessage": "Unable to load slots right now.",
  "selectedSlotEmptyMessage": "No slot selected yet.",
  "emptyStateMessage": "Booking is currently unavailable. Please try another service or contact us.",
  "intervalMinutes": 15,
  "defaultDate": "2030-01-15",
  "minDate": "2030-01-10",
  "maxDate": "2030-01-20",
  "showServicePrice": true,
  "showServiceDuration": true,
  "showServiceDescription": false,
  "showTimezone": true,
  "summaryLocale": "pl-PL",
  "summaryDateStyle": "short",
  "datePickerMode": "week",
  "slotIntervalMode": "non-overlapping",
  "defaultServiceId": "service-1",
  "defaultResourceId": "resource-1",
  "slotsEndpoint": "/api/booking/slots",
  "style": {
    "frameBackground": "var(--color-bg)",
    "frameBorderColor": "var(--color-border)",
    "selectedSlotBackground": "var(--color-primary)",
    "selectedSlotBorderColor": "var(--color-primary)",
    "slotHoverBorderColor": "var(--color-primary)"
  }
}
```
