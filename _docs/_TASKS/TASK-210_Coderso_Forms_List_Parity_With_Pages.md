# TASK-210: Coderso Forms List Parity With Pages
# FileName: TASK-210_Coderso_Forms_List_Parity_With_Pages.md

**Priority:** High
**Category:** Coderso Forms + Admin/UI + UX + Admin Cache
**Estimated Effort:** Very Large
**Dependencies:** TASK-038, TASK-056, TASK-205, TASK-206, TASK-208
**Status:** To Do

---

## Overview

Bring `/admin/coderso/forms` to the same first-screen list contract as the
current `/admin/pages` implementation while preserving the Forms domain
contract.

This is a parity task, not a Forms redesign. The list should reuse the same
admin list primitives, visual density, feedback timing, table treatment,
pagination, visible-row selection, token-backed confirmations, and shared
list-action toasts that Pages already uses. Resource behavior must stay
Forms-specific: forms have `draft | published | archived` status,
`submissionAccess`, builder/action-log routes, public submission hardening, form
fields, automation actions, and the existing `/forms` admin API contract.

`/admin/coderso/forms` is the canonical admin route. `/admin/forms` remains only
a backward-compatible alias through `adminPaths`.

## Current Repo Findings

### Pages Reference Implementation

- `core/admin/ui/pages/PageListPage.tsx` owns the Pages list orchestration:
  cached hydration plus background refresh, filters, visible-row selection,
  inline bulk actions, create drawer, shared pagination, confirmed deletes, and
  shared `createListActionToastAdapter` feedback.
- `core/admin/ui/pages/PageTable.tsx` owns the Pages table presentation with
  checkbox selection, responsive row metadata, shared dropdown row actions, and
  `AdminLink` editor navigation.
- `core/admin/ui/pages/PageFilters.tsx`,
  `core/admin/ui/pages/PageBulkActionsBar.tsx`,
  `core/admin/ui/pages/PageRowActions.tsx`,
  `core/admin/ui/shared/ListPaginationFooter.tsx`,
  `core/admin/ui/shared/ConfirmActionDialog.tsx`, and
  `core/admin/ui/shared/listActionToasts.ts` are the concrete list primitives
  Forms should reuse or mirror with Forms-specific labels.
- Pages emits floating top-right success/error toasts after real mutations
  complete and only emits delete feedback after `ConfirmActionDialog` confirms
  the destructive action.

### Current Forms Gaps

- `core/admin/ui/forms/FormListPage.tsx` is still a narrow list wrapper:
  `PageHeader`, `New form`, `FormTable`, direct create navigation, direct row
  delete, and inline alerts only.
- `FormListPage` passes `activeHref="/admin/forms"`, even though docs and
  navigation declare `/admin/coderso/forms` as canonical.
- `FormBuilderPage` and `FormActionLogsPage` still use legacy `/admin/forms`
  active href/navigation literals in a few route-shell places. TASK-210 should
  normalize those route-only seams when it wires canonical list/editor/action-log
  links, without changing builder/runtime behavior.
- `core/admin/ui/forms/hooks/useForms.ts` always calls `refresh(true)` on
  mount, even when `getCachedForms()` already has a valid list. Pages uses a
  cache-present/background and cache-missing/foreground refresh policy.
- `FormTable` has no checkbox column, no visible selected-row styling, no
  shared pagination footer, no filters, and only Edit/Delete row actions.
- Forms list has no shared list-action toast adapter for create, lifecycle, or
  delete success/failure.
- Row delete runs immediately from the dropdown. It does not use
  `ConfirmActionDialog`.
- `FormCreateDrawer` is touched by this parity family and should match the
  Pages drawer accessibility contract while it is being updated: use the
  existing sheet description / `aria-describedby` pattern for the create drawer
  instead of leaving the current Radix missing-description warning in the list
  create flow. This does not close the global dialog-warning class for runtime
  preview or unrelated dialogs.
- Forms client already owns enough API surface for list parity:
  `listFormsCached`, `getCachedForms`, `createForm`, `updateForm`, and
  `deleteForm`.
- Forms routes currently validate unknown fields through JSON schemas, but
  status enum validation and centralized mapping for known domain errors
  (`form_invalid`, `form_name_required`, `form_slug_exists`, `form_not_found`)
  need to be checked before the list relies on clean API copy.
- Database constraints intentionally restrict hard deletion when retained
  `form_submissions` or `form_action_runs` rows exist. The task family must not
  imply that delete removes collected submissions or diagnostics; deletion-safe
  forms may be hard-deleted, while retained-history forms must surface a stable
  conflict and use Archive as the safe lifecycle path.

### Forms Contract Constraints

- Current admin API:
  - `GET /forms`
  - `POST /forms`
  - `GET /forms/:id`
  - `PATCH /forms/:id`
  - `DELETE /forms/:id`
  - `GET /forms/:id/fields`
  - `PUT /forms/:id/fields`
  - `GET /forms/:id/submissions`
  - Form actions routes in `core/server/routes/formActionsRoutes.ts`
- Current list/editor owners:
  - `core/admin/services/formsClient.ts`
  - `core/admin/ui/forms/FormListPage.tsx`
  - `core/admin/ui/forms/FormTable.tsx`
  - `core/admin/ui/forms/FormCreateDrawer.tsx`
  - `core/admin/ui/forms/FormBuilderPage.tsx`
  - `core/admin/ui/forms/FormActionLogsPage.tsx`
- Status transitions are regular form metadata updates through
  `updateForm(id, { status })`.
- Action logs are an existing Forms contract at
  `/admin/coderso/forms/:id/action-runs`. A list row shortcut to that route is
  in scope because it uses the shipped Forms diagnostic surface and does not add
  a new Forms API.
- Public submissions stay on `POST /forms/:id/submissions` and keep nonce plus
  optional reCAPTCHA hardening. List parity must not weaken that runtime path or
  expose submission payloads in list cache/debug output.
- There is no current duplicate or list-preview Forms API. Do not add Page-only
  actions such as Duplicate, Runtime Preview from the list, or Embed Code unless
  a separate service/API/UI contract is created first.

## Required Product Behavior

1. `/admin/coderso/forms` visually matches the Pages list pattern:
   `AdminShell`, `PageHeader`, centered `max-w-6xl`, compact `New` action,
   table card treatment, shared pagination footer, inline bulk action controls,
   and token-backed confirmations.
2. The list uses Forms-specific filters:
   - search by form name, slug, and description;
   - status filter: all, published, draft, archived;
   - access filter: all, public, internal.
3. The table uses the Pages table behavior but Forms columns:
   checkbox, form, status, submission access, updated, actions.
4. Row actions are contract-specific:
   - Edit,
   - Action logs,
   - Publish when the form is not published,
   - Move to draft when the form is published or archived,
   - Archive when the form is not archived,
   - Delete.
   Do not add Preview, Duplicate, or Embed Code in this task.
5. `New` opens a list-owned Forms create drawer. It should support the existing
   list-drawer create fields (`name`, optional `slug`, `status`,
   `description`) and an open-after-create preference that mirrors the Pages
   list behavior. The list UI must not expose or submit builder-owned advanced
   fields (`successMessage`, `successRedirectUrl`, `submissionAccess`,
   `settings`) as drawer state. Preserve the existing `formsClient.createForm`
   contract: the client may still append normalized default `settings` before
   the network request when the UI did not provide settings, so tests must
   distinguish the list-to-client payload boundary from the client-to-API
   payload normalization.
   The drawer must also carry a sheet description/`aria-describedby` equivalent
   matching `PageCreateDrawer`; do not claim this as a global fix for other
   Forms dialogs.
6. Create, lifecycle, row delete, and bulk action feedback goes through
   `createListActionToastAdapter` with Forms labels and actions:
   create, publish, draft, archive, delete.
7. Delete and bulk delete use `ConfirmActionDialog`. No destructive Forms
   delete should run directly from a dropdown click. Hard delete remains
   deletion-safe only: if retained submissions/action diagnostics block the
   delete, the API returns a stable conflict and the UI keeps the row recoverable
   with Archive still available.
8. Cache behavior follows the shared admin cache contract:
   cache hydrate first, background revalidate when cache exists, foreground load
   when cache is absent, cache bus updates after mutations, and prefetch warmup
   remains cached-list-only.
9. The implementation must preserve the Forms builder, action logs, form field
   model, automation actions, public runtime submission access, and existing
   route aliases.

## Sub-Tasks

- [ ] TASK-210-01: Forms List Route, Shell, and Cache Hydration
- [ ] TASK-210-02: Forms Filters, Table, and Shared Pagination
- [ ] TASK-210-03: Forms Row Lifecycle Actions and Confirmations
- [ ] TASK-210-04: Forms Bulk Selection and Action Parity
- [ ] TASK-210-05: Forms Create Drawer and Open After Create
- [ ] TASK-210-06: Forms List Toasts and Error Mapping
- [ ] TASK-210-07: QA, Docs, Changelog, and Closure

## Leaf Breakdown

- [ ] TASK-210-01-01: Forms Canonical Route and Prefetch Warmup
- [ ] TASK-210-01-02: Forms Cache Hydration Hook Parity
- [ ] TASK-210-02-01: Forms Filter Model and View Component
- [ ] TASK-210-02-02: Forms Table Selection and Access Column
- [ ] TASK-210-02-03: Forms Shared Pagination and Selection Trim
- [ ] TASK-210-03-01: Forms Row Lifecycle Menu Contract
- [ ] TASK-210-03-02: Forms Row Delete Confirmation Contract
- [ ] TASK-210-04-01: Forms Bulk Action Bar and Visible Selection
- [ ] TASK-210-04-02: Forms Bulk Mutation Execution and Partial Failures
- [ ] TASK-210-05-01: Forms Create Drawer Reset and Payload Guard
- [ ] TASK-210-05-02: Forms Open After Create User Setting Contract
- [ ] TASK-210-06-01: Forms List Toast Adapter Wiring
- [ ] TASK-210-06-02: Forms Route Error Mapping and Strict Schemas
- [ ] TASK-210-07-01: Forms Parity Test Matrix
- [ ] TASK-210-07-02: Forms Docs, Changelog, and Board Closure

## Non-Goals

- No new public Forms endpoints.
- No changes to public submission nonce/captcha/access hardening except test
  updates needed to prove it remains intact.
- No new duplicate or list-preview action until the domain/service contract
  exists.
- No list-level Embed Code modal until a separate embed-snippet contract exists.
- No replacement of `FormBuilderPage`, `FormActionLogsPage`, form fields,
  automation actions, or runtime `form-embed`.
- No new table framework or Forms-only pagination system.
- No server-side pagination for `GET /forms`.
- No migration of Forms storage or status values.
- No destructive deletion of retained submission/action-run history.

## Security Contract

- Visibility:
  - Forms list/editor routes are internal admin UI.
  - Public submissions remain limited to `POST /forms/:id/submissions`.
- Auth model:
  - internal list reads require existing admin auth/session or supported admin
    API key path;
  - public submissions keep the existing access evaluator.
- RBAC:
  - `forms:read` for list/detail/submission reads;
  - `forms:write` for create, metadata/status updates, field writes, action
    writes, and delete.
- CSRF: all admin writes continue through existing admin client helpers with
  `withCsrf: true`.
- Rate-limit bucket: existing admin read/write buckets for list mutations;
  existing public-write bucket for public submissions.
- Reject-unknown validation:
  - `formCreateSchema` and `formUpdateSchema` stay the route validation boundary;
  - Forms status values must be owned by a Bun-free Forms contract module or an
    existing pure Forms helper so admin/UI, route schemas, and services do not
    duplicate enum strings or import `db/client` at module load;
  - status and submission access must be enum-validated instead of accepting
    arbitrary strings at the schema boundary.
  - hard-delete conflicts for retained submissions/action runs must map to a
    stable machine-readable 409 response instead of leaking raw database errors.
  - if TASK-210 wraps `PUT /forms/:id/fields`, field-write payloads must reject
    unknown top-level field input keys; flexible per-field extension data stays
    inside `settings`.
  - if TASK-210 wraps field-write or public-submission service errors in the
    Forms mapper, existing field and payload validation errors must map to stable
    400 responses instead of raw internal errors.
- Anti-abuse:
  - no new public write path;
  - destructive row and bulk delete require `ConfirmActionDialog`;
  - bulk actions operate only on visible selected form ids after
    filter/pagination trimming;
  - public submissions keep nonce plus optional reCAPTCHA behavior.

## Implementation Order

1. Align route/canonical active href and cache hydration behavior first so the
   list has the same navigation and request semantics as Pages.
2. Add Forms filters, table selection, and shared pagination on top of the
   stable cached list.
3. Add row lifecycle actions and delete confirmations through existing
   `updateForm` / `deleteForm` client contracts.
4. Land the Forms route/domain error mapping and strict schema hardening before
   destructive row/bulk delete behavior claims retained-history conflict
   acceptance.
5. Add visible-scope bulk actions and partial-failure handling.
6. Align create drawer behavior with Pages, including open-after-create.
7. Wire shared list-action toasts on top of the settled mutation/error contract.
8. Close with targeted Vitest/Bun tests, docs, changelog, and board updates.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/forms-pages-wave.test.tsx tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts`
- If route schema/error mapping changes:
  `set -a && source .env && set +a && bun test tests/integration/routes/forms.test.ts tests/unit/forms/formsService.test.ts`
- If `forms.openAfterCreate` is added:
  `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/userSettingsClient.test.ts`
  and
  `set -a && source .env && set +a && bun test tests/unit/settings/userSettingsService.test.ts tests/integration/routes/userSettings.test.ts`
- If public submission hardening changes or is touched:
  `set -a && source .env && set +a && bun test tests/unit/forms/submissionService.test.ts tests/vitest/forms/submissionAccess.test.ts tests/vitest/forms/submissionNonce.test.ts`
- If the create drawer payload boundary is touched:
  `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/formsClient.test.ts`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/ARCHITECTURE.md`
- `_docs/ADMIN_NAVIGATION.md` only if canonical route/alias docs change.
- `_docs/CMS_API.md` if route schemas or error mapping change.
- `docs/coderso/forms-list-and-builder.md`
- `_docs/PLAYWRIGHT/SUMMARY-FORMS.md` list-scope closure notes for BUG-2,
  UX-1, and the Forms-contract subset of BUG-5. BUG-5 requests for Duplicate,
  Runtime Preview, and Embed Code remain deferred/non-goals unless their own
  service/API/UI contracts are added first.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. `/admin/coderso/forms` matches the Pages list layout and interaction model.
2. `/admin/forms` remains a legacy alias and does not become the active href in
   the Forms list implementation.
3. Cached Forms rows render immediately when available and background refresh
   does not show a foreground loading card.
4. Search/status/access filters run before shared pagination.
5. Header checkbox selection applies only to current visible paginated rows.
6. Row lifecycle actions use Forms statuses and existing `updateForm`.
7. Row actions include a canonical `Action logs` shortcut without adding new
   Duplicate, Runtime Preview, or Embed Code behavior.
8. Row and bulk delete are confirmed through `ConfirmActionDialog`.
   Retained-history delete conflicts stay visible and do not emit false success.
9. Create, lifecycle, delete, and bulk outcomes emit shared top-right toasts and
   keep truthful inline partial-failure alerts where needed.
10. Public submission access, nonce/captcha hardening, builder routes, and action
   logs remain unchanged.
11. Any new user setting needed for Forms create behavior is typed and validated
    in both admin client and server settings contracts.
12. Forms create tests prove both payload boundaries: the list passes no UI-only
    or builder-owned fields to `createForm`, while `formsClient.createForm`
    preserves its existing normalized default `settings` network payload.
