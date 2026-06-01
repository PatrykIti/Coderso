# TASK-356-01: Roles Matrix Permission-Aware Read-Only Mode
# FileName: TASK-356-01_Roles_Matrix_Permission_Aware_Read_Only_Mode.md

**Priority:** High
**Category:** Admin UI + Roles Matrix + RBAC
**Estimated Effort:** Large
**Dependencies:** TASK-356, TASK-360-01
**Status:** Done (2026-06-01)

---

## Overview

Make `/admin/roles` permission-aware before any local matrix edits are allowed.
Users with `roles:read` but not `roles:write` must be able to inspect and
search the matrix, but not toggle permissions, add roles, or save changes.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `core/admin/ui/roles/PermissionsMatrixPage.tsx`
- `core/admin/ui/roles/PermissionsMatrix.tsx`
- local `PermissionsMatrixSearch` component in
  `core/admin/ui/roles/PermissionsMatrixPage.tsx`
- `core/admin/ui/roles/RoleEditor.tsx`
- `core/admin/services/adminRolesClient.ts`
- `core/admin/app/AdminApp.tsx`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/app/AdminApp.tsx` or auth provider | Pass shared permission flags into the Roles Matrix route. |
| `core/admin/ui/roles/PermissionsMatrixPage.tsx` | Resolve denied/read-only/editable mode and avoid fetching when read is denied. |
| `core/admin/ui/roles/PermissionsMatrix.tsx` | Disable checkboxes and bulk toggles with accessible reason text in read-only mode. |
| `core/admin/ui/roles/RoleEditor.tsx` | Hide/disable Add Role and editor save paths without `roles:write`, using the same prop/helper contract as the Users surface. |
| `core/admin/services/adminRolesClient.ts` | Preserve 403 handling and expose refresh-required errors to the page. |
| Tests | Cover denied, read-only, editable, search, and stale-403 refresh behavior. |

## Implementation Pseudocode

```ts
type RolesMatrixAccess = {
  canReadRoles: boolean;
  canWriteRoles: boolean;
};

function resolveMatrixMode(access: RolesMatrixAccess) {
  if (!access.canReadRoles) return "denied";
  if (!access.canWriteRoles) return "readonly";
  return "editable";
}

function canTogglePermission(mode: "denied" | "readonly" | "editable") {
  return mode === "editable";
}
```

Data flow:

- Shared auth bootstrap provides `can("roles:read")` and `can("roles:write")`.
- Route guard resolves mode before matrix data fetch.
- Denied mode renders shared access denied and makes no roles request.
- Read-only mode fetches roles, keeps search usable, disables all permission
  checkboxes and bulk write controls, and hides save actions.
- Editable mode preserves current draft matrix behavior.

Error handling:

- API 403 during load moves the page to access-denied state and refreshes the
  permission snapshot.
- API 403 during save shows "Permissions changed; refresh required", keeps the
  draft, and reloads role payload after explicit user action.
- Disabled controls must expose an accessible reason, not only a muted visual
  style.

## Security Contract

- Endpoint visibility: internal admin only, `/admin/api/admin-roles*`.
- Auth model: authenticated admin session.
- RBAC: `roles:read` for matrix/list read; `roles:write` for create/update/
  delete/duplicate/full-access changes.
- CSRF: required for all role writes; not required for read-only GET.
- Rate-limit bucket: `admin_read` for list and `admin_write` for mutations.
- Reject unknown validation: unchanged role schemas remain strict.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Audit: no new writes in this leaf beyond existing role write audit behavior.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest UI: restricted user sees read-only matrix and cannot toggle.
- Vitest UI: restricted user has no active Add Role or Save changes controls.
- Vitest UI: admin user keeps editable behavior.
- Vitest UI: search works in read-only and editable modes.
- Bun route tests remain green for `roles:read` and `roles:write` enforcement.
- Playwright restricted fixture proves local toggles cannot dirty the matrix and
  that the Add Role dialog cannot be opened as a submit-ready write flow.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_ROLES_MATRIX.md`
- `_docs/RBAC_SPEC.md`
- `docs/guide/screens/roles-matrix.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Roles Matrix has explicit denied/read-only/editable modes.
- Read-only users can inspect/search without local edits or write-capable
  controls.
- Admin editable behavior remains intact.

## Completion Notes

- `PermissionsMatrixPage` now consumes the shared admin permission snapshot
  through the same optional `permissions` prop plus `useAdminAuth()` fallback as
  the Users surface.
- Denied mode renders before any roles/catalog fetch. Read-only mode fetches
  roles/catalog for inspection and search, but omits save actions and passes no
  toggle callbacks into the matrix.
- Matrix checkboxes and bulk toggles expose an `aria-describedby` read-only
  reason when `roles:write` is missing.
- Stale 403/`permission_denied` responses refresh the permission snapshot.
  Save failures keep the dirty draft visible with refresh-required copy.
- Playwright CLI restricted-user pass created a temporary `roles:read`-only
  user/role, logged in, opened `/admin/roles`, verified Add Role disabled,
  Save changes absent, matrix toggles disabled, forced toggle click did not
  dirty the matrix, and search still worked. The fixture was removed after the
  pass; local screenshot: `.tmp/task-356-01-roles-readonly.png`.

Validation completed:

- `bun run test:vitest -- tests/vitest/ui/permissions-matrix.test.tsx tests/vitest/ui/permissions-matrix-leaf.test.tsx tests/vitest/ui/permissions-matrix-page-wave.test.tsx tests/vitest/ui/role-editor-wave.test.tsx tests/vitest/admin/adminApp.test.tsx tests/vitest/admin/adminRolesClient.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/adminRoles.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `playwright-cli -s task-356-01-roles-readonly ...` restricted UI pass
