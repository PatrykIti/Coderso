# TASK-311-03: Forms Hidden and File Field Public-Write Contract

# FileName: TASK-311-03_Forms_Hidden_and_File_Field_Public_Write_Contract.md

**Priority:** High
**Category:** Forms + Public Write Security + Validation + Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-311
**Status:** To Do

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

- [ ] Decide whether `hidden` and `file` both belong in the same release wave.
- [ ] Add canonical validation and runtime projection for the approved fields.
- [ ] Add any required route/storage/public-write hardening before widget
  adoption.
- [ ] Add first-widget adoption only after the Forms owner contract is green.

## Files to Change

| File | Required change |
|---|---|
| `core/services/forms/validation.ts` | Add canonical `hidden` / `file` field validation rules. |
| `core/services/forms/formRuntimeResolver.ts` | Project only safe runtime metadata for approved fields. |
| `core/server/routes/formsRoutes.ts` | Update public/internal submission behavior if these field types require route-level changes. |
| storage/upload owners used by Forms | Add or extend bounded upload handling only if `file` is approved. |
| Forms admin UI owners | Add builder/editor support for approved hidden/file settings. |
| widget consumers such as Form Embed | Adopt only after the Forms owner slice is executable. |

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
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
- route/storage/security suites for the approved hidden/file behavior
- widget tests only after a widget consumes the supported field type
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Forms source-of-truth docs that list supported field types and public-write
  policy
- `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` when current unsupported rows close
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- `hidden` and `file` are owned first by the Forms contract, not by a
  widget-local renderer workaround.
- Public-write security, runtime projection, admin builder, and docs stay
  synchronized for the approved trusted-field surface.
- No provider secrets or privileged payload semantics leak into widget-visible
  config.
