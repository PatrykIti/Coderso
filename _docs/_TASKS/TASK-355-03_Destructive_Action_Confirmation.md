# TASK-355-03: Destructive Action Confirmation
# FileName: TASK-355-03_Destructive_Action_Confirmation.md

**Priority:** High
**Category:** Admin UI + Users + Roles + Safety UX
**Estimated Effort:** Medium
**Dependencies:** TASK-355-01, TASK-356-02, TASK-360-02
**Status:** Done (2026-06-01)

---

## Overview

Add explicit confirmation flows for destructive or high-risk Users/Roles
actions so accidental clicks cannot deactivate, delete, or clone dangerous
access without review.

## Source Findings

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `core/admin/ui/users/UserDetailsDrawer.tsx`
- `core/admin/ui/users/UserList.tsx`
- `core/admin/ui/roles/RoleEditor.tsx`
- `core/admin/services/adminUsersClient.ts`
- `core/admin/services/adminRolesClient.ts`

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/users/UserDetailsDrawer.tsx` | Confirm deactivate, risky reactivate, delete user, and reset-password handoff from TASK-355-02. |
| `core/admin/ui/users/UserList.tsx` | Ensure row destructive actions delegate to the same confirm pattern. |
| `core/admin/ui/users/UsersRolesPage.tsx` | Confirm user delete/status changes and role duplicate/delete orchestration. |
| `core/admin/ui/roles/RoleList.tsx` | Ensure role card duplicate/delete menu actions route through confirm flows. |
| `core/admin/ui/roles/RoleEditor.tsx` | Keep create/edit save gating aligned with confirm/high-risk role flows from TASK-356. |
| Shared confirm component from `TASK-360-02` | Reuse the canonical confirmation UI and focus handling. |
| UI/Playwright tests | Cover cancel, confirm, RBAC-hidden controls, and cleanup flows. |

## Implementation Pseudocode

```tsx
function openUserDeleteConfirm(user: AdminUserSummary) {
  confirmAction({
    tone: "danger",
    title: `Delete ${user.email}?`,
    description: "This removes the admin user and cannot be undone.",
    confirmLabel: "Delete user",
    onConfirm: () => deleteUser(user.id),
  });
}

function requiresHighRiskRoleConfirm(role: AdminRole) {
  return role.permissions.includes("*") ||
    role.permissions.some((permission) => HIGH_RISK_PERMISSIONS.has(permission));
}
```

Data flow:

- High-risk permission classification is imported from the helper owned by
  `TASK-356-02`; do not create a second `HIGH_RISK_PERMISSIONS` taxonomy in
  Users code.
- UI action opens a confirm dialog with target email/name/role.
- Cancel closes dialog, returns focus, and never calls the client.
- Confirm calls the existing client exactly once.
- On success, invalidate or refresh only the affected user/role state.
- On failure, keep the dialog result visible as an alert/toast without
  pretending cleanup succeeded.

Error handling:

- Restricted users cannot open submit-ready destructive confirms.
- `last_admin`, conflict, and not-found domain errors remain machine-readable
  and map through the route boundary.
- Duplicate role requires confirm only when the source role contains `*` or
  high-risk scopes, and the create payload/audit metadata must preserve
  `sourceRoleId` or equivalent source-role context instead of looking like an
  unrelated role create.

## Security Contract

- Endpoint visibility: unchanged internal admin user/role endpoints.
- Auth model: authenticated admin session.
- RBAC: `users:write` for user status/delete; `roles:write` for role
  duplicate/delete.
- CSRF: required for all mutations.
- Rate-limit bucket: `admin_write`.
- Reject unknown validation: unchanged existing mutation schemas; strict
  validation remains required.
- Anti-abuse: internal session routes; no nonce, HMAC, or captcha.
- Audit: deactivate, reactivate, delete user, duplicate role, and delete role
  emit machine-readable audit events with redacted target metadata. Duplicate
  role audit must include source role id/name when available; if the route
  remains a generic create endpoint, the client/service contract must add
  source metadata before claiming duplicate-role audit coverage.

## Testing Requirements

- `bun --cwd core lint` (passed 2026-06-01)
- `bun --cwd core lint:types` (passed 2026-06-01)
- Vitest UI tests: cancel path no client call, confirm path exact payload,
  restricted user cannot open confirm, focus returns after close.
- Bun route/service tests: existing destructive route RBAC/CSRF coverage stays
  green; add missing mapped error coverage if absent.
- Playwright fixture verifies admin delete user/delete role cleanup requires
  confirm and still removes test records; final click evidence is owned by
  `TASK-360-07`.

Validation run:

- `bun run test:vitest -- tests/vitest/ui/users-roles-page-wave.test.tsx tests/vitest/ui/user-details-drawer-wave.test.tsx tests/vitest/ui/role-list-wave.test.tsx tests/vitest/ui/role-permission-risk.test.ts tests/vitest/ui/shared-dialog-contracts.test.tsx tests/vitest/admin/adminRolesClient.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/adminUsers.test.ts tests/integration/routes/adminRoles.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-admin/REPORT_ADMIN_USERS.md`
- `docs/guide/screens/users.md`
- `_docs/_TASKS/README.md` on status changes
- `_docs/_CHANGELOG/` when completed

## Acceptance Criteria

- Destructive Users/Roles actions cannot execute from a single unconfirmed
  click.
- Confirm dialogs include target identity and are keyboard accessible.
- Cancel paths are proven side-effect-free.

## Completion Notes

- Users row actions and user details drawer actions now route deactivate/delete
  through the shared `ConfirmActionDialog`; reactivation confirms when role risk
  is high or cannot be verified without `roles:read`.
- Role delete always confirms, while role duplicate confirms only for `*` or
  high-risk permissions imported from the shared roles helper seeded for
  `TASK-356-02`.
- Duplicate role payloads carry source-role context for route-level audit only;
  the route strips source fields before persistence.
- User lifecycle and role create/update/duplicate/delete routes emit redacted,
  machine-readable audit events, and admin role domain errors map to `ApiError`.
