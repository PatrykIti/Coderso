# TASK-210-06-02: Forms Route Error Mapping and Strict Schemas
# FileName: TASK-210-06-02_Forms_Route_Error_Mapping_and_Strict_Schemas.md

**Priority:** High
**Category:** Coderso Forms + API Contract + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-210-06, TASK-038, TASK-056
**Status:** To Do

---

## Overview

Tighten the Forms API route boundary so list mutations can rely on stable,
machine-readable errors and strict status validation.

## Sub-Tasks

- [ ] Add or reuse centralized `mapFormError(error): ApiError | null`.
- [ ] Map `form_invalid` to HTTP 400.
- [ ] Map `form_name_required` to HTTP 400.
- [ ] Map `form_slug_exists` to HTTP 409.
- [ ] Map `form_not_found` to HTTP 404.
- [ ] Use the mapper around create, detail, update, delete, field-write, and
  public submission form lookup paths.
- [ ] Tighten `formCreateSchema.status` and `formUpdateSchema.status` to
  `enum: ["draft", "published", "archived"]`.
- [ ] Keep `submissionAccess` enum validation as `public | internal`.
- [ ] Do not change public submission nonce/captcha/access behavior.

## Files to Change

- `core/server/routes/formsRoutes.ts`
- `core/server/validation/formSchemas.ts`
- `tests/integration/routes/forms.test.ts`
- `tests/unit/forms/formsService.test.ts` only if service behavior changes.
- `tests/unit/forms/submissionService.test.ts` only if submission behavior
  changes.
- `tests/vitest/forms/submissionAccess.test.ts` only if access behavior changes.
- `tests/vitest/forms/submissionNonce.test.ts` only if nonce behavior changes.

## Security Contract

- Visibility:
  - admin Forms CRUD remains internal;
  - `POST /forms/:id/submissions` remains public.
- Auth model:
  - admin reads/writes require existing admin session or supported API key path;
  - public submissions keep the existing access evaluator.
- RBAC:
  - `forms:read` for reads;
  - `forms:write` for admin create/update/delete/field writes;
  - internal public submissions keep their existing session/API-key logic.
- CSRF: admin writes continue through existing CSRF enforcement.
- Rate-limit bucket: existing admin write bucket and existing public-write
  bucket for submissions.
- Reject-unknown validation:
  - create/update reject unknown fields;
  - status rejects values outside `draft | published | archived`;
  - submission access rejects values outside `public | internal`.
- Anti-abuse:
  - no new public write path;
  - public submissions keep nonce plus optional reCAPTCHA behavior.

## Testing Requirements

- Known domain errors map to stable API errors/statuses.
- Create/update reject unknown fields.
- Create/update reject unknown status values.
- Public submission lookup maps missing forms without weakening nonce/captcha or
  access behavior.
- Public submission schema still accepts the documented payload.
- Commands:
  - `set -a && source .env && set +a && bun test tests/integration/routes/forms.test.ts`
  - `set -a && source .env && set +a && bun test tests/unit/forms/formsService.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms route errors are centralized and machine-readable.
2. Status validation is strict at the route boundary.
3. Public submission hardening remains unchanged.
