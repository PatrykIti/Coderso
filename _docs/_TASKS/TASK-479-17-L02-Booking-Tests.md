# TASK-479-17-L02: Booking Tests
# FileName: TASK-479-17-L02-Booking-Tests.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Booking / Testing
**Estimated Effort:** Small
**Dependencies:** TASK-479-17-L01
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-17

---

## Overview

Extend the Vitest render coverage for the restyled Booking screen so it locks in
the L01 visual restructure (stat row + weekly calendar grid + resources rail)
without weakening the existing CRUD-flow assertions. Add a focused unit test for
the new pure `groupReservationsByWeek`/`resourceTone` helper. This is the
regression net that proves the prototype layout is fed by **real** data and that
no data/cache contract moved.

- **Goal:** `tests/vitest/ui/booking-page.test.tsx` gains assertions for the
  restyled chrome (Beta badge, New-booking action, soft tab pills), the stat row
  (real counts), the calendar grid (a booking block carrying the real
  `customerName`), and the resources rail (real resource name); a new unit test
  covers `groupReservationsByWeek` bucketing/sorting/tone-stability. All existing
  booking flow tests stay green.
- **Owning module/service:** `tests/vitest/ui/booking-page.test.tsx` and
  `tests/vitest/ui/booking-helpers.test.ts` (Vitest UI lane), exercising
  `core/admin/ui/booking/BookingPage.tsx` + `core/admin/ui/booking/bookingHelpers.ts`.
- **Source-of-truth docs:**
  - Existing tests: `tests/vitest/ui/booking-page.test.tsx`,
    `tests/vitest/ui/booking-helpers.test.ts`
  - Mock harness shape: the `bookingPageState` `vi.hoisted` fixture +
    `vi.mock` blocks already in `booking-page.test.tsx`
  - Data contract: `core/admin/services/bookingClient.ts`,
    `core/admin/ui/booking/bookingTypes.ts`
  - `_docs/TESTING_STRATEGY.md` (Vitest = Bun-free admin/UI lane)
- **Out of scope:** No runtime/E2E tests; no `bookingClient` test changes
  (coverage stays in `tests/vitest/admin/bookingClient.test.ts`); no snapshot
  churn of unrelated screens; do not rewrite the existing flow tests — only add to
  them.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). The tests assert real-data rendering and the
unchanged `AdminShell activeHref`/cache wiring; they do not touch auth, RBAC, or
network behavior. The New-booking action is asserted to switch the **controlled**
active tab to Reservations (observed via the Tabs mock's `data-active-tab`); it is
a `<button>` that calls `setActiveTab`, not a link, so there is no navigation/href
to assert.

---

## Implementation Pseudocode

```ts
// tests/vitest/ui/booking-helpers.test.ts (append a describe block)
import { groupReservationsByWeek, resourceTone } from "../../../core/admin/ui/booking/bookingHelpers";

test("groupReservationsByWeek buckets real reservations by weekday, sorted, tone stable", () => {
  const weekStart = new Date("2026-06-22T00:00:00.000Z"); // Monday (UTC)
  const order = ["resource-1", "resource-2"];
  // Each reservation carries its own `timezone` (here "UTC"); bucketing resolves
  // the calendar day in that timezone (mirrors formatDateTime), so a UTC weekStart
  // + UTC reservations match deterministically regardless of the test host's TZ.
  const cols = groupReservationsByWeek(
    [
      { id: "r2", resourceId: "resource-1", customerName: "Bob", startsAt: "2026-06-22T11:00:00.000Z", endsAt: "...", timezone: "UTC" } as never,
      { id: "r1", resourceId: "resource-1", customerName: "Ann", startsAt: "2026-06-22T09:00:00.000Z", endsAt: "...", timezone: "UTC" } as never,
      { id: "rx", resourceId: "resource-2", customerName: "Bad",  startsAt: "not-a-date",              endsAt: "...", timezone: "UTC" } as never,
    ],
    weekStart,
    order,
  );
  expect(cols).toHaveLength(7);
  expect(cols[0].blocks.map((b) => b.name)).toEqual(["Ann", "Bob"]); // sorted by time
  expect(cols[0].blocks.every((b) => b.tone === resourceTone("resource-1", order))).toBe(true); // stable
  // malformed startsAt skipped, never throws:
  expect(cols.flatMap((c) => c.blocks).some((b) => b.name === "Bad")).toBe(false);
});
```

```tsx
// tests/vitest/ui/booking-page.test.tsx (add assertions to the existing first flow
// test, reusing the existing bookingPageState fixture — reservation "Ada Lovelace",
// resource "Room A"). Do NOT change the existing CRUD expectations.

// After the initial `await flush()` and the existing resources:1 / reservations:1 checks:
expect(view.container.textContent).toContain("Bookings today");   // stat row label
expect(view.container.textContent).toContain("Upcoming");
expect(view.container.textContent).toContain("Resources");        // real-count stat (replaces Utilization)
expect(view.container.textContent).not.toContain("Utilization");  // no fabricated %/68%
expect(view.container.textContent).toContain("Beta");             // PageHeader badge
expect(view.container.textContent).toContain("New booking");      // action present

// Resources rail + calendar block fed by REAL fixture data:
expect(view.container.textContent).toContain("Room A");           // resources rail (real resource)
expect(view.container.textContent).toContain("Ada Lovelace");     // calendar block (real reservation)

// New-booking switches the CONTROLLED active tab. The existing
// `@/components/ui/tabs` mock renders every TabsContent unconditionally, so a
// post-click `reservations:1` check is VACUOUS (it is always present), and a
// `a[href="/booking"]` null check is vacuous too (New-booking is a <button>, not
// a link). Instead extend that mock to surface the controlled `value` as
// `data-active-tab` — keeping it rendering all children so the existing flow
// tests are unaffected — and assert the value flips resources → reservations:
//   Tabs: ({ value, children }) => <div data-active-tab={value}>{children}</div>
const activeTab = () =>
  view.container.querySelector("[data-active-tab]")?.getAttribute("data-active-tab");
expect(activeTab()).toBe("resources");            // real default landing tab
clickByText(view.container, "New booking");
await flush();
expect(activeTab()).toBe("reservations");          // switch observed via controlled value
```

> NOTE: the existing `booking-page.test.tsx` mocks `@/ui/shared/PageHeader`,
> `@/components/ui/tabs`, and each tab component. If L01 routes the calendar grid +
> resources rail through those mocked tabs, the test must render them from
> BookingPage-owned JSX (not inside a fully-stubbed child) so the real-data
> assertions above resolve. Keep the tab/PageHeader mocks but ensure the new
> calendar/rail JSX lives in `BookingPage.tsx` (or pass the derived `weekColumns`/
> `resources` into a thinly-mocked child whose stub echoes the names). The new
> calendar grid + resources rail are `BookingPage`-owned JSX inside the (mocked)
> `TabsContent`, so `"Ada Lovelace"`/`"Room A"` resolve from BookingPage — not the
> stubbed `BookingReservationsTab`/`BookingResourcesTab`, whose stubs only echo
> `reservations:N`/`resources:N`. **Extend the `@/components/ui/tabs` `Tabs` mock**
> to pass the controlled `value` through as `data-active-tab`
> (`Tabs: ({ value, children }) => <div data-active-tab={value}>{children}</div>`):
> it must keep rendering ALL children, so the existing flow tests that drive
> buttons across every tab stay green — this is additive, not a rewrite.

**Data flow:** the existing `vi.hoisted` `bookingPageState` seeds
`getCachedBooking*` + `list*Cached` with one resource ("Room A") and one
reservation ("Ada Lovelace"); `mount(<BookingPage />)` + `flush()` resolves the
revalidation; assertions read `container.textContent`. The helper unit test calls
the pure function directly with fixed inputs — no DOM, no mocks.

**Error handling:** keep assertions resilient to copy tweaks by matching labels /
names, not full sentences. The helper test must prove a malformed `startsAt` is
skipped (render never throws). Do not mock timers unless a deterministic "today"
is required for the `Bookings today`/`Upcoming` counts — prefer asserting the
labels + real names rather than exact counts that depend on `new Date()`.

**Regression-test shape:**

- Helper unit: weekday bucketing, time sort, stable tone, malformed-date skip.
- Render: stat-row labels present, no fabricated `Utilization`, Beta + New-booking
  chrome present, real resource name in rail, real customer name in calendar grid.
- Tab switch: New-booking flips the controlled active tab `resources` →
  `reservations` (observed via the Tabs mock's `data-active-tab`; the existing
  all-tabs-rendered flow tests stay unchanged).
- Existing flow + validation tests in `booking-page.test.tsx` remain unchanged and
  green.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/booking-page.test.tsx tests/vitest/ui/booking-helpers.test.ts`
- Confirm `tests/vitest/ui/booking-tabs-leaf.test.tsx` and
  `tests/vitest/admin/bookingClient.test.ts` still pass (unchanged contracts).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure linking `TASK-479` +
  `TASK-479-17-L02`.
- If a new fixture/helper is introduced, note its location so future Booking data
  changes update it alongside the `bookingClient` record types.
