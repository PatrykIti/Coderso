# TASK-258-03: Flow Pairing, Slot Context, Locale, and Redirect

# FileName: TASK-258-03_Flow_Pairing_Slot_Context_Locale_and_Redirect.md

**Priority:** High
**Category:** Widgets + Booking Runtime + Admin UX
**Estimated Effort:** Large
**Dependencies:** TASK-258, TASK-258-01, TASK-258-02
**Status:** To Do

---

## Overview

Make Appointment Form easier to connect to Booking Calendar and make selected
slot context clearer for visitors.

This leaf covers:

- UX-02: Flow key has no page-level pairing feedback.
- BF-06: selected slot summary lacks service/resource context.
- BF-12: no configurable success redirect after reservation.
- BF-15: no locale/date formatting configuration.

Booking Calendar may be touched only to enrich the selection event payload
needed by Appointment Form. Calendar editor/product redesign remains outside
this task.

## Files to Change

- `core/widgets/types.ts`
- `core/admin/ui/pages/PageEditor.tsx`
- `core/admin/ui/widgets/WidgetTemplateEditorPage.tsx` if template editing can
  provide local block context without fetching.
- `core/admin/ui/pages/builder/BlockSettings.tsx` only if the editor context
  needs to pass current sibling block summaries.
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/widgets/core/appointmentForm.tsx`
- `core/widgets/core/bookingCalendar.tsx`
- `core/widgets/core/bookingRuntimeScript.ts`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/widgets/bookingCalendar.test.tsx`
- `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`

## Sub-Tasks

- [ ] Add a narrow editor context path that lets Appointment Form see available
  Booking Calendar `flowId` values on the same edited surface.
- [ ] Show matched/missing/duplicate flow-key feedback in the Appointment Form
  Wizard without forcing a page save.
- [ ] Preserve plain text `flowId` entry for advanced/manual cases.
- [ ] Enrich booking slot selections with service and resource names.
- [ ] Render Appointment Form slot summary with configured service/resource
  context when those values are available.
- [ ] Add locale/date format configuration owned by Appointment Form runtime
  data and mirrored by the booking runtime script.
- [ ] Add optional same-origin or relative success redirect after successful
  booking submission.

## Implementation Pseudocode

```ts
type BookingFlowContext = {
  calendars: Array<{
    blockId: string;
    flowId: string;
    label: string;
  }>;
};

type WidgetEditorContext = {
  surface: WidgetSurface;
  bookingFlows?: BookingFlowContext;
};

function collectBookingFlowContext(blocks: WidgetBlock[]): BookingFlowContext {
  return {
    calendars: flattenBlocks(blocks)
      .filter((block) => block.type === "booking-calendar")
      .map((block) => ({
        blockId: block.id,
        flowId: normalizeBookingCalendarData(block.data).flowId ?? "booking-flow",
        label: normalizeBookingCalendarData(block.data).title ?? "Booking Calendar",
      })),
  };
}

function getFlowKeyState(flowId: string, context?: BookingFlowContext) {
  const matches = context?.calendars.filter((entry) => entry.flowId === flowId) ?? [];
  if (matches.length === 0) return "missing";
  if (matches.length > 1) return "duplicate";
  return "matched";
}

function buildPageEditorContext(blocks: WidgetBlock[], base: WidgetEditorContext) {
  return {
    ...base,
    bookingFlows: collectBookingFlowContext(blocks),
  };
}
```

Wire this context through the live entrypoints, not just the type:

- `PageEditor.tsx` desktop inspector `BlockSettings` call.
- `PageEditor.tsx` mobile/sheet `BlockSettings` call.
- `WidgetTemplateEditorPage.tsx` template `BlockSettings` call when local
  template blocks can be inspected without a page fetch.
- `BlockSettings.tsx` remains the pass-through owner for `editorContext`.

Runtime selection payload:

```ts
const nextSelection = {
  serviceId: serviceSelect.value,
  serviceName: serviceSelect.selectedOptions[0]?.textContent?.trim() || "",
  resourceId: resourceSelect.value,
  resourceName: resourceSelect.selectedOptions[0]?.textContent?.trim() || "",
  startsAt: slot.startsAt,
  endsAt: slot.endsAt,
  timezone,
};

function renderAppointmentSelection(selection) {
  const service = form.dataset.showServiceInSummary === "true" ? selection.serviceName : "";
  const resource = form.dataset.showResourceInSummary === "true" ? selection.resourceName : "";
  summaryNode.textContent = [service, resource, dateAndTime].filter(Boolean).join(" - ");
}
```

Redirect handling:

```ts
function resolveSafeRedirect(raw: string, origin: string): string | null {
  if (!raw.trim()) return null;
  const url = new URL(raw, origin);
  if (url.origin !== origin) return null;
  return url.pathname + url.search + url.hash;
}
```

Error handling:

- If editor context is unavailable, show neutral helper copy instead of a false
  missing warning.
- If service/resource names are unavailable in an old selection payload, keep
  the current time-only summary.
- If locale is invalid, fall back to browser locale.
- If redirect URL is unsafe or cross-origin, normalize it away and keep the
  visitor on the page after success.

## Security Contract

No API route is added.

- Endpoint visibility: unchanged admin editing and public runtime output. The
  existing public booking write route remains `POST /api/booking/reservations`.
- Auth model: unchanged. Admin/template editors require the existing admin
  session, public booking mode uses the booking access evaluator, and internal
  booking mode still requires admin session or API key scope.
- RBAC: unchanged. Flow pairing diagnostics expose only editor-visible block
  ids, labels, and flow keys.
- CSRF: unchanged for admin editing; public reservation submissions keep the
  existing booking submission nonce/signature check when required.
- Rate-limit bucket: unchanged `public_write` for public reservations.
- Reject-unknown validation: new widget fields such as locale, summary display,
  and redirect URL must be schema-owned and normalized in
  `appointmentForm.tsx`.
- Anti-abuse: redirect URLs must be same-origin or relative. Do not allow
  external redirect targets from widget data. Locale and summary fields must not
  weaken nonce/signature, optional reCAPTCHA, or internal session/API-key
  checks.
- Secret handling: flow context must not expose private booking data beyond
  widget block ids, labels, and flow keys already visible in the editor.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `bun run test:vitest -- tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  when `BlockSettings` passes the booking flow context to editor modes.
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx`
  when desktop/mobile `PageEditor` `BlockSettings` calls collect booking flow
  context from page blocks.
- `bun run test:vitest -- tests/vitest/ui/widget-template-editor.test.tsx`
  when `WidgetTemplateEditorPage` passes local template block context.

## Documentation Updates Required

- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md` fixed evidence for
  UX-02, BF-06, BF-12, and BF-15.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` on completion.

## Acceptance Criteria

- Appointment Form Wizard reports matched, missing, duplicate, or unknown flow
  context without blocking manual entry.
- Selected slot summary can include service/resource names when selected through
  Booking Calendar.
- Locale/date formatting is deterministic when configured and backward
  compatible when omitted.
- Success redirect accepts only relative or same-origin targets and is covered
  by tests.
