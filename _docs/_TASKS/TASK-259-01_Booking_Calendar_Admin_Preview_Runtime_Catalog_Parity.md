# TASK-259-01: Booking Calendar Admin Preview Runtime Catalog Parity

# FileName: TASK-259-01_Booking_Calendar_Admin_Preview_Runtime_Catalog_Parity.md

**Priority:** High
**Category:** Widgets + Booking + Admin UI + Runtime Preview
**Estimated Effort:** Large
**Dependencies:** TASK-256-07, TASK-259
**Status:** To Do

---

## Overview

Make the page-builder admin canvas render `booking-calendar` with the same
service/resource catalog shape that public runtime rendering receives from
`resolveBookingRuntimeData({ preview: true })`.

`REPORT_BOOKING_CALENDAR_WIDGET.md` sections 4.5, 6, and 7.1 show that the
admin canvas always displays `No active booking services/resources configured
yet.` because saved widget JSON has no `resolved.services` or
`resolved.resources`. Public rendering works because `publicSite.tsx` hydrates
the block before rendering.

This leaf fixes only Booking Calendar preview/catalog parity. It must not add a
generic preview resolver for every widget unless a shared task is opened first.

## Scope Boundary

This leaf does not own:

- generic widget preview resolver architecture outside Booking Calendar;
- shared interactive ARIA fixes from TASK-256-04;
- Appointment Form admin preview behavior from TASK-258;
- Booking admin Availability "Add row" UX from report section 7.4.

If a generic server-rendered admin preview architecture is required, split it out
before implementing this leaf.

## Sub-Tasks

- [ ] Add a Booking Calendar admin preview catalog helper that builds
  `BookingCalendarData["resolved"]` from existing admin booking cache/client
  data.
- [ ] Keep the helper pure enough to unit test: input is services, resources,
  service-resource pairs, and optional resolver error; output is the existing
  normalized `resolved` payload.
- [ ] Wire page-builder canvas preview so `WidgetRenderer` receives a hydrated
  Booking Calendar block in admin only.
- [ ] Keep slot/runtime tokens backend-owned: admin preview may show catalog
  services/resources and diagnostic errors, but it must not persist or expose
  privileged token values in page JSON.
- [ ] Refresh preview data when booking resource/service cache events fire,
  using existing `cacheBus` and `bookingClient` cache semantics.
- [ ] Preserve saved widget data: hydrated `resolved` data is preview-only and
  must not be written back into the page block unless the editor explicitly
  changes a widget-owned field.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/builder/BlockList.tsx` | Hydrate Booking Calendar preview blocks before rendering, or delegate to a narrow preview-hydration component/helper. |
| `core/admin/services/bookingClient.ts` | Reuse existing cached list/service-resource reads; add no new write behavior. |
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Keep diagnostics truthful when preview catalog data exists; do not store preview-only token data. |
| `core/widgets/core/bookingCalendar.tsx` | Update render only if the empty-state behavior must distinguish no catalog from preview-loading/error. |
| `tests/vitest/ui/booking-calendar-admin-preview.test.tsx` | New focused test for hydrating admin preview from cached services/resources and preserving block data. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Add render assertions for preview catalog/error states if renderer output changes. |
| `tests/vitest/admin/bookingClient.test.ts` | Update only if helper/client cache behavior changes. |

## Implementation Pseudocode

```ts
type BookingCatalogPreviewInput = {
  services: BookingServiceRecord[];
  resources: BookingResourceRecord[];
  serviceResourcesByServiceId: Record<string, BookingServiceResourceRecord[]>;
  error?: string;
};

function buildBookingCalendarPreviewResolved(input: BookingCatalogPreviewInput) {
  const activeResources = input.resources.filter((resource) => resource.status === "active");
  const activeResourceIds = new Set(activeResources.map((resource) => resource.id));

  return {
    services: input.services
      .filter((service) => service.status === "active")
      .map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        bufferBeforeMinutes: service.bufferBeforeMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
        priceCents: service.priceCents,
        currency: service.currency,
        status: service.status,
        resourceIds: (input.serviceResourcesByServiceId[service.id] ?? [])
          .map((row) => row.resourceId)
          .filter((resourceId) => activeResourceIds.has(resourceId)),
      }))
      .filter((service) => service.resourceIds.length > 0),
    resources: activeResources.map(toBookingCalendarResolvedResource),
    slotsToken: null,
    ...(input.error ? { error: input.error } : {}),
  };
}

function hydrateBookingCalendarPreviewBlock(block: Block, resolved: BookingCalendarResolved) {
  if (block.type !== "booking-calendar") return block;
  return {
    ...block,
    data: normalizeBookingCalendarData({
      ...(block.data as BookingCalendarData),
      resolved,
    }),
  };
}
```

Error handling:

- If booking catalog reads fail, render the widget with a non-secret
  `resolved.error` such as `booking_preview_catalog_unavailable` and keep the
  existing empty state.
- If service-resource mappings are partially unavailable, do not invent
  resource bindings; show diagnostics and keep unresolved services out of the
  preview catalog.
- If the block is saved while preview data is present, persist only user-authored
  widget data and never the preview-only `resolved` payload.

## Security Contract

No public endpoint is added.

- Endpoint visibility: internal admin reads through existing booking admin
  endpoints only.
- Auth model: existing admin session and `booking:read` route protections remain
  the source of truth.
- RBAC: unchanged; no client-side bypass of booking admin permissions.
- CSRF: unchanged because this leaf performs reads only.
- Rate-limit bucket: unchanged internal admin route behavior.
- Reject-unknown validation: persisted widget data still validates through
  `bookingCalendarSchema`; preview-only resolved data must match the schema.
- Anti-abuse: no public write path, no runtime token generation in the browser,
  no unbounded background polling.
- Secret handling: do not store slots tokens, nonce secrets, or private booking
  diagnostics in page JSON, localStorage, reports, or changelog notes.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/booking-calendar-admin-preview.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/admin/bookingClient.test.ts` if cached
  client behavior changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` sections 4.5, 6,
  and 7.1 after validation.
- Update `_docs/_WIDGETS/BOOKING_CALENDAR.md` with admin preview behavior.

## Changelog Policy

- Covered by the TASK-259 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Admin canvas preview shows active booking services/resources when they exist
  and does not remain stuck in the empty state solely because `resolved` was not
  persisted.
- Preview-only resolved data is not saved into page JSON.
- Advanced diagnostics reflect the hydrated preview catalog count accurately.
- No public token or private booking diagnostic is exposed in admin cache or
  widget data.
