# TASK-210-06-02: Forms Route Error Mapping and Strict Schemas
# FileName: TASK-210-06-02_Forms_Route_Error_Mapping_and_Strict_Schemas.md

**Priority:** High
**Category:** Coderso Forms + API Contract + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-210-01, TASK-038, TASK-056
**Status:** Done (2026-04-26)

---

## Overview

Tighten the Forms API route boundary so list mutations can rely on stable,
machine-readable errors and strict status validation.

This leaf is intentionally an early backend prerequisite for TASK-210 row and
bulk delete work. Land it before UI tasks claim retained-history conflict
handling, otherwise those UI tasks can only test against unstable database
constraint failures.

## Sub-Tasks

- [x] Add or reuse centralized `mapFormError(error): ApiError | null`.
- [x] Map `form_invalid` to HTTP 400.
- [x] Map `form_name_required` to HTTP 400.
- [x] Map `form_slug_exists` to HTTP 409.
- [x] Map `form_not_found` to HTTP 404.
- [x] Map retained-history delete conflicts as `form_delete_restricted` to HTTP
  409.
- [x] Map field-write validation errors (`form_fields_invalid`,
  `form_field_invalid`, `form_field_label_required`,
  `form_field_id_duplicate`, `form_field_name_duplicate`) to HTTP 400 if this
  mapper wraps `/forms/:id/fields`.
- [x] Map submission validation errors (`form_payload_invalid`,
  `form_payload_unknown_field`, `form_payload_required`) to HTTP 400 if this
  mapper wraps the public submission path. Do not change nonce/captcha/access
  semantics while doing this.
- [x] Use the mapper around create, detail, update, delete, field-write, and
  public submission form lookup paths.
- [x] Add a service-level delete precheck before hard delete that counts both
  retained `form_submissions` and retained `form_action_runs`. Throw
  `form_delete_restricted` when either count is non-zero so list delete failures
  are domain errors instead of raw foreign-key/database errors.
- [x] Keep mapper fallback coverage for unexpected database constraint errors,
  but do not rely on the fallback as the normal retained-history path.
- [x] Add or reuse a Bun-free Forms contract/helper owner for
  `draft | published | archived` status values so route schemas, service
  normalization, and admin/UI types consume one source without importing
  `db/client`.
- [x] Tighten `formCreateSchema.status` and `formUpdateSchema.status` to
  `enum: ["draft", "published", "archived"]`.
- [x] Tighten `formFieldsSchema` item validation when the mapper wraps
  `PUT /forms/:id/fields`: set unknown top-level field input keys to reject,
  keep `settings` as the flexible object for field-specific extension data, and
  preserve existing documented field keys.
- [x] Keep `submissionAccess` enum validation as `public | internal`.
- [x] Do not change public submission nonce/captcha/access behavior.

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
  - field-write schemas reject unknown top-level field input keys when
    `PUT /forms/:id/fields` is wrapped by `mapFormError`; flexible per-field
    data stays inside `settings` only.
- Anti-abuse:
  - no new public write path;
  - public submissions keep nonce plus optional reCAPTCHA behavior.

## Testing Requirements

- Known domain errors map to stable API errors/statuses.
- Existing Forms route registration remains covered, and
  `tests/integration/routes/forms.test.ts` must be extended beyond registration
  to execute the affected handlers/mapping paths.
- Create/update reject unknown fields.
- Create/update reject unknown status values.
- Field-write validation errors map to stable 400 responses if field-write is
  wrapped by `mapFormError`.
- Field-write rejects unknown top-level field input keys while preserving
  arbitrary per-field config inside `settings`.
- Public submission lookup maps missing forms without weakening nonce/captcha or
  access behavior.
- Submission payload validation errors map to stable 400 responses if the
  public-submission path is wrapped by `mapFormError`.
- Delete with retained submissions maps to a stable 409.
- Delete with retained action diagnostics maps to a stable 409 even when there
  are no retained submissions.
- Raw database constraint failures are covered as a fallback and do not leak
  internal error strings.
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
4. Field-write and public-submission validation errors touched by this mapper do
   not leak raw internal errors.
5. Public submission hardening remains unchanged.

## Completion Notes (2026-04-26)

- Implemented in branch `task/TASK-210-forms-list-parity` with Forms list parity scoped to the refined TASK-210 contract.
- Validation:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/forms-component-wave.test.tsx tests/vitest/ui-integration/forms.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts tests/vitest/admin/userSettingsClient.test.ts` - PASS (9 files, 48 tests).
  - `bun --cwd core lint` - PASS.
  - `bun --cwd core lint:types` - PASS.
  - `set -a && source ../Nextless/.env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts tests/unit/forms/submissionService.test.ts tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts` - PASS (20 tests; run outside sandbox for DB/env access).
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts` - PASS (2 files, 14 tests).
  - `set -a && source ../Nextless/.env && set +a && bun run gates:coderso` - BLOCKED after Core lint and Core typecheck passed; the gate script still points Functional UI smoke at absent `tests/unit/ui/*` files while current UI suites live under `tests/vitest/ui/*`.
- Scope notes: TASK-210 closes the Forms list/create-drawer/cache/toast/error-mapping/docs contract. Runtime preview, editor, duplicate, embed-code, and global dialog-wrapper follow-ups remain outside TASK-210 unless covered by a separate task.
