# TASK-259-07: Booking Calendar Default Pickers and Diagnostics

# FileName: TASK-259-07_Booking_Calendar_Default_Pickers_and_Diagnostics.md

**Priority:** Medium
**Category:** Widgets + Booking + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-259-01, TASK-259-02, TASK-259
**Status:** To Do

---

## Overview

Replace raw Booking Calendar default service/resource ID inputs with
catalog-aware pickers and make runtime diagnostics truthful.

`REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.15, 4.4, and 7.5 show that
`defaultServiceId` and `defaultResourceId` are currently raw text fields in
Advanced mode and that the resolved payload diagnostic can show
`Services: 0 · Resources: 0` even when Booking admin has configured data.

TASK-259-01 provides the preview catalog foundation. This leaf improves editor
selection UX and diagnostics on top of that data.

## Scope Boundary

This leaf does not own:

- admin canvas preview hydration itself, owned by TASK-259-01;
- date default/range controls, owned by TASK-259-02;
- generic frame style color pickers from TASK-256-02 only after
  TASK-256-07/TASK-256-08 names a concrete Booking Calendar owner/test path.

## Sub-Tasks

- [ ] Expose active booking services/resources to Booking Calendar editors using
  the preview catalog from TASK-259-01 or existing cached admin booking client
  reads.
- [ ] Replace raw `Default service ID` and `Default resource ID` inputs with
  dropdowns where catalog data exists.
- [ ] Keep a deliberate raw ID fallback only for unresolved/catalog-error cases,
  and label it as fallback diagnostics rather than the primary workflow.
- [ ] Filter resource dropdown options by the selected/default service's
  resource bindings.
- [ ] Add validation copy when a saved default service/resource no longer exists
  or is inactive.
- [ ] Make the Advanced diagnostics count show current preview/runtime catalog
  data and resolver errors truthfully.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx` | Replace raw default inputs with catalog-aware selects and diagnostics. |
| `core/admin/services/bookingClient.ts` | Reuse cached list/service-resource reads if the editor needs direct catalog access. |
| `core/widgets/core/bookingCalendar.tsx` | Add no fields unless diagnostics require normalized warning copy. |
| `tests/vitest/ui/booking-calendar-editor-wave.test.tsx` | Add picker, filtering, stale-default, and fallback raw-input coverage. |
| `tests/vitest/admin/bookingClient.test.ts` | Update only if cached client behavior changes. |
| `tests/vitest/widgets/bookingCalendar.test.tsx` | Update only if schema/render behavior changes. |

## Implementation Pseudocode

```tsx
function DefaultServicePicker({ value, services, onChange }: Props) {
  if (services.length === 0) {
    return <TextField label="Default service ID" value={value.defaultServiceId} onChange={...} />;
  }

  return (
    <Select value={value.defaultServiceId ?? "__auto__"} onValueChange={handleServiceChange}>
      <SelectItem value="__auto__">Auto-select first available service</SelectItem>
      {services.map((service) => (
        <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
      ))}
    </Select>
  );
}

function resolveResourceOptions(serviceId, resources, serviceResourcesByServiceId) {
  const allowed = new Set(serviceResourcesByServiceId[serviceId] ?? []);
  return resources.filter((resource) => allowed.size === 0 || allowed.has(resource.id));
}
```

Error handling:

- If a saved default service is stale, keep the stored value until the user
  changes it, but show a non-blocking warning and an Auto option.
- If changing service makes the default resource invalid, clear
  `defaultResourceId` or select the first valid resource only when the user
  confirms through the picker event.
- If catalog loading fails, do not erase current defaults.

## Security Contract

No API routes are added.

- Endpoint visibility: internal admin reads only through existing clients.
- Auth model/RBAC: existing booking admin read permissions remain the source of
  truth.
- CSRF: unchanged because this leaf reads catalog data and writes only widget
  JSON through existing page save flows.
- Rate-limit bucket: unchanged internal admin route behavior.
- Reject-unknown validation: default IDs remain schema-owned string fields.
- Anti-abuse: no public lookup endpoint and no unbounded catalog polling.
- Secret handling: catalog diagnostics must not expose tokens, private settings,
  or privileged route data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx` if
  schema/render behavior changes.
- `bun run test:vitest -- tests/vitest/admin/bookingClient.test.ts` if cached
  client behavior changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_BOOKING_CALENDAR_WIDGET.md` sections 3.15,
  4.4, and 7.5 after validation.
- Update `_docs/_WIDGETS/BOOKING_CALENDAR.md` with default picker behavior and
  diagnostics.

## Changelog Policy

- Covered by the TASK-259 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Editors can select default service/resource from real catalog data without
  copying UUIDs.
- Resource options stay compatible with the selected service.
- Stale defaults are visible and recoverable without data loss.
- Diagnostics report the actual preview/runtime catalog state.
