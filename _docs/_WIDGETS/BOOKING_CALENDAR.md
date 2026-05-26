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
- booking flow picker; the technical pairing key is managed by the builder
- slot interval
- optional default service/resource selected from the resolved booking catalog
- `defaultDate`, `minDate`, `maxDate`

### Visual
- variant ownership
- title/description/labels
- status copy plus user-facing empty state
- service context toggles (`price`, `duration`, `description`, `timezone`)
- date language preset and date style
- date picker mode (`native` / `week`)
- slot interval mode (`fixed`, `service-duration`, `non-overlapping`)
- frame and selected-slot style surface swatches

### Advanced
- read-only slot-loading route status
- read-only booking flow and default service/resource diagnostics
- read-only resolved runtime/admin-preview diagnostics

Wizard never asks editors to type raw flow keys or service/resource IDs. Visual
surface colors use swatches and clear controls instead of CSS-variable/token
text inputs. Advanced keeps legacy custom route data compatible but does not
offer endpoint text editing in normal authoring.

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
  "slotsEndpoint": "/api/booking/slots"
}
```

Style fields are optional and absent by default. When an author chooses swatches
in Visual, the widget stores those explicit style values; otherwise runtime
theme classes provide the default frame and slot appearance.
