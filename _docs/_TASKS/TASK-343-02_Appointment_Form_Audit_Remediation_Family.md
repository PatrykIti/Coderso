# TASK-343-02: Appointment Form Audit Remediation Family

# FileName: TASK-343-02_Appointment_Form_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Appointment Form + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Fix the confirmed false preset where `Phone validation -> No extra validation`
immediately normalizes back to the default international pattern.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_APPOINTMENT_FORM_WIDGET.md:174-183`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx:142-161,809-834`
- `core/widgets/core/appointmentForm.tsx:252-253,584-590,826-830,958-964`

## Sub-Tasks

- [x] Allow an explicit empty phone pattern/message state to survive
  normalization.
- [x] Keep preset resolution truthful for `default`, `digits-spaces`, and
  `not-required`.
- [x] Add regression coverage for the preset round-trip and runtime markup.

## Completion Notes

- `normalizeAppointmentFormData` now preserves explicit empty
  `phonePattern`/`phonePatternMessage` values while absent values and
  accidental whitespace still fall back to the default international
  validation.
- Runtime output omits the phone `pattern`, `title`, and validation help text
  when extra phone validation is intentionally disabled.
- The Visual editor resolves the phone validation preset once per render and
  keeps `not-required` selected after normalization.
- Default international and digits/spaces presets remain non-empty and continue
  to render their validation attributes.

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
- Update `_docs/_WIDGETS/APPOINTMENT_FORM.md`.
- Update `_docs/_TASKS/README.md` on status changes.
- Add `_docs/_CHANGELOG/1029-2026-05-30-task-343-02-appointment-form-phone-validation.md`.

## Acceptance Criteria

- `No extra validation` no longer snaps back to the default preset.
- Runtime and editor state agree on whether phone validation is active.

## Validation Evidence

- `bun run test:vitest -- tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun scripts/playwright-widget-contract-smoke.ts --widget appointment-form --session task-343-02-appointment-form-final --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-02-appointment-form-final-smoke.json --output-md .tmp/task-343-02-appointment-form-final-smoke.md`
- `claude -p --tools "" --input-format text --output-format text`
  diff-fed read-only review for TASK-343-02. Claude raised a whitespace-only
  fallback concern; local verification showed the implementation already falls
  back through `text()`, and `tests/vitest/widgets/appointmentForm.test.tsx`
  now locks that behavior. Claude's README/parent-closure concern was checked
  against `_docs/_TASKS/README.md`, `_docs/_CHANGELOG/README.md`, and
  `TASK-343*.md` statuses.

Strict smoke passed with `adminFailures=0`, `publicFailures=0`,
`fixtureGaps=0`, and `metadataGaps=0`.
