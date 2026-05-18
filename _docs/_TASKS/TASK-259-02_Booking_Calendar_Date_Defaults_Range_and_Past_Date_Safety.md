# TASK-259-02: Booking Calendar Date Defaults, Range, and Past-Date Safety

# FileName: TASK-259-02_Booking_Calendar_Date_Defaults_Range_and_Past_Date_Safety.md

**Priority:** High
**Category:** Widgets + Booking + Public Read API + Runtime Validation
**Estimated Effort:** Large
**Dependencies:** TASK-259-01, TASK-259
**Status:** Done (2026-05-18)

---

## Overview

Add Booking Calendar-owned date configuration and enforce public slot lookup
date safety.

`REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.9, 3.10, 5.4, and 7.3 show that
the widget always defaults to today, has no configurable `defaultDate`,
`minDate`, or `maxDate`, does not set a `min` attribute on the date input, and
the public slots endpoint can return historical slots.

This leaf must make the backend route/service contract authoritative. Client
attributes improve UX, but public slot safety must not depend on the browser.

## Scope Boundary

This leaf does not own:

- visual month/week calendar UI and availability count signals, owned by
  TASK-259-05;
- default service/resource dropdowns, owned by TASK-259-07;
- Appointment Form reservation submit date validation, owned by TASK-258 unless
  a public slots change requires a narrow smoke update.

## V1 Product Decision

V1 uses widget-authored date-only fields:

- `defaultDate?: string`
- `minDate?: string`
- `maxDate?: string`

`defaultDate`, `minDate`, and `maxDate` are stored in widget JSON for editor UX
and public rendering. The server must not trust raw client query parameters for
range authority. Public slot reads enforce:

- `booking_slot_date_in_past` for any date before server-side today;
- `booking_slot_date_out_of_range` only when the SSR-rendered Booking Calendar
  provided a backend-signed slots policy token containing the normalized
  `minDate`/`maxDate` claims.

If no signed range claim exists, the route enforces past-date safety and service
access only; it must not treat unsigned `minDate`/`maxDate` URL parameters as
authoritative.

## Sub-Tasks

- [ ] Extend `BookingCalendarData` with explicit date policy fields:
  `defaultDate`, `minDate`, and `maxDate`.
- [ ] Normalize date policy in `normalizeBookingCalendarData()` with
  deterministic date-only parsing and backward-compatible defaults.
- [ ] Render date input attributes (`min`, `max`, default `value`) from the
  normalized date policy.
- [ ] Update `bookingRuntimeScript.ts` so its initial date selection respects
  `defaultDate`, clamps to `minDate`/`maxDate`, and clears stale selections when
  the date moves outside range.
- [ ] Generate a backend-signed slots policy token during public page rendering
  when a Booking Calendar block has `minDate` or `maxDate`; do not reuse a
  single cached booking runtime token across blocks with different date policy.
- [ ] Extend public slots query validation/service policy so past dates and
  signed out-of-range dates reject with stable machine-readable errors.
- [ ] Keep admin slot preview behavior aligned with the same service policy so
  Booking admin preview cannot show slots that public runtime rejects.
- [ ] Add route error mapping coverage for `booking_slot_date_in_past` and
  `booking_slot_date_out_of_range`.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/bookingCalendar.tsx` | Add date policy fields to data type, defaults, schema, normalizer, and rendered date input attributes. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Add Wizard/Visual or Advanced date policy controls with clear copy and clamped values. |
| `core/widgets/core/bookingRuntimeScript.ts` | Respect `defaultDate`, `minDate`, `maxDate`, and clear invalid selections before fetching. |
| `core/server/publicSite.tsx` | Pass block-local date policy into Booking Calendar runtime hydration without reusing policy-bearing tokens between blocks. |
| `core/services/booking/bookingRuntimeResolver.ts` | Split catalog hydration from per-block slots policy token generation, or accept a block-local slots policy argument. |
| `core/services/booking/bookingSlotsToken.ts` | Sign and verify optional date-policy claims for public slot reads while preserving existing token scope semantics. |
| `core/server/validation/bookingSchemas.ts` | Add route query schema fields only if public/API inputs need range metadata; keep reject-unknown behavior. |
| `core/server/publicBookingApi.ts` | Verify signed slot policy claims and map date policy errors through centralized booking error handling. |
| `core/services/booking/bookingService.ts` | Enforce past-date and slot date policy before generating slots. |
| `core/server/routes/bookingRoutes.ts` | Add stable `mapBookingError` cases for new date policy codes. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Add normalizer/render coverage for date policy fields. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add editor coverage for date policy controls. |
| `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts` | Create or extend this happy-dom runtime script suite with initial date/clamp/fetch query assertions. |
| `tests/unit/server/publicBookingApi.test.ts` | Add public slots past-date/out-of-range route coverage. |
| `tests/unit/booking/bookingService.test.ts` | Add service-level past-date/out-of-range slot policy coverage. |
| `tests/integration/routes/bookingRoutes.test.ts` | Add route registration and `mapBookingError` assertions if the route family gains new registered handlers or mapped errors. |

## Implementation Pseudocode

```ts
type BookingDatePolicy = {
  defaultDate?: string;
  minDate?: string;
  maxDate?: string;
};

function normalizeDateOnly(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  return trimmed;
}

function resolveInitialBookingDate(policy: BookingDatePolicy, today: string) {
  const minDate = policy.minDate ?? today;
  const maxDate = policy.maxDate;
  const requested = policy.defaultDate ?? today;

  if (requested < minDate) return minDate;
  if (maxDate && requested > maxDate) return maxDate;
  return requested;
}
```

Policy token flow:

```ts
type BookingSlotsPolicyClaims = {
  minDate?: string;
  maxDate?: string;
};

function resolveBookingCalendarSlotsPolicy(data: BookingCalendarData) {
  return {
    minDate: data.minDate,
    maxDate: data.maxDate,
  };
}

function createBookingSlotsToken(claims?: BookingSlotsPolicyClaims) {
  return signBookingRuntimeToken("booking_public_slots", claims ?? {});
}

function assertBookingSlotsDatePolicy(params: {
  date: string;
  runtimeToken?: string;
  today: string;
}) {
  if (params.date < params.today) throw new Error("booking_slot_date_in_past");
  const claims = assertBookingSlotsToken(params.runtimeToken);
  if (claims.minDate && params.date < claims.minDate) {
    throw new Error("booking_slot_date_out_of_range");
  }
  if (claims.maxDate && params.date > claims.maxDate) {
    throw new Error("booking_slot_date_out_of_range");
  }
}
```

Runtime flow:

```ts
const policy = readDatePolicy(root.dataset);
const today = todayDateInputValue();
dateInput.min = policy.minDate || today;
if (policy.maxDate) dateInput.max = policy.maxDate;
if (!dateInput.value) dateInput.value = resolveInitialBookingDate(policy, today);

if (!isDateAllowed(dateInput.value, policy, today)) {
  clearSelection(flowId);
  renderDatePolicyMessage();
  return;
}
```

Server flow:

```ts
function assertPublicSlotDateAllowed(input: BookingSlotPreviewInput, now = new Date()) {
  const date = parseDateOnly(input.date);
  const today = toDateOnly(now);
  if (date < today) throw new Error("booking_slot_date_in_past");
  assertSignedRangeClaims(input.runtimeToken, date);
}
```

Error handling:

- Invalid `defaultDate`, `minDate`, or `maxDate` values are omitted by the
  normalizer instead of being persisted as invalid dates.
- If `minDate > maxDate`, prefer a validation error in editor/schema tests; do
  not silently invert the range.
- Public API errors must map to stable machine-readable codes through
  `mapBookingError`: `booking_slot_date_in_past` and
  `booking_slot_date_out_of_range`.
- Multiple Booking Calendar blocks on the same page may have different date
  ranges. Catalog reads may be cached, but signed slots policy tokens must be
  generated per block or per normalized policy.

## Security Contract

This leaf changes the existing public read endpoint `GET /api/booking/slots`.

- Endpoint visibility: public read endpoint remains public.
- Auth model: existing booking access evaluator remains unchanged; internal
  services still require session/API key where configured.
- RBAC: admin preview route behavior remains unchanged.
- CSRF: unchanged because public slots lookup is a read.
- Rate-limit bucket: continue using `public_read`.
- Reject-unknown validation: query schemas must reject unknown fields and keep
  date-only patterns strict.
- Anti-abuse: date range limits must prevent unbounded availability scanning;
  visual calendar work in later leaves must reuse the same bounded range.
  Widget-authored range fields must be signed by the backend before they become
  public route authority.
- Secret handling: no tokens, secrets, or private diagnostics in date policy
  errors or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- Create or extend
  `tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`, then run
  `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.bookingCalendar.test.ts`
- `bun run test:vitest -- tests/vitest/validation/bookingSchemas.test.ts` if
  validation schemas change. Extend this suite with
  `bookingPublicSlotQuerySchema` coverage before using it as public slot proof.
- `bun test tests/unit/widgets/validator.test.ts` when widget schema/defaults
  change.
- `bun test tests/unit/server/publicBookingApi.test.ts`
- `bun test tests/unit/booking/bookingService.test.ts`
- Route registration and `mapBookingError` coverage in the current server route
  test owner when new mapped errors or handlers are added.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.9,
  3.10, 5.4, and 7.3 after validation.
- Update `_docs/_WIDGETS/BOOKING_CALENDAR.md` with date policy fields and
  public slots safety behavior.

## Changelog Policy

- Covered by the TASK-259 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Booking Calendar can start on an explicit default date without violating the
  allowed date range.
- Public slot lookups cannot return valid slots for disallowed past dates.
- The date input, runtime query, admin slot preview, signed runtime token, public
  API, and booking service enforce the same server-authoritative policy.
- Tests cover both client-side date attributes and backend route/service
  enforcement.
