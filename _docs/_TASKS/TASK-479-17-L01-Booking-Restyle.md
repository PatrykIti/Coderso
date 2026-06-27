# TASK-479-17-L01: Booking Calendar Restyle
# FileName: TASK-479-17-L01-Booking-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Booking
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-17

---

## Overview

Port the prototype Booking layout onto the real admin Booking screen. Restyle the
page chrome (header + stat row + segmented tab bar) and add the prototype's weekly
calendar grid (colored booking blocks) plus a resources rail, all fed from the
**real** loaded `reservations`/`resources` state — never fabricated. Preserve the
entire tabbed CRUD surface (Resources / Services / Availability / Reservations /
Slot Preview), every `bookingClient` flow, the cache-hydrate + revalidation
contract, and the `cacheBus` invalidation wiring.

- **Goal:** `core/admin/ui/booking/BookingPage.tsx` (and the Reservations/Resources
  views it composes) visually match
  `_docs/_PROTOTYPE/src/pages/advanced/BookingPage.tsx` while preserving the real
  fetch/hydration, loading/error states, RBAC, cache, and canonical nav helpers.
- **Owning module/service:** `core/admin/ui/booking/BookingPage.tsx`,
  `core/admin/ui/booking/components/ReservationsTab.tsx`,
  `core/admin/ui/booking/components/ResourcesTab.tsx`,
  `core/admin/ui/booking/bookingHelpers.ts` (add a pure week-grouping helper).
- **Source-of-truth docs:**
  - Prototype page: `_docs/_PROTOTYPE/src/pages/advanced/BookingPage.tsx`
  - Prototype patterns: `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,SectionCard}.tsx`, `_docs/_PROTOTYPE/src/components/ui/{card,badge,button}.tsx`
  - Shared shell/patterns: delivered by TASK-479-06 (consume `@/ui/shared/PageHeader`, `@/ui/shared/StatCard`, `@/ui/shared/SectionCard`; do not redefine)
  - Data contract: `core/admin/services/bookingClient.ts`
    (`BookingReservationRecord` = `{ id, serviceId, resourceId, status, startsAt,
    endsAt, timezone, customerName, ... }`, `BookingResourceRecord` =
    `{ id, name, status, ... }`)
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
- **Out of scope:** No `bookingClient` surface changes; no mutation/schedule/slot
  logic changes; no new routes/permissions; do NOT fabricate a `Utilization`
  metric or any reservation/resource not present in real state.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Concretely:

- Keep the `booking:read` gate, `AdminShell activeHref="/admin/advanced/booking"`,
  and breadcrumbs exactly as today; do not add `bookingClient` calls.
- Preserve the cache contract verbatim: lazy-init state from
  `getCachedBookingResources()/Services()/Reservations()/Blackouts()` (cache
  hydrate seeds), background revalidation through `list*Cached({ force })`, and the
  `subscribeCacheEvents` handler keyed on `cacheKeys.bookingResourcesList /
  bookingServicesList / bookingReservationsList / bookingBlackoutsList`. Do NOT
  add a mount-force refetch loop and do NOT overwrite in-flight/dirty form state.
- Obey ESLint 9 react-hooks rules: no sync `setState` in effects; derive the
  stat counts and week grid at render time via `useMemo` (lazy init / render-time
  derivation), not via an effect that writes state.
- Any new action (the prototype's "New booking" button) must NOT hand-build an
  href — it switches the active tab to Reservations and focuses the reservation
  form via existing in-component state. The prototype's static mock arrays
  (`DAYS`, `RESOURCES`, `BOOKINGS`) are illustrative only and MUST be replaced by
  real derived data.

---

## Implementation Pseudocode

### Prototype → real-data mapping (decide each, no fabricated data)

| Prototype element | Real source | Decision |
|-------------------|-------------|----------|
| `PageHeader` (title/desc/icon) + `Badge "Beta"` + `Button "New booking"` | n/a (chrome) | Port; New-booking switches `activeTab` → "reservations" (no fake route) |
| StatCard "Bookings today" | `reservations` filtered to today (`startsAt` local date === today) | Port with real count |
| StatCard "Upcoming" | `reservations` with `startsAt > now` | Port with real count |
| StatCard "Utilization 68%" | **none** | Replace with real-derived count (e.g. "Resources" = `resources.length`) OR clearly-labeled placeholder + follow-up note; never fake a % |
| Resources rail (dot + name) | `resources` (`BookingResourceRecord.name`, status) | Port; dot color = stable `resourceColor(resource.id)` token |
| Weekly grid `DAYS[]` headers | current week (Mon–Sun) derived from `new Date()` | Port; compute week from a single `weekStart` constant |
| Booking blocks (`time` + `name` + `tone`) | `reservations` grouped by weekday from `startsAt`; label = `customerName`; time = `startsAt` formatted | Port; `tone` = `resourceColor(resource.id)` token |

### `bookingHelpers.ts` — add a pure, tested week-grouping helper

```ts
// core/admin/ui/booking/bookingHelpers.ts (append; keep existing exports)
// Pure derivation — NO data fetching, NO fabrication. Groups REAL reservations
// into Mon..Sun buckets for the calendar grid.
export type WeekColumn = {
  label: string;            // "Mon"
  date: string;             // "22"
  isoDate: string;          // "2026-06-22"
  blocks: Array<{
    id: string;
    time: string;           // "09:00" from startsAt (resource/service timezone)
    name: string;           // reservation.customerName
    tone: string;           // resourceColor(resourceId) token classes
  }>;
};

const RESOURCE_TONES = [
  "bg-primary-soft text-primary-soft-foreground",
  "bg-info-soft text-info",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
] as const;

export function resourceTone(resourceId: string, resourceOrder: string[]): string {
  const idx = resourceOrder.indexOf(resourceId);
  return RESOURCE_TONES[(idx >= 0 ? idx : 0) % RESOURCE_TONES.length];
}

export function groupReservationsByWeek(
  reservations: BookingReservationRecord[],
  weekStart: Date,
  resourceOrder: string[],
): WeekColumn[] {
  return Array.from({ length: 7 }, (_unused, dayIndex) => {
    const day = addDays(weekStart, dayIndex);          // pure date math
    const isoDate = toIsoDate(day);
    return {
      label: WEEKDAY_LABELS[dayIndex],
      date: String(day.getDate()),
      isoDate,
      blocks: reservations
        .filter((r) => toIsoDate(new Date(r.startsAt)) === isoDate)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((r) => ({
          id: r.id,
          time: formatTime(r.startsAt),
          name: r.customerName,
          tone: resourceTone(r.resourceId, resourceOrder),
        })),
    };
  });
}
```

### `BookingPage.tsx` — restyle the composition, keep the data wiring verbatim

```tsx
// core/admin/ui/booking/BookingPage.tsx
// UNCHANGED: all useState/useCallback/useEffect for resources/services/
// reservations/blackouts/schedules/forms; the getCachedBooking* lazy seeds;
// the list*Cached({ force }) revalidation effects; the subscribeCacheEvents
// effect keyed on cacheKeys.booking*List; every mutation flow + feedback.
// Only the returned JSX + a few render-time useMemos change.

const weekStart = useMemo(() => startOfWeek(new Date()), []);          // lazy, stable
const resourceOrder = useMemo(() => resources.map((r) => r.id), [resources]);
const weekColumns = useMemo(
  () => groupReservationsByWeek(reservations, weekStart, resourceOrder),
  [reservations, weekStart, resourceOrder],
);
const stats = useMemo(() => ({
  today: reservations.filter((r) => isSameLocalDay(r.startsAt, new Date())).length,
  upcoming: reservations.filter((r) => new Date(r.startsAt) > new Date()).length,
  resourceCount: resources.length,                                    // real, replaces "Utilization"
}), [reservations, resources]);

return (
  <AdminShell activeHref="/admin/advanced/booking" breadcrumbs={["Coderso", "Booking"]}>
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader
        title="Booking"
        description="A calendar view of appointments across your resources and services."
        icon={<CalendarDays />}
        actions={
          <>
            <Badge variant="soft">Beta</Badge>
            <Button className="gap-1.5" onClick={() => setActiveTab("reservations")}>
              <Plus className="size-4" /> New booking
            </Button>
          </>
        }
      />

      {feedback ? <Alert variant={feedback.tone}>{/* unchanged AlertTitle/Description */}</Alert> : null}

      {/* Stat row — REAL counts (no fabricated utilization) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Bookings today" value={String(stats.today)} icon={<CalendarDays />} />
        <StatCard label="Upcoming" value={String(stats.upcoming)} icon={<Clock />} />
        <StatCard label="Resources" value={String(stats.resourceCount)} icon={<TrendingUp />} />
        {/* NOTE: "Utilization" omitted — no backing metric; see follow-up note */}
      </div>

      {/* Soft segmented tab bar — keep ALL five tabs + their CRUD content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-full ...">{/* restyle pills; same triggers */}
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="slot-preview">Slot preview</TabsTrigger>
        </TabsList>

        <TabsContent value="reservations">
          {/* Prototype week layout fed by REAL state */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
            <Card className="h-fit p-5">
              <div className="font-display text-[15px] font-semibold">Resources &amp; services</div>
              <div className="mt-4 flex flex-col gap-1">
                {resources.map((resource) => (
                  <div key={resource.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm hover:bg-accent">
                    <span className={`size-2.5 rounded-full ${resourceTone(resource.id, resourceOrder).split(" ")[0]}`} />
                    <span className="text-foreground">{resource.name}</span>
                  </div>
                ))}
              </div>
            </Card>

            <SectionCard title="This week" description={weekRangeLabel(weekStart)}>
              <div className="grid grid-cols-7 gap-2">
                {weekColumns.map((col) => (
                  <div key={col.isoDate} className="flex flex-col">
                    <div className="flex items-baseline justify-between px-1 pb-2">
                      <span className="text-xs font-medium text-muted-foreground">{col.label}</span>
                      <span className="font-display text-sm font-semibold text-foreground">{col.date}</span>
                    </div>
                    <div className="flex min-h-40 flex-col gap-1.5 rounded-xl bg-muted/40 p-1.5">
                      {col.blocks.map((b) => (
                        <div key={b.id} className={`rounded-lg px-2 py-1.5 ${b.tone}`}>
                          <div className="text-[11px] font-semibold tabular-nums">{b.time}</div>
                          <div className="truncate text-xs">{b.name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Existing reservation CRUD form/table preserved below the calendar */}
          <BookingReservationsTab {...existingReservationProps} />
        </TabsContent>

        <TabsContent value="resources"><BookingResourcesTab {...existingResourceProps} /></TabsContent>
        <TabsContent value="services"><BookingServicesTab {...existingServiceProps} /></TabsContent>
        <TabsContent value="availability"><BookingAvailabilityTab {...existingAvailabilityProps} /></TabsContent>
        <TabsContent value="slot-preview"><BookingSlotPreviewTab {...existingSlotProps} /></TabsContent>
      </Tabs>
    </div>
  </AdminShell>
);
```

**Data flow:** existing lazy seeds (`getCachedBooking*`) hydrate state → existing
`list*Cached({ force })` effects revalidate → `reservations`/`resources` flow into
the new render-time `useMemo`s (`weekColumns`, `stats`) → calendar grid + stat row
+ resources rail render from real data. No new fetches, no new mutations. The
`cacheBus` effect still re-pulls each list on its `cacheKeys.*` event.

**Error handling:** preserve the existing `feedback` state + `Alert`; guard
`groupReservationsByWeek` against malformed `startsAt` (skip blocks whose
`new Date(startsAt)` is `NaN`) so a bad record never throws the render. With empty
`reservations`/`resources` the rail and grid render empty columns (no crash).

**Regression-test shape (delivered in L02):**

- `groupReservationsByWeek` unit: real reservations bucket into the correct
  weekday, sorted by time; malformed dates skipped; tone is stable per resource.
- Render: stat row shows real counts; calendar grid shows a booking block with the
  real `customerName`; resources rail lists real resource names; all five tabs +
  every existing CRUD flow still work (existing suite stays green).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/booking-page.test.tsx`
- Keep `tests/vitest/ui/booking-helpers.test.ts`,
  `tests/vitest/ui/booking-tabs-leaf.test.tsx`, and
  `tests/vitest/admin/bookingClient.test.ts` green (unchanged contracts).
- State clearly in the summary if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update board bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure linking `TASK-479` +
  `TASK-479-17-L01`.
- If the unbacked `Utilization` stat ships as a static placeholder rather than a
  real-derived count, file the follow-up (a real utilization/occupancy metric)
  and reference it in the changelog entry.
