# TASK-343-02: Appointment Form Audit Remediation Family

# FileName: TASK-343-02_Appointment_Form_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Appointment Form + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Fix the confirmed false preset where `Phone validation -> No extra validation`
immediately normalizes back to the default international pattern.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_APPOINTMENT_FORM_WIDGET.md:174-183`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx:142-161,809-834`
- `core/widgets/core/appointmentForm.tsx:252-253,584-590,826-830,958-964`

## Sub-Tasks

- [ ] Allow an explicit empty phone pattern/message state to survive
  normalization.
- [ ] Keep preset resolution truthful for `default`, `digits-spaces`, and
  `not-required`.
- [ ] Add regression coverage for the preset round-trip and runtime markup.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/appointmentForm.tsx` | Preserve explicit empty validation state instead of coercing it to defaults. |
| `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx` | Keep the preset selector truthful when the saved pattern is intentionally blank. |
| `tests/vitest/widgets/appointmentForm.test.tsx` | Cover blank-pattern normalization and runtime output. |
| `tests/vitest/ui/appointment-form-editor-wave.test.tsx` | Cover preset selection and persisted state. |

## Implementation Pseudocode

```ts
function normalizePhoneValidation(data: AppointmentFormData) {
  const phonePattern =
    data.phonePattern === "" ? "" : text(data.phonePattern, appointmentFormDefaults.phonePattern);
  const phonePatternMessage =
    data.phonePatternMessage === ""
      ? ""
      : text(data.phonePatternMessage, appointmentFormDefaults.phonePatternMessage);
  return { phonePattern, phonePatternMessage };
}

function resolvePhoneValidationAttrs(data: AppointmentFormData) {
  if (data.phonePattern === "") {
    return { pattern: undefined, title: undefined, helpText: undefined };
  }
  return {
    pattern: data.phonePattern,
    title: data.phonePatternMessage,
    helpText: data.phonePatternMessage,
  };
}
```

## Regression Test Shape

- Selecting `No extra validation` persists `pattern=""`.
- The editor keeps the `not-required` preset selected after normalization.
- Runtime omits the restrictive phone `pattern`, empty `title`, and validation
  help text when the preset is blank; it must not render `pattern=""`.

## Security Contract

No API routes are added. Schema stays strict and bounded to the current phone
pattern/message fields.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_APPOINTMENT_FORM_WIDGET.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- `No extra validation` no longer snaps back to the default preset.
- Runtime and editor state agree on whether phone validation is active.
