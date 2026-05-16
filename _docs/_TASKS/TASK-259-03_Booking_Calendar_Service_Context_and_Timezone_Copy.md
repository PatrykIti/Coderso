# TASK-259-03: Booking Calendar Service Context and Timezone Copy

# FileName: TASK-259-03_Booking_Calendar_Service_Context_and_Timezone_Copy.md

**Priority:** High
**Category:** Widgets + Booking + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-259-01, TASK-259-02, TASK-259
**Status:** To Do

---

## Overview

Render the booking context users need before choosing a slot: service price,
duration, optional description, resource timezone, and user-facing empty-state
copy.

`REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.2, 3.3, 3.4, 3.11, 5.3, and 5.7
show that the resolved service/resource payload already contains useful data,
but the widget hides price, currency, service description, duration, buffers, and
timezone. The empty state also uses developer-facing copy.

## Scope Boundary

This leaf does not own:

- generic public ARIA baseline from TASK-256-04;
- visual calendar availability indicators from TASK-259-05;
- Appointment Form slot summary copy from TASK-258, except for a narrow smoke
  if the shared selection payload is extended.

## Sub-Tasks

- [ ] Add normalized copy/config fields for service metadata display:
  `showServicePrice`, `showServiceDuration`, `showServiceDescription`,
  `showTimezone`, and `emptyStateMessage` or equivalent product names.
- [ ] Render price/currency with deterministic formatting that handles missing
  `priceCents` or `currency` without showing misleading zero values.
- [ ] Render duration and buffer information in compact copy that does not
  overload the selector labels.
- [ ] Render selected resource timezone near the date/slot controls and include
  timezone in selected-slot summary.
- [ ] Update runtime selection payload only if Appointment Form needs timezone
  or service metadata for downstream summaries; if changed, keep the payload
  backward compatible.
- [ ] Replace hardcoded empty-state copy with normalized, editor-owned copy.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/bookingCalendar.tsx` | Add fields/defaults/schema/normalizer and render service metadata, timezone, and user-facing empty state. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Add Wizard/Visual controls for metadata visibility and empty-state copy. |
| `core/widgets/core/bookingRuntimeScript.ts` | Update selected-slot summary and resource timezone display after resource/date/slot changes. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Add render/normalizer coverage for price, duration, description, timezone, and empty state. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add editor coverage for display toggles and empty-state copy. |
| `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` | Add selected summary/timezone update coverage if runtime script changes. |
| `tests/vitest/widgets/appointmentForm.test.tsx` | Smoke only if the shared booking selection payload changes. |

## Implementation Pseudocode

```ts
type BookingCalendarContextDisplay = {
  showServicePrice?: boolean;
  showServiceDuration?: boolean;
  showServiceDescription?: boolean;
  showTimezone?: boolean;
  emptyStateMessage?: string;
};

function formatServicePrice(service: BookingCalendarResolvedService) {
  if (service.priceCents === null || !service.currency) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: service.currency.toUpperCase(),
  }).format(service.priceCents / 100);
}

function buildServiceMeta(service: BookingCalendarResolvedService, options: ContextDisplay) {
  return compact([
    options.showServiceDuration ? `${service.durationMinutes} min` : null,
    options.showServicePrice ? formatServicePrice(service) : null,
  ]).join(" · ");
}
```

Runtime update flow:

```ts
function renderResourceTimezone() {
  const option = resourceSelect.selectedOptions[0];
  timezoneNode.textContent = option?.dataset.timezone
    ? `Timezone: ${option.dataset.timezone}`
    : "";
}

function renderSelectedSummary(selection) {
  selectedNode.textContent = selection
    ? `${toDateLabel(selection.startsAt)} • ${timeRange} • ${selection.timezone}`
    : selectedNode.dataset.empty;
}
```

Error handling:

- Unknown or invalid currency codes must not throw during render; fall back to a
  plain uppercase currency suffix or omit price copy.
- Missing service/resource metadata should omit only that metadata line, not the
  whole calendar.
- Empty-state copy must normalize blank editor input back to the default
  user-facing message.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any new widget fields must be added to
  `bookingCalendarSchema` with `additionalProperties: false`.
- Anti-abuse: do not render untrusted HTML from service descriptions; keep all
  descriptions text-only React output.
- Secret handling: do not expose booking settings, internal notes, tokens, or
  private diagnostics in service metadata.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`
  if runtime summary/timezone behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx` if the
  shared selection payload changes.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.2,
  3.3, 3.4, 3.11, 5.3, and 5.7 after validation.
- Update `_docs/_WIDGETS/BOOKING_CALENDAR.md` with context display fields and
  empty-state copy behavior.

## Changelog Policy

- Covered by the TASK-259 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Users can see enough service/resource context to understand price, duration,
  description, and timezone before selecting a slot.
- Empty state is user-facing and configurable, not developer-facing.
- Service descriptions render as text and cannot inject HTML.
- Appointment Form behavior remains compatible if the shared runtime payload is
  unchanged.
