# TASK-210-06: Forms List Toasts and Error Mapping
# FileName: TASK-210-06_Forms_List_Toasts_and_Error_Mapping.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + API Contract
**Estimated Effort:** Large
**Dependencies:** TASK-210-03, TASK-210-04, TASK-210-05, TASK-208
**Status:** To Do

---

## Overview

Route Forms list mutations through the shared admin list toast contract and
tighten the Forms route/domain error mapping needed for clear user-facing
feedback.

Forms should use `createListActionToastAdapter` with Forms labels and
Forms-specific actions. The list should keep inline errors for context, but
floating top-right toast timing must match Pages: emit after the mutation
settles, and emit delete feedback only after the user confirms the destructive
dialog.

## Sub-Tasks

- [ ] TASK-210-06-01: Forms List Toast Adapter Wiring
- [ ] TASK-210-06-02: Forms Route Error Mapping and Strict Schemas
- [ ] Add a Forms `createListActionToastAdapter` configuration for:
  create, publish, draft, archive, delete.
- [ ] Wire create, row lifecycle, row delete, bulk lifecycle, and bulk delete
  success/error toasts.
- [ ] Preserve inline alerts for load errors and partial bulk failures.
- [ ] Add route/domain error mapping for known Forms errors if missing:
  - `form_invalid` -> 400;
  - `form_name_required` -> 400;
  - `form_slug_exists` -> 409;
  - `form_not_found` -> 404;
  - `form_delete_restricted` for retained-history delete conflicts -> 409;
  - field-write errors (`form_fields_invalid`, `form_field_invalid`,
    `form_field_label_required`, `form_field_id_duplicate`,
    `form_field_name_duplicate`) -> 400 when the mapper wraps
    `/forms/:id/fields`;
  - submission validation errors (`form_payload_invalid`,
    `form_payload_unknown_field`, `form_payload_required`) -> 400 if the mapper
    wraps the public submission path. This is route-boundary stability only;
    runtime-preview/editor copy remains outside TASK-210 unless another task
    owns it.
- [ ] Move or expose Forms status values from a Bun-free Forms contract/helper
  module, then consume the same values in route schemas, server normalization,
  and admin/UI types instead of duplicating string unions across DB-coupled and
  browser modules.
- [ ] Keep mapping centralized at the Forms route boundary, for example as
  `mapFormError(error): ApiError | null`, and reuse it consistently for
  create, detail, update, delete, field-write, and public submission form lookup
  paths.
- [ ] Keep hard-delete semantics aligned with the database contract: submissions
  and action-run history are retained, and a blocked delete returns a stable
  conflict instead of leaking a raw foreign-key/database error.
- [ ] Tighten `formCreateSchema` and `formUpdateSchema` status validation to
  enum values `draft | published | archived`.
- [ ] Keep public submission validation and error behavior unchanged unless a
  test proves it needs a route-boundary mapping fix.

## Files to Change

- `core/admin/ui/forms/FormListPage.tsx`
- `core/admin/ui/shared/listActionToasts.ts` only if the generic helper is
  missing a Forms-safe capability.
- A pure Forms contract/helper module under `core/services/forms/*` if shared
  status constants need an owner without importing `db/client`.
- `core/server/routes/formsRoutes.ts`
- `core/server/validation/formSchemas.ts`
- `core/services/forms/formsService.ts`
- `core/admin/services/formsClient.ts`
- `tests/vitest/ui/forms-pages-wave.test.tsx`
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/integration/routes/forms.test.ts`
- `tests/unit/forms/formsService.test.ts` only if service-domain behavior
  changes.

## Security Contract

- Visibility:
  - internal admin list mutations;
  - existing public submission route remains public.
- Auth model:
  - list mutations require existing authenticated admin session/admin API key
    path;
  - public submissions keep the existing access evaluator.
- RBAC:
  - `forms:read` for reads;
  - `forms:write` for create/update/delete;
  - public submissions use existing `submissionAccess` handling.
- CSRF: admin create/update/delete continue through `formsClient` with
  `withCsrf: true`.
- Rate-limit bucket: existing admin write bucket for admin writes; existing
  public-write protections for submissions.
- Reject-unknown validation:
  - create/update schemas reject unknown fields;
  - status enum values come from a pure Forms contract owner, not duplicated
    literals in route/admin modules;
  - status must be enum-validated at the route boundary;
  - `submissionAccess` remains `public | internal`.
- Anti-abuse:
  - no new public write path;
  - public submissions keep nonce plus optional reCAPTCHA behavior;
  - delete still requires UI confirmation in TASK-210-03/TASK-210-04;
  - blocked delete conflict copy must not expose raw submission payloads or
    action-run payloads.

## Pseudocode

```ts
const formListToasts = createListActionToastAdapter({
  labels: { singular: "form", plural: "forms" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    publish: { pastTense: "published", failureVerb: "publish" },
    draft: { pastTense: "moved to draft", failureVerb: "move to draft" },
    archive: { pastTense: "archived", failureVerb: "archive" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});
```

Route mapping should stay centralized at the Forms route boundary:

```ts
export const mapFormError = (error: unknown) => {
  if (!(error instanceof Error)) return null;
  if (error.message === "form_not_found") {
    return new ApiError("form_not_found", "Form not found", 404);
  }
  // ...
};
```

## Testing Requirements

- Add or update Vitest coverage proving:
  - create success/failure toasts;
  - publish/draft/archive success/failure toasts;
  - row delete toast emits only after confirm and resolved mutation;
  - bulk full-success and partial-failure toasts;
  - inline partial failure remains visible.
- Add or update Bun route coverage proving:
  - existing Forms route registration remains intact;
  - known Forms domain errors map to stable API errors/statuses;
  - create/update reject unknown fields;
  - create/update reject unknown status values;
  - field-write validation errors map to stable 400 responses if the mapper wraps
    `PUT /forms/:id/fields`;
  - delete with retained submissions/action diagnostics maps to a stable 409 and
    does not remove cached rows as a success;
  - `form_not_found` from public submission lookup, and any payload validation
    errors handled by the mapper, still map to stable Forms API errors without
    changing nonce/captcha/access behavior;
  - public submission schema still accepts the documented payload.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/list-action-toasts.test.ts`
  - `set -a && source .env && set +a && bun test tests/integration/routes/forms.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CMS_API.md` if route error response examples or status enum docs
  change.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Forms list uses the shared toast helper instead of duplicated toast math.
2. Toast timing matches Pages, including delete-after-confirm behavior.
3. Partial bulk failures surface in both toast and inline copy.
4. Known Forms domain errors map to machine-readable API errors.
5. Status enum validation is strict at the route boundary.
6. Retained-history delete conflicts are stable 409 responses, not raw database
   errors or false UI successes.
7. Field-write and public-submission errors touched by this route mapper do not
   leak raw internal errors.
8. Public submission hardening remains unchanged.
