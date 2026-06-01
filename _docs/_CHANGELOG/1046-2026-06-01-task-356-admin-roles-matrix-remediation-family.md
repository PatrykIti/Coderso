# 1046 - TASK-356 Admin Roles Matrix remediation family

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-356, TASK-356-01, TASK-356-02, TASK-356-03, TASK-356-04

## Key Changes

### Planning / QA

- Added the report-driven remediation family for the Admin Roles Matrix audit.
- Captured execution-ready scope for read-only restricted mode, permission
  diff review, mass-save confirmation, full-access confirmation, and RBAC audit
  diff payloads.
- Recorded the security contract for internal admin role routes, `roles:read`
  and `roles:write`, CSRF, admin-write rate limiting, strict validation, and
  high-risk permission confirmation.
- Split the family into physical execution leaf files:
  `TASK-356-01` through `TASK-356-04`, each with pseudocode, data flow, error
  handling, security contract, tests, docs plan, and acceptance criteria.
- Refined drift found by agent/Claude review: moved high-risk permission
  taxonomy into the diff-builder leaf, aligned rate buckets, clarified
  RoleEditor ownership, and expanded audit coverage beyond update-only diffs.
- Follow-up drift pass corrected the inline `PermissionsMatrixSearch`
  ownership to `PermissionsMatrixPage.tsx` so the read-only leaf no longer
  references a nonexistent component file.

### TASK-356-01 Permission-Aware Read-Only Mode

- Roles Matrix now consumes the shared admin permission snapshot through the
  same optional `permissions` prop plus `useAdminAuth()` fallback as the Users
  surface.
- `/admin/roles` has explicit denied/read-only/editable modes: denied mode
  avoids roles/catalog fetches, read-only mode keeps inspection/search active,
  and editable mode preserves current draft/save behavior.
- Read-only users no longer get active Add Role, Save changes, checkbox toggle,
  or bulk-toggle write controls; disabled matrix controls expose an accessible
  reason tied to `roles:write`.
- Stale `403` or `permission_denied` load/save failures refresh the shared
  permission snapshot, and stale save failures keep the dirty draft visible
  with refresh-required copy.
- Added page-level and leaf-level Vitest coverage for denied fetch prevention,
  searchable read-only mode, editable save behavior, route permission snapshot
  propagation, and stale-403 refresh.
- Added a Playwright CLI restricted-user pass for `/admin/roles`; the temporary
  `roles:read`-only user could inspect/search the matrix but could not enable
  Add Role, Save changes, checkbox toggles, bulk toggles, or dirty state.

### TASK-356-02 RBAC Diff Builder and Review Modal

- Added a pure roles-matrix diff helper that normalizes permission sets,
  expands `*` against the catalog, ignores missing draft entries, and summarizes
  changed roles plus added/removed/high-risk permissions.
- Roles Matrix dirty footer now shows exact changed-role and added/removed
  permission counts before save.
- Matrix saves now open a review modal that lists role-by-role added and
  removed scopes; Cancel closes the modal without client writes.
- Confirm PATCHes only roles with actual diffs. Because the current roles API
  exposes no `version` or `updatedAt`, the client uses the documented
  best-effort per-role fallback instead of sending unsupported precondition
  fields.
- Partial failures keep failed role diffs dirty with role-specific error copy
  while successful role updates are marked clean locally.
- Stale role conflicts keep the review visible but block repeat confirm attempts
  until roles are explicitly refreshed.
- Narrowed `AdminRoleUpdate` to PATCH-supported fields so duplicate-only source
  metadata is not typed as valid update payload.
- Added Playwright CLI admin evidence for add-permission -> review diff ->
  confirm -> backend update with temporary fixtures removed after the pass.

### TASK-356-03 Full Access and High-Risk Permission Confirmation

- Extended the shared roles risk helper to classify full-access promotion,
  current full-access state, and newly added high-risk permissions using the
  same normalized permission semantics as the matrix diff builder.
- `RoleEditor` now requires explicit confirmation before `Select all`,
  high-risk permission toggles, or create/save submit paths can grant sensitive
  scopes.
- `RoleEditor` uses risk signatures so a confirmed sensitive grant does not
  repeatedly prompt for unrelated low-risk edits, while clearing/removing the
  risk resets confirmation.
- Roles Matrix review now blocks final `Confirm changes` for high-risk or
  full-access diffs until the admin accepts a separate shared confirm dialog.
- Matrix create-role dialogs are keyed per open action to prevent stale draft or
  confirmed-risk state from leaking across sessions.
- Added Playwright CLI evidence for RoleEditor full-access cancel/confirm and
  matrix bulk full-access promotion; the temporary role was verified as `["*"]`
  after confirmation and then removed.

## Validation

- `bun run test:vitest -- tests/vitest/ui/permissions-matrix.test.tsx tests/vitest/ui/permissions-matrix-leaf.test.tsx tests/vitest/ui/permissions-matrix-page-wave.test.tsx tests/vitest/ui/role-editor-wave.test.tsx tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/adminRolesClient.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/adminRoles.test.ts`
- `bun run test:vitest -- tests/vitest/ui/role-permission-diff.test.ts tests/vitest/ui/role-permission-risk.test.ts tests/vitest/ui/permissions-matrix-page-wave.test.tsx tests/vitest/ui/permissions-matrix-leaf.test.tsx tests/vitest/ui/permissions-matrix.test.tsx tests/vitest/admin/adminRolesClient.test.ts`
- `bun run test:vitest -- tests/vitest/ui/role-permission-risk.test.ts tests/vitest/ui/role-permission-diff.test.ts tests/vitest/ui/role-editor-wave.test.tsx tests/vitest/ui/permissions-matrix-page-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/permissions-matrix.test.tsx tests/vitest/ui/permissions-matrix-leaf.test.tsx tests/vitest/ui/role-editor-wave.test.tsx tests/vitest/ui/permissions-matrix-page-wave.test.tsx tests/vitest/ui/role-permission-diff.test.ts tests/vitest/ui/role-permission-risk.test.ts tests/vitest/admin/adminRolesClient.test.ts tests/vitest/ui/shared-dialog-contracts.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `playwright-cli -s task-356-01-roles-readonly open http://localhost:5173/admin/login`
- `playwright-cli -s task-356-01-roles-readonly run-code ...` with restricted
  read-only assertions; temporary script and DB fixture removed after the pass.
- `playwright-cli -s task-356-02-review-modal run-code ...` with admin
  review-modal assertions; temporary script and DB fixtures removed after the
  pass. Local screenshot: `.tmp/task-356-02-review-modal.png`.
- `playwright-cli -s task-356-03-full-access-confirm run-code ...` with
  RoleEditor and matrix full-access confirmation assertions; temporary script
  and DB fixture removed after the pass. Local screenshot:
  `.tmp/task-356-03-full-access-confirm.png`.
- Source evidence:
  `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`.
