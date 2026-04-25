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
- [ ] Map retained-history delete conflicts as `form_delete_restricted` to HTTP
  409.
- [ ] Use the mapper around create, detail, update, delete, field-write, and
  public submission form lookup paths.
- [ ] Add a service-level delete precheck or mapper-safe domain error so
  `form_submissions` / `form_action_runs` `onDelete: restrict` behavior does not
  leak raw database errors when list delete is blocked.
- [ ] Add or reuse a Bun-free Forms contract/helper owner for
  `draft | published | archived` status values so route schemas, service
  normalization, and admin/UI types consume one source without importing
  `db/client`.
- [ ] Tighten `formCreateSchema.status` and `formUpdateSchema.status` to
  `enum: ["draft", "published", "archived"]`.
- [ ] Keep `submissionAccess` enum validation as `public | internal`.
- [ ] Do not change public submission nonce/captcha/access behavior.

## Files to Change

- `core/server/routes/formsRoutes.ts`
- `core/server/validation/formSchemas.ts`
- `core/services/forms/formsService.ts`
- `core/admin/services/formsClient.ts`
- A pure Forms contract/helper module under `core/services/forms/*` if no
  existing Bun-free owner fits the status constants.
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
  - route/admin/service status validation shares one pure contract owner;
  - status rejects values outside `draft | published | archived`;
  - submission access rejects values outside `public | internal`.
  - blocked hard deletes return a stable conflict code without exposing
    submission or action-run payloads.
- Anti-abuse:
  - no new public write path;
  - public submissions keep nonce plus optional reCAPTCHA behavior.

## Testing Requirements

- Known domain errors map to stable API errors/statuses.
- Create/update reject unknown fields.
- Create/update reject unknown status values.
- Public submission lookup maps missing forms without weakening nonce/captcha or
  access behavior.
- Delete with retained submissions/action diagnostics maps to a stable 409.
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
3. Retained-history hard-delete conflicts are stable 409 responses.
4. Public submission hardening remains unchanged.
