# TASK-294: Appointment Form Custom Field Product Surface

# FileName: TASK-294_Appointment_Form_Custom_Field_Product_Surface.md

**Priority:** Medium
**Category:** Widgets + Booking + Admin UI + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-258-02, TASK-258-04
**Status:** To Do

---

## Overview

Add the actual Appointment Form custom-field authoring, rendering, and payload
collection surface now that the public booking metadata boundary is bounded.

This task owns only the widget-local product surface for `BF-05`:

- schema/defaults/normalizer for bounded custom fields
- admin editor authoring flow for supported custom field types
- runtime rendering and metadata serialization into the bounded
  `metadata.customFields` contract already hardened at the public route boundary
- widget docs/report evidence for the custom-field feature itself

It does not own:

- public booking route boundary hardening for `metadata`
- CAPTCHA projection or consent bridge
- generic builder/editor infrastructure

## Files to Change

- `core/widgets/core/appointmentForm.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/widgets/core/bookingRuntimeScript.ts`
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md`
- `_docs/_TASKS/README.md`

## Sub-Tasks

- [ ] Add bounded custom field schema/defaults/normalizer support for text,
  email, phone, select, checkbox, and textarea field types.
- [ ] Add editor controls for field label, type, required state, placeholder,
  and select options where relevant.
- [ ] Render custom fields in Appointment Form runtime without leaking admin-only
  metadata into the visible form.
- [ ] Serialize custom field answers into the existing bounded
  `metadata.customFields` payload shape.

## Implementation Pseudocode

```ts
type AppointmentCustomField = {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "checkbox" | "textarea";
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  maxLength?: number;
};

function normalizeAppointmentCustomFields(input: unknown): AppointmentCustomField[] {
  return toArray(input)
    .slice(0, 12)
    .map(normalizeCustomField)
    .filter((field) => field.id.length > 0 && field.label.length > 0);
}

function collectCustomFieldMetadata(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll("[data-appointment-custom-field]")).map(readCustomFieldValue);
}
```

## Security Contract

- Endpoint visibility: unchanged existing public booking write route.
- Auth model/RBAC/CSRF/rate-limit: unchanged from the current bounded booking
  reservation contract.
- Reject-unknown validation: consume only the bounded `metadata.customFields`
  shape already owned by the public booking schema.
- Anti-abuse: custom-field authoring must not reintroduce arbitrary script,
  secret, or unrestricted payload keys.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- Appointment Form can render and submit bounded custom field answers through
  `metadata.customFields`.
- Supported field types stay schema-owned, deterministic, and editor-visible.
- No arbitrary metadata keys, scripts, or secrets can be authored through the
  custom-field surface.
