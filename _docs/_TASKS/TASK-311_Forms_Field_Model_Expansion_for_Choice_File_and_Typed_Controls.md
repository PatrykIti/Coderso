# TASK-311: Forms Field Model Expansion for Choice File and Typed Controls

# FileName: TASK-311_Forms_Field_Model_Expansion_for_Choice_File_and_Typed_Controls.md

**Priority:** High
**Category:** Forms + Validation + Runtime Render + Public Write
**Estimated Effort:** Very Large
**Dependencies:** TASK-269-02
**Status:** Done (2026-05-19)

---

## Overview

Own the real Forms contract work behind report-only field types that current
widget families must not implement locally.

The live Forms model still accepts only `text`, `email`, `select`, `checkbox`,
`textarea`, `phone`, and `date`. Report rows like Form Embed C2/W1 prove that
future product work may want `radio`, `number`, `time`, `hidden`, `file`,
`range`, and `rating`, but that expansion must happen in the Forms owners
first: validation, builder/admin surfaces, runtime resolver payloads,
submission validation, public-write safety, and then widget renderers.

## Scope Boundary

This task owns:

- extending the Forms field-type contract itself;
- builder/admin data-entry surfaces for any newly supported field type;
- resolver/runtime payload changes for new field types;
- public submission validation and route/security behavior for new field types;
- widget-renderer adoption only after the Forms owner contract is executable.

This task does not hide that work inside TASK-269, Contact, Newsletter, or any
other widget-local follow-up family.

This umbrella is not implementation-ready by itself. Execute it through the
physical child tasks below so field-type families can land with focused
validation and route-security review.

## Concrete Live Owners

Current live owners that child leaves must target explicitly:

- canonical field model and submission normalization:
  `core/services/forms/validation.ts`,
  `core/services/forms/submissionService.ts`,
  `core/services/forms/formRuntimeResolver.ts`
- route/public-write boundary:
  `core/server/routes/formsRoutes.ts`
- admin client and builder surfaces:
  `core/admin/services/formsClient.ts`,
  `core/admin/ui/forms/FieldLibrary.tsx`,
  `core/admin/ui/forms/FieldSettingsPanel.tsx`,
  `core/admin/ui/forms/FormCanvas.tsx`,
  `core/admin/ui/forms/FormRuntimePreviewDialog.tsx`,
  `core/admin/ui/forms/FormBuilderPage.tsx`
- current first consumer/runtime surface:
  `core/widgets/core/formEmbed.tsx`,
  `core/widgets/core/formRuntimeScript.ts`

## Sub-Tasks

- [x] TASK-311-01: Forms Choice Field Expansion for Radio and Grouped Options
- [x] TASK-311-02: Forms Numeric, Temporal, Range, and Rating Field Expansion
- [x] TASK-311-03: Forms Hidden and File Field Public-Write Contract

## Implementation Order

1. Land `TASK-311-01` first because choice-field semantics affect grouped
   accessibility and the current Form Embed deferred rows directly.
2. Land `TASK-311-02` next because numeric/time/range/rating controls extend
   the same builder/runtime/value collection path without the higher-risk file
   upload surface.
3. Land `TASK-311-03` last because hidden/file fields need the strictest route,
   nonce, and storage/security review.

## Files to Change

| File | Required change |
|---|---|
| `core/services/forms/validation.ts` | Extend the canonical field-type model and submission validation rules. |
| `core/services/forms/submissionService.ts` | Keep submission normalization aligned with the expanded field-type contract. |
| `core/services/forms/formRuntimeResolver.ts` | Project any newly supported field types safely into runtime data. |
| `core/server/routes/formsRoutes.ts` | Update public/internal submission behavior only when new field types require it. |
| `core/admin/services/formsClient.ts` | Keep admin client types aligned with the expanded field model. |
| `core/admin/ui/forms/FieldLibrary.tsx` | Expose approved field types in the builder library only after the leaf contract lands. |
| `core/admin/ui/forms/FieldSettingsPanel.tsx` | Expose only the settings supported by the approved leaf contract. |
| `core/admin/ui/forms/FormCanvas.tsx` | Keep builder preview/output truthful for the approved field types. |
| `core/admin/ui/forms/FormRuntimePreviewDialog.tsx` | Keep runtime-preview behavior truthful for the approved field types. |
| `core/admin/ui/forms/FormBuilderPage.tsx` | Wire the approved field-library/settings/runtime-preview contract end to end. |
| `core/widgets/core/formEmbed.tsx` | Adopt new field types only after the Forms contract is executable. |
| `core/widgets/core/formRuntimeScript.ts` | Update runtime value collection only after the Forms contract is executable. |

## Security Contract

This task may affect the existing public Forms submission endpoint.

- Endpoint visibility: existing public `POST /forms/:id/submissions` and
  internal admin Forms APIs only; no weaker parallel endpoint.
- Auth/RBAC/CSRF/rate limit: unchanged baseline unless an approved field type
  explicitly requires a documented route-level change.
- Reject-unknown validation: every new field type and payload shape must remain
  allowlisted by schema/validator owners before persistence.
- Anti-abuse: file uploads, hidden values, or client-side defaults must not
  bypass the existing captcha/nonce policy.
- Secret handling: hidden/file-like fields must not expose provider keys,
  captcha secrets, nonce secrets, or privileged config in widget JSON or DOM.

## Testing Requirements

- `bun test tests/integration/routes/forms.test.ts`
- `bun test tests/unit/forms/submissionService.test.ts`
- `bun run test:vitest -- tests/vitest/forms/validation.test.ts`
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
- field-builder/admin tests for the touched Forms UI owners
- `bun run test:vitest -- tests/vitest/ui/field-library.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/forms-component-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/form-canvas-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/forms-pages-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui-integration/forms.test.tsx`
- widget tests only for the widgets that adopt the newly supported field types
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FORM_EMBED.md` and
  `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` as the current first-consumer
  source of truth for unsupported vs supported field types.
- Update `_docs/CMS_API.md` only when public/internal Forms route payloads or
  submission behavior change.
- Update widget docs only when a widget actually adopts the new field types.
- Update the relevant Playwright reports when unsupported-field rows are closed.

## Changelog Policy

- This task must not move to `Done` until it is listed in `_docs/_CHANGELOG/`
  and `_docs/_CHANGELOG/README.md`.

## Acceptance Criteria

- Newly supported field types are owned first by the Forms contract, not by a
  widget-local renderer.
- Public-write validation/security remains correct for every adopted field type.
- Widget families like TASK-269 can reference the Forms owner task instead of
  carrying anonymous “future field-model scope” placeholders.
- Form Embed remains the current first consumer: unsupported diagnostics stay in
  place until the relevant leaf lands, then move only with matching Forms-owner
  proof.
