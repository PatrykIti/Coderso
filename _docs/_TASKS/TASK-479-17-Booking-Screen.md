# TASK-479-17: Booking Screen Migration
# FileName: TASK-479-17-Booking-Screen.md

**Priority:** Medium
**Category:** Admin UI / Visual Refresh / Booking
**Estimated Effort:** Medium
**Dependencies:** TASK-479-06
**Status:** ⏳ To Do
**Parent Task:** TASK-479

---

## Overview

Restyle the real admin Booking screen to the finished visual-redesign prototype
while keeping every existing data hook, cache contract, RBAC gate, and canonical
nav helper intact. The prototype Booking page
(`_docs/_PROTOTYPE/src/pages/advanced/BookingPage.tsx`) introduces the soft &
friendly (Notion-like) language — violet accent, `rounded-2xl` cards, soft
shadows, warm neutrals, light default + dark toggle — composed from the shared
primitives/patterns (`PageHeader`, `StatCard`, `SectionCard`, `Card`, `Badge`,
`Button`). This subtask ports that look onto
`core/admin/ui/booking/BookingPage.tsx` (and the components it composes), mapping
the prototype's stat row, weekly calendar grid (colored booking blocks), and
resources rail onto **real** Booking data — never fabricating reservations,
resources, or metrics.

The real screen is a tabbed CRUD surface (Resources / Services / Availability /
Reservations / Slot Preview) backed by `bookingClient` through the `cachedClient`
+ `cacheBus` contract. The prototype is an illustrative calendar overview; this
migration applies the prototype's design language to the real page chrome (header,
stat row, segmented tabs) and renders the prototype's weekly-calendar + resources
layout from the real `reservations`/`resources` state — it does NOT discard the
existing tabbed CRUD or its flows.

- **Goal:** Make the real Booking screen match the prototype's modern layout
  (`PageHeader` with Beta badge + New-booking action, a 3-up `StatCard` row with
  real counts, a soft segmented tab bar, and a weekly calendar grid of colored
  booking blocks alongside a resources rail) without changing any data, route,
  cache, or permission behavior.
- **Owning module/service:** `core/admin/ui/booking/`
  (`BookingPage.tsx`, `components/ReservationsTab.tsx`,
  `components/ResourcesTab.tsx`, `bookingHelpers.ts`, `bookingTypes.ts`);
  shared shell/patterns from TASK-479-06.
- **Source-of-truth docs:**
  - Prototype source: `_docs/_PROTOTYPE/src/pages/advanced/BookingPage.tsx`
  - Prototype primitives: `_docs/_PROTOTYPE/src/components/patterns/{PageHeader,StatCard,SectionCard}.tsx`, `_docs/_PROTOTYPE/src/components/ui/{card,badge,button}.tsx`
  - Tokens: `_docs/_PROTOTYPE/src/styles/theme.css`, `_docs/DESIGN_TOKENS.md`
  - Data contract: `core/admin/services/bookingClient.ts` (record types +
    `getCachedBooking*` / `list*Cached`), `core/admin/ui/booking/bookingTypes.ts`
  - Cache: `core/services/cachePolicy.ts` (`cacheKeys.booking*List`),
    `core/admin/utils/cacheBus.ts` (`subscribeCacheEvents`)
  - Shell/patterns landed by parent: TASK-479-05 (tokens), TASK-479-06 (shell +
    shared `PageHeader`/`StatCard`/`SectionCard`)
  - `_docs/TESTING_STRATEGY.md` (Vitest = Bun-free admin/UI lane)
- **Out of scope:** No new Booking endpoints, mutations, or `bookingClient`
  surface changes; no schedule/availability/slot-preview logic changes; no new
  routes or permissions. The prototype's `Utilization` stat has **no** real
  backing — it is NOT faked (see L01 mapping: replace with a real-derived count
  or a clearly-labeled placeholder + follow-up note). Theme tokens (TASK-479-05)
  and shell chrome (TASK-479-06) are delivered by those subtasks, not here.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths). Concretely: the screen keeps the
`booking:read` gate, `AdminShell activeHref="/admin/advanced/booking"` +
breadcrumbs, the `getCachedBooking*` cache-hydrate seeds, the `list*Cached`
background revalidation, and the `subscribeCacheEvents` → `cacheKeys.booking*List`
invalidation wiring exactly as today. Any in-page navigation or new action (e.g.
"New booking") must route through the shared canonical helpers / existing module
href registry — never a hand-built href literal.

---

## Sub-Tasks

| Leaf | Title | Status |
|------|-------|--------|
| TASK-479-17-L01 | Booking Calendar Restyle | ⏳ To Do |
| TASK-479-17-L02 | Booking Tests | ⏳ To Do |

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/booking-page.test.tsx`
- The existing booking suites must stay green (unchanged data/cache contract):
  `tests/vitest/ui/booking-helpers.test.ts`,
  `tests/vitest/ui/booking-tabs-leaf.test.tsx`,
  `tests/vitest/admin/bookingClient.test.ts`.
- State clearly in the closeout if any command was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update the board bucket + statistics when the status
  of this subtask or its leaves changes.
- `_docs/_CHANGELOG/` — add an entry on closure, cross-linking `TASK-479` and
  `TASK-479-17` (plus the specific leaf id).
- If the Booking screen's documented look changes in any UI/admin design doc
  under `_docs/UI/admin_panel/`, note the new design language there.
- If the unbacked `Utilization` stat ships as a static placeholder, file the
  follow-up (a real utilization/occupancy metric) and reference it.
