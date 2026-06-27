# TASK-479-17-L01: Booking Calendar Restyle
# FileName: TASK-479-17-L01-Booking-Restyle.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Booking
**Estimated Effort:** Medium
**Dependencies:** TASK-479-05, TASK-479-06
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
  - Shared shell/patterns & tokens (consume by exact name; do not redefine):
    **TASK-479-05** owns the tokens/variants used here — `--primary-soft`/`--info`/
    `--success`/`--warning` (+ each `-soft`), `shadow-card`, `font-display`, and
    the Badge `soft` variant; **TASK-479-06-L02** creates/ports the shared
    `PageHeader` **with the `icon` prop**, the shared `StatCard`, and `SectionCard`
    (`@/ui/shared/PageHeader`, `@/ui/shared/StatCard`, `@/ui/shared/SectionCard`).
    Today the real core `PageHeader` has only `title`/`description`/`actions`,
    `Badge` has no `soft` variant, and the only `StatCard` is dashboard-local
    (`@/ui/dashboard/StatCard`) — this leaf does NOT add the soft tokens, the
    Badge `soft` variant, the `PageHeader.icon` prop, or a local StatCard/SectionCard.
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
  href. The real `BookingPage` renders the tab bar **uncontrolled**
  (`<Tabs defaultValue="resources">`) with **no `activeTab` state today**, so
  supporting the switch requires converting it to a **controlled**
  `<Tabs value={activeTab} onValueChange={setActiveTab}>` backed by a NEW local
  `const [activeTab, setActiveTab] = useState("resources")` — the initial value
  keeps the real default landing tab (`resources`), so no landing/behavior change.
  "New booking" is a `<button>` that calls `setActiveTab("reservations")`; it is
  not a link, so it adds no href/route. **Preserve the existing "Refresh" action**
  (`handleRefreshAll` + `RefreshCw`): add the Beta badge + New-booking button
  *alongside* it, do not replace it — the existing green flow test clicks
  "Refresh". The prototype's static mock arrays (`DAYS`, `RESOURCES`, `BOOKINGS`)
  are illustrative only and MUST be replaced by real derived data.

---

## Implementation Pseudocode

### Prototype → real-data mapping (decide each, no fabricated data)

| Prototype element | Real source | Decision |
|-------------------|-------------|----------|
| `PageHeader` (title/desc + `icon` prop from 479-06-L02) + `Badge variant="soft" "Beta"` (variant from 479-05) + **kept** `Button "Refresh"` + new `Button "New booking"` | n/a (chrome) | Port; convert the uncontrolled `Tabs` → controlled `activeTab`; New-booking switches `activeTab` → "reservations" (button, no route); keep the existing Refresh action |
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
    time: string;           // "09:00" — startsAt rendered in the reservation's OWN timezone
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
        // Bucket by the reservation's OWN timezone (`r.timezone`, fallback "UTC")
        // via Intl — mirrors the existing `formatDateTime` helper — NOT the
        // browser-local `new Date(startsAt)` day, so bucketing is deterministic
        // and independent of the admin viewer's machine timezone. An unparseable
        // `startsAt` yields "" from `isoDateInTimeZone`, so it matches no column
        // (malformed records are skipped, never thrown).
        .filter((r) => isoDateInTimeZone(r.startsAt, r.timezone) === isoDate)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((r) => ({
          id: r.id,
          time: formatTime(r.startsAt, r.timezone),   // reservation timezone
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
// effect keyed on cacheKeys.booking*List; every mutation flow + feedback;
// the existing handleRefreshAll action. Only the returned JSX, ONE NEW local tab
// state, and a few render-time useMemos change.

// NEW: convert the previously-uncontrolled `<Tabs defaultValue="resources">` to a
// controlled `<Tabs value={activeTab} onValueChange={setActiveTab}>` so "New
// booking" can switch tabs. Event-driven setState (onClick) — never a setState in
// an effect. Initial value preserves the real default landing tab.
const [activeTab, setActiveTab] = useState("resources");
const weekStart = useMemo(() => startOfWeek(new Date()), []);          // lazy, stable
const resourceOrder = useMemo(() => resources.map((r) => r.id), [resources]);
const weekColumns = useMemo(
  () => groupReservationsByWeek(reservations, weekStart, resourceOrder),
  [reservations, weekStart, resourceOrder],
);
const stats = useMemo(() => ({
  today: reservations.filter((r) => isReservationToday(r, new Date())).length,    // per-reservation-tz "today"
  upcoming: reservations.filter((r) => new Date(r.startsAt) > new Date()).length, // instant cmp (tz-independent)
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
            <Badge variant="soft">Beta</Badge>           {/* `soft` variant from 479-05 */}
            {/* KEEP the existing Refresh action — the existing green flow test clicks it */}
            <Button variant="outline" className="gap-2" onClick={handleRefreshAll}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button className="gap-1.5" onClick={() => setActiveTab("reservations")}>
              <Plus className="size-4" /> New booking
            </Button>
          </>
        }
      />

      {/* feedback.tone is "error" | "success"; real Alert has only default/destructive */}
      {feedback ? (
        <Alert variant={feedback.tone === "error" ? "destructive" : "default"}>
          {/* unchanged AlertTitle/AlertDescription */}
        </Alert>
      ) : null}

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
          <TabsTrigger value="slot-preview">Slot Preview</TabsTrigger>
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

**Timezone (explicit — no browser-local ambiguity):** all calendar-day bucketing
is timezone-explicit. The week columns are the seven calendar dates (Mon–Sun) of
the current week derived once from a single `weekStart`. A reservation is placed in
the column whose `YYYY-MM-DD` equals the reservation's OWN-timezone
(`reservation.timezone`, fallback `"UTC"`) calendar day, and its `time` is rendered
in that same timezone — mirroring the existing `formatDateTime` helper (which uses
`Intl.DateTimeFormat` with `timeZone`), never the browser-local `new Date(startsAt)`
day. The "Bookings today" stat uses the same per-reservation-timezone day comparison
(`isReservationToday`); "Upcoming" is a timezone-independent instant comparison
(`new Date(startsAt) > new Date()`). `addDays`, `toIsoDate`, `formatTime`,
`isoDateInTimeZone`, `isReservationToday`, `startOfWeek`, and `weekRangeLabel` are
new pure helpers appended next to `groupReservationsByWeek` in `bookingHelpers.ts`;
`formatTime`/`isoDateInTimeZone` reuse the `Intl.DateTimeFormat` pattern already in
`formatDateTime`. (`WEEKDAY_LABELS` is a new local constant.)

**Error handling:** preserve the existing `feedback` state + `Alert`; guard
`groupReservationsByWeek` against malformed `startsAt` — an unparseable value makes
`isoDateInTimeZone` return `""`, which matches no column, so the record is skipped
and the render never throws. With empty `reservations`/`resources` the rail and
grid render empty columns (no crash).

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
