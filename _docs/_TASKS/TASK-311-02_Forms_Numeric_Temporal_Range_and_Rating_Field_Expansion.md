# TASK-311-02: Forms Numeric, Temporal, Range, and Rating Field Expansion

# FileName: TASK-311-02_Forms_Numeric_Temporal_Range_and_Rating_Field_Expansion.md

**Priority:** Medium
**Category:** Forms + Validation + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-311
**Status:** Done (2026-05-19)

---

## Overview

Extend the Forms owner contract for typed input controls whose behavior is more
than plain text: `number`, `time`, `range`, and `rating`.

This leaf covers canonical validation, builder/admin support, runtime
projection, and first-widget adoption only after the Forms owner contract is
executable.

## Scope Boundary

This leaf owns:

- `number`, `time`, `range`, and `rating` field-type support in Forms owners;
- shared settings such as min/max/step or rating scale where approved;
- admin builder/editor support and runtime projection;
- submission validation for the approved typed controls.

This leaf does not own:

- radio/grouped choice semantics;
- hidden or file upload security contracts.

## Sub-Tasks

- [x] Extend canonical Forms validation for approved typed controls.
- [x] Add builder/editor support and runtime projection for typed metadata.
- [x] Add submission validation and first-widget adoption only after the Forms
  owner contract is green.

## Files to Change

| File | Required change |
|---|---|
| `core/services/forms/validation.ts` | Add canonical typed-field validation for `number`, `time`, `range`, and `rating`. |
| `core/services/forms/submissionService.ts` | Keep submission normalization aligned with the expanded typed-field contract. |
| `core/services/forms/formRuntimeResolver.ts` | Project approved typed-field metadata into runtime data safely. |
| `core/server/routes/formsRoutes.ts` | Update submission validation only when typed controls change request semantics. |
| `core/admin/services/formsClient.ts` | Keep admin client types aligned with the expanded typed-field model. |
| `core/admin/ui/forms/FieldLibrary.tsx` | Add approved typed controls to the builder library only after the contract lands. |
| `core/admin/ui/forms/FieldSettingsPanel.tsx` | Add approved typed-field settings such as min/max/step or rating scale. |
| `core/admin/ui/forms/FormCanvas.tsx` | Keep builder preview truthful for approved typed controls. |
| `core/admin/ui/forms/FormRuntimePreviewDialog.tsx` | Keep runtime preview truthful for approved typed controls. |
| `core/admin/ui/forms/FormBuilderPage.tsx` | Wire the approved typed-field model through the builder flow end to end. |
| `core/widgets/core/formEmbed.tsx` | Adopt new typed controls only after the Forms owner slice is executable. |
| `core/widgets/core/formRuntimeScript.ts` | Update runtime value collection only after the Forms owner slice is executable. |

## Implementation Pseudocode

```ts
function validateTypedField(field: FormFieldInput) {
  if (field.type === "number" || field.type === "range") {
    assertFiniteRange(field.settings?.min, field.settings?.max, field.settings?.step);
  }
  if (field.type === "time") {
    assertTimeFormat(field.settings?.defaultValue);
  }
  if (field.type === "rating") {
    assertRatingScale(field.settings?.max ?? 5);
  }
}
```

Error handling:

- Typed-field defaults and settings must stay machine-validated and clamped.
- Runtime output must not silently coerce unsupported settings into broken DOM.
- Widgets must keep showing unsupported diagnostics until the Forms owners land
  the canonical typed-field contract.

## Security Contract

This leaf affects the existing Forms public submission endpoint.

- Endpoint visibility: existing `POST /forms/:id/submissions` only.
- Auth/RBAC/CSRF/rate limit: unchanged baseline unless typed controls require a
  documented route-level change.
- Reject-unknown validation: every typed-field setting must remain
  schema-owned and allowlisted.
- Anti-abuse: typed values must still pass existing nonce/captcha/public-write
  policy and server-side validation.

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

- Typed controls are owned first by the Forms contract, not a widget-local
  renderer shortcut.
- Validation, runtime projection, admin builder, and docs stay synchronized.
- Widgets can consume typed controls only after the canonical Forms contract
  exists and is tested.
- Form Embed can stop rendering the current unsupported diagnostics for
  `number`, `time`, `range`, and `rating` only when the Forms owner contract
  and its admin/runtime surfaces are green.
