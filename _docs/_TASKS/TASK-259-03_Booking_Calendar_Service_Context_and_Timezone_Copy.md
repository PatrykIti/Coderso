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
duration, optional description, resource timezone, selected-summary date/locale
formatting, and user-facing empty-state copy.

`REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.2, 3.3, 3.4, 3.11, 5.3, and 5.7
show that the resolved service/resource payload already contains useful data,
but the widget hides price, currency, service description, duration, buffers, and
timezone. The selected-slot summary also uses the browser locale implicitly, and
the empty state uses developer-facing copy.

## Scope Boundary

This leaf does not own:

- generic public ARIA baseline from TASK-256-04 only after
  TASK-256-07/TASK-256-08 names a concrete Booking Calendar owner/test path;
- visual calendar availability indicators from TASK-259-05;
- Appointment Form slot summary, locale, redirect, or flow-pairing behavior
  from TASK-258. If the shared selection payload is extended for calendar-owned
  timezone display, keep the payload backward compatible and add only smoke
  coverage for Appointment Form consumption.

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
- [ ] Add calendar-owned selected-summary formatting fields such as
  `summaryLocale` and `summaryDateStyle` or equivalent product names. Keep the
  default backward-compatible with the browser locale, but allow an explicit
  site/widget locale so the report's hardcoded locale row has a TASK-259 owner.
- [ ] Keep service metadata display calendar-owned. Do not add Appointment Form
  product behavior here; only preserve existing selection payload compatibility
  if calendar runtime state needs an additive field.
- [ ] Replace hardcoded empty-state copy with normalized, editor-owned copy.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/bookingCalendar.tsx` | Add fields/defaults/schema/normalizer and render service metadata, timezone, selected-summary formatting metadata, and user-facing empty state. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Add Wizard/Visual controls for metadata visibility, summary locale/date format, and empty-state copy. |
| `core/widgets/core/bookingRuntimeScript.ts` | Update selected-slot summary, explicit locale/date formatting, and resource timezone display after resource/date/slot changes. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Add render/normalizer coverage for price, duration, description, timezone, summary formatting fields, and empty state. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add editor coverage for display toggles, summary locale/date controls, and empty-state copy. |
| `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` | Create or extend this happy-dom runtime script suite with selected summary locale/timezone update coverage if runtime script changes. |
| `tests/vitest/widgets/appointmentForm.test.tsx` | Smoke only if the shared booking selection payload changes. |

## Implementation Pseudocode

```ts
type BookingCalendarContextDisplay = {
  showServicePrice?: boolean;
  showServiceDuration?: boolean;
  showServiceDescription?: boolean;
  showTimezone?: boolean;
  summaryLocale?: string;
  summaryDateStyle?: "short" | "medium" | "long";
  emptyStateMessage?: string;
};

function formatServicePrice(service: BookingCalendarResolvedService, locale = "en-US") {
  if (service.priceCents === null || !service.currency) return null;
  const currency = service.currency.toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(service.priceCents / 100);
  } catch {
    return `${(service.priceCents / 100).toFixed(2)} ${currency}`;
  }
}

function buildServiceMeta(service: BookingCalendarResolvedService, options: ContextDisplay) {
  return compact([
    options.showServiceDuration ? `${service.durationMinutes} min` : null,
    options.showServicePrice ? formatServicePrice(service) : null,
  ]).join(" · ");
}

function formatSelectedSlotDate(startsAt: string, options: BookingCalendarContextDisplay) {
  return new Intl.DateTimeFormat(options.summaryLocale || undefined, {
    year: "numeric",
    month: options.summaryDateStyle ?? "short",
    day: "2-digit",
  }).format(new Date(startsAt));
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
    ? `${formatSelectedSlotDate(selection.startsAt, options)} • ${timeRange} • ${selection.timezone}`
    : selectedNode.dataset.empty;
}
```

Error handling:

- Unknown or invalid currency codes must not throw during render; fall back to a
  plain uppercase currency suffix or omit price copy.
- Tests must pass an explicit locale or assert the fallback branch so price
  output stays deterministic across CI machines.
- Invalid selected-summary locale or date-style values must normalize to a safe
  default and must not throw during runtime summary rendering.
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
- Create or extend
  `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`, then run
  `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`
  if runtime summary locale/timezone behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx` if the
  shared selection payload changes.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.2,
  3.3, 3.4, 3.11, 5.3, and 5.7 after validation.
- Update `_docs/_WIDGETS/BOOKING_CALENDAR.md` with context display fields and
  selected-summary locale/date formatting, plus empty-state copy behavior.

## Changelog Policy

- Covered by the TASK-259 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Users can see enough service/resource context to understand price, duration,
  description, timezone, and selected-summary date format before selecting a
  slot.
- Empty state is user-facing and configurable, not developer-facing.
- Service descriptions render as text and cannot inject HTML.
- Appointment Form behavior remains compatible if the shared runtime payload is
  unchanged.
