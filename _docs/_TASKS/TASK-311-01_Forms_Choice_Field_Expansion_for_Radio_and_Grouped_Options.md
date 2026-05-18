# TASK-311-01: Forms Choice Field Expansion for Radio and Grouped Options

# FileName: TASK-311-01_Forms_Choice_Field_Expansion_for_Radio_and_Grouped_Options.md

**Priority:** High
**Category:** Forms + Validation + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-311, TASK-269-02
**Status:** To Do

---

## Overview

Extend the Forms owner contract for radio-like choice fields and any grouped
choice semantics that current widget families cannot truthfully implement
locally.

This leaf covers canonical validation, builder/admin support, runtime
projection, submission handling, and the first consumer-facing widget adoption
only after the Forms contract is executable.

## Scope Boundary

This leaf owns:

- `radio` field-type support in Forms owners;
- grouped choice semantics if the approved contract requires them;
- admin builder/editor surfaces for supported choice fields;
- runtime resolver and submission validation for the supported choice surface.

This leaf does not own:

- numeric/time/range/rating controls;
- file uploads or hidden trusted payloads;
- widget-local one-off rendering outside the approved Forms contract.

## Sub-Tasks

- [ ] Extend canonical Forms field-type validation for `radio`.
- [ ] Decide whether grouped checkbox/radio semantics are part of the same
  owner contract.
- [ ] Add admin builder/editor support and runtime projection.
- [ ] Add submission validation and first-widget adoption only after the Forms
  contract is green.

## Files to Change

| File | Required change |
|---|---|
| `core/services/forms/validation.ts` | Add canonical `radio` (and approved grouped choice) field-type validation. |
| `core/services/forms/formRuntimeResolver.ts` | Project supported choice-field metadata safely into runtime data. |
| `core/server/routes/formsRoutes.ts` | Update submission validation only when the Forms owner contract changes request semantics. |
| Forms admin UI owners | Add builder/editor support for the approved choice-field model. |
| widget consumers such as Form Embed | Adopt the new choice-field contract only after the Forms owner slice is executable. |

## Implementation Pseudocode

```ts
const supportedFormFieldTypes = [
  "text",
  "email",
  "select",
  "checkbox",
  "textarea",
  "phone",
  "date",
  "radio",
] as const;

function validateChoiceField(field: FormFieldInput) {
  if (field.type !== "radio") return;
  if (!Array.isArray(field.settings?.options) || field.settings.options.length < 2) {
    throw new Error("radio_options_invalid");
  }
}
```

Error handling:

- Choice options must stay schema-owned and allowlisted.
- Unsupported grouped semantics must remain visibly unsupported until the
  canonical owner lands.
- Widget renderers must not infer a choice contract the Forms owners still
  reject.

## Security Contract

This leaf affects the existing Forms public submission endpoint.

- Endpoint visibility: existing `POST /forms/:id/submissions` only.
- Auth/RBAC/CSRF/rate limit: unchanged baseline unless the new choice contract
  requires a documented route-level change.
- Reject-unknown validation: new choice-field payload shapes must remain
  allowlisted before persistence.
- Anti-abuse: grouped/choice values must not bypass existing captcha/nonce
  policy or server-side validation.

## Testing Requirements

- `bun test tests/integration/routes/forms.test.ts`
- `bun test tests/unit/forms/submissionService.test.ts`
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
- Forms admin builder/editor tests for the new choice-field UI
- widget tests only after a widget consumes the supported field type
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Forms source-of-truth docs that list supported field types
- `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` when current unsupported rows close
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- `radio` and any approved grouped choice semantics are owned first by Forms,
  not by a widget-local workaround.
- Submission validation, runtime projection, admin builder, and docs stay
  synchronized.
- Widgets can consume the new choice contract without inventing extra payload
  semantics.
