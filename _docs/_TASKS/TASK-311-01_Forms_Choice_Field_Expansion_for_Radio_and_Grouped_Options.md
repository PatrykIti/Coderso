# TASK-311-01: Forms Choice Field Expansion for Radio and Grouped Options

# FileName: TASK-311-01_Forms_Choice_Field_Expansion_for_Radio_and_Grouped_Options.md

**Priority:** High
**Category:** Forms + Validation + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-311, TASK-269-02
**Status:** Done (2026-05-19)

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

- [x] Extend canonical Forms field-type validation for `radio`.
- [x] Decide whether grouped checkbox/radio semantics are part of the same
  owner contract.
- [x] Add admin builder/editor support and runtime projection.
- [x] Add submission validation and first-widget adoption only after the Forms
  contract is green.

## Files to Change

| File | Required change |
|---|---|
| `core/services/forms/validation.ts` | Add canonical `radio` (and approved grouped choice) field-type validation. |
| `core/services/forms/submissionService.ts` | Keep submission normalization aligned with the expanded choice-field contract. |
| `core/services/forms/formRuntimeResolver.ts` | Project supported choice-field metadata safely into runtime data. |
| `core/server/routes/formsRoutes.ts` | Update submission validation only when the Forms owner contract changes request semantics. |
| `core/admin/services/formsClient.ts` | Keep admin client types aligned with the expanded choice-field model. |
| `core/admin/ui/forms/FieldLibrary.tsx` | Add `radio` to the builder library only after the choice-field contract lands. |
| `core/admin/ui/forms/FieldSettingsPanel.tsx` | Add approved choice-field settings and grouped-choice controls only after the contract lands. |
| `core/admin/ui/forms/FormCanvas.tsx` | Keep builder preview truthful for the approved choice-field contract. |
| `core/admin/ui/forms/FormRuntimePreviewDialog.tsx` | Keep runtime preview truthful for the approved choice-field contract. |
| `core/admin/ui/forms/FormBuilderPage.tsx` | Wire the approved choice-field model through the builder flow end to end. |
| `core/widgets/core/formEmbed.tsx` | Adopt the new choice-field contract only after the Forms owner slice is executable. |
| `core/widgets/core/formRuntimeScript.ts` | Update runtime value collection only after the Forms owner slice is executable. |

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
- `bun run test:vitest -- tests/vitest/forms/validation.test.ts`
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
- `bun run test:vitest -- tests/vitest/ui/field-library.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/forms-component-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/form-canvas-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/forms-pages-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui-integration/forms.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/formRuntimeScript.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` when current unsupported rows close
- `_docs/CMS_API.md` only when Forms route payloads or validation behavior change
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- `radio` and any approved grouped choice semantics are owned first by Forms,
  not by a widget-local workaround.
- Submission validation, runtime projection, admin builder, and docs stay
  synchronized.
- Widgets can consume the new choice contract without inventing extra payload
  semantics.
- Form Embed can stop rendering the current unsupported diagnostic for `radio`
  only when the Forms owner contract and its admin/runtime surfaces are green.
