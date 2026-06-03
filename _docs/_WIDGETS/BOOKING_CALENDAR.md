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
- booking flow diagnostics use the same peer-calendar filtering as Wizard and
  never report the current calendar block as its own match

Wizard never asks editors to type raw flow keys or service/resource IDs. Visual
surface colors use swatches and clear controls instead of CSS-variable/token
text inputs. Advanced keeps legacy custom route data compatible but does not
offer endpoint text editing in normal authoring.

## Runtime Behavior Notes

- Runtime emits deterministic markers:
  - `data-nextless-booking-calendar`
  - `data-widget="booking-calendar"`
  - `data-booking-service`
  - `data-submission-access` on service options
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
  - `data-booking-week-date`
  - `data-booking-week-runtime-boundary`
  - `data-booking-slots`
- Admin page-builder preview hydrates a catalog-only `resolved` payload from
  booking admin caches without persisting preview data into page JSON.
- Admin page-builder preview does not bootstrap the public booking submission
  runtime. When `datePickerMode="week"` has catalog data but no injected slots
  token, the canvas renders an explicit noninteractive runtime boundary instead
  of an empty week shell.
- Admin preview and public runtime preview share the same visible booking
  catalog filter: active resources, active services, and services with at least
  one active resource link. Inactive or unlinked rows stay out of the rendered
  picker catalog.
- Booking Calendar projects each service option's `submissionAccess` into the
  public DOM and includes it in slot-selection events so paired Appointment Form
  widgets can scope nonce/CAPTCHA behavior to the selected service.
- Public slot reads remain server-authoritative for past-date blocking. Signed
  slot tokens add optional `minDate` / `maxDate` claims when the widget uses an
  explicit date range.
- `slotIntervalMode` changes the public query interval:
  - `fixed` uses `intervalMinutes`
  - `service-duration` uses the selected service duration
  - `non-overlapping` uses `max(intervalMinutes, serviceDuration)`
- `datePickerMode="week"` renders unique bounded dates and fetches per-day
  availability counts through the existing public slots route without duplicate
  clamped date buttons or duplicate first-batch availability requests.
- Runtime preserves the current selection when the refreshed slot list still
  contains it, otherwise clears selection and emits
  `nextless:booking-slot-selected` with `selection: null`.
- Runtime service-context, empty/missing/error status copy, and week labels are
  rendered through DOM text nodes. Decoded author or catalog copy is never
  reassigned as HTML.
- `appointment-form` compatibility remains additive: the shared runtime event
  still carries `serviceId`, `resourceId`, `startsAt`, `endsAt`, and `timezone`.

## Clear Controls

- `style.frameBackground` is clearable.
- `style.frameBorderColor` is clearable.
- `style.selectedSlotBackground` is clearable.
- `style.selectedSlotBorderColor` is clearable.
- `style.slotHoverBorderColor` is clearable.

Clearing frame background or frame border removes only that explicit override.
The renderer restores the matching legacy theme class per field, even when
selected-slot or hover swatches remain saved. Selected-slot colors continue to
render as CSS variables on the root frame and do not suppress frame fallback
classes.

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
