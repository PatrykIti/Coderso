# TASK-258-02: Field Validation, Visibility, and Accessibility

# FileName: TASK-258-02_Field_Validation_Visibility_and_Accessibility.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-258, TASK-258-01
**Status:** Done (2026-05-18)

---

## Overview

Make Appointment Form field configuration truthful and accessible.

This leaf covers:

- UX-01: phone and notes label/placeholder controls remain active when their
  field toggles are off.
- UX-03: `noSelectionMessage` is user-facing copy and belongs in Visual, not
  only Advanced.
- BF-02: email is always optional and has no required toggle.
- BF-04: no first-name/last-name mode.
- BF-10: phone has no pattern validation.
- BF-11: notes has no `maxlength` or counter.
- BF-14: email cannot be hidden for phone-only booking flows.
- BF-17 and A1: missing browser autocomplete hints.
- BF-18 and A2: missing accessible form name/description.
- A3-A5: field validation and limits are incomplete.

## Files to Change

- `core/widgets/core/appointmentForm.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/widgets/core/bookingRuntimeScript.ts` if split-name payload composition
  needs runtime support.
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
- `tests/unit/widgets/validator.test.ts` if schema validation changes need
  registry coverage.
- `_docs/_WIDGETS/APPOINTMENT_FORM.md`

## Sub-Tasks

- [x] Replace top-level author-facing `showPhone` and `showNotes` controls with
  a normalized field-visibility model while preserving legacy payload reads.
- [x] Add `showEmail`, `requiredEmail`, and `requiredPhone` controls with
  backward-compatible defaults.
- [x] Add a `nameMode` contract for `full` versus `split` name entry, with
  labels/placeholders and runtime payload composition into the existing
  `customerName` API field.
- [x] Add phone pattern/configured help copy and render it only when phone is
  visible.
- [x] Add notes max length plus optional counter copy and render it only when
  notes is visible.
- [x] Move `noSelectionMessage` editing to Visual beside slot summary copy.
- [x] Hide or disable phone/notes label and placeholder controls when their
  field is off; do the same for email-specific controls when email is hidden.
- [x] Render autocomplete attributes and a form accessible name/description.

## Implementation Pseudocode

```tsx
type AppointmentFormFieldVisibility = {
  email: boolean;
  phone: boolean;
  notes: boolean;
};

type AppointmentFormValidation = {
  requiredEmail: boolean;
  requiredPhone: boolean;
  phonePattern: string;
  notesMaxLength: number;
};

type AppointmentFormName = {
  mode: "full" | "split";
  firstNameLabel: string;
  firstNamePlaceholder: string;
  lastNameLabel: string;
  lastNamePlaceholder: string;
};

function normalizeAppointmentFormData(data: AppointmentFormData): AppointmentFormData {
  const fieldVisibility = normalizeFieldVisibility({
    ...data.fieldVisibility,
    email: data.showEmail,
    phone: data.showPhone,
    notes: data.showNotes,
  });

  return {
    ...normalizedCopy,
    fieldVisibility,
    validation: normalizeAppointmentValidation(data.validation),
    name: normalizeAppointmentName(data.name),
  };
}

function AppointmentFormVisualEditor(props: WidgetEditorProps<AppointmentFormData>) {
  const normalized = normalizeAppointmentFormData(props.value);
  return (
    <Section title="Fields">
      <ToggleField label="Show email field" checked={normalized.fieldVisibility.email} />
      {normalized.fieldVisibility.email ? <EmailControls /> : null}
      <ToggleField label="Show phone field" checked={normalized.fieldVisibility.phone} />
      {normalized.fieldVisibility.phone ? <PhoneControls /> : null}
      <ToggleField label="Show notes field" checked={normalized.fieldVisibility.notes} />
      {normalized.fieldVisibility.notes ? <NotesControls /> : null}
    </Section>
  );
}
```

Runtime payload handling:

```ts
const fullName =
  String(formData.get("customerName") || "").trim() ||
  [formData.get("customerFirstName"), formData.get("customerLastName")]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");
```

Error handling:

- If `name.mode` is missing or invalid, normalize to `full`.
- If `requiredEmail` is true while email is hidden, keep email hidden and
  normalize `requiredEmail` to `false`. The rendered form must not require an
  invisible field, and the editor test must assert this normalization.
- If `requiredPhone` is true while phone is hidden, keep phone hidden and
  normalize `requiredPhone` to `false`. The rendered form must not require an
  invisible field, and the editor test must assert this normalization.
- Clamp `notesMaxLength` to a bounded range and omit the attribute only when the
  normalized value means unlimited.

## Security Contract

No API route is added. This leaf changes public form markup and may change the
client payload composition, but it must keep the existing reservation endpoint.

- Endpoint visibility: unchanged public `POST /api/booking/reservations`; no
  new admin or public route is added.
- Auth model: public booking reservations keep the existing booking access
  evaluator. Internal booking mode still requires an admin session or API key
  scope; client-required fields must not bypass it.
- RBAC: unchanged. Browser widget payloads never gain admin permissions.
- CSRF: unchanged for any admin/internal writes; public reservations keep the
  existing booking submission nonce/signature check when the access policy
  requires it.
- Rate-limit bucket: unchanged `public_write`.
- Reject-unknown validation: Appointment Form widget schema stays strict and
  legacy booleans normalize through `appointmentForm.tsx`; public reservation
  payload stays allowlisted by booking schemas.
- Anti-abuse: client-required fields improve UX but do not replace booking
  nonce/signature validation, the optional reCAPTCHA `public_write` policy, or
  internal session/API-key checks.
- Privacy: do not store contact values in localStorage, browser cache, report
  fixtures, or docs examples.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/bookingRuntimeScript.appointmentForm.test.ts`
  if split-name runtime composition is implemented in the script.
- `bun test tests/unit/widgets/validator.test.ts` when schema fields are added.

## Documentation Updates Required

- `_docs/_WIDGETS/APPOINTMENT_FORM.md`
- `_docs/PLAYWRIGHT/REPORT_APPOINTMENT_FORM_WIDGET.md` fixed evidence for
  UX-01, UX-03, BF-02, BF-04, BF-10, BF-11, BF-14, BF-17, BF-18, and A1-A5.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` on completion.

## Acceptance Criteria

- Editors never show active label/placeholder controls for hidden fields.
- Visual owns all user-facing field and no-slot copy.
- Hidden email/phone fields normalize their corresponding `required*` flags to
  `false`, with render/editor regression coverage.
- Email/phone required behavior is configurable and reflected in rendered HTML.
- Split-name mode submits the existing `customerName` API payload safely.
- Rendered fields include autocomplete hints, bounded notes length when set, and
  an accessible form name/description.
