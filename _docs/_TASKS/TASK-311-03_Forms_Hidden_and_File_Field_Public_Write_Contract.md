# TASK-311-03: Forms Hidden and File Field Public-Write Contract

# FileName: TASK-311-03_Forms_Hidden_and_File_Field_Public_Write_Contract.md

**Priority:** High
**Category:** Forms + Public Write Security + Validation + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-311
**Status:** Done (2026-05-19)

---

## Overview

Define the exact Forms owner contract for `hidden` and `file` fields, which
carry the highest public-write and trust-boundary risk in the deferred field
model.

This leaf must land the Forms-side security and validation contract before any
widget renderer is allowed to expose those fields.

## Scope Boundary

This leaf owns:

- canonical Forms validation and runtime projection for `hidden` and `file`;
- any explicit allowlists, size/type policies, and storage ownership needed for
  file uploads;
- public submission behavior and route/security changes required by those field
  types;
- first-widget adoption only after the Forms owner contract is executable.

This leaf does not own:

- unrelated typed controls such as radio/number/time/range/rating;
- provider-specific storage secrets in widget or browser-visible config.

## Sub-Tasks

- [x] Decide whether `hidden` and `file` both belong in the same release wave.
- [x] Add canonical validation and runtime projection for the approved fields.
- [x] Add any required route/storage/public-write hardening before widget
  adoption.
- [x] Add first-widget adoption only after the Forms owner contract is green.

## Files to Change

| File | Required change |
|---|---|
| `core/services/forms/validation.ts` | Add canonical `hidden` / `file` field validation rules. |
| `core/services/forms/submissionService.ts` | Keep submission normalization aligned with the approved trusted-field contract. |
| `core/services/forms/formRuntimeResolver.ts` | Project only safe runtime metadata for approved fields. |
| `core/server/routes/formsRoutes.ts` | Update public/internal submission behavior if these field types require route-level changes. |
| `core/server/requestBody.ts` | Support multipart/file parsing only if `file` is approved through the Forms route contract. |
| storage/upload owners used by Forms | Add or extend bounded upload handling only if `file` is approved. |
| `core/admin/services/formsClient.ts` | Keep admin client types aligned with the approved hidden/file model. |
| `core/admin/ui/forms/FieldLibrary.tsx` | Add hidden/file entries only after the trusted-field contract lands. |
| `core/admin/ui/forms/FieldSettingsPanel.tsx` | Add only the approved hidden/file settings once the contract lands. |
| `core/admin/ui/forms/FormCanvas.tsx` | Keep builder preview truthful for approved hidden/file behavior. |
| `core/admin/ui/forms/FormRuntimePreviewDialog.tsx` | Keep runtime preview truthful for approved hidden/file behavior. |
| `core/admin/ui/forms/FormBuilderPage.tsx` | Wire the approved trusted-field model through the builder flow end to end. |
| `core/widgets/core/formEmbed.tsx` | Adopt only after the Forms owner slice is executable. |
| `core/widgets/core/formRuntimeScript.ts` | Update runtime value collection only after the Forms owner slice is executable. |

## Implementation Pseudocode

```ts
function validateTrustedField(field: FormFieldInput, payload: SubmissionPayload) {
  if (field.type === "hidden") {
    assertHiddenFieldIsAllowlisted(field);
    assertClientValueMatchesPolicy(field, payload[field.name]);
  }
  if (field.type === "file") {
    assertUploadEnabled(field);
    assertMimeTypeAllowed(payload[field.name]);
    assertFileSizeWithinLimit(payload[field.name]);
  }
}
```

Error handling:

- `hidden` values must not become an unchecked client-side side channel for
  privileged config or routing.
- `file` fields must not ship until allowlists, storage ownership, and upload
  size/type policy are explicit.
- Widgets must keep showing unsupported diagnostics until the Forms owners land
  the canonical trusted-field contract.

## Security Contract

This leaf affects the existing public Forms submission endpoint and may require
storage/upload changes.

- Endpoint visibility: existing public `POST /forms/:id/submissions` and
  internal admin Forms APIs only; no weaker parallel endpoint.
- Auth/RBAC/CSRF/rate limit: unchanged baseline unless approved file-upload
  behavior requires a documented route-level change.
- Reject-unknown validation: hidden/file payload shapes must remain explicitly
  allowlisted.
- Anti-abuse: hidden/file fields must not bypass captcha/nonce policy, storage
  controls, size/type limits, or server-side validation.
- Secret handling: provider keys, CAPTCHA secrets, nonce secrets, and storage
  credentials remain backend-owned and must not move into widget JSON or DOM.

## Testing Requirements

- `bun test tests/integration/routes/forms.test.ts`
- `bun test tests/unit/forms/submissionService.test.ts`
- `bun run test:vitest -- tests/vitest/forms/validation.test.ts`
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
- `bun run test:vitest -- tests/vitest/server/requestBody.test.ts`
- `bun run test:vitest -- tests/vitest/ui/field-library.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/forms-component-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/form-canvas-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/forms-pages-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui-integration/forms.test.tsx`
- route/storage/security suites for the approved hidden/file behavior
- widget tests only after a widget consumes the supported field type
- `bun test tests/security/codersoSecurityGate.test.ts` when public-write or
  storage security semantics change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/FORM_EMBED.md`
- `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` when current unsupported rows close
- `_docs/CMS_API.md` when Forms public/internal route payloads or trusted-field
  validation behavior change
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- `hidden` and `file` are owned first by the Forms contract, not by a
  widget-local renderer workaround.
- Public-write security, runtime projection, admin builder, and docs stay
  synchronized for the approved trusted-field surface.
- No provider secrets or privileged payload semantics leak into widget-visible
  config.
- Form Embed can stop rendering the current unsupported diagnostics for
  `hidden` or `file` only when the trusted-field route/security contract and
  admin/runtime surfaces are green.
