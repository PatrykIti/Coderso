# TASK-311: Forms Field Model Expansion for Choice File and Typed Controls

# FileName: TASK-311_Forms_Field_Model_Expansion_for_Choice_File_and_Typed_Controls.md

**Priority:** High
**Category:** Forms + Validation + Runtime Render + Public Write
**Estimated Effort:** Very Large
**Dependencies:** TASK-269-02
**Status:** To Do

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

## Sub-Tasks

- [ ] TASK-311-01: Forms Choice Field Expansion for Radio and Grouped Options
- [ ] TASK-311-02: Forms Numeric, Temporal, Range, and Rating Field Expansion
- [ ] TASK-311-03: Forms Hidden and File Field Public-Write Contract

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
| `core/services/forms/formsService.ts` and related admin owners | Persist and expose the approved field-type metadata. |
| `core/services/forms/formRuntimeResolver.ts` | Project any newly supported field types safely into runtime data. |
| `core/server/routes/formsRoutes.ts` | Update public/internal submission behavior only when new field types require it. |
| `core/admin/services/formsClient.ts` and Forms admin UI owners | Support the approved field-type metadata in the admin editor flow. |
| Widget renderers that consume Forms runtime data | Adopt new field types only after the Forms contract is executable. |

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
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts`
- field-builder/admin tests for the touched Forms UI owners
- widget tests only for the widgets that adopt the newly supported field types
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/CONTENT_TYPES_SPEC.md` and any Forms source-of-truth docs that
  list supported field types.
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
